'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/store/useScheduleStore';
import { DayOfWeek, ShiftType, ScheduleGridRow } from '@/types';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, AlertTriangle, Loader2 } from 'lucide-react';
import { markEmergencyLeave, assignReplacement, runScheduleValidation } from '@/app/actions/schedule';
import { updateEmployeeBaseShift } from '@/app/actions/employee';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DndContext, useDraggable, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';

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

// Client-side helper to parse time string like "10:00 PM" into minutes
function clientParseTime(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Client-side rest period validation checker for instant visual feedback during drag
function clientCheckRest(
  empId: string,
  day: DayOfWeek,
  shiftId: string | null,
  rows: ScheduleGridRow[],
  shiftTypes: ShiftType[],
  unsavedChanges: Record<string, string | null>
): boolean {
  if (!shiftId) return true;
  const shift = shiftTypes.find(s => s.id === shiftId);
  if (!shift || !shift.startTime || !shift.endTime) return true;

  const startMin = clientParseTime(shift.startTime);
  const endMin = clientParseTime(shift.endTime);

  const daysList: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayIdx = daysList.indexOf(day);

  // Check previous day shift
  if (dayIdx > 0) {
    const prevDay = daysList[dayIdx - 1];
    const prevKey = `${empId}_${prevDay}`;
    const prevShiftId = prevKey in unsavedChanges ? unsavedChanges[prevKey] : rows.find(r => r.employee.id === empId)?.entries[prevDay]?.shiftTypeId;
    if (prevShiftId) {
      const prevST = shiftTypes.find(s => s.id === prevShiftId);
      if (prevST && prevST.startTime && prevST.endTime) {
        const prevStart = clientParseTime(prevST.startTime);
        const prevEnd = clientParseTime(prevST.endTime);
        const prevEndOnNextDay = prevEnd <= prevStart ? prevEnd + 1440 : prevEnd;
        
        const gap = (startMin + 1440) - prevEndOnNextDay;
        if (gap < 7 * 60) return false;
      }
    }
  }

  // Check next day shift
  if (dayIdx < 6) {
    const nextDay = daysList[dayIdx + 1];
    const nextKey = `${empId}_${nextDay}`;
    const nextShiftId = nextKey in unsavedChanges ? unsavedChanges[nextKey] : rows.find(r => r.employee.id === empId)?.entries[nextDay]?.shiftTypeId;
    if (nextShiftId) {
      const nextST = shiftTypes.find(s => s.id === nextShiftId);
      if (nextST && nextST.startTime && nextST.endTime) {
        const nextStart = clientParseTime(nextST.startTime);
        const nextStartOnNextDay = nextStart + 1440;
        const currentEnd = endMin <= startMin ? endMin + 1440 : endMin;
        
        const gap = nextStartOnNextDay - currentEnd;
        if (gap < 7 * 60) return false;
      }
    }
  }

  return true;
}

interface DraggableShiftProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function DraggableShift({ id, children, disabled }: DraggableShiftProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("w-full h-full flex flex-col justify-center items-center cursor-grab active:cursor-grabbing")}
    >
      {children}
    </div>
  );
}

interface DroppableCellProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function DroppableCell({ id, children, className, style }: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <td
      ref={setNodeRef}
      className={className}
      style={style}
    >
      {children}
    </td>
  );
}

interface ScheduleGridProps {
  team: 'ALABANG' | 'ZAMBOANGA';
}

export default function ScheduleGrid({ team }: ScheduleGridProps) {
  const { 
    currentWeekDate,
    alabangWeek,
    zamboangaWeek,
    alabangRows,
    zamboangaRows,
    shiftTypes, 
    unsavedChanges, 
    updateCell, 
    loading,
    activeShiftFilter,
    unsavedChangesBannerHeight,
    fetchSchedule
  } = useScheduleStore();

  // Emergency Leave replacement dialog states
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [gapDetails, setGapDetails] = useState('');
  const [vacatedShiftTypeId, setVacatedShiftTypeId] = useState('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; isBaseShiftMatch: boolean }>>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Drag and Drop State
  const [activeDragCell, setActiveDragCell] = useState<{ employeeId: string; dayOfWeek: DayOfWeek } | null>(null);

  const baseRows = team === 'ALABANG' ? alabangRows : zamboangaRows;

  const rows = activeShiftFilter
    ? baseRows.filter((row) => {
        // 1. Check weekly schedule entries
        const hasMatchingEntry = Object.entries(row.entries).some(([dayOfWeek, entry]) => {
          const key = `${row.employee.id}_${dayOfWeek}`;
          const shiftTypeId = key in unsavedChanges ? unsavedChanges[key] : entry.shiftTypeId;
          if (activeShiftFilter === 'DAY-OFF') {
            return shiftTypeId === null;
          } else {
            const shift = shiftTypes.find((s) => s.id === shiftTypeId);
            if (!shift) return false;
            const uppercaseName = shift.name.toUpperCase();
            if (activeShiftFilter === 'DAY SHIFT') {
              return uppercaseName.startsWith('DAY SHIFT');
            }
            if (activeShiftFilter === 'ADJUST SHIFT') {
              return uppercaseName.includes('ADJUST');
            }
            return shift.name === activeShiftFilter;
          }
        });

        if (hasMatchingEntry) return true;

        // 2. Check employee's base shift type
        const baseShiftTypeId = row.employee.currentShiftTypeId;
        if (activeShiftFilter === 'DAY-OFF') {
          return baseShiftTypeId === null;
        } else if (baseShiftTypeId) {
          const baseShift = shiftTypes.find((s) => s.id === baseShiftTypeId);
          if (baseShift) {
            const uppercaseBaseName = baseShift.name.toUpperCase();
            if (activeShiftFilter === 'DAY SHIFT') {
              return uppercaseBaseName.startsWith('DAY SHIFT');
            }
            if (activeShiftFilter === 'ADJUST SHIFT') {
              return uppercaseBaseName.includes('ADJUST');
            }
            return baseShift.name === activeShiftFilter;
          }
        }

        return false;
      })
    : baseRows;

  // Get active shift selection for a cell
  const getCellState = (employeeId: string, dayOfWeek: DayOfWeek) => {
    const key = `${employeeId}_${dayOfWeek}`;
    const hasUnsavedChange = key in unsavedChanges;
    const activeShiftTypeId = hasUnsavedChange 
      ? unsavedChanges[key] 
      : baseRows.find((r) => r.employee.id === employeeId)?.entries[dayOfWeek]?.shiftTypeId || null;

    const activeShift = activeShiftTypeId 
      ? shiftTypes.find((s) => s.id === activeShiftTypeId) 
      : null;

    return {
      shift: activeShift,
      isDayOff: activeShiftTypeId === null,
      hasUnsavedChange,
    };
  };

  const checkCellValidity = (
    src: { employeeId: string; dayOfWeek: DayOfWeek },
    dst: { employeeId: string; dayOfWeek: DayOfWeek }
  ): boolean => {
    if (src.employeeId === dst.employeeId && src.dayOfWeek === dst.dayOfWeek) return true;

    const srcCellState = getCellState(src.employeeId, src.dayOfWeek);
    const dstCellState = getCellState(dst.employeeId, dst.dayOfWeek);

    const srcShiftId = srcCellState.shift?.id || null;
    const dstShiftId = dstCellState.shift?.id || null;

    const srcRestOk = clientCheckRest(src.employeeId, src.dayOfWeek, dstShiftId, baseRows, shiftTypes, unsavedChanges);
    const dstRestOk = clientCheckRest(dst.employeeId, dst.dayOfWeek, srcShiftId, baseRows, shiftTypes, unsavedChanges);

    return srcRestOk && dstRestOk;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const parts = activeId.split('_');
    if (parts.length === 3) {
      setActiveDragCell({
        employeeId: parts[1],
        dayOfWeek: parts[2] as DayOfWeek,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragCell(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeParts = activeId.split('_');
    const overParts = overId.split('_');

    if (activeParts.length !== 3 || overParts.length !== 3) return;

    const srcEmpId = activeParts[1];
    const srcDay = activeParts[2] as DayOfWeek;

    const dstEmpId = overParts[1];
    const dstDay = overParts[2] as DayOfWeek;

    if (srcEmpId === dstEmpId && srcDay === dstDay) return;

    const week = team === 'ALABANG' ? alabangWeek : zamboangaWeek;
    if (!week) return;

    const srcCellState = getCellState(srcEmpId, srcDay);
    const dstCellState = getCellState(dstEmpId, dstDay);

    const srcShiftId = srcCellState.shift?.id || null;
    const dstShiftId = dstCellState.shift?.id || null;

    const proposedUpdates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }> = [];

    for (const r of baseRows) {
      for (const d of DAYS) {
        let shiftId = getCellState(r.employee.id, d).shift?.id || null;
        if (r.employee.id === srcEmpId && d === srcDay) {
          shiftId = dstShiftId;
        } else if (r.employee.id === dstEmpId && d === dstDay) {
          shiftId = srcShiftId;
        }
        proposedUpdates.push({
          employeeId: r.employee.id,
          dayOfWeek: d,
          shiftTypeId: shiftId,
        });
      }
    }

    const toastId = toast.loading('Validating drop...');
    try {
      const valResult = await runScheduleValidation(week.id, proposedUpdates);
      if (valResult.success) {
        updateCell(srcEmpId, srcDay, dstShiftId);
        updateCell(dstEmpId, dstDay, srcShiftId);
        toast.success('Shift assignment updated!', { id: toastId });
      } else {
        toast.error(`Cannot assign shift: ${valResult.errors[0]}`, { id: toastId, duration: 6000 });
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during validation.', { id: toastId });
    }
  };

  const handleEmergencyLeave = async (employeeId: string, day: DayOfWeek) => {
    const week = team === 'ALABANG' ? alabangWeek : zamboangaWeek;
    if (!week) {
      toast.error('Schedule week not loaded.');
      return;
    }

    const toastId = toast.loading('Marking emergency leave...');
    try {
      const res = await markEmergencyLeave(week.id, employeeId, day);
      if (res.success) {
        toast.success('Employee marked on leave.', { id: toastId });
        await fetchSchedule(); 

        if (res.gapDetected && res.suggestions && res.suggestions.length > 0) {
          setGapDetails(res.gapDetails || 'A coverage gap was created.');
          setVacatedShiftTypeId(res.vacatedShiftTypeId || '');
          setSelectedDay(day);
          setSuggestions(res.suggestions);
          setSelectedCandidateId(null);
          setReplacementOpen(true);
        } else if (res.gapDetected) {
          toast.warning(res.gapDetails || 'A coverage gap was created, but no available replacement candidates were found.', { duration: 6000 });
        }
      } else {
        toast.error('Failed to mark emergency leave.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred.', { id: toastId });
    }
  };

  const handleConfirmReplacement = async () => {
    if (!selectedCandidateId || !selectedDay) return;
    
    const week = team === 'ALABANG' ? alabangWeek : zamboangaWeek;
    if (!week) return;

    setReplacementLoading(true);
    try {
      await assignReplacement(week.id, selectedCandidateId, selectedDay, vacatedShiftTypeId);
      toast.success('Replacement candidate assigned successfully!');
      setReplacementOpen(false);
      await fetchSchedule();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign replacement.');
    } finally {
      setReplacementLoading(false);
    }
  };

  const handleUpdateBaseShift = async (employeeId: string, currentShiftTypeId: string | null) => {
    try {
      const res = await updateEmployeeBaseShift(employeeId, currentShiftTypeId);
      if (res.success) {
        toast.success('Employee base shift updated successfully!');
        await fetchSchedule();
      } else {
        toast.error(res.error || 'Failed to update base shift.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    }
  };

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

    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded w-fit uppercase tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
        Adjust Shift
      </span>
    );
  };

  const isDragActive = activeDragCell !== null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                  <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 flex flex-col justify-center gap-0.5 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
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
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {/* Gender Badge */}
                      <span className={cn(
                        "inline-flex items-center text-[9px] font-extrabold px-1 rounded uppercase tracking-wider border",
                        row.employee.gender === 'FEMALE' 
                          ? "bg-pink-50 border-pink-200 text-pink-700" 
                          : "bg-blue-50 border-blue-200 text-blue-700"
                      )}>
                        {row.employee.gender === 'FEMALE' ? 'F' : 'M'}
                      </span>
                      
                      {/* Employment Type */}
                      <span className="inline-flex items-center text-[9px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-1 py-0.2 rounded uppercase tracking-wide">
                        {row.employee.employmentType.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Base Shift Dropdown */}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Base Shift:</span>
                      <select
                        value={row.employee.currentShiftTypeId || 'NONE'}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateBaseShift(row.employee.id, val === 'NONE' ? null : val);
                        }}
                        className="text-[9px] bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold cursor-pointer max-w-[120px] truncate"
                      >
                        <option value="NONE">All Day-offs</option>
                        {shiftTypes.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Days Columns */}
                  {DAYS.map((day) => {
                    const { shift, isDayOff, hasUnsavedChange } = getCellState(row.employee.id, day);
                    const uppercaseName = shift?.name.toUpperCase() || '';
                    const matchesFilter = !activeShiftFilter ||
                      (activeShiftFilter === 'DAY-OFF' && isDayOff) ||
                      (shift && (
                        activeShiftFilter === 'DAY SHIFT' 
                          ? uppercaseName.startsWith('DAY SHIFT') 
                          : activeShiftFilter === 'ADJUST SHIFT'
                            ? uppercaseName.includes('ADJUST')
                            : shift.name === activeShiftFilter
                      ));

                    const currentCell = { employeeId: row.employee.id, dayOfWeek: day };
                    const isValidTarget = activeDragCell ? checkCellValidity(activeDragCell, currentCell) : true;

                    return (
                      <DroppableCell 
                        key={day} 
                        id={`drop_${row.employee.id}_${day}`}
                        className={cn(
                          "p-1 border-r border-slate-200 last:border-r-0 text-center relative transition-all duration-200",
                          hasUnsavedChange && "bg-amber-500/5",
                          isDragActive && !isValidTarget && "opacity-30 bg-red-50/20 border-red-200/40",
                          isDragActive && isValidTarget && "bg-emerald-50/10 border-emerald-500/30 border-dashed border"
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
                                <DraggableShift id={`drag_${row.employee.id}_${day}`}>
                                  {isDayOff ? (
                                    <span className="text-red-500 font-bold tracking-wide text-[11px] uppercase select-none">
                                      Day-Off
                                    </span>
                                  ) : (
                                    shift && (
                                      <div className={cn("flex flex-col items-center justify-center leading-tight select-none", getContrastColor(shift.colorHex))}>
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
                                </DraggableShift>

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
                              <div className="flex flex-col text-left">
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
                                  <div className="flex flex-col text-left">
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

                            <DropdownMenuSeparator className="bg-slate-100" />

                            {/* Mark Emergency Leave Option */}
                            <DropdownMenuItem
                              onClick={() => handleEmergencyLeave(row.employee.id, day)}
                              className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold cursor-pointer rounded-md text-purple-600 hover:bg-purple-50 transition-colors duration-150"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 text-purple-500 animate-pulse" />
                              <div className="flex flex-col text-left">
                                <span>Mark Emergency Leave</span>
                                <span className="text-[9px] text-slate-400 font-medium">Bypass validation & auto-suggest replacement</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </DroppableCell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Suggested Replacements Dialog */}
        <Dialog open={replacementOpen} onOpenChange={setReplacementOpen}>
          <DialogContent className="sm:max-w-[450px] bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-800 flex items-center gap-2 font-bold tracking-tight">
                <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                Coverage Gap Suggested Fixes
              </DialogTitle>
              <DialogDescription className="text-slate-500 leading-relaxed text-xs">
                {gapDetails} Select a suggested replacement below to cover the shift.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 max-h-[40vh] overflow-y-auto space-y-2 pr-1">
              {suggestions.map((cand) => {
                const isSelected = selectedCandidateId === cand.id;
                return (
                  <button
                    key={cand.id}
                    onClick={() => setSelectedCandidateId(cand.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border text-xs transition-all duration-200 flex items-center justify-between shadow-sm",
                      isSelected 
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/20" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                    )}
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold block text-slate-800">{cand.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {cand.isBaseShiftMatch ? 'Base Shift matches this vacated slot' : 'Available & rest period verified'}
                      </span>
                    </div>
                    {cand.isBaseShiftMatch && (
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Best Fit
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                onClick={() => setReplacementOpen(false)}
                className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
              >
                Leave Unfilled
              </Button>
              <Button
                onClick={handleConfirmReplacement}
                disabled={!selectedCandidateId || replacementLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-600/10 font-bold text-xs"
              >
                {replacementLoading ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm Replacement'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
