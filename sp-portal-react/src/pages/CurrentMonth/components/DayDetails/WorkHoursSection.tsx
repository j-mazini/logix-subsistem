import { memo } from "react";
import { formatTime, formatMinutesToTime } from "../../utils";
import { currentMonthStyles } from "../../styles";

interface WorkHoursSectionProps {
  workedHours: string;
  departTime: string | null;
  breakMinutes: number;
  arriveTime: string | null;
}

export const WorkHoursSection = memo(function WorkHoursSection({
  workedHours,
  departTime,
  breakMinutes,
  arriveTime,
}: WorkHoursSectionProps) {
  return (
    <div className={currentMonthStyles.workHoursCard}>
      <div className="text-center mb-3">
        <div className={currentMonthStyles.workHoursTotalLabel}>Total Work Hours</div>
        <div className={currentMonthStyles.workHoursTotalValue}>{workedHours}</div>
      </div>
      <div className="h-px bg-slate-200 my-3" />
      <div className="grid grid-cols-3 gap-4 pt-3">
        <div className="text-center flex flex-col min-h-[clamp(3.5rem,10vh,4rem)]">
          <div className={currentMonthStyles.workHoursLabel}>
            Departure Time
          </div>
          <div className={currentMonthStyles.workHoursValue}>
            {departTime ? formatTime(departTime) : "--:--"}
          </div>
        </div>
        <div className="text-center flex flex-col min-h-[clamp(3.5rem,10vh,4rem)]">
          <div className={currentMonthStyles.workHoursLabel}>
            Break Time
          </div>
          <div className={currentMonthStyles.workHoursValue}>
            {formatMinutesToTime(breakMinutes)}
          </div>
        </div>
        <div className="text-center flex flex-col min-h-[clamp(3.5rem,10vh,4rem)]">
          <div className={currentMonthStyles.workHoursLabel}>
            Arrival Time
          </div>
          <div className={currentMonthStyles.workHoursValue}>
            {arriveTime ? formatTime(arriveTime) : "--:--"}
          </div>
        </div>
      </div>
    </div>
  );
});
