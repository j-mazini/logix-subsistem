import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Phone, CheckCircle2 } from 'lucide-react';
import { Exception } from '../../types';
import styles from './ExceptionTriage.module.css';

interface Props {
  exceptions: Exception[];
  onResolve: (id: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  absent: 'Customer Absent',
  wrong_address: 'Wrong Address',
  unreachable: 'Unreachable',
  damaged: 'Damaged Package',
  refused: 'Refused',
};

const REASON_COLORS: Record<string, string> = {
  absent: '#f59e0b',
  wrong_address: '#ef4444',
  unreachable: '#8b5cf6',
  damaged: '#ec4899',
  refused: '#ef4444',
};

const getReasonLabel = (reason: string) => REASON_LABELS[reason] || reason;
const getReasonColor = (reason: string) => REASON_COLORS[reason] || '#6b7280';

export const ExceptionTriage = React.memo(function ExceptionTriage({ exceptions, onResolve }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeExceptions = useMemo(() => exceptions.filter(e => !e.resolved), [exceptions]);

  return (
    <div className={styles.triageContainer}>
      <div className={styles.triageHeader}>
        <h3>Exceptions</h3>
        <span className={styles.badge}>{activeExceptions.length} active</span>
      </div>

      {activeExceptions.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 className={styles.emptyIcon} />
          <p>No active exceptions</p>
          <span className={styles.emptySubtext}>Operation running smoothly</span>
        </div>
      ) : (
        <div className={styles.exceptionsList}>
          <AnimatePresence initial={false}>
          {activeExceptions.map(exc => (
            <motion.div
              key={exc.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`${styles.exceptionItem} ${expandedId === exc.id ? styles.expanded : ''}`}
              style={{ borderLeftColor: getReasonColor(exc.reason) }}
              onClick={() => setExpandedId(expandedId === exc.id ? null : exc.id)}
            >
              <div className={styles.exceptionSummary}>
                <AlertTriangle
                  className={styles.exceptionIcon}
                  color={getReasonColor(exc.reason)}
                />
                <div className={styles.exceptionInfo}>
                  <div className={styles.exceptionTitle}>
                    {getReasonLabel(exc.reason)}
                  </div>
                  <div className={styles.exceptionMeta}>
                    <span>#{exc.packageId}</span>
                    <span className={styles.separator}>•</span>
                    <span>{exc.delivererName}</span>
                  </div>
                </div>
                <div className={styles.exceptionTime}>
                  {new Date(exc.createdAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {expandedId === exc.id && (
                <div className={styles.exceptionDetails}>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Address:</span>
                    <span className={styles.detailsValue}>{exc.address}</span>
                  </div>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Reason:</span>
                    <span className={styles.detailsValue}>{getReasonLabel(exc.reason)}</span>
                  </div>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Notes:</span>
                    <span className={styles.detailsValue}>{exc.notes}</span>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.actionButton} title="Call customer">
                      <Phone className={styles.actionIcon} />
                      Call Customer
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.primary}`}
                      onClick={e => {
                        e.stopPropagation();
                        onResolve(exc.id);
                        setExpandedId(null);
                      }}
                    >
                      <CheckCircle2 className={styles.actionIcon} />
                      Resolve
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});
