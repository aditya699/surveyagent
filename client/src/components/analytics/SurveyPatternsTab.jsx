import { motion } from 'framer-motion';
import { Handshake, GitFork, Users } from 'lucide-react';
import AnalysisEmptyState from './AnalysisEmptyState';

function PatternColumn({ icon: Icon, iconColor, title, borderColor, items, delay }) {
  if (!items?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card border-l-4 ${borderColor}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h4 className="font-serif text-base text-text-primary">{title}</h4>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            <p className="text-sm font-sans font-medium text-text-primary">{item.title}</p>
            <p className="text-xs font-sans text-text-muted mt-0.5 leading-relaxed">{item.detail}</p>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function SurveyPatternsTab({ analysis }) {
  if (!analysis) return <AnalysisEmptyState />;

  const patterns = analysis.respondent_patterns;
  const hasConsensus = analysis.consensus_points?.length > 0;
  const hasDivergence = analysis.divergence_points?.length > 0;
  const hasPatterns = patterns && (patterns.engagement_distribution || patterns.notable_outliers);

  if (!hasConsensus && !hasDivergence && !hasPatterns) {
    return (
      <div className="card text-center py-12">
        <p className="text-sm text-text-muted font-sans">No pattern data available.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Consensus / Divergence */}
      {(hasConsensus || hasDivergence) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PatternColumn
            icon={Handshake}
            iconColor="text-green-500"
            title="Consensus"
            borderColor="border-l-green-400"
            items={analysis.consensus_points}
            delay={0}
          />
          <PatternColumn
            icon={GitFork}
            iconColor="text-amber-500"
            title="Divergence"
            borderColor="border-l-amber-400"
            items={analysis.divergence_points}
            delay={0.05}
          />
        </div>
      )}

      {/* Respondent Patterns */}
      {hasPatterns && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-accent" />
            <h4 className="font-serif text-base text-text-primary">Respondent Patterns</h4>
          </div>
          <div className="space-y-3">
            {patterns.engagement_distribution && (
              <div>
                <p className="text-xs font-sans font-medium text-text-primary mb-0.5">Engagement Distribution</p>
                <p className="text-xs font-sans text-text-muted leading-relaxed">{patterns.engagement_distribution}</p>
              </div>
            )}
            {patterns.notable_outliers && (
              <div>
                <p className="text-xs font-sans font-medium text-text-primary mb-0.5">Notable Outliers</p>
                <p className="text-xs font-sans text-text-muted leading-relaxed">{patterns.notable_outliers}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
