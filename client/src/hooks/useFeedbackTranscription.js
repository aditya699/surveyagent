// ---------------------------------------------------------------------------
// useFeedbackTranscription — single WebRTC peer connection to the OpenAI
// Realtime API in transcription-only mode. Two people share the laptop mic;
// the model never speaks back. All transcripts come through the data channel.
//
// Mirrors useRealtimeTranslation's lifecycle (token fetch, peer, mic, SDP
// exchange, mic toggle, cleanup) but strips out audio output and the
// target_language transcript path.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import { getFeedbackLiveToken } from '../api';

const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const REALTIME_MODEL = 'gpt-realtime-2';

export function useFeedbackTranscription() {
  const [state, setState] = useState('idle'); // idle | connecting | connected | error
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const localStreamRef = useRef(null);
  const cleanedUpRef = useRef(false);

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
  }, []);

  useEffect(() => {
    return () => {
      cleanedUpRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const handleDataChannelMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (data.type) {
      case 'conversation.item.input_audio_transcription.completed': {
        const text = (data.transcript || '').trim();
        if (text) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
        }
        break;
      }
      case 'error': {
        // Surface API errors but don't tear down — transcription can recover.
        // eslint-disable-next-line no-console
        console.error('Feedback-live realtime error:', data.error);
        break;
      }
      default:
        break;
    }
  }, []);

  const startSession = useCallback(async () => {
    if (state === 'connecting' || state === 'connected') return;
    cleanedUpRef.current = false;
    setState('connecting');
    setErrorMessage(null);
    setTranscript('');

    try {
      const tokenData = await getFeedbackLiveToken();
      const ephemeralKey = tokenData.client_secret;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Discard any audio tracks the server might still push back — we
      // never want speakers playing anything in transcription mode.
      pc.ontrack = () => {};

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const track = stream.getTracks()[0];
      // Start with mic enabled — the demo's premise is "both people just talk".
      track.enabled = true;
      pc.addTrack(track);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('message', handleDataChannelMessage);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`${REALTIME_CALLS_URL}?model=${REALTIME_MODEL}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Realtime SDP exchange failed: ${sdpResponse.status}`);
      }

      const answer = { type: 'answer', sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setState('connected');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setState('error');
          setErrorMessage('Connection lost');
        }
      };

      if (pc.connectionState === 'connected') {
        setState('connected');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to start feedback-live session:', err);
      setState('error');
      setErrorMessage(err.message || 'Failed to connect');
      cleanup();
    }
  }, [state, handleDataChannelMessage, cleanup]);

  const endSession = useCallback(() => {
    cleanup();
    setState('idle');
  }, [cleanup]);

  const setMicEnabled = useCallback((enabled) => {
    const track = localStreamRef.current?.getTracks()[0];
    if (track) {
      track.enabled = enabled;
    }
  }, []);

  return {
    state,
    transcript,
    errorMessage,
    startSession,
    endSession,
    setMicEnabled,
  };
}
