/**
 * Daily Game Plan — mock API layer.
 *
 * Faithful stand-in for the Next.js app's `daily-game-plan/api.ts`: same exported
 * function names/signatures, but backed by an in-memory store instead of real HTTP
 * calls (no backend in this subsystem, same pattern as DailyOperationsManagement /
 * DailyOperationsReports). Mutations (create/update/delete/patch) persist into the
 * store for the lifetime of the tab, so the UI reflects changes truthfully across
 * re-fetches instead of resetting to the seed data.
 */
import { BUSINESS_RULES } from '../businessRules';
import { normalizeDate } from '../utils/helpers';
import {
    MOCK_ADHOC_SERVICES,
    MOCK_ADMIN_USER,
    MOCK_DEPOSITS,
    MOCK_ROUTES,
    MOCK_VEHICLES,
    MOCK_VENDORS,
    ROUTE_DHOC,
    rngForSeed,
    type MockAdhocService,
} from './mockMasterData';

const NETWORK_DELAY_MS = 120;
const delay = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/* ==================== DTOs (mirrors of the Next.js app's api.ts shapes) ==================== */
export interface DailyGamePlanWithSupportDTO {
    dailyGamePlanId?: number;
    depositId?: number;
    dailyTeamSupport?: {
        dailyTeamSupportId?: number;
        userId?: number;
        fullName?: string;
        depositId?: number;
    };
    date?: string;
    status?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DailyGamePlanUpdateDTO {
    depositId?: number;
    dailyTeamSupportId?: number;
    date?: string;
    status?: string;
    notes?: string;
}

export interface DailyTeamSupportLastSevenItemDTO {
    dailyTeamSupport: {
        dailyTeamSupportId: number;
        date: string;
        description?: string;
        userId?: number;
        depositId?: number;
    };
    dailyGamePlan?: {
        dailyGamePlanId?: number;
        depositId?: number;
        dailyTeamSupportId?: number;
        status?: string;
        date?: string;
        notes?: string;
    };
}

export interface DailyGamePlanOperationRouteNestedDTO {
    routeId?: number;
    routeName?: string;
    depositId?: number | null;
    depositName?: string | null;
    isFlex?: boolean;
}

export interface DailyGamePlanOperationVehicleNestedDTO {
    vehicleId?: number;
    vehicleModel?: string;
    vehicleRegistrationPlate?: string;
}

export interface DailyGamePlanOperationAdhocServiceNestedDTO {
    adhocServiceId?: number;
    adhocName?: string;
    adhocReceivedPayment?: number;
    adhocVendorPayment?: number;
    isAdhocSort?: boolean;
}

export interface DailyGamePlanOperationDTO {
    dailyGamePlanOperationId: number;
    userId?: number | null;
    fullName?: string | null;
    depositId?: number | null;
    routeId?: number | null;
    vehicleId?: number | null;
    costModelId?: number | null;
    adhocServiceId?: number | null;
    routeName?: string | null;
    paymentMode?: string | null;
    rate?: number | null;
    routeCost?: number | null;
    routeSort?: number | null;
    isSort?: boolean | null;
    isDayOff?: boolean | null;
    isLate?: boolean | null;
    isVanHome?: boolean | null;
    vendorRequestId?: number | null;
    status?: string | null;
    reason?: string | null;
    notes?: string | null;
    weekPlannerId?: number | null;
    date: string;
    createdBy?: number | string | null;
    createdAt?: string;
    updatedAt?: string;
    route?: DailyGamePlanOperationRouteNestedDTO;
    vehicle?: DailyGamePlanOperationVehicleNestedDTO;
    adhocService?: DailyGamePlanOperationAdhocServiceNestedDTO | null;
}

export interface DailyGamePlanOperationCreateDTO {
    userId?: number | null;
    depositId?: number | null;
    routeId?: number | null;
    vehicleId?: number | null;
    costModelId?: number | null;
    modelEmployeesId?: number | null;
    rate?: number | null;
    routeSort?: number | null;
    adhocServiceId?: number | null;
    isSort?: boolean | null;
    isDayOff?: boolean | null;
    isLate?: boolean | null;
    isVanHome?: boolean | null;
    vendorRequestId?: number | null;
    status?: string | null;
    reason?: string | null;
    notes?: string | null;
    weekPlannerId?: number | null;
    date: string;
    createdBy?: number | string | null;
}

export interface DailyGamePlanOperationUpdateDTO {
    userId?: number | null;
    modelEmployeesId?: number | null;
    depositId?: number | null;
    routeId?: number | null;
    vehicleId?: number | null;
    costModelId?: number | null;
    rate?: number | null;
    routeSort?: number | null;
    adhocServiceId?: number | null;
    isSort?: boolean | null;
    isDayOff?: boolean | null;
    isLate?: boolean | null;
    isVanHome?: boolean | null;
    vendorRequestId?: number | null;
    status?: string | null;
    reason?: string | null;
    notes?: string | null;
    weekPlannerId?: number | null;
    date?: string;
    createdBy?: number | string | null;
}

export interface DailyGamePlanOperationFiltersDTO {
    startDate?: string;
    endDate?: string;
    date?: string;
    userId?: number;
    depositId?: number;
    routeId?: number;
    vehicleId?: number;
    status?: string;
    isDayOff?: boolean;
    [key: string]: string | number | boolean | undefined;
}

export interface DailyOperationsManagementBulkItemRouteDTO {
    routeId?: number;
    routeName?: string;
    depositId?: number | null;
    depositName?: string | null;
    isFlex?: boolean;
}
export interface DailyOperationsManagementBulkItemVehicleDTO {
    vehicleId?: number;
    vehicleModel?: string;
    vehicleRegistrationPlate?: string;
}
export interface DailyOperationsManagementBulkItemAdhocServiceDTO {
    adhocServiceId?: number;
    adhocName?: string;
    adhocReceivedPayment?: number;
    adhocVendorPayment?: number;
    isAdhocSort?: boolean;
}
export interface DailyOperationsManagementBulkCreateItemDTO {
    dailyGamePlanOperationId: number;
    userId?: number | null;
    modelEmployeesId?: number | null;
    depositId?: number | null;
    routeId?: number | null;
    vehicleId?: number | null;
    rate?: number | null;
    routeCost?: number | null;
    routeSort?: number | null;
    adhocSort?: number | null;
    extra?: number | null;
    route: DailyOperationsManagementBulkItemRouteDTO;
    vehicle: DailyOperationsManagementBulkItemVehicleDTO;
    adhocService?: DailyOperationsManagementBulkItemAdhocServiceDTO | null;
    isSort?: boolean | null;
    isDayOff?: boolean | null;
    isLate?: boolean | null;
    isVanHome?: boolean | null;
    vendorRequestId?: number | null;
    status?: string | null;
    reason?: string | null;
    notes?: string | null;
    weekPlannerId?: number | null;
    date: string;
    createdBy?: number | null;
}
export interface DailyOperationsManagementBulkCreateFromFinishedDTO {
    items: DailyOperationsManagementBulkCreateItemDTO[];
}

export type AdhocServiceDTO = MockAdhocService;

/** Status helpers (ported 1:1 from api.ts) */
export const normalizeDailyGamePlanStatus = (status?: string): string => {
    if (!status) return BUSINESS_RULES.WORKING_STATUS.WORKING;
    const s = status.trim().toLowerCase();
    if (s === 'off' || s === 'inactive') return BUSINESS_RULES.WORKING_STATUS.OFF;
    if (isDailyGamePlanOpNotAllocatedStatus(status)) return BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED;
    return BUSINESS_RULES.WORKING_STATUS.WORKING;
};

export const isDailyGamePlanOpNotAllocatedStatus = (status?: string | null): boolean => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return (
        s === 'notallocated' ||
        s === 'not_allocated' ||
        s === 'not allocated' ||
        s === 'none' ||
        s === 'null' ||
        s === 'not_started' ||
        s === 'pending'
    );
};

/* ==================== In-memory store ==================== */
const operationsByDate = new Map<string, DailyGamePlanOperationDTO[]>();
const gamePlansByDate = new Map<string, Map<number, DailyGamePlanWithSupportDTO>>();
let opIdCounter = 90000;
let gamePlanIdCounter = 5000;

function findRoute(routeId: number | null | undefined) {
    return MOCK_ROUTES.find((r) => r.routeId === routeId);
}
function findVehicle(vehicleId: number | null | undefined) {
    return MOCK_VEHICLES.find((v) => v.vehicleId === vehicleId);
}
function findVendor(userId: number | null | undefined) {
    return MOCK_VENDORS.find((v) => v.userId === userId);
}
function findDeposit(depositId: number | null | undefined) {
    return MOCK_DEPOSITS.find((d) => d.depositId === depositId);
}

function buildNestedFromOp(op: DailyGamePlanOperationDTO): DailyGamePlanOperationDTO {
    const route = findRoute(op.routeId);
    const vehicle = findVehicle(op.vehicleId);
    const deposit = findDeposit(op.depositId);
    const adhoc = op.adhocServiceId ? MOCK_ADHOC_SERVICES.find((s) => s.adhocServiceId === op.adhocServiceId) : undefined;
    return {
        ...op,
        route: {
            routeId: op.routeId ?? undefined,
            routeName: route?.routeName ?? op.routeName ?? null,
            depositId: op.depositId ?? deposit?.depositId ?? null,
            depositName: deposit?.depositName ?? null,
            isFlex: route?.isFlex ?? false,
        },
        vehicle: {
            vehicleId: op.vehicleId ?? undefined,
            vehicleModel: vehicle?.model ?? undefined,
            vehicleRegistrationPlate: vehicle?.registrationPlates ?? undefined,
        },
        adhocService: adhoc
            ? {
                adhocServiceId: adhoc.adhocServiceId,
                adhocName: adhoc.adhocName,
                adhocReceivedPayment: adhoc.adhocReceivedPayment,
                adhocVendorPayment: adhoc.adhocVendorPayment,
                isAdhocSort: adhoc.isAdhocSort,
            }
            : null,
    };
}

/** Generates the seed operations for a date the very first time it's requested. */
function generateOperationsForDate(date: string): DailyGamePlanOperationDTO[] {
    const rng = rngForSeed(`daily-game-plan-ops-${date}`);
    const notesPool = ['Vehicle serviced this morning', 'Vendor requested late start', 'Covering extra loop', 'Please confirm arrival time', '', '', ''];
    const ops: DailyGamePlanOperationDTO[] = [];

    const regularVendors = MOCK_VENDORS.filter((v) => v.depositId !== BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT);
    const baopVendors = MOCK_VENDORS.filter((v) => v.depositId === BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT);

    for (const vendor of regularVendors) {
        const roll = rng();
        let status: string = BUSINESS_RULES.WORKING_STATUS.WORKING;
        let isDayOff = false;
        if (roll < 0.1) { status = BUSINESS_RULES.WORKING_STATUS.OFF; isDayOff = true; }
        else if (roll < 0.18) { status = BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED; }

        const base: DailyGamePlanOperationDTO = {
            dailyGamePlanOperationId: ++opIdCounter,
            userId: vendor.userId,
            fullName: vendor.fullName,
            depositId: status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED ? vendor.depositId : vendor.depositId,
            routeId: status === BUSINESS_RULES.WORKING_STATUS.WORKING ? vendor.routeId : (status === BUSINESS_RULES.WORKING_STATUS.OFF ? BUSINESS_RULES.ROUTE.DAY_OFF : BUSINESS_RULES.ROUTE.NOT_ALLOCATED),
            vehicleId: status === BUSINESS_RULES.WORKING_STATUS.WORKING ? vendor.vehicleId : null,
            costModelId: vendor.costModelId,
            adhocServiceId: null,
            paymentMode: 'DR',
            rate: status === BUSINESS_RULES.WORKING_STATUS.WORKING ? Math.round((90 + rng() * 60) * 100) / 100 : 0,
            routeCost: 0,
            routeSort: vendor.isSort ? (rng() > 0.5 ? 20 : 1) : 0,
            isSort: status === BUSINESS_RULES.WORKING_STATUS.WORKING ? vendor.isSort : false,
            isDayOff,
            isLate: status === BUSINESS_RULES.WORKING_STATUS.WORKING && vendor.isSort ? vendor.isLate : false,
            isVanHome: false,
            status,
            notes: isDayOff ? (rng() > 0.7 ? 'Booked holiday' : '') : notesPool[Math.floor(rng() * notesPool.length)],
            weekPlannerId: null,
            date,
            createdBy: MOCK_ADMIN_USER.id,
        };
        ops.push(buildNestedFromOp(base));

        // ~18% chance of an extra AD-HOC operation for a working vendor.
        if (status === BUSINESS_RULES.WORKING_STATUS.WORKING && rng() < 0.18) {
            const service = MOCK_ADHOC_SERVICES[Math.floor(rng() * MOCK_ADHOC_SERVICES.length)];
            const adhocOp: DailyGamePlanOperationDTO = {
                dailyGamePlanOperationId: ++opIdCounter,
                userId: vendor.userId,
                fullName: vendor.fullName,
                depositId: vendor.depositId,
                routeId: BUSINESS_RULES.ROUTE.DHOC,
                vehicleId: vendor.vehicleId,
                costModelId: 2,
                adhocServiceId: service.adhocServiceId,
                paymentMode: 'AD-HOC',
                rate: 0,
                routeCost: 0,
                routeSort: 0,
                isSort: false,
                isDayOff: false,
                isLate: false,
                isVanHome: false,
                status: BUSINESS_RULES.WORKING_STATUS.WORKING,
                notes: '',
                weekPlannerId: null,
                date,
                createdBy: MOCK_ADMIN_USER.id,
            };
            ops.push(buildNestedFromOp(adhocOp));
        }
    }

    // BAOP / Management & Support vendors — always shown via the Not Allocated / BAOP panel.
    baopVendors.forEach((vendor, i) => {
        const roll = rng();
        const status = roll < 0.5 ? BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED : BUSINESS_RULES.WORKING_STATUS.WORKING;
        const base: DailyGamePlanOperationDTO = {
            dailyGamePlanOperationId: ++opIdCounter,
            userId: vendor.userId,
            fullName: vendor.fullName,
            depositId: BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT,
            routeId: status === BUSINESS_RULES.WORKING_STATUS.WORKING ? BUSINESS_RULES.ROUTE.DHOC : BUSINESS_RULES.ROUTE.NOT_ALLOCATED,
            vehicleId: null,
            costModelId: null,
            adhocServiceId: null,
            paymentMode: 'DR',
            rate: 0,
            routeCost: 0,
            routeSort: 0,
            isSort: false,
            isDayOff: false,
            isLate: false,
            isVanHome: false,
            status,
            notes: i === 0 ? 'Covering support desk today' : '',
            weekPlannerId: null,
            date,
            createdBy: MOCK_ADMIN_USER.id,
        };
        ops.push(buildNestedFromOp(base));
    });

    return ops;
}

function getOperationsForDate(date: string): DailyGamePlanOperationDTO[] {
    const key = normalizeDate(date);
    let ops = operationsByDate.get(key);
    if (!ops) {
        ops = generateOperationsForDate(key);
        operationsByDate.set(key, ops);
    }
    return ops;
}

function getGamePlansForDate(date: string): Map<number, DailyGamePlanWithSupportDTO> {
    const key = normalizeDate(date);
    let plans = gamePlansByDate.get(key);
    if (!plans) {
        plans = new Map();
        // The single mock admin supervises every allowed deposit, every day.
        for (const dep of MOCK_DEPOSITS) {
            if (!dep.isPhysical && dep.depositId !== BUSINESS_RULES.DEPOSIT.BAOP_DEFAULT) continue;
            plans.set(dep.depositId, {
                dailyGamePlanId: ++gamePlanIdCounter,
                depositId: dep.depositId,
                dailyTeamSupport: {
                    dailyTeamSupportId: dep.depositId,
                    userId: MOCK_ADMIN_USER.id,
                    fullName: MOCK_ADMIN_USER.fullName,
                    depositId: dep.depositId,
                },
                date: key,
                status: undefined,
                notes: '',
            });
        }
        gamePlansByDate.set(key, plans);
    }
    return plans;
}

/* ==================== Public API (mirrors daily-game-plan/api.ts) ==================== */

export const fetchDailySupervisorCheck = async (date: string) => {
    await delay();
    const plans = Array.from(getGamePlansForDate(date).values());
    return plans.map((p) => ({
        date: normalizeDate(date),
        depositId: p.depositId ?? 0,
        depositName: findDeposit(p.depositId)?.depositName,
        supervisorId: p.dailyTeamSupport?.userId,
        supervisorName: p.dailyTeamSupport?.fullName,
    }));
};

/**
 * The real endpoint returns the last 7 days of `daily_team_support` assignments for a
 * supervisor/admin, used to auto-detect an unfinished previous day. Our mock admin
 * supervises everything and always has today's plan ready, so this only ever reports
 * *today* — which keeps the pending-day modal from firing on a fresh mock dataset.
 */
export const fetchDailyTeamSupportLastSevenByUser = async (userId: number): Promise<DailyTeamSupportLastSevenItemDTO[]> => {
    await delay();
    if (userId !== MOCK_ADMIN_USER.id) return [];
    const today = normalizeDate(new Date().toISOString());
    const plans = getGamePlansForDate(today);
    return Array.from(plans.values()).map((plan) => ({
        dailyTeamSupport: {
            dailyTeamSupportId: plan.depositId ?? 0,
            date: today,
            userId,
            depositId: plan.depositId,
        },
        dailyGamePlan: {
            dailyGamePlanId: plan.dailyGamePlanId,
            depositId: plan.depositId,
            status: plan.status,
            date: today,
            notes: plan.notes,
        },
    }));
};

export const fetchDailyGamePlansByDate = async (date: string): Promise<DailyGamePlanWithSupportDTO[]> => {
    await delay();
    return Array.from(getGamePlansForDate(date).values());
};

export const fetchDailyGamePlanOperations = async (
    filters: DailyGamePlanOperationFiltersDTO = {}
): Promise<DailyGamePlanOperationDTO[]> => {
    await delay();
    const date = filters.date ? normalizeDate(String(filters.date)) : undefined;
    if (!date) return [];
    let rows = getOperationsForDate(date);
    if (filters.userId != null) rows = rows.filter((r) => r.userId === Number(filters.userId));
    if (filters.depositId != null) rows = rows.filter((r) => r.depositId === Number(filters.depositId));
    if (filters.routeId != null) rows = rows.filter((r) => r.routeId === Number(filters.routeId));
    if (filters.vehicleId != null) rows = rows.filter((r) => r.vehicleId === Number(filters.vehicleId));
    if (filters.status != null) rows = rows.filter((r) => String(r.status).toLowerCase() === String(filters.status).toLowerCase());
    if (filters.isDayOff != null) rows = rows.filter((r) => Boolean(r.isDayOff) === Boolean(filters.isDayOff));
    return rows;
};

export const fetchDailyGamePlanOperationsDayOff = async (date: string): Promise<DailyGamePlanOperationDTO[]> =>
    fetchDailyGamePlanOperations({ date, isDayOff: true });

export const createDailyGamePlanOperation = async (data: DailyGamePlanOperationCreateDTO): Promise<DailyGamePlanOperationDTO> => {
    await delay();
    const date = normalizeDate(data.date);
    const op: DailyGamePlanOperationDTO = buildNestedFromOp({
        dailyGamePlanOperationId: ++opIdCounter,
        userId: data.userId ?? null,
        fullName: findVendor(data.userId)?.fullName ?? null,
        depositId: data.depositId ?? null,
        routeId: data.routeId ?? null,
        vehicleId: data.vehicleId ?? null,
        costModelId: data.costModelId ?? null,
        adhocServiceId: data.adhocServiceId ?? null,
        paymentMode: data.adhocServiceId ? 'AD-HOC' : 'DR',
        rate: data.rate ?? 0,
        routeCost: 0,
        routeSort: data.routeSort ?? 0,
        isSort: data.isSort ?? false,
        isDayOff: data.isDayOff ?? false,
        isLate: data.isLate ?? false,
        isVanHome: data.isVanHome ?? false,
        status: data.status ?? BUSINESS_RULES.WORKING_STATUS.WORKING,
        notes: data.notes ?? '',
        weekPlannerId: data.weekPlannerId ?? null,
        date,
        createdBy: data.createdBy ?? MOCK_ADMIN_USER.id,
    });
    const rows = getOperationsForDate(date);
    rows.push(op);
    return op;
};

export const updateDailyGamePlanOperation = async (
    id: number,
    data: DailyGamePlanOperationUpdateDTO
): Promise<DailyGamePlanOperationDTO> => {
    await delay();
    for (const rows of operationsByDate.values()) {
        const idx = rows.findIndex((r) => r.dailyGamePlanOperationId === id);
        if (idx === -1) continue;
        const current = rows[idx];
        const merged: DailyGamePlanOperationDTO = buildNestedFromOp({
            ...current,
            ...data,
            fullName: data.userId != null ? (findVendor(data.userId)?.fullName ?? current.fullName) : current.fullName,
            date: data.date ? normalizeDate(data.date) : current.date,
        } as DailyGamePlanOperationDTO);
        rows[idx] = merged;
        return merged;
    }
    throw new Error(`Operation ${id} not found`);
};

export const deleteDailyGamePlanOperation = async (id: number): Promise<void> => {
    await delay();
    for (const rows of operationsByDate.values()) {
        const idx = rows.findIndex((r) => r.dailyGamePlanOperationId === id);
        if (idx !== -1) {
            rows.splice(idx, 1);
            return;
        }
    }
};

export const stopDailyGamePlanOperation = async (id: number): Promise<void> => {
    await updateDailyGamePlanOperation(id, { status: BUSINESS_RULES.WORKING_STATUS.OFF, isDayOff: true });
};

export const transitionDailyGamePlanOperation = async (id: number, action: string): Promise<DailyGamePlanOperationDTO> => {
    if (action === 'move_to_not_allocated') {
        return updateDailyGamePlanOperation(id, {
            status: BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED,
            routeId: BUSINESS_RULES.ROUTE.NOT_ALLOCATED,
        });
    }
    if (action === 'move_to_day_off') {
        return updateDailyGamePlanOperation(id, { status: BUSINESS_RULES.WORKING_STATUS.OFF, isDayOff: true });
    }
    await delay();
    for (const rows of operationsByDate.values()) {
        const found = rows.find((r) => r.dailyGamePlanOperationId === id);
        if (found) return found;
    }
    throw new Error(`Operation ${id} not found`);
};

/** No separate "Daily Operations Management" store in this mock — finishing just resolves. */
export const bulkFinishDailyGamePlanOperations = async (
    _payload: DailyOperationsManagementBulkCreateFromFinishedDTO
): Promise<void> => {
    await delay();
};

export const bulkCreateDailyGamePlanOperations = async (payload: DailyOperationsManagementBulkCreateFromFinishedDTO): Promise<void> => {
    if (!payload.items || payload.items.length === 0) return;
    await bulkFinishDailyGamePlanOperations(payload);
};

export const bulkDayOffDailyOperationsManagement = async (
    items: Partial<DailyGamePlanOperationDTO>[]
): Promise<{ success: boolean; created: number }> => {
    await delay();
    for (const item of items) {
        if (!item.date) continue;
        const date = normalizeDate(item.date);
        const rows = getOperationsForDate(date);
        rows.push(buildNestedFromOp({
            dailyGamePlanOperationId: ++opIdCounter,
            userId: item.userId ?? null,
            fullName: findVendor(item.userId ?? undefined)?.fullName ?? null,
            depositId: item.depositId ?? BUSINESS_RULES.DEPOSIT.DAY_OFF,
            routeId: BUSINESS_RULES.ROUTE.DAY_OFF,
            vehicleId: null,
            status: BUSINESS_RULES.WORKING_STATUS.OFF,
            isDayOff: true,
            notes: item.notes ?? '',
            date,
            createdBy: MOCK_ADMIN_USER.id,
        } as DailyGamePlanOperationDTO));
    }
    return { success: true, created: items.length };
};

/** PATCH /bff/daily-game-plan/:id — status do plano (start / finished, notas, etc.). */
export const updateDailyGamePlan = async (id: number, data: DailyGamePlanUpdateDTO): Promise<DailyGamePlanWithSupportDTO> => {
    await delay();
    const date = data.date ? normalizeDate(data.date) : undefined;
    const plans = date ? getGamePlansForDate(date) : null;
    if (plans) {
        for (const [depId, plan] of plans) {
            if (plan.dailyGamePlanId === id) {
                const next = { ...plan, ...data };
                plans.set(depId, next);
                return next;
            }
        }
    }
    // Fallback: search every cached date (notes/status updates that don't carry a date).
    for (const map of gamePlansByDate.values()) {
        for (const [depId, plan] of map) {
            if (plan.dailyGamePlanId === id) {
                const next = { ...plan, ...data };
                map.set(depId, next);
                return next;
            }
        }
    }
    throw new Error(`Daily game plan ${id} not found`);
};

export const fetchAdhocServices = async (): Promise<AdhocServiceDTO[]> => {
    await delay();
    return MOCK_ADHOC_SERVICES;
};

export { ROUTE_DHOC };
