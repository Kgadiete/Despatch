import type { OCRFields, OCRField } from '@/types';

const KNOWN_MAKES = [
  'DOUBLE COIN', 'MICHELIN', 'BRIDGESTONE', 'GOODYEAR', 'CONTINENTAL',
  'DUNLOP', 'FIRESTONE', 'HANKOOK', 'YOKOHAMA', 'KUMHO', 'TOYO',
  'PIRELLI', 'COOPER', 'SUMITOMO', 'FALKEN', 'NANKANG', 'MAXXIS',
  'BF GOODRICH', 'GENERAL', 'TRIANGLE', 'LINGLONG', 'SAILUN',
  'AEOLUS', 'BOTO', 'WESTLAKE', 'ROADX', 'MAXAM', 'TECHKING',
];

const KNOWN_SERVICE_TYPES = ['REPAIR', 'NEW', 'RETREAD', 'RECAP', 'REGROVE', 'REPLACE'];

/** Count how many non-null fields were extracted */
export function countExtractedFields(fields: OCRFields): number {
  return Object.values(fields).filter((f) => f !== null && f !== undefined).length;
}

export function extractFieldsFromText(text: string): OCRFields {
  // Normalize OCR artifacts: fix common misreads on metal labels
  const cleaned = normalizeOCRText(text);
  const upper = cleaned.toUpperCase();

  return {
    job_number: extractJobNumber(upper),
    cs_number: extractCSNumber(upper),
    customer: extractCustomer(upper),
    service_type: extractServiceType(upper),
    tyre_make: extractMake(upper),
    tyre_size: extractSize(upper),
    serial: extractSerial(upper),
  };
}

/** Normalize common OCR misreads from metal/dirty labels */
function normalizeOCRText(text: string): string {
  return text
    // Fix common letter/digit confusions
    .replace(/[|l!]/g, (ch) => {
      // Keep as-is in context, the regex patterns will handle both
      return ch;
    })
    // Normalize various dash/hyphen characters
    .replace(/[—–−]/g, '-')
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    // Remove non-printable characters but keep newlines
    .replace(/[^\x20-\x7E\n]/g, '');
}

function extractJobNumber(text: string): OCRField | null {
  // Explicit JOB label with various OCR artifacts
  // Handles: JOB #, JOB#, JOB:, J0B #, JOB NO, JOB.NO
  const jobPatterns = [
    /J[O0]B\s*[#:.NO]*\s*[:#]?\s*(\d{5,10})/,
    /J[O0]B\s*(?:NO|N[O0]|NUMBER)?\s*[:#.]?\s*(\d{5,10})/,
    /JOB[^A-Z]{0,3}(\d{5,10})/,
  ];
  for (const pat of jobPatterns) {
    const m = text.match(pat);
    if (m) return { value: m[1], confidence: 'high' };
  }

  // Fallback: Look for 8-digit numbers (common job # format at ATT)
  const eightDigit = text.match(/\b(\d{8})\b/);
  if (eightDigit) return { value: eightDigit[1], confidence: 'medium' };

  // Broader: any 6-10 digit block
  const longNum = text.match(/\b(\d{6,10})\b/);
  if (longNum) return { value: longNum[1], confidence: 'low' };

  return null;
}

function extractCSNumber(text: string): OCRField | null {
  // CS#, CS #, CS:, C.S.#, C5# (OCR misread)
  const csPatterns = [
    /C\s*S\s*[#:.]\s*(\d{4,6})/,
    /C[S5]\s*[#:.]\s*(\d{4,6})/,
    /CS\s*(?:NO|NUMBER)?\s*[:#.]?\s*(\d{4,6})/,
  ];
  for (const pat of csPatterns) {
    const m = text.match(pat);
    if (m) return { value: m[1], confidence: 'high' };
  }
  return null;
}

function extractCustomer(text: string): OCRField | null {
  // Look for company names ending with PTY LTD
  const ptyMatch = text.match(/([A-Z][A-Z\s&'.]+?)\s*\(?\s*P\s*T\s*Y\s*\)?\s*L\s*T\s*D/);
  if (ptyMatch) {
    const name = ptyMatch[1].trim().replace(/\s+/g, ' ') + ' (PTY) LTD';
    return { value: name, confidence: 'high' };
  }

  // Known customers (ATT services these fleets)
  const knownCustomers = [
    'SHOPRITE', 'CHECKERS', 'SHOPRITE CHECKERS',
    'PICK N PAY', 'SPAR', 'WOOLWORTHS', 'MASSMART',
    'IMPERIAL', 'SUPER GROUP', 'UNITRANS', 'VALUE LOGISTICS',
    'RTT', 'DSV', 'BARLOWORLD',
  ];
  for (const cust of knownCustomers) {
    if (text.includes(cust)) {
      // Try to get a fuller match including PTY LTD
      const lineMatch = text.match(new RegExp(`(${cust}[^\\n]{0,40})`));
      const val = lineMatch ? lineMatch[1].trim() : cust;
      return { value: val, confidence: 'medium' };
    }
  }

  // Fuzzy: look for SH0PRITE / SH0PR1TE (OCR misreads)
  if (/SH[O0]PR[I1]TE/.test(text)) {
    return { value: 'SHOPRITE CHECKERS (PTY) LTD', confidence: 'medium' };
  }

  return null;
}

function extractServiceType(text: string): OCRField | null {
  for (const sType of KNOWN_SERVICE_TYPES) {
    // Allow OCR artifacts: R3PAIR, REPA1R, etc.
    const fuzzy = sType.replace(/I/g, '[I1!|]').replace(/O/g, '[O0]').replace(/E/g, '[E3]');
    const regex = new RegExp(`\\b${fuzzy}\\b`);
    if (regex.test(text)) {
      return { value: sType.charAt(0) + sType.slice(1).toLowerCase(), confidence: 'high' };
    }
  }
  return null;
}

function extractMake(text: string): OCRField | null {
  // Check for known makes, including fuzzy matching
  for (const make of KNOWN_MAKES) {
    // Build fuzzy pattern: DOUBLE COIN -> D[O0]UBLE C[O0][I1!]N
    const fuzzy = make
      .replace(/O/g, '[O0]')
      .replace(/I/g, '[I1!|]')
      .replace(/S/g, '[S5]')
      .replace(/ /g, '\\s+');
    const regex = new RegExp(fuzzy);
    if (regex.test(text)) {
      return { value: make, confidence: 'high' };
    }
  }

  // Look near "MAKE" label
  const makeMatch = text.match(/MAKE\s*[:#.\-]?\s*([A-Z][A-Z\s]{2,20})/);
  if (makeMatch) return { value: makeMatch[1].trim(), confidence: 'medium' };

  return null;
}

function extractSize(text: string): OCRField | null {
  // Standard tyre sizes: 315/80R22.5, 295/80R22.5, 12R22.5, 11.00R20
  // Allow OCR noise: spaces, dots misread, slash misread
  const sizePatterns = [
    // 315/80R22.5 style (most common) — allow spaces and OCR artifacts
    /(\d{2,3})\s*[\/\\|,]\s*(\d{2,3})\s*R\s*(\d{2}[.]?\d?)/,
    // 315 80R22.5 (slash missed)
    /\b(\d{3})\s+(\d{2,3})\s*R\s*(\d{2}[.]?\d)\b/,
    // 12R22.5 style
    /\b(\d{2,3})\s*R\s*(\d{2}[.]?\d)\b/,
    // With 80R225 (decimal missed)
    /(\d{2,3})\s*[\/\\|]\s*(\d{2,3})\s*R\s*(\d{3,4})/,
  ];

  for (const pat of sizePatterns) {
    const m = text.match(pat);
    if (m) {
      // Reconstruct clean size string
      if (m[3] !== undefined && m.length >= 4) {
        let r = m[3];
        // Fix 225 -> 22.5
        if (r.length === 3 && !r.includes('.')) {
          r = r.slice(0, 2) + '.' + r.slice(2);
        }
        return { value: `${m[1]}/${m[2]}R${r}`, confidence: 'high' };
      }
      // 12R22.5 style
      if (m[2] !== undefined) {
        return { value: `${m[1]}R${m[2]}`, confidence: 'high' };
      }
    }
  }

  return null;
}

function extractSerial(text: string): OCRField | null {
  // Explicit SERIAL label — allow OCR artifacts
  const serialPatterns = [
    /SER[I1!|]AL\s*[:#.\-]?\s*([A-Z0-9]{6,20})/,
    /SERIAL\s*[:#.\-]?\s*([A-Z0-9]{6,20})/,
  ];
  for (const pat of serialPatterns) {
    const m = text.match(pat);
    if (m) return { value: m[1], confidence: 'high' };
  }

  // Look for DOT code pattern (common on tyres): e.g. 2112 or longer alphanumeric
  const dotMatch = text.match(/\b(\d{2}[A-Z0-9]{2,4}\d{4,})\b/);
  if (dotMatch) return { value: dotMatch[1], confidence: 'medium' };

  return null;
}
