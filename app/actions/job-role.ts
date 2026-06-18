'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getJobRoles() {
  try {
    return await prisma.jobRole.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching job roles:', error);
    return [];
  }
}

export async function createJobRole(name: string) {
  try {
    const formattedName = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) {
      return { success: false, error: 'Job role name cannot be empty.' };
    }

    // Check for duplicate
    const existing = await prisma.jobRole.findUnique({
      where: { name: formattedName },
    });

    if (existing) {
      return { success: false, error: 'A job role with this name already exists.' };
    }

    const jobRole = await prisma.jobRole.create({
      data: { name: formattedName },
    });

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, jobRole };
  } catch (error) {
    console.error('Error creating job role:', error);
    return { success: false, error: 'Failed to create job role.' };
  }
}

export async function updateJobRole(id: string, name: string) {
  try {
    const formattedName = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) {
      return { success: false, error: 'Job role name cannot be empty.' };
    }

    // Check for duplicate
    const existing = await prisma.jobRole.findFirst({
      where: {
        name: formattedName,
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, error: 'A job role with this name already exists.' };
    }

    // Find the old role to update employees
    const oldRole = await prisma.jobRole.findUnique({
      where: { id },
    });

    if (!oldRole) {
      return { success: false, error: 'Job role not found.' };
    }

    // Update in transaction to update affected employees
    const [jobRole] = await prisma.$transaction([
      prisma.jobRole.update({
        where: { id },
        data: { name: formattedName },
      }),
      prisma.employee.updateMany({
        where: { employmentType: oldRole.name },
        data: { employmentType: formattedName },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, jobRole };
  } catch (error) {
    console.error('Error updating job role:', error);
    return { success: false, error: 'Failed to update job role.' };
  }
}

export async function deleteJobRole(id: string) {
  try {
    const role = await prisma.jobRole.findUnique({
      where: { id },
    });

    if (!role) {
      return { success: false, error: 'Job role not found.' };
    }

    // Delete role and update affected employees to 'OTHER' in a transaction
    await prisma.$transaction([
      prisma.jobRole.delete({
        where: { id },
      }),
      prisma.employee.updateMany({
        where: { employmentType: role.name },
        data: { employmentType: 'OTHER' },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting job role:', error);
    return { success: false, error: 'Failed to delete job role.' };
  }
}
