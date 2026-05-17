import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Globe, ArrowLeftRight, Loader2 } from 'lucide-react';
import { useRealtimeTranslation } from '../hooks/useRealtimeTranslation';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Mandarin' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
];

function labelFor(code) {
  return LANGUAGES.find((l) => l.code === code)?.label || code;
}

function DirectionPanel({ title, fromLabel, toLabel, hook }) {
  const { state, sourceTranscript, targetTranscript, errorMessage } = hook;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white/40 font-sans text-[11px] uppercase tracking-wider mb-1">
            {title}
          </div>
          <div className="text-white font-sans text-sm flex items-center gap-2">
            <span>{fromLabel}</span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-white/40" />
            <span>{toLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'connected'
                ? 'bg-green-500 animate-pulse'
                : state === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : state === 'error'
                ? 'bg-red-500'
                : 'bg-white/20'
            }`}
          />
          <span className="text-white/40 font-sans text-[10px] capitalize">{state}</span>
        </div>
      </div>

      <div className="space-y-2 min-h-[120px] max-h-[240px] overflow-y-auto">
        <div className="text-white/50 font-sans text-xs leading-relaxed">
          {sourceTranscript || <span className="text-white/20 italic">Heard speech ({fromLabel}) will appear here as it streams in...</span>}
        </div>
        <div className="text-white font-sans text-base leading-relaxed">
          {targetTranscript || <span className="text-white/20 italic">Translation ({toLabel}) will appear here...</span>}
        </div>
      </div>

      {errorMessage && (
        <div className="text-red-400 text-xs font-sans mt-3">{errorMessage}</div>
      )}
    </div>
  );
}

export default function RealtimeTranslationPage() {
  const [phase, setPhase] = useState('language-select'); // language-select | live
  const [langA, setLangA] = useState('en');
  const [langB, setLangB] = useState('es');
  const [micsOn, setMicsOn] = useState(true);

  const aToB = useRealtimeTranslation({ targetLanguage: langB });
  const bToA = useRealtimeTranslation({ targetLanguage: langA });

  // Auto-enable both mics whenever a session reaches 'connected' and global toggle is on.
  useEffect(() => {
    if (aToB.state === 'connected') aToB.setMicEnabled(micsOn);
  }, [aToB.state, micsOn, aToB]);

  useEffect(() => {
    if (bToA.state === 'connected') bToA.setMicEnabled(micsOn);
  }, [bToA.state, micsOn, bToA]);

  const handleStart = useCallback(async () => {
    if (langA === langB) return;
    setPhase('live');
    await Promise.all([aToB.startSession(), bToA.startSession()]);
  }, [langA, langB, aToB, bToA]);

  const handleEnd = useCallback(() => {
    aToB.endSession();
    bToA.endSession();
    setPhase('language-select');
  }, [aToB, bToA]);

  if (phase === 'language-select') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8">
            <Globe className="w-10 h-10 text-accent mx-auto mb-3" />
            <h1 className="text-2xl font-serif text-white mb-2">Live Translation Demo</h1>
            <p className="text-white/50 font-sans text-sm">
              Two people, one mic. Speak naturally — translations stream as live captions.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-white/60 font-sans text-xs uppercase tracking-wider mb-2">
                Person A speaks
              </label>
              <select
                value={langA}
                onChange={(e) => setLangA(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-white font-sans text-sm focus:outline-none focus:border-accent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-dark">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/60 font-sans text-xs uppercase tracking-wider mb-2">
                Person B speaks
              </label>
              <select
                value={langB}
                onChange={(e) => setLangB(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-white font-sans text-sm focus:outline-none focus:border-accent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-dark">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {langA === langB && (
              <div className="text-yellow-400 font-sans text-xs">
                Pick two different languages.
              </div>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={langA === langB}
              className="w-full bg-accent text-white font-sans font-medium py-3 rounded-lg hover:bg-accent/90 disabled:bg-white/10 disabled:text-white/30 transition-colors"
            >
              Start translating
            </button>

            <p className="text-white/30 font-sans text-[11px] text-center pt-2">
              Tip: mute your laptop speakers to avoid echo. Watch captions instead.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const connecting = aToB.state === 'connecting' || bToA.state === 'connecting';

  return (
    <div className="min-h-screen bg-dark px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-serif text-white">Live Translation</h1>
            <p className="text-white/40 font-sans text-xs mt-1">
              {labelFor(langA)} ⇄ {labelFor(langB)} · captions streaming
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMicsOn((v) => !v)}
              className={`flex items-center gap-2 font-sans text-sm px-4 py-2 rounded-lg transition-colors ${
                micsOn
                  ? 'bg-accent hover:bg-accent/90 text-white'
                  : 'bg-white/10 hover:bg-white/15 text-white/70'
              }`}
            >
              {micsOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {micsOn ? 'Mic on' : 'Mic muted'}
            </button>
            <button
              type="button"
              onClick={handleEnd}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-sans text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              End
            </button>
          </div>
        </div>

        {connecting && (
          <div className="flex items-center gap-2 text-white/50 font-sans text-sm mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting both directions...
          </div>
        )}

        <div className="space-y-4">
          <DirectionPanel
            title={`Anything spoken → ${labelFor(langB)}`}
            fromLabel="Auto"
            toLabel={labelFor(langB)}
            hook={aToB}
          />

          <DirectionPanel
            title={`Anything spoken → ${labelFor(langA)}`}
            fromLabel="Auto"
            toLabel={labelFor(langA)}
            hook={bToA}
          />
        </div>

        <p className="text-white/30 font-sans text-xs text-center mt-6">
          Demo only — no transcripts are saved. Both sessions hear everything; useful translations appear in the other speaker's panel.
        </p>
      </div>
    </div>
  );
}
