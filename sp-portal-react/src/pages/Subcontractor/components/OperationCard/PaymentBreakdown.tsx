import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { subcontractorStyles } from "../../styles";

interface PaymentBreakdownProps {
  baseValue: number;
  totalExtras: number;
}

function AnimatedCurrency({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, value);
      setDisplayValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>£{displayValue.toFixed(2)}</span>;
}

export const PaymentBreakdown = memo(function PaymentBreakdown({
  baseValue,
  totalExtras,
}: PaymentBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={subcontractorStyles.paymentCard}
    >
      <div className={subcontractorStyles.paymentCornerTop} />
      <div className={subcontractorStyles.paymentCornerBottom} />

      <div className={subcontractorStyles.paymentTitle}>
        <motion.i
          className={subcontractorStyles.paymentTitleIcon}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        />
        Payment Breakdown
      </div>

      <div className={subcontractorStyles.paymentGrid}>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.05 }}
          className={subcontractorStyles.paymentBaseCard}
        >
          <motion.i
            className="bi bi-currency-pound text-green-600 text-xl mb-2"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          />
          <span className={subcontractorStyles.paymentBaseLabel}>Base Rate</span>
          <div className={subcontractorStyles.paymentBaseValue}>
            <AnimatedCurrency value={baseValue} />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          className={subcontractorStyles.paymentAdhocCard}
        >
          <motion.i
            className="bi bi-plus-circle text-orange-600 text-xl mb-2"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          />
          <span className={subcontractorStyles.paymentAdhocLabel}>Ad-hoc</span>
          <div className={subcontractorStyles.paymentAdhocValue}>
            <AnimatedCurrency value={totalExtras} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
});
