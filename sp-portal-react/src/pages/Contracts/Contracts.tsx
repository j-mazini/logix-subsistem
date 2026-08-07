import { useMemo, useState } from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getFilteredContracts,
  removeStoredSubpostcode,
  addStoredRoute,
  getDepotNames,
  getLoopNames,
  type ContractDepotView,
  type ContractProviderView,
} from '../../data/contractsData';
import { RouteViewModal, type RouteViewTarget } from './components/RouteViewModal';
import { DeleteConfirmModal, type DeleteConfirmTarget } from './components/DeleteConfirmModal';
import { AddRouteModal, type AddRouteFormState } from './components/AddRouteModal';
import { DepotEditModal } from './components/DepotEditModal';
import styles from './Contracts.module.css';

const EMPTY_ROUTE_FORM: AddRouteFormState = {
  depotName: '',
  isNewDepot: false,
  loopName: '',
  isNewLoop: true,
  routeName: '',
  type: 'Child',
  driver: '',
  target: '',
};

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
  onManage: () => void;
}

function DepotSummaryCard({ depot, onManage }: DepotSummaryCardProps) {
  const loopCount = depot.loops.length;
  const routeCount = depot.loops.reduce((s, l) => s + l.routes.length, 0);
  const totalTarget = depot.loops.reduce((s, l) => s + l.routes.reduce((ss, r) => ss + (r.target || 0), 0), 0);

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
  const [confirmRemoval, setConfirmRemoval] = useState<{
    target: DeleteConfirmTarget;
    depotName: string;
    routeName: string;
    subpostcode: string;
  } | null>(null);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [routeForm, setRouteForm] = useState<AddRouteFormState>(EMPTY_ROUTE_FORM);
  const [routeError, setRouteError] = useState('');
  const filtered = useMemo(() => getFilteredContracts(sp), [sp, version]);
  const searched = useMemo(() => filterProviders(filtered, search), [filtered, search]);
  const depotNames = useMemo(() => getDepotNames(sp), [sp, version]);
  const loopNames = useMemo(
    () => (routeForm.isNewDepot ? [] : getLoopNames(sp, routeForm.depotName)),
    [sp, routeForm.depotName, routeForm.isNewDepot, version],
  );
  const activeDepot = useMemo(
    () => filtered.flatMap(p => p.depots).find(d => d.name === activeDepotName) ?? null,
    [filtered, activeDepotName],
  );

  const handleRequestRemoveSubpostcode = (depotName: string, routeName: string, subpostcode: string) => {
    setConfirmRemoval({
      depotName,
      routeName,
      subpostcode,
      target: {
        title: 'Remove sub postcode',
        message: `Remove "${subpostcode}" from route "${routeName}" in ${depotName}? This only affects your custom addition — postcodes extracted from the contract itself are unaffected.`,
      },
    });
  };

  const handleConfirmRemoval = () => {
    if (!confirmRemoval || !sp) return;
    removeStoredSubpostcode(sp, confirmRemoval.depotName, confirmRemoval.routeName, confirmRemoval.subpostcode);
    setConfirmRemoval(null);
  };

  const openAddRoute = (depotName?: string, loopName?: string) => {
    setActiveDepotName(null);
    setRouteForm(
      depotName
        ? { ...EMPTY_ROUTE_FORM, depotName, isNewDepot: false, loopName: loopName ?? '', isNewLoop: !loopName }
        : EMPTY_ROUTE_FORM,
    );
    setRouteError('');
    setShowAddRoute(true);
  };

  const handleAddRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const depotName = routeForm.depotName.trim();
    const loopName = routeForm.loopName.trim();
    const routeName = routeForm.routeName.trim();
    if (!depotName || !loopName || !routeName) {
      setRouteError('Depot, loop and route name are required');
      return;
    }
    const targetTrimmed = routeForm.target.trim();
    const target = targetTrimmed === '' ? null : parseInt(targetTrimmed, 10);
    if (target !== null && Number.isNaN(target)) {
      setRouteError('Target must be a number');
      return;
    }
    addStoredRoute(sp, {
      depotName,
      loopName,
      routeName,
      type: routeForm.type,
      driver: routeForm.driver.trim(),
      target,
    });
    setShowAddRoute(false);
    setVersion((v) => v + 1);
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
  const padCount = (n: number) => String(n).padStart(2, '0');

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
      <button type="button" className="vp-modal-btn vp-modal-btn-save" onClick={() => openAddRoute()}>
        + Add Route
      </button>
    </div>
  );

  return (
    <PortalLayout mainClassName={styles.contracts} title="Contracts" hideAnnouncements actions={headerActions}>
      <div className={styles.contractsContent}>
        <div className={styles.metricsRow}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Depots</span>
            <span className={styles.metricValue}>{padCount(totalDepots)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Loops</span>
            <span className={styles.metricValue}>{padCount(totalLoops)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Routes</span>
            <span className={styles.metricValue}>{padCount(totalRoutes)}</span>
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
                  onManage={() => setActiveDepotName(depot.name)}
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
        onAddRoute={openAddRoute}
      />
      <RouteViewModal target={viewTarget} onClose={() => setViewTarget(null)} />
      <DeleteConfirmModal
        target={confirmRemoval?.target ?? null}
        onClose={() => setConfirmRemoval(null)}
        onConfirm={handleConfirmRemoval}
      />
      <AddRouteModal
        open={showAddRoute}
        formData={routeForm}
        onChange={updater => setRouteForm(updater)}
        depots={depotNames}
        loops={loopNames}
        onClose={() => setShowAddRoute(false)}
        onSubmit={handleAddRouteSubmit}
        error={routeError}
      />
    </PortalLayout>
  );
}
