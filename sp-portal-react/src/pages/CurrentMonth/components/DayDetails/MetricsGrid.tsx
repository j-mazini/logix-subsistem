import { memo } from "react";
import { currentMonthStyles } from "../../styles";

interface MetricsGridProps {
  totalStops: number;
  avgHourlyRate: string;
  totalAmount: string;
}

export const MetricsGrid = memo(function MetricsGrid({
  totalStops,
  avgHourlyRate,
  totalAmount,
}: MetricsGridProps) {
  return (
    <div className={currentMonthStyles.metricsGrid}>
      <div className={currentMonthStyles.metricsCard}>
        <div className={currentMonthStyles.metricsLabel}>Total Stops</div>
        <div className={currentMonthStyles.metricsValue}>{totalStops}</div>
      </div>
      <div className={currentMonthStyles.metricsCard}>
        <div className={currentMonthStyles.metricsLabel}>Avg H/R</div>
        <div className={currentMonthStyles.metricsValue}>{avgHourlyRate}</div>
      </div>
      <div className={currentMonthStyles.metricsCard}>
        <div className={currentMonthStyles.metricsLabel}>Total £</div>
        <div className={currentMonthStyles.metricsValue}>{totalAmount}</div>
      </div>
    </div>
  );
});
