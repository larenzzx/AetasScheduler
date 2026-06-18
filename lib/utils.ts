import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeekRange(start: Date, end: Date): string {
  const formatUTC = (date: Date, options: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
  };
  
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  
  const monthName = (d: Date) => formatUTC(d, { month: 'long' });
  const dayNum = (d: Date) => formatUTC(d, { day: 'numeric' });
  
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${monthName(start)} ${dayNum(start)} – ${dayNum(end)}, ${startYear}`;
    }
    return `${monthName(start)} ${dayNum(start)} – ${monthName(end)} ${dayNum(end)}, ${startYear}`;
  }
  return `${monthName(start)} ${dayNum(start)}, ${startYear} – ${monthName(end)} ${dayNum(end)}, ${endYear}`;
}

export function sortScheduleRows<
  T extends {
    employee: { employeeId: string; name: string };
    entries: Record<string, { id: string | null; shiftTypeId: string | null } | string | null | undefined>;
  }
>(
  rows: T[],
  shiftTypes: Array<{ id: string; name: string }>
): T[] {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  const getShiftPriority = (shiftName: string | null | undefined): number => {
    if (!shiftName) return 6; // DAY-OFF
    const name = shiftName.toUpperCase();
    if (name.includes('MORNING')) return 1;
    if (name.includes('MIDNIGHT')) return 5;
    if (name.includes('MID')) return 3;
    if (name.includes('NIGHT')) return 4;
    if (name.includes('DAY')) return 2;
    if (name.includes('LEAVE')) return 7;
    return 6;
  };

  const getRowPriority = (row: T): { priority: number; name: string } => {
    // 1. Find the first active shift type (non-null and not LEAVE) in chronological order
    for (const day of days) {
      const entryVal = row.entries[day];
      if (!entryVal) continue;
      
      const shiftTypeId = typeof entryVal === 'object' && entryVal !== null && 'shiftTypeId' in entryVal
        ? entryVal.shiftTypeId
        : entryVal;

      if (shiftTypeId) {
        const shift = shiftTypes.find(s => s.id === shiftTypeId);
        if (shift && shift.name !== 'LEAVE') {
          return { priority: getShiftPriority(shift.name), name: shift.name };
        }
      }
    }

    // 2. If no active shift is found, find the first LEAVE shift
    for (const day of days) {
      const entryVal = row.entries[day];
      if (!entryVal) continue;
      
      const shiftTypeId = typeof entryVal === 'object' && entryVal !== null && 'shiftTypeId' in entryVal
        ? entryVal.shiftTypeId
        : entryVal;

      if (shiftTypeId) {
        const shift = shiftTypes.find(s => s.id === shiftTypeId);
        if (shift && shift.name === 'LEAVE') {
          return { priority: getShiftPriority(shift.name), name: shift.name };
        }
      }
    }

    // 3. Otherwise, they are DAY-OFF all week
    return { priority: 6, name: 'DAY-OFF' };
  };

  return [...rows].sort((a, b) => {
    const pA = getRowPriority(a);
    const pB = getRowPriority(b);
    
    if (pA.priority !== pB.priority) {
      return pA.priority - pB.priority;
    }
    
    // Stable sub-sorting by employeeId
    const idA = parseInt(a.employee.employeeId, 10) || 0;
    const idB = parseInt(b.employee.employeeId, 10) || 0;
    return idA - idB;
  });
}

