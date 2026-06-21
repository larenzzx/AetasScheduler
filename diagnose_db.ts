import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL;
console.log('Connecting to database...');
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- DIAGNOSING SCHEDULE ENTRIES ---');

  // Fetch all shift types
  const shiftTypes = await prisma.shiftType.findMany();
  console.log('\n--- SHIFT TYPES ---');
  shiftTypes.forEach(s => {
    console.log(`- ID: ${s.id}, Name: ${s.name}, Start: ${s.startTime}, End: ${s.endTime}, isNightShift: ${s.isNightShift}, Workdays: [${s.daysOfWeek.join(', ')}]`);
  });

  // Find employees
  const employees = await prisma.employee.findMany({
    include: {
      currentShiftType: true
    }
  });

  console.log('\n--- EMPLOYEES ---');
  employees.forEach(e => {
    console.log(`- ID: ${e.id}, Name: ${e.name}, EmpID: ${e.employeeId}, Team: ${e.team}, Base Shift: ${e.currentShiftType ? e.currentShiftType.name : 'NONE'}, isFixedSchedule: ${e.isFixedSchedule}`);
  });

  // Fetch all weeks
  const weeks = await prisma.scheduleWeek.findMany({
    orderBy: { weekStartDate: 'asc' }
  });

  console.log('\n--- SCHEDULE WEEKS ---');
  weeks.forEach(w => {
    console.log(`- Week ID: ${w.id}, StartDate: ${w.weekStartDate.toISOString().split('T')[0]}, Team: ${w.team}, Label: ${w.label}`);
  });

  for (const emp of employees) {
    console.log(`\n=================== SCHEDULE FOR ${emp.name.toUpperCase()} ===================`);
    
    // Fetch all entries for this employee
    const entries = await prisma.scheduleEntry.findMany({
      where: { employeeId: emp.id },
      include: {
        scheduleWeek: true,
        shiftType: true
      },
      orderBy: [
        { scheduleWeek: { weekStartDate: 'asc' } },
        { dayOfWeek: 'asc' }
      ]
    });

    if (entries.length === 0) {
      console.log('No schedule entries found.');
      continue;
    }

    // Group entries by week
    const entriesByWeek: Record<string, typeof entries> = {};
    entries.forEach(entry => {
      const weekKey = `${entry.scheduleWeek.weekStartDate.toISOString().split('T')[0]} (${entry.scheduleWeek.team})`;
      if (!entriesByWeek[weekKey]) {
        entriesByWeek[weekKey] = [];
      }
      entriesByWeek[weekKey].push(entry);
    });

    const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    Object.entries(entriesByWeek).forEach(([week, weekEntries]) => {
      console.log(`\nWeek: ${week}`);
      
      // Sort week entries in Mon-Sun order
      const sortedEntries = [...weekEntries].sort((a, b) => {
        return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      });

      sortedEntries.forEach(entry => {
        console.log(`  - ${entry.dayOfWeek}: ${entry.shiftType ? `${entry.shiftType.name} (${entry.shiftType.startTime} - ${entry.shiftType.endTime})` : 'DAY-OFF'}`);
      });
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
