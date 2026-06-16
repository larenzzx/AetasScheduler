'use server';

import { prisma } from '@/lib/prisma';
import { Team } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getEmployees() {
  return await prisma.employee.findMany({
    orderBy: [
      { isActive: 'desc' },
      { name: 'asc' },
    ],
  });
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
}) {
  try {
    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        employeeId: data.employeeId,
        team: data.team,
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
