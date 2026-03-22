'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import SlipForm from '@/components/SlipForm';
import EmptyState from '@/components/EmptyState';
import { getSlipById, updateSlip } from '@/lib/db';
import { updateSlipInSupabase } from '@/lib/sync';
import { showToast } from '@/components/Toast';
import type { SlipFormData, LocalSlip } from '@/types';

export default function EditClient() {
  const searchParams = useSearchParams();
  const regNo = searchParams.get('reg') || '';
  const slipId = searchParams.get('id') || '';
  const router = useRouter();
  const [slip, setSlip] = useState<LocalSlip | null>(null);
  const [formData, setFormData] = useState<SlipFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slipId) { setLoading(false); return; }
      const found = await getSlipById(slipId);
      if (found) {
        setSlip(found);
        setFormData({
          job_number: found.job_number,
          cs_number: found.cs_number || '',
          customer: found.customer || '',
          service_type: found.service_type || '',
          tyre_make: found.tyre_make || '',
          tyre_size: found.tyre_size || '',
          serial: found.serial || '',
          invoice_number: found.invoice_number || '',
          notes: found.notes || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [slipId]);

  const handleSave = useCallback(async () => {
    if (!slip || !formData) return;
    if (!formData.job_number.trim()) {
      showToast('Job # is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const changes = {
        job_number: formData.job_number.trim(),
        cs_number: formData.cs_number.trim() || null,
        customer: formData.customer.trim() || null,
        service_type: formData.service_type || null,
        tyre_make: formData.tyre_make.trim() || null,
        tyre_size: formData.tyre_size.trim() || null,
        serial: formData.serial.trim() || null,
        invoice_number: formData.invoice_number.trim() || null,
        notes: formData.notes.trim() || null,
        synced: false,
      };
      await updateSlip(slip.id, changes);

      if (slip.synced) {
        try {
          await updateSlipInSupabase(slip.id, changes);
          await updateSlip(slip.id, { synced: true });
        } catch {
          // Will sync later
        }
      }

      showToast('Slip updated!', 'success');
      router.back();
    } catch {
      showToast('Failed to update slip', 'error');
    } finally {
      setSaving(false);
    }
  }, [slip, formData, router]);

  if (loading) {
    return (
      <>
        <Header title="Edit Slip" showBack />
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!slip || !formData) {
    return (
      <>
        <Header title="Not Found" showBack />
        <EmptyState title="Slip not found" description="This slip may have been deleted." />
      </>
    );
  }

  return (
    <>
      <Header title={`Edit Job #${slip.job_number}`} showBack />

      <div className="px-4 pt-4 pb-24">
        <p className="text-sm text-slate-600 mb-4">
          Truck: <span className="font-semibold">{regNo}</span>
        </p>

        <SlipForm
          data={formData}
          onChange={setFormData}
        />

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.job_number.trim()}
            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}
