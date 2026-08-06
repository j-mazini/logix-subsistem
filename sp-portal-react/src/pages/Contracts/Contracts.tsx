import { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getFilteredContracts,
  getEffectiveBandsFor,
  setStoredLoopBands,
  setStoredLoopRate,
  setStoredTarget,
  addStoredSubpostcode,
  removeStoredSubpostcode,
  type ContractDepotView,
  type ContractLoopView,
  type ContractRouteView,
  type ContractProviderView,
  type DigressiveBand,
} from '../../data/contractsData';
import { RouteViewModal, type RouteViewTarget } from './components/RouteViewModal';
import { DeleteConfirmModal, type DeleteConfirmTarget } from './components/DeleteConfirmModal';
import styles from './Contracts.module.css';

/** Case-insensitive substring match used by the search box below. */
function matches(term: string, ...values: string[]): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  return values.some(v => v.toLowerCase().includes(t));
}

/**
 * Filters the depot → loop → route tree down to entries matching `search`
 * by depot, loop, route, driver or subpostcode name — keeping a parent
 * whenever any of its descendants match. Ported from the intent of the
 * Next.js source's FiltersPanel/SearchInput/RouteFilters (which filter a
 * flat routes table); adapted here to the nested depot/loop/route shape
 * this page actually renders.
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
            .filter((l): l is ContractLoopView => l !== null);
          const depotMatches = matches(term, depot.name);
          return depotMatches || loops.length ? { ...depot, loops: depotMatches ? depot.loops : loops } : null;
        })
        .filter((d): d is ContractDepotView => d !== null);
      return { ...prov, depots };
    })
    .filter(p => p.depots.length > 0);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`${styles.expandIcon} ${!open ? styles.collapsed : ''}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

interface RouteCardProps {
  sp: string;
  depotName: string;
  loopName: string;
  route: ContractRouteView;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
}

function RouteCard({ sp, depotName, loopName, route, onView, onRequestRemoveSubpostcode }: RouteCardProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(String(route.target));
  const [newSubpostcode, setNewSubpostcode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const trimmed = rawValue.trim();
  const parsed = trimmed === '' ? NaN : parseInt(trimmed, 10);
  const displayTarget = Number.isNaN(parsed) ? 0 : parsed;

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawValue(val);
    const t = val.trim();
    const num = t === '' ? null : parseInt(t, 10);
    setStoredTarget(sp, depotName, route.name, num !== null && Number.isNaN(num) ? null : num);
    setErrors(prev => ({ ...prev, target: '' }));
  };

  const handleAddSubpostcode = () => {
    const normalized = newSubpostcode.trim().toUpperCase();
    if (!normalized) {
      setErrors(prev => ({ ...prev, subpostcode: 'Subpostcode cannot be empty' }));
      return;
    }
    if (route.subpostcodes.includes(normalized)) {
      setErrors(prev => ({ ...prev, subpostcode: 'Subpostcode already exists' }));
      return;
    }
    addStoredSubpostcode(sp, depotName, route.name, normalized);
    setNewSubpostcode('');
    setErrors(prev => ({ ...prev, subpostcode: '' }));
  };

  const handleRemoveSubpostcode = (subpostcode: string) => {
    onRequestRemoveSubpostcode(depotName, route.name, subpostcode);
  };

  return (
    <div className={styles.routeCard}>
      <div
        className={styles.routeHeader}
        onClick={() => setOpen(o => !o)}
      >
        <Chevron open={open} />
        <h4 className={styles.routeName}>{route.name}</h4>
        <span className={styles.routeBadge}>{route.type}</span>
        <button
          type="button"
          className={styles.viewButton}
          onClick={e => {
            e.stopPropagation();
            onView({ depotName, loopName, route });
          }}
          aria-label={`View ${route.name} details`}
          title="View route details"
        >
          <Eye size={14} />
        </button>
      </div>

      {open && (
        <div className={styles.routeBody}>
          <div className={styles.routeInfo}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Type</span>
              <span className={styles.infoValue}>{route.type}</span>
            </div>
            {route.driver && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Driver</span>
                <span className={styles.infoValue}>{route.driver}</span>
              </div>
            )}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Current Target</span>
              <span className={styles.infoValue}>{displayTarget}</span>
            </div>
          </div>

          <div className={styles.targetSection}>
            <label className={styles.targetLabel}>Set Target</label>
            <span className={styles.targetHint}>Used for comparison and utilisation rate</span>
            <input
              type="number"
              min={0}
              step={1}
              className={styles.targetInput}
              value={rawValue}
              onChange={handleTargetChange}
              placeholder="Enter target"
              aria-label="Route target"
            />
            {errors.target && <span className={styles.fieldError}>{errors.target}</span>}
          </div>

          <div className={styles.subpostcodesSection}>
            <label className={styles.subpostcodesLabel}>Sub Postcodes ({route.subpostcodes.length})</label>

            <div className={styles.subpostcodesList}>
              {route.subpostcodes.map(subpostcode => {
                const isCustom = route.customSubpostcodes.includes(subpostcode);
                return (
                  <div key={subpostcode} className={`${styles.subpostcodeBadge} ${isCustom ? styles.custom : styles.extracted}`}>
                    <span>{subpostcode}</span>
                    {isCustom && (
                      <button
                        className={styles.subpostcodeRemove}
                        onClick={() => handleRemoveSubpostcode(subpostcode)}
                        aria-label={`Remove ${subpostcode}`}
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <form
              className={styles.addSubpostcodeForm}
              onSubmit={e => {
                e.preventDefault();
                handleAddSubpostcode();
              }}
            >
              <input
                type="text"
                className={styles.subpostcodeInput}
                value={newSubpostcode}
                onChange={e => {
                  setNewSubpostcode(e.target.value);
                  setErrors(prev => ({ ...prev, subpostcode: '' }));
                }}
                placeholder="e.g. SW1A"
                aria-label="Add subpostcode"
              />
              <button type="submit" className={styles.addButton}>
                + Add
              </button>
            </form>
            {errors.subpostcode && <span className={styles.fieldError}>{errors.subpostcode}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

interface BandDraft {
  min: string;
  max: string;
  price: string;
}

interface LoopPanelProps {
  sp: string;
  depotName: string;
  loop: ContractLoopView;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
}

function LoopPanel({ sp, depotName, loop, onView, onRequestRemoveSubpostcode }: LoopPanelProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState<number>(() =>
    typeof loop.deliveryRate === 'number' && !Number.isNaN(loop.deliveryRate) ? loop.deliveryRate : 0,
  );
  const [bands, setBands] = useState<DigressiveBand[] | undefined>(() => getEffectiveBandsFor(sp, depotName, loop.name));
  const [draftRate, setDraftRate] = useState('');
  const [draftBands, setDraftBands] = useState<BandDraft[]>([]);
  const [editError, setEditError] = useState('');

  const rateStr = rate > 0 ? `£${rate.toFixed(2)}` : '—';
  const totalTarget = loop.routes.reduce((sum, r) => sum + (r.target != null ? r.target : 0), 0);
  const bandsText =
    bands && bands.length
      ? bands
          .map((b, i) => `Band ${i + 1}: ${b.max != null ? `${b.min}–${b.max}` : `${b.min}+`} (£${b.price ? b.price.toFixed(2) : '—'})`)
          .join(' · ')
      : `Band 1–4 (rate: ${rateStr})`;

  const startEdit = () => {
    setDraftRate(rate > 0 ? String(rate) : '');
    setDraftBands(
      bands && bands.length
        ? bands.map(b => ({ min: String(b.min), max: b.max != null ? String(b.max) : '', price: String(b.price) }))
        : [{ min: '1', max: '', price: rate > 0 ? String(rate) : '' }],
    );
    setEditError('');
    setEditing(true);
  };

  const updateDraftBand = (index: number, field: keyof BandDraft, value: string) => {
    setDraftBands(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
    setEditError('');
  };

  const addDraftBand = () => {
    setDraftBands(prev => {
      const last = prev[prev.length - 1];
      const nextMin = last && last.max.trim() !== '' ? String(parseInt(last.max, 10) + 1 || '') : '';
      return [...prev, { min: nextMin, max: '', price: '' }];
    });
  };

  const removeDraftBand = (index: number) => {
    setDraftBands(prev => prev.filter((_, i) => i !== index));
    setEditError('');
  };

  const handleSave = () => {
    const rateTrimmed = draftRate.trim();
    const newRate = rateTrimmed === '' ? 0 : Number(rateTrimmed);
    if (Number.isNaN(newRate) || newRate < 0) {
      setEditError('Rate must be a number of 0 or more');
      return;
    }

    const newBands: DigressiveBand[] = [];
    for (let i = 0; i < draftBands.length; i++) {
      const d = draftBands[i];
      const min = parseInt(d.min.trim(), 10);
      const max = d.max.trim() === '' ? null : parseInt(d.max.trim(), 10);
      const price = Number(d.price.trim());
      if (Number.isNaN(min) || min < 0) {
        setEditError(`Band ${i + 1}: "from" must be a number of 0 or more`);
        return;
      }
      if (max !== null && (Number.isNaN(max) || max < min)) {
        setEditError(`Band ${i + 1}: "to" must be empty or a number of ${min} or more`);
        return;
      }
      if (d.price.trim() === '' || Number.isNaN(price) || price < 0) {
        setEditError(`Band ${i + 1}: price must be a number of 0 or more`);
        return;
      }
      newBands.push({ min, max, price });
    }

    setStoredLoopRate(sp, depotName, loop.name, newRate > 0 ? newRate : null);
    setStoredLoopBands(sp, depotName, loop.name, newBands.length ? newBands : null);
    setRate(newRate);
    setBands(newBands.length ? newBands : getEffectiveBandsFor(sp, depotName, loop.name));
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditError('');
  };

  return (
    <div className={styles.loopPanel}>
      <div className={styles.loopHeader} onClick={() => setOpen(o => !o)}>
        <Chevron open={open} />
        <h4 className={styles.loopTitle}>{loop.name}</h4>
        <span className={styles.levelTag}>Loop</span>
      </div>

      {open && !editing && (
        <div className={styles.loopMeta}>
          <div className={styles.loopMetaItem}>
            <span className={styles.loopMetaLabel}>Bands (per loop)</span>
            <span className={styles.loopMetaValue} title={bandsText}>
              {bandsText}
            </span>
          </div>
          <div className={styles.loopMetaItem}>
            <span className={styles.loopMetaLabel}>Rate (Band 1)</span>
            <span className={styles.loopMetaValue}>{rateStr}</span>
          </div>
          <div className={styles.loopMetaItem}>
            <span className={styles.loopMetaLabel}>Total Target</span>
            <span className={styles.loopMetaValue}>{totalTarget}</span>
          </div>
          <button type="button" className={styles.loopEditButton} onClick={startEdit}>
            Edit
          </button>
        </div>
      )}

      {open && editing && (
        <div className={styles.loopEditForm}>
          <div className={styles.editField}>
            <label className={styles.targetLabel} htmlFor={`rate-${depotName}-${loop.name}`}>
              Rate (Band 1)
            </label>
            <span className={styles.targetHint}>Delivery rate in £ per drop</span>
            <input
              id={`rate-${depotName}-${loop.name}`}
              type="number"
              min={0}
              step={0.01}
              className={styles.bandInput}
              value={draftRate}
              onChange={e => {
                setDraftRate(e.target.value);
                setEditError('');
              }}
              placeholder="0.00"
            />
          </div>

          <div className={styles.editField}>
            <span className={styles.targetLabel}>Bands (per loop)</span>
            <span className={styles.targetHint}>Volume range and price per band — leave "to" empty for no cap</span>

            <div className={styles.bandsEditor}>
              <div className={`${styles.bandRow} ${styles.bandHeaderRow}`}>
                <span className={styles.bandIndex} />
                <span className={styles.bandColLabel}>From</span>
                <span className={styles.bandColLabel}>To</span>
                <span className={styles.bandColLabel}>Price (£)</span>
                <span className={styles.bandRemoveSpacer} />
              </div>
              {draftBands.map((band, i) => (
                <div key={i} className={styles.bandRow}>
                  <span className={styles.bandIndex}>Band {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={styles.bandInput}
                    value={band.min}
                    onChange={e => updateDraftBand(i, 'min', e.target.value)}
                    aria-label={`Band ${i + 1} from`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={styles.bandInput}
                    value={band.max}
                    onChange={e => updateDraftBand(i, 'max', e.target.value)}
                    placeholder="∞"
                    aria-label={`Band ${i + 1} to`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={styles.bandInput}
                    value={band.price}
                    onChange={e => updateDraftBand(i, 'price', e.target.value)}
                    placeholder="0.00"
                    aria-label={`Band ${i + 1} price`}
                  />
                  <button
                    type="button"
                    className={styles.bandRemove}
                    onClick={() => removeDraftBand(i)}
                    aria-label={`Remove band ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className={styles.addBandButton} onClick={addDraftBand}>
              + Add band
            </button>
          </div>

          {editError && <span className={styles.fieldError}>{editError}</span>}

          <div className={styles.editActions}>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className={styles.addButton} onClick={handleSave}>
              Save changes
            </button>
          </div>
        </div>
      )}

      <div className={`${styles.loopRoutes} ${!open ? styles.collapsed : ''}`}>
        {loop.routes.map(route => (
          <RouteCard
            key={route.name}
            sp={sp}
            depotName={depotName}
            loopName={loop.name}
            route={route}
            onView={onView}
            onRequestRemoveSubpostcode={onRequestRemoveSubpostcode}
          />
        ))}
      </div>
    </div>
  );
}

interface DepotCardProps {
  sp: string;
  depot: ContractDepotView;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
}

function DepotCard({ sp, depot, onView, onRequestRemoveSubpostcode }: DepotCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.depotCard}>
      <div className={styles.depotHeader} onClick={() => setOpen(o => !o)}>
        <Chevron open={open} />
        <h3 className={styles.depotName}>{depot.name}</h3>
        <span className={styles.levelTag}>Depot</span>
      </div>

      <div className={`${styles.depotContent} ${!open ? styles.collapsed : ''}`}>
        {depot.loops.map(loop => (
          <LoopPanel
            key={loop.name}
            sp={sp}
            depotName={depot.name}
            loop={loop}
            onView={onView}
            onRequestRemoveSubpostcode={onRequestRemoveSubpostcode}
          />
        ))}
      </div>
    </div>
  );
}

export function Contracts() {
  const sp = useCurrentSp();
  const [search, setSearch] = useState('');
  const [viewTarget, setViewTarget] = useState<RouteViewTarget | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState<{
    target: DeleteConfirmTarget;
    depotName: string;
    routeName: string;
    subpostcode: string;
  } | null>(null);
  const filtered = useMemo(() => getFilteredContracts(sp), [sp]);
  const searched = useMemo(() => filterProviders(filtered, search), [filtered, search]);

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
          <div className={styles.depotList}>
            {searched.flatMap(prov =>
              prov.depots.map(depot => (
                <DepotCard
                  key={`${prov.serviceProvider}-${depot.name}`}
                  sp={sp}
                  depot={depot}
                  onView={setViewTarget}
                  onRequestRemoveSubpostcode={handleRequestRemoveSubpostcode}
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

      <RouteViewModal target={viewTarget} onClose={() => setViewTarget(null)} />
      <DeleteConfirmModal
        target={confirmRemoval?.target ?? null}
        onClose={() => setConfirmRemoval(null)}
        onConfirm={handleConfirmRemoval}
      />
    </PortalLayout>
  );
}
