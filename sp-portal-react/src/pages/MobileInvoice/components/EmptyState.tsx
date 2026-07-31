import React from "react";

interface EmptyStateProps {
  message: string;
  icon?: string;
}

export const EmptyState = React.memo<EmptyStateProps>(({ message, icon = "bi-inbox" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <i className={`bi ${icon} text-5xl text-slate-300 mb-4`} />
      <p className="text-slate-500 text-center italic text-sm">{message}</p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";
