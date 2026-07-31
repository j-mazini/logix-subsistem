import React, { memo } from 'react';
import { currentMonthStyles } from '../styles';

interface ErrorStateProps {
  message: string;
}

export const ErrorState = memo<ErrorStateProps>(({ message }) => {
  return (
    <div className={currentMonthStyles.errorContainer}>
      <i className={currentMonthStyles.errorIcon}></i>
      <p className={currentMonthStyles.errorText}>Error: {message}</p>
    </div>
  );
});

ErrorState.displayName = 'ErrorState';
