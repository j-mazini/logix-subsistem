import React, { useEffect, useState } from "react";

interface AnimatedCurrencyProps {
  value: number | string;
  formatter: (amount: number) => string;
}

function AnimatedCurrencyComponent({ value, formatter }: AnimatedCurrencyProps) {
  const numericValue =
    typeof value === "string"
      ? parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0
      : typeof value === "number"
      ? value
      : 0;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 800;
    const steps = 20;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      current = Math.min(increment * step, numericValue);
      setDisplayValue(current);

      if (step >= steps) {
        clearInterval(timer);
        setDisplayValue(numericValue);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [numericValue]);

  return <span>{formatter(displayValue)}</span>;
}

export const AnimatedCurrency = React.memo(AnimatedCurrencyComponent);
