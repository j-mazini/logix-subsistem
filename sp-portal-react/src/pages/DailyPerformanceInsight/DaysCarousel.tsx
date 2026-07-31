import React, { useEffect, useRef, useMemo, type ReactElement } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { dailyPerformanceInsightStyles } from "./styles";

interface DaysCarouselProps {
  displayMonth: Date;
  selectedDate: Date;
  onDayClick: (day: number) => void;
  hasNoData?: boolean;
  isLoading?: boolean;
}

export const DaysCarousel = React.memo<DaysCarouselProps>(({
  displayMonth,
  selectedDate,
  onDayClick,
  hasNoData = false,
  isLoading = false
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToActive = () => {
      const activeElement = carouselRef.current?.querySelector('[data-day-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    };

    const timeout1 = setTimeout(scrollToActive, 100);
    const timeout2 = setTimeout(scrollToActive, 300);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [selectedDate, displayMonth]);

  const carouselItems = useMemo(() => {
    const items: ReactElement[] = [];
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isSelected = format(d, "yyyy-MM-dd") === selectedDateStr;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const hasNoDataForDay = isSelected && !isLoading && hasNoData;
      const shouldDim = isWeekend && (!isSelected || hasNoDataForDay);

      items.push(
        <motion.button
          key={day}
          type="button"
          role="option"
          aria-selected={isSelected}
          data-day-active={isSelected}
          onClick={() => onDayClick(day)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          animate={{ opacity: shouldDim ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          className={`${dailyPerformanceInsightStyles.dayCardBase} ${isSelected ? dailyPerformanceInsightStyles.dayCardSelected : dailyPerformanceInsightStyles.dayCardUnselected}`}
        >
          <div className={`${dailyPerformanceInsightStyles.dayCardNumber} ${isSelected ? dailyPerformanceInsightStyles.dayCardNumberSelected : ''}`}>
            {format(d, "d")}
          </div>
          <div className={`${dailyPerformanceInsightStyles.dayCardWeekday} ${isSelected ? dailyPerformanceInsightStyles.dayCardWeekdaySelected : dailyPerformanceInsightStyles.dayCardWeekdayUnselected}`}>
            {format(d, "EEE")}
          </div>
        </motion.button>
      );
    }
    return items;
  }, [displayMonth, selectedDate, hasNoData, isLoading, onDayClick]);

  return (
    <div className={dailyPerformanceInsightStyles.daysCarouselWrapper}>
      <div
        ref={carouselRef}
        className={dailyPerformanceInsightStyles.daysCarouselScroll}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {carouselItems}
      </div>
    </div>
  );
});

DaysCarousel.displayName = 'DaysCarousel';
