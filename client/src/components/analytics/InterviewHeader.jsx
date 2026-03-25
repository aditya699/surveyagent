import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Sparkles, RefreshCw, X, Loader2 } from 'lucide-react';
import InterviewStatusBadge from '../shared/InterviewStatusBadge';
import ExportButton from '../shared/ExportButton';
import { formatDuration } from '../../utils/formatters';
import { exportInterviewTranscript } from '../../utils/export';
import { exportInterviewAnalysisPDF } from '../../utils/pdf';

export default function InterviewHeader({
  interview,
  analyzing,
  analysis,
  onAnalyze,
  onCancel,
  onLogout,
}) {
  const respondent = interview.respondent || {};
  const displayName = respondent.name || respondent.email || 'Anonymous Respondent';

  return (
    <header className="bg-white border-b border-card-border">
      {/* Top row: back link + logout */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-card-border/50">
        <Link
          to={`/surveys/${interview.survey_id}/analytics`}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <ArrowLeft className="w-4 h-4" />
          {interview.survey_title}
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Bottom row: respondent info + stats + action */}
      <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Respondent */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="font-serif text-base text-text-primary truncate">{displayName}</p>
          </div>
          <InterviewStatusBadge status={interview.status} />
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-xs font-sans text-text-muted sm:ml-auto">
          <span>{formatDuration(interview.duration_seconds)}</span>
          <span className="text-card-border">|</span>
          <span>{interview.questions_covered?.length || 0} questions covered</span>
        </div>

        {/* Export + Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <ExportButton
            options={[
              { label: 'Transcript (CSV)', onClick: () => exportInterviewTranscript(interview) },
              ...(analysis
                ? [{ label: 'Analysis (PDF)', onClick: () => exportInterviewAnalysisPDF(interview, analysis) }]
                : []),
            ]}
          />
        </div>
        <div className="shrink-0">
          {analyzing ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-sans border border-card-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          ) : analysis ? (
            <button
              onClick={onAnalyze}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-sans border border-card-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-analyze
            </button>
          ) : (
            <button
              onClick={onAnalyze}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyze
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
