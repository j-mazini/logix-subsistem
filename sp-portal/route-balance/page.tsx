'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import './style.css';

/* ==================== TYPES ==================== */

type StopType = 'DEL' | 'PU';
type StopStatus = 'pending' | 'completed';
type RouteStatus = 'pending' | 'running' | 'delayed' | 'finished';
type SortAttendance = 'yes' | 'late' | 'no';
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Stop {
  id: number;
  routeName: string;
  stopNumber: number;
  postcode: string;
  address: string;
  customer: string;
  type: StopType;
  pm: boolean;
  pre12: boolean;
  asr: boolean;
  dsr: boolean;
  status: StopStatus;
}

type SendStatus = 'pending' | 'sent';

interface HistoryEntry {
  action: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  author: string;
  timestamp: string;
}

interface Route {
  id: number;
  name: string;
  vendor: string;
  driver: string;
  vehicle: string;
  target: number;
  totalStops: number;
  completedStops: number;
  completion: number;
  deliveries: number;
  pickups: number;
  pre12: number;
  asr: number;
  dsr: number;
  spr: number;
  sortAttendance: SortAttendance;
  notes: string;
  status: RouteStatus;
  sendStatus: SendStatus;
  history: HistoryEntry[];
  stops: Stop[];
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface TransferContext {
  sourceRouteId: number;
  targetRouteId: number;
  subcode: string;
  postcodes: { postcode: string; stops: Stop[] }[];
  mode: 'subpostcode' | 'postcode';
}

interface SubpostcodeGroup {
  code: string;
  postcodes: { postcode: string; stops: Stop[]; del: number; pu: number; pre12: boolean }[];
  del: number;
  pu: number;
  total: number;
  completion: number;
  allCompleted: boolean;
  pre12: boolean;
}

/* ==================== STATIC DATA ==================== */

const VENDORS = ['FedEx', 'UPS', 'DPD', 'TNT', 'Logixsphere'];
const DRIVERS = [
  'Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
  'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa',
];
const VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
const SUBPOSTCODES = Array.from({ length: 8 }, (_, i) => `ME${i + 1}`);
const POSTCODES = SUBPOSTCODES.flatMap((sub) => Array.from({ length: 5 }, (_, i) => `${sub} ${i + 1}AB`));
const STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road', 'Park View', 'Queensway', 'Riverside Drive'];

/* ==================== HELPERS ==================== */

function rand(n: number) {
  return Math.floor(Math.random() * n);
}
function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

function deriveStatus(route: Pick<Route, 'completion' | 'target'>): RouteStatus {
  if (route.completion >= 100) return 'finished';
  if (route.completion === 0) return 'pending';
  if (route.completion < route.target - 30) return 'delayed';
  return 'running';
}

function recomputeRoute(route: Route): Route {
  const totalStops = route.stops.length;
  const deliveries = route.stops.filter((s) => s.type === 'DEL').length;
  const completedStops = route.stops.filter((s) => s.status === 'completed').length;
  const pre12 = route.stops.filter((s) => s.pre12).length;
  const asr = route.stops.filter((s) => s.asr).length;
  const dsr = route.stops.filter((s) => s.dsr).length;
  const completion = totalStops ? Math.round((completedStops / totalStops) * 100) : 0;
  const next: Route = {
    ...route,
    totalStops,
    deliveries,
    pickups: totalStops - deliveries,
    completedStops,
    pre12,
    asr,
    dsr,
    completion,
  };
  next.status = deriveStatus(next);
  return next;
}

function generateFakeData(): Route[] {
  let stopId = 1;
  const routes: Route[] = [];

  for (let i = 1; i <= 8; i++) {
    const totalStops = 22 + rand(8);
    const deliveries = Math.floor(totalStops * 0.72);
    const completion = rand(101);
    const completedStops = Math.round((totalStops * completion) / 100);

    const route: Route = {
      id: i,
      name: `A-${String(i).padStart(2, '0')}`,
      vendor: pick(VENDORS),
      driver: DRIVERS[(i - 1) % DRIVERS.length],
      vehicle: pick(VEHICLES),
      target: 80 + rand(16),
      totalStops,
      completedStops,
      completion,
      deliveries,
      pickups: totalStops - deliveries,
      pre12: 0,
      asr: 0,
      dsr: 0,
      spr: 90 + rand(80),
      sortAttendance: pick(['yes', 'yes', 'yes', 'late', 'no'] as SortAttendance[]),
      notes: '',
      status: 'pending',
      sendStatus: 'pending',
      history: [],
      stops: [],
    };
    route.status = deriveStatus(route);

    for (let j = 0; j < totalStops; j++) {
      const isPM = Math.random() > 0.68;
      route.stops.push({
        id: stopId++,
        routeName: route.name,
        stopNumber: j + 1,
        postcode: pick(POSTCODES),
        address: `${1 + rand(200)} ${pick(STREETS)}`,
        customer: `Customer ${100 + rand(900)}`,
        type: j < deliveries ? 'DEL' : 'PU',
        pm: isPM,
        // Pre-12 ("must deliver before 12:00") is AM-only — never roll it for PM stops.
        pre12: !isPM && Math.random() > 0.78,
        asr: Math.random() > 0.15,
        dsr: Math.random() > 0.12,
        status: j < completedStops ? 'completed' : 'pending',
      });
    }

    route.pre12 = route.stops.filter((s) => s.pre12).length;
    route.asr = route.stops.filter((s) => s.asr).length;
    route.dsr = route.stops.filter((s) => s.dsr).length;
    routes.push(route);
  }

  return routes;
}

function subpostcodeOf(postcode: string) {
  return postcode.split(' ')[0];
}

function visibleStops(route: Route, filterPM: boolean, filterPre12: boolean): Stop[] {
  let stops = filterPM ? route.stops.filter((s) => s.pm) : route.stops.filter((s) => !s.pm);
  if (filterPre12) stops = stops.filter((s) => s.pre12);
  return stops;
}

function groupBySubpostcode(stops: Stop[], filterPM: boolean): SubpostcodeGroup[] {
  const bySub = new Map<string, Map<string, Stop[]>>();
  stops.forEach((s) => {
    const sub = subpostcodeOf(s.postcode);
    if (!bySub.has(sub)) bySub.set(sub, new Map());
    const byPc = bySub.get(sub)!;
    if (!byPc.has(s.postcode)) byPc.set(s.postcode, []);
    byPc.get(s.postcode)!.push(s);
  });

  const groups: SubpostcodeGroup[] = [...bySub.entries()].map(([code, byPc]) => {
    const groupStops = [...byPc.values()].flat();
    const del = groupStops.filter((s) => s.type === 'DEL').length;
    const completed = groupStops.filter((s) => s.status === 'completed').length;
    return {
      code,
      postcodes: [...byPc.entries()].map(([postcode, pcStops]) => ({
        postcode,
        stops: pcStops,
        del: pcStops.filter((s) => s.type === 'DEL').length,
        pu: pcStops.filter((s) => s.type === 'PU').length,
        // Pre-12 only applies to the AM shift; never flag it while viewing PM.
        pre12: !filterPM && pcStops.some((s) => s.pre12),
      })),
      del,
      pu: groupStops.length - del,
      total: groupStops.length,
      completion: groupStops.length ? Math.round((completed / groupStops.length) * 100) : 0,
      allCompleted: completed === groupStops.length,
      // Pre-12 only applies to the AM shift; never flag it while viewing PM.
      pre12: !filterPM && groupStops.some((s) => s.pre12),
    };
  });

  groups.sort((a, b) => (b.pre12 ? 1 : 0) - (a.pre12 ? 1 : 0));
  return groups;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-badge-${status}`}>{status}</span>;
}

let toastSeq = 0;

/* ==================== COMPONENT ==================== */

export default function RouteBalancePage() {
  useBodyClass('route-balance-page has-beam-sidebar');

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [currentUser] = useState('João Silva');
  const [now, setNow] = useState(new Date());
  const [filterPM, setFilterPM] = useState(false);
  const [filterPre12, setFilterPre12] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof Route | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [transferContext, setTransferContext] = useState<TransferContext | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sentRoutes, setSentRoutes] = useState<Set<number>>(new Set());
  const [pmListingOpen, setPmListingOpen] = useState(false);

  // Modals
  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [addPostcodeOpen, setAddPostcodeOpen] = useState(false);
  const [allStopsRoute, setAllStopsRoute] = useState<Route | null>(null);
  const [shipmentRoute, setShipmentRoute] = useState<Route | null>(null);
  const [editingStop, setEditingStop] = useState<Stop | null>(null);
  const [editPostcodeValue, setEditPostcodeValue] = useState('');
  const [editPre12Value, setEditPre12Value] = useState(false);
  const [editScopeAll, setEditScopeAll] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  // Add Route form
  const [newRouteName, setNewRouteName] = useState('');
  const [newDriver, setNewDriver] = useState(DRIVERS[0]);
  const [newTarget, setNewTarget] = useState(85);

  // Add Postcode form
  const [postcodeType, setPostcodeType] = useState<'postcode' | 'subpostcode'>('postcode');
  const [postcodeInput, setPostcodeInput] = useState('');
  const [addPostcodeRouteId, setAddPostcodeRouteId] = useState('');

  const dragPayload = useRef<{ subpostcode: string; sourceRouteId: number } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Init: fake data + loading overlay fade
  useEffect(() => {
    setRoutes(generateFakeData());
    const t = setTimeout(() => setLoading(false), 500);
    showToast('Operation data loaded', 'success');
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const operationDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const operationTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const filteredRoutes = useMemo(() => {
    let list = [...routes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q));
    }
    if (vendorFilter) list = list.filter((r) => r.vendor === vendorFilter);
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    // A route with no stops under the current AM/PM shift filter is not
    // relevant to that shift (e.g. an all-Pre-12 route has no PM stops) —
    // don't show it as an empty card.
    list = list.filter((r) => visibleStops(r, filterPM, filterPre12).length > 0);
    if (sortKey) {
      const dir = sortAsc ? 1 : -1;
      list.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
      });
    }
    return list;
  }, [routes, searchQuery, vendorFilter, statusFilter, sortKey, sortAsc, filterPM, filterPre12]);

  const dashboardCards = useMemo(() => {
    const stops = routes.flatMap((r) => visibleStops(r, filterPM, filterPre12));
    const totalStops = stops.length;
    const deliveries = stops.filter((s) => s.type === 'DEL').length;
    const pickups = totalStops - deliveries;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    return {
      totalStops,
      deliveries,
      pickups,
      spr: Math.round(avg(routes.map((r) => r.spr))),
      targetLoop: Math.round(avg(routes.map((r) => r.target))),
      totalRoutes: routes.length,
      driversOnline: new Set(routes.filter((r) => r.status === 'running').map((r) => r.driver)).size,
    };
  }, [routes, filterPM, filterPre12]);

  function updateRoute(routeId: number, updater: (r: Route) => Route) {
    setRoutes((prev) => prev.map((r) => (r.id === routeId ? updater(r) : r)));
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* ---- Actions ---- */

  function refresh() {
    showToast('Data refreshed', 'info');
  }

  function startOperation() {
    setRoutes((prev) => prev.map((r) => (r.status === 'pending' ? { ...r, status: 'running' } : r)));
    showToast('Operation started — routes set to Running', 'success');
  }

  function finishOperation() {
    if (!confirm('Are you sure?')) return;
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'finished',
        completion: 100,
        completedStops: r.totalStops,
        stops: r.stops.map((s) => ({ ...s, status: 'completed' as StopStatus })),
      })),
    );
    showToast('Operation finished', 'success');
  }

  /**
   * Sends all currently visible routes. Individual sends (sendToDriverIndividual) already
   * mark a route sent with its own history entry, so batch only appends a new entry for
   * routes not yet sent — unless every visible route is already sent, which is an explicit
   * "resend all" and gets a fresh entry for each.
   */
  function sendToDrivers() {
    const visible = filteredRoutes.filter((r) => visibleStops(r, filterPM, filterPre12).length > 0);
    if (!visible.length) {
      showToast('No routes to send', 'error');
      return;
    }
    const resend = visible.every((r) => sentRoutes.has(r.id));
    const ids = new Set(visible.map((r) => r.id));
    setRoutes((prev) =>
      prev.map((r) => {
        if (!ids.has(r.id) || (!resend && sentRoutes.has(r.id))) return r;
        const entry: HistoryEntry = {
          action: resend ? 'Resend to Driver (batch)' : 'Send to Driver (batch)',
          field: 'sendStatus',
          oldValue: r.sendStatus,
          newValue: 'sent',
          author: currentUser,
          timestamp: new Date().toISOString(),
        };
        return { ...r, sendStatus: 'sent', history: [...r.history, entry] };
      }),
    );
    setSentRoutes((prev) => {
      const next = new Set(prev);
      visible.forEach((r) => next.add(r.id));
      return next;
    });
    const drivers = new Set(visible.map((r) => r.driver)).size;
    showToast(
      `${visible.length} route manifest${visible.length === 1 ? '' : 's'} ${resend ? 're-sent' : 'sent'} to ${drivers} driver${drivers === 1 ? '' : 's'}`,
      'success',
    );
  }

  /** Per-route send action, independent of sendToDrivers() and not gated to AM or PM. */
  function sendToDriverIndividual(routeId: number) {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    if (sentRoutes.has(routeId) && route.sendStatus === 'sent') {
      showToast(`Route ${route.name} was already sent to ${route.driver}`, 'info');
      return;
    }
    const entry: HistoryEntry = {
      action: 'Send to Driver',
      field: 'sendStatus',
      oldValue: route.sendStatus,
      newValue: 'sent',
      author: currentUser,
      timestamp: new Date().toISOString(),
    };
    updateRoute(routeId, (r) => ({ ...r, sendStatus: 'sent', history: [...r.history, entry] }));
    setSentRoutes((prev) => new Set(prev).add(routeId));
    showToast(`Manifest sent to ${route.driver} (Route ${route.name})`, 'success');
  }

  /** Pops the last history entry off a route and restores the changed field to its oldValue, logging the revert itself. */
  function revertLastAction(routeId: number) {
    const route = routes.find((r) => r.id === routeId);
    if (!route || route.history.length === 0) return;
    if (!confirm(`Revert the last action on route ${route.name}?`)) return;

    const history = [...route.history];
    const last = history.pop()!;
    const revertedFrom = (route as unknown as Record<string, unknown>)[last.field];
    const restored = last.oldValue;

    const revertEntry: HistoryEntry = {
      action: 'Revert',
      field: 'status',
      oldValue: revertedFrom,
      newValue: restored,
      author: currentUser,
      timestamp: new Date().toISOString(),
    };

    updateRoute(routeId, (r) => ({ ...r, [last.field]: restored, history: [...history, revertEntry] }) as Route);

    if (last.field === 'sendStatus') {
      setSentRoutes((prev) => {
        const next = new Set(prev);
        if (restored === 'sent') next.add(routeId);
        else next.delete(routeId);
        return next;
      });
    }

    showToast(`Reverted last action on route ${route.name}`, 'success');
  }

  /** Mock auth gate: reuses the SP-login session flag set by sp-portal/select/login.js — no real security boundary. */
  function isAuthorizedForPmListing() {
    try {
      return !!sessionStorage.getItem('dhl_sp_portal_current_sp');
    } catch {
      return false;
    }
  }

  const pmAsrDsrRecords = useMemo(() => {
    // PM has no Pre-12 category (Pre-12 is AM-only) — this listing must only ever surface ASR/DSR.
    const records: { route: Route; stop: Stop }[] = [];
    routes.forEach((route) => {
      route.stops.filter((s) => s.pm && (s.asr || s.dsr)).forEach((stop) => records.push({ route, stop }));
    });
    if (sortKey) {
      const dir = sortAsc ? 1 : -1;
      records.sort((a, b) => {
        const av = a.route[sortKey];
        const bv = b.route[sortKey];
        return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
      });
    }
    return records;
  }, [routes, sortKey, sortAsc]);

  function openAddRouteModal() {
    setNewRouteName('');
    setNewDriver(DRIVERS[0]);
    setNewTarget(85);
    setAddRouteOpen(true);
  }

  function saveNewRoute() {
    const name = newRouteName.trim();
    if (!name) {
      showToast('Route name is required', 'error');
      return;
    }
    if (routes.some((r) => r.name === name)) {
      showToast('A route with this name already exists', 'error');
      return;
    }
    const route: Route = {
      id: Date.now(),
      name,
      vendor: newDriver,
      driver: newDriver,
      vehicle: '',
      target: Number.isNaN(newTarget) ? 85 : newTarget,
      totalStops: 0,
      completedStops: 0,
      completion: 0,
      deliveries: 0,
      pickups: 0,
      pre12: 0,
      asr: 0,
      dsr: 0,
      spr: 0,
      sortAttendance: 'yes',
      notes: '',
      status: 'pending',
      sendStatus: 'pending',
      history: [],
      stops: [],
    };
    setRoutes((prev) => [...prev, route]);
    setAddRouteOpen(false);
    showToast(`Route ${name} added`, 'success');
  }

  function collapseRoute(routeId: number | null = null) {
    if (routes.length <= 1) {
      showToast('At least two routes are required to collapse', 'error');
      return;
    }
    const removed = routeId != null ? routes.find((r) => r.id === routeId) : routes.reduce((min, r) => (r.totalStops < min.totalStops ? r : min));
    if (!removed) {
      showToast('Route not found', 'error');
      return;
    }
    if (!confirm(`Close route ${removed.name}? Its ${removed.totalStops} postcodes will be redistributed across the other routes.`)) return;

    setRoutes((prev) => {
      const remaining = prev.filter((r) => r.id !== removed.id).map((r) => ({ ...r, stops: [...r.stops] }));
      removed.stops.forEach((stop, i) => {
        const dest = remaining[i % remaining.length];
        dest.stops.push({ ...stop, routeName: dest.name, stopNumber: dest.stops.length + 1 });
      });
      return remaining.map(recomputeRoute);
    });
    showToast(`Route ${removed.name} closed — postcodes redistributed`, 'success');
  }

  function togglePre12Filter() {
    setFilterPre12((v) => {
      showToast(`Pre 12 filter ${!v ? 'enabled' : 'disabled'}`, 'info');
      return !v;
    });
  }

  function exportCsv() {
    const header = ['Route', 'Vendor', 'Target (%)', 'Total Stops', 'Status'];
    const rows = filteredRoutes.map((r) => [r.name, r.vendor, r.target, r.totalStops, r.status]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `demi8-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('✓ Demi8 report exported', 'success');
  }

  function handleSort(key: keyof Route) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function openEditStopModal(stop: Stop) {
    setEditingStop(stop);
    setEditPostcodeValue(stop.postcode);
    setEditPre12Value(stop.pre12);
    setEditScopeAll(false);
  }

  function saveStopEdit() {
    if (!editingStop) return;
    const newPostcode = editPostcodeValue.trim().toUpperCase();
    if (!newPostcode) {
      showToast('Postcode is required', 'error');
      return;
    }
    const route = routes.find((r) => r.name === editingStop.routeName);
    const oldPostcode = editingStop.postcode;

    // Pre-12 is AM-only — a PM stop can never also be Pre-12.
    let pre12Value = editPre12Value;
    if (pre12Value && editingStop.pm) {
      pre12Value = false;
      showToast('Pre 12 was cleared: a PM stop cannot also be Pre-12', 'warning');
    }

    if (editScopeAll && route) {
      const affectedCount = route.stops.filter((s) => s.postcode === oldPostcode).length;
      updateRoute(route.id, (r) =>
        recomputeRoute({
          ...r,
          stops: r.stops.map((s) => (s.postcode === oldPostcode ? { ...s, postcode: newPostcode, pre12: s.id === editingStop.id ? pre12Value : s.pre12 } : s)),
        }),
      );
      showToast(`${oldPostcode} → ${newPostcode} on ${affectedCount} stop(s) of route ${route.name}`, 'success');
    } else if (route) {
      updateRoute(route.id, (r) =>
        recomputeRoute({
          ...r,
          stops: r.stops.map((s) => (s.id === editingStop.id ? { ...s, postcode: newPostcode, pre12: pre12Value } : s)),
        }),
      );
      showToast('Stop updated', 'success');
    }
    setEditingStop(null);
  }

  function openAddPostcodeModal() {
    setPostcodeInput('');
    setPostcodeType('postcode');
    setAddPostcodeRouteId('');
    setAddPostcodeOpen(true);
  }

  function confirmAddPostcode() {
    const code = postcodeInput.trim().toUpperCase();
    if (!code) {
      showToast('Please enter a postcode or subpostcode', 'error');
      return;
    }
    const affectedRoutes = addPostcodeRouteId ? routes.filter((r) => r.id === Number(addPostcodeRouteId)) : routes;
    if (affectedRoutes.length === 0) {
      showToast('Route not found', 'error');
      return;
    }
    if (postcodeType === 'postcode') {
      if (!/^[A-Z]{2}\d{1,2} \d[A-Z]{2}$/.test(code)) {
        showToast('Invalid postcode format (e.g. ME15 6AB)', 'error');
        return;
      }
    } else if (!/^[A-Z]{2}\d{1,2}$/.test(code)) {
      showToast('Invalid subpostcode format (e.g. ME15)', 'error');
      return;
    }
    showToast(`✓ ${postcodeType === 'postcode' ? 'Postcode' : 'Subpostcode'} ${code} added to ${affectedRoutes.length} route(s)`, 'success');
    setAddPostcodeOpen(false);
  }

  /* ---- Rebalance / transfer ---- */

  function openTransferModal(sourceRouteId: number, targetRouteId: number, subcode: string) {
    const sourceRoute = routes.find((r) => r.id === sourceRouteId);
    const targetRoute = routes.find((r) => r.id === targetRouteId);
    if (!sourceRoute || !targetRoute) return;

    const groupStops = sourceRoute.stops.filter((s) => subpostcodeOf(s.postcode) === subcode);
    if (groupStops.length === 0) {
      showToast('Nothing to transfer', 'error');
      return;
    }
    const byPostcode = new Map<string, Stop[]>();
    groupStops.forEach((s) => {
      if (!byPostcode.has(s.postcode)) byPostcode.set(s.postcode, []);
      byPostcode.get(s.postcode)!.push(s);
    });

    setTransferContext({
      sourceRouteId,
      targetRouteId,
      subcode,
      postcodes: [...byPostcode.entries()].map(([postcode, stops]) => ({ postcode, stops })),
      mode: 'subpostcode',
    });
  }

  function transferPostcodesToRoute(sourceRouteId: number, targetRouteId: number, stopIds: number[]) {
    if (stopIds.length === 0) {
      showToast('No postcodes selected to transfer', 'error');
      return;
    }
    const sourceRoute = routes.find((r) => r.id === sourceRouteId);
    const targetRoute = routes.find((r) => r.id === targetRouteId);
    if (!sourceRoute || !targetRoute) {
      showToast('Invalid route selection', 'error');
      return;
    }

    const moving = sourceRoute.stops.filter((s) => stopIds.includes(s.id));
    if (moving.length === 0) {
      showToast('Nothing to transfer', 'error');
      return;
    }

    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === sourceRoute.id) {
          return recomputeRoute({ ...r, stops: r.stops.filter((s) => !stopIds.includes(s.id)) });
        }
        if (r.id === targetRoute.id) {
          const appended = moving.map((s, i) => ({ ...s, routeName: targetRoute.name, stopNumber: r.stops.length + i + 1 }));
          return recomputeRoute({ ...r, stops: [...r.stops, ...appended] });
        }
        return r;
      }),
    );
    showToast(`✓ Moved ${moving.length} postcode(s): ${sourceRoute.name} → ${targetRoute.name}`, 'success');
  }

  function confirmTransfer(checkedIndices: number[]) {
    const ctx = transferContext;
    if (!ctx) return;
    let stopIds: number[];
    if (ctx.mode === 'subpostcode') {
      stopIds = ctx.postcodes.flatMap((p) => p.stops.map((s) => s.id));
    } else {
      if (checkedIndices.length === 0) {
        showToast('Select at least one postcode', 'error');
        return;
      }
      stopIds = checkedIndices.flatMap((i) => ctx.postcodes[i].stops.map((s) => s.id));
    }
    transferPostcodesToRoute(ctx.sourceRouteId, ctx.targetRouteId, stopIds);
    setTransferContext(null);
  }

  function handleDragStart(e: React.DragEvent, subpostcode: string, sourceRouteId: number) {
    if (!rebalanceMode) return;
    e.dataTransfer.effectAllowed = 'move';
    dragPayload.current = { subpostcode, sourceRouteId };
    e.dataTransfer.setData('text/plain', subpostcode);
  }

  function handleDragOver(e: React.DragEvent, routeId: number) {
    if (!dragPayload.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, targetRouteId: number) {
    e.preventDefault();
    const payload = dragPayload.current;
    dragPayload.current = null;
    if (!payload) return;
    if (payload.sourceRouteId !== targetRouteId) {
      openTransferModal(payload.sourceRouteId, targetRouteId, payload.subpostcode);
    }
  }

  function openRoutePreview(routeId: number) {
    setSelectedRouteId(routeId);
  }

  function navigatePreview(direction: 'prev' | 'next') {
    if (!selectedRouteId) return;
    const currentIndex = filteredRoutes.findIndex(r => r.id === selectedRouteId);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = filteredRoutes.length - 1;
    if (nextIndex >= filteredRoutes.length) nextIndex = 0;

    setSelectedRouteId(filteredRoutes[nextIndex].id);
  }

  const allPostcodesInUse = useMemo(() => [...new Set(routes.flatMap((r) => r.stops.map((s) => s.postcode)))].sort(), [routes]);

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
        <div className="spinner" />
        <p>Loading operation data…</p>
      </div>

      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <main className="route-balance-container container-fluid px-3 px-lg-4 py-4">
          <div className="dashboard-view" id="dashboardView">
            <header className="page-header-section">
              <div className="page-header-welcome-text">
                <h1 className="page-header-title">Route Balance</h1>
                <p className="page-header-date">
                  <i className="bi bi-truck" />Operational route management
                </p>
              </div>
              <div className="header-info">
                <div className="info-item">
                  <span className="label"><i className="bi bi-calendar3" /> Date</span>
                  <span className="value">{operationDate}</span>
                </div>
                <div className="info-item info-item--clock">
                  <span className="label"><i className="bi bi-clock" /> Time</span>
                  <span className="value">{operationTime}</span>
                </div>
                <div className="info-item">
                  <span className="label"><i className="bi bi-person-circle" /> User</span>
                  <span className="value">{currentUser}</span>
                </div>
                <button className="styled-button styled-button--primary btn-refresh" title="Refresh data" onClick={refresh}>
                  <i className="bi bi-arrow-clockwise" />
                </button>
              </div>
            </header>

            <div className="controls-bar">
              <div className="btn-group-main">
                <button className="styled-button styled-button--success" onClick={startOperation}>
                  <i className="bi bi-play-fill" /> Start
                </button>
                <button className="styled-button styled-button--danger" onClick={finishOperation}>
                  <i className="bi bi-stop-fill" /> Finish
                </button>
                <button className="styled-button styled-button--primary" onClick={openAddRouteModal}>
                  <i className="bi bi-plus-circle" /> Add New Flex Route
                </button>
                <button className="styled-button styled-button--outline" onClick={openAddPostcodeModal}>
                  <i className="bi bi-geo-alt" /> Add Postcode
                </button>
                <button className="styled-button styled-button--outline" onClick={() => collapseRoute()}>
                  <i className="bi bi-arrows-collapse" /> Collapse Routes
                </button>
                <button className="styled-button styled-button--outline" onClick={exportCsv}>
                  <i className="bi bi-filetype-csv" /> Export Demi8
                </button>
                <button className="styled-button styled-button--outline" onClick={sendToDrivers}>
                  <i className="bi bi-send" /> Send to Driver
                </button>
                <button className="styled-button styled-button--outline" onClick={() => setPmListingOpen(true)}>
                  <i className="bi bi-clipboard-data" /> PM ASR/DSR Listing
                </button>
              </div>

              <div className="filter-group">
                <label className="toggle-label" htmlFor="ampmToggle">Shift</label>
                <div className="toggle-switch">
                  <input type="checkbox" id="ampmToggle" checked={filterPM} onChange={(e) => {
                    setFilterPM(e.target.checked);
                    showToast(e.target.checked ? '📅 PM View: Meeting Mode' : '🚚 AM View: Regular Deliveries', 'info');
                  }} />
                  <label htmlFor="ampmToggle">
                    <span className="toggle-text am">AM</span>
                    <span className="toggle-slider" />
                    <span className="toggle-text pm">PM</span>
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <label className="toggle-label" htmlFor="rebalanceToggle">Mode</label>
                <div className="mode-switch" title="Rebalance mode: select and transfer postcodes between routes">
                  <input type="checkbox" id="rebalanceToggle" className="mode-switch-input" checked={rebalanceMode} onChange={(e) => {
                    setRebalanceMode(e.target.checked);
                    showToast(e.target.checked ? '🔄 Rebalance mode: select postcodes to transfer' : 'Operations mode: standard view', 'info');
                  }} />
                  <label htmlFor="rebalanceToggle" className="mode-switch-track">
                    <span className="mode-switch-thumb" aria-hidden="true" />
                    <span className="mode-switch-option">
                      <i className="bi bi-compass" />
                      <span>Operations</span>
                    </span>
                    <span className="mode-switch-option">
                      <i className="bi bi-shuffle" />
                      <span>Rebalance</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="filters-bar">
              <div className="search-wrap">
                <i className="bi bi-search" />
                <input
                  type="text"
                  id="searchRoute"
                  className="form-control"
                  placeholder="Search by route or driver…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                />
              </div>
              <select className="form-select filter-select" id="filterVendor" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                <option value="">All vendors</option>
                {VENDORS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <select className="form-select filter-select" id="filterStatus" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="running">Running</option>
                <option value="finished">Finished</option>
                <option value="pending">Pending</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>

            <section className="operation-summary">
              <div className="section-header">
                <h2>Operation Summary</h2>
              </div>

              <div className="summary-grid">
                <div className="summary-table-wrapper">
                  <div className="table-responsive">
                    <table className="table table-hover" id="summaryTable">
                      <thead>
                        {filterPM ? (
                          <tr>
                            <th>Route</th>
                            <th>Driver</th>
                            <th>Meeting Stops</th>
                            <th>Status</th>
                          </tr>
                        ) : (
                          <tr>
                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Route <i className="bi bi-arrow-down-up" /></th>
                            <th onClick={() => handleSort('vendor')} style={{ cursor: 'pointer' }}>Vendor <i className="bi bi-arrow-down-up" /></th>
                            <th>Target (%)</th>
                            <th>Total Stops</th>
                            <th>Status</th>
                          </tr>
                        )}
                      </thead>
                      <tbody id="summaryTableBody">
                        {filteredRoutes.map((route) =>
                          filterPM ? (
                            <tr key={route.id}>
                              <td><strong>{route.name}</strong></td>
                              <td>{route.driver}</td>
                              <td>{visibleStops(route, filterPM, filterPre12).length}</td>
                              <td><StatusBadge status={route.status} /></td>
                            </tr>
                          ) : (
                            <tr key={route.id}>
                              <td><strong>{route.name}</strong></td>
                              <td>{route.vendor}</td>
                              <td>{route.target}%</td>
                              <td>{visibleStops(route, filterPM, filterPre12).length}</td>
                              <td><StatusBadge status={route.status} /></td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="summary-cards">
                  <div className="stat-card" data-tooltip="Total stops across all routes">
                    <div className="stat-icon"><i className="bi bi-stack" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.totalStops}</div>
                      <div className="stat-label">Total Stops</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Total deliveries">
                    <div className="stat-icon"><i className="bi bi-box-seam" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.deliveries}</div>
                      <div className="stat-label">Deliveries</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Total pickups">
                    <div className="stat-icon"><i className="bi bi-arrow-repeat" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.pickups}</div>
                      <div className="stat-label">Pickups</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Estimated stops per route">
                    <div className="stat-icon"><i className="bi bi-speedometer2" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.spr}</div>
                      <div className="stat-label">SPR (est.)</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Average target loop">
                    <div className="stat-icon"><i className="bi bi-bullseye" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.targetLoop}%</div>
                      <div className="stat-label">Target Loop</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Active routes">
                    <div className="stat-icon"><i className="bi bi-diagram-3" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.totalRoutes}</div>
                      <div className="stat-label">Total Routes</div>
                    </div>
                  </div>
                  <div className="stat-card" data-tooltip="Drivers currently online">
                    <div className="stat-icon"><i className="bi bi-person-badge" /></div>
                    <div className="stat-content">
                      <div className="stat-value">{dashboardCards.driversOnline}</div>
                      <div className="stat-label">Drivers Online</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="route-blocks" id="routeBlocksContainer">
              {filterPM
                ? filteredRoutes.map((route) => {
                    const stops = visibleStops(route, filterPM, filterPre12);
                    if (stops.length === 0) return null;
                    return (
                      <section className="route-block pm-meeting-view" data-route-id={route.id} key={route.id}>
                        <div className="route-block-header">
                          <h3 className="route-block-title">📅 Route {route.name} — Meeting View</h3>
                          <div className="route-block-header-right">
                            <span className="shift-badge shift-badge-pm">PM</span>
                            <span className={`status-badge status-badge-${route.sendStatus === 'sent' ? 'completed' : 'pending'}`}>
                              {route.sendStatus === 'sent' ? 'Sent' : 'Pending'}
                            </span>
                            <button className="route-collapse-btn" title="Send this route's manifest to the driver" onClick={() => sendToDriverIndividual(route.id)}>
                              <i className="bi bi-send" /> Send
                            </button>
                            {route.history.length > 0 && (
                              <button className="route-collapse-btn" title="Revert last action on this route" onClick={() => revertLastAction(route.id)}>
                                <i className="bi bi-arrow-counterclockwise" /> Revert
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="route-block-content">
                          <div className="route-info-grid">
                            <div className="info-box">
                              <span className="info-box-label">Driver</span>
                              <span className="info-box-value">{route.driver}</span>
                            </div>
                            <div className="info-box">
                              <span className="info-box-label">Vendor</span>
                              <span className="info-box-value">{route.vendor}</span>
                            </div>
                          </div>
                          <div className="route-table-responsive">
                            <table className="route-table">
                              <thead>
                                <tr>
                                  <th>Stop #</th><th>Address</th><th>Postcode</th><th>Customer</th><th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stops.map((s, idx) => (
                                  <tr key={s.id}>
                                    <td>#{idx + 1}</td>
                                    <td>{s.address}</td>
                                    <td>{s.postcode}</td>
                                    <td>{s.customer}</td>
                                    <td><StatusBadge status={s.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="route-totals">
                            <div className="total-item">
                              <div className="total-label">Meeting Stops</div>
                              <div className="total-value">{stops.length}</div>
                            </div>
                          </div>
                          <div className="route-buttons">
                            <button className="styled-button styled-button--outline" onClick={() => setAllStopsRoute(route)}>
                              <i className="bi bi-geo-alt" /> See All Stops
                            </button>
                          </div>
                        </div>
                      </section>
                    );
                  })
                : filteredRoutes.map((route) => {
                    const stops = visibleStops(route, filterPM, filterPre12);
                    const groups = groupBySubpostcode(stops, filterPM);
                    const del = stops.filter((s) => s.type === 'DEL').length;
                    const pu = stops.length - del;
                    return (
                      <section
                        className={`route-block status-${route.status} ${rebalanceMode ? 'rebalance-mode' : ''} ${selectedRouteId === route.id ? 'selected' : ''}`}
                        data-route-id={route.id}
                        key={route.id}
                        onDragOver={(e) => handleDragOver(e, route.id)}
                        onDrop={(e) => handleDrop(e, route.id)}
                        onClick={() => !rebalanceMode && openRoutePreview(route.id)}
                        style={{ cursor: !rebalanceMode ? 'pointer' : 'default' }}
                      >
                        <div className="route-block-header">
                          <h3 className="route-block-title">Route {route.name}</h3>
                          <div className="route-block-header-right">
                            <span className={`status-badge status-badge-${route.sendStatus === 'sent' ? 'completed' : 'pending'}`}>
                              {route.sendStatus === 'sent' ? 'Sent' : 'Pending'}
                            </span>
                            <button className="route-collapse-btn" title="Send this route's manifest to the driver" onClick={() => sendToDriverIndividual(route.id)}>
                              <i className="bi bi-send" /> Send
                            </button>
                            {route.history.length > 0 && (
                              <button className="route-collapse-btn" title="Revert last action on this route" onClick={() => revertLastAction(route.id)}>
                                <i className="bi bi-arrow-counterclockwise" /> Revert
                              </button>
                            )}
                            <button className="route-collapse-btn" title="Close this route and redistribute its postcodes" onClick={() => collapseRoute(route.id)}>
                              <i className="bi bi-box-arrow-in-down" /> Close route
                            </button>
                          </div>
                        </div>

                        <div className="route-block-content">
                          <div className="route-info-grid">
                            <div className="info-box">
                              <span className="info-box-label">Vendor (Driver)</span>
                              <select
                                className="info-box-select"
                                title="Change vendor/driver"
                                value={route.vendor}
                                onChange={(e) => {
                                  updateRoute(route.id, (r) => ({ ...r, vendor: e.target.value }));
                                  showToast(`Vendor updated to ${e.target.value}`, 'success');
                                }}
                              >
                                {VENDORS.map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                            <div className="info-box">
                              <span className="info-box-label">Driver</span>
                              <span className="info-box-value">{route.driver}</span>
                            </div>
                          </div>

                          <div className="route-table-responsive">
                            <table className="route-table">
                              <thead>
                                <tr>
                                  <th>Subpostcode</th><th>DEL</th><th>PU</th><th>Total</th><th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groups.map((g) => {
                                  const key = `${route.id}:${g.code}`;
                                  const isExpanded = expanded.has(key);
                                  return (
                                    <React.Fragment key={key}>
                                      <tr
                                        className={`subpostcode-row ${rebalanceMode ? 'rebalance-row' : ''}`}
                                        draggable={rebalanceMode}
                                        onDragStart={(e) => handleDragStart(e, g.code, route.id)}
                                      >
                                        <td className="pc-cell">
                                          {rebalanceMode && <i className="bi bi-grip-vertical drag-handle" />}
                                          <button type="button" className={`subpostcode-toggle ${isExpanded ? 'expanded' : ''}`} onClick={() => toggleExpand(key)}>
                                            <i className="bi bi-chevron-right" /> {g.code}
                                          </button>
                                          <span className="postcode-count-badge">{g.postcodes.length} postcode{g.postcodes.length === 1 ? '' : 's'}</span>
                                          {g.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                                        </td>
                                        <td>{g.del}</td>
                                        <td>{g.pu}</td>
                                        <td>{g.total}</td>
                                        <td><StatusBadge status={g.allCompleted ? 'completed' : 'pending'} /></td>
                                      </tr>
                                      <tr className={`subpostcode-detail-row ${isExpanded ? '' : 'collapsed'}`}>
                                        <td colSpan={5}>
                                          <div className="postcode-dropdown">
                                            {g.postcodes.map((p) => (
                                              <div className="postcode-dropdown-item" key={p.postcode}>
                                                <span className="postcode-editable" title="Click to edit / substitute" onClick={() => openEditStopModal(p.stops[0])}>{p.postcode}</span>
                                                {p.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                                                <span className="pc-mini-stat">DEL {p.del}</span>
                                                <span className="pc-mini-stat">PU {p.pu}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="route-totals">
                            <div className="total-item">
                              <div className="total-label">Total Deliveries</div>
                              <div className="total-value">{del}</div>
                            </div>
                            <div className="total-item">
                              <div className="total-label">Total Pickups</div>
                              <div className="total-value">{pu}</div>
                            </div>
                            <div className="total-item">
                              <div className="total-label">Total Geral</div>
                              <div className="total-value">{stops.length}</div>
                            </div>
                          </div>

                          <div className="metrics-row">
                            <div className="metric-badge metric-badge--asr">
                              <div className="metric-label">ASR</div>
                              <div className="metric-value">{route.asr}</div>
                            </div>
                            <div className="metric-badge metric-badge--dsr">
                              <div className="metric-label">DSR</div>
                              <div className="metric-value">{route.dsr}</div>
                            </div>
                          </div>

                          {route.pre12 > 0 && (
                            <div className="pre12-table-wrapper" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                              <table className="route-table pre12-sub-table">
                                <tbody>
                                  <tr className="pre12-row">
                                    <td className="pc-cell">
                                      <button type="button" className="pre12-toggle" onClick={() => toggleExpand(`pre12:${route.id}`)}>
                                        <i className="bi bi-chevron-right" /> Pre 12 Stops
                                      </button>
                                      <span className="postcode-count-badge">{route.pre12} postcode{route.pre12 === 1 ? '' : 's'}</span>
                                    </td>
                                    <td></td>
                                    <td></td>
                                    <td>{route.pre12}</td>
                                    <td></td>
                                  </tr>
                                  <tr className={`pre12-detail-row ${expanded.has(`pre12:${route.id}`) ? '' : 'collapsed'}`}>
                                    <td colSpan={5}>
                                      <div className="pre12-dropdown">
                                        {groups.filter((g) => g.pre12).map((g) => {
                                          const pre12Postcodes = g.postcodes.filter((p) => p.pre12);
                                          return (
                                            <div className="pre12-group-item" key={g.code}>
                                              <div className="pre12-group-header">
                                                <strong>{g.code}</strong> - {pre12Postcodes.length} postcode{pre12Postcodes.length === 1 ? '' : 's'}
                                              </div>
                                              <div className="pre12-postcodes-list">
                                                {pre12Postcodes.map((p) => (
                                                  <div className="pre12-postcode-item" key={p.postcode}>
                                                    <span className="pre12-pc">{p.postcode}</span>
                                                    <span className="pre12-customer">{p.stops[0]?.customer || 'N/A'}</span>
                                                    <span className="pre12-stops">DEL {p.del} / PU {p.pu}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="notes-section">
                            <label className="notes-label">Notes</label>
                            <textarea
                              className="notes-textarea"
                              placeholder="Write observations…"
                              value={route.notes}
                              onChange={(e) => updateRoute(route.id, (r) => ({ ...r, notes: e.target.value }))}
                            />
                          </div>

                          {rebalanceMode && (
                            <p className="rebalance-hint">
                              <i className="bi bi-info-circle" />
                              Drag a subpostcode onto another route to send it whole or split specific postcodes into it.
                            </p>
                          )}

                          <div className="route-buttons">
                            <button className="styled-button styled-button--outline" onClick={() => setAllStopsRoute(route)}>
                              <i className="bi bi-geo-alt" /> See All Stops
                            </button>
                            <button className="styled-button styled-button--outline" onClick={() => setShipmentRoute(route)}>
                              <i className="bi bi-box2" /> Shipment Details
                            </button>
                          </div>
                        </div>
                      </section>
                    );
                  })}
            </section>
          </div>
        </main>
      </div>

      {/* ============ MODAL: Add Postcode ============ */}
      {addPostcodeOpen && (
        <Modal title="Add Postcode" icon="bi-geo-alt" onClose={() => setAddPostcodeOpen(false)} onConfirm={confirmAddPostcode} confirmLabel="Add">
          <div className="mb-3">
            <label className="form-label">Select Type</label>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="postcodeType" id="typePostcode" checked={postcodeType === 'postcode'} onChange={() => setPostcodeType('postcode')} />
              <label className="form-check-label" htmlFor="typePostcode">Postcode (Full postcode, e.g. ME15 6AB)</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="postcodeType" id="typeSubpostcode" checked={postcodeType === 'subpostcode'} onChange={() => setPostcodeType('subpostcode')} />
              <label className="form-check-label" htmlFor="typeSubpostcode">Subpostcode (Area code, e.g. ME15)</label>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="postcodeInput" className="form-label">Code</label>
            <input type="text" className="form-control" id="postcodeInput" placeholder="e.g. ME15 6AB or ME15" value={postcodeInput} onChange={(e) => setPostcodeInput(e.target.value)} />
            <div className="form-hint">Type or select from the list below.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Select Route (Optional)</label>
            <select className="form-select" value={addPostcodeRouteId} onChange={(e) => setAddPostcodeRouteId(e.target.value)}>
              <option value="">All routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* ============ MODAL: Add New Flex Route ============ */}
      {addRouteOpen && (
        <Modal title="Add New Flex Route" icon="bi-plus-circle" onClose={() => setAddRouteOpen(false)} onConfirm={saveNewRoute} confirmLabel="Save Route">
          <div className="mb-3">
            <label htmlFor="newRouteName" className="form-label">Route Name</label>
            <input type="text" className="form-control" id="newRouteName" placeholder="e.g. FX-01" value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="newDriver" className="form-label">Driver</label>
            <select className="form-select" id="newDriver" value={newDriver} onChange={(e) => setNewDriver(e.target.value)} required>
              {DRIVERS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="newTarget" className="form-label">Target (%)</label>
            <input type="number" className="form-control" id="newTarget" min={0} max={100} value={newTarget} onChange={(e) => setNewTarget(Number(e.target.value))} required />
          </div>
        </Modal>
      )}

      {/* ============ MODAL: See All Stops ============ */}
      {allStopsRoute && (() => {
        const route = routes.find((r) => r.id === allStopsRoute.id) ?? allStopsRoute;
        const sortLabels: Record<SortAttendance, string> = { yes: 'Sort: Attended', late: 'Sort: Late', no: 'Sort: No-show' };
        const sortColors: Record<SortAttendance, React.CSSProperties> = {
          yes: { background: '#d1fae5', color: '#065f46' },
          late: { background: '#fef3c7', color: '#92400e' },
          no: { background: '#fee2e2', color: '#991b1b' },
        };
        const sorted = [...visibleStops(route, filterPM, filterPre12)].sort((a, b) => a.routeName.localeCompare(b.routeName) || a.stopNumber - b.stopNumber);
        return (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-geo-alt me-2" />All Stops — Route {route.name}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setAllStopsRoute(null)} />
                </div>
                <div className="modal-body">
                  <div className="modal-metrics">
                    <span className="status-badge metric-badge--pre12" style={{ background: '#e0f2fe', color: '#075985' }}>Pre 12: {route.pre12}</span>
                    <span className="status-badge" style={{ background: '#d1fae5', color: '#065f46' }}>ASR: {route.asr}</span>
                    <span className="status-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>DSR: {route.dsr}</span>
                    <span className="status-badge" style={sortColors[route.sortAttendance]}>{sortLabels[route.sortAttendance]}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th>Stop</th><th>Address</th><th>Postcode</th><th>Customer</th><th>Flag</th><th>Status</th><th>Route</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((s) => (
                          <tr key={s.id}>
                            <td>{s.stopNumber}</td>
                            <td>{s.address}</td>
                            <td>{s.postcode}</td>
                            <td>{s.customer}</td>
                            <td>
                              <span className={`status-badge status-badge-${s.pm ? 'pm' : 'am'}`}>{s.pm ? 'PM' : 'AM'}</span>
                              {s.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                            </td>
                            <td><StatusBadge status={s.status} /></td>
                            <td>{s.routeName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ MODAL: Shipment Details ============ */}
      {shipmentRoute && (() => {
        const route = routes.find((r) => r.id === shipmentRoute.id) ?? shipmentRoute;
        const stops = visibleStops(route, filterPM, filterPre12);
        return (
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-box2 me-2" />Shipment Details</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShipmentRoute(null)} />
                </div>
                <div className="modal-body">
                  <div className="shipment-details">
                    <div className="detail-row"><span className="label">Shipment ID</span><span className="value mono">ROUTE-{route.name}</span></div>
                    <div className="detail-row"><span className="label">Weight</span><span className="value">Total Stops: {stops.length}</span></div>
                    <div className="detail-row"><span className="label">Height</span><span className="value">Deliveries: {stops.filter((s) => s.type === 'DEL').length}</span></div>
                    <div className="detail-row"><span className="label">Width</span><span className="value">Pickups: {stops.filter((s) => s.type === 'PU').length}</span></div>
                    <div className="detail-row"><span className="label">Length</span><span className="value">Pre-12: {route.pre12}</span></div>
                    <div className="detail-row"><span className="label">Volume</span><span className="value">ASR: {route.asr}</span></div>
                    <div className="detail-row"><span className="label">Pieces</span><span className="value">DSR: {route.dsr}</span></div>
                    <div className="detail-row"><span className="label">Driver</span><span className="value">{route.driver}</span></div>
                    <div className="detail-row"><span className="label">Vendor</span><span className="value">{route.vendor}</span></div>
                    <div className="detail-row"><span className="label">Status</span><span className="value"><StatusBadge status={route.status} /></span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ MODAL: PM ASR/DSR Listing ============ */}
      {pmListingOpen && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="bi bi-clipboard-data me-2" />PM ASR/DSR Listing</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setPmListingOpen(false)} />
              </div>
              <div className="modal-body">
                {!isAuthorizedForPmListing() ? (
                  <div className="pre12-empty-state">
                    <i className="bi bi-lock-fill" />
                    <p>You are not authorized to view the PM ASR/DSR listing.</p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>Sign in through the Service Provider portal to unlock this view.</p>
                  </div>
                ) : pmAsrDsrRecords.length === 0 ? (
                  <div className="pre12-empty-state">
                    <i className="bi bi-check-circle-fill" />
                    <p>No ASR/DSR records for the PM period</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr><th>Route</th><th>Driver</th><th>Postcode</th><th>Customer</th><th>Category</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {pmAsrDsrRecords.map(({ route, stop }) => (
                          <tr key={stop.id}>
                            <td><strong>{route.name}</strong></td>
                            <td>{route.driver}</td>
                            <td>{stop.postcode}</td>
                            <td>{stop.customer}</td>
                            <td>
                              {stop.asr && <span className="status-badge special-tag-asr">ASR</span>}
                              {stop.dsr && <span className="status-badge special-tag-dsr">DSR</span>}
                            </td>
                            <td>
                              <span className={`status-badge status-badge-${route.sendStatus === 'sent' ? 'completed' : 'pending'}`}>
                                {route.sendStatus === 'sent' ? 'Sent' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: Edit Postcode ============ */}
      {editingStop && (
        <Modal title="Edit Postcode" icon="bi-pencil-square" onClose={() => setEditingStop(null)} onConfirm={saveStopEdit} confirmLabel="Save Changes">
          <div className="mb-3">
            <label htmlFor="editPostcode" className="form-label">Postcode</label>
            <input type="text" className="form-control" id="editPostcode" list="postcodeList" placeholder="e.g. ME15 6AB" value={editPostcodeValue} onChange={(e) => setEditPostcodeValue(e.target.value)} />
            <datalist id="postcodeList">
              {allPostcodesInUse.map((pc) => (
                <option value={pc} key={pc} />
              ))}
            </datalist>
            <div className="form-hint">Type a new postcode or pick an existing one to substitute.</div>
          </div>
          <div className="mb-3">
            <span className="form-label d-block">Apply to</span>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="editScope" id="scopeSingle" checked={!editScopeAll} onChange={() => setEditScopeAll(false)} />
              <label className="form-check-label" htmlFor="scopeSingle">Only this stop</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="radio" name="editScope" id="scopeAll" checked={editScopeAll} onChange={() => setEditScopeAll(true)} />
              <label className="form-check-label" htmlFor="scopeAll">
                Replace all stops with postcode <strong>{editingStop.postcode}</strong> in this route
              </label>
            </div>
          </div>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="editPre12"
              checked={editPre12Value}
              disabled={editingStop.pm}
              onChange={(e) => setEditPre12Value(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="editPre12">
              <span className="status-badge status-badge-pre12">Pre 12</span> — must be delivered before 12:00
              {editingStop.pm && <span className="text-muted"> (unavailable — this is a PM stop)</span>}
            </label>
          </div>
        </Modal>
      )}

      {/* ============ MODAL: Transfer Subpostcode (Rebalance) ============ */}
      {transferContext && (
        <TransferModal
          ctx={transferContext}
          targetName={routes.find((r) => r.id === transferContext.targetRouteId)?.name ?? ''}
          onModeChange={(mode) => setTransferContext({ ...transferContext, mode })}
          onClose={() => setTransferContext(null)}
          onConfirm={confirmTransfer}
        />
      )}

      {/* ============ ROUTE PREVIEW MODAL ============ */}
      {selectedRouteId && (() => {
        const route = routes.find((r) => r.id === selectedRouteId);
        const currentIndex = filteredRoutes.findIndex((r) => r.id === selectedRouteId);
        if (!route) return null;

        const stops = visibleStops(route, filterPM, filterPre12);
        const groups = groupBySubpostcode(stops, filterPM);
        const del = stops.filter((s) => s.type === 'DEL').length;
        const pu = stops.length - del;

        return (
          <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} onClick={() => setSelectedRouteId(null)}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 className="modal-title"><i className="bi bi-shuffle" /> Route {route.name} — Rebalance Preview</h5>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" className="styled-button styled-button--outline" onClick={() => navigatePreview('prev')} disabled={filteredRoutes.length <= 1}>
                      <i className="bi bi-chevron-left" /> Previous
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--ink-soft)' }}>
                      {currentIndex + 1} / {filteredRoutes.length}
                    </span>
                    <button type="button" className="styled-button styled-button--outline" onClick={() => navigatePreview('next')} disabled={filteredRoutes.length <= 1}>
                      Next <i className="bi bi-chevron-right" />
                    </button>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedRouteId(null)} />
                  </div>
                </div>
                <div className="modal-body">
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Driver</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--ink)' }}>{route.driver}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Total Stops</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--ink)' }}>{stops.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Deliveries / Pickups</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--ink)' }}>{del} / {pu}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Progress</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent)' }}>{route.completion}%</div>
                      </div>
                    </div>
                  </div>

                  <h6 style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.75rem' }}>Subpostcodes & Postcodes</h6>
                  <div className="table-responsive">
                    <table className="route-table">
                      <thead>
                        <tr>
                          <th>Subpostcode</th><th>Postcodes</th><th>DEL</th><th>PU</th><th>Total</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((g) => (
                          <tr key={g.code}>
                            <td><strong>{g.code}</strong></td>
                            <td>{g.postcodes.length}</td>
                            <td>{g.del}</td>
                            <td>{g.pu}</td>
                            <td>{g.total}</td>
                            <td><StatusBadge status={g.allCompleted ? 'completed' : 'pending'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="toast-container" id="toastContainer">
        {toasts.map((t) => {
          const icons: Record<ToastType, string> = { success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
          return (
            <div className={`app-toast ${t.type}`} key={t.id}>
              <i className={`bi ${icons[t.type]}`} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== SHARED MODAL SHELL ==================== */

function Modal({
  title,
  icon,
  onClose,
  onConfirm,
  confirmLabel,
  children,
}: {
  title: string;
  icon: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title"><i className={`bi ${icon} me-2`} />{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button type="button" className="styled-button styled-button--outline" onClick={onClose}>Cancel</button>
            <button type="button" className="styled-button styled-button--primary" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferModal({
  ctx,
  targetName,
  onModeChange,
  onClose,
  onConfirm,
}: {
  ctx: TransferContext;
  targetName: string;
  onModeChange: (mode: 'subpostcode' | 'postcode') => void;
  onClose: () => void;
  onConfirm: (checkedIndices: number[]) => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const isSub = ctx.mode === 'subpostcode';
  const total = ctx.postcodes.reduce((n, p) => n + p.stops.length, 0);

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title"><i className="bi bi-arrow-left-right me-2" />Transfer {ctx.subcode} → Route {targetName}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="transfer-mode-tabs">
              <button type="button" className={`transfer-mode-tab ${isSub ? 'active' : ''}`} onClick={() => onModeChange('subpostcode')}>
                <i className="bi bi-signpost-2" /> Send Subpostcode
              </button>
              <button type="button" className={`transfer-mode-tab ${!isSub ? 'active' : ''}`} onClick={() => onModeChange('postcode')}>
                <i className="bi bi-geo-alt" /> Send Postcode
              </button>
            </div>
            <div>
              {isSub ? (
                <p className="transfer-mode-info">
                  All <strong>{ctx.postcodes.length}</strong> postcode(s) (<strong>{total}</strong> stop(s)) under <strong>{ctx.subcode}</strong> will move to the destination route.
                </p>
              ) : (
                <>
                  <p className="form-hint">Select which postcodes to send. Unselected postcodes stay on the source route — this splits {ctx.subcode} across both routes.</p>
                  <div className="transfer-postcode-list">
                    {ctx.postcodes.map((p, i) => (
                      <label className="transfer-postcode-item" key={p.postcode}>
                        <input
                          type="checkbox"
                          className="transfer-postcode-check"
                          checked={checked.has(i)}
                          onChange={(e) => {
                            setChecked((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(i);
                              else next.delete(i);
                              return next;
                            });
                          }}
                        />
                        <span className="transfer-postcode-code">{p.postcode}</span>
                        <span className="pc-mini-stat">{p.stops.length} stop(s)</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="styled-button styled-button--outline" onClick={onClose}>Cancel</button>
            <button type="button" className="styled-button styled-button--primary" onClick={() => onConfirm([...checked])}>Confirm Transfer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
