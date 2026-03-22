'use client';

import { useState, useCallback } from 'react';
import type { DateFilter } from '@/types';
import { addDays, getStartOfDay } from '@/lib/date-utils';

export function useDayNavigation() {
  const [filter, setFilter] = useState<DateFilter>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(getStartOfDay(new Date()));

  const goToPrevDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = addDays(prev, -1);
      setFilter(newDate);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = addDays(prev, 1);
      const today = getStartOfDay(new Date());
      // Don't go beyond today
      if (newDate > today) return prev;
      setFilter(newDate);
      return newDate;
    });
  }, []);

  const setQuickFilter = useCallback((f: 'today' | 'week' | 'all') => {
    setFilter(f);
    if (f === 'today') setSelectedDate(getStartOfDay(new Date()));
  }, []);

  return {
    filter,
    selectedDate,
    goToPrevDay,
    goToNextDay,
    setQuickFilter,
  };
}
