// ---------------------------------------------------------------------------
// useVoiceInterview — state machine for the voice interview loop
//
// States: idle → listening → transcribing → thinking → speaking → (auto-loop)
//
// UX: Tap-to-talk model. User taps mic to START recording, taps again to STOP.
// A 7-second silence timeout acts as a backup auto-stop.
// After AI finishes speaking, auto-starts listening again.
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeAudio, synthesizeInterviewSpeech } from '../api';

const SENTENCE_RE = /([.!?])(\s+)/;
const TAG_STRIP_RE = /\[COVERED:[^\]]*\]|\[ABUSE:\s*true\s*\]/gi; // safety-net: strip any leaked tags
const SILENCE_TIMEOUT_MS = 7000; // 7 seconds of silence before auto-stop
const MIN_RECORDING_MS = 1000; // minimum 1s recording before silence detection kicks in

export function useVoiceInterview({ sessionId, onSendMessage }) {
  const [voiceState, setVoiceState] = useState('idle');

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const bufferRef = useRef('');
  const queueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef(null);
  const activeRef = useRef(false);
  const recordingStartRef = useRef(null);

  // Silence detection refs
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSoundRef = useRef(0);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopEverything();
    };
  }, []);

  // -----------------------------------------------------------------------
  // Audio recording — tap-to-talk model
  // -----------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (!activeRef.current) return;
    setVoiceState('listening');
    chunksRef.current = [];
    recordingStartRef.current = Date.now();
    lastSoundRef.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Silence detection setup
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = { audioCtx, analyser };

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        audioCtx.close().catch(() => {});

        // Release mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (chunksRef.current.length === 0 || !activeRef.current) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (blob.size < 500) {
          if (activeRef.current) startRecording();
          return;
        }

        setVoiceState('transcribing');
        try {
          const { text } = await transcribeAudio(sessionId, blob);
          if (!text || !text.trim() || !activeRef.current) {
            if (activeRef.current) startRecording();
            return;
          }
          setVoiceState('thinking');
          onSendMessage(text.trim());
        } catch (err) {
          console.error('Transcription failed:', err);
          if (activeRef.current) startRecording();
        }
      };

      recorder.start(250);

      // Silence detection loop — only auto-stops after 7s of silence
      // AND at least MIN_RECORDING_MS has elapsed
      const dataArray = new Uint8Array(analyser.fftSize);
      const SILENCE_RMS = 8; // very low threshold — only true silence

      const checkSilence = () => {
        if (!activeRef.current || recorder.state !== 'recording') return;
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length) * 100;

        if (rms > SILENCE_RMS) {
          lastSoundRef.current = Date.now();
        }

        const elapsed = Date.now() - recordingStartRef.current;
        const silenceDuration = Date.now() - lastSoundRef.current;

        // Auto-stop: at least MIN_RECORDING_MS recorded AND 7s of silence
        if (elapsed > MIN_RECORDING_MS && silenceDuration > SILENCE_TIMEOUT_MS) {
          recorder.stop();
          return;
        }

        animFrameRef.current = requestAnimationFrame(checkSilence);
      };

      // Start silence detection after a brief delay (avoid click sounds)
      setTimeout(() => {
        if (activeRef.current && recorder.state === 'recording') {
          animFrameRef.current = requestAnimationFrame(checkSilence);
        }
      }, 300);

    } catch (err) {
      console.error('Microphone access failed:', err);
      setVoiceState('idle');
      activeRef.current = false;
    }
  }, [sessionId, onSendMessage]);

  // User taps mic while listening → stop recording and send
  const finishRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers onstop → transcribe → send
    }
  }, []);

  // -----------------------------------------------------------------------
  // Sentence-level TTS streaming
  // -----------------------------------------------------------------------

  const enqueueSentence = useCallback((text) => {
    const clean = text.replace(TAG_STRIP_RE, '').trim();
    if (!clean) return;
    const entry = {
      text: clean,
      blobPromise: synthesizeInterviewSpeech(sessionId, clean)
        .then((res) => res.blob())
        .catch((err) => {
          console.error('TTS fetch failed:', err);
          return null;
        }),
    };
    queueRef.current.push(entry);

    if (!isPlayingRef.current) {
      playNext();
    }
  }, [sessionId]);

  const playNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      if (activeRef.current) {
        startRecording();
      }
      return;
    }

    isPlayingRef.current = true;
    setVoiceState('speaking');

    const entry = queueRef.current.shift();
    entry.blobPromise.then((blob) => {
      if (!blob || !activeRef.current) {
        playNext();
        return;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        playNext();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        playNext();
      };
      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        playNext();
      });
    });
  }, [startRecording]);

  const feedToken = useCallback((token) => {
    bufferRef.current += token;

    const match = bufferRef.current.match(SENTENCE_RE);
    if (match) {
      const idx = match.index + match[1].length;
      const sentence = bufferRef.current.slice(0, idx).trim();
      bufferRef.current = bufferRef.current.slice(idx).trimStart();
      if (sentence) {
        enqueueSentence(sentence);
      }
    }
  }, [enqueueSentence]);

  const flushSpeech = useCallback(() => {
    const remaining = bufferRef.current.replace(TAG_STRIP_RE, '').trim();
    bufferRef.current = '';
    if (remaining) {
      enqueueSentence(remaining);
    } else if (!isPlayingRef.current && activeRef.current) {
      startRecording();
    }
  }, [enqueueSentence, startRecording]);

  // -----------------------------------------------------------------------
  // Stop helpers
  // -----------------------------------------------------------------------

  const stopRecording = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Detach onstop to prevent transcription when force-stopping
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (analyserRef.current?.audioCtx) {
      analyserRef.current.audioCtx.close().catch(() => {});
      analyserRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  const stopEverything = useCallback(() => {
    stopRecording();
    stopPlayback();
    bufferRef.current = '';
  }, [stopRecording, stopPlayback]);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const startVoice = useCallback(() => {
    activeRef.current = true;
    stopEverything();
    startRecording();
  }, [stopEverything, startRecording]);

  const stopVoice = useCallback(() => {
    activeRef.current = false;
    stopEverything();
    setVoiceState('idle');
  }, [stopEverything]);

  return {
    voiceState,
    startVoice,
    stopVoice,
    finishRecording,
    feedToken,
    flushSpeech,
  };
}
