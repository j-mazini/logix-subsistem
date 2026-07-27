// @ts-nocheck
import React, { memo } from 'react';
import { dailyOperationsReportsStyles } from '../styles';

interface ErrorAlertProps {
  error: string | null;
}

export const ErrorAlert = memo<ErrorAlertProps>(({ error }) => {
  if (!error) return null;

  return (
    <div 
      className={dailyOperationsReportsStyles.errorAlertContainer}
      role="alert"
    >
      <p className={dailyOperationsReportsStyles.errorAlertTitle}>Error:</p>
      <p className={dailyOperationsReportsStyles.errorAlertText}>{error}</p>
    </div>
  );
});

ErrorAlert.displayName = 'ErrorAlert';

