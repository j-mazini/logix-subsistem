import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { subcontractorStyles } from "../../styles";

interface MetricsSectionProps {
  totalStops: number;
  avgHourlyRate: number;
  totalRevenue: number;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
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

  return <span>{displayValue.toFixed(decimals)}</span>;
}

export const MetricsSection = memo(function MetricsSection({
  totalStops,
  avgHourlyRate,
  totalRevenue,
}: MetricsSectionProps) {
  const metrics = [
    { label: "Total Stops", value: totalStops, decimals: 0, icon: "bi-box-seam", color: "text-blue-600" },
    { label: "Avg H/R", value: avgHourlyRate, decimals: 2, icon: "bi-clock", color: "text-green-600", prefix: "£" },
    { label: "Total £", value: totalRevenue, decimals: 2, icon: "bi-currency-pound", color: "text-purple-600", prefix: "£" },
  ];

  return (
    <div className={subcontractorStyles.metricsGrid}>
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          whileHover={{ scale: 1.05, y: -2 }}
          className={subcontractorStyles.metricsCard}
        >
          <motion.i
            className={`${metric.icon} ${metric.color} text-lg mb-1`}
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: index * 0.2 }}
          />
          <div className={subcontractorStyles.metricsLabel}>
            {metric.label}
          </div>
          <div
            className={`${subcontractorStyles.metricsValueBase} ${metric.color}`}
          >
            {metric.prefix}
            <AnimatedNumber value={metric.value} decimals={metric.decimals} />
          </div>
        </motion.div>
      ))}
    </div>
  );
});
