'use client';

import { formatDateLabel, formatDate } from '@/lib/date-utils';
import type { DateFilter } from '@/types';

interface DayToggleProps {
  filter: DateFilter;
  selectedDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onQuickFilter: (f: 'today' | 'week' | 'all') => void;
}

export default function DayToggle({ filter, selectedDate, onPrevDay, onNextDay, onQuickFilter }: DayToggleProps) {
  const isToday = filter === 'today';
  const isWeek = filter === 'week';
  const isAll = filter === 'all';

  const dateLabel = filter === 'today'
    ? `Today (${formatDate(new Date())})`
    : filter === 'week'
      ? 'This Week'
      : filter === 'all'
        ? 'All Time'
        : `${formatDateLabel(selectedDate)} (${formatDate(selectedDate)})`;

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3">
      {/* Day navigator */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onPrevDay}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Previous day"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="text-sm font-medium text-slate-700">{dateLabel}</span>
        <button
          onClick={onNextDay}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Next day"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Quick filter tabs */}
      <div className="flex gap-2">
        {(['today', 'week', 'all'] as const).map((f) => {
          const active = f === 'today' ? isToday : f === 'week' ? isWeek : isAll;
          return (
            <button
              key={f}
              onClick={() => onQuickFilter(f)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'All'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
