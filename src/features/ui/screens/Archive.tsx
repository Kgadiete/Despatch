import { useEffect, useState } from 'react';
import * as storage from '../../../lib/storage';
import {
  groupEntriesByArchive,
  formatMonthLabel,
  formatWeekLabel,
  dayLabel,
} from '../../../lib/archive';
import type { DayArchive, MonthArchive, WeekArchive, YearArchive } from '../../../lib/types/index';
import EntryCard from '../components/EntryCard';
import { useDiaryStore } from '../../../lib/store';

type Level = 'years' | 'months' | 'weeks' | 'days' | 'entries';

interface ArchiveProps {
  onBack: () => void;
}

const Archive = ({ onBack }: ArchiveProps) => {
  const { setCurrentDate, loadEntries } = useDiaryStore();
  const [archive, setArchive] = useState<YearArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<Level>('years');
  const [selectedYear, setSelectedYear] = useState<YearArchive | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthArchive | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekArchive | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayArchive | null>(null);

  useEffect(() => {
    void storage.getAllEntries().then((entries) => {
      setArchive(groupEntriesByArchive(entries));
      setLoading(false);
    });
  }, []);

  const handleBack = () => {
    switch (level) {
      case 'years':
        onBack();
        break;
      case 'months':
        setLevel('years');
        setSelectedYear(null);
        break;
      case 'weeks':
        setLevel('months');
        setSelectedMonth(null);
        break;
      case 'days':
        setLevel('weeks');
        setSelectedWeek(null);
        break;
      case 'entries':
        setLevel('days');
        setSelectedDay(null);
        break;
    }
  };

  const openDayOnHome = async (date: string) => {
    setCurrentDate(date);
    await loadEntries(date);
    onBack();
  };

  if (loading) {
    return <p className="text-gray-400 p-4">Loading archive…</p>;
  }

  if (archive.length === 0) {
    return (
      <div className="p-4">
        <button type="button" onClick={onBack} className="btn-secondary mb-4">
          ← Back
        </button>
        <p className="text-gray-400">No archived entries yet.</p>
      </div>
    );
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <div className="flex flex-col h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={handleBack} className="btn-secondary text-sm">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-amber-400">Archive</h2>
      </div>

      {level === 'years' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              const y = archive.find((a) => a.year === currentYear);
              if (y) {
                setSelectedYear(y);
                const m = y.months.find((mo) => mo.month === currentMonth);
                if (m) {
                  setSelectedMonth(m);
                  setLevel('weeks');
                } else {
                  setLevel('months');
                }
              }
            }}
            className="card w-full text-left text-amber-300 mb-2"
          >
            Jump to this month
          </button>
          {archive.map((y) => (
            <button
              key={y.year}
              type="button"
              onClick={() => {
                setSelectedYear(y);
                setLevel('months');
              }}
              className="card w-full text-left hover:bg-slate-700"
            >
              <span className="text-lg font-bold">{y.year}</span>
              <span className="text-gray-400 text-sm ml-2">
                {y.months.length} month{y.months.length !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {level === 'months' && selectedYear && (
        <div className="space-y-2">
          {selectedYear.months.map((m) => (
            <button
              key={`${m.year}-${m.month}`}
              type="button"
              onClick={() => {
                setSelectedMonth(m);
                setLevel('weeks');
              }}
              className="card w-full text-left hover:bg-slate-700"
            >
              {formatMonthLabel(m.month, m.year)}
            </button>
          ))}
        </div>
      )}

      {level === 'weeks' && selectedMonth && (
        <div className="space-y-2">
          {selectedMonth.weeks.map((w) => (
            <button
              key={w.weekNumber}
              type="button"
              onClick={() => {
                setSelectedWeek(w);
                setLevel('days');
              }}
              className="card w-full text-left hover:bg-slate-700"
            >
              {formatWeekLabel(w.weekNumber, selectedMonth.month)}
            </button>
          ))}
        </div>
      )}

      {level === 'days' && selectedWeek && (
        <div className="space-y-2">
          {selectedWeek.days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => {
                setSelectedDay(d);
                setLevel('entries');
              }}
              className="card w-full text-left hover:bg-slate-700"
            >
              {dayLabel(d.date, d.entries.length)}
            </button>
          ))}
        </div>
      )}

      {level === 'entries' && selectedDay && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void openDayOnHome(selectedDay.date)}
            className="btn-primary w-full"
          >
            Open {selectedDay.date} on home
          </button>
          {selectedDay.entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Archive;
