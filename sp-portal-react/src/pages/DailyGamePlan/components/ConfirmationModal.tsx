import React, { useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { AlertCircle, AlertTriangle } from 'lucide-react';

type ConfirmationModalProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    details?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
};

/** Port of the Next.js app's week-planner `ConfirmationModal`, reused by Daily Game Plan for Start/Finish/Delete. */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    details,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning',
    isLoading = false,
}) => {
    const processingRef = useRef(false);
    useEffect(() => {
        if (!open || !isLoading) processingRef.current = false;
    }, [open, isLoading]);

    const handleConfirm = () => {
        if (processingRef.current) return;
        processingRef.current = true;
        onConfirm();
    };

    const getIcon = () => {
        if (variant === 'danger') return <AlertCircle className="h-5 w-5 text-red-600" />;
        if (variant === 'warning') return <AlertTriangle className="h-5 w-5 text-orange-600" />;
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    };

    const getConfirmButtonClass = () => {
        if (variant === 'danger') return 'bg-red-600 hover:bg-red-700 text-white';
        if (variant === 'warning') return 'bg-orange-600 hover:bg-orange-700 text-white';
        return 'bg-blue-600 hover:bg-blue-700 text-white';
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getIcon()}
                        {title}
                    </DialogTitle>
                    <DialogDescription className="pt-2">{message}</DialogDescription>
                </DialogHeader>
                {details && (
                    <div className="py-2">
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{details}</p>
                    </div>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        {cancelText}
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={isLoading} className={getConfirmButtonClass()}>
                        {isLoading ? 'Processing...' : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmationModal;
