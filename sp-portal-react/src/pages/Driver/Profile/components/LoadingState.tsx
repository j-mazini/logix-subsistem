import { memo } from 'react';
import { profileStyles } from '../styles';

export const LoadingState = memo(function LoadingState() {
  return (
    <div className={profileStyles.loadingContainer}>
      <p className={profileStyles.loadingText}>Loading...</p>
    </div>
  );
});
