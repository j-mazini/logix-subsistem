import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { X, Truck, MapPin, Hash, Layers } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import type { ContractRouteView } from '../../../data/contractsData';
import styles from './ContractModals.module.css';

/* =====================================================
   RouteViewModal — ported from the Next.js source's
   components/RouteViewModal.tsx ("Route Dashboard" popup).

   The source fetches customer/service-type names from a backend for a
   deposit-scoped route. This app's mock model has no customers/service
   types — a route only carries type, driver, target and subpostcodes — so
   the port keeps the "quick read-only dashboard" shape but shows the
   fields that actually exist here instead of inventing backend lookups.
   ===================================================== */

export interface RouteViewTarget {
  depotName: string;
  loopName: string;
  route: ContractRouteView;
}

interface RouteViewModalProps {
  target: RouteViewTarget | null;
  onClose: () => void;
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardIcon}>{icon}</div>
      <div className={styles.statCardBody}>
        <p className={styles.statCardLabel}>{label}</p>
        <p className={styles.statCardValue}>{value}</p>
      </div>
    </div>
  );
}

export function RouteViewModal({ target, onClose }: RouteViewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(!!target);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && target) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [target, onClose]);

  if (!mounted) return null;

  const r = target?.route;

  const modalContent = (
    <AnimatePresence>
      {target && r && (
        <>
          <motion.div
            className={styles.backdrop}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className={styles.overlay}>
            <motion.div
              className={styles.modal}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Route ${r.name} details`}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>Route Dashboard</h2>
                  <p className={styles.modalSubtitle}>
                    {r.name} &middot; {target.depotName} / {target.loopName}
                  </p>
                </div>
                <button onClick={onClose} className={styles.closeButton} aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.statGrid}>
                  <StatCard icon={<Layers size={16} />} label="Type" value={r.type || '—'} />
                  <StatCard icon={<Truck size={16} />} label="Driver" value={r.driver || 'Unassigned'} />
                  <StatCard icon={<Hash size={16} />} label="Target" value={String(r.target)} />
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailSectionTitle}>
                    <MapPin size={13} /> Sub postcodes ({r.subpostcodes.length})
                  </p>
                  {r.subpostcodes.length > 0 ? (
                    <div className={styles.badgeList}>
                      {r.subpostcodes.map(sp => (
                        <span
                          key={sp}
                          className={`${styles.badge} ${r.customSubpostcodes.includes(sp) ? styles.badgeCustom : styles.badgeExtracted}`}
                        >
                          {sp}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyHint}>No sub postcodes on file for this route.</p>
                  )}
                </div>

              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={onClose}>
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
