import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Users, Send, Crown, Shield, User, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getOrg, updateOrg, getOrgMembers, updateMemberRole, removeMember, sendInvite } from '../api';

export default function OrgSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgName, setOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const canInvite = isOwner || isAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgRes, membersRes] = await Promise.all([getOrg(), getOrgMembers()]);
      setOrg(orgRes.data.org);
      setOrgName(orgRes.data.org.name);
      setMembers(membersRes.data.members);
    } catch (err) {
      setError('Failed to load organization data');
    }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await updateOrg({ name: orgName });
      setMessage('Organization updated');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setMessage('');
    setError('');
    try {
      await sendInvite(inviteEmail, inviteRole);
      setMessage(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateMemberRole(userId, newRole);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change role');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!confirm(`Remove ${memberName} from the organization?`)) return;
    try {
      await removeMember(userId);
      fetchData();
      setMessage(`${memberName} removed`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const roleIcon = (role) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-blue-400" />;
    return <User className="w-3.5 h-3.5 text-white/40" />;
  };

  const roleBadgeColor = (role) => {
    if (role === 'owner') return 'bg-amber-400/10 text-amber-400 border-amber-400/20';
    if (role === 'admin') return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
    return 'bg-white/5 text-white/60 border-white/10';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/settings')} className="text-dark/40 hover:text-dark transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif text-dark">Organization Settings</h1>
            <p className="text-dark/50 text-sm font-sans">{org?.name || 'Loading...'}</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-green-700 text-sm">{message}</p>
          </motion.div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Org Name */}
          {isOwner && (
            <div className="card p-6">
              <h2 className="text-lg font-serif text-dark mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                Organization Name
              </h2>
              <form onSubmit={handleUpdateOrg} className="flex gap-3">
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="flex-1 border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                />
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </form>
            </div>
          )}

          {/* Invite Members */}
          {canInvite && (
            <div className="card p-6">
              <h2 className="text-lg font-serif text-dark mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-accent" />
                Invite Members
              </h2>
              <form onSubmit={handleInvite} className="flex gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="email@company.com"
                  className="flex-1 border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="border border-dark/10 rounded-lg px-3 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={inviting} className="btn-primary text-sm">
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          {/* Members List */}
          <div className="card p-6">
            <h2 className="text-lg font-serif text-dark mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              Members ({members.length})
            </h2>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between py-3 border-b border-dark/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center">
                      <span className="text-accent text-sm font-medium">{member.name?.[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark">{member.name}</p>
                      <p className="text-xs text-dark/40">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isOwner && member.role !== 'owner' ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                        className="text-xs border border-dark/10 rounded-md px-2 py-1 font-sans
                                   focus:outline-none focus:border-accent/50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${roleBadgeColor(member.role)}`}>
                        {roleIcon(member.role)}
                        {member.role}
                      </span>
                    )}

                    {(isOwner || (isAdmin && member.role === 'member')) && member.user_id !== user?.user_id && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.name)}
                        className="text-dark/30 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
