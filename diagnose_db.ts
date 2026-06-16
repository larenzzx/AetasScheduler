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
  console.log('--- DIAGNOSING DATABASE ---');
  
  const employees = await prisma.employee.findMany();
  console.log(`Total employees in DB: ${employees.length}`);
  
  const alabang = employees.filter(e => e.team === 'ALABANG');
  const zamboanga = employees.filter(e => e.team === 'ZAMBOANGA');
  
  console.log(`\nTeam Alabang (${alabang.length} total):`);
  alabang.forEach(e => {
    console.log(`- ${e.name} (ID: ${e.employeeId}), Active: ${e.isActive}`);
  });
  
  console.log(`\nTeam Zamboanga (${zamboanga.length} total):`);
  zamboanga.forEach(e => {
    console.log(`- ${e.name} (ID: ${e.employeeId}), Active: ${e.isActive}`);
  });

  const weeks = await prisma.scheduleWeek.findMany({
    include: {
      _count: {
        select: { entries: true }
      }
    }
  });
  console.log(`\nTotal schedule weeks in DB: ${weeks.length}`);
  weeks.forEach(w => {
    console.log(`- WeekStartDate: ${w.weekStartDate.toISOString().split('T')[0]}, Team: ${w.team}, Label: ${w.label}, Entries Count: ${w._count.entries}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

