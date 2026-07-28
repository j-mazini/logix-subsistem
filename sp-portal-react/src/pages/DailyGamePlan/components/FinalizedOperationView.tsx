import React from 'react';
import { motion } from 'framer-motion';
import type { FrontendOperationRecord } from '../types';
import { BUSINESS_RULES } from '../businessRules';

/**
 * Faithful port of the Next.js app's `FinalizedOperationView` — note this component
 * isn't imported/rendered anywhere in the source `DailyGamePlanContent.tsx` either
 * (confirmed dead code there too), including its reliance on capitalized fields
 * (`op.Route`, `op.Status`, `op.is_day_off`, ...) that don't match
 * `FrontendOperationRecord`'s actual camelCase shape. Ported as-is rather than
 * "fixed", since fixing unreachable code isn't part of a faithful port.
 */
const FINALIZED_MESSAGE = 'The operation has been finalized. For any changes, please contact your manager.';

export type FinalizedDepositEntry = {
    depositName: string;
    operations: FrontendOperationRecord[];
    notes?: string;
};

type AdhocServiceDTO = {
    adhocServiceId: number;
    adhocName?: string;
    adhocVendorPayment?: number;
};

type FinalizedOperationViewProps = {
    entries: FinalizedDepositEntry[];
    dateLabel?: string;
    adhocServices?: AdhocServiceDTO[];
};

function isAdhocOp(op: FrontendOperationRecord): boolean {
    const hasAdhocService = (op as FrontendOperationRecord & { adhocServiceId?: number }).adhocServiceId != null;
    const isBRTE = op.routeId === BUSINESS_RULES.ROUTE.BRTE || String(op.Route || '').toUpperCase() === 'BRTE';
    return hasAdhocService || isBRTE;
}

export function FinalizedOperationView({ entries, dateLabel, adhocServices = [] }: FinalizedOperationViewProps) {
    return (
        <motion.div
            className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="px-4 py-4 md:px-6 md:py-5 bg-slate-50 border-b border-slate-200/80">
                <p className="text-slate-700 text-sm md:text-base font-medium text-center max-w-2xl mx-auto">{FINALIZED_MESSAGE}</p>
                {dateLabel && <p className="text-slate-500 text-xs md:text-sm text-center mt-2">{dateLabel}</p>}
            </div>

            <div className="divide-y divide-slate-200">
                {entries.map(({ depositName, operations, notes }, idx) => {
                    const normalOps = operations.filter((op) => !isAdhocOp(op));
                    const adhocOps = operations.filter((op) => isAdhocOp(op));
                    const normalWorking = normalOps.filter((op) => op.Status === 'Working' && !op.is_day_off);
                    const normalOff = normalOps.filter((op) => op.Status === 'Off' || op.is_day_off);
                    const adhocWorking = adhocOps.filter((op) => op.Status === 'Working' && !op.is_day_off);
                    const adhocOff = adhocOps.filter((op) => op.Status === 'Off' || op.is_day_off);

                    return (
                        <motion.section
                            key={depositName + idx}
                            className="px-4 py-5 md:px-6 md:py-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05, duration: 0.25 }}
                        >
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                {depositName}
                            </h3>

                            {notes && notes.trim() !== '' && (
                                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/70 text-slate-700 text-sm whitespace-pre-wrap">
                                    <span className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Notes</span>
                                    <p className="mt-1">{notes}</p>
                                </div>
                            )}

                            {(normalWorking.length > 0 || normalOff.length > 0) && (
                                <div className="overflow-x-auto rounded-xl border border-gray-200 mb-4">
                                    <table className="w-full table-fixed text-sm">
                                        <thead>
                                            <tr className="bg-gradient-to-r from-slate-50 to-gray-100 border-b-2 border-gray-200">
                                                <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Route</th>
                                                <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vendor</th>
                                                <th className="px-3 md:px-6 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Sort</th>
                                                <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle</th>
                                                <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {normalWorking.map((op, i) => (
                                                <tr key={`nw-${idx}-${i}`} className="bg-white hover:bg-gray-50/50">
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-800 font-medium">{op.Route || '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-700">{op.Name || '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-center text-slate-600">{op.Sort != null && op.Sort !== '' ? String(op.Sort) : '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-600">{op.Vehicle && op.Vehicle !== 'NOVEHICLE' ? op.Vehicle : '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-600 whitespace-pre-wrap max-w-xs truncate" title={op.Notes || ''}>{op.Notes || '—'}</td>
                                                </tr>
                                            ))}
                                            {normalOff.map((op, i) => (
                                                <tr key={`no-${idx}-${i}`} className="bg-rose-50/50 hover:bg-rose-50">
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-700">{op.Route || '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-600">{op.Name || '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-center text-slate-500">{op.Sort != null && op.Sort !== '' ? String(op.Sort) : '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-500">{op.Vehicle && op.Vehicle !== 'NOVEHICLE' ? op.Vehicle : '—'}</td>
                                                    <td className="px-3 md:px-6 py-2.5 text-slate-500 whitespace-pre-wrap max-w-xs truncate" title={op.Notes || ''}>{op.Notes || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {(adhocWorking.length > 0 || adhocOff.length > 0) && (
                                <div className="border-t-2 border-purple-200 rounded-xl overflow-hidden bg-purple-50/30">
                                    <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-50 border-b border-purple-200">
                                        <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Adhoc Services</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full table-fixed text-sm">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-purple-50 to-purple-100 border-b-2 border-purple-200">
                                                    <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Service</th>
                                                    <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Vendor</th>
                                                    <th className="px-3 md:px-6 py-2 text-left text-xs font-bold text-purple-900 uppercase tracking-wider">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-purple-100">
                                                {adhocWorking.map((op, i) => {
                                                    const adhocId = (op as FrontendOperationRecord & { adhocServiceId?: number }).adhocServiceId;
                                                    const service = adhocServices.find((s) => s.adhocServiceId === adhocId);
                                                    const serviceName = service?.adhocName || op.Route || 'AD-HOC Service';
                                                    return (
                                                        <tr key={`aw-${idx}-${i}`} className="bg-white hover:bg-purple-50/30">
                                                            <td className="px-3 md:px-6 py-2.5 text-purple-900 font-medium">{serviceName}</td>
                                                            <td className="px-3 md:px-6 py-2.5 text-slate-700">{op.Name || '—'}</td>
                                                            <td className="px-3 md:px-6 py-2.5 text-slate-600 whitespace-pre-wrap max-w-xs truncate" title={op.Notes || ''}>{op.Notes || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {adhocOff.map((op, i) => {
                                                    const adhocId = (op as FrontendOperationRecord & { adhocServiceId?: number }).adhocServiceId;
                                                    const service = adhocServices.find((s) => s.adhocServiceId === adhocId);
                                                    const serviceName = service?.adhocName || op.Route || 'AD-HOC Service';
                                                    return (
                                                        <tr key={`ao-${idx}-${i}`} className="bg-purple-50/50 hover:bg-purple-50/50">
                                                            <td className="px-3 md:px-6 py-2.5 text-purple-800">{serviceName}</td>
                                                            <td className="px-3 md:px-6 py-2.5 text-slate-600">{op.Name || '—'}</td>
                                                            <td className="px-3 md:px-6 py-2.5 text-slate-500 whitespace-pre-wrap max-w-xs truncate" title={op.Notes || ''}>{op.Notes || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {operations.length === 0 && <p className="text-slate-500 text-sm py-2">No operations recorded.</p>}
                        </motion.section>
                    );
                })}
            </div>
        </motion.div>
    );
}
