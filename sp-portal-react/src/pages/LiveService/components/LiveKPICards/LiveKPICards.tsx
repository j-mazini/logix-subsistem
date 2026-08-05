import React from 'react';
import { AlertTriangle, Clock, Gauge, Package, LucideIcon } from 'lucide-react';
import { KpiCard } from '../../../VendorPerformance/VendorPerformance';
import styles from './LiveKPICards.module.css';

interface Props {
  cards: KpiCard[];
}

const ICONS: Record<string, LucideIcon> = {
  tw: Clock,
  spr: Package,
  sporH: Gauge,
  afd: AlertTriangle,
};

/** Mesmos KPIs (TW/SPR/SPOR-H/AFD) e mesmas fórmulas do Vendor Performance, só que
 * calculados para o dia de hoje da frota em vez de uma média mensal por vendor. */
export const LiveKPICards = React.memo(function LiveKPICards({ cards }: Props) {
  return (
    <div className={styles.kpiContainer}>
      {cards.map((card, index) => (
        <React.Fragment key={card.key}>
          {index > 0 && <div className={styles.divider} aria-hidden="true" />}
          <div className={styles.kpiBlock}>
            <div className={styles.kpiHeader}>
              {React.createElement(ICONS[card.key] || Gauge, { className: styles.icon })}
              <span className={styles.label}>{card.label}</span>
            </div>
            <div className={styles.kpiValue}>
              <span key={card.value} className={styles.pulse}>{card.isNA ? '—' : card.value}</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${card.barPercent}%`, background: card.barColor }}
              ></div>
            </div>
            <div className={styles.kpiSubtext}>{card.sublabel}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
});
