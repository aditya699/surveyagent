import { motion } from 'framer-motion';
import { qualityBadge } from './helpers';
import AnalysisEmptyState from './AnalysisEmptyState';

export default function SurveyQuestionsTab({ analysis }) {
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
        const badge = qualityBadge(q.avg_quality);
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
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                {q.coverage_rate != null && (
                  <span className="text-[10px] font-sans text-text-muted">
                    {q.coverage_rate}% coverage
                  </span>
                )}
              </div>
              <p className="text-sm font-sans text-text-primary leading-relaxed">{q.question_text}</p>
              {q.key_findings && (
                <p className="text-xs font-sans text-text-muted mt-1.5 leading-relaxed">
                  <span className="font-medium text-text-primary">Key findings: </span>
                  {q.key_findings}
                </p>
              )}
              {q.common_responses && (
                <p className="text-xs font-sans text-text-muted mt-1 leading-relaxed">
                  <span className="font-medium text-text-primary">Common responses: </span>
                  {q.common_responses}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
