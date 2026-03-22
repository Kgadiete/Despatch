'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { getTrucks, getAllSlips, getSlipsByTruck } from '@/lib/db';
import { exportCSV, exportPDF } from '@/lib/export';
import { showToast } from '@/components/Toast';
import type { LocalTruck, LocalSlip } from '@/types';

export default function ExportPage() {
  const [trucks, setTrucks] = useState<LocalTruck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getTrucks().then(setTrucks);
  }, []);

  const getFilteredSlips = useCallback(async (): Promise<{ slips: LocalSlip[]; trucks: LocalTruck[] }> => {
    let slips: LocalSlip[];
    let relevantTrucks: LocalTruck[];

    if (selectedTruck === 'all') {
      slips = await getAllSlips();
      relevantTrucks = trucks;
    } else {
      slips = await getSlipsByTruck(selectedTruck);
      relevantTrucks = trucks.filter(t => t.id === selectedTruck);
    }

    // Apply date filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      slips = slips.filter(s => new Date(s.scanned_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      slips = slips.filter(s => new Date(s.scanned_at) <= to);
    }

    return { slips, trucks: relevantTrucks };
  }, [selectedTruck, dateFrom, dateTo, trucks]);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const { slips, trucks: relevantTrucks } = await getFilteredSlips();
      if (slips.length === 0) {
        showToast('No slips to export', 'error');
        return;
      }
      exportCSV({ slips, trucks: relevantTrucks });
      showToast(`Exported ${slips.length} slips as CSV`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPDF() {
    setExporting(true);
    try {
      const { slips, trucks: relevantTrucks } = await getFilteredSlips();
      if (slips.length === 0) {
        showToast('No slips to export', 'error');
        return;
      }
      exportPDF({ slips, trucks: relevantTrucks });
      showToast(`Exported ${slips.length} slips as PDF`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  // Set default dateFrom to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  }, []);

  return (
    <>
      <Header title="Export" />

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Truck filter */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">Truck</label>
          <select
            value={selectedTruck}
            onChange={(e) => setSelectedTruck(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Trucks</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.reg_no}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            PDF
          </button>
        </div>
      </div>
    </>
  );
}
