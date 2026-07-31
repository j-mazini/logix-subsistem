import { useCallback, useRef, useState } from 'react';

/**
 * Simplified port of the Next.js app's `useSubmitGuard`: prevents double-submit on
 * async handlers (a synchronous ref lock, since `setState` alone is too slow to catch
 * a second click in the same tick). The original also surfaces a global "already
 * submitted" toast on a blocked click; this subsystem has no such global notice, so
 * a blocked click is silently ignored.
 */
export function useSubmitGuard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockedRef = useRef(false);

  const guard = useCallback(
    <Args extends unknown[], R>(fn: (...args: Args) => R | Promise<R>) =>
      async (...args: Args): Promise<R | undefined> => {
        if (lockedRef.current) return undefined;
        lockedRef.current = true;
        setIsSubmitting(true);
        try {
          return await fn(...args);
        } finally {
          lockedRef.current = false;
          setIsSubmitting(false);
        }
      },
    []
  );

  return { isSubmitting, guard };
}
