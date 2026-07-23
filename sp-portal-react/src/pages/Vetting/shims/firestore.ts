// Local Firestore shim — emulates the small firebase/firestore API surface the
// vetting admin pages use, persisting everything to localStorage instead of a
// real database. No network, no auth. Multi-tab aware via the 'storage' event.

export type DocumentData = Record<string, any>;

const STORAGE_KEY = 'vetting-local-db';

export class Timestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toDate(): Date {
    return new Date(this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6));
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  static now(): Timestamp {
    const ms = Date.now();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
}

export interface CollectionReference<T = DocumentData> {
  readonly type: 'collection';
  readonly path: string;
  readonly __t?: T;
}

export interface DocumentReference<T = DocumentData> {
  readonly type: 'document';
  readonly path: string;
  readonly parent: string;
  readonly id: string;
  readonly __t?: T;
}

export interface DocumentSnapshot {
  readonly id: string;
  readonly ref: DocumentReference;
  exists(): boolean;
  data(): DocumentData | undefined;
}

export interface QueryDocumentSnapshot {
  readonly id: string;
  data(): DocumentData;
}

export interface QuerySnapshot {
  readonly docs: QueryDocumentSnapshot[];
  readonly size: number;
  readonly empty: boolean;
  forEach(cb: (doc: QueryDocumentSnapshot) => void): void;
}

type Store = Record<string, Record<string, DocumentData>>;

let store: Store | null = null;
const listeners = new Set<() => void>();

// Anything shaped like { seconds, nanoseconds } becomes a Timestamp again
// after a JSON round-trip, so `.toDate()` keeps working across reloads.
function revive(value: any): any {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (
      keys.length === 2 &&
      typeof value.seconds === 'number' &&
      typeof value.nanoseconds === 'number'
    ) {
      return new Timestamp(value.seconds, value.nanoseconds);
    }
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = revive(value[k]);
    return out;
  }
  return value;
}

function seed(): Store {
  const day = 86_400_000;
  const now = Date.now();
  return {
    drivers: {
      'seed-amelia-clarke': {
        personalInfo: {
          fullName: 'Amelia Clarke',
          email: 'amelia.clarke@example.com',
          phone: '07700 900123',
        },
        currentStatus: 'PRE_REGISTERED',
        createdAt: now - 2 * day,
        updatedAt: now - 2 * day,
      },
      'seed-daniel-osei': {
        personalInfo: {
          fullName: 'Daniel Osei',
          email: 'daniel.osei@example.com',
          phone: '07700 900456',
        },
        currentStatus: 'INTERVIEW_SCHEDULED',
        createdAt: now - 9 * day,
        statusUpdatedAt: now - 6 * day,
        updatedAt: now - 6 * day,
      },
      'seed-priya-nair': {
        personalInfo: {
          fullName: 'Priya Nair',
          email: 'priya.nair@example.com',
          phone: '07700 900789',
        },
        currentStatus: 'ACTIVE',
        createdAt: now - 30 * day,
        statusUpdatedAt: now - 3 * day,
        updatedAt: now - 3 * day,
      },
    },
  };
}

function load(): Store {
  if (store) return store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      store = revive(JSON.parse(raw)) as Store;
      return store;
    }
  } catch {
    // corrupted storage — fall through to reseed
  }
  store = seed();
  persist();
  return store;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full/unavailable — keep working in memory
  }
}

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      store = null;
      emit();
    }
  });
}

export function collection(_db: unknown, ...segments: string[]): CollectionReference {
  return { type: 'collection', path: segments.join('/') };
}

export function doc(_db: unknown, ...segments: string[]): DocumentReference {
  const id = segments[segments.length - 1];
  return {
    type: 'document',
    id,
    parent: segments.slice(0, -1).join('/'),
    path: segments.join('/'),
  };
}

function snapCollection(path: string): QuerySnapshot {
  const col = load()[path] ?? {};
  const docs: QueryDocumentSnapshot[] = Object.entries(col).map(([id, data]) => ({
    id,
    data: () => data,
  }));
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (cb) => docs.forEach(cb),
  };
}

function snapDoc(ref: DocumentReference): DocumentSnapshot {
  const data = load()[ref.parent]?.[ref.id];
  return {
    id: ref.id,
    ref,
    exists: () => data !== undefined,
    data: () => data,
  };
}

export function onSnapshot(
  ref: CollectionReference,
  next: (snap: QuerySnapshot) => void,
  error?: (err: Error) => void,
): () => void;
export function onSnapshot(
  ref: DocumentReference,
  next: (snap: DocumentSnapshot) => void,
  error?: (err: Error) => void,
): () => void;
export function onSnapshot(
  ref: CollectionReference | DocumentReference,
  next: (snap: any) => void,
  _error?: (err: Error) => void,
): () => void {
  const listener = () => {
    next(ref.type === 'collection' ? snapCollection(ref.path) : snapDoc(ref as DocumentReference));
  };
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

function deepMerge(target: Record<string, any>, patch: Record<string, any>) {
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Timestamp) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

// Firestore updateDoc supports dotted field paths ("a.b.c").
function applyFieldPath(target: Record<string, any>, path: string, value: any) {
  const parts = path.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

export async function setDoc(
  ref: DocumentReference,
  data: DocumentData,
  options?: { merge?: boolean },
): Promise<void> {
  const s = load();
  if (!s[ref.parent]) s[ref.parent] = {};
  if (options?.merge && s[ref.parent][ref.id]) {
    deepMerge(s[ref.parent][ref.id], data);
  } else {
    s[ref.parent][ref.id] = { ...data };
  }
  persist();
  emit();
}

export async function updateDoc(ref: DocumentReference, patch: DocumentData): Promise<void> {
  const s = load();
  const existing = s[ref.parent]?.[ref.id];
  if (!existing) throw new Error(`No document to update: ${ref.path}`);
  for (const [key, value] of Object.entries(patch)) {
    if (key.includes('.')) applyFieldPath(existing, key, value);
    else existing[key] = value;
  }
  persist();
  emit();
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  const s = load();
  if (s[ref.parent]) {
    delete s[ref.parent][ref.id];
    persist();
    emit();
  }
}

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  return snapDoc(ref);
}

export async function addDoc(
  ref: CollectionReference,
  data: DocumentData,
): Promise<DocumentReference> {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const s = load();
  if (!s[ref.path]) s[ref.path] = {};
  s[ref.path][id] = { ...data };
  persist();
  emit();
  return doc(null, ...ref.path.split('/'), id);
}

export function serverTimestamp(): Timestamp {
  return Timestamp.now();
}
