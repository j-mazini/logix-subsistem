import { memo } from "react";
import { currentMonthStyles } from "../../styles";

interface PaymentBreakdownProps {
  baseRate: number;
  adhocTotal: number;
}

export const PaymentBreakdown = memo(function PaymentBreakdown({
  baseRate,
  adhocTotal,
}: PaymentBreakdownProps) {
  return (
    <div className="px-4 pb-4">
      <div className={currentMonthStyles.paymentSectionTitle}>Payment Breakdown</div>
      <div>
        {baseRate > 0 && (
          <div className={currentMonthStyles.paymentRow}>
            <span className={currentMonthStyles.paymentLabel}>Base Rate</span>
            <span className={currentMonthStyles.paymentBaseValue}>
              £{baseRate.toFixed(2)}
            </span>
          </div>
        )}
        {adhocTotal > 0 && (
          <div className={currentMonthStyles.paymentRow}>
            <span className={currentMonthStyles.paymentLabel}>Ad-hoc</span>
            <span className={currentMonthStyles.paymentAdhocValue}>
              £{adhocTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
