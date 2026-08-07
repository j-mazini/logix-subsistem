import { memo } from 'react';
import { profileStyles } from '../styles';

interface ErrorStateProps {
  message?: string;
}

export const ErrorState = memo(function ErrorState({
  message = 'No data available for the selected date',
}: ErrorStateProps) {
  return (
    <div className={profileStyles.errorContainer}>
      <p className={profileStyles.errorText}>{message}</p>
    </div>
  );
});
