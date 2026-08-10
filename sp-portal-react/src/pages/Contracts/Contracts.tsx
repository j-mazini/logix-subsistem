import { useMemo, useState } from 'react';
import { Building2, ArrowRight, Trash2 } from 'lucide-react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getFilteredContracts,
  removeStoredSubpostcode,
  addStoredRoute,
  addStoredDepot,
  addStoredLoop,
  removeStoredDepot,
  removeStoredLoop,
  removeStoredRoute,
  isCustomDepot,
  getDepotNames,
  getLoopNames,
  type ContractDepotView,
  type ContractProviderView,
} from '../../data/contractsData';
import { RouteViewModal, type RouteViewTarget } from './components/RouteViewModal';
import { DeleteConfirmModal, type DeleteConfirmTarget } from './components/DeleteConfirmModal';
import { AddRouteModal, type AddRouteFormState } from './components/AddRouteModal';
import { AddDepotModal } from './components/AddDepotModal';
import { AddLoopModal, type AddLoopFormState } from './components/AddLoopModal';
import { DepotEditModal } from './components/DepotEditModal';
import '../../styles/legacy/shared-pages.css';
import styles from './Contracts.module.css';

const EMPTY_ROUTE_FORM: AddRouteFormState = {
  loopName: '',
  isNewLoop: true,
  routeName: '',
  type: 'Child',
  driver: '',
  target: '',
};

const EMPTY_LOOP_FORM: AddLoopFormState = { loopName: '' };

/** The one thing a given confirm-dialog invocation is about to delete. */
type PendingDeletion =
  | { kind: 'subpostcode'; depotName: string; routeName: string; subpostcode: string }
  | { kind: 'route'; depotName: string; loopName: string; routeName: string }
  | { kind: 'loop'; depotName: string; loopName: string }
  | { kind: 'depot'; depotName: string };

function deletionTarget(pending: PendingDeletion): DeleteConfirmTarget {
  switch (pending.kind) {
    case 'subpostcode':
      return {
        title: 'Remove sub postcode',
        message: `Remove "${pending.subpostcode}" from route "${pending.routeName}" in ${pending.depotName}? This only affects your custom addition — postcodes extracted from the contract itself are unaffected.`,
      };
    case 'route':
      return {
        title: 'Delete route',
        message: `Delete route "${pending.routeName}" from loop "${pending.loopName}" in ${pending.depotName}? This cannot be undone.`,
      };
    case 'loop':
      return {
        title: 'Delete loop',
        message: `Delete loop "${pending.loopName}" and all of its routes from ${pending.depotName}? This cannot be undone.`,
      };
    case 'depot':
      return {
        title: 'Delete depot',
        message: `Delete depot "${pending.depotName}" and everything under it (loops and routes)? This cannot be undone.`,
      };
  }
}

/** Case-insensitive substring match used by the search box below. */
function matches(term: string, ...values: string[]): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return values.some(v => v.toLowerCase().includes(t));
}

/**
 * Filters the depot → loop → route tree down to entries matching `search`
 * by depot, loop, route, driver or subpostcode name — keeping a parent
 * whenever any of its descendants match.
 */
function filterProviders(providers: ContractProviderView[], search: string): ContractProviderView[] {
  const term = search.trim();
  if (!term) return providers;

  return providers
    .map(prov => {
      const depots = prov.depots
        .map(depot => {
          const loops = depot.loops
            .map(loop => {
              const routes = loop.routes.filter(route =>
                matches(term, route.name, route.driver, route.type, ...route.subpostcodes),
              );
              const loopMatches = matches(term, loop.name);
              return loopMatches || routes.length ? { ...loop, routes: loopMatches ? loop.routes : routes } : null;
            })
            .filter((l): l is ContractDepotView['loops'][number] => l !== null);
          const depotMatches = matches(term, depot.name);
          return depotMatches || loops.length ? { ...depot, loops: depotMatches ? depot.loops : loops } : null;
        })
        .filter((d): d is ContractDepotView => d !== null);
      return { ...prov, depots };
    })
    .filter(p => p.depots.length > 0);
}

interface DepotSummaryCardProps {
  depot: ContractDepotView;
  deletable: boolean;
  onManage: () => void;
  onRequestDelete: () => void;
}

function DepotSummaryCard({ depot, deletable, onManage, onRequestDelete }: DepotSummaryCardProps) {
  const loopCount = depot.loops.length;
  const routeCount = depot.loops.reduce((s, l) => s + l.routes.length, 0);
  const totalTarget = depot.loops.reduce((s, l) => s + l.target, 0);

  return (
    <div
      className={styles.depotSummaryCard}
      onClick={onManage}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onManage();
        }
      }}
    >
      <div className={styles.depotSummaryHeader}>
        <div className={styles.depotSummaryIcon}>
          <Building2 size={18} />
        </div>
        <div className={styles.depotSummaryHeaderText}>
          <h3 className={styles.depotSummaryName}>{depot.name}</h3>
          <span className={styles.levelTag}>Depot</span>
        </div>
        {deletable && (
          <button
            type="button"
            className={styles.cardDeleteButton}
            onClick={e => { e.stopPropagation(); onRequestDelete(); }}
            aria-label={`Delete depot ${depot.name}`}
            title="Delete depot"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className={styles.depotSummaryStats}>
        <div className={styles.depotSummaryStat}>
          <span className={styles.metricValue}>{loopCount}</span>
          <span className={styles.metricLabel}>Loops</span>
        </div>
        <div className={styles.depotSummaryStat}>
          <span className={styles.metricValue}>{routeCount}</span>
          <span className={styles.metricLabel}>Routes</span>
        </div>
        <div className={styles.depotSummaryStat}>
          <span className={styles.metricValue}>{totalTarget}</span>
          <span className={styles.metricLabel}>Target</span>
        </div>
      </div>

      <div className={styles.loopChipsRow}>
        {depot.loops.slice(0, 4).map(loop => (
          <span key={loop.name} className={styles.loopChip}>
            {loop.name}
          </span>
        ))}
        {depot.loops.length > 4 && <span className={styles.loopChip}>+{depot.loops.length - 4}</span>}
      </div>

      <button type="button" className={styles.manageButton} onClick={e => { e.stopPropagation(); onManage(); }}>
        Manage <ArrowRight size={14} />
      </button>
    </div>
  );
}

export function Contracts() {
  const sp = useCurrentSp();
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  const [activeDepotName, setActiveDepotName] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<RouteViewTarget | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  const [showAddRoute, setShowAddRoute] = useState(false);
  const [routeTargetDepot, setRouteTargetDepot] = useState('');
  const [routeForm, setRouteForm] = useState<AddRouteFormState>(EMPTY_ROUTE_FORM);
  const [routeError, setRouteError] = useState('');

  const [showAddDepot, setShowAddDepot] = useState(false);
  const [depotDraft, setDepotDraft] = useState('');
  const [depotError, setDepotError] = useState('');

  const [showAddLoop, setShowAddLoop] = useState(false);
  const [loopTargetDepot, setLoopTargetDepot] = useState('');
  const [loopForm, setLoopForm] = useState<AddLoopFormState>(EMPTY_LOOP_FORM);
  const [loopError, setLoopError] = useState('');

  const filtered = useMemo(() => getFilteredContracts(sp), [sp, version]);
  const searched = useMemo(() => filterProviders(filtered, search), [filtered, search]);
  const depotNames = useMemo(() => getDepotNames(sp), [sp, version]);
  const loopNames = useMemo(() => getLoopNames(sp, routeTargetDepot), [sp, routeTargetDepot, version]);
  const activeDepot = useMemo(
    () => filtered.flatMap(p => p.depots).find(d => d.name === activeDepotName) ?? null,
    [filtered, activeDepotName],
  );

  const handleRequestRemoveSubpostcode = (depotName: string, routeName: string, subpostcode: string) => {
    setPendingDeletion({ kind: 'subpostcode', depotName, routeName, subpostcode });
  };

  const handleRequestDeleteRoute = (depotName: string, loopName: string, routeName: string) => {
    setPendingDeletion({ kind: 'route', depotName, loopName, routeName });
  };

  const handleRequestDeleteLoop = (depotName: string, loopName: string) => {
    setPendingDeletion({ kind: 'loop', depotName, loopName });
  };

  const handleRequestDeleteDepot = (depotName: string) => {
    setPendingDeletion({ kind: 'depot', depotName });
  };

  const handleConfirmDeletion = () => {
    if (!pendingDeletion || !sp) return;
    switch (pendingDeletion.kind) {
      case 'subpostcode':
        removeStoredSubpostcode(sp, pendingDeletion.depotName, pendingDeletion.routeName, pendingDeletion.subpostcode);
        break;
      case 'route':
        removeStoredRoute(sp, pendingDeletion.depotName, pendingDeletion.loopName, pendingDeletion.routeName);
        setVersion(v => v + 1);
        break;
      case 'loop':
        removeStoredLoop(sp, pendingDeletion.depotName, pendingDeletion.loopName);
        setVersion(v => v + 1);
        break;
      case 'depot':
        removeStoredDepot(sp, pendingDeletion.depotName);
        setVersion(v => v + 1);
        if (activeDepotName === pendingDeletion.depotName) setActiveDepotName(null);
        break;
    }
    setPendingDeletion(null);
  };

  const openAddRoute = (depotName: string, loopName?: string) => {
    setActiveDepotName(null);
    setRouteTargetDepot(depotName);
    setRouteForm({ ...EMPTY_ROUTE_FORM, loopName: loopName ?? '', isNewLoop: !loopName });
    setRouteError('');
    setShowAddRoute(true);
  };

  const handleAddRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const loopName = routeForm.loopName.trim();
    const routeName = routeForm.routeName.trim();
    if (!loopName || !routeName) {
      setRouteError('Loop and route name are required');
      return;
    }
    const targetTrimmed = routeForm.target.trim();
    const target = targetTrimmed === '' ? null : parseInt(targetTrimmed, 10);
    if (target !== null && Number.isNaN(target)) {
      setRouteError('Target must be a number');
      return;
    }
    addStoredRoute(sp, {
      depotName: routeTargetDepot,
      loopName,
      routeName,
      type: routeForm.type,
      driver: routeForm.driver.trim(),
      target,
    });
    setShowAddRoute(false);
    setVersion((v) => v + 1);
  };

  const openAddDepot = () => {
    setDepotDraft('');
    setDepotError('');
    setShowAddDepot(true);
  };

  const handleAddDepotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = depotDraft.trim();
    if (!name) {
      setDepotError('Depot name is required');
      return;
    }
    if (depotNames.some(d => d.toLowerCase() === name.toLowerCase())) {
      setDepotError('A depot with this name already exists');
      return;
    }
    addStoredDepot(sp, name);
    setShowAddDepot(false);
    setVersion(v => v + 1);
  };

  const openAddLoop = (depotName: string) => {
    setActiveDepotName(null);
    setLoopTargetDepot(depotName);
    setLoopForm(EMPTY_LOOP_FORM);
    setLoopError('');
    setShowAddLoop(true);
  };

  const handleAddLoopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = loopForm.loopName.trim();
    if (!name) {
      setLoopError('Loop name is required');
      return;
    }
    if (getLoopNames(sp, loopTargetDepot).some(l => l.toLowerCase() === name.toLowerCase())) {
      setLoopError('A loop with this name already exists in this depot');
      return;
    }
    addStoredLoop(sp, loopTargetDepot, name);
    setShowAddLoop(false);
    setVersion(v => v + 1);
    setActiveDepotName(loopTargetDepot);
  };

  if (!sp) {
    return (
      <PortalLayout mainClassName={styles.contracts} title="Contracts" hideAnnouncements>
        <div className={styles.errorNotice}>
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
  const noSearchResults = !isEmpty && searched.length === 0;

  const headerActions = (
    <div className={styles.searchBox}>
      <input
        type="search"
        className={styles.searchInput}
        placeholder="Search depots, loops, routes..."
        autoComplete="off"
        aria-label="Search contracts"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <button type="button" className="vp-modal-btn vp-modal-btn-save" onClick={openAddDepot}>
        + Add Depot
      </button>
    </div>
  );

  return (
    <PortalLayout mainClassName={styles.contracts} title="Contracts" hideAnnouncements actions={headerActions}>
      <div className={styles.contractsContent}>
        <div className="contracts-page-header">
          <div className="contracts-page-header-inner">
            <div className="contracts-page-header-row">
              <div>
                <p className="contracts-page-subtitle">Depot, loop and route contracts for your service provider</p>
                <div className="contracts-page-metrics">
                  <div className="contracts-page-metric">
                    <span className="contracts-page-metric-label">Depots</span>
                    <span className="contracts-page-metric-value">{totalDepots}</span>
                  </div>
                  <div className="contracts-page-metric">
                    <span className="contracts-page-metric-label">Loops</span>
                    <span className="contracts-page-metric-value">{totalLoops}</span>
                  </div>
                  <div className="contracts-page-metric">
                    <span className="contracts-page-metric-label">Routes</span>
                    <span className="contracts-page-metric-value">{totalRoutes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Active Contracts</h2>
        </div>

        {!isEmpty && !noSearchResults ? (
          <div className={styles.depotGrid}>
            {searched.flatMap(prov =>
              prov.depots.map(depot => (
                <DepotSummaryCard
                  key={`${prov.serviceProvider}-${depot.name}`}
                  depot={depot}
                  deletable={isCustomDepot(sp, depot.name)}
                  onManage={() => setActiveDepotName(depot.name)}
                  onRequestDelete={() => handleRequestDeleteDepot(depot.name)}
                />
              )),
            )}
          </div>
        ) : isEmpty ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Contracts on File</h3>
            <p className={styles.emptyDescription}>There are currently no contracts available for your service provider.</p>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Matches</h3>
            <p className={styles.emptyDescription}>No depots, loops or routes match &quot;{search}&quot;.</p>
          </div>
        )}
      </div>

      <DepotEditModal
        sp={sp}
        depot={activeDepot}
        onClose={() => setActiveDepotName(null)}
        onView={setViewTarget}
        onRequestRemoveSubpostcode={handleRequestRemoveSubpostcode}
        onRequestDeleteLoop={handleRequestDeleteLoop}
        onRequestDeleteRoute={handleRequestDeleteRoute}
        onAddRoute={openAddRoute}
        onAddLoop={openAddLoop}
      />
      <RouteViewModal target={viewTarget} onClose={() => setViewTarget(null)} />
      <DeleteConfirmModal
        target={pendingDeletion ? deletionTarget(pendingDeletion) : null}
        onClose={() => setPendingDeletion(null)}
        onConfirm={handleConfirmDeletion}
      />
      <AddDepotModal
        open={showAddDepot}
        value={depotDraft}
        onChange={setDepotDraft}
        onClose={() => setShowAddDepot(false)}
        onSubmit={handleAddDepotSubmit}
        error={depotError}
      />
      <AddLoopModal
        open={showAddLoop}
        depotName={loopTargetDepot}
        formData={loopForm}
        onChange={updater => setLoopForm(updater)}
        onClose={() => setShowAddLoop(false)}
        onSubmit={handleAddLoopSubmit}
        error={loopError}
      />
      <AddRouteModal
        open={showAddRoute}
        depotName={routeTargetDepot}
        formData={routeForm}
        onChange={updater => setRouteForm(updater)}
        loops={loopNames}
        onClose={() => setShowAddRoute(false)}
        onSubmit={handleAddRouteSubmit}
        error={routeError}
      />
    </PortalLayout>
  );
}
