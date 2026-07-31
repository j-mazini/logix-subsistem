import React, { useState, useEffect } from "react";
import { DeductionItem } from "../types";
import { deductionsStyles } from "../styles";

interface ProgressBarProps {
  deduction: DeductionItem;
  currencyFormatter: Intl.NumberFormat;
  index?: number;
}

function AnimatedCurrency({ value, formatter }: { value: number; formatter: Intl.NumberFormat }) {
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

export const ProgressBar = React.memo<ProgressBarProps>(
  ({ deduction, currencyFormatter }) => {
    const current = deduction.currentInstallment || 0;
    const total = deduction.totalInstallments || 1;
    const progressPercent = (current / total) * 100;

    return (
      <div className={deductionsStyles.progressRow}>
        <div className="flex justify-between items-center mb-2.5">
          <div className={deductionsStyles.progressHeader}>
            <i className={deductionsStyles.progressHeaderIcon}></i>
            {current} of {total} - {deduction.description}
          </div>
          <div className={deductionsStyles.progressAmount}>
            <AnimatedCurrency
              value={parseFloat(deduction.totalAmount || deduction.amount)}
              formatter={currencyFormatter}
            />
          </div>
        </div>
        <div className={deductionsStyles.progressTrack}>
          <div
            className={deductionsStyles.progressFill}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";
