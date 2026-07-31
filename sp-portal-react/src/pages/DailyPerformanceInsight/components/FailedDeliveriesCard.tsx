import React from 'react';
import { motion } from 'framer-motion';
import { UnpaidStops } from '../types';
import { dailyPerformanceInsightStyles } from '../styles';

interface FailedDeliveriesCardProps {
  unpaidStops: UnpaidStops;
}

export const FailedDeliveriesCard = React.memo<FailedDeliveriesCardProps>(({ unpaidStops }) => {
  const deliveryTypes = [
    { label: 'NR', value: unpaidStops.nr, icon: 'bi-x-circle', gradient: 'from-red-500 to-red-600' },
    { label: 'FP', value: unpaidStops.fp, icon: 'bi-exclamation-circle', gradient: 'from-orange-500 to-orange-600' },
    { label: 'BA', value: unpaidStops.ba, icon: 'bi-ban', gradient: 'from-amber-500 to-amber-600' },
    { label: 'NH', value: unpaidStops.nh, icon: 'bi-house-x', gradient: 'from-rose-500 to-rose-600' },
    { label: 'SHP', value: 0, icon: 'bi-box-seam', gradient: 'from-slate-400 to-slate-500' },
    { label: 'CM', value: unpaidStops.cm, icon: 'bi-chat-dots', gradient: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className={dailyPerformanceInsightStyles.cardBase}>
      <div className={dailyPerformanceInsightStyles.failedDeliveriesHeader}>
        <div className={dailyPerformanceInsightStyles.failedDeliveriesAccent} />
        <h3 className={dailyPerformanceInsightStyles.failedDeliveriesTitle}>
          ATTEMPTED FAILED DELIVERIES
        </h3>
      </div>
      <div className={dailyPerformanceInsightStyles.failedDeliveriesGrid}>
        {deliveryTypes.map((type, index) => (
          <motion.div
            key={type.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={dailyPerformanceInsightStyles.failedDeliveriesItem}
          >
            <div className={`${dailyPerformanceInsightStyles.failedDeliveriesIconWrapper} bg-gradient-to-br ${type.gradient}`}>
              <i className={`bi ${type.icon} ${dailyPerformanceInsightStyles.failedDeliveriesIcon}`} />
            </div>
            <span className={dailyPerformanceInsightStyles.failedDeliveriesLabel}>
              {type.label}
            </span>
            <span className={dailyPerformanceInsightStyles.failedDeliveriesValue}>
              {type.value}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

FailedDeliveriesCard.displayName = 'FailedDeliveriesCard';
