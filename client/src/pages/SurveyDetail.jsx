import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  Calendar,
  Clock,
  HelpCircle,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClipboard } from '../hooks/useClipboard';
import { getSurvey } from '../api';
import { formatDate } from '../utils/formatters';
import { exportSurveyDefinitionPDF } from '../utils/pdf';
import StatusBadge from '../components/shared/StatusBadge';
import { ExportButton } from '../components/shared';

export default function SurveyDetail() {
  const { id } = useParams();
  const { logout } = useAuth();

  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { copied: copySuccess, copy: copyToClipboard } = useClipboard();

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await getSurvey(id);
        setSurvey(res.data.survey);
      } catch (err) {
        setError(err.response?.data?.detail || 'Survey not found');
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b border-card-border px-6 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </header>
        <main className="container-max max-w-2xl section-padding">
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-card-border">|</span>
          <h1 className="text-xl font-serif text-text-primary line-clamp-1">{survey.title}</h1>
          <StatusBadge status={survey.status} />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="container-max max-w-2xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-text-muted font-sans">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Created {formatDate(survey.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {survey.estimated_duration ?? 5} min
            </span>
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              {survey.questions.length} {survey.questions.length === 1 ? 'question' : 'questions'}
            </span>
            <span className="capitalize">{survey.personality_tone ?? 'friendly'} tone</span>
          </div>

          {/* Shareable link */}
          {survey.status === 'published' && survey.token && (
            <div className="card">
              <label className="block text-sm font-sans text-text-muted mb-2">Shareable link</label>
              <div className="flex items-center bg-background rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-4 py-3">
                  <ExternalLink className="w-4 h-4 text-text-muted/40 shrink-0" />
                  <span className="text-sm font-sans text-text-primary truncate">
                    {window.location.origin}/s/{survey.token}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/interview/${survey.token}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-3 text-sm font-sans font-medium text-text-muted hover:text-text-primary transition-colors shrink-0 border-l border-card-border"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Welcome Message */}
          {survey.welcome_message && (
            <div>
              <h3 className="text-sm font-sans text-text-muted mb-2">Welcome Message</h3>
              <p className="text-sm font-sans text-text-primary leading-relaxed">
                {survey.welcome_message}
              </p>
            </div>
          )}

          {/* Description */}
          {survey.description && (
            <div>
              <h3 className="text-sm font-sans text-text-muted mb-2">Description</h3>
              <p className="text-sm font-sans text-text-primary leading-relaxed">
                {survey.description}
              </p>
            </div>
          )}

          {/* Goal */}
          {survey.goal && (
            <div>
              <h3 className="text-sm font-sans text-text-muted mb-2">Goal</h3>
              <p className="text-sm font-sans text-text-primary leading-relaxed">{survey.goal}</p>
            </div>
          )}

          {/* Context */}
          {survey.context && (
            <div>
              <h3 className="text-sm font-sans text-text-muted mb-2">Context</h3>
              <p className="text-sm font-sans text-text-primary leading-relaxed">
                {survey.context}
              </p>
            </div>
          )}

          {/* Questions */}
          {survey.questions.length > 0 && (
            <div>
              <h3 className="text-sm font-sans text-text-muted mb-3">Questions</h3>
              <ol className="space-y-3">
                {survey.questions.map((q, i) => {
                  const text = typeof q === 'string' ? q : q.text;
                  const instructions = typeof q === 'string' ? null : q.ai_instructions;
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="text-sm text-text-muted font-sans w-6 text-right shrink-0">
                        {i + 1}.
                      </span>
                      <div>
                        <span className="text-sm font-sans text-text-primary">{text}</span>
                        {instructions && (
                          <p className="text-xs text-text-muted font-sans mt-0.5 italic">
                            AI: {instructions}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4 border-t border-card-border">
            <Link
              to={`/surveys/${survey.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Survey
            </Link>
            <Link
              to={`/interview/test/${survey.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium border border-card-border text-text-primary hover:bg-white transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Test Survey
            </Link>
            <Link
              to={`/surveys/${survey.id}/analytics`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium border border-card-border text-text-primary hover:bg-white transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </Link>
            <ExportButton
              size="md"
              options={[{ label: 'Export Survey (PDF)', onClick: () => exportSurveyDefinitionPDF(survey) }]}
            />
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-sans font-medium border border-card-border text-text-primary hover:bg-white transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
