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

  // 2. Fetch previous week to check boundary rest rules (next week is ignored to avoid deadlocks)
  const currentWeekStart = new Date(currentWeek.weekStartDate);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);

  const prevWeek = await prisma.scheduleWeek.findUnique({
    where: {
      weekStartDate_team: {
        weekStartDate: prevWeekStart,
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

  // Fetch all schedule entries for prev and current weeks
  const weekIds = [currentWeek.id];
  if (prevWeek) weekIds.push(prevWeek.id);

  const allEntries = await prisma.scheduleEntry.findMany({
    where: {
      scheduleWeekId: { in: weekIds },
    },
  });

  const daysOfWeekList: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // 3. Validate for each employee
  for (const employee of employees) {
    // Build 14-day timeline of shift types (prev week: -7 to -1, current week: 0 to 6)
    const timeline: Array<{ date: Date; shiftType: ShiftType | null }> = [];

    for (let i = -7; i <= 6; i++) {
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

    // Phase 2: Workday limit checks (skipped for fixed schedules)
    if (!employee.isFixedSchedule) {
      // 1. Consecutive workdays check (max consecutive days)
      const maxConsecutive = rulesConfig?.maxConsecutiveDays ?? 6;
      let currentStreak = 0;
      let streakStartIdx = -1;

      for (let idx = 0; idx < timeline.length; idx++) {
        const day = timeline[idx];
        const isWork = day.shiftType !== null && day.shiftType.startTime !== null;

        if (isWork) {
          if (currentStreak === 0) {
            streakStartIdx = idx;
          }
          currentStreak++;
        } else {
          if (currentStreak > maxConsecutive) {
            const overlapCurrentWeek = streakStartIdx <= 13 && (streakStartIdx + currentStreak - 1) >= 7;
            if (overlapCurrentWeek) {
              errors.push(
                `Employee ${employee.name} would work ${currentStreak} consecutive days (max ${maxConsecutive}).`
              );
            }
          }
          currentStreak = 0;
          streakStartIdx = -1;
        }
      }

      if (currentStreak > maxConsecutive) {
        const overlapCurrentWeek = streakStartIdx <= 13 && (streakStartIdx + currentStreak - 1) >= 7;
        if (overlapCurrentWeek) {
          errors.push(
            `Employee ${employee.name} would work ${currentStreak} consecutive days (max ${maxConsecutive}).`
          );
        }
      }

      // 2. Weekly workday limit check (max weekly workdays in current week)
      const maxWeekly = rulesConfig?.maxWeeklyWorkdays ?? 5;
      let currentWeekWorkDays = 0;
      for (let idx = 7; idx <= 13; idx++) {
        const day = timeline[idx];
        const isWork = day.shiftType !== null && day.shiftType.startTime !== null;
        if (isWork) {
          currentWeekWorkDays++;
        }
      }

      if (currentWeekWorkDays > maxWeekly) {
        errors.push(
          `Employee ${employee.name} would work ${currentWeekWorkDays} days this week (max ${maxWeekly}).`
        );
      }
    }
  }

  // Phase 3: Zamboanga Specific Staffing Constraint (Only for ZAMBOANGA team)
  if (currentWeek.team === 'ZAMBOANGA') {
    const targetShiftNames = ['MIDNIGHT SHIFT', 'NIGHT SHIFT', 'MID SHIFT'];
    const targetShiftTypes = shiftTypes.filter((st) => targetShiftNames.includes(st.name.toUpperCase()));

    for (const dayOfWeekStr of daysOfWeekList) {
      for (const st of targetShiftTypes) {
        // Find employees scheduled on this shift on this day
        const scheduledEmployees = employees.filter((employee) => {
          const update = updates.find(
            (u) => u.employeeId === employee.id && u.dayOfWeek === dayOfWeekStr
          );
          let shiftTypeId: string | null = null;
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
          return shiftTypeId === st.id;
        });

        const femaleScheduled = scheduledEmployees.filter((emp) => emp.gender === 'FEMALE');

        if (femaleScheduled.length > 0) {
          const shiftNameUpper = st.name.toUpperCase();
          if (shiftNameUpper === 'MIDNIGHT SHIFT') {
            // Requires a male companion
            const maleScheduled = scheduledEmployees.filter((emp) => emp.gender === 'MALE');
            if (maleScheduled.length === 0) {
              const aloneEmp = femaleScheduled[0];
              errors.push(
                `${aloneEmp.name} would be on ${st.name} on ${dayOfWeekStr} without a male companion — at least one male companion is required.`
              );
            }
          } else {
            // MID SHIFT or NIGHT SHIFT: Requires any companion
            if (scheduledEmployees.length === 1) {
              const aloneEmp = femaleScheduled[0];
              errors.push(
                `${aloneEmp.name} would be alone on ${st.name} on ${dayOfWeekStr} — at least one companion is required.`
              );
            }
          }
        }
      }
    }
  }

  // Phase 4: New Employee Mentor Requirement
  for (const employee of employees) {
    if (employee.requiresMentor) {
      for (const dayOfWeekStr of daysOfWeekList) {
        // Find employee's shift on this day
        const update = updates.find(
          (u) => u.employeeId === employee.id && u.dayOfWeek === dayOfWeekStr
        );
        let shiftTypeId: string | null = null;
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

        if (shiftTypeId) {
          // Find companions scheduled on same day/shift
          const companions = employees.filter((other) => {
            if (other.id === employee.id) return false;

            const otherUpdate = updates.find(
              (u) => u.employeeId === other.id && u.dayOfWeek === dayOfWeekStr
            );
            let otherShiftTypeId: string | null = null;
            if (otherUpdate) {
              otherShiftTypeId = otherUpdate.shiftTypeId;
            } else {
              const dbMatch = allEntries.find(
                (e) =>
                  e.employeeId === other.id &&
                  e.scheduleWeekId === currentWeek.id &&
                  e.dayOfWeek === dayOfWeekStr
              );
              otherShiftTypeId = dbMatch ? dbMatch.shiftTypeId : null;
            }
            return otherShiftTypeId === shiftTypeId;
          });

          // Check if at least one companion is experienced or is the mentor
          const hasMentorPresent = companions.some(
            (comp) => !comp.requiresMentor || comp.id === employee.mentorId
          );

          if (!hasMentorPresent) {
            const shiftType = shiftTypesMap.get(shiftTypeId);
            errors.push(
              `${employee.name} requires a mentor present — cannot be scheduled solo on ${shiftType?.name ?? 'shift'} on ${dayOfWeekStr}.`
            );
          }
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

export async function validateShiftCoverage(proposedShift?: {
  id?: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
}): Promise<string[]> {
  const warnings: string[] = [];

  // 1. Fetch current shift types from database
  const dbShiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  // 2. Merge proposed shift type (if any)
  const shiftTypes = [...dbShiftTypes];
  if (proposedShift) {
    const existingIdx = proposedShift.id ? shiftTypes.findIndex((st) => st.id === proposedShift.id) : -1;
    if (existingIdx !== -1) {
      // Update existing
      shiftTypes[existingIdx] = {
        ...shiftTypes[existingIdx],
        name: proposedShift.name.trim().toUpperCase(),
        startTime: proposedShift.startTime,
        endTime: proposedShift.endTime,
      };
    } else {
      // Create new
      shiftTypes.push({
        id: 'proposed-id',
        name: proposedShift.name.trim().toUpperCase(),
        startTime: proposedShift.startTime,
        endTime: proposedShift.endTime,
        colorHex: '#000000',
        sortOrder: 9999,
        isNightShift: false,
        daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        isComposite: false,
        compositeShiftIds: [],
        daysMapping: [],
      });
    }
  }

  // 3. Get rules config
  const rulesConfig = await prisma.schedulingRuleConfig.findFirst();
  const overlapHours = rulesConfig?.shiftOverlapHours ?? 1;
  const targetOverlapMin = overlapHours * 60;

  // 4. Filter to timed shifts
  const timedShifts = shiftTypes
    .filter((st) => st.startTime !== null && st.endTime !== null && st.name !== 'LEAVE')
    .map((st) => {
      try {
        const startParts = parseTimeString(st.startTime!);
        const endParts = parseTimeString(st.endTime!);
        const startMin = startParts.hours * 60 + startParts.minutes;
        const endMin = endParts.hours * 60 + endParts.minutes;
        return {
          name: st.name,
          startMin,
          endMin: endMin <= startMin ? endMin + 1440 : endMin,
        };
      } catch {
        return null;
      }
    })
    .filter((st): st is NonNullable<typeof st> => st !== null);

  if (timedShifts.length === 0) {
    return warnings;
  }

  // Sort by start time
  timedShifts.sort((a, b) => a.startMin - b.startMin);

  const n = timedShifts.length;

  for (let i = 0; i < n; i++) {
    const current = timedShifts[i];
    const next = timedShifts[(i + 1) % n];

    let overlapMin = 0;
    if (i === n - 1) {
      // Wrap around
      overlapMin = current.endMin - (next.startMin + 1440);
    } else {
      overlapMin = current.endMin - next.startMin;
    }

    if (overlapMin < targetOverlapMin) {
      warnings.push(
        `Coverage gap detected between ${current.name} and ${next.name}. Overlap is only ${(Math.max(0, overlapMin) / 60).toFixed(1)} hours (minimum ${overlapHours} hour required).`
      );
    }
  }

  return warnings;
}

