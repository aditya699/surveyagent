import { motion } from 'framer-motion';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { scoreColor, scoreBg, sentimentBadge } from './helpers';
import { useTts } from '../../hooks/useTts';
import AnalysisEmptyState from './AnalysisEmptyState';

export default function SurveyOverviewTab({ analysis }) {
  const { status: ttsStatus, speak, stop } = useTts();

  if (!analysis) return <AnalysisEmptyState />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score */}
        <div className={`rounded-2xl border p-5 flex flex-col items-center justify-center ${scoreBg(analysis.overall_score)}`}>
          <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest mb-1">Overall Score</p>
          <p className={`text-5xl font-serif font-bold ${scoreColor(analysis.overall_score)}`}>
            {analysis.overall_score}
          </p>
          <p className="text-xs text-text-muted font-sans mt-1">out of 10</p>
        </div>

        {/* Sentiment */}
        <div className="card flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest">Dominant Sentiment</p>
          <span className={`px-3 py-1 rounded-full text-sm font-sans font-medium capitalize ${sentimentBadge(analysis.dominant_sentiment)}`}>
            {analysis.dominant_sentiment}
          </span>
        </div>

        {/* Interviews Analyzed */}
        <div className="card flex flex-col items-center justify-center gap-2">
          <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest">Interviews Analyzed</p>
          <p className="text-3xl font-serif font-bold text-text-primary">
            {analysis.total_interviews_analyzed}
          </p>
          <p className="text-xs text-text-muted font-sans">responses</p>
        </div>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest">Executive Summary</p>
            <button
              onClick={() => ttsStatus === 'playing' ? stop() : speak(analysis.summary)}
              disabled={ttsStatus === 'loading'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans transition-colors ${
                ttsStatus === 'playing'
                  ? 'bg-accent/10 text-accent'
                  : ttsStatus === 'error'
                    ? 'bg-red-50 text-red-500'
                    : 'text-text-muted hover:text-accent hover:bg-accent/5'
              } disabled:opacity-50`}
              title={ttsStatus === 'playing' ? 'Stop' : 'Listen'}
            >
              {ttsStatus === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : ttsStatus === 'playing' ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              {ttsStatus === 'loading' ? 'Loading...' : ttsStatus === 'playing' ? 'Stop' : 'Listen'}
            </button>
          </div>
          <p className="text-sm font-sans text-text-primary leading-relaxed">{analysis.summary}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
