export interface Truck {
  id: string;
  reg_no: string;
  created_at: string;
}

export interface Slip {
  id: string;
  truck_id: string;
  job_number: string;
  cs_number?: string | null;
  customer?: string | null;
  service_type?: string | null;
  tyre_make?: string | null;
  tyre_size?: string | null;
  serial?: string | null;
  photo_url?: string | null;
  invoice_number?: string | null;
  notes?: string | null;
  scanned_at: string;
  created_at: string;
  updated_at: string;
}

/** IndexedDB-specific extensions */
export interface LocalTruck extends Truck {
  synced: boolean;
}

export interface LocalSlip extends Slip {
  synced: boolean;
}

export interface LocalPhoto {
  id: string;
  slip_id: string;
  blob: Blob;
}

export interface OCRResult {
  raw_text: string;
  fields: OCRFields;
}

export interface OCRFields {
  job_number: OCRField | null;
  cs_number: OCRField | null;
  customer: OCRField | null;
  service_type: OCRField | null;
  tyre_make: OCRField | null;
  tyre_size: OCRField | null;
  serial: OCRField | null;
}

export interface OCRField {
  value: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface SlipFormData {
  job_number: string;
  cs_number: string;
  customer: string;
  service_type: string;
  tyre_make: string;
  tyre_size: string;
  serial: string;
  invoice_number: string;
  notes: string;
}

export type DateFilter = 'today' | 'week' | 'all' | Date;

export type SyncStatus = 'idle' | 'syncing' | 'error';
