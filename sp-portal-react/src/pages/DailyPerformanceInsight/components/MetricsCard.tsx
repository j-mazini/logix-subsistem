import React from 'react';
import { motion } from 'framer-motion';
import { getTWColorClass, formatPercentage } from '../utils';
import { dailyPerformanceInsightStyles } from '../styles';

interface MetricsCardProps {
  spr: number;
  sporh: string;
  tw: number;
  afd: number;
}

export const MetricsCard = React.memo<MetricsCardProps>(({ spr, sporh, tw, afd }) => {
  const twColorClass = getTWColorClass(tw);

  const getValueColorClass = (type: string, colorClass?: string) => {
    if (type === 'tw' && colorClass) {
      const colorMap: Record<string, string> = {
        success: dailyPerformanceInsightStyles.metricsCardValueSuccess,
        warning: dailyPerformanceInsightStyles.metricsCardValueWarning,
        orange: dailyPerformanceInsightStyles.metricsCardValueOrange,
        danger: dailyPerformanceInsightStyles.metricsCardValueDanger
      };
      return colorMap[colorClass] || dailyPerformanceInsightStyles.metricsCardValueNeutral;
    }
    if (type === 'afd') return dailyPerformanceInsightStyles.metricsCardValueAfd;
    return dailyPerformanceInsightStyles.metricsCardValueNeutral;
  };

  const getIconGradient = (type: string) => {
    switch (type) {
      case 'spr':
        return 'from-blue-500 to-blue-400';
      case 'sporh':
        return 'from-violet-500 to-violet-400';
      case 'tw':
        return twColorClass === 'success'
          ? 'from-emerald-500 to-emerald-400'
          : twColorClass === 'warning'
          ? 'from-amber-500 to-amber-400'
          : twColorClass === 'orange'
          ? 'from-orange-500 to-orange-400'
          : 'from-rose-500 to-rose-400';
      case 'afd':
        return 'from-rose-500 to-rose-400';
      default:
        return 'from-slate-500 to-slate-400';
    }
  };

  const metrics = [
    { label: 'SPR', value: spr, type: 'spr', icon: 'bi-speedometer2' },
    { label: 'SPOR-H', value: sporh, type: 'sporh', icon: 'bi-graph-up-arrow' },
    { label: 'TW', value: formatPercentage(tw / 100), type: 'tw', icon: 'bi-clock', colorClass: getValueColorClass('tw', twColorClass) },
    { label: 'AFD', value: `${afd}%`, type: 'afd', icon: 'bi-exclamation-triangle', colorClass: getValueColorClass('afd') },
  ];

  return (
    <div className={dailyPerformanceInsightStyles.metricsCardGrid}>
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={dailyPerformanceInsightStyles.metricsCardItem}
        >
          <div className={dailyPerformanceInsightStyles.metricsCardHeader}>
            <div className={`${dailyPerformanceInsightStyles.metricsCardIconWrapper} bg-gradient-to-br ${getIconGradient(metric.type)}`}>
              <i className={`bi ${metric.icon} ${dailyPerformanceInsightStyles.metricsCardIcon}`} />
            </div>
            <span className={dailyPerformanceInsightStyles.metricsCardLabel}>
              {metric.label}
            </span>
          </div>
          <span className={`${dailyPerformanceInsightStyles.metricsCardValue} ${metric.colorClass || dailyPerformanceInsightStyles.metricsCardValueDefault}`}>
            {metric.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
});

MetricsCard.displayName = 'MetricsCard';
