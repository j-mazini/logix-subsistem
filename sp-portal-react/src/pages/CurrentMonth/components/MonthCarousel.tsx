import React, { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { currentMonthStyles } from '../styles';

interface MonthItem {
  year: number;
  month: number;
  label: string;
  isSelected: boolean;
}

interface MonthCarouselProps {
  months: MonthItem[];
  onMonthClick: (year: number, month: number) => void;
}

export const MonthCarousel = memo<MonthCarouselProps>(({ months, onMonthClick }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const itemsContainerRef = useRef<HTMLDivElement | null>(null);

  const activeIndex = months.findIndex(item => item.isSelected);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const itemsContainer = itemsContainerRef.current;

    if (!scrollContainer || !itemsContainer || activeIndex === -1) return;

    const centerActive = () => {
      const activeButton = itemsContainer.querySelector<HTMLButtonElement>(
        ".carousel-month-item-active"
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
  }, [activeIndex, months]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={currentMonthStyles.monthCarouselSection}
    >
      <div
        ref={scrollContainerRef}
        className={currentMonthStyles.monthCarouselScroll}
      >
        <div
          className={currentMonthStyles.monthCarouselItems}
          ref={itemsContainerRef}
        >
          {months.map((item, index) => {
            const active = item.isSelected;
            const uniqueKey = `${item.year}-${item.month}`;

            return (
              <motion.button
                key={uniqueKey}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1
                }}
                transition={{
                  delay: index * 0.02,
                  duration: 0.2
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`carousel-month-item${active ? "-active" : ""} ${
                  currentMonthStyles.monthCarouselButtonBase
                } ${
                  active
                    ? currentMonthStyles.monthCarouselButtonActive
                    : currentMonthStyles.monthCarouselButtonInactive
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!active) {
                    onMonthClick(item.year, item.month);
                  }
                }}
              >
                <span className={currentMonthStyles.monthCarouselButtonLabel}>
                  <span>{item.label.split('/')[0]}</span>
                  <span className={currentMonthStyles.monthCarouselButtonYear}>
                    {item.year}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
});

MonthCarousel.displayName = 'MonthCarousel';
