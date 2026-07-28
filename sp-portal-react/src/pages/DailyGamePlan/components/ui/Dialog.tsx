import React, { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '@/hooks/useModalBehavior';

/**
 * Lightweight stand-in for the Next.js app's shadcn/Radix `Dialog` — this subsystem
 * has no Radix dependency. Every Daily Game Plan modal calls `onInteractOutside` /
 * `onPointerDownOutside` with `preventDefault()`, i.e. none of them close on outside
 * click, so this port only wires Escape + explicit close buttons (via
 * `useModalBehavior`, already used by every other modal in this app).
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
    onInteractOutside?: (e: { preventDefault: () => void }) => void;
    onPointerDownOutside?: (e: { preventDefault: () => void }) => void;
}) {
    return createPortal(
        // `dgp-tw-scope` here too: this backdrop is portaled to document.body, outside
        // the page's own `dgp-tw-scope` wrapper, so Tailwind's scoped utilities (see
        // tailwind.config.cjs `important`) need their own ancestor match to apply.
        <div className="dgp-tw-scope dgp-dialog-backdrop">
            <div className={`dgp-dialog-content ${className}`} role="dialog" aria-modal="true">
                {children}
            </div>
        </div>,
        document.body
    );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
    return <div className="dgp-dialog-header">{children}</div>;
}
export function DialogTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return <h2 className={`dgp-dialog-title ${className}`}>{children}</h2>;
}
export function DialogDescription({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return <div className={`dgp-dialog-description ${className}`}>{children}</div>;
}
export function DialogFooter({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return <div className={`dgp-dialog-footer ${className}`}>{children}</div>;
}

export function useDialogContext() {
    return useContext(DialogCtx);
}
