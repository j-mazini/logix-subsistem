import { useMemo, memo } from "react";
import { getTimeWindowClass } from "../utils";
import { currentPerformanceStyles } from "../styles";

interface MonthlyAveragesProps {
  averages: {
    avgTw: string;
    avgSpr: string;
    avgSporH: string;
  };
}

export const MonthlyAverages = memo(function MonthlyAverages({ averages }: MonthlyAveragesProps) {
  const avgTwColorClass = useMemo(() => {
    if (averages.avgTw === "N/A" || averages.avgTw === "--:--")
      return currentPerformanceStyles.valueNeutral.replace(" font-medium", "");
    const className = getTimeWindowClass(averages.avgTw);
    if (className === "positive-value")
      return currentPerformanceStyles.valuePositive.replace(" font-semibold", "");
    if (className === "warning-value")
      return currentPerformanceStyles.valueWarning.replace(" font-semibold", "");
    if (className === "negative-value")
      return currentPerformanceStyles.valueNegative.replace(" font-semibold", "");
    return currentPerformanceStyles.valueNeutral.replace(" font-medium", "");
  }, [averages.avgTw]);

  const avgSporHColorClass = useMemo(() => {
    if (averages.avgSporH === "N/A" || averages.avgSporH === "--:--")
      return currentPerformanceStyles.valueNeutral.replace(" font-medium", "");
    const value = parseFloat(averages.avgSporH);
    return value >= 18.0
      ? currentPerformanceStyles.valuePositive.replace(" font-semibold", "")
      : currentPerformanceStyles.valueNegative.replace(" font-semibold", "");
  }, [averages.avgSporH]);

  const metrics = [
    {
      label: "TW",
      value: averages.avgTw,
      color: avgTwColorClass,
      icon: "bi-clock-history",
    },
    {
      label: "SPR",
      value: averages.avgSpr,
      color: currentPerformanceStyles.valueNeutral.replace(" font-medium", ""),
      icon: "bi-speedometer2",
    },
    {
      label: "SPOR-H",
      value: averages.avgSporH,
      color: avgSporHColorClass,
      icon: "bi-graph-up",
    },
  ];

  return (
    <section className={currentPerformanceStyles.monthlyCard}>
      <div className={currentPerformanceStyles.monthlyHeader}>
        <div className={currentPerformanceStyles.monthlyTitle}>
          <i className={currentPerformanceStyles.monthlyTitleIcon} />
          Monthly Averages
        </div>
      </div>

      <div className={currentPerformanceStyles.monthlyMetricsGrid}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={currentPerformanceStyles.monthlyMetricCard}
          >
            <i className={`${metric.icon} ${metric.color} text-lg mb-1`} />
            <span className={currentPerformanceStyles.monthlyMetricLabel}>
              {metric.label}
            </span>
            <span className={`text-xl sm:text-2xl font-bold ${metric.color}`}>{metric.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
});
