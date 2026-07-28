import React, { memo } from 'react';
import MessageModal from '../MessageModal';
import ConfirmationModal from '../ConfirmationModal';
import PendingDayModal from '../PendingDayModal';
import OpenOperationModal from '../OpenOperationModal';
import type { PendingDaySummaryEntry } from '../PendingDayModal';
import type { OpenOperationSummary } from '../OpenOperationModal';

/**
 * Section to handle all common modals in the Daily Game Plan page.
 */
const ModalsSection = memo(({
    messageModal,
    setMessageModal,
    confirmationModal,
    setConfirmationModal,
    pendingDayModal,
    setPendingDayModal,
    pendingDaySummary,
    handlePendingDayFinish,
    openOperationModal,
    setOpenOperationModal,
    openOperationSummary,
    viewDate,
    formatDate,
    isFinishing,
    isPendingDayFinishing,
    isOpenOperationFinishing,
    handleOpenOperationFinish,
}: {
    messageModal: { open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' };
    setMessageModal: React.Dispatch<React.SetStateAction<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>>;
    confirmationModal: { open: boolean; title: string; message: string; variant: 'primary' | 'danger'; onConfirm: () => void };
    setConfirmationModal: React.Dispatch<React.SetStateAction<{ open: boolean; title: string; message: string; variant: 'primary' | 'danger'; onConfirm: () => void }>>;
    pendingDayModal: { open: boolean; pendingDate: string; selectedDate: string; depositIds: number[] };
    setPendingDayModal: React.Dispatch<React.SetStateAction<{ open: boolean; pendingDate: string; selectedDate: string; depositIds: number[] }>>;
    pendingDaySummary: PendingDaySummaryEntry[];
    handlePendingDayFinish: () => Promise<void>;
    openOperationModal: boolean;
    setOpenOperationModal: (v: boolean) => void;
    openOperationSummary: OpenOperationSummary | null;
    viewDate: string;
    formatDate: (ymd: string, fmt: string, fallback?: string) => string;
    handleOpenOperationFinish: () => Promise<void>;
    isFinishing: boolean;
    isPendingDayFinishing: boolean;
    isOpenOperationFinishing: boolean;
}) => {
    const confirmationVariant = confirmationModal.variant === 'primary' ? 'info' : confirmationModal.variant;
    const messageVariant: 'success' | 'error' | 'info' = messageModal.variant === 'warning' ? 'info' : messageModal.variant;

    return (
        <>
            <MessageModal
                open={messageModal.open}
                title={messageModal.title}
                message={messageModal.message}
                variant={messageVariant}
                onClose={() => setMessageModal({ ...messageModal, open: false })}
            />

            <ConfirmationModal
                open={confirmationModal.open}
                title={confirmationModal.title}
                message={confirmationModal.message}
                variant={confirmationVariant}
                onClose={() => setConfirmationModal({ ...confirmationModal, open: false })}
                onConfirm={confirmationModal.onConfirm}
                isLoading={isFinishing}
            />

            <PendingDayModal
                open={pendingDayModal.open}
                onClose={() => setPendingDayModal({ ...pendingDayModal, open: false })}
                pendingDate={pendingDayModal.pendingDate}
                selectedDate={pendingDayModal.selectedDate}
                summary={pendingDaySummary}
                onFinish={handlePendingDayFinish}
                isFinishing={isPendingDayFinishing}
                formatDate={formatDate}
            />

            <OpenOperationModal
                open={Boolean(openOperationModal && !isFinishing)}
                onClose={() => setOpenOperationModal(false)}
                summary={openOperationSummary}
                onFinish={handleOpenOperationFinish}
                isFinishing={isOpenOperationFinishing}
                formatDate={formatDate}
                viewDate={viewDate}
            />
        </>
    );
});

ModalsSection.displayName = 'ModalsSection';

export default ModalsSection;
