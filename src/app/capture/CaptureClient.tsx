'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import Header from '@/components/layout/Header';
import CameraCapture from '@/components/CameraCapture';
import SlipForm from '@/components/SlipForm';
import { compressImage } from '@/lib/image';
import { recognizeSlip } from '@/lib/ocr';
import { addTruck, getTruckByReg, addSlip, addPhoto, checkDuplicateJob } from '@/lib/db';
import { showToast } from '@/components/Toast';
import type { SlipFormData, OCRFields } from '@/types';

type Step = 'truck' | 'photo' | 'ocr' | 'form';

const EMPTY_FORM: SlipFormData = {
  job_number: '', cs_number: '', customer: '', service_type: '',
  tyre_make: '', tyre_size: '', serial: '', invoice_number: '', notes: '',
};

export default function CaptureClient() {
  const searchParams = useSearchParams();
  const prefilledReg = searchParams.get('reg') || '';
  const router = useRouter();

  const [step, setStep] = useState<Step>(prefilledReg ? 'photo' : 'truck');
  const [regNo, setRegNo] = useState(prefilledReg);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [ocrFields, setOcrFields] = useState<OCRFields | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [formData, setFormData] = useState<SlipFormData>(EMPTY_FORM);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTruckSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = regNo.trim().toUpperCase();
    if (!trimmed) return;
    setRegNo(trimmed);
    setStep('photo');
  }, [regNo]);

  const handleCapture = useCallback(async (blob: Blob) => {
    const compressed = await compressImage(blob);
    setPhotoBlob(compressed);
    setPhotoUrl(URL.createObjectURL(compressed));
    setStep('ocr');

    try {
      const result = await recognizeSlip(compressed, setOcrProgress);
      const fields = result.fields;
      setOcrFields(fields);
      setFormData({
        job_number: fields.job_number?.value || '',
        cs_number: fields.cs_number?.value || '',
        customer: fields.customer?.value || '',
        service_type: fields.service_type?.value || '',
        tyre_make: fields.tyre_make?.value || '',
        tyre_size: fields.tyre_size?.value || '',
        serial: fields.serial?.value || '',
        invoice_number: '',
        notes: '',
      });
    } catch (err) {
      console.error('OCR failed:', err);
      showToast('OCR failed — fill in manually', 'error');
    }
    setStep('form');
  }, []);

  const handleFormChange = useCallback(async (data: SlipFormData) => {
    setFormData(data);
    if (data.job_number) {
      const existing = await getTruckByReg(regNo);
      if (existing) {
        const dup = await checkDuplicateJob(existing.id, data.job_number);
        setDuplicateWarning(dup);
      }
    } else {
      setDuplicateWarning(false);
    }
  }, [regNo]);

  const handleSave = useCallback(async () => {
    if (!formData.job_number.trim()) {
      showToast('Job # is required', 'error');
      return;
    }
    setSaving(true);
    try {
      let truck = await getTruckByReg(regNo);
      if (!truck) {
        const truckId = uuid();
        truck = {
          id: truckId,
          reg_no: regNo,
          created_at: new Date().toISOString(),
          synced: false,
        };
        await addTruck(truck);
      }

      const slipId = uuid();
      const now = new Date().toISOString();
      await addSlip({
        id: slipId,
        truck_id: truck.id,
        job_number: formData.job_number.trim(),
        cs_number: formData.cs_number.trim() || null,
        customer: formData.customer.trim() || null,
        service_type: formData.service_type || null,
        tyre_make: formData.tyre_make.trim() || null,
        tyre_size: formData.tyre_size.trim() || null,
        serial: formData.serial.trim() || null,
        photo_url: null,
        invoice_number: formData.invoice_number.trim() || null,
        notes: formData.notes.trim() || null,
        scanned_at: now,
        created_at: now,
        updated_at: now,
        synced: false,
      });

      if (photoBlob) {
        await addPhoto({ id: uuid(), slip_id: slipId, blob: photoBlob });
      }

      showToast('Slip saved!', 'success');
      router.push(`/truck?reg=${encodeURIComponent(regNo)}`);
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save slip', 'error');
    } finally {
      setSaving(false);
    }
  }, [formData, regNo, photoBlob, router]);

  const stepLabels = prefilledReg ? ['Photo', 'OCR', 'Review'] : ['Truck', 'Photo', 'OCR', 'Review'];
  const stepsAll: Step[] = prefilledReg ? ['photo', 'ocr', 'form'] : ['truck', 'photo', 'ocr', 'form'];
  const currentIdx = stepsAll.indexOf(step);

  return (
    <>
      <Header title={regNo ? `${regNo} — Scan` : 'Scan Slip'} showBack />

      <div className="px-4 pt-4 pb-24">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => {
            const isComplete = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isComplete ? 'bg-green-500 text-white'
                      : isCurrent ? 'bg-[#1e3a5f] text-white'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isComplete ? '✓' : i + 1}
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step: Truck Registration */}
        {step === 'truck' && (
          <form onSubmit={handleTruckSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Truck Registration Number
              </label>
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                placeholder="e.g. ABC 123 GP"
                className="w-full px-3 py-3 bg-white border border-slate-300 rounded-lg text-lg font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-medium hover:bg-[#162d4a] transition-colors"
            >
              Next →
            </button>
          </form>
        )}

        {/* Step: Photo Capture */}
        {step === 'photo' && (
          <div>
            <p className="text-sm text-slate-600 mb-2">
              Truck: <span className="font-semibold">{regNo}</span>
            </p>
            <CameraCapture onCapture={handleCapture} />
          </div>
        )}

        {/* Step: OCR Processing */}
        {step === 'ocr' && (
          <div className="flex flex-col items-center py-12">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-[#1e3a5f] rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-700 mb-2">Reading slip text...</p>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.round(ocrProgress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{Math.round(ocrProgress * 100)}%</p>
          </div>
        )}

        {/* Step: Review Form */}
        {step === 'form' && (
          <div>
            {photoUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                <img src={photoUrl} alt="Captured slip" className="w-full max-h-48 object-cover" />
              </div>
            )}

            <p className="text-sm text-slate-600 mb-3">
              Truck: <span className="font-semibold">{regNo}</span>
            </p>

            <SlipForm
              data={formData}
              ocrFields={ocrFields}
              onChange={handleFormChange}
              duplicateWarning={duplicateWarning}
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('photo')}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Retake Photo
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.job_number.trim()}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Slip'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
