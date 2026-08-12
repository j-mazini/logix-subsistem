import { useRef, useEffect, useMemo, memo, type ReactElement } from 'react';
import { format } from 'date-fns';
import { DayCard } from './DayCard';
import { profileStyles } from '../styles';

interface DaysCarouselProps {
  date: Date;
  loading: boolean;
  hasData: boolean;
  hasError: boolean;
  onDateSelect: (date: Date) => void;
}

export const DaysCarousel = memo(function DaysCarousel({
  date,
  loading,
  hasData,
  hasError,
  onDateSelect,
}: DaysCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Scroll to active day when date changes
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
  }, [date]);

  // Memoize carousel items for performance
  const carouselItems = useMemo(() => {
    const items: ReactElement[] = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selectedDateStr = format(date, 'yyyy-MM-dd');

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const isSelected = format(d, 'yyyy-MM-dd') === selectedDateStr;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const hasNoData = isSelected && !loading && (!hasData || hasError);

      items.push(
        <DayCard
          key={day}
          date={d}
          isSelected={isSelected}
          isWeekend={isWeekend}
          hasNoData={hasNoData}
          onSelect={() => onDateSelect(d)}
        />
      );
    }
    return items;
  }, [date, loading, hasData, hasError, onDateSelect]);

  return (
    <div className={profileStyles.daysCarouselWrapper}>
      <div className={profileStyles.daysCarouselBackground} />

      <div
        ref={carouselRef}
        className={profileStyles.daysCarouselScroll}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
        }}
      >
        {carouselItems}
      </div>
    </div>
  );
});
