'use server';

import { prisma } from '@/lib/prisma';
import { DayOfWeek, Team, ScheduleDataResponse, ScheduleGridRow } from '@/types';
import { endOfWeek, addDays, parseISO } from 'date-fns';
import { formatWeekRange } from '@/lib/utils';

export async function getScheduleData(
  weekStartDateStr: string,
  team: Team
): Promise<ScheduleDataResponse> {
  const weekStart = parseISO(weekStartDateStr);

  // 1. Fetch the schedule week details if it exists
  const week = await prisma.scheduleWeek.findUnique({
    where: {
      weekStartDate_team: {
        weekStartDate: weekStart,
        team: team,
      },
    },
  });

  // 2. Fetch all active employees for this team
  const employees = await prisma.employee.findMany({
    where: {
      team: team,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // 3. Fetch all shift types
  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });

  if (!week) {
    return {
      week: null,
      employees,
      shiftTypes,
      rows: [],
    };
  }

  // 4. Fetch all schedule entries for this week
  const dbEntries = await prisma.scheduleEntry.findMany({
    where: {
      scheduleWeekId: week.id,
    },
  });

  // 5. Build grid rows
  const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  const rows: ScheduleGridRow[] = employees.map((employee) => {
    const employeeEntries = {} as Record<DayOfWeek, { id: string | null; shiftTypeId: string | null }>;
    
    days.forEach((day) => {
      const match = dbEntries.find(
        (e) => e.employeeId === employee.id && e.dayOfWeek === day
      );
      employeeEntries[day] = {
        id: match ? match.id : null,
        shiftTypeId: match ? match.shiftTypeId : null,
      };
    });

    return {
      employee,
      entries: employeeEntries,
    };
  });

  return {
    week,
    employees,
    shiftTypes,
    rows,
  };
}

export async function createScheduleWeek(
  weekStartDateStr: string,
  team: Team,
  option: 'blank' | 'copy' | 'rotate'
): Promise<ScheduleDataResponse> {
  const weekStart = parseISO(weekStartDateStr);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const label = formatWeekRange(weekStart, weekEnd);

  // 1. Create or retrieve the ScheduleWeek
  const week = await prisma.scheduleWeek.upsert({
    where: {
      weekStartDate_team: {
        weekStartDate: weekStart,
        team: team,
      },
    },
    update: {
      label,
    },
    create: {
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      team,
      label,
    },
  });

  // 2. Fetch active employees
  const employees = await prisma.employee.findMany({
    where: { team, isActive: true },
    orderBy: { name: 'asc' },
  });

  // 3. Fetch shift types
  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // 4. Handle creation strategy
  if (option === 'copy' || option === 'rotate') {
    // Find previous week's start date
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeek = await prisma.scheduleWeek.findUnique({
      where: {
        weekStartDate_team: {
          weekStartDate: prevWeekStart,
          team,
        },
      },
      include: {
        entries: true,
      },
    });

    if (prevWeek && prevWeek.entries.length > 0) {
      const entriesToCreate = [];

      // If rotating, we need to map out rotation logic
      // DAY SHIFT (Green) -> MID SHIFT (Orange) -> ADJUST SHIFT (Red) -> NIGHT SHIFT (Purple) -> DAY SHIFT
      const rotatingShiftsSequence = ['DAY SHIFT', 'MID SHIFT', 'ADJUST SHIFT', 'NIGHT SHIFT'];

      for (const employee of employees) {
        for (const day of days) {
          const prevEntry = prevWeek.entries.find(
            (e) => e.employeeId === employee.id && e.dayOfWeek === day
          );

          let newShiftTypeId = prevEntry ? prevEntry.shiftTypeId : null;

          if (option === 'rotate' && prevEntry && prevEntry.shiftTypeId) {
            const currentShift = shiftTypes.find((s) => s.id === prevEntry.shiftTypeId);
            // Rotate only if the shift is marked as isRotating in ShiftType
            if (currentShift && currentShift.isRotating) {
              const seqIdx = rotatingShiftsSequence.indexOf(currentShift.name);
              if (seqIdx !== -1) {
                const nextSeqName = rotatingShiftsSequence[(seqIdx + 1) % rotatingShiftsSequence.length];
                const nextShift = shiftTypes.find((s) => s.name === nextSeqName);
                if (nextShift) {
                  newShiftTypeId = nextShift.id;
                }
              }
            }
          }

          entriesToCreate.push({
            employeeId: employee.id,
            scheduleWeekId: week.id,
            dayOfWeek: day,
            shiftTypeId: newShiftTypeId,
          });
        }
      }

      // Bulk create new entries
      // Prisma does not support createMany for upsert in a single call easily, but since this is a new week, we can delete any existing entries (if any) and do createMany.
      await prisma.scheduleEntry.deleteMany({
        where: { scheduleWeekId: week.id },
      });

      await prisma.scheduleEntry.createMany({
        data: entriesToCreate,
      });
    }
  }

  // Reload the newly created schedule
  return getScheduleData(weekStartDateStr, team);
}

export async function saveScheduleEntries(
  weekId: string,
  updates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }>
): Promise<void> {
  // We use a transaction to run all updates together
  await prisma.$transaction(
    updates.map((update) =>
      prisma.scheduleEntry.upsert({
        where: {
          employeeId_scheduleWeekId_dayOfWeek: {
            employeeId: update.employeeId,
            scheduleWeekId: weekId,
            dayOfWeek: update.dayOfWeek,
          },
        },
        update: {
          shiftTypeId: update.shiftTypeId,
        },
        create: {
          employeeId: update.employeeId,
          scheduleWeekId: weekId,
          dayOfWeek: update.dayOfWeek,
          shiftTypeId: update.shiftTypeId,
        },
      })
    )
  );
}
