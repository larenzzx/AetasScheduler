import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isSameMonth, isSameYear } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeekRange(start: Date, end: Date): string {
  if (isSameYear(start, end)) {
    if (isSameMonth(start, end)) {
      return `${format(start, 'MMMM d')} – ${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`;
  }
  return `${format(start, 'MMMM d, yyyy')} – ${format(end, 'MMMM d, yyyy')}`;
}
