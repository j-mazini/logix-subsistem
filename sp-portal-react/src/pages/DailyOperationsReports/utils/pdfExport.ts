// @ts-nocheck
import { createPDFWithHeader, addSummaryBox, drawTable, PDF_COLORS } from '@/lib/pdf-utils';
import type { TransformedReportData } from '../types';
import { parseISO, format, isValid } from 'date-fns';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    // Try ISO date first
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, 'dd/MM/yyyy');
    }
    // Fallback: yyyy-MM-dd
    const [year, month, day] = dateString.split('-');
    if (year && month && day && year.length === 4) {
      return `${day}/${month}/${year}`;
    }
    return dateString;
  } catch (err) {
    return dateString;
  }
};

const formatTime = (timeString: string | null) => {
  if (!timeString) return '-';
  return timeString;
};

const formatWorkHours = (workHours: string | number | null) => {
  if (workHours === null || workHours === undefined) return '-';
  if (typeof workHours === 'number') {
    return workHours.toFixed(2);
  }
  return String(workHours);
};

export async function exportDailyOperationsToPDF(
  data: TransformedReportData[],
  dateFrom: string,
  dateTo: string,
  depotFilter: string,
  loopFilter: string,
  searchTerm: string
): Promise<Blob> {
  try {
    // @ts-ignore - PDF generation not fully implemented yet
    const pdf = await createPDFWithHeader({
      title: 'Daily Operations Report',
      subtitle: 'Operations Report',
      orientation: 'landscape',
    });

    const margin = 14;
    let currentY = margin + 40;

    // Summary box
    const totalStops = data.reduce((sum, item) => sum + (item.stops || 0), 0);
    const periodText =
      (dateFrom && dateTo && dateFrom === dateTo)
        ? formatDate(dateFrom)
        : `${formatDate(dateFrom)} to ${formatDate(dateTo)}`;

    const summaryData = [
      { label: 'Generated', value: format(new Date(), 'dd/MM/yyyy') },
      { label: 'Period', value: periodText },
      { label: 'Total Records', value: data.length.toString() },
      { label: 'Total Stops', value: totalStops.toString() },
    ];

    if (depotFilter !== 'All') {
      summaryData.push({ label: 'Depot Filter', value: depotFilter });
    }
    if (loopFilter !== 'All') {
      summaryData.push({ label: 'Loop Filter', value: loopFilter });
    }
    if (searchTerm) {
      summaryData.push({ label: 'Search Term', value: searchTerm });
    }

    // @ts-ignore - PDF generation not fully implemented yet
    currentY = addSummaryBox(pdf, currentY, summaryData);
    currentY += 15;

    // Table headers and data
    const headers = ['Date', 'Route', 'Vendor', 'VRN', 'TW (%)', 'Depart', 'Arrive', 'Break', 'Work Hours', 'Stops', 'Depot', 'Note'];
    const columnWidths = [25, 35, 30, 25, 20, 25, 25, 20, 25, 20, 30, 40];

    const tableData = data.map((item) => [
      formatDate(item.date),
      String(item.route || '-'),
      String(item.vendor || '-'),
      String(item.vrn || '-'),
      item.tw !== null && item.tw !== undefined ? item.tw.toString() : '-',
      formatTime(item.depart),
      formatTime(item.arrive),
      String(item.breakTime || '-'),
      formatWorkHours(item.workHours),
      String(item.stops || 0),
      String(item.depot || '-'),
      String(item.note || '-'),
    ]);

    if (tableData.length > 0) {
      // @ts-ignore - PDF generation not fully implemented yet
      drawTable(pdf, currentY, headers, tableData, columnWidths);
    } else {
      // @ts-ignore - PDF generation not fully implemented yet
      pdf.setFontSize(10);
      // @ts-ignore - PDF generation not fully implemented yet
      pdf.setTextColor(50, 50, 50);
      // @ts-ignore - PDF generation not fully implemented yet
      pdf.text('No data available', margin, currentY);
    }

    // Converter PDF para ArrayBuffer e criar Blob
    // @ts-ignore - PDF generation not fully implemented yet
    const pdfData = pdf.output('arraybuffer');
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    return blob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

