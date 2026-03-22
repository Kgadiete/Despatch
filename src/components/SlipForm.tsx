'use client';

import type { SlipFormData } from '@/types';
import type { OCRFields, OCRField } from '@/types';

interface SlipFormProps {
  data: SlipFormData;
  ocrFields?: OCRFields | null;
  onChange: (data: SlipFormData) => void;
  duplicateWarning?: boolean;
}

const MAKES = [
  'DOUBLE COIN', 'MICHELIN', 'BRIDGESTONE', 'GOODYEAR', 'CONTINENTAL',
  'DUNLOP', 'FIRESTONE', 'HANKOOK', 'YOKOHAMA', 'KUMHO', 'TOYO',
  'PIRELLI', 'BF GOODRICH', 'TRIANGLE', 'LINGLONG', 'SAILUN',
];

const SERVICE_TYPES = ['Repair', 'New', 'Retread', 'Recap', 'Regrove'];

export default function SlipForm({ data, ocrFields, onChange, duplicateWarning }: SlipFormProps) {
  function update(field: keyof SlipFormData, value: string) {
    onChange({ ...data, [field]: value });
  }

  function wasOcrFilled(field: keyof OCRFields): OCRField | null {
    return ocrFields?.[field] ?? null;
  }

  return (
    <div className="space-y-4">
      {/* Job Number — Required */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Job # <span className="text-red-500">*</span>
          {wasOcrFilled('job_number') && <OcrBadge confidence={wasOcrFilled('job_number')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.job_number}
          onChange={(e) => update('job_number', e.target.value)}
          placeholder="e.g. 89884264"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          required
        />
        {duplicateWarning && (
          <p className="mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            ⚠ This job # already exists on this truck. You can still save.
          </p>
        )}
      </div>

      {/* CS Number */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          CS #
          {wasOcrFilled('cs_number') && <OcrBadge confidence={wasOcrFilled('cs_number')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.cs_number}
          onChange={(e) => update('cs_number', e.target.value)}
          placeholder="e.g. 68209"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Customer */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Customer
          {wasOcrFilled('customer') && <OcrBadge confidence={wasOcrFilled('customer')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.customer}
          onChange={(e) => update('customer', e.target.value)}
          placeholder="e.g. SHOPRITE CHECKERS (PTY) LTD"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Service Type */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Service Type
          {wasOcrFilled('service_type') && <OcrBadge confidence={wasOcrFilled('service_type')!.confidence} />}
        </label>
        <select
          value={data.service_type}
          onChange={(e) => update('service_type', e.target.value)}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="">Select...</option>
          {SERVICE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Make */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Make
          {wasOcrFilled('tyre_make') && <OcrBadge confidence={wasOcrFilled('tyre_make')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.tyre_make}
          onChange={(e) => update('tyre_make', e.target.value)}
          list="makes-list"
          placeholder="e.g. DOUBLE COIN"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <datalist id="makes-list">
          {MAKES.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>

      {/* Size */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Size
          {wasOcrFilled('tyre_size') && <OcrBadge confidence={wasOcrFilled('tyre_size')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.tyre_size}
          onChange={(e) => update('tyre_size', e.target.value)}
          placeholder="e.g. 315/80R22.5"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Serial */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
          Serial
          {wasOcrFilled('serial') && <OcrBadge confidence={wasOcrFilled('serial')!.confidence} />}
        </label>
        <input
          type="text"
          value={data.serial}
          onChange={(e) => update('serial', e.target.value)}
          placeholder="e.g. 21121R2833"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Invoice */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Invoice / IBT #</label>
        <input
          type="text"
          value={data.invoice_number}
          onChange={(e) => update('invoice_number', e.target.value)}
          placeholder="e.g. INV-4521"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Notes</label>
        <textarea
          value={data.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}

function OcrBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${colors[confidence]}`}>
      ✓ OCR
    </span>
  );
}
