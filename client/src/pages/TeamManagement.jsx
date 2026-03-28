import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, Trash2, ChevronDown, ChevronRight, UserPlus, ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getTeams, createTeam, deleteTeam, addTeamMember, removeTeamMember, getOrgMembers, sendInvite } from '../api';

export default function TeamManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [orgMembers, setOrgMembers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [addingMember, setAddingMember] = useState(null); // teamId being edited
  const [selectedMember, setSelectedMember] = useState('');
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  const canManage = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, membersRes] = await Promise.all([getTeams(), getOrgMembers()]);
      setTeams(teamsRes.data.teams);
      setOrgMembers(membersRes.data.members);
    } catch {
      setError('Failed to load teams');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createTeam(newName, newParent || null);
      setNewName('');
      setNewParent('');
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (teamId, teamName) => {
    if (!confirm(`Delete team "${teamName}" and all its sub-teams?`)) return;
    try {
      await deleteTeam(teamId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete team');
    }
  };

  const handleAddMember = async (teamId) => {
    if (!selectedMember) {
      setError('Please select a member first');
      return;
    }
    setError('');
    try {
      await addTeamMember(teamId, selectedMember);
      setAddingMember(null);
      setSelectedMember('');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    try {
      await removeTeamMember(teamId, userId);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setInviteSuccess('');
    try {
      await sendInvite(inviteEmail, inviteRole);
      setInviteSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const toggleExpand = (teamId) => {
    setExpanded((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const renderTeam = (team, isSubTeam = false) => (
    <div key={team.id} className={`${isSubTeam ? 'ml-8 border-l-2 border-dark/5 pl-4' : ''}`}>
      <div className="card p-4 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => toggleExpand(team.id)} className="text-dark/40 hover:text-dark">
              {expanded[team.id] !== false ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <Users className="w-4 h-4 text-accent" />
            <span className="font-medium text-dark text-sm">{team.name}</span>
            <span className="text-xs text-dark/40">({team.members?.length || 0} members)</span>
            {isSubTeam && (
              <span className="text-xs bg-dark/5 text-dark/50 px-2 py-0.5 rounded">sub-team</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAddingMember(addingMember === team.id ? null : team.id); setSelectedMember(''); setError(''); }}
              className="text-dark/40 hover:text-accent transition-colors"
              title="Add member"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            {canManage && (
              <button
                onClick={() => handleDelete(team.id, team.name)}
                className="text-dark/40 hover:text-red-500 transition-colors"
                title="Delete team"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded content: add member + members list */}
        {expanded[team.id] !== false && (
          <>
            {/* Add member dropdown */}
            {addingMember === team.id && (
              <>
                <div className="mt-3 flex gap-2 items-center">
                  <select
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    className="flex-1 border border-dark/10 rounded-md px-3 py-1.5 text-sm font-sans
                               focus:outline-none focus:border-accent/50"
                  >
                    <option value="">Select member...</option>
                    {orgMembers
                      .filter((m) => !team.members?.some((tm) => tm.user_id === m.user_id))
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                      ))}
                  </select>
                  <button onClick={() => handleAddMember(team.id)} className="btn-primary text-xs py-1.5 px-3">Add</button>
                  <button onClick={() => setAddingMember(null)} className="text-dark/40 hover:text-dark">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {canManage && (
                  <button
                    onClick={() => { setShowInvite(true); setInviteSuccess(''); setAddingMember(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="mt-2 text-xs text-accent hover:text-accent/80 font-sans flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> Invite a new member to org
                  </button>
                )}
              </>
            )}

            {/* Members list */}
            {team.members?.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {team.members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-accent/10 rounded-full flex items-center justify-center">
                        <span className="text-accent text-xs">{member.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm text-dark">{member.name}</span>
                      <span className="text-xs text-dark/40">{member.email}</span>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveMember(team.id, member.user_id)}
                        className="text-dark/30 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : addingMember !== team.id && (
              <p className="mt-3 text-xs text-dark/40 font-sans">No members yet. Click <UserPlus className="w-3 h-3 inline" /> to add one.</p>
            )}
          </>
        )}
      </div>

      {/* Sub-teams */}
      {expanded[team.id] !== false && team.sub_teams?.map((sub) => renderTeam(sub, true))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="text-dark/40 hover:text-dark transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-serif text-dark">Teams</h1>
              <p className="text-dark/50 text-sm font-sans">Manage teams and sub-teams</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowInvite(true); setInviteSuccess(''); }} className="btn-secondary text-sm flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" /> Invite to Org
              </button>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Create Team
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Invite Member Form */}
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 mb-6">
            <h3 className="text-lg font-serif text-dark mb-4">Invite Member to Organization</h3>
            {inviteSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-green-700 text-sm">{inviteSuccess}</p>
              </div>
            )}
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm text-dark/60 mb-1.5 font-sans">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                  placeholder="colleague@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-dark/60 mb-1.5 font-sans">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={inviting} className="btn-primary text-sm">
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button type="button" onClick={() => { setShowInvite(false); setInviteSuccess(''); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Create Team Modal */}
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 mb-6">
            <h3 className="text-lg font-serif text-dark mb-4">Create Team</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-dark/60 mb-1.5 font-sans">Team Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                  placeholder="e.g. UX Research"
                />
              </div>
              <div>
                <label className="block text-sm text-dark/60 mb-1.5 font-sans">Parent Team (optional — makes this a sub-team)</label>
                <select
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className="w-full border border-dark/10 rounded-lg px-4 py-2.5 text-sm font-sans
                             focus:outline-none focus:border-accent/50"
                >
                  <option value="">None (top-level team)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="btn-primary text-sm">
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Teams List */}
        {teams.length === 0 ? (
          <div className="card p-12 text-center">
            <Users className="w-10 h-10 text-dark/20 mx-auto mb-3" />
            <p className="text-dark/50 text-sm font-sans">No teams yet. Create one to get started.</p>
          </div>
        ) : (
          <div>{teams.map((team) => renderTeam(team))}</div>
        )}
      </div>
    </div>
  );
}
