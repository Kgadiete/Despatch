'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import DayToggle from '@/components/DayToggle';
import SlipCard from '@/components/SlipCard';
import EmptyState from '@/components/EmptyState';
import { useDayNavigation } from '@/hooks/useDayNavigation';
import { getTruckByReg, getSlipsByTruck, deleteTruck } from '@/lib/db';
import { deleteTruckFromSupabase } from '@/lib/sync';
import { isInDateRange } from '@/lib/date-utils';
import { showToast } from '@/components/Toast';
import type { LocalTruck, LocalSlip } from '@/types';

export default function TruckClient() {
  const searchParams = useSearchParams();
  const regNo = searchParams.get('reg') || '';
  const [truck, setTruck] = useState<LocalTruck | null>(null);
  const [slips, setSlips] = useState<LocalSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const { filter, selectedDate, goToPrevDay, goToNextDay, setQuickFilter } = useDayNavigation();

  const loadData = useCallback(async () => {
    if (!regNo) { setLoading(false); return; }
    const found = await getTruckByReg(regNo);
    if (found) {
      setTruck(found);
      const truckSlips = await getSlipsByTruck(found.id);
      setSlips(truckSlips);
    }
    setLoading(false);
  }, [regNo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  const filtered = useMemo(() => {
    return slips.filter((s) => isInDateRange(s.scanned_at, filter));
  }, [slips, filter]);

  // Group by invoice
  const grouped = useMemo(() => {
    const map = new Map<string, LocalSlip[]>();
    for (const s of filtered) {
      const key = s.invoice_number || 'No Invoice';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function handleDeleteTruck() {
    if (!truck) return;
    const ok = window.confirm(`Delete truck ${regNo} and all its slips? This cannot be undone.`);
    if (!ok) return;
    try {
      if (truck.synced) await deleteTruckFromSupabase(truck.id);
      await deleteTruck(truck.id);
      showToast('Truck deleted', 'success');
      window.history.back();
    } catch {
      showToast('Failed to delete truck', 'error');
    }
  }

  if (loading) {
    return (
      <>
        <Header title={regNo} showBack />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!truck) {
    return (
      <>
        <Header title="Not Found" showBack />
        <EmptyState title="Truck not found" description={`No truck with registration ${regNo}`} />
      </>
    );
  }

  return (
    <>
      <Header
        title={regNo}
        showBack
        actions={
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="More options"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44">
                  <button
                    onClick={() => { setShowMenu(false); handleDeleteTruck(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete truck
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <DayToggle
        filter={filter}
        selectedDate={selectedDate}
        onPrevDay={goToPrevDay}
        onNextDay={goToNextDay}
        onQuickFilter={setQuickFilter}
      />

      <div className="px-4 pt-3 pb-24">
        <p className="text-xs text-slate-500 mb-3">
          {filtered.length} slip{filtered.length !== 1 ? 's' : ''}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            title="No slips"
            description="No tyre slips recorded for this period."
            action={
              <Link
                href={`/capture?reg=${encodeURIComponent(regNo)}`}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
              >
                + Scan Slip
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {grouped.map(([invoice, invoiceSlips]) => (
              <div key={invoice}>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">{invoice}</p>
                <div className="space-y-2">
                  {invoiceSlips.map((slip) => (
                    <SlipCard key={slip.id} slip={slip} regNo={regNo} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB — Scan Slip for this truck */}
      <Link
        href={`/capture?reg=${encodeURIComponent(regNo)}`}
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
