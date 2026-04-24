import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Mail,
  Building2,
  UserCheck,
  UserX,
  FileText,
  Activity,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { getAdminUserDetail } from '../api';
import { formatDateWithTime, formatDate, formatDuration } from '../utils/formatters';
import StatusBadge from '../components/shared/StatusBadge';
import InterviewStatusBadge from '../components/shared/InterviewStatusBadge';

export default function AdminUserDetail() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await getAdminUserDetail(userId);
        setData(r.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/admin/users"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All users</span>
          </Link>
          <span className="text-card-border hidden sm:inline">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <h1 className="text-lg sm:text-xl font-serif text-text-primary truncate">User Detail</h1>
          </div>
        </div>
      </header>

      <main className="container-max section-padding">
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Profile */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card mb-6"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-serif text-text-primary mb-1">
                    {data.user.name || '—'}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-text-muted font-sans mb-3">
                    <Mail className="w-4 h-4" />
                    {data.user.email}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-sm font-sans">
                    {data.user.org_name && (
                      <span className="inline-flex items-center gap-1.5 text-text-muted">
                        <Building2 className="w-4 h-4" />
                        {data.user.org_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-text-muted capitalize">
                      <Shield className="w-4 h-4" />
                      {data.user.role}
                    </span>
                    {data.user.email_verified ? (
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <UserCheck className="w-4 h-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-error">
                        <UserX className="w-4 h-4" />
                        Unverified
                      </span>
                    )}
                    {!data.user.is_active && (
                      <span className="inline-flex items-center gap-1.5 text-error">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-text-muted font-sans space-y-1">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined {data.user.created_at ? formatDate(data.user.created_at) : '—'}
                  </div>
                  <div>
                    Last login {data.user.last_login ? formatDateWithTime(data.user.last_login) : '—'}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Totals */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
            >
              <div className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">{data.totals.surveys}</p>
                  <p className="text-xs text-text-muted font-sans">
                    {data.totals.surveys_published} published
                  </p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">{data.totals.interviews}</p>
                  <p className="text-xs text-text-muted font-sans">Interviews received</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">{data.totals.completed}</p>
                  <p className="text-xs text-text-muted font-sans">Completed</p>
                </div>
              </div>
              <div className="card flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-serif text-text-primary">
                    {data.totals.completion_rate}%
                  </p>
                  <p className="text-xs text-text-muted font-sans">Completion rate</p>
                </div>
              </div>
            </motion.div>

            {/* Surveys */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-0 overflow-hidden mb-10"
            >
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-serif text-lg text-text-primary">
                  Surveys ({data.surveys.length})
                </h3>
              </div>
              {data.surveys.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-text-muted font-sans">
                  This user hasn't created any surveys.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead className="bg-background/60 border-b border-card-border">
                      <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-3 font-sans font-normal">Title</th>
                        <th className="px-4 py-3 font-sans font-normal">Status</th>
                        <th className="px-4 py-3 font-sans font-normal">Visibility</th>
                        <th className="px-4 py-3 font-sans font-normal text-right">Total</th>
                        <th className="px-4 py-3 font-sans font-normal text-right">Completed</th>
                        <th className="px-4 py-3 font-sans font-normal text-right">Abandoned</th>
                        <th className="px-4 py-3 font-sans font-normal">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.surveys.map((s) => (
                        <tr
                          key={s.survey_id}
                          className="border-b border-card-border/40 last:border-0 hover:bg-accent/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              to={`/surveys/${s.survey_id}/analytics`}
                              className="text-text-primary hover:text-accent transition-colors"
                            >
                              {s.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-4 py-3 text-text-muted capitalize">
                            {s.visibility || 'private'}
                          </td>
                          <td className="px-4 py-3 text-right text-text-primary">{s.total_interviews}</td>
                          <td className="px-4 py-3 text-right text-success">{s.completed}</td>
                          <td className="px-4 py-3 text-right text-text-muted">{s.abandoned}</td>
                          <td className="px-4 py-3 text-text-muted">
                            {s.created_at ? formatDate(s.created_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            {/* Recent interviews */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-0 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-card-border">
                <h3 className="font-serif text-lg text-text-primary">Recent interviews</h3>
              </div>
              {data.recent_interviews.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-text-muted font-sans">
                  No interviews yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-sans">
                    <thead className="bg-background/60 border-b border-card-border">
                      <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                        <th className="px-4 py-3 font-sans font-normal">Respondent</th>
                        <th className="px-4 py-3 font-sans font-normal">Survey</th>
                        <th className="px-4 py-3 font-sans font-normal">Status</th>
                        <th className="px-4 py-3 font-sans font-normal text-right">Duration</th>
                        <th className="px-4 py-3 font-sans font-normal">Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_interviews.map((iv) => (
                        <tr
                          key={iv.id}
                          className="border-b border-card-border/40 last:border-0 hover:bg-accent/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Link
                              to={`/analytics/interviews/${iv.id}`}
                              className="block text-text-primary hover:text-accent transition-colors"
                            >
                              <p>{iv.respondent_name || 'Anonymous'}</p>
                              {iv.respondent_email && (
                                <p className="text-xs text-text-muted">{iv.respondent_email}</p>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-text-muted truncate max-w-[200px]">
                            {iv.survey_title}
                          </td>
                          <td className="px-4 py-3">
                            <InterviewStatusBadge status={iv.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-text-muted">
                            {formatDuration(iv.duration_seconds)}
                          </td>
                          <td className="px-4 py-3 text-text-muted">
                            {iv.started_at ? formatDateWithTime(iv.started_at) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
