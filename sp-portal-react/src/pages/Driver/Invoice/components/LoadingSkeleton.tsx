import { memo } from 'react';

/** Ported verbatim from the reference `LoadingSkeleton.tsx`. */
export const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 bg-slate-200 rounded-lg w-32 animate-pulse" />
          {[1, 2].map((j) => (
            <div key={j} className="flex items-center justify-between py-3.5 border-b border-slate-200">
              <div className="flex flex-col gap-2">
                <div className="h-4 bg-slate-200 rounded w-28 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-20 animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-5 bg-slate-200 rounded w-16 animate-pulse" />
                <div className="flex gap-3">
                  <div className="h-5 w-5 bg-slate-200 rounded animate-pulse" />
                  <div className="h-5 w-5 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
