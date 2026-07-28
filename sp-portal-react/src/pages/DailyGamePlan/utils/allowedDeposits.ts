export const ALLOWED_DEPOSIT_CODES = ["LSE", "LCY", "MSE", "BAOP"] as const;

const ALLOWED_DEPOSIT_CODE_SET = new Set<string>(ALLOWED_DEPOSIT_CODES);

export function isAllowedDepositName(depositName: string | null | undefined): boolean {
  if (!depositName) return false;
  const name = String(depositName).trim().toUpperCase();
  if (!name) return false;
  if (ALLOWED_DEPOSIT_CODE_SET.has(name)) return true;
  return /\b(LSE|LCY|MSE|BAOP)\b/.test(name);
}

export function isBaopDepositName(depositName: string | null | undefined): boolean {
  if (!depositName) return false;
  const name = String(depositName).trim().toUpperCase();
  if (!name) return false;
  return /\bBAOP\b/.test(name);
}

export function isAllowedDeposit(deposit: { depositId?: number | null; depositName?: string | null; isPhysical?: boolean } | null | undefined): boolean {
  if (!deposit) return false;
  return !!deposit.isPhysical || isBaopDepositName(deposit.depositName) || deposit.depositId === 4;
}

export function filterAllowedDeposits<
  T extends { depositName?: string | null; depositId?: number; isPhysical?: boolean },
>(deposits: T[]): T[] {
  return (deposits || []).filter((d) =>
    d.isPhysical || isBaopDepositName(d?.depositName) || d.depositId === 4
  );
}
