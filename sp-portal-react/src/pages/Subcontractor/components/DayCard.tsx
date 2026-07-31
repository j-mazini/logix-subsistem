import { memo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface DayCardProps {
  date: Date;
  isSelected: boolean;
  isWeekend: boolean;
  hasNoData: boolean;
  onSelect: () => void;
  index?: number;
}

export const DayCard = memo(function DayCard({
  date,
  isSelected,
  isWeekend,
  hasNoData,
  onSelect,
}: DayCardProps) {
  const shouldDim = isWeekend && (!isSelected || hasNoData);

  return (
    <motion.button
      type="button"
      role="option"
      aria-selected={isSelected}
      data-day-active={isSelected ? "true" : "false"}
      onClick={onSelect}
      animate={{ opacity: shouldDim ? 0.4 : 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative min-w-[clamp(3rem,12vw,3.5rem)] h-[clamp(3.75rem,16vw,4.25rem)] rounded-2xl
        flex flex-col items-center justify-center
        transition-all duration-300 flex-shrink-0
        snap-center cursor-pointer overflow-hidden
        border-2
        ${isSelected
          ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 text-white border-indigo-400/50 shadow-xl scale-105'
          : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 shadow-sm hover:shadow-lg'
        }
      `}
    >
      {isSelected && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}
        />
      )}

      <div className="relative z-10">
        <div className={`text-[clamp(1.25rem,4.6vw,1.5rem)] font-bold leading-none ${isSelected ? 'drop-shadow-sm' : ''}`}>
          {format(date, "d")}
        </div>
        <div className={`text-[0.7rem] mt-1 font-semibold uppercase tracking-wide ${isSelected ? 'opacity-90' : 'opacity-70'}`}>
          {format(date, "EEE")}
        </div>
      </div>

      {isSelected && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/50 rounded-b-2xl" />
      )}
    </motion.button>
  );
});
