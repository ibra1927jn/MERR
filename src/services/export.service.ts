// =============================================
// EXPORT SERVICE - CSV/PDF Generation for Payroll
// =============================================
import { Picker, MINIMUM_WAGE, PIECE_RATE } from '../types';
import { todayNZST } from '@/utils/nzst';

// 🔧 V1: Escape HTML entities to prevent XSS in PDF export
const escHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 🔧 V2: Sanitize CSV cells to prevent formula injection in Excel/Sheets
const escCsv = (val: string): string => {
  const s = String(val);
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  // Wrap in quotes if contains comma, quote, or newline
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};


// Types
export interface PayrollExportData {
  date: string;
  crew: Array<{
    id: string;
    name: string;
    employeeId: string;
    buckets: number;
    hours: number;
    pieceEarnings: number;
    minimumTopUp: number;
    totalEarnings: number;
    status: string;
  }>;
  summary: {
    totalBuckets: number;
    totalHours: number;
    totalPieceEarnings: number;
    totalMinimumTopUp: number;
    grandTotal: number;
    averageBucketsPerHour: number;
  };
}

export interface ExportOptions {
  format: 'csv' | 'pdf';
  includeDetails: boolean;
  dateRange?: { start: string; end: string };
}

// =============================================
// EXPORT SERVICE
// =============================================
export const exportService = {
  /**
   * Prepare payroll data for export
   * 🔧 L9: Accept optional custom rates from orchard settings
   * 🔧 L16: Accept optional unpaid break deduction (gross → net hours)
   */
  preparePayrollData(
    crew: Picker[],
    date: string = todayNZST(),
    options?: {
      pieceRate?: number;
      minWage?: number;
      unpaidBreakMinutes?: number;
    }
  ): PayrollExportData {
    const pieceRate = options?.pieceRate ?? PIECE_RATE;
    const minWage = options?.minWage ?? MINIMUM_WAGE;
    const unpaidBreakHours = (options?.unpaidBreakMinutes ?? 0) / 60;

    const crewData = crew.map(picker => {
      const grossHours = picker.hours || 0;
      // 🔧 L16: Deduct unpaid break if worker worked enough hours (NZ: 30min if >6h)
      const hours = grossHours > 6 ? Math.max(0, grossHours - unpaidBreakHours) : grossHours;
      const pieceEarnings = (picker.total_buckets_today || 0) * pieceRate;
      const minimumGuarantee = hours * minWage;
      const minimumTopUp = Math.max(0, minimumGuarantee - pieceEarnings);
      const totalEarnings = pieceEarnings + minimumTopUp;

      return {
        id: picker.id,
        name: picker.name,
        employeeId: picker.picker_id || 'N/A',
        buckets: picker.total_buckets_today || 0,
        hours,
        pieceEarnings,
        minimumTopUp,
        totalEarnings,
        status: picker.status,
      };
    });

    const summary = {
      totalBuckets: crewData.reduce((sum, p) => sum + p.buckets, 0),
      totalHours: crewData.reduce((sum, p) => sum + p.hours, 0),
      totalPieceEarnings: crewData.reduce((sum, p) => sum + p.pieceEarnings, 0),
      totalMinimumTopUp: crewData.reduce((sum, p) => sum + p.minimumTopUp, 0),
      grandTotal: crewData.reduce((sum, p) => sum + p.totalEarnings, 0),
      averageBucketsPerHour: 0,
    };

    summary.averageBucketsPerHour = summary.totalHours > 0
      ? Math.round((summary.totalBuckets / summary.totalHours) * 10) / 10
      : 0;

    return { date, crew: crewData, summary };
  },

  /**
   * Generate CSV content from payroll data
   */
  generateCSV(data: PayrollExportData): string {
    const headers = [
      'Employee ID',
      'Name',
      'Buckets',
      'Hours',
      'Piece Earnings (NZD)',
      'Minimum Top-Up (NZD)',
      'Total Earnings (NZD)',
      'Status',
    ];

    // 🔧 V2: All string cells sanitized against CSV injection
    const rows = data.crew.map(p => [
      escCsv(p.employeeId),
      escCsv(p.name),
      p.buckets.toString(),
      p.hours.toFixed(1),
      p.pieceEarnings.toFixed(2),
      p.minimumTopUp.toFixed(2),
      p.totalEarnings.toFixed(2),
      escCsv(p.status),
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Total Buckets', '', data.summary.totalBuckets.toString()]);
    rows.push(['Total Hours', '', '', data.summary.totalHours.toFixed(1)]);
    rows.push(['Total Piece Earnings', '', '', '', data.summary.totalPieceEarnings.toFixed(2)]);
    rows.push(['Total Minimum Top-Up', '', '', '', '', data.summary.totalMinimumTopUp.toFixed(2)]);
    rows.push(['Grand Total', '', '', '', '', '', data.summary.grandTotal.toFixed(2)]);
    rows.push(['Avg Buckets/Hour', data.summary.averageBucketsPerHour.toString()]);

    const csvContent = [
      `Payroll Report - ${data.date}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    return csvContent;
  },

  /**
   * Generate PDF-ready HTML content
   */
  generatePDFContent(data: PayrollExportData, options?: { pieceRate?: number; minWage?: number }): string {
    const displayPieceRate = options?.pieceRate ?? PIECE_RATE;
    const displayMinWage = options?.minWage ?? MINIMUM_WAGE;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Payroll Report - ${data.date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #d91e36; padding-bottom: 20px; }
    .header h1 { color: #d91e36; font-size: 28px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .logo { font-size: 32px; font-weight: bold; color: #d91e36; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #d91e36; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
    td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
    tr:nth-child(even) { background: #f9f9f9; }
    .summary { margin-top: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .summary h3 { color: #d91e36; margin-bottom: 15px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #d91e36; }
    .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 20px; font-weight: bold; color: #1a1a2e; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }
    .currency { text-align: right; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🍒 HarvestPro NZ</div>
    <h1>Daily Payroll Report</h1>
    <p>Date: ${data.date} | Generated: ${new Date().toLocaleString('en-NZ')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Employee ID</th>
        <th>Name</th>
        <th>Buckets</th>
        <th>Hours</th>
        <th class="currency">Piece ($)</th>
        <th class="currency">Top-Up ($)</th>
        <th class="currency">Total ($)</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${data.crew.map(p => `
        <tr>
          <td>${escHtml(p.employeeId)}</td>
          <td>${escHtml(p.name)}</td>
          <td>${p.buckets}</td>
          <td>${p.hours.toFixed(1)}</td>
          <td class="currency">$${p.pieceEarnings.toFixed(2)}</td>
          <td class="currency">$${p.minimumTopUp.toFixed(2)}</td>
          <td class="currency"><strong>$${p.totalEarnings.toFixed(2)}</strong></td>
          <td>${escHtml(p.status)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <h3>Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Buckets</div>
        <div class="summary-value">${data.summary.totalBuckets}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Hours</div>
        <div class="summary-value">${data.summary.totalHours.toFixed(1)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Avg Buckets/Hour</div>
        <div class="summary-value">${data.summary.averageBucketsPerHour}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Piece Earnings</div>
        <div class="summary-value">$${data.summary.totalPieceEarnings.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Minimum Top-Up</div>
        <div class="summary-value">$${data.summary.totalMinimumTopUp.toFixed(2)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Grand Total</div>
        <div class="summary-value" style="color: #d91e36;">$${data.summary.grandTotal.toFixed(2)}</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>HarvestPro NZ - Payroll Management System</p>
    <p>Minimum Wage: $${displayMinWage}/hr | Piece Rate: $${displayPieceRate}/bucket</p>
  </div>
</body>
</html>`;

    return html;
  },

  /**
   * Download file to user's device
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export payroll to CSV
   */
  exportToCSV(crew: Picker[], date?: string): void {
    const data = this.preparePayrollData(crew, date);
    const csv = this.generateCSV(data);
    const filename = `payroll-${data.date}.csv`;
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
  },

  /**
   * Export payroll to PDF (opens print dialog)
   */
  exportToPDF(crew: Picker[], date?: string): void {
    const data = this.preparePayrollData(crew, date);
    const html = this.generatePDFContent(data);

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  },

  // =============================================
  // XERO PAYROLL FORMAT
  // =============================================

  /**
   * Generate CSV in Xero Payroll import format.
   * Xero expects: Employee ID, Employee Name, Earnings Rate Name, Hours/Quantity, Rate, Amount
   */
  generateXeroCSV(data: PayrollExportData): string {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Earnings Rate Name',
      'Hours/Quantity',
      'Rate',
      'Amount',
    ];

    const rows: string[][] = [];

    // 🔧 V3: Fixed double-pay — workers earn the GREATER of piece rate vs min wage.
    // Emit piece rate as base earnings + top-up if piece rate < minimum guarantee.
    // Previously emitted BOTH ordinary hours AND piece rate, doubling wages.
    data.crew.forEach(p => {
      // Piece rate earnings (primary pay line)
      if (p.buckets > 0) {
        rows.push([
          escCsv(p.employeeId),
          escCsv(p.name),
          'Piece Rate Earnings',
          p.buckets.toString(),
          // 🔧 L21: Use actual piece rate from data instead of hardcoded constant
          (p.buckets > 0 ? (p.pieceEarnings / p.buckets) : PIECE_RATE).toFixed(2),
          p.pieceEarnings.toFixed(2),
        ]);
      }

      // Minimum wage top-up (only if piece rate < min wage guarantee)
      if (p.minimumTopUp > 0) {
        rows.push([
          escCsv(p.employeeId),
          escCsv(p.name),
          'Minimum Wage Top-Up',
          p.hours.toFixed(2),
          (p.minimumTopUp / Math.max(p.hours, 0.01)).toFixed(2),
          p.minimumTopUp.toFixed(2),
        ]);
      }
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  /**
   * Export to Xero format and download
   */
  exportToXero(crew: Picker[], date?: string): void {
    const data = this.preparePayrollData(crew, date);
    const csv = this.generateXeroCSV(data);
    const filename = `xero-payroll-${data.date}.csv`;
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
  },

  // =============================================
  // PAYSAUCE FORMAT
  // =============================================

  /**
   * Generate CSV in PaySauce import format.
   * PaySauce expects: Employee Number, Pay Type, Description, Quantity, Rate, Amount
   */
  generatePaySauceCSV(data: PayrollExportData): string {
    const headers = [
      'Employee Number',
      'Pay Type',
      'Description',
      'Quantity',
      'Rate',
      'Amount',
    ];

    const rows: string[][] = [];

    data.crew.forEach(p => {
      // 🔧 L24: Include bucket-only workers (hours=0 but have earnings from buckets)
      if (p.hours <= 0 && p.totalEarnings <= 0 && p.buckets <= 0) return;

      // 🔧 L6+L15: Use actual hours — don't fake hours=1 or distort rate with Math.max
      const effectiveRate = p.hours > 0
        ? (p.totalEarnings / p.hours).toFixed(2)
        : '0.00';
      rows.push([
        escCsv(p.employeeId),
        'EARNINGS',
        escCsv(`Harvest work - ${p.buckets} buckets in ${p.hours.toFixed(1)}h`),
        p.hours > 0 ? p.hours.toFixed(2) : '0',
        effectiveRate,
        p.totalEarnings.toFixed(2),
      ]);
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  /**
   * Export to PaySauce format and download
   */
  exportToPaySauce(crew: Picker[], date?: string): void {
    const data = this.preparePayrollData(crew, date);
    const csv = this.generatePaySauceCSV(data);
    const filename = `paysauce-payroll-${data.date}.csv`;
    this.downloadFile(csv, filename, 'text/csv;charset=utf-8');
  },
};

/** Available export format types */
export type ExportFormat = 'csv' | 'xero' | 'paysauce' | 'pdf';

export default exportService;

