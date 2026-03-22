'use client';

import Link from 'next/link';
import type { LocalSlip } from '@/types';
import { formatTime } from '@/lib/date-utils';

interface SlipCardProps {
  slip: LocalSlip;
  regNo: string;
}

export default function SlipCard({ slip, regNo }: SlipCardProps) {
  const makeSize = [slip.tyre_make, slip.tyre_size].filter(Boolean).join(' ') || 'Unknown tyre';

  return (
    <Link
      href={`/slip?reg=${encodeURIComponent(regNo)}&id=${slip.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
    >
      {/* Photo indicator */}
      <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
        {slip.photo_url ? (
          <img
            src={slip.photo_url}
            alt="Slip"
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm">Job #{slip.job_number}</p>
        <p className="text-xs text-slate-500 truncate">{makeSize}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-slate-400">{formatTime(slip.scanned_at)}</span>
        {slip.synced ? (
          <span className="text-green-500" title="Synced">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </span>
        ) : (
          <span className="text-amber-500 animate-pulse" title="Pending sync">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </span>
        )}
      </div>
    </Link>
  );
}
