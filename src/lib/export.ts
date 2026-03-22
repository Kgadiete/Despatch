import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { LocalSlip, LocalTruck } from '@/types';
import { formatDate, formatTime } from './date-utils';

interface ExportData {
  slips: LocalSlip[];
  trucks: LocalTruck[];
}

export function exportCSV({ slips, trucks }: ExportData): void {
  const truckMap = new Map(trucks.map(t => [t.id, t.reg_no]));

  const rows = slips.map(s => ({
    'Date': formatDate(new Date(s.scanned_at)),
    'Time': formatTime(s.scanned_at),
    'Truck Reg': truckMap.get(s.truck_id) || '',
    'Invoice': s.invoice_number || '',
    'Job #': s.job_number,
    'CS #': s.cs_number || '',
    'Customer': s.customer || '',
    'Make': s.tyre_make || '',
    'Size': s.tyre_size || '',
    'Serial': s.serial || '',
    'Service': s.service_type || '',
    'Notes': s.notes || '',
  }));

  const csv = Papa.unparse(rows);
  downloadFile(csv, 'despatch-slips.csv', 'text/csv');
}

export function exportPDF({ slips, trucks }: ExportData): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const truckMap = new Map(trucks.map(t => [t.id, t]));

  // Title
  doc.setFontSize(16);
  doc.text('Despatch Slip Report', 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${formatDate(new Date())}`, 14, 22);

  // Group slips by truck
  const grouped = new Map<string, LocalSlip[]>();
  for (const slip of slips) {
    const existing = grouped.get(slip.truck_id) || [];
    existing.push(slip);
    grouped.set(slip.truck_id, existing);
  }

  let startY = 30;

  for (const [truckId, truckSlips] of grouped) {
    const truck = truckMap.get(truckId);
    const regNo = truck?.reg_no || 'Unknown';

    // Truck header
    doc.setFontSize(12);
    doc.text(`Truck: ${regNo} (${truckSlips.length} slips)`, 14, startY);
    startY += 4;

    const tableData = truckSlips.map(s => [
      formatDate(new Date(s.scanned_at)),
      formatTime(s.scanned_at),
      s.invoice_number || '—',
      s.job_number,
      s.cs_number || '—',
      s.tyre_make || '—',
      s.tyre_size || '—',
      s.serial || '—',
      s.service_type || '—',
    ]);

    autoTable(doc, {
      head: [['Date', 'Time', 'Invoice', 'Job #', 'CS #', 'Make', 'Size', 'Serial', 'Service']],
      body: tableData,
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 95] },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = (doc as any).lastAutoTable.finalY + 10;

    if (startY > 180) {
      doc.addPage();
      startY = 15;
    }
  }

  doc.save('despatch-slips.pdf');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
