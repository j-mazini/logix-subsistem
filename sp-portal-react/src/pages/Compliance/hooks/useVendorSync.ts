import { useEffect, useRef } from 'react';
import { db } from '../../Vetting/shims/firebase';
import { collection, onSnapshot } from '../../Vetting/shims/firestore';
import { mapDriverDoc, mapLegacyVendorDoc } from '../../Vetting/vetting/data/candidates';
import { ComplianceUpdateEvent } from '../types/compliance';

/**
 * Listens to the real Vetting data (same source used by the real page
 * embedded in the Vetting tab) and emits `compliance-updated` whenever a
 * candidate reaches a terminal stage (Active/Rejected), so the Vendor
 * page reacts to the real compliance status, not a mock.
 */
export function useVendorSync() {
  const lastStageById = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const emitIfTerminal = (id: string, name: string, stage: string) => {
      const previous = lastStageById.current.get(id);
      lastStageById.current.set(id, stage);
      if (previous === stage) return;
      if (stage !== 'Active' && stage !== 'Rejected') return;

      const event: ComplianceUpdateEvent = {
        profileId: id,
        status: stage === 'Active' ? 'completed' : 'rejected',
        vendorAccess: stage === 'Active' ? 'full' : 'none',
        timestamp: new Date().toISOString(),
      };

      window.dispatchEvent(new CustomEvent('compliance-updated', { detail: { ...event, candidateName: name } }));
    };

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snap) => {
      snap.docs.forEach((d) => {
        const candidate = mapDriverDoc(d.id, d.data());
        emitIfTerminal(`driver-${d.id}`, candidate.name, candidate.stage);
      });
    });

    const unsubLegacy = onSnapshot(collection(db, 'workspaces', 'ba-express-vetting', 'vendors'), (snap) => {
      snap.docs.forEach((d) => {
        const candidate = mapLegacyVendorDoc(d.id, d.data());
        emitIfTerminal(`legacy-${d.id}`, candidate.name, candidate.stage);
      });
    });

    return () => {
      unsubDrivers();
      unsubLegacy();
    };
  }, []);
}
