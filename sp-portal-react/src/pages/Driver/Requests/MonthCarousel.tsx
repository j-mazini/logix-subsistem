import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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

/** Horizontally-scrolling month picker for the History tab — own scoped
 *  rebuild of the reference app's deductions/components/MonthCarousel.tsx
 *  (that component lives in a sibling page we don't own), using plain
 *  Tailwind instead of a shared stylesheet. Auto-centers the active month. */
export const MonthCarousel = memo<MonthCarouselProps>(({ months, onMonthClick }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const activeEl = activeRef.current;
    if (!scrollEl || !activeEl) return;
    const timer = setTimeout(() => {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 80);
    return () => clearTimeout(timer);
  }, [months]);

  return (
    <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {months.map((item) => {
        const active = item.isSelected;
        const [monthName, year] = item.label.split('/');
        return (
          <motion.button
            key={`${item.year}-${item.month}`}
            ref={active ? activeRef : undefined}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => !active && onMonthClick(item.year, item.month)}
            className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/70 text-slate-600 border border-slate-200/80 hover:bg-white'
            }`}
          >
            <span>{monthName}</span>
            <span className={`text-[0.65rem] font-medium ${active ? 'text-emerald-50' : 'text-slate-400'}`}>{year}</span>
          </motion.button>
        );
      })}
    </div>
  );
});

MonthCarousel.displayName = 'MonthCarousel';
