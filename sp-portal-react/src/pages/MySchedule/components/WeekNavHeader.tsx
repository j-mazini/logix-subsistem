import { format } from "date-fns";
import { myScheduleStyles as s } from "../styles";
import { STATUS_DOT_CLASS } from "../statusMeta";
import type { ScheduleDay } from "../types";

interface WeekNavHeaderProps {
  weekStart: Date;
  weekDays: ScheduleDay[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
  showDayChips?: boolean;
}

export function WeekNavHeader({
  weekStart,
  weekDays,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  isCurrentWeek,
  showDayChips = true,
}: WeekNavHeaderProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const rangeLabel = `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`;
  const selectedISO = format(selectedDate, "yyyy-MM-dd");

  return (
    <div className={s.weekNavCard}>
      <div className={s.weekNavRow}>
        <button type="button" className={s.weekNavArrow} onClick={onPrevWeek} aria-label="Previous week">
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <div className={s.weekNavCenter}>
          <span className={s.weekNavLabel}>{rangeLabel}</span>
          {!isCurrentWeek && (
            <button type="button" className={s.weekNavTodayButton} onClick={onToday}>
              Back to today
            </button>
          )}
        </div>
        <button type="button" className={s.weekNavArrow} onClick={onNextWeek} aria-label="Next week">
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      {showDayChips && (
        <div className={s.weekStripRow}>
          {weekDays.map((day) => {
            const dayDate = new Date(`${day.date}T00:00:00`);
            const isSelected = day.date === selectedISO;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(dayDate)}
                className={`${s.dayChipBase} ${isSelected ? s.dayChipSelected : s.dayChipUnselected}`}
              >
                <span className={s.dayChipWeekday}>{format(dayDate, "EEE")}</span>
                <span className={s.dayChipNumber}>{format(dayDate, "d")}</span>
                <span className={`${s.dayChipDot} ${isSelected ? "bg-white/80" : STATUS_DOT_CLASS[day.status]}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
