import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Pencil, RotateCcw, Rocket, Link as LinkIcon, Check, Home } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';
import { PoweredBy } from '../shared';
import { formatDurationLong } from '../../utils/formatters';

export default function CompletionScreen({
  surveyTitle,
  isTestMode,
  duration,
  surveyId,
  surveyStatus,
  surveyToken,
  onTestAgain,
  onPublish,
}) {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const { copied, copy: copyToClipboard } = useClipboard();

  const isPublished = surveyStatus === 'published';

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError('');
    try {
      await onPublish();
    } catch (err) {
      setPublishError(err.response?.data?.detail || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    copyToClipboard(`${window.location.origin}/interview/${surveyToken}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-4"
    >
      <div className="card text-center max-w-md">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-2xl font-serif text-text-primary mb-2">
          Interview Complete
        </h2>
        {duration != null && (
          <p className="flex items-center justify-center gap-1.5 text-sm font-sans text-accent mb-3">
            <Clock className="w-4 h-4" />
            Interview completed in {formatDurationLong(duration)}
          </p>
        )}
        <p className="text-sm font-sans text-text-muted leading-relaxed">
          {isTestMode
            ? `Test session for "${surveyTitle}" finished.`
            : 'Thank you for taking the time to share your thoughts. Your responses have been recorded.'}
        </p>

        {isTestMode ? (
          <div className="flex flex-col gap-2.5 mt-6">
            <div className="flex gap-2.5">
              <Link
                to={`/surveys/${surveyId}/edit`}
                className="btn-secondary text-sm flex-1 inline-flex items-center justify-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Survey
              </Link>
              <button
                onClick={onTestAgain}
                className="btn-secondary text-sm flex-1 inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Test Again
              </button>
            </div>

            {isPublished ? (
              <button
                onClick={handleCopyLink}
                className="btn-primary text-sm w-full inline-flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    Copy Share Link
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary text-sm w-full inline-flex items-center justify-center gap-2"
              >
                <Rocket className="w-3.5 h-3.5" />
                {publishing ? 'Publishing...' : 'Publish Survey'}
              </button>
            )}

            {publishError && (
              <p className="text-xs font-sans text-error">{publishError}</p>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <Link
              to="/"
              className="btn-secondary text-sm inline-flex items-center justify-center gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              Back to Home
            </Link>
          </div>
        )}
      </div>
      <PoweredBy className="mt-4" />
    </motion.div>
  );
}
