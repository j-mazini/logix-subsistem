import { useEffect, useRef, useMemo, memo, type ReactElement } from "react";
import { motion } from "framer-motion";
import { currentPerformanceStyles } from "../styles";

interface MonthCarouselProps {
  selectedYear: number;
  selectedMonth: number;
  onMonthSelect: (year: number, month: number) => void;
  today: Date;
}

export const MonthCarousel = memo(function MonthCarousel({
  selectedYear,
  selectedMonth,
  onMonthSelect,
  today,
}: MonthCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);

  const carouselItems = useMemo(() => {
    const monthsToDisplay = 12;
    const items: ReactElement[] = [];

    for (let i = -monthsToDisplay + 1; i <= 0; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      let monthName = date.toLocaleString("en-GB", { month: "short" }).replace(".", "");
      monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      const isActive = year === selectedYear && month === selectedMonth;

      items.push(
        <motion.button
          key={`${year}-${month}`}
          type="button"
          data-active={isActive}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`${currentPerformanceStyles.monthCarouselButtonBase} ${
            isActive
              ? currentPerformanceStyles.monthCarouselButtonActive
              : currentPerformanceStyles.monthCarouselButtonInactive
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMonthSelect(year, month);
          }}
        >
          <span className={currentPerformanceStyles.monthCarouselButtonLabel}>
            <span>{monthName}</span>
            <span className={currentPerformanceStyles.monthCarouselButtonYear}>
              {year}
            </span>
          </span>
        </motion.button>
      );
    }

    return items;
  }, [today, selectedYear, selectedMonth, onMonthSelect]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const itemsContainer = itemsContainerRef.current;

    if (!scrollContainer || !itemsContainer) return;

    const centerActive = () => {
      const activeButton = itemsContainer.querySelector<HTMLButtonElement>(
        '[data-active="true"]'
      );

      if (!activeButton) return;

      const scrollRect = scrollContainer.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const buttonCenter = buttonRect.left + (buttonRect.width / 2);
      const containerCenter = scrollRect.left + (scrollRect.width / 2);

      const scrollDelta = buttonCenter - containerCenter;
      const newScrollLeft = scrollContainer.scrollLeft + scrollDelta;

      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      const finalScroll = Math.max(0, Math.min(newScrollLeft, maxScroll));

      scrollContainer.scrollTo({
        left: finalScroll,
        behavior: "smooth"
      });
    };

    const timer1 = setTimeout(centerActive, 100);
    const timer2 = setTimeout(centerActive, 300);
    const timer3 = setTimeout(centerActive, 500);
    const timer4 = setTimeout(centerActive, 700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [selectedYear, selectedMonth, carouselItems]);

  return (
    <section className={currentPerformanceStyles.monthCarouselSection}>
      <div
        ref={scrollContainerRef}
        className={currentPerformanceStyles.monthCarouselScroll}
      >
        <div
          ref={itemsContainerRef}
          className={currentPerformanceStyles.monthCarouselItems}
        >
          {carouselItems}
        </div>
      </div>
    </section>
  );
});
