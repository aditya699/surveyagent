import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, Timer, Mic, Keyboard, Radio } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getInterviewInfo, startInterview, startTestInterview, publishSurvey } from '../api';
import InterviewChat from '../components/interview/InterviewChat';
import RealtimeChat from '../components/interview/RealtimeChat';
import RespondentForm from '../components/interview/RespondentForm';
import CompletionScreen from '../components/interview/CompletionScreen';
import TerminationScreen from '../components/interview/TerminationScreen';
import { formatTimer } from '../utils/formatters';
import { PoweredBy } from '../components/shared';

// Phases: loading | info | details | chatting | completed | terminated | error
export default function InterviewPage() {
  const { token, surveyId } = useParams();
  const [searchParams] = useSearchParams();
  const isTestMode = !!surveyId || searchParams.get('test') === 'true';
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState('loading');
  const [surveyInfo, setSurveyInfo] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [testKey, setTestKey] = useState(0); // bump to re-trigger test mode

  // Timer state
  const startTimeRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(null);

  // Interview mode: 'text' | 'voice' | 'live'
  const [interviewMode, setInterviewMode] = useState('text');

  const onComplete = useCallback(() => {
    if (startTimeRef.current) {
      setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
    }
    setPhase('completed');
  }, []);

  const onTerminated = useCallback((reason) => {
    if (startTimeRef.current) {
      setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
    }
    setPhase('terminated');
  }, []);

  // Tick the timer every second while chatting
  useEffect(() => {
    if (phase !== 'chatting' || !startTimeRef.current) return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // --- Test mode: wait for auth, then start immediately ---
  useEffect(() => {
    if (!isTestMode || authLoading) return;
    if (!isAuthenticated) return; // will redirect below

    let cancelled = false;
    (async () => {
      try {
        const res = await startTestInterview(surveyId);
        if (cancelled) return;
        const d = res.data;
        setSurveyInfo({
          title: d.survey_title,
          estimated_duration: d.estimated_duration,
          status: d.survey_status,
          token: d.survey_token,
        });
        setSessionId(d.session_id);
        setWelcomeMessage(d.welcome_message);
        startTimeRef.current = Date.now();
        setElapsed(0);
        setDuration(null);
        setPhase('chatting');
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Failed to start test session');
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [isTestMode, authLoading, isAuthenticated, surveyId, testKey]);

  // --- Respondent mode: fetch survey info ---
  useEffect(() => {
    if (isTestMode || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await getInterviewInfo(token);
        if (cancelled) return;
        setSurveyInfo(res.data);
        setPhase('info');
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.detail || 'Survey not found');
        setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [isTestMode, token]);

  // --- Start interview (respondent mode) ---
  const handleStart = async (respondent) => {
    setStarting(true);
    try {
      const res = await startInterview(token, respondent);
      const d = res.data;
      setSurveyInfo((prev) => ({ ...prev, title: d.survey_title }));
      setSessionId(d.session_id);
      setWelcomeMessage(d.welcome_message);
      startTimeRef.current = Date.now();
      setPhase('chatting');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start interview');
      setPhase('error');
    } finally {
      setStarting(false);
    }
  };

  // --- Test mode: restart with fresh session ---
  const handleTestAgain = useCallback(() => {
    setPhase('loading');
    setSessionId(null);
    setWelcomeMessage('');
    setTestKey((k) => k + 1);
  }, []);

  // --- Test mode: publish survey from completion screen ---
  const handlePublish = useCallback(async () => {
    const res = await publishSurvey(surveyId);
    const s = res.data.survey;
    setSurveyInfo((prev) => ({ ...prev, status: 'published', token: s.token }));
  }, [surveyId]);

  // --- Redirect unauthenticated admin to login ---
  if (isTestMode && !authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // --- Loading spinner ---
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- Error ---
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-serif text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-sm font-sans text-error">{error}</p>
        </div>
      </div>
    );
  }

  // --- Info screen (respondent only) ---
  if (phase === 'info') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card max-w-lg w-full text-center"
        >
          <h1 className="text-3xl font-serif text-text-primary mb-3">
            {surveyInfo.title}
          </h1>
          {surveyInfo.description && (
            <p className="text-sm font-sans text-text-muted mb-4 leading-relaxed">
              {surveyInfo.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-xs font-sans text-text-muted mb-6">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              ~{surveyInfo.estimated_duration} min
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Conversational
            </span>
          </div>
          <button
            onClick={() => setPhase('details')}
            className="btn-primary text-sm"
          >
            Begin
          </button>
          <PoweredBy className="mt-4" />
        </motion.div>
      </div>
    );
  }

  // --- Details form (respondent only) ---
  if (phase === 'details') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full"
        >
          <RespondentForm onSubmit={handleStart} loading={starting} />
          <PoweredBy className="mt-3" />
        </motion.div>
      </div>
    );
  }

  // --- Chat ---
  if (phase === 'chatting') {
    return (
      <div className="h-screen bg-background flex flex-col">
        {/* Minimal header */}
        <header className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-card-border/50 shadow-sm px-4 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-accent" />
          </div>
          <h1 className="text-sm font-serif text-text-primary line-clamp-1 flex-1">
            {surveyInfo?.title || 'Interview'}
          </h1>
          <span className="flex items-center gap-1.5 text-xs font-sans text-text-muted tabular-nums">
            <Timer className="w-3.5 h-3.5" />
            {formatTimer(elapsed)}
          </span>
          {/* Mode toggle — segmented pill: Text / Voice / Live */}
          <div className="flex items-center bg-background rounded-full p-0.5 border border-card-border/60">
            {[
              { key: 'text', icon: Keyboard, label: 'Text' },
              { key: 'voice', icon: Mic, label: 'Voice' },
              { key: 'live', icon: Radio, label: 'Live' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setInterviewMode(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium transition-all duration-200 ${
                  interviewMode === key
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
          {isTestMode && (
            <span className="text-[10px] font-sans font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              TEST
            </span>
          )}
        </header>

        {/* Chat area fills remaining space */}
        <div className="flex-1 min-h-0">
          {interviewMode === 'live' ? (
            <RealtimeChat
              sessionId={sessionId}
              welcomeMessage={welcomeMessage}
              onComplete={onComplete}
              onTerminated={onTerminated}
            />
          ) : (
            <InterviewChat
              sessionId={sessionId}
              welcomeMessage={welcomeMessage}
              onComplete={onComplete}
              onTerminated={onTerminated}
              voiceMode={interviewMode === 'voice'}
            />
          )}
        </div>
      </div>
    );
  }

  // --- Completed ---
  if (phase === 'completed') {
    return (
      <div className="h-screen bg-background">
        <CompletionScreen
          surveyTitle={surveyInfo?.title}
          isTestMode={isTestMode}
          duration={duration}
          surveyId={surveyId}
          surveyStatus={surveyInfo?.status}
          surveyToken={surveyInfo?.token}
          onTestAgain={handleTestAgain}
          onPublish={handlePublish}
        />
      </div>
    );
  }

  // --- Terminated (abuse detected) ---
  if (phase === 'terminated') {
    return (
      <div className="h-screen bg-background">
        <TerminationScreen
          isTestMode={isTestMode}
          surveyId={surveyId}
          onTestAgain={isTestMode ? handleTestAgain : undefined}
        />
      </div>
    );
  }

  return null;
}
