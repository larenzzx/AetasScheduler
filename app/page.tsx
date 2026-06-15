'use client';

import { useEffect } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import ScheduleGrid from '@/components/ScheduleGrid';
import NewScheduleDialog from '@/components/NewScheduleDialog';
import { Button } from '@/components/ui/button';
import { formatWeekRange } from '@/lib/utils';
import { 
  Users, 
  CalendarClock, 
  PlaneTakeoff, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard 
} from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { DayOfWeek } from '@/types';

export default function DashboardPage() {
  const {
    currentWeekDate,
    alabangWeek,
    zamboangaWeek,
    alabangRows,
    zamboangaRows,
    shiftTypes,
    setWeekDate,
    fetchSchedule,
  } = useScheduleStore();

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Date navigation
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

  // Stats calculation
  const totalEmployeesAlabang = alabangRows.length;
  const totalEmployeesZamboanga = zamboangaRows.length;
  const totalEmployees = totalEmployeesAlabang + totalEmployeesZamboanga;

  // Find today's day of week
  const dayNames: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const todayDayOfWeek = dayNames[new Date().getDay()];

  // Calculate shifts today
  const allRows = [...alabangRows, ...zamboangaRows];
  
  let shiftsTodayCount = 0;
  let leavesTodayCount = 0;
  let dayOffsTodayCount = 0;

  allRows.forEach((row) => {
    const entry = row.entries[todayDayOfWeek];
    if (!entry || entry.shiftTypeId === null) {
      dayOffsTodayCount++;
    } else {
      const shift = shiftTypes.find((s) => s.id === entry.shiftTypeId);
      if (shift?.name === 'LEAVE') {
        leavesTodayCount++;
      } else {
        shiftsTodayCount++;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Upper Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-emerald-600" />
            Dashboard Overview
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Welcome to Aetas Scheduler. Here is the active status summary for both teams.
          </p>
        </div>

        {/* Week Selector */}
        <div className="flex items-center gap-3">
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
          <NewScheduleDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Employees */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Headcount</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{totalEmployees}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Alabang: {totalEmployeesAlabang} | Zamboanga: {totalEmployeesZamboanga}
            </p>
          </div>
        </div>

        {/* Card 2: Shifts Today */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shifts Scheduled Today</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{shiftsTodayCount}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Active duty staff on shift ({todayDayOfWeek})
            </p>
          </div>
        </div>

        {/* Card 3: Leave / Day-Off */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <PlaneTakeoff className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Leave & Day-Offs Today</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{leavesTodayCount + dayOffsTodayCount}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Leave: {leavesTodayCount} | Day-Off: {dayOffsTodayCount}
            </p>
          </div>
        </div>
      </div>

      {/* Main Double Grid Sections */}
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Team Alabang Schedule
            </h2>
            {alabangWeek && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                Week Code: {alabangWeek.id}
              </span>
            )}
          </div>
          <ScheduleGrid team="ALABANG" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Team Zamboanga Schedule
            </h2>
            {zamboangaWeek && (
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                Week Code: {zamboangaWeek.id}
              </span>
            )}
          </div>
          <ScheduleGrid team="ZAMBOANGA" />
        </div>
      </div>
    </div>
  );
}
