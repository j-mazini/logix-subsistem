import { memo } from "react";
import { PaidStops } from "../../types";
import { currentMonthStyles } from "../../styles";

interface StopsSectionProps {
  paidStops: PaidStops;
}

export const StopsSection = memo(function StopsSection({ paidStops }: StopsSectionProps) {
  return (
    <div className="px-4 pb-4">
      <div className={currentMonthStyles.stopsSectionTitle}>Successful Stops</div>
      <div className={currentMonthStyles.stopsGrid}>
        <div className={currentMonthStyles.stopsCard}>
          <div className={currentMonthStyles.stopsLabel}>PU</div>
          <div className={currentMonthStyles.stopsValue}>{paidStops.pu || 0}</div>
        </div>
        <div className={currentMonthStyles.stopsCard}>
          <div className={currentMonthStyles.stopsLabel}>OK</div>
          <div className={currentMonthStyles.stopsValue}>{paidStops.ok || 0}</div>
        </div>
        <div className={currentMonthStyles.stopsCard}>
          <div className={currentMonthStyles.stopsLabel}>HN</div>
          <div className={currentMonthStyles.stopsValue}>{paidStops.hn || 0}</div>
        </div>
        <div className={currentMonthStyles.stopsCard}>
          <div className={currentMonthStyles.stopsLabel}>PD</div>
          <div className={currentMonthStyles.stopsValue}>
            {paidStops.pd !== null ? paidStops.pd : 0}
          </div>
        </div>
      </div>
    </div>
  );
});
