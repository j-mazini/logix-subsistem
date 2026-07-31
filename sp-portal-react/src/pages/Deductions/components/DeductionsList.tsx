import React from "react";
import { DeductionItem } from "../types";
import { DeductionItem as DeductionItemComponent } from "./DeductionItem";
import { deductionsStyles } from "../styles";

interface DeductionsListProps {
  deductions: DeductionItem[];
  currencyFormatter: Intl.NumberFormat;
}

export const DeductionsList = React.memo<DeductionsListProps>(
  ({ deductions, currencyFormatter }) => {
    return (
      <section className={deductionsStyles.card}>
        <h2 className={deductionsStyles.sectionTitle}>
          <i className="bi bi-dash-circle text-red-600" />
          Deductions
        </h2>
        <div
          className={deductionsStyles.listScroll}
          id="deductionsList"
        >
          {deductions.length === 0 ? (
            <div className={deductionsStyles.emptyWrap}>
              <i className={deductionsStyles.emptyIcon}></i>
              <p>No deductions recorded for this month.</p>
            </div>
          ) : (
            <div>
              {deductions.map((ded, index) => (
                <DeductionItemComponent
                  key={ded.uniqueId || ded.referenceNumber}
                  deduction={ded}
                  currencyFormatter={currencyFormatter}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }
);

DeductionsList.displayName = "DeductionsList";
