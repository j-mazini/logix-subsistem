import React, { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { currentMonthStyles } from '../styles';

interface SummaryCardProps {
  label: string;
  value: string;
}

function AnimatedCurrency({ value }: { value: string }) {
  const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
  const [displayValue, setDisplayValue] = useState(0);
  const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
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

  return <span>{currencyFormatter.format(displayValue)}</span>;
}

export const SummaryCard = memo<SummaryCardProps>(({ label, value }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={currentMonthStyles.summaryCardSection}
    >
      <motion.div
        className={currentMonthStyles.summaryCardBgPattern}
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, green 1px, transparent 0)`,
          backgroundSize: '25px 25px'
        }}
        animate={{
          backgroundPosition: ['0 0', '25px 25px'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={currentMonthStyles.summaryCardLabel}
      >
        <motion.i
          className={currentMonthStyles.summaryCardLabelIcon}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
        {label}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
        className={currentMonthStyles.summaryCardValue}
      >
        <AnimatedCurrency value={value} />
      </motion.div>

      <motion.div
        className={currentMonthStyles.summaryCardAccentBar}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />
    </motion.section>
  );
});

SummaryCard.displayName = 'SummaryCard';
