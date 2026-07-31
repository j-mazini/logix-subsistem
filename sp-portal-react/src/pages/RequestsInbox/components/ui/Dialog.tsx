import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '@/hooks/useModalBehavior';

/**
 * Lightweight stand-in for the Next.js app's shadcn/Radix `Dialog` — no Radix
 * dependency here. Every dialog in this page ignores outside clicks (matches
 * the source's `onInteractOutside`/`onPointerDownOutside` preventDefault on
 * every usage), so this only wires Escape + an explicit close button.
 */
const DialogCtx = createContext<{ onOpenChange: (open: boolean) => void } | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  useModalBehavior(() => onOpenChange(false), open);
  if (!open) return null;
  return <DialogCtx.Provider value={{ onOpenChange }}>{children}</DialogCtx.Provider>;
}

export function DialogContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(DialogCtx);

  return createPortal(
    <div className="requests-inbox-tw-scope">
      <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 p-3">
        <div className={`relative w-full bg-white rounded-xl shadow-lg p-6 ${className}`} role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => ctx?.onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm p-1 text-slate-500 opacity-70 hover:opacity-100 hover:bg-slate-100"
            aria-label="Close"
          >
            <i className="bi bi-x-lg" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 pr-6">{children}</div>;
}

export function DialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 mt-1">{children}</p>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
