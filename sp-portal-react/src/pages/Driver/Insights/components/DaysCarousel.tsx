import { useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatDateISO } from '../utils';
import { dailyPerformanceInsightStyles } from '../styles';

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaysCarouselProps {
  displayMonth: Date;
  selectedDate: Date;
  onDayClick: (day: number) => void;
  hasNoData?: boolean;
  isLoading?: boolean;
}

export function DaysCarousel({ displayMonth, selectedDate, onDayClick, hasNoData = false, isLoading = false }: DaysCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll the carousel to the active day whenever the page loads or the date changes.
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
    const items: JSX.Element[] = [];
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selectedDateStr = formatDateISO(selectedDate);

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isSelected = formatDateISO(d) === selectedDateStr;
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
            {day}
          </div>
          <div
            className={`${dailyPerformanceInsightStyles.dayCardWeekday} ${isSelected ? dailyPerformanceInsightStyles.dayCardWeekdaySelected : dailyPerformanceInsightStyles.dayCardWeekdayUnselected}`}
          >
            {WEEKDAY_NAMES[d.getDay()]}
          </div>
        </motion.button>,
      );
    }
    return items;
  }, [displayMonth, selectedDate, hasNoData, isLoading, onDayClick]);

  return (
    <div className={dailyPerformanceInsightStyles.daysCarouselWrapper}>
      <div ref={carouselRef} className={dailyPerformanceInsightStyles.daysCarouselScroll} style={{ scrollSnapType: 'x mandatory' }}>
        {carouselItems}
      </div>
    </div>
  );
}
