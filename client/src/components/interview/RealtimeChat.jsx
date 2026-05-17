// ---------------------------------------------------------------------------
// RealtimeChat — Live interview mode UI (OpenAI Realtime API via WebRTC)
//
// Shows connection status, live transcript, mic mute/unmute, and end button.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader, PhoneOff, Radio } from 'lucide-react';
import { useRealtimeInterview } from '../../hooks';
import { PoweredBy } from '../shared';

export default function RealtimeChat({ sessionId, welcomeMessage, onComplete, onTerminated }) {
  const {
    realtimeState,
    transcript,
    isMuted,
    errorMessage,
    startSession,
    endSession,
    toggleMute,
  } = useRealtimeInterview({ sessionId, onComplete, onTerminated });

  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new transcript entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Auto-start session on mount
  useEffect(() => {
    if (realtimeState === 'idle') {
      startSession();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      {/* Transcript area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome message */}
        {welcomeMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border border-card-border shadow-sm">
              <p className="text-sm font-sans text-dark leading-relaxed">{welcomeMessage}</p>
            </div>
          </div>
        )}

        {/* Live transcript */}
        {transcript.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                turn.role === 'user'
                  ? 'rounded-br-md bg-accent text-white'
                  : 'rounded-bl-md bg-white border border-card-border text-dark'
              }`}
            >
              <p className="text-sm font-sans leading-relaxed">{turn.content}</p>
            </div>
          </div>
        ))}

        {/* Connecting state */}
        {realtimeState === 'connecting' && (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm font-sans text-text-muted">Connecting to live interview...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {realtimeState === 'error' && (
          <div className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Radio className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm font-sans text-red-600">{errorMessage || 'Connection failed'}</p>
              <button
                onClick={startSession}
                className="text-xs font-sans text-accent hover:text-accent/80 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {realtimeState === 'connected' && (
        <div className="shrink-0 bg-background px-4 py-5">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
            {/* Connection indicator */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-sans text-text-muted">Live — speak naturally</span>
            </div>

            {/* Mic and end buttons */}
            <div className="flex items-center gap-6">
              {/* Mute/unmute */}
              <div className="relative flex items-center justify-center">
                <AnimatePresence>
                  {!isMuted && (
                    <>
                      <motion.div
                        key="pulse1"
                        initial={{ scale: 1, opacity: 0.3 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        className="absolute w-14 h-14 rounded-full bg-accent/15"
                      />
                      <motion.div
                        key="pulse2"
                        initial={{ scale: 1, opacity: 0.2 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                        className="absolute w-14 h-14 rounded-full bg-accent/10"
                      />
                    </>
                  )}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={toggleMute}
                  whileTap={{ scale: 0.92 }}
                  className={`relative z-10 w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl ${
                    isMuted
                      ? 'border-red-300 bg-red-50 hover:bg-red-100'
                      : 'border-accent bg-accent/5 hover:bg-accent/10'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-red-500" />
                  ) : (
                    <Mic className="w-6 h-6 text-accent" />
                  )}
                </motion.button>
              </div>

              {/* End session */}
              <motion.button
                type="button"
                onClick={() => {
                  endSession();
                  onComplete?.();
                }}
                whileTap={{ scale: 0.92 }}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            <p className="text-xs font-sans text-text-muted select-none">
              {isMuted ? 'Microphone muted — tap to unmute' : 'Microphone active'}
            </p>
          </div>

          <PoweredBy className="mt-3" />
        </div>
      )}
    </div>
  );
}
