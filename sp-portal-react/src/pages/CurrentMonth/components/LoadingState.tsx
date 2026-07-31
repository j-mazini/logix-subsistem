import React, { memo } from 'react';
import { currentMonthStyles } from '../styles';

export const LoadingState = memo(() => {
  return (
    <div className={currentMonthStyles.loadingContainer}>
      <div className={currentMonthStyles.loadingSpinner}></div>
      <p className={currentMonthStyles.loadingText}>Loading...</p>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';
