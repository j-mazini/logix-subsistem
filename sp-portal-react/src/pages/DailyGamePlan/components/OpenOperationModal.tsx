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
import { Clock } from 'lucide-react';
import type { FrontendOperationRecord } from '../types';

export type OpenOperationSummary = {
    depositId: number;
    depositName: string;
    operations: FrontendOperationRecord[];
};

type OpenOperationModalProps = {
    open: boolean;
    onClose: () => void;
    summary: OpenOperationSummary | null;
    onFinish: () => Promise<void>;
    isFinishing?: boolean;
    formatDate: (ymd: string, fmt: string) => string;
    viewDate: string;
};

const OpenOperationModal: React.FC<OpenOperationModalProps> = ({ open, onClose, summary, formatDate, viewDate }) => {
    const dateLabel = formatDate(viewDate, 'dd MMM yyyy');
    const totalOps = summary?.operations?.length ?? 0;
    const depositName = summary?.depositName ?? 'deposit';

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Open operation
                    </DialogTitle>
                    <DialogDescription className="pt-2 text-slate-600">
                        There is an ongoing operation for <strong>{dateLabel}</strong>.
                        To finish the day, use the <strong>Finish</strong> button in the header of deposit <strong>{depositName}</strong> (the same button used to Start).
                    </DialogDescription>
                </DialogHeader>

                {summary && summary.operations.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 max-h-[40vh] overflow-y-auto">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                            Operation summary - {summary.depositName} ({totalOps} {totalOps === 1 ? 'record' : 'records'})
                        </p>
                        <ul className="space-y-1.5 text-sm text-slate-700">
                            {[...summary.operations]
                                .sort((a, b) => String(a.route ?? '').localeCompare(String(b.route ?? ''), undefined, { sensitivity: 'base' }))
                                .slice(0, 25)
                                .map((op, idx) => (
                                    <li key={op.weekPlannerId ?? op.operationId ?? idx} className="flex items-center gap-2">
                                        <span className="text-slate-400">•</span>
                                        {op.name ?? ''} – {op.route ?? ''}
                                        {op.vehicle ? ` (${op.vehicle})` : ''}
                                    </li>
                                ))}
                            {summary.operations.length > 25 && (
                                <li className="text-slate-400">+ {summary.operations.length - 25} more</li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 py-2">No operations loaded for this date.</p>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" onClick={onClose} className="gap-2">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OpenOperationModal;
