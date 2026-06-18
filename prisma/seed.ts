import 'dotenv/config';
import { PrismaClient, Team } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning up old shift types...');
  // Ensure ADJUST SHIFT is deleted from database
  await prisma.shiftType.deleteMany({
    where: { name: 'ADJUST SHIFT' },
  });

  console.log('Seeding shift types...');
  
  // Seed Shift Types
  const shiftTypesData = [
    { name: 'DAY SHIFT', startTime: '6:00 AM', endTime: '3:00 PM', colorHex: '#22C55E', sortOrder: 1, isNightShift: false }, // Green (6:00 AM)
    { name: 'MORNING SHIFT', startTime: '8:00 AM', endTime: '5:00 PM', colorHex: '#94A3B8', sortOrder: 2, isNightShift: false }, // Slate/Gray (8:00 AM)
    { name: 'MID SHIFT', startTime: '2:00 PM', endTime: '11:00 PM', colorHex: '#F97316', sortOrder: 3, isNightShift: false }, // Orange (2:00 PM)
    { name: 'NIGHT SHIFT', startTime: '8:30 PM', endTime: '5:30 AM', colorHex: '#A855F7', sortOrder: 4, isNightShift: true }, // Purple (8:30 PM)
    { name: 'MIDNIGHT SHIFT', startTime: '10:00 PM', endTime: '7:00 AM', colorHex: '#3B82F6', sortOrder: 5, isNightShift: true }, // Blue (10:00 PM)
    { name: 'LEAVE', startTime: null, endTime: null, colorHex: '#D8B4FE', sortOrder: 6, isNightShift: false }, // Lavender (no time)
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

  // Seed Employees
  const employeesData = [
    // Team Alabang
    { name: 'Charlie Fernando', employeeId: '1', team: Team.ALABANG },
    { name: 'June Alfred Padrid', employeeId: '18', team: Team.ALABANG },
    { name: 'Migs Regoso', employeeId: '7', team: Team.ALABANG },
    { name: 'Emil Calilung', employeeId: '8', team: Team.ALABANG },
    { name: 'Adrian Tamio', employeeId: '9', team: Team.ALABANG },
    { name: 'Kate Garcia', employeeId: '10', team: Team.ALABANG },

    // Team Zamboanga
    { name: 'Janet Saldo', employeeId: '17', team: Team.ZAMBOANGA },
    { name: 'John Philip Gaas', employeeId: '5', team: Team.ZAMBOANGA },
    { name: 'Mark Tabotabo', employeeId: '12', team: Team.ZAMBOANGA },
    { name: 'Lawrence Laraño', employeeId: '21', team: Team.ZAMBOANGA },
    { name: 'Journey Hemoroz', employeeId: '15', team: Team.ZAMBOANGA },
    { name: 'Jeanelle Andrade', employeeId: '19', team: Team.ZAMBOANGA }, // Updated ID to 19
    { name: 'Alen Rose Dumalagan', employeeId: '20', team: Team.ZAMBOANGA },
    { name: 'Franz Valdez', employeeId: '14', team: Team.ZAMBOANGA },
    { name: 'Mariel Quijano', employeeId: '16', team: Team.ZAMBOANGA }, // Updated ID to 16
  ];

  for (const emp of employeesData) {
    const created = await prisma.employee.upsert({
      where: { employeeId: emp.employeeId },
      update: emp,
      create: emp,
    });
    console.log(`- Seeded employee: ${created.name} (${created.employeeId}) [${created.team}]`);
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
