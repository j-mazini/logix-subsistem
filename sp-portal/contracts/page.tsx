'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BeamSidebar } from '../components/BeamSidebar';
import { useBodyClass } from '../components/useBodyClass';
import { useMotionRefinements } from '../components/useMotionRefinements';
import { getCurrentSp, postcodesToSubpostcodes, MOCK_CONTRACTS, DIGRESSIVE_BANDS, type ContractRoute } from '../components/mockData';
import '../styles/vendor-admin-view.css';
import '../styles/shared-pages.css';
import '../styles/sp-portal-shared.css';
import '../styles/liquid-glass.css';
import '../styles/modern-ui.css';
import '../styles/refinements-v2.css';
import '../styles/refinements-v3-motion.css';
import './contracts.css';

const ROUTE_TARGETS_STORAGE_KEY = 'dhl_contract_route_targets';

function getStoredTarget(spName: string, depotName: string, routeName: string): number | null {
  try {
    const raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const sp = data[spName];
    if (!sp) return null;
    const key = `${depotName || ''}|${routeName || ''}`;
    return sp[key] != null ? Number(sp[key]) : null;
  } catch {
    return null;
  }
}

function setStoredTarget(spName: string, depotName: string, routeName: string, value: number | null) {
  try {
    const raw = localStorage.getItem(ROUTE_TARGETS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[spName]) data[spName] = {};
    const key = `${depotName || ''}|${routeName || ''}`;
    if (value === null || Number.isNaN(value)) delete data[spName][key];
    else data[spName][key] = value;
    localStorage.setItem(ROUTE_TARGETS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export default function ContractsPage() {
  useBodyClass('has-beam-sidebar sp-portal');
  useMotionRefinements();

  const searchParams = useSearchParams();
  const [spName, setSpName] = useState('');
  const [targetOverrides, setTargetOverrides] = useState<Record<string, number | null>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['sp-0']));

  useEffect(() => {
    setSpName(getCurrentSp(searchParams));
  }, [searchParams]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const provider = useMemo(() => MOCK_CONTRACTS.find((c) => c.serviceProvider === spName), [spName]);

  function targetFor(depotName: string, route: ContractRoute): number {
    const key = `${depotName}|${route.name}`;
    if (key in targetOverrides) return targetOverrides[key] ?? 0;
    const stored = getStoredTarget(spName, depotName, route.name);
    return stored != null && !Number.isNaN(stored) ? stored : route.targetDel ?? 0;
  }

  function handleTargetChange(depotName: string, routeName: string, value: string) {
    const num = value.trim() === '' ? null : parseInt(value, 10);
    setStoredTarget(spName, depotName, routeName, num);
    setTargetOverrides((prev) => ({ ...prev, [`${depotName}|${routeName}`]: num }));
  }

  const totals = useMemo(() => {
    if (!provider) return { depots: 0, loops: 0, routes: 0 };
    let loops = 0;
    let routes = 0;
    provider.depots.forEach((d) => {
      loops += d.loops.length;
      d.loops.forEach((l) => (routes += l.routes.length));
    });
    return { depots: provider.depots.length, loops, routes };
  }, [provider]);

  const spInitials = spName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sidebar-wrapper" id="sidebarWrapper">
      <div className="sidebar-gap" id="sidebarGap" aria-hidden="true" />
      <BeamSidebar />

      <div className="sidebar-inset" id="sidebarInset">
        <div className="liquid-glass-page-bg" aria-hidden="true" />
        <div className="page-container">
          <div className="page-inner">
            <main className="vendor-admin-main contract-management-main">
              {!spName && (
                <div className="alert alert-warning">
                  Service Provider not set. Open with <code>?sp=YourCompany</code>.
                </div>
              )}

              {spName && (
                <div id="contractContent">
                  <div className="admin-header d-flex flex-wrap align-items-center gap-2">
                    <h1 className="admin-header-title">Contracts</h1>
                    <div className="admin-header-search flex-grow-1">
                      <input type="search" className="form-control" placeholder="Search depots, loops, routes..." autoComplete="off" aria-label="Search contracts" />
                    </div>
                    <div className="admin-header-user-pill d-flex align-items-center">
                      <span className="admin-header-user-avatar admin-header-user-avatar-fallback">{spInitials}</span>
                      <span className="admin-header-user-name">{spName}</span>
                    </div>
                  </div>

                  <div className="vendor-page-metrics mb-3" aria-label="Contract counts">
                    <div className="vendor-page-metric">
                      <span className="vendor-page-metric-label">Depots</span>
                      <span className="vendor-page-metric-value">{totals.depots}</span>
                    </div>
                    <div className="vendor-page-metric">
                      <span className="vendor-page-metric-label">Loops</span>
                      <span className="vendor-page-metric-value">{totals.loops}</span>
                    </div>
                    <div className="vendor-page-metric">
                      <span className="vendor-page-metric-label">Routes</span>
                      <span className="vendor-page-metric-value">{totals.routes}</span>
                    </div>
                  </div>

                  <div className="contract-section-header">
                    <h2 className="contract-section-title">
                      <i className="bi bi-diagram-3" />
                      My active contracts
                    </h2>
                  </div>

                  {!provider ? (
                    <div className="empty-state alert alert-light" role="status">No contracts found.</div>
                  ) : (
                    <div className="contract-tree">
                      <div className="accordion mb-3">
                        <div className="accordion-item">
                          <h2 className="accordion-header">
                            <button className={`accordion-button py-3 ${expanded.has('sp-0') ? '' : 'collapsed'}`} type="button" onClick={() => toggle('sp-0')}>
                              <i className="bi bi-building me-2 text-primary" /> <span className="fw-semibold">{provider.serviceProvider}</span>
                            </button>
                          </h2>
                          <div className={`accordion-collapse collapse ${expanded.has('sp-0') ? 'show' : ''}`} style={{ visibility: 'visible' }}>
                            <div className="accordion-body pt-2 contract-block-inner">
                              {provider.depots.map((dep, d) => {
                                const depId = `dep-${d}`;
                                return (
                                  <div className="accordion accordion-flush mb-2" key={depId}>
                                    <div className="accordion-item">
                                      <h3 className="accordion-header">
                                        <button className={`accordion-button py-2 ${expanded.has(depId) ? '' : 'collapsed'}`} type="button" onClick={() => toggle(depId)}>
                                          <i className="bi bi-geo-alt me-2 text-secondary" /> {dep.name}
                                        </button>
                                      </h3>
                                      <div className={`accordion-collapse collapse ${expanded.has(depId) ? 'show' : ''}`} style={{ visibility: 'visible' }}>
                                        <div className="accordion-body contract-block-inner">
                                          {dep.loops.map((loop, L) => {
                                            const loopId = `${depId}-loop-${L}`;
                                            const rateVal = loop.deliveryRate != null && !Number.isNaN(loop.deliveryRate) ? loop.deliveryRate : 0;
                                            const rateStr = rateVal > 0 ? `£${rateVal.toFixed(2)}` : '—';
                                            const totalTarget = loop.routes.reduce((sum, rt) => sum + targetFor(dep.name, rt), 0);
                                            const bands = DIGRESSIVE_BANDS[loop.name];
                                            const bandsHtml = bands && bands.length
                                              ? bands.map((b, i) => `Band ${i + 1}: ${b.max != null ? `${b.min}–${b.max}` : `${b.min}+`} (£${b.price ? b.price.toFixed(2) : '—'})`).join(' · ')
                                              : `Band 1–4 (rate: ${rateStr})`;
                                            return (
                                              <div className="accordion accordion-flush mb-2" key={loopId}>
                                                <div className="accordion-item">
                                                  <h3 className="accordion-header">
                                                    <button className={`accordion-button py-2 ${expanded.has(loopId) ? '' : 'collapsed'}`} type="button" onClick={() => toggle(loopId)}>
                                                      <i className="bi bi-arrow-repeat me-2 text-secondary" /> {loop.name}
                                                    </button>
                                                  </h3>
                                                  <div className={`accordion-collapse collapse ${expanded.has(loopId) ? 'show' : ''}`} style={{ visibility: 'visible' }}>
                                                    <div className="accordion-body contract-block-inner">
                                                      <div className="contract-rates-box">
                                                        <p><strong className="text-dark">Bands (per loop):</strong> <span className="text-muted">{bandsHtml}</span></p>
                                                        <p><strong className="text-dark">Rate (Band 1):</strong> <span className="text-dark">{rateStr}</span></p>
                                                        <p><strong className="text-dark">Total Target:</strong> <span className="text-dark">{totalTarget}</span></p>
                                                      </div>

                                                      {loop.routes.map((route, r) => {
                                                        const routeId = `${loopId}-route-${r}`;
                                                        const subpostcodes = postcodesToSubpostcodes(route.postcodes);
                                                        const typeClass = (route.type || 'Child') === 'Flex' ? 'contract-route-type-flex' : 'contract-route-type-child';
                                                        const targetVal = targetFor(dep.name, route);
                                                        return (
                                                          <div className="accordion accordion-flush mb-2" key={routeId}>
                                                            <div className="accordion-item">
                                                              <h3 className="accordion-header">
                                                                <button className={`accordion-button py-2 ${expanded.has(routeId) ? '' : 'collapsed'}`} type="button" onClick={() => toggle(routeId)}>
                                                                  <i className="bi bi-signpost-2 me-2 text-secondary" /> {route.name}
                                                                </button>
                                                              </h3>
                                                              <div className={`accordion-collapse collapse ${expanded.has(routeId) ? 'show' : ''}`} style={{ visibility: 'visible' }}>
                                                                <div className="accordion-body">
                                                                  <div className="contract-route-meta">
                                                                    <span>Type: <strong><span className={typeClass}>{route.type || 'Child'}</span></strong></span>
                                                                    <span>Target: <strong>{targetVal}</strong></span>
                                                                  </div>
                                                                  <div className="contract-route-target-edit mt-2 mb-2">
                                                                    <label className="form-label small mb-1">Target — used for comparison and utilisation rate</label>
                                                                    <input
                                                                      type="number"
                                                                      min={0}
                                                                      step={1}
                                                                      className="form-control form-control-sm contract-route-target-input"
                                                                      value={targetVal}
                                                                      onChange={(e) => handleTargetChange(dep.name, route.name, e.target.value)}
                                                                      placeholder="Target"
                                                                      aria-label="Route target"
                                                                    />
                                                                  </div>
                                                                  <p className="small text-muted mb-2"><span className="contract-badge contract-badge-sub">Subpostcode</span></p>
                                                                  <div className="contract-subpostcodes">
                                                                    {subpostcodes.map((s) => (
                                                                      <span className="contract-subpostcode" key={s}>{s}</span>
                                                                    ))}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
