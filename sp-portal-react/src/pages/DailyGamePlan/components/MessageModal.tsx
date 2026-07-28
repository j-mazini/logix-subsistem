import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

type MessageModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: 'success' | 'error' | 'info';
    primaryActionLabel?: string;
    onPrimaryAction?: () => void;
};

const MessageModal: React.FC<MessageModalProps> = ({
    open,
    onClose,
    title,
    message,
    variant = 'info',
    primaryActionLabel,
    onPrimaryAction,
}) => {
    const getIcon = () => {
        if (variant === 'success') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
        if (variant === 'error') return <XCircle className="h-5 w-5 text-red-600" />;
        return <Info className="h-5 w-5 text-blue-600" />;
    };

    const getButtonClass = () => {
        if (variant === 'success') return 'bg-green-600 hover:bg-green-700 text-white';
        if (variant === 'error') return 'bg-red-600 hover:bg-red-700 text-white';
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
                <DialogFooter>
                    {primaryActionLabel && onPrimaryAction && (
                        <Button type="button" variant="outline" onClick={onPrimaryAction}>
                            {primaryActionLabel}
                        </Button>
                    )}
                    <Button type="button" onClick={onClose} className={getButtonClass()}>
                        OK
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MessageModal;
