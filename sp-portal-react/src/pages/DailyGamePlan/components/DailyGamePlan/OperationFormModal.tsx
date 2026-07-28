import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, X } from 'lucide-react';
import { FrontendOperationRecord } from '../../types';
import type { MockRoute, MockVendor } from '../../mock/mockMasterData';
import type { AdhocServiceDTO } from '../../mock/mockDailyGamePlanApi';

import { SearchableSelect, type SelectItem } from '../ui/SearchableSelect';
import { Button } from '../ui/Button';
import { useSubmitGuard } from '../../hooks/useSubmitGuard';

interface OperationFormModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    formData: FrontendOperationRecord;
    onChange: (field: keyof FrontendOperationRecord, value: any) => void;
    title: string;
    isEditing: boolean;
    isAdmin: boolean;
    isSupervisor: boolean;
    vendors: MockVendor[];
    routes: MockRoute[];
    vehicles: any[];
    adhocServices: AdhocServiceDTO[];
    routeOptions: Array<{ routeId: number; routeName?: string }>;
}

const OperationFormModal = memo(({
    show,
    onClose,
    onSubmit,
    formData,
    onChange,
    title,
    isEditing,
    vendors,
    vehicles,
    adhocServices,
    routeOptions,
}: OperationFormModalProps) => {
    const { guard, isSubmitting } = useSubmitGuard();
    const vendorItems = React.useMemo<SelectItem[]>(() => {
        return vendors.map(v => ({
            value: String(v.userId),
            label: v.fullName || `Vendor ${v.userId}`,
        })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }, [vendors]);

    const routeItems = React.useMemo<SelectItem[]>(() => {
        return routeOptions.map(r => ({
            value: r.routeName || '',
            label: r.routeName || `Route ${r.routeId}`,
        })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }, [routeOptions]);

    const vehicleItems = React.useMemo<SelectItem[]>(() => {
        const seen = new Set<string>(['NOVEHICLE']);
        const items: SelectItem[] = [];
        for (const v of vehicles) {
            const plate = v.registrationPlates || '';
            if (!plate || seen.has(plate)) continue;
            seen.add(plate);
            items.push({ value: plate, label: plate, secondaryLabel: v.model });
        }
        items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        return [
            { value: 'NOVEHICLE', label: 'NOVEHICLE', secondaryLabel: 'No vehicle assigned' },
            ...items,
        ];
    }, [vehicles]);

    const adhocServiceItems = React.useMemo<SelectItem[]>(() => {
        return adhocServices.map(s => ({
            value: String(s.adhocServiceId),
            label: s.adhocName || `Adhoc Service ${s.adhocServiceId}`,
        })).sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
    }, [adhocServices]);

    if (!show) return null;

    const isAdHoc = Number(formData.adhocServiceId ?? 0) > 0 || formData.paymentMode === 'AD-HOC';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    id="operation-form"
                    onSubmit={guard(onSubmit)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                            e.preventDefault();
                        }
                    }}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Vendor *</label>
                            <SearchableSelect
                                items={vendorItems}
                                value={formData.userId ? String(formData.userId) : ''}
                                onValueChange={(value) => onChange('userId', value ? Number(value) : undefined)}
                                placeholder="Select a vendor"
                                searchPlaceholder="Search vendor by name or ID..."
                                title="Vendors"
                            />
                        </div>

                        {!isAdHoc && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Route *</label>
                                <SearchableSelect
                                    items={routeItems}
                                    value={formData.route || ''}
                                    onValueChange={(value) => onChange('route', value)}
                                    placeholder="Select a route"
                                    searchPlaceholder="Search route..."
                                    title="Routes"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Vehicle</label>
                            <SearchableSelect
                                items={vehicleItems}
                                value={formData.vehicle || ''}
                                onValueChange={(value) => onChange('vehicle', value)}
                                placeholder="Select a vehicle"
                                searchPlaceholder="Search vehicle by plate or model..."
                                title="Vehicles"
                            />
                        </div>

                        {!isAdHoc && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Sort</label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.sort || 'No'}
                                        onChange={(e) => onChange('sort', e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                    {formData.sort === 'Yes' && (
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => onChange('sortLate', false)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${!formData.sortLate ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                <Check className="h-3 w-3" />
                                                On Time
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onChange('sortLate', true)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${formData.sortLate ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                <Clock3 className="h-3 w-3" />
                                                Late
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {isAdHoc && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Ad-Hoc Service *</label>
                                <SearchableSelect
                                    items={adhocServiceItems}
                                    value={formData.adhocServiceId ? String(formData.adhocServiceId) : ''}
                                    onValueChange={(value) => onChange('adhocServiceId', value ? Number(value) : undefined)}
                                    placeholder={adhocServices.length > 0 ? 'Select an adhoc service' : 'No adhoc services found'}
                                    searchPlaceholder="Search service..."
                                    title="Ad-Hoc Services"
                                    disabled={adhocServices.length === 0}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Notes</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => onChange('notes', e.target.value)}
                            placeholder="Add any specific instructions or notes..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none min-h-[100px] resize-none"
                        />
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="operation-form" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : isEditing ? 'Update Operation' : 'Create Operation'}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
});

OperationFormModal.displayName = 'OperationFormModal';

export default OperationFormModal;
