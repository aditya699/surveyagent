import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Clock,
  Calendar,
  HelpCircle,
  Briefcase,
  Phone,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Tag,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInterviewAnalysis } from '../hooks/useInterviewAnalysis';
import { getInterviewDetail } from '../api';
import { formatDuration, formatDateWithTime, formatTime } from '../utils/formatters';
import InterviewStatusBadge from '../components/shared/InterviewStatusBadge';

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------

function scoreColor(score) {
  if (score >= 7) return 'text-green-600';
  if (score >= 4) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBg(score) {
  if (score >= 7) return 'bg-green-50 border-green-200';
  if (score >= 4) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function sentimentBadge(sentiment) {
  const map = {
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-700',
    negative: 'bg-red-100 text-red-700',
    mixed: 'bg-amber-100 text-amber-700',
  };
  return map[sentiment] || map.neutral;
}

function questionStatusBadge(status) {
  const map = {
    well_answered: { cls: 'bg-green-100 text-green-700', label: 'Well Answered' },
    partially_answered: { cls: 'bg-amber-100 text-amber-700', label: 'Partial' },
    not_covered: { cls: 'bg-gray-100 text-gray-500', label: 'Not Covered' },
    skipped: { cls: 'bg-red-100 text-red-700', label: 'Skipped' },
  };
  return map[status] || map.not_covered;
}

// ---------------------------------------------------------------------------
// Analysis Cards
// ---------------------------------------------------------------------------

function AnalysisResults({ analysis }) {
  const a = analysis;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Score + Sentiment + Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Score */}
        <div className={`rounded-2xl border p-5 flex flex-col items-center justify-center ${scoreBg(a.overall_score)}`}>
          <p className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1">Quality Score</p>
          <p className={`text-5xl font-serif font-bold ${scoreColor(a.overall_score)}`}>{a.overall_score}</p>
          <p className="text-xs text-text-muted font-sans mt-1">out of 10</p>
        </div>

        {/* Sentiment + Summary */}
        <div className="sm:col-span-2 card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-sans font-medium ${sentimentBadge(a.sentiment)}`}>
              {a.sentiment}
            </span>
          </div>
          <p className="text-sm font-sans text-text-primary leading-relaxed">{a.summary}</p>
        </div>
      </div>

      {/* Key Themes */}
      {a.key_themes?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-accent" />
            <h4 className="font-serif text-base text-text-primary">Key Themes</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {a.key_themes.map((theme, i) => (
              <span key={i} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-sans font-medium">
                {theme}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Strengths / Concerns / Improvements grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strengths */}
        {a.strengths?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card border-l-4 border-l-green-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <h4 className="font-serif text-base text-text-primary">Strengths</h4>
            </div>
            <ul className="space-y-3">
              {a.strengths.map((item, i) => (
                <li key={i}>
                  <p className="text-sm font-sans font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs font-sans text-text-muted mt-0.5 leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Concerns */}
        {a.concerns?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card border-l-4 border-l-amber-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="font-serif text-base text-text-primary">Concerns</h4>
            </div>
            <ul className="space-y-3">
              {a.concerns.map((item, i) => (
                <li key={i}>
                  <p className="text-sm font-sans font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs font-sans text-text-muted mt-0.5 leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Improvements */}
        {a.improvements?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card border-l-4 border-l-blue-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <h4 className="font-serif text-base text-text-primary">Improvements</h4>
            </div>
            <ul className="space-y-3">
              {a.improvements.map((item, i) => (
                <li key={i}>
                  <p className="text-sm font-sans font-medium text-text-primary">{item.title}</p>
                  <p className="text-xs font-sans text-text-muted mt-0.5 leading-relaxed">{item.detail}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Per-Question Analysis */}
      {a.question_analysis?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <h4 className="font-serif text-base text-text-primary mb-4">Question Breakdown</h4>
          <div className="space-y-3">
            {a.question_analysis.map((q, i) => {
              const badge = questionStatusBadge(q.status);
              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2 border-b border-card-border last:border-b-0">
                  <div className="flex items-center gap-2 sm:w-28 shrink-0">
                    <span className="text-xs font-sans text-text-muted w-5">Q{q.question_index}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium whitespace-nowrap ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-sans text-text-primary">{q.question_text}</p>
                    {q.notes && (
                      <p className="text-xs font-sans text-text-muted mt-0.5 leading-relaxed">{q.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InterviewDetail() {
  const { interviewId } = useParams();
  const { logout } = useAuth();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const {
    analysis,
    rawStream,
    analyzing,
    analysisError,
    startAnalysis,
    cancelAnalysis,
    setAnalysisFromCache,
  } = useInterviewAnalysis();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getInterviewDetail(interviewId);
        setInterview(res.data);
        if (res.data.analysis) {
          setAnalysisFromCache(res.data.analysis);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [interviewId, setAnalysisFromCache]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b border-card-border px-6 py-4">
          <Link
            to="/analytics"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Analytics
          </Link>
        </header>
        <main className="container-max max-w-4xl section-padding">
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
            {error || 'Interview not found'}
          </div>
        </main>
      </div>
    );
  }

  const respondent = interview.respondent || {};
  const hasRespondent = respondent.name || respondent.email;
  const respondentFields = [
    { icon: User, label: 'Name', value: respondent.name },
    { icon: Mail, label: 'Email', value: respondent.email },
    { icon: Calendar, label: 'Age', value: respondent.age },
    { icon: User, label: 'Gender', value: respondent.gender },
    { icon: Briefcase, label: 'Occupation', value: respondent.occupation },
    { icon: Phone, label: 'Phone', value: respondent.phone_number },
  ].filter((f) => f.value);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/surveys/${interview.survey_id}/analytics`}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            {interview.survey_title}
          </Link>
          <span className="text-card-border">|</span>
          <h1 className="text-xl font-serif text-text-primary">Interview Transcript</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="container-max max-w-4xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Info section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-serif text-lg text-text-primary">
                    {hasRespondent ? (respondent.name || respondent.email) : 'Anonymous Respondent'}
                  </p>
                </div>
              </div>
              <InterviewStatusBadge status={interview.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-sans">
              <div>
                <p className="text-text-muted text-xs mb-1">Started</p>
                <p className="text-text-primary">{formatDateWithTime(interview.started_at)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Duration</p>
                <p className="text-text-primary">{formatDuration(interview.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Questions Covered</p>
                <p className="text-text-primary">{interview.questions_covered?.length || 0}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Completed</p>
                <p className="text-text-primary">{interview.completed_at ? formatDateWithTime(interview.completed_at) : '--'}</p>
              </div>
            </div>

            {/* Respondent details */}
            {respondentFields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-card-border">
                <p className="text-xs text-text-muted font-sans mb-2">Respondent Details</p>
                <div className="flex flex-wrap gap-4">
                  {respondentFields.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-1.5 text-sm font-sans text-text-primary">
                      <Icon className="w-3.5 h-3.5 text-text-muted/40" />
                      <span className="text-text-muted">{label}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* AI Analysis Section                                            */}
          {/* ============================================================= */}
          <div className="space-y-4">
            {/* Header row with action button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="font-serif text-lg text-text-primary">AI Analysis</h3>
              </div>

              {analyzing ? (
                <button
                  onClick={cancelAnalysis}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-sans border border-card-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              ) : analysis ? (
                <button
                  onClick={() => startAnalysis(interviewId)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-sans border border-card-border text-text-muted hover:text-text-primary hover:border-text-muted transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-analyze
                </button>
              ) : (
                <button
                  onClick={() => startAnalysis(interviewId)}
                  className="btn-primary flex items-center gap-1.5 text-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze Interview
                </button>
              )}
            </div>

            {/* Error state */}
            {analysisError && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
                {analysisError}
              </div>
            )}

            {/* Streaming preview */}
            {analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <p className="text-xs font-sans text-text-muted">Analyzing transcript...</p>
                </div>
                <div className="bg-background rounded-xl p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs font-sans text-text-muted/80 whitespace-pre-wrap break-words leading-relaxed">
                    {rawStream}
                    <span className="inline-block w-1.5 h-4 bg-accent/60 ml-0.5 animate-pulse align-middle" />
                  </pre>
                </div>
              </motion.div>
            )}

            {/* Analysis results */}
            {!analyzing && analysis && <AnalysisResults analysis={analysis} />}

            {/* Empty state — no analysis yet and not streaming */}
            {!analyzing && !analysis && !analysisError && (
              <div className="card text-center py-8">
                <Sparkles className="w-8 h-8 text-accent/40 mx-auto mb-3" />
                <p className="text-sm font-sans text-text-muted">
                  Get AI-powered insights into this interview — strengths, concerns, and actionable improvements.
                </p>
              </div>
            )}
          </div>

          {/* Conversation transcript */}
          <div className="card">
            <h3 className="font-serif text-lg text-text-primary mb-4">Conversation</h3>
            <div className="space-y-4">
              {interview.conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-accent/10 text-text-primary rounded-br-md'
                        : 'bg-background text-text-primary rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.timestamp && (
                      <p className="text-xs text-text-muted/60 mt-1 font-sans">
                        {formatTime(msg.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {interview.conversation.length === 0 && (
                <p className="text-sm text-text-muted font-sans text-center py-4">
                  No messages in this conversation.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
