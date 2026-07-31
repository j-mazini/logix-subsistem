import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { dailyPerformanceInsightStyles } from '../styles';

interface MonthSelectorProps {
  displayMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthSelector = React.memo<MonthSelectorProps>(({
  displayMonth,
  onPrevMonth,
  onNextMonth
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={dailyPerformanceInsightStyles.monthSelectorContainer}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPrevMonth();
        }}
        aria-label="Previous month"
        className={dailyPerformanceInsightStyles.monthSelectorNavButton}
      >
        <i className={dailyPerformanceInsightStyles.monthSelectorNavIcon} />
      </motion.button>

      <span className={dailyPerformanceInsightStyles.monthSelectorText}>
        {format(displayMonth, "MMMM yyyy", { locale: enUS })}
      </span>

      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onNextMonth();
        }}
        aria-label="Next month"
        className={dailyPerformanceInsightStyles.monthSelectorNavButton}
      >
        <i className={dailyPerformanceInsightStyles.monthSelectorNavIconRight} />
      </motion.button>
    </motion.div>
  );
});

MonthSelector.displayName = 'MonthSelector';
