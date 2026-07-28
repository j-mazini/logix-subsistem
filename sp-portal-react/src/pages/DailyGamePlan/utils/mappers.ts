import {
    type DailyGamePlanOperationDTO,
    type DailyGamePlanOperationCreateDTO,
    type DailyGamePlanOperationUpdateDTO,
    type DailyOperationsManagementBulkCreateItemDTO,
    normalizeDailyGamePlanStatus,
    isDailyGamePlanOpNotAllocatedStatus,
} from '../mock/mockDailyGamePlanApi';
import { FrontendOperationRecord } from '../types';
import type { MockRoute, MockVendor } from '../mock/mockMasterData';
import { normalizeDate } from './helpers';
import { BUSINESS_RULES } from '../businessRules';

/** Local stand-ins for `@/lib/api/routes`' deposit DTOs (no backend in this subsystem). */
export interface RouteByDepositDTO {
    routeId: number;
    routeName: string;
    active: boolean;
    customerId: number;
    depositId: number;
    serviceTypeId: number;
    isFlex?: boolean;
    routeDefaultId?: number;
    routeDefaultName?: string;
}
export interface DepositWithRoutesFullDTO {
    depositId: number;
    depositName: string;
    description?: string;
    isPhysical?: boolean;
    routes: RouteByDepositDTO[];
}

/** WeekPlannerRecord isn't used by this subsystem's mock (DGP always works off DailyGamePlanOperationDTO directly). */
export interface WeekPlannerRecord {
    weekPlannerId?: number;
    operationId?: number;
    date?: string;
    route?: string;
    name?: string;
    notes?: string;
    status?: string;
    routeSort?: number | string;
    raw?: Record<string, any>;
}

/** Helper to convert to boolean from various types */
function toBool(val: any): boolean {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    return false;
}

/** Optimized function to map operation DTO to Frontend record */
export const mapOperationToFrontendRecord = (
    op: DailyGamePlanOperationDTO,
    vendorMap: Map<number, MockVendor>,
    userToVendorMap: Map<number, MockVendor>,
    routeMap: Map<number, MockRoute>,
    vehicleMap: Map<number, any>,
    deposits: DepositWithRoutesFullDTO[]
): FrontendOperationRecord => {
    const userId = op.userId;
    const vendors = (userId != null ? vendorMap.get(userId) : undefined)
        ?? (userId != null ? userToVendorMap.get(userId) : undefined);

    const routeId = op.routeId;
    const route = routeId ? routeMap.get(routeId) : undefined;

    const vehicleId = op.vehicleId;
    const vehicle = vehicleId ? vehicleMap.get(vehicleId) : undefined;

    const depositId = op.depositId;
    const deposit = deposits.find(d => d.depositId === depositId);

    const sortYes = op.isSort === true;
    const isDayOff = op.isDayOff === true;

    return {
        dailyGamePlanOperationId: op.dailyGamePlanOperationId,
        weekPlannerId: op.weekPlannerId ?? undefined,
        userId: userId ?? undefined,
        routeId: routeId ?? undefined,
        vehicleId: vehicleId ?? undefined,
        costModelId: op.costModelId ?? undefined,
        date: normalizeDate(op.date || ''),
        route: route?.routeName || op.routeName || '',
        name: vendors?.fullName || op.fullName || '',
        paymentMode: op.paymentMode || 'DR',
        rate: op.rate ?? 0,
        rateValue: op.rate ?? 0,
        routeCost: op.routeCost ?? 0,
        sort: sortYes ? 'Yes' : 'No',
        sortLate: op.isLate === true,
        adhocSort: 0,
        extras: 0,
        notes: op.notes || '',
        vehicle: vehicle?.registrationPlates || 'NOVEHICLE',
        vendorType: vendors?.vendorTypeDescription || '',
        status: isDayOff ? BUSINESS_RULES.WORKING_STATUS.OFF : (isDailyGamePlanOpNotAllocatedStatus(op.status) ? BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED : BUSINESS_RULES.WORKING_STATUS.WORKING),
        depositId: depositId ?? undefined,
        depositName: deposit?.depositName || '',
        isDayOff: isDayOff,
        raw: {
            ...op,
            vendors: vendors ? {
                userId: vendors.userId,
                fullName: vendors.fullName,
                email: vendors.email,
                vendorTypeDescription: vendors.vendorTypeDescription,
            } : null,
            route: {
                routeId: routeId ?? null,
                routeName: (route?.routeName) ?? null,
                depositId: depositId ?? (route as any)?.depositId ?? null,
                depositName: deposit?.depositName ?? null,
                isFlex: (route as any)?.isFlex ?? null,
            },
            vehicle: {
                vehicleId: vehicleId ?? null,
                vehicleModel: vehicle?.model ?? (vehicle as any)?.vehicleModel ?? null,
                vehicleRegistrationPlate: (vehicle?.registrationPlates) ?? null,
            },
            adhocService:
                op.adhocServiceId != null && Number(op.adhocServiceId) > 0
                    ? {
                        adhocServiceId: Number(op.adhocServiceId),
                        adhocName: null,
                        adhocReceivedPayment: null,
                        adhocVendorPayment: null,
                        isAdhocSort: null,
                    }
                    : null,
            isSort: isDayOff ? false : sortYes,
        },
    };
};

/** Deduplica week planners após merge (vários depósitos / range). Não exercitado pelo mock (sem fonte week-planner), mantido para fidelidade. */
export function weekPlannerDedupeKey(wp: WeekPlannerRecord): string {
    const raw = (wp.raw || {}) as Record<string, any>;
    const wpId = wp.weekPlannerId;
    if (Number.isFinite(wpId) && (wpId as number) > 0) {
        return `wp:${wpId}`;
    }
    const opIdRaw = wp.operationId;
    if (Number.isFinite(opIdRaw) && (opIdRaw as number) > 0) {
        return `op:${opIdRaw}`;
    }
    const date = normalizeDate(wp.date || '');
    const dep = (raw.depositId ?? raw._depositId ?? '') as string;
    const routeId = (raw.routeId ?? '') as string;
    const vehicleId = (raw.vehicleId ?? '') as string;
    const userId = (raw.userId ?? '') as string;
    const status = (wp.status ?? raw.status ?? '') as string;
    const routeLabel = (wp.route ?? raw.routeName ?? '') as string;
    return `fallback:${date}:${dep}:${routeId}:${vehicleId}:${userId}:${status}:${routeLabel}`;
}

// Optimized function to map Week Planner data to frontend format. Not exercised by
// this subsystem's mock (Daily Game Plan reads DailyGamePlanOperationDTO directly,
// no separate week-planner merge step), ported for fidelity with the source app.
export const mapWeekPlannerToFrontend = (
    weekPlanner: WeekPlannerRecord,
    vendorMap: Map<number, MockVendor>,
    userToVendorMap: Map<number, MockVendor>,
    routeMap: Map<number, MockRoute>,
    routeNameMap: Map<string, MockRoute>,
    vehicleMap: Map<number, any>,
    deposits?: DepositWithRoutesFullDTO[]
): FrontendOperationRecord => {
    const raw = (weekPlanner.raw || {}) as Record<string, any>;
    const rawRecord = raw as Record<string, any>;
    const weekPlannerRecord = weekPlanner as any;
    const isDayOff = toBool(rawRecord.isDayOff ?? weekPlannerRecord.isDayOff);

    let userId: number | undefined;
    const rawVendorId = raw.userId;
    if (rawVendorId != null && rawVendorId !== '' && Number(rawVendorId) !== 0) {
        const n = Number(rawVendorId);
        if (Number.isFinite(n)) userId = n;
    } else if (raw.vendor && typeof raw.vendor === 'object') {
        const vendorObj = raw.vendor as Record<string, unknown>;
        const uid = vendorObj.userId;
        if (uid != null && uid !== '' && Number(uid) !== 0) {
            const n = Number(uid);
            if (Number.isFinite(n)) userId = n;
        }
    }
    const vendor =
        (userId != null ? vendorMap.get(userId) : undefined)
        ?? (userId != null ? userToVendorMap.get(userId) : undefined);

    let vendorEmail: string | undefined;
    if (raw.vendor && typeof raw.vendor === 'object') {
        const vendorObj = raw.vendor as Record<string, unknown>;
        vendorEmail = vendorObj.email ? String(vendorObj.email) : undefined;
    }
    if (!vendorEmail && raw.email) vendorEmail = String(raw.email);
    if (!vendorEmail && raw.vendorEmail) vendorEmail = String(raw.vendorEmail);

    let routeId: number | undefined;
    let routeName: string | undefined;
    if (raw.route && typeof raw.route === 'object') {
        const routeObj = raw.route as Record<string, unknown>;
        routeId = routeObj.routeId ? Number(routeObj.routeId) : undefined;
        routeName = routeObj.routeName ? String(routeObj.routeName) : undefined;
    }
    if (!routeId && raw.routeId) routeId = Number(raw.routeId);
    if (!routeName && raw.routeName) routeName = String(raw.routeName);

    let foundRoute: MockRoute | undefined;
    if (routeId) foundRoute = routeMap.get(routeId);
    if (!foundRoute && routeName) foundRoute = routeNameMap.get(routeName);
    if (!foundRoute && weekPlanner.route) foundRoute = routeNameMap.get(weekPlanner.route);

    let vehicleId: number | undefined;
    if (raw.vehicleId) {
        vehicleId = Number(raw.vehicleId);
    } else if (raw.vehicle && typeof raw.vehicle === 'object') {
        const vehicleObj = raw.vehicle as Record<string, unknown>;
        vehicleId = vehicleObj.vehicleId ? Number(vehicleObj.vehicleId) : undefined;
    }
    const vehicle = vehicleId ? vehicleMap.get(vehicleId) : undefined;

    const isSortTrue = toBool(rawRecord.isSort ?? weekPlannerRecord.isSort);
    const isLateTrue = toBool((rawRecord as any).isLate ?? (weekPlannerRecord as any).isLate);
    const routeSortValue = weekPlanner.routeSort ?? raw.routeSort;
    let sortDisplay: 'Yes' | 'No' = 'No';
    let sortLate = false;
    if (isLateTrue) {
        sortDisplay = 'Yes';
        sortLate = true;
    } else if (isSortTrue) {
        sortDisplay = 'Yes';
    } else if (routeSortValue !== null && routeSortValue !== undefined && routeSortValue !== '') {
        const sortStr = String(routeSortValue).toLowerCase();
        const sortNum = Number(routeSortValue);
        if (sortStr === 'late' || sortStr === 'later' || sortNum === 1) {
            sortDisplay = 'Yes';
            sortLate = true;
        } else if (!isNaN(sortNum) && sortNum > 0) {
            sortDisplay = 'Yes';
        }
    }

    let paymentMode = 'DR';
    let costModelId: number | undefined;
    if (raw.costModel && typeof raw.costModel === 'object') {
        const cm = raw.costModel as any;
        paymentMode = cm.costModelName || cm.name || cm.description || 'DR';
        if (cm.costModelId != null) costModelId = Number(cm.costModelId);
    }
    if (!costModelId && raw.costModelId != null) costModelId = Number(raw.costModelId);
    if (!costModelId && vendor?.costModelId) costModelId = Number(vendor.costModelId);

    let depositId: number | undefined;
    let depositName: string | undefined;
    if (raw.depositId != null) depositId = Number(raw.depositId);
    if (raw.depositName) depositName = String(raw.depositName);
    if (!depositId && deposits && routeId) {
        for (const dep of deposits) {
            if (dep.routes?.some(r => r.routeId === routeId)) {
                depositId = dep.depositId;
                if (!depositName) depositName = dep.depositName;
                break;
            }
        }
    }

    return {
        weekPlannerId: weekPlanner.weekPlannerId,
        operationId: weekPlanner.operationId,
        dailyGamePlanOperationId: weekPlanner.operationId,
        userId: userId,
        routeId: foundRoute?.routeId || routeId,
        vehicleId: vehicleId,
        costModelId: costModelId,
        date: normalizeDate(weekPlanner.date || ''),
        route: foundRoute?.routeName || routeName || weekPlanner.route || '',
        name: vendor?.fullName || String(weekPlanner.name || '').trim() || String(raw.fullName || '').trim() || '',
        paymentMode: paymentMode,
        rate: (raw.rate !== undefined && raw.rate !== null && typeof raw.rate !== 'object') ? raw.rate : '',
        sort: sortDisplay,
        sortLate: sortLate,
        adhocSort: (weekPlanner as any).adhocSort ?? (raw.adhocSort ?? ''),
        extras: (raw.extra !== undefined && raw.extra !== null) ? raw.extra : '',
        notes: (weekPlanner.notes !== undefined && weekPlanner.notes !== null) ? weekPlanner.notes : (raw.notes ?? ''),
        vehicle: vehicle?.registrationPlates || (raw.vehicleRegistrationPlate as string) || 'NOVEHICLE',
        vendorType: vendor?.vendorTypeDescription || (raw.vendorTypeDescription as string) || '',
        isDayOff: isDayOff,
        status: (() => {
            const wpStatus = String((weekPlanner as any).status ?? '').trim().toLowerCase();
            const rawStatus = String((raw.status as string) ?? '').trim().toLowerCase();
            if (wpStatus === 'off' || wpStatus === 'inactive' || rawStatus === 'off' || rawStatus === 'inactive') return BUSINESS_RULES.WORKING_STATUS.OFF;
            if (isDailyGamePlanOpNotAllocatedStatus((weekPlanner as any).status) || isDailyGamePlanOpNotAllocatedStatus(raw.status as any)) return BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
            return BUSINESS_RULES.WORKING_STATUS.WORKING;
        })(),
        depositId: depositId,
        depositName: depositName,
        adhocServiceId: (raw.adhocServiceId as number) ?? undefined,
        rtSortConfirmed: (raw.routeSort && Number(raw.routeSort) > 0) ? true : false,
        email: vendorEmail || '',
        departTime: raw.departTime ?? '',
        returnTime: raw.returnTime ?? '',
        raw: raw
    };
};

export const mapFrontendToWeekPlanner = (
    frontend: FrontendOperationRecord,
    vendors: MockVendor[],
    routes: MockRoute[],
    vehicles: any[]
): Record<string, unknown> => {
    const userIdFromForm = frontend.userId != null ? Number(frontend.userId) : null;
    const vendor = userIdFromForm != null
        ? vendors.find(d => d.userId === userIdFromForm)
        : vendors.find(d => d.fullName === frontend.name);
    const route = routes.find(r => r.routeName === frontend.route);
    const vehicle = vehicles.find(v => v.registrationPlates === frontend.vehicle);

    return {
        date: frontend.date,
        routeId: route?.routeId ?? vendor?.routeId ?? null,
        userId: userIdFromForm ?? vendor?.userId ?? null,
        vehicleId: vehicle?.vehicleId ?? vendor?.vehicleId ?? null,
        notes: frontend.notes || null,
        status: frontend.status === BUSINESS_RULES.WORKING_STATUS.WORKING ? 'ACTIVE' : 'INACTIVE',
        depositId: frontend.depositId || null,
        depositName: frontend.depositName || null,
        isSort: frontend.sort === 'Yes',
        isDayOff: frontend.isDayOff || frontend.status === 'Off',
    };
};

export const mapDailyGamePlanOperationToFrontend = (
    op: DailyGamePlanOperationDTO,
    vendorMap: Map<number, MockVendor>,
    userToVendorMap: Map<number, MockVendor>,
    routeMap: Map<number, MockRoute>,
    vehicleMap: Map<number, any>,
    deposits?: DepositWithRoutesFullDTO[]
): FrontendOperationRecord => {
    const userId = op.userId;
    const vendor = (userId != null ? vendorMap.get(userId) : undefined)
        ?? (userId != null ? userToVendorMap.get(userId) : undefined);
    const route = op.routeId ? routeMap.get(op.routeId) : undefined;
    const vehicle = op.vehicleId ? vehicleMap.get(op.vehicleId) : undefined;

    const solvedDepositId = op.depositId
        || (op as any).route?.depositId
        || (op as any).adhocService?.depositId
        || undefined;

    const depositName = solvedDepositId
        ? (deposits?.find(d => d.depositId === solvedDepositId)?.depositName || (op as any).route?.depositName || (op as any).adhocService?.depositName)
        : undefined;

    const adhocServiceId = op.adhocServiceId || op.adhocService?.adhocServiceId;
    const isAdhocSort = op.adhocService?.isAdhocSort ?? false;

    return {
        weekPlannerId: op.weekPlannerId ?? undefined,
        dailyGamePlanOperationId: op.dailyGamePlanOperationId,
        userId: userId || undefined,
        routeId: op.routeId || (op.route?.routeId) || undefined,
        vehicleId: op.vehicleId || (op.vehicle?.vehicleId) || undefined,
        depositId: solvedDepositId || undefined,
        depositName: depositName,
        date: normalizeDate(String(op.date ?? '')),
        route: op.route?.routeName || (op as any).routeName || '',
        name: vendor?.fullName || (typeof op.fullName === 'string' ? op.fullName : ''),
        paymentMode: op.paymentMode || 'DR',
        rate: op.rate ?? 0,
        rateValue: op.rate ?? 0,
        routeCost: op.routeCost ?? 0,
        routeSort: op.routeSort ?? 0,
        sort: op.isSort ? 'Yes' : 'No',
        sortLate: !!op.isLate,
        adhocServiceId: adhocServiceId || undefined,
        adhocSort: isAdhocSort ? 1 : 0,
        extras: 0,
        notes: op.notes || '',
        vehicle: op.vehicle?.vehicleRegistrationPlate || vehicle?.registrationPlates || 'NOVEHICLE',
        vendorType: vendor?.vendorTypeDescription ?? '',
        isDayOff: !!op.isDayOff,
        isVanHome: !!op.isVanHome,
        status: op.isDayOff ? BUSINESS_RULES.WORKING_STATUS.OFF : (isDailyGamePlanOpNotAllocatedStatus(op.status) ? BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED : BUSINESS_RULES.WORKING_STATUS.WORKING),
    };
};

export const mapFrontendToDailyGamePlanOperationCreateDTO = (
    frontend: FrontendOperationRecord,
    vendors: MockVendor[],
    routes: MockRoute[],
    vehicles: any[],
    dateFallback: string,
    overrides?: Partial<DailyGamePlanOperationCreateDTO>
): DailyGamePlanOperationCreateDTO => {
    const userIdFromForm = frontend.userId != null ? Number(frontend.userId) : null;
    const vendor = userIdFromForm != null
        ? vendors.find(d => d.userId === userIdFromForm)
        : vendors.find(d => d.fullName === frontend.name);

    const route = routes.find(r => r.routeName === frontend.route);
    const vehicle = vehicles.find(v => v.registrationPlates === frontend.vehicle);

    const base: DailyGamePlanOperationCreateDTO = {
        date: normalizeDate(String(frontend.date || dateFallback)),
        userId: userIdFromForm ?? vendor?.userId ?? null,
        depositId: frontend.depositId ?? null,
        routeId: frontend.routeId ?? route?.routeId ?? null,
        vehicleId: vehicle?.vehicleId ?? null,
        adhocServiceId: (frontend as any).adhocServiceId ?? null,
        rate: Number(frontend.rateValue ?? frontend.rate ?? 0),
        routeSort: frontend.sort === 'Yes' ? (Number((frontend as any).routeSort) || null) : 0,
        isSort: frontend.sort === 'Yes',
        isDayOff: frontend.isDayOff || frontend.status === 'Off',
        isLate: !!frontend.sortLate,
        isVanHome: !!(frontend as any).isVanHome,
        status: normalizeDailyGamePlanStatus(frontend.status),
        notes: frontend.notes || null,
        weekPlannerId: frontend.weekPlannerId ?? null,
    };
    return { ...base, ...overrides };
};

/**
 * Group operations by deposit for the main display table.
 */
export function groupOperationsByDeposit(
    operations: FrontendOperationRecord[],
    deposits: DepositWithRoutesFullDTO[],
    isAdmin: boolean,
    isSupervisor: boolean,
    supervisorDepositIds: number[],
    isAllowedDepositFn: (deposit: DepositWithRoutesFullDTO | { depositId?: number; depositName?: string; isPhysical?: boolean }) => boolean
): Map<number, { depositName: string; operations: FrontendOperationRecord[] }> {
    const grouped = new Map<number, { depositName: string; operations: FrontendOperationRecord[] }>();

    if (isAdmin) {
        deposits.forEach(d => {
            if (isAllowedDepositFn(d)) {
                grouped.set(d.depositId, { depositName: d.depositName, operations: [] });
            }
        });

        supervisorDepositIds.forEach(depId => {
            if (!grouped.has(depId)) {
                const dep = deposits.find(d => d.depositId === depId);
                const depNameFallback = dep?.depositName
                    || operations.find(op => (op.depositId ?? 0) === depId)?.depositName
                    || (operations.find(op => (op.depositId ?? 0) === depId)?.raw as any)?.route?.depositName
                    || 'Support';
                grouped.set(depId, { depositName: depNameFallback, operations: [] });
            }
        });
    } else if (isSupervisor) {
        supervisorDepositIds.forEach(depId => {
            if (!grouped.has(depId)) {
                const dep = deposits.find(d => d.depositId === depId);
                const depNameFallback = dep?.depositName
                    || operations.find(op => (op.depositId ?? 0) === depId)?.depositName
                    || (operations.find(op => (op.depositId ?? 0) === depId)?.raw as any)?.route?.depositName
                    || 'Support';

                if (depNameFallback) {
                    grouped.set(depId, { depositName: depNameFallback, operations: [] });
                }
            }
        });
    }

    operations.forEach(op => {
        const depId = op.depositId ?? 0;
        const depName = op.depositName ?? 'Unknown';
        const isResponsible = supervisorDepositIds.includes(depId);
        const deposit = deposits.find(d => d.depositId === depId);

        const opDepositInfo = {
            depositId: depId,
            depositName: depName,
            isPhysical: deposit?.isPhysical,
        };
        if (!isAllowedDepositFn(opDepositInfo) && !isResponsible) return;
        if (!isAdmin && !isResponsible) return;

        if (!grouped.has(depId)) {
            grouped.set(depId, { depositName: depName, operations: [] });
        }

        if (op.status === BUSINESS_RULES.WORKING_STATUS.OFF || op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED) return;
        if (depId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT) return;

        grouped.get(depId)!.operations.push(op);
    });

    grouped.forEach((group) => {
        group.operations.sort((a, b) => {
            const routeA = (a.route || '').toLowerCase();
            const routeB = (b.route || '').toLowerCase();
            return routeA.localeCompare(routeB);
        });
    });

    return grouped;
}

/**
 * Map operations to the format expected by the "Vendors Off" panel.
 */
export function mapVendorsOffDisplay(operations: FrontendOperationRecord[]) {
    return operations
        .filter(op => op.isDayOff || op.status === BUSINESS_RULES.WORKING_STATUS.OFF)
        .map(item => ({
            item,
            depositName: item.depositName || '',
            rawStatus: BUSINESS_RULES.WORKING_STATUS.OFF,
            reason: null,
            registrationPlate: item.vehicle || '',
            isVanHome: !!item.isVanHome,
            routeDefaultName: item.route || ''
        }));
}

export function mapNotAllocatedDisplay(operations: FrontendOperationRecord[]) {
    return operations
        .filter(op => {
            const isNalc = op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
            const isBaop = op.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT;
            const isOff = op.isDayOff || op.status === BUSINESS_RULES.WORKING_STATUS.OFF;
            return isNalc || (isBaop && !isOff);
        })
        .map(item => ({
            item,
            depositName: item.depositName || '',
            rawStatus: BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED,
            reason: null,
            registrationPlate: item.vehicle || '',
            isVanHome: !!item.isVanHome,
            routeDefaultName: item.route || ''
        }));
}

/**
 * Map frontend operation record to partial patch DTO for Daily Game Plan Operation
 */
export const mapDailyGamePlanOperationPartialPatchDTO = (
    frontend: Partial<FrontendOperationRecord>
): Partial<DailyGamePlanOperationUpdateDTO> => {
    const patch: Partial<DailyGamePlanOperationUpdateDTO> = {};

    if (frontend.date !== undefined) patch.date = normalizeDate(String(frontend.date || ''));
    if (frontend.userId !== undefined) patch.userId = frontend.userId;
    if ((frontend as any).modelEmployeesId !== undefined) {
        const modelEmployeesId = Number((frontend as any).modelEmployeesId);
        patch.modelEmployeesId = Number.isFinite(modelEmployeesId) ? modelEmployeesId : null;
    }
    if (frontend.routeId !== undefined) patch.routeId = frontend.routeId;
    if (frontend.vehicleId !== undefined) patch.vehicleId = frontend.vehicleId;
    if (frontend.depositId !== undefined) patch.depositId = frontend.depositId;
    if (frontend.status !== undefined) {
        patch.status = normalizeDailyGamePlanStatus(frontend.status);
    }
    if (frontend.notes !== undefined) patch.notes = frontend.notes || null;
    if (frontend.sort !== undefined) patch.isSort = frontend.sort === 'Yes';
    if (frontend.routeSort !== undefined) {
        patch.routeSort = frontend.sort === 'Yes' ? (Number(frontend.routeSort) || null) : 0;
    }
    if (frontend.isDayOff !== undefined) patch.isDayOff = frontend.isDayOff;
    if (frontend.sortLate !== undefined) patch.isLate = !!frontend.sortLate;
    if ((frontend as any).isVanHome !== undefined) patch.isVanHome = !!(frontend as any).isVanHome;

    return patch;
};

export const mapFrontendToDailyOperationsManagementBulkCreateItemDTO = (
    frontend: FrontendOperationRecord,
    vendors: MockVendor[],
    routes: MockRoute[],
    vehicles: any[],
    deposits: DepositWithRoutesFullDTO[],
    dateFallback: string,
    overrides?: Partial<DailyOperationsManagementBulkCreateItemDTO>
): DailyOperationsManagementBulkCreateItemDTO => {
    const userIdFromForm = frontend.userId != null ? Number(frontend.userId) : null;
    const vendor = userIdFromForm != null
        ? vendors.find(d => d.userId === userIdFromForm)
        : vendors.find(d => d.fullName === frontend.name);

    const route = routes.find(r => r.routeName === frontend.route);
    const vehicle = vehicles.find(v => v.registrationPlates === frontend.vehicle);

    const depositId = (frontend.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT)
        ? BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT
        : (Number(frontend.depositId ?? (frontend as any).deposit_id) || null);

    const depositName = frontend.depositName
        || (depositId ? deposits.find(d => d.depositId === depositId)?.depositName : undefined);

    const base: DailyOperationsManagementBulkCreateItemDTO = {
        dailyGamePlanOperationId: Number(frontend.dailyGamePlanOperationId || 0),
        date: normalizeDate(String(frontend.date || dateFallback)),
        userId: userIdFromForm ?? vendor?.userId ?? null,
        modelEmployeesId: (() => {
            const n = Number((frontend as any).modelEmployeesId ?? (frontend.raw as any)?.modelEmployeesId);
            return Number.isFinite(n) && n > 0 ? n : null;
        })(),
        depositId: (frontend.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT)
            ? BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT
            : (Number(frontend.depositId ?? (frontend as any).deposit_id) || null),
        routeId: route?.routeId ??
            (frontend.route === 'DHOC' ? BUSINESS_RULES.ROUTE.DHOC :
                (frontend.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED ? BUSINESS_RULES.ROUTE.NOT_ALLOCATED : null)),
        vehicleId: vehicle?.vehicleId ?? null,
        rate: Number(frontend.rateValue ?? frontend.rate ?? 0),
        routeCost: Number(frontend.routeCost ?? 0),
        adhocSort: Number(frontend.adhocSort ?? 0),
        extra: Number(frontend.extras ?? 0),

        route: {
            routeId: route?.routeId ??
                (frontend.route === 'DHOC' ? BUSINESS_RULES.ROUTE.DHOC :
                    (frontend.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED ? BUSINESS_RULES.ROUTE.NOT_ALLOCATED : undefined)),
            routeName: route?.routeName || frontend.route || (frontend.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED ? 'NotAllocated' : ''),
            depositId: frontend.depositId ?? (route as any)?.depositId ?? null,
            depositName: depositName ?? null,
            isFlex: (route as any)?.isFlex ?? false,
        },

        vehicle: {
            vehicleId: vehicle?.vehicleId,
            vehicleModel: vehicle?.model || (vehicle as any)?.vehicleModel || null,
            vehicleRegistrationPlate: vehicle?.registrationPlates || frontend.vehicle,
        },

        adhocService: (frontend as any).adhocServiceId ? {
            adhocServiceId: Number((frontend as any).adhocServiceId),
            adhocName: (frontend as any).adhocServiceName || null,
            adhocReceivedPayment: Number((frontend as any).adhocReceivedPayment || 0),
            adhocVendorPayment: Number((frontend as any).adhocVendorPayment || 0),
            isAdhocSort: !!(frontend as any).isAdhocSort,
        } : null,

        isSort: frontend.sort === 'Yes',
        routeSort: frontend.sort === 'Yes' ? (Number((frontend as any).routeSort) || null) : 0,
        isDayOff: frontend.isDayOff || frontend.status === 'Off',
        isLate: !!frontend.sortLate,
        isVanHome: !!(frontend as any).isVanHome,
        status: normalizeDailyGamePlanStatus(frontend.status),
        notes: frontend.notes || null,
        weekPlannerId: frontend.weekPlannerId ?? null,
        createdBy: Number((frontend.raw as any)?.createdBy || 0) || null,
    };

    return { ...base, ...overrides };
};
