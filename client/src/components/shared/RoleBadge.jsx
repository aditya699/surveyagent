import { Crown, Shield, User } from 'lucide-react';

const ROLE_CONFIG = {
  owner: { icon: Crown, label: 'Owner', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  admin: { icon: Shield, label: 'Admin', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  member: { icon: User, label: 'Member', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

export default function RoleBadge({ role = 'member' }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.member;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
