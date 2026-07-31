import { useEffect, useState } from "react";
import { Invoice } from "../types";
import { generateInvoiceList } from "../mock/mockInvoiceData";

/**
 * Mock stand-in for the Next.js source's `useMobileInvoices` (which wraps a
 * React-query call to `useInvoicesByUserLast12`). This subsystem has no
 * backend and no React Query provider, so the last 12 months are generated
 * locally with a small simulated delay.
 */
export function useMobileInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setInvoices(generateInvoiceList());
      setIsLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  return { invoices, isLoading };
}
