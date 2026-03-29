import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Star, ArrowLeft, Mic, CheckCircle, User, Mail, MessageSquare } from 'lucide-react';
import { submitFeedback } from '../api';
import useSpeechToText from '../hooks/useSpeechToText';

function StarRating({ rating, setRating }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(rating === star ? null : star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors"
        >
          <Star
            className={`w-6 h-6 ${
              star <= (hover || rating)
                ? 'text-accent fill-accent'
                : 'text-white/20'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function Feedback() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onTranscript = useCallback((text) => {
    setMessage((prev) => (prev ? prev + ' ' + text : text));
  }, []);

  const { isListening, isSupported, toggleListening } = useSpeechToText({ onTranscript });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const payload = { message };
      if (name.trim()) payload.name = name.trim();
      if (email.trim()) payload.email = email.trim();
      if (rating) payload.rating = rating;
      await submitFeedback(payload);
      setSubmitted(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
          <h2 className="text-2xl font-serif text-white mb-3">Thank you!</h2>
          <p className="text-white/50 font-sans text-sm mb-8">
            Your feedback has been submitted. We appreciate you taking the time to help us improve.
          </p>
          <Link
            to="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-serif text-white">SurveyAgent</h1>
          </Link>
          <p className="text-white/40 mt-2 font-sans text-sm">We'd love to hear from you</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-serif text-white mb-1">Share Your Feedback</h2>
          <p className="text-white/40 text-sm font-sans mb-6">
            Tell us what you think — what's working, what's not, or what you'd like to see next.
          </p>

          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 mb-4">
              <p className="text-error text-sm font-sans">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">
                Name <span className="text-white/30">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5
                             text-white placeholder-white/30 font-sans text-sm
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors"
                  placeholder="Your name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">
                Email <span className="text-white/30">(optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5
                             text-white placeholder-white/30 font-sans text-sm
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">
                Rating <span className="text-white/30">(optional)</span>
              </label>
              <StarRating rating={rating} setRating={setRating} />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-white/60 mb-1.5 font-sans">
                Message <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={5000}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-12 py-2.5
                             text-white placeholder-white/30 font-sans text-sm
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                             transition-colors resize-none"
                  placeholder="What's on your mind?"
                />
                {/* Dictate button */}
                {isSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-3 top-3 p-1 rounded-full transition-colors ${
                      isListening
                        ? 'text-red-400 animate-pulse bg-red-400/10'
                        : 'text-white/30 hover:text-white/60'
                    }`}
                    title={isListening ? 'Stop dictating' : 'Dictate your feedback'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex justify-between mt-1">
                {isListening && (
                  <p className="text-red-400 text-xs font-sans animate-pulse">Listening...</p>
                )}
                <p className="text-white/30 text-xs font-sans ml-auto">
                  {message.length}/5000
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6 font-sans">
            Your feedback helps us build a better product.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <Link to="/" className="text-white/40 text-sm font-sans hover:text-white/60 transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
