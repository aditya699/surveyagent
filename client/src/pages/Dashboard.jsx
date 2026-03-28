import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  FileText,
  LogOut,
  Settings,
  Pencil,
  Trash2,
  Copy,
  Check,
  Eye,
  ExternalLink,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClipboard } from '../hooks/useClipboard';
import { getSurveys, deleteSurvey } from '../api';
import { formatDate } from '../utils/formatters';
import StatusBadge from '../components/shared/StatusBadge';
import VisibilityBadge from '../components/shared/VisibilityBadge';

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { copied: copySuccess, copy: copyToClipboard } = useClipboard();

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const res = await getSurveys();
        setSurveys(res.data?.surveys || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };
    fetchSurveys();
  }, []);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deleteSurvey(id);
      setSurveys((prev) => prev.filter((s) => s.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete survey');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-serif text-text-primary">SurveyAgent</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted font-sans">{user?.name}</span>
          <Link
            to="/analytics"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="container-max section-padding">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-10"
        >
          <div>
            <h2 className="text-3xl lg:text-4xl font-serif text-text-primary">
              Welcome back, {user?.name}
            </h2>
            <p className="text-text-muted font-sans mt-2">{user?.org_name}</p>
          </div>
          <Link
            to="/surveys/create"
            className="btn-primary text-sm inline-flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Create Survey
          </Link>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && surveys.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <FileText className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-text-primary mb-2">No surveys yet</h3>
            <p className="text-sm text-text-muted font-sans mb-6">
              Create your first AI-powered survey to get started.
            </p>
            <Link
              to="/surveys/create"
              className="btn-primary text-sm inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Create Survey
            </Link>
          </motion.div>
        )}

        {/* Survey cards */}
        {!loading && surveys.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map((survey, i) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="font-serif text-lg text-text-primary hover:text-accent transition-colors line-clamp-1"
                  >
                    {survey.title}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <VisibilityBadge visibility={survey.visibility} />
                    <StatusBadge status={survey.status} />
                  </div>
                </div>

                {/* Creator (for shared surveys) */}
                {survey.created_by_name && survey.created_by !== user?.user_id && (
                  <p className="text-xs text-accent/70 font-sans mb-1">by {survey.created_by_name}</p>
                )}

                {/* Description */}
                {survey.description && (
                  <p className="text-sm text-text-muted font-sans line-clamp-2 mb-3">
                    {survey.description}
                  </p>
                )}

                {/* Date */}
                <p className="text-xs text-text-muted/60 font-sans mb-4">
                  Created {formatDate(survey.created_at)}
                </p>

                {/* Published link */}
                {survey.status === 'published' && survey.token && (
                  <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2 mb-4">
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted/40 shrink-0" />
                    <span className="text-xs text-text-muted font-sans truncate flex-1">
                      {window.location.origin}/interview/{survey.token}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/interview/${survey.token}`)}
                      className="text-text-muted/60 hover:text-accent transition-colors shrink-0"
                    >
                      {copySuccess ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Delete confirmation */}
                {deleteId === survey.id ? (
                  <div className="flex items-center justify-between bg-error/5 border border-error/10 rounded-lg px-3 py-2">
                    <span className="text-xs text-error font-sans">Delete this survey?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteId(null)}
                        className="text-xs text-text-muted hover:text-text-primary font-sans transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(survey.id)}
                        disabled={deleting}
                        className="text-xs text-error hover:text-error/80 font-sans font-medium transition-colors disabled:opacity-50"
                      >
                        {deleting ? 'Deleting...' : 'Yes, delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-2 border-t border-card-border">
                    <Link
                      to={`/surveys/${survey.id}`}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors font-sans"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                    <Link
                      to={`/surveys/${survey.id}/edit`}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors font-sans"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                    {survey.status === 'published' && (
                      <Link
                        to={`/surveys/${survey.id}/analytics`}
                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors font-sans"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Analytics
                      </Link>
                    )}
                    <button
                      onClick={() => setDeleteId(survey.id)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-error transition-colors font-sans ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
