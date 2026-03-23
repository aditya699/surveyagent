import { useState, useRef, useCallback, useEffect } from 'react';
import { synthesizeSpeech } from '../api';

/**
 * Hook for text-to-speech playback via OpenAI TTS API.
 *
 * States: idle | loading | playing | error
 *
 * @returns {{ status, speak, stop }}
 */
export function useTts() {
  const [status, setStatus] = useState('idle'); // idle | loading | playing | error
  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const blobUrlRef = useRef(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanup();
    setStatus('idle');
  }, [cleanup]);

  const speak = useCallback(async (text) => {
    // If already playing/loading, stop first
    stop();

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');

    try {
      const res = await synthesizeSpeech({ text, signal: controller.signal });
      const blob = await res.blob();

      // Check if aborted during blob read
      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        cleanup();
        setStatus('idle');
      };

      audio.onerror = () => {
        cleanup();
        setStatus('error');
      };

      await audio.play();
      setStatus('playing');
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('TTS error:', err);
      setStatus('error');
      // Auto-reset error state after 3 seconds
      setTimeout(() => setStatus((s) => (s === 'error' ? 'idle' : s)), 3000);
    }
  }, [stop, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      cleanup();
    };
  }, [cleanup]);

  return { status, speak, stop };
}
