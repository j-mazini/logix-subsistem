import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DailyPerformanceData } from './types';
import { calculateSPR, calculateSPORH, calculateAFD } from '@/lib/performance-utils';
import { isDayOff, shouldShowMetrics } from './utils';
import { VerifiedCard } from './components/VerifiedCard';
import { VehicleInfo } from './components/VehicleInfo';
import { MetricsCard } from './components/MetricsCard';
import { Timeline } from './components/Timeline';
import { FailedDeliveriesCard } from './components/FailedDeliveriesCard';
import { NotesSection } from './components/NotesSection';
import { dailyPerformanceInsightStyles } from './styles';

interface OperationCardProps {
  operation: DailyPerformanceData;
  index: number;
  totalOperations: number;
}

export const OperationCard = React.memo<OperationCardProps>(({ operation, index, totalOperations }) => {
  const metrics = useMemo(() => {
    const spr = Math.round(calculateSPR(operation));
    const sporh = calculateSPORH(operation).toFixed(2);
    const afd = calculateAFD(operation);
    const tw = operation.timeWindows.percentageOnTime * 100;
    return { spr, sporh, afd, tw };
  }, [operation]);

  const displayData = useMemo(() => {
    const isDayOffOperation = isDayOff(operation);
    const displayRouteName = isDayOffOperation ? "OFF" : operation.route.routeName;
    const showMetrics = shouldShowMetrics(operation);
    return { isDayOffOperation, displayRouteName, showMetrics };
  }, [operation]);

  return (
    <motion.div
      key={operation.operationId || `operation-${index}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={dailyPerformanceInsightStyles.operationCardRoot}
    >
      <VerifiedCard routeName={displayData.displayRouteName} isSpms={operation.isSpms} />

      {operation.vehicle && <VehicleInfo vehicle={operation.vehicle} />}

      {displayData.showMetrics && (
        <>
          <div className={dailyPerformanceInsightStyles.cardBase}>
            <MetricsCard
              spr={metrics.spr}
              sporh={metrics.sporh}
              tw={metrics.tw}
              afd={metrics.afd}
            />
          </div>
          <div className={dailyPerformanceInsightStyles.cardBase}>
            <Timeline operation={operation} />
          </div>

          <div>
            <FailedDeliveriesCard unpaidStops={operation.deliveryDetails.unpaidStops} />
          </div>
        </>
      )}

      {operation.note && (
        <div>
          <NotesSection note={operation.note} />
        </div>
      )}

      {index < totalOperations - 1 && (
        <hr className={dailyPerformanceInsightStyles.operationCardDivider} />
      )}
    </motion.div>
  );
});

OperationCard.displayName = 'OperationCard';
