import { useCallback, useRef, useState } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

/** Shared by both Trace & Queries tabs — auto-dismissing toast stack. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, showToast };
}
