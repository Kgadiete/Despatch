import type { OCRFields, OCRField } from '@/types';

const KNOWN_MAKES = [
  'DOUBLE COIN', 'MICHELIN', 'BRIDGESTONE', 'GOODYEAR', 'CONTINENTAL',
  'DUNLOP', 'FIRESTONE', 'HANKOOK', 'YOKOHAMA', 'KUMHO', 'TOYO',
  'PIRELLI', 'COOPER', 'SUMITOMO', 'FALKEN', 'NANKANG', 'MAXXIS',
  'BF GOODRICH', 'GENERAL', 'TRIANGLE', 'LINGLONG', 'SAILUN',
];

const KNOWN_SERVICE_TYPES = ['REPAIR', 'NEW', 'RETREAD', 'RECAP', 'REGROVE'];

export function extractFieldsFromText(text: string): OCRFields {
  const upper = text.toUpperCase();

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

function extractJobNumber(text: string): OCRField | null {
  // Look for explicit JOB pattern first
  const jobMatch = text.match(/JOB\s*[#:]?\s*(\d{5,10})/);
  if (jobMatch) return { value: jobMatch[1], confidence: 'high' };

  // Fallback: look for 8-digit numbers (common job # format)
  const eightDigit = text.match(/\b(\d{8})\b/);
  if (eightDigit) return { value: eightDigit[1], confidence: 'medium' };

  return null;
}

function extractCSNumber(text: string): OCRField | null {
  const csMatch = text.match(/CS\s*[#:]?\s*(\d{4,6})/);
  if (csMatch) return { value: csMatch[1], confidence: 'high' };
  return null;
}

function extractCustomer(text: string): OCRField | null {
  // Look for company names ending with PTY LTD or similar
  const ptyMatch = text.match(/([A-Z][A-Z\s&]+?)\s*\(?\s*PTY\s*\)?\s*LTD/);
  if (ptyMatch) {
    const name = ptyMatch[1].trim() + ' (PTY) LTD';
    return { value: name, confidence: 'high' };
  }

  // Look for known big customers
  const knownCustomers = ['SHOPRITE', 'CHECKERS', 'PICK N PAY', 'SPAR', 'WOOLWORTHS'];
  for (const cust of knownCustomers) {
    if (text.includes(cust)) {
      // Try to get the full line
      const lineMatch = text.match(new RegExp(`(.*${cust}[^\\n]*)`));
      if (lineMatch) return { value: lineMatch[1].trim(), confidence: 'medium' };
    }
  }

  return null;
}

function extractServiceType(text: string): OCRField | null {
  for (const sType of KNOWN_SERVICE_TYPES) {
    if (text.includes(sType)) {
      return { value: sType.charAt(0) + sType.slice(1).toLowerCase(), confidence: 'high' };
    }
  }
  return null;
}

function extractMake(text: string): OCRField | null {
  for (const make of KNOWN_MAKES) {
    if (text.includes(make)) {
      return { value: make, confidence: 'high' };
    }
  }

  // Look near "MAKE" label
  const makeMatch = text.match(/MAKE\s*[:#]?\s*([A-Z][A-Z\s]{2,20})/);
  if (makeMatch) return { value: makeMatch[1].trim(), confidence: 'medium' };

  return null;
}

function extractSize(text: string): OCRField | null {
  // Standard tyre size patterns: 315/80R22.5, 12R22.5, 11.00R20
  const sizeMatch = text.match(/(\d{2,3}\s*\/\s*\d{2,3}\s*R\s*\d{2}[.]?\d?)/);
  if (sizeMatch) return { value: sizeMatch[1].replace(/\s+/g, ''), confidence: 'high' };

  // Alternative pattern: 12R22.5
  const altMatch = text.match(/(\d{2,3}\s*R\s*\d{2}[.]?\d)/);
  if (altMatch) return { value: altMatch[1].replace(/\s+/g, ''), confidence: 'medium' };

  return null;
}

function extractSerial(text: string): OCRField | null {
  // Explicit SERIAL label
  const serialMatch = text.match(/SERIAL\s*[:#]?\s*([A-Z0-9]{6,20})/);
  if (serialMatch) return { value: serialMatch[1], confidence: 'high' };

  return null;
}
