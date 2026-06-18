'use client';

import { useState, useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Button } from '@/components/ui/button';
import { Settings, Building2, Calendar, Clock, RotateCw, Save, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateAccountDetails } from '@/app/actions/auth';
import { getTeamSettings, updateTeamSettings } from '@/app/actions/schedule';

export default function SettingsPage() {
  const { companyName, setCompanyName, currentUser, fetchCurrentUser } = useScheduleStore();
  const [accountLoading, setAccountLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [alabangRotation, setAlabangRotation] = useState(true);
  const [zamboangaRotation, setZamboangaRotation] = useState(true);

  useEffect(() => {
    fetchCurrentUser();
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
