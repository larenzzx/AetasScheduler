import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createScheduleWeek } from '../app/actions/schedule';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  const weekStartStr = '2026-06-22'; // Next Monday
  console.log(`\n================ SIMULATING FOR ZAMBOANGA WEEK START: ${weekStartStr} ================`);

  // Run generation
  const zamboResult = await createScheduleWeek(weekStartStr, 'ZAMBOANGA', 'generate');
  
  console.log('\n--- Generation Summary counts ---');
  console.log(zamboResult.summary);

  console.log('\n--- Generated Grid Entries ---');
  for (const row of zamboResult.rows) {
    const emp = row.employee;
    const baseShiftName = emp.currentShiftTypeId 
      ? zamboResult.shiftTypes.find(st => st.id === emp.currentShiftTypeId)?.name 
      : 'NONE';

    const dayAssignments = Object.entries(row.entries).map(([day, entry]) => {
      const shiftName = entry.shiftTypeId 
        ? zamboResult.shiftTypes.find(st => st.id === entry.shiftTypeId)?.name 
        : 'OFF';
      return `${day}: ${shiftName}`;
    });

    console.log(`Employee: ${emp.name} | Base Shift: ${baseShiftName}`);
    console.log(`  Assignments: ${dayAssignments.join(' | ')}`);
  }

  // Validate no regular employee's schedule was altered
  console.log('\n--- Verifying Base Shift Schedule Matching (Direct Base Shift Matching) ---');
  let mismatchCount = 0;
  let adjustDetails: string[] = [];

  for (const row of zamboResult.rows) {
    const emp = row.employee;
    const baseShift = emp.currentShiftTypeId 
      ? zamboResult.shiftTypes.find(st => st.id === emp.currentShiftTypeId)
      : null;

    const days: ('MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN')[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    let employeeMismatches = 0;

    for (const day of days) {
      const entry = row.entries[day];
      const assignedShiftName = entry.shiftTypeId 
        ? zamboResult.shiftTypes.find(st => st.id === entry.shiftTypeId)?.name 
        : 'OFF';

      if (baseShift && baseShift.name !== 'ADJUST SHIFT') {
        const expectedShiftName = baseShift.daysOfWeek.includes(day) ? baseShift.name : 'OFF';
        if (assignedShiftName !== expectedShiftName) {
          console.log(`⚠️ MISMATCH for regular employee ${emp.name} on ${day}: Expected base shift "${expectedShiftName}" but got "${assignedShiftName}"`);
          employeeMismatches++;
          mismatchCount++;
        }
      } else if (baseShift && baseShift.name === 'ADJUST SHIFT') {
        if (assignedShiftName !== 'OFF') {
          adjustDetails.push(`${emp.name} drafted to cover "${assignedShiftName}" on ${day}`);
        }
      }
    }
  }

  if (mismatchCount === 0) {
    console.log('✅ Success: All regular employees were scheduled exactly to their configured base shifts!');
  } else {
    console.log(`❌ Error: Found ${mismatchCount} schedule mismatches for regular employees.`);
  }

  if (adjustDetails.length > 0) {
    console.log('\n--- Adjust Employees Draft Details ---');
    adjustDetails.forEach(detail => console.log(`  - ${detail}`));
    
    // Check they are only assigned allowed shifts (Day A/B, Mid, Midnight)
    const allowed = ['DAY SHIFT A', 'DAY SHIFT B', 'MID SHIFT', 'MIDNIGHT SHIFT'];
    let disallowedDraftCount = 0;
    for (const detail of adjustDetails) {
      const hasAllowed = allowed.some(a => detail.includes(a));
      if (!hasAllowed) {
        console.log(`⚠️ DISALLOWED shift drafted: ${detail}`);
        disallowedDraftCount++;
      }
    }
    if (disallowedDraftCount === 0) {
      console.log('✅ Success: Float/Adjust employees were only drafted for allowed shifts (Day A/B, Mid, Midnight)!');
    } else {
      console.log('❌ Error: Disallowed shifts were drafted for adjust employees!');
    }
  } else {
    console.log('\n--- Adjust Employees Draft Details ---');
    console.log('  No float/adjust employees needed to be drafted.');
  }

  console.log('\n================ SIMULATING FOR ALABANG WEEK START: 2026-06-22 ================');
  const alabangResult = await createScheduleWeek(weekStartStr, 'ALABANG', 'generate');
  console.log(alabangResult.summary);
}

runTest()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
