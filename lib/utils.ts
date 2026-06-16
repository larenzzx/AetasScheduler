import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatWeekRange(start: Date, end: Date): string {
  const formatUTC = (date: Date, options: Intl.DateTimeFormatOptions) => {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date);
  };
  
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  
  const monthName = (d: Date) => formatUTC(d, { month: 'long' });
  const dayNum = (d: Date) => formatUTC(d, { day: 'numeric' });
  
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${monthName(start)} ${dayNum(start)} – ${dayNum(end)}, ${startYear}`;
    }
    return `${monthName(start)} ${dayNum(start)} – ${monthName(end)} ${dayNum(end)}, ${startYear}`;
  }
  return `${monthName(start)} ${dayNum(start)}, ${startYear} – ${monthName(end)} ${dayNum(end)}, ${endYear}`;
}

