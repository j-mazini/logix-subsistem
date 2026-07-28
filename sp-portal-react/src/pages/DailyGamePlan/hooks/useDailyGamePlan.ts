import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
    normalizeDate,
    operationRecordEligibleForBulkFinish,
    resolveUserIdForNotAllocatedPatch,
} from '../utils/helpers';
import {
    mapFrontendToDailyOperationsManagementBulkCreateItemDTO,
    mapFrontendToDailyGamePlanOperationCreateDTO,
    mapDailyGamePlanOperationPartialPatchDTO,
    mapDailyGamePlanOperationToFrontend,
} from '../utils/mappers';
import { isAllowedDeposit } from '../utils/allowedDeposits';
import {
    fetchDailyGamePlansByDate,
    fetchDailyTeamSupportLastSevenByUser,
    fetchDailyGamePlanOperations,
    fetchDailyGamePlanOperationsDayOff,
    createDailyGamePlanOperation,
    updateDailyGamePlanOperation,
    deleteDailyGamePlanOperation,
    updateDailyGamePlan,
    bulkFinishDailyGamePlanOperations,
    fetchAdhocServices,
    type DailyGamePlanWithSupportDTO,
    type DailyGamePlanOperationDTO,
    type DailyTeamSupportLastSevenItemDTO,
    type AdhocServiceDTO,
} from '../mock/mockDailyGamePlanApi';
import { BUSINESS_RULES } from '../businessRules';
import { useDailyGamePlanData } from './useDailyGamePlanData';
import { useDepositsWithRoutes } from './useDepositsWithRoutes';
import { useNalcRoute } from './useNalcRoute';
import { useAuth } from './useAuth';
import { FrontendOperationRecord } from '../types';
import type { PendingDaySummaryEntry } from '../components/PendingDayModal';
import type { OpenOperationSummary } from '../components/OpenOperationModal';
import { formatYmdSafe } from '../utils/helpers';
import { getDayNameEn, formatDate as formatDateWeek, getISOWeekNumber } from '../utils/dateUtils';

/**
 * Custom hook to manage the business logic and state of the Daily Game Plan.
 * Faithful port of the Next.js app's `useDailyGamePlan` — same state shape and
 * handlers, backed by the mock API (`mock/mockDailyGamePlanApi.ts`) instead of real
 * HTTP calls, since this subsystem has no backend.
 */
export function useDailyGamePlan() {
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return format(today, 'yyyy-MM-dd');
    });
    const [viewDate, setViewDate] = useState<string>('');

    // User context
    const { user } = useAuth();
    const userType = user?.userTypeId ?? null;
    const userId = user?.id ?? null;

    const isAdmin = userType === BUSINESS_RULES.USER_TYPE.ADMIN;
    const isSupervisor = userType === BUSINESS_RULES.USER_TYPE.SUPERVISOR;

    // Data states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [weekPlannersData, setWeekPlannersData] = useState<FrontendOperationRecord[]>([]);
    const [dailyGamePlanOperations, setDailyGamePlanOperations] = useState<DailyGamePlanOperationDTO[]>([]);
    const [dayOffItems, setDayOffItems] = useState<DailyGamePlanOperationDTO[]>([]);
    const [dailyGamePlans, setDailyGamePlans] = useState<Map<number, DailyGamePlanWithSupportDTO>>(new Map());
    const [adhocServices, setAdhocServices] = useState<AdhocServiceDTO[]>([]);
    const [supervisorDepositIds, setSupervisorDepositIds] = useState<number[]>([]);

    // UI/Interaction states
    const [isFinishing, setIsFinishing] = useState(false);
    const [isPendingDayFinishing, setIsPendingDayFinishing] = useState(false);
    const [isOpenOperationFinishing, setIsOpenOperationFinishing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedDeposits, setCollapsedDeposits] = useState<Set<number>>(new Set());
    const [isOffPanelCollapsed, setIsOffPanelCollapsed] = useState(true);
    const [isNotAllocatedPanelCollapsed, setIsNotAllocatedPanelCollapsed] = useState(true);

    // Modals states
    const [messageModal, setMessageModal] = useState<{ open: boolean; title: string; message: string; variant: 'success' | 'error' | 'info' | 'warning' }>({ open: false, title: '', message: '', variant: 'info' });
    const [confirmationModal, setConfirmationModal] = useState<{ open: boolean; title: string; message: string; variant: 'primary' | 'danger'; onConfirm: () => void }>({ open: false, title: '', message: '', variant: 'primary', onConfirm: () => { } });
    const [pendingDayModal, setPendingDayModal] = useState<{ open: boolean; pendingDate: string; selectedDate: string; depositIds: number[] }>({ open: false, pendingDate: '', selectedDate: '', depositIds: [] });
    const [openOperationModal, setOpenOperationModal] = useState(false);

    // Form states
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [formData, setFormData] = useState<FrontendOperationRecord>({} as FrontendOperationRecord);
    const [notesModal, setNotesModal] = useState<{ open: boolean; item: FrontendOperationRecord | null; currentNote: string; canEdit: boolean }>({ open: false, item: null, currentNote: '', canEdit: false });

    // Refs
    const skipNextPendingDayModalRef = useRef(false);
    const editOriginalItemRef = useRef<{ userId?: number; depositId?: number } | null>(null);

    // Master data hooks
    const { data: deposits = [], isLoading: isDepositsLoading } = useDepositsWithRoutes();
    const { vehicles, vendors, routes } = useDailyGamePlanData(viewDate || selectedDate);
    const isMasterLoading = vehicles.isLoading || vendors.isLoading || routes.isLoading || isDepositsLoading;
    const { data: nalcRouteResult } = useNalcRoute();
    const nalcRouteId = nalcRouteResult?.routeId;

    const physicalDepositIds = useMemo(() => {
        return deposits.filter(d => d.isPhysical).map(d => d.depositId);
    }, [deposits]);

    const lookupMaps = useMemo(() => {
        if (!vendors.data || !routes.data || !vehicles.data) return null;
        const vendorMap = new Map();
        const userToVendorMap = new Map();
        const routeMap = new Map();
        const routeNameMap = new Map();
        const vehicleMap = new Map();

        vendors.data.forEach((d: any) => {
            if (d.userId) vendorMap.set(d.userId, d);
            if (d.userId) userToVendorMap.set(d.userId, d);
        });
        routes.data.forEach((r: any) => {
            if (r.routeId) routeMap.set(r.routeId, r);
            if (r.routeName) routeNameMap.set(r.routeName, r);
        });
        vehicles.data.forEach((v: any) => {
            if (v.vehicleId) vehicleMap.set(v.vehicleId, v);
        });

        return { vendorMap, userToVendorMap, routeMap, routeNameMap, vehicleMap };
    }, [vendors.data, routes.data, vehicles.data]);

    // Helpers
    const isDailyGamePlanFinished = useCallback((status?: string | null) => {
        return status === 'finish' || status === 'finished';
    }, []);

    // Build the header title: "Daily Game Plan - Monday - 09/04 - Week 15"
    const headerTitle = useMemo(() => {
        const effectiveDate = viewDate || selectedDate;
        if (!effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return 'Daily Game Plan';
        const dayName = getDayNameEn(effectiveDate);
        const dateUK = formatDateWeek(effectiveDate, 'dd/mm');
        const weekNum = getISOWeekNumber(effectiveDate);
        const weekNumber = weekNum !== null ? weekNum.toString().padStart(2, '0') : '00';
        return `Daily Game Plan - ${dayName} - ${dateUK} - Week ${weekNumber}`;
    }, [viewDate, selectedDate]);

    // Non-sort AD-HOC validation: only 1 non-sort adhoc per vendor/day
    const hasExistingNonSortAdhocForVendorOnDate = useCallback((
        userId: number | null,
        dateStr: string,
        ignoreWeekPlannerId?: number
    ): boolean => {
        if (!userId) return false;
        const targetDate = normalizeDate(dateStr);
        if (!targetDate) return false;

        return weekPlannersData.some(op => {
            const opDateNorm = normalizeDate(String(op.date ?? ''));
            if (opDateNorm !== targetDate) return false;
            if (!op.userId || op.userId !== userId) return false;
            if (ignoreWeekPlannerId && op.weekPlannerId && op.weekPlannerId === ignoreWeekPlannerId) return false;

            const adhocServiceId = (op as any).adhocServiceId;
            if (!adhocServiceId || !Number.isFinite(Number(adhocServiceId)) || Number(adhocServiceId) <= 0) {
                return false;
            }
            const service = adhocServices.find(s => s.adhocServiceId === Number(adhocServiceId));
            if (!service) return false;
            return service.isAdhocSort === false;
        });
    }, [weekPlannersData, adhocServices]);

    const isSupportItemForCurrentUser = useCallback(
        (item: DailyTeamSupportLastSevenItemDTO): boolean => {
            if (!userId) return false;
            const rawUserId = item.dailyTeamSupport?.userId;
            if (rawUserId == null) return false;
            const numericId = Number(rawUserId);
            return Number.isFinite(numericId) && numericId === userId;
        },
        [userId]
    );

    const getSupportItemDate = useCallback((item: DailyTeamSupportLastSevenItemDTO): string => {
        return normalizeDate(item.dailyGamePlan?.date || item.dailyTeamSupport?.date || '');
    }, []);

    const supportItemHasDailyGamePlan = useCallback((item: DailyTeamSupportLastSevenItemDTO): boolean => {
        return !!item.dailyGamePlan?.dailyGamePlanId;
    }, []);

    // Core Fetch Logic — DGP always operates in single-day mode
    const fetchData = useCallback(async (options?: { skipOpenPendingDayModal?: boolean; overrideViewDate?: string }) => {
        if (isMasterLoading || !lookupMaps) return;

        const dateToUse = options?.overrideViewDate || viewDate || selectedDate;
        if (!dateToUse || !/^\d{4}-\d{2}-\d{2}$/.test(normalizeDate(dateToUse))) return;

        try {
            setLoading(true);

            let lastSeven: DailyTeamSupportLastSevenItemDTO[] = [];
            if (userId && (isSupervisor || isAdmin)) {
                lastSeven = await fetchDailyTeamSupportLastSevenByUser(userId);
            }

            let effectiveDate = dateToUse;
            if (!options?.overrideViewDate && userId && (isSupervisor || isAdmin) && lastSeven.length > 0) {
                const todayNorm = normalizeDate(format(new Date(), 'yyyy-MM-dd'));
                const sorted = lastSeven
                    .filter(item => isSupportItemForCurrentUser(item))
                    .filter(item => supportItemHasDailyGamePlan(item))
                    .map(item => ({ item, date: getSupportItemDate(item) }))
                    .filter(row => !!row.date && row.date <= todayNorm)
                    .sort((a, b) => a.date.localeCompare(b.date));

                const firstPending = sorted.find(row => !isDailyGamePlanFinished(row.item.dailyGamePlan?.status));

                if (firstPending && firstPending.date) {
                    const skipOpen = options?.skipOpenPendingDayModal || skipNextPendingDayModalRef.current;
                    if (skipNextPendingDayModalRef.current) skipNextPendingDayModalRef.current = false;

                    if (!skipOpen && firstPending.date !== todayNorm) {
                        const pendingDeposits = sorted
                            .filter(row => row.date === firstPending.date)
                            .map(row => Number(row.item.dailyTeamSupport?.depositId ?? 0))
                            .filter(id => id > 0);

                        setPendingDayModal({ open: true, pendingDate: firstPending.date, selectedDate, depositIds: pendingDeposits });
                    }
                    effectiveDate = firstPending.date;
                    setViewDate(firstPending.date);
                } else if (viewDate !== selectedDate) {
                    setViewDate(selectedDate);
                    effectiveDate = selectedDate;
                }
            }

            let opsResults: DailyGamePlanOperationDTO[] = [];
            opsResults = await fetchDailyGamePlanOperations({ date: effectiveDate });
            setDailyGamePlanOperations(opsResults);

            const dayOffResults = await fetchDailyGamePlanOperationsDayOff(effectiveDate);
            setDayOffItems(dayOffResults);

            const allOps = [...opsResults, ...dayOffResults];
            const processedDgpIds = new Set<number>();
            const mapped: FrontendOperationRecord[] = [];

            allOps.forEach(op => {
                if (op.dailyGamePlanOperationId && !processedDgpIds.has(op.dailyGamePlanOperationId)) {
                    const fe = mapDailyGamePlanOperationToFrontend(
                        op, lookupMaps.vendorMap, lookupMaps.userToVendorMap, lookupMaps.routeMap, lookupMaps.vehicleMap, deposits
                    );
                    mapped.push(fe);
                    processedDgpIds.add(op.dailyGamePlanOperationId);
                }
            });

            setWeekPlannersData(mapped);

            const ads = await fetchAdhocServices();
            setAdhocServices(ads);

            const plans = await fetchDailyGamePlansByDate(effectiveDate);
            const plansMap = new Map();
            plans.forEach(p => { if (p.depositId) plansMap.set(p.depositId, p); });
            setDailyGamePlans(plansMap);

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [isMasterLoading, lookupMaps, viewDate, selectedDate, userId, isSupervisor, isAdmin, supervisorDepositIds, deposits, isSupportItemForCurrentUser, supportItemHasDailyGamePlan, getSupportItemDate, isDailyGamePlanFinished]);

    useEffect(() => {
        const timer = setTimeout(() => fetchData(), 200);
        return () => clearTimeout(timer);
    }, [fetchData]);

    // Sync supervisor deposit IDs for the current viewed date
    useEffect(() => {
        if (!userId) {
            setSupervisorDepositIds([]);
            return;
        }
        const currentDate = normalizeDate(viewDate || selectedDate);
        const load = async () => {
            try {
                const lastSeven = await fetchDailyTeamSupportLastSevenByUser(userId);
                const currentDayIds = lastSeven
                    .filter(it => normalizeDate(it.dailyTeamSupport?.date) === currentDate)
                    .filter(it => supportItemHasDailyGamePlan(it))
                    .map(it => Number(it.dailyTeamSupport?.depositId))
                    .filter(id => id > 0);

                setSupervisorDepositIds(Array.from(new Set(currentDayIds)));
            } catch (err) {
                console.error("Error setting supervisor deposit IDs:", err);
            }
        };
        load();
    }, [userId, isSupervisor, isAdmin, viewDate, selectedDate]);

    // Pre-computed summaries
    const pendingDayModalSummary = useMemo((): PendingDaySummaryEntry[] => {
        const ids = new Set(pendingDayModal.depositIds);
        const byDep = new Map<number, { depositName: string; operations: FrontendOperationRecord[] }>();
        for (const op of weekPlannersData) {
            const depId = op.depositId ?? 0;
            if (!ids.has(depId)) continue;
            const depName =
                op.depositName ||
                deposits.find((d: { depositId?: number }) => d.depositId === depId)?.depositName ||
                `Deposit ${depId}`;
            if (!byDep.has(depId)) {
                byDep.set(depId, { depositName: depName, operations: [] });
            }
            byDep.get(depId)!.operations.push(op);
        }
        return Array.from(byDep.entries()).map(([depositId, v]) => ({
            depositId,
            depositName: v.depositName,
            operations: v.operations,
        }));
    }, [weekPlannersData, pendingDayModal.depositIds, deposits]);

    const openOperationSummary = useMemo((): OpenOperationSummary | null => {
        if (!openOperationModal) return null;
        for (const [depId, plan] of dailyGamePlans) {
            if (plan?.status === 'start') {
                const depositName =
                    deposits.find((d: { depositId?: number }) => d.depositId === depId)?.depositName || '';
                const operations = weekPlannersData.filter(
                    (o) => o.depositId === depId && o.status === BUSINESS_RULES.WORKING_STATUS.WORKING
                );
                if (operations.length > 0) {
                    return { depositId: depId, depositName, operations };
                }
            }
        }
        return null;
    }, [openOperationModal, dailyGamePlans, weekPlannersData, deposits]);

    // Handlers
    const handleStartStop = useCallback(async (depositId: number) => {
        const dgp = dailyGamePlans.get(depositId);
        const planStatus = dgp?.status;
        if (isDailyGamePlanFinished(planStatus)) return;

        const isStarted = planStatus === 'start';
        const depositName = deposits.find((d: any) => d.depositId === depositId)?.depositName || 'Deposit';

        setConfirmationModal({
            open: true,
            title: isStarted ? 'Finish Operation' : 'Start Operation',
            message: `Are you sure you want to ${isStarted ? 'finish' : 'start'} operation for ${depositName}?`,
            variant: isStarted ? 'danger' : 'primary',
            onConfirm: async () => {
                setIsFinishing(true);
                try {
                    if (isStarted) {
                        const ops = weekPlannersData.filter(
                            (op) => op.depositId === depositId && operationRecordEligibleForBulkFinish(op)
                        );
                        const payload = ops.map((op) =>
                            mapFrontendToDailyOperationsManagementBulkCreateItemDTO(
                                op,
                                vendors.data || [],
                                routes.data || [],
                                vehicles.data || [],
                                deposits,
                                viewDate || selectedDate
                            )
                        );
                        if (payload.length > 0) {
                            await bulkFinishDailyGamePlanOperations({ items: payload });
                        }
                        await updateDailyGamePlan(dgp!.dailyGamePlanId!, {
                            depositId: depositId,
                            date: viewDate,
                            status: 'finished',
                        });
                    } else {
                        await updateDailyGamePlan(dgp!.dailyGamePlanId!, {
                            depositId: depositId,
                            date: viewDate,
                            status: 'start',
                        });
                    }
                    await fetchData();
                } catch (e) {
                    console.error('Start/Stop error', e);
                } finally {
                    setIsFinishing(false);
                    setConfirmationModal(p => ({ ...p, open: false }));
                }
            }
        });
    }, [dailyGamePlans, deposits, weekPlannersData, viewDate, fetchData, isDailyGamePlanFinished, vendors.data, routes.data, vehicles.data]);

    const handleSaveDepositNotes = useCallback(async (depositId: number, notes: string) => {
        const plan = dailyGamePlans.get(depositId);
        if (!plan?.dailyGamePlanId) return;
        try {
            await updateDailyGamePlan(plan.dailyGamePlanId, { notes });
            setDailyGamePlans(prev => {
                const next = new Map(prev);
                next.set(depositId, { ...plan, notes });
                return next;
            });
        } catch (e) {
            console.error('Error saving deposit notes:', e);
        }
    }, [dailyGamePlans]);

    const handleEditItem = useCallback((item: FrontendOperationRecord) => {
        editOriginalItemRef.current = { userId: item.userId, depositId: item.depositId };
        setFormData(item);
        setEditingIndex(0);
        setShowModal(true);
    }, []);

    const handleCreateAdHoc = useCallback((depositId: number, depositName: string) => {
        setFormData({
            ...({} as FrontendOperationRecord),
            depositId: depositId,
            depositName: depositName,
            date: viewDate || selectedDate,
            status: BUSINESS_RULES.WORKING_STATUS.WORKING,
            paymentMode: 'AD-HOC',
            route: 'DHOC',
            routeId: BUSINESS_RULES.ROUTE.DHOC,
            name: '',
            vehicle: '',
            sort: 'No',
            notes: '',
            rate: 0,
            adhocSort: 0,
            extras: 0,
            vendorType: '',
        } as any);
        setEditingIndex(null);
        setShowModal(true);
    }, [viewDate, selectedDate]);

    const handleCreateFlexRoute = useCallback((depositId: number, depositName: string) => {
        setFormData({
            ...({} as FrontendOperationRecord),
            depositId: depositId,
            depositName: depositName,
            date: viewDate || selectedDate,
            status: BUSINESS_RULES.WORKING_STATUS.WORKING,
            route: '',
            name: '',
            vehicle: '',
            sort: 'No',
            notes: '',
            rate: 0,
            adhocSort: 0,
            extras: 0,
            vendorType: '',
        } as any);
        setEditingIndex(null);
        setShowModal(true);
    }, [viewDate, selectedDate]);

    const handleDeleteItem = useCallback((item: FrontendOperationRecord) => {
        setConfirmationModal({
            open: true,
            title: 'Delete Rule',
            message: "Delete this item?",
            variant: 'danger',
            onConfirm: async () => {
                setIsFinishing(true);
                try {
                    if (!item.dailyGamePlanOperationId) {
                        throw new Error('Operation ID not found for delete.');
                    }

                    await deleteDailyGamePlanOperation(item.dailyGamePlanOperationId);
                    setMessageModal({ open: true, title: 'Success', message: 'Item deleted successfully.', variant: 'success' });
                    await fetchData();
                } catch (e) {
                    console.error('Delete error', e);
                    setMessageModal({ open: true, title: 'Error', message: e instanceof Error ? e.message : 'Failed to delete item.', variant: 'error' });
                } finally {
                    setIsFinishing(false);
                    setConfirmationModal(p => ({ ...p, open: false }));
                }
            }
        });
    }, [fetchData, viewDate, selectedDate, lookupMaps, vendors.data]);

    const handlePendingDayFinish = useCallback(async () => {
        if (!pendingDayModal.pendingDate) return;
        const pendingDate = pendingDayModal.pendingDate;
        setPendingDayModal(p => ({ ...p, open: false }));
        setIsPendingDayFinishing(true);
        try {
            const plansForPendingDate = await fetchDailyGamePlansByDate(pendingDate);
            const plansMapByDeposit = new Map<number, DailyGamePlanWithSupportDTO>();
            plansForPendingDate.forEach(plan => {
                if (plan.depositId) plansMapByDeposit.set(plan.depositId, plan);
            });

            const depositIdsToFinish = pendingDayModal.depositIds.length > 0
                ? pendingDayModal.depositIds
                : Array.from(plansMapByDeposit.keys());

            const allEligibleOps = weekPlannersData.filter(
                op => op.depositId != null && depositIdsToFinish.includes(op.depositId) && operationRecordEligibleForBulkFinish(op)
            );
            if (allEligibleOps.length > 0) {
                const payload = allEligibleOps.map(op =>
                    mapFrontendToDailyOperationsManagementBulkCreateItemDTO(
                        op, vendors.data || [], routes.data || [], vehicles.data || [], deposits, pendingDate
                    )
                );
                await bulkFinishDailyGamePlanOperations({ items: payload });
            }

            for (const depositId of depositIdsToFinish) {
                const plan = plansMapByDeposit.get(depositId);
                if (plan?.dailyGamePlanId) {
                    await updateDailyGamePlan(plan.dailyGamePlanId, { depositId, date: pendingDate, status: 'finished' });
                }
            }

            await fetchData({ skipOpenPendingDayModal: false });
            setMessageModal({ open: true, title: 'Success', message: 'Pending day approved successfully.', variant: 'success' });
        } catch (err) {
            console.error('Error finishing pending day:', err);
            setMessageModal({ open: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to finish pending day.', variant: 'error' });
        } finally {
            setIsPendingDayFinishing(false);
        }
    }, [pendingDayModal.pendingDate, pendingDayModal.depositIds, weekPlannersData, fetchData, vendors.data, routes.data, vehicles.data, deposits]);

    const handleOpenOperationFinish = useCallback(async () => {
        if (!openOperationSummary) return;
        const { depositId, depositName, operations } = openOperationSummary;
        setIsOpenOperationFinishing(true);
        try {
            const eligibleOps = operations.filter(operationRecordEligibleForBulkFinish);
            if (eligibleOps.length > 0) {
                const payload = eligibleOps.map(op =>
                    mapFrontendToDailyOperationsManagementBulkCreateItemDTO(
                        op, vendors.data || [], routes.data || [], vehicles.data || [], deposits, viewDate || selectedDate
                    )
                );
                await bulkFinishDailyGamePlanOperations({ items: payload });
            }
            const plan = dailyGamePlans.get(depositId);
            if (plan?.dailyGamePlanId) {
                await updateDailyGamePlan(plan.dailyGamePlanId, { depositId, date: viewDate || selectedDate, status: 'finished' });
                setDailyGamePlans(prev => {
                    const next = new Map(prev);
                    next.set(depositId, { ...plan, status: 'finished' });
                    return next;
                });
            }
            skipNextPendingDayModalRef.current = true;
            setOpenOperationModal(false);
            setMessageModal({ open: true, title: 'Success', message: `Operation finished successfully for ${depositName}.`, variant: 'success' });
            await fetchData({ skipOpenPendingDayModal: true });
        } catch (err) {
            console.error('Error finishing open operation:', err);
            setMessageModal({ open: true, title: 'Error', message: err instanceof Error ? err.message : 'Failed to finish the operation.', variant: 'error' });
        } finally {
            setIsOpenOperationFinishing(false);
        }
    }, [openOperationSummary, dailyGamePlans, viewDate, selectedDate, fetchData, vendors.data, routes.data, vehicles.data, deposits]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingIndex === null && (formData as any).adhocServiceId) {
            const svc = adhocServices.find(s => s.adhocServiceId === Number((formData as any).adhocServiceId));
            if (svc && svc.isAdhocSort === false) {
                const dateToCheck = formData.date || viewDate || selectedDate;
                if (hasExistingNonSortAdhocForVendorOnDate(formData.userId ?? null, dateToCheck)) {
                    setMessageModal({
                        open: true,
                        title: 'Validation Error',
                        message: 'This vendor already has a non-sort AD-HOC service assigned for this date. Only one non-sort AD-HOC per vendor per day is allowed.',
                        variant: 'error',
                    });
                    return;
                }
            }
        }

        if (!formData.route || formData.route.trim() === '') {
            setMessageModal({
                open: true,
                title: 'Validation Error',
                message: 'Please select a route to proceed.',
                variant: 'error',
            });
            return;
        }

        const isAdHocOperation = formData.paymentMode === 'AD-HOC' || (Number(formData.adhocServiceId ?? 0) > 0);

        if (isAdHocOperation) {
            formData.routeId = BUSINESS_RULES.ROUTE.DHOC;
            formData.route = 'DHOC';
            formData.sort = 'No';
            formData.sortLate = false;
        }

        if (isAdHocOperation && adhocServices.length > 0 && !formData.adhocServiceId) {
            setMessageModal({
                open: true,
                title: 'Validation Error',
                message: 'Please select an Ad-Hoc service to proceed.',
                variant: 'error',
            });
            return;
        }

        try {
            const dateToUse = viewDate || selectedDate;
            const originalVendorId = editOriginalItemRef.current?.userId;
            const originalDepositId = editOriginalItemRef.current?.depositId;

            if (editingIndex !== null && formData.dailyGamePlanOperationId) {
                if (formData.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT) {
                    if (formData.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED &&
                        formData.routeId !== BUSINESS_RULES.ROUTE.NOT_ALLOCATED) {
                        formData.status = BUSINESS_RULES.WORKING_STATUS.WORKING;
                    }
                }

                if (formData.routeId === BUSINESS_RULES.ROUTE.NOT_ALLOCATED &&
                    formData.status !== BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED) {
                    formData.status = BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
                }

                const patchPayload = mapDailyGamePlanOperationPartialPatchDTO(formData);
                await updateDailyGamePlanOperation(formData.dailyGamePlanOperationId, patchPayload);
            } else {
                const createPayload = mapFrontendToDailyGamePlanOperationCreateDTO(
                    formData, vendors.data || [], routes.data || [], vehicles.data || [], dateToUse
                );
                await createDailyGamePlanOperation(createPayload);
            }

            if (editingIndex !== null && originalVendorId && formData.userId && originalVendorId !== formData.userId) {
                const targetDate = normalizeDate(String(formData.date || dateToUse));
                try {
                    const oldVendorOps = await fetchDailyGamePlanOperations({ date: targetDate, userId: originalVendorId });
                    const hasActiveOps = oldVendorOps.some(
                        op => !op.isDayOff && op.status !== BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED
                    );
                    if (!hasActiveOps) {
                        const resolvedVendor = lookupMaps?.vendorMap.get(originalVendorId) ?? null;
                        const userId = resolveUserIdForNotAllocatedPatch(
                            { ...formData, userId: originalVendorId } as FrontendOperationRecord,
                            vendors.data || [], null, resolvedVendor
                        );
                        const existingNotAllocated = oldVendorOps.find(op => op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED);
                        if (!existingNotAllocated) {
                            await createDailyGamePlanOperation({
                                userId: originalVendorId,
                                ...(userId != null ? { userId } : {}),
                                depositId: originalDepositId ?? formData.depositId ?? null,
                                routeId: BUSINESS_RULES.ROUTE.NOT_ALLOCATED,
                                date: targetDate,
                                status: BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED,
                                isDayOff: false,
                                isSort: false,
                                weekPlannerId: null,
                            });
                        }
                    }
                } catch (err) {
                    console.warn('[handleSubmit] Failed to handle NotAllocated for old vendor:', err);
                }
            }

            editOriginalItemRef.current = null;
            setShowModal(false);
            await fetchData();
        } catch (err) {
            console.error('Error saving operation:', err);
            setMessageModal({
                open: true, title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to save operation.',
                variant: 'error',
            });
        }
    }, [editingIndex, formData, viewDate, selectedDate, vendors.data, routes.data, vehicles.data, lookupMaps, fetchData, isSupervisor, hasExistingNonSortAdhocForVendorOnDate, adhocServices]);

    const onOpenNotesModal = useCallback((item: FrontendOperationRecord, currentNote: string, canEdit: boolean = false) => {
        setNotesModal({ open: true, item, currentNote, canEdit });
    }, []);

    /** Persist a note change made from the Notes modal (view / edit) — see NotesModal.tsx. */
    const handleSaveNote = useCallback(async (item: FrontendOperationRecord, note: string) => {
        if (!item.dailyGamePlanOperationId) {
            setNotesModal({ open: false, item: null, currentNote: '', canEdit: false });
            return;
        }
        try {
            await updateDailyGamePlanOperation(item.dailyGamePlanOperationId, { notes: note });
            setNotesModal({ open: false, item: null, currentNote: '', canEdit: false });
            await fetchData();
        } catch (e) {
            console.error('Error saving note:', e);
        }
    }, [fetchData]);

    /** Handle vehicle field change with validation */
    const handleFormFieldChange = useCallback((field: keyof FrontendOperationRecord, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            if (field === 'userId' && value) {
                const vendor = lookupMaps?.vendorMap.get(Number(value));
                if (vendor) {
                    updated.name = vendor.fullName || '';
                    if (vendor.vehicleId && lookupMaps?.vehicleMap) {
                        const v = lookupMaps.vehicleMap.get(vendor.vehicleId);
                        if (v) {
                            updated.vehicle = v.registrationPlates || '';
                            updated.vehicleId = v.vehicleId;
                        }
                    }
                    if (vendor.routeId && lookupMaps?.routeMap) {
                        const r = lookupMaps.routeMap.get(vendor.routeId);
                        if (r) {
                            updated.route = r.routeName || '';
                            updated.routeId = r.routeId;
                        }
                    }
                    if (vendor.costModelId) {
                        updated.costModelId = vendor.costModelId;
                    }
                }
            }

            if (field === 'adhocServiceId' && value) {
                const svc = adhocServices.find(s => s.adhocServiceId === Number(value));
                if (svc && svc.adhocVendorPayment != null) {
                    updated.adhocSort = svc.adhocVendorPayment;
                }
            }

            if (field === 'route' && value && lookupMaps?.routeNameMap) {
                const r = lookupMaps.routeNameMap.get(String(value));
                if (r) {
                    updated.routeId = r.routeId;

                    if (updated.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT &&
                        updated.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED &&
                        r.routeId !== BUSINESS_RULES.ROUTE.NOT_ALLOCATED) {
                        updated.status = BUSINESS_RULES.WORKING_STATUS.WORKING;
                    }

                    if (r.routeId === BUSINESS_RULES.ROUTE.NOT_ALLOCATED &&
                        updated.status !== BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED) {
                        updated.status = BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
                    }
                }
            }

            if (field === 'vehicle' && value && lookupMaps?.vehicleMap) {
                let found = false;
                for (const [, v] of lookupMaps.vehicleMap) {
                    if (v.registrationPlates === String(value)) {
                        updated.vehicleId = v.vehicleId;
                        found = true;
                        break;
                    }
                }
                if (!found) updated.vehicleId = undefined;
            }

            if (field === 'sort' && String(value).toLowerCase() === 'no') {
                updated.sortLate = false;
            }

            return updated;
        });
    }, [lookupMaps, adhocServices, isSupervisor]);

    const handleToggleCollapse = useCallback((id: number) => {
        setCollapsedDeposits(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const handleToggleOffPanel = useCallback(() => setIsOffPanelCollapsed(!isOffPanelCollapsed), [isOffPanelCollapsed]);
    const handleToggleNotAllocatedPanel = useCallback(() => setIsNotAllocatedPanelCollapsed(!isNotAllocatedPanelCollapsed), [isNotAllocatedPanelCollapsed]);

    // Pre-computed display lists for panels (use dedicated API sources, not weekPlannersData)
    const vendorsOffDisplay = useMemo(() => {
        if (!lookupMaps || dayOffItems.length === 0) return [];
        const opsToDisplay = dayOffItems;
        return opsToDisplay
            .filter(op => {
                const deposit = deposits.find((d: any) => d.depositId === op.depositId);
                const depositName = deposit?.depositName || (op as any).route?.depositName || '';
                return isAllowedDeposit({ depositId: op.depositId, depositName, isPhysical: deposit?.isPhysical });
            })
            .map(op => {
                const vendor = op.userId ? lookupMaps.vendorMap.get(op.userId) : undefined;
                const vehicle = op.vehicleId ? lookupMaps.vehicleMap.get(op.vehicleId) : undefined;
                const route = op.routeId ? lookupMaps.routeMap.get(op.routeId) : undefined;
                const deposit = deposits.find((d: any) => d.depositId === op.depositId);
                const depositName = deposit?.depositName || op.route?.depositName || '';
                const routeDefaultName = route?.routeName || '';
                const item: FrontendOperationRecord = {
                    weekPlannerId: op.weekPlannerId ?? undefined,
                    dailyGamePlanOperationId: op.dailyGamePlanOperationId,
                    userId: op.userId ?? undefined,
                    routeId: op.routeId ?? undefined,
                    vehicleId: op.vehicleId ?? undefined,
                    depositId: op.depositId ?? undefined,
                    depositName,
                    date: op.date,
                    route: route?.routeName || '',
                    name: vendor?.fullName || op.fullName || '',
                    paymentMode: 'DR',
                    rate: 0, sort: 'No', adhocSort: 0, extras: 0,
                    notes: op.notes || '',
                    vehicle: (vehicle as any)?.registrationPlates || '',
                    vendorType: '',
                    status: 'Off',
                    isDayOff: true,
                };
                return {
                    item, depositName,
                    rawStatus: op.status || '',
                    reason: op.reason || null,
                    registrationPlate: (vehicle as any)?.registrationPlates || '–',
                    isVanHome: op.isVanHome ?? null,
                    routeDefaultName,
                };
            });
    }, [dayOffItems, lookupMaps, deposits, isAdmin, isSupervisor, supervisorDepositIds]);

    const notAllocatedDisplay = useMemo(() => {
        if (!lookupMaps) return [];
        const opsToDisplay = dailyGamePlanOperations;
        const notAllocatedOps = opsToDisplay.filter(op => op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED);
        if (notAllocatedOps.length === 0) return [];
        return notAllocatedOps
            .filter(op => {
                const deposit = deposits.find((d: any) => d.depositId === op.depositId);
                const depositName = deposit?.depositName || (op as any).route?.depositName || '';
                return isAllowedDeposit({ depositId: op.depositId, depositName, isPhysical: deposit?.isPhysical });
            })
            .map(op => {
                const vendor = op.userId ? lookupMaps.vendorMap.get(op.userId) : undefined;
                const vehicle = op.vehicleId ? lookupMaps.vehicleMap.get(op.vehicleId) : undefined;
                const deposit = deposits.find((d: any) => d.depositId === op.depositId);
                const depositName = deposit?.depositName || op.route?.depositName || '';
                const routeDefaultName = vendor?.routeId ? (lookupMaps.routeMap.get(vendor.routeId)?.routeName ?? '') : '';
                const item: FrontendOperationRecord = {
                    weekPlannerId: op.weekPlannerId ?? undefined,
                    dailyGamePlanOperationId: op.dailyGamePlanOperationId,
                    userId: op.userId ?? undefined,
                    routeId: op.routeId ?? undefined,
                    vehicleId: op.vehicleId ?? undefined,
                    depositId: op.depositId ?? undefined,
                    depositName,
                    date: op.date,
                    route: op.routeId ? (lookupMaps.routeMap.get(op.routeId)?.routeName || '') : '',
                    name: vendor?.fullName || op.fullName || '',
                    paymentMode: 'DR',
                    rate: 0, sort: 'No', adhocSort: 0, extras: 0,
                    notes: op.notes || '',
                    vehicle: (vehicle as any)?.registrationPlates || '',
                    vendorType: '',
                    status: BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED,
                    isDayOff: false,
                };
                return {
                    item, depositName,
                    rawStatus: op.status || '',
                    reason: op.reason || null,
                    registrationPlate: (vehicle as any)?.registrationPlates || '–',
                    isVanHome: op.isVanHome ?? null,
                    routeDefaultName,
                };
            });
    }, [dailyGamePlanOperations, lookupMaps, deposits, isAdmin, isSupervisor, supervisorDepositIds]);

    const filteredWeekPlannersData = useMemo(() => {
        if (!searchTerm.trim()) return weekPlannersData;
        const s = searchTerm.toLowerCase().trim();
        return weekPlannersData.filter(op =>
            (op.name && op.name.toLowerCase().includes(s)) ||
            (op.route && op.route.toLowerCase().includes(s)) ||
            (op.vehicle && op.vehicle.toLowerCase().includes(s)) ||
            (op.depositName && op.depositName.toLowerCase().includes(s))
        );
    }, [weekPlannersData, searchTerm]);

    const filteredVendorsOffDisplay = useMemo(() => {
        if (!searchTerm.trim()) return vendorsOffDisplay;
        const s = searchTerm.toLowerCase().trim();
        return vendorsOffDisplay.filter(entry =>
            (entry.item.name && entry.item.name.toLowerCase().includes(s)) ||
            (entry.item.route && entry.item.route.toLowerCase().includes(s)) ||
            (entry.item.vehicle && entry.item.vehicle.toLowerCase().includes(s)) ||
            (entry.depositName && entry.depositName.toLowerCase().includes(s))
        );
    }, [vendorsOffDisplay, searchTerm]);

    const filteredNotAllocatedDisplay = useMemo(() => {
        if (!searchTerm.trim()) return notAllocatedDisplay;
        const s = searchTerm.toLowerCase().trim();
        return notAllocatedDisplay.filter(entry =>
            (entry.item.name && entry.item.name.toLowerCase().includes(s)) ||
            (entry.item.route && entry.item.route.toLowerCase().includes(s)) ||
            (entry.item.vehicle && entry.item.vehicle.toLowerCase().includes(s)) ||
            (entry.depositName && entry.depositName.toLowerCase().includes(s))
        );
    }, [notAllocatedDisplay, searchTerm]);

    return {
        selectedDate, setSelectedDate,
        viewDate, setViewDate,
        loading, error,
        weekPlannersData: filteredWeekPlannersData,
        searchTerm, setSearchTerm,
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
        formatDateDisplay: formatYmdSafe,
        headerTitle,
        isFinishing, isPendingDayFinishing, isOpenOperationFinishing,
        collapsedDeposits, handleToggleCollapse,
        isOffPanelCollapsed, handleToggleOffPanel,
        isNotAllocatedPanelCollapsed, handleToggleNotAllocatedPanel,
        showModal, setShowModal,
        editingIndex, setEditingIndex,
        formData, setFormData,
        notesModal, setNotesModal,
        handleStartStop,
        handleSaveDepositNotes,
        handleEditItem,
        handleDeleteItem,
        handleCreateAdHoc,
        handleCreateFlexRoute,
        handleSubmit,
        handlePendingDayFinish,
        handleOpenOperationFinish,
        onOpenNotesModal,
        handleSaveNote,
        handleFormFieldChange,
        fetchData,
        dailyGamePlanOperations,
        dayOffItems,
        vendorsOffDisplay: filteredVendorsOffDisplay,
        notAllocatedDisplay: filteredNotAllocatedDisplay,
        lookupMaps,
        isDailyGamePlanFinished,
        nalcRouteId,
        supervisorDepositIds,
        hasExistingNonSortAdhocForVendorOnDate,
        physicalDepositIds,
    };
}
