import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { DayOverviewResponse } from "./types";
import { isDayOff, calculateAvgHourlyRate, shouldShowStopsSection } from "./utils";
import { RouteHeader } from "./components/OperationCard/RouteHeader";
import { MetricsSection } from "./components/OperationCard/MetricsSection";
import { StopsSection } from "./components/OperationCard/StopsSection";
import { PaymentBreakdown } from "./components/OperationCard/PaymentBreakdown";
import { NoteSection } from "./components/OperationCard/NoteSection";
import { subcontractorStyles } from "./styles";

interface OperationCardProps {
  operation: DayOverviewResponse;
}

export const OperationCard = memo(function OperationCard({ operation }: OperationCardProps) {
  const isDayOffOperation = isDayOff(operation);
  const isSpms = isDayOffOperation ? true : operation.isSpms;

  const totalRevenue = operation.total ?? 0;

  const avgHourlyRate = useMemo(
    () => calculateAvgHourlyRate(operation, totalRevenue),
    [operation, totalRevenue]
  );

  const { baseValue, totalExtras } = useMemo(() => {
    const baseValue = operation.totalPaidStops ?? 0;
    return {
      baseValue,
      totalExtras: totalRevenue - baseValue,
    };
  }, [operation.totalPaidStops, totalRevenue]);

  const showStopsSection = shouldShowStopsSection(operation.route.routeName);
  const showPaymentBreakdown = operation.dailyMetrics.totalStops > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateY: -10 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{
        x: 4,
        transition: { type: "spring", stiffness: 400, damping: 17 }
      }}
      className={subcontractorStyles.operationCardWrapper}
    >
      <motion.div
        className={subcontractorStyles.operationCardAccent}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={subcontractorStyles.operationCardMain}
      >
        <RouteHeader routeName={operation.route.routeName} isSpms={isSpms} />

        <MetricsSection
          totalStops={operation.dailyMetrics.totalStops}
          avgHourlyRate={avgHourlyRate}
          totalRevenue={totalRevenue}
        />

        {showStopsSection && (
          <StopsSection
            paidStops={{
              ...operation.deliveryDetails.paidStops,
              pd: operation.deliveryDetails.paidStops.pd ?? null
            }}
          />
        )}
      </motion.div>

      {showPaymentBreakdown && (
        <PaymentBreakdown baseValue={baseValue} totalExtras={totalExtras} />
      )}

      {operation.note && <NoteSection note={operation.note} />}
    </motion.div>
  );
});
