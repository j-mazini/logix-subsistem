import React, { useState, useMemo } from 'react';
import NavbarWrapper from "@/components/navbar-wrapper";
import { ModernPageHeader } from "@/components/modern-page-header";
import './InvoiceDashboard.css';
import { getMockInvoices, MOCK_INVOICES, type InvoiceItem } from './mockData';
import { Button } from './components/Button';
import { useSubmitGuard } from './hooks/useSubmitGuard';

interface Filters {
  period: string;
  status: string;
  search: string;
}

interface NewInvoiceForm {
  vendor: string;
  period: string;
  amount: string;
  status: string;
}

const USE_GENERATED_MOCK = false;

const StatusTag = ({ status }: { status: InvoiceItem['status'] }) => {
  let statusClass = '';
  let icon = '';
  const statusText = status;

  switch (status) {
    case 'Pending Verification':
      statusClass = 'pending';
      icon = 'bi-hourglass-split';
      break;
    case 'Ready for Invoicing':
      statusClass = 'approved';
      icon = 'bi-check-circle';
      break;
    case 'Invoices':
      statusClass = 'sent';
      icon = 'bi-file-earmark-check';
      break;
    default:
      statusClass = 'draft';
      icon = 'bi-circle';
  }

  return (
    <span className={`status-tag ${statusClass}`}>
      <i className={`bi ${icon}`}></i> {statusText}
    </span>
  );
};

const StatCard = ({ iconClass, iconColorClass, label, value }: {
  iconClass: string;
  iconColorClass: string;
  label: string;
  value: string;
}) => (
  <div className="col-sm-6 col-xl-3">
    <div className="stat-card reveal visible">
      <div className={`stat-card-icon ${iconColorClass}`}>
        <i className={`bi ${iconClass}`}></i>
      </div>
      <div className="stat-card-info">
        <label>{label}</label>
        <span className="value">{value}</span>
      </div>
    </div>
  </div>
);

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() => {
    try {
      return getMockInvoices(USE_GENERATED_MOCK, 50);
    } catch {
      return MOCK_INVOICES;
    }
  });
  const [filters, setFilters] = useState<Filters>({
    period: 'all',
    status: 'all',
    search: ''
  });

  const [showNewModal, setShowNewModal] = useState(false);
  const { guard } = useSubmitGuard();
  const [showMultiModal, setShowMultiModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceItem | null>(null);

  const [newInvoiceForm, setNewInvoiceForm] = useState<NewInvoiceForm>({
    vendor: '',
    period: '',
    amount: '',
    status: 'Pending Verification'
  });
  const [multiInvoiceText, setMultiInvoiceText] = useState('');

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }), []);

  const periods = useMemo(() => {
    return [...new Set(invoices.map(item => item.period))].sort().reverse();
  }, [invoices]);

  const filteredData = useMemo(() => {
    return invoices.filter(item => {
      const matchesPeriod = filters.period === 'all' || item.period === filters.period;
      const matchesStatus = filters.status === 'all' || item.status === filters.status;
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = item.recordId.toLowerCase().includes(searchLower) ||
                            item.vendor.toLowerCase().includes(searchLower);
      return matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [invoices, filters]);

  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + curr.amount, 0);
    const pending = filteredData
      .filter(i => i.status === 'Pending Verification')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const ready = filteredData
      .filter(i => i.status === 'Ready for Invoicing')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const sent = filteredData
      .filter(i => i.status === 'Invoices')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      total: currencyFormatter.format(total),
      pending: currencyFormatter.format(pending),
      ready: currencyFormatter.format(ready),
      sent: currencyFormatter.format(sent),
      totalCount: filteredData.length,
      pendingCount: filteredData.filter(i => i.status === 'Pending Verification').length,
      readyCount: filteredData.filter(i => i.status === 'Ready for Invoicing').length,
      sentCount: filteredData.filter(i => i.status === 'Invoices').length,
    };
  }, [filteredData, currencyFormatter]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const generateRecordId = (): string => {
    const maxRecordNum = invoices.reduce((max, item) => {
      try {
        const num = parseInt(item.recordId.split('-')[2]);
        return num > max ? num : max;
      } catch { return max; }
    }, 0);
    return `INV-2024-${String(maxRecordNum + 1).padStart(3, '0')}`;
  };

  const handleCreateSingleInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = Math.max(...invoices.map(i => i.id), 0) + 1;
    const newInvoice: InvoiceItem = {
      id: newId,
      recordId: generateRecordId(),
      vendor: newInvoiceForm.vendor,
      period: newInvoiceForm.period,
      amount: parseFloat(newInvoiceForm.amount),
      status: 'Pending Verification'
    };

    setInvoices([...invoices, newInvoice]);
    setShowNewModal(false);
    setNewInvoiceForm({ vendor: '', period: '', amount: '', status: 'Pending Verification' });
    alert(`Invoice generated for ${newInvoice.vendor}!`);
  };

  const handleCreateMultiInvoice = () => {
    if (!multiInvoiceText.trim()) return;

    const lines = multiInvoiceText.split('\n');
    const newInvoices: InvoiceItem[] = [];
    let currentMaxId = Math.max(...invoices.map(i => i.id), 0);

    lines.forEach((line) => {
        if (!line.trim()) return;
        const parts = line.split(',');
        if (parts.length >= 3) {
            currentMaxId++;
            newInvoices.push({
                id: currentMaxId,
                recordId: `INV-2024-${String(900 + currentMaxId).padStart(3, '0')}`,
                vendor: parts[0].trim(),
                period: parts[1].trim(),
                amount: parseFloat(parts[2].trim()) || 0,
                status: 'Pending Verification'
            });
        }
    });

    setInvoices([...invoices, ...newInvoices]);
    setShowMultiModal(false);
    setMultiInvoiceText('');
    alert(`${newInvoices.length} invoices created!`);
  };

  const handleUpdateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    setInvoices(prev => prev.map(inv =>
      inv.id === editingInvoice.id ? editingInvoice : inv
    ));
    setEditingInvoice(null);
  };

  return (
    <NavbarWrapper>
      <div className="invoice-dashboard-container pt-6">
        <div className="wrapper">
          <div id="main-content">

            {/* PAGE HEADER */}
            <div className="invoice-history-tw-scope mb-4">
              <ModernPageHeader
                title="Invoice Processing"
                subtitle="Invoice history and management"
                metrics={[
                  { label: 'Total Invoices', value: stats.totalCount },
                  { label: 'Pending', value: stats.pendingCount },
                  { label: 'Ready', value: stats.readyCount },
                  { label: 'Sent', value: stats.sentCount },
                ]}
                gradientFrom="slate-900"
                gradientTo="indigo-600"
              />
            </div>

            <div className="page-content">

              {/* ACTION BAR */}
              <div className="content-actions-bar reveal visible">
                <div className="actions-top-row">
                  <input
                    type="search"
                    className="form-control"
                    style={{maxWidth: '350px', flexGrow: 1}}
                    placeholder="Search by ID or Vendor..."
                    id="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                  />
                  <div className="ms-auto d-flex gap-2">
                    <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
                      <i className="bi bi-file-earmark-plus"></i> Generate Single
                    </button>
                    <button className="btn btn-outline-primary" onClick={() => setShowMultiModal(true)}>
                      <i className="bi bi-files"></i> Create Multiple
                    </button>
                    <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
                      <i className="bi bi-download"></i> Export
                    </button>
                  </div>
                </div>

                <div className="filter-groups-row">
                  <div className="filter-group">
                    <strong className="text-nowrap">Period:</strong>
                    <select className="form-select form-select-sm" id="period" value={filters.period} onChange={handleFilterChange}>
                      <option value="all">All Periods</option>
                      {periods.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <strong className="text-nowrap">Status:</strong>
                    <select className="form-select form-select-sm" id="status" value={filters.status} onChange={handleFilterChange}>
                      <option value="all">All Status</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Ready for Invoicing">Ready for Invoicing</option>
                      <option value="Invoices">Invoices</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* STATS */}
              <section className="summary-stats mb-4">
                <div className="row g-3 justify-content-around">
                  <StatCard iconClass="bi-file-earmark-text-fill" iconColorClass="blue" label="Total Value" value={stats.total} />
                  <StatCard iconClass="bi-clock-fill" iconColorClass="yellow" label="Pending Verification" value={stats.pending} />
                  <StatCard iconClass="bi-check-circle-fill" iconColorClass="green" label="Ready for Invoicing" value={stats.ready} />
                </div>
              </section>

              {/* TABLE */}
              <div className="card table-container reveal visible">
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Record ID</th>
                          <th>Vendor</th>
                          <th>Period</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.length > 0 ? filteredData.map((item) => (
                          <tr key={item.id}>
                            <td><span className="fw-medium">{item.recordId}</span></td>
                            <td><span className="fw-medium">{item.vendor}</span></td>
                            <td><span className="text-muted">{item.period}</span></td>
                            <td><span className="fw-medium">{currencyFormatter.format(item.amount)}</span></td>
                            <td><StatusTag status={item.status} /></td>
                            <td>
                              <button className="btn btn-icon edit-btn" onClick={() => setEditingInvoice({...item})} title="Edit">
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button className="btn btn-icon" title="View Details">
                                <i className="bi bi-eye"></i>
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={6} className="no-results text-center py-5">
                              <i className="bi bi-search display-4 text-muted"></i>
                              <p className="text-muted mt-2">No invoices found for the applied filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- MODALS --- */}

        {/* 1. New Invoice Modal */}
        {showNewModal && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">New Single Invoice</h5>
                  <button type="button" className="btn-close" onClick={() => setShowNewModal(false)}></button>
                </div>
                <form onSubmit={guard(handleCreateSingleInvoice)}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label">Vendor</label>
                        <input type="text" className="form-control" required
                          value={newInvoiceForm.vendor}
                          onChange={e => setNewInvoiceForm({...newInvoiceForm, vendor: e.target.value})}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Period (YYYY-MM)</label>
                        <input type="text" className="form-control" placeholder="2024-10" required
                          value={newInvoiceForm.period}
                          onChange={e => setNewInvoiceForm({...newInvoiceForm, period: e.target.value})}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Amount</label>
                        <input type="number" step="0.01" className="form-control" required
                          value={newInvoiceForm.amount}
                          onChange={e => setNewInvoiceForm({...newInvoiceForm, amount: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-light" onClick={() => setShowNewModal(false)}>Cancel</button>
                    <Button type="submit">Generate</Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 2. Multi Invoice Modal */}
        {showMultiModal && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">New Multiple Invoices</h5>
                  <button type="button" className="btn-close" onClick={() => setShowMultiModal(false)}></button>
                </div>
                <div className="modal-body p-4">
                  <p className="text-muted">Format: <code>Vendor Name,Period,Amount</code></p>
                  <textarea className="form-control" rows={10}
                    placeholder="Rapid Transport,2024-12,1500.00"
                    value={multiInvoiceText}
                    onChange={e => setMultiInvoiceText(e.target.value)}
                  ></textarea>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowMultiModal(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleCreateMultiInvoice}>Create Invoices</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Edit Modal */}
        {editingInvoice && (
          <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-0">
                  <h5 className="modal-title">Edit Invoice</h5>
                  <button type="button" className="btn-close" onClick={() => setEditingInvoice(null)}></button>
                </div>
                <form onSubmit={guard(handleUpdateInvoice)}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Record ID</label>
                        <input type="text" className="form-control" value={editingInvoice.recordId} disabled readOnly />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Period</label>
                        <input type="text" className="form-control" value={editingInvoice.period}
                          onChange={e => setEditingInvoice({...editingInvoice, period: e.target.value})} required />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Vendor</label>
                        <input type="text" className="form-control" value={editingInvoice.vendor}
                          onChange={e => setEditingInvoice({...editingInvoice, vendor: e.target.value})} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Amount</label>
                        <input type="number" step="0.01" className="form-control" value={editingInvoice.amount}
                          onChange={e => setEditingInvoice({...editingInvoice, amount: parseFloat(e.target.value)})} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={editingInvoice.status}
                          onChange={e => setEditingInvoice({...editingInvoice, status: e.target.value as InvoiceItem['status']})}>
                          <option value="Pending Verification">Pending Verification</option>
                          <option value="Ready for Invoicing">Ready for Invoicing</option>
                          <option value="Invoices">Invoices</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-light" onClick={() => setEditingInvoice(null)}>Cancel</button>
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </NavbarWrapper>
  );
}
