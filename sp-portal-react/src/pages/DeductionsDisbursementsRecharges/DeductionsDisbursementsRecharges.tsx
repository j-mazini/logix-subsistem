import { useCallback, useMemo, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import styles from './DeductionsDisbursementsRecharges.module.css';

/**
 * Port of logix-sphere-frontend-nextjs's deductions-disbursements-recharges
 * page. The Next.js original is backend-integrated (lib/deductions-api,
 * lib/deduction-validators) and uses Tailwind + a Radix sidebar context;
 * this port follows this project's convention instead (self-contained
 * component, seeded mock data, no Tailwind) — matching RouteBalance,
 * DailyOperationsManagement, AdhocInvoiceManagement, etc.
 *
 * Simplifications vs. the Next.js original:
 *  - All CRUD operates on local component state, not a real backend.
 *  - Business-day adjustment (used for payment dates and installment
 *    scheduling) is weekend-only here — the original also skips UK bank
 *    holidays, which isn't worth reproducing for mock data.
 *  - Saving an entry that would be split into installments records a
 *    single row for the full amount; the installments table in step 2 of
 *    the wizard is preview-only and doesn't create separate rows (the
 *    original relies on a backend job to do that).
 *  - Export is CSV-only (no PDF/XLSX — this project has no jsPDF/xlsx
 *    dependency), matching the pattern already used by Invoices's own
 *    "Deductions & Recharges" tab.
 *  - Desktop/mobile is one responsive layout (CSS media queries) rather
 *    than the original's separate DesktopView/MobileView components —
 *    consistent with how every other page in this project handles it.
 */

/* ==================== Types ==================== */

type DeductionCategory =
  | 'Repairs & Damages'
  | 'Traffic Penalties'
  | 'Pre-Payments'
  | 'Liquidation Damages'
  | 'Other';

type BackendType = 'fix-damage' | 'traffic-penalty' | 'pre-payment' | 'liquidation-damage' | 'other';

interface FormDataState {
  [key: string]: string | boolean | undefined;
}

interface DisplayDeduction {
  id: string;
  dateOfIncident: string;
  courierName: string;
  type: DeductionCategory;
  amount: number;
  status: 'Paid' | 'Pending' | 'Disputed';
  backendId: number;
  backendType: BackendType;
  userId: number;
  feeValue?: number;
  /** Full field snapshot (rep_/pen_/pre_/liq_/oth_ prefixed keys), used to populate the modal on edit/view. */
  fields: FormDataState;
}

interface MockDriver {
  userId: number;
  fullName: string;
}
interface MockVehicle {
  vehicleId: number;
  registrationPlates: string;
}
interface MockRoute {
  routeId: number;
  routeName: string;
}

interface KPICardDef {
  key: string;
  title: string;
  icon: string;
  bg: string;
  color: string;
  filterType: 'All' | DeductionCategory;
  hasAdd: boolean;
}

interface InstallmentPreview {
  installmentNumber: number;
  date: string;
  amount: number;
  totalAmount: number;
  referenceNumber: string;
}

/* ==================== Constants ==================== */

const KPI_CARDS: KPICardDef[] = [
  { key: 'all', title: 'Total', icon: 'bi-journal-text', bg: '#e7f0ff', color: '#0d6efd', filterType: 'All', hasAdd: false },
  { key: 'repairs', title: 'Repairs & Damages', icon: 'bi-tools', bg: '#fff0f0', color: '#f5222d', filterType: 'Repairs & Damages', hasAdd: true },
  { key: 'prepayments', title: 'Pre-Payments', icon: 'bi-cash-stack', bg: '#e6f7ff', color: '#1890ff', filterType: 'Pre-Payments', hasAdd: true },
  { key: 'liquidation', title: 'Liquidation Damages', icon: 'bi-exclamation-triangle-fill', bg: '#ffeeed', color: '#f5222d', filterType: 'Liquidation Damages', hasAdd: true },
  { key: 'penalties', title: 'Traffic Penalties', icon: 'bi-cone-striped', bg: '#feefc7', color: '#92400e', filterType: 'Traffic Penalties', hasAdd: true },
  { key: 'other', title: 'Other', icon: 'bi-three-dots', bg: '#f4f4f5', color: '#71717a', filterType: 'Other', hasAdd: true },
];

const CATEGORIES: DeductionCategory[] = ['Repairs & Damages', 'Traffic Penalties', 'Pre-Payments', 'Liquidation Damages', 'Other'];

const REQUIRED_FIELDS_BY_CATEGORY: Record<DeductionCategory, string[]> = {
  'Repairs & Damages': ['rep_refNumber', 'rep_vendor', 'rep_incidentDate', 'rep_totalRepairCost'],
  'Traffic Penalties': ['pen_refNumber', 'pen_vendor', 'pen_penaltyDate', 'pen_amount'],
  'Pre-Payments': ['pre_refNumber', 'pre_vendor', 'pre_totalAmount', 'pre_paymentDate'],
  'Liquidation Damages': ['liq_refNumber', 'liq_vendor', 'liq_lqDate', 'liq_amount'],
  Other: ['oth_refNumber', 'oth_vendor', 'oth_incidentDate', 'oth_amount'],
};

const AMOUNT_FIELD_BY_CATEGORY: Record<DeductionCategory, string> = {
  'Repairs & Damages': 'rep_totalRepairCost',
  'Traffic Penalties': 'pen_amount',
  'Pre-Payments': 'pre_totalAmount',
  'Liquidation Damages': 'liq_amount',
  Other: 'oth_amount',
};

const DATE_FIELD_BY_CATEGORY: Record<DeductionCategory, string> = {
  'Repairs & Damages': 'rep_incidentDate',
  'Traffic Penalties': 'pen_penaltyDate',
  'Pre-Payments': 'pre_paymentDate',
  'Liquidation Damages': 'liq_lqDate',
  Other: 'oth_incidentDate',
};

const VENDOR_FIELD_BY_CATEGORY: Record<DeductionCategory, string> = {
  'Repairs & Damages': 'rep_vendor',
  'Traffic Penalties': 'pen_vendor',
  'Pre-Payments': 'pre_vendor',
  'Liquidation Damages': 'liq_vendor',
  Other: 'oth_vendor',
};

const REF_FIELD_BY_CATEGORY: Record<DeductionCategory, string> = {
  'Repairs & Damages': 'rep_refNumber',
  'Traffic Penalties': 'pen_refNumber',
  'Pre-Payments': 'pre_refNumber',
  'Liquidation Damages': 'liq_refNumber',
  Other: 'oth_refNumber',
};

const BACKEND_TYPE_BY_CATEGORY: Record<DeductionCategory, BackendType> = {
  'Repairs & Damages': 'fix-damage',
  'Traffic Penalties': 'traffic-penalty',
  'Pre-Payments': 'pre-payment',
  'Liquidation Damages': 'liquidation-damage',
  Other: 'other',
};

const REF_PREFIX_BY_CATEGORY: Record<DeductionCategory, string> = {
  'Repairs & Damages': 'RPD',
  'Traffic Penalties': 'TRP',
  'Pre-Payments': 'PRP',
  'Liquidation Damages': 'LQD',
  Other: 'OTH',
};

/* ==================== Deterministic PRNG (same scheme as RouteBalance/DailyOperationsManagement) ==================== */

function hashStringToSeed(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngForSeed(seedStr: string) {
  const gen = hashStringToSeed(seedStr);
  return mulberry32(gen());
}

/* ==================== Date / currency / reference helpers ==================== */

function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayString(): string {
  return formatDateToString(new Date());
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function nextBusinessDay(date: Date): Date {
  const d = new Date(date);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
}

function nextBusinessDayString(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  return formatDateToString(nextBusinessDay(new Date(y, m - 1, d)));
}

function formatCurrency(value: number | string | null | undefined): string {
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : (value ?? 0);
  const number = Number.parseFloat(String(numValue));
  return Number.isNaN(number) ? '£0.00' : `£${number.toFixed(2)}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
}

function getStringValue(value: string | boolean | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value;
}

function generateReferenceNumber(category: DeductionCategory, driverName: string, existing: DisplayDeduction[], entryDate?: string): string {
  const prefix = REF_PREFIX_BY_CATEGORY[category];
  const nameParts = driverName.trim().split(/\s+/).filter(Boolean);
  let initials = '';
  if (nameParts.length > 0) {
    const lastNames = nameParts.length > 1 ? nameParts.slice(1).join('') : '';
    initials = (nameParts[0].charAt(0).toUpperCase() + lastNames.toUpperCase()).replace(/\s/g, '');
  } else {
    initials = driverName.toUpperCase().replace(/\s/g, '');
  }

  const refDate = entryDate ? new Date(`${entryDate}T00:00:00`) : new Date();
  const day = String(refDate.getDate()).padStart(2, '0');
  const month = String(refDate.getMonth() + 1).padStart(2, '0');
  const year = String(refDate.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;

  const todayPrefix = `${prefix}-${initials}-${dateStr}`;
  const matchingSeqs = existing
    .filter((d) => d.id.startsWith(todayPrefix))
    .map((d) => Number.parseInt(d.id.split('-').pop() || '', 10))
    .filter((n) => !Number.isNaN(n));

  const nextSeq = String((matchingSeqs.length > 0 ? Math.max(...matchingSeqs) : 0) + 1).padStart(3, '0');
  return `${todayPrefix}-${nextSeq}`;
}

/* ==================== Installments (ported from lib/deduction-installments.ts, weekend-only adjustment) ==================== */

function getDay30OfMonth(date: Date): Date {
  const firstDayOfNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const lastDayOfCurrentMonth = new Date(firstDayOfNextMonth);
  lastDayOfCurrentMonth.setDate(lastDayOfCurrentMonth.getDate() - 1);
  if (lastDayOfCurrentMonth.getDate() >= 30) {
    return new Date(date.getFullYear(), date.getMonth(), 30);
  }
  return lastDayOfCurrentMonth;
}

function parseScheduleTerms(scheduleTerms: string | undefined): number | null {
  if (!scheduleTerms || !scheduleTerms.trim()) return null;
  const match = scheduleTerms.trim().match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0 && num <= 120) return num;
  }
  return null;
}

function calculateInstallments(
  totalAmount: number,
  scheduleTerms: string | undefined,
  referenceNumber: string,
  entryDate: string
): InstallmentPreview[] | null {
  if (!totalAmount || totalAmount <= 0 || !referenceNumber || !entryDate) return null;
  const entry = new Date(`${entryDate}T00:00:00`);
  if (Number.isNaN(entry.getTime())) return null;

  const maxInstallmentValue = 200;
  let numberOfInstallments: number;
  let installmentValue: number;
  let remainder: number;

  const parsedSchedule = parseScheduleTerms(scheduleTerms);
  if (!parsedSchedule) {
    if (totalAmount <= maxInstallmentValue) {
      numberOfInstallments = 1;
      installmentValue = totalAmount;
      remainder = 0;
    } else {
      numberOfInstallments = Math.ceil(totalAmount / maxInstallmentValue);
      installmentValue = maxInstallmentValue;
      remainder = totalAmount - installmentValue * (numberOfInstallments - 1);
    }
  } else {
    numberOfInstallments = parsedSchedule;
    installmentValue = Math.floor(totalAmount / numberOfInstallments);
    remainder = totalAmount - installmentValue * numberOfInstallments;
  }

  const isFixDamage = referenceNumber.toUpperCase().startsWith('RPD-');
  const firstInstallmentDate = getDay30OfMonth(entry.getDate() > 30 ? new Date(entry.getFullYear(), entry.getMonth() + 1, 1) : entry);

  const installments: InstallmentPreview[] = [];
  for (let i = 0; i < numberOfInstallments; i++) {
    let installmentRef: string;
    if (i === 0) {
      installmentRef = referenceNumber;
    } else {
      const baseMatch = referenceNumber.match(/(\d+)$/);
      if (baseMatch) {
        const newNumber = parseInt(baseMatch[1], 10) + i;
        installmentRef = referenceNumber.replace(/\d+$/, String(newNumber).padStart(3, '0'));
      } else {
        installmentRef = `${referenceNumber}-${String(i + 1).padStart(2, '0')}`;
      }
    }

    let installmentDate: Date;
    if (isFixDamage && i === 0) {
      installmentDate = new Date(firstInstallmentDate);
    } else {
      const targetMonth = new Date(firstInstallmentDate.getFullYear(), firstInstallmentDate.getMonth() + i, 1);
      installmentDate = getDay30OfMonth(targetMonth);
    }

    let currentValue = installmentValue;
    if (i === numberOfInstallments - 1 && numberOfInstallments > 1) {
      currentValue = parsedSchedule ? installmentValue + remainder : remainder;
    } else if (numberOfInstallments === 1) {
      currentValue = totalAmount;
    }

    installments.push({
      installmentNumber: i + 1,
      date: formatDateToString(nextBusinessDay(installmentDate)),
      amount: Math.round(currentValue * 100) / 100,
      totalAmount,
      referenceNumber: installmentRef,
    });
  }

  return installments;
}

/* ==================== Mock master data ==================== */

const DRIVER_NAMES = [
  'John Smith', 'Maria Santos', 'James Wilson', 'Ana Ferreira', 'Michael Brown',
  'Sofia Rodrigues', 'Carlos Silva', 'Emily Clarke', 'Pedro Oliveira', 'Laura Bennett',
  'Lucas Pereira', 'Grace Thompson',
];
const VEHICLE_PLATES = ['AB12 CDE', 'EF34 FGH', 'JK56 LMN', 'OP78 PQR', 'ST90 UVW', 'XY12 ZAB', 'CD34 EFG', 'GH56 IJK'];
const ROUTE_NAMES = ['LON-01', 'LON-02', 'LON-03', 'MAN-01', 'MAN-02', 'BIR-01'];

const MOCK_DRIVERS: MockDriver[] = DRIVER_NAMES.map((fullName, i) => ({ userId: i + 1, fullName }));
const MOCK_VEHICLES: MockVehicle[] = VEHICLE_PLATES.map((registrationPlates, i) => ({ vehicleId: i + 1, registrationPlates }));
const MOCK_ROUTES: MockRoute[] = ROUTE_NAMES.map((routeName, i) => ({ routeId: i + 1, routeName }));

function buildInitialDeductions(): DisplayDeduction[] {
  const rng = rngForSeed('deductions-disbursements-recharges');
  const records: DisplayDeduction[] = [];
  const today = new Date();
  let nextId = 1;

  const monthOffsets = [0, -1, -2];
  const recordsPerCategoryPerMonth = 2;

  for (const category of CATEGORIES) {
    for (const offset of monthOffsets) {
      for (let n = 0; n < recordsPerCategoryPerMonth; n++) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
        const day = 1 + Math.floor(rng() * Math.min(daysInMonth, 28));
        const entryDate = formatDateToString(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));

        const driver = MOCK_DRIVERS[Math.floor(rng() * MOCK_DRIVERS.length)];
        const vehicle = MOCK_VEHICLES[Math.floor(rng() * MOCK_VEHICLES.length)];
        const route = MOCK_ROUTES[Math.floor(rng() * MOCK_ROUTES.length)];
        const refNumber = generateReferenceNumber(category, driver.fullName, records, entryDate);
        const status: DisplayDeduction['status'] = rng() < 0.6 ? 'Paid' : rng() < 0.9 ? 'Pending' : 'Disputed';

        let amount = 0;
        let feeValue: number | undefined;
        const fields: FormDataState = { type: category };

        if (category === 'Repairs & Damages') {
          amount = Math.round((80 + rng() * 900) * 100) / 100;
          Object.assign(fields, {
            rep_refNumber: refNumber, rep_vendor: driver.fullName, rep_vehicleReg: vehicle.registrationPlates,
            rep_incidentDate: entryDate, rep_totalRepairCost: String(amount), rep_repairCost: String(amount),
            rep_amount: String(amount), rep_paymentDate: entryDate, rep_scheduleTerms: rng() < 0.4 ? '3' : '',
            rep_description: 'Vehicle body panel repair following minor collision.',
          });
        } else if (category === 'Traffic Penalties') {
          amount = Math.round((30 + rng() * 150) * 100) / 100;
          Object.assign(fields, {
            pen_refNumber: refNumber, pen_vendor: driver.fullName, pen_vehicleReg: vehicle.registrationPlates,
            pen_pcnRef: `PCN${100000 + Math.floor(rng() * 899999)}`, pen_amount: String(amount),
            pen_penaltyDate: entryDate, pen_issuingAuth: rng() < 0.5 ? 'TfL' : 'Local Council',
            pen_appealStatus: rng() < 0.2 ? 'Appealed' : 'None', pen_paidBy: 'Company',
            pen_paymentDate: nextBusinessDayString(entryDate), pen_dateOfEntry: entryDate, pen_council: 'Westminster',
          });
        } else if (category === 'Pre-Payments') {
          amount = Math.round((50 + rng() * 400) * 100) / 100;
          feeValue = [0, 25, 40][Math.floor(rng() * 3)];
          Object.assign(fields, {
            pre_refNumber: refNumber, pre_vendor: driver.fullName, pre_amount: String(amount),
            pre_totalAmount: String(amount), pre_fee: String(feeValue), pre_paymentDate: nextBusinessDayString(entryDate),
            pre_scheduleTerms: rng() < 0.3 ? '2' : '', pre_description: 'Advance payment against upcoming earnings.',
            pre_initialPaymentDate: '',
          });
        } else if (category === 'Liquidation Damages') {
          amount = Math.round((100 + rng() * 600) * 100) / 100;
          Object.assign(fields, {
            liq_refNumber: refNumber, liq_vendor: driver.fullName, liq_routeId: String(route.routeId),
            liq_awbNumber: `AWB${1000000 + Math.floor(rng() * 8999999)}`, liq_lqCode: `LQ${10 + Math.floor(rng() * 89)}`,
            liq_amount: String(amount), liq_lqDate: entryDate, liq_paidBy: 'Company',
            liq_paymentDate: nextBusinessDayString(entryDate), liq_dateOfEntry: entryDate,
            liq_failureCode: String(1 + Math.floor(rng() * 12)), liq_description: 'Missed delivery window liquidation charge.',
          });
        } else {
          amount = Math.round((20 + rng() * 300) * 100) / 100;
          Object.assign(fields, {
            oth_refNumber: refNumber, oth_vendor: driver.fullName, oth_amount: String(amount),
            oth_incidentDate: entryDate, oth_scheduleTerms: '', oth_description: 'Miscellaneous adjustment.',
            oth_details: '',
          });
        }

        records.push({
          id: refNumber,
          dateOfIncident: entryDate,
          courierName: driver.fullName,
          type: category,
          amount,
          status,
          backendId: nextId++,
          backendType: BACKEND_TYPE_BY_CATEGORY[category],
          userId: driver.userId,
          feeValue,
          fields,
        });
      }
    }
  }

  return records.sort((a, b) => (a.dateOfIncident < b.dateOfIncident ? 1 : -1));
}

function getInitialFormState(): FormDataState {
  return {
    type: '',
    confirmCheck: false,
    rep_refNumber: '', rep_vendor: '', rep_vehicleReg: '', rep_incidentDate: getTodayString(),
    rep_totalRepairCost: '', rep_repairCost: '', rep_amount: '', rep_paymentDate: '', rep_scheduleTerms: '', rep_description: '',
    pen_refNumber: '', pen_vendor: '', pen_vehicleReg: '', pen_pcnRef: '', pen_amount: '', pen_penaltyDate: getTodayString(),
    pen_issuingAuth: '', pen_appealStatus: '', pen_paidBy: '', pen_paymentDate: '', pen_dateOfEntry: '', pen_council: '', pen_notes: '',
    pre_refNumber: '', pre_vendor: '', pre_amount: '', pre_totalAmount: '', pre_fee: '0',
    pre_paymentDate: nextBusinessDayString(getTodayString()), pre_scheduleTerms: '', pre_description: '', pre_initialPaymentDate: '',
    liq_refNumber: '', liq_vendor: '', liq_routeId: '', liq_awbNumber: '', liq_lqCode: '', liq_amount: '', liq_lqDate: getTodayString(),
    liq_paidBy: '', liq_paymentDate: '', liq_dateOfEntry: '', liq_failureCode: '', liq_description: '',
    oth_refNumber: '', oth_vendor: '', oth_amount: '', oth_incidentDate: getTodayString(), oth_scheduleTerms: '', oth_description: '', oth_details: '',
  };
}

/* ==================== Small presentational pieces ==================== */

function KpiCard({ card, value, isActive, onSelect, onAdd }: {
  card: KPICardDef; value: number; isActive: boolean; onSelect: () => void; onAdd: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div
      className={`${styles.kpiCard} ${isActive ? styles.kpiCardActive : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className={styles.kpiIcon} style={{ backgroundColor: card.bg, color: card.color }}>
        <i className={`bi ${card.icon}`} />
      </div>
      <div className={styles.kpiBody}>
        <div className={styles.kpiTitle}>{card.title}</div>
        <div className={styles.kpiValue}>{formatCurrency(value)}</div>
      </div>
      {card.hasAdd && (
        <button type="button" className={styles.kpiAddBtn} title={`Add new ${card.title} deduction`} onClick={onAdd}>
          <i className="bi bi-plus-circle" />
        </button>
      )}
    </div>
  );
}

function MonthSelector({ currentMonth, onChange }: { currentMonth: Date; onChange: (d: Date) => void }) {
  const label = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const shift = (delta: number) => onChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1));
  return (
    <div className={styles.monthSelector}>
      <button type="button" className={styles.monthNavBtn} onClick={() => shift(-1)} aria-label="Previous month">
        <i className="bi bi-chevron-left" />
      </button>
      <span className={styles.monthLabel}>{label}</span>
      <button type="button" className={styles.monthNavBtn} onClick={() => shift(1)} aria-label="Next month">
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
}

type SortField = 'id' | 'dateOfIncident' | 'courierName' | 'type' | 'amount' | 'status';

function DeductionsTable({ data, totalAmount, onView, onEdit, onDelete }: {
  data: DisplayDeduction[]; totalAmount: number;
  onView: (item: DisplayDeduction) => void; onEdit: (item: DisplayDeduction) => void; onDelete: (item: DisplayDeduction) => void;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortField(null); setSortDir('asc'); }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortField) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      let av: string | number = a[sortField] as string | number;
      let bv: string | number = b[sortField] as string | number;
      if (sortField === 'amount') {
        av = a.amount; bv = b.amount;
      } else {
        av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [data, sortField, sortDir]);

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <i className="bi bi-arrow-down-up" style={{ opacity: 0.3 }} />;
    return <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} />;
  };

  const columns: Array<{ field: SortField; label: string }> = [
    { field: 'id', label: 'ID' },
    { field: 'dateOfIncident', label: 'Date' },
    { field: 'courierName', label: 'Vendor Name' },
    { field: 'type', label: 'Type' },
    { field: 'amount', label: 'Value' },
  ];

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.field} className={styles.sortableTh} onClick={() => handleSort(col.field)}>
                {col.label} {sortIcon(col.field)}
              </th>
            ))}
            <th>Fee</th>
            <th className={styles.sortableTh} onClick={() => handleSort('status')}>Status {sortIcon('status')}</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className={styles.emptyRow}>No entries found for the selected criteria.</td>
            </tr>
          ) : (
            sorted.map((item) => (
              <tr key={`${item.backendType}-${item.backendId}`}>
                <td><strong>{item.id}</strong></td>
                <td>{item.dateOfIncident || 'N/A'}</td>
                <td>{item.courierName}</td>
                <td>{item.type}</td>
                <td><strong>{formatCurrency(item.amount)}</strong></td>
                <td>{item.backendType === 'pre-payment' && item.feeValue != null ? formatCurrency(item.feeValue) : '–'}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[`status${item.status}`]}`}>{item.status}</span>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button type="button" title="View" onClick={() => onView(item)}><i className="bi bi-eye-fill" /></button>
                    <button type="button" title="Edit" onClick={() => onEdit(item)}><i className="bi bi-pencil-fill" /></button>
                    <button type="button" title="Delete" className={styles.deleteAction} onClick={() => onDelete(item)}><i className="bi bi-trash-fill" /></button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className={styles.totalLabel}>Total</td>
            <td colSpan={4} className={styles.totalValue}>{formatCurrency(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ==================== Delete confirm modal ==================== */

function DeleteConfirmModal({ item, isDeleting, onClose, onConfirm }: {
  item: DisplayDeduction | null; isDeleting: boolean; onClose: () => void; onConfirm: () => void;
}) {
  if (!item) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className={styles.modalHeader}>
          <h2><i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc3545', marginRight: 8 }} />Confirm Delete</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} disabled={isDeleting} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Are you sure you want to delete this deduction? This action cannot be undone.</p>
          <div className={styles.reviewBox}>
            <div className={styles.reviewRow}><span>Reference Number:</span><strong>{item.id}</strong></div>
            <div className={styles.reviewRow}><span>Type:</span><strong>{item.type}</strong></div>
            <div className={styles.reviewRow}><span>Amount:</span><strong style={{ color: '#dc3545' }}>{formatCurrency(item.amount)}</strong></div>
            <div className={styles.reviewRow}><span>Vendor:</span><strong>{item.courierName}</strong></div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button type="button" className={styles.btnDanger} onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : (<><i className="bi bi-trash" /> Delete</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== Deduction wizard modal ==================== */

interface DeductionModalProps {
  show: boolean;
  entryType: DeductionCategory | '';
  vendors: string[];
  vehicles: MockVehicle[];
  routes: MockRoute[];
  formData: FormDataState;
  currentStep: number;
  isEditing: boolean;
  isViewMode: boolean;
  validationAttempted: boolean;
  onClose: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onGoToStep: (step: number) => void;
  onSubmit: () => void;
}

function DeductionModal({
  show, entryType, vendors, vehicles, routes, formData, currentStep, isEditing, isViewMode, validationAttempted,
  onClose, onInputChange, onNextStep, onPrevStep, onGoToStep, onSubmit,
}: DeductionModalProps) {
  if (!show || !entryType) return null;

  const val = (field: string) => getStringValue(formData[field]);
  const required = REQUIRED_FIELDS_BY_CATEGORY[entryType];
  const showError = (field: string) => validationAttempted && required.includes(field) && !val(field).trim();

  const installmentsPreview = useMemo(() => {
    if (isEditing || (entryType !== 'Repairs & Damages' && entryType !== 'Pre-Payments' && entryType !== 'Other')) return null;
    const amountField = AMOUNT_FIELD_BY_CATEGORY[entryType];
    const dateField = DATE_FIELD_BY_CATEGORY[entryType];
    const refField = REF_FIELD_BY_CATEGORY[entryType];
    const scheduleField = entryType === 'Repairs & Damages' ? 'rep_scheduleTerms' : entryType === 'Pre-Payments' ? 'pre_scheduleTerms' : 'oth_scheduleTerms';
    const totalAmount = parseFloat(val(amountField)) || 0;
    return calculateInstallments(totalAmount, val(scheduleField), val(refField), val(dateField));
  }, [formData, entryType, isEditing]);

  const inputCls = (field: string) => `${styles.formInput} ${showError(field) ? styles.formInputError : ''}`;

  const renderTextField = (field: string, label: string, opts?: { readOnly?: boolean; type?: string; placeholder?: string }) => (
    <div className={styles.formGroup}>
      <label>{label} {required.includes(field) && <span className={styles.requiredMark}>*</span>}</label>
      <input
        type={opts?.type || 'text'}
        name={field}
        value={val(field)}
        onChange={onInputChange}
        placeholder={opts?.placeholder}
        readOnly={isViewMode || opts?.readOnly}
        disabled={isViewMode}
        className={inputCls(field)}
      />
      {showError(field) && <div className={styles.fieldError}>{label} is required</div>}
    </div>
  );

  const renderVendorField = (field: string, label = 'Vendor') => (
    <div className={styles.formGroup}>
      <label>{label} <span className={styles.requiredMark}>*</span></label>
      <select name={field} value={val(field)} onChange={onInputChange} disabled={isViewMode} className={inputCls(field)}>
        <option value="">Select a vendor...</option>
        {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      {showError(field) && <div className={styles.fieldError}>{label} is required</div>}
    </div>
  );

  const renderVehicleField = (field: string) => (
    <div className={styles.formGroup}>
      <label>Vehicle Registration</label>
      <select name={field} value={val(field)} onChange={onInputChange} disabled={isViewMode} className={styles.formInput}>
        <option value="">Select vehicle...</option>
        {vehicles.map((v) => <option key={v.vehicleId} value={v.registrationPlates}>{v.registrationPlates}</option>)}
      </select>
    </div>
  );

  const renderAmountField = (field: string, label: string) => (
    <div className={styles.formGroup}>
      <label>{label} <span className={styles.requiredMark}>*</span></label>
      <input
        type="number" name={field} value={val(field)} onChange={onInputChange}
        placeholder="0.00" step="0.01" min="0.01" readOnly={isViewMode} disabled={isViewMode}
        className={inputCls(field)}
      />
      {showError(field) && <div className={styles.fieldError}>{label} is required and must be greater than 0</div>}
    </div>
  );

  const renderDescriptionField = (field: string, label = 'Description') => (
    <div className={styles.formGroup}>
      <label>{label}</label>
      <textarea rows={4} name={field} value={val(field)} onChange={onInputChange} readOnly={isViewMode} disabled={isViewMode} className={styles.formInput} />
    </div>
  );

  const renderStep1 = () => {
    switch (entryType) {
      case 'Repairs & Damages':
        return (
          <>
            {renderTextField('rep_refNumber', 'Reference Number', { readOnly: true, placeholder: 'Auto-generated' })}
            {renderVendorField('rep_vendor')}
            {renderVehicleField('rep_vehicleReg')}
            {renderTextField('rep_incidentDate', 'Incident Date', { type: 'date', readOnly: isEditing })}
            {renderAmountField('rep_totalRepairCost', 'Total Repair Cost')}
            {renderTextField('rep_scheduleTerms', 'Schedule Terms', { placeholder: 'e.g. 3' })}
          </>
        );
      case 'Traffic Penalties':
        return (
          <>
            {renderTextField('pen_refNumber', 'Reference Number', { readOnly: true, placeholder: 'Auto-generated' })}
            {renderVendorField('pen_vendor')}
            {renderVehicleField('pen_vehicleReg')}
            {renderTextField('pen_pcnRef', 'PCN Reference')}
            {renderAmountField('pen_amount', 'Amount')}
            {renderTextField('pen_penaltyDate', 'PCN Date', { type: 'date' })}
            {renderTextField('pen_issuingAuth', 'Issuing Authority')}
            {renderTextField('pen_appealStatus', 'Appeal Status')}
            {renderTextField('pen_paidBy', 'Paid By')}
            {isEditing && renderTextField('pen_paymentDate', 'Payment Date', { type: 'date' })}
            {renderTextField('pen_dateOfEntry', 'Entry Date', { type: 'date' })}
            {renderTextField('pen_council', 'Council')}
          </>
        );
      case 'Pre-Payments':
        return (
          <>
            {renderTextField('pre_refNumber', 'Reference Number', { readOnly: true, placeholder: 'Auto-generated' })}
            {renderVendorField('pre_vendor')}
            {renderAmountField('pre_totalAmount', 'Total Amount')}
            {renderTextField('pre_paymentDate', 'Payment Date', { type: 'date', readOnly: isEditing })}
            {!isViewMode && (
              <div className={styles.formGroup}>
                <label>Start Month</label>
                <input type="month" name="pre_initialPaymentDate" value={val('pre_initialPaymentDate')} onChange={onInputChange} className={styles.formInput} />
                <p className={styles.fieldHint}>Month the first deduction starts. Leave empty to start this month.</p>
              </div>
            )}
            {renderTextField('pre_scheduleTerms', 'Schedule Terms', { placeholder: 'e.g. 3' })}
            <div className={styles.formGroup}>
              <label>Fees <span className={styles.requiredMark}>*</span></label>
              <select name="pre_fee" value={val('pre_fee')} onChange={onInputChange} disabled={isViewMode} className={styles.formInput}>
                <option value="0">0 pounds</option>
                <option value="25">25 pounds</option>
                <option value="40">40 pounds</option>
              </select>
            </div>
          </>
        );
      case 'Liquidation Damages':
        return (
          <>
            {renderTextField('liq_refNumber', 'Reference Number', { readOnly: true, placeholder: 'Auto-generated' })}
            {renderVendorField('liq_vendor')}
            <div className={styles.formGroup}>
              <label>Route <span className={styles.requiredMark}>*</span></label>
              <select name="liq_routeId" value={val('liq_routeId')} onChange={onInputChange} disabled={isViewMode} className={styles.formInput}>
                <option value="">Select route...</option>
                {routes.map((r) => <option key={r.routeId} value={r.routeId}>{r.routeName}</option>)}
              </select>
            </div>
            {renderTextField('liq_lqCode', 'Code')}
            {renderAmountField('liq_amount', 'Amount')}
            {renderTextField('liq_awbNumber', 'AWB Booking')}
            {renderTextField('liq_lqDate', 'Liquidation Date', { type: 'date' })}
            {isEditing && renderTextField('liq_paymentDate', 'Payment Date', { type: 'date' })}
            {isEditing && renderTextField('liq_dateOfEntry', 'Entry Date', { type: 'date' })}
            {renderTextField('liq_failureCode', 'Failure Code', { type: 'number' })}
            {renderTextField('liq_paidBy', 'Paid By')}
          </>
        );
      case 'Other':
        return (
          <>
            {renderTextField('oth_refNumber', 'Reference Number', { readOnly: true, placeholder: 'Auto-generated' })}
            {renderVendorField('oth_vendor')}
            {renderAmountField('oth_amount', 'Amount')}
            {renderTextField('oth_incidentDate', 'Incident Date', { type: 'date', readOnly: isEditing })}
            {renderTextField('oth_scheduleTerms', 'Schedule Terms', { placeholder: 'e.g. 3' })}
          </>
        );
      default:
        return null;
    }
  };

  const renderStep2 = () => (
    <>
      {entryType === 'Repairs & Damages' && renderDescriptionField('rep_description')}
      {entryType === 'Traffic Penalties' && renderDescriptionField('pen_notes', 'Additional Notes')}
      {entryType === 'Pre-Payments' && renderDescriptionField('pre_description')}
      {entryType === 'Liquidation Damages' && renderDescriptionField('liq_description')}
      {entryType === 'Other' && (
        <>
          {renderDescriptionField('oth_description')}
          {renderDescriptionField('oth_details', 'Detail')}
        </>
      )}

      {installmentsPreview && installmentsPreview.length > 0 && (
        <div className={styles.formGroup}>
          <label>Installments Preview</label>
          <div className={styles.installmentsBox}>
            <p>This deduction will be split into {installmentsPreview.length} installment(s):</p>
            <table className={styles.installmentsTable}>
              <thead>
                <tr><th>#</th><th>Reference</th><th>Date</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {installmentsPreview.map((inst) => (
                  <tr key={inst.installmentNumber}>
                    <td>{inst.installmentNumber}</td>
                    <td>{inst.referenceNumber}</td>
                    <td>{formatDisplayDate(inst.date)}</td>
                    <td>{formatCurrency(inst.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={styles.fieldHint}>Preview only — the deduction is recorded as a single entry for the full amount.</p>
          </div>
        </div>
      )}
    </>
  );

  const renderReviewRow = (label: string, value: string) => (
    <div className={styles.reviewRow}><span>{label}:</span><strong>{value || 'N/A'}</strong></div>
  );

  const renderStep3 = () => {
    const vendorField = VENDOR_FIELD_BY_CATEGORY[entryType];
    const dateField = DATE_FIELD_BY_CATEGORY[entryType];
    const amountField = AMOUNT_FIELD_BY_CATEGORY[entryType];
    const refField = REF_FIELD_BY_CATEGORY[entryType];
    return (
      <>
        <div className={styles.reviewBox}>
          {renderReviewRow('Type', entryType)}
          {renderReviewRow('Reference Number', val(refField))}
          {renderReviewRow('Vendor', val(vendorField))}
          {renderReviewRow('Date', formatDisplayDate(val(dateField)))}
          {renderReviewRow('Amount', formatCurrency(val(amountField)))}
        </div>
        {!isViewMode && (
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="confirmCheck" checked={Boolean(formData.confirmCheck)} onChange={onInputChange} />
              <span>I confirm that the information above is correct</span>
            </label>
            {validationAttempted && !formData.confirmCheck && (
              <div className={styles.fieldError}>Please confirm that the information is correct</div>
            )}
          </div>
        )}
      </>
    );
  };

  const modalTitle = isViewMode ? `View ${entryType}` : isEditing ? `Edit ${entryType}` : `New Entry: ${entryType}`;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{modalTitle}</h2>
          <button type="button" className={styles.modalCloseBtn} onClick={onClose} aria-label="Close"><i className="bi bi-x-lg" /></button>
        </div>

        <div className={styles.modalBody}>
          {!isViewMode && (
            <nav className={styles.wizardNav}>
              {['1. Basic Information', '2. Details & Documentation', '3. Review & Confirmation'].map((label, idx) => {
                const step = idx + 1;
                return (
                  <button
                    key={step}
                    type="button"
                    className={`${styles.wizardTab} ${currentStep === step ? styles.wizardTabActive : ''}`}
                    disabled={currentStep < step}
                    onClick={() => onGoToStep(step)}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          )}

          {currentStep === 1 && <div className={styles.formGrid}>{renderStep1()}</div>}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        <div className={styles.modalFooter}>
          {currentStep > 1 && <button type="button" className={styles.btnSecondary} onClick={onPrevStep}>Previous</button>}
          {currentStep < 3 && <button type="button" className={styles.btnPrimary} onClick={onNextStep}>Next</button>}
          {!isViewMode && currentStep === 3 && <button type="button" className={styles.btnSuccess} onClick={onSubmit}>Save Entry</button>}
          <button type="button" className={styles.btnSecondary} onClick={onClose}>{isViewMode ? 'Close' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}

/* ==================== Main page ==================== */

export function DeductionsDisbursementsRecharges() {
  const [deductions, setDeductions] = useState<DisplayDeduction[]>(() => buildInitialDeductions());
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | DeductionCategory>('All');

  const [showModal, setShowModal] = useState(false);
  const [modalEntryType, setModalEntryType] = useState<DeductionCategory | ''>('');
  const [editingItem, setEditingItem] = useState<DisplayDeduction | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormDataState>(() => getInitialFormState());
  const [validationAttempted, setValidationAttempted] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<DisplayDeduction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const nextIdRef = useRef(1000);

  const vendors = useMemo(() => MOCK_DRIVERS.map((d) => d.fullName).sort(), []);

  const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

  const monthRecords = useMemo(
    () => deductions.filter((d) => d.dateOfIncident.startsWith(monthKey)),
    [deductions, monthKey]
  );

  const kpiTotals = useMemo(() => {
    const totals: Record<string, number> = { Total: 0 };
    for (const c of CATEGORIES) totals[c] = 0;
    for (const item of monthRecords) {
      if (item.amount > 0) {
        totals.Total += item.amount;
        totals[item.type] += item.amount;
      }
    }
    return totals;
  }, [monthRecords]);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return monthRecords.filter((item) => {
      if (activeFilter !== 'All' && item.type !== activeFilter) return false;
      if (query && !item.courierName.toLowerCase().includes(query) && !item.id.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [monthRecords, activeFilter, searchQuery]);

  const tableTotal = useMemo(() => filteredData.reduce((sum, d) => sum + (d.amount > 0 ? d.amount : 0), 0), [filteredData]);

  const openModalForNewEntry = useCallback((category: DeductionCategory) => {
    setModalEntryType(category);
    setEditingItem(null);
    setIsViewMode(false);
    setFormData({ ...getInitialFormState(), type: category });
    setCurrentStep(1);
    setValidationAttempted(false);
    setShowModal(true);
  }, []);

  const openModalForView = useCallback((item: DisplayDeduction, viewOnly: boolean) => {
    setModalEntryType(item.type);
    setEditingItem(item);
    setIsViewMode(viewOnly);
    setFormData({ ...getInitialFormState(), ...item.fields, type: item.type });
    setCurrentStep(1);
    setValidationAttempted(false);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
    setIsViewMode(false);
    setFormData(getInitialFormState());
    setCurrentStep(1);
    setValidationAttempted(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, type } = e.target;
    const nextValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: nextValue };
      if (!editingItem && modalEntryType) {
        const vendorField = VENDOR_FIELD_BY_CATEGORY[modalEntryType];
        const refField = REF_FIELD_BY_CATEGORY[modalEntryType];
        if (name === vendorField && typeof nextValue === 'string' && nextValue.trim()) {
          const dateField = DATE_FIELD_BY_CATEGORY[modalEntryType];
          updated[refField] = generateReferenceNumber(modalEntryType, nextValue.trim(), deductions, getStringValue(prev[dateField]));
        }
      }
      return updated;
    });
  }, [editingItem, modalEntryType, deductions]);

  const validateStep = useCallback((step: number, data: FormDataState, category: DeductionCategory | ''): boolean => {
    if (step === 1) {
      if (!category) return false;
      return REQUIRED_FIELDS_BY_CATEGORY[category].every((field) => {
        const value = getStringValue(data[field]);
        if (!value.trim()) return false;
        if (field === AMOUNT_FIELD_BY_CATEGORY[category]) {
          const num = Number.parseFloat(value);
          return Number.isFinite(num) && num > 0;
        }
        return true;
      });
    }
    if (step === 3) return Boolean(data.confirmCheck);
    return true;
  }, []);

  const handleNextStep = useCallback(() => {
    if (!validateStep(currentStep, formData, modalEntryType)) {
      setValidationAttempted(true);
      return;
    }
    setValidationAttempted(false);
    setCurrentStep((s) => s + 1);
  }, [currentStep, formData, modalEntryType, validateStep]);

  const handlePrevStep = useCallback(() => setCurrentStep((s) => Math.max(1, s - 1)), []);

  const handleGoToStep = useCallback((step: number) => {
    if (step <= currentStep) setCurrentStep(step);
  }, [currentStep]);

  const handleSave = useCallback(() => {
    if (!modalEntryType || !validateStep(3, formData, modalEntryType)) {
      setValidationAttempted(true);
      return;
    }

    const amountField = AMOUNT_FIELD_BY_CATEGORY[modalEntryType];
    const vendorField = VENDOR_FIELD_BY_CATEGORY[modalEntryType];
    const dateField = DATE_FIELD_BY_CATEGORY[modalEntryType];
    const refField = REF_FIELD_BY_CATEGORY[modalEntryType];

    const amount = Number.parseFloat(getStringValue(formData[amountField])) || 0;
    const courierName = getStringValue(formData[vendorField]);
    const driver = MOCK_DRIVERS.find((d) => d.fullName === courierName);
    if (!driver) return;

    const feeValue = modalEntryType === 'Pre-Payments' ? Number.parseFloat(getStringValue(formData.pre_fee)) || 0 : undefined;

    if (editingItem) {
      setDeductions((prev) => prev.map((d) => (
        d.backendId === editingItem.backendId
          ? {
              ...d,
              dateOfIncident: getStringValue(formData[dateField]) || d.dateOfIncident,
              courierName,
              amount,
              userId: driver.userId,
              feeValue,
              fields: { ...formData },
            }
          : d
      )));
    } else {
      const newRecord: DisplayDeduction = {
        id: getStringValue(formData[refField]) || generateReferenceNumber(modalEntryType, courierName, deductions),
        dateOfIncident: getStringValue(formData[dateField]) || getTodayString(),
        courierName,
        type: modalEntryType,
        amount,
        status: 'Pending',
        backendId: nextIdRef.current++,
        backendType: BACKEND_TYPE_BY_CATEGORY[modalEntryType],
        userId: driver.userId,
        feeValue,
        fields: { ...formData },
      };
      setDeductions((prev) => [newRecord, ...prev]);
    }

    closeModal();
  }, [modalEntryType, formData, editingItem, deductions, validateStep, closeModal]);

  const handleDeleteConfirm = useCallback(() => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeductions((prev) => prev.filter((d) => d.backendId !== itemToDelete.backendId));
    setIsDeleting(false);
    setItemToDelete(null);
  }, [itemToDelete]);

  const handleExportCsv = useCallback(() => {
    const headers = ['ID', 'Date', 'Vendor Name', 'Type', 'Amount', 'Status'];
    const rows = filteredData.map((d) => [d.id, d.dateOfIncident || 'N/A', d.courierName, d.type, d.amount.toFixed(2), d.status]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `deductions-${monthKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [filteredData, monthKey]);

  return (
    <PortalLayout mainClassName="ddr-container container-fluid px-3 px-lg-4 py-4" title="Deductions & Recharges">
      <div className={styles.page}>
        <p className={styles.pageSubtitle}>Period: {currentMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>

        <div className={styles.toolbarRow}>
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>

        <div className={styles.kpiGrid}>
          {KPI_CARDS.map((card) => (
            <KpiCard
              key={card.key}
              card={card}
              value={card.filterType === 'All' ? kpiTotals.Total : kpiTotals[card.filterType]}
              isActive={activeFilter === card.filterType}
              onSelect={() => setActiveFilter(card.filterType)}
              onAdd={(e) => {
                e.stopPropagation();
                if (card.filterType !== 'All') openModalForNewEntry(card.filterType);
              }}
            />
          ))}
        </div>

        <div className={styles.searchExportRow}>
          <div className={styles.searchBox}>
            <i className="bi bi-search" />
            <input
              type="search"
              placeholder="Search by vendor or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" className={styles.btnExport} onClick={handleExportCsv}>
            <i className="bi bi-download" /> Export CSV
          </button>
        </div>

        <div className={styles.tableCard}>
          <DeductionsTable
            data={filteredData}
            totalAmount={tableTotal}
            onView={(item) => openModalForView(item, true)}
            onEdit={(item) => openModalForView(item, false)}
            onDelete={(item) => setItemToDelete(item)}
          />
        </div>
      </div>

      <DeductionModal
        show={showModal}
        entryType={modalEntryType}
        vendors={vendors}
        vehicles={MOCK_VEHICLES}
        routes={MOCK_ROUTES}
        formData={formData}
        currentStep={currentStep}
        isEditing={Boolean(editingItem)}
        isViewMode={isViewMode}
        validationAttempted={validationAttempted}
        onClose={closeModal}
        onInputChange={handleInputChange}
        onNextStep={handleNextStep}
        onPrevStep={handlePrevStep}
        onGoToStep={handleGoToStep}
        onSubmit={handleSave}
      />

      <DeleteConfirmModal
        item={itemToDelete}
        isDeleting={isDeleting}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </PortalLayout>
  );
}
