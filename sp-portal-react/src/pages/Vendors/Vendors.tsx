import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/vendors-page.css';
import * as workforce from '../../services/workforceService';
import {
  getDepotsForSp,
  getRoutesForSp,
  computeCourierId,
  formatDateOnly,
  parseYMD,
  getTrainingStatus,
  getSingleTrainingStatus,
  getDocumentItemStatus,
  getDocumentsStatus,
  isVendorExpiring,
  isVendorPending,
  vendorTypeLabel,
  statusBadgeClass,
  filterAndSortVendors,
  type Vendor,
  type StatusFilter,
  type SortKey,
} from '../../data/vendorsData';

/**
 * Manual port of Bootstrap's bootstrap.bundle.min.js modal show/hide.
 * The static page loads that JS from a CDN; this SPA only loads Bootstrap's
 * CSS (see index.html), so modals here are toggled via plain React state +
 * the same `modal fade show` classes bootstrap's JS would apply, without the
 * fade-in transition or focus trap bootstrap's JS provides.
 */
const STEPS = ['personal', 'employment', 'training', 'compliance'] as const;
type Step = (typeof STEPS)[number];

interface VendorFormData {
  firstName: string;
  lastName: string;
  courierId: string;
  email: string;
  phone: string;
  dob: string;
  depot: string;
  vendorType: string;
  route: string;
  startDate: string;
  finishDate: string;
  cargoTrainingDate: string;
  dangerousGoodsTrainingDate: string;
  manualHandlingTrainingDate: string;
  dhlTrainingNumber: string;
  criminalRecordDate: string;
  dbsNumber: string;
  dvlaCheckDate: string;
  visaValidity: string;
  licenceExpiringDate: string;
  passportExpiringDate: string;
}

const EMPTY_FORM: VendorFormData = {
  firstName: '', lastName: '', courierId: '', email: '', phone: '', dob: '',
  depot: '', vendorType: '1', route: '', startDate: '', finishDate: '',
  cargoTrainingDate: '', dangerousGoodsTrainingDate: '', manualHandlingTrainingDate: '', dhlTrainingNumber: '',
  criminalRecordDate: '', dbsNumber: '', dvlaCheckDate: '', visaValidity: '', licenceExpiringDate: '', passportExpiringDate: '',
};

function vendorToForm(v: Vendor): VendorFormData {
  return {
    firstName: v.firstName || '',
    lastName: v.lastName || '',
    courierId: v.courierId || computeCourierId(v.firstName || '', v.lastName || ''),
    email: v.email || '',
    phone: v.phone || '',
    dob: v.dob || '',
    depot: v.depot || '',
    vendorType: (v.vendorType || '1').toString(),
    route: v.route || '',
    startDate: v.startDate || '',
    finishDate: v.finishDate || '',
    cargoTrainingDate: v.cargoTrainingDate || '',
    dangerousGoodsTrainingDate: v.dangerousGoodsTrainingDate || '',
    manualHandlingTrainingDate: v.manualHandlingTrainingDate || '',
    dhlTrainingNumber: v.dhlTrainingNumber || '',
    criminalRecordDate: v.criminalRecordDate || '',
    dbsNumber: v.dbsNumber || '',
    dvlaCheckDate: v.dvlaCheckDate || '',
    visaValidity: v.visaValidity || '',
    licenceExpiringDate: v.licenceExpiringDate || '',
    passportExpiringDate: v.passportExpiringDate || '',
  };
}

function stepPaneId(step: Step): string {
  return 'vendorStep' + step.charAt(0).toUpperCase() + step.slice(1);
}

const SORT_LABEL: Record<SortKey, string> = {
  name: 'name',
  vendorType: 'type',
  route: 'route',
  status: 'status',
  startDate: 'start date',
};

const STEP_LABEL: Record<Step, string> = {
  personal: 'Personal',
  employment: 'Contract',
  training: 'Training',
  compliance: 'Compliance',
};

/**
 * Espectro de conformidade.
 *
 * A página tinha seis nomes de estado (`active`, `verified`, `warning`,
 * `expiring`, `pending`, `incomplete`) e cada um trazia a sua própria cor
 * saturada, o que dava uma tabela onde tudo gritava ao mesmo tempo. Colapsam
 * em quatro tons, e a saturação passa a significar urgência:
 *
 *   clear  — em dia          watch — expira em breve
 *   breach — expirado        idle  — em falta / não aplicável
 */
type Tone = 'clear' | 'watch' | 'breach' | 'idle';

const TONE_RANK: Record<Tone, number> = { breach: 3, watch: 2, idle: 1, clear: 0 };

const TONE_BY_STATUS: Record<string, Tone> = {
  // Classes devolvidas por getTrainingStatus / getDocumentsStatus / statusBadgeClass.
  'status-badge-active': 'clear',
  'status-badge-warning': 'watch',
  'status-badge-expiring': 'breach',
  'status-badge-pending': 'idle',
  'status-badge-incomplete': 'idle',
  'status-badge-inactive': 'idle',
  'status-badge-default': 'idle',
  // Estados por item, usados nas modais de detalhe.
  active: 'clear',
  verified: 'clear',
  warning: 'watch',
  expiring: 'breach',
  pending: 'idle',
};

function tone(status: string | null | undefined): Tone {
  return (status && TONE_BY_STATUS[status]) || 'idle';
}

function worstTone(tones: Tone[]): Tone {
  return tones.reduce((a, b) => (TONE_RANK[b] > TONE_RANK[a] ? b : a), 'clear' as Tone);
}

function effectiveStatus(v: Vendor): string {
  if (v.status) return v.status;
  return !v.finishDate || new Date(v.finishDate) > new Date() ? 'Active' : 'Inactive';
}

/** Tom da guia lateral da linha: o pior entre formação e documentos. */
function vendorTone(v: Vendor): Tone {
  if (effectiveStatus(v) !== 'Active') return 'idle';
  return worstTone([tone(getTrainingStatus(v).className), tone(getDocumentsStatus(v).className)]);
}

/** Um vendor "precisa de atenção" quando não pode rodar, ou está prestes a não poder. */
function needsAttention(v: Vendor): boolean {
  return effectiveStatus(v) === 'Active' && (isVendorExpiring(v) || isVendorPending(v));
}

function initials(v: Vendor): string {
  const a = (v.firstName || '').trim()[0] || '';
  const b = (v.lastName || '').trim()[0] || '';
  return (a + b).toUpperCase() || '··';
}

function fullName(v: Vendor): string {
  return `${v.firstName || ''} ${v.lastName || ''}`.trim();
}

/**
 * Corpo do ecrã de Vendors, sem moldura de página.
 *
 * Era o componente de rota `Vendors`, que trazia o seu próprio PortalLayout.
 * Depois da fusão dos ecrãs de Vendors, Compliance e Vetting numa só página,
 * a moldura passou a ser da Workforce e isto é apenas o conteúdo da aba —
 * daí o wrapper `div` com as classes que antes iam no <main>, para as regras
 * de vendors-page.css continuarem a aplicar-se.
 */
export function VendorsContent() {
  const sp = useCurrentSp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [modalStep, setModalStep] = useState<Step>('personal');
  const [form, setForm] = useState<VendorFormData>(EMPTY_FORM);

  const [deleteVendorId, setDeleteVendorId] = useState<number | null>(null);
  const [infoModal, setInfoModal] = useState<{ vendorId: number; type: 'training' | 'documents' } | null>(null);
  const [driverDetailId, setDriverDetailId] = useState<number | null>(null);

  // O menu de exportação era um dropdown do Bootstrap (`data-bs-toggle`), mas
  // este SPA só carrega o CSS do Bootstrap — nunca o JS (ver index.html). O
  // botão Export não abria nada; agora o menu é estado de React.
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exportOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setExportOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [exportOpen]);

  useModalBehavior(() => setShowVendorModal(false), showVendorModal);
  useModalBehavior(() => setDeleteVendorId(null), deleteVendorId !== null);
  useModalBehavior(() => setInfoModal(null), infoModal !== null);
  useModalBehavior(() => setDriverDetailId(null), driverDetailId !== null);

  // O roster vem do WorkforceService, que já sobrepõe as alterações da
  // sessão ao mock. Era aqui que vivia o `localVendors` local — e era por
  // isso que uma edição feita nesta aba não chegava às outras.
  const roster = useSyncExternalStore(workforce.subscribe, workforce.getSnapshot);
  const allVendors = useMemo<Vendor[]>(
    () => roster.vendors.filter((v) => v.serviceProvider === sp),
    [roster, sp],
  );

  // Duas listas, de propósito. `searched` respeita só a pesquisa e alimenta as
  // contagens das facetas; `filtered` acrescenta o filtro de estado e alimenta
  // a tabela. Antes havia só a segunda, e as métricas saíam dela — ou seja,
  // filtrar por "Active" fazia o contador Total passar a mostrar os activos.
  // Contar sobre a pesquisa é o comportamento normal de uma busca facetada:
  // cada faceta diz quantos resultados dá, antes de lá ir.
  const searched = useMemo(
    () => filterAndSortVendors(allVendors, search, 'all', sortKey, sortDir),
    [allVendors, search, sortKey, sortDir],
  );

  const filtered = useMemo(
    () => filterAndSortVendors(allVendors, search, statusFilter, sortKey, sortDir),
    [allVendors, search, statusFilter, sortKey, sortDir],
  );

  const facets = useMemo(() => {
    const count = (f: StatusFilter) => filterAndSortVendors(allVendors, search, f, sortKey, sortDir).length;
    return [
      // "Roster" é o total, não um estado — por isso não leva ponto de cor.
      { id: 'all' as StatusFilter, label: 'Roster', value: searched.length, tone: null },
      { id: 'active' as StatusFilter, label: 'Active', value: count('active'), tone: 'clear' as Tone },
      { id: 'expiring' as StatusFilter, label: 'Expiring', value: count('expiring'), tone: 'breach' as Tone },
      { id: 'pending' as StatusFilter, label: 'Pending', value: count('pending'), tone: 'watch' as Tone },
      { id: 'inactive' as StatusFilter, label: 'Inactive', value: count('inactive'), tone: 'idle' as Tone },
    ] as { id: StatusFilter; label: string; value: number; tone: Tone | null }[];
  }, [allVendors, search, sortKey, sortDir, searched.length]);

  const attention = useMemo(() => searched.filter(needsAttention).length, [searched]);

  const depots = useMemo(() => getDepotsForSp(sp), [sp]);
  const routes = useMemo(() => getRoutesForSp(sp), [sp]);

  const findVendor = (id: number) => allVendors.find((v) => v.id === id) || null;
  const isLocalVendor = (id: number) => workforce.isLocallyCreated(id);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  function openAddModal() {
    setEditingVendorId(null);
    setForm(EMPTY_FORM);
    setModalStep('personal');
    setShowVendorModal(true);
  }

  function openEditModal(id: number) {
    const v = findVendor(id);
    if (!v) return;
    setEditingVendorId(id);
    setForm(vendorToForm(v));
    setModalStep('personal');
    setShowVendorModal(true);
  }

  function updateForm<K extends keyof VendorFormData>(key: K, value: VendorFormData[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'firstName' || key === 'lastName') {
        next.courierId = computeCourierId(next.firstName, next.lastName);
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.depot || !form.startDate) return;

    const fd = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      courierId: form.courierId || computeCourierId(form.firstName, form.lastName),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob || null,
      depot: form.depot,
      vendorType: form.vendorType,
      route: form.route || null,
      startDate: form.startDate,
      finishDate: form.finishDate || null,
      cargoTrainingDate: form.cargoTrainingDate || null,
      dangerousGoodsTrainingDate: form.dangerousGoodsTrainingDate || null,
      manualHandlingTrainingDate: form.manualHandlingTrainingDate || null,
      dhlTrainingNumber: form.dhlTrainingNumber.trim() || null,
      criminalRecordDate: form.criminalRecordDate || null,
      dbsNumber: form.dbsNumber.trim() || null,
      dvlaCheckDate: form.dvlaCheckDate || null,
      visaValidity: form.visaValidity || null,
      licenceExpiringDate: form.licenceExpiringDate || null,
      passportExpiringDate: form.passportExpiringDate || null,
    };

    if (editingVendorId !== null) {
      workforce.updateVendor(editingVendorId, { ...fd, serviceProvider: sp });
    } else {
      workforce.createVendor({
        ...fd,
        serviceProvider: sp,
        status: 'Active',
        cargoTraining: !!fd.cargoTrainingDate,
        dangerousGoodsTraining: !!fd.dangerousGoodsTrainingDate,
        manualHandlingTraining: !!fd.manualHandlingTrainingDate,
      } as workforce.VendorDraft);
    }

    setShowVendorModal(false);
  }

  function confirmDelete() {
    if (deleteVendorId === null) return;
    workforce.deleteVendor(deleteVendorId);
    setDeleteVendorId(null);
  }

  function exportExcel() {
    const headers = ['Name', 'Email', 'Vendor Type', 'Route', 'Status', 'Start Date'];
    const rows = filtered.map((v) =>
      [
        `${v.firstName || ''} ${v.lastName || ''}`,
        v.email || '',
        vendorTypeLabel(v),
        v.route || '',
        v.status || 'Active',
        v.startDate || '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), rows.join('\n')].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vendors-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!sp) {
    return (
      <div id="spNotFound" className="alert alert-warning">
        Service Provider not set. Open with <code>?sp=YourCompany</code>.
      </div>
    );
  }

  const deleteVendor = deleteVendorId !== null ? findVendor(deleteVendorId) : null;
  const infoVendor = infoModal ? findVendor(infoModal.vendorId) : null;
  const driverDetailVendor = driverDetailId !== null ? findVendor(driverDetailId) : null;

  const isFiltered = statusFilter !== 'all' || search.trim() !== '';

  return (
    <div className="vendor-admin-main sp-vendor-main">
      <div id="spVendorContent" className="vx-console">
        {/* ============ Masthead: o que é o roster, e o que fazer com ele ============ */}
        <div className="vx-masthead">
          <div className="vx-masthead-id">
            <span className="vx-eyebrow">Roster</span>
            <p className="vx-summary">
              {searched.length === 0 ? (
                // "0 vendors · all documents current" seria verdade e inútil.
                'No vendors match this search'
              ) : (
                <>
                  <strong>{searched.length}</strong> {searched.length === 1 ? 'vendor' : 'vendors'}
                  {' · '}
                  {attention > 0 ? (
                    <span className="vx-summary-alarm">
                      {attention} {attention === 1 ? 'needs' : 'need'} attention
                    </span>
                  ) : (
                    <span className="vx-summary-clear">all documents current</span>
                  )}
                </>
              )}
            </p>
          </div>

          <div className="vx-search">
            <i className="bi bi-search vx-search-icon" aria-hidden="true" />
            <input
              type="search"
              id="vendorSearch"
              className="vx-search-input"
              placeholder="Search name or email"
              aria-label="Search vendors by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="vx-actions-group">
            <button type="button" className="vx-btn vx-btn-primary" id="addVendorBtn" onClick={openAddModal}>
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Add vendor
            </button>
            <div className="dropdown" ref={exportRef}>
              <button
                type="button"
                className="vx-btn vx-btn-ghost"
                id="vendorExportBtn"
                aria-expanded={exportOpen}
                aria-haspopup="menu"
                onClick={() => setExportOpen((o) => !o)}
              >
                <i className="bi bi-download" aria-hidden="true" />
                Export
              </button>
              <ul className={`dropdown-menu dropdown-menu-end${exportOpen ? ' show' : ''}`} role="menu">
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-item"
                    id="vendorExportPdf"
                    onClick={() => {
                      setExportOpen(false);
                      window.print();
                    }}
                  >
                    Print to PDF
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-item"
                    id="vendorExportExcel"
                    onClick={() => {
                      setExportOpen(false);
                      exportExcel();
                    }}
                  >
                    Download CSV
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ============ Facetas: cada métrica é o filtro que a produz ============ */}
        <div className="vx-facets" role="group" aria-label="Filter roster by status">
          {facets.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={statusFilter === f.id}
              className={`vx-facet${f.tone ? ` vx-tone-${f.tone}` : ''}${statusFilter === f.id ? ' is-on' : ''}`}
              onClick={() => setStatusFilter(f.id)}
            >
              <span className="vx-facet-head">
                {f.tone && <span className="vx-facet-dot" aria-hidden="true" />}
                <span className="vx-facet-label">{f.label}</span>
              </span>
              <span className={`vx-facet-value${f.value === 0 ? ' is-zero' : ''}`}>{f.value}</span>
            </button>
          ))}
        </div>

        {/* ============ Tabela ============ */}
        <div className="vx-table-wrap">
          {/* Sem linhas, um cabeçalho de colunas sozinho é só ruído — o estado
              vazio substitui a tabela inteira, não apenas o seu corpo. */}
          {filtered.length > 0 && (
          <table className="vx-table">
            <thead>
              <tr>
                {([
                  ['name', 'Name'],
                  ['vendorType', 'Type'],
                  ['route', 'Route'],
                  ['status', 'Status'],
                  ['startDate', 'Started'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    scope="col"
                    className={`vx-th vx-th-sort${key === 'name' ? ' vx-th-name' : ''}${
                      sortKey === key ? (sortDir === 1 ? ' is-asc' : ' is-desc') : ''
                    }`}
                    aria-sort={sortKey === key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
                    tabIndex={0}
                    onClick={() => handleSort(key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSort(key);
                      }
                    }}
                  >
                    {label}
                  </th>
                ))}
                <th scope="col" className="vx-th">Training</th>
                <th scope="col" className="vx-th">Documents</th>
                <th scope="col" className="vx-th vx-th-end">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody id="vendorTableBody">
              {filtered.map((v) => {
                const name = fullName(v);
                const t = getTrainingStatus(v);
                const d = getDocumentsStatus(v);
                const isLocal = isLocalVendor(v.id);
                const status = effectiveStatus(v);
                return (
                  <tr
                    key={v.id}
                    data-vendor-id={v.id}
                    className={`vx-row vx-tone-${vendorTone(v)}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${name || 'vendor'} details`}
                    onClick={() => setDriverDetailId(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDriverDetailId(v.id);
                      }
                    }}
                  >
                    <td className="vx-td-name">
                      <span className="vx-identity">
                        <span className="vx-monogram" aria-hidden="true">{initials(v)}</span>
                        <span className="vx-identity-text">
                          <span className="vx-name">{name || '—'}</span>
                          {v.email && <span className="vx-email">{v.email}</span>}
                        </span>
                      </span>
                    </td>
                    <td>{vendorTypeLabel(v)}</td>
                    <td>{v.route ? <span className="vx-route">{v.route}</span> : <span className="vx-none">—</span>}</td>
                    <td>
                      <span className={`vx-state vx-tone-${tone(statusBadgeClass(v))}`}>
                        <span className="vx-state-dot" aria-hidden="true" />
                        {status}
                      </span>
                    </td>
                    <td>
                      {formatDateOnly(v.startDate) ? (
                        <span className="vx-date">{formatDateOnly(v.startDate)}</span>
                      ) : (
                        <span className="vx-none">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`vx-chip vx-tone-${tone(t.className)}`}
                        aria-label={`Training for ${name}: ${t.label}. Open details`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoModal({ vendorId: v.id, type: 'training' });
                        }}
                      >
                        <span className="vx-chip-dot" aria-hidden="true" />
                        {t.label}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`vx-chip vx-tone-${tone(d.className)}`}
                        aria-label={`Documents for ${name}: ${d.label}. Open details`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInfoModal({ vendorId: v.id, type: 'documents' });
                        }}
                      >
                        <span className="vx-chip-dot" aria-hidden="true" />
                        {d.label}
                      </button>
                    </td>
                    <td className="vx-td-actions">
                      <span className="vx-row-actions">
                        <button
                          type="button"
                          className="vx-icon-btn"
                          aria-label={`Edit ${name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(v.id);
                          }}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </button>
                        {isLocal && (
                          <button
                            type="button"
                            className="vx-icon-btn vx-icon-btn-danger"
                            aria-label={`Delete ${name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteVendorId(v.id);
                            }}
                          >
                            <i className="bi bi-trash" aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}

          {filtered.length === 0 && (
            <div id="vendorEmptyState" className="vx-empty">
              <span className="vx-empty-mark" aria-hidden="true">
                <i className={`bi ${isFiltered ? 'bi-funnel' : 'bi-people'}`} />
              </span>
              <h3 className="vx-empty-title">{isFiltered ? 'Nothing matches these filters' : 'The roster is empty'}</h3>
              <p className="vx-empty-text">
                {isFiltered
                  ? 'Widen the status filter or clear the search to see the rest of the roster.'
                  : 'Add your first driver or subcontractor to start tracking training and documents.'}
              </p>
              {isFiltered ? (
                <button
                  type="button"
                  className="vx-btn vx-btn-ghost"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <button type="button" className="vx-btn vx-btn-primary" onClick={openAddModal}>
                  <i className="bi bi-plus-lg" aria-hidden="true" />
                  Add vendor
                </button>
              )}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="vx-footer">
            <span className="vx-footer-count">
              Showing <strong>{filtered.length}</strong> of <strong>{searched.length}</strong>
            </span>
            <span>
              Sorted by <strong>{SORT_LABEL[sortKey]}</strong>, {sortDir === 1 ? 'ascending' : 'descending'}
            </span>
          </div>
        )}
      </div>

      {/* ===================== VendorModal (4-step) ===================== */}
      {showVendorModal &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setShowVendorModal(false)} />
            <div
              className="modal fade show vx-scope sp-modal-anim"
              style={{ display: 'block' }}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="vendorModalTitle"
            >
              {/* modal-lg, não modal-xl: são dois campos por linha, e a 1190px
                  cada input ficava com meio ecrã de largura. */}
              <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                <div className="modal-content vx-modal-content">
                  <div className="vx-modal-header">
                    <div className="vx-modal-header-id">
                      <span className="vx-modal-eyebrow">{editingVendorId !== null ? 'Edit record' : 'New record'}</span>
                      <h2 id="vendorModalTitle" className="vx-modal-title">
                        {editingVendorId !== null ? fullName(findVendor(editingVendorId) || ({} as Vendor)) || 'Vendor' : 'Add a vendor'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="vx-modal-close"
                      aria-label="Close"
                      onClick={() => setShowVendorModal(false)}
                    >
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="modal-body vx-modal-body">
                    {/* Os quatro passos são uma sequência real, por isso vão numerados. */}
                    <div className="vx-stepper" id="vendorModalStepper">
                      {STEPS.map((step, i) => (
                        <button
                          key={step}
                          type="button"
                          aria-current={modalStep === step ? 'step' : undefined}
                          className={`vx-step${modalStep === step ? ' is-on' : ''}${
                            STEPS.indexOf(modalStep) > i ? ' is-done' : ''
                          }`}
                          onClick={() => setModalStep(step)}
                        >
                          <span className="vx-step-num" aria-hidden="true">
                            {STEPS.indexOf(modalStep) > i ? <i className="bi bi-check-lg" /> : i + 1}
                          </span>
                          {STEP_LABEL[step]}
                        </button>
                      ))}
                    </div>
                    <form id="vendorForm" className="vx-form" onSubmit={handleSubmit}>
                      <div id={stepPaneId('personal')} className={`vx-pane${modalStep !== 'personal' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vFirstName" className="form-label">First name</label>
                            <input type="text" id="vFirstName" className="form-control" required value={form.firstName} onChange={(e) => updateForm('firstName', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vLastName" className="form-label">Last name</label>
                            <input type="text" id="vLastName" className="form-control" required value={form.lastName} onChange={(e) => updateForm('lastName', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vCourierId" className="form-label">Courier ID</label>
                            <input type="text" id="vCourierId" className="form-control" readOnly maxLength={8} placeholder="Generated from the name" value={form.courierId} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vEmail" className="form-label">Email</label>
                            <input type="email" id="vEmail" className="form-control" required value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vPhone" className="form-label">Phone</label>
                            <input type="text" id="vPhone" className="form-control" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDob" className="form-label">Date of birth</label>
                            <input type="date" id="vDob" className="form-control" value={form.dob} onChange={(e) => updateForm('dob', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('employment')} className={`vx-pane${modalStep !== 'employment' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vDepot" className="form-label">Depot</label>
                            <select id="vDepot" className="form-select" required value={form.depot} onChange={(e) => updateForm('depot', e.target.value)}>
                              <option value="" disabled hidden></option>
                              {depots.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vVendorType" className="form-label">Vendor Type</label>
                            <select id="vVendorType" className="form-select" value={form.vendorType} onChange={(e) => updateForm('vendorType', e.target.value)}>
                              <option value="1">Driver</option>
                              <option value="2">Subcontractor</option>
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vRoute" className="form-label">Route</label>
                            <select id="vRoute" className="form-select" value={form.route} onChange={(e) => updateForm('route', e.target.value)}>
                              <option value="">— Select route —</option>
                              {routes.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vStartDate" className="form-label">Start date</label>
                            <input type="date" id="vStartDate" className="form-control" required value={form.startDate} onChange={(e) => updateForm('startDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vFinishDate" className="form-label">Finish date</label>
                            <input type="date" id="vFinishDate" className="form-control" value={form.finishDate} onChange={(e) => updateForm('finishDate', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('training')} className={`vx-pane${modalStep !== 'training' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vCargoDate" className="form-label">Cargo training date</label>
                            <input type="date" id="vCargoDate" className="form-control" value={form.cargoTrainingDate} onChange={(e) => updateForm('cargoTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDangerousDate" className="form-label">Dangerous goods training date</label>
                            <input type="date" id="vDangerousDate" className="form-control" value={form.dangerousGoodsTrainingDate} onChange={(e) => updateForm('dangerousGoodsTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vManualDate" className="form-label">Manual handling training date</label>
                            <input type="date" id="vManualDate" className="form-control" value={form.manualHandlingTrainingDate} onChange={(e) => updateForm('manualHandlingTrainingDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDhlTrainingNumber" className="form-label">DHL Training Number</label>
                            <input type="text" id="vDhlTrainingNumber" className="form-control" value={form.dhlTrainingNumber} onChange={(e) => updateForm('dhlTrainingNumber', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div id={stepPaneId('compliance')} className={`vx-pane${modalStep !== 'compliance' ? ' hidden' : ''}`}>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="vCriminalRecordDate" className="form-label">Criminal record check date</label>
                            <input type="date" id="vCriminalRecordDate" className="form-control" value={form.criminalRecordDate} onChange={(e) => updateForm('criminalRecordDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDbsNumber" className="form-label">DBS Number</label>
                            <input type="text" id="vDbsNumber" className="form-control" value={form.dbsNumber} onChange={(e) => updateForm('dbsNumber', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vDvlaCheckDate" className="form-label">DVLA check date</label>
                            <input type="date" id="vDvlaCheckDate" className="form-control" value={form.dvlaCheckDate} onChange={(e) => updateForm('dvlaCheckDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vVisaValidity" className="form-label">Visa validity</label>
                            <input type="date" id="vVisaValidity" className="form-control" value={form.visaValidity} onChange={(e) => updateForm('visaValidity', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vLicenceExpiring" className="form-label">Licence expiring date</label>
                            <input type="date" id="vLicenceExpiring" className="form-control" value={form.licenceExpiringDate} onChange={(e) => updateForm('licenceExpiringDate', e.target.value)} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="vPassportExpiring" className="form-label">Passport expiring date</label>
                            <input type="date" id="vPassportExpiring" className="form-control" value={form.passportExpiringDate} onChange={(e) => updateForm('passportExpiringDate', e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="vx-modal-footer">
                        <button
                          type="button"
                          className={`vx-btn vx-btn-ghost${STEPS.indexOf(modalStep) <= 0 ? ' hidden' : ''}`}
                          onClick={() => setModalStep(STEPS[Math.max(0, STEPS.indexOf(modalStep) - 1)])}
                        >
                          <i className="bi bi-arrow-left" aria-hidden="true" />
                          Back
                        </button>
                        <span className="vx-modal-footer-spacer" />
                        <button
                          type="button"
                          className={`vx-btn vx-btn-ghost${STEPS.indexOf(modalStep) >= STEPS.length - 1 ? ' hidden' : ''}`}
                          onClick={() => setModalStep(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(modalStep) + 1)])}
                        >
                          Next
                          <i className="bi bi-arrow-right" aria-hidden="true" />
                        </button>
                        <button
                          type="submit"
                          className={`vx-btn vx-btn-primary${STEPS.indexOf(modalStep) < STEPS.length - 1 ? ' hidden' : ''}`}
                        >
                          {editingVendorId !== null ? 'Save changes' : 'Add vendor'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Delete confirm modal ===================== */}
      {deleteVendorId !== null &&
        deleteVendor &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setDeleteVendorId(null)} />
            <div
              className="modal fade show sp-modal-anim"
              style={{ display: 'block' }}
              tabIndex={-1}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="deleteConfirmModalLabel"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content" style={{ position: 'relative' }}>
                  <button type="button" className="btn-close sp-danger-modal-close" aria-label="Close" onClick={() => setDeleteVendorId(null)} />
                  <div className="sp-danger-modal-body">
                    <div className="sp-danger-modal-icon">
                      <i className="bi bi-exclamation-triangle-fill" />
                    </div>
                    <h5 id="deleteConfirmModalLabel" className="sp-danger-modal-title">
                      Delete this vendor?
                    </h5>
                    <p className="sp-danger-modal-text">
                      You&apos;re about to remove{' '}
                      <strong>{`${deleteVendor.firstName || ''} ${deleteVendor.lastName || ''}`}</strong>
                      {deleteVendor.email ? ` (${deleteVendor.email})` : ''}.
                    </p>
                    <p className="sp-danger-modal-subtext">This action cannot be undone.</p>
                  </div>
                  <div className="modal-footer sp-danger-modal-footer border-top bg-light">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteVendorId(null)}>Cancel</button>
                    <button type="button" className="btn btn-danger d-inline-flex align-items-center gap-2" onClick={confirmDelete}>
                      <i className="bi bi-trash-fill" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Training / Documents info modal ===================== */}
      {infoModal &&
        infoVendor &&
        createPortal(
          <>
            <div className="modal-backdrop fade show sp-modal-backdrop-anim" onClick={() => setInfoModal(null)} />
            <div className="modal fade show vx-scope sp-modal-anim" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content vx-modal-content">
                  <div className="vx-modal-header">
                    <span className="vx-monogram" aria-hidden="true">{initials(infoVendor)}</span>
                    <div className="vx-modal-header-id">
                      <span className="vx-modal-eyebrow">{infoModal.type === 'training' ? 'Training' : 'Documents'}</span>
                      <h2 className="vx-modal-title" id="infoModalTitle">{fullName(infoVendor) || '—'}</h2>
                    </div>
                    <button type="button" className="vx-modal-close" aria-label="Close" onClick={() => setInfoModal(null)}>
                      <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="vx-modal-body">
                    <div className="vx-detail-list">
                      {(infoModal.type === 'training'
                        ? (() => {
                            const v = infoVendor;
                            let cargoExpiry: string | null = null;
                            if (v.cargoTrainingDate) {
                              const d0 = parseYMD(v.cargoTrainingDate);
                              if (d0) {
                                const d = new Date(d0);
                                d.setFullYear(d.getFullYear() + 2);
                                cargoExpiry = formatDateOnly(d.toISOString().slice(0, 10));
                              }
                            }
                            return [
                              { label: 'Cargo training', value: v.cargoTrainingDate ? formatDateOnly(v.cargoTrainingDate)! : 'Pending', detail: cargoExpiry ? `Expires ${cargoExpiry}` : null, status: getSingleTrainingStatus(v.cargoTrainingDate) as string | null },
                              { label: 'Dangerous goods training', value: v.dangerousGoodsTrainingDate ? formatDateOnly(v.dangerousGoodsTrainingDate)! : 'Pending', detail: null, status: getSingleTrainingStatus(v.dangerousGoodsTrainingDate) as string | null },
                              { label: 'Manual handling training', value: v.manualHandlingTrainingDate ? formatDateOnly(v.manualHandlingTrainingDate)! : 'Pending', detail: null, status: getSingleTrainingStatus(v.manualHandlingTrainingDate) as string | null },
                              { label: 'DHL training number', value: v.dhlTrainingNumber || 'Not recorded', detail: null, status: null as string | null },
                            ];
                          })()
                        : (() => {
                            const v = infoVendor;
                            return [
                              { label: 'Criminal record check', value: v.criminalRecordDate ? formatDateOnly(v.criminalRecordDate)! : 'Pending', detail: null, status: getDocumentItemStatus('criminalRecord', v) as string | null },
                              { label: 'DVLA check', value: v.dvlaCheckDate ? formatDateOnly(v.dvlaCheckDate)! : 'Pending', detail: null, status: getDocumentItemStatus('dvlaCheck', v) as string | null },
                              { label: 'Visa validity', value: v.visaValidity ? formatDateOnly(v.visaValidity)! : 'Not applicable', detail: null, status: getDocumentItemStatus('visa', v) as string | null },
                              { label: 'Driving licence expiry', value: v.licenceExpiringDate ? formatDateOnly(v.licenceExpiringDate)! : 'Not applicable', detail: null, status: getDocumentItemStatus('licence', v) as string | null },
                              { label: 'Passport expiry', value: v.passportExpiringDate ? formatDateOnly(v.passportExpiringDate)! : 'Not applicable', detail: null, status: getDocumentItemStatus('passport', v) as string | null },
                            ];
                          })()
                      ).map((item) => (
                        <div className={`vx-detail-item vx-tone-${tone(item.status)}`} key={item.label}>
                          <div className="vx-detail-item-id">
                            {item.status && <span className="vx-state-dot" aria-hidden="true" />}
                            <span>
                              <span className="vx-detail-label">{item.label}</span>
                              {item.detail && <span className="vx-detail-note">{item.detail}</span>}
                            </span>
                          </div>
                          <span className="vx-detail-value">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* ===================== Driver Detail modal (custom, liquid glass) ===================== */}
      {driverDetailId !== null &&
        driverDetailVendor &&
        createPortal(
          <>
            <div className="driver-detail-modal-backdrop sp-modal-backdrop-anim" onClick={() => setDriverDetailId(null)} />
            <div className="driver-detail-modal-wrap vx-scope" role="dialog" aria-modal="true" aria-labelledby="driverDetailModalTitle">
              <div className="driver-detail-modal sp-modal-anim" onClick={(e) => e.stopPropagation()}>
                <div className="driver-detail-modal-header">
                  <span className="vx-monogram" aria-hidden="true">{initials(driverDetailVendor)}</span>
                  <div className="driver-detail-modal-header-inner">
                    <span className="driver-detail-modal-badge">{vendorTypeLabel(driverDetailVendor)}</span>
                    <h2 id="driverDetailModalTitle" className="driver-detail-modal-title">
                      {fullName(driverDetailVendor) || '—'}
                    </h2>
                  </div>
                  <button type="button" className="driver-detail-modal-close" aria-label="Close" onClick={() => setDriverDetailId(null)}>
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </div>
                <div className="driver-detail-modal-body">
                  {/* The static page loads QRCode.js from a CDN (cdnjs qrcodejs);
                      this SPA doesn't bundle that library, so — same as the
                      original's own `typeof QRCode === 'undefined'` fallback
                      branch — the code itself can't be drawn. The courier ID it
                      would encode is shown instead, which is what the depot
                      actually needs to read off this panel. */}
                  <div className="driver-detail-qr-wrap">
                    <div>
                      <p className="driver-detail-qr-label">Courier ID</p>
                      <span className="driver-detail-qr-id">
                        {driverDetailVendor.courierId || computeCourierId(driverDetailVendor.firstName || '', driverDetailVendor.lastName || '')}
                      </span>
                      <p className="driver-detail-qr-note">Scannable code isn&apos;t available in this build.</p>
                    </div>
                    <div className="driver-detail-qr-box" aria-hidden="true">
                      <i className="bi bi-qr-code" />
                    </div>
                  </div>
                  <div className="driver-detail-grid">
                    {([
                      {
                        title: 'Personal',
                        rows: [
                          ['Email', driverDetailVendor.email || '', false],
                          ['Phone', driverDetailVendor.phone || '', true],
                          ['Date of birth', driverDetailVendor.dob ? formatDateOnly(driverDetailVendor.dob) || '' : '', true],
                        ],
                      },
                      {
                        title: 'Contract',
                        rows: [
                          ['Depot', driverDetailVendor.depot || '', false],
                          ['Route', driverDetailVendor.route || '', true],
                          ['Start date', formatDateOnly(driverDetailVendor.startDate) || '', true],
                          ['Finish date', formatDateOnly(driverDetailVendor.finishDate) || '', true],
                          ['Status', effectiveStatus(driverDetailVendor), false],
                        ],
                      },
                      {
                        title: 'Training',
                        rows: [
                          ['Cargo', driverDetailVendor.cargoTrainingDate ? formatDateOnly(driverDetailVendor.cargoTrainingDate) || '' : '', true],
                          ['Dangerous goods', driverDetailVendor.dangerousGoodsTrainingDate ? formatDateOnly(driverDetailVendor.dangerousGoodsTrainingDate) || '' : '', true],
                          ['Manual handling', driverDetailVendor.manualHandlingTrainingDate ? formatDateOnly(driverDetailVendor.manualHandlingTrainingDate) || '' : '', true],
                          ['DHL training no.', driverDetailVendor.dhlTrainingNumber || '', true],
                        ],
                      },
                      {
                        title: 'Compliance',
                        rows: [
                          ['Criminal record check', driverDetailVendor.criminalRecordDate ? formatDateOnly(driverDetailVendor.criminalRecordDate) || '' : '', true],
                          ['DBS number', driverDetailVendor.dbsNumber || '', true],
                          ['DVLA check', driverDetailVendor.dvlaCheckDate ? formatDateOnly(driverDetailVendor.dvlaCheckDate) || '' : '', true],
                          ['Visa validity', driverDetailVendor.visaValidity ? formatDateOnly(driverDetailVendor.visaValidity) || '' : '', true],
                          ['Licence expiry', driverDetailVendor.licenceExpiringDate ? formatDateOnly(driverDetailVendor.licenceExpiringDate) || '' : '', true],
                          ['Passport expiry', driverDetailVendor.passportExpiringDate ? formatDateOnly(driverDetailVendor.passportExpiringDate) || '' : '', true],
                        ],
                      },
                    ] as { title: string; rows: [string, string, boolean][] }[]).map((sec) => (
                      <section className="driver-detail-section" key={sec.title}>
                        <h3 className="driver-detail-section-title">{sec.title}</h3>
                        {sec.rows.map(([label, value, isData]) => (
                          <div className="driver-detail-row" key={label}>
                            <span className="driver-detail-row-label">{label}</span>
                            <span
                              className={`driver-detail-row-value${value ? (isData ? ' is-data' : '') : ' is-empty'}`}
                            >
                              {value || 'Not recorded'}
                            </span>
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
