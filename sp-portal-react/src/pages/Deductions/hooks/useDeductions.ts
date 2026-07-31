import { useState, useEffect, useCallback, useMemo } from "react";
import { DeductionItem } from "../types";
import { processDeductions, calculateTotalDeductions } from "../utils";
import { getDeductionsForMonth } from "../mock/mockDeductionsData";

/**
 * Mock stand-in for the Next.js source's `useDeductions` (which fetches
 * `/bff/deductions/:userId/:month/:year`). `servicePartnerId` is accepted for
 * interface parity but unused — this subsystem has no per-vendor Service
 * Partner concept, so the filter never has anything to narrow.
 */
export const useDeductions = (selectedDate: Date, _servicePartnerId?: number) => {
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);
  const [error] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDeductions = useCallback(async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const raw = getDeductionsForMonth(year, month);
    const processed = processDeductions(raw, String(year), String(month + 1).padStart(2, "0"));

    setDeductions(processed);
    setIsLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchDeductions();
  }, [fetchDeductions]);

  const totalDeductions = useMemo(
    () => calculateTotalDeductions(deductions),
    [deductions]
  );

  const installmentProgressItems = useMemo(() => {
    return deductions.filter((d) => (d.totalInstallments || 1) > 1);
  }, [deductions]);

  return {
    deductions,
    error,
    isLoading,
    totalDeductions,
    installmentProgressItems,
    refetch: fetchDeductions,
  };
};
