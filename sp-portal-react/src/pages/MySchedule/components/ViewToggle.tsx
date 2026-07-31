import { myScheduleStyles as s } from "../styles";
import type { ScheduleViewMode } from "../types";

interface ViewToggleProps {
  value: ScheduleViewMode;
  onChange: (value: ScheduleViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className={s.viewToggleWrap} role="tablist" aria-label="Schedule view">
      <button
        type="button"
        role="tab"
        aria-selected={value === "day"}
        onClick={() => onChange("day")}
        className={`${s.viewToggleButton} ${value === "day" ? s.viewToggleButtonActive : s.viewToggleButtonInactive}`}
      >
        <i className="bi bi-calendar-day" aria-hidden="true" />
        Day
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "week"}
        onClick={() => onChange("week")}
        className={`${s.viewToggleButton} ${value === "week" ? s.viewToggleButtonActive : s.viewToggleButtonInactive}`}
      >
        <i className="bi bi-calendar-week" aria-hidden="true" />
        Week
      </button>
    </div>
  );
}
