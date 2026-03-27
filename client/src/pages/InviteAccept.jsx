import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getInviteInfo } from '../api';

export default function InviteAccept() {
  const { token } = useParams();
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { registerViaInvite } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await getInviteInfo(token);
        setInviteInfo(res.data);
      } catch (err) {
        setInviteError(err.response?.data?.detail || 'Invalid or expired invite');
      } finally {
        setLoadingInvite(false);
      }
    };
    fetchInfo();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await registerViaInvite(token, name, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="glass-card p-8">
            <h2 className="text-xl font-serif text-white mb-4">Invite Not Valid</h2>
            <p className="text-white/50 text-sm font-sans mb-6">{inviteError}</p>
            <Link to="/login" className="btn-primary inline-block">
              Go to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-serif text-white">SurveyAgent</h1>
          </Link>
          <p className="text-white/40 mt-2 font-sans text-sm">You've been invited</p>
        </div>

        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">
              Join {inviteInfo.org_name}
            </h2>
            <p className="text-white/50 text-sm font-sans">
              Create your account to join the team
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-error text-sm font-sans">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">Email</label>
              <input
                type="email"
                value={inviteInfo.email}
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5
                           text-white/50 font-sans text-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5
                             text-white placeholder-white/30 font-sans text-sm
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2.5
                             text-white placeholder-white/30 font-sans text-sm
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors"
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Join {inviteInfo.org_name}
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6 font-sans">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
