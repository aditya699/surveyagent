export default function StatusBadge({ status }) {
  const isDraft = status === 'draft';
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-sans font-medium ${
        isDraft ? 'bg-text-muted/10 text-text-muted' : 'bg-success/10 text-success'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isDraft ? 'bg-text-muted' : 'bg-success'}`}
      />
      {isDraft ? 'Draft' : 'Published'}
    </span>
  );
}
