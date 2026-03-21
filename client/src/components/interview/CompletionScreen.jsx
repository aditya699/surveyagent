import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export default function CompletionScreen({ surveyTitle, isTestMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center h-full px-4"
    >
      <div className="card text-center max-w-md">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-2xl font-serif text-text-primary mb-2">
          Interview Complete
        </h2>
        <p className="text-sm font-sans text-text-muted leading-relaxed">
          {isTestMode
            ? `Test session for "${surveyTitle}" finished. You can close this tab.`
            : 'Thank you for taking the time to share your thoughts. Your responses have been recorded.'}
        </p>
        {isTestMode && (
          <button
            onClick={() => window.close()}
            className="btn-secondary text-sm mt-6"
          >
            Close Tab
          </button>
        )}
      </div>
    </motion.div>
  );
}
