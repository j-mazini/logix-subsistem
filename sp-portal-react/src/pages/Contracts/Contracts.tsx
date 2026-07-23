import { useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getFilteredContracts,
  getDigressiveBandsFor,
  postcodesToSubpostcodes,
  setStoredTarget,
  type ContractDepotView,
  type ContractLoopView,
  type ContractProviderView,
  type ContractRouteView,
} from '../../data/contractsData';
import '../../styles/legacy/shared-pages.css';
import '../../styles/legacy/contracts.css';

/**
 * Manual port of Bootstrap's .accordion-button/.collapse class toggling.
 * The static page relies on bootstrap.bundle.min.js (loaded from CDN) for
 * this; that JS plugin isn't loaded anywhere in this SPA (only Bootstrap's
 * CSS is), so panels here show/hide instantly instead of the JS-driven
 * height transition — same end-state classes/markup, no animation.
 */
function accordionButtonClass(base: string, open: boolean): string {
  return open ? base : `${base} collapsed`;
}

function accordionCollapseClass(open: boolean): string {
  return `accordion-collapse collapse${open ? ' show' : ''}`;
}

function RouteBlock({ sp, depotName, route }: { sp: string; depotName: string; route: ContractRouteView }) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(String(route.target));
  const subpostcodes = useMemo(() => postcodesToSubpostcodes(route.postcodes), [route.postcodes]);
  const typeClass = route.type === 'Flex' ? 'contract-route-type-flex' : 'contract-route-type-child';

  const trimmed = rawValue.trim();
  const parsed = trimmed === '' ? NaN : parseInt(trimmed, 10);
  const displayTarget = Number.isNaN(parsed) ? 0 : parsed;

  function handleTargetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setRawValue(val);
    const t = val.trim();
    const num = t === '' ? null : parseInt(t, 10);
    setStoredTarget(sp, depotName, route.name, num !== null && Number.isNaN(num) ? null : num);
  }

  return (
    <div className="accordion accordion-flush mb-2">
      <div className="accordion-item">
        <h3 className="accordion-header">
          <button type="button" className={accordionButtonClass('accordion-button py-2', open)} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <i className="bi bi-signpost-2 me-2 text-secondary" /> {route.name}
          </button>
        </h3>
        <div className={accordionCollapseClass(open)}>
          <div className="accordion-body">
            <div className="contract-route-meta">
              <span>
                Type: <strong><span className={typeClass}>{route.type}</span></strong>
              </span>
              {route.driver && (
                <span>
                  Driver: <strong>{route.driver}</strong>
                </span>
              )}
              <span>
                Target: <strong className="js-route-target-display">{displayTarget}</strong>
              </span>
            </div>
            <div className="contract-route-target-edit mt-2 mb-2">
              <label className="form-label small mb-1">Target — used for comparison and utilisation rate</label>
              <input
                type="number"
                min={0}
                step={1}
                className="form-control form-control-sm contract-route-target-input"
                value={rawValue}
                onChange={handleTargetChange}
                data-sp={sp}
                data-depot={depotName}
                data-route={route.name}
                placeholder="Target"
                aria-label="Route target"
              />
            </div>
            <p className="small text-muted mb-2">
              <span className="contract-badge contract-badge-sub">Subpostcode</span>
            </p>
            <div className="contract-subpostcodes">
              {subpostcodes.map((s) => (
                <span className="contract-subpostcode" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoopBlock({ sp, depotName, loop }: { sp: string; depotName: string; loop: ContractLoopView }) {
  const [open, setOpen] = useState(false);
  const rateVal = typeof loop.deliveryRate === 'number' && !Number.isNaN(loop.deliveryRate) ? loop.deliveryRate : 0;
  const rateStr = rateVal > 0 ? `£${rateVal.toFixed(2)}` : '—';
  const totalTarget = loop.routes.reduce((sum, r) => sum + (r.target != null ? r.target : 0), 0);
  const bands = getDigressiveBandsFor(loop.name);
  const bandsText =
    bands && bands.length
      ? bands
          .map((b, i) => `Band ${i + 1}: ${b.max != null ? `${b.min}–${b.max}` : `${b.min}+`} (£${b.price ? b.price.toFixed(2) : '—'})`)
          .join(' · ')
      : `Band 1–4 (rate: ${rateStr})`;

  return (
    <div className="accordion accordion-flush mb-2">
      <div className="accordion-item">
        <h3 className="accordion-header">
          <button type="button" className={accordionButtonClass('accordion-button py-2', open)} onClick={() => setOpen((o) => !o)}>
            <i className="bi bi-arrow-repeat me-2 text-secondary" /> {loop.name}
          </button>
        </h3>
        <div className={accordionCollapseClass(open)}>
          <div className="accordion-body contract-block-inner">
            <div className="contract-rates-box">
              <p>
                <strong className="text-dark">Bands (per loop):</strong> <span className="text-muted">{bandsText}</span>
              </p>
              <p>
                <strong className="text-dark">Rate (Band 1):</strong> <span className="text-dark">{rateStr}</span>
              </p>
              <p>
                <strong className="text-dark">Total Target:</strong> <span className="text-dark">{totalTarget}</span>
              </p>
            </div>
            {loop.routes.map((r) => (
              <RouteBlock key={r.name} sp={sp} depotName={depotName} route={r} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepotBlock({ sp, depot }: { sp: string; depot: ContractDepotView }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion accordion-flush mb-2">
      <div className="accordion-item">
        <h3 className="accordion-header">
          <button type="button" className={accordionButtonClass('accordion-button py-2', open)} onClick={() => setOpen((o) => !o)}>
            <i className="bi bi-geo-alt me-2 text-secondary" /> {depot.name}
          </button>
        </h3>
        <div className={accordionCollapseClass(open)}>
          <div className="accordion-body contract-block-inner">
            {depot.loops.map((loop) => (
              <LoopBlock key={loop.name} sp={sp} depotName={depot.name} loop={loop} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderBlock({ sp, provider }: { sp: string; provider: ContractProviderView }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="accordion mb-3">
      <div className="accordion-item">
        <h2 className="accordion-header">
          <button type="button" className={accordionButtonClass('accordion-button py-3', open)} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <i className="bi bi-building me-2 text-primary" /> <span className="fw-semibold">{provider.serviceProvider}</span>
          </button>
        </h2>
        <div className={accordionCollapseClass(open)}>
          <div className="accordion-body pt-2 contract-block-inner">
            {provider.depots.map((dep) => (
              <DepotBlock key={dep.name} sp={sp} depot={dep} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Contracts() {
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();
  // The static page's #contractSearch input has no wired-up filtering logic
  // in contracts.js (verified: no listener references it) — it's decorative
  // in the original too, so this just mirrors that as a plain controlled
  // input without any actual search behavior.
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => getFilteredContracts(sp), [sp]);

  if (!sp) {
    return (
      <PortalLayout mainClassName="vendor-admin-main contract-management-main" title="Contracts">
        <div id="spNotFound" className="alert alert-warning">
          Service Provider not set. Open with <code>?sp=YourCompany</code>.
        </div>
      </PortalLayout>
    );
  }

  const totalDepots = filtered.reduce((sum, p) => sum + p.depots.length, 0);
  const totalLoops = filtered.reduce((sum, p) => sum + p.depots.reduce((s, d) => s + d.loops.length, 0), 0);
  const totalRoutes = filtered.reduce(
    (sum, p) => sum + p.depots.reduce((s, d) => s + d.loops.reduce((ss, l) => ss + l.routes.length, 0), 0),
    0,
  );
  const isEmpty = filtered.length === 0;

  const header = (
    <>
      <div className="admin-header d-flex flex-wrap align-items-center gap-2">
        <h1 className="admin-header-title">Contracts</h1>
        <div className="admin-header-search flex-grow-1">
          <input
            type="search"
            id="contractSearch"
            className="form-control"
            placeholder="Search depots, loops, routes..."
            autoComplete="off"
            aria-label="Search contracts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AdminHeaderPill sp={sp} controls={menuControls} />
      </div>
      <AdminHeaderMenu sp={sp} controls={menuControls} />
    </>
  );

  return (
    <PortalLayout mainClassName="vendor-admin-main contract-management-main" header={header}>
      <div id="contractContent">
        <div className="vendor-page-metrics mb-3" aria-label="Contract counts">
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Depots</span>
            <span className="vendor-page-metric-value" id="metricDepots">
              {totalDepots}
            </span>
          </div>
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Loops</span>
            <span className="vendor-page-metric-value" id="metricLoops">
              {totalLoops}
            </span>
          </div>
          <div className="vendor-page-metric">
            <span className="vendor-page-metric-label">Routes</span>
            <span className="vendor-page-metric-value" id="metricRoutes">
              {totalRoutes}
            </span>
          </div>
        </div>

        <div className="contract-section-header">
          <h2 className="contract-section-title">
            <i className="bi bi-diagram-3" />
            My active contracts
          </h2>
        </div>

        <div id="contractTree" className="contract-tree">
          {!isEmpty &&
            filtered.map((prov) => <ProviderBlock key={prov.serviceProvider} sp={sp} provider={prov} />)}
        </div>
        {isEmpty && (
          <div id="emptyState" className="empty-state alert alert-light" role="status">
            No contracts found.
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
