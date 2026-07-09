import type {
  DayArchive,
  Entry,
  MonthArchive,
  WeekArchive,
  YearArchive,
} from './types/index';

function dateKey(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-GB', { month: 'long' });
}

function dayLabel(dateStr: string, count: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const day = d.getDate();
  return `${weekday} ${day} · ${count} ${count === 1 ? 'entry' : 'entries'}`;
}

export function groupEntriesByArchive(entries: Entry[]): YearArchive[] {
  const byYear = new Map<number, Entry[]>();

  for (const entry of entries) {
    const year = new Date(entry.createdAt).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(entry);
  }

  const years: YearArchive[] = [];

  for (const year of [...byYear.keys()].sort((a, b) => b - a)) {
    const yearEntries = byYear.get(year)!;
    const byMonth = new Map<number, Entry[]>();

    for (const entry of yearEntries) {
      const month = new Date(entry.createdAt).getMonth() + 1;
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(entry);
    }

    const months: MonthArchive[] = [];

    for (const month of [...byMonth.keys()].sort((a, b) => b - a)) {
      const monthEntries = byMonth.get(month)!;
      const byWeek = new Map<number, Entry[]>();

      for (const entry of monthEntries) {
        const week = getISOWeek(new Date(entry.createdAt));
        if (!byWeek.has(week)) byWeek.set(week, []);
        byWeek.get(week)!.push(entry);
      }

      const weeks: WeekArchive[] = [];

      for (const weekNumber of [...byWeek.keys()].sort((a, b) => b - a)) {
        const weekEntries = byWeek.get(weekNumber)!;
        const byDay = new Map<string, Entry[]>();

        for (const entry of weekEntries) {
          const key = dateKey(entry.createdAt);
          if (!byDay.has(key)) byDay.set(key, []);
          byDay.get(key)!.push(entry);
        }

        const days: DayArchive[] = [...byDay.keys()]
          .sort((a, b) => b.localeCompare(a))
          .map((date) => ({
            date,
            entries: byDay.get(date)!.sort((a, b) => b.createdAt - a.createdAt),
          }));

        weeks.push({ weekNumber, year, days });
      }

      months.push({ month, year, weeks });
    }

    years.push({ year, months });
  }

  return years;
}

export function formatMonthLabel(month: number, year: number): string {
  return `${monthName(month)} ${year}`;
}

export function formatWeekLabel(weekNumber: number, month: number): string {
  return `Week ${weekNumber} · ${monthName(month)}`;
}

export { monthName, dayLabel, getISOWeek };
