'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { validateShiftCoverage } from '@/lib/schedulingValidation';

import { DayOfWeek } from '@prisma/client';

export async function getShiftTypes() {
  return await prisma.shiftType.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });
}

export async function createShiftType(data: {
  name: string;
  startTime: string | null;
  endTime: string | null;
  colorHex: string;
  daysOfWeek?: DayOfWeek[];
  isComposite?: boolean;
  compositeShiftIds?: string[];
  daysMapping?: string[];
}) {
  try {
    // Check for duplicate name
    const existing = await prisma.shiftType.findUnique({
      where: { name: data.name.trim().toUpperCase() },
    });

    if (existing) {
      return { success: false, error: 'A shift type with this name already exists.' };
    }

    // Get current max sortOrder to append to the end
    const maxSort = await prisma.shiftType.aggregate({
      _max: {
        sortOrder: true,
      },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? 0) + 1;

    const shiftType = await prisma.shiftType.create({
      data: {
        name: data.name.trim().toUpperCase(),
        startTime: data.startTime ? data.startTime.trim() : null,
        endTime: data.endTime ? data.endTime.trim() : null,
        colorHex: data.colorHex.trim(),
        sortOrder: nextSortOrder,
        daysOfWeek: data.daysOfWeek,
        isComposite: data.isComposite ?? false,
        compositeShiftIds: data.compositeShiftIds ?? [],
        daysMapping: data.daysMapping ?? [],
      },
    });

    const warnings = await validateShiftCoverage();

    revalidatePath('/shift-types');
    revalidatePath('/schedule');
    revalidatePath('/employees');
    revalidatePath('/');
    return { success: true, shiftType, warnings };
  } catch (error) {
    console.error('Error creating shift type:', error);
    return { success: false, error: 'Failed to create shift type.' };
  }
}

export async function updateShiftType(
  id: string,
  data: {
    name: string;
    startTime: string | null;
    endTime: string | null;
    colorHex: string;
    daysOfWeek?: DayOfWeek[];
    isComposite?: boolean;
    compositeShiftIds?: string[];
    daysMapping?: string[];
  }
) {
  try {
    // Check for duplicate name (excluding itself)
    const existing = await prisma.shiftType.findFirst({
      where: {
        name: data.name.trim().toUpperCase(),
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, error: 'A shift type with this name already exists.' };
    }

    const shiftType = await prisma.shiftType.update({
      where: { id },
      data: {
        name: data.name.trim().toUpperCase(),
        startTime: data.startTime ? data.startTime.trim() : null,
        endTime: data.endTime ? data.endTime.trim() : null,
        colorHex: data.colorHex.trim(),
        daysOfWeek: data.daysOfWeek,
        isComposite: data.isComposite,
        compositeShiftIds: data.compositeShiftIds,
        daysMapping: data.daysMapping,
      },
    });

    const warnings = await validateShiftCoverage();

    revalidatePath('/shift-types');
    revalidatePath('/schedule');
    revalidatePath('/employees');
    revalidatePath('/');
    return { success: true, shiftType, warnings };
  } catch (error) {
    console.error('Error updating shift type:', error);
    return { success: false, error: 'Failed to update shift type.' };
  }
}

export async function deleteShiftType(id: string) {
  try {
    // 1. Check if assigned to any active schedule entries
    const scheduleCount = await prisma.scheduleEntry.count({
      where: {
        shiftTypeId: id,
      },
    });

    if (scheduleCount > 0) {
      return {
        success: false,
        error: `Cannot delete shift type. It is currently assigned to ${scheduleCount} schedule cells.`,
      };
    }

    // 2. Perform deletion
    await prisma.shiftType.delete({
      where: { id },
    });

    const warnings = await validateShiftCoverage();

    revalidatePath('/shift-types');
    revalidatePath('/schedule');
    revalidatePath('/employees');
    revalidatePath('/');
    return { success: true, warnings };
  } catch (error) {
    console.error('Error deleting shift type:', error);
    return { success: false, error: 'Failed to delete shift type.' };
  }
}

export async function updateShiftSortOrders(
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.shiftType.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    revalidatePath('/shift-types');
    revalidatePath('/schedule');
    revalidatePath('/employees');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error updating shift sort orders:', error);
    return { success: false, error: 'Failed to update shift ordering.' };
  }
}

export async function getShiftCoverageWarnings(): Promise<string[]> {
  return await validateShiftCoverage();
}
