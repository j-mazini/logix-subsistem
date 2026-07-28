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
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { FrontendOperationRecord } from '../types';

export type PendingDaySummaryEntry = {
    depositId: number;
    depositName: string;
    operations: FrontendOperationRecord[];
};

type PendingDayModalProps = {
    open: boolean;
    onClose: () => void;
    pendingDate: string;
    selectedDate: string;
    summary: PendingDaySummaryEntry[];
    onFinish: () => Promise<void>;
    isFinishing?: boolean;
    formatDate: (ymd: string, fmt: string) => string;
};

const PendingDayModal: React.FC<PendingDayModalProps> = ({
    open,
    onClose,
    pendingDate,
    selectedDate,
    summary,
    onFinish,
    isFinishing = false,
    formatDate,
}) => {
    const processingRef = useRef(false);
    useEffect(() => {
        if (!open || !isFinishing) processingRef.current = false;
    }, [open, isFinishing]);

    const pendingLabel = formatDate(pendingDate, 'dd MMM yyyy');
    const selectedLabel = formatDate(selectedDate, 'dd MMM yyyy');
    const totalOps = summary.reduce((acc, s) => acc + s.operations.length, 0);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        Pending day to approve
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-slate-600">
                        Approve <strong>{pendingLabel}</strong> before viewing <strong>{selectedLabel}</strong>.
                    </DialogDescription>
                </DialogHeader>

                {summary.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 max-h-[40vh] overflow-y-auto">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            Operation summary ({totalOps} {totalOps === 1 ? 'record' : 'records'})
                        </p>
                        <ul className="space-y-3">
                            {[...summary]
                                .sort((a, b) => (a.depositName ?? '').localeCompare(b.depositName ?? '', undefined, { sensitivity: 'base' }))
                                .map(({ depositName, operations }) => (
                                    <li key={depositName}>
                                        <span className="text-sm font-medium text-slate-800">{depositName}</span>
                                        <ul className="mt-1 ml-2 space-y-0.5 text-sm text-slate-600">
                                            {[...operations]
                                                .sort((a, b) => String(a.route ?? '').localeCompare(String(b.route ?? ''), undefined, { sensitivity: 'base' }))
                                                .slice(0, 20)
                                                .map((op, idx) => (
                                                    <li key={`${depositName}-${op.weekPlannerId ?? op.operationId ?? ''}-${idx}`} className="flex items-center gap-2">
                                                        <span className="text-slate-500">•</span>
                                                        {op.name ?? ''} – {op.route ?? ''}
                                                        {op.vehicle ? ` (${op.vehicle})` : ''}
                                                    </li>
                                                ))}
                                            {operations.length > 20 && (
                                                <li className="text-slate-400">+ {operations.length - 20} more</li>
                                            )}
                                        </ul>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 py-2">
                        No operations loaded for this date. Close and try again or use the button below to finish if you have already completed elsewhere.
                    </p>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isFinishing}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            if (processingRef.current) return;
                            processingRef.current = true;
                            onFinish();
                        }}
                        disabled={isFinishing}
                        className="gap-2"
                    >
                        {isFinishing ? 'Finishing...' : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Finish
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PendingDayModal;
