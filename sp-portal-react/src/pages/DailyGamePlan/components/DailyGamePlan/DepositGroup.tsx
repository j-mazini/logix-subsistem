import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { StyledButton } from '../shared/StyledButton';
import { dailyGamePlanStyles } from '../../styles';
import { FrontendOperationRecord } from '../../types';
import OperationRow from './OperationRow';
import type { DailyGamePlanWithSupportDTO } from '../../mock/mockDailyGamePlanApi';
import { BUSINESS_RULES } from '../../businessRules';
import type { AdhocServiceDTO } from '../../mock/mockDailyGamePlanApi';

interface DepositHeaderGlassProps {
    depositName: string;
    supervisorName?: string;
    isOperationStarted: boolean;
    onStartStop: () => void;
    embedded?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    summary?: { total: number; working: number; off: number };
    canEdit: boolean;
    isFinished?: boolean;
    dailyTeamSupportStatus?: string | null;
    showDailyTeamSupportStatus?: boolean;
    isFinishing?: boolean;
}

const DepositHeaderGlass = memo(({
    depositName,
    supervisorName,
    isOperationStarted,
    onStartStop,
    embedded = true,
    isCollapsed,
    onToggleCollapse,
    summary,
    canEdit,
    isFinished,
    dailyTeamSupportStatus,
    showDailyTeamSupportStatus,
    isFinishing,
}: DepositHeaderGlassProps) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const headerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (headerRef.current) {
            const rect = headerRef.current.getBoundingClientRect();
            setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    }, []);

    const roundedClass = embedded ? dailyGamePlanStyles.depositHeaderRoundedEmbedded : dailyGamePlanStyles.depositHeaderRounded;
    const containerClassName = embedded ? dailyGamePlanStyles.depositHeaderContainerEmbedded : dailyGamePlanStyles.depositHeaderContainer;

    return (
        <motion.div
            ref={headerRef}
            className={containerClassName}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], type: 'spring', stiffness: 100 }}
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.01 }}
        >
            <motion.div
                className={`${dailyGamePlanStyles.depositHeaderHighlight} ${roundedClass}`}
                style={{ boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.10), 0 14px 40px rgba(99, 102, 241, 0.06)', opacity: 0.08 }}
                animate={{ opacity: [0.06, 0.12, 0.06] }}
                transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
            />
            <div className={`${dailyGamePlanStyles.depositHeaderGradientOverlay} ${roundedClass}`} />
            <motion.div
                className={dailyGamePlanStyles.depositHeaderLightEffect}
                style={{
                    width: 300,
                    height: 300,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.24) 0%, transparent 70%)',
                    x: mousePosition.x - 150,
                    y: mousePosition.y - 150,
                }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
            <div className={`${dailyGamePlanStyles.depositHeaderSheen} ${roundedClass}`} />
            <div className={dailyGamePlanStyles.depositHeaderContent}>
                <div className={dailyGamePlanStyles.depositHeaderLeft}>
                    <motion.div
                        className={dailyGamePlanStyles.depositHeaderIcon}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                        <svg className={dailyGamePlanStyles.depositHeaderIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </motion.div>
                    <div>
                        <motion.h3
                            className={embedded ? dailyGamePlanStyles.depositHeaderTitleEmbedded : dailyGamePlanStyles.depositHeaderTitle}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {depositName}
                        </motion.h3>
                        {summary && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className={dailyGamePlanStyles.depositHeaderBadge}>
                                    <span className={dailyGamePlanStyles.depositHeaderBadgeDot} />
                                    Total {summary.total}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className={dailyGamePlanStyles.depositHeaderRight}>
                    {supervisorName && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/15 text-teal-800 text-sm font-medium shadow-sm">
                            {supervisorName}
                        </span>
                    )}
                    {showDailyTeamSupportStatus && dailyTeamSupportStatus && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm border-slate-400/40 bg-slate-400/10 text-slate-700">
                            {dailyTeamSupportStatus === 'start' ? 'Started' : dailyTeamSupportStatus === 'finish' || dailyTeamSupportStatus === 'finished' ? 'Finished' : dailyTeamSupportStatus}
                        </span>
                    )}
                    {onToggleCollapse && (
                        <button type="button" onClick={onToggleCollapse} className={dailyGamePlanStyles.depositHeaderCollapseButton}>
                            {isCollapsed ? <ChevronDown className={dailyGamePlanStyles.depositHeaderCollapseIcon} /> : <ChevronUp className={dailyGamePlanStyles.depositHeaderCollapseIcon} />}
                        </button>
                    )}
                    {canEdit && (
                        <StyledButton onClick={onStartStop} variant="sidebar" size="md" className={dailyGamePlanStyles.depositHeaderActionButton} disabled={isFinished || isFinishing}>
                            <span className={dailyGamePlanStyles.depositHeaderActionButtonContent}>
                                {!isFinished && (
                                    <motion.svg className={dailyGamePlanStyles.depositHeaderActionButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {isOperationStarted ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 6h12v12H6z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />}
                                    </motion.svg>
                                )}
                                <span className="text-slate-800">{isFinished ? 'Finished' : isOperationStarted ? 'Finish' : 'Start'}</span>
                            </span>
                        </StyledButton>
                    )}
                </div>
            </div>
            <motion.div className={embedded ? dailyGamePlanStyles.depositHeaderAccentBar : dailyGamePlanStyles.depositHeaderAccentBarEmbedded} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} />
        </motion.div>
    );
});
DepositHeaderGlass.displayName = 'DepositHeaderGlass';

const DepositNotesField = memo(({
    notes,
    onNotesChange,
    canEdit,
    onSaveNotes,
}: {
    notes: string;
    onNotesChange: (notes: string) => void;
    canEdit: boolean;
    onSaveNotes?: (notes: string) => Promise<void>;
}) => {
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [localNotes, setLocalNotes] = useState(notes);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setLocalNotes(notes); }, [notes]);

    const handleConfirm = async () => {
        if (onSaveNotes) {
            setIsSaving(true);
            try {
                await onSaveNotes(localNotes);
                onNotesChange(localNotes);
                setIsEditingNotes(false);
            } catch (error) { console.error('Error saving notes:', error); setLocalNotes(notes); } finally { setIsSaving(false); }
        } else { onNotesChange(localNotes); setIsEditingNotes(false); }
    };

    return (
        <div>
            {isEditingNotes && canEdit ? (
                <div className="space-y-2">
                    <textarea value={localNotes} onChange={(e) => setLocalNotes(e.target.value)} className={dailyGamePlanStyles.depositNotesField} placeholder="Add notes..." rows={3} autoFocus disabled={isSaving} />
                    <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { setLocalNotes(notes); setIsEditingNotes(false); }} disabled={isSaving} className={dailyGamePlanStyles.depositNotesButton}>Cancel</button>
                        <button type="button" onClick={handleConfirm} disabled={isSaving} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg">Confirm</button>
                    </div>
                </div>
            ) : (
                <div onClick={() => canEdit && setIsEditingNotes(true)} className={`w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm text-gray-700 min-h-[3rem] ${canEdit ? 'cursor-text hover:border-slate-300' : 'cursor-default'}`}>
                    {notes || <span className="text-gray-400 italic">{canEdit ? 'Click to add notes...' : 'No notes'}</span>}
                </div>
            )}
        </div>
    );
});
DepositNotesField.displayName = 'DepositNotesField';

interface DepositGroupProps {
    depositId: number;
    depositName: string;
    operations: FrontendOperationRecord[];
    dailyGamePlan?: DailyGamePlanWithSupportDTO;
    supervisorName?: string;
    isOperationStarted: boolean;
    onStartStop: (depositId: number) => void;
    isFinishing: boolean;
    isCollapsed: boolean;
    onToggleCollapse: (depositId: number) => void;
    canEdit: boolean;
    isAdmin: boolean;
    userId: number | null;
    adhocServices: AdhocServiceDTO[];
    depositNotes: string;
    onSaveDepositNotes: (notes: string) => Promise<void>;
    handleEdit: (depositId: number, originalIndex: number) => void;
    handleDelete: (depositId: number, originalIndex: number) => void;
    handleEditItem: (item: FrontendOperationRecord) => void;
    handleDeleteItem: (item: FrontendOperationRecord) => void;
    handleCreateAdHoc: (depositId: number, depositName: string) => void;
    handleCreateFlexRoute: (depositId: number, depositName: string) => void;
    onOpenNotesModal: (item: FrontendOperationRecord, currentNote: string, canEditRow?: boolean) => void;
    getVehicleBadgeVariant: (vrn?: string | null) => 'green' | 'blue';
    isDailyGamePlanFinished: (status?: string | null) => boolean;
    baopNotAllocatedTableRows: FrontendOperationRecord[];
    baopDayOffTableRows: FrontendOperationRecord[];
}

const DepositGroup = memo(({
    depositId,
    depositName,
    operations,
    dailyGamePlan,
    supervisorName,
    isOperationStarted,
    onStartStop,
    isFinishing,
    isCollapsed,
    onToggleCollapse,
    canEdit,
    isAdmin,
    userId,
    adhocServices,
    depositNotes,
    onSaveDepositNotes,
    handleEdit,
    handleDelete,
    handleEditItem,
    handleDeleteItem,
    handleCreateAdHoc,
    handleCreateFlexRoute,
    onOpenNotesModal,
    getVehicleBadgeVariant,
    isDailyGamePlanFinished,
    baopNotAllocatedTableRows,
    baopDayOffTableRows,
}: DepositGroupProps) => {
    const depIdNum = Number(depositId);

    const isUserResponsibleForDeposit = !!dailyGamePlan?.dailyTeamSupport && Number(dailyGamePlan.dailyTeamSupport.userId) === userId;
    const isAdminResponsibleForDeposit = isAdmin && isUserResponsibleForDeposit;
    const canEditThisDeposit = canEdit && (isAdminResponsibleForDeposit || (!isAdmin && isUserResponsibleForDeposit));
    const showDailyTeamSupportStatus = (isAdmin && !isAdminResponsibleForDeposit) || (!isAdmin && !isUserResponsibleForDeposit);

    const indexedOperations = operations.map((item, originalIndex) => ({ item, originalIndex }));
    const hasAdhocServiceId = (op: FrontendOperationRecord) => {
        const id = op.adhocServiceId;
        return id !== undefined && id !== null && Number.isFinite(Number(id)) && Number(id) > 0;
    };

    const adhocOperations = indexedOperations.filter(({ item }) => hasAdhocServiceId(item));
    const normalOperations = indexedOperations.filter(({ item }) => !hasAdhocServiceId(item));

    const workingOperations = normalOperations.filter(({ item }) => item.status === BUSINESS_RULES.WORKING_STATUS.WORKING && !item.isDayOff);
    const offOperations = normalOperations.filter(({ item }) => item.status === BUSINESS_RULES.WORKING_STATUS.OFF || item.isDayOff);
    const adhocWorkingOperations = adhocOperations.filter(({ item }) => item.status === BUSINESS_RULES.WORKING_STATUS.WORKING && !item.isDayOff);
    const adhocOffOperations = adhocOperations.filter(({ item }) => item.status === BUSINESS_RULES.WORKING_STATUS.OFF || item.isDayOff);

    const showBaopNotAllocatedInMainTable = depIdNum === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT && baopNotAllocatedTableRows.length > 0;
    const showBaopDayOffInMainTable = depIdNum === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT && baopDayOffTableRows.length > 0;
    const summaryMainWorkingCount = workingOperations.length + (showBaopNotAllocatedInMainTable ? baopNotAllocatedTableRows.length : 0);
    const summaryOffCount = offOperations.length + (showBaopDayOffInMainTable ? baopDayOffTableRows.length : 0);

    const summary = {
        total: Math.max(normalOperations.length, summaryMainWorkingCount + summaryOffCount),
        working: summaryMainWorkingCount,
        off: summaryOffCount,
    };

    const isFinished = isDailyGamePlanFinished(dailyGamePlan?.status);
    const canEditRows = canEditThisDeposit && !isFinished;

    return (
        <motion.div className="mb-8" layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
                <DepositHeaderGlass
                    embedded
                    depositName={depositName}
                    supervisorName={supervisorName}
                    isOperationStarted={isOperationStarted}
                    onStartStop={() => onStartStop(depIdNum)}
                    isFinishing={isFinishing}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => onToggleCollapse(depIdNum)}
                    summary={summary}
                    canEdit={canEditThisDeposit}
                    isFinished={isFinished}
                    dailyTeamSupportStatus={dailyGamePlan?.status ?? null}
                    showDailyTeamSupportStatus={showDailyTeamSupportStatus}
                />

                <AnimatePresence initial={false}>
                    {!isCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-200">
                            {operations.length === 0 && !showBaopNotAllocatedInMainTable && !showBaopDayOffInMainTable ? (
                                <div className="p-4 text-center">
                                    <p className="text-gray-500 text-sm">No operations found for this deposit.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto overflow-y-visible">
                                        {/* table-fixed divided columns equally regardless of content, so on
                                            phone widths names like "Michael Brown" and plates like "UK EF56 GHI"
                                            no longer fit their ~55px cell and rendered overflow:visible straight
                                            over the next column. table-auto + a min-width lets the existing
                                            overflow-x-auto wrapper do its job: real column widths, scrollable
                                            below ~640px instead of overlapping. */}
                                        <table className="w-full min-w-[640px] table-auto">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                    <th className="px-3 md:px-6 py-2 text-left">Route</th>
                                                    <th className="px-3 md:px-6 py-2 text-left">Vendor</th>
                                                    <th className="px-3 md:px-6 py-2 text-center">Sort</th>
                                                    <th className="px-3 md:px-6 py-2 text-left">Vehicle</th>
                                                    <th className="px-3 md:px-6 py-2 text-left">Notes</th>
                                                    {canEditThisDeposit && <th className="px-3 md:px-6 py-2 text-center">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {workingOperations.map(({ item, originalIndex }, displayIndex) => (
                                                    <OperationRow
                                                        key={`${depositId}-working-${originalIndex}`}
                                                        item={item}
                                                        index={displayIndex}
                                                        noteValue={item.notes || ''}
                                                        onEdit={() => handleEdit(depIdNum, originalIndex)}
                                                        onDelete={() => handleDelete(depIdNum, originalIndex)}
                                                        onOpenNotesModal={onOpenNotesModal}
                                                        canEdit={canEditRows}
                                                        getVehicleBadgeVariant={getVehicleBadgeVariant}
                                                    />
                                                ))}
                                                {showBaopNotAllocatedInMainTable && baopNotAllocatedTableRows.map((item, displayIndex) => (
                                                    <OperationRow
                                                        key={`${depositId}-baop-api-${item.dailyGamePlanOperationId ?? displayIndex}`}
                                                        item={item}
                                                        index={workingOperations.length + displayIndex}
                                                        noteValue={item.notes || ''}
                                                        onEdit={() => handleEditItem(item)}
                                                        onDelete={() => handleDeleteItem(item)}
                                                        onOpenNotesModal={onOpenNotesModal}
                                                        canEdit={canEditRows}
                                                        getVehicleBadgeVariant={getVehicleBadgeVariant}
                                                    />
                                                ))}
                                                {showBaopDayOffInMainTable && baopDayOffTableRows.map((item, displayIndex) => (
                                                    <OperationRow
                                                        key={`${depositId}-baop-dayoff-${item.dailyGamePlanOperationId ?? displayIndex}`}
                                                        item={item}
                                                        index={workingOperations.length + (showBaopNotAllocatedInMainTable ? baopNotAllocatedTableRows.length : 0) + displayIndex}
                                                        noteValue={item.notes || ''}
                                                        onEdit={() => handleEditItem(item)}
                                                        onDelete={() => handleDeleteItem(item)}
                                                        onOpenNotesModal={onOpenNotesModal}
                                                        canEdit={canEditRows}
                                                        getVehicleBadgeVariant={getVehicleBadgeVariant}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {adhocOperations.length > 0 && (
                                        <div className="border-t-2 border-purple-200 bg-purple-50/30">
                                            <div className="px-6 py-3 bg-gradient-to-r from-purple-100 to-purple-50 border-b border-purple-200">
                                                <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wider">Adhoc Services</h3>
                                            </div>
                                            <div className="overflow-x-auto overflow-y-visible">
                                                <table className="w-full min-w-[560px] table-auto">
                                                    <thead>
                                                        <tr className="bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-200 text-xs font-bold text-purple-900 uppercase tracking-wider">
                                                            <th className="px-3 md:px-6 py-2 text-left">Service</th>
                                                            <th className="px-3 md:px-6 py-2 text-left">Vendor</th>
                                                            <th className="px-3 md:px-6 py-2 text-left">Vehicle</th>
                                                            <th className="px-3 md:px-6 py-2 text-left">Notes</th>
                                                            {canEditThisDeposit && <th className="px-3 md:px-6 py-2 text-center">Actions</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-purple-100">
                                                        {adhocWorkingOperations.map(({ item, originalIndex }, displayIndex) => (
                                                            <OperationRow
                                                                key={`${depositId}-adhoc-working-${originalIndex}`}
                                                                variant="adhoc"
                                                                item={{ ...item, route: adhocServices.find(s => s.adhocServiceId === item.adhocServiceId)?.adhocName || 'AD-HOC Service' }}
                                                                index={displayIndex}
                                                                noteValue={item.notes || ''}
                                                                onEdit={() => handleEdit(depIdNum, originalIndex)}
                                                                onDelete={() => handleDelete(depIdNum, originalIndex)}
                                                                onOpenNotesModal={onOpenNotesModal}
                                                                canEdit={canEditRows}
                                                                getVehicleBadgeVariant={getVehicleBadgeVariant}
                                                            />
                                                        ))}
                                                        {adhocOffOperations.map(({ item, originalIndex }, displayIndex) => (
                                                            <OperationRow
                                                                key={`${depositId}-adhoc-off-${originalIndex}`}
                                                                variant="adhoc"
                                                                item={{ ...item, route: adhocServices.find(s => s.adhocServiceId === item.adhocServiceId)?.adhocName || 'AD-HOC Service' }}
                                                                index={adhocWorkingOperations.length + displayIndex}
                                                                noteValue={item.notes || ''}
                                                                onEdit={() => handleEdit(depIdNum, originalIndex)}
                                                                onDelete={() => handleDelete(depIdNum, originalIndex)}
                                                                onOpenNotesModal={onOpenNotesModal}
                                                                canEdit={canEditRows}
                                                                getVehicleBadgeVariant={getVehicleBadgeVariant}
                                                            />
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-t border-gray-200 px-6 py-4 flex items-center gap-6 text-sm">
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span className="text-gray-600 font-medium">Working: {summaryMainWorkingCount}</span></div>
                                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /><span className="text-gray-600 font-medium">Off: {summaryOffCount}</span></div>
                                    </div>

                                    <div className="bg-white border-t border-gray-200 px-6 py-4">
                                        <DepositNotesField notes={depositNotes} onNotesChange={() => { }} canEdit={canEditRows} onSaveNotes={onSaveDepositNotes} />
                                    </div>

                                    {canEditThisDeposit && !isFinished && depIdNum !== 0 && (
                                        <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
                                            {depIdNum !== BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT && (
                                                <StyledButton type="button" variant="sidebar" size="md" className="rounded-2xl px-4 py-2" onClick={() => handleCreateAdHoc(depIdNum, depositName)}>New Adhoc</StyledButton>
                                            )}
                                            <StyledButton type="button" variant="sidebar" size="md" className="rounded-2xl px-4 py-2" onClick={() => handleCreateFlexRoute(depIdNum, depositName)}>New Route</StyledButton>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
});

DepositGroup.displayName = 'DepositGroup';

export default DepositGroup;
