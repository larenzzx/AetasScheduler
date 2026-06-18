'use client';

import { useState, useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Button } from '@/components/ui/button';
import { Settings, Building2, Calendar, Clock, RotateCw, Save, User, Loader2, Briefcase, Trash2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { updateAccountDetails } from '@/app/actions/auth';
import { getTeamSettings, updateTeamSettings } from '@/app/actions/schedule';
import { getJobRoles, createJobRole, updateJobRole, deleteJobRole } from '@/app/actions/job-role';

export default function SettingsPage() {
  const { companyName, setCompanyName, currentUser, fetchCurrentUser } = useScheduleStore();
  const [accountLoading, setAccountLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [alabangRotation, setAlabangRotation] = useState(true);
  const [zamboangaRotation, setZamboangaRotation] = useState(true);

  // Job Role States
  const [jobRoles, setJobRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [rolesLoading, setRolesLoading] = useState(false);

  const fetchRoles = async () => {
    try {
      const roles = await getJobRoles();
      setJobRoles(roles);
    } catch (error) {
      console.error('Failed to fetch job roles:', error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchRoles();
  }, [fetchCurrentUser]);

  useEffect(() => {
    async function loadTeamSettings() {
      try {
        const settings = await getTeamSettings();
        const alabang = settings.find((s) => s.team === 'ALABANG');
        const zamboanga = settings.find((s) => s.team === 'ZAMBOANGA');
        if (alabang) setAlabangRotation(alabang.rotationEnabled);
        if (zamboanga) setZamboangaRotation(zamboanga.rotationEnabled);
      } catch (error) {
        console.error('Failed to load team settings:', error);
      }
    }
    loadTeamSettings();
  }, []);

  const handleCreateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setRolesLoading(true);
    try {
      const res = await createJobRole(newRoleName);
      if (res.success) {
        toast.success('Job role created successfully!');
        setNewRoleName('');
        await fetchRoles();
      } else {
        toast.error(res.error || 'Failed to create job role.');
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    if (!editingRoleName.trim()) return;

    setRolesLoading(true);
    try {
      const res = await updateJobRole(id, editingRoleName);
      if (res.success) {
        toast.success('Job role updated successfully!');
        setEditingRoleId(null);
        setEditingRoleName('');
        await fetchRoles();
      } else {
        toast.error(res.error || 'Failed to update job role.');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setRolesLoading(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const isConfirmed = confirm('Are you sure you want to delete this job role? Employees currently assigned to this role will be updated to "OTHER".');
    if (!isConfirmed) return;

    setRolesLoading(true);
    try {
      const res = await deleteJobRole(id);
      if (res.success) {
        toast.success('Job role deleted successfully!');
        await fetchRoles();
      } else {
        toast.error(res.error || 'Failed to delete job role.');
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setRolesLoading(false);
    }
  };

  // Handle Global Settings Submit
  const handleSaveGlobal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCompanyName = formData.get('companyName') as string;
    
    if (!newCompanyName.trim()) {
      toast.error('Company Name cannot be empty');
      return;
    }

    setGlobalLoading(true);
    try {
      setCompanyName(newCompanyName);
      await Promise.all([
        updateTeamSettings('ALABANG', alabangRotation),
        updateTeamSettings('ZAMBOANGA', zamboangaRotation),
      ]);
      toast.success('Global settings saved successfully!');
    } catch (error) {
      console.error('Failed to save global settings:', error);
      toast.error('Failed to save settings.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Handle Account Settings Submit
  const handleSaveAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;

    if (!displayName.trim()) {
      toast.error('Display Name cannot be empty');
      return;
    }

    if (password) {
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }

    setAccountLoading(true);
    try {
      const response = await updateAccountDetails(displayName, password || undefined);
      if (response.success) {
        toast.success('Account profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
        await fetchCurrentUser(); // Refresh the store & sidebar
      } else {
        toast.error(response.error || 'Failed to update account.');
      }
    } catch (error) {
      console.error('Failed to update account settings:', error);
      toast.error('An unexpected error occurred.');
    } finally {
      setAccountLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-emerald-600 animate-spin-slow" />
            Global & Account Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configure default schedules, headers, and manage your personal account profile.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Form 1: Global Settings */}
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="space-y-6">
            {/* Company Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2.5">
                <Building2 className="h-4.5 w-4.5 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Company Metadata
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Company Name (Used in PDF Export)
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    defaultValue={companyName}
                    placeholder="Enter Company Name"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    This name will be displayed in the top-right header box of all weekly schedule PDF exports.
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule Defaults Card (Locked / Visual only) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden opacity-90">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2.5">
                <Calendar className="h-4.5 w-4.5 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Schedule Config Defaults
                </h2>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Week Start */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Default Week Start Day
                  </label>
                  <div className="relative">
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed appearance-none animate-none"
                      disabled
                      value="MON"
                    >
                      <option value="MON">Monday (Standard)</option>
                    </select>
                    <Clock className="absolute right-3 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Locked to Monday to align with corporate payroll tracking rules.
                  </p>
                </div>

                {/* Rotation Interval */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Rotation Interval (Days)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed"
                      disabled
                      value="14"
                    />
                    <RotateCw className="absolute right-3 top-3 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Corporate default rotation interval set to 14 days (2 weeks).
                  </p>
                </div>
              </div>
            </div>

            {/* Team Rotation Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2.5">
                <RotateCw className="h-4.5 w-4.5 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Team Auto-Rotation Toggles
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Toggle schedule auto-rotation on or off per team. When disabled, schedule generation will keep employee shifts fixed to their assigned Base Shift instead of rotating them bi-weekly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Team Alabang Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-800">Team Alabang</div>
                      <div className="text-[10px] text-slate-400">Enable bi-weekly rotation</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={alabangRotation}
                      onChange={(e) => setAlabangRotation(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </div>

                  {/* Team Zamboanga Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-800">Team Zamboanga</div>
                      <div className="text-[10px] text-slate-400">Enable bi-weekly rotation</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={zamboangaRotation}
                      onChange={(e) => setZamboangaRotation(e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={globalLoading}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
            >
              {globalLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  Save Global Settings
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Custom Job Roles Settings Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Briefcase className="h-4.5 w-4.5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Manage Job Roles
              </h2>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              Define custom job roles for your team. You can assign these job roles to employees on the Employee Management page. Editing a role name will automatically update all employees assigned to it.
            </p>

            {/* Add Job Role Form */}
            <form onSubmit={handleCreateRole} className="flex gap-3 items-center">
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="E.g. QA LEAD, DEVOPS"
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                disabled={rolesLoading}
              />
              <Button
                type="submit"
                disabled={rolesLoading || !newRoleName.trim()}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Role
              </Button>
            </form>

            {/* List of Roles */}
            <div className="space-y-2.5">
              {jobRoles.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No custom job roles added yet.
                </div>
              ) : (
                <div className="grid gap-2">
                  {jobRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/30 hover:bg-slate-50/70 transition-all"
                    >
                      {editingRoleId === role.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingRoleName}
                            onChange={(e) => setEditingRoleName(e.target.value)}
                            className="flex-1 h-9 px-2.5 rounded border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                            disabled={rolesLoading}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleUpdateRole(role.id)}
                            disabled={rolesLoading || !editingRoleName.trim() || editingRoleName.trim().toUpperCase().replace(/\s+/g, '_') === role.name}
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setEditingRoleId(null);
                              setEditingRoleName('');
                            }}
                            disabled={rolesLoading}
                            className="h-8 border-slate-200 text-slate-500 text-[11px] font-bold"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-slate-700 tracking-wider">
                              {role.name.replace(/_/g, ' ')}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              Code: {role.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => {
                                setEditingRoleId(role.id);
                                setEditingRoleName(role.name.replace(/_/g, ' '));
                              }}
                              disabled={rolesLoading}
                              className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 px-2.5"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() => handleDeleteRole(role.id)}
                              disabled={rolesLoading}
                              className="h-8 border-slate-200 text-red-500 hover:bg-red-50/50 hover:text-red-600 px-2.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form 2: Account Settings */}
        <form onSubmit={handleSaveAccount} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2.5">
              <User className="h-4.5 w-4.5 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Account Settings
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <label htmlFor="displayName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Full Name / Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    defaultValue={currentUser?.name || ''}
                    key={currentUser?.name || ''}
                    placeholder="Enter display name"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>

                {/* Email (Disabled / Read-only) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Account Email (Read-Only)
                  </label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* New Password */}
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    placeholder="•••••••• (Leave blank to keep current)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Account Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={accountLoading}
              className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
            >
              {accountLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Updating Profile...
                </>
              ) : (
                <>
                  <Save className="h-4.5 w-4.5" />
                  Update Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
