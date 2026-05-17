// ---------------------------------------------------------------------------
// useRealtimeTranslation — one direction of a two-way translation demo.
//
// Manages a single OpenAI Realtime Translation peer connection: ephemeral
// token fetch, mic track (starts muted), translated audio playback, and a
// data channel for source + translated transcript deltas. No persistence.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import { getTranslationToken } from '../api';

const TRANSLATION_CALLS_URL = 'https://api.openai.com/v1/realtime/translations/calls';
const TRANSLATION_MODEL = 'gpt-realtime-translate';

export function useRealtimeTranslation({ targetLanguage }) {
  const [state, setState] = useState('idle'); // idle | connecting | connected | error
  const [sourceTranscript, setSourceTranscript] = useState('');
  const [targetTranscript, setTargetTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioElRef = useRef(null);
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
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
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
      case 'session.input_transcript.delta': {
        setSourceTranscript((prev) => prev + (data.delta || ''));
        break;
      }
      case 'session.output_transcript.delta': {
        setTargetTranscript((prev) => prev + (data.delta || ''));
        break;
      }
      case 'error': {
        console.error('Translation API error:', data.error);
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
    setSourceTranscript('');
    setTargetTranscript('');

    try {
      const tokenData = await getTranslationToken(targetLanguage);
      const ephemeralKey = tokenData.client_secret;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      // Start muted — caller toggles via setMicEnabled when ready to speak.
      const track = stream.getTracks()[0];
      track.enabled = false;
      pc.addTrack(track);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('message', handleDataChannelMessage);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`${TRANSLATION_CALLS_URL}?model=${TRANSLATION_MODEL}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`Translation SDP exchange failed: ${sdpResponse.status}`);
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
      console.error('Failed to start translation session:', err);
      setState('error');
      setErrorMessage(err.message || 'Failed to connect');
      cleanup();
    }
  }, [state, targetLanguage, handleDataChannelMessage, cleanup]);

  const endSession = useCallback(() => {
    cleanup();
    setState('idle');
    setSourceTranscript('');
    setTargetTranscript('');
  }, [cleanup]);

  const setMicEnabled = useCallback((enabled) => {
    const track = localStreamRef.current?.getTracks()[0];
    if (track) {
      track.enabled = enabled;
    }
  }, []);

  return {
    state,
    sourceTranscript,
    targetTranscript,
    errorMessage,
    startSession,
    endSession,
    setMicEnabled,
  };
}
