import { prisma } from '@/lib/prisma';
import { DayOfWeek, ShiftType } from '@/types';

// Helper to parse time string like "10:00 PM" into hours and minutes
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid time format: "${timeStr}"`);
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  }
  if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return { hours, minutes };
}

// Calculates exact start and end Date objects for a shift on a baseDate
function getShiftStartAndEnd(baseDate: Date, startTimeStr: string, endTimeStr: string): { start: Date; end: Date } {
  const startParts = parseTimeString(startTimeStr);
  const endParts = parseTimeString(endTimeStr);

  const start = new Date(baseDate);
  start.setUTCHours(startParts.hours, startParts.minutes, 0, 0);

  const end = new Date(baseDate);
  end.setUTCHours(endParts.hours, endParts.minutes, 0, 0);

  if (end <= start) {
    // Crosses midnight, end is on the next day
    end.setUTCDate(end.getUTCDate() + 1);
  }

  return { start, end };
}

function formatDateLabel(date: Date): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayName = days[(date.getUTCDay() + 6) % 7];
  const dateStr = date.toISOString().split('T')[0];
  return `${dayName} (${dateStr})`;
}

export async function validateSchedule(
  weekId: string,
  updates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }>
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch current week, rules config, and shift types
  const currentWeek = await prisma.scheduleWeek.findUnique({
    where: { id: weekId },
  });

  if (!currentWeek) {
    return { success: false, errors: ['Schedule week not found.'], warnings: [] };
  }

  const rulesConfig = await prisma.schedulingRuleConfig.findFirst();
  const minRest = rulesConfig?.minRestHours ?? 7;
  const recommendedRest = rulesConfig?.recommendedRestHours ?? 8;

  const shiftTypes = await prisma.shiftType.findMany();
  const shiftTypesMap = new Map<string, ShiftType>();
  shiftTypes.forEach((st) => shiftTypesMap.set(st.id, st));

  // 2. Fetch adjacent weeks (prev and next) to check boundary rest rules
  const currentWeekStart = new Date(currentWeek.weekStartDate);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
  
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

  const prevWeek = await prisma.scheduleWeek.findUnique({
    where: {
      weekStartDate_team: {
        weekStartDate: prevWeekStart,
        team: currentWeek.team,
      },
    },
  });

  const nextWeek = await prisma.scheduleWeek.findUnique({
    where: {
      weekStartDate_team: {
        weekStartDate: nextWeekStart,
        team: currentWeek.team,
      },
    },
  });

  // Fetch all active employees for this team
  const employees = await prisma.employee.findMany({
    where: {
      team: currentWeek.team,
      isActive: true,
    },
  });

  // Fetch all schedule entries for prev, current, and next weeks
  const weekIds = [currentWeek.id];
  if (prevWeek) weekIds.push(prevWeek.id);
  if (nextWeek) weekIds.push(nextWeek.id);

  const allEntries = await prisma.scheduleEntry.findMany({
    where: {
      scheduleWeekId: { in: weekIds },
    },
  });

  const daysOfWeekList: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // 3. Validate for each employee
  for (const employee of employees) {
    // Build 21-day timeline of shift types (prev week: -7 to -1, current week: 0 to 6, next week: 7 to 13)
    const timeline: Array<{ date: Date; shiftType: ShiftType | null }> = [];

    for (let i = -7; i <= 13; i++) {
      const date = new Date(currentWeekStart);
      date.setUTCDate(date.getUTCDate() + i);

      const dayStartOfItsWeek = new Date(date);
      const dayOfWeekIndex = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
      dayStartOfItsWeek.setUTCDate(dayStartOfItsWeek.getUTCDate() - dayOfWeekIndex);
      dayStartOfItsWeek.setUTCHours(0, 0, 0, 0);

      const dayOfWeekStr = daysOfWeekList[dayOfWeekIndex];

      let shiftTypeId: string | null = null;

      if (dayStartOfItsWeek.getTime() === currentWeekStart.getTime()) {
        // Current week: check proposed updates first, fallback to DB
        const update = updates.find(
          (u) => u.employeeId === employee.id && u.dayOfWeek === dayOfWeekStr
        );
        if (update) {
          shiftTypeId = update.shiftTypeId;
        } else {
          const dbMatch = allEntries.find(
            (e) =>
              e.employeeId === employee.id &&
              e.scheduleWeekId === currentWeek.id &&
              e.dayOfWeek === dayOfWeekStr
          );
          shiftTypeId = dbMatch ? dbMatch.shiftTypeId : null;
        }
      } else if (prevWeek && dayStartOfItsWeek.getTime() === prevWeekStart.getTime()) {
        // Previous week
        const dbMatch = allEntries.find(
          (e) =>
            e.employeeId === employee.id &&
            e.scheduleWeekId === prevWeek.id &&
            e.dayOfWeek === dayOfWeekStr
        );
        shiftTypeId = dbMatch ? dbMatch.shiftTypeId : null;
      } else if (nextWeek && dayStartOfItsWeek.getTime() === nextWeekStart.getTime()) {
        // Next week
        const dbMatch = allEntries.find(
          (e) =>
            e.employeeId === employee.id &&
            e.scheduleWeekId === nextWeek.id &&
            e.dayOfWeek === dayOfWeekStr
        );
        shiftTypeId = dbMatch ? dbMatch.shiftTypeId : null;
      }

      const shiftType = shiftTypeId ? (shiftTypesMap.get(shiftTypeId) || null) : null;
      timeline.push({ date, shiftType });
    }

    // Filter timeline to shifts with start and end times
    const workShifts = timeline
      .map((t) => {
        if (!t.shiftType || !t.shiftType.startTime || !t.shiftType.endTime) {
          return null;
        }
        try {
          const { start, end } = getShiftStartAndEnd(t.date, t.shiftType.startTime, t.shiftType.endTime);
          return {
            date: t.date,
            shiftType: t.shiftType,
            start,
            end,
          };
        } catch (e) {
          console.error('Error parsing shift times:', e);
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    // Validate rest period between consecutive shifts
    for (let j = 0; j < workShifts.length - 1; j++) {
      const current = workShifts[j];
      const next = workShifts[j + 1];

      const restHours = (next.start.getTime() - current.end.getTime()) / (1000 * 60 * 60);

      if (restHours < minRest) {
        errors.push(
          `Not enough rest for ${employee.name}: only ${restHours.toFixed(1)} hours between ${current.shiftType.name} on ${formatDateLabel(current.date)} and ${next.shiftType.name} on ${formatDateLabel(next.date)} (minimum ${minRest} required).`
        );
      } else if (restHours < recommendedRest) {
        warnings.push(
          `Short rest warning for ${employee.name}: only ${restHours.toFixed(1)} hours rest between ${current.shiftType.name} on ${formatDateLabel(current.date)} and ${next.shiftType.name} on ${formatDateLabel(next.date)} (${recommendedRest}+ hours recommended).`
        );
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}
