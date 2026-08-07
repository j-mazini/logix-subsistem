import { memo } from 'react';
import { deductionsStyles } from '../styles';
import { AnimatedCurrency } from './AnimatedCurrency';

interface SummaryCardProps {
  monthLabel: string;
  year: number;
  totalDeductions: number;
  currencyFormatter: Intl.NumberFormat;
}

export const SummaryCard = memo<SummaryCardProps>(({ monthLabel, year, totalDeductions, currencyFormatter }) => {
  return (
    <section className={deductionsStyles.summaryCardSection}>
      <div
        className={deductionsStyles.summaryCardBgPattern}
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #10b981 1px, transparent 0)',
          backgroundSize: '25px 25px',
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
      <div className={deductionsStyles.summaryCardValue}>
        <AnimatedCurrency value={totalDeductions} formatter={currencyFormatter} />
      </div>

      <div className={deductionsStyles.summaryCardAccentBar} />
    </section>
  );
});

SummaryCard.displayName = 'SummaryCard';
