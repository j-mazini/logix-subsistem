import React, { useEffect } from 'react';
import { AlertTriangle, Ban, Car, CheckCircle2, Clock, User, X } from 'lucide-react';
import { HazardReport, HazardType } from '../../types';
import styles from './HazardDetailPanel.module.css';

interface Props {
  hazard: HazardReport;
  onClose: () => void;
  onClear: (id: string) => void;
}

const HAZARD_CONFIG: Record<HazardType, { label: string; color: string; Icon: typeof Ban }> = {
  road_closed: { label: 'Road Closed', color: '#ef4444', Icon: Ban },
  accident: { label: 'Accident', color: '#f97316', Icon: Car },
  hazard: { label: 'Hazard', color: '#f59e0b', Icon: AlertTriangle },
};

/** Painel encaixado na lateral do mapa com o detalhe de um relato de campo. */
export function HazardDetailPanel({ hazard, onClose, onClear }: Props) {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  const config = HAZARD_CONFIG[hazard.type];
  const Icon = config.Icon;

  return (
    <div className={styles.panel} role="dialog" aria-label={`${config.label} report details`}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.iconBadge} style={{ backgroundColor: config.color }}>
            <Icon className={styles.icon} />
          </span>
          <div>
            <h3 className={styles.title}>{config.label}</h3>
            <span className={styles.subtitle}>Field report</span>
          </div>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X className={styles.closeIcon} />
        </button>
      </div>

      <div className={styles.metaList}>
        <div className={styles.metaRow}>
          <User className={styles.metaIcon} />
          <span>
            Reported by <strong>{hazard.reportedBy}</strong>
          </span>
        </div>
        <div className={styles.metaRow}>
          <Clock className={styles.metaIcon} />
          <span>
            {new Date(hazard.createdAt).toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      <div className={styles.noteSection}>
        <h4 className={styles.noteLabel}>What happened</h4>
        <p className={styles.noteText}>{hazard.note || 'No further details were provided.'}</p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => {
            onClear(hazard.id);
            onClose();
          }}
        >
          <CheckCircle2 className={styles.clearIcon} />
          Clear Report
        </button>
      </div>
    </div>
  );
}
