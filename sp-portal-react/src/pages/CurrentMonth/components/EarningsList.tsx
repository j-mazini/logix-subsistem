import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { currentMonthStyles } from '../styles';

interface Vehicle {
  vehicleId: number;
  vehicleModel: string;
  vehicleRegistrationPlate: string;
}

interface Operation {
  vehicle?: Vehicle;
}

interface DailyEarning {
  date: string;
  dateName: string;
  operations?: Operation[];
}

interface EarningsListProps {
  earnings: DailyEarning[];
  calculateDayTotal: (earning: DailyEarning) => string;
  formatCurrency: (amount: string) => string;
  getVehicleIcon: (vehicleModel: string) => string;
  onDayClick: (date: string, dateName: string) => void;
}

const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
} as const;

const wiggleAnim = { rotate: [0, 10, -10, 0] };
const wiggleTransition = { duration: 2, repeat: Infinity, repeatDelay: 3 } as const;

function AnimatedCurrency({ value, formatter }: { value: string; formatter: (amount: string) => string }) {
  const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, numericValue);
      setDisplayValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(numericValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [numericValue]);

  return <span>{formatter(displayValue.toFixed(2))}</span>;
}

interface EarningsRowProps {
  day: DailyEarning;
  index: number;
  calculateDayTotal: (earning: DailyEarning) => string;
  formatCurrency: (amount: string) => string;
  getVehicleIcon: (vehicleModel: string) => string;
  onDayClick: (date: string, dateName: string) => void;
}

const EarningsRow = memo<EarningsRowProps>(function EarningsRow({
  day,
  index,
  calculateDayTotal,
  formatCurrency,
  getVehicleIcon,
  onDayClick,
}) {
  const amount = calculateDayTotal(day);
  const isEven = index % 2 === 0;
  const vehicle = day.operations?.[0]?.vehicle;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ x: 4, scale: 1.01 }}
      onClick={() => onDayClick(day.date, day.dateName)}
      className={cn(currentMonthStyles.rowBase, isEven ? currentMonthStyles.rowEven : currentMonthStyles.rowOdd)}
    >
      <div className={currentMonthStyles.rowLeft}>
        <span className={currentMonthStyles.rowTitle}>{day.dateName}</span>
        {vehicle && (
          <span className={currentMonthStyles.rowSubtitle}>
            <motion.i
              animate={wiggleAnim}
              transition={wiggleTransition}
              className={cn(getVehicleIcon(vehicle.vehicleModel), "text-xs")}
            />
            {`${vehicle.vehicleRegistrationPlate} (${vehicle.vehicleModel})`}
          </span>
        )}
      </div>
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: index * 0.05 + 0.1, type: "spring" }}
        className={currentMonthStyles.rowAmount}
      >
        <AnimatedCurrency value={amount} formatter={formatCurrency} />
      </motion.span>
    </motion.div>
  );
});

export const EarningsList = memo<EarningsListProps>(({
  earnings,
  calculateDayTotal,
  formatCurrency,
  getVehicleIcon,
  onDayClick
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={currentMonthStyles.card}
    >
      <motion.h2
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className={currentMonthStyles.sectionTitle}
      >
        <motion.i
          className={currentMonthStyles.sectionTitleIcon}
          animate={wiggleAnim}
          transition={wiggleTransition}
        />
        Daily Earnings Breakdown
      </motion.h2>
      <div className={currentMonthStyles.scrollList}>
        {earnings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={currentMonthStyles.emptyStateWrap}
          >
            <i className={currentMonthStyles.emptyStateIcon}></i>
            <p>No earnings recorded for this month yet.</p>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={listVariants}
          >
            {earnings.map((day, index) => (
              <EarningsRow
                key={`${day.date}-${index}`}
                day={day}
                index={index}
                calculateDayTotal={calculateDayTotal}
                formatCurrency={formatCurrency}
                getVehicleIcon={getVehicleIcon}
                onDayClick={onDayClick}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
});

EarningsList.displayName = 'EarningsList';
