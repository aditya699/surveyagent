import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  Settings,
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAnalyticsOverview } from '../api';
import { formatDuration } from '../utils/formatters';
import { exportSurveySummary } from '../utils/export';
import StatusBadge from '../components/shared/StatusBadge';
import { ExportButton } from '../components/shared';

export default function AnalyticsOverview() {
  const { user, logout } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getAnalyticsOverview();
        setSurveys(res.data.surveys);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totals = surveys.reduce(
    (acc, s) => ({
      interviews: acc.interviews + s.total_interviews,
      completed: acc.completed + s.completed,
    }),
    { interviews: 0, completed: 0 }
  );
  const overallRate = totals.interviews > 0
    ? Math.round((totals.completed / totals.interviews) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-card-border hidden sm:inline">|</span>
          <h1 className="text-lg sm:text-xl font-serif text-text-primary truncate">Analytics</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {surveys.length > 0 && (
            <ExportButton
              options={[{ label: 'Export Summary (CSV)', onClick: () => exportSurveySummary(surveys) }]}
            />
          )}
          <span className="text-sm text-text-muted font-sans hidden sm:block">{user?.name}</span>
          <Link
            to="/settings"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="container-max section-padding">
        {/* Summary cards */}
        {!loading && !error && surveys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10"
          >
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-serif text-text-primary">{totals.interviews}</p>
                <p className="text-xs text-text-muted font-sans">Total Interviews</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-serif text-text-primary">{totals.completed}</p>
                <p className="text-xs text-text-muted font-sans">Completed</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-serif text-text-primary">{overallRate}%</p>
                <p className="text-xs text-text-muted font-sans">Completion Rate</p>
              </div>
            </div>
          </motion.div>
        )}

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
            <BarChart3 className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-text-primary mb-2">No analytics yet</h3>
            <p className="text-sm text-text-muted font-sans mb-6">
              Publish a survey and collect responses to see analytics here.
            </p>
            <Link to="/dashboard" className="btn-primary text-sm inline-flex items-center gap-2">
              Go to Dashboard
            </Link>
          </motion.div>
        )}

        {/* Survey cards */}
        {!loading && surveys.length > 0 && (
          <>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-serif text-text-primary mb-4"
            >
              Surveys
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {surveys.map((survey, i) => (
                <motion.div
                  key={survey.survey_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/surveys/${survey.survey_id}/analytics`}
                    className="card flex flex-col hover:border-accent/30 transition-colors block"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-serif text-lg text-text-primary line-clamp-1">
                        {survey.title}
                      </h3>
                      <StatusBadge status={survey.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm font-sans">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Users className="w-3.5 h-3.5" />
                        <span>{survey.total_interviews} interviews</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{survey.completion_rate}% completed</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(survey.avg_duration_seconds)} avg</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>{survey.completed} / {survey.total_interviews}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
