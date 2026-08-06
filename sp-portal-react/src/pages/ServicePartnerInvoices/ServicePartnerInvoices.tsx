import { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import {
  getDeductions,
  getInvoicesForMonth,
  getServicePartners,
  type Deduction,
} from '../../data/servicePartnerInvoicesData';
import { monthYearLabel } from './utils/format';
import { ServicePartnerMonthView } from './components/ServicePartnerMonthView';
import { DeductionsTabView } from './components/DeductionsTabView';
import { GenerateInvoiceModal } from './components/GenerateInvoiceModal';
import { DeductionFormModal } from './components/DeductionFormModal';
import { DeleteDeductionModal } from './components/DeleteDeductionModal';
import '../../styles/legacy/service-partner-invoices.css';

/*
 * Ported from app/(private)/service-partner-invoices/page.tsx + its 13
 * sub-components (~2,960 lines total). This SPA has no backend and no
 * useAuth()/BUSINESS_RULES user-type gating (see RequestsAdmin.tsx /
 * AdhocInvoiceManagement.tsx for the same pattern), so `canManageDeductions`
 * — which hid deduction management from SERVICE_PARTNER-type users — renders
 * unconditionally true; there's no driver/service-partner login here to
 * restrict it for. React Query's cache invalidation is replaced by a local
 * `refreshKey` bump that re-reads the mock store, mirroring
 * FinancialInvoices.tsx / AdhocInvoiceManagement.tsx's local-state convention.
 */

type Tab = 'invoices' | 'deductions';

export function ServicePartnerInvoices() {
  const [selectedSpId, setSelectedSpId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [activeTab, setActiveTab] = useState<Tab>('invoices');
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [deletingDeduction, setDeletingDeduction] = useState<Deduction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.body.classList.add('spi-page');
    return () => document.body.classList.remove('spi-page');
  }, []);

  const servicePartners = getServicePartners();
  const month = selectedMonth.getMonth() + 1;
  const year = selectedMonth.getFullYear();
  const servicePartnerId = selectedSpId ? Number(selectedSpId) : undefined;

  const invoices = useMemo(
    () => getInvoicesForMonth(month, year, servicePartnerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, year, servicePartnerId, refreshKey],
  );
  const deductions = useMemo(
    () => getDeductions(month, year, servicePartnerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month, year, servicePartnerId, refreshKey],
  );

  const monthLabel = useMemo(() => monthYearLabel(month, year), [month, year]);

  const changeMonth = (delta: number) => {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleAddDeduction = () => {
    setEditingDeduction(null);
    setDeductionModalOpen(true);
  };

  const handleEditDeduction = (deduction: Deduction) => {
    if (deduction.service_partner_invoice_id) return;
    setEditingDeduction(deduction);
    setDeductionModalOpen(true);
  };

  const handleDeleteDeduction = (deduction: Deduction) => {
    if (deduction.service_partner_invoice_id) return;
    setDeletingDeduction(deduction);
  };

  return (
    <PortalLayout mainClassName="spi-container container-fluid px-3 px-lg-4 py-4" title="Service Partner Invoices" hideAnnouncements>
      <div className="page-header-section">
        <div className="page-header-welcome-text">
          <p className="page-header-date">
            <i className="bi bi-receipt-cutoff" />
            <span>Monthly invoice summary by service partner</span>
          </p>
        </div>
      </div>

      <div className="spi-controls-bar">
        <div className="spi-controls-left">
          <select className="form-select filter-select" value={selectedSpId} onChange={(e) => setSelectedSpId(e.target.value)}>
            <option value="">All Service Partners</option>
            {servicePartners.map((sp) => (
              <option key={sp.servicePartnerId} value={String(sp.servicePartnerId)}>
                {sp.partnerName}
              </option>
            ))}
          </select>

          <div className="spi-period-nav">
            <button type="button" className="spi-icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <i className="bi bi-chevron-left" />
            </button>
            <span className="spi-period-label">{monthLabel}</span>
            <button type="button" className="spi-icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      </div>

      <div className="spi-tabs">
        <button type="button" className={`spi-tab ${activeTab === 'invoices' ? 'spi-tab--active' : ''}`} onClick={() => setActiveTab('invoices')}>
          Invoices
        </button>
        <button type="button" className={`spi-tab ${activeTab === 'deductions' ? 'spi-tab--active' : ''}`} onClick={() => setActiveTab('deductions')}>
          Deductions &amp; Reimbursements
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <div className="spi-tab-panel">
          <div className="spi-tab-actions">
            <button type="button" className="spi-btn spi-btn--outline-primary" onClick={() => setShowSingleModal(true)}>
              Single Invoice
            </button>
            <button type="button" className="spi-btn spi-btn--outline-primary" onClick={() => setShowMultiModal(true)}>
              Multi Invoice
            </button>
          </div>

          <ServicePartnerMonthView invoices={invoices} />
        </div>
      ) : (
        <div className="spi-tab-panel">
          <div className="spi-tab-actions">
            <button type="button" className="spi-btn spi-btn--primary" onClick={handleAddDeduction}>
              <i className="bi bi-plus-lg" /> Add New
            </button>
          </div>

          <DeductionsTabView deductions={deductions} canManage onEdit={handleEditDeduction} onDelete={handleDeleteDeduction} />
        </div>
      )}

      {showSingleModal && (
        <GenerateInvoiceModal
          mode="single"
          initialMonth={selectedMonth}
          onClose={() => setShowSingleModal(false)}
          onSuccess={bumpRefresh}
        />
      )}
      {showMultiModal && (
        <GenerateInvoiceModal
          mode="multi"
          initialMonth={selectedMonth}
          onClose={() => setShowMultiModal(false)}
          onSuccess={bumpRefresh}
        />
      )}
      {deductionModalOpen && (
        <DeductionFormModal
          deduction={editingDeduction}
          deductions={deductions}
          defaultServicePartnerId={servicePartnerId}
          month={month}
          year={year}
          onClose={() => setDeductionModalOpen(false)}
          onSuccess={bumpRefresh}
        />
      )}
      {deletingDeduction && (
        <DeleteDeductionModal deduction={deletingDeduction} onClose={() => setDeletingDeduction(null)} onSuccess={bumpRefresh} />
      )}
    </PortalLayout>
  );
}
