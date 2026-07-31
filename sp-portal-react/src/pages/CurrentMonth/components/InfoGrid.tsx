import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { currentMonthStyles } from '../styles';

interface InfoItem {
  label: string;
  value: string | number;
  valueColor?: 'success' | 'warning' | 'accent' | 'neutral';
}

interface InfoGridProps {
  items: InfoItem[];
}

const getValueColorClass = (color?: string) => {
  switch (color) {
    case 'success':
      return currentMonthStyles.infoValueSuccess;
    case 'warning':
      return currentMonthStyles.infoValueWarning;
    case 'accent':
      return currentMonthStyles.infoValueAccent;
    case 'neutral':
    default:
      return currentMonthStyles.infoValueNeutral;
  }
};

const getIcon = (label: string) => {
  if (label.toLowerCase().includes('day')) return 'bi-calendar-check';
  if (label.toLowerCase().includes('avg') || label.toLowerCase().includes('daily')) return 'bi-graph-up-arrow';
  return 'bi-info-circle';
};

export const InfoGrid = memo<InfoGridProps>(({ items }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={currentMonthStyles.infoGridSection}
    >
      <div className={currentMonthStyles.infoGridGrid}>
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className={currentMonthStyles.infoGridCard}
          >
            <motion.i
              className={`${getIcon(item.label)} ${getValueColorClass(item.valueColor)} text-lg mb-1`}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: index * 0.2 }}
            />
            <span className={currentMonthStyles.infoGridLabel}>
              {item.label}
            </span>
            <span
              className={`${currentMonthStyles.infoGridValueBase} ${getValueColorClass(
                item.valueColor,
              )}`}
            >
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
});

InfoGrid.displayName = 'InfoGrid';
