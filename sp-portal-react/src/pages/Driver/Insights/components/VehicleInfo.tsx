import { motion } from 'framer-motion';
import { getVehicleIcon } from '../utils';
import type { Vehicle } from '../types';
import { dailyPerformanceInsightStyles } from '../styles';

interface VehicleInfoProps {
  vehicle: Vehicle;
}

export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={dailyPerformanceInsightStyles.vehicleInfoContainer}
    >
      <div className={dailyPerformanceInsightStyles.vehicleInfoIconWrapper}>
        <i className={`${getVehicleIcon(vehicle.vehicleModel)} ${dailyPerformanceInsightStyles.vehicleInfoIcon}`}></i>
      </div>
      <span className={dailyPerformanceInsightStyles.vehicleInfoText}>
        {vehicle.vehicleRegistrationPlate} ({vehicle.vehicleModel})
      </span>
    </motion.div>
  );
}
