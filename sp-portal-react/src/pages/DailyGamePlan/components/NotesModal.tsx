import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/Dialog';
import { Button } from './ui/Button';
import { StickyNote } from 'lucide-react';
import type { FrontendOperationRecord } from '../types';

type NotesModalState = { open: boolean; item: FrontendOperationRecord | null; currentNote: string; canEdit: boolean };

/**
 * `onOpenNotesModal` / `notesModal` state exists in the source Next.js hook but is
 * never rendered anywhere in `DailyGamePlanContent.tsx` — clicking a Notes button
 * there sets the state and nothing else happens. That's preserved as dead state in
 * `useDailyGamePlan.ts` for fidelity, but leaving the Notes buttons visibly inert in
 * this demo would read as broken rather than faithful, so this small view/edit modal
 * (same visual language as the rest of the page) was added to actually show it.
 */
export default function NotesModal({
    state,
    onClose,
    onSave,
}: {
    state: NotesModalState;
    onClose: () => void;
    onSave: (item: FrontendOperationRecord, note: string) => Promise<void>;
}) {
    const [value, setValue] = useState(state.currentNote);
    const [saving, setSaving] = useState(false);

    useEffect(() => setValue(state.currentNote), [state.currentNote, state.item]);

    if (!state.item) return null;

    const handleSave = async () => {
        if (!state.item) return;
        setSaving(true);
        try {
            await onSave(state.item, value);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={state.open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <StickyNote className="h-5 w-5 text-amber-600" />
                        Notes — {state.item.name || state.item.route}
                    </DialogTitle>
                </DialogHeader>
                {state.canEdit ? (
                    <textarea
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        rows={4}
                        autoFocus
                        placeholder="Add notes..."
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    />
                ) : (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[3rem]">
                        {value || <span className="text-slate-400 italic">No notes</span>}
                    </p>
                )}
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        {state.canEdit ? 'Cancel' : 'Close'}
                    </Button>
                    {state.canEdit && (
                        <Button type="button" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
