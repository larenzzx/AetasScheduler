import type { Employee, ShiftType, ScheduleWeek, ScheduleEntry } from '@prisma/client';

export type { Employee, ShiftType, ScheduleWeek, ScheduleEntry };

export const Team = {
  ALABANG: 'ALABANG',
  ZAMBOANGA: 'ZAMBOANGA',
} as const;

export type Team = typeof Team[keyof typeof Team];

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

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
