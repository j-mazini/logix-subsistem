import { useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
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
  type DigressiveBand,
} from '../../data/contractsData';
import styles from './Contracts.module.css';

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`${styles.expandIcon} ${!open ? styles.collapsed : ''}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function RouteCard({ sp, depotName, route }: { sp: string; depotName: string; route: ContractRouteView }) {
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
    removeStoredSubpostcode(sp, depotName, route.name, subpostcode);
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

function LoopPanel({ sp, depotName, loop }: { sp: string; depotName: string; loop: ContractLoopView }) {
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
          <RouteCard key={route.name} sp={sp} depotName={depotName} route={route} />
        ))}
      </div>
    </div>
  );
}

function DepotCard({ sp, depot }: { sp: string; depot: ContractDepotView }) {
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
          <LoopPanel key={loop.name} sp={sp} depotName={depot.name} loop={loop} />
        ))}
      </div>
    </div>
  );
}

export function Contracts() {
  const sp = useCurrentSp();
  const menuControls = useAdminHeaderPill();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => getFilteredContracts(sp), [sp]);

  if (!sp) {
    return (
      <PortalLayout mainClassName={styles.contracts} title="Contracts">
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
  const padCount = (n: number) => String(n).padStart(2, '0');

  const header = (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Contracts</h1>
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
        <AdminHeaderPill sp={sp} controls={menuControls} />
      </div>
      <AdminHeaderMenu sp={sp} controls={menuControls} />
    </>
  );

  return (
    <PortalLayout mainClassName={styles.contracts} header={header}>
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

        {!isEmpty ? (
          <div className={styles.depotList}>
            {filtered.flatMap(prov =>
              prov.depots.map(depot => (
                <DepotCard key={`${prov.serviceProvider}-${depot.name}`} sp={sp} depot={depot} />
              )),
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Contracts on File</h3>
            <p className={styles.emptyDescription}>There are currently no contracts available for your service provider.</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
