import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  Users,
  Building2,
  FileText,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
  Cpu,
  Activity,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAdminUsage, getAdminFeedback, getAdminErrors } from '../api';
import { formatDateWithTime } from '../utils/formatters';

function StatCard({ icon: Icon, label, value, sub, tone = 'accent', to }) {
  const toneMap = {
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    error: 'bg-error/10 text-error',
    muted: 'bg-text-muted/10 text-text-muted',
  };
  const inner = (
    <>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${toneMap[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-serif text-text-primary">{value}</p>
        <p className="text-xs text-text-muted font-sans truncate">{label}</p>
        {sub != null && <p className="text-xs text-text-muted/70 font-sans mt-0.5 truncate">{sub}</p>}
      </div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="card flex items-center gap-4 hover:border-accent/30 transition-colors">
        {inner}
      </Link>
    );
  }
  return <div className="card flex items-center gap-4">{inner}</div>;
}

function Sparkline({ points, color = '#C4956A' }) {
  if (!points?.length) return null;
  const width = 320;
  const height = 60;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p.count / max) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-14">
      <path d={area} fill={color} fillOpacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GrowthBlock({ title, data }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-text-muted font-sans mb-3">{title}</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xl font-serif text-text-primary">{data.last_24h}</p>
          <p className="text-xs text-text-muted font-sans">24h</p>
        </div>
        <div>
          <p className="text-xl font-serif text-text-primary">{data.last_7d}</p>
          <p className="text-xs text-text-muted font-sans">7d</p>
        </div>
        <div>
          <p className="text-xl font-serif text-text-primary">{data.last_30d}</p>
          <p className="text-xs text-text-muted font-sans">30d</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [usage, setUsage] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Errors panel (hidden by default)
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [errorsList, setErrorsList] = useState([]);
  const [errorsLoading, setErrorsLoading] = useState(false);
  const [errorsFetched, setErrorsFetched] = useState(false);

  // Feedback panel (collapsed by default)
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [u, f] = await Promise.all([getAdminUsage(), getAdminFeedback(20)]);
      setUsage(u.data);
      setFeedback(f.data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openErrors = async () => {
    const next = !errorsOpen;
    setErrorsOpen(next);
    if (next && !errorsFetched) {
      setErrorsLoading(true);
      try {
        const r = await getAdminErrors(50);
        setErrorsList(r.data.items || []);
        setErrorsFetched(true);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load errors');
      } finally {
        setErrorsLoading(false);
      }
    }
  };

  const totals = usage?.totals;
  const growth = usage?.growth;
  const timeseries = usage?.timeseries;

  const verifiedPct = useMemo(() => {
    if (!totals?.users) return 0;
    return Math.round((totals.verified_users / totals.users) * 100);
  }, [totals]);

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <h1 className="text-lg sm:text-xl font-serif text-text-primary truncate">Platform Admin</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <span className="text-sm text-text-muted font-sans hidden sm:block">{user?.email}</span>
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
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans mb-6">
            {error}
          </div>
        )}

        {loading && !usage && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {usage && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <p className="text-xs text-text-muted font-sans">
                Last refreshed {formatDateWithTime(usage.generated_at)}
              </p>
            </motion.div>

            {/* Top-level stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              <StatCard
                icon={Users}
                label="Total users"
                value={totals.users}
                sub={`${totals.verified_users} verified (${verifiedPct}%)`}
                to="/admin/users"
              />
              <StatCard
                icon={Building2}
                label="Organizations"
                value={totals.orgs}
                sub={`${totals.teams} teams`}
              />
              <StatCard
                icon={FileText}
                label="Surveys"
                value={totals.surveys}
                sub={`${totals.surveys_published} published · ${totals.surveys_draft} draft`}
              />
              <StatCard
                icon={Activity}
                label="Interviews"
                value={totals.interviews}
                sub={`${totals.interviews_test} test runs`}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
            >
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={totals.interviews_completed}
                tone="success"
              />
              <StatCard
                icon={Clock}
                label="In progress"
                value={totals.interviews_in_progress}
                tone="muted"
              />
              <StatCard
                icon={AlertTriangle}
                label="Abandoned"
                value={totals.interviews_abandoned}
                tone="muted"
              />
              <StatCard
                icon={TrendingUp}
                label="Completion rate"
                value={`${totals.completion_rate}%`}
                tone="accent"
              />
            </motion.div>

            {/* Growth + sparklines */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg text-text-primary">Signups (30d)</h3>
                  <span className="text-xs text-text-muted font-sans">
                    {growth.users.last_30d} total
                  </span>
                </div>
                <Sparkline points={timeseries.users} />
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg text-text-primary">Surveys created (30d)</h3>
                  <span className="text-xs text-text-muted font-sans">
                    {growth.surveys.last_30d} total
                  </span>
                </div>
                <Sparkline points={timeseries.surveys} />
              </div>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg text-text-primary">Interviews (30d)</h3>
                  <span className="text-xs text-text-muted font-sans">
                    {growth.interviews.last_30d} total
                  </span>
                </div>
                <Sparkline points={timeseries.interviews} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <GrowthBlock title="User growth" data={growth.users} />
                <GrowthBlock title="Interview growth" data={growth.interviews} />
              </div>
            </div>

            {/* Top lists */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg text-text-primary">Top users</h3>
                  <Link
                    to="/admin/users"
                    className="text-xs text-accent hover:underline font-sans"
                  >
                    View all →
                  </Link>
                </div>
                {usage.top_users.length === 0 ? (
                  <p className="text-sm text-text-muted font-sans">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {usage.top_users.map((u) => (
                      <Link
                        key={u.user_id}
                        to={`/admin/users/${u.user_id}`}
                        className="flex items-center justify-between gap-3 pb-3 border-b border-card-border/60 last:border-0 last:pb-0 hover:bg-accent/5 rounded transition-colors -mx-2 px-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-sans text-text-primary truncate">
                            {u.name || u.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-text-muted font-sans truncate">
                            {u.email}{u.org_name ? ` · ${u.org_name}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-serif text-text-primary">{u.interviews_received}</p>
                          <p className="text-xs text-text-muted font-sans">interviews</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="font-serif text-lg text-text-primary mb-4">Top surveys</h3>
                {usage.top_surveys.length === 0 ? (
                  <p className="text-sm text-text-muted font-sans">No activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {usage.top_surveys.map((s) => (
                      <div
                        key={s.survey_id}
                        className="flex items-center justify-between gap-3 pb-3 border-b border-card-border/60 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-sans text-text-primary truncate">{s.title}</p>
                          <p className="text-xs text-text-muted font-sans truncate">
                            {s.status} · {s.creator_email || 'unknown creator'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-serif text-text-primary">{s.total_interviews}</p>
                          <p className="text-xs text-text-muted font-sans">{s.completed} completed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* LLM usage */}
            <div className="card mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-accent" />
                <h3 className="font-serif text-lg text-text-primary">LLM provider distribution</h3>
              </div>
              {usage.llm_usage.length === 0 ? (
                <p className="text-sm text-text-muted font-sans">No surveys yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {usage.llm_usage.map((l) => (
                    <span
                      key={l.provider}
                      className="inline-flex items-center gap-2 bg-accent/10 text-accent px-3 py-1.5 rounded-full text-sm font-sans"
                    >
                      <span className="font-medium">{l.provider}</span>
                      <span className="text-xs text-accent/70">{l.surveys}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback */}
            <div className="card mb-6">
              <button
                onClick={() => setFeedbackOpen((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <h3 className="font-serif text-lg text-text-primary">
                    Recent feedback
                  </h3>
                  <span className="text-xs text-text-muted font-sans">
                    ({totals.feedback} total)
                  </span>
                </div>
                {feedbackOpen ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>
              {feedbackOpen && (
                <div className="mt-4 space-y-3">
                  {feedback.length === 0 ? (
                    <p className="text-sm text-text-muted font-sans">No feedback yet.</p>
                  ) : (
                    feedback.map((f) => (
                      <div
                        key={f.id}
                        className="pb-3 border-b border-card-border/60 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-sans text-text-primary truncate">
                              {f.name || f.email || 'Anonymous'}
                            </p>
                            {f.rating != null && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-accent">
                                <Star className="w-3 h-3 fill-current" />
                                {f.rating}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted font-sans shrink-0">
                            {formatDateWithTime(f.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted font-sans whitespace-pre-wrap">
                          {f.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Errors — hidden by default */}
            <div className="card">
              <button
                onClick={openErrors}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-error" />
                  <h3 className="font-serif text-lg text-text-primary">Error logs</h3>
                  <span className="text-xs text-text-muted font-sans">
                    ({totals.errors} total — hidden by default)
                  </span>
                </div>
                {errorsOpen ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>
              {errorsOpen && (
                <div className="mt-4">
                  {errorsLoading && (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {!errorsLoading && errorsList.length === 0 && errorsFetched && (
                    <p className="text-sm text-text-muted font-sans">No errors logged.</p>
                  )}
                  {!errorsLoading && errorsList.length > 0 && (
                    <div className="space-y-3">
                      {errorsList.map((e) => (
                        <div
                          key={e.id}
                          className="pb-3 border-b border-card-border/60 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="min-w-0">
                              <p className="text-sm font-sans text-error truncate">
                                {e.error_type}
                              </p>
                              <p className="text-xs text-text-muted font-mono truncate">
                                {e.location}
                              </p>
                            </div>
                            <span className="text-xs text-text-muted font-sans shrink-0">
                              {formatDateWithTime(e.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted font-sans break-words">
                            {e.error_message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
