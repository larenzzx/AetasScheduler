'use server';

import { prisma } from '@/lib/prisma';
import { Team } from '@/types';
import { Gender } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
  const emps = await prisma.employee.findMany({
    include: {
      mentor: true,
      mentees: true,
    },
  });
  return emps.sort((a, b) => (parseInt(a.employeeId, 10) || 0) - (parseInt(b.employeeId, 10) || 0));
}

export async function getActiveShiftTypes() {
  return await prisma.shiftType.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });
}

export async function createEmployee(data: {
  name: string;
  employeeId: string;
  team: Team;
  gender?: Gender;
  employmentType?: string;
  environmentAccess?: string[];
  requiresMentor?: boolean;
  isFixedSchedule?: boolean;
  mentorId?: string | null;
  currentShiftTypeId?: string | null;
}) {
  try {
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        employeeId: data.employeeId,
        team: data.team,
        gender: data.gender ?? 'MALE',
        employmentType: data.employmentType ?? 'SOC_OPERATIONS',
        environmentAccess: data.environmentAccess ?? [],
        requiresMentor: data.requiresMentor ?? false,
        isFixedSchedule: data.isFixedSchedule ?? false,
        mentorId: data.mentorId ?? null,
        currentShiftTypeId: data.currentShiftTypeId ?? null,
        isActive: true,
      },
    });
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, employee };
  } catch (error: unknown) {
    console.error('Error creating employee:', error);
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return { success: false, error: 'Employee ID already exists.' };
    }
    return { success: false, error: 'Failed to create employee.' };
  }
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    employeeId: string;
    team: Team;
    isActive: boolean;
    gender?: Gender;
    employmentType?: string;
    environmentAccess?: string[];
    requiresMentor?: boolean;
    isFixedSchedule?: boolean;
    mentorId?: string | null;
    currentShiftTypeId?: string | null;
  }
) {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        employeeId: data.employeeId,
        team: data.team,
        isActive: data.isActive,
        gender: data.gender,
        employmentType: data.employmentType,
        environmentAccess: data.environmentAccess,
        requiresMentor: data.requiresMentor,
        isFixedSchedule: data.isFixedSchedule,
        mentorId: data.mentorId,
        currentShiftTypeId: data.currentShiftTypeId,
      },
    });
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, employee };
  } catch (error: unknown) {
    console.error('Error updating employee:', error);
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return { success: false, error: 'Employee ID already exists.' };
    }
    return { success: false, error: 'Failed to update employee.' };
  }
}

export async function toggleEmployeeStatus(id: string, isActive: boolean) {
  try {
    const employee = await prisma.employee.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, employee };
  } catch (error) {
    console.error('Error toggling employee status:', error);
    return { success: false, error: 'Failed to toggle employee status.' };
  }
}
