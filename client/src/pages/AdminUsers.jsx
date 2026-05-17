import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getAdminUsers } from '../api';
import { formatDate } from '../utils/formatters';

const PAGE_SIZE = 50;

export default function AdminUsers() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounceRef = useRef(null);

  const fetchPage = async (p = page, q = search) => {
    setLoading(true);
    try {
      const r = await getAdminUsers({ page: p, pageSize: PAGE_SIZE, search: q });
      setData(r.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPage(1, search);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const goTo = (p) => {
    setPage(p);
    fetchPage(p, search);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            to="/admin"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <span className="text-card-border hidden sm:inline">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-accent shrink-0" />
            <h1 className="text-lg sm:text-xl font-serif text-text-primary truncate">All Users</h1>
          </div>
        </div>
        <span className="text-sm text-text-muted font-sans hidden sm:block">{user?.email}</span>
      </header>

      <main className="container-max section-padding">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, org..."
              className="w-full bg-white border border-card-border rounded-lg pl-10 pr-4 py-2.5 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
          {data && (
            <span className="text-sm text-text-muted font-sans">
              {data.total} total
            </span>
          )}
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans mb-6">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-0 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead className="bg-background/60 border-b border-card-border">
                  <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                    <th className="px-4 py-3 font-sans font-normal">User</th>
                    <th className="px-4 py-3 font-sans font-normal">Org</th>
                    <th className="px-4 py-3 font-sans font-normal">Role</th>
                    <th className="px-4 py-3 font-sans font-normal text-center">Verified</th>
                    <th className="px-4 py-3 font-sans font-normal text-right">Surveys</th>
                    <th className="px-4 py-3 font-sans font-normal text-right">Interviews</th>
                    <th className="px-4 py-3 font-sans font-normal">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                        No users match this search.
                      </td>
                    </tr>
                  )}
                  {data.users.map((u) => (
                    <tr
                      key={u.user_id}
                      className="border-b border-card-border/40 last:border-0 hover:bg-accent/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/users/${u.user_id}`}
                          className="block"
                        >
                          <p className="text-text-primary hover:text-accent transition-colors">
                            {u.name || '—'}
                          </p>
                          <p className="text-xs text-text-muted truncate">{u.email}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted truncate max-w-[160px]">
                        {u.org_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted capitalize">{u.role}</td>
                      <td className="px-4 py-3 text-center">
                        {u.email_verified ? (
                          <CheckCircle2 className="w-4 h-4 text-success inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-text-muted/40 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-text-primary">{u.surveys_created}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-text-primary">{u.interviews_received}</span>
                        {u.interviews_received > 0 && (
                          <span className="text-xs text-text-muted ml-1">
                            ({u.interviews_completed} done)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {u.created_at ? formatDate(u.created_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-card-border/60">
                <span className="text-xs text-text-muted">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goTo(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="p-1.5 rounded hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goTo(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
