import { motion } from 'framer-motion';
import { questionStatusBadge } from './helpers';
import AnalysisEmptyState from './AnalysisEmptyState';

export default function QuestionsTab({ analysis }) {
  if (!analysis) return <AnalysisEmptyState />;

  const questions = analysis.question_analysis || [];
  if (!questions.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-sm text-text-muted font-sans">No question analysis available.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {questions.map((q, i) => {
        const badge = questionStatusBadge(q.status);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card flex gap-4"
          >
            {/* Question number */}
            <div className="shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <span className="text-sm font-serif font-bold text-accent">{q.question_index}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-sm font-sans text-text-primary leading-relaxed">{q.question_text}</p>
              {q.notes && (
                <p className="text-xs font-sans text-text-muted mt-1.5 leading-relaxed">{q.notes}</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
