import React, { memo } from 'react';
import { currentMonthStyles } from '../styles';

export const NoDataState = memo(() => {
  return (
    <section className={currentMonthStyles.noDataSection}>
      <div className={currentMonthStyles.noDataText}>
        No earnings recorded for this month yet.
      </div>
    </section>
  );
});

NoDataState.displayName = 'NoDataState';
