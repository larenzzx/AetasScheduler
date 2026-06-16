'use server';

import { prisma } from '@/lib/prisma';
import { DayOfWeek, Team, ScheduleDataResponse, ScheduleGridRow } from '@/types';
import { formatWeekRange } from '@/lib/utils';

export async function getScheduleData(
  weekStartDateStr: string,
  team: Team
): Promise<ScheduleDataResponse> {
  const weekStart = new Date(`${weekStartDateStr}T00:00:00.000Z`);

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
  });
  employees.sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));

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
  option: 'blank' | 'copy'
): Promise<ScheduleDataResponse> {
  const weekStart = new Date(`${weekStartDateStr}T00:00:00.000Z`);
  const weekEnd = new Date(`${weekStartDateStr}T23:59:59.999Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
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
  });
  employees.sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));


  const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  // 4. Handle creation strategy
  if (option === 'copy') {
    // Find previous week's start date
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setUTCDate(prevWeekStart.getUTCDate() - 7);
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

      for (const employee of employees) {
        for (const day of days) {
          const prevEntry = prevWeek.entries.find(
            (e) => e.employeeId === employee.id && e.dayOfWeek === day
          );

          const newShiftTypeId = prevEntry ? prevEntry.shiftTypeId : null;

          entriesToCreate.push({
            employeeId: employee.id,
            scheduleWeekId: week.id,
            dayOfWeek: day,
            shiftTypeId: newShiftTypeId,
          });
        }
      }

      // Bulk create new entries
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

export async function deleteScheduleWeek(
  weekStartDateStr: string,
  team: Team
): Promise<void> {
  const weekStart = new Date(`${weekStartDateStr}T00:00:00.000Z`);
  try {
    await prisma.scheduleWeek.delete({
      where: {
        weekStartDate_team: {
          weekStartDate: weekStart,
          team: team,
        },
      },
    });
  } catch (error) {
    console.error('Failed to delete schedule week:', error);
    throw new Error('Failed to delete schedule week.');
  }
}
