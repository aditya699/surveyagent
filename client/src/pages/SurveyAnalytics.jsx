import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  Users,
  CheckCircle2,
  Clock,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getSurveyAnalytics, getSurveyInterviews } from '../api';
import { formatDuration, formatDateWithTime } from '../utils/formatters';
import InterviewStatusBadge from '../components/shared/InterviewStatusBadge';

export default function SurveyAnalytics() {
  const { id } = useParams();
  const { logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [title, setTitle] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [interviewsLoading, setInterviewsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getSurveyAnalytics(id);
        setStats(res.data.stats);
        setTitle(res.data.title);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [id]);

  useEffect(() => {
    const fetchInterviews = async () => {
      setInterviewsLoading(true);
      try {
        const res = await getSurveyInterviews(id, page, pageSize);
        setInterviews(res.data.interviews);
        setTotal(res.data.total);
      } catch (err) {
        // silently fail for interviews list
      } finally {
        setInterviewsLoading(false);
      }
    };
    fetchInterviews();
  }, [id, page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

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
            to="/analytics"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Analytics
          </Link>
        </header>
        <main className="container-max max-w-4xl section-padding">
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
            to="/analytics"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Analytics
          </Link>
          <span className="text-card-border">|</span>
          <h1 className="text-xl font-serif text-text-primary line-clamp-1">{title}</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="container-max section-padding">
        {stats && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-serif text-text-primary">{stats.total_interviews}</p>
                  <p className="text-xs text-text-muted font-sans">Total Interviews</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-serif text-text-primary">{stats.completion_rate}%</p>
                  <p className="text-xs text-text-muted font-sans">Completion Rate</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-serif text-text-primary">{formatDuration(stats.avg_duration_seconds)}</p>
                  <p className="text-xs text-text-muted font-sans">Avg Duration</p>
                </div>
              </div>
              <div className="card flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-serif text-text-primary">{stats.avg_questions_covered}</p>
                  <p className="text-xs text-text-muted font-sans">Avg Questions Covered</p>
                </div>
              </div>
            </div>

            {/* Question coverage */}
            {stats.question_frequencies.length > 0 && (
              <div className="card mb-8">
                <h3 className="font-serif text-lg text-text-primary mb-4">Question Coverage</h3>
                <div className="space-y-3">
                  {stats.question_frequencies.map((qf) => (
                    <div key={qf.question_index} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted font-sans w-6 text-right shrink-0">
                        {qf.question_index}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans text-text-primary truncate mb-1">
                          {qf.question_text}
                        </p>
                        <div className="w-full bg-background rounded-full h-2">
                          <div
                            className="bg-accent rounded-full h-2 transition-all duration-500"
                            style={{ width: `${Math.max(qf.coverage_rate, 2)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-text-muted font-sans w-16 text-right shrink-0">
                        {qf.coverage_rate}% ({qf.times_covered})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interview sessions table */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-text-primary">
                  Interview Sessions
                  <span className="text-sm font-sans text-text-muted ml-2">({total})</span>
                </h3>
              </div>

              {interviewsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : interviews.length === 0 ? (
                <p className="text-sm text-text-muted font-sans py-8 text-center">
                  No interview sessions yet.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-sans">
                      <thead>
                        <tr className="border-b border-card-border text-left text-text-muted">
                          <th className="pb-3 pr-4 font-medium">Respondent</th>
                          <th className="pb-3 pr-4 font-medium">Status</th>
                          <th className="pb-3 pr-4 font-medium">Duration</th>
                          <th className="pb-3 pr-4 font-medium">Questions</th>
                          <th className="pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {interviews.map((interview) => (
                          <tr
                            key={interview.id}
                            className="border-b border-card-border/50 last:border-0 hover:bg-background/50 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <Link
                                to={`/analytics/interviews/${interview.id}`}
                                className="flex items-center gap-2 text-text-primary hover:text-accent transition-colors"
                              >
                                <User className="w-3.5 h-3.5 text-text-muted/40" />
                                {interview.respondent_name || interview.respondent_email || (
                                  <span className="text-text-muted italic">Anonymous</span>
                                )}
                              </Link>
                            </td>
                            <td className="py-3 pr-4">
                              <InterviewStatusBadge status={interview.status} />
                            </td>
                            <td className="py-3 pr-4 text-text-muted">
                              {formatDuration(interview.duration_seconds)}
                            </td>
                            <td className="py-3 pr-4 text-text-muted">
                              {interview.questions_covered_count}
                            </td>
                            <td className="py-3 text-text-muted">
                              {formatDateWithTime(interview.started_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-card-border">
                      <p className="text-xs text-text-muted font-sans">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors font-sans disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Previous
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors font-sans disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
