import { useEffect } from 'react';

/**
 * Escape-to-close + background scroll lock, shared by all Vehicles modals.
 * Pass `active: false` (e.g. while a modal is conditionally unmounted-by-prop
 * rather than unmounted-by-JSX) to skip attaching without breaking the
 * rules-of-hooks call order.
 */
export function useModalBehavior(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, active]);
}
