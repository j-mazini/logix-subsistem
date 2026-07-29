import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { LiveMetrics } from '../../types';
import styles from './LiveKPICards.module.css';

interface Props {
  metrics: LiveMetrics;
}

export const LiveKPICards = React.memo(function LiveKPICards({ metrics }: Props) {
  const successRate = metrics.totalToday > 0 ? Math.round((metrics.delivered / metrics.totalToday) * 100) : 0;
  const failureCount =
    metrics.absent +
    metrics.wrongAddress +
    metrics.unreachable +
    metrics.damaged +
    metrics.refused;

  return (
    <div className={styles.kpiContainer}>
      <div className={styles.kpiBlock}>
        <div className={styles.kpiHeader}>
          <BarChart3 className={styles.icon} />
          <span className={styles.label}>Total Today</span>
        </div>
        <div className={styles.kpiValue}>
          <span key={metrics.totalToday} className={styles.pulse}>{metrics.totalToday}</span>
        </div>
        <div className={styles.kpiSubtext}>packages on route</div>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.kpiBlock}>
        <div className={styles.kpiHeader}>
          <TrendingUp className={styles.icon} />
          <span className={styles.label}>Progress</span>
        </div>
        <div className={styles.kpiValue}>
          <span key={metrics.percentComplete} className={styles.pulse}>{metrics.percentComplete}%</span>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${metrics.percentComplete}%` }}
          ></div>
        </div>
        <div className={styles.kpiSubtext}>{metrics.delivered} of {metrics.totalToday}</div>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.kpiBlock}>
        <div className={styles.kpiHeader}>
          <AlertCircle className={styles.icon} />
          <span className={styles.label}>Success vs Failure</span>
        </div>
        <div className={styles.successMetric}>
          <div className={styles.metricPart}>
            <span className={styles.successValue}>
              <span key={successRate} className={styles.pulse}>{successRate}%</span>
            </span>
            <span className={styles.metricLabel}>Delivered</span>
          </div>
          <div className={styles.metricSeparator} aria-hidden="true" />
          <div className={styles.metricPart}>
            <span className={styles.failureValue}>
              <span key={failureCount} className={styles.pulse}>{failureCount}</span>
            </span>
            <span className={styles.metricLabel}>Failed</span>
          </div>
        </div>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.kpiBlock}>
        <div className={styles.kpiHeader}>
          <Clock className={styles.icon} />
          <span className={styles.label}>Time/Stop</span>
        </div>
        <div className={styles.kpiValue}>
          <span key={metrics.avgTimePerStop} className={styles.pulse}>{metrics.avgTimePerStop.toFixed(1)}</span>{' '}
          <span className={styles.unit}>min</span>
        </div>
        <div className={styles.kpiSubtext}>avg. between scans</div>
      </div>
    </div>
  );
});
