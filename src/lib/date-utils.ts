/** Date utilities for day-based navigation */
import type { DateFilter } from '@/types';

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLabel(date: Date): string {
  const today = getStartOfDay(new Date());
  const target = getStartOfDay(date);

  if (target.getTime() === today.getTime()) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function isInDateRange(scannedAt: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;

  const date = new Date(scannedAt);
  const now = new Date();

  if (filter === 'today') {
    return date >= getStartOfDay(now) && date <= getEndOfDay(now);
  }

  if (filter === 'week') {
    return date >= getStartOfWeek(now) && date <= getEndOfDay(now);
  }

  // Specific date
  return date >= getStartOfDay(filter) && date <= getEndOfDay(filter);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
