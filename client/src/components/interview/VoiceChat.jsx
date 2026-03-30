// ---------------------------------------------------------------------------
// VoiceChat — voice mode UI (tap-to-talk)
//
// Tap mic to START recording, tap again to STOP and send.
// 7s silence auto-stop as backup. After AI speaks, auto-listens again.
// ---------------------------------------------------------------------------

import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, Loader, Square } from 'lucide-react';
import { PoweredBy } from '../shared';

const STATE_CONFIG = {
  idle: {
    icon: Mic,
    label: 'Tap to speak',
    ringClass: 'border-card-border',
    iconClass: 'text-text-muted',
    bgClass: 'bg-white hover:bg-accent/5',
  },
  listening: {
    icon: Mic,
    label: 'Listening — tap to send',
    ringClass: 'border-red-500',
    iconClass: 'text-white',
    bgClass: 'bg-red-500 hover:bg-red-600',
    pulse: true,
  },
  transcribing: {
    icon: Loader,
    label: 'Processing...',
    ringClass: 'border-accent/40',
    iconClass: 'text-accent animate-spin',
    bgClass: 'bg-accent/5',
  },
  thinking: {
    icon: Loader,
    label: 'Thinking...',
    ringClass: 'border-accent/40',
    iconClass: 'text-accent animate-spin',
    bgClass: 'bg-accent/5',
  },
  speaking: {
    icon: Volume2,
    label: 'Speaking...',
    ringClass: 'border-accent',
    iconClass: 'text-accent',
    bgClass: 'bg-accent/5 hover:bg-accent/10',
    showStop: true,
  },
};

export default function VoiceChat({ voiceState, onStart, onStop, onFinishRecording }) {
  const config = STATE_CONFIG[voiceState] || STATE_CONFIG.idle;
  const Icon = config.icon;

  const handleTap = () => {
    if (voiceState === 'idle') {
      onStart();
    } else if (voiceState === 'listening') {
      onFinishRecording(); // stop recording → transcribe → send
    } else if (voiceState === 'speaking') {
      onStop(); // interrupt playback
    }
  };

  return (
    <div className="shrink-0 bg-background px-4 py-5">
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
        {/* Main mic button */}
        <div className="relative flex items-center justify-center">
          {/* Pulse rings when listening */}
          <AnimatePresence>
            {config.pulse && (
              <>
                <motion.div
                  key="ring1"
                  initial={{ scale: 1, opacity: 0.4 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-16 h-16 rounded-full bg-red-400/20"
                />
                <motion.div
                  key="ring2"
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 1.4, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                  className="absolute w-16 h-16 rounded-full bg-red-400/15"
                />
              </>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={handleTap}
            whileTap={{ scale: 0.92 }}
            disabled={voiceState === 'transcribing' || voiceState === 'thinking'}
            className={`relative z-10 w-16 h-16 rounded-full border-2 ${config.ringClass} ${config.bgClass} flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Icon className={`w-7 h-7 ${config.iconClass}`} />
          </motion.button>
        </div>

        {/* State label */}
        <motion.p
          key={voiceState}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-sans text-text-muted select-none"
        >
          {config.label}
        </motion.p>

        {/* Stop button during speaking */}
        {config.showStop && (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-1.5 text-xs font-sans text-text-muted hover:text-red-500 transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop & skip
          </button>
        )}
      </div>

      <PoweredBy className="mt-3" />
    </div>
  );
}
