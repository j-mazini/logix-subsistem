export interface InvoiceItem {
  id: number;
  recordId: string;
  vendor: string;
  period: string;
  amount: number;
  status: 'Pending Verification' | 'Ready for Invoicing' | 'Invoices';
}

const VENDORS = [
  'Rapid Transport',
  'Swift Logistics',
  'Agile Deliveries',
  'Southern Freight',
  'Northern Express',
  'Coastal Shipping',
  'Metro Delivery',
  'Prime Logistics',
  'Elite Transport',
  'Global Freight',
  'City Express',
  'Fast Track Logistics',
  'Reliable Transport',
  'Premium Delivery',
  'Apex Logistics'
];

const STATUSES: InvoiceItem['status'][] = [
  'Pending Verification',
  'Ready for Invoicing',
  'Invoices'
];

const generatePeriod = (monthsAgo: number = 0): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const generateRecordId = (year: number, sequence: number): string => {
  return `INV-${year}-${String(sequence).padStart(3, '0')}`;
};

const generateAmount = (min: number = 500, max: number = 5000): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

/**
 * Generate mock invoice data
 * @param count - Number of invoices to generate
 * @param monthsBack - How many months back to generate data (default: 6)
 */
export const generateMockInvoices = (
  count: number = 50,
  monthsBack: number = 6
): InvoiceItem[] => {
  const invoices: InvoiceItem[] = [];
  let recordSequence = 1;

  const periods: string[] = [];
  for (let i = 0; i <= monthsBack; i++) {
    periods.push(generatePeriod(i));
  }

  for (let i = 0; i < count; i++) {
    const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
    const period = periods[Math.floor(Math.random() * periods.length)];
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const amount = generateAmount(300, 6000);

    const year = parseInt(period.split('-')[0]);

    invoices.push({
      id: i + 1,
      recordId: generateRecordId(year, recordSequence++),
      vendor,
      period,
      amount,
      status
    });
  }

  return invoices.sort((a, b) => {
    if (a.period !== b.period) {
      return b.period.localeCompare(a.period);
    }
    return b.recordId.localeCompare(a.recordId);
  });
};

/**
 * Pre-generated mock data with realistic distribution
 */
export const MOCK_INVOICES: InvoiceItem[] = [
  // Current month (November 2024)
  { id: 1, recordId: 'INV-2024-101', vendor: 'Rapid Transport', period: '2024-11', amount: 1850.50, status: 'Pending Verification' },
  { id: 2, recordId: 'INV-2024-102', vendor: 'Swift Logistics', period: '2024-11', amount: 2450.75, status: 'Ready for Invoicing' },
  { id: 3, recordId: 'INV-2024-103', vendor: 'Agile Deliveries', period: '2024-11', amount: 3200.00, status: 'Invoices' },
  { id: 4, recordId: 'INV-2024-104', vendor: 'Southern Freight', period: '2024-11', amount: 1500.25, status: 'Pending Verification' },
  { id: 5, recordId: 'INV-2024-105', vendor: 'Northern Express', period: '2024-11', amount: 2750.00, status: 'Ready for Invoicing' },
  { id: 6, recordId: 'INV-2024-106', vendor: 'Coastal Shipping', period: '2024-11', amount: 4100.50, status: 'Invoices' },
  { id: 7, recordId: 'INV-2024-107', vendor: 'Metro Delivery', period: '2024-11', amount: 1950.75, status: 'Pending Verification' },
  { id: 8, recordId: 'INV-2024-108', vendor: 'Prime Logistics', period: '2024-11', amount: 3300.00, status: 'Ready for Invoicing' },

  // Previous month (October 2024)
  { id: 9, recordId: 'INV-2024-091', vendor: 'Rapid Transport', period: '2024-10', amount: 1750.00, status: 'Invoices' },
  { id: 10, recordId: 'INV-2024-092', vendor: 'Swift Logistics', period: '2024-10', amount: 2300.50, status: 'Invoices' },
  { id: 11, recordId: 'INV-2024-093', vendor: 'Agile Deliveries', period: '2024-10', amount: 850.75, status: 'Invoices' },
  { id: 12, recordId: 'INV-2024-094', vendor: 'Elite Transport', period: '2024-10', amount: 1450.00, status: 'Invoices' },
  { id: 13, recordId: 'INV-2024-095', vendor: 'Southern Freight', period: '2024-10', amount: 3100.00, status: 'Invoices' },
  { id: 14, recordId: 'INV-2024-096', vendor: 'Global Freight', period: '2024-10', amount: 2100.20, status: 'Invoices' },
  { id: 15, recordId: 'INV-2024-097', vendor: 'City Express', period: '2024-10', amount: 900.00, status: 'Invoices' },
  { id: 16, recordId: 'INV-2024-098', vendor: 'Fast Track Logistics', period: '2024-10', amount: 1600.00, status: 'Invoices' },
  { id: 17, recordId: 'INV-2024-099', vendor: 'Reliable Transport', period: '2024-10', amount: 2800.50, status: 'Invoices' },
  { id: 18, recordId: 'INV-2024-100', vendor: 'Premium Delivery', period: '2024-10', amount: 1950.25, status: 'Invoices' },

  // September 2024
  { id: 19, recordId: 'INV-2024-081', vendor: 'Apex Logistics', period: '2024-09', amount: 2200.00, status: 'Invoices' },
  { id: 20, recordId: 'INV-2024-082', vendor: 'Rapid Transport', period: '2024-09', amount: 1650.75, status: 'Invoices' },
  { id: 21, recordId: 'INV-2024-083', vendor: 'Swift Logistics', period: '2024-09', amount: 3400.50, status: 'Invoices' },
  { id: 22, recordId: 'INV-2024-084', vendor: 'Agile Deliveries', period: '2024-09', amount: 1200.00, status: 'Invoices' },
  { id: 23, recordId: 'INV-2024-085', vendor: 'Southern Freight', period: '2024-09', amount: 2900.25, status: 'Invoices' },
  { id: 24, recordId: 'INV-2024-086', vendor: 'Northern Express', period: '2024-09', amount: 1800.50, status: 'Invoices' },
  { id: 25, recordId: 'INV-2024-087', vendor: 'Coastal Shipping', period: '2024-09', amount: 2500.00, status: 'Invoices' },

  // August 2024
  { id: 26, recordId: 'INV-2024-071', vendor: 'Metro Delivery', period: '2024-08', amount: 2100.75, status: 'Invoices' },
  { id: 27, recordId: 'INV-2024-072', vendor: 'Prime Logistics', period: '2024-08', amount: 1750.50, status: 'Invoices' },
  { id: 28, recordId: 'INV-2024-073', vendor: 'Elite Transport', period: '2024-08', amount: 3200.00, status: 'Invoices' },
  { id: 29, recordId: 'INV-2024-074', vendor: 'Global Freight', period: '2024-08', amount: 1400.25, status: 'Invoices' },
  { id: 30, recordId: 'INV-2024-075', vendor: 'City Express', period: '2024-08', amount: 2650.50, status: 'Invoices' },

  // July 2024
  { id: 31, recordId: 'INV-2024-061', vendor: 'Fast Track Logistics', period: '2024-07', amount: 1900.00, status: 'Invoices' },
  { id: 32, recordId: 'INV-2024-062', vendor: 'Reliable Transport', period: '2024-07', amount: 2250.75, status: 'Invoices' },
  { id: 33, recordId: 'INV-2024-063', vendor: 'Premium Delivery', period: '2024-07', amount: 1550.50, status: 'Invoices' },
  { id: 34, recordId: 'INV-2024-064', vendor: 'Apex Logistics', period: '2024-07', amount: 3000.00, status: 'Invoices' },
  { id: 35, recordId: 'INV-2024-065', vendor: 'Rapid Transport', period: '2024-07', amount: 1700.25, status: 'Invoices' },

  // June 2024
  { id: 36, recordId: 'INV-2024-051', vendor: 'Swift Logistics', period: '2024-06', amount: 2400.50, status: 'Invoices' },
  { id: 37, recordId: 'INV-2024-052', vendor: 'Agile Deliveries', period: '2024-06', amount: 1100.00, status: 'Invoices' },
  { id: 38, recordId: 'INV-2024-053', vendor: 'Southern Freight', period: '2024-06', amount: 2800.75, status: 'Invoices' },
  { id: 39, recordId: 'INV-2024-054', vendor: 'Northern Express', period: '2024-06', amount: 2000.50, status: 'Invoices' },

  // May 2024
  { id: 40, recordId: 'INV-2024-041', vendor: 'Coastal Shipping', period: '2024-05', amount: 3500.00, status: 'Invoices' },
  { id: 41, recordId: 'INV-2024-042', vendor: 'Metro Delivery', period: '2024-05', amount: 1650.25, status: 'Invoices' },
  { id: 42, recordId: 'INV-2024-043', vendor: 'Prime Logistics', period: '2024-05', amount: 2300.50, status: 'Invoices' },

  // Mixed status examples for testing
  { id: 43, recordId: 'INV-2024-044', vendor: 'Elite Transport', period: '2024-10', amount: 1950.00, status: 'Ready for Invoicing' },
  { id: 44, recordId: 'INV-2024-045', vendor: 'Global Freight', period: '2024-10', amount: 2700.75, status: 'Ready for Invoicing' },
  { id: 45, recordId: 'INV-2024-046', vendor: 'City Express', period: '2024-10', amount: 1400.50, status: 'Pending Verification' },
  { id: 46, recordId: 'INV-2024-047', vendor: 'Fast Track Logistics', period: '2024-10', amount: 3200.00, status: 'Pending Verification' },
  { id: 47, recordId: 'INV-2024-048', vendor: 'Reliable Transport', period: '2024-10', amount: 1850.25, status: 'Ready for Invoicing' },
  { id: 48, recordId: 'INV-2024-049', vendor: 'Premium Delivery', period: '2024-10', amount: 2100.00, status: 'Pending Verification' },
  { id: 49, recordId: 'INV-2024-050', vendor: 'Apex Logistics', period: '2024-10', amount: 2900.75, status: 'Ready for Invoicing' },
];

/**
 * Get mock data with option to use generated or pre-defined data
 * @param useGenerated - If true, generates random data. If false, uses pre-defined MOCK_INVOICES
 * @param count - Number of invoices if using generated data
 */
export const getMockInvoices = (
  useGenerated: boolean = false,
  count: number = 50
): InvoiceItem[] => {
  return useGenerated ? generateMockInvoices(count) : MOCK_INVOICES;
};
