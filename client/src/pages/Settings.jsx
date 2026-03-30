import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Building2, LogOut, Check, Users, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from '../components/shared';

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [orgName, setOrgName] = useState(user?.org_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasChanges = name !== (user?.name || '') || orgName !== (user?.org_name || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Only send changed fields
    const data = {};
    if (name.trim() && name !== user?.name) data.name = name.trim();
    if (orgName.trim() && orgName !== user?.org_name) data.org_name = orgName.trim();

    if (Object.keys(data).length === 0) return;

    setSaving(true);
    try {
      await updateProfile(data);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="bg-white border-b border-card-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-card-border hidden sm:inline">|</span>
          <h1 className="text-lg sm:text-xl font-serif text-text-primary">Settings</h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors font-sans"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Content */}
      <main className="container-max max-w-2xl section-padding">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Role badge */}
          {user?.role && (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-text-muted font-sans">Your role:</span>
              <RoleBadge role={user.role} />
            </div>
          )}

          {/* Quick links to org/team settings */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <Link to="/settings/org" className="card p-4 hover:border-accent/30 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans text-text-primary">Organization</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted/40 group-hover:text-accent transition-colors" />
            </Link>
            <Link to="/settings/teams" className="card p-4 hover:border-accent/30 transition-colors flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm font-sans text-text-primary">Teams</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted/40 group-hover:text-accent transition-colors" />
            </Link>
          </div>

          <h2 className="text-2xl font-serif text-text-primary mb-1">Profile</h2>
          <p className="text-sm text-text-muted font-sans mb-8">
            Update your name and organization.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-sm text-error font-sans">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-3 text-sm text-success font-sans flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-sans text-text-muted mb-1.5">Email</label>
              <div className="w-full bg-card/50 border border-card-border rounded-lg px-4 py-3 text-sm font-sans text-text-muted cursor-not-allowed">
                {user?.email}
              </div>
              <p className="text-xs text-text-muted/60 font-sans mt-1">Email cannot be changed.</p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-sans text-text-muted mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-card-border rounded-lg pl-10 pr-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="Your name"
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="org" className="block text-sm font-sans text-text-muted mb-1.5">
                Organization
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/40" />
                <input
                  id="org"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-white border border-card-border rounded-lg pl-10 pr-4 py-3 text-sm font-sans text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  placeholder="Organization name"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
