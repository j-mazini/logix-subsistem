import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import styles from './ContractModals.module.css';

/* =====================================================
   DeleteConfirmModal — ported from the Next.js source's
   components/DeleteConfirmModal.tsx.

   The source confirms deletion of a whole route (a backend record) from a
   loop. This app's mock contract hierarchy is fixed (depots/loops/routes
   come from window.DHL_MOCK_DATA and aren't created/deleted), so the only
   genuinely-removable thing on this page is a custom sub postcode an SP
   added themselves. The port keeps the same "confirm before destructive
   action" shape, generalised with a message prop, and is wired up to
   confirm sub postcode removal instead of inventing route deletion.
   ===================================================== */

export interface DeleteConfirmTarget {
  title: string;
  message: string;
}

interface DeleteConfirmModalProps {
  target: DeleteConfirmTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300, duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

export function DeleteConfirmModal({ target, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useBodyScrollLock(!!target);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && target) onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [target, onClose]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            className={styles.backdrop}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <div className={styles.overlay}>
            <motion.div
              className={`${styles.modal} ${styles.confirmModal}`}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={e => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label={target.title}
            >
              <div className={styles.confirmBody}>
                <div className={styles.confirmIcon}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className={styles.modalTitle}>{target.title}</h2>
                  <p className={styles.confirmMessage}>{target.message}</p>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className={styles.dangerButton} onClick={onConfirm}>
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
