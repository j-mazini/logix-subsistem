import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { PortalLayout } from '@/layout/PortalLayout';
import './tailwind.css';
import './daily-game-plan.css';
import { dailyGamePlanStyles } from './styles';
import { useDailyGamePlan } from './hooks/useDailyGamePlan';
import ActionBar from './components/DailyGamePlan/ActionBar';
import DepositGroup from './components/DailyGamePlan/DepositGroup';
import VendorsOffPanel from './components/DailyGamePlan/VendorsOffPanel';
import NotAllocatedPanel from './components/DailyGamePlan/NotAllocatedPanel';
import ModalsSection from './components/DailyGamePlan/ModalsSection';
import OperationFormModal from './components/DailyGamePlan/OperationFormModal';
import NotesModal from './components/NotesModal';
import { isAllowedDeposit } from './utils/allowedDeposits';
import { groupOperationsByDeposit } from './utils/mappers';
import { FrontendOperationRecord } from './types';
import { BUSINESS_RULES } from './businessRules';

/**
 * Main Daily Game Plan Content component.
 * Faithful port of the Next.js app's `DailyGamePlanContent.tsx` — orchestrates the UI,
 * all business logic lives in `useDailyGamePlan` (see hooks/useDailyGamePlan.ts).
 */
function DailyGamePlanContent() {
    const {
        selectedDate,
        viewDate,
        loading, error,
        weekPlannersData,
        dailyGamePlans,
        adhocServices,
        deposits,
        isAdmin, isSupervisor, userId,
        messageModal, setMessageModal,
        confirmationModal, setConfirmationModal,
        pendingDayModal, setPendingDayModal,
        pendingDayModalSummary,
        openOperationModal, setOpenOperationModal,
        openOperationSummary,
        formatDateDisplay,
        isFinishing, isPendingDayFinishing, isOpenOperationFinishing,
        collapsedDeposits, handleToggleCollapse,
        isOffPanelCollapsed, handleToggleOffPanel,
        isNotAllocatedPanelCollapsed, handleToggleNotAllocatedPanel,
        showModal, setShowModal,
        editingIndex, setEditingIndex,
        formData, setFormData,
        notesModal, setNotesModal,
        handleStartStop,
        handleEditItem,
        handleDeleteItem,
        handleSubmit,
        handlePendingDayFinish,
        handleOpenOperationFinish,
        onOpenNotesModal,
        handleSaveNote,
        fetchData,
        lookupMaps,
        supervisorDepositIds,
        isDailyGamePlanFinished,
        handleSaveDepositNotes,
        handleCreateAdHoc,
        handleCreateFlexRoute,
        vendorsOffDisplay,
        notAllocatedDisplay,
        handleFormFieldChange,
        searchTerm,
        setSearchTerm,
    } = useDailyGamePlan();

    const dataByDeposit = useMemo(() =>
        groupOperationsByDeposit(
            weekPlannersData,
            deposits,
            isAdmin,
            isSupervisor,
            supervisorDepositIds,
            isAllowedDeposit
        ),
        [weekPlannersData, deposits, isAdmin, isSupervisor, supervisorDepositIds]);

    const routeOptions = useMemo(() => {
        if (!lookupMaps?.routeMap) return [];
        const depId = formData.depositId;
        const allRoutes = Array.from(lookupMaps.routeMap.values());
        if (!depId) return allRoutes;
        return allRoutes.filter((r: any) => r.depositId === depId);
    }, [formData.depositId, lookupMaps]);

    const notAllocatedByDeposit = useMemo(() => {
        const map = new Map<number, FrontendOperationRecord[]>();
        weekPlannersData.forEach(op => {
            const depId = op.depositId ?? 0;
            const isBAOP = depId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT;
            const shouldInclude = isBAOP ? true : op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
            if (shouldInclude) {
                if (!map.has(depId)) map.set(depId, []);
                map.get(depId)!.push(op);
            }
        });
        return map;
    }, [weekPlannersData]);

    const dayOffByDeposit = useMemo(() => {
        const map = new Map<number, FrontendOperationRecord[]>();
        weekPlannersData.forEach(op => {
            const depId = op.depositId ?? 0;
            const isBAOP = depId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT;
            const shouldInclude = isBAOP ? false : (op.isDayOff || op.status === BUSINESS_RULES.WORKING_STATUS.OFF);
            if (shouldInclude) {
                if (!map.has(depId)) map.set(depId, []);
                map.get(depId)!.push(op);
            }
        });
        return map;
    }, [weekPlannersData]);

    // Filter out the OFF deposit (depositId 4, avoids duplicate display with
    // VendorsOffPanel) and any deposit with nothing to show today — admins are
    // pre-populated with every allowed deposit (see groupOperationsByDeposit), but an
    // empty group with no way to act on it (BAOP's "New Route"-only groups aside) is
    // just noise here.
    const filteredDataByDeposit = useMemo(() => {
        const filtered = new Map(dataByDeposit);
        filtered.delete(4);
        for (const [depId, { operations }] of filtered) {
            const isBAOP = depId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT;
            const hasBaopRows = isBAOP && ((notAllocatedByDeposit.get(depId)?.length ?? 0) > 0 || (dayOffByDeposit.get(depId)?.length ?? 0) > 0);
            if (operations.length === 0 && !hasBaopRows) {
                filtered.delete(depId);
            }
        }
        return filtered;
    }, [dataByDeposit, notAllocatedByDeposit, dayOffByDeposit]);

    if (error) {
        return <div className="p-8 text-red-600 font-bold bg-red-50 rounded-xl border border-red-200">{error}</div>;
    }

    return (
        <>
            <div className="fixed inset-0 dgp-liquid-glass-bg -z-10" aria-hidden />
            <div className={dailyGamePlanStyles.pageContainer}>
                <ActionBar
                    onRefresh={() => fetchData()}
                    isLoading={loading}
                    viewDate={viewDate || selectedDate}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

                <main className="space-y-8 pb-32">
                    <AnimatePresence>
                        {Array.from(filteredDataByDeposit.entries()).map(([depId, { depositName, operations }]) => (
                            <DepositGroup
                                key={depId}
                                depositId={depId}
                                depositName={depositName}
                                operations={operations}
                                dailyGamePlan={dailyGamePlans.get(depId)}
                                supervisorName={dailyGamePlans.get(depId)?.dailyTeamSupport?.fullName}
                                isOperationStarted={dailyGamePlans.get(depId)?.status === 'start'}
                                onStartStop={() => handleStartStop(depId)}
                                isFinishing={isFinishing}
                                isCollapsed={collapsedDeposits.has(depId)}
                                onToggleCollapse={() => handleToggleCollapse(depId)}
                                canEdit={isSupervisor || isAdmin}
                                isAdmin={isAdmin}
                                userId={userId}
                                adhocServices={adhocServices}
                                depositNotes={dailyGamePlans.get(depId)?.notes ?? ''}
                                onSaveDepositNotes={(notes) => handleSaveDepositNotes(depId, notes)}
                                handleEdit={(did, idx) => {
                                    const op = operations[idx];
                                    if (op) handleEditItem(op);
                                }}
                                handleDelete={(did, idx) => {
                                    const op = operations[idx];
                                    if (op) handleDeleteItem(op);
                                }}
                                handleEditItem={handleEditItem}
                                handleDeleteItem={handleDeleteItem}
                                handleCreateAdHoc={handleCreateAdHoc}
                                handleCreateFlexRoute={handleCreateFlexRoute}
                                onOpenNotesModal={onOpenNotesModal}
                                getVehicleBadgeVariant={(v) => v === 'NOVEHICLE' ? 'blue' : 'green'}
                                isDailyGamePlanFinished={isDailyGamePlanFinished}
                                baopNotAllocatedTableRows={notAllocatedByDeposit.get(depId) || []}
                                baopDayOffTableRows={dayOffByDeposit.get(depId) || []}
                            />
                        ))}
                    </AnimatePresence>

                    <VendorsOffPanel
                        isCollapsed={isOffPanelCollapsed}
                        onToggleCollapse={handleToggleOffPanel}
                        vendorsOffCount={vendorsOffDisplay.length}
                        vendorsOffDisplay={vendorsOffDisplay}
                        handleEditItem={handleEditItem}
                        handleDeleteItem={handleDeleteItem}
                        onOpenNotesModal={onOpenNotesModal}
                        canEdit={false}
                        getVehicleBadgeVariant={(v) => v === 'NOVEHICLE' ? 'blue' : 'green'}
                    />

                    <NotAllocatedPanel
                        isCollapsed={isNotAllocatedPanelCollapsed}
                        onToggleCollapse={handleToggleNotAllocatedPanel}
                        notAllocatedCount={notAllocatedDisplay.length}
                        notAllocatedDisplay={notAllocatedDisplay}
                        handleEditItem={handleEditItem}
                        handleDeleteItem={handleDeleteItem}
                        onOpenNotesModal={onOpenNotesModal}
                        canEdit={false}
                        getVehicleBadgeVariant={(v) => v === 'NOVEHICLE' ? 'blue' : 'green'}
                    />
                </main>

                <ModalsSection
                    messageModal={messageModal}
                    setMessageModal={setMessageModal}
                    confirmationModal={confirmationModal}
                    setConfirmationModal={setConfirmationModal}
                    pendingDayModal={pendingDayModal}
                    setPendingDayModal={setPendingDayModal}
                    pendingDaySummary={pendingDayModalSummary}
                    handlePendingDayFinish={handlePendingDayFinish}
                    openOperationModal={openOperationModal}
                    setOpenOperationModal={setOpenOperationModal}
                    openOperationSummary={openOperationSummary}
                    viewDate={viewDate || selectedDate}
                    formatDate={formatDateDisplay}
                    handleOpenOperationFinish={handleOpenOperationFinish}
                    isFinishing={isFinishing}
                    isPendingDayFinishing={isPendingDayFinishing}
                    isOpenOperationFinishing={isOpenOperationFinishing}
                />

                <NotesModal state={notesModal} onClose={() => setNotesModal({ open: false, item: null, currentNote: '', canEdit: false })} onSave={handleSaveNote} />

                <OperationFormModal
                    show={showModal}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                    formData={formData}
                    onChange={handleFormFieldChange}
                    title={editingIndex !== null ? 'Edit Operation' : 'New Operation'}
                    isEditing={editingIndex !== null}
                    isAdmin={isAdmin}
                    isSupervisor={isSupervisor}
                    vendors={lookupMaps?.vendorMap ? Array.from(lookupMaps.vendorMap.values()) : []}
                    routes={lookupMaps?.routeMap ? Array.from(lookupMaps.routeMap.values()) : []}
                    vehicles={lookupMaps?.vehicleMap ? Array.from(lookupMaps.vehicleMap.values()) : []}
                    adhocServices={adhocServices}
                    routeOptions={routeOptions}
                />
            </div>
        </>
    );
}

export function DailyGamePlan() {
    return (
        <PortalLayout mainClassName="dgp-tw-scope w-full min-w-0" title="Daily Game Plan">
            <DailyGamePlanContent />
        </PortalLayout>
    );
}

export default DailyGamePlan;
