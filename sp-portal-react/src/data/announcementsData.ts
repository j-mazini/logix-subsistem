/**
 * Port of ../../avisos-storage.js (AvisosStorage): shared localStorage-backed
 * "avisos" (announcements) store. DHL broadcasts (source: 'DHL', the
 * default) are visible everywhere; a Service Provider's own announcements
 * (source: 'SP', with spName) are only visible within that SP's own portal.
 * Not part of window.DHL_MOCK_DATA — this is its own persisted store, key
 * 'dhl_avisos', same as the static site so switching between the legacy app
 * and this SPA during rollout keeps the same data.
 */

export interface AvisoRecord {
  id: string;
  title: string;
  message: string;
  expireDate: string;
  createdAt: string;
  deleted?: boolean;
  source?: 'DHL' | 'SP';
  spName?: string;
  publishDate?: string;
  type?: string;
  urgency?: string;
  audience?: string[];
}

export interface NewAvisoInput {
  title: string;
  message: string;
  expireDate?: string;
  publishDate?: string;
  type?: string;
  urgency?: string;
  audience?: string[];
  source?: 'SP';
  spName?: string;
}

const STORAGE_KEY = 'dhl_avisos';

function loadRaw(): AvisoRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRaw(list: AvisoRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

/** A 'SP' aviso is only visible in the portal of the SP that created it; 'DHL' avisos are global. */
function isVisibleTo(aviso: AvisoRecord, sp: string | null): boolean {
  if (aviso.source !== 'SP') return true;
  return !!sp && aviso.spName === sp;
}

/** All avisos visible to the given SP context (mirrors AvisosStorage.getAllAvisos()). */
export function getAllAvisos(sp: string): AvisoRecord[] {
  const currentSp = sp || null;
  return loadRaw().filter((a) => isVisibleTo(a, currentSp));
}

/** Adds an aviso. Defaults to source 'DHL' (visible to all) unless source: 'SP' is passed. */
export function addAviso(input: NewAvisoInput): string {
  const list = loadRaw();
  const id = `aviso-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: AvisoRecord = {
    id,
    title: (input.title || '').trim(),
    message: (input.message || '').trim(),
    expireDate: (input.expireDate || '').trim(),
    createdAt: new Date().toISOString(),
    deleted: false,
    source: input.source === 'SP' ? 'SP' : 'DHL',
  };
  if (record.source === 'SP') record.spName = input.spName || '';
  if (input.publishDate) record.publishDate = String(input.publishDate).trim();
  if (input.type) record.type = input.type;
  if (input.urgency) record.urgency = input.urgency;
  if (Array.isArray(input.audience)) record.audience = input.audience;
  list.unshift(record);
  saveRaw(list);
  return id;
}

/** Updates fields of an existing aviso (edit). Returns false if the id doesn't exist. */
export function updateAviso(id: string, patch: Partial<AvisoRecord>): boolean {
  const list = loadRaw();
  let found = false;
  const next = list.map((a) => {
    if (a.id !== id) return a;
    found = true;
    return { ...a, ...patch, id: a.id };
  });
  if (found) saveRaw(next);
  return found;
}

/** Soft-deletes an aviso (marks deleted: true). */
export function deleteAviso(id: string): boolean {
  const list = loadRaw();
  let found = false;
  const next = list.map((a) => {
    if (a.id === id) {
      found = true;
      return { ...a, deleted: true };
    }
    return a;
  });
  if (found) saveRaw(next);
  return found;
}
