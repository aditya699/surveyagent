import { motion } from 'framer-motion';
import { Tag, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import AnalysisEmptyState from './AnalysisEmptyState';

function InsightColumn({ icon: Icon, iconColor, title, borderColor, items, delay }) {
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

export default function ThemesTab({ analysis }) {
  if (!analysis) return <AnalysisEmptyState />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Key Themes */}
      {analysis.key_themes?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-accent" />
            <h4 className="font-serif text-base text-text-primary">Key Themes</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.key_themes.map((theme, i) => (
              <span key={i} className="px-3 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-sans font-medium">
                {theme}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Strengths / Concerns / Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InsightColumn
          icon={CheckCircle}
          iconColor="text-green-500"
          title="Strengths"
          borderColor="border-l-green-400"
          items={analysis.strengths}
          delay={0.05}
        />
        <InsightColumn
          icon={AlertTriangle}
          iconColor="text-amber-500"
          title="Concerns"
          borderColor="border-l-amber-400"
          items={analysis.concerns}
          delay={0.1}
        />
        <InsightColumn
          icon={Lightbulb}
          iconColor="text-blue-500"
          title="Improvements"
          borderColor="border-l-blue-400"
          items={analysis.improvements}
          delay={0.15}
        />
      </div>
    </motion.div>
  );
}
