import { format } from "date-fns";
import { myScheduleStyles as s } from "../styles";
import { StatusBadge } from "./StatusBadge";
import { STATUS_ICON } from "../statusMeta";
import type { ScheduleDay } from "../types";

export function DayDetailCard({ day }: { day: ScheduleDay }) {
  const date = new Date(`${day.date}T00:00:00`);
  const isWorking = day.status === "Working";

  return (
    <div className={s.detailCard}>
      <div className={s.detailHeaderRow}>
        <div>
          <div className={s.detailDateLabel}>{format(date, "EEEE, d MMMM")}</div>
          <div className={s.detailWeekdayLabel}>{format(date, "yyyy")}</div>
        </div>
        <StatusBadge status={day.status} />
      </div>

      {day.isTeamLeader && (
        <span className={s.teamLeaderBadge}>
          <i className="bi bi-star-fill" aria-hidden="true" /> Team Leader duty
        </span>
      )}

      {isWorking ? (
        <>
          <div className={s.detailInfoGrid}>
            <div className={s.infoTile}>
              <div className={s.infoTileLabel}>Route</div>
              <div className={s.infoTileValue}>{day.route}</div>
            </div>
            <div className={s.infoTile}>
              <div className={s.infoTileLabel}>Vehicle</div>
              <div className={s.infoTileValue}>{day.vehicle}</div>
            </div>
            <div className={s.infoTile}>
              <div className={s.infoTileLabel}>Registration</div>
              <div className={s.infoTileValue}>{day.registrationPlate}</div>
            </div>
          </div>

          {day.notes && (
            <div className={s.notesBox}>
              <i className={s.notesIcon} aria-hidden="true" />
              <span>{day.notes}</span>
            </div>
          )}
        </>
      ) : (
        <div className={s.offDayWrap}>
          <i className={`bi ${STATUS_ICON[day.status]} ${s.offDayIcon}`} aria-hidden="true" />
          <span className={s.offDayText}>
            {day.status === "Day Off" && "No shift scheduled — enjoy your day off."}
            {day.status === "Holiday" && "You're on holiday this day."}
            {day.status === "Sick" && "Marked as sick leave."}
          </span>
        </div>
      )}
    </div>
  );
}
