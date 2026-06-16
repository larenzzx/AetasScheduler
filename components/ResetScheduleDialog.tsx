'use client';

import { useState, useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { Team } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { parseISO, addDays } from 'date-fns';
import { formatWeekRange } from '@/lib/utils';

export default function ResetScheduleDialog() {
  const { 
    currentWeekDate, 
    activeTab, 
    alabangWeek, 
    zamboangaWeek, 
    deleteSchedule 
  } = useScheduleStore();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetTeam, setTargetTeam] = useState<'ALABANG' | 'ZAMBOANGA' | 'BOTH'>('BOTH');

  // Align targetTeam state to the active tab when tab changes or dialog opens
  useEffect(() => {
    if (activeTab === 'ALABANG') {
      setTargetTeam('ALABANG');
    } else if (activeTab === 'ZAMBOANGA') {
      setTargetTeam('ZAMBOANGA');
    } else {
      setTargetTeam('BOTH');
    }
  }, [activeTab, open]);

  // Check if any schedule week exists to reset
  const hasAlabang = alabangWeek !== null;
  const hasZamboanga = zamboangaWeek !== null;
  
  const showResetButton = 
    (activeTab === 'ALABANG' && hasAlabang) ||
    (activeTab === 'ZAMBOANGA' && hasZamboanga) ||
    (activeTab === 'ALL' && (hasAlabang || hasZamboanga));

  if (!showResetButton) {
    return null;
  }

  // Parse week dates for user confirmation message
  const weekStart = parseISO(currentWeekDate);
  const weekEnd = addDays(weekStart, 6);
  const dateRangeLabel = formatWeekRange(weekStart, weekEnd);

  const handleReset = async () => {
    setLoading(true);
    try {
      const teamsToReset: Team[] = [];
      if (targetTeam === 'BOTH') {
        if (hasAlabang) teamsToReset.push(Team.ALABANG);
        if (hasZamboanga) teamsToReset.push(Team.ZAMBOANGA);
      } else {
        if (targetTeam === 'ALABANG' && hasAlabang) teamsToReset.push(Team.ALABANG);
        if (targetTeam === 'ZAMBOANGA' && hasZamboanga) teamsToReset.push(Team.ZAMBOANGA);
      }

      if (teamsToReset.length === 0) {
        toast.error('No schedule week exists for the selected team(s).');
        setLoading(false);
        return;
      }

      // Execute deletions
      await Promise.all(teamsToReset.map((team) => deleteSchedule(team)));

      toast.success('Schedule week reset successfully!');
      setOpen(false);
    } catch (error) {
      console.error('Failed to reset schedule week:', error);
      toast.error('An error occurred while resetting the schedule week.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button 
            variant="outline"
            size="sm"
            className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium text-xs"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Week
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
            Reset Week Schedule?
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            This will permanently delete the schedule assignments for the week of <strong className="text-slate-700 font-semibold">{dateRangeLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {activeTab === 'ALL' ? (
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select Team to Reset
              </label>
              <Select 
                value={targetTeam} 
                onValueChange={(val) => { if (val) setTargetTeam(val as 'ALABANG' | 'ZAMBOANGA' | 'BOTH'); }}
              >
                <SelectTrigger className="border-slate-200 text-slate-800">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="BOTH" className="hover:bg-slate-50">
                    Both Teams {(!hasAlabang || !hasZamboanga) && '(only active schedules will be deleted)'}
                  </SelectItem>
                  {hasAlabang && <SelectItem value="ALABANG" className="hover:bg-slate-50">Team Alabang</SelectItem>}
                  {hasZamboanga && <SelectItem value="ZAMBOANGA" className="hover:bg-slate-50">Team Zamboanga</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed">
              You are about to clear all shifts and delete the schedule week record for{' '}
              <strong className="text-slate-800 font-semibold">
                {activeTab === 'ALABANG' ? 'Team Alabang' : 'Team Zamboanga'}
              </strong>
              . Once done, you can initialize a new blank schedule or copy from a prior week.
            </div>
          )}

          <div className="text-xs text-red-500 font-semibold flex items-start gap-1 bg-red-50 border border-red-200/40 p-2.5 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>Warning: All unsaved and database-committed schedule entries for this week will be deleted. This cannot be undone.</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReset}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-md shadow-red-600/10 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Confirm Reset'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
