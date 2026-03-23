import { motion } from 'framer-motion';
import { User, Mail, Calendar, Briefcase, Phone } from 'lucide-react';
import { scoreColor, scoreBg, sentimentBadge } from './helpers';
import { formatDuration, formatDateWithTime } from '../../utils/formatters';
import AnalysisEmptyState from './AnalysisEmptyState';

const RESPONDENT_FIELDS = [
  { icon: User, label: 'Name', key: 'name' },
  { icon: Mail, label: 'Email', key: 'email' },
  { icon: Calendar, label: 'Age', key: 'age' },
  { icon: User, label: 'Gender', key: 'gender' },
  { icon: Briefcase, label: 'Occupation', key: 'occupation' },
  { icon: Phone, label: 'Phone', key: 'phone_number' },
];

export default function OverviewTab({ interview, analysis }) {
  const respondent = interview.respondent || {};
  const fields = RESPONDENT_FIELDS.filter((f) => respondent[f.key]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Metrics row */}
      {analysis ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Score */}
          <div className={`rounded-2xl border p-5 flex flex-col items-center justify-center ${scoreBg(analysis.overall_score)}`}>
            <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest mb-1">Quality Score</p>
            <p className={`text-5xl font-serif font-bold ${scoreColor(analysis.overall_score)}`}>
              {analysis.overall_score}
            </p>
            <p className="text-xs text-text-muted font-sans mt-1">out of 10</p>
          </div>

          {/* Sentiment */}
          <div className="card flex flex-col items-center justify-center gap-2">
            <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest">Sentiment</p>
            <span className={`px-3 py-1 rounded-full text-sm font-sans font-medium capitalize ${sentimentBadge(analysis.sentiment)}`}>
              {analysis.sentiment}
            </span>
          </div>

          {/* Coverage */}
          <div className="card flex flex-col items-center justify-center gap-2">
            <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest">Coverage</p>
            <p className="text-3xl font-serif font-bold text-text-primary">
              {interview.questions_covered?.length || 0}
              <span className="text-lg text-text-muted font-normal">
                /{analysis.question_analysis?.length || '?'}
              </span>
            </p>
            <p className="text-xs text-text-muted font-sans">questions covered</p>
          </div>
        </div>
      ) : (
        <AnalysisEmptyState />
      )}

      {/* Summary */}
      {analysis?.summary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest mb-2">Executive Summary</p>
          <p className="text-sm font-sans text-text-primary leading-relaxed">{analysis.summary}</p>
        </motion.div>
      )}

      {/* Session Info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest mb-3">Session Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-sans">
          <div>
            <p className="text-text-muted text-xs mb-0.5">Started</p>
            <p className="text-text-primary">{formatDateWithTime(interview.started_at)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Duration</p>
            <p className="text-text-primary">{formatDuration(interview.duration_seconds)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Questions Covered</p>
            <p className="text-text-primary">{interview.questions_covered?.length || 0}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs mb-0.5">Completed</p>
            <p className="text-text-primary">{interview.completed_at ? formatDateWithTime(interview.completed_at) : '--'}</p>
          </div>
        </div>
      </motion.div>

      {/* Respondent Details */}
      {fields.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card"
        >
          <p className="text-[10px] font-sans text-text-muted uppercase tracking-widest mb-3">Respondent Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fields.map(({ icon: Icon, label, key }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-sans">
                <Icon className="w-3.5 h-3.5 text-text-muted/40 shrink-0" />
                <span className="text-text-muted">{label}:</span>
                <span className="text-text-primary truncate">{respondent[key]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
