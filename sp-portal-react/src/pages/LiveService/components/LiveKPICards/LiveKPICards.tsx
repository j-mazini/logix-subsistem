import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { LiveMetrics } from '../../types';
import styles from './LiveKPICards.module.css';

interface Props {
  metrics: LiveMetrics;
}

export function LiveKPICards({ metrics }: Props) {
  const successRate = metrics.totalToday > 0 ? Math.round((metrics.delivered / metrics.totalToday) * 100) : 0;
  const failureCount =
    metrics.absent +
    metrics.wrongAddress +
    metrics.unreachable +
    metrics.damaged +
    metrics.refused;

  return (
    <div className={styles.kpiContainer}>
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <BarChart3 className={styles.icon} />
          <span className={styles.label}>Total Entregas Hoje</span>
        </div>
        <div className={styles.kpiValue}>{metrics.totalToday}</div>
        <div className={styles.kpiSubtext}>pacotes para rota</div>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <TrendingUp className={styles.icon} />
          <span className={styles.label}>Progresso Atual</span>
        </div>
        <div className={styles.kpiValue}>{metrics.percentComplete}%</div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${metrics.percentComplete}%` }}
          ></div>
        </div>
        <div className={styles.kpiSubtext}>{metrics.delivered} de {metrics.totalToday} concluídos</div>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <AlertCircle className={styles.icon} />
          <span className={styles.label}>Sucesso vs Insucesso</span>
        </div>
        <div className={styles.successMetric}>
          <div className={styles.metricPart}>
            <span className={styles.successValue}>{successRate}%</span>
            <span className={styles.metricLabel}>Entregues</span>
          </div>
          <div className={styles.metricSeparator} aria-hidden="true" />
          <div className={styles.metricPart}>
            <span className={styles.failureValue}>{failureCount}</span>
            <span className={styles.metricLabel}>Falhas</span>
          </div>
        </div>
      </div>

      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <Clock className={styles.icon} />
          <span className={styles.label}>Tempo Médio/Parada</span>
        </div>
        <div className={styles.kpiValue}>{metrics.avgTimePerStop.toFixed(1)} min</div>
        <div className={styles.kpiSubtext}>entre scans do scanner</div>
      </div>
    </div>
  );
}
