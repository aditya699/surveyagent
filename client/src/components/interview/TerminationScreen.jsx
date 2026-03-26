import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, Pencil, RotateCcw, Home } from 'lucide-react';

export default function TerminationScreen({ isTestMode, surveyId, onTestAgain }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center h-full px-4"
    >
      <div className="card text-center max-w-md">
        <div className="flex justify-center mb-4">
          <ShieldAlert className="w-12 h-12 text-text-muted" />
        </div>
        <h2 className="text-2xl font-serif text-text-primary mb-2">
          Interview Ended
        </h2>
        <p className="text-sm font-sans text-text-muted leading-relaxed">
          {isTestMode
            ? 'The session was terminated due to abuse detection. This is how respondents will see it in production.'
            : 'This interview was ended due to inappropriate or abusive language. Please maintain a respectful tone when participating in surveys.'}
        </p>

        {isTestMode ? (
          <div className="flex gap-2.5 mt-6">
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
    </motion.div>
  );
}
