import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function VerifyEmail() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await verifyOtp(email, fullCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await resendOtp(email);
      setResendCooldown(60);
      setSuccess('New code sent! Check your inbox.');
      // Clear success after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

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
          <p className="text-white/40 mt-2 font-sans text-sm">Verify your email</p>
        </div>

        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-accent" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">Check your email</h2>
            <p className="text-white/50 text-sm font-sans">
              We sent a 6-digit code to <span className="text-white/80">{email}</span>
            </p>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-error text-sm font-sans">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-green-400 text-sm font-sans">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 bg-white/5 border border-white/10 rounded-lg text-center
                             text-white text-xl font-mono
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || code.join('').length !== 6}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-accent text-sm font-sans hover:underline disabled:text-white/30 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
            >
              {resending ? (
                <>
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend code in ${resendCooldown}s`
              ) : (
                'Resend code'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
