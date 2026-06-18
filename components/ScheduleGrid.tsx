'use client';

import { useScheduleStore } from '@/store/useScheduleStore';
import { DayOfWeek } from '@/types';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

// Helper to determine optimal text color based on background brightness
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6) return 'text-[#080C1A]';
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? 'text-[#080C1A] font-bold' : 'text-white font-medium';
}

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
  SUN: 'Sun',
};

interface ScheduleGridProps {
  team: 'ALABANG' | 'ZAMBOANGA';
}

export default function ScheduleGrid({ team }: ScheduleGridProps) {
  const { 
    currentWeekDate,
    alabangRows,
    zamboangaRows,
    shiftTypes, 
    unsavedChanges, 
    updateCell, 
    loading,
    activeShiftFilter,
    unsavedChangesBannerHeight
  } = useScheduleStore();

  const baseRows = team === 'ALABANG' ? alabangRows : zamboangaRows;

  const rows = activeShiftFilter
    ? baseRows.filter((row) => {
        return Object.entries(row.entries).some(([dayOfWeek, entry]) => {
          const key = `${row.employee.id}_${dayOfWeek}`;
          const shiftTypeId = key in unsavedChanges ? unsavedChanges[key] : entry.shiftTypeId;
          if (activeShiftFilter === 'DAY-OFF') {
            return shiftTypeId === null;
          } else {
            const shift = shiftTypes.find((s) => s.id === shiftTypeId);
            return shift?.name === activeShiftFilter;
          }
        });
      })
    : baseRows;

  if (loading && baseRows.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg bg-slate-200" />
        <Skeleton className="h-20 w-full rounded-lg bg-slate-200" />
        <Skeleton className="h-20 w-full rounded-lg bg-slate-200" />
        <Skeleton className="h-20 w-full rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (baseRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
          <Info className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">No Schedule Formed Yet</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          This team does not have a schedule created for this week. Use the &quot;New Schedule Week&quot; creation options to initialize one.
        </p>
      </div>
    );
  }

  if (baseRows.length > 0 && rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[#11B4D4]/20 rounded-2xl bg-white shadow-sm animate-in fade-in duration-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-4">
          <Info className="h-6 w-6 text-[#00EEF5]" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">No Shift Coverage Found</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">
          No employees on Team {team === 'ALABANG' ? 'Alabang' : 'Zamboanga'} are scheduled for <span className="text-[#00EEF5] font-bold">{activeShiftFilter}</span> this week.
        </p>
      </div>
    );
  }

  // Get active shift selection for a cell (merging database state and unsaved changes)
  const getCellState = (employeeId: string, dayOfWeek: DayOfWeek) => {
    const key = `${employeeId}_${dayOfWeek}`;
    
    // Check if there is an unsaved change
    const hasUnsavedChange = key in unsavedChanges;
    const activeShiftTypeId = hasUnsavedChange 
      ? unsavedChanges[key] 
      : rows.find((r) => r.employee.id === employeeId)?.entries[dayOfWeek]?.shiftTypeId || null;

    const activeShift = activeShiftTypeId 
      ? shiftTypes.find((s) => s.id === activeShiftTypeId) 
      : null;

    return {
      shift: activeShift,
      isDayOff: activeShiftTypeId === null,
      hasUnsavedChange,
    };
  };

  const getEmployeeShiftBadge = (row: typeof rows[0]) => {
    const uniqueShifts = new Set<string>();
    let hasLeave = false;
    
    DAYS.forEach((day) => {
      const key = `${row.employee.id}_${day}`;
      const activeShiftTypeId = key in unsavedChanges 
        ? unsavedChanges[key] 
        : row.entries[day]?.shiftTypeId || null;
        
      if (activeShiftTypeId !== null) {
        const shift = shiftTypes.find((s) => s.id === activeShiftTypeId);
        if (shift) {
          if (shift.name === 'LEAVE') {
            hasLeave = true;
          } else {
            uniqueShifts.add(shift.name);
          }
        }
      }
    });

    const shiftCount = uniqueShifts.size;

    if (shiftCount === 0) {
      if (hasLeave) {
        return (
          <span className="inline-flex items-center text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200/50 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
            Leave
          </span>
        );
      }
      return (
        <span className="inline-flex items-center text-[9px] font-bold text-red-500 bg-red-50 border border-red-200/50 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
          Day-Off
        </span>
      );
    }

    if (shiftCount === 1) {
      const shiftName = Array.from(uniqueShifts)[0];
      const shift = shiftTypes.find((s) => s.name === shiftName);
      return (
        <span 
          className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit uppercase tracking-wider border"
          style={{ 
            backgroundColor: shift ? `${shift.colorHex}15` : undefined,
            borderColor: shift ? `${shift.colorHex}30` : undefined,
            color: shift ? shift.colorHex : undefined,
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shift?.colorHex }} />
          {shiftName.replace(' SHIFT', '')}
        </span>
      );
    }

    if (shiftCount === 2) {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Mixed Shifts
        </span>
      );
    }

    // shiftCount >= 3
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
        Adjust Shift
      </span>
    );
  };

  return (
    <div 
      className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300"
      style={{
        marginBottom: unsavedChangesBannerHeight > 0 ? `${unsavedChangesBannerHeight + 24}px` : undefined
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-64 px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                Employee Details
              </th>
              {DAYS.map((day, idx) => {
                const baseDate = new Date(`${currentWeekDate}T00:00:00.000Z`);
                const dayDate = new Date(baseDate);
                dayDate.setUTCDate(dayDate.getUTCDate() + idx);
                const dayNumberStr = String(dayDate.getUTCDate());
                return (
                  <th key={day} className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 last:border-r-0">
                    <div className="flex flex-col items-center">
                      <span>{DAY_LABELS[day]}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{dayNumberStr}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.employee.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                {/* Employee Info Column */}
                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 flex flex-col justify-center gap-1 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {row.employee.name}
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium tracking-wide uppercase">
                      {row.employee.team}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {row.employee.employeeId}
                    </span>
                    {getEmployeeShiftBadge(row)}
                  </div>
                </td>

                {/* Days Columns */}
                {DAYS.map((day) => {
                  const { shift, isDayOff, hasUnsavedChange } = getCellState(row.employee.id, day);
                  const matchesFilter = !activeShiftFilter ||
                    (activeShiftFilter === 'DAY-OFF' && isDayOff) ||
                    (shift && shift.name === activeShiftFilter);

                  return (
                    <td 
                      key={day} 
                      className={cn(
                        "p-1 border-r border-slate-200 last:border-r-0 text-center relative",
                        hasUnsavedChange && "bg-amber-500/5"
                      )}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              className={cn(
                                "w-full h-14 rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-200 focus:outline-none border",
                                isDayOff 
                                  ? "bg-white border-transparent hover:border-slate-300"
                                  : "hover:scale-[1.02] hover:shadow-sm shadow-black/5 border-transparent",
                                !matchesFilter && "opacity-20 hover:scale-100"
                              )}
                              style={{
                                backgroundColor: !isDayOff && shift ? shift.colorHex : undefined,
                              }}
                            >
                              {isDayOff ? (
                                <span className="text-red-500 font-bold tracking-wide text-[11px] uppercase">
                                  Day-Off
                                </span>
                              ) : (
                                shift && (
                                  <div className={cn("flex flex-col items-center justify-center leading-tight", getContrastColor(shift.colorHex))}>
                                    <span className="uppercase text-[9px] tracking-wider font-extrabold opacity-90">
                                      {shift.name.replace(' SHIFT', '')}
                                    </span>
                                    {shift.startTime && shift.endTime && (
                                      <span className="text-[9px] opacity-75 mt-0.5 font-medium">
                                        {shift.startTime}–{shift.endTime}
                                      </span>
                                    )}
                                  </div>
                                )
                              )}

                              {/* Unsaved change indicator dot */}
                              {hasUnsavedChange && (
                                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                            </button>
                          }
                        />
                        <DropdownMenuContent align="center" className="w-56 bg-white border-slate-200">
                          <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Assign Shift
                          </div>
                          <DropdownMenuSeparator className="bg-slate-100" />
                          
                          {/* Day-Off Option */}
                          <DropdownMenuItem
                            onClick={() => updateCell(row.employee.id, day, null)}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-slate-50 transition-colors duration-150",
                              isDayOff ? "text-red-600 bg-red-50 hover:bg-red-50" : "text-red-500"
                            )}
                          >
                            <span className="h-3.5 w-3.5 rounded-full border border-red-200 bg-white flex items-center justify-center text-[9px] text-red-500 font-bold uppercase">
                              D
                            </span>
                            <div className="flex flex-col">
                              <span>DAY-OFF</span>
                              <span className="text-[10px] text-slate-400">No shift duties assigned</span>
                            </div>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="bg-slate-100" />

                          {/* Shift Types */}
                          {shiftTypes.map((st) => {
                            const isCurrent = shift?.id === st.id;
                            return (
                              <DropdownMenuItem
                                key={st.id}
                                onClick={() => updateCell(row.employee.id, day, st.id)}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium cursor-pointer rounded-md hover:bg-slate-50 transition-colors duration-150",
                                  isCurrent ? "bg-slate-100 font-semibold" : ""
                                )}
                              >
                                <span 
                                  className="h-3.5 w-3.5 rounded-full border border-black/5 shadow-sm"
                                  style={{ backgroundColor: st.colorHex }}
                                />
                                <div className="flex flex-col">
                                  <span className="text-slate-800">{st.name}</span>
                                  {st.startTime && st.endTime ? (
                                    <span className="text-[10px] text-slate-400">
                                      {st.startTime} – {st.endTime}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Custom time range</span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
