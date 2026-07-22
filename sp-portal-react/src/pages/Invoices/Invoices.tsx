import { useEffect, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/invoices.css';

/* =====================================================
   TYPES
   ===================================================== */
type WorkflowStatus = 'Current Period' | 'Pending Verification' | 'Ready for Invoicing' | 'Invoiced';

interface WorkflowRecord {
  id: string;
  sub: string;
  period: string;
  amount: number;
  status: WorkflowStatus;
}

interface DeductionRecord {
  ref: string;
  driver: string;
  amount: number;
  desc: string;
  inst: number;
  paid: number;
  cat: string;
  month: string;
}

interface ScheduleRecord {
  id: string;
  sub: string;
  period: string;
  payDate: string;
  run: number;
  amount: number;
  deduction: number;
  dedReason: string;
  status: 'Scheduled' | 'Paid';
  hold: boolean;
}

interface HistoryRecord {
  id: string;
  sub: string;
  amount: number;
  payDate: string;
}

type ViewName = 'workflow' | 'deductions' | 'schedule' | 'history';

/* =====================================================
   FORMAT HELPERS
   ===================================================== */
const gbp = (v: number) =>
  '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/* =====================================================
   MOCK DATA (verbatim port of sp-portal/invoices/script.js —
   fully self-contained, does not read window.DHL_MOCK_DATA)
   ===================================================== */
const WORKFLOW_STATUSES: WorkflowStatus[] = ['Current Period', 'Pending Verification', 'Ready for Invoicing', 'Invoiced'];

const INITIAL_WORKFLOW_RECORDS: WorkflowRecord[] = [
  { id: 'REC-2025001', sub: 'Benjamin Harris', period: 'Mar 2025', amount: 2489.2, status: 'Pending Verification' },
  { id: 'REC-2025002', sub: 'James Anderson', period: 'Jan 2025', amount: 929.1, status: 'Pending Verification' },
  { id: 'REC-2025003', sub: 'Charlotte Walker', period: 'Mar 2025', amount: 643.41, status: 'Ready for Invoicing' },
  { id: 'REC-2025004', sub: 'Alexander Lee', period: 'Jan 2025', amount: 2546.77, status: 'Ready for Invoicing' },
  { id: 'REC-2025005', sub: 'Emma Wilson', period: 'Dec 2024', amount: 1670.29, status: 'Invoiced' },
  { id: 'REC-2025006', sub: 'Maria Garcia', period: 'Mar 2025', amount: 1798.1, status: 'Current Period' },
  { id: 'REC-2025007', sub: 'Maria Garcia', period: 'Dec 2024', amount: 1324.02, status: 'Pending Verification' },
  { id: 'REC-2025008', sub: 'Olivia Taylor', period: 'Mar 2025', amount: 2102.02, status: 'Invoiced' },
  { id: 'REC-2025009', sub: 'Amelia Lewis', period: 'Jan 2025', amount: 2697.66, status: 'Current Period' },
  { id: 'REC-2025010', sub: 'Sarah Brown', period: 'Mar 2025', amount: 3011.18, status: 'Pending Verification' },
  { id: 'REC-2025011', sub: 'Daniel Clark', period: 'Feb 2025', amount: 1877.45, status: 'Pending Verification' },
  { id: 'REC-2025012', sub: 'Michael Davis', period: 'Mar 2025', amount: 2214.9, status: 'Current Period' },
  { id: 'REC-2025013', sub: 'Isabella Jackson', period: 'Feb 2025', amount: 1490.33, status: 'Pending Verification' },
  { id: 'REC-2025014', sub: 'Matthew Moore', period: 'Jan 2025', amount: 2955.08, status: 'Ready for Invoicing' },
  { id: 'REC-2025015', sub: 'John Smith', period: 'Mar 2025', amount: 1102.76, status: 'Pending Verification' },
  { id: 'REC-2025016', sub: 'Sophia Martinez', period: 'Feb 2025', amount: 2381.55, status: 'Pending Verification' },
  { id: 'REC-2025017', sub: 'William Taylor', period: 'Mar 2025', amount: 1755.6, status: 'Ready for Invoicing' },
  { id: 'REC-2025018', sub: 'Emma Wilson', period: 'Jan 2025', amount: 1288.14, status: 'Pending Verification' },
  { id: 'REC-2025019', sub: 'Alexander Wilson', period: 'Feb 2025', amount: 2620.31, status: 'Ready for Invoicing' },
  { id: 'REC-2025020', sub: 'Olivia Martinez', period: 'Mar 2025', amount: 1932.87, status: 'Pending Verification' },
  { id: 'REC-2025021', sub: 'Sarah Walker', period: 'Feb 2025', amount: 3106.44, status: 'Pending Verification' },
  { id: 'REC-2025022', sub: 'David Harris', period: 'Mar 2025', amount: 1667.92, status: 'Current Period' },
  { id: 'REC-2025023', sub: 'Isabella Lee', period: 'Jan 2025', amount: 2450.18, status: 'Pending Verification' },
  { id: 'REC-2025024', sub: 'Benjamin Garcia', period: 'Feb 2025', amount: 1518.73, status: 'Current Period' },
  { id: 'REC-2025025', sub: 'Charlotte Wilson', period: 'Mar 2025', amount: 2033.5, status: 'Ready for Invoicing' },
  { id: 'REC-2025026', sub: 'Daniel Wilson', period: 'Dec 2024', amount: 985.62, status: 'Invoiced' },
  { id: 'REC-2025027', sub: 'Mia Rodriguez', period: 'Jan 2025', amount: 1529.47, status: 'Current Period' },
  { id: 'REC-2025028', sub: 'Amelia Lewis', period: 'Feb 2025', amount: 1442.86, status: 'Current Period' },
  { id: 'REC-2025029', sub: 'Robert Johnson', period: 'Mar 2025', amount: 2240.2, status: 'Pending Verification' },
  { id: 'REC-2025030', sub: 'Amelia Lewis', period: 'Jan 2025', amount: 573.77, status: 'Invoiced' },
];

const DED_CATEGORIES = ['Repairs & Damages', 'Pre-Payments', 'Liquidation Damages', 'Traffic Penalties', 'Other'];

const deductionRecords: DeductionRecord[] = [
  { ref: 'RPD-THBRITO-050325-002', driver: 'PEDRO MONTE', amount: 120.0, desc: '', inst: 2, paid: 0, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-080325-003', driver: 'JAIME CASSULE', amount: 280.75, desc: '', inst: 4, paid: 2, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-120325-004', driver: 'EUCLIDES BARROS', amount: 350.0, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-150325-005', driver: 'CLAUDIO LOPES', amount: 85.99, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-180325-006', driver: 'BRUNO RIBEIRO', amount: 175.25, desc: '', inst: 2, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-220325-007', driver: 'RODRIGO MONTEIRO', amount: 425.0, desc: '', inst: 5, paid: 3, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-250325-008', driver: 'REINALDO NETO', amount: 160.0, desc: '', inst: 1, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-110325-010', driver: 'ANDRE SILVA', amount: 295.0, desc: '', inst: 3, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-170325-011', driver: 'HELIO FERNANDES', amount: 380.0, desc: '', inst: 4, paid: 1, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-210325-012', driver: 'CARLOS MENDES', amount: 490.0, desc: '', inst: 5, paid: 4, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'RPD-THBRITO-280325-013', driver: 'PEDRO MONTE', amount: 235.5, desc: '', inst: 2, paid: 0, cat: 'Repairs & Damages', month: '2025-03' },
  { ref: 'PRP-THBRITO-030325-002', driver: 'ANDRE SILVA', amount: 750.0, desc: 'Advance payment for March deliveries', inst: 1, paid: 0, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-050325-003', driver: 'ROBERTO CARLOS', amount: 920.0, desc: 'Equipment purchase advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-090325-004', driver: 'CARLOS MENDES', amount: 850.0, desc: 'Fuel card advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-140325-005', driver: 'BRUNO RIBEIRO', amount: 1100.0, desc: 'Vehicle deposit advance', inst: 3, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-190325-006', driver: 'HELIO FERNANDES', amount: 680.0, desc: 'Uniform and PPE advance', inst: 1, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-230325-007', driver: 'PEDRO MONTE', amount: 900.0, desc: 'Advance payment for routes', inst: 2, paid: 0, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'PRP-THBRITO-270325-008', driver: 'JAIME CASSULE', amount: 900.0, desc: 'Maintenance advance', inst: 2, paid: 1, cat: 'Pre-Payments', month: '2025-03' },
  { ref: 'LQD-THBRITO-040325-001', driver: 'RODRIGO MONTEIRO', amount: 620.0, desc: 'Missed delivery window - route 12', inst: 2, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
  { ref: 'LQD-THBRITO-100325-002', driver: 'EUCLIDES BARROS', amount: 540.0, desc: 'Contract SLA breach', inst: 1, paid: 0, cat: 'Liquidation Damages', month: '2025-03' },
  { ref: 'LQD-THBRITO-160325-003', driver: 'REINALDO NETO', amount: 780.0, desc: 'Failed collection penalty', inst: 3, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
  { ref: 'LQD-THBRITO-200325-004', driver: 'ANDRE SILVA', amount: 460.0, desc: 'Route abandonment penalty', inst: 1, paid: 1, cat: 'Liquidation Damages', month: '2025-03' },
  { ref: 'LQD-THBRITO-260325-005', driver: 'CARLOS MENDES', amount: 700.0, desc: 'Damaged parcels claim', inst: 2, paid: 0, cat: 'Liquidation Damages', month: '2025-03' },
  { ref: 'TRF-THBRITO-060325-001', driver: 'BRUNO RIBEIRO', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'TRF-THBRITO-090325-002', driver: 'PEDRO MONTE', amount: 130.0, desc: 'Parking fine - city centre', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'TRF-THBRITO-130325-003', driver: 'HELIO FERNANDES', amount: 100.0, desc: 'Congestion charge', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'TRF-THBRITO-180325-004', driver: 'JAIME CASSULE', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'TRF-THBRITO-240325-005', driver: 'RODRIGO MONTEIRO', amount: 130.0, desc: 'Speeding fine', inst: 2, paid: 1, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'TRF-THBRITO-290325-006', driver: 'EUCLIDES BARROS', amount: 65.0, desc: 'Parking fine', inst: 1, paid: 0, cat: 'Traffic Penalties', month: '2025-03' },
  { ref: 'OTH-THBRITO-220325-005', driver: 'CLAUDIO LOPES', amount: 70.0, desc: 'Vehicle cleaning', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
  { ref: 'OTH-THBRITO-240325-006', driver: 'BRUNO RIBEIRO', amount: 55.0, desc: 'ID card replacement', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
  { ref: 'OTH-THBRITO-260325-007', driver: 'REINALDO NETO', amount: 90.0, desc: 'Scanner repair', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
  { ref: 'OTH-THBRITO-280325-008', driver: 'ANDRE SILVA', amount: 80.0, desc: 'Key replacement', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
  { ref: 'OTH-THBRITO-300325-009', driver: 'CARLOS MENDES', amount: 65.0, desc: 'Fuel card replacement', inst: 1, paid: 1, cat: 'Other', month: '2025-03' },
  { ref: 'OTH-THBRITO-310325-010', driver: 'PEDRO MONTE', amount: 65.0, desc: 'Locker fee', inst: 1, paid: 0, cat: 'Other', month: '2025-03' },
  { ref: 'RPD-THBRITO-050225-001', driver: 'PEDRO MONTE', amount: 210.0, desc: '', inst: 2, paid: 2, cat: 'Repairs & Damages', month: '2025-02' },
  { ref: 'PRP-THBRITO-100225-001', driver: 'JAIME CASSULE', amount: 500.0, desc: 'February advance', inst: 1, paid: 1, cat: 'Pre-Payments', month: '2025-02' },
  { ref: 'TRF-THBRITO-140225-001', driver: 'BRUNO RIBEIRO', amount: 65.0, desc: 'Bus lane violation', inst: 1, paid: 1, cat: 'Traffic Penalties', month: '2025-02' },
];

const DED_TOTAL_STOPS = 2840; // month stop count for avg-per-stop metric
const DED_PAGE_SIZE = 25;

const INITIAL_SCHEDULE_RECORDS: ScheduleRecord[] = [
  { id: 'INV-2025001', sub: 'Charlotte Wilson', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2219.95, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025002', sub: 'Benjamin Garcia', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1968.64, deduction: 141.4, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
  { id: 'INV-2025003', sub: 'Amelia Clark', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1873.48, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025004', sub: 'Benjamin Chen', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1774.28, deduction: 93.74, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025005', sub: 'Alexander Harris', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2006.63, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025006', sub: 'William Taylor', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2897.28, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025007', sub: 'Alexander Wilson', period: 'Dec 2024', payDate: '2025-04-17', run: 1, amount: 2162.95, deduction: 295.35, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025008', sub: 'Olivia Martinez', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1967.22, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025009', sub: 'Isabella Lee', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2908.77, deduction: 353.21, dedReason: 'Insurance Payment', status: 'Scheduled', hold: false },
  { id: 'INV-2025010', sub: 'Daniel Wilson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2012.69, deduction: 192.22, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025011', sub: 'Sarah Walker', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2999.9, deduction: 415.45, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
  { id: 'INV-2025012', sub: 'Emma Thompson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2445.1, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025013', sub: 'James Anderson', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 1893.55, deduction: 120.5, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
  { id: 'INV-2025014', sub: 'Maria Garcia', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2210.4, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025015', sub: 'Olivia Taylor', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1755.82, deduction: 88.9, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025016', sub: 'Benjamin Harris', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2489.2, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025017', sub: 'Charlotte Walker', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1620.75, deduction: 210.15, dedReason: 'Insurance Payment', status: 'Scheduled', hold: false },
  { id: 'INV-2025018', sub: 'Michael Davis', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 2075.33, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025019', sub: 'Sophia Martinez', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 2330.6, deduction: 175.4, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025020', sub: 'Matthew Moore', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2955.08, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025021', sub: 'John Smith', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1480.22, deduction: 95.6, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
  { id: 'INV-2025022', sub: 'Isabella Jackson', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1998.4, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025023', sub: 'Daniel Clark', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2140.15, deduction: 160.0, dedReason: 'Failed Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025024', sub: 'Emma Wilson', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1670.29, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025025', sub: 'Amelia Lewis', period: 'Feb 2025', payDate: '2025-04-17', run: 1, amount: 1442.86, deduction: 75.3, dedReason: 'Late Delivery', status: 'Scheduled', hold: false },
  { id: 'INV-2025026', sub: 'Robert Johnson', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 2240.2, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025027', sub: 'Mia Rodriguez', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1529.47, deduction: 110.85, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
  { id: 'INV-2025028', sub: 'Sarah Brown', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 3011.18, deduction: 0, dedReason: '', status: 'Scheduled', hold: false },
  { id: 'INV-2025029', sub: 'Sarah Thomas', period: 'Jan 2025', payDate: '2025-04-17', run: 1, amount: 1720.09, deduction: 0, dedReason: '', status: 'Scheduled', hold: true },
  { id: 'INV-2025030', sub: 'David Harris', period: 'Mar 2025', payDate: '2025-04-17', run: 1, amount: 1540.7, deduction: 193.98, dedReason: 'Administrative Fee', status: 'Scheduled', hold: false },
];

const historyRecords: HistoryRecord[] = [
  { id: 'INV-2024001', sub: 'Amelia Lewis', amount: 726.22, payDate: '2024-12-30' },
  { id: 'INV-2024002', sub: 'Olivia Taylor', amount: 1457.87, payDate: '2024-12-06' },
  { id: 'INV-2024003', sub: 'Emma Wilson', amount: 465.1, payDate: '2025-02-24' },
  { id: 'INV-2024005', sub: 'Isabella Jackson', amount: 2336.62, payDate: '2025-03-31' },
  { id: 'INV-2024007', sub: 'Emma Wilson', amount: 1497.02, payDate: '2025-01-10' },
  { id: 'INV-2024009', sub: 'Daniel Clark', amount: 1276.9, payDate: '2024-12-18' },
  { id: 'INV-2024012', sub: 'Matthew Moore', amount: 3175.28, payDate: '2025-02-01' },
  { id: 'INV-2024013', sub: 'Emma Wilson', amount: 827.81, payDate: '2024-10-31' },
  { id: 'INV-2024015', sub: 'Isabella Jackson', amount: 409.93, payDate: '2025-02-18' },
  { id: 'INV-2024018', sub: 'Alexander Lee', amount: 2515.63, payDate: '2025-03-09' },
  { id: 'INV-2024020', sub: 'Charlotte Walker', amount: 2552.34, payDate: '2024-12-20' },
  { id: 'INV-2024026', sub: 'John Smith', amount: 2504.07, payDate: '2024-10-20' },
  { id: 'INV-2024027', sub: 'Michael Davis', amount: 532.26, payDate: '2025-01-27' },
  { id: 'INV-2024028', sub: 'Olivia Taylor', amount: 1410.67, payDate: '2024-10-15' },
  { id: 'INV-2024029', sub: 'Sarah Brown', amount: 1618.86, payDate: '2025-01-14' },
  { id: 'INV-2024030', sub: 'Sophia Martinez', amount: 984.51, payDate: '2024-11-22' },
];

const DED_DRIVERS = [...new Set(deductionRecords.map((r) => r.driver))].sort();
const HISTORY_SUBS = [...new Set(historyRecords.map((r) => r.sub))].sort();

const STATUS_CLASS: Record<WorkflowStatus, string> = {
  'Current Period': 'current',
  'Pending Verification': 'pending',
  'Ready for Invoicing': 'ready',
  Invoiced: 'invoiced',
};

const BATCH_ACTION_MAP: Record<string, WorkflowStatus> = {
  verify: 'Pending Verification',
  ready: 'Ready for Invoicing',
  invoice: 'Invoiced',
};

type DetailField = [string, string];

export function Invoices() {
  /* ---------- shell (loading overlay + tabs + modal + toast) ---------- */
  const [loadingHidden, setLoadingHidden] = useState(false);
  const [activeView, setActiveView] = useState<ViewName>('workflow');
  const [modal, setModal] = useState<{ title: string; fields: DetailField[] } | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoadingHidden(true), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  function toast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2600);
  }

  function openDetailModal(title: string, fields: DetailField[]) {
    setModal({ title, fields });
  }

  function closeModal() {
    setModal(null);
  }

  /* ---------- VIEW 1 — Processing Workflow ---------- */
  const [workflowRecords, setWorkflowRecords] = useState<WorkflowRecord[]>(INITIAL_WORKFLOW_RECORDS);
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowStatus | null>(null);
  const [workflowSelected, setWorkflowSelected] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState('');

  const workflowVisible = workflowFilter ? workflowRecords.filter((r) => r.status === workflowFilter) : workflowRecords;
  const workflowVisibleTotal = workflowVisible.reduce((s, r) => s + r.amount, 0);
  const workflowSelectAllChecked = workflowVisible.length > 0 && workflowVisible.every((r) => workflowSelected.has(r.id));

  function handleStageClick(stage: WorkflowStatus) {
    setWorkflowFilter((prev) => (prev === stage ? null : stage));
  }

  function handleWorkflowSelectAll(checked: boolean) {
    setWorkflowSelected((prev) => {
      const next = new Set(prev);
      workflowVisible.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });
  }

  function handleWorkflowRowCheck(id: string, checked: boolean) {
    setWorkflowSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleWorkflowAction(rec: WorkflowRecord, act: string) {
    switch (act) {
      case 'view':
        openDetailModal(rec.id, [
          ['Record ID', rec.id],
          ['Subcontractor', rec.sub],
          ['Period', rec.period],
          ['Amount', gbp(rec.amount)],
          ['Status', rec.status],
        ]);
        break;
      case 'ready':
        setWorkflowRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: 'Ready for Invoicing' } : r)));
        toast(`${rec.id} moved to Ready for Invoicing.`);
        break;
      case 'back':
        setWorkflowRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: 'Pending Verification' } : r)));
        toast(`${rec.id} sent back to Pending Verification.`);
        break;
      case 'invoice':
        setWorkflowRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: 'Invoiced' } : r)));
        toast(`Invoice generated for ${rec.id}.`);
        break;
      case 'download':
        toast(`Downloading invoice for ${rec.id}…`);
        break;
      case 'schedule':
        toast(`${rec.id} scheduled for the next payment run.`);
        break;
    }
  }

  function handleApplyBatch() {
    if (!batchAction) {
      toast('Select a batch action first.');
      return;
    }
    if (!workflowSelected.size) {
      toast('Select at least one record.');
      return;
    }
    const newStatus = BATCH_ACTION_MAP[batchAction];
    setWorkflowRecords((prev) => prev.map((r) => (workflowSelected.has(r.id) ? { ...r, status: newStatus } : r)));
    toast(`${workflowSelected.size} record(s) updated to ${newStatus}.`);
    setWorkflowSelected(new Set());
  }

  function workflowActionsFor(rec: WorkflowRecord) {
    const view = (
      <button className="icon-btn icon-btn--view" title="View details" onClick={() => handleWorkflowAction(rec, 'view')}>
        <i className="bi bi-eye" />
      </button>
    );
    switch (rec.status) {
      case 'Pending Verification':
        return (
          <>
            {view}
            <button className="icon-btn icon-btn--move" title="Mark ready for invoicing" onClick={() => handleWorkflowAction(rec, 'ready')}>
              <i className="bi bi-arrow-left-right" />
            </button>
          </>
        );
      case 'Ready for Invoicing':
        return (
          <>
            {view}
            <button className="icon-btn icon-btn--invoice" title="Generate invoice" onClick={() => handleWorkflowAction(rec, 'invoice')}>
              <i className="bi bi-file-earmark-spreadsheet" />
            </button>
            <button className="icon-btn icon-btn--move" title="Send back to verification" onClick={() => handleWorkflowAction(rec, 'back')}>
              <i className="bi bi-arrow-left-right" />
            </button>
          </>
        );
      case 'Invoiced':
        return (
          <>
            {view}
            <button className="icon-btn icon-btn--download" title="Download invoice" onClick={() => handleWorkflowAction(rec, 'download')}>
              <i className="bi bi-download" />
            </button>
            <button className="icon-btn icon-btn--schedule" title="Schedule for payment" onClick={() => handleWorkflowAction(rec, 'schedule')}>
              <i className="bi bi-calendar-plus" />
            </button>
          </>
        );
      default:
        return view;
    }
  }

  /* ---------- VIEW 2 — Deductions, Disbursements & Recharges ---------- */
  const [dedMonth, setDedMonth] = useState('2025-03');
  const [dedDriver, setDedDriver] = useState('');
  const [dedCategory, setDedCategory] = useState<string | null>(null);
  const [dedPage, setDedPage] = useState(1);

  const dedBase = useMemo(
    () => deductionRecords.filter((r) => r.month === dedMonth && (!dedDriver || r.driver === dedDriver)),
    [dedMonth, dedDriver],
  );

  const dedCatData = useMemo(
    () =>
      DED_CATEGORIES.map((cat) => {
        const recs = dedBase.filter((r) => r.cat === cat);
        return { cat, count: recs.length, total: recs.reduce((s, r) => s + r.amount, 0) };
      }),
    [dedBase],
  );
  const dedAllTotal = dedBase.reduce((s, r) => s + r.amount, 0);

  const dedFiltered = dedCategory ? dedBase.filter((r) => r.cat === dedCategory) : dedBase;
  const dedPages = Math.max(1, Math.ceil(dedFiltered.length / DED_PAGE_SIZE));
  const dedDisplayPage = Math.min(dedPage, dedPages);
  const dedPageRecs = dedFiltered.slice((dedDisplayPage - 1) * DED_PAGE_SIZE, dedDisplayPage * DED_PAGE_SIZE);
  const dedPageTotal = dedPageRecs.reduce((s, r) => s + r.amount, 0);
  const dedOverallTotal = dedFiltered.reduce((s, r) => s + r.amount, 0);

  function handleDedExport() {
    const rows = [
      ['Reference', 'Driver', 'Amount', 'Description', 'Instalments', 'Paid', 'Category'],
      ...dedFiltered.map((r) => [r.ref, r.driver, r.amount.toFixed(2), r.desc, String(r.inst), String(r.paid), r.cat]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `deductions-${dedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Export generated.');
  }

  /* ---------- VIEW 3 — Schedule for Payment ---------- */
  const [scheduleRecords, setScheduleRecords] = useState<ScheduleRecord[]>(INITIAL_SCHEDULE_RECORDS);
  const [scheduleSelected, setScheduleSelected] = useState<Set<string>>(new Set());

  const schedulePending = scheduleRecords.filter((r) => r.status === 'Scheduled');
  const schTotalAmount = schedulePending.reduce((s, r) => s + r.amount, 0);
  const schTotalDeductions = schedulePending.reduce((s, r) => s + r.deduction, 0);
  const schNextRun = schedulePending.length ? '17 April 2025' : '—';
  const schTotAmount = scheduleRecords.reduce((s, r) => s + r.amount, 0);
  const schTotDeductions = scheduleRecords.reduce((s, r) => s + r.deduction, 0);
  const schTotPayment = scheduleRecords.reduce((s, r) => s + (r.amount - r.deduction), 0);
  const scheduleSelectAllChecked = scheduleRecords.length > 0 && scheduleRecords.every((r) => scheduleSelected.has(r.id));

  function handleScheduleSelectAll(checked: boolean) {
    setScheduleSelected((prev) => {
      const next = new Set(prev);
      scheduleRecords.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
      return next;
    });
  }

  function handleScheduleRowCheck(id: string, checked: boolean) {
    setScheduleSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleScheduleAction(rec: ScheduleRecord) {
    if (rec.status === 'Scheduled') {
      setScheduleRecords((prev) => prev.map((r) => (r.id === rec.id ? { ...r, status: 'Paid' } : r)));
      toast(`${rec.id} marked as paid.`);
    } else {
      openDetailModal(rec.id, [
        ['Invoice ID', rec.id],
        ['Subcontractor', rec.sub],
        ['Period', rec.period],
        ['Payment Date', fmtDate(rec.payDate)],
        ['Amount', gbp(rec.amount)],
        ['Deductions', gbp(rec.deduction)],
        ['Total Payment', gbp(rec.amount - rec.deduction)],
        ['Status', rec.status],
      ]);
    }
  }

  function handleMarkPaid() {
    if (!scheduleSelected.size) {
      toast('Select at least one invoice.');
      return;
    }
    let n = 0;
    setScheduleRecords((prev) =>
      prev.map((r) => {
        if (scheduleSelected.has(r.id) && r.status === 'Scheduled') {
          n++;
          return { ...r, status: 'Paid' };
        }
        return r;
      }),
    );
    setScheduleSelected(new Set());
    toast(`${n} invoice(s) marked as paid.`);
  }

  /* ---------- VIEW 4 — Invoices History ---------- */
  const [histFromInput, setHistFromInput] = useState('2024-10-08');
  const [histToInput, setHistToInput] = useState('2025-04-08');
  const [histSubInput, setHistSubInput] = useState('');
  const [histFrom, setHistFrom] = useState('2024-10-08');
  const [histTo, setHistTo] = useState('2025-04-08');
  const [histSub, setHistSub] = useState('');

  const historyFiltered = historyRecords.filter(
    (r) => (!histFrom || r.payDate >= histFrom) && (!histTo || r.payDate <= histTo) && (!histSub || r.sub === histSub),
  );
  const historyTotal = historyFiltered.reduce((s, r) => s + r.amount, 0);

  function handleHistSearch() {
    setHistFrom(histFromInput);
    setHistTo(histToInput);
    setHistSub(histSubInput);
  }

  return (
    <PortalLayout pageClassName="invoices-page" mainClassName="invoices-container container-fluid px-3 px-lg-4 py-4" title="Invoices">
      {/* Loading Screen */}
      <div className={`loading-overlay${loadingHidden ? ' hidden' : ' active'}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading invoice data…</p>
      </div>

      {/* Page info (kept from the original header; not part of the standardized pattern) */}
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-receipt" />
            <span>Invoice processing, deductions, payment scheduling and history.</span>
          </p>
        </div>
      </div>

      {/* View tabs */}
      <nav className="view-tabs" role="tablist" aria-label="Invoice views">
        {(
          [
            ['workflow', 'bi-diagram-3', 'Processing Workflow'],
            ['deductions', 'bi-cash-stack', 'Deductions & Recharges'],
            ['schedule', 'bi-calendar-check', 'Schedule for Payment'],
            ['history', 'bi-clock-history', 'Invoices History'],
          ] as [ViewName, string, string][]
        ).map(([view, icon, label]) => (
          <button
            key={view}
            className={`view-tab${activeView === view ? ' active' : ''}`}
            role="tab"
            aria-selected={activeView === view}
            onClick={() => setActiveView(view)}
          >
            <i className={`bi ${icon}`} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ================= VIEW 1 — INVOICE PROCESSING WORKFLOW ================= */}
      <section className={`view-panel${activeView === 'workflow' ? ' active' : ''}`} id="view-workflow">
        <div className="workflow-stages" id="workflowStages">
          {WORKFLOW_STATUSES.map((stage) => {
            const recs = workflowRecords.filter((r) => r.status === stage);
            const stageClass =
              stage === 'Current Period'
                ? 'stage-current'
                : stage === 'Pending Verification'
                  ? 'stage-pending'
                  : stage === 'Ready for Invoicing'
                    ? 'stage-ready'
                    : 'stage-invoiced';
            return (
              <button
                key={stage}
                className={`workflow-stage ${stageClass}${workflowFilter === stage ? ' active' : ''}`}
                onClick={() => handleStageClick(stage)}
              >
                <span className="stage-name">{stage}</span>
                <span className="stage-count">{recs.length} records</span>
                <span className="stage-amount">{gbp(recs.reduce((s, r) => s + r.amount, 0))}</span>
              </button>
            );
          })}
        </div>

        <div className="batch-bar">
          <div className="batch-controls">
            <label className="batch-label" htmlFor="batchAction">
              Batch Action:
            </label>
            <select className="form-select batch-select" id="batchAction" value={batchAction} onChange={(e) => setBatchAction(e.target.value)}>
              <option value="">Select Action</option>
              <option value="verify">Move to Pending Verification</option>
              <option value="ready">Mark Ready for Invoicing</option>
              <option value="invoice">Generate Invoice</option>
            </select>
            <button className="styled-button styled-button--primary" id="btnApplyBatch" onClick={handleApplyBatch}>
              <i className="bi bi-check2" />
              Apply to Selected
            </button>
          </div>
          <label className="select-all-wrap">
            <input
              type="checkbox"
              className="form-check-input"
              id="workflowSelectAll"
              checked={workflowSelectAllChecked}
              onChange={(e) => handleWorkflowSelectAll(e.target.checked)}
            />
            <span>Select All</span>
          </label>
        </div>

        <div className="data-card">
          <div className="table-responsive">
            <table className="data-table" id="workflowTable">
              <thead>
                <tr>
                  <th className="col-check" />
                  <th>Record ID</th>
                  <th>Subcontractor</th>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="workflowBody">
                {workflowVisible.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={7}>No records in this stage.</td>
                  </tr>
                ) : (
                  workflowVisible.map((r) => (
                    <tr key={r.id} className={workflowSelected.has(r.id) ? 'row-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input row-check"
                          checked={workflowSelected.has(r.id)}
                          onChange={(e) => handleWorkflowRowCheck(r.id, e.target.checked)}
                        />
                      </td>
                      <td className="record-id">{r.id}</td>
                      <td>{r.sub}</td>
                      <td>{r.period}</td>
                      <td className="amount-cell">{gbp(r.amount)}</td>
                      <td>
                        <span className={`status-badge ${STATUS_CLASS[r.status]}`}>{r.status}</span>
                      </td>
                      <td>{workflowActionsFor(r)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={4} className="text-end fw-bold">
                    Total:
                  </td>
                  <td className="fw-bold" id="workflowTotal">
                    {gbp(workflowVisibleTotal)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="table-footer">
            <span id="workflowCount">Total: {workflowVisible.length} records</span>
          </div>
        </div>
      </section>

      {/* ================= VIEW 2 — DEDUCTIONS, DISBURSEMENTS & RECHARGES ================= */}
      <section className={`view-panel${activeView === 'deductions' ? ' active' : ''}`} id="view-deductions">
        <div className="filters-bar">
          <div className="filter-inline">
            <label className="filter-label" htmlFor="dedMonth">
              Month:
            </label>
            <select
              className="form-select"
              id="dedMonth"
              value={dedMonth}
              onChange={(e) => {
                setDedMonth(e.target.value);
                setDedPage(1);
              }}
            >
              <option value="2025-03">March 2025</option>
              <option value="2025-02">February 2025</option>
              <option value="2025-01">January 2025</option>
              <option value="2024-12">December 2024</option>
            </select>
          </div>
          <div className="filter-inline filter-right">
            <label className="filter-label" htmlFor="dedDriver">
              Driver:
            </label>
            <select className="form-select" id="dedDriver" value={dedDriver} onChange={(e) => setDedDriver(e.target.value)}>
              <option value="">All Drivers</option>
              {DED_DRIVERS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button className="styled-button styled-button--primary" id="btnDedSearch" onClick={() => setDedPage(1)}>
              <i className="bi bi-search" />
              Search
            </button>
            <button className="styled-button styled-button--success" id="btnDedExport" onClick={handleDedExport}>
              <i className="bi bi-file-earmark-excel" />
              Export Excel
            </button>
          </div>
        </div>

        <p className="group-label">Category</p>
        <div className="category-cards" id="categoryCards">
          <button
            className={`category-card${dedCategory === null ? ' active' : ''}`}
            data-cat=""
            onClick={() => {
              setDedCategory(null);
              setDedPage(1);
            }}
          >
            <span className="category-name">All Categories</span>
            <span className="category-count">{dedBase.length} records</span>
            <span className="category-amount">{gbp(dedAllTotal)}</span>
          </button>
          {dedCatData.map((c) => (
            <button
              key={c.cat}
              className={`category-card${dedCategory === c.cat ? ' active' : ''}`}
              data-cat={c.cat}
              onClick={() => {
                setDedCategory(c.cat);
                setDedPage(1);
              }}
            >
              <span className="category-name">{c.cat}</span>
              <span className="category-count">{c.count} records</span>
              <span className="category-amount">{gbp(c.total)}</span>
            </button>
          ))}
        </div>

        <div className="data-card">
          <div className="table-responsive">
            <table className="data-table" id="dedTable">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Driver</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Instalments</th>
                  <th>Category</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody id="dedBody">
                {dedPageRecs.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={7}>No records found for the selected filters.</td>
                  </tr>
                ) : (
                  dedPageRecs.map((r) => {
                    const pct = r.inst ? Math.round((r.paid / r.inst) * 100) : 0;
                    const pClass = r.paid === 0 ? 'p-none' : r.paid >= r.inst ? 'p-done' : 'p-partial';
                    return (
                      <tr key={r.ref}>
                        <td className="record-id">{r.ref}</td>
                        <td>{r.driver}</td>
                        <td className="amount-cell">{gbp(r.amount)}</td>
                        <td>{r.desc || '—'}</td>
                        <td>{r.inst}x</td>
                        <td>{r.cat}</td>
                        <td>
                          <div className="progress-wrap">
                            <span className={`progress-count ${pClass}`}>
                              {r.paid}/{r.inst}
                            </span>
                            <span className="progress-track">
                              <span className={`progress-fill${pClass === 'p-done' ? ' p-done' : ''}`} style={{ width: `${pct}%` }} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={4} className="text-end fw-bold">
                    Total:
                  </td>
                  <td className="fw-bold text-accent" id="dedTotal">
                    {gbp(dedPageTotal)}
                  </td>
                  <td />
                  <td className="fw-bold text-accent" id="dedAvg">
                    {gbp(dedPageTotal / DED_TOTAL_STOPS)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="table-footer">
            <span id="dedCount">
              Showing {dedPageRecs.length} of {dedFiltered.length} records
            </span>
            <div className="footer-right">
              <span className="overall-totals">
                Overall Total: <strong id="dedOverallTotal">{gbp(dedOverallTotal)}</strong> | Overall Avg Per Stop:{' '}
                <strong id="dedOverallAvg">{gbp(dedOverallTotal / DED_TOTAL_STOPS)}</strong>
              </span>
              <nav className="pagination-nav" id="dedPagination" aria-label="Deductions pages">
                {dedPages > 1 && (
                  <>
                    <button className="page-btn" disabled={dedDisplayPage === 1} onClick={() => setDedPage(dedDisplayPage - 1)}>
                      &laquo;
                    </button>
                    {Array.from({ length: dedPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} className={`page-btn${p === dedDisplayPage ? ' active' : ''}`} onClick={() => setDedPage(p)}>
                        {p}
                      </button>
                    ))}
                    <button className="page-btn" disabled={dedDisplayPage === dedPages} onClick={() => setDedPage(dedDisplayPage + 1)}>
                      &raquo;
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* ================= VIEW 3 — SCHEDULE FOR PAYMENT ================= */}
      <section className={`view-panel${activeView === 'schedule' ? ' active' : ''}`} id="view-schedule">
        <div className="summary-cards">
          <div className="summary-card">
            <p className="summary-label">Scheduled Payments</p>
            <p className="summary-value" id="schCount">
              {schedulePending.length}
            </p>
            <p className="summary-sub">Invoices scheduled for payment</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">Total Amount</p>
            <p className="summary-value" id="schTotalAmount">
              {gbp(schTotalAmount)}
            </p>
            <p className="summary-sub">Total scheduled payment amount</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">Total Deductions</p>
            <p className="summary-value" id="schTotalDeductions">
              {gbp(schTotalDeductions)}
            </p>
            <p className="summary-sub">Total deductions applied</p>
          </div>
          <div className="summary-card">
            <p className="summary-label">Next Payment Run</p>
            <p className="summary-value" id="schNextRun">
              {schNextRun}
            </p>
            <p className="summary-sub">Thursday - DHL Payment Cycle</p>
          </div>
        </div>

        <div className="batch-bar">
          <button className="styled-button styled-button--primary" id="btnMarkPaid" onClick={handleMarkPaid}>
            <i className="bi bi-check2" />
            Mark Selected as Paid
          </button>
          <label className="select-all-wrap">
            <input
              type="checkbox"
              className="form-check-input"
              id="scheduleSelectAll"
              checked={scheduleSelectAllChecked}
              onChange={(e) => handleScheduleSelectAll(e.target.checked)}
            />
            <span>Select All</span>
          </label>
        </div>

        <div className="data-card">
          <div className="table-responsive">
            <table className="data-table" id="scheduleTable">
              <thead>
                <tr>
                  <th className="col-check" />
                  <th>Invoice ID</th>
                  <th>Subcontractor</th>
                  <th>Period</th>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Deductions</th>
                  <th>Total Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="scheduleBody">
                {scheduleRecords.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={10}>No payments scheduled.</td>
                  </tr>
                ) : (
                  scheduleRecords.map((r) => {
                    const total = r.amount - r.deduction;
                    return (
                      <tr key={r.id} className={scheduleSelected.has(r.id) ? 'row-selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input row-check"
                            checked={scheduleSelected.has(r.id)}
                            onChange={(e) => handleScheduleRowCheck(r.id, e.target.checked)}
                          />
                        </td>
                        <td className="record-id">
                          {r.id}
                          {r.hold && <span className="hold-flag">[ON HOLD]</span>}
                        </td>
                        <td>{r.sub}</td>
                        <td>{r.period}</td>
                        <td>
                          {fmtDate(r.payDate)}
                          <span className="run-tag">Run #{r.run}</span>
                        </td>
                        <td className="amount-cell">{gbp(r.amount)}</td>
                        <td className="amount-cell">
                          {gbp(r.deduction)}
                          {r.dedReason && <span className="deduction-tag">{r.dedReason}</span>}
                        </td>
                        <td className="amount-cell">{gbp(total)}</td>
                        <td>
                          <span className={`status-badge ${r.status === 'Paid' ? 'paid' : 'scheduled'}`}>{r.status}</span>
                        </td>
                        <td>
                          {r.status === 'Scheduled' ? (
                            <button className="icon-btn icon-btn--paid" title="Mark as paid" onClick={() => handleScheduleAction(r)}>
                              <i className="bi bi-check2" />
                            </button>
                          ) : (
                            <button className="icon-btn icon-btn--view" title="View details" onClick={() => handleScheduleAction(r)}>
                              <i className="bi bi-eye" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5} className="text-end fw-bold">
                    Total:
                  </td>
                  <td className="fw-bold" id="schTotAmount">
                    {gbp(schTotAmount)}
                  </td>
                  <td className="fw-bold" id="schTotDeductions">
                    {gbp(schTotDeductions)}
                  </td>
                  <td className="fw-bold" id="schTotPayment">
                    {gbp(schTotPayment)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="table-footer">
            <span id="scheduleCount">Total: {scheduleRecords.length} records</span>
          </div>
        </div>
      </section>

      {/* ================= VIEW 4 — INVOICES HISTORY ================= */}
      <section className={`view-panel${activeView === 'history' ? ' active' : ''}`} id="view-history">
        <div className="filters-bar">
          <div className="filter-inline">
            <label className="filter-label" htmlFor="histFrom">
              Period:
            </label>
            <input
              type="date"
              className="form-control"
              id="histFrom"
              value={histFromInput}
              onChange={(e) => setHistFromInput(e.target.value)}
            />
            <span className="filter-sep">to</span>
            <input type="date" className="form-control" id="histTo" value={histToInput} onChange={(e) => setHistToInput(e.target.value)} />
          </div>
          <div className="filter-inline filter-right">
            <label className="filter-label" htmlFor="histSub">
              Subcontractor:
            </label>
            <select className="form-select" id="histSub" value={histSubInput} onChange={(e) => setHistSubInput(e.target.value)}>
              <option value="">All Subcontractors</option>
              {HISTORY_SUBS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="styled-button styled-button--primary" id="btnHistSearch" onClick={handleHistSearch}>
              <i className="bi bi-search" />
              Search
            </button>
          </div>
        </div>

        <div className="data-card">
          <div className="table-responsive">
            <table className="data-table" id="historyTable">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Subcontractor</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="historyBody">
                {historyFiltered.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={5}>No invoices found for the selected period.</td>
                  </tr>
                ) : (
                  historyFiltered.map((r) => (
                    <tr key={r.id}>
                      <td className="record-id">{r.id}</td>
                      <td>{r.sub}</td>
                      <td className="amount-cell">{gbp(r.amount)}</td>
                      <td>{fmtDate(r.payDate)}</td>
                      <td>
                        <button
                          className="icon-btn icon-btn--view"
                          title="View invoice"
                          onClick={() =>
                            openDetailModal(r.id, [
                              ['Invoice Number', r.id],
                              ['Subcontractor', r.sub],
                              ['Amount', gbp(r.amount)],
                              ['Payment Date', fmtDate(r.payDate)],
                            ])
                          }
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button className="icon-btn icon-btn--print" title="Print invoice" onClick={() => toast(`Sending ${r.id} to printer…`)}>
                          <i className="bi bi-printer" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span id="historyCount">
              Showing {historyFiltered.length} of {historyRecords.length} records
            </span>
            <span className="footer-total">
              Total Amount: <strong id="historyTotal">{gbp(historyTotal)}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Invoice detail modal — manual port of Bootstrap's JS-driven .modal;
          only Bootstrap's CSS is loaded in this SPA (no bootstrap.bundle.min.js),
          so this shows/hides via conditional render instead of the JS plugin. */}
      {modal && (
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="invoiceModalTitle">
                    {modal.title}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeModal} />
                </div>
                <div className="modal-body" id="invoiceModalBody">
                  <div className="detail-grid">
                    {modal.fields.map(([label, value]) => (
                      <div className="detail-item" key={label}>
                        <p className="detail-label">{label}</p>
                        <p className="detail-value">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="styled-button styled-button--outline" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeModal} />
        </>
      )}

      {/* Toast */}
      <div className={`app-toast${toastVisible ? ' show' : ''}`} id="appToast" role="status" aria-live="polite">
        {toastMsg}
      </div>
    </PortalLayout>
  );
}
