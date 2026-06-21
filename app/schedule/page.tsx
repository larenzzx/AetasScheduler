'use client';

import { useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import ScheduleGrid from '@/components/ScheduleGrid';
import NewScheduleDialog from '@/components/NewScheduleDialog';
import ResetScheduleDialog from '@/components/ResetScheduleDialog';
import ShiftFilterPanel from '@/components/ShiftFilterPanel';
import BaseShiftManager from '@/components/BaseShiftManager';
import { Button } from '@/components/ui/button';
import { cn, formatWeekRange } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, Info, FileDown } from 'lucide-react';


export default function SchedulePage() {
  const {
    currentWeekDate,
    activeTab,
    alabangWeek,
    zamboangaWeek,
    companyName,
    setWeekDate,
    setActiveTab,
    fetchSchedule,
  } = useScheduleStore();

  // Load schedule on mount
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Date parsing for UI labels
  const weekStart = new Date(`${currentWeekDate}T00:00:00.000Z`);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const dateRangeLabel = formatWeekRange(weekStart, weekEnd);

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setUTCDate(prev.getUTCDate() - 7);
    setWeekDate(prev.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setUTCDate(next.getUTCDate() + 7);
    setWeekDate(next.toISOString().split('T')[0]);
  };

  const handleGoToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    setWeekDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleExportPDF = () => {
    window.open(`/api/export-pdf?weekDate=${currentWeekDate}&companyName=${encodeURIComponent(companyName)}`, '_blank');
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
        
        <div className="flex flex-nowrap items-center gap-2 max-w-full overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 scrollbar-none">
          {/* Week Navigator */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 shadow-sm shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="h-9 w-9 text-slate-600 hover:bg-slate-100 rounded-none border-r border-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 text-[11px] sm:text-xs font-semibold text-slate-700 select-none min-w-[130px] sm:min-w-[170px] text-center whitespace-nowrap">
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
            className="h-9 border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-9 border-[#11B4D4]/30 text-[#11B4D4] hover:bg-[#11B4D4]/10 hover:text-white shrink-0 gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>

          {/* Creation Dialog */}
          <div className="shrink-0">
            <NewScheduleDialog />
          </div>
        </div>
      </div>

      {/* Tabs / Selectors */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {(['ALL', 'ALABANG', 'ZAMBOANGA', 'BASE_SHIFTS'] as const).map((tab) => (
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
              {tab === 'ALL' 
                ? 'All Teams' 
                : tab === 'ALABANG' 
                ? 'Team Alabang' 
                : tab === 'ZAMBOANGA' 
                ? 'Team Zamboanga' 
                : 'Base Shifts'}
            </button>
          ))}
        </div>

        {/* Actions & Legend Group */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 font-medium">
            <Info className="h-3.5 w-3.5" />
            <span>Click on cells to assign/update shifts.</span>
          </div>
          <ResetScheduleDialog />
        </div>
      </div>

      <ShiftFilterPanel />

      {/* Grids Display area */}
      <div className="space-y-6">
        {activeTab === 'ALABANG' && (
          <ScheduleGrid team="ALABANG" />
        )}
        
        {activeTab === 'ZAMBOANGA' && (
          <ScheduleGrid team="ZAMBOANGA" />
        )}
        
        {activeTab === 'BASE_SHIFTS' && (
          <BaseShiftManager />
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
