import { useMemo, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { AdminHeaderPill, AdminHeaderMenu, useAdminHeaderPill } from '../../layout/AdminHeaderUserPill';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import {
  getFilteredContracts,
  getDigressiveBandsFor,
  setStoredTarget,
  addStoredSubpostcode,
  removeStoredSubpostcode,
  type ContractDepotView,
  type ContractLoopView,
  type ContractProviderView,
  type ContractRouteView,
} from '../../data/contractsData';
import styles from './Contracts.module.css';

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
        <span className={styles.routeIcon}>📍</span>
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
            {errors.target && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>{errors.target}</span>}
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
                placeholder="Add subpostcode (e.g., SW1A)"
                aria-label="Add subpostcode"
              />
              <button type="submit" className={styles.addButton}>
                + Add
              </button>
            </form>
            {errors.subpostcode && (
              <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', display: 'block', marginTop: '0.5rem' }}>
                {errors.subpostcode}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoopPanel({ sp, depotName, loop }: { sp: string; depotName: string; loop: ContractLoopView }) {
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
    <div className={styles.loopPanel}>
      <div className={styles.loopHeader} onClick={() => setOpen(o => !o)}>
        <h4 className={styles.loopTitle}>
          <span className={styles.loopIcon}>🔄</span>
          {loop.name}
        </h4>
      </div>

      {open && (
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
        <span className={styles.depotIcon}>📦</span>
        <h3 className={styles.depotName}>{depot.name}</h3>
      </div>

      <div className={`${styles.depotContent} ${!open ? styles.collapsed : ''}`}>
        {depot.loops.map(loop => (
          <LoopPanel key={loop.name} sp={sp} depotName={depot.name} loop={loop} />
        ))}
      </div>
    </div>
  );
}

function ProviderBlock({ sp, provider }: { sp: string; provider: ContractProviderView }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.providerBlock}>
      <div
        className={`${styles.providerHeader} ${!open ? styles.collapsed : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.providerIcon}>🏢</span>
        <h2 className={styles.providerName}>{provider.serviceProvider}</h2>
        <span className={`${styles.expandIcon} ${!open ? styles.collapsed : ''}`}>▼</span>
      </div>

      <div className={`${styles.providerContent} ${!open ? styles.collapsed : ''}`}>
        {provider.depots.map(depot => (
          <DepotCard key={depot.name} sp={sp} depot={depot} />
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
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-lg)' }}>
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text-primary)', flex: 1 }}>
          Contracts
        </h1>
        <div style={{ flex: '0 1 300px', minWidth: '200px' }}>
          <input
            type="search"
            className={styles.targetInput}
            placeholder="Search depots, loops, routes..."
            autoComplete="off"
            aria-label="Search contracts"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 'none' }}
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
            <span className={styles.metricValue}>{totalDepots}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Loops</span>
            <span className={styles.metricValue}>{totalLoops}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Routes</span>
            <span className={styles.metricValue}>{totalRoutes}</span>
          </div>
        </div>

        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>📊</span>
          <h2 className={styles.sectionTitle}>Active Contracts</h2>
        </div>

        {!isEmpty ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map(prov => (
              <ProviderBlock key={prov.serviceProvider} sp={sp} provider={prov} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3 className={styles.emptyTitle}>No Contracts Found</h3>
            <p className={styles.emptyDescription}>There are currently no contracts available for your service provider.</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
