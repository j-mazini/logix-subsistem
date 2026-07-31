import React, { useState, useEffect } from "react";
import { DeductionItem as DeductionItemType } from "../types";
import { formatDate } from "../utils";
import { deductionsStyles } from "../styles";

interface DeductionItemComponentProps {
  deduction: DeductionItemType;
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

export const DeductionItem = React.memo<DeductionItemComponentProps>(
  ({ deduction, currencyFormatter }) => {
    // Source shows a ServicePartnerBadge here (multi-tenant admin view). This
    // subsystem's deductions are always the single mock driver's own — no
    // per-vendor Service Partner concept applies, so that badge is omitted.
    return (
      <div className={deductionsStyles.deductionRow}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className={`${deductionsStyles.deductionRef} flex items-center gap-1.5 flex-wrap`}>
              <i className={deductionsStyles.deductionRefIcon}></i>
              <span>{deduction.referenceNumber}</span>
            </div>
            <div className={deductionsStyles.deductionDescription}>
              {deduction.description}
            </div>
          </div>
          <div className="text-right">
            <div className={deductionsStyles.deductionAmount}>
              <AnimatedCurrency
                value={parseFloat(deduction.amount)}
                formatter={currencyFormatter}
              />
            </div>
            <div className={deductionsStyles.deductionDate}>
              {formatDate(deduction.date)}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DeductionItem.displayName = "DeductionItem";
