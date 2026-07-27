// @ts-nocheck
import { useMemo } from 'react';

export function normalizeVendorName(name) {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * No vendor catalogue backend exists in this subsystem, so this always
 * resolves to an empty map (no Service Partner badge is shown) — matching
 * the real hook's own "best-effort fallback" behavior when there's no match.
 */
export function useServicePartnerNameByVendorName() {
  return useMemo(() => new Map(), []);
}

export default useServicePartnerNameByVendorName;
