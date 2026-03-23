import { Sparkles } from 'lucide-react';

export default function AnalysisEmptyState() {
  return (
    <div className="card text-center py-12">
      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-6 h-6 text-accent/50" />
      </div>
      <p className="text-sm font-sans font-medium text-text-primary mb-1">No analysis yet</p>
      <p className="text-xs font-sans text-text-muted max-w-sm mx-auto">
        Click the Analyze button above to get AI-powered insights — quality score, themes, strengths, and actionable improvements.
      </p>
    </div>
  );
}
