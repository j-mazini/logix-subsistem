import React, { useState, useEffect } from "react";
import { deductionsStyles } from "../styles";

interface SummaryCardProps {
  monthLabel: string;
  year: number;
  totalDeductions: number;
  currencyFormatter: Intl.NumberFormat;
}

function AnimatedCurrency({ value, formatter }: { value: number; formatter: Intl.NumberFormat }) {
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

  return <span>{formatter.format(displayValue)}</span>;
}

export const SummaryCard = React.memo<SummaryCardProps>(
  ({ monthLabel, year, totalDeductions, currencyFormatter }) => {
    return (
      <section className={deductionsStyles.summaryCardSection}>
        <div
          className={deductionsStyles.summaryCardBgPattern}
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, red 1px, transparent 0)`,
            backgroundSize: '25px 25px'
          }}
        />

        <div className={deductionsStyles.summaryCardLabel}>
          <i className={deductionsStyles.summaryCardLabelIcon} />
          <span className="flex flex-col items-center">
            <span>{monthLabel}</span>
            <span className="text-xs opacity-90">{year}</span>
          </span>
          <span className="ml-1">Deductions</span>
        </div>
        <div
          className={deductionsStyles.summaryCardValue}
          id="totalDeductionsValue"
        >
          <AnimatedCurrency value={totalDeductions} formatter={currencyFormatter} />
        </div>

        <div className={deductionsStyles.summaryCardAccentBar} />
      </section>
    );
  }
);

SummaryCard.displayName = "SummaryCard";
