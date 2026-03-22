'use client';

import { useState } from 'react';
import type { LocalSlip } from '@/types';
import SlipCard from './SlipCard';
import Link from 'next/link';

interface TruckCardProps {
  regNo: string;
  truckId: string;
  slips: LocalSlip[];
  defaultExpanded?: boolean;
}

export default function TruckCard({ regNo, truckId, slips, defaultExpanded = false }: TruckCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const invoices = [...new Set(slips.map(s => s.invoice_number).filter(Boolean))];
  const invoiceLabel = invoices.length > 0 ? invoices.join(', ') : 'No invoice';
  const previewSlips = slips.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header — tap to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-2xl">🚛</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{regNo}</p>
          <p className="text-xs text-slate-500 truncate">
            {slips.length} slip{slips.length !== 1 ? 's' : ''} · {invoiceLabel}
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expandable body */}
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-3 space-y-2">
          {previewSlips.map((slip) => (
            <SlipCard key={slip.id} slip={slip} regNo={regNo} />
          ))}
          {slips.length > 3 && (
            <Link
              href={`/truck?reg=${encodeURIComponent(regNo)}`}
              className="block text-center text-sm font-medium text-amber-600 hover:text-amber-700 py-2"
            >
              View all ({slips.length}) →
            </Link>
          )}
          {slips.length <= 3 && (
            <Link
              href={`/truck?reg=${encodeURIComponent(regNo)}`}
              className="block text-center text-sm font-medium text-slate-500 hover:text-slate-700 py-1"
            >
              Open truck →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
