import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { X, Eye, Plus, Trash2 } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import {
  getEffectiveBandsFor,
  setStoredLoopBands,
  setStoredLoopRate,
  setStoredLoopTarget,
  setStoredTarget,
  addStoredSubpostcode,
  isCustomLoop,
  isCustomRoute,
  type ContractDepotView,
  type ContractLoopView,
  type ContractRouteView,
  type DigressiveBand,
} from '../../../data/contractsData';
import type { RouteViewTarget } from './RouteViewModal';
import sharedStyles from './ContractModals.module.css';
import contractStyles from '../Contracts.module.css';
import styles from './DepotEditModal.module.css';

/* =====================================================
   DepotEditModal — "Manage depot" popup opened from a depot card on the
   Contracts page. Everything an SP can edit for a depot (loop rate/bands,
   per-route target, sub postcodes) lives here instead of an always-expanded
   accordion tree, laid out as a bento grid: one overview strip, then one
   rate/bands tile + one routes tile per loop.
   ===================================================== */

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`${contractStyles.expandIcon} ${!open ? contractStyles.collapsed : ''}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

interface RouteRowProps {
  sp: string;
  depotName: string;
  route: ContractRouteView;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
  onRequestDeleteRoute: (depotName: string, loopName: string, routeName: string) => void;
  loopName: string;
}

function RouteRow({ sp, depotName, loopName, route, onView, onRequestRemoveSubpostcode, onRequestDeleteRoute }: RouteRowProps) {
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

  return (
    <div className={contractStyles.routeCard}>
      <div className={contractStyles.routeHeader} onClick={() => setOpen(o => !o)}>
        <Chevron open={open} />
        <h4 className={contractStyles.routeName}>{route.name}</h4>
        <span className={contractStyles.routeBadge}>{route.type}</span>
        <button
          type="button"
          className={contractStyles.viewButton}
          onClick={e => {
            e.stopPropagation();
            onView({ depotName, loopName, route });
          }}
          aria-label={`View ${route.name} details`}
          title="View route details"
        >
          <Eye size={14} />
        </button>
        {isCustomRoute(sp, depotName, loopName, route.name) && (
          <button
            type="button"
            className={contractStyles.tileDeleteButton}
            onClick={e => {
              e.stopPropagation();
              onRequestDeleteRoute(depotName, loopName, route.name);
            }}
            aria-label={`Delete ${route.name}`}
            title="Delete route"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className={contractStyles.routeBody}>
          <div className={contractStyles.routeInfo}>
            <div className={contractStyles.infoItem}>
              <span className={contractStyles.infoLabel}>Type</span>
              <span className={contractStyles.infoValue}>{route.type}</span>
            </div>
            {route.driver && (
              <div className={contractStyles.infoItem}>
                <span className={contractStyles.infoLabel}>Driver</span>
                <span className={contractStyles.infoValue}>{route.driver}</span>
              </div>
            )}
            <div className={contractStyles.infoItem}>
              <span className={contractStyles.infoLabel}>Current Target</span>
              <span className={contractStyles.infoValue}>{displayTarget}</span>
            </div>
          </div>

          <div className={contractStyles.targetSection}>
            <label className={contractStyles.targetLabel}>Set Target</label>
            <span className={contractStyles.targetHint}>Used for comparison and utilisation rate</span>
            <input
              type="number"
              min={0}
              step={1}
              className={contractStyles.targetInput}
              value={rawValue}
              onChange={handleTargetChange}
              placeholder="Enter target"
              aria-label="Route target"
            />
            {errors.target && <span className={contractStyles.fieldError}>{errors.target}</span>}
          </div>

          <div className={contractStyles.subpostcodesSection}>
            <label className={contractStyles.subpostcodesLabel}>Sub Postcodes ({route.subpostcodes.length})</label>

            <div className={contractStyles.subpostcodesList}>
              {route.subpostcodes.map(subpostcode => {
                const isCustom = route.customSubpostcodes.includes(subpostcode);
                return (
                  <div
                    key={subpostcode}
                    className={`${contractStyles.subpostcodeBadge} ${isCustom ? contractStyles.custom : contractStyles.extracted}`}
                  >
                    <span>{subpostcode}</span>
                    {isCustom && (
                      <button
                        className={contractStyles.subpostcodeRemove}
                        onClick={() => onRequestRemoveSubpostcode(depotName, route.name, subpostcode)}
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
              className={contractStyles.addSubpostcodeForm}
              onSubmit={e => {
                e.preventDefault();
                handleAddSubpostcode();
              }}
            >
              <input
                type="text"
                className={contractStyles.subpostcodeInput}
                value={newSubpostcode}
                onChange={e => {
                  setNewSubpostcode(e.target.value);
                  setErrors(prev => ({ ...prev, subpostcode: '' }));
                }}
                placeholder="e.g. SW1A"
                aria-label="Add subpostcode"
              />
              <button type="submit" className={contractStyles.addButton}>
                + Add
              </button>
            </form>
            {errors.subpostcode && <span className={contractStyles.fieldError}>{errors.subpostcode}</span>}
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

function LoopRateTile({
  sp,
  depotName,
  loop,
  onRequestDeleteLoop,
}: {
  sp: string;
  depotName: string;
  loop: ContractLoopView;
  onRequestDeleteLoop: (depotName: string, loopName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState<number>(() =>
    typeof loop.deliveryRate === 'number' && !Number.isNaN(loop.deliveryRate) ? loop.deliveryRate : 0,
  );
  const [bands, setBands] = useState<DigressiveBand[] | undefined>(() => getEffectiveBandsFor(sp, depotName, loop.name));
  const [target, setTarget] = useState(loop.target);
  const [hasTargetOverride, setHasTargetOverride] = useState(loop.hasTargetOverride);
  const [draftRate, setDraftRate] = useState('');
  const [draftBands, setDraftBands] = useState<BandDraft[]>([]);
  const [draftTarget, setDraftTarget] = useState('');
  const [editError, setEditError] = useState('');

  const rateStr = rate > 0 ? `£${rate.toFixed(2)}` : '—';
  const routesSum = loop.routes.reduce((sum, r) => sum + (r.target != null ? r.target : 0), 0);
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
    setDraftTarget(hasTargetOverride ? String(target) : '');
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

    const targetTrimmed = draftTarget.trim();
    let newTarget: number | null = null;
    if (targetTrimmed !== '') {
      newTarget = parseInt(targetTrimmed, 10);
      if (Number.isNaN(newTarget) || newTarget < 0) {
        setEditError('Target must be a number of 0 or more');
        return;
      }
    }

    setStoredLoopRate(sp, depotName, loop.name, newRate > 0 ? newRate : null);
    setStoredLoopBands(sp, depotName, loop.name, newBands.length ? newBands : null);
    setStoredLoopTarget(sp, depotName, loop.name, newTarget);
    setRate(newRate);
    setBands(newBands.length ? newBands : getEffectiveBandsFor(sp, depotName, loop.name));
    setTarget(newTarget ?? routesSum);
    setHasTargetOverride(newTarget !== null);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditError('');
  };

  return (
    <div className={styles.tileLoop}>
      <div className={styles.tileHeader}>
        <h4 className={styles.tileHeaderTitle}>{loop.name}</h4>
        <span className={contractStyles.levelTag}>Rate &amp; bands</span>
        {isCustomLoop(sp, depotName, loop.name) && (
          <button
            type="button"
            className={contractStyles.tileDeleteButton}
            onClick={() => onRequestDeleteLoop(depotName, loop.name)}
            aria-label={`Delete loop ${loop.name}`}
            title="Delete loop"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {!editing ? (
        <div className={contractStyles.loopMeta}>
          <div className={contractStyles.loopMetaItem}>
            <span className={contractStyles.loopMetaLabel}>Bands (per loop)</span>
            <span className={contractStyles.loopMetaValue} title={bandsText}>
              {bandsText}
            </span>
          </div>
          <div className={contractStyles.loopMetaItem}>
            <span className={contractStyles.loopMetaLabel}>Rate (Band 1)</span>
            <span className={contractStyles.loopMetaValue}>{rateStr}</span>
          </div>
          <div className={contractStyles.loopMetaItem}>
            <span className={contractStyles.loopMetaLabel}>Total Target</span>
            <span className={contractStyles.loopMetaValue}>
              {target}
              {!hasTargetOverride && ' (from routes)'}
            </span>
          </div>
          <button type="button" className={contractStyles.loopEditButton} onClick={startEdit}>
            Edit
          </button>
        </div>
      ) : (
        <div className={contractStyles.loopEditForm}>
          <div className={contractStyles.editField}>
            <label className={contractStyles.targetLabel} htmlFor={`rate-${depotName}-${loop.name}`}>
              Rate (Band 1)
            </label>
            <span className={contractStyles.targetHint}>Delivery rate in £ per drop</span>
            <input
              id={`rate-${depotName}-${loop.name}`}
              type="number"
              min={0}
              step={0.01}
              className={contractStyles.bandInput}
              value={draftRate}
              onChange={e => {
                setDraftRate(e.target.value);
                setEditError('');
              }}
              placeholder="0.00"
            />
          </div>

          <div className={contractStyles.editField}>
            <label className={contractStyles.targetLabel} htmlFor={`target-${depotName}-${loop.name}`}>
              Total Target
            </label>
            <span className={contractStyles.targetHint}>
              Leave empty to use the sum of route targets ({routesSum})
            </span>
            <input
              id={`target-${depotName}-${loop.name}`}
              type="number"
              min={0}
              step={1}
              className={contractStyles.bandInput}
              value={draftTarget}
              onChange={e => {
                setDraftTarget(e.target.value);
                setEditError('');
              }}
              placeholder={String(routesSum)}
            />
          </div>

          <div className={contractStyles.editField}>
            <span className={contractStyles.targetLabel}>Bands (per loop)</span>
            <span className={contractStyles.targetHint}>Volume range and price per band — leave "to" empty for no cap</span>

            <div className={contractStyles.bandsEditor}>
              <div className={`${contractStyles.bandRow} ${contractStyles.bandHeaderRow}`}>
                <span className={contractStyles.bandIndex} />
                <span className={contractStyles.bandColLabel}>From</span>
                <span className={contractStyles.bandColLabel}>To</span>
                <span className={contractStyles.bandColLabel}>Price (£)</span>
                <span className={contractStyles.bandRemoveSpacer} />
              </div>
              {draftBands.map((band, i) => (
                <div key={i} className={contractStyles.bandRow}>
                  <span className={contractStyles.bandIndex}>Band {i + 1}</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={contractStyles.bandInput}
                    value={band.min}
                    onChange={e => updateDraftBand(i, 'min', e.target.value)}
                    aria-label={`Band ${i + 1} from`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={contractStyles.bandInput}
                    value={band.max}
                    onChange={e => updateDraftBand(i, 'max', e.target.value)}
                    placeholder="∞"
                    aria-label={`Band ${i + 1} to`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={contractStyles.bandInput}
                    value={band.price}
                    onChange={e => updateDraftBand(i, 'price', e.target.value)}
                    placeholder="0.00"
                    aria-label={`Band ${i + 1} price`}
                  />
                  <button
                    type="button"
                    className={contractStyles.bandRemove}
                    onClick={() => removeDraftBand(i)}
                    aria-label={`Remove band ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className={contractStyles.addBandButton} onClick={addDraftBand}>
              + Add band
            </button>
          </div>

          {editError && <span className={contractStyles.fieldError}>{editError}</span>}

          <div className={contractStyles.editActions}>
            <button type="button" className={contractStyles.cancelButton} onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className={contractStyles.addButton} onClick={handleSave}>
              Save changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoutesTile({
  sp,
  depotName,
  loop,
  onView,
  onRequestRemoveSubpostcode,
  onRequestDeleteRoute,
  onAddRoute,
}: {
  sp: string;
  depotName: string;
  loop: ContractLoopView;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
  onRequestDeleteRoute: (depotName: string, loopName: string, routeName: string) => void;
  onAddRoute: () => void;
}) {
  return (
    <div className={styles.tileRoutes}>
      <div className={styles.tileHeader}>
        <h4 className={styles.tileHeaderTitle}>Routes ({loop.routes.length})</h4>
        <button type="button" className={contractStyles.loopEditButton} onClick={onAddRoute}>
          <Plus size={12} style={{ verticalAlign: -2, marginRight: 2 }} />
          Route
        </button>
      </div>
      {loop.routes.length > 0 ? (
        <div className={styles.routesList}>
          {loop.routes.map(route => (
            <RouteRow
              key={route.name}
              sp={sp}
              depotName={depotName}
              loopName={loop.name}
              route={route}
              onView={onView}
              onRequestRemoveSubpostcode={onRequestRemoveSubpostcode}
              onRequestDeleteRoute={onRequestDeleteRoute}
            />
          ))}
        </div>
      ) : (
        <p className={styles.routesEmpty}>No routes in this loop yet.</p>
      )}
    </div>
  );
}

interface DepotEditModalProps {
  sp: string;
  depot: ContractDepotView | null;
  onClose: () => void;
  onView: (target: RouteViewTarget) => void;
  onRequestRemoveSubpostcode: (depotName: string, routeName: string, subpostcode: string) => void;
  onRequestDeleteLoop: (depotName: string, loopName: string) => void;
  onRequestDeleteRoute: (depotName: string, loopName: string, routeName: string) => void;
  onAddRoute: (depotName: string, loopName?: string) => void;
  onAddLoop: (depotName: string) => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.35 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export function DepotEditModal({
  sp,
  depot,
  onClose,
  onView,
  onRequestRemoveSubpostcode,
  onRequestDeleteLoop,
  onRequestDeleteRoute,
  onAddRoute,
  onAddLoop,
}: DepotEditModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(!!depot);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && depot) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [depot, onClose]);

  if (!mounted) return null;

  const loopCount = depot?.loops.length ?? 0;
  const routeCount = depot?.loops.reduce((s, l) => s + l.routes.length, 0) ?? 0;
  const totalTarget = depot?.loops.reduce((s, l) => s + l.target, 0) ?? 0;

  const modalContent = (
    <AnimatePresence>
      {depot && (
        <>
          <motion.div
            className={sharedStyles.backdrop}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className={sharedStyles.overlay}>
            <motion.div
              className={`${sharedStyles.modal} ${styles.bentoModal}`}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Manage ${depot.name}`}
            >
              <div className={sharedStyles.modalHeader}>
                <div>
                  <h2 className={sharedStyles.modalTitle}>{depot.name}</h2>
                  <p className={sharedStyles.modalSubtitle}>Depot &middot; {loopCount} loop{loopCount === 1 ? '' : 's'}</p>
                </div>
                <button onClick={onClose} className={sharedStyles.closeButton} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className={styles.bentoBody}>
                <div className={styles.bentoGrid}>
                  <div className={styles.tileOverview}>
                    <div className={styles.overviewStat}>
                      <span className={styles.overviewLabel}>Loops</span>
                      <span className={styles.overviewValue}>{loopCount}</span>
                    </div>
                    <div className={styles.overviewStat}>
                      <span className={styles.overviewLabel}>Routes</span>
                      <span className={styles.overviewValue}>{routeCount}</span>
                    </div>
                    <div className={styles.overviewStat}>
                      <span className={styles.overviewLabel}>Total Target</span>
                      <span className={styles.overviewValue}>{totalTarget}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className={contractStyles.cancelButton} onClick={() => onAddLoop(depot.name)}>
                        <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                        Add Loop
                      </button>
                      <button type="button" className={contractStyles.addButton} onClick={() => onAddRoute(depot.name)}>
                        <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                        Add Route
                      </button>
                    </div>
                  </div>
                </div>

                {loopCount === 0 ? (
                  <div className={styles.emptyLoops}>
                    <p>No loops on file for this depot yet.</p>
                    <button type="button" className={contractStyles.addButton} onClick={() => onAddLoop(depot.name)}>
                      <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                      Add Loop
                    </button>
                  </div>
                ) : (
                  depot.loops.map(loop => (
                    <div key={loop.name} className={styles.loopBlock}>
                      <div className={styles.bentoGrid}>
                        <LoopRateTile sp={sp} depotName={depot.name} loop={loop} onRequestDeleteLoop={onRequestDeleteLoop} />
                        <RoutesTile
                          sp={sp}
                          depotName={depot.name}
                          loop={loop}
                          onView={onView}
                          onRequestRemoveSubpostcode={onRequestRemoveSubpostcode}
                          onRequestDeleteRoute={onRequestDeleteRoute}
                          onAddRoute={() => onAddRoute(depot.name, loop.name)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className={sharedStyles.modalFooter}>
                <button type="button" className={sharedStyles.secondaryButton} onClick={onClose}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
