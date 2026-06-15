'use client';

import { useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import ScheduleGrid from '@/components/ScheduleGrid';
import NewScheduleDialog from '@/components/NewScheduleDialog';
import { Button } from '@/components/ui/button';
import { cn, formatWeekRange } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';

export default function SchedulePage() {
  const {
    currentWeekDate,
    activeTab,
    alabangWeek,
    zamboangaWeek,
    setWeekDate,
    setActiveTab,
    fetchSchedule,
  } = useScheduleStore();

  // Load schedule on mount
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Date parsing for UI labels
  const weekStart = parseISO(currentWeekDate);
  const weekEnd = addDays(weekStart, 6);
  const dateRangeLabel = formatWeekRange(weekStart, weekEnd);

  const handlePrevWeek = () => {
    const prev = addDays(weekStart, -7);
    setWeekDate(format(prev, 'yyyy-MM-dd'));
  };

  const handleNextWeek = () => {
    const next = addDays(weekStart, 7);
    setWeekDate(format(next, 'yyyy-MM-dd'));
  };

  const handleGoToToday = () => {
    const today = new Date();
    // Monday of current week
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = addDays(today, distanceToMonday);
    setWeekDate(format(monday, 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-600" />
            Weekly Schedules
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Manage shifts, leave, and rotations for Team Alabang and Team Zamboanga.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Week Navigator */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="h-9 w-9 text-slate-600 hover:bg-slate-100 rounded-none border-r border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 text-xs font-semibold text-slate-700 select-none min-w-[170px] text-center">
              {dateRangeLabel}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              className="h-9 w-9 text-slate-600 hover:bg-slate-100 rounded-none border-l border-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToToday}
            className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Today
          </Button>

          {/* Creation Dialog */}
          <NewScheduleDialog />
        </div>
      </div>

      {/* Tabs / Selectors */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {(['ALABANG', 'ZAMBOANGA', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all duration-200",
                activeTab === tab
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {tab === 'ALL' ? 'All Teams' : tab === 'ALABANG' ? 'Team Alabang' : 'Team Zamboanga'}
            </button>
          ))}
        </div>

        {/* Legend Quick Info */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Info className="h-3.5 w-3.5" />
          <span>Click on cells to assign/update shifts.</span>
        </div>
      </div>

      {/* Grids Display area */}
      <div className="space-y-6">
        {activeTab === 'ALABANG' && (
          <ScheduleGrid team="ALABANG" />
        )}
        
        {activeTab === 'ZAMBOANGA' && (
          <ScheduleGrid team="ZAMBOANGA" />
        )}
        
        {activeTab === 'ALL' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Team Alabang
                </h3>
                {alabangWeek && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    ID: {alabangWeek.id}
                  </span>
                )}
              </div>
              <ScheduleGrid team="ALABANG" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Team Zamboanga
                </h3>
                {zamboangaWeek && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    ID: {zamboangaWeek.id}
                  </span>
                )}
              </div>
              <ScheduleGrid team="ZAMBOANGA" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
