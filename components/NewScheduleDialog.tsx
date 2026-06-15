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
import { Plus, CalendarRange, Loader2 } from 'lucide-react';
import { startOfWeek, format, parseISO } from 'date-fns';

export default function NewScheduleDialog() {
  const { fetchSchedule, setWeekDate } = useScheduleStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [teamSelection, setTeamSelection] = useState<'ALABANG' | 'ZAMBOANGA' | 'BOTH'>('BOTH');
  const [strategy, setStrategy] = useState<'blank' | 'copy'>('copy');

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
      await Promise.all(
        teamsToCreate.map((t) => createScheduleWeek(targetMondayStr, t, strategy))
      );

      // Set store to the newly created week and trigger reload
      setWeekDate(targetMondayStr);
      await fetchSchedule();
      
      toast.success('Schedule week created successfully!');
      setOpen(false);
    } catch (error) {
      console.error('Failed to create schedule week:', error);
      toast.error('An error occurred while creating the schedule week.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
              onValueChange={(val) => { if (val) setStrategy(val); }}
            >
              <SelectTrigger className="border-slate-200 text-slate-800">
                <SelectValue placeholder="Select Options" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
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
