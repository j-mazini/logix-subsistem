import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import {
  getAllInvoices,
  getAvailableMonths,
  formatCurrency,
  formatDate,
  SERVICE_PARTNERS,
  type Invoice,
  type SortField,
  type SortDirection,
} from '../../data/financialInvoicesData';
import { exportInvoicesToPDF } from './utils/pdfExport';
import { InvoiceDetailsModal } from './components/InvoiceDetailsModal';
import { NewInvoiceModal } from './components/NewInvoiceModal';
import { MultipleInvoicesModal } from './components/MultipleInvoicesModal';
import '../../styles/legacy/financial-invoices.css';

/*
 * Ported from app/(private)/financial-invoices/page.tsx + its ~20 sub-
 * components. This SPA has no login/userType branching per page (see
 * RequestsAdmin.tsx / AdhocInvoiceManagement.tsx), so the "admin" branches
 * from the Next.js source (userTypeId === ADMIN gating the stats/table/
 * actions bar) render unconditionally — there's no driver/supervisor view
 * to fall back to here. Consolidated into one file + 3 modal components
 * rather than the source's DesktopView/MobileContentView/FilterBar/
 * InvoiceTable/InvoiceCard/... split, following this repo's single-file
 * page convention (AdhocInvoiceManagement.tsx).
 */

const SORT_LABELS: Record<SortField, string> = {
  invoiceNumber: 'Record ID',
  courier: 'Vendor',
  referenceDate: 'Period',
  invoiceCreatedOn: 'Created On',
  totalPayment: 'Amount',
  totalStops: 'Total Stops',
};

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') return <i className="bi bi-arrow-up" />;
  if (direction === 'desc') return <i className="bi bi-arrow-down" />;
  return <i className="bi bi-arrow-down-up fi-sort-idle" />;
}

export function FinancialInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => getAllInvoices());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedServicePartnerId, setSelectedServicePartnerId] = useState('');
  const [sortField, setSortField] = useState<SortField>('courier');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isMultipleInvoicesOpen, setIsMultipleInvoicesOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('fi-page');
    return () => document.body.classList.remove('fi-page');
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(t);
  }, [selectedPeriod, selectedServicePartnerId]);

  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const periodFilteredInvoices = useMemo(() => {
    if (selectedPeriod === 'all') return invoices;
    return invoices.filter((inv) => inv.referenceDate.slice(0, 7) === selectedPeriod);
  }, [invoices, selectedPeriod]);

  const filteredInvoices = useMemo(() => {
    let list = periodFilteredInvoices;
    if (selectedServicePartnerId) {
      const spName = SERVICE_PARTNERS.find((sp) => String(sp.servicePartnerId) === selectedServicePartnerId)?.partnerName;
      list = list.filter((inv) => inv.servicePartnerName === spName);
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (inv) =>
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(term)) ||
        (inv.courier && inv.courier.toLowerCase().includes(term)),
    );
  }, [periodFilteredInvoices, selectedServicePartnerId, searchTerm]);

  const sortedInvoices = useMemo(() => {
    if (!sortDirection) return filteredInvoices;
    const sorted = [...filteredInvoices].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'invoiceNumber':
          comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
          break;
        case 'courier':
          comparison = (a.courier || '').toLowerCase().localeCompare((b.courier || '').toLowerCase());
          break;
        case 'referenceDate':
          comparison = new Date(a.referenceDate || 0).getTime() - new Date(b.referenceDate || 0).getTime();
          break;
        case 'invoiceCreatedOn':
          comparison = new Date(a.invoiceCreatedOn || 0).getTime() - new Date(b.invoiceCreatedOn || 0).getTime();
          break;
        case 'totalPayment':
          comparison = (a.totalPayment || 0) - (b.totalPayment || 0);
          break;
        case 'totalStops':
          comparison = (a.totalStops || 0) - (b.totalStops || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredInvoices, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField('courier');
      } else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  const totalInvoices = sortedInvoices.length;
  const totalAmount = sortedInvoices.reduce((sum, inv) => sum + (inv.totalPayment || 0), 0);
  const uniqueCouriers = new Set(sortedInvoices.map((inv) => inv.courier).filter(Boolean)).size;

  const periodLabel = selectedPeriod === 'all' ? 'All periods' : availableMonths.find((m) => m.value === selectedPeriod)?.label || selectedPeriod;

  function handleInvoiceCreated(created: Invoice | Invoice[]) {
    setInvoices(getAllInvoices());
    void created;
  }

  const sortableColumns: SortField[] = ['invoiceNumber', 'courier', 'referenceDate', 'invoiceCreatedOn', 'totalPayment'];

  return (
    <PortalLayout mainClassName="fi-container container-fluid px-3 px-lg-4 py-4" title="Financial Invoices" hideAnnouncements>
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-journal-text" />
            <span>{periodLabel}</span>
          </p>
        </div>
      </div>

      <div className="fi-controls-bar">
        <div className="fi-controls-left">
          <div className="search-input-wrap fi-search-wrap">
            <i className="bi bi-search" />
            <input
              type="text"
              className="form-control"
              placeholder="Search by ID or Vendor…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select className="form-select filter-select" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="all">All Periods</option>
            {availableMonths.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            className="form-select filter-select"
            value={selectedServicePartnerId}
            onChange={(e) => setSelectedServicePartnerId(e.target.value)}
          >
            <option value="">All Service Partners</option>
            {SERVICE_PARTNERS.map((sp) => (
              <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                {sp.partnerName}
              </option>
            ))}
          </select>
        </div>

        <div className="fi-controls-actions">
          <button type="button" className="styled-button styled-button--primary" onClick={() => setIsNewInvoiceOpen(true)}>
            <i className="bi bi-file-earmark-plus" /> New Single Invoice
          </button>
          <button type="button" className="styled-button styled-button--primary" onClick={() => setIsMultipleInvoicesOpen(true)}>
            <i className="bi bi-files" /> New Multiple Invoices
          </button>
          <button
            type="button"
            className="styled-button styled-button--outline"
            disabled={sortedInvoices.length === 0}
            onClick={() => exportInvoicesToPDF(sortedInvoices, periodLabel)}
          >
            <i className="bi bi-file-earmark-pdf" /> Export PDF
          </button>
        </div>
      </div>

      <section className="fi-stats-section">
        <div className="fi-stat-card fi-stat-card--blue">
          <div className="fi-stat-icon"><i className="bi bi-journal" /></div>
          <div className="fi-stat-body">
            <span className="fi-stat-label">Total Invoices</span>
            <span className="fi-stat-value">{totalInvoices}</span>
          </div>
        </div>
        <div className="fi-stat-card fi-stat-card--green">
          <div className="fi-stat-icon"><i className="bi bi-cash-stack" /></div>
          <div className="fi-stat-body">
            <span className="fi-stat-label">Total Amount</span>
            <span className="fi-stat-value">£{formatCurrency(totalAmount)}</span>
          </div>
        </div>
        <div className="fi-stat-card fi-stat-card--amber">
          <div className="fi-stat-icon"><i className="bi bi-truck" /></div>
          <div className="fi-stat-body">
            <span className="fi-stat-label">Couriers</span>
            <span className="fi-stat-value">{uniqueCouriers}</span>
          </div>
        </div>
      </section>

      {/* Desktop table */}
      <div className="fi-table-card d-none d-md-block">
        <div className="fi-table-scroll">
          <table className="fi-table">
            <thead>
              <tr>
                {sortableColumns.map((field) => (
                  <th key={field} onClick={() => handleSort(field)} className={field === 'totalPayment' ? 'text-end' : undefined}>
                    <button type="button" className="fi-sort-btn">
                      {SORT_LABELS[field]}
                      <SortIcon direction={sortField === field ? sortDirection : null} />
                    </button>
                  </th>
                ))}
                <th>Service Partner</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="fi-table-message">Loading invoices…</td>
                </tr>
              ) : sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="fi-table-message">No invoices found for this period.</td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => (
                  <tr key={inv.invoiceId}>
                    <td className="fw-semibold">{inv.invoiceNumber}</td>
                    <td>{inv.courier}</td>
                    <td>{formatDate(inv.referenceDate)}</td>
                    <td>{formatDate(inv.invoiceCreatedOn)}</td>
                    <td className="text-end fw-semibold">£{formatCurrency(inv.totalPayment)}</td>
                    <td className="fi-muted">{inv.servicePartnerName || '—'}</td>
                    <td className="text-end">
                      <button type="button" className="fi-link-btn" onClick={() => setSelectedInvoice(inv)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="fi-mobile-list d-md-none">
        {isLoading ? (
          <div className="fi-mobile-message">Loading invoices…</div>
        ) : sortedInvoices.length === 0 ? (
          <div className="fi-mobile-message">No invoices found.</div>
        ) : (
          sortedInvoices.map((inv) => (
            <div key={inv.invoiceId} className="fi-mobile-card" onClick={() => setSelectedInvoice(inv)}>
              <div className="fi-mobile-card-head">
                <div>
                  <h3>{inv.invoiceNumber}</h3>
                  <p>{inv.courier}</p>
                  {inv.servicePartnerName && <p className="fi-mobile-sp">{inv.servicePartnerName}</p>}
                </div>
              </div>
              <div className="fi-mobile-card-row">
                <span>Period:</span>
                <span>{formatDate(inv.referenceDate)}</span>
              </div>
              <div className="fi-mobile-card-row">
                <span>Amount:</span>
                <span className="fw-semibold">£{formatCurrency(inv.totalPayment)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedInvoice && <InvoiceDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
      {isNewInvoiceOpen && (
        <NewInvoiceModal onClose={() => setIsNewInvoiceOpen(false)} onCreated={handleInvoiceCreated} />
      )}
      {isMultipleInvoicesOpen && (
        <MultipleInvoicesModal onClose={() => setIsMultipleInvoicesOpen(false)} onCreated={handleInvoiceCreated} />
      )}
    </PortalLayout>
  );
}
