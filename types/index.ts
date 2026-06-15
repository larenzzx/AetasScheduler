import { Employee, ShiftType, ScheduleWeek, ScheduleEntry, DayOfWeek, Team } from '@prisma/client';

export type { Employee, ShiftType, ScheduleWeek, ScheduleEntry };
export { Team, DayOfWeek };

export interface ScheduleEntryInput {
  employeeId: string;
  dayOfWeek: DayOfWeek;
  shiftTypeId: string | null; // null = DAY-OFF
}

export interface ScheduleGridRow {
  employee: Employee;
  entries: Record<DayOfWeek, {
    id: string | null; // ScheduleEntry ID if it exists in the database
    shiftTypeId: string | null; // null = DAY-OFF
  }>;
}

export interface ScheduleDataResponse {
  week: ScheduleWeek | null;
  employees: Employee[];
  shiftTypes: ShiftType[];
  rows: ScheduleGridRow[];
}
