import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useInterviewAnalysis } from '../hooks/useInterviewAnalysis';
import { getInterviewDetail } from '../api';
import {
  InterviewHeader,
  TabBar,
  OverviewTab,
  ThemesTab,
  QuestionsTab,
  TranscriptTab,
  AnalysisStreaming,
} from '../components/analytics';

export default function InterviewDetail() {
  const { interviewId } = useParams();
  const { logout } = useAuth();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const {
    analysis,
    rawStream,
    analyzing,
    analysisError,
    startAnalysis,
    cancelAnalysis,
    setAnalysisFromCache,
  } = useInterviewAnalysis();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getInterviewDetail(interviewId);
        setInterview(res.data);
        if (res.data.analysis) {
          setAnalysisFromCache(res.data.analysis);
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load interview');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [interviewId, setAnalysisFromCache]);

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
        <main className="container-max max-w-4xl section-padding">
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
            {error || 'Interview not found'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact header */}
      <InterviewHeader
        interview={interview}
        analyzing={analyzing}
        analysis={analysis}
        onAnalyze={() => startAnalysis(interviewId)}
        onCancel={cancelAnalysis}
        onLogout={logout}
      />

      {/* Tab bar */}
      <TabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        messageCount={interview.conversation?.length}
      />

      {/* Content area */}
      <main className="flex-1 container-max max-w-4xl w-full py-6 px-4 sm:px-6">
        {/* Analysis error */}
        {analysisError && (
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans mb-4">
            {analysisError}
          </div>
        )}

        {/* Streaming preview (above tab content, always visible) */}
        {analyzing && (
          <div className="mb-4">
            <AnalysisStreaming rawStream={rawStream} />
          </div>
        )}

        {/* Tab content with fade transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab interview={interview} analysis={analysis} />
            )}
            {activeTab === 'themes' && (
              <ThemesTab analysis={analysis} />
            )}
            {activeTab === 'questions' && (
              <QuestionsTab analysis={analysis} />
            )}
            {activeTab === 'transcript' && (
              <TranscriptTab conversation={interview.conversation} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
