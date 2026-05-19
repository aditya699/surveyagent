// ---------------------------------------------------------------------------
// FeedbackLivePage — hidden /realtime_feedback demo.
//
// Two people share the laptop mic. As they talk, a live dashboard builds
// itself: sentiment, strengths, pain points, suggestions, themes, quotes.
// Ephemeral — no DB writes.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Quote,
  Play,
} from 'lucide-react';
import { useFeedbackTranscription } from '../hooks/useFeedbackTranscription';
import { useFeedbackDashboard } from '../hooks/useFeedbackDashboard';

function StatusDot({ state }) {
  const color =
    state === 'connected'
      ? 'bg-green-500 animate-pulse'
      : state === 'connecting'
      ? 'bg-yellow-500 animate-pulse'
      : state === 'error'
      ? 'bg-red-500'
      : 'bg-white/20';
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

function sentimentChip(sentiment) {
  const map = {
    positive: 'bg-green-500/15 text-green-300 border-green-500/30',
    neutral:  'bg-white/10 text-white/70 border-white/20',
    negative: 'bg-red-500/15 text-red-300 border-red-500/30',
    mixed:    'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };
  return map[sentiment] || map.neutral;
}

function scoreColor(score) {
  if (score == null) return 'text-white/30';
  if (score >= 7) return 'text-green-300';
  if (score >= 4) return 'text-amber-300';
  return 'text-red-300';
}

function InsightCard({ item, accent, icon: Icon }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className={`rounded-lg border ${accent} p-3`}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-80" />
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-sans font-medium leading-tight">
            {item.title}
          </div>
          {item.detail && (
            <div className="text-white/60 text-xs font-sans mt-1 leading-snug">
              {item.detail}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InsightColumn({ title, items, accent, icon }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 min-h-[200px]">
      <div className="flex items-center justify-between">
        <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider">
          {title}
        </div>
        <span className="text-white/30 font-sans text-[11px]">
          {items.length}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/25 font-sans text-xs italic"
            >
              Listening…
            </motion.div>
          ) : (
            items.map((item, idx) => (
              <InsightCard
                key={`${item.title}-${idx}`}
                item={item}
                accent={accent}
                icon={icon}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function FeedbackLivePage() {
  const [phase, setPhase] = useState('intro'); // intro | live
  const [micOn, setMicOn] = useState(true);

  const {
    state,
    transcript,
    errorMessage,
    startSession,
    endSession,
    setMicEnabled,
  } = useFeedbackTranscription();

  const { dashboard, extracting, lastUpdatedAt, reset } = useFeedbackDashboard(
    transcript,
    { enabled: phase === 'live' },
  );

  // Keep the mic track in sync with the toggle whenever connection state changes.
  useEffect(() => {
    if (state === 'connected') setMicEnabled(micOn);
  }, [state, micOn, setMicEnabled]);

  const transcriptScrollRef = useRef(null);
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleStart = useCallback(async () => {
    setPhase('live');
    await startSession();
  }, [startSession]);

  const handleEnd = useCallback(() => {
    endSession();
    reset();
    setPhase('intro');
  }, [endSession, reset]);

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-8">
            <Sparkles className="w-10 h-10 text-accent mx-auto mb-3" />
            <h1 className="text-2xl font-serif text-white mb-2">Live Insights Demo</h1>
            <p className="text-white/50 font-sans text-sm">
              Two people, one mic. Have a feedback conversation — the dashboard builds itself as you talk.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="text-white/70 font-sans text-sm leading-relaxed">
              Strengths, pain points, suggestions, themes and quotes will appear live as the conversation unfolds. Nothing is saved.
            </div>
            <button
              type="button"
              onClick={handleStart}
              className="w-full bg-accent text-white font-sans font-medium py-3 rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start session
            </button>
            <p className="text-white/30 font-sans text-[11px] text-center pt-1">
              Tip: stay near the mic so both speakers are captured clearly.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const score = dashboard.overall_score;
  const sentiment = dashboard.sentiment;

  return (
    <div className="min-h-screen bg-dark px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-serif text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              Live Insights
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusDot state={state} />
              <span className="text-white/40 font-sans text-xs capitalize">{state}</span>
              {extracting && (
                <span className="text-white/40 font-sans text-xs flex items-center gap-1 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> updating dashboard…
                </span>
              )}
              {!extracting && lastUpdatedAt && (
                <span className="text-white/30 font-sans text-xs ml-2">
                  updated {Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000))}s ago
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              className={`flex items-center gap-2 font-sans text-sm px-4 py-2 rounded-lg transition-colors ${
                micOn
                  ? 'bg-accent hover:bg-accent/90 text-white'
                  : 'bg-white/10 hover:bg-white/15 text-white/70'
              }`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {micOn ? 'Mic on' : 'Mic muted'}
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

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-sans rounded-lg px-4 py-2 mb-4">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: live transcript */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider">
                Live transcript
              </div>
              <div className="text-white/30 font-sans text-[11px]">
                {transcript.length} chars
              </div>
            </div>
            <div
              ref={transcriptScrollRef}
              className="flex-1 overflow-y-auto max-h-[70vh] min-h-[300px] text-white/70 font-sans text-sm leading-relaxed whitespace-pre-wrap"
            >
              {transcript || (
                <span className="text-white/25 italic">
                  Waiting for speech… start speaking and the transcript will appear here.
                </span>
              )}
            </div>
          </div>

          {/* Right: dashboard */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sentiment */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider mb-2">
                  Sentiment
                </div>
                <div
                  className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm font-sans capitalize ${sentimentChip(
                    sentiment,
                  )}`}
                >
                  {sentiment || '—'}
                </div>
              </div>

              {/* Score */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider mb-2">
                  Satisfaction
                </div>
                <div className={`text-3xl font-serif ${scoreColor(score)}`}>
                  {score != null ? `${score}` : '—'}
                  {score != null && (
                    <span className="text-base text-white/30 font-sans">/10</span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider mb-2">
                  Summary
                </div>
                <div className="text-white/80 font-sans text-sm leading-snug min-h-[40px]">
                  {dashboard.summary || (
                    <span className="text-white/25 italic">Listening…</span>
                  )}
                </div>
              </div>
            </div>

            {/* Insights row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsightColumn
                title="Strengths"
                items={dashboard.strengths || []}
                accent="bg-green-500/5 border-green-500/20"
                icon={ThumbsUp}
              />
              <InsightColumn
                title="Pain points"
                items={dashboard.concerns || []}
                accent="bg-red-500/5 border-red-500/20"
                icon={ThumbsDown}
              />
              <InsightColumn
                title="Suggestions"
                items={dashboard.improvements || []}
                accent="bg-blue-500/5 border-blue-500/20"
                icon={Lightbulb}
              />
            </div>

            {/* Themes + quotes row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider mb-3">
                  Key themes
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  <AnimatePresence initial={false}>
                    {dashboard.key_themes && dashboard.key_themes.length > 0 ? (
                      dashboard.key_themes.map((theme, idx) => (
                        <motion.span
                          layout
                          key={`${theme}-${idx}`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          className="px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-sans"
                        >
                          {theme}
                        </motion.span>
                      ))
                    ) : (
                      <span className="text-white/25 italic font-sans text-xs">
                        Themes will emerge here…
                      </span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-white/60 font-sans text-[11px] uppercase tracking-wider mb-3">
                  Key quotes
                </div>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  <AnimatePresence initial={false}>
                    {dashboard.quotes && dashboard.quotes.length > 0 ? (
                      dashboard.quotes.map((q, idx) => (
                        <motion.div
                          layout
                          key={`${q.text}-${idx}`}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.25 }}
                          className="flex items-start gap-2 text-white/80 font-sans text-xs italic leading-snug"
                        >
                          <Quote className="w-3 h-3 mt-0.5 shrink-0 text-white/30" />
                          <span>“{q.text}”</span>
                        </motion.div>
                      ))
                    ) : (
                      <span className="text-white/25 italic font-sans text-xs">
                        Quotes will appear here as the customer speaks…
                      </span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-white/30 font-sans text-xs text-center mt-6">
          Demo only — nothing is saved.
        </p>
      </div>
    </div>
  );
}
