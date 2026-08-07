import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { deductionsStyles } from '../styles';

interface MonthCarouselItem {
  year: number;
  month: number;
  label: string;
  isSelected: boolean;
}

interface MonthCarouselProps {
  months: MonthCarouselItem[];
  onMonthClick: (year: number, month: number) => void;
}

export const MonthCarousel = memo<MonthCarouselProps>(({ months, onMonthClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);

  const activeIndex = months.findIndex((item) => item.isSelected);

  // Re-center the active month whenever selection changes.
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const itemsContainer = itemsContainerRef.current;
    if (!scrollContainer || !itemsContainer || activeIndex === -1) return;

    const centerActive = () => {
      const activeButton = itemsContainer.querySelector<HTMLButtonElement>('.carousel-month-item-active');
      if (!activeButton) return;

      const scrollRect = scrollContainer.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const containerCenter = scrollRect.left + scrollRect.width / 2;
      const scrollDelta = buttonCenter - containerCenter;
      const newScrollLeft = scrollContainer.scrollLeft + scrollDelta;
      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      const finalScroll = Math.max(0, Math.min(newScrollLeft, maxScroll));

      scrollContainer.scrollTo({ left: finalScroll, behavior: 'smooth' });
    };

    // A few retries cover late layout/font settling, same as the reference.
    const timers = [100, 300, 500, 700].map((delay) => setTimeout(centerActive, delay));
    return () => timers.forEach(clearTimeout);
  }, [activeIndex, months]);

  return (
    <section className={deductionsStyles.monthCarouselSection}>
      <div ref={scrollContainerRef} className={deductionsStyles.monthCarouselScroll}>
        <div className={deductionsStyles.monthCarouselItems} ref={itemsContainerRef}>
          {months.map((item) => {
            const active = item.isSelected;
            const uniqueKey = `${item.year}-${item.month}`;

            return (
              <motion.button
                key={uniqueKey}
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={`carousel-month-item${active ? '-active' : ''} ${deductionsStyles.monthCarouselButtonBase} ${
                  active ? deductionsStyles.monthCarouselButtonActive : deductionsStyles.monthCarouselButtonInactive
                }`}
                onClick={() => {
                  if (!active) onMonthClick(item.year, item.month);
                }}
              >
                <span className={deductionsStyles.monthCarouselButtonLabel}>
                  <span>{item.label.split('/')[0]}</span>
                  <span className={deductionsStyles.monthCarouselButtonYear}>{item.year}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

MonthCarousel.displayName = 'MonthCarousel';
