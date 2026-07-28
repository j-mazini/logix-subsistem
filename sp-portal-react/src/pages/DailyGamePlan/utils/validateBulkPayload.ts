import type { DailyOperationsManagementBulkCreateItemDTO } from "../mock/mockDailyGamePlanApi";

export interface BulkValidationIssue {
  index: number;
  dailyGamePlanOperationId: number;
  errors: string[];
}

/**
 * Valida o payload antes de enviar ao endpoint bulk (formato camelCase alinhado ao DTO).
 */
export function validateBulkPayload(
  items: DailyOperationsManagementBulkCreateItemDTO[]
): BulkValidationIssue[] {
  const issues: BulkValidationIssue[] = [];
  const seenIds = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const errors: string[] = [];

    const opId = Number(item?.dailyGamePlanOperationId);
    if (!Number.isFinite(opId) || opId <= 0) {
      errors.push(
        `dailyGamePlanOperationId inválido: "${item?.dailyGamePlanOperationId}"`
      );
    }

    const createdBy = Number(item?.createdBy ?? 0);
    if (!Number.isFinite(createdBy) || createdBy <= 0) {
      errors.push("createdBy ausente ou inválido");
    }

    if (Number.isFinite(opId) && opId > 0) {
      if (seenIds.has(opId)) {
        errors.push(`dailyGamePlanOperationId ${opId} duplicado no payload`);
      } else {
        seenIds.add(opId);
      }
    }

    if (errors.length > 0) {
      issues.push({
        index: i,
        dailyGamePlanOperationId: opId,
        errors,
      });
    }
  }

  return issues;
}
