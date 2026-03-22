'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import SlipForm from '@/components/SlipForm';
import EmptyState from '@/components/EmptyState';
import { getSlipById, updateSlip, saveDraft, getDraft, deleteDraft } from '@/lib/db';
import { updateSlipInSupabase } from '@/lib/sync';
import { showToast } from '@/components/Toast';
import type { SlipFormData, LocalSlip } from '@/types';

export default function EditClient() {
  const searchParams = useSearchParams();
  const regNo = searchParams.get('reg') || '';
  const slipId = searchParams.get('id') || '';
  const draftId = `edit:${slipId}`;
  const router = useRouter();
  const [slip, setSlip] = useState<LocalSlip | null>(null);
  const [formData, setFormData] = useState<SlipFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      if (!slipId) { setLoading(false); return; }
      const found = await getSlipById(slipId);
      if (!found) { setLoading(false); return; }
      setSlip(found);

      // Check for existing draft first
      const draft = await getDraft(`edit:${slipId}`);
      if (draft) {
        setFormData(draft.form_data);
        showToast('Draft restored', 'success');
      } else {
        setFormData({
          job_number: found.job_number,
          cs_number: found.cs_number || '',
          customer: found.customer || '',
          service_type: found.service_type || '',
          tyre_make: found.tyre_make || '',
          tyre_size: found.tyre_size || '',
          serial: found.serial || '',
          doc_type: (found.doc_type as SlipFormData['doc_type']) || '',
          doc_number: found.doc_number || '',
          invoice_number: found.invoice_number || '',
          notes: found.notes || '',
        });
      }
      setLoading(false);
    }
    load();
  }, [slipId]);

  const scheduleDraftSave = useCallback((data: SlipFormData) => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    setDraftStatus('saving');
    draftTimer.current = setTimeout(async () => {
      await saveDraft({
        id: `edit:${slipId}`,
        reg_no: regNo,
        step: 'form',
        form_data: data,
        updated_at: new Date().toISOString(),
      });
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus('idle'), 3000);
    }, 2000);
  }, [slipId, regNo]);

  const handleFormChange = useCallback((data: SlipFormData) => {
    setFormData(data);
    scheduleDraftSave(data);
  }, [scheduleDraftSave]);

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
        doc_type: formData.doc_type || null,
        doc_number: formData.doc_number.trim() || null,
        invoice_number: formData.doc_number.trim() || formData.invoice_number.trim() || null,
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

      // Clear draft on successful save
      if (draftTimer.current) clearTimeout(draftTimer.current);
      await deleteDraft(draftId);

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
          onChange={handleFormChange}
        />

        {/* Draft status indicator */}
        {draftStatus !== 'idle' && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            {draftStatus === 'saving' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Saving draft...
              </>
            )}
            {draftStatus === 'saved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Draft saved
              </>
            )}
          </div>
        )}

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
