import { MessageSquare } from 'lucide-react';

export default function PoweredBy({ className = '' }) {
  return (
    <div className={`text-center py-2.5 ${className}`}>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-sans text-text-muted/70 hover:text-accent transition-colors group"
      >
        <MessageSquare className="w-3 h-3 text-accent/50 group-hover:text-accent transition-colors" />
        Powered by{' '}
        <span className="font-serif font-semibold text-text-primary/60 group-hover:text-accent transition-colors">
          SurveyAgent
        </span>
      </a>
    </div>
  );
}
