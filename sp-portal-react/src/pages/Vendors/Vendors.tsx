import { useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/vendors.css';

/* ==================== TYPES ==================== */

type VendorType = 'individual' | 'company' | 'cooperative';
type RegistrationStatus = 'active' | 'inactive' | 'suspended' | 'blocked';
type ContractStatus = 'not_signed' | 'signed' | 'under_review' | 'expired';
type ServiceType = 'delivery' | 'pickup' | 'distribution' | 'handling' | 'consultation' | 'other';
type SortKey = 'name' | 'email' | 'phone' | 'city' | 'status' | 'rating' | 'createdDate';
type SortDir = 1 | -1;
type ToastType = 'success' | 'error' | 'info' | 'warning';
type ViewMode = 'list' | 'detail' | 'create' | 'edit';

interface Vendor {
  id: number;
  legalName: string;
  tradeName?: string;
  vendorType: VendorType;
  documentNumber: string;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string;
  website?: string;
  fax?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  referencePoints?: string;
  services: ServiceType[];
  operatingSince: string;
  employees?: number;
  vehicles?: number;
  certifications?: string[];
  bankName?: string;
  accountNumber?: string;
  accountType?: 'checking' | 'savings';
  routingNumber?: string;
  taxRegime?: 'simple' | 'presumed' | 'real';
  contractStatus: ContractStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  contractDocument?: string;
  notes?: string;
  rating?: number;
  tags?: string[];
  status: RegistrationStatus;
  createdDate: string;
  modifiedDate: string;
  createdBy: string;
  modifiedBy: string;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface FilterState {
  status?: RegistrationStatus;
  vendorType?: VendorType;
  serviceType?: ServiceType;
  state?: string;
  rating?: number;
  dateRange?: { from: string; to: string };
}

/* ==================== CONSTANTS ==================== */

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  individual: 'Individual (Pessoa Física)',
  company: 'Company (Pessoa Jurídica)',
  cooperative: 'Cooperative (Cooperativa)',
};

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  blocked: 'Blocked',
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  not_signed: 'Not Signed',
  signed: 'Signed',
  under_review: 'Under Review',
  expired: 'Expired',
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  distribution: 'Distribution',
  handling: 'Handling',
  consultation: 'Consultation',
  other: 'Other',
};

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

/* ==================== MOCK DATA GENERATOR ==================== */

function generateMockVendors(count: number): Vendor[] {
  const vendors: Vendor[] = [];
  const adjectives = ['Premium', 'Express', 'Global', 'Local', 'Fast', 'Reliable', 'Smart', 'Eco'];
  const nouns = ['Logistics', 'Delivery', 'Transport', 'Services', 'Shipping', 'Express', 'Solutions'];
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza', 'Brasília', 'Manaus'];
  const services: ServiceType[] = ['delivery', 'pickup', 'distribution', 'handling'];

  for (let i = 0; i < count; i++) {
    const isCompany = Math.random() > 0.4;
    const vendorType: VendorType = isCompany
      ? (Math.random() > 0.7 ? 'cooperative' : 'company')
      : 'individual';

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const legalName = `${adjective} ${noun} ${i + 1}`;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const state = BR_STATES[Math.floor(Math.random() * BR_STATES.length)];

    vendors.push({
      id: i + 1,
      legalName,
      tradeName: Math.random() > 0.5 ? legalName.toUpperCase() : undefined,
      vendorType,
      documentNumber: isCompany
        ? `${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}/0001-${Math.floor(Math.random() * 100)}`
        : `${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 1000)}-${Math.floor(Math.random() * 100)}`,
      email: `${legalName.toLowerCase().replace(/\s+/g, '.')}@vendor.com`,
      primaryPhone: `+55 (${Math.floor(Math.random() * 90) + 10}) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      street: `${Math.floor(Math.random() * 5000) + 1} Vendor Street`,
      number: String(Math.floor(Math.random() * 999) + 1),
      neighborhood: 'Business District',
      city,
      state,
      zipCode: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`,
      country: 'Brazil',
      services: services.slice(0, Math.floor(Math.random() * 3) + 1),
      operatingSince: new Date(Math.random() * Date.now()).toISOString().split('T')[0],
      employees: Math.random() > 0.5 ? Math.floor(Math.random() * 500) + 1 : undefined,
      vehicles: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 1 : undefined,
      certifications: Math.random() > 0.7 ? ['ISO 9001', 'ISO 14001'] : undefined,
      contractStatus: (['not_signed', 'signed', 'under_review', 'expired'] as ContractStatus[])[Math.floor(Math.random() * 4)],
      status: (['active', 'inactive', 'suspended', 'blocked'] as RegistrationStatus[])[Math.floor(Math.random() * 4)],
      notes: Math.random() > 0.7 ? 'Reliable partner with good track record' : undefined,
      rating: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : undefined,
      tags: Math.random() > 0.6 ? ['premium', 'verified'] : undefined,
      createdDate: new Date(Math.random() * Date.now()).toISOString().split('T')[0],
      modifiedDate: new Date().toISOString().split('T')[0],
      createdBy: 'System',
      modifiedBy: 'System',
    });
  }

  return vendors.sort((a, b) => a.legalName.localeCompare(b.legalName));
}

/* ==================== MAIN COMPONENT ==================== */

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>(generateMockVendors(25));
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Filter and search
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!vendor.legalName.toLowerCase().includes(term) &&
            !vendor.email.toLowerCase().includes(term) &&
            !vendor.primaryPhone.includes(term) &&
            !vendor.documentNumber.includes(term)) {
          return false;
        }
      }

      if (filters.status && vendor.status !== filters.status) return false;
      if (filters.vendorType && vendor.vendorType !== filters.vendorType) return false;
      if (filters.state && vendor.state !== filters.state) return false;
      if (filters.rating && vendor.rating !== filters.rating) return false;

      return true;
    });
  }, [vendors, searchTerm, filters]);

  // Sort
  const sortedVendors = useMemo(() => {
    const sorted = [...filteredVendors];
    sorted.sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

      switch (sortKey) {
        case 'name':
          aVal = a.legalName;
          bVal = b.legalName;
          break;
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'phone':
          aVal = a.primaryPhone;
          bVal = b.primaryPhone;
          break;
        case 'city':
          aVal = a.city;
          bVal = b.city;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'rating':
          aVal = a.rating || 0;
          bVal = b.rating || 0;
          break;
        case 'createdDate':
          aVal = a.createdDate;
          bVal = b.createdDate;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir * aVal.localeCompare(bVal);
      }
      return sortDir * ((aVal as number) - (bVal as number));
    });
    return sorted;
  }, [filteredVendors, sortKey, sortDir]);

  // Pagination
  const pageCount = Math.ceil(sortedVendors.length / pageSize);
  const paginatedVendors = sortedVendors.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const handleAddVendor = () => {
    setViewMode('create');
    setSelectedVendor(null);
  };

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setViewMode('detail');
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setViewMode('edit');
  };

  const handleDeleteVendor = (vendor: Vendor) => {
    setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
    showToast(`Vendor "${vendor.legalName}" deleted`, 'success');
  };

  if (viewMode === 'detail' && selectedVendor) {
    return (
      <PortalLayout mainClassName="vendors-detail-container container-fluid px-3 px-lg-4 py-4" title="Vendor Details">
        <VendorDetailView
          vendor={selectedVendor}
          onBack={() => setViewMode('list')}
          onEdit={() => {
            setViewMode('edit');
          }}
          onDelete={() => {
            handleDeleteVendor(selectedVendor);
            setViewMode('list');
          }}
        />
      </PortalLayout>
    );
  }

  if ((viewMode === 'create' || viewMode === 'edit') && selectedVendor !== null) {
    return (
      <PortalLayout mainClassName="vendors-form-container container-fluid px-3 px-lg-4 py-4" title={viewMode === 'edit' ? 'Edit Vendor' : 'Add Vendor'}>
        <VendorFormView
          vendor={selectedVendor}
          isEdit={viewMode === 'edit'}
          onSave={(vendor) => {
            if (viewMode === 'create') {
              setVendors((prev) => [...prev, { ...vendor, id: Math.max(...prev.map((v) => v.id)) + 1 }]);
              showToast(`Vendor "${vendor.legalName}" created`, 'success');
            } else {
              setVendors((prev) => prev.map((v) => (v.id === vendor.id ? vendor : v)));
              showToast(`Vendor "${vendor.legalName}" updated`, 'success');
            }
            setViewMode('list');
          }}
          onCancel={() => setViewMode('list')}
        />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout mainClassName="vendors-container container-fluid px-3 px-lg-4 py-4" title="Vendor Management">
      <div className="vendors-list">
        <div className="vendors-header">
          <h1>Vendor Management</h1>
          <button className="btn btn-primary" onClick={handleAddVendor}>
            + Add Vendor
          </button>
        </div>

        <div className="vendors-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, phone, document..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
          />

          <div className="filters-row">
            <select
              className="filter-select"
              value={filters.status || ''}
              onChange={(e) => {
                setFilters({ ...filters, status: (e.target.value as RegistrationStatus) || undefined });
                setCurrentPage(0);
              }}
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.vendorType || ''}
              onChange={(e) => {
                setFilters({ ...filters, vendorType: (e.target.value as VendorType) || undefined });
                setCurrentPage(0);
              }}
            >
              <option value="">All Types</option>
              {Object.entries(VENDOR_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filters.state || ''}
              onChange={(e) => {
                setFilters({ ...filters, state: e.target.value || undefined });
                setCurrentPage(0);
              }}
            >
              <option value="">All States</option>
              {BR_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        <div className="vendors-table-wrapper">
          <table className="vendors-table">
            <thead>
              <tr>
                <th
                  className={`sort-header ${sortKey === 'name' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'name') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('name');
                      setSortDir(1);
                    }
                  }}
                >
                  Name
                </th>
                <th
                  className={`sort-header ${sortKey === 'email' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'email') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('email');
                      setSortDir(1);
                    }
                  }}
                >
                  Email
                </th>
                <th
                  className={`sort-header ${sortKey === 'phone' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'phone') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('phone');
                      setSortDir(1);
                    }
                  }}
                >
                  Phone
                </th>
                <th
                  className={`sort-header ${sortKey === 'city' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'city') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('city');
                      setSortDir(1);
                    }
                  }}
                >
                  City
                </th>
                <th
                  className={`sort-header ${sortKey === 'status' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'status') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('status');
                      setSortDir(1);
                    }
                  }}
                >
                  Status
                </th>
                <th
                  className={`sort-header ${sortKey === 'rating' ? `sort-${sortDir > 0 ? 'asc' : 'desc'}` : ''}`}
                  onClick={() => {
                    if (sortKey === 'rating') {
                      setSortDir(sortDir === 1 ? -1 : 1);
                    } else {
                      setSortKey('rating');
                      setSortDir(1);
                    }
                  }}
                >
                  Rating
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVendors.map((vendor) => (
                <tr key={vendor.id} className={`vendor-row status-${vendor.status}`}>
                  <td className="vendor-name">{vendor.legalName}</td>
                  <td className="vendor-email">{vendor.email}</td>
                  <td className="vendor-phone">{vendor.primaryPhone}</td>
                  <td className="vendor-city">{vendor.city}</td>
                  <td className="vendor-status">
                    <span className={`status-badge status-${vendor.status}`}>
                      {STATUS_LABELS[vendor.status]}
                    </span>
                  </td>
                  <td className="vendor-rating">
                    {vendor.rating ? `⭐ ${vendor.rating}/5` : '—'}
                  </td>
                  <td className="vendor-actions">
                    <button
                      className="btn-icon"
                      title="View"
                      onClick={() => handleViewVendor(vendor)}
                    >
                      👁️
                    </button>
                    <button
                      className="btn-icon"
                      title="Edit"
                      onClick={() => handleEditVendor(vendor)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      title="Delete"
                      onClick={() => handleDeleteVendor(vendor)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-controls">
          <span>
            Page {currentPage + 1} of {pageCount} ({sortedVendors.length} vendors)
          </span>
          <div className="pagination-buttons">
            <button
              className="btn btn-secondary"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            >
              ← Previous
            </button>
            <button
              className="btn btn-secondary"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setCurrentPage(Math.min(pageCount - 1, currentPage + 1))}
            >
              Next →
            </button>
          </div>
        </div>

        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}

/* ==================== DETAIL VIEW ==================== */

interface DetailViewProps {
  vendor: Vendor;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VendorDetailView({ vendor, onBack, onEdit, onDelete }: DetailViewProps) {
  return (
    <div className="vendor-detail-view">
      <div className="detail-header">
        <button className="btn btn-ghost" onClick={onBack}>
          ← Back
        </button>
        <h1>{vendor.legalName}</h1>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={onEdit}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-content">
        <section className="detail-section">
          <h2>Basic Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Legal Name</label>
              <p>{vendor.legalName}</p>
            </div>
            <div className="detail-item">
              <label>Trade Name</label>
              <p>{vendor.tradeName || '—'}</p>
            </div>
            <div className="detail-item">
              <label>Vendor Type</label>
              <p>{VENDOR_TYPE_LABELS[vendor.vendorType]}</p>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <p>
                <span className={`status-badge status-${vendor.status}`}>
                  {STATUS_LABELS[vendor.status]}
                </span>
              </p>
            </div>
            <div className="detail-item">
              <label>Document Number</label>
              <p>{vendor.documentNumber}</p>
            </div>
            <div className="detail-item">
              <label>Rating</label>
              <p>{vendor.rating ? `⭐ ${vendor.rating}/5` : '—'}</p>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h2>Contact Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Email</label>
              <p>{vendor.email}</p>
            </div>
            <div className="detail-item">
              <label>Primary Phone</label>
              <p>{vendor.primaryPhone}</p>
            </div>
            <div className="detail-item">
              <label>Secondary Phone</label>
              <p>{vendor.secondaryPhone || '—'}</p>
            </div>
            <div className="detail-item">
              <label>Website</label>
              <p>{vendor.website ? <a href={vendor.website}>{vendor.website}</a> : '—'}</p>
            </div>
            <div className="detail-item">
              <label>Fax</label>
              <p>{vendor.fax || '—'}</p>
            </div>
          </div>
        </section>

        <section className="detail-section">
          <h2>Address</h2>
          <div className="detail-grid">
            <div className="detail-item full-width">
              <label>Street</label>
              <p>
                {vendor.street}, {vendor.number} {vendor.complement && `- ${vendor.complement}`}
              </p>
            </div>
            <div className="detail-item">
              <label>Neighborhood</label>
              <p>{vendor.neighborhood}</p>
            </div>
            <div className="detail-item">
              <label>City</label>
              <p>{vendor.city}</p>
            </div>
            <div className="detail-item">
              <label>State</label>
              <p>{vendor.state}</p>
            </div>
            <div className="detail-item">
              <label>ZIP Code</label>
              <p>{vendor.zipCode}</p>
            </div>
            <div className="detail-item">
              <label>Country</label>
              <p>{vendor.country}</p>
            </div>
            {vendor.referencePoints && (
              <div className="detail-item full-width">
                <label>Reference Points</label>
                <p>{vendor.referencePoints}</p>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h2>Services</h2>
          <div className="service-badges">
            {vendor.services.map((service) => (
              <span key={service} className="service-badge">
                {SERVICE_LABELS[service]}
              </span>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <h2>Operational Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Operating Since</label>
              <p>{new Date(vendor.operatingSince).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="detail-item">
              <label>Employees</label>
              <p>{vendor.employees ? `${vendor.employees}` : '—'}</p>
            </div>
            <div className="detail-item">
              <label>Vehicles</label>
              <p>{vendor.vehicles ? `${vendor.vehicles}` : '—'}</p>
            </div>
            {vendor.certifications && vendor.certifications.length > 0 && (
              <div className="detail-item full-width">
                <label>Certifications</label>
                <p>{vendor.certifications.join(', ')}</p>
              </div>
            )}
          </div>
        </section>

        <section className="detail-section">
          <h2>Contract</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Contract Status</label>
              <p>{CONTRACT_STATUS_LABELS[vendor.contractStatus]}</p>
            </div>
            <div className="detail-item">
              <label>Start Date</label>
              <p>
                {vendor.contractStartDate
                  ? new Date(vendor.contractStartDate).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
            <div className="detail-item">
              <label>End Date</label>
              <p>
                {vendor.contractEndDate
                  ? new Date(vendor.contractEndDate).toLocaleDateString('pt-BR')
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {vendor.notes && (
          <section className="detail-section">
            <h2>Notes</h2>
            <p>{vendor.notes}</p>
          </section>
        )}

        <section className="detail-section">
          <h2>System Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Created</label>
              <p>
                {new Date(vendor.createdDate).toLocaleDateString('pt-BR')} by {vendor.createdBy}
              </p>
            </div>
            <div className="detail-item">
              <label>Modified</label>
              <p>
                {new Date(vendor.modifiedDate).toLocaleDateString('pt-BR')} by {vendor.modifiedBy}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ==================== FORM VIEW ==================== */

interface FormViewProps {
  vendor: Vendor;
  isEdit: boolean;
  onSave: (vendor: Vendor) => void;
  onCancel: () => void;
}

function VendorFormView({ vendor, isEdit, onSave, onCancel }: FormViewProps) {
  const [formData, setFormData] = useState<Vendor>(vendor);

  const handleChange = (field: keyof Vendor, value: unknown) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName || !formData.documentNumber || !formData.email) {
      alert('Please fill in required fields');
      return;
    }
    onSave({
      ...formData,
      modifiedDate: new Date().toISOString().split('T')[0],
      modifiedBy: 'Current User',
    });
  };

  return (
    <div className="vendor-form-view">
      <div className="form-header">
        <button className="btn btn-ghost" onClick={onCancel}>
          ← Back
        </button>
        <h1>{isEdit ? 'Edit Vendor' : 'New Vendor'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="vendor-form">
        <section className="form-section">
          <h2>Basic Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="legalName">Legal Name *</label>
              <input
                id="legalName"
                type="text"
                value={formData.legalName}
                onChange={(e) => handleChange('legalName', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="tradeName">Trade Name</label>
              <input
                id="tradeName"
                type="text"
                value={formData.tradeName || ''}
                onChange={(e) => handleChange('tradeName', e.target.value || undefined)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vendorType">Vendor Type *</label>
              <select
                id="vendorType"
                value={formData.vendorType}
                onChange={(e) => handleChange('vendorType', e.target.value)}
                required
              >
                {Object.entries(VENDOR_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                required
              >
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="documentNumber">Document Number *</label>
              <input
                id="documentNumber"
                type="text"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="rating">Rating</label>
              <select
                id="rating"
                value={formData.rating || ''}
                onChange={(e) => handleChange('rating', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    ⭐ {n}/5
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Contact Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="primaryPhone">Primary Phone *</label>
              <input
                id="primaryPhone"
                type="tel"
                value={formData.primaryPhone}
                onChange={(e) => handleChange('primaryPhone', e.target.value)}
                placeholder="+55 (XX) 9XXXX-XXXX"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="secondaryPhone">Secondary Phone</label>
              <input
                id="secondaryPhone"
                type="tel"
                value={formData.secondaryPhone || ''}
                onChange={(e) => handleChange('secondaryPhone', e.target.value || undefined)}
                placeholder="+55 (XX) 9XXXX-XXXX"
              />
            </div>
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value || undefined)}
                placeholder="https://example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="fax">Fax</label>
              <input
                id="fax"
                type="tel"
                value={formData.fax || ''}
                onChange={(e) => handleChange('fax', e.target.value || undefined)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Address</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="street">Street *</label>
              <input
                id="street"
                type="text"
                value={formData.street}
                onChange={(e) => handleChange('street', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="number">Number *</label>
              <input
                id="number"
                type="text"
                value={formData.number}
                onChange={(e) => handleChange('number', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="complement">Complement</label>
              <input
                id="complement"
                type="text"
                value={formData.complement || ''}
                onChange={(e) => handleChange('complement', e.target.value || undefined)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="neighborhood">Neighborhood *</label>
              <input
                id="neighborhood"
                type="text"
                value={formData.neighborhood}
                onChange={(e) => handleChange('neighborhood', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="state">State *</label>
              <select
                id="state"
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                required
              >
                <option value="">Select state</option>
                {BR_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="zipCode">ZIP Code *</label>
              <input
                id="zipCode"
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleChange('zipCode', e.target.value)}
                placeholder="XXXXX-XXX"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="referencePoints">Reference Points</label>
              <textarea
                id="referencePoints"
                value={formData.referencePoints || ''}
                onChange={(e) => handleChange('referencePoints', e.target.value || undefined)}
                rows={3}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Services</h2>
          <div className="checkbox-group">
            {Object.entries(SERVICE_LABELS).map(([key, label]) => (
              <label key={key} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.services.includes(key as ServiceType)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleChange('services', [...formData.services, key as ServiceType]);
                    } else {
                      handleChange(
                        'services',
                        formData.services.filter((s) => s !== key)
                      );
                    }
                  }}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Operational Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="operatingSince">Operating Since *</label>
              <input
                id="operatingSince"
                type="date"
                value={formData.operatingSince}
                onChange={(e) => handleChange('operatingSince', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="employees">Employees</label>
              <input
                id="employees"
                type="number"
                value={formData.employees || ''}
                onChange={(e) => handleChange('employees', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="vehicles">Vehicles</label>
              <input
                id="vehicles"
                type="number"
                value={formData.vehicles || ''}
                onChange={(e) => handleChange('vehicles', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Contract</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contractStatus">Contract Status *</label>
              <select
                id="contractStatus"
                value={formData.contractStatus}
                onChange={(e) => handleChange('contractStatus', e.target.value)}
                required
              >
                {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {formData.contractStatus === 'signed' && (
              <>
                <div className="form-group">
                  <label htmlFor="contractStartDate">Start Date</label>
                  <input
                    id="contractStartDate"
                    type="date"
                    value={formData.contractStartDate || ''}
                    onChange={(e) => handleChange('contractStartDate', e.target.value || undefined)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contractEndDate">End Date</label>
                  <input
                    id="contractEndDate"
                    type="date"
                    value={formData.contractEndDate || ''}
                    onChange={(e) => handleChange('contractEndDate', e.target.value || undefined)}
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>Notes</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value || undefined)}
                rows={5}
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Update Vendor' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  );
}
