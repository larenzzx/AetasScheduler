'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { createScheduleWeek } from '@/app/actions/schedule';
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
import { Plus, CalendarRange, Loader2, AlertTriangle } from 'lucide-react';
import { startOfWeek, format, parseISO } from 'date-fns';

export default function NewScheduleDialog() {
  const { fetchSchedule, setWeekDate } = useScheduleStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [teamSelection, setTeamSelection] = useState<'ALABANG' | 'ZAMBOANGA' | 'BOTH'>('BOTH');
  const [strategy, setStrategy] = useState<'blank' | 'copy' | 'generate'>('generate');

  // Summary States
  const [showSummary, setShowSummary] = useState(false);
  const [summaries, setSummaries] = useState<Array<{
    team: string;
    rotatedCount: number;
    autoResolvedCount: number;
    flaggedCount: number;
    skippedCount: number;
    flags: Array<{ employeeName: string; reason: string }>;
  }>>([]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      // Find the Monday of the selected date's week
      const targetMonday = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      const targetMondayStr = format(targetMonday, 'yyyy-MM-dd');

      const teamsToCreate: ('ALABANG' | 'ZAMBOANGA')[] = [];
      if (teamSelection === 'BOTH') {
        teamsToCreate.push(Team.ALABANG, Team.ZAMBOANGA);
      } else {
        teamsToCreate.push(teamSelection);
      }

      // Execute creation for selected teams
      const responses = await Promise.all(
        teamsToCreate.map(async (t) => {
          const res = await createScheduleWeek(targetMondayStr, t, strategy);
          return { team: t, summary: res.summary };
        })
      );

      // Set store to the newly created week and trigger reload
      setWeekDate(targetMondayStr);
      await fetchSchedule();
      
      toast.success('Schedule week initialized successfully!');

      if (strategy === 'generate') {
        const activeSummaries = responses
          .filter(r => r.summary)
          .map(r => ({
            team: r.team,
            rotatedCount: r.summary!.rotatedCount,
            autoResolvedCount: r.summary!.autoResolvedCount,
            flaggedCount: r.summary!.flaggedCount,
            skippedCount: r.summary!.skippedCount,
            flags: r.summary!.flags
          }));
        
        setSummaries(activeSummaries);
        setShowSummary(true);
      } else {
        setOpen(false);
      }
    } catch (error) {
      console.error('Failed to create schedule week:', error);
      toast.error('An error occurred while creating the schedule week.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setShowSummary(false);
    }
  };

  if (showSummary) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2 font-bold tracking-tight">
              <CalendarRange className="h-5 w-5 text-emerald-600 animate-bounce" />
              Generation Summary
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Roster generation and bi-weekly shift rotation results.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {summaries.map((s) => (
              <div key={s.team} className="space-y-4 border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    TEAM {s.team}
                  </h3>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2 text-center">
                    <span className="block text-xl font-bold text-emerald-600">{s.rotatedCount}</span>
                    <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider block truncate">Rotated</span>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-2 text-center">
                    <span className="block text-xl font-bold text-blue-600">{s.autoResolvedCount}</span>
                    <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-wider block truncate">Resolved</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                    <span className="block text-xl font-bold text-slate-500">{s.skippedCount}</span>
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block truncate">Skipped</span>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-2 text-center">
                    <span className="block text-xl font-bold text-red-600">{s.flaggedCount}</span>
                    <span className="text-[9px] font-semibold text-red-500 uppercase tracking-wider block truncate">Flagged</span>
                  </div>
                </div>

                {s.flags.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Flagged for Manual Review ({s.flags.length})
                    </h4>
                    <div className="space-y-2">
                      {s.flags.map((f, idx) => (
                        <div key={idx} className="rounded-lg bg-red-50/50 border border-red-100 p-3 text-xs leading-relaxed text-red-700 space-y-1">
                          <span className="font-bold block text-red-800">{f.employeeName}</span>
                          <span className="block text-slate-600">{f.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 bg-emerald-50/30 rounded-lg text-xs font-medium text-emerald-700 border border-emerald-100/50">
                    No conflicts detected. All active staff rotated successfully!
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setOpen(false);
                setShowSummary(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-semibold w-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-medium transition-all duration-200">
            <Plus className="mr-1.5 h-4 w-4" />
            New Schedule Week
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-emerald-600" />
            Create Schedule Week
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Generate a new schedule week. Weeks are automatically aligned to start on Monday.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Week Start Date */}
          <div className="grid gap-2">
            <label htmlFor="date" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Select Date in Week
            </label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Team Selection */}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Target Team
            </label>
            <Select 
              value={teamSelection} 
              onValueChange={(val) => { if (val) setTeamSelection(val); }}
            >
              <SelectTrigger className="border-slate-200 text-slate-800">
                <SelectValue placeholder="Select Team" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="BOTH" className="hover:bg-slate-50">Both Teams</SelectItem>
                <SelectItem value="ALABANG" className="hover:bg-slate-50">Team Alabang</SelectItem>
                <SelectItem value="ZAMBOANGA" className="hover:bg-slate-50">Team Zamboanga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Creation Strategy */}
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Initialization Options
            </label>
            <Select 
              value={strategy} 
              onValueChange={(val) => { if (val) setStrategy(val as any); }}
            >
              <SelectTrigger className="border-slate-200 text-slate-800">
                <SelectValue placeholder="Select Options" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="generate" className="hover:bg-slate-50">
                  <span className="font-medium">Auto-Generate (Base Shifts & Rotation)</span>
                  <span className="block text-[10px] text-slate-400 -mt-0.5">Applies base shifts & rotation rules automatically</span>
                </SelectItem>
                <SelectItem value="copy" className="hover:bg-slate-50">
                  <span className="font-medium">Copy from previous week</span>
                  <span className="block text-[10px] text-slate-400 -mt-0.5">Duplicates previous week&apos;s shifts exactly</span>
                </SelectItem>
                <SelectItem value="blank" className="hover:bg-slate-50">
                  <span className="font-medium">Start blank</span>
                  <span className="block text-[10px] text-slate-400 -mt-0.5">All cells initialized as DAY-OFF</span>
                </SelectItem>
              </SelectContent>
            </Select>
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
            onClick={handleCreate}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
