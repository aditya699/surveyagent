// ---------------------------------------------------------------------------
// useRealtimeInterview — WebRTC peer connection to OpenAI Realtime API
//
// Manages: ephemeral token fetch, WebRTC lifecycle, data channel events,
// turn detection, saving turns to backend, mic mute, cleanup.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import { getRealtimeToken, saveRealtimeTurn } from '../api';

const REALTIME_URL = 'https://api.openai.com/v1/realtime';

export function useRealtimeInterview({ sessionId, onComplete, onTerminated }) {
  const [realtimeState, setRealtimeState] = useState('idle'); // idle | connecting | connected | error
  const [transcript, setTranscript] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioElRef = useRef(null);
  const localStreamRef = useRef(null);

  // Accumulator for assistant audio transcript deltas
  const assistantTextRef = useRef('');
  // Latest coverage data from tool calls
  const pendingCoverageRef = useRef(null);
  // Track whether we've been cleaned up
  const cleanedUpRef = useRef(false);

  // -----------------------------------------------------------------------
  // Cleanup helper
  // -----------------------------------------------------------------------
  const cleanup = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanedUpRef.current = false; // reset so cleanup runs
      cleanup();
    };
  }, [cleanup]);

  // -----------------------------------------------------------------------
  // Save a turn to the backend (fire-and-forget with retry)
  // -----------------------------------------------------------------------
  const saveTurn = useCallback(async (role, content, extra = {}) => {
    if (!content || !content.trim()) return;

    // Add to local transcript
    setTranscript((prev) => [...prev, { role, content, timestamp: new Date() }]);

    try {
      const result = await saveRealtimeTurn(sessionId, {
        role,
        content: content.trim(),
        ...extra,
      });

      if (result.completed) {
        onComplete?.();
      }
      if (result.terminated) {
        onTerminated?.();
      }
    } catch (err) {
      console.error('Failed to save realtime turn:', err);
    }
  }, [sessionId, onComplete, onTerminated]);

  // -----------------------------------------------------------------------
  // Handle data channel messages from OpenAI Realtime API
  // -----------------------------------------------------------------------
  const handleDataChannelMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (data.type) {
      // User's speech was transcribed
      case 'conversation.item.input_audio_transcription.completed': {
        const text = data.transcript;
        if (text) {
          saveTurn('user', text);
        }
        break;
      }

      // Assistant audio transcript delta
      case 'response.audio_transcript.delta': {
        assistantTextRef.current += data.delta || '';
        break;
      }

      // Assistant audio transcript complete
      case 'response.audio_transcript.done': {
        const fullText = data.transcript || assistantTextRef.current;
        assistantTextRef.current = '';

        if (fullText) {
          const coverage = pendingCoverageRef.current;
          pendingCoverageRef.current = null;
          saveTurn('assistant', fullText, {
            questions_covered: coverage || undefined,
          });
        }
        break;
      }

      // Tool call completed (coverage or abuse)
      case 'response.function_call_arguments.done': {
        const toolName = data.name;
        if (toolName === 'update_coverage') {
          try {
            const args = JSON.parse(data.arguments || '{}');
            pendingCoverageRef.current = args.questions_covered || [];
          } catch {}

          // Send tool output back so the model knows the call succeeded
          if (dcRef.current?.readyState === 'open') {
            dcRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: data.call_id,
                output: JSON.stringify({ status: 'ok' }),
              },
            }));
            dcRef.current.send(JSON.stringify({ type: 'response.create' }));
          }
        } else if (toolName === 'report_abuse') {
          // Save with abuse flag then trigger termination
          saveTurn('assistant', assistantTextRef.current || 'Interview terminated.', {
            abuse_detected: true,
          });
          assistantTextRef.current = '';

          if (dcRef.current?.readyState === 'open') {
            dcRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: data.call_id,
                output: JSON.stringify({ status: 'terminated' }),
              },
            }));
          }
        }
        break;
      }

      case 'error': {
        console.error('Realtime API error:', data.error);
        break;
      }

      default:
        break;
    }
  }, [saveTurn]);

  // -----------------------------------------------------------------------
  // Start a WebRTC session
  // -----------------------------------------------------------------------
  const startSession = useCallback(async () => {
    if (realtimeState === 'connecting' || realtimeState === 'connected') return;
    cleanedUpRef.current = false;
    setRealtimeState('connecting');
    setErrorMessage(null);

    try {
      // 1. Get ephemeral token from our backend
      const tokenData = await getRealtimeToken(sessionId);
      const ephemeralKey = tokenData.client_secret;
      const conversationHistory = tokenData.conversation_history || [];

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up remote audio playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 4. Add local microphone track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);

      // 5. Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('open', () => {
        // Inject conversation history so the AI has context
        for (const msg of conversationHistory) {
          dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: msg.role,
              content: [{ type: 'input_text', text: msg.content }],
            },
          }));
        }
      });

      dc.addEventListener('message', handleDataChannelMessage);

      // 6. SDP exchange via OpenAI Realtime endpoint
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`${REALTIME_URL}?model=gpt-4o-realtime-preview`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`WebRTC SDP exchange failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      // 7. Monitor connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setRealtimeState('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setRealtimeState('error');
          setErrorMessage('Connection lost');
        }
      };

      // If connection is already established
      if (pc.connectionState === 'connected') {
        setRealtimeState('connected');
      }
    } catch (err) {
      console.error('Failed to start realtime session:', err);
      setRealtimeState('error');
      setErrorMessage(err.message || 'Failed to connect');
      cleanup();
    }
  }, [sessionId, realtimeState, handleDataChannelMessage, cleanup]);

  // -----------------------------------------------------------------------
  // End the session
  // -----------------------------------------------------------------------
  const endSession = useCallback(() => {
    cleanup();
    setRealtimeState('idle');
  }, [cleanup]);

  // -----------------------------------------------------------------------
  // Toggle mute
  // -----------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, []);

  return {
    realtimeState,
    transcript,
    isMuted,
    errorMessage,
    startSession,
    endSession,
    toggleMute,
  };
}
