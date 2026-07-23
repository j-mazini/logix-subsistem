// Local (non-shared) typed accessors + business logic over window.DHL_MOCK_DATA's
// `vendors` bucket, used only by the Drivers ("Vendors") page. Ported 1:1 from
// sp-portal/drivers/drivers.js's pure helper functions (courier-id derivation,
// training/document expiry rules, filter/sort). Kept separate from
// dhlMockData.ts (which other pages/agents are editing concurrently) — see
// dhl-mock-data.js's MOCK_VENDORS for the raw shape.
import { getRawContractProviders } from './contractsData';

export interface Vendor {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dob?: string | null;
  depot?: string;
  route?: string | null;
  serviceProvider: string;
  vendorType?: string;
  paymentModel?: string;
  startDate?: string;
  finishDate?: string | null;
  status?: string;
  cargoTraining?: boolean;
  dangerousGoodsTraining?: boolean;
  manualHandlingTraining?: boolean;
  cargoTrainingDate?: string | null;
  dangerousGoodsTrainingDate?: string | null;
  manualHandlingTrainingDate?: string | null;
  dhlTrainingNumber?: string | null;
  criminalRecordDate?: string | null;
  dbsNumber?: string | null;
  dvlaCheckDate?: string | null;
  visaValidity?: string | null;
  licenceExpiringDate?: string | null;
  passportExpiringDate?: string | null;
  courierId?: string;
}

const SORT_DAYS_EXPIRING = 30;

function getData(): { vendors?: Vendor[] } | undefined {
  return window.DHL_MOCK_DATA as { vendors?: Vendor[] } | undefined;
}

export function getAllMockVendors(): Vendor[] {
  return getData()?.vendors || [];
}

export function getDepotsForSp(spName: string): string[] {
  const out: string[] = [];
  const seen: Record<string, boolean> = {};
  getRawContractProviders().forEach((c) => {
    if (c.serviceProvider !== spName) return;
    (c.depots || []).forEach((d) => {
      if (d.name && !seen[d.name]) {
        seen[d.name] = true;
        out.push(d.name);
      }
    });
  });
  return out.sort();
}

export function getRoutesForSp(spName: string): string[] {
  const out: string[] = [];
  const seen: Record<string, boolean> = {};
  getRawContractProviders().forEach((c) => {
    if (c.serviceProvider !== spName) return;
    (c.depots || []).forEach((d) => {
      (d.loops || []).forEach((l) => {
        (l.routes || []).forEach((r) => {
          if (r.name && !seen[r.name]) {
            seen[r.name] = true;
            out.push(r.name);
          }
        });
      });
    });
  });
  return out.sort();
}

/** Courier ID: max 7 chars from first name + initials of surname, total 8. */
export function computeCourierId(firstName: string, lastName: string): string {
  const first = (firstName || '').replace(/\s/g, '').toUpperCase().slice(0, 7);
  const need = 8 - first.length;
  const lastRaw = (lastName || '').trim();
  const initials = lastRaw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const rest = lastRaw.replace(/\s/g, '').toUpperCase();
  const part2 = (initials + rest).slice(0, need);
  return (first + part2).slice(0, 8);
}

export function formatDateOnly(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseYMD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = String(s).split('-');
  if (parts.length < 3) return null;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  return isNaN(d.getTime()) ? null : d;
}

export function getTrainingExpiryDate(v: Vendor): Date | null {
  const dates = [v.cargoTrainingDate, v.dangerousGoodsTrainingDate, v.manualHandlingTrainingDate]
    .map(parseYMD)
    .filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  latest.setFullYear(latest.getFullYear() + 2);
  return latest;
}

export function isExpired(expiryDate: Date | string | null | undefined): boolean {
  if (!expiryDate) return false;
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  return d.getTime() < Date.now();
}

export function isExpiringSoon(expiryDate: Date | string | null | undefined, days = SORT_DAYS_EXPIRING): boolean {
  if (!expiryDate) return false;
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return d.getTime() <= limit.getTime() && d.getTime() >= Date.now();
}

export interface StatusMeta {
  label: string;
  className: string;
}

export function getTrainingStatus(v: Vendor): StatusMeta {
  const expiry = getTrainingExpiryDate(v);
  if (!expiry) return { label: 'Incomplete', className: 'status-badge-incomplete' };
  if (isExpired(expiry)) return { label: 'Expired', className: 'status-badge-expiring' };
  if (isExpiringSoon(expiry)) return { label: 'Expiring Soon', className: 'status-badge-warning' };
  return { label: 'Complete', className: 'status-badge-active' };
}

export type SingleTrainingStatus = 'pending' | 'expiring' | 'warning' | 'active';

/** Status for a single training (date + 2 years = expiry). */
export function getSingleTrainingStatus(trainingDate: string | null | undefined): SingleTrainingStatus {
  if (!trainingDate) return 'pending';
  const d = parseYMD(trainingDate);
  if (!d) return 'pending';
  const expiry = new Date(d);
  expiry.setFullYear(expiry.getFullYear() + 2);
  if (isExpired(expiry)) return 'expiring';
  if (isExpiringSoon(expiry)) return 'warning';
  return 'active';
}

export type DocumentItemStatus = 'verified' | 'pending' | 'expiring' | 'warning' | 'active' | null;

/** Status for a document (expiry dates: expired/expiring/ok; check dates: verified/pending). */
export function getDocumentItemStatus(key: 'criminalRecord' | 'dvlaCheck' | 'visa' | 'licence' | 'passport', v: Vendor): DocumentItemStatus {
  if (key === 'criminalRecord' || key === 'dvlaCheck') {
    const date = key === 'criminalRecord' ? v.criminalRecordDate : v.dvlaCheckDate;
    return date ? 'verified' : 'pending';
  }
  const dateStr =
    (key === 'visa' && v.visaValidity) ||
    (key === 'licence' && v.licenceExpiringDate) ||
    (key === 'passport' && v.passportExpiringDate) ||
    null;
  if (!dateStr) return null;
  const d = parseYMD(dateStr);
  if (!d) return null;
  if (isExpired(d)) return 'expiring';
  if (isExpiringSoon(d)) return 'warning';
  return 'active';
}

export function getDocumentsStatus(v: Vendor): StatusMeta {
  if (!v.criminalRecordDate || !v.dvlaCheckDate) return { label: 'Pending', className: 'status-badge-pending' };
  const items: Date[] = [];
  if (v.dvlaCheckDate) {
    const dvlaExp = new Date(v.dvlaCheckDate);
    dvlaExp.setMonth(dvlaExp.getMonth() + 6);
    items.push(dvlaExp);
  }
  if (v.licenceExpiringDate) items.push(new Date(v.licenceExpiringDate));
  if (v.passportExpiringDate) items.push(new Date(v.passportExpiringDate));
  if (v.visaValidity) items.push(new Date(v.visaValidity));
  if (items.length === 0) return { label: 'Verified', className: 'status-badge-active' };
  const minExp = new Date(Math.min(...items.map((d) => d.getTime())));
  if (isExpired(minExp)) return { label: 'Expired', className: 'status-badge-expiring' };
  if (isExpiringSoon(minExp)) return { label: 'Expiring Soon', className: 'status-badge-warning' };
  return { label: 'Verified', className: 'status-badge-active' };
}

export function isVendorExpiring(v: Vendor): boolean {
  const t = getTrainingStatus(v);
  const d = getDocumentsStatus(v);
  return t.label === 'Expiring Soon' || t.label === 'Expired' || d.label === 'Expiring Soon' || d.label === 'Expired';
}

export function isVendorPending(v: Vendor): boolean {
  return !v.criminalRecordDate || !v.dvlaCheckDate;
}

export function vendorTypeLabel(v: Vendor): string {
  return v.vendorType === '2' ? 'Subcontractor' : 'Driver';
}

export function statusBadgeClass(v: Vendor): string {
  if (v.status === 'Active') return 'status-badge-active';
  if (v.status === 'Inactive') return 'status-badge-inactive';
  if (v.status === 'Pending') return 'status-badge-pending';
  return 'status-badge-default';
}

export type StatusFilter = 'all' | 'active' | 'inactive' | 'expiring' | 'pending';
export type SortKey = 'name' | 'vendorType' | 'route' | 'status' | 'startDate';

export function filterAndSortVendors(all: Vendor[], query: string, statusFilter: StatusFilter, sortKey: SortKey, sortDir: 1 | -1): Vendor[] {
  const q = query.trim().toLowerCase();
  const list = all.filter((v) => {
    const name = `${v.firstName || ''} ${v.lastName || ''}`.toLowerCase();
    const email = (v.email || '').toLowerCase();
    if (q && name.indexOf(q) === -1 && email.indexOf(q) === -1) return false;
    if (statusFilter === 'active') {
      if (v.status) {
        if (v.status !== 'Active') return false;
      } else if (v.finishDate && new Date(v.finishDate) <= new Date()) return false;
    }
    if (statusFilter === 'inactive') {
      if (v.status) {
        if (v.status !== 'Inactive') return false;
      } else if (!v.finishDate || new Date(v.finishDate) > new Date()) return false;
    }
    if (statusFilter === 'pending' && !isVendorPending(v)) return false;
    if (statusFilter === 'expiring' && (!isVendorExpiring(v) || (v.status && v.status !== 'Active'))) return false;
    return true;
  });

  list.sort((a, b) => {
    let va: string, vb: string;
    switch (sortKey) {
      case 'name':
        va = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
        vb = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      case 'vendorType':
        va = (a.vendorType || '').toString();
        vb = (b.vendorType || '').toString();
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      case 'route':
        va = (a.route || '').toString().toLowerCase();
        vb = (b.route || '').toString().toLowerCase();
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      case 'status':
        va = (a.status || '').toLowerCase();
        vb = (b.status || '').toLowerCase();
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      case 'startDate':
        va = a.startDate || '';
        vb = b.startDate || '';
        return sortDir * (va < vb ? -1 : va > vb ? 1 : 0);
      default:
        return 0;
    }
  });
  return list;
}
