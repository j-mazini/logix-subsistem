import { useEffect, useState } from 'react';

/**
 * The reference re-declares this exact count-up helper inside DeductionItem,
 * SummaryCard and ProgressBar. Consolidated here since the three components
 * in this port share a file and there's no reason to triplicate it.
 */
export function AnimatedCurrency({ value, formatter }: { value: number; formatter: Intl.NumberFormat }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      current = Math.min(increment * step, value);
      setDisplayValue(current);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{formatter.format(displayValue)}</span>;
}
