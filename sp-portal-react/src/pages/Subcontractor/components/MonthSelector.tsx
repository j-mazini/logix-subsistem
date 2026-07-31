import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { subcontractorStyles } from "../styles";

interface MonthSelectorProps {
  date: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthSelector = memo(function MonthSelector({ date, onPrevMonth, onNextMonth }: MonthSelectorProps) {
  const monthYear = format(date, "MMMM yyyy", { locale: enUS });
  const [month, year] = monthYear.split(' ');

  return (
    <motion.div
      layoutId="month-selector"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={subcontractorStyles.monthSelectorContainer}
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
        className={subcontractorStyles.monthSelectorNavButton}
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
            <span className="text-[clamp(0.95rem,3.6vw,1.125rem)] font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
              {month}
            </span>
            <span className={subcontractorStyles.monthSelectorYear}>
              {year}
            </span>
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
        className={subcontractorStyles.monthSelectorNavButton}
      >
        <i className="bi bi-chevron-right text-[clamp(0.625rem,2.6vw,0.75rem)]" />
      </motion.button>
    </motion.div>
  );
});
