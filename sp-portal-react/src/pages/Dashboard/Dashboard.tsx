import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../../styles/legacy/dashboard.css';
import '../../styles/legacy/dashboard-base.css';
import '../../styles/legacy/dashboard-header.css';
import '../../styles/legacy/dashboard-network-delays.css';
import '../../styles/legacy/dashboard-modals.css';
import '../../styles/legacy/dashboard-disco-block.css';
import '../../styles/legacy/dashboard-operations.css';
import '../../styles/legacy/dashboard-financials.css';
import '../../styles/legacy/dashboard-sidebar.css';
import '../../styles/legacy/dashboard-live-service.css';
import { PortalLayout } from '../../layout/PortalLayout';
import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { useModalBehavior } from '../../hooks/useModalBehavior';

/* ============================ Live Service data (ported from live-service.js) ============================ */
const LIVE_ROUTES = [
  { key: 'md7a', label: 'MD7A', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 9 9AE', addr: '52 Market Street' }, { pc: 'RM 4 3QR', addr: '167 Park Lane' },
  ] },
  { key: 'md7b', label: 'MD7B', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 6 8GD', addr: '143 New Road' }, { pc: 'RM 8 0WP', addr: '19a Bridge Street' },
  ] },
  { key: 'md7c', label: 'MD7C', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 8 7HZ', addr: 'Flat 168 George Street' }, { pc: 'RM 9 4XK', addr: 'Flat 134 High Street' },
  ] },
  { key: 'md7d', label: 'MD7D', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 6 5GY', addr: 'Unit 136 Bridge Street' }, { pc: 'RM 6 8UL', addr: '76b High Street' },
  ] },
  { key: 'md7e', label: 'MD7E', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 7 1TD', addr: '184 Manor Road' }, { pc: 'RM 4 4KL', addr: 'Flat 111 Green Lane' },
  ] },
  { key: 'md7f', label: 'MD7F', service: 'Pre-12', icon: 'bi-sunrise', tone: 'pre12', stops: [
    { pc: 'RM 3 4RY', addr: 'Unit 187 Queen Street' }, { pc: 'RM 3 8ES', addr: 'Unit 20 New Road' },
  ] },
];

const STATUS_META: Record<string, { label: string; icon: string }> = {
  completed: { label: 'Completed', icon: 'bi-check-circle-fill' },
  inprogress: { label: 'In progress', icon: 'bi-truck' },
  next: { label: 'Next', icon: 'bi-skip-forward-circle' },
  queued: { label: 'Queued', icon: 'bi-clock' },
};

const ASSIGNMENTS = [
  { driverName: 'John Smith', vehicleName: 'Volkswagen Crafter', vehicleVrn: 'AB12 CDE' },
  { driverName: 'Maria Santos', vehicleName: 'Ford Transit', vehicleVrn: 'EF34 FGH' },
  { driverName: 'James Wilson', vehicleName: 'Renault Master', vehicleVrn: 'JK56 LMN' },
  { driverName: 'Ana Ferreira', vehicleName: 'Tesla Semi', vehicleVrn: 'OP78 PQR' },
  { driverName: 'Michael Brown', vehicleName: 'Mercedes-Benz Sprinter', vehicleVrn: 'ST90 UVW' },
  { driverName: 'Sofia Rodrigues', vehicleName: 'Ford e-Transit', vehicleVrn: 'XY12 ZAB' },
];

function statusFor(done: number, index: number) {
  if (index < done) return 'completed';
  if (index === done) return 'inprogress';
  if (index === done + 1) return 'next';
  return 'queued';
}

function getRouteWarnings(route: (typeof LIVE_ROUTES)[number], done: number) {
  const pending = route.stops.filter((_stop, index) => statusFor(done, index) !== 'completed');
  if (!pending.length) return [];
  return pending.slice(0, 2).map((stop, index) => {
    const pre12 = route.service === 'Pre-12';
    const title = pre12 ? 'Pre-12 delivery still pending' : 'Delivery requires attention';
    const detail = pre12
      ? `${stop.pc} has not been delivered and is approaching the 12:00 deadline.`
      : `${stop.pc} remains pending in the delivery window.`;
    return { title, detail, critical: pre12 && index === 0 };
  });
}

/* ============================ Nav groups (ported from live-service.js) ============================ */
interface NavItem { label: string; desc: string; icon: string; route: string | null }
interface NavGroup { title: string; icon: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  { title: 'Planning & Operations', icon: 'bi-calendar3', items: [
    { label: 'Week Planner', desc: 'Plan routes and crews for the week', icon: 'bi-calendar-week', route: '/week-planner' },
    { label: 'Route Balance', desc: 'Balance stops across live routes', icon: 'bi-sliders', route: '/route-balance' },
    { label: 'Daily Operations Management', desc: 'Run and adjust today’s operation', icon: 'bi-speedometer2', route: '/daily-operations-management' },
  ] },
  { title: 'Setup', icon: 'bi-gear', items: [
    { label: 'Vehicles', desc: 'Fleet, VRNs and vehicle status', icon: 'bi-truck', route: '/vehicles' },
    { label: 'Assets', desc: 'Scanners, devices and equipment', icon: 'bi-upc-scan', route: '/assets' },
    { label: 'Contract Management', desc: 'Routes, loops and agreements', icon: 'bi-file-earmark-text', route: '/contracts' },
  ] },
  { title: 'Feed & Announcements', icon: 'bi-megaphone', items: [
    { label: 'Feed', desc: 'SOPs, tutorials and updates', icon: 'bi-journal-bookmark', route: '/sop-feed' },
    { label: 'Announcements', desc: 'Messages from DHL', icon: 'bi-megaphone-fill', route: '/announcements' },
  ] },
  { title: 'Compliance', icon: 'bi-shield-check', items: [
    { label: 'Service Provider Profile', desc: 'Company details and documents', icon: 'bi-building', route: '/profile' },
    { label: 'Compliance', desc: 'Training status and renewals', icon: 'bi-patch-check', route: null },
    { label: 'Vetting', desc: 'Driver vetting and checks', icon: 'bi-person-check', route: '/vetting-admin' },
  ] },
  { title: 'Billing', icon: 'bi-receipt', items: [
    { label: 'Invoice Processing Workflow', desc: 'Submit and track invoices', icon: 'bi-arrow-repeat', route: '/invoices' },
    { label: 'Deductions', desc: 'Liquidation damages and adjustments', icon: 'bi-dash-circle', route: null },
    { label: 'Adhoc Invoice Management', desc: 'One-off works invoicing', icon: 'bi-receipt-cutoff', route: '/adhoc-invoice-management' },
  ] },
  { title: 'Performance', icon: 'bi-graph-up', items: [
    { label: 'Financial Insights', desc: 'Income, targets and trends', icon: 'bi-currency-pound', route: '/daily-financial-insights' },
    { label: 'Operation Insights', desc: 'SPR, AFD and time windows', icon: 'bi-bar-chart-line', route: '/daily-operations-reports' },
    { label: 'Vendor Performance', desc: 'Scorecards by vendor', icon: 'bi-trophy', route: '/vendor-performance' },
  ] },
  { title: 'Vendor Requests', icon: 'bi-inbox', items: [
    { label: 'Vendor Requests', desc: 'Open requests and approvals', icon: 'bi-envelope-paper', route: '/requests-admin' },
  ] },
  { title: 'Trace & Queries', icon: 'bi-search', items: [
    { label: 'Trace & Queries', desc: 'Track shipments and raise queries', icon: 'bi-binoculars', route: null },
  ] },
];

/* ============================ Last Day / SPMS / LD mock data ============================ */
const LAST_DAY_ROWS = [
  { route: 'MD7A', spr: 86, tw: '98%', del: 72, pu: 10, hn: 4, afd: '2%' },
  { route: 'MD7B', spr: 92, tw: '94%', del: 78, pu: 9, hn: 5, afd: '3%' },
  { route: 'MD7C', spr: 108, tw: '88%', del: 90, pu: 12, hn: 6, afd: '6%' },
  { route: 'MD7D', spr: 101, tw: '100%', del: 88, pu: 8, hn: 5, afd: '1%' },
  { route: 'MD7E', spr: 116, tw: '97%', del: 98, pu: 11, hn: 7, afd: '2%' },
  { route: 'MD7F', spr: 73, tw: '92%', del: 61, pu: 7, hn: 5, afd: '4%' },
];

const LD_ROWS = [
  { awb: '4821 5566 210', route: 'MD7C', date: '2026-07-18', desc: 'Late delivery — Pre-12 breach', amount: '-£24.50', status: 'Open' },
  { awb: '4821 5566 344', route: 'MD7F', date: '2026-07-19', desc: 'Missing POD', amount: '-£12.00', status: 'Under review' },
  { awb: '4821 5566 501', route: 'MD7E', date: '2026-07-20', desc: 'Damaged parcel', amount: '-£38.75', status: 'Resolved' },
];

const SPMS = { income: '£18,420', incomePct: 104, afdPct: 3.2, delOk: 486, delPu: 62, delHn: 31, avgIncome: '£3,070', avgRoute: '£614', totalOpenRoutes: 6 };

const KPI_DATA = [
  { id: 'spr', value: '92.5', label: 'SPR', icon: 'bi-graph-up-arrow' },
  { id: 'spohr', value: '156', label: 'SPOH-R', icon: 'bi-speedometer2' },
  { id: 'routes', value: '42', label: 'TOTAL ROUTES', icon: 'bi-signpost-2-fill' },
  { id: 'stops', value: '1,247', label: 'TOTAL STOPS', icon: 'bi-geo-alt-fill' },
  { id: 'vendors', value: '18', label: 'ACTIVE VENDORS', icon: 'bi-people-fill' },
  { id: 'loops', value: '24', label: 'ACTIVE LOOPS', icon: 'bi-arrow-repeat' },
];

const COMPLIANCE_DATA = [
  { course: 'cargo', title: 'Cargo Training', icon: 'bi-box-seam', expiring: ['John Smith', 'Maria Santos'], expired: ['James Wilson'] },
  { course: 'dangerous', title: 'Dangerous Goods', icon: 'bi-exclamation-octagon', expiring: ['Ana Ferreira', 'Michael Brown'], expired: [] },
  { course: 'manual', title: 'Manual Handling', icon: 'bi-hand-index', expiring: [], expired: ['Sofia Rodrigues'] },
];

const MODAL_SLIDES = [
  { id: 0, title: 'KPIs', icon: 'bi-graph-up-arrow' },
  { id: 1, title: 'Compliance', icon: 'bi-shield-check' },
  { id: 2, title: 'Drivers', icon: 'bi-file-earmark-medical' },
  { id: 3, title: 'Vehicles', icon: 'bi-truck' },
];

const ARC_LEN = 119;
const RING_LEN = 251;

function gaugeColor(pct: number, okAt: number, warnAt: number) {
  return pct >= okAt ? '#22c55e' : pct >= warnAt ? '#f59e0b' : '#ef4444';
}

export function Dashboard() {
  useViewportAttribute();
  const [showModal, setShowModal] = useState(false);
  const [modalSlide, setModalSlide] = useState(0);
  const [activeFolder, setActiveFolder] = useState<'lastday' | 'spms' | 'ld'>('lastday');
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  useModalBehavior(() => setShowModal(false), showModal);

  const route = LIVE_ROUTES[activeRouteIndex];
  const done = route.stops.length > 1 ? 1 : 0;
  const total = route.stops.length;
  const pct = Math.round((done / total) * 100);
  const currentIndex = Math.min(done, total - 1);
  const currentStop = route.stops[currentIndex];
  const currentStatus = statusFor(done, currentIndex);
  const assignment = ASSIGNMENTS[activeRouteIndex % ASSIGNMENTS.length];
  const completed = done >= total;
  const warnings = getRouteWarnings(route, done);

  const incomeBase = Math.min(SPMS.incomePct, 100);
  const incomeDash = ((incomeBase / 100) * ARC_LEN).toFixed(1);
  const incomeColor = gaugeColor(incomeBase, 95, 75);
  const incomeOverDash = SPMS.incomePct > 100 ? (((SPMS.incomePct - 100) / 100) * ARC_LEN).toFixed(1) : '0';
  const afdAngle = (-90 + Math.min(SPMS.afdPct / 8, 1) * 180).toFixed(1);
  const perfTotal = SPMS.delOk + SPMS.delPu + SPMS.delHn;
  const perfPct = 97.4;
  const perfDash = ((Math.min(perfPct, 100) / 100) * RING_LEN).toFixed(1);
  const perfColor = gaugeColor(perfPct, 95, 80);

  return (
    <PortalLayout mainClassName="vendor-admin-main dashboard-main" title="Dashboard">
      {/* ============ PAGE INFO ============ */}
      <div className="dashboard-header mb-2">
        <div className="dashboard-header-top">
          <div className="sp-dash-title-wrap me-3">
            <div className="sp-dash-title-icon" aria-hidden="true"><i className="bi bi-grid-1x2-fill" /></div>
            <div className="sp-dash-title-text-group">
              <span className="sp-dash-title-sub">Service Provider Portal</span>
            </div>
          </div>
          <div className="dashboard-header-center">
            <div className="sp-announcement-header-box">
              <div className="sp-announcement-header-card">
                <div className="sp-announcement-header-head">
                  <h3 className="sp-announcement-header-title"><i className="bi bi-megaphone-fill" aria-hidden="true" /> Announcements</h3>
                  <p className="sp-announcement-header-desc small text-muted mb-0">Announcements from DHL appear here.</p>
                </div>
                <div className="sp-announcement-header-body">
                  <Link to="/announcements" className="sp-announcement-box-trigger" aria-label="View announcements">
                    <span className="sp-announcement-box-text">No announcements yet.</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Live Service ============ */}
      <section className="dashboard-section dashboard-block mb-2" id="spLiveServiceBlock" aria-label="Live Service">
        <div className="card sp-dashboard-module-card sp-live-service-card overflow-hidden">
          <div className="dashboard-block-header sp-live-header d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="sp-live-title-wrap">
              <h2 className="dashboard-block-title mb-1"><span className="sp-live-dot" aria-hidden="true" />Live Service</h2>
              <p className="dashboard-block-desc mb-0">Real-time operation by route — updating now.</p>
            </div>
            <div className="sp-live-header-meta d-flex align-items-center gap-2">
              <span className="sp-live-depot-chip"><i className="bi bi-geo-alt-fill" aria-hidden="true" /> Depot MSE</span>
              <span className="sp-live-now-badge"><span className="sp-live-now-ring" aria-hidden="true" /> Live now</span>
            </div>
          </div>
          <div className="dashboard-block-content sp-live-content">
            <div className="sp-live-kpi-row" role="group" aria-label="Live service metrics">
              <div className="sp-live-kpi sp-live-kpi--route"><span className="sp-live-kpi-value">{route.label}</span><span className="sp-live-kpi-label">Route</span></div>
              <div className="sp-live-kpi sp-live-kpi--asr"><span className="sp-live-kpi-value">{done}</span><span className="sp-live-kpi-label">Delivered</span></div>
              <div className="sp-live-kpi sp-live-kpi--dsr"><span className="sp-live-kpi-value">{total - done}</span><span className="sp-live-kpi-label">Remaining</span></div>
              <div className="sp-live-kpi sp-live-kpi--service"><span className="sp-live-kpi-value">{route.service}</span><span className="sp-live-kpi-label">Service</span></div>
              <div className="sp-live-kpi sp-live-kpi--done"><span className="sp-live-kpi-value">{warnings.length}</span><span className="sp-live-kpi-label">Warnings</span></div>
            </div>

            <div className="sp-live-carousel" role="region" aria-roledescription="carousel" aria-label="Live routes">
              <div className="sp-live-carousel-topline">
                <span className="sp-live-carousel-label">Route dispatch</span>
                <span className="sp-live-carousel-position" aria-live="polite">Route {activeRouteIndex + 1} of {LIVE_ROUTES.length}</span>
              </div>
              <div className="sp-live-carousel-viewport">
                <div className="sp-live-carousel-track">
                  <article className={`sp-live-route-slide sp-live-route-slide--${route.tone}`} role="group" aria-label={`${route.label}, route ${activeRouteIndex + 1} of ${LIVE_ROUTES.length}`}>
                    <div className="sp-live-route-head">
                      <div>
                        <span className="sp-live-route-eyebrow"><i className={`bi ${route.icon}`} aria-hidden="true" /> {route.service} service</span>
                        <h3 className="sp-live-route-title">{route.label} route</h3>
                      </div>
                      <div className="sp-live-route-progress-copy"><strong>{done}<span>/{total}</span></strong><span>deliveries complete</span></div>
                    </div>
                    <div className="sp-live-route-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${route.label} delivery progress`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <div className="sp-live-route-body">
                      <section className={`sp-live-current-delivery${completed ? ' sp-live-current-delivery--complete' : ''}`} aria-label="Current delivery">
                        <div className="sp-live-current-kicker">
                          <span className="sp-live-current-signal"><i className={`bi ${STATUS_META[currentStatus].icon}`} aria-hidden="true" /></span>
                          {completed ? 'Route complete' : 'Current delivery'}
                        </div>
                        <div className="sp-live-current-postcode">{currentStop.pc}</div>
                        <p className="sp-live-current-address">{currentStop.addr}</p>
                        <span className="sp-live-current-status">{completed ? 'All deliveries completed' : STATUS_META[currentStatus].label}</span>
                      </section>
                      <section className="sp-live-resource-panel" aria-label="Route resources">
                        <div className="sp-live-resource"><span className="sp-live-resource-icon"><i className="bi bi-person-fill" aria-hidden="true" /></span><span><small>Driver</small><strong>{assignment.driverName}</strong><em>On route</em></span></div>
                        <div className="sp-live-resource"><span className="sp-live-resource-icon"><i className="bi bi-truck-front-fill" aria-hidden="true" /></span><span><small>Vehicle</small><strong>{assignment.vehicleName}</strong><em>{assignment.vehicleVrn}</em></span></div>
                      </section>
                      <section className="sp-live-queue-panel sp-live-warning-panel" aria-label="Route warnings">
                        <div className="sp-live-queue-head"><span><i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> Warnings</span><span>{warnings.length} active</span></div>
                        <ul className="sp-live-warning-list">
                          {warnings.length === 0 ? (
                            <li className="sp-live-warning sp-live-warning--clear"><i className="bi bi-check-circle-fill" aria-hidden="true" /><span><strong>No active warnings</strong><small>All route deliveries are complete.</small></span></li>
                          ) : warnings.map((w, i) => (
                            <li key={i} className={`sp-live-warning${w.critical ? ' sp-live-warning--critical' : ''}`}>
                              <i className={`bi ${w.critical ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`} aria-hidden="true" />
                              <span><strong>{w.title}</strong><small>{w.detail}</small></span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>
                  </article>
                </div>
              </div>
              <div className="sp-live-carousel-footer">
                <div className="sp-live-carousel-dots" role="tablist" aria-label="Choose a route">
                  {LIVE_ROUTES.map((r, i) => (
                    <button key={r.key} type="button" className={`sp-live-carousel-dot${i === activeRouteIndex ? ' is-active' : ''}`} role="tab" aria-selected={i === activeRouteIndex} aria-label={`Show ${r.label} route`} onClick={() => setActiveRouteIndex(i)}>
                      <span />{r.label}
                    </button>
                  ))}
                </div>
                <div className="sp-live-carousel-controls">
                  <button type="button" className="sp-live-carousel-control" aria-label="Previous route" title="Previous route" onClick={() => setActiveRouteIndex((i) => (i - 1 + LIVE_ROUTES.length) % LIVE_ROUTES.length)}><i className="bi bi-arrow-left" /></button>
                  <button type="button" className="sp-live-carousel-control" aria-label="Next route" title="Next route" onClick={() => setActiveRouteIndex((i) => (i + 1) % LIVE_ROUTES.length)}><i className="bi bi-arrow-right" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Last Day Operations / Financials ============ */}
      <section className="dashboard-section dashboard-block mb-2" id="spDashboardFoldersBlock" aria-label="Last Day Operations / Financials">
        <div className="card sp-dashboard-module-card sp-dashboard-module-card--operations overflow-hidden">
          <div className="card-header-tabs-wrap border-bottom opms-section-tabs-top">
            <ul className="nav nav-tabs card-header-tabs sp-folder-tabs-bootstrap" role="tablist" id="folderTabsList">
              <li className="nav-item" role="presentation">
                <button type="button" className={`nav-link${activeFolder === 'lastday' ? ' active' : ''}`} role="tab" aria-selected={activeFolder === 'lastday'} onClick={() => setActiveFolder('lastday')}>
                  <i className="bi bi-calendar-check me-1" /> My Last Operations
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button type="button" className={`nav-link${activeFolder === 'spms' ? ' active' : ''}`} role="tab" aria-selected={activeFolder === 'spms'} onClick={() => setActiveFolder('spms')}>
                  <i className="bi bi-currency-pound me-1" /> My Financial Performance
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button type="button" className={`nav-link${activeFolder === 'ld' ? ' active' : ''}`} role="tab" aria-selected={activeFolder === 'ld'} onClick={() => setActiveFolder('ld')}>
                  <i className="bi bi-exclamation-triangle me-1" /> Liquidation Damages
                </button>
              </li>
            </ul>
          </div>

          <div className="dashboard-block-content">
            <div className="tab-content pt-2" id="spFolderContent">
              {activeFolder === 'lastday' && (
                <div className="tab-pane fade show active sp-folder-panel opms-panel" role="tabpanel">
                  <div className="opms-content-full">
                    <div className="opms-performance-card">
                      <div className="opms-performance-body">
                        <div className="table-responsive opms-deliveries-table-wrap">
                          <table className="table table-hover table-sm align-middle mb-0 opms-table-disco-style" aria-label="Previous day deliveries">
                            <thead>
                              <tr><th>Route</th><th className="text-end">SPR</th><th className="text-end">TW</th><th className="text-end">DEL</th><th className="text-end">PU</th><th className="text-end">HN</th><th className="text-end">AFD</th></tr>
                            </thead>
                            <tbody>
                              {LAST_DAY_ROWS.map((row) => (
                                <tr key={row.route}>
                                  <td>{row.route}</td>
                                  <td className="text-end">{row.spr}</td>
                                  <td className="text-end">{row.tw}</td>
                                  <td className="text-end">{row.del}</td>
                                  <td className="text-end">{row.pu}</td>
                                  <td className="text-end">{row.hn}</td>
                                  <td className="text-end">{row.afd}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFolder === 'spms' && (
                <div className="tab-pane fade show active sp-folder-panel opms-panel" id="folder-panel-spms" role="tabpanel">
                  <div className="opms-content-full">
                    <div className="sfb-grid">
                      <div className="sfb-card sfb-income" aria-label="Income">
                        <span className="sfb-label"><i className="bi bi-currency-pound" /> Income</span>
                        <span className="sfb-income-val">{SPMS.income}</span>
                        <div className="sfb-income-meta">
                          <span className="sfb-badge-tag">vs target</span>
                          <span className="sfb-badge-pct">{SPMS.incomePct}%</span>
                        </div>
                        <svg className="sfb-arc-svg" viewBox="0 0 120 30" aria-hidden="true">
                          <path className="sfb-arc-track" d="M4,24 A100,100 0 0,1 116,24" />
                          <path className="sfb-arc-fill" d="M4,24 A100,100 0 0,1 116,24" style={{ strokeDasharray: `${incomeDash} ${ARC_LEN}`, stroke: incomeColor }} />
                          <path className="sfb-arc-over" d="M4,24 A100,100 0 0,1 116,24" style={{ strokeDasharray: `${incomeOverDash} ${ARC_LEN}`, opacity: SPMS.incomePct > 100 ? 1 : 0 }} />
                        </svg>
                      </div>

                      <div className={`sfb-card sfb-afd${SPMS.afdPct <= 4 ? ' sfb-afd--ok' : ' sfb-afd--bad'}`} aria-label="AFD">
                        <span className="sfb-label">AFD %</span>
                        <svg className="sfb-spd-svg" viewBox="0 0 120 85" aria-hidden="true">
                          <path className="sfb-spd-track" d="M6,74 A54,54 0 0,1 114,74" />
                          <path className="sfb-spd-zone sfb-spd-zone--ok" d="M6,74 A54,54 0 0,1 114,74" strokeDasharray="85 85" />
                          <path className="sfb-spd-zone sfb-spd-zone--bad" d="M6,74 A54,54 0 0,1 114,74" strokeDasharray="85 85" strokeDashoffset="85" />
                          <g id="spmsAfdNeedle" style={{ transform: `rotate(${afdAngle}deg)` }}>
                            <line x1="60" y1="74" x2="60" y2="24" className="sfb-needle" />
                          </g>
                          <circle cx="60" cy="74" r="6" className="sfb-needle-cap" />
                          <text x="8" y="84" className="sfb-spd-lbl">0%</text>
                          <text x="47" y="16" className="sfb-spd-lbl">4%</text>
                          <text x="97" y="84" className="sfb-spd-lbl">8%+</text>
                        </svg>
                        <span className="sfb-spd-val">{SPMS.afdPct}%</span>
                        <span className="sfb-afd-status">{SPMS.afdPct <= 4 ? 'Within target' : 'Over threshold'}</span>
                      </div>

                      <div className="sfb-card sfb-perf" aria-label="Performance">
                        <span className="sfb-label">Performance vs Target</span>
                        <div className="sfb-perf-body">
                          <div className="sfb-ring-wrap">
                            <svg viewBox="0 0 100 100" aria-hidden="true">
                              <circle className="sfb-ring-bg" cx="50" cy="50" r="40" fill="none" strokeWidth={8} />
                              <circle className="sfb-ring-fg" cx="50" cy="50" r="40" fill="none" strokeWidth={8} style={{ strokeDasharray: `${perfDash} ${RING_LEN}`, stroke: perfColor }} transform="rotate(-90 50 50)" />
                            </svg>
                            <div className="sfb-ring-inner">
                              <span className="sfb-ring-val">{perfPct}%</span>
                              <span className="sfb-ring-sub">of target</span>
                            </div>
                          </div>
                          <div className="sfb-perf-breakdown">
                            <div className="sfb-pb-row"><span className="sfb-pb-dot sfb-pb-dot--del" /><span className="sfb-pb-lbl">DEL</span><span className="sfb-pb-val">{SPMS.delOk}</span></div>
                            <div className="sfb-pb-row"><span className="sfb-pb-dot sfb-pb-dot--pu" /><span className="sfb-pb-lbl">PU</span><span className="sfb-pb-val">{SPMS.delPu}</span></div>
                            <div className="sfb-pb-row"><span className="sfb-pb-dot sfb-pb-dot--hn" /><span className="sfb-pb-lbl">Handover</span><span className="sfb-pb-val">{SPMS.delHn}</span></div>
                            <div className="sfb-pb-sep" />
                            <div className="sfb-pb-row sfb-pb-row--total"><span className="sfb-pb-dot sfb-pb-dot--tot" /><span className="sfb-pb-lbl">Total</span><span className="sfb-pb-val">{perfTotal}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="sfb-card sfb-stat sfb-del" aria-label="DEL"><i className="bi bi-box-seam sfb-stat-ico" /><span className="sfb-stat-val">{SPMS.delOk}</span><span className="sfb-stat-lbl">Deliveries</span></div>
                      <div className="sfb-card sfb-stat sfb-pu" aria-label="PU"><i className="bi bi-arrow-up-circle sfb-stat-ico" /><span className="sfb-stat-val">{SPMS.delPu}</span><span className="sfb-stat-lbl">Pick Up</span></div>
                      <div className="sfb-card sfb-stat sfb-hn" aria-label="HN"><i className="bi bi-truck sfb-stat-ico" /><span className="sfb-stat-val">{SPMS.delHn}</span><span className="sfb-stat-lbl">Handover</span></div>

                      <div className="sfb-card sfb-avg" aria-label="Averages">
                        <span className="sfb-label"><i className="bi bi-calculator" /> Averages</span>
                        <div className="sfb-avg-item"><div className="sfb-avg-ico-wrap sfb-avg-ico--income"><i className="bi bi-currency-pound" /></div><div><span className="sfb-avg-lbl">Avg Income</span><span className="sfb-avg-val">{SPMS.avgIncome}</span></div></div>
                        <div className="sfb-avg-sep" />
                        <div className="sfb-avg-item"><div className="sfb-avg-ico-wrap sfb-avg-ico--route"><i className="bi bi-signpost-2" /></div><div><span className="sfb-avg-lbl">Avg / Route</span><span className="sfb-avg-val">{SPMS.avgRoute}</span></div></div>
                        <div className="sfb-avg-sep" />
                        <div className="sfb-avg-item"><div className="sfb-avg-ico-wrap sfb-avg-ico--route"><i className="bi bi-map" /></div><div><span className="sfb-avg-lbl">Total open routes</span><span className="sfb-avg-val">{SPMS.totalOpenRoutes}</span></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFolder === 'ld' && (
                <div className="tab-pane fade show active sp-folder-panel opms-panel" role="tabpanel">
                  <div className="opms-content-full">
                    <div className="ld-header-kpi d-flex align-items-center mb-3">
                      <span className="ld-viewing-month-badge" aria-live="polite">July 2026</span>
                    </div>
                    <section className="opms-performance-block" id="ldTableSection" aria-label="Liquidation Damages table">
                      <div className="table-responsive opms-deliveries-table-wrap">
                        <table className="table table-hover table-sm align-middle mb-0 opms-table-disco-style" aria-label="Liquidation Damages">
                          <thead>
                            <tr><th>AWB</th><th>Route</th><th>Issue Date</th><th>Issue Description</th><th className="text-end">Amount</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {LD_ROWS.map((row) => (
                              <tr key={row.awb}>
                                <td>{row.awb}</td>
                                <td>{row.route}</td>
                                <td>{row.date}</td>
                                <td>{row.desc}</td>
                                <td className="text-end">{row.amount}</td>
                                <td>{row.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ Navigation by category ============ */}
      <section className="dashboard-section dashboard-block mb-2" id="spNavBlock" aria-label="System navigation">
        <div className="sp-nav-groups">
          {NAV_GROUPS.map((group, gi) => (
            <section key={group.title} className="sp-nav-group" style={{ ['--nav-delay' as string]: `${gi * 60}ms` }} aria-label={group.title}>
              <h3 className="sp-nav-group-title"><i className={`bi ${group.icon}`} aria-hidden="true" /> {group.title}</h3>
              <div className="sp-nav-cards">
                {group.items.map((item) => {
                  const inner = (
                    <>
                      <span className="sp-nav-card-icon" aria-hidden="true"><i className={`bi ${item.icon}`} /></span>
                      <span className="sp-nav-card-text">
                        <span className="sp-nav-card-title">{item.label}</span>
                        <span className="sp-nav-card-desc">{item.desc}</span>
                      </span>
                      <i className="bi bi-arrow-right-short sp-nav-card-arrow" aria-hidden="true" />
                    </>
                  );
                  if (item.route) {
                    return <Link key={item.label} className="sp-nav-card" to={item.route}>{inner}</Link>;
                  }
                  return (
                    <a key={item.label} className="sp-nav-card sp-nav-card--soon" href="#" role="link" aria-disabled="true" tabIndex={0} onClick={(e) => e.preventDefault()}>
                      {inner}
                      <span className="sp-nav-card-soon-chip">Soon</span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* ============ Full dashboard modal ============ */}
      <button type="button" className="btn btn-primary sp-open-full-dashboard" onClick={() => setShowModal(true)}>
        <i className="bi bi-expand" /> View Full Dashboard
      </button>

      {showModal && createPortal(
        <div className="sp-full-dashboard-modal sp-full-dashboard-modal--open" role="dialog" aria-modal="true" aria-labelledby="fullDashboardModalTitle">
          <div className="sp-full-dashboard-modal-backdrop sp-modal-backdrop-anim" onClick={() => setShowModal(false)} />
          <div className="sp-full-dashboard-modal-dialog">
            <div className="sp-full-dashboard-modal-content sp-modal-anim">
              <div className="sp-full-dashboard-modal-header">
                <h2 id="fullDashboardModalTitle" className="sp-full-dashboard-modal-title">Full dashboard</h2>
                <div className="sp-full-dashboard-modal-category-dots" aria-label="Category">
                  {MODAL_SLIDES.map((slide) => (
                    <button key={slide.id} type="button" className={`sp-modal-category-dot${modalSlide === slide.id ? ' active' : ''}`} onClick={() => setModalSlide(slide.id)} title={slide.title}>
                      {slide.title}
                    </button>
                  ))}
                </div>
                <button type="button" className="sp-full-dashboard-modal-close" aria-label="Close" onClick={() => setShowModal(false)}><i className="bi bi-x-lg" /></button>
              </div>
              <div className="sp-full-dashboard-modal-body">
                <div className="sp-full-dashboard-modal-track" style={{ transform: `translateX(-${modalSlide * 100}%)` }}>
                  <section className="sp-full-dashboard-modal-slide" aria-labelledby="modal-kpis-heading">
                    <h3 id="modal-kpis-heading" className="dashboard-block-title"><i className="bi bi-graph-up-arrow" /> KPIs</h3>
                    <div className="dashboard-kpi-grid">
                      {KPI_DATA.map((kpi) => (
                        <div key={kpi.id} className="dashboard-kpi-card">
                          <div className={`dashboard-kpi-icon-wrap kpi-${kpi.id}`}><i className={`bi ${kpi.icon}`} /></div>
                          <div className="dashboard-kpi-content">
                            <span className="dashboard-kpi-value-wrap"><span className="dashboard-kpi-value">{kpi.value}</span></span>
                            <span className="dashboard-kpi-label">{kpi.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="sp-full-dashboard-modal-slide" aria-labelledby="modal-compliance-heading">
                    <h3 id="modal-compliance-heading" className="dashboard-block-title"><i className="bi bi-shield-check" /> Compliance</h3>
                    <div className="dashboard-compliance-grid">
                      {COMPLIANCE_DATA.map((item) => (
                        <div key={item.course} className="dashboard-compliance-card" data-course={item.course}>
                          <div className="dashboard-compliance-card-header"><i className={`bi ${item.icon}`} /><h3>{item.title}</h3></div>
                          <div className="dashboard-compliance-body">
                            <div className="compliance-group expiring">
                              <h4><i className="bi bi-exclamation-triangle" /> Expiring</h4>
                              <ul className="compliance-vendor-list">{item.expiring.map((v) => <li key={v}>{v}</li>)}</ul>
                            </div>
                            <div className="compliance-group expired">
                              <h4><i className="bi bi-x-circle" /> Expired</h4>
                              <ul className="compliance-vendor-list">{item.expired.map((v) => <li key={v}>{v}</li>)}</ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section className="sp-full-dashboard-modal-slide" aria-labelledby="modal-drivers-heading">
                    <h3 id="modal-drivers-heading" className="dashboard-block-title"><i className="bi bi-file-earmark-medical" /> Drivers with expiring or expired documents</h3>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm align-middle mb-0 opms-table-disco-style dashboard-vehicles-table">
                        <thead><tr><th>Driver</th><th>Depot</th><th>Document</th><th>Date</th><th>Status</th></tr></thead>
                        <tbody>
                          <tr><td>John Smith</td><td>MSE</td><td>License</td><td>2026-02-15</td><td>Expiring</td></tr>
                          <tr><td>James Wilson</td><td>MSE</td><td>Cargo Training</td><td>2026-01-05</td><td>Expired</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="sp-full-dashboard-modal-slide" aria-labelledby="modal-vehicles-heading">
                    <h3 id="modal-vehicles-heading" className="dashboard-block-title">Vehicles requiring attention</h3>
                    <div className="table-responsive">
                      <table className="table table-hover table-sm align-middle mb-0 opms-table-disco-style dashboard-vehicles-table">
                        <thead><tr><th>VRN</th><th>Brand</th><th>Model</th><th>Registration Date</th><th>Depot</th><th>Reason</th></tr></thead>
                        <tbody>
                          <tr><td>AB12 CDE</td><td>Volkswagen</td><td>Crafter</td><td>2025-11-15</td><td>MSE</td><td>MOT Due</td></tr>
                          <tr><td>ST90 UVW</td><td>Mercedes-Benz</td><td>Sprinter</td><td>2025-12-01</td><td>LCY</td><td>Service Due</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PortalLayout>
  );
}
