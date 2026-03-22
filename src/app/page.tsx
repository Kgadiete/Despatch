'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import DayToggle from '@/components/DayToggle';
import SearchBar from '@/components/SearchBar';
import TruckCard from '@/components/TruckCard';
import EmptyState from '@/components/EmptyState';
import { useDayNavigation } from '@/hooks/useDayNavigation';
import { getTrucks, getSlipsByTruck } from '@/lib/db';
import { isInDateRange } from '@/lib/date-utils';
import type { LocalTruck, LocalSlip } from '@/types';

interface TruckWithSlips {
  truck: LocalTruck;
  slips: LocalSlip[];
}

export default function Home() {
  const [trucksWithSlips, setTrucksWithSlips] = useState<TruckWithSlips[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { filter, selectedDate, goToPrevDay, goToNextDay, setQuickFilter } = useDayNavigation();

  const loadData = useCallback(async () => {
    const trucks = await getTrucks();
    const withSlips = await Promise.all(
      trucks.map(async (truck) => ({
        truck,
        slips: await getSlipsByTruck(truck.id),
      }))
    );
    setTrucksWithSlips(withSlips);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-load when returning to this page (e.g. after capture)
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  const filtered = useMemo(() => {
    return trucksWithSlips
      .map(({ truck, slips }) => ({
        truck,
        slips: slips.filter((s) => isInDateRange(s.scanned_at, filter)),
      }))
      .filter(({ truck, slips }) => {
        if (slips.length === 0) return false;
        if (search) {
          const q = search.toLowerCase();
          return truck.reg_no.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => b.slips.length - a.slips.length);
  }, [trucksWithSlips, filter, search]);

  const totalSlips = filtered.reduce((sum, t) => sum + t.slips.length, 0);

  return (
    <>
      <Header title="Despatch Tracker" />
      <DayToggle
        filter={filter}
        selectedDate={selectedDate}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onQuickFilter={setQuickFilter}
      />

      <div className="px-4 pt-3 pb-24">
        <SearchBar value={search} onChange={setSearch} />

        {/* Summary line */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-slate-500 mt-3 mb-2">
            {filtered.length} truck{filtered.length !== 1 ? 's' : ''} · {totalSlips} slip{totalSlips !== 1 ? 's' : ''}
          </p>
        )}

        {/* Truck accordion list */}
        <div className="space-y-3 mt-2">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={search ? 'No trucks found' : 'No slips yet'}
              description={
                search
                  ? `No trucks matching "${search}"`
                  : 'Tap the + button to scan your first tyre slip.'
              }
            />
          ) : (
            filtered.map(({ truck, slips }) => (
              <TruckCard
                key={truck.id}
                regNo={truck.reg_no}
                truckId={truck.id}
                slips={slips}
                defaultExpanded={filtered.length === 1}
              />
            ))
          )}
        </div>
      </div>

      {/* FAB — Scan Slip */}
      <Link
        href="/capture"
        className="fixed bottom-24 right-4 z-20 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors active:scale-95"
        aria-label="Scan new slip"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </>
  );
}
