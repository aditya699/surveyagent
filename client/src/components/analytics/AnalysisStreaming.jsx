import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function AnalysisStreaming({ rawStream }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
        <p className="text-xs font-sans text-text-muted">Analyzing transcript...</p>
      </div>
      <div className="bg-background rounded-xl p-4 max-h-48 overflow-y-auto">
        <pre className="text-xs font-sans text-text-muted/80 whitespace-pre-wrap break-words leading-relaxed">
          {rawStream}
          <span className="inline-block w-1.5 h-4 bg-accent/60 ml-0.5 animate-pulse align-middle" />
        </pre>
      </div>
    </motion.div>
  );
}
