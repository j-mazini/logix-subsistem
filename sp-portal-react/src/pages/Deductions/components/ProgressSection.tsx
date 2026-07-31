import React from "react";
import { DeductionItem } from "../types";
import { ProgressBar } from "./ProgressBar";
import { deductionsStyles } from "../styles";

interface ProgressSectionProps {
  installmentProgressItems: DeductionItem[];
  currencyFormatter: Intl.NumberFormat;
}

export const ProgressSection = React.memo<ProgressSectionProps>(
  ({ installmentProgressItems, currencyFormatter }) => {
    if (installmentProgressItems.length === 0) {
      return null;
    }

    return (
      <section
        className={deductionsStyles.card}
        id="progressSection"
      >
        <h2 className={deductionsStyles.sectionTitle}>
          <i className="bi bi-graph-up-arrow text-indigo-600" />
          Progress
        </h2>
        <div
          className={deductionsStyles.progressList}
          id="progressBarsContainer"
        >
          {installmentProgressItems.map((prog, index) => (
            <ProgressBar
              key={prog.uniqueId || prog.referenceNumber}
              deduction={prog}
              currencyFormatter={currencyFormatter}
              index={index}
            />
          ))}
        </div>
      </section>
    );
  }
);

ProgressSection.displayName = "ProgressSection";
