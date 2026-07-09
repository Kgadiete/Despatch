import { useState } from 'react';
import type { FormEvent } from 'react';

type DocType = 'IBT' | 'DIBT' | 'INV';

interface IbtLineItem {
  description: string;
  rcs_code: string;
  size_id: number;
  rubber_id: number;
  total: number;
}

interface SlipItem {
  slip_number: number;
  make: string;
  pattern: string;
  size: string;
  loaded: number;
  previous_reg: string;
  scan_time: string;
  serial: string;
  uid: string;
}

interface DocumentPayload {
  inv: {
    customerCode: string | null;
    customerName: string | null;
    total: number | null;
    slips: SlipItem[] | null;
  } | null;
  dibt: {
    customerCode: string | null;
    customerName: string | null;
    total: number | null;
    slips: SlipItem[] | null;
  } | null;
  ibt: IbtLineItem[] | null;
}

interface GraphQlResponse {
  data?: {
    getDeliveryInfo?: DocumentPayload | null;
  };
  errors?: Array<{ message?: string; errorType?: string }>;
}

interface LookupResponse {
  command: string[];
  returncode: number;
  stdout: string;
  stderr: string;
  graphql?: GraphQlResponse | null;
  request?: {
    type: DocType;
    value: string;
  };
}

interface DocumentsProps {
  onBack: () => void;
}

const DOC_PREFIX: Record<DocType, string> = {
  IBT: 'IBT',
  DIBT: 'DIBT',
  INV: 'INV',
};

const DOC_NUMBER_PLACEHOLDER: Record<DocType, string> = {
  IBT: '116450',
  DIBT: '0174078',
  INV: '118117',
};

const ENDPOINT_STORAGE_KEY = 'despatch.lookupEndpoint';

function toSuffix(type: DocType, raw: string): string {
  const upper = raw.toUpperCase().trim();
  const prefix = DOC_PREFIX[type];
  if (upper.startsWith(prefix)) {
    return upper.slice(prefix.length).trim();
  }
  return upper;
}

function toRequestValue(type: DocType, suffix: string): string {
  if (type === 'INV') return suffix;
  return `${DOC_PREFIX[type]}${suffix}`;
}

function defaultEndpoint(): string {
  return '/api/document-lookup';
}

const Documents = ({ onBack }: DocumentsProps) => {
  const [docType, setDocType] = useState<DocType>('IBT');
  const [docNumber, setDocNumber] = useState('');
  const [invFallback, setInvFallback] = useState('');
  const [dibtFallback, setDibtFallback] = useState('');
  const [amsInvFallback, setAmsInvFallback] = useState('');
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem(ENDPOINT_STORAGE_KEY) || defaultEndpoint());
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Enter a document number to fetch tyres.');
  const [result, setResult] = useState<LookupResponse | null>(null);

  const graphQl = result?.graphql ?? null;
  const payload = graphQl?.data?.getDeliveryInfo ?? null;
  const errors = graphQl?.errors ?? [];
  const ibtItems = payload?.ibt ?? [];
  const invDoc = payload?.inv ?? null;
  const dibtDoc = payload?.dibt ?? null;
  const invSlips = invDoc?.slips ?? [];
  const dibtSlips = dibtDoc?.slips ?? [];

  const totalTyres = ibtItems.reduce((sum, i) => sum + (i.total || 0), 0);

  const saveEndpoint = () => {
    localStorage.setItem(ENDPOINT_STORAGE_KEY, endpoint.trim() || defaultEndpoint());
    setStatusText('Lookup endpoint saved.');
  };

  const doLookup = async (e: FormEvent) => {
    e.preventDefault();

    const suffix = toSuffix(docType, docNumber);
    if (!suffix) {
      setStatusText('Enter a document number first.');
      return;
    }

    const value = toRequestValue(docType, suffix);
    setLoading(true);
    setStatusText(`Fetching ${DOC_PREFIX[docType]}${suffix} ...`);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const abort = new AbortController();
      timer = setTimeout(() => abort.abort(), 65000);

      const res = await fetch(endpoint.trim() || defaultEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          type: docType,
          value,
          inv: invFallback.trim(),
          dibt: dibtFallback.trim(),
          amsInv: amsInvFallback.trim(),
          forceLogin: false,
        }),
      });

      const json = (await res.json()) as LookupResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Lookup request failed.');
      }

      setResult(json);
      setStatusText(`Loaded ${DOC_PREFIX[docType]}${suffix}.`);
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Lookup timed out. Check backend connectivity and retry.'
          : error instanceof Error
          ? error.message
          : 'Lookup failed.';
      setStatusText(message);
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={onBack} className="btn-secondary text-sm">
          ← Home
        </button>
        <h2 className="text-xl font-bold text-amber-400">Documents</h2>
      </div>

      <section className="card mb-4">
        <h3 className="font-semibold mb-3 text-gray-200">Lookup document tyres</h3>

        <form onSubmit={doLookup} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['IBT', 'DIBT', 'INV'] as DocType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDocType(t)}
                className={`text-sm py-2 px-3 rounded-lg font-semibold ${
                  docType === t ? 'bg-amber-400 text-slate-900' : 'btn-secondary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">{DOC_PREFIX[docType]} number</label>
            <div className="flex items-stretch rounded-lg border border-slate-600 overflow-hidden">
              <span className="px-3 py-2 bg-slate-700 text-amber-300 text-sm font-bold border-r border-slate-600">
                {DOC_PREFIX[docType]}
              </span>
              <input
                value={docNumber}
                onChange={(e) => setDocNumber(toSuffix(docType, e.target.value))}
                placeholder={DOC_NUMBER_PLACEHOLDER[docType]}
                className="flex-1 px-3 py-2 bg-slate-800 text-gray-100 focus:outline-none"
                inputMode="numeric"
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Prefix is fixed. Enter only the number section.</p>
          </div>

          <details className="rounded-lg border border-slate-700 p-3">
            <summary className="text-sm text-gray-300 cursor-pointer">Advanced fields</summary>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <input
                value={invFallback}
                onChange={(e) => setInvFallback(e.target.value.toUpperCase())}
                placeholder="INV fallback"
                className="input-base"
              />
              <input
                value={dibtFallback}
                onChange={(e) => setDibtFallback(e.target.value.toUpperCase())}
                placeholder="DIBT fallback"
                className="input-base"
              />
              <input
                value={amsInvFallback}
                onChange={(e) => setAmsInvFallback(e.target.value.toUpperCase())}
                placeholder="AMS INV fallback"
                className="input-base"
              />
              <div className="pt-1">
                <label className="text-xs text-gray-500 mb-1 block">Lookup endpoint (for phone/deployment)</label>
                <div className="flex gap-2">
                  <input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="/api/document-lookup"
                    className="input-base flex-1"
                  />
                  <button type="button" onClick={saveEndpoint} className="btn-secondary text-sm">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </details>

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? 'Fetching…' : 'Fetch Document Tyres'}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-3">{statusText}</p>
      </section>

      {result && (
        <>
          <section className="card mb-4">
            <h3 className="font-semibold mb-3 text-gray-200">Summary</h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="IBT line items" value={String(ibtItems.length)} />
              <Stat label="IBT total qty" value={String(totalTyres)} />
              <Stat label="INV slips" value={String(invSlips.length)} />
              <Stat label="DIBT slips" value={String(dibtSlips.length)} />
            </div>
          </section>

          {errors.length > 0 && (
            <section className="card mb-4 border-red-500/40">
              <h3 className="font-semibold mb-2 text-red-300">Resolver errors</h3>
              <ul className="text-sm text-red-200 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx}>• {(err.errorType ? `${err.errorType}: ` : '') + (err.message || 'Unknown error')}</li>
                ))}
              </ul>
            </section>
          )}

          <SlipSection title="INV details" doc={invDoc} slips={invSlips} />
          <SlipSection title="DIBT details" doc={dibtDoc} slips={dibtSlips} />

          <section className="card mb-4">
            <h3 className="font-semibold mb-2 text-gray-200">IBT tyre lines</h3>
            {ibtItems.length === 0 ? (
              <p className="text-sm text-gray-500">No IBT line items returned.</p>
            ) : (
              <ul className="space-y-2">
                {ibtItems.map((item, idx) => (
                  <li key={`${item.rcs_code}-${idx}`} className="border border-slate-700 rounded-lg p-3">
                    <p className="font-semibold text-gray-100">{item.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      RCS: {item.rcs_code} · Size ID: {item.size_id} · Rubber ID: {item.rubber_id}
                    </p>
                    <p className="text-sm text-amber-300 font-semibold mt-1">Qty: {item.total}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="card">
            <summary className="cursor-pointer text-sm text-gray-300">Raw API output</summary>
            <pre className="mt-3 text-xs text-gray-200 bg-slate-900 rounded p-3 overflow-auto">
              {result.stdout || result.stderr || 'No output'}
            </pre>
          </details>
        </>
      )}
    </div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-100 mt-1">{value}</p>
    </div>
  );
}

function SlipSection({
  title,
  doc,
  slips,
}: {
  title: string;
  doc: DocumentPayload['inv'] | DocumentPayload['dibt'];
  slips: SlipItem[];
}) {
  return (
    <section className="card mb-4">
      <h3 className="font-semibold mb-2 text-gray-200">{title}</h3>

      {!doc || (!doc.customerCode && !doc.customerName && !doc.total && slips.length === 0) ? (
        <p className="text-sm text-gray-500">No data returned.</p>
      ) : (
        <>
          <div className="bg-slate-900 border border-slate-700 rounded p-3 mb-3">
            <p className="text-xs text-gray-500">Customer code</p>
            <p className="text-sm text-gray-100 font-medium">{doc.customerCode || '-'}</p>
            <p className="text-xs text-gray-500 mt-2">Customer name</p>
            <p className="text-sm text-gray-100 font-medium">{doc.customerName || '-'}</p>
            <p className="text-xs text-gray-500 mt-2">Total</p>
            <p className="text-sm text-amber-300 font-semibold">{doc.total ?? 0}</p>
          </div>

          {slips.length > 0 && (
            <ul className="space-y-2">
              {slips.map((slip) => (
                <li key={`${slip.slip_number}-${slip.uid}`} className="border border-slate-700 rounded p-3">
                  <p className="text-sm font-semibold text-gray-100">Slip #{slip.slip_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {slip.make} · {slip.pattern} · {slip.size}
                  </p>
                  <p className="text-xs text-gray-500">Serial: {slip.serial || '-'} · UID: {slip.uid || '-'}</p>
                  <p className="text-xs text-gray-500">Previous Reg: {slip.previous_reg || '-'} · Loaded: {slip.loaded}</p>
                  <p className="text-xs text-gray-600 mt-1">Scanned: {slip.scan_time || '-'}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default Documents;
