import { format } from "date-fns";
import { myScheduleStyles as s } from "../styles";
import { StatusBadge } from "./StatusBadge";
import { toISODate } from "../mock/mockMyScheduleData";
import type { ScheduleDay } from "../types";

interface WeekListProps {
  weekDays: ScheduleDay[];
  onSelectDay: (date: Date) => void;
}

export function WeekList({ weekDays, onSelectDay }: WeekListProps) {
  const todayISO = toISODate(new Date());

  return (
    <div className={s.weekListWrap}>
      {weekDays.map((day) => {
        const date = new Date(`${day.date}T00:00:00`);
        const isToday = day.date === todayISO;
        const isWorking = day.status === "Working";

        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelectDay(date)}
            className={`${s.weekListRow} ${isToday ? s.weekListRowToday : ""} w-full text-left`}
          >
            <div className={s.weekListDateBlock}>
              <span className={s.weekListDateWeekday}>{format(date, "EEE")}</span>
              <span className={s.weekListDateNumber}>{format(date, "d")}</span>
            </div>
            <div className={s.weekListBody}>
              <div className={s.weekListRouteRow}>
                <span className={s.weekListRoute}>
                  {isWorking ? day.route : day.status}
                </span>
                {day.isTeamLeader && <i className="bi bi-star-fill text-amber-500 text-xs" aria-hidden="true" />}
              </div>
              {isWorking && (
                <div className={s.weekListMeta}>
                  {day.vehicle} · {day.registrationPlate}
                </div>
              )}
            </div>
            <StatusBadge status={day.status} />
          </button>
        );
      })}
    </div>
  );
}
