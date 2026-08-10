import { useMemo, useState } from 'react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import '../../styles/legacy/logistics.css';

/* =====================================================
   Ported from the Next.js source's app/(private)/logistics/page.tsx
   (LogisticsDashboard). Local-state loop/route CRUD, no backend —
   the Next.js source already worked purely off an in-memory
   INITIAL_LOOPS record, so this port carries that over unchanged.
   Bootstrap's JS modal (data-bs-toggle + Modal.getOrCreateInstance)
   is replaced with this SPA's usual useModalBehavior + va-modal
   pattern (see RequestsAdmin.tsx) since there's no Bootstrap JS bundle
   here, only Bootstrap Icons.
   ===================================================== */

interface LoopRoute {
  id: string;
  type: string;
  vendor: string;
  postcodes: string[];
  targetDel: number;
  targetPu: number;
  puCutoff: string;
  dificultLevel: number;
  notes: string;
  flexIn: string;
  flexOut: string;
  meetAddress: string;
  meetPostcode: string;
  meetTime: string;
  sortStart: string;
  sortFinish: string;
  timeOnRoute: string;
  arriveTime: string;
  break: number | string;
  sporhTarget: number | string;
  avgMon: number | string;
  avgTue: number | string;
  avgWed: number | string;
  avgThu: number | string;
  avgFri: number | string;
}

type LoopsRecord = Record<string, LoopRoute[]>;
type ModalMode = 'add' | 'edit';

interface RouteForm {
  routeType: string;
  routeId: string;
  vendor: string;
  puCutoff: string;
  dificultLevel: number | string;
  notes: string;
  flexIn: string;
  flexOut: string;
  meetAddress: string;
  meetPostcode: string;
  meetTime: string;
  sortStart: string;
  sortFinish: string;
  timeOnRoute: string;
  arriveTime: string;
  break: number | string;
  sporhTarget: number | string;
  avgMon: number | string;
  avgTue: number | string;
  avgWed: number | string;
  avgThu: number | string;
  avgFri: number | string;
}

interface PreservedRouteData {
  postcodes: string[];
  targetDel: number;
  targetPu: number;
}

const INITIAL_LOOPS: LoopsRecord = {
  ll3: [
    {
      id: 'LL3A',
      type: 'Child',
      vendor: 'David Chen',
      postcodes: ['SE1 8XX', 'SE1 9YY'],
      targetDel: 115,
      targetPu: 20,
      puCutoff: '10:00',
      dificultLevel: 3,
      notes: 'Standard route, no issues.',
      flexIn: '',
      flexOut: '',
      meetAddress: 'Depot A',
      meetPostcode: 'SE1 1AA',
      meetTime: '08:00',
      sortStart: '06:00',
      sortFinish: '07:30',
      timeOnRoute: '04:30',
      arriveTime: '12:30',
      break: 30,
      sporhTarget: 25,
      avgMon: 10,
      avgTue: 12,
      avgWed: 15,
      avgThu: 11,
      avgFri: 18,
    },
    {
      id: 'LL3P',
      type: 'Flex',
      vendor: 'Sophie Turner',
      postcodes: ['SW1A 0AA'],
      targetDel: 95,
      targetPu: 35,
      puCutoff: '11:00',
      dificultLevel: 4,
      notes: 'Heavy traffic expected around Buckingham.',
      flexIn: 'SW1A',
      flexOut: 'SW1E',
      meetAddress: 'Depot A',
      meetPostcode: 'SE1 1AA',
      meetTime: '09:00',
      sortStart: '07:00',
      sortFinish: '08:30',
      timeOnRoute: '05:00',
      arriveTime: '14:00',
      break: 45,
      sporhTarget: 20,
      avgMon: 20,
      avgTue: 25,
      avgWed: 22,
      avgThu: 28,
      avgFri: 30,
    },
  ],
  ll4: [
    {
      id: 'LL4C',
      type: 'Child',
      vendor: 'Chris Evans',
      postcodes: ['E1 6AN'],
      targetDel: 105,
      targetPu: 18,
      puCutoff: '10:30',
      dificultLevel: 2,
      notes: 'Easy route, mostly residential.',
      flexIn: '',
      flexOut: '',
      meetAddress: 'Depot B',
      meetPostcode: 'E14 5AA',
      meetTime: '08:30',
      sortStart: '06:30',
      sortFinish: '08:00',
      timeOnRoute: '04:00',
      arriveTime: '12:30',
      break: 30,
      sporhTarget: 28,
      avgMon: 8,
      avgTue: 10,
      avgWed: 9,
      avgThu: 12,
      avgFri: 15,
    },
  ],
};

const EMPTY_FORM: RouteForm = {
  routeType: '',
  routeId: '',
  vendor: '',
  puCutoff: '',
  dificultLevel: 1,
  notes: '',
  flexIn: '',
  flexOut: '',
  meetAddress: '',
  meetPostcode: '',
  meetTime: '',
  sortStart: '',
  sortFinish: '',
  timeOnRoute: '',
  arriveTime: '',
  break: '',
  sporhTarget: '',
  avgMon: '',
  avgTue: '',
  avgWed: '',
  avgThu: '',
  avgFri: '',
};

const RATES_BY_LOOP: Record<string, { childRates: string; flexRates: string }> = {
  ll3: {
    childRates: 'Band 1: (£3.67)  Band 2: (£3.33)  Band 3: (£3.10)  Band 4: (£2.74)',
    flexRates: 'Band 1: 1-80 (£3.30)  Band 2: 81-90 (£3.10)  Band 3: 91-100 (£2.90)  Band 4: 100+ (£2.60)',
  },
  ll4: {
    childRates: 'Band 1: (£3.56)  Band 2: (£3.31)  Band 3: (£3.06)  Band 4: (£2.66)',
    flexRates: 'Band 1: 1-80 (£3.30)  Band 2: 81-90 (£3.10)  Band 3: 91-100 (£2.90)  Band 4: 100+ (£2.60)',
  },
};

export function LoopsRoutesPanel() {
  const [loops, setLoops] = useState<LoopsRecord>(INITIAL_LOOPS);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [currentLoop, setCurrentLoop] = useState('ll3');
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState<RouteForm>(EMPTY_FORM);
  const [preservedRouteData, setPreservedRouteData] = useState<PreservedRouteData>({ postcodes: [], targetDel: 0, targetPu: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useModalBehavior(() => setModalOpen(false), modalOpen);

  const filteredLoops = useMemo(() => {
    if (!searchTerm.trim()) return loops;
    const s = searchTerm.toLowerCase().trim();
    const newLoops: LoopsRecord = {};
    Object.entries(loops).forEach(([loopId, routes]) => {
      const filtered = routes.filter(
        (r) => (r.id && r.id.toLowerCase().includes(s)) || (r.vendor && r.vendor.toLowerCase().includes(s)) || (r.notes && r.notes.toLowerCase().includes(s)),
      );
      if (filtered.length > 0 || loopId.toLowerCase().includes(s)) {
        newLoops[loopId] = filtered;
      }
    });
    return newLoops;
  }, [loops, searchTerm]);

  const loopEntries = useMemo(() => Object.entries(filteredLoops), [filteredLoops]);

  function handleOpenModal(mode: ModalMode, loopId: string, route: LoopRoute | null = null) {
    setModalMode(mode);
    setCurrentLoop(loopId);

    if (mode === 'edit' && route) {
      setEditingRouteId(route.id);
      setRouteForm({
        routeType: route.type,
        routeId: route.id,
        vendor: route.vendor,
        puCutoff: route.puCutoff,
        dificultLevel: route.dificultLevel,
        notes: route.notes,
        flexIn: route.flexIn,
        flexOut: route.flexOut,
        meetAddress: route.meetAddress,
        meetPostcode: route.meetPostcode,
        meetTime: route.meetTime,
        sortStart: route.sortStart,
        sortFinish: route.sortFinish,
        timeOnRoute: route.timeOnRoute,
        arriveTime: route.arriveTime,
        break: route.break,
        sporhTarget: route.sporhTarget,
        avgMon: route.avgMon,
        avgTue: route.avgTue,
        avgWed: route.avgWed,
        avgThu: route.avgThu,
        avgFri: route.avgFri,
      });
      setPreservedRouteData({
        postcodes: route.postcodes ?? [],
        targetDel: route.targetDel ?? 0,
        targetPu: route.targetPu ?? 0,
      });
    } else {
      setEditingRouteId(null);
      setRouteForm(EMPTY_FORM);
      setPreservedRouteData({ postcodes: [], targetDel: 0, targetPu: 0 });
    }

    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
  }

  function handleDeleteRoute(loopId: string, routeId: string) {
    if (!window.confirm(`Are you sure you want to delete route ${routeId}?`)) return;
    setLoops((prev) => ({
      ...prev,
      [loopId]: prev[loopId].filter((route) => route.id !== routeId),
    }));
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { id, value } = event.target;
    const key = id as keyof RouteForm;
    setRouteForm((prev) => ({
      ...prev,
      [key]: key === 'dificultLevel' ? Number(value) : value,
    }));
  }

  function handleSaveRoute() {
    const { routeType, routeId } = routeForm;

    if (!routeId || !routeType || routeType === 'Choose...') {
      window.alert('Route ID and Type are required.');
      return;
    }

    setLoops((prev) => {
      const loopRoutes = prev[currentLoop] ?? [];

      if (modalMode === 'add' && loopRoutes.some((route) => route.id.toUpperCase() === routeId.toUpperCase())) {
        window.alert(`Route ID ${routeId.toUpperCase()} already exists. Please choose a unique ID.`);
        return prev;
      }

      const normalizedRoute: LoopRoute = {
        id: routeForm.routeId.toUpperCase(),
        type: routeForm.routeType,
        vendor: routeForm.vendor,
        postcodes: preservedRouteData.postcodes ?? [],
        targetDel: preservedRouteData.targetDel ?? 0,
        targetPu: preservedRouteData.targetPu ?? 0,
        puCutoff: routeForm.puCutoff,
        dificultLevel: Number(routeForm.dificultLevel),
        notes: routeForm.notes,
        flexIn: routeForm.flexIn,
        flexOut: routeForm.flexOut,
        meetAddress: routeForm.meetAddress,
        meetPostcode: routeForm.meetPostcode,
        meetTime: routeForm.meetTime,
        sortStart: routeForm.sortStart,
        sortFinish: routeForm.sortFinish,
        timeOnRoute: routeForm.timeOnRoute,
        arriveTime: routeForm.arriveTime,
        break: routeForm.break,
        sporhTarget: routeForm.sporhTarget,
        avgMon: routeForm.avgMon,
        avgTue: routeForm.avgTue,
        avgWed: routeForm.avgWed,
        avgThu: routeForm.avgThu,
        avgFri: routeForm.avgFri,
      };

      const updatedLoopRoutes =
        modalMode === 'add'
          ? [...loopRoutes, normalizedRoute]
          : loopRoutes.map((route) =>
              route.id === editingRouteId ? { ...normalizedRoute, postcodes: route.postcodes, targetDel: route.targetDel, targetPu: route.targetPu } : route,
            );

      return {
        ...prev,
        [currentLoop]: updatedLoopRoutes,
      };
    });

    handleCloseModal();
  }

  return (
    <div className="logistics-page">
      <header className="lg-page-header">
        <h1 className="lg-page-title">Loops &amp; Routes</h1>
        <div className="lg-search-wrapper">
          <i className="bi bi-search" />
          <input type="text" placeholder="Search route or vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </header>

      <main>
        {loopEntries.map(([loopId, routes]) => {
          const rates = RATES_BY_LOOP[loopId];
          return (
            <div className="loop-card" key={loopId}>
              <div className="loop-header">
                <h2 className="loop-title">Loop: {loopId.toUpperCase()}</h2>
                <button type="button" className="btn-add-route" onClick={() => handleOpenModal('add', loopId)}>
                  <i className="bi bi-plus-lg" /> Add Route
                </button>
              </div>
              <div className="loop-body">
                {rates && (
                  <div className="rates-section">
                    <p className="mb-1">
                      <strong>Child Rates:</strong> <span>{rates.childRates}</span>
                    </p>
                    <p className="mb-0">
                      <strong>Flex Rates:</strong> <span>{rates.flexRates}</span>
                    </p>
                  </div>
                )}
                <div className="lg-table-responsive">
                  <table className="lg-table">
                    <thead>
                      <tr>
                        <th>Route ID</th>
                        <th>Type</th>
                        <th>Vendor</th>
                        <th>Postcodes</th>
                        <th>Target Del</th>
                        <th>Target PU</th>
                        <th>Target Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-4">
                            No routes yet.
                          </td>
                        </tr>
                      ) : (
                        routes.map((route) => (
                          <tr key={route.id}>
                            <td>
                              <strong>{route.id}</strong>
                            </td>
                            <td>
                              <span className={`badge-custom ${route.type.toLowerCase() === 'child' ? 'badge-child' : 'badge-flex'}`}>{route.type}</span>
                            </td>
                            <td>{route.vendor}</td>
                            <td>
                              {route.postcodes.map((postcode) => (
                                <span key={postcode} className="badge-custom badge-postcode">
                                  {postcode}
                                </span>
                              ))}
                            </td>
                            <td>{route.targetDel}</td>
                            <td>{route.targetPu}</td>
                            <td>{(route.targetDel ?? 0) + (route.targetPu ?? 0)}</td>
                            <td>
                              <button type="button" className="action-icon" title="Edit" onClick={() => handleOpenModal('edit', loopId, route)}>
                                <i className="bi bi-pencil-fill" />
                              </button>
                              <button type="button" className="action-icon" title="Delete" onClick={() => handleDeleteRoute(loopId, route.id)}>
                                <i className="bi bi-trash-fill" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {modalOpen && (
        <div className="va-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && handleCloseModal()}>
          <div className="va-modal" role="dialog" aria-modal="true" aria-labelledby="routeModalLabel">
            <div className="va-modal-header">
              <h2 className="va-modal-title" id="routeModalLabel">
                {modalMode === 'edit' ? `Edit Route: ${routeForm.routeId}` : `Add New Route to Loop ${currentLoop.toUpperCase()}`}
              </h2>
              <button type="button" className="va-modal-close" aria-label="Close" onClick={handleCloseModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="va-modal-body">
              <form onSubmit={(event) => event.preventDefault()}>
                <h3 className="form-section-title">Basic Info</h3>
                <div className="lg-form-grid">
                  <div className="lg-form-field">
                    <label htmlFor="routeType">Route Type</label>
                    <select id="routeType" value={routeForm.routeType} onChange={handleInputChange}>
                      <option>Choose...</option>
                      <option value="Child">Child</option>
                      <option value="Flex">Flex</option>
                    </select>
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="routeId">Route ID</label>
                    <input type="text" id="routeId" required readOnly={modalMode === 'edit'} value={routeForm.routeId} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="vendor">Vendor</label>
                    <input type="text" id="vendor" value={routeForm.vendor} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="puCutoff">PU Cut-off</label>
                    <input type="time" id="puCutoff" value={routeForm.puCutoff} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="dificultLevel">Dificult Level ({routeForm.dificultLevel})</label>
                    <input type="range" min="1" max="5" id="dificultLevel" value={routeForm.dificultLevel} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="lg-form-field" style={{ marginBottom: '1.5rem' }}>
                  <label htmlFor="notes">Notes</label>
                  <textarea id="notes" rows={2} value={routeForm.notes} onChange={handleInputChange} />
                </div>

                <h3 className="form-section-title">Postcode Info</h3>
                <div className="lg-form-grid lg-form-grid-2">
                  <div className="lg-form-field">
                    <label>Flex Postcodes</label>
                    <div className="lg-input-group">
                      <input type="text" id="flexIn" placeholder="Flex Postcode In" value={routeForm.flexIn} onChange={handleInputChange} />
                      <input type="text" id="flexOut" placeholder="Flex Postcode Out" value={routeForm.flexOut} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="lg-form-field">
                    <label>Meet Location</label>
                    <div className="lg-input-group">
                      <input type="text" id="meetAddress" placeholder="Address" value={routeForm.meetAddress} onChange={handleInputChange} />
                      <input type="text" id="meetPostcode" placeholder="Postcode" value={routeForm.meetPostcode} onChange={handleInputChange} />
                      <input type="time" id="meetTime" value={routeForm.meetTime} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <h3 className="form-section-title">Schedule Info</h3>
                <div className="lg-form-grid lg-form-grid-6">
                  <div className="lg-form-field">
                    <label htmlFor="sortStart">Sort Start</label>
                    <input type="time" id="sortStart" value={routeForm.sortStart} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="sortFinish">Sort Finish</label>
                    <input type="time" id="sortFinish" value={routeForm.sortFinish} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="timeOnRoute">Time on Route</label>
                    <input type="time" id="timeOnRoute" value={routeForm.timeOnRoute} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="arriveTime">Arrive Time</label>
                    <input type="time" id="arriveTime" value={routeForm.arriveTime} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="break">Break (mins)</label>
                    <input type="number" id="break" value={routeForm.break} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="sporhTarget">SPORH Target</label>
                    <input type="number" id="sporhTarget" value={routeForm.sporhTarget} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="lg-form-grid lg-form-grid-6" style={{ marginTop: '1rem', marginBottom: 0 }}>
                  <div className="lg-form-field">
                    <label htmlFor="avgMon">PU Avg MON</label>
                    <input type="number" id="avgMon" value={routeForm.avgMon} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="avgTue">PU Avg TUE</label>
                    <input type="number" id="avgTue" value={routeForm.avgTue} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="avgWed">PU Avg WED</label>
                    <input type="number" id="avgWed" value={routeForm.avgWed} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="avgThu">PU Avg THU</label>
                    <input type="number" id="avgThu" value={routeForm.avgThu} onChange={handleInputChange} />
                  </div>
                  <div className="lg-form-field">
                    <label htmlFor="avgFri">PU Avg FRI</label>
                    <input type="number" id="avgFri" value={routeForm.avgFri} onChange={handleInputChange} />
                  </div>
                </div>
              </form>
            </div>
            <div className="va-modal-footer">
              <button type="button" className="styled-button styled-button--outline" onClick={handleCloseModal}>
                Close
              </button>
              <button type="button" className="styled-button styled-button--primary" onClick={handleSaveRoute}>
                Save Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
