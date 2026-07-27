export const PDF_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  gray: '#6b7280',
  text: '#1f2937',
  border: '#e5e7eb'
};

export function generatePDFFilename(prefix: string, dateFrom?: string, dateTo?: string): string {
  const timestamp = new Date().toISOString().split('T')[0];

  if (dateFrom && dateTo) {
    return `${prefix}-${dateFrom}-to-${dateTo}.pdf`;
  } else if (dateFrom) {
    return `${prefix}-${dateFrom}.pdf`;
  }

  return `${prefix}-${timestamp}.pdf`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function createPDFWithHeader(title: string, subtitle?: string) {
  // Stub implementation
  return null;
}

export function addSummaryBox(pdf: any, data: any) {
  // Stub implementation
}

export function drawTable(pdf: any, columns: any[], data: any[], options?: any) {
  // Stub implementation
}
