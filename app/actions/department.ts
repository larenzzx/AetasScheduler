'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDepartments() {
  try {
    let depts = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    if (depts.length === 0) {
      const defaults = ['CYBERSECURITY', 'IT_SUPPORT', 'OPERATIONS', 'GRAPHIC_DESIGN'];
      await prisma.department.createMany({
        data: defaults.map((name) => ({ name })),
      });

      depts = await prisma.department.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return depts;
  } catch (error) {
    console.error('Error fetching departments:', error);
    return [];
  }
}

export async function createDepartment(name: string) {
  try {
    const formattedName = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) {
      return { success: false, error: 'Department name cannot be empty.' };
    }

    // Check for duplicate
    const existing = await prisma.department.findUnique({
      where: { name: formattedName },
    });

    if (existing) {
      return { success: false, error: 'A department with this name already exists.' };
    }

    const department = await prisma.department.create({
      data: { name: formattedName },
    });

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, department };
  } catch (error) {
    console.error('Error creating department:', error);
    return { success: false, error: 'Failed to create department.' };
  }
}

export async function updateDepartment(id: string, name: string) {
  try {
    const formattedName = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!formattedName) {
      return { success: false, error: 'Department name cannot be empty.' };
    }

    // Check for duplicate
    const existing = await prisma.department.findFirst({
      where: {
        name: formattedName,
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, error: 'A department with this name already exists.' };
    }

    // Find the old department to update employees
    const oldDept = await prisma.department.findUnique({
      where: { id },
    });

    if (!oldDept) {
      return { success: false, error: 'Department not found.' };
    }

    // Update in transaction to update affected employees
    const [department] = await prisma.$transaction([
      prisma.department.update({
        where: { id },
        data: { name: formattedName },
      }),
      prisma.employee.updateMany({
        where: { department: oldDept.name },
        data: { department: formattedName },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true, department };
  } catch (error) {
    console.error('Error updating department:', error);
    return { success: false, error: 'Failed to update department.' };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const dept = await prisma.department.findUnique({
      where: { id },
    });

    if (!dept) {
      return { success: false, error: 'Department not found.' };
    }

    // Delete department and update affected employees to 'OPERATIONS' in a transaction
    await prisma.$transaction([
      prisma.department.delete({
        where: { id },
      }),
      prisma.employee.updateMany({
        where: { department: dept.name },
        data: { department: 'OPERATIONS' },
      }),
    ]);

    revalidatePath('/settings');
    revalidatePath('/employees');
    revalidatePath('/schedule');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error deleting department:', error);
    return { success: false, error: 'Failed to delete department.' };
  }
}
