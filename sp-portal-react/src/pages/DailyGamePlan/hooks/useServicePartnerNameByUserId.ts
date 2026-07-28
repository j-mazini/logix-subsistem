import { useMemo } from 'react';
import { MOCK_SERVICE_PARTNERS, MOCK_VENDORS } from '../mock/mockMasterData';

/**
 * Mock stand-in for the Next.js app's `useServicePartnerNameByUserId`: returns a
 * Map<userId, partnerName> for rendering the Service Partner badge on operation rows.
 * Backed directly by the mock vendor/service-partner lists (static, no fetch needed).
 */
export function useServicePartnerNameByUserId(): Map<number, string> {
    return useMemo(() => {
        const spNameById = new Map<number, string>();
        MOCK_SERVICE_PARTNERS.forEach((sp) => spNameById.set(sp.servicePartnerId, sp.partnerName));

        const map = new Map<number, string>();
        MOCK_VENDORS.forEach((v) => {
            if (v.servicePartnerId == null) return;
            const name = spNameById.get(v.servicePartnerId);
            if (name) map.set(v.userId, name);
        });
        return map;
    }, []);
}

export default useServicePartnerNameByUserId;
