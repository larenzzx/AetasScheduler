import 'dotenv/config';
import { PrismaClient, Team, DayOfWeek } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding shift types...');
  
  // Clean up old shift types and reassign employees to Day Shift A
  console.log('Cleaning up old shift types...');
  let dayShiftA = await prisma.shiftType.findFirst({ where: { name: 'DAY SHIFT A' } });
  if (!dayShiftA) {
    dayShiftA = await prisma.shiftType.create({
      data: {
        name: 'DAY SHIFT A',
        startTime: '6:00 AM',
        endTime: '3:00 PM',
        colorHex: '#22C55E',
        sortOrder: 1,
        isNightShift: false,
        daysOfWeek: ['MON', 'THU', 'FRI', 'SAT', 'SUN'] as DayOfWeek[]
      }
    });
  }

  const obsoleteShifts = await prisma.shiftType.findMany({
    where: { name: { in: ['DAY SHIFT'] } }
  });
  const obsoleteShiftIds = obsoleteShifts.map(s => s.id);
  if (obsoleteShiftIds.length > 0) {
    await prisma.employee.updateMany({
      where: { currentShiftTypeId: { in: obsoleteShiftIds } },
      data: { currentShiftTypeId: dayShiftA.id }
    });
    await prisma.scheduleEntry.updateMany({
      where: { shiftTypeId: { in: obsoleteShiftIds } },
      data: { shiftTypeId: dayShiftA.id }
    });
  }

  await prisma.shiftType.deleteMany({
    where: {
      name: { notIn: ['DAY SHIFT A', 'DAY SHIFT B', 'MORNING SHIFT', 'MID SHIFT', 'NIGHT SHIFT', 'MIDNIGHT SHIFT', 'LEAVE', 'ADJUST SHIFT'] }
    }
  });

  const shiftTypesData = [
    { name: 'DAY SHIFT A', startTime: '6:00 AM', endTime: '3:00 PM', colorHex: '#22C55E', sortOrder: 1, isNightShift: false, daysOfWeek: ['MON', 'THU', 'FRI', 'SAT', 'SUN'] as DayOfWeek[] },
    { name: 'DAY SHIFT B', startTime: '6:00 AM', endTime: '3:00 PM', colorHex: '#22C55E', sortOrder: 2, isNightShift: false, daysOfWeek: ['TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayOfWeek[] },
    { name: 'MORNING SHIFT', startTime: '8:00 AM', endTime: '5:00 PM', colorHex: '#94A3B8', sortOrder: 3, isNightShift: false, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[] },
    { name: 'MID SHIFT', startTime: '2:00 PM', endTime: '11:00 PM', colorHex: '#F97316', sortOrder: 4, isNightShift: false, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[] },
    { name: 'NIGHT SHIFT', startTime: '8:30 PM', endTime: '5:30 AM', colorHex: '#A855F7', sortOrder: 5, isNightShift: true, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[] },
    { name: 'MIDNIGHT SHIFT', startTime: '10:00 PM', endTime: '7:00 AM', colorHex: '#3B82F6', sortOrder: 6, isNightShift: true, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[] },
    { name: 'LEAVE', startTime: null, endTime: null, colorHex: '#D8B4FE', sortOrder: 7, isNightShift: false, daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI'] as DayOfWeek[] },
    { name: 'ADJUST SHIFT', startTime: null, endTime: null, colorHex: '#EF4444', sortOrder: 8, isNightShift: false, daysOfWeek: [] as DayOfWeek[] },
  ];

  const shiftTypes = [];
  for (const shift of shiftTypesData) {
    const created = await prisma.shiftType.upsert({
      where: { name: shift.name },
      update: shift,
      create: shift,
    });
    shiftTypes.push(created);
    console.log(`- Seeded shift: ${created.name}`);
  }

  console.log('Seeding employees...');

  // Seed Employees with their respective base shifts and fixed status
  const employeesData = [
    // Team Alabang
    { name: 'Charlie Fernando', employeeId: '1', team: Team.ALABANG, baseShiftName: 'MIDNIGHT SHIFT', isFixedSchedule: false },
    { name: 'June Alfred Padrid', employeeId: '18', team: Team.ALABANG, baseShiftName: 'ADJUST SHIFT', isFixedSchedule: false },
    { name: 'Migs Regoso', employeeId: '7', team: Team.ALABANG, baseShiftName: 'DAY SHIFT A', isFixedSchedule: false },
    { name: 'Emil Calilung', employeeId: '8', team: Team.ALABANG, baseShiftName: 'MID SHIFT', isFixedSchedule: false },
    { name: 'Adrian Tamio', employeeId: '9', team: Team.ALABANG, baseShiftName: 'MIDNIGHT SHIFT', isFixedSchedule: false },
    { name: 'Kate Garcia', employeeId: '10', team: Team.ALABANG, baseShiftName: 'NIGHT SHIFT', isFixedSchedule: false },

    // Team Zamboanga
    { name: 'Janet Saldo', employeeId: '17', team: Team.ZAMBOANGA, baseShiftName: 'MORNING SHIFT', isFixedSchedule: true },
    { name: 'John Philip Gaas', employeeId: '5', team: Team.ZAMBOANGA, baseShiftName: 'DAY SHIFT B', isFixedSchedule: false },
    { name: 'Mark Tabotabo', employeeId: '12', team: Team.ZAMBOANGA, baseShiftName: 'DAY SHIFT A', isFixedSchedule: false },
    { name: 'Lawrence Laraño', employeeId: '21', team: Team.ZAMBOANGA, baseShiftName: 'ADJUST SHIFT', isFixedSchedule: false },
    { name: 'Journey Hemoroz', employeeId: '15', team: Team.ZAMBOANGA, baseShiftName: 'ADJUST SHIFT', isFixedSchedule: false },
    { name: 'Jeanelle Andrade', employeeId: '19', team: Team.ZAMBOANGA, baseShiftName: 'ADJUST SHIFT', isFixedSchedule: false },
    { name: 'Alen Rose Dumalagan', employeeId: '20', team: Team.ZAMBOANGA, baseShiftName: 'MID SHIFT', isFixedSchedule: false },
    { name: 'Franz Valdez', employeeId: '14', team: Team.ZAMBOANGA, baseShiftName: 'MIDNIGHT SHIFT', isFixedSchedule: false },
    { name: 'Mariel Quijano', employeeId: '16', team: Team.ZAMBOANGA, baseShiftName: 'MIDNIGHT SHIFT', isFixedSchedule: false },
  ];

  for (const emp of employeesData) {
    const shift = shiftTypes.find((s) => s.name === emp.baseShiftName);
    const created = await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: {
        name: emp.name,
        team: emp.team,
        isFixedSchedule: emp.isFixedSchedule,
        currentShiftTypeId: shift ? shift.id : null,
      },
      create: {
        name: emp.name,
        employeeId: emp.employeeId,
        team: emp.team,
        isFixedSchedule: emp.isFixedSchedule,
        currentShiftTypeId: shift ? shift.id : null,
      },
    });
    console.log(`- Seeded employee: ${created.name} (${created.employeeId}) [${created.team}] with base shift ${emp.baseShiftName} (Fixed: ${emp.isFixedSchedule})`);
  }

  console.log('Seeding SchedulingRuleConfig...');
  const existingConfig = await prisma.schedulingRuleConfig.findFirst();
  if (!existingConfig) {
    await prisma.schedulingRuleConfig.create({
      data: {
        minRestHours: 7,
        recommendedRestHours: 8,
        maxConsecutiveDays: 6,
        maxWeeklyWorkdays: 5,
        rotationCycleDays: 14,
        shiftOverlapHours: 1,
      },
    });
    console.log('- Seeded default SchedulingRuleConfig');
  } else {
    console.log('- SchedulingRuleConfig already exists');
  }

  console.log('Seeding TeamSettings...');
  for (const team of [Team.ALABANG, Team.ZAMBOANGA]) {
    await prisma.teamSettings.upsert({
      where: { team },
      update: {},
      create: { team, rotationEnabled: true },
    });
    console.log(`- Seeded TeamSettings for ${team}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
