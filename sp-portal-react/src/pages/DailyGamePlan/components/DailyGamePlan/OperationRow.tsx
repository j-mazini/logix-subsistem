import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, StickyNote, X as XIcon } from 'lucide-react';
import VrnPlate from '../shared/VrnPlate';
import ServicePartnerBadge from '../shared/ServicePartnerBadge';
import { useServicePartnerNameByUserId } from '../../hooks/useServicePartnerNameByUserId';
import { dailyGamePlanStyles } from '../../styles';
import { FrontendOperationRecord } from '../../types';

interface OperationRowProps {
    item: FrontendOperationRecord;
    index: number;
    noteValue: string;
    onEdit: () => void;
    onDelete: () => void;
    onOpenNotesModal: (item: FrontendOperationRecord, currentNote: string, canEditRow?: boolean) => void;
    canEdit: boolean;
    getVehicleBadgeVariant: (vrn?: string | null) => 'green' | 'blue';
    variant?: 'default' | 'adhoc';
}

/**
 * Component representing a single row in the operation table.
 * Responsibility: Display data for an individual operation (normal or adhoc).
 * Data source: Passed via props from the parent group component.
 */
const OperationRow = memo(({
    item,
    index,
    noteValue,
    onEdit,
    onDelete,
    onOpenNotesModal,
    canEdit,
    getVehicleBadgeVariant,
    variant = 'default',
}: OperationRowProps) => {
    const isDisabled = !canEdit;
    const isAdhoc = variant === 'adhoc';
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
                <div className="flex items-center">
                    <div className="min-w-0">
                        <div className={dailyGamePlanStyles.routeBadge}>
                            <span className={dailyGamePlanStyles.routeBadgeText}>{item.route || '-'}</span>
                        </div>
                    </div>
                </div>
            </td>

            <td className={dailyGamePlanStyles.tableCell}>
                <div>
                    <div className={`${dailyGamePlanStyles.vendorName} flex items-center gap-1.5 flex-wrap`}>
                        <span>{item.name || '-'}</span>
                        {spName !== null && <ServicePartnerBadge partnerName={spName} size="xs" />}
                    </div>
                    {!isAdhoc && <div className={dailyGamePlanStyles.vendorType}>{item.vendorType || '-'}</div>}
                </div>
            </td>

            {!isAdhoc && (
                <>
                    <td className={dailyGamePlanStyles.tableCellCenter}>
                        {item.sort ? (
                            <div
                                className={`${dailyGamePlanStyles.statusBadge} ${item.sort === 'Yes' && item.sortLate
                                    ? dailyGamePlanStyles.statusBadgePending
                                    : item.sort === 'Yes'
                                        ? dailyGamePlanStyles.statusBadgeWorking
                                        : dailyGamePlanStyles.statusBadgeOff
                                    }`}
                                title={item.sort === 'Yes' && item.sortLate ? 'Sort: Yes (Late)' : item.sort === 'Yes' ? 'Sort: Yes' : 'Sort: No'}
                                aria-label={item.sort === 'Yes' && item.sortLate ? 'Sort: Yes (Late)' : item.sort === 'Yes' ? 'Sort: Yes' : 'Sort: No'}
                            >
                                {item.sort === 'Yes' && item.sortLate ? (
                                    <Clock3 className="h-4 w-4" strokeWidth={2.25} />
                                ) : item.sort === 'Yes' ? (
                                    <Check className="h-4 w-4" strokeWidth={2.5} />
                                ) : (
                                    <XIcon className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-400 text-sm">-</span>
                        )}
                    </td>

                    <td className="py-2.5 px-2 text-[0.85rem] align-middle overflow-hidden text-ellipsis text-left whitespace-nowrap">
                        <div className="flex items-center gap-1">
                            <VrnPlate vrn={item.vehicle || 'NOVEHICLE'} size="sm" badgeVariant={getVehicleBadgeVariant(item.vehicle)} />
                        </div>
                    </td>
                </>
            )}

            {isAdhoc && (() => {
                const vrn = String(item.vehicle ?? (item as { registrationPlate?: string }).registrationPlate ?? 'NOVEHICLE');
                return (
                    <td className="py-2.5 px-2 text-[0.85rem] align-middle overflow-hidden text-ellipsis text-left whitespace-nowrap">
                        <div className="flex items-center gap-1">
                            <VrnPlate vrn={vrn} size="sm" badgeVariant={getVehicleBadgeVariant(vrn)} />
                        </div>
                    </td>
                );
            })()}

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
                        <motion.button
                            onClick={onEdit}
                            disabled={isDisabled}
                            className={`${dailyGamePlanStyles.actionButton} ${dailyGamePlanStyles.actionButtonEdit}`}
                            title={isDisabled ? 'Cannot edit: operation finished' : 'Edit'}
                            whileHover={!isDisabled ? { scale: 1.1, rotate: 5 } : {}}
                            whileTap={!isDisabled ? { scale: 0.9 } : {}}
                        >
                            <svg className={dailyGamePlanStyles.actionButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </motion.button>
                        <motion.button
                            onClick={onDelete}
                            disabled={isDisabled}
                            className={`${dailyGamePlanStyles.actionButton} ${dailyGamePlanStyles.actionButtonDelete}`}
                            title={isDisabled ? 'Cannot delete: operation finished' : 'Delete'}
                            whileHover={!isDisabled ? { scale: 1.1, rotate: -5 } : {}}
                            whileTap={!isDisabled ? { scale: 0.9 } : {}}
                        >
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

OperationRow.displayName = 'OperationRow';

export default OperationRow;
