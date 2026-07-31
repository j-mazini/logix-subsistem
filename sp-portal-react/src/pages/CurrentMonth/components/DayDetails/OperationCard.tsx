import { memo } from "react";
import { DailyOverview } from "../../types";
import { formatCurrency, calculateAvgHourlyRate } from "../../utils";
import { RouteHeader } from "./RouteHeader";
import { MetricsGrid } from "./MetricsGrid";
import { WorkHoursSection } from "./WorkHoursSection";
import { StopsSection } from "./StopsSection";
import { PaymentBreakdown } from "./PaymentBreakdown";
import { NoteSection } from "./NoteSection";
import { currentMonthStyles } from "../../styles";

interface OperationCardProps {
  operation: DailyOverview;
  index: number;
}

export const OperationCard = memo(function OperationCard({ operation }: OperationCardProps) {
  const avgHourlyRate = calculateAvgHourlyRate(operation.amountTotal, operation.workedHours);
  const baseRate = operation.rate || 0;
  const adhocTotal = (operation.adhocSort || 0) + (operation.extra || 0) + (operation.routeSort || 0);
  const hasStopsData =
    operation.paidStops &&
    (operation.paidStops.pu > 0 ||
      operation.paidStops.ok > 0 ||
      operation.paidStops.hn > 0 ||
      operation.paidStops.pd !== null);

  return (
    <div className={currentMonthStyles.dayDetailsCard}>
      <RouteHeader routeName={operation.routeName} isSpms={operation.isSpms || false} />

      <MetricsGrid
        totalStops={operation.totalStops}
        avgHourlyRate={avgHourlyRate}
        totalAmount={formatCurrency(operation.amountTotal)}
      />

      {operation.workedHours && (
        <WorkHoursSection
          workedHours={operation.workedHours}
          departTime={operation.departTime}
          breakMinutes={operation.breakMinutes}
          arriveTime={operation.arriveTime}
        />
      )}

      {hasStopsData && operation.paidStops && <StopsSection paidStops={operation.paidStops} />}

      {(baseRate > 0 || adhocTotal > 0) && (
        <PaymentBreakdown baseRate={baseRate} adhocTotal={adhocTotal} />
      )}

      {operation.note && <NoteSection note={operation.note} />}
    </div>
  );
});
