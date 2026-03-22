import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const styles = {
  completed: 'bg-success/10 text-success',
  abandoned: 'bg-error/10 text-error',
  in_progress: 'bg-accent/10 text-accent',
};

const labels = {
  completed: 'Completed',
  abandoned: 'Abandoned',
  in_progress: 'In Progress',
};

export default function InterviewStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-sans font-medium ${styles[status] || styles.in_progress}`}
    >
      {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'abandoned' && <XCircle className="w-3 h-3" />}
      {status === 'in_progress' && <Loader2 className="w-3 h-3" />}
      {labels[status] || status}
    </span>
  );
}
