import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('\n--- EMPLOYEES DETAILS ---');
  const employees = await prisma.employee.findMany({
    include: { currentShiftType: true },
  });
  employees.forEach((emp) => {
    console.log(`ID: ${emp.employeeId} | Name: ${emp.name} | Base Shift: ${emp.currentShiftType ? emp.currentShiftType.name : 'NONE'} | Fixed: ${emp.isFixedSchedule} | Gender: ${emp.gender}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
