export function scoreColor(score) {
  if (score >= 7) return 'text-green-600';
  if (score >= 4) return 'text-amber-500';
  return 'text-red-500';
}

export function scoreBg(score) {
  if (score >= 7) return 'bg-green-50 border-green-200';
  if (score >= 4) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function sentimentBadge(sentiment) {
  const map = {
    positive: 'bg-green-100 text-green-700',
    neutral: 'bg-gray-100 text-gray-700',
    negative: 'bg-red-100 text-red-700',
    mixed: 'bg-amber-100 text-amber-700',
  };
  return map[sentiment] || map.neutral;
}

export function questionStatusBadge(status) {
  const map = {
    well_answered: { cls: 'bg-green-100 text-green-700', label: 'Well Answered' },
    partially_answered: { cls: 'bg-amber-100 text-amber-700', label: 'Partial' },
    not_covered: { cls: 'bg-gray-100 text-gray-500', label: 'Not Covered' },
    skipped: { cls: 'bg-red-100 text-red-700', label: 'Skipped' },
  };
  return map[status] || map.not_covered;
}

export function qualityBadge(quality) {
  const map = {
    well_answered: { cls: 'bg-green-100 text-green-700', label: 'Well Answered' },
    partially_answered: { cls: 'bg-amber-100 text-amber-700', label: 'Partially Answered' },
    poorly_answered: { cls: 'bg-red-100 text-red-700', label: 'Poorly Answered' },
  };
  return map[quality] || { cls: 'bg-gray-100 text-gray-500', label: quality || 'Unknown' };
}
