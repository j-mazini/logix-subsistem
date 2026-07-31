import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DayOverviewResponse } from "../../types";
import { subcontractorStyles } from "../../styles";

type PaidStopsType = DayOverviewResponse["deliveryDetails"]["paidStops"];

interface StopsSectionProps {
  paidStops: PaidStopsType;
}

function AnimatedStopValue({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, value);
      setDisplayValue(Math.round(current));
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

export const StopsSection = memo(function StopsSection({ paidStops }: StopsSectionProps) {
  const getGlowClass = (color: string) => {
    if (color.includes('blue')) return 'group-hover:drop-shadow-[0_0_12px_rgba(37,99,235,0.8)]';
    if (color.includes('green')) return 'group-hover:drop-shadow-[0_0_12px_rgba(22,163,74,0.8)]';
    if (color.includes('orange')) return 'group-hover:drop-shadow-[0_0_12px_rgba(249,115,22,0.8)]';
    if (color.includes('purple')) return 'group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.8)]';
    return '';
  };

  const stops = [
    { label: "PU", value: paidStops.pu, icon: "bi-box-arrow-up", color: "text-blue-600" },
    { label: "OK", value: paidStops.ok, icon: "bi-check-circle", color: "text-green-600" },
    { label: "HN", value: paidStops.hn, icon: "bi-house", color: "text-orange-600" },
    { label: "PD", value: paidStops.pd || 0, icon: "bi-box-arrow-down", color: "text-purple-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className={subcontractorStyles.stopsSectionWrapper}
    >
      <div className={subcontractorStyles.stopsSectionTitle}>
        <i className={subcontractorStyles.stopsSectionTitleIcon}></i>
        Successful Stops
      </div>
      <div className={subcontractorStyles.stopsGrid}>
        {stops.map((stop, index) => (
          <motion.div
            key={stop.label}
            initial={{ opacity: 0, y: 10, rotateY: -90 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.1, rotateY: 5, y: -2 }}
            className={subcontractorStyles.stopsCard}
          >
            <div className={subcontractorStyles.stopsOverlay} />

            <div className="relative z-10">
              <i
                className={`${stop.icon} ${stop.color} ${subcontractorStyles.stopsIcon} ${getGlowClass(stop.color)}`}
              />
              <div
                className={`${subcontractorStyles.stopsValue} ${stop.color} ${getGlowClass(stop.color)}`}
              >
                <AnimatedStopValue value={stop.value} />
              </div>
              <div className={subcontractorStyles.stopsLabel}>{stop.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});
