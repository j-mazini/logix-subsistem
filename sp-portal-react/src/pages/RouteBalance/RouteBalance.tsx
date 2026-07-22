import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import '../../styles/legacy/route-balance.css';

/**
 * Faithful port of sp-portal/route-balance (index.html + style.css +
 * script.js, recovered from git history at c3641ec^). Vanilla-JS
 * class-based app rebuilt as React state; see the bottom of this file for a
 * summary of what was simplified/skipped and why.
 */

/* ==================== TYPES ==================== */

type StopType = 'DEL' | 'PU';
type StopStatus = 'pending' | 'completed';
type SortAttendance = 'yes' | 'late' | 'no';
type SendStatus = 'pending' | 'sent';
type ToastType = 'success' | 'error' | 'info' | 'warning';
type DashboardFilterKey = 'del' | 'pu' | 'pre12' | 'asr' | 'dsr' | 'special';
type SpecialCat = 'all' | 'pre12' | 'asr' | 'dsr';
type SortKey = 'name' | 'driver' | 'target' | 'totalStops';
type ShiftKey = 'am' | 'pm';

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

interface HistoryEntry {
  action: string;
  field: string;
  shift?: ShiftKey;
  oldValue: unknown;
  newValue: unknown;
  author: string;
  timestamp: string;
}

interface RouteRow {
  id: number;
  name: string;
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
  sendStatus: { am: SendStatus; pm: SendStatus };
  history: HistoryEntry[];
  stops: Stop[];
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

interface PostcodeGroup {
  postcode: string;
  stops: Stop[];
  del: number;
  pu: number;
  pre12: boolean;
}

interface SubpostcodeGroup {
  code: string;
  postcodes: PostcodeGroup[];
  del: number;
  pu: number;
  total: number;
  completion: number;
  allCompleted: boolean;
  pre12: boolean;
}

const CURRENT_USER = 'João Silva';

/* ==================== FAKE DATA (ported from generateFakeData()) ==================== */

const DRIVERS = [
  'Carlos Silva', 'Ana Costa', 'João Martins', 'Maria Santos', 'Pedro Oliveira',
  'Lucas Pereira', 'Sofia Alves', 'Ricardo Dias', 'Juliana Ribeiro', 'Felipe Costa',
];
const VEHICLES = ['Van-001', 'Van-002', 'Van-003', 'Truck-001', 'Truck-002', 'Truck-003', 'Bike-001', 'Car-001'];
const SUBPOSTCODES = Array.from({ length: 8 }, (_, i) => `ME${i + 1}`);
const POSTCODES = SUBPOSTCODES.flatMap((sub) => Array.from({ length: 5 }, (_, i) => `${sub} ${i + 1}AB`));
const STREETS = ['High Street', 'Station Road', 'Church Lane', 'Victoria Avenue', 'Mill Road', 'Park View', 'Queensway', 'Riverside Drive'];

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}
function pick<T>(arr: T[]): T {
  return arr[rand(arr.length)];
}

function generateFakeData(): RouteRow[] {
  let stopId = 1;
  const routes: RouteRow[] = [];

  for (let i = 1; i <= 8; i++) {
    const totalStops = 22 + rand(8);
    const deliveries = Math.floor(totalStops * 0.72);
    const completion = rand(101);
    const completedStops = Math.round((totalStops * completion) / 100);
    const name = `A-${String(i).padStart(2, '0')}`;

    const stops: Stop[] = [];
    for (let j = 0; j < totalStops; j++) {
      const isPM = Math.random() > 0.68;
      stops.push({
        id: stopId++,
        routeName: name,
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

    routes.push({
      id: i,
      name,
      driver: DRIVERS[(i - 1) % DRIVERS.length],
      vehicle: pick(VEHICLES),
      target: 80 + rand(16),
      totalStops,
      completedStops,
      completion,
      deliveries,
      pickups: totalStops - deliveries,
      pre12: stops.filter((s) => s.pre12).length,
      asr: stops.filter((s) => s.asr).length,
      dsr: stops.filter((s) => s.dsr).length,
      spr: 90 + rand(80),
      sortAttendance: pick<SortAttendance>(['yes', 'yes', 'yes', 'late', 'no']),
      notes: '',
      sendStatus: { am: 'pending', pm: 'pending' },
      history: [],
      stops,
    });
  }

  return routes;
}

/* ==================== PURE HELPERS (ported 1:1 from script.js) ==================== */

function subpostcodeOf(postcode: string): string {
  return postcode.split(' ')[0];
}

/** Groups a flat stop list into subpostcode -> postcode -> stops[]. Groups containing a Pre 12 stop sort first. */
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
        pre12: !filterPM && pcStops.some((s) => s.pre12),
      })),
      del,
      pu: groupStops.length - del,
      total: groupStops.length,
      completion: groupStops.length ? Math.round((completed / groupStops.length) * 100) : 0,
      allCompleted: completed === groupStops.length,
      pre12: !filterPM && groupStops.some((s) => s.pre12),
    };
  });

  groups.sort((a, b) => (b.pre12 === true ? 1 : 0) - (a.pre12 === true ? 1 : 0));
  return groups;
}

/** Recomputes a route's aggregate counters from its own stops array (ported from recomputeRoute()). */
function recomputeRoute(route: RouteRow): RouteRow {
  const totalStops = route.stops.length;
  const deliveries = route.stops.filter((s) => s.type === 'DEL').length;
  const completedStops = route.stops.filter((s) => s.status === 'completed').length;
  return {
    ...route,
    totalStops,
    deliveries,
    pickups: totalStops - deliveries,
    completedStops,
    pre12: route.stops.filter((s) => s.pre12).length,
    asr: route.stops.filter((s) => s.asr).length,
    dsr: route.stops.filter((s) => s.dsr).length,
    completion: totalStops ? Math.round((completedStops / totalStops) * 100) : 0,
  };
}

const DASHBOARD_FILTER_MATCHERS: Record<DashboardFilterKey, (s: Stop) => boolean> = {
  del: (s) => s.type === 'DEL',
  pu: (s) => s.type === 'PU',
  pre12: (s) => s.pre12,
  asr: (s) => s.asr,
  dsr: (s) => s.dsr,
  special: (s) => s.pre12 || s.asr || s.dsr,
};

const DASHBOARD_FILTER_LABELS: Record<DashboardFilterKey, string> = {
  del: 'Deliveries', pu: 'Pickups', pre12: 'Pre 12', asr: 'ASR', dsr: 'DSR', special: 'Special Deliveries',
};

const SORT_ATTENDANCE_LABELS: Record<SortAttendance, string> = { yes: 'Attended', late: 'Late', no: 'No-show' };

/* ==================== TOASTS ==================== */

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number, undo?: boolean) => void }) {
  const icons: Record<ToastType, string> = {
    success: 'bi-check-circle-fill', error: 'bi-x-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill',
  };
  return createPortal(
    <div className="toast-container" id="toastContainer">
      {toasts.map((t) => (
        <div key={t.id} className={`app-toast ${t.type}`}>
          <i className={`bi ${icons[t.type]}`} />
          <span>{t.message}</span>
          {t.onUndo && (
            <button type="button" className="app-toast-undo" onClick={() => onDismiss(t.id, true)}>
              Undo
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}

/* ==================== ROUTE BLOCK CARD ==================== */

interface RouteBlockCardProps {
  route: RouteRow;
  otherRoutes: RouteRow[];
  rebalanceMode: boolean;
  filterPM: boolean;
  dashboardFilter: DashboardFilterKey | null;
  shiftKey: ShiftKey;
  selected: boolean;
  compareWithRoute: RouteRow | null;
  comparePickerOpen: boolean;
  onToggleCompare: () => void;
  onPickCompareTarget: (targetId: number) => void;
  onSwapCompare: () => void;
  onCancelCompare: () => void;
  onSendIndividual: () => void;
  onRevert: () => void;
  onCollapse: () => void;
  onAddPostcode: () => void;
  onExportCsv: () => void;
  onSeeAllStops: (triggerEl: HTMLElement | null) => void;
  isAllStopsOpen: boolean;
  onEditStop: (stop: Stop) => void;
  onShipmentDetails: () => void;
  onNotesBlur: (value: string) => void;
  onTransferStops: (sourceId: number, targetId: number, stopIds: number[], label: string) => void;
  onClickCard: () => void;
}

function RouteBlockCard(props: RouteBlockCardProps) {
  const {
    route, otherRoutes, rebalanceMode, filterPM, dashboardFilter, shiftKey, selected,
    compareWithRoute, comparePickerOpen, onToggleCompare, onPickCompareTarget, onSwapCompare, onCancelCompare,
    onSendIndividual, onRevert, onCollapse, onAddPostcode, onExportCsv, onSeeAllStops, isAllStopsOpen,
    onEditStop, onShipmentDetails, onNotesBlur, onTransferStops, onClickCard,
  } = props;

  const [flipped, setFlipped] = useState(false);
  const [specialCat, setSpecialCat] = useState<SpecialCat>('all');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [expandedRebalancePcs, setExpandedRebalancePcs] = useState<Set<string>>(new Set());
  const [moveGroupOpen, setMoveGroupOpen] = useState<string | null>(null);
  const [moveStopOpen, setMoveStopOpen] = useState<number | null>(null);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Match the back face's height to the front's rendered height — CSS alone
  // can't track a sibling's content height across a 3D rotateY flip.
  useEffect(() => {
    const front = frontRef.current;
    const back = backRef.current;
    if (!front || !back) return;
    const sync = () => { back.style.height = `${front.offsetHeight}px`; };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(front);
    return () => ro.disconnect();
  }, [flipped, rebalanceMode]);

  const stops = rebalanceMode
    ? route.stops.filter((s) => (filterPM ? s.pm : !s.pm))
    : route.stops.filter((s) => (filterPM ? s.pm : !s.pm)).filter((s) => (dashboardFilter ? DASHBOARD_FILTER_MATCHERS[dashboardFilter](s) : true));
  const groups = groupBySubpostcode(stops, filterPM);
  const del = stops.filter((s) => s.type === 'DEL').length;
  const pu = stops.length - del;
  const doneStops = stops.filter((s) => s.status === 'completed').length;
  const progressPct = stops.length ? Math.round((doneStops / stops.length) * 100) : 0;

  const sendStatus = route.sendStatus[shiftKey] || 'pending';
  const hasHistory = route.history.length > 0;

  const matches: Record<SpecialCat, (s: Stop) => boolean> = {
    all: (s) => s.pre12 || s.asr || s.dsr, pre12: (s) => s.pre12, asr: (s) => s.asr, dsr: (s) => s.dsr,
  };
  const counts = {
    all: stops.filter(matches.all).length, pre12: stops.filter(matches.pre12).length,
    asr: stops.filter(matches.asr).length, dsr: stops.filter(matches.dsr).length,
  };
  const specialStops = stops.filter(matches[specialCat]);
  const specialGroups = groupBySubpostcode(specialStops, filterPM);

  const postcodeCount = groups.reduce((n, g) => n + g.postcodes.length, 0);

  function toggleSub(code: string) {
    setExpandedSubs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }
  function toggleRebalancePc(pc: string) {
    setExpandedRebalancePcs((prev) => {
      const next = new Set(prev);
      if (next.has(pc)) next.delete(pc); else next.add(pc);
      return next;
    });
  }

  const chip = (key: SpecialCat, label: string) => (
    <button
      type="button"
      key={key}
      className={`special-chip ${specialCat === key ? 'active' : ''}`}
      onClick={() => setSpecialCat(key)}
    >
      {label} <span className="special-chip-count">{counts[key]}</span>
    </button>
  );

  return (
    <section
      className={`route-block ${rebalanceMode ? 'rebalance-mode' : ''} ${flipped ? 'flipped' : ''} ${selected ? 'selected' : ''}`}
      data-route-id={route.id}
      onClick={(e) => {
        if (rebalanceMode) return;
        const target = e.target as HTMLElement;
        if (target.closest('[data-action], button, select, input, .postcode-editable')) return;
        onClickCard();
      }}
    >
      <div className="route-block-flipper">
        <div className="route-block-face route-block-front" ref={frontRef}>
          <div className="route-block-header">
            <div className="route-block-ident">
              <span className="route-eyebrow">Route {route.name} · Manifest</span>
              <h3 className="route-driver-name">{route.driver}</h3>
            </div>
            <div className="route-block-header-right">
              {filterPM ? <span className="shift-badge shift-badge-pm">PM</span> : <span className="shift-badge shift-badge-am">AM</span>}
              {rebalanceMode ? (
                <>
                  <span className="postcode-count-badge rebalance-count-badge" title={`${postcodeCount} postcode(s) · ${stops.length} stop(s) on this route`}>
                    <i className="bi bi-geo-alt" /> {postcodeCount} PC · {stops.length} stops
                  </span>
                  {compareWithRoute ? (
                    <div className="compare-bar">
                      <span className="compare-bar-label"><i className="bi bi-arrow-left-right" /> vs {compareWithRoute.name}</span>
                      <button type="button" className="compare-bar-btn compare-bar-btn--swap" title="Swap all postcodes between these two routes" onClick={onSwapCompare}>
                        <i className="bi bi-arrow-repeat" /> Swap
                      </button>
                      <button type="button" className="compare-bar-btn compare-bar-btn--cancel" title="Cancel comparison" aria-label="Cancel comparison" onClick={onCancelCompare}>
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                  ) : (
                    <div className="compare-wrap">
                      <button type="button" className={`route-icon-btn ${comparePickerOpen ? 'active' : ''}`} title="Compare with another route" aria-label="Compare with another route" onClick={onToggleCompare}>
                        <i className="bi bi-arrow-left-right" />
                      </button>
                      {comparePickerOpen && (
                        <div className="compare-picker">
                          <div className="compare-picker-title">Compare Route {route.name} with…</div>
                          {otherRoutes.map((r) => (
                            <button type="button" key={r.id} className="compare-picker-item" onClick={() => onPickCompareTarget(r.id)}>
                              <span className="compare-picker-route">{r.name}</span>
                              <span className="compare-picker-driver">{r.driver}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button type="button" className="route-icon-btn" title={`Send this route's manifest to the driver (${shiftKey.toUpperCase()})`} aria-label="Send to driver" onClick={onSendIndividual}>
                    <i className="bi bi-send" />
                  </button>
                  {hasHistory && (
                    <button type="button" className="route-icon-btn route-icon-btn--danger" title="Revert last action on this route" aria-label="Revert last action" onClick={onRevert}>
                      <i className="bi bi-arrow-counterclockwise" />
                    </button>
                  )}
                  <button type="button" className="route-icon-btn route-icon-btn--danger" title="Close this route and redistribute its postcodes" aria-label="Close route" onClick={onCollapse}>
                    <i className="bi bi-box-arrow-in-down" />
                  </button>
                </>
              ) : (
                <>
                  <span className={`status-badge status-badge-${sendStatus === 'sent' ? 'completed' : 'pending'}`} title={`${shiftKey.toUpperCase()} send status`}>
                    {sendStatus === 'sent' ? 'Sent' : 'Pending'}
                  </span>
                  <button type="button" className="flip-btn" title="View Special Deliveries (Pre 12 / ASR / DSR)" onClick={() => setFlipped(true)}>
                    <i className="bi bi-stars" /> Special Deliveries
                  </button>
                  <button type="button" className="route-icon-btn" title={`Send this route's manifest to the driver (${shiftKey.toUpperCase()})`} aria-label="Send to driver" onClick={onSendIndividual}>
                    <i className="bi bi-send" />
                  </button>
                  {hasHistory && (
                    <button type="button" className="route-icon-btn route-icon-btn--danger" title="Revert last action on this route" aria-label="Revert last action" onClick={onRevert}>
                      <i className="bi bi-arrow-counterclockwise" />
                    </button>
                  )}
                  <button type="button" className="route-icon-btn" title="Add a postcode to this route" aria-label="Add postcode" onClick={onAddPostcode}>
                    <i className="bi bi-geo-alt-fill" />
                  </button>
                  <button type="button" className="route-icon-btn" title="Export this route's manifest (Demi8 format)" aria-label="Export manifest" onClick={onExportCsv}>
                    <i className="bi bi-filetype-csv" />
                  </button>
                  <button type="button" className="route-icon-btn route-icon-btn--danger" title="Close this route and redistribute its postcodes" aria-label="Close route" onClick={onCollapse}>
                    <i className="bi bi-box-arrow-in-down" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="route-progress" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Route progress: ${doneStops} of ${stops.length} stops completed`}>
            <div className="route-progress-track">
              <div className="route-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="route-progress-label">{doneStops}/{stops.length} stops · {progressPct}%</span>
          </div>

          {rebalanceMode ? (
            <div className="route-block-content">
              <div className="route-table-responsive rebalance-postcode-list">
                {groups.map((g) => (
                  <div className="rebalance-subpostcode-group" key={g.code}>
                    <div className="rebalance-subpostcode-label" title={`${g.postcodes.length} postcode(s) under ${g.code}`}>
                      <i className="bi bi-grip-vertical drag-handle" />
                      {g.code}
                      <span className="postcode-count-badge">{g.postcodes.length} postcode{g.postcodes.length === 1 ? '' : 's'}</span>
                      {g.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                      <div className="move-to-wrap move-to-wrap--group">
                        <button type="button" className={`move-to-btn ${moveGroupOpen === g.code ? 'active' : ''}`} title={`Move all of ${g.code} to another route`}
                          onClick={(e) => { e.stopPropagation(); setMoveGroupOpen(moveGroupOpen === g.code ? null : g.code); }}>
                          <i className="bi bi-send-plus" /> Move all…
                        </button>
                        {moveGroupOpen === g.code && (
                          <div className="move-to-picker">
                            <div className="move-to-picker-title">Move all of {g.code} to…</div>
                            {otherRoutes.map((r) => (
                              <button type="button" key={r.id} className="move-to-picker-item" onClick={(e) => {
                                e.stopPropagation();
                                setMoveGroupOpen(null);
                                const stopIds = route.stops.filter((s) => subpostcodeOf(s.postcode) === g.code).map((s) => s.id);
                                onTransferStops(route.id, r.id, stopIds, `${g.code} → Route ${r.name}`);
                              }}>
                                <span className="compare-picker-route">{r.name}</span>
                                <span className="compare-picker-driver">{r.driver}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {g.postcodes.map((p) => {
                      const pcExpanded = expandedRebalancePcs.has(p.postcode);
                      return (
                        <div key={p.postcode}>
                          <div className="pre12-flip-item rebalance-postcode-row">
                            <button type="button" className={`rebalance-postcode-toggle ${pcExpanded ? 'expanded' : ''}`}
                              title={`${pcExpanded ? 'Hide' : 'Show'} individual deliveries in ${p.postcode}`}
                              onClick={(e) => { e.stopPropagation(); toggleRebalancePc(p.postcode); }}>
                              <i className="bi bi-chevron-right" />
                            </button>
                            <i className="bi bi-grip-vertical drag-handle" />
                            <span className="pre12-flip-pc">{p.postcode}</span>
                            <span className="special-tags">
                              {p.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                              {p.stops.some((s) => s.asr) && <span className="status-badge special-tag-asr">ASR</span>}
                              {p.stops.some((s) => s.dsr) && <span className="status-badge special-tag-dsr">DSR</span>}
                            </span>
                            <span className="pre12-flip-count">DEL {p.del} / PU {p.pu}</span>
                          </div>
                          {pcExpanded && (
                            <div className="rebalance-stop-list">
                              {p.stops.map((s) => (
                                <div className="rebalance-stop-row" key={s.id}>
                                  <i className="bi bi-grip-vertical drag-handle" />
                                  <span className={`rebalance-stop-type rebalance-stop-type--${s.type.toLowerCase()}`}>{s.type}</span>
                                  <span className="rebalance-stop-customer">{s.customer}</span>
                                  <span className="special-tags">
                                    {s.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                                    {s.asr && <span className="status-badge special-tag-asr">ASR</span>}
                                    {s.dsr && <span className="status-badge special-tag-dsr">DSR</span>}
                                  </span>
                                  <div className="move-to-wrap move-to-wrap--stop">
                                    <button type="button" className={`move-to-btn ${moveStopOpen === s.id ? 'active' : ''}`} title="Move only this delivery to another route"
                                      onClick={(e) => { e.stopPropagation(); setMoveStopOpen(moveStopOpen === s.id ? null : s.id); }}>
                                      <i className="bi bi-send-plus" /> Move…
                                    </button>
                                    {moveStopOpen === s.id && (
                                      <div className="move-to-picker">
                                        <div className="move-to-picker-title">Move this {s.type === 'PU' ? 'pickup' : 'delivery'} to…</div>
                                        {otherRoutes.map((r) => (
                                          <button type="button" key={r.id} className="move-to-picker-item" onClick={(e) => {
                                            e.stopPropagation();
                                            setMoveStopOpen(null);
                                            onTransferStops(route.id, r.id, [s.id], `1 delivery → Route ${r.name}`);
                                          }}>
                                            <span className="compare-picker-route">{r.name}</span>
                                            <span className="compare-picker-driver">{r.driver}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="rebalance-hint">
                <i className="bi bi-info-circle" />
                Expand a postcode to move individual deliveries, or use "Move all…" for a subpostcode.
              </p>
            </div>
          ) : (
            <div className="route-block-content">
              <div className="route-table-responsive">
                <table className="route-table">
                  <thead>
                    <tr><th>Subpostcode</th><th>DEL</th><th>PU</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const expanded = expandedSubs.has(g.code);
                      return (
                        <Fragment key={g.code}>
                          <tr className="subpostcode-row">
                            <td className="pc-cell">
                              <button type="button" className={`subpostcode-toggle ${expanded ? 'expanded' : ''}`} onClick={() => toggleSub(g.code)}>
                                <i className="bi bi-chevron-right" /> {g.code}
                              </button>
                              <span className="postcode-count-badge">{g.postcodes.length} postcode{g.postcodes.length === 1 ? '' : 's'}</span>
                              {g.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                            </td>
                            <td>{g.del}</td>
                            <td>{g.pu}</td>
                            <td>{g.total}</td>
                          </tr>
                          <tr className={`subpostcode-detail-row ${expanded ? '' : 'collapsed'}`}>
                            <td colSpan={4}>
                              <div className="postcode-dropdown">
                                {g.postcodes.map((p) => (
                                  <div className="postcode-dropdown-item" key={p.postcode}>
                                    <span className="postcode-editable" title="Click to edit / substitute" onClick={() => onEditStop(p.stops[0])}>{p.postcode}</span>
                                    {p.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                                    <span className="pc-mini-stat">DEL {p.del}</span>
                                    <span className="pc-mini-stat">PU {p.pu}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="route-dash">
                <div className="dash-tile"><span className="dash-label">Deliveries</span><span className="dash-value">{del}</span></div>
                <div className="dash-tile"><span className="dash-label">Pickups</span><span className="dash-value">{pu}</span></div>
                <div className="dash-tile"><span className="dash-label">Pre 12</span><span className="dash-value">{stops.filter((s) => s.pre12).length}</span></div>
                <div className="dash-tile"><span className="dash-label">Total Stops</span><span className="dash-value">{stops.length}</span></div>
                <div className="dash-tile"><span className="dash-label">Target</span><span className="dash-value">{route.target}<span className="dash-unit">%</span></span></div>
              </div>

              <div className="route-buttons">
                <button type="button" className="styled-button styled-button--outline" onClick={onShipmentDetails}>
                  <i className="bi bi-box2" /> See Shipment Details
                </button>
                <button type="button" className={`styled-button styled-button--outline btn-see-all-stops${isAllStopsOpen ? ' is-open' : ''}`}
                  onClick={(e) => onSeeAllStops(e.currentTarget)}>
                  <i className="bi bi-geo-alt" /> <span className="btn-see-all-stops-label">{isAllStopsOpen ? 'Hide' : 'See'}</span> All Stops
                </button>
              </div>

              <div className="notes-section">
                <label className="notes-label">Notes</label>
                <textarea className="notes-textarea" placeholder="Write observations…" defaultValue={route.notes} onBlur={(e) => onNotesBlur(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <div className="route-block-face route-block-back" ref={backRef}>
          <button type="button" className="flip-close-btn" title="Close Special Deliveries" onClick={() => setFlipped(false)}>
            <i className="bi bi-x-lg" />
          </button>
          <div className="pre12-flip-title">
            <i className="bi bi-stars" />
            Special Deliveries
          </div>
          <div className="special-chips">
            {chip('all', 'All')}
            {chip('pre12', 'Pre 12')}
            {chip('asr', 'ASR')}
            {chip('dsr', 'DSR')}
          </div>
          {specialStops.length ? (
            <div className="pre12-flip-list">
              {specialGroups.map((g) => (
                <div className="pre12-flip-group" key={g.code}>
                  <div className="pre12-flip-group-name">{g.code}</div>
                  <div className="pre12-flip-items">
                    {g.postcodes.map((p) => (
                      <div className="pre12-flip-item" key={p.postcode}>
                        <span className="pre12-flip-pc">{p.postcode}</span>
                        <span className="pre12-flip-customer">{p.stops[0]?.customer || 'N/A'}</span>
                        <span className="special-tags">
                          {p.stops.some((s) => s.pre12) && <span className="status-badge status-badge-pre12">Pre 12</span>}
                          {p.stops.some((s) => s.asr) && <span className="status-badge special-tag-asr">ASR</span>}
                          {p.stops.some((s) => s.dsr) && <span className="status-badge special-tag-dsr">DSR</span>}
                        </span>
                        <span className="pre12-flip-count">DEL {p.del} / PU {p.pu}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pre12-empty-state">
              <i className="bi bi-check-circle-fill" />
              <p>No special deliveries in this view</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>No stops match the selected category</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==================== MAIN COMPONENT ==================== */

export function RouteBalance() {
  const sp = useCurrentSp();

  const [routes, setRoutes] = useState<RouteRow[]>(() => generateFakeData());
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const [filterPM, setFilterPM] = useState(false);
  const [rebalanceMode, setRebalanceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilterKey | null>(null);

  const [sentAm, setSentAm] = useState<Set<number>>(new Set());
  const [sentPm, setSentPm] = useState<Set<number>>(new Set());

  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null); // preview modal (Operations mode)
  const [allStopsRouteId, setAllStopsRouteId] = useState<number | null>(null); // stops drawer
  const [allPostcodesDrawerOpen, setAllPostcodesDrawerOpen] = useState(false);
  const [allPostcodesSearch, setAllPostcodesSearch] = useState('');

  const [compareTarget, setCompareTarget] = useState<Record<number, number>>({});
  const [comparePickerOpen, setComparePickerOpen] = useState<number | null>(null);

  const [addRouteModalOpen, setAddRouteModalOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDriver, setNewRouteDriver] = useState(DRIVERS[0]);
  const [newRouteTarget, setNewRouteTarget] = useState('85');

  const [addPostcodeModalOpen, setAddPostcodeModalOpen] = useState(false);
  const [addPostcodeRouteId, setAddPostcodeRouteId] = useState('');
  const [postcodeInputVal, setPostcodeInputVal] = useState('');
  const [postcodeType, setPostcodeType] = useState<'postcode' | 'subpostcode'>('postcode');

  const [editStopId, setEditStopId] = useState<number | null>(null);
  const [editPostcodeVal, setEditPostcodeVal] = useState('');
  const [editPre12Val, setEditPre12Val] = useState(false);
  const [editScope, setEditScope] = useState<'single' | 'all'>('single');

  const [shipmentModalRouteId, setShipmentModalRouteId] = useState<number | null>(null);
  const [pmListingModalOpen, setPmListingModalOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  // Page-scoped body class: style.css's `body.route-balance-page` rule
  // requires the class directly on <body>, which this SPA's shared
  // index.html/main.tsx don't set per-route.
  useEffect(() => {
    document.body.classList.add('route-balance-page');
    return () => { document.body.classList.remove('route-balance-page'); };
  }, []);

  // `body.rebalance-mode-active` hides the Operation Summary section and
  // reveals the "Show All Postcodes" FAB — same toggle as the original.
  useEffect(() => {
    document.body.classList.toggle('rebalance-mode-active', rebalanceMode);
    return () => { document.body.classList.remove('rebalance-mode-active'); };
  }, [rebalanceMode]);

  // Loading screen fade-out, matches init()'s 500ms setTimeout.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Header clock, ticking every second.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function showToast(message: string, type: ToastType = 'info', onUndo?: () => void) {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type, onUndo }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), onUndo ? 6000 : 3000);
  }
  function dismissToast(id: number, undo?: boolean) {
    if (undo) {
      const t = toasts.find((x) => x.id === id);
      t?.onUndo?.();
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const shiftKey: ShiftKey = filterPM ? 'pm' : 'am';

  function visibleStops(route: RouteRow): Stop[] {
    return route.stops.filter((s) => (filterPM ? s.pm : !s.pm));
  }
  function displayStops(route: RouteRow): Stop[] {
    const stops = visibleStops(route);
    return dashboardFilter ? stops.filter(DASHBOARD_FILTER_MATCHERS[dashboardFilter]) : stops;
  }

  const filteredRoutes = useMemo(() => {
    let list = [...routes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q));
    }
    list = list.filter((r) => visibleStops(r).length > 0);
    if (sortKey) {
      const dir = sortAsc ? 1 : -1;
      list.sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * dir);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, searchQuery, filterPM, sortKey, sortAsc]);

  const dashboardFilteredRoutes = useMemo(
    () => filteredRoutes.filter((r) => displayStops(r).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredRoutes, dashboardFilter, filterPM],
  );

  const routesToRender = rebalanceMode ? filteredRoutes : dashboardFilteredRoutes;

  /* ---------- dashboard cards ---------- */
  const allVisibleStops = routes.flatMap((r) => visibleStops(r));
  const totalStopsCard = allVisibleStops.length;
  const deliveriesCard = allVisibleStops.filter((s) => s.type === 'DEL').length;
  const pickupsCard = totalStopsCard - deliveriesCard;
  const pre12Card = allVisibleStops.filter((s) => s.pre12).length;
  const asrCard = allVisibleStops.filter((s) => s.asr).length;
  const dsrCard = allVisibleStops.filter((s) => s.dsr).length;
  const specialCard = allVisibleStops.filter((s) => s.pre12 || s.asr || s.dsr).length;
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const targetLoopCard = Math.round(avg(routes.map((r) => r.target)));
  const sprCard = Math.round(avg(routes.map((r) => r.spr)));

  function toggleDashboardFilter(key: DashboardFilterKey | 'all') {
    const k = key === 'all' ? null : key;
    setDashboardFilter((prev) => (prev === k ? null : k));
    const nextVal = dashboardFilter === k ? null : k;
    showToast(nextVal ? `Filtering Sub Postcodes by ${DASHBOARD_FILTER_LABELS[nextVal]}` : 'Filter cleared', 'info');
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  /* ---------- route mutation helpers ---------- */

  function updateRoute(routeId: number, updater: (r: RouteRow) => RouteRow) {
    setRoutes((prev) => prev.map((r) => (r.id === routeId ? updater(r) : r)));
  }

  function transferStops(sourceRouteId: number, targetRouteId: number, stopIds: number[], label: string) {
    if (!stopIds.length) { showToast('Nothing to transfer', 'error'); return; }
    setRoutes((prev) => {
      const source = prev.find((r) => r.id === sourceRouteId);
      const target = prev.find((r) => r.id === targetRouteId);
      if (!source || !target) return prev;
      const moving = source.stops.filter((s) => stopIds.includes(s.id));
      if (!moving.length) return prev;
      const remaining = source.stops.filter((s) => !stopIds.includes(s.id));
      let nextNum = target.stops.length;
      const moved = moving.map((s) => ({ ...s, routeName: target.name, stopNumber: ++nextNum }));
      return prev.map((r) => {
        if (r.id === sourceRouteId) return recomputeRoute({ ...r, stops: remaining });
        if (r.id === targetRouteId) return recomputeRoute({ ...r, stops: [...target.stops, ...moved] });
        return r;
      });
    });
    const sourceName = routes.find((r) => r.id === sourceRouteId)?.name;
    const targetName = routes.find((r) => r.id === targetRouteId)?.name;
    showToast(`✓ Moved ${label || `${stopIds.length} deliveries: ${sourceName} → ${targetName}`}`, 'success', () => {
      transferStops(targetRouteId, sourceRouteId, stopIds, `${targetName} → ${sourceName} (undo)`);
    });
  }

  function swapRouteStops(aId: number, bId: number) {
    setRoutes((prev) => {
      const a = prev.find((r) => r.id === aId);
      const b = prev.find((r) => r.id === bId);
      if (!a || !b) return prev;
      const aStops = a.stops.map((s, i) => ({ ...s, routeName: b.name, stopNumber: i + 1 }));
      const bStops = b.stops.map((s, i) => ({ ...s, routeName: a.name, stopNumber: i + 1 }));
      return prev.map((r) => {
        if (r.id === aId) return recomputeRoute({ ...r, stops: bStops });
        if (r.id === bId) return recomputeRoute({ ...r, stops: aStops });
        return r;
      });
    });
    showToast(`✓ Swapped Route ${routes.find((r) => r.id === aId)?.name} ↔ Route ${routes.find((r) => r.id === bId)?.name}`, 'success');
  }

  function collapseRoute(routeId: number) {
    if (routes.length <= 1) { showToast('At least two routes are required to collapse', 'error'); return; }
    const removed = routes.find((r) => r.id === routeId);
    if (!removed) return;
    if (!confirm(`Close route ${removed.name}? Its ${removed.totalStops} postcodes will be redistributed across the other routes.`)) return;

    setRoutes((prev) => {
      const remaining = prev.filter((r) => r.id !== routeId);
      const dest = remaining.map((r) => ({ ...r, stops: [...r.stops] }));
      removed.stops.forEach((stop, i) => {
        const d = dest[i % dest.length];
        d.stops.push({ ...stop, routeName: d.name, stopNumber: d.stops.length + 1 });
      });
      return dest.map(recomputeRoute);
    });
    showToast(`Route ${removed.name} closed — postcodes redistributed`, 'success');
  }

  function sendToDriverIndividual(routeId: number) {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;
    const sentSet = shiftKey === 'am' ? sentAm : sentPm;
    const oldValue = route.sendStatus[shiftKey] || 'pending';
    if (sentSet.has(route.id) && oldValue === 'sent') {
      showToast(`Route ${route.name} (${shiftKey.toUpperCase()}) was already sent to ${route.driver}`, 'info');
      return;
    }
    updateRoute(routeId, (r) => ({
      ...r,
      sendStatus: { ...r.sendStatus, [shiftKey]: 'sent' },
      history: [...r.history, {
        action: `Send to Driver (${shiftKey.toUpperCase()})`, field: 'sendStatus', shift: shiftKey,
        oldValue, newValue: 'sent', author: CURRENT_USER, timestamp: new Date().toISOString(),
      }],
    }));
    if (shiftKey === 'am') setSentAm((prev) => new Set(prev).add(routeId));
    else setSentPm((prev) => new Set(prev).add(routeId));
    showToast(`Manifest sent to ${route.driver} (Route ${route.name}, ${shiftKey.toUpperCase()})`, 'success');
  }

  function sendToDrivers() {
    const sentSet = shiftKey === 'am' ? sentAm : sentPm;
    const list = filteredRoutes.filter((r) => visibleStops(r).length > 0);
    if (!list.length) { showToast('No routes to send', 'error'); return; }
    const resend = list.every((r) => sentSet.has(r.id));
    setRoutes((prev) => prev.map((r) => {
      if (!list.some((l) => l.id === r.id)) return r;
      if (!(resend || !sentSet.has(r.id))) return r;
      const oldValue = r.sendStatus[shiftKey] || 'pending';
      return {
        ...r,
        sendStatus: { ...r.sendStatus, [shiftKey]: 'sent' },
        history: [...r.history, {
          action: `${resend ? 'Resend' : 'Send'} to Driver (batch, ${shiftKey.toUpperCase()})`, field: 'sendStatus', shift: shiftKey,
          oldValue, newValue: 'sent', author: CURRENT_USER, timestamp: new Date().toISOString(),
        }],
      };
    }));
    const nextSet = new Set(sentSet);
    list.forEach((r) => nextSet.add(r.id));
    if (shiftKey === 'am') setSentAm(nextSet); else setSentPm(nextSet);
    const drivers = new Set(list.map((r) => r.driver)).size;
    showToast(`${list.length} route manifest${list.length === 1 ? '' : 's'} ${resend ? 're-sent' : 'sent'} to ${drivers} driver${drivers === 1 ? '' : 's'} (${shiftKey.toUpperCase()})`, 'success');
  }

  function revertLastAction(routeId: number) {
    const route = routes.find((r) => r.id === routeId);
    if (!route || !route.history.length) return;
    if (!confirm(`Revert the last action on route ${route.name}?`)) return;
    const last = route.history[route.history.length - 1];
    if (last.field === 'sendStatus') {
      const shift = last.shift || shiftKey;
      const oldSend = last.oldValue as SendStatus;
      updateRoute(routeId, (r) => ({
        ...r,
        sendStatus: { ...r.sendStatus, [shift]: oldSend },
        history: [...r.history.slice(0, -1), {
          action: 'Revert', field: 'status', oldValue: r.sendStatus[shift], newValue: oldSend, author: CURRENT_USER, timestamp: new Date().toISOString(),
        }],
      }));
      const setUpdater = (prev: Set<number>) => {
        const next = new Set(prev);
        if (oldSend === 'sent') next.add(routeId); else next.delete(routeId);
        return next;
      };
      if (shift === 'am') setSentAm(setUpdater); else setSentPm(setUpdater);
    }
    showToast(`Reverted last action on route ${route.name}`, 'success');
  }

  function exportRouteCsv(route: RouteRow) {
    const stops = visibleStops(route);
    if (!stops.length) { showToast('No stops to export on this route', 'error'); return; }
    const header = ['Route', 'Driver', 'Stop #', 'Address', 'Postcode', 'Customer', 'Type', 'Pre 12'];
    const rows = stops.map((s, i) => [route.name, route.driver, i + 1, s.address, s.postcode, s.customer, s.type, s.pre12 ? 'Yes' : 'No']);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `demi8-${route.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`✓ Demi8 export for route ${route.name} (${stops.length} stops)`, 'success');
  }

  function saveNewRoute() {
    const name = newRouteName.trim();
    const target = parseInt(newRouteTarget, 10);
    if (!name) { showToast('Route name is required', 'error'); return; }
    if (routes.some((r) => r.name === name)) { showToast('A route with this name already exists', 'error'); return; }
    setRoutes((prev) => [...prev, {
      id: Date.now(), name, driver: newRouteDriver, vehicle: pick(VEHICLES), target: isNaN(target) ? 85 : target,
      totalStops: 0, completedStops: 0, completion: 0, deliveries: 0, pickups: 0, pre12: 0, asr: 0, dsr: 0, spr: 0,
      sortAttendance: 'yes', notes: '', sendStatus: { am: 'pending', pm: 'pending' }, history: [], stops: [],
    }]);
    setAddRouteModalOpen(false);
    setNewRouteName(''); setNewRouteTarget('85'); setNewRouteDriver(DRIVERS[0]);
    showToast(`Route ${name} added`, 'success');
  }

  function confirmAddPostcode() {
    const code = postcodeInputVal.trim().toUpperCase();
    if (!code) { showToast('Please enter a postcode or subpostcode', 'error'); return; }
    const affected = addPostcodeRouteId ? routes.filter((r) => r.id === Number(addPostcodeRouteId)) : routes;
    if (!affected.length) { showToast('Route not found', 'error'); return; }
    if (postcodeType === 'postcode') {
      if (!/^[A-Z]{2}\d{1,2} \d[A-Z]{2}$/.test(code)) { showToast('Invalid postcode format (e.g. ME15 6AB)', 'error'); return; }
    } else if (!/^[A-Z]{2}\d{1,2}$/.test(code)) {
      showToast('Invalid subpostcode format (e.g. ME15)', 'error'); return;
    }
    showToast(`✓ ${postcodeType === 'postcode' ? 'Postcode' : 'Subpostcode'} ${code} added to ${affected.length} route(s)`, 'success');
    setAddPostcodeModalOpen(false);
  }

  function openEditStop(stop: Stop) {
    setEditStopId(stop.id);
    setEditPostcodeVal(stop.postcode);
    setEditPre12Val(stop.pre12);
    setEditScope('single');
  }

  function saveStopEdit() {
    const allStops = routes.flatMap((r) => r.stops);
    const stop = allStops.find((s) => s.id === editStopId);
    if (!stop) return;
    const newPostcode = editPostcodeVal.trim().toUpperCase();
    if (!newPostcode) { showToast('Postcode is required', 'error'); return; }
    let pre12 = editPre12Val;
    if (pre12 && stop.pm) { pre12 = false; showToast('Pre 12 was cleared: a PM stop cannot also be Pre-12', 'warning'); }
    const route = routes.find((r) => r.name === stop.routeName);
    if (!route) return;
    const oldPostcode = stop.postcode;

    if (editScope === 'all') {
      const affectedCount = route.stops.filter((s) => s.postcode === oldPostcode).length;
      updateRoute(route.id, (r) => recomputeRoute({
        ...r,
        stops: r.stops.map((s) => (s.postcode === oldPostcode ? { ...s, postcode: newPostcode, pre12: s.id === stop.id ? pre12 : s.pre12 } : s)),
      }));
      showToast(`${oldPostcode} → ${newPostcode} on ${affectedCount} stop(s) of route ${route.name}`, 'success');
    } else {
      updateRoute(route.id, (r) => recomputeRoute({
        ...r,
        stops: r.stops.map((s) => (s.id === stop.id ? { ...s, postcode: newPostcode, pre12 } : s)),
      }));
      showToast('Stop updated', 'success');
    }
    setEditStopId(null);
  }

  function openStopsDrawer(routeId: number) { setAllStopsRouteId(routeId); }
  function closeStopsDrawer() { setAllStopsRouteId(null); }

  /* ---------- render ---------- */

  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const sentSet = shiftKey === 'am' ? sentAm : sentPm;
  const visibleRoutesForSend = filteredRoutes.filter((r) => visibleStops(r).length > 0);
  const allSent = visibleRoutesForSend.length > 0 && visibleRoutesForSend.every((r) => sentSet.has(r.id));

  const editingStop = editStopId != null ? routes.flatMap((r) => r.stops).find((s) => s.id === editStopId) : null;
  const shipmentRoute = shipmentModalRouteId != null ? routes.find((r) => r.id === shipmentModalRouteId) : null;
  const allStopsRoute = allStopsRouteId != null ? routes.find((r) => r.id === allStopsRouteId) : null;
  const previewRoute = selectedRouteId != null ? routes.find((r) => r.id === selectedRouteId) : null;
  const previewList = routes.filter((r) => visibleStops(r).length > 0);
  const previewIndex = previewRoute ? previewList.findIndex((r) => r.id === previewRoute.id) : -1;

  const pmAuthorized = !!sp;
  const pmRecords: { route: RouteRow; stop: Stop }[] = [];
  routes.forEach((route) => {
    route.stops.filter((s) => s.pm && (s.asr || s.dsr)).forEach((stop) => pmRecords.push({ route, stop }));
  });

  let allPostcodesEntries = routes.flatMap((route) =>
    groupBySubpostcode(visibleStops(route), filterPM).map((g) => ({ subpostcode: g.code, route, postcodes: g.postcodes, del: g.del, pu: g.pu, pre12: g.pre12 })),
  );
  allPostcodesEntries.sort((a, b) => (a.subpostcode === b.subpostcode ? a.route.name.localeCompare(b.route.name) : a.subpostcode.localeCompare(b.subpostcode)));
  const apq = allPostcodesSearch.trim().toLowerCase();
  if (apq) {
    allPostcodesEntries = allPostcodesEntries.filter((en) => en.subpostcode.toLowerCase().includes(apq) || en.route.name.toLowerCase().includes(apq) || en.route.driver.toLowerCase().includes(apq));
  }

  return (
    <PortalLayout mainClassName="route-balance-container container-fluid px-3 px-lg-4 py-4" title="Route Balance">
      <div className="dashboard-view" id="dashboardView">
        {/* ============ PAGE INFO ============ */}
        <div className="page-header-section">
          <div className="page-header-welcome-text">
            <p className="page-header-date"><i className="bi bi-truck" />Operational route management</p>
          </div>
          <div className="header-info">
            <div className="info-item">
              <span className="label"><i className="bi bi-calendar3" /> Date</span>
              <span className="value" id="operationDate">{dateStr}</span>
            </div>
            <div className="info-item info-item--clock">
              <span className="label"><i className="bi bi-clock" /> Time</span>
              <span className="value" id="operationTime">{timeStr}</span>
            </div>
            <div className="info-item">
              <span className="label"><i className="bi bi-person-circle" /> User</span>
              <span className="value" id="currentUser">{CURRENT_USER}</span>
            </div>
            <button type="button" className="styled-button styled-button--primary btn-refresh" title="Refresh data" onClick={() => showToast('Data refreshed', 'info')}>
              <i className="bi bi-arrow-clockwise" />
            </button>
          </div>
        </div>

        {/* ============ GENERAL CONTROLS ============ */}
        <div className="controls-bar">
          <div className="btn-group-main">
            <button type="button" className="styled-button styled-button--primary" onClick={() => setAddRouteModalOpen(true)}>
              <i className="bi bi-plus-circle" /> Add New Flex Route
            </button>
            <button type="button" className="styled-button styled-button--outline" onClick={() => { setAddPostcodeRouteId(''); setPostcodeInputVal(''); setPostcodeType('postcode'); setAddPostcodeModalOpen(true); }}>
              <i className="bi bi-geo-alt" /> Add Postcode
            </button>
            {/* Collapse Routes / Export Demi8: decorative in the original too — no
                click listener was ever wired to these buttons in script.js. */}
            <button type="button" className="styled-button styled-button--outline" id="btnCollapseRoutes">
              <i className="bi bi-arrows-collapse" /> Collapse Routes
            </button>
            <button type="button" className="styled-button styled-button--outline" id="btnExportCsv">
              <i className="bi bi-filetype-csv" /> Export Demi8
            </button>
            <button type="button" className={`styled-button ${allSent ? 'styled-button--sent' : 'styled-button--primary'}`}
              title={allSent ? `All visible ${shiftKey.toUpperCase()} manifests sent — click to resend` : `Send all visible ${shiftKey.toUpperCase()} route manifests to their drivers`}
              onClick={sendToDrivers}>
              <i className={`bi ${allSent ? 'bi-check2-circle' : 'bi-send'}`} /> {allSent ? `Sent to Drivers (${shiftKey.toUpperCase()})` : `Send to Driver (${shiftKey.toUpperCase()})`}
            </button>
            <button type="button" className="styled-button styled-button--outline" onClick={() => setPmListingModalOpen(true)}>
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
                if (!e.target.checked) setAllPostcodesDrawerOpen(false);
                showToast(e.target.checked ? '🔄 Rebalance mode: select postcodes to transfer' : 'Operations mode: standard view', 'info');
              }} />
              <label htmlFor="rebalanceToggle" className="mode-switch-track">
                <span className="mode-switch-thumb" aria-hidden="true" />
                <span className="mode-switch-option"><i className="bi bi-compass" /><span>Operations</span></span>
                <span className="mode-switch-option"><i className="bi bi-shuffle" /><span>Rebalance</span></span>
              </label>
            </div>
          </div>
        </div>

        {/* ============ SEARCH & FILTERS ============ */}
        <div className="filters-bar">
          <div className="search-wrap">
            <i className="bi bi-search" />
            <input type="text" id="searchRoute" className="form-control" placeholder="Search by route or driver…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* ============ OPERATION SUMMARY ============ */}
        <section className="operation-summary">
          <div className="section-header">
            <h2>Operation Summary</h2>
            {dashboardFilter && (
              <div className="dashboard-filter-status" id="dashboardFilterStatus">
                <span className="dashboard-filter-status-label">Filtering Sub Postcodes by <strong id="dashboardFilterStatusName">{DASHBOARD_FILTER_LABELS[dashboardFilter]}</strong></span>
                <button type="button" className="dashboard-filter-clear-btn" onClick={() => toggleDashboardFilter(dashboardFilter)}>
                  <i className="bi bi-x-lg" /> Clear filter
                </button>
              </div>
            )}
          </div>

          <div className="summary-grid">
            <div className="summary-table-wrapper">
              <div className="table-responsive">
                <table className="table table-hover" id="summaryTable">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Route <i className="bi bi-arrow-down-up" /></th>
                      <th onClick={() => handleSort('driver')} style={{ cursor: 'pointer' }}>Driver <i className="bi bi-arrow-down-up" /></th>
                      <th>Target (%)</th>
                      <th>Total Stops</th>
                    </tr>
                  </thead>
                  <tbody id="summaryTableBody">
                    {dashboardFilteredRoutes.map((route) => (
                      <tr key={route.id}>
                        <td><strong>{route.name}</strong></td>
                        <td>{route.driver}</td>
                        <td>{route.target}%</td>
                        <td>{displayStops(route).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="summary-cards" id="summaryCards">
              <div className={`stat-card stat-card--filterable${dashboardFilter === null ? '' : ''}`} data-tooltip="Total stops across all routes · click to clear any filter" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('all')}>
                <div className="stat-icon"><i className="bi bi-stack" /></div>
                <div className="stat-content"><div className="stat-value" id="totalStopsCard">{totalStopsCard}</div><div className="stat-label">Total Stops</div></div>
              </div>
              <div className="stat-card" data-tooltip="Average target loop">
                <div className="stat-icon"><i className="bi bi-bullseye" /></div>
                <div className="stat-content"><div className="stat-value" id="targetLoopCard">{targetLoopCard}%</div><div className="stat-label">Target Loop</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'del' ? ' stat-card--active' : ''}`} data-tooltip="Total deliveries · click to show only DEL Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('del')}>
                <div className="stat-icon"><i className="bi bi-box-seam" /></div>
                <div className="stat-content"><div className="stat-value" id="deliveriesCard">{deliveriesCard}</div><div className="stat-label">Deliveries</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'pu' ? ' stat-card--active' : ''}`} data-tooltip="Total pickups · click to show only PU Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('pu')}>
                <div className="stat-icon"><i className="bi bi-arrow-repeat" /></div>
                <div className="stat-content"><div className="stat-value" id="pickupsCard">{pickupsCard}</div><div className="stat-label">Pickups</div></div>
              </div>
              <div className="stat-card" data-tooltip="Estimated stops per route">
                <div className="stat-icon"><i className="bi bi-speedometer2" /></div>
                <div className="stat-content"><div className="stat-value" id="sprCard">{sprCard}</div><div className="stat-label">SPR (est.)</div></div>
              </div>
              <div className="stat-card" data-tooltip="Active routes">
                <div className="stat-icon"><i className="bi bi-diagram-3" /></div>
                <div className="stat-content"><div className="stat-value" id="totalRoutesCard">{routes.length}</div><div className="stat-label">Total Routes</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'pre12' ? ' stat-card--active' : ''}`} data-tooltip="Pre 12 deliveries · click to show only Pre 12 Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('pre12')}>
                <div className="stat-icon"><i className="bi bi-rocket-takeoff" /></div>
                <div className="stat-content"><div className="stat-value" id="pre12Card">{pre12Card}</div><div className="stat-label">Pre 12</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'asr' ? ' stat-card--active' : ''}`} data-tooltip="Achieved Service Rate · click to show only ASR Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('asr')}>
                <div className="stat-icon"><i className="bi bi-check-circle" /></div>
                <div className="stat-content"><div className="stat-value" id="asrCard">{asrCard}</div><div className="stat-label">ASR</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'dsr' ? ' stat-card--active' : ''}`} data-tooltip="Delayed Service Rate · click to show only DSR Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('dsr')}>
                <div className="stat-icon"><i className="bi bi-exclamation-circle" /></div>
                <div className="stat-content"><div className="stat-value" id="dsrCard">{dsrCard}</div><div className="stat-label">DSR</div></div>
              </div>
              <div className={`stat-card stat-card--filterable${dashboardFilter === 'special' ? ' stat-card--active' : ''}`} data-tooltip="Pre 12 + ASR + DSR · click to show only Special Delivery Sub Postcodes" role="button" tabIndex={0}
                onClick={() => toggleDashboardFilter('special')}>
                <div className="stat-icon"><i className="bi bi-stars" /></div>
                <div className="stat-content"><div className="stat-value" id="specialCard">{specialCard}</div><div className="stat-label">Special Deliveries</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ ROUTE BLOCKS ============ */}
        <section className={`route-blocks${rebalanceMode ? ' route-blocks--rebalance' : ''}`} id="routeBlocksContainer">
          {!routesToRender.length && dashboardFilter ? (
            <div className="pre12-empty-state dashboard-filter-empty">
              <i className="bi bi-funnel" />
              <p>No Sub Postcodes match this filter</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>Try a different indicator or clear the filter to see everything</p>
            </div>
          ) : (
            routesToRender.map((route) => (
              <RouteBlockCard
                key={route.id}
                route={route}
                otherRoutes={routes.filter((r) => r.id !== route.id)}
                rebalanceMode={rebalanceMode}
                filterPM={filterPM}
                dashboardFilter={dashboardFilter}
                shiftKey={shiftKey}
                selected={selectedRouteId === route.id && !rebalanceMode}
                compareWithRoute={compareTarget[route.id] != null ? routes.find((r) => r.id === compareTarget[route.id]) || null : null}
                comparePickerOpen={comparePickerOpen === route.id}
                onToggleCompare={() => setComparePickerOpen((prev) => (prev === route.id ? null : route.id))}
                onPickCompareTarget={(targetId) => {
                  setCompareTarget((prev) => ({ ...prev, [route.id]: targetId, [targetId]: route.id }));
                  setComparePickerOpen(null);
                  const target = routes.find((r) => r.id === targetId);
                  showToast(`Comparing Route ${route.name} with Route ${target?.name}`, 'info');
                }}
                onSwapCompare={() => {
                  const otherId = compareTarget[route.id];
                  if (otherId == null) return;
                  swapRouteStops(route.id, otherId);
                  setCompareTarget((prev) => {
                    const next = { ...prev };
                    delete next[route.id];
                    delete next[otherId];
                    return next;
                  });
                }}
                onCancelCompare={() => {
                  const otherId = compareTarget[route.id];
                  setCompareTarget((prev) => {
                    const next = { ...prev };
                    delete next[route.id];
                    if (otherId != null) delete next[otherId];
                    return next;
                  });
                }}
                onSendIndividual={() => sendToDriverIndividual(route.id)}
                onRevert={() => revertLastAction(route.id)}
                onCollapse={() => collapseRoute(route.id)}
                onAddPostcode={() => { setAddPostcodeRouteId(String(route.id)); setPostcodeInputVal(''); setPostcodeType('postcode'); setAddPostcodeModalOpen(true); }}
                onExportCsv={() => exportRouteCsv(route)}
                onSeeAllStops={() => openStopsDrawer(route.id)}
                isAllStopsOpen={allStopsRouteId === route.id}
                onEditStop={openEditStop}
                onShipmentDetails={() => setShipmentModalRouteId(route.id)}
                onNotesBlur={(value) => updateRoute(route.id, (r) => ({ ...r, notes: value }))}
                onTransferStops={transferStops}
                onClickCard={() => setSelectedRouteId(route.id)}
              />
            ))
          )}
        </section>
      </div>

      {/* ============ LOADING OVERLAY ============ */}
      {createPortal(
        <div className={`loading-overlay${loading ? ' active' : ''}`} id="loadingOverlay">
          <div className="spinner" />
          <p>Loading operation data…</p>
        </div>,
        document.body,
      )}

      {/* ============ MODAL: Add Postcode ============ */}
      {addPostcodeModalOpen && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-geo-alt me-2" />Add Postcode</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setAddPostcodeModalOpen(false)} />
                </div>
                <div className="modal-body">
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
                    <input type="text" className="form-control" id="postcodeInput" placeholder="e.g. ME15 6AB or ME15" value={postcodeInputVal} onChange={(e) => setPostcodeInputVal(e.target.value)} />
                    <div className="form-hint">Type or select from the list below.</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Select Route (Optional)</label>
                    <select className="form-select" id="addPostcodeRoute" value={addPostcodeRouteId} onChange={(e) => setAddPostcodeRouteId(e.target.value)}>
                      <option value="">All routes</option>
                      {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="styled-button styled-button--outline" onClick={() => setAddPostcodeModalOpen(false)}>Cancel</button>
                  <button type="button" className="styled-button styled-button--primary" onClick={confirmAddPostcode}>Add</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setAddPostcodeModalOpen(false)} />
        </>,
        document.body,
      )}

      {/* ============ MODAL: Add New Flex Route ============ */}
      {addRouteModalOpen && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-plus-circle me-2" />Add New Flex Route</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setAddRouteModalOpen(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="newRouteName" className="form-label">Route Name</label>
                    <input type="text" className="form-control" id="newRouteName" placeholder="e.g. FX-01" required value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newDriver" className="form-label">Driver</label>
                    <select className="form-select" id="newDriver" required value={newRouteDriver} onChange={(e) => setNewRouteDriver(e.target.value)}>
                      {DRIVERS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newTarget" className="form-label">Target (%)</label>
                    <input type="number" className="form-control" id="newTarget" min={0} max={100} required value={newRouteTarget} onChange={(e) => setNewRouteTarget(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="styled-button styled-button--outline" onClick={() => setAddRouteModalOpen(false)}>Cancel</button>
                  <button type="button" className="styled-button styled-button--primary" onClick={saveNewRoute}>Save Route</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setAddRouteModalOpen(false)} />
        </>,
        document.body,
      )}

      {/* ============ MODAL: Shipment Details ============ */}
      {shipmentRoute && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-box2 me-2" />Shipment Details</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setShipmentModalRouteId(null)} />
                </div>
                <div className="modal-body">
                  <div className="shipment-details">
                    <div className="detail-row"><span className="label">Shipment ID</span><span className="value mono">ROUTE-{shipmentRoute.name}</span></div>
                    <div className="detail-row"><span className="label">Weight</span><span className="value">Total Stops: {visibleStops(shipmentRoute).length}</span></div>
                    <div className="detail-row"><span className="label">Height</span><span className="value">Deliveries: {visibleStops(shipmentRoute).filter((s) => s.type === 'DEL').length}</span></div>
                    <div className="detail-row"><span className="label">Width</span><span className="value">Pickups: {visibleStops(shipmentRoute).filter((s) => s.type === 'PU').length}</span></div>
                    <div className="detail-row"><span className="label">Length</span><span className="value">Pre-12: {shipmentRoute.pre12}</span></div>
                    <div className="detail-row"><span className="label">Volume</span><span className="value">ASR: {shipmentRoute.asr}</span></div>
                    <div className="detail-row"><span className="label">Pieces</span><span className="value">DSR: {shipmentRoute.dsr}</span></div>
                    <div className="detail-row"><span className="label">Driver</span><span className="value">{shipmentRoute.driver}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShipmentModalRouteId(null)} />
        </>,
        document.body,
      )}

      {/* ============ MODAL: Edit Postcode ============ */}
      {editingStop && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-pencil-square me-2" />Edit Postcode</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditStopId(null)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="editPostcode" className="form-label">Postcode</label>
                    <input type="text" className="form-control" id="editPostcode" placeholder="e.g. ME15 6AB" value={editPostcodeVal} onChange={(e) => setEditPostcodeVal(e.target.value)} />
                    <div className="form-hint">Type a new postcode or pick an existing one to substitute.</div>
                  </div>
                  <div className="mb-3">
                    <span className="form-label d-block">Apply to</span>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="editScope" id="scopeSingle" checked={editScope === 'single'} onChange={() => setEditScope('single')} />
                      <label className="form-check-label" htmlFor="scopeSingle">Only this stop</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="editScope" id="scopeAll" checked={editScope === 'all'} onChange={() => setEditScope('all')} />
                      <label className="form-check-label" htmlFor="scopeAll">Replace all stops with postcode <strong id="scopeAllPostcode">{editingStop.postcode}</strong> in this route</label>
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="editPre12" checked={editPre12Val} disabled={editingStop.pm} onChange={(e) => setEditPre12Val(e.target.checked)} />
                    <label className="form-check-label" htmlFor="editPre12"><span className="status-badge status-badge-pre12">Pre 12</span> — must be delivered before 12:00</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="styled-button styled-button--outline" onClick={() => setEditStopId(null)}>Cancel</button>
                  <button type="button" className="styled-button styled-button--primary" onClick={saveStopEdit}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setEditStopId(null)} />
        </>,
        document.body,
      )}

      {/* ============ MODAL: PM ASR/DSR Listing ============ */}
      {pmListingModalOpen && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title"><i className="bi bi-clipboard-data me-2" />PM ASR/DSR Listing</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={() => setPmListingModalOpen(false)} />
                </div>
                <div className="modal-body" id="pmListingBody">
                  {!pmAuthorized ? (
                    <div className="pre12-empty-state">
                      <i className="bi bi-lock-fill" />
                      <p>You are not authorized to view the PM ASR/DSR listing.</p>
                      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '0.5rem' }}>Sign in through the Service Provider portal to unlock this view.</p>
                    </div>
                  ) : !pmRecords.length ? (
                    <div className="pre12-empty-state">
                      <i className="bi bi-check-circle-fill" />
                      <p>No ASR/DSR records for the PM period</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover table-sm">
                        <thead><tr><th>Route</th><th>Driver</th><th>Postcode</th><th>Customer</th><th>Category</th><th>Status</th></tr></thead>
                        <tbody>
                          {pmRecords.map(({ route, stop }) => (
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
                                <span className={`status-badge status-badge-${route.sendStatus.pm === 'sent' ? 'completed' : 'pending'}`}>
                                  {route.sendStatus.pm === 'sent' ? 'Sent' : 'Pending'}
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
          <div className="modal-backdrop fade show" onClick={() => setPmListingModalOpen(false)} />
        </>,
        document.body,
      )}

      {/* ============ MODAL: Route Preview (Rebalance Navigation) ============ */}
      {previewRoute && !rebalanceMode && createPortal(
        <>
          <div className="modal fade show" style={{ display: 'block' }} tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 className="modal-title"><i className="bi bi-shuffle" /> Route {previewRoute.name} — Rebalance Preview</h5>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" className="styled-button styled-button--outline btn-preview-prev" disabled={previewList.length <= 1}
                      onClick={() => setSelectedRouteId(previewList[(previewIndex - 1 + previewList.length) % previewList.length].id)}>
                      <i className="bi bi-chevron-left" /> Previous
                    </button>
                    <span className="preview-position" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)', minWidth: 50, textAlign: 'center' }}>
                      {previewIndex + 1} / {previewList.length}
                    </span>
                    <button type="button" className="styled-button styled-button--outline btn-preview-next" disabled={previewList.length <= 1}
                      onClick={() => setSelectedRouteId(previewList[(previewIndex + 1) % previewList.length].id)}>
                      Next <i className="bi bi-chevron-right" />
                    </button>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedRouteId(null)} />
                  </div>
                </div>
                <div className="modal-body">
                  {(() => {
                    const stops = visibleStops(previewRoute);
                    const groups = groupBySubpostcode(stops, filterPM);
                    const del = stops.filter((s) => s.type === 'DEL').length;
                    const pu = stops.length - del;
                    return (
                      <>
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Driver</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink)' }}>{previewRoute.driver}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Total Stops</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink)' }}>{stops.length}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Deliveries / Pickups</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink)' }}>{del} / {pu}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.3rem' }}>Progress</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)' }}>{previewRoute.completion}%</div>
                            </div>
                          </div>
                        </div>
                        <h6 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: '0.75rem' }}>Subpostcodes & Postcodes</h6>
                        <div className="table-responsive">
                          <table className="route-table">
                            <thead><tr><th>Subpostcode</th><th>Postcodes</th><th>DEL</th><th>PU</th><th>Total</th></tr></thead>
                            <tbody>
                              {groups.map((g) => (
                                <tr key={g.code}><td><strong>{g.code}</strong></td><td>{g.postcodes.length}</td><td>{g.del}</td><td>{g.pu}</td><td>{g.total}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setSelectedRouteId(null)} />
        </>,
        document.body,
      )}

      {/* ============ DRAWER: See All Stops ============ */}
      {createPortal(
        <div className={`stops-drawer${allStopsRoute ? ' is-open' : ''}`} id="allStopsDrawer">
          <div className="stops-drawer-header">
            <h5 id="allStopsModalTitle"><i className="bi bi-geo-alt" />All Stops{allStopsRoute ? ` — Route ${allStopsRoute.name}` : ''}</h5>
            <button type="button" className="stops-drawer-close" aria-label="Close" onClick={closeStopsDrawer}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="stops-drawer-body">
            {allStopsRoute && (
              <>
                <div className="modal-metrics" id="allStopsMetrics">
                  <span className="status-badge metric-badge--pre12" style={{ background: '#e0f2fe', color: '#075985' }}>Pre 12: {allStopsRoute.pre12}</span>
                  <span className="status-badge" style={{ background: '#d1fae5', color: '#065f46' }}>ASR: {allStopsRoute.asr}</span>
                  <span className="status-badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>DSR: {allStopsRoute.dsr}</span>
                  <span className="status-badge" style={
                    allStopsRoute.sortAttendance === 'yes' ? { background: '#d1fae5', color: '#065f46' }
                    : allStopsRoute.sortAttendance === 'late' ? { background: '#fef3c7', color: '#92400e' }
                    : { background: '#fee2e2', color: '#991b1b' }
                  }>Sort: {SORT_ATTENDANCE_LABELS[allStopsRoute.sortAttendance]}</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-sm">
                    <thead><tr><th>Stop</th><th>Address</th><th>Postcode</th><th>Customer</th><th>Flag</th><th>Route</th></tr></thead>
                    <tbody id="allStopsTableBody">
                      {[...visibleStops(allStopsRoute)].sort((a, b) => a.routeName.localeCompare(b.routeName) || a.stopNumber - b.stopNumber).map((s) => (
                        <tr key={s.id}>
                          <td>{s.stopNumber}</td>
                          <td>{s.address}</td>
                          <td>{s.postcode}</td>
                          <td>{s.customer}</td>
                          <td>
                            <span className={`status-badge status-badge-${s.pm ? 'pm' : 'am'}`}>{s.pm ? 'PM' : 'AM'}</span>
                            {s.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                          </td>
                          <td>{s.routeName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* ============ FAB + DRAWER: All Postcodes (Rebalance mode only) ============ */}
      {createPortal(
        <>
          <button type="button" className={`fab-all-postcodes${allPostcodesDrawerOpen ? ' open' : ''}`}
            title="Show every subpostcode across all routes"
            onClick={() => setAllPostcodesDrawerOpen((o) => !o)}>
            <i className="bi bi-list-ul" /> <span id="btnShowAllPostcodesLabel">{allPostcodesDrawerOpen ? 'Hide All Postcodes' : 'Show All Postcodes'}</span>
          </button>
          <div className={`ap-drawer${allPostcodesDrawerOpen ? ' open' : ''}`} aria-hidden={!allPostcodesDrawerOpen}>
            <div className="ap-drawer-header">
              <h3><i className="bi bi-list-ul" /> All Postcodes</h3>
              <button type="button" className="ap-drawer-close" aria-label="Close" onClick={() => setAllPostcodesDrawerOpen(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="ap-drawer-body">
              <input type="text" className="form-control ap-search" placeholder="Search subpostcode, route or driver…" autoComplete="off"
                value={allPostcodesSearch} onChange={(e) => setAllPostcodesSearch(e.target.value)} />
              <div>
                {!allPostcodesEntries.length ? (
                  <div className="pre12-empty-state">
                    <i className="bi bi-search" />
                    <p>No subpostcodes match your search</p>
                  </div>
                ) : (
                  <div className="all-postcodes-list">
                    {allPostcodesEntries.map((en) => (
                      <div className="all-postcodes-row" key={`${en.route.id}-${en.subpostcode}`} title={`${en.subpostcode} on Route ${en.route.name}`}>
                        <i className="bi bi-grip-vertical drag-handle" />
                        <span className="ap-subpostcode">{en.subpostcode}</span>
                        <span className="postcode-count-badge">{en.postcodes.length} postcode{en.postcodes.length === 1 ? '' : 's'}</span>
                        {en.pre12 && <span className="status-badge status-badge-pre12">Pre 12</span>}
                        <span className="ap-route-flag" title={`Currently on Route ${en.route.name} · ${en.route.driver}`}>
                          <i className="bi bi-signpost-split" /> {en.route.name} · {en.route.driver}
                        </span>
                        <span className="pre12-flip-count">DEL {en.del} / PU {en.pu}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </PortalLayout>
  );
}

/**
 * ==================== SIMPLIFICATIONS / SKIPPED (vs. the recovered original) ====================
 *
 * - XLSX manifest intake (dropzone, "Process manifest", parseManifestWorkbook): the
 *   original's setupIntakeListeners()/stageIntakeFile()/processIntakeFile() are dead
 *   code — no #intakeDropzone/#intakeFileInput elements exist in index.html and
 *   nothing in init()/enterDashboard() ever calls setupIntakeListeners(). Omitted
 *   entirely; the page always starts from generateFakeData(), same as the original.
 * - Native HTML5 drag-and-drop (dragging a delivery/postcode/subpostcode row onto
 *   another route card, or from the "All Postcodes" drawer) is skipped as genuinely
 *   complex interaction plumbing. Rebalance mode still works end-to-end through the
 *   non-drag "Move all…"/"Move…" menus, which call the exact same transfer logic
 *   (transferStops) the original's drag handlers used.
 * - The "Send Subpostcode / Send Postcode" Transfer modal (#transferModal) was, in
 *   the original, only ever opened by that same drag-and-drop (openTransferModal is
 *   called exclusively from drop handlers). With drag skipped it has no trigger, so
 *   it isn't mounted here — mirroring the original's own Pre-12 Priority Deliveries
 *   modal (#pre12Modal), which likewise has no trigger anywhere in script.js and was
 *   therefore also left unmounted.
 * - localStorage persistence of transfers/sent-state (persistRebalance/
 *   loadRebalanceState) is skipped; state lives for the page session only, same
 *   simplification already used by the other faithfully-ported pages (fresh mock
 *   data each mount).
 * - Scroll-edge fade shadows on long route tables (has-fade-top/has-fade-bottom,
 *   driven by a scroll listener in initScrollFades()) are a minor cosmetic touch and
 *   were skipped.
 * - Debounced search-as-you-type (search box, All Postcodes search) is simplified to
 *   direct/non-debounced filtering — same end state, different re-render timing.
 */
