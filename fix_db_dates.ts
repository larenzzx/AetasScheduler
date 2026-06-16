import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Fetching schedule weeks...');
  const weeks = await prisma.scheduleWeek.findMany();
  
  for (const week of weeks) {
    console.log(`\nChecking week ID: ${week.id}, Team: ${week.team}, Current Start: ${week.weekStartDate.toISOString()}, Label: ${week.label}`);
    
    // Convert current UTC date to Manila timezone (where the entries were originally created)
    const options = { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formatted = formatter.format(week.weekStartDate); // e.g. "06/15/2026"
    
    const [month, day, year] = formatted.split('/');
    const localDateStr = `${year}-${month}-${day}`;
    console.log(`-> Equivalent Manila Date: ${localDateStr}`);
    
    // Create new timezone-independent UTC timestamps
    const newStart = new Date(`${localDateStr}T00:00:00.000Z`);
    const newEnd = new Date(`${localDateStr}T23:59:59.999Z`);
    newEnd.setUTCDate(newEnd.getUTCDate() + 6);
    
    console.log(`-> Target Start UTC: ${newStart.toISOString()}`);
    console.log(`-> Target End UTC:   ${newEnd.toISOString()}`);
    
    if (week.weekStartDate.toISOString() !== newStart.toISOString() || week.weekEndDate.toISOString() !== newEnd.toISOString()) {
      try {
        // Check if there is an existing week with this newStart date to avoid unique constraint collisions
        const existingWeek = await prisma.scheduleWeek.findUnique({
          where: {
            weekStartDate_team: {
              weekStartDate: newStart,
              team: week.team
            }
          }
        });
        
        if (existingWeek) {
          console.log(`Warning: A week with date ${newStart.toISOString()} and team ${week.team} already exists. We will merge them.`);
          // Merge entries from this week to the existing week
          const entries = await prisma.scheduleEntry.findMany({
            where: { scheduleWeekId: week.id }
          });
          console.log(`Found ${entries.length} entries in week ${week.id} to migrate.`);
          
          for (const entry of entries) {
            await prisma.scheduleEntry.upsert({
              where: {
                employeeId_scheduleWeekId_dayOfWeek: {
                  employeeId: entry.employeeId,
                  scheduleWeekId: existingWeek.id,
                  dayOfWeek: entry.dayOfWeek
                }
              },
              update: {
                shiftTypeId: entry.shiftTypeId
              },
              create: {
                employeeId: entry.employeeId,
                scheduleWeekId: existingWeek.id,
                dayOfWeek: entry.dayOfWeek,
                shiftTypeId: entry.shiftTypeId
              }
            });
          }
          
          // Delete the old week
          await prisma.scheduleWeek.delete({
            where: { id: week.id }
          });
          console.log(`Merged and deleted week ${week.id}.`);
        } else {
          await prisma.scheduleWeek.update({
            where: { id: week.id },
            data: {
              weekStartDate: newStart,
              weekEndDate: newEnd
            }
          });
          console.log(`Successfully updated week ${week.id} to new dates.`);
        }
      } catch (err) {
        console.error(`Failed to update/merge week ${week.id}:`, err);
      }
    } else {
      console.log(`Week ${week.id} is already correct.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
