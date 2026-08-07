import { motion } from 'framer-motion';
import { dailyPerformanceInsightStyles } from '../styles';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthSelectorProps {
  displayMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function MonthSelector({ displayMonth, onPrevMonth, onNextMonth }: MonthSelectorProps) {
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
        {MONTH_NAMES[displayMonth.getMonth()]} {displayMonth.getFullYear()}
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
}
