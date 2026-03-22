'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import EmptyState from '@/components/EmptyState';
import { getSlipById, getPhotoBySlipId, deleteSlip } from '@/lib/db';
import { deleteSlipFromSupabase } from '@/lib/sync';
import { formatDate, formatTime } from '@/lib/date-utils';
import { showToast } from '@/components/Toast';
import type { LocalSlip } from '@/types';

export default function SlipClient() {
  const searchParams = useSearchParams();
  const regNo = searchParams.get('reg') || '';
  const slipId = searchParams.get('id') || '';
  const router = useRouter();
  const [slip, setSlip] = useState<LocalSlip | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const loadData = useCallback(async () => {
    if (!slipId) { setLoading(false); return; }
    const found = await getSlipById(slipId);
    if (found) {
      setSlip(found);
      const localPhoto = await getPhotoBySlipId(found.id);
      if (localPhoto) {
        setPhotoUrl(URL.createObjectURL(localPhoto.blob));
      } else if (found.photo_url) {
        setPhotoUrl(found.photo_url);
      }
    }
    setLoading(false);
  }, [slipId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete() {
    if (!slip) return;
    const ok = window.confirm('Delete this slip? This cannot be undone.');
    if (!ok) return;
    try {
      if (slip.synced) await deleteSlipFromSupabase(slip.id);
      await deleteSlip(slip.id);
      showToast('Slip deleted', 'success');
      router.back();
    } catch {
      showToast('Failed to delete slip', 'error');
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Slip Detail" showBack />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!slip) {
    return (
      <>
        <Header title="Not Found" showBack />
        <EmptyState title="Slip not found" description="This slip may have been deleted." />
      </>
    );
  }

  const fields = [
    { label: 'Job #', value: slip.job_number },
    { label: 'CS #', value: slip.cs_number },
    { label: 'Customer', value: slip.customer },
    { label: 'Service Type', value: slip.service_type },
    { label: 'Make', value: slip.tyre_make },
    { label: 'Size', value: slip.tyre_size },
    { label: 'Serial', value: slip.serial },
    { label: 'Invoice', value: slip.invoice_number },
    { label: 'Notes', value: slip.notes },
  ];

  return (
    <>
      <Header
        title={`Job #${slip.job_number}`}
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
                    onClick={() => {
                      setShowMenu(false);
                      router.push(`/slip/edit?reg=${encodeURIComponent(regNo)}&id=${slip.id}`);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Edit slip
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDelete(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete slip
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />

      <div className="px-4 pt-4 pb-24">
        {/* Photo */}
        {photoUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
            <img src={photoUrl} alt="Tyre slip photo" className="w-full" />
          </div>
        )}

        {/* Info */}
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {fields.map(({ label, value }) => (
            value ? (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-medium text-slate-900 text-right max-w-[60%] truncate">{value}</span>
              </div>
            ) : null
          ))}
        </div>

        {/* Metadata */}
        <div className="mt-4 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-500">Truck</span>
            <span className="text-sm font-medium text-slate-900">{regNo}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-500">Scanned</span>
            <span className="text-sm text-slate-700">
              {formatDate(new Date(slip.scanned_at))} at {formatTime(slip.scanned_at)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-500">Sync Status</span>
            <span className={`text-sm font-medium ${slip.synced ? 'text-green-600' : 'text-amber-600'}`}>
              {slip.synced ? '✓ Synced' : '↻ Pending'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
