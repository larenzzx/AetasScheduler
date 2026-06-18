'use server';

import { prisma } from '@/lib/prisma';
import { DayOfWeek, Team, ScheduleDataResponse, ScheduleGridRow } from '@/types';
import { formatWeekRange, sortScheduleRows } from '@/lib/utils';
import { validateSchedule } from '@/lib/schedulingValidation';

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
    rows: sortScheduleRows(rows, shiftTypes),
  };
}

export async function createScheduleWeek(
  weekStartDateStr: string,
  team: Team,
  option: 'blank' | 'copy' | 'generate'
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

  // 3. Fetch all shift types
  const shiftTypes = await prisma.shiftType.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });

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
  } else if (option === 'blank') {
    const entriesToCreate = [];

    for (const employee of employees) {
      for (const day of days) {
        entriesToCreate.push({
          employeeId: employee.id,
          scheduleWeekId: week.id,
          dayOfWeek: day,
          shiftTypeId: null,
        });
      }
    }

    await prisma.scheduleEntry.deleteMany({
      where: { scheduleWeekId: week.id },
    });

    await prisma.scheduleEntry.createMany({
      data: entriesToCreate,
    });
  } else if (option === 'generate') {
    // Fetch team settings for rotation
    const teamSettings = await prisma.teamSettings.findUnique({
      where: { team },
    });
    const rotationEnabled = teamSettings?.rotationEnabled ?? true;

    // Find the earliest scheduled week for this team to calculate the cycle index
    const earliestWeek = await prisma.scheduleWeek.findFirst({
      where: { team },
      orderBy: { weekStartDate: 'asc' },
    });

    const earliestDate = earliestWeek ? earliestWeek.weekStartDate : weekStart;
    const msDiff = weekStart.getTime() - earliestDate.getTime();
    const weeksDiff = Math.round(msDiff / (7 * 24 * 60 * 60 * 1000));
    const periodIndex = Math.max(0, Math.floor(weeksDiff / 2));

    const rotationPathNames = ['DAY SHIFT', 'MID SHIFT', 'ADJUST SHIFT', 'NIGHT SHIFT'];
    const rotationPath = rotationPathNames
      .map((name) => shiftTypes.find((st) => st.name === name))
      .filter((st): st is NonNullable<typeof st> => !!st);

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

    const proposedUpdates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }> = [];
    const flaggedEmployees = new Set<string>();
    const flaggedReasons = new Map<string, string[]>();

    // Initial assignment
    for (const employee of employees) {
      const isFixed = employee.isFixedSchedule || !rotationEnabled;
      const baseShiftType = employee.currentShiftTypeId
        ? shiftTypes.find((st) => st.id === employee.currentShiftTypeId)
        : null;

      for (const day of days) {
        let shiftTypeId: string | null = null;
        if (baseShiftType) {
          let finalShiftType = baseShiftType;
          if (!isFixed) {
            const baseIdx = rotationPath.findIndex((st) => st.id === baseShiftType.id);
            if (baseIdx !== -1) {
              finalShiftType = rotationPath[(baseIdx + periodIndex) % rotationPath.length];
            }
          }
          if (finalShiftType.daysOfWeek.includes(day)) {
            shiftTypeId = finalShiftType.id;
          }
        }
        proposedUpdates.push({
          employeeId: employee.id,
          dayOfWeek: day,
          shiftTypeId,
        });
      }
    }

    // Iterative validation and revert loop
    let stable = false;
    let iteration = 0;
    const maxIterations = 5;
    const autoResolvedEmployees = new Set<string>();

    while (!stable && iteration < maxIterations) {
      iteration++;
      const validationResult = await validateSchedule(week.id, proposedUpdates);
      
      if (validationResult.success) {
        stable = true;
      } else {
        let resolvedAny = false;
        
        for (const error of validationResult.errors) {
          const isGenderError = error.includes('companion is required for night shifts');
          const isMentorError = error.includes('requires a mentor present');

          if (isGenderError) {
            // Find female employee and day
            const femaleEmp = employees.find(e => error.includes(e.name) && e.gender === 'FEMALE');
            const dayStr = days.find(d => error.includes(d));
            const nightShiftType = shiftTypes.find(st => st.isNightShift && error.includes(st.name));

            if (femaleEmp && dayStr && nightShiftType) {
              let companionFound = false;
              for (const cand of employees) {
                if (cand.id === femaleEmp.id) continue;
                if (cand.isFixedSchedule) continue;

                const candUpdateIdx = proposedUpdates.findIndex(u => u.employeeId === cand.id && u.dayOfWeek === dayStr);
                if (candUpdateIdx === -1) continue;

                const currentShiftId = proposedUpdates[candUpdateIdx].shiftTypeId;
                const currentShift = currentShiftId ? shiftTypes.find(st => st.id === currentShiftId) : null;
                const isAvailable = !currentShift || !currentShift.startTime;

                if (isAvailable) {
                  const prevShiftId = currentShiftId;
                  proposedUpdates[candUpdateIdx].shiftTypeId = nightShiftType.id;

                  const tempVal = await validateSchedule(week.id, proposedUpdates);
                  const candHasError = tempVal.errors.some(err => err.includes(cand.name));

                  if (!candHasError) {
                    companionFound = true;
                    autoResolvedEmployees.add(femaleEmp.id);
                    autoResolvedEmployees.add(cand.id);
                    resolvedAny = true;
                    break;
                  } else {
                    proposedUpdates[candUpdateIdx].shiftTypeId = prevShiftId;
                  }
                }
              }
              if (companionFound) {
                break;
              }
            }
          } else if (isMentorError) {
            const newEmp = employees.find(e => error.includes(e.name) && e.requiresMentor);
            const dayStr = days.find(d => error.includes(d));
            const newEmpUpdate = proposedUpdates.find(u => u.employeeId === newEmp?.id && u.dayOfWeek === dayStr);
            const shiftType = newEmpUpdate?.shiftTypeId ? shiftTypes.find(st => st.id === newEmpUpdate.shiftTypeId) : null;

            if (newEmp && dayStr && shiftType) {
              let companionFound = false;
              for (const cand of employees) {
                if (cand.id === newEmp.id) continue;
                if (cand.isFixedSchedule) continue;

                const isMentorCandidate = !cand.requiresMentor || cand.id === newEmp.mentorId;
                if (isMentorCandidate) {
                  const candUpdateIdx = proposedUpdates.findIndex(u => u.employeeId === cand.id && u.dayOfWeek === dayStr);
                  if (candUpdateIdx === -1) continue;

                  const currentShiftId = proposedUpdates[candUpdateIdx].shiftTypeId;
                  const currentShift = currentShiftId ? shiftTypes.find(st => st.id === currentShiftId) : null;
                  const isAvailable = !currentShift || !currentShift.startTime;

                  if (isAvailable) {
                    const prevShiftId = currentShiftId;
                    proposedUpdates[candUpdateIdx].shiftTypeId = shiftType.id;

                    const tempVal = await validateSchedule(week.id, proposedUpdates);
                    const candHasError = tempVal.errors.some(err => err.includes(cand.name));

                    if (!candHasError) {
                      companionFound = true;
                      autoResolvedEmployees.add(newEmp.id);
                      autoResolvedEmployees.add(cand.id);
                      resolvedAny = true;
                      break;
                    } else {
                      proposedUpdates[candUpdateIdx].shiftTypeId = prevShiftId;
                    }
                  }
                }
              }
              if (companionFound) {
                break;
              }
            }
          }
        }

        if (!resolvedAny) {
          let newlyFlagged = false;
          for (const error of validationResult.errors) {
            for (const employee of employees) {
              if (employee.isFixedSchedule || !rotationEnabled) continue;
              if (flaggedEmployees.has(employee.id)) continue;

              if (error.includes(employee.name)) {
                flaggedEmployees.add(employee.id);
                newlyFlagged = true;
                if (!flaggedReasons.has(employee.id)) {
                  flaggedReasons.set(employee.id, []);
                }
                flaggedReasons.get(employee.id)!.push(error);

                for (const day of days) {
                  const prevEntry = prevWeek?.entries.find(
                    (e) => e.employeeId === employee.id && e.dayOfWeek === day
                  );
                  let revertedShiftTypeId: string | null = null;
                  if (prevEntry) {
                    revertedShiftTypeId = prevEntry.shiftTypeId;
                  } else if (employee.currentShiftTypeId) {
                    const baseST = shiftTypes.find((st) => st.id === employee.currentShiftTypeId);
                    if (baseST && baseST.daysOfWeek.includes(day)) {
                      revertedShiftTypeId = employee.currentShiftTypeId;
                    }
                  }
                  const idx = proposedUpdates.findIndex(
                    (u) => u.employeeId === employee.id && u.dayOfWeek === day
                  );
                  if (idx !== -1) {
                    proposedUpdates[idx].shiftTypeId = revertedShiftTypeId;
                  }
                }
              }
            }
          }
          if (!newlyFlagged) {
            stable = true;
          }
        }
      }
    }

    // Save final entries
    const entriesToCreate = proposedUpdates.map(u => ({
      employeeId: u.employeeId,
      scheduleWeekId: week.id,
      dayOfWeek: u.dayOfWeek,
      shiftTypeId: u.shiftTypeId
    }));

    await prisma.scheduleEntry.deleteMany({
      where: { scheduleWeekId: week.id },
    });

    await prisma.scheduleEntry.createMany({
      data: entriesToCreate,
    });

    // Build summary counts
    let rotatedCount = 0;
    let autoResolvedCount = 0;
    let flaggedCount = 0;
    let skippedCount = 0;
    const flags: Array<{ employeeName: string; reason: string }> = [];

    for (const employee of employees) {
      if (employee.isFixedSchedule || !rotationEnabled) {
        skippedCount++;
      } else if (flaggedEmployees.has(employee.id)) {
        flaggedCount++;
        flags.push({
          employeeName: employee.name,
          reason: Array.from(new Set(flaggedReasons.get(employee.id) || [])).join('; ')
        });
      } else if (autoResolvedEmployees.has(employee.id)) {
        autoResolvedCount++;
      } else {
        rotatedCount++;
      }
    }

    const summary = {
      rotatedCount,
      autoResolvedCount,
      flaggedCount,
      skippedCount,
      flags
    };

    const scheduleData = await getScheduleData(weekStartDateStr, team);
    return {
      ...scheduleData,
      summary
    };
  }

  // Reload the newly created schedule
  return getScheduleData(weekStartDateStr, team);
}

export async function saveScheduleEntries(
  weekId: string,
  updates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }>
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  // Run validations
  const validationResult = await validateSchedule(weekId, updates);
  
  if (!validationResult.success) {
    return {
      success: false,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    };
  }

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

  return {
    success: true,
    errors: [],
    warnings: validationResult.warnings,
  };
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

export async function getTeamSettings(): Promise<Array<{ team: Team; rotationEnabled: boolean }>> {
  return await prisma.teamSettings.findMany();
}

export async function updateTeamSettings(team: Team, rotationEnabled: boolean): Promise<void> {
  await prisma.teamSettings.upsert({
    where: { team },
    update: { rotationEnabled },
    create: { team, rotationEnabled },
  });
}

export async function markEmergencyLeave(
  weekId: string,
  employeeId: string,
  dayOfWeek: DayOfWeek
): Promise<{
  success: boolean;
  gapDetected: boolean;
  gapDetails?: string;
  vacatedShiftTypeId?: string;
  suggestions?: Array<{ id: string; name: string; isBaseShiftMatch: boolean }>;
}> {
  // 1. Fetch current entry for this cell
  const entry = await prisma.scheduleEntry.findUnique({
    where: {
      employeeId_scheduleWeekId_dayOfWeek: {
        employeeId,
        scheduleWeekId: weekId,
        dayOfWeek,
      },
    },
  });

  const vacatedShiftTypeId = entry?.shiftTypeId;

  // 2. Fetch LEAVE shift type
  const leaveShift = await prisma.shiftType.findFirst({
    where: { name: 'LEAVE' },
  });

  if (!leaveShift) {
    throw new Error('LEAVE shift type not found in database.');
  }

  // 3. Immediately set employee's cell to LEAVE in database
  await prisma.scheduleEntry.upsert({
    where: {
      employeeId_scheduleWeekId_dayOfWeek: {
        employeeId,
        scheduleWeekId: weekId,
        dayOfWeek,
      },
    },
    update: { shiftTypeId: leaveShift.id },
    create: { employeeId, scheduleWeekId: weekId, dayOfWeek, shiftTypeId: leaveShift.id },
  });

  if (!vacatedShiftTypeId) {
    return { success: true, gapDetected: false };
  }

  const shiftTypes = await prisma.shiftType.findMany();
  const vacatedShift = shiftTypes.find((st) => st.id === vacatedShiftTypeId);
  
  if (!vacatedShift || !vacatedShift.startTime || vacatedShift.name === 'LEAVE') {
    return { success: true, gapDetected: false };
  }

  // 4. Run gap checks for this day and vacated shift
  let gapDetected = false;
  let gapDetails = '';

  const week = await prisma.scheduleWeek.findUnique({
    where: { id: weekId },
    include: { entries: true }
  });
  if (!week) return { success: true, gapDetected: false };

  const employees = await prisma.employee.findMany({
    where: { team: week.team, isActive: true },
  });

  // A: Gender rule check - check if a female employee is left solo on a night shift (Only for ZAMBOANGA team)
  if (week.team === 'ZAMBOANGA' && vacatedShift.isNightShift) {
    const scheduledOnShift = employees.filter((emp) => {
      const dbMatch = week.entries.find((e) => e.employeeId === emp.id && e.dayOfWeek === dayOfWeek);
      // Wait: we just saved leaveShift.id for employeeId. But week.entries might not reflect the updated value
      // since we fetched it before or it hasn't reloaded. Let's make sure we check the database status
      if (emp.id === employeeId) return false;
      return dbMatch?.shiftTypeId === vacatedShift.id;
    });

    const femalesOnShift = scheduledOnShift.filter((emp) => emp.gender === 'FEMALE');
    if (femalesOnShift.length > 0 && scheduledOnShift.length === 1) {
      gapDetected = true;
      gapDetails = `${femalesOnShift[0].name} is now alone on ${vacatedShift.name} on ${dayOfWeek}.`;
    }
  }

  // B: Coverage check - check if the vacated shift has zero coverage now
  const activeOnShift = employees.filter((emp) => {
    if (emp.id === employeeId) return false;
    const dbMatch = week.entries.find((e) => e.employeeId === emp.id && e.dayOfWeek === dayOfWeek);
    return dbMatch?.shiftTypeId === vacatedShift.id;
  });

  if (activeOnShift.length === 0) {
    gapDetected = true;
    gapDetails = gapDetails 
      ? `${gapDetails} Also, ${vacatedShift.name} now has 0 coverage.` 
      : `${vacatedShift.name} on ${dayOfWeek} now has 0 coverage.`;
  }

  if (!gapDetected) {
    return { success: true, gapDetected: false };
  }

  // 5. Generate suggested replacements
  const suggestions: Array<{ id: string; name: string; isBaseShiftMatch: boolean }> = [];

  for (const candidate of employees) {
    if (candidate.id === employeeId) continue;

    const candEntry = week.entries.find((e) => e.employeeId === candidate.id && e.dayOfWeek === dayOfWeek);
    // Again, candidate's entry might be read from database
    const currentShiftId = candEntry?.shiftTypeId;
    const candShift = currentShiftId ? shiftTypes.find((st) => st.id === currentShiftId) : null;
    
    const isAvailable = !candShift || !candShift.startTime || candShift.name === 'LEAVE';
    if (!isAvailable) continue;

    // Simulate candidate on vacatedShift
    const simulatedUpdates = week.entries.map((e) => {
      if (e.employeeId === candidate.id && e.dayOfWeek === dayOfWeek) {
        return { employeeId: candidate.id, dayOfWeek: e.dayOfWeek as DayOfWeek, shiftTypeId: vacatedShift.id };
      }
      if (e.employeeId === employeeId && e.dayOfWeek === dayOfWeek) {
        return { employeeId: employeeId, dayOfWeek: e.dayOfWeek as DayOfWeek, shiftTypeId: leaveShift.id };
      }
      return { employeeId: e.employeeId, dayOfWeek: e.dayOfWeek as DayOfWeek, shiftTypeId: e.shiftTypeId };
    });

    const valResult = await validateSchedule(weekId, simulatedUpdates);
    const hasErrorForCand = valResult.errors.some((err) => err.includes(candidate.name));
    
    if (!hasErrorForCand) {
      suggestions.push({
        id: candidate.id,
        name: candidate.name,
        isBaseShiftMatch: candidate.currentShiftTypeId === vacatedShift.id
      });
    }
  }

  suggestions.sort((a, b) => {
    if (a.isBaseShiftMatch && !b.isBaseShiftMatch) return -1;
    if (!a.isBaseShiftMatch && b.isBaseShiftMatch) return 1;
    return a.name.localeCompare(b.name);
  });

  return {
    success: true,
    gapDetected: true,
    gapDetails,
    vacatedShiftTypeId: vacatedShift.id,
    suggestions,
  };
}

export async function assignReplacement(
  weekId: string,
  candidateId: string,
  dayOfWeek: DayOfWeek,
  shiftTypeId: string
): Promise<void> {
  await prisma.scheduleEntry.upsert({
    where: {
      employeeId_scheduleWeekId_dayOfWeek: {
        employeeId: candidateId,
        scheduleWeekId: weekId,
        dayOfWeek,
      },
    },
    update: { shiftTypeId },
    create: { employeeId: candidateId, scheduleWeekId: weekId, dayOfWeek, shiftTypeId },
  });
}

export async function runScheduleValidation(
  weekId: string,
  updates: Array<{ employeeId: string; dayOfWeek: DayOfWeek; shiftTypeId: string | null }>
): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
  return await validateSchedule(weekId, updates);
}
