// @ts-nocheck
import React, { memo } from 'react';

interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(({ loading, message = 'Loading data...' }) => {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

