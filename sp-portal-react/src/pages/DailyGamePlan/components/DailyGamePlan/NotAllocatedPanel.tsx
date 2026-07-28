import React, { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, StickyNote, UserX } from 'lucide-react';
import ServicePartnerBadge from '../shared/ServicePartnerBadge';
import { useServicePartnerNameByUserId } from '../../hooks/useServicePartnerNameByUserId';
import { dailyGamePlanStyles } from '../../styles';
import { FrontendOperationRecord } from '../../types';

interface NotAllocatedPanelProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    notAllocatedCount: number;
    notAllocatedDisplay: Array<{
        item: FrontendOperationRecord;
        depositName: string;
        rawStatus: string;
        reason: string | null;
        registrationPlate: string;
        isVanHome: boolean | null;
        routeDefaultName: string;
    }>;
    handleEditItem: (item: FrontendOperationRecord) => void;
    handleDeleteItem: (item: FrontendOperationRecord) => void;
    onOpenNotesModal: (item: FrontendOperationRecord, currentNote: string, canEditRow?: boolean) => void;
    getVehicleBadgeVariant: (vrn?: string | null) => 'green' | 'blue';
    canEdit: boolean;
}

/**
 * Dedicated row component for the Not Allocated panel.
 * Column order: Name | Deposit | Default Route | Notes | Actions
 */
const NotAllocatedRow = memo(({
    item,
    depositName,
    routeDefaultName,
    index,
    onEdit,
    onDelete,
    onOpenNotesModal,
    canEdit,
}: {
    item: FrontendOperationRecord;
    depositName: string;
    routeDefaultName: string;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
    onOpenNotesModal: (item: FrontendOperationRecord, currentNote: string, canEditRow?: boolean) => void;
    canEdit: boolean;
}) => {
    const noteValue = item.notes || '';
    const servicePartnerMap = useServicePartnerNameByUserId();
    const spName = item.userId ? servicePartnerMap.get(Number(item.userId)) ?? null : null;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.6), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={dailyGamePlanStyles.tableRow}
        >
            <td className={dailyGamePlanStyles.tableCell}>
                <div className={`${dailyGamePlanStyles.vendorName} flex items-center gap-1.5 flex-wrap`}>
                    <span>{item.name || '-'}</span>
                    {spName !== null && <ServicePartnerBadge partnerName={spName} size="xs" />}
                </div>
            </td>

            <td className={dailyGamePlanStyles.tableCell}>
                <span className="text-sm text-gray-700 font-medium">{depositName || '-'}</span>
            </td>

            <td className={dailyGamePlanStyles.tableCell}>
                {routeDefaultName ? (
                    <div className={dailyGamePlanStyles.routeBadge}>
                        <span className={dailyGamePlanStyles.routeBadgeText}>{routeDefaultName}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">-</span>
                )}
            </td>

            <td className={dailyGamePlanStyles.tableCellLeft}>
                <div className={`${dailyGamePlanStyles.notesFieldWrapper} flex items-center gap-1`}>
                    <button
                        type="button"
                        onClick={() => onOpenNotesModal(item, noteValue, canEdit)}
                        className="relative lg:hidden flex items-center justify-center w-9 h-9 min-w-[36px] rounded-lg border border-yellow-200/60 bg-[#FFFBEB] hover:border-yellow-300/70 hover:shadow-md transition shrink-0"
                        title={noteValue ? 'View/Edit notes' : 'Add notes'}
                    >
                        <StickyNote className="h-5 w-5 text-amber-700" strokeWidth={2} />
                        {noteValue ? <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden /> : null}
                    </button>
                    <button
                        type="button"
                        onClick={() => onOpenNotesModal(item, noteValue, canEdit)}
                        className={`${dailyGamePlanStyles.notesField} hidden lg:block`}
                    >
                        <div className={dailyGamePlanStyles.notesFieldText}>
                            {noteValue || <span className={dailyGamePlanStyles.notesFieldPlaceholder}>Notes...</span>}
                        </div>
                    </button>
                </div>
            </td>

            {canEdit && (
                <td className={dailyGamePlanStyles.tableCellCenter}>
                    <div className="flex items-center justify-center gap-2 opacity-100">
                        <motion.button onClick={onEdit} className={`${dailyGamePlanStyles.actionButton} ${dailyGamePlanStyles.actionButtonEdit}`} title="Edit" whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                            <svg className={dailyGamePlanStyles.actionButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </motion.button>
                        <motion.button onClick={onDelete} className={`${dailyGamePlanStyles.actionButton} ${dailyGamePlanStyles.actionButtonDelete}`} title="Delete" whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.9 }}>
                            <svg className={dailyGamePlanStyles.actionButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </motion.button>
                    </div>
                </td>
            )}
        </motion.tr>
    );
});
NotAllocatedRow.displayName = 'NotAllocatedRow';

const NotAllocatedPanel = memo(({
    isCollapsed,
    onToggleCollapse,
    notAllocatedCount,
    notAllocatedDisplay,
    handleEditItem,
    handleDeleteItem,
    onOpenNotesModal,
    canEdit,
}: NotAllocatedPanelProps) => {
    if (notAllocatedCount === 0) return null;

    return (
        <motion.div className="mb-8" layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-xl shadow-lg border border-amber-100 overflow-hidden">
                <button onClick={onToggleCollapse} className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white hover:from-amber-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                            <UserX className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Not Allocated</h3>
                            <p className="text-xs text-amber-700 font-medium">{notAllocatedCount} vendor{notAllocatedCount !== 1 ? 's' : ''} with no route today</p>
                        </div>
                    </div>
                    {isCollapsed ? <ChevronDown className="h-5 w-5 text-amber-400" /> : <ChevronUp className="h-5 w-5 text-amber-400" />}
                </button>

                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                            <div className="overflow-x-auto">
                                <table className="w-full table-fixed">
                                    <thead>
                                        <tr className="bg-amber-50/30 border-b border-amber-100 text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                                            <th className="px-6 py-2.5 text-left w-1/4">Name</th>
                                            <th className="px-6 py-2.5 text-left w-1/4">Deposit</th>
                                            <th className="px-6 py-2.5 text-left w-1/4">Default Route</th>
                                            <th className="px-6 py-2.5 text-left w-1/4">Notes</th>
                                            {canEdit && <th className="px-6 py-2.5 text-center w-24">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-50">
                                        {notAllocatedDisplay.map(({ item, depositName, routeDefaultName }, idx) => (
                                            <NotAllocatedRow
                                                key={`nalc-${item.dailyGamePlanOperationId ?? idx}`}
                                                item={item}
                                                depositName={depositName}
                                                routeDefaultName={routeDefaultName}
                                                index={idx}
                                                onEdit={() => handleEditItem(item)}
                                                onDelete={() => handleDeleteItem(item)}
                                                onOpenNotesModal={onOpenNotesModal}
                                                canEdit={canEdit}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
});

NotAllocatedPanel.displayName = 'NotAllocatedPanel';

export default NotAllocatedPanel;
