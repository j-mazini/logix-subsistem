import { useMemo, memo } from "react";
import { DayData } from "../dataProcessor";
import { getSporHClass, getTimeWindowClass } from "../utils";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { currentPerformanceStyles } from "../styles";

interface DailyBreakdownTableProps {
  monthData: DayData[];
  loading: boolean;
  error: string | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const getColorClass = (className: string): string => {
  if (className === "positive-value") return currentPerformanceStyles.valuePositive;
  if (className === "warning-value") return currentPerformanceStyles.valueWarning;
  if (className === "negative-value") return currentPerformanceStyles.valueNegative;
  if (className === "neutral-value") return currentPerformanceStyles.valueNeutral;
  if (className === "na-value") return currentPerformanceStyles.valueNA;
  return "";
};

const TableRow = memo(function TableRow({ dayData, index }: { dayData: DayData; index: number }) {
  const dayOfWeekName = WEEKDAYS[dayData.dayOfWeek];
  const isSaturday = dayData.dayOfWeek === 6;

  const sporHClass = useMemo(() => {
    if (dayData.sporH === "N/A" || dayData.sporH === "--:--") return "na-value";
    return getSporHClass(dayData.sporH);
  }, [dayData.sporH]);

  const twClass = useMemo(() => {
    if (dayData.tw === "N/A" || dayData.tw === "--:--") return "na-value";
    return getTimeWindowClass(dayData.tw);
  }, [dayData.tw]);

  const sprClass = useMemo(() => {
    if (dayData.spr === "N/A" || dayData.spr === "--:--") return "na-value";
    return dayData.sprClass || "neutral-value";
  }, [dayData.spr, dayData.sprClass]);

  const routeClass = useMemo(() => {
    if (dayData.route === "N/A" || dayData.route === "--:--") return "na-value";
    return "";
  }, [dayData.route]);

  return (
    <tr
      className={index % 2 === 0 ? currentPerformanceStyles.rowEven : currentPerformanceStyles.rowOdd}
    >
      <td className={currentPerformanceStyles.dayCell}>
        <strong>{String(dayData.day).padStart(2, "0")}</strong>
        <span
          className={`${currentPerformanceStyles.weekdayPillBase} ${
            isSaturday
              ? currentPerformanceStyles.weekdayPillSaturday
              : currentPerformanceStyles.weekdayPillWeekday
          }`}
        >
          {dayOfWeekName}
        </span>
      </td>
      <td
        className={`${currentPerformanceStyles.valueCellBase} ${getColorClass(routeClass)}`}
      >
        {dayData.route}
      </td>
      <td
        className={`${currentPerformanceStyles.valueCellBase} ${
          dayData.stops === "N/A" || dayData.stops === "--:--"
            ? currentPerformanceStyles.valueStopsNA
            : currentPerformanceStyles.valueStopsNormal
        }`}
      >
        {dayData.stops}
      </td>
      <td
        className={`${currentPerformanceStyles.valueCellBase} ${getColorClass(sporHClass)}`}
      >
        {dayData.sporH}
      </td>
      <td
        className={`${currentPerformanceStyles.valueCellBase} ${getColorClass(twClass)}`}
      >
        {dayData.tw}
      </td>
      <td
        className={`${currentPerformanceStyles.valueCellBase} ${getColorClass(sprClass)}`}
      >
        {dayData.spr}
      </td>
    </tr>
  );
});

export const DailyBreakdownTable = memo(function DailyBreakdownTable({
  monthData,
  loading,
  error,
}: DailyBreakdownTableProps) {
  const tableRows = useMemo(() => {
    const daysWithData = monthData.filter((dayData) => {
      return !(
        (dayData.route === "N/A" || dayData.route === "--:--") &&
        (dayData.stops === "N/A" || dayData.stops === "--:--") &&
        (dayData.sporH === "N/A" || dayData.sporH === "--:--") &&
        (dayData.tw === "N/A" || dayData.tw === "--:--") &&
        (dayData.spr === "N/A" || dayData.spr === "--:--")
      );
    });

    if (daysWithData.length === 0) {
      return null;
    }

    return daysWithData.reverse().map((dayData, index) => (
      <TableRow key={`${dayData.day}-${index}`} dayData={dayData} index={index} />
    ));
  }, [monthData]);

  return (
    <section className={currentPerformanceStyles.dailySection}>
      <h2 className={currentPerformanceStyles.dailyHeader}>
        <i className={currentPerformanceStyles.dailyHeaderIcon} />
        Daily Breakdown
      </h2>

      {loading && <LoadingState />}

      {error && <ErrorState error={error} />}

      {!loading && !error && (
        <div className={`overflow-x-auto ${currentPerformanceStyles.dailyScroll}`}>
          <table className={currentPerformanceStyles.dailyTable}>
            <thead className={currentPerformanceStyles.dailyThead}>
              <tr>
                {["Day", "Route", "Stops", "SPOR-H", "TW", "SPR"].map((header) => (
                  <th
                    key={header}
                    className={currentPerformanceStyles.dailyTh}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows === null ? (
                <tr>
                  <td colSpan={6} className={currentPerformanceStyles.emptyStateCell}>
                    <i className={currentPerformanceStyles.emptyStateIcon}></i>
                    No data available for this month.
                  </td>
                </tr>
              ) : (
                tableRows
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});
