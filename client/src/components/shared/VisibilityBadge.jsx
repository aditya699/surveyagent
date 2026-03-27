import { Lock, Users, Building2 } from 'lucide-react';

const VISIBILITY_CONFIG = {
  private: { icon: Lock, label: 'Private', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  team: { icon: Users, label: 'Team', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  org: { icon: Building2, label: 'Org', color: 'bg-purple-50 text-purple-600 border-purple-200' },
};

export default function VisibilityBadge({ visibility = 'private' }) {
  const config = VISIBILITY_CONFIG[visibility] || VISIBILITY_CONFIG.private;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
