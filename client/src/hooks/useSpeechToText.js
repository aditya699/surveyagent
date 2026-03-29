import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function useSpeechToText({ onTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isSupported = !!SpeechRecognition;

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    stopListening();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText && onTranscriptRef.current) {
        onTranscriptRef.current(finalText);
      }
    };

    recognition.onend = () => {
      // Browser stops recognition after silence — restart if user still wants it
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // already started or destroyed
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-available') {
        wantListeningRef.current = false;
        setIsListening(false);
      }
      // 'no-speech' and 'aborted' are normal — onend handles restart
    };

    recognitionRef.current = recognition;
    wantListeningRef.current = true;
    setIsListening(true);
    recognition.start();
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { isListening, isSupported, startListening, stopListening, toggleListening };
}
