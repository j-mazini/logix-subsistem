import { myScheduleStyles as s } from "../styles";
import { STATUS_ICON } from "../statusMeta";
import type { ShiftStatus } from "../types";

const STATUS_CLASS: Record<ShiftStatus, string> = {
  Working: s.statusWorking,
  "Day Off": s.statusDayOff,
  Holiday: s.statusHoliday,
  Sick: s.statusSick,
};

export function StatusBadge({ status }: { status: ShiftStatus }) {
  return (
    <span className={`${s.statusBadgeBase} ${STATUS_CLASS[status]}`}>
      <i className={`bi ${STATUS_ICON[status]}`} aria-hidden="true" />
      {status}
    </span>
  );
}
