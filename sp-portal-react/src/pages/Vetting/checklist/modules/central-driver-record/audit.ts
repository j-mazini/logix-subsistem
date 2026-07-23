import {
  addDoc,
  collection,
  serverTimestamp,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Central Driver Record (CDR) audit log.
 *
 * Blueprint v2 — node 2 / CDR block 9: every CDR field change must be recorded
 * with who / when / why, so a DHL/CAA audit pack can be generated on demand.
 *
 * Entries are written to a per-record `auditLog` subcollection:
 *   - drivers:  drivers/{id}/auditLog/{autoId}
 *   - vendors:  workspaces/ba-express-vetting/vendors/{id}/auditLog/{autoId}
 */

export type CdrSource = 'drivers' | 'legacy-vendors';

export interface AuditActor {
  name: string;
  email: string;
}

export interface AuditChange {
  /** Dot-path of the changed field, e.g. "email" or "checklistDocs.rtw_doc.rtw_type". */
  field: string;
  previousValue: unknown;
  newValue: unknown;
  /** Optional human reason (e.g. rejection/hold note). */
  reason?: string | null;
}

export interface AuditEntry extends AuditChange {
  actorName: string;
  actorEmail: string;
  at: unknown;
  source: CdrSource;
}

function auditCollection(source: CdrSource, rawId: string): CollectionReference {
  return source === 'drivers'
    ? collection(db, 'drivers', rawId, 'auditLog')
    : collection(db, 'workspaces', 'ba-express-vetting', 'vendors', rawId, 'auditLog');
}

/** Normalise undefined to null so Firestore accepts the value. */
function normalise(value: unknown): unknown {
  return value === undefined ? null : value;
}

function isNoOp(change: AuditChange): boolean {
  const prev = change.previousValue ?? '';
  const next = change.newValue ?? '';
  if (typeof prev === 'object' || typeof next === 'object') {
    return JSON.stringify(prev) === JSON.stringify(next);
  }
  return prev === next;
}

export function actorFrom(user: { displayName?: string | null; email?: string | null } | null): AuditActor {
  return {
    name: user?.displayName ?? user?.email ?? 'Admin',
    email: user?.email ?? '',
  };
}

/**
 * Record one or more CDR field changes. No-op changes are skipped. Best-effort:
 * a logging failure never blocks the underlying save (the caller already wrote
 * the data); it surfaces only via the returned rejected promise if awaited.
 */
export async function logCdrChanges(
  source: CdrSource,
  rawId: string,
  changes: AuditChange[],
  actor: AuditActor,
): Promise<void> {
  const meaningful = changes.filter((c) => !isNoOp(c));
  if (meaningful.length === 0) return;

  const ref = auditCollection(source, rawId);
  await Promise.all(
    meaningful.map((change) =>
      addDoc(ref, {
        field: change.field,
        previousValue: normalise(change.previousValue),
        newValue: normalise(change.newValue),
        reason: change.reason ?? null,
        actorName: actor.name,
        actorEmail: actor.email,
        at: serverTimestamp(),
        source,
      } satisfies AuditEntry),
    ),
  );
}
