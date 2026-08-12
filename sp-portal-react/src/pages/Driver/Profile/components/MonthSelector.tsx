import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { profileStyles } from '../styles';

interface MonthSelectorProps {
  date: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthSelector = memo(function MonthSelector({ date, onPrevMonth, onNextMonth }: MonthSelectorProps) {
  const monthYear = format(date, 'MMMM yyyy');
  const [month, year] = monthYear.split(' ');

  return (
    <motion.div
      layoutId="profile-month-selector"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={profileStyles.monthSelectorContainer}
    >
      <motion.button
        type="button"
        whileHover={{ scale: 1.1, x: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPrevMonth();
        }}
        aria-label="Previous month"
        className={profileStyles.monthSelectorNavButton}
      >
        <i className="bi bi-chevron-left text-[clamp(0.625rem,2.6vw,0.75rem)]" />
      </motion.button>

      <div className="flex-1 text-center min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={monthYear}
            initial={{ opacity: 0, rotateX: -90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 90 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <span className={profileStyles.monthSelectorMonth}>{month}</span>
            <span className={profileStyles.monthSelectorYear}>{year}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.1, x: 2 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onNextMonth();
        }}
        aria-label="Next month"
        className={profileStyles.monthSelectorNavButton}
      >
        <i className="bi bi-chevron-right text-[clamp(0.625rem,2.6vw,0.75rem)]" />
      </motion.button>
    </motion.div>
  );
});
