import { format } from 'date-fns';
import { FrontendOperationRecord } from '../types';
import { BUSINESS_RULES } from '../businessRules';
import type { MockVendor } from '../mock/mockMasterData';

/** Número finito ou null para campos opcionais do bulk daily-operations-management */
export function parseOptNumberForBulk(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

export function normalizeCreatedByForBulk(createdBy: number | string | null | undefined): number | null {
    if (createdBy === null || createdBy === undefined || createdBy === '') return null;
    if (typeof createdBy === 'number' && Number.isFinite(createdBy)) return createdBy;
    const n = Number(createdBy);
    return Number.isFinite(n) ? n : null;
}

/** Linha elegível para bulk no finish: tem weekPlannerId OU dailyGamePlanOperationId (fluxo só DGP). */
export function operationRecordEligibleForBulkFinish(op: FrontendOperationRecord): boolean {
    const wp = op.weekPlannerId != null ? Number(op.weekPlannerId) : NaN;
    if (Number.isFinite(wp) && wp > 0) return true;
    const dgp = op.dailyGamePlanOperationId != null ? Number(op.dailyGamePlanOperationId) : NaN;
    if (Number.isFinite(dgp) && dgp > 0) return true;
    const oid = op.operationId != null ? Number(op.operationId) : NaN;
    return Number.isFinite(oid) && oid > 0;
}

/** Helper function to normalize date */
export const normalizeDate = (dateString: string): string => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }

    // ISO-like values
    if (dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
    }

    // Strings like: "Mon May 06 2026 00:00:00 GMT..."
    const parsed = new Date(dateString);
    if (!Number.isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // Last fallback for space-separated payloads
    const firstChunk = dateString.trim().split(' ')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(firstChunk) ? firstChunk : dateString;
};

/** Igual ao filtro SQL do backend: normalizar status e comparar a NotAllocated. */
export function isDailyGamePlanOpNotAllocatedStatus(status: string | null | undefined): boolean {
    return (
        String(status ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '') === 'notallocated'
    );
}

export function isNotAllocatedFrontendOperation(op: FrontendOperationRecord): boolean {
    return op.status === BUSINESS_RULES.WORKING_STATUS.NOT_ALLOCATED || isDailyGamePlanOpNotAllocatedStatus(op.status);
}

/**
 * `moveToNotAllocated` grava `routeId` como NALC (dinâmico) ou legacy NotAllocated (159).
 */
export function isNotAllocatedPlaceholderRouteId(
    routeId: number | undefined | null,
    nalcRouteId: number
): boolean {
    if (routeId == null || !Number.isFinite(Number(routeId))) return false;
    const id = Number(routeId);
    return id === nalcRouteId;
}

export const toBool = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        return v === 'true' || v === '1' || v === 'yes' || v === 'y';
    }
    return false;
};

export const toPositiveNumberOrNull = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * PATCH NotAllocated precisa de `userId` quando a API exige.
 */
export function resolveUserIdForNotAllocatedPatch(
    item: FrontendOperationRecord,
    vendors: MockVendor[],
    dgpFallback: { userId?: number | null } | null | undefined,
    resolvedVendor: MockVendor | null | undefined
): number | null {
    const fromItem = toPositiveNumberOrNull(item.userId);
    if (fromItem != null) return fromItem;
    if (dgpFallback?.userId != null && Number(dgpFallback.userId) > 0) {
        return Number(dgpFallback.userId);
    }
    if (resolvedVendor?.userId != null && Number(resolvedVendor.userId) > 0) {
        return Number(resolvedVendor.userId);
    }
    const did = item.userId != null ? Number(item.userId) : NaN;
    if (Number.isFinite(did) && did > 0) {
        const dr = vendors.find(d => d.userId === did);
        if (dr?.userId != null && Number(dr.userId) > 0) return dr.userId;
    }
    return null;
}

// Parse a `yyyy-MM-dd` string as a local Date
export const parseLocalYmdDate = (ymd: string): Date => {
    const [year, month, day] = (ymd || '').split('-').map(Number);
    return new Date(year, month - 1, day);
};

/** Safe format for prerender */
export const formatYmdSafe = (ymd: string, fmt: string, fallback = '-'): string => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return fallback;
    try {
        const d = parseLocalYmdDate(ymd);
        if (Number.isNaN(d.getTime())) return fallback;
        return format(d, fmt);
    } catch {
        return fallback;
    }
};
