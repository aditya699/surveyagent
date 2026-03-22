import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  LogOut,
  User,
  Mail,
  Clock,
  Calendar,
  HelpCircle,
  Briefcase,
  Phone,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getInterviewDetail } from '../api';
import { formatDuration, formatDateWithTime, formatTime } from '../utils/formatters';
import InterviewStatusBadge from '../components/shared/InterviewStatusBadge';

export default function InterviewDetail() {
  const { interviewId } = useParams();
  const { logout } = useAuth();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getInterviewDetail(interviewId);
        setInterview(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [interviewId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !interview) {
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
        <main className="container-max max-w-3xl section-padding">
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
            {error || 'Interview not found'}
          </div>
        </main>
      </div>
    );
  }

  const respondent = interview.respondent || {};
  const hasRespondent = respondent.name || respondent.email;
  const respondentFields = [
    { icon: User, label: 'Name', value: respondent.name },
    { icon: Mail, label: 'Email', value: respondent.email },
    { icon: Calendar, label: 'Age', value: respondent.age },
    { icon: User, label: 'Gender', value: respondent.gender },
    { icon: Briefcase, label: 'Occupation', value: respondent.occupation },
    { icon: Phone, label: 'Phone', value: respondent.phone_number },
  ].filter((f) => f.value);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/surveys/${interview.survey_id}/analytics`}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            {interview.survey_title}
          </Link>
          <span className="text-card-border">|</span>
          <h1 className="text-xl font-serif text-text-primary">Interview Transcript</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="container-max max-w-3xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Info section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-serif text-lg text-text-primary">
                    {hasRespondent ? (respondent.name || respondent.email) : 'Anonymous Respondent'}
                  </p>
                </div>
              </div>
              <InterviewStatusBadge status={interview.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm font-sans">
              <div>
                <p className="text-text-muted text-xs mb-1">Started</p>
                <p className="text-text-primary">{formatDateWithTime(interview.started_at)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Duration</p>
                <p className="text-text-primary">{formatDuration(interview.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Questions Covered</p>
                <p className="text-text-primary">{interview.questions_covered?.length || 0}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs mb-1">Completed</p>
                <p className="text-text-primary">{interview.completed_at ? formatDateWithTime(interview.completed_at) : '--'}</p>
              </div>
            </div>

            {/* Respondent details */}
            {respondentFields.length > 0 && (
              <div className="mt-4 pt-4 border-t border-card-border">
                <p className="text-xs text-text-muted font-sans mb-2">Respondent Details</p>
                <div className="flex flex-wrap gap-4">
                  {respondentFields.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-1.5 text-sm font-sans text-text-primary">
                      <Icon className="w-3.5 h-3.5 text-text-muted/40" />
                      <span className="text-text-muted">{label}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conversation transcript */}
          <div className="card">
            <h3 className="font-serif text-lg text-text-primary mb-4">Conversation</h3>
            <div className="space-y-4">
              {interview.conversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-accent/10 text-text-primary rounded-br-md'
                        : 'bg-background text-text-primary rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm font-sans leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.timestamp && (
                      <p className="text-xs text-text-muted/60 mt-1 font-sans">
                        {formatTime(msg.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {interview.conversation.length === 0 && (
                <p className="text-sm text-text-muted font-sans text-center py-4">
                  No messages in this conversation.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
