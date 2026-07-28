/**
 * WorkforceService — fonte única do roster de pessoas da página Workforce.
 *
 * Antes desta camada o mesmo roster era lido de cinco sítios independentes
 * (aba Vendors, aba Compliance, AnnouncementsContext, contagem das abas e o
 * próprio módulo de dados) e as escritas viviam num `useState` dentro da aba
 * Vendors. Criar ou editar um vendor não chegava à aba Compliance nem ao
 * aviso de documentos do cabeçalho: cada consumidor tinha lido o mock uma vez
 * e nunca mais.
 *
 * Aqui o estado é um só e é observável. As escritas passam pelo serviço,
 * incrementam a versão e notificam toda a gente.
 *
 * Fora de alcance por decisão: a aba Vetting mantém o seu próprio store
 * (shims de firebase/firestore sobre localStorage, port fiel de outra app) e
 * continua a comunicar por evento — ver useVendorSync.
 */

import { getAllMockVendors, type Vendor } from '../data/vendorsData';
import type { UserProfile } from '../pages/Compliance/types/compliance';
import { vendorToProfile, vendorToVettingRecord } from './workforceMappers';
import type { VettingRecord } from '../pages/Compliance/types/compliance';

/** Reexportados para quem precisa de mapear sem passar pelo estado. */
export { vendorToProfile as toProfile, vendorToVettingRecord as toVettingRecord };

type Listener = () => void;

export interface WorkforceSnapshot {
  /** Sobe a cada mutação. Serve de chave de memoização aos consumidores. */
  version: number;
  /** Roster efectivo: mock, com as alterações locais por cima. */
  vendors: Vendor[];
}

const listeners = new Set<Listener>();

/** Alterações feitas na sessão, sobrepostas ao mock por id. */
const overrides = new Map<number, Vendor>();
/** Ids criados nesta sessão — só estes podem ser removidos. */
const locallyCreated = new Set<number>();
const deletedIds = new Set<number>();

let snapshot: WorkforceSnapshot = { version: 0, vendors: [] };
let seeded = false;

function computeVendors(): Vendor[] {
  const byId = new Map<number, Vendor>();
  for (const vendor of getAllMockVendors()) {
    byId.set(vendor.id, vendor);
  }
  for (const [id, vendor] of overrides) {
    byId.set(id, vendor);
  }
  for (const id of deletedIds) {
    byId.delete(id);
  }
  return Array.from(byId.values());
}

/**
 * O snapshot é reconstruído só aqui. `useSyncExternalStore` exige que
 * getSnapshot devolva sempre a mesma referência entre mutações — recalcular
 * a lista a cada leitura poria o React em ciclo infinito de re-render.
 */
function commit(): void {
  snapshot = { version: snapshot.version + 1, vendors: computeVendors() };
  listeners.forEach((listener) => listener());
}

/** O mock só existe depois de dhlMockData correr, daí a semeadura preguiçosa. */
function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  snapshot = { version: 1, vendors: computeVendors() };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): WorkforceSnapshot {
  ensureSeeded();
  return snapshot;
}

// ---------------------------------------------------------------- leituras

export function getVendors(sp?: string): Vendor[] {
  const { vendors } = getSnapshot();
  return sp ? vendors.filter((v) => v.serviceProvider === sp) : vendors;
}

export function getProfiles(sp?: string): UserProfile[] {
  return getVendors(sp).map(vendorToProfile);
}

export function getVettingRecords(sp?: string): VettingRecord[] {
  return getVendors(sp).map(vendorToVettingRecord);
}

/** Só os vendors criados nesta sessão podem ser removidos — o mock é a base. */
export function isLocallyCreated(id: number): boolean {
  return locallyCreated.has(id);
}

// ---------------------------------------------------------------- escritas

export type VendorDraft = Omit<Vendor, 'id'> & { id?: number };

export function createVendor(draft: VendorDraft): Vendor {
  const { vendors } = getSnapshot();
  const nextId = Math.max(0, ...vendors.map((v) => v.id), ...locallyCreated) + 1;
  const vendor = { ...draft, id: nextId } as Vendor;

  overrides.set(nextId, vendor);
  locallyCreated.add(nextId);
  commit();
  return vendor;
}

export function updateVendor(id: number, patch: Partial<Vendor>): void {
  const existing = getSnapshot().vendors.find((v) => v.id === id);
  if (!existing) return;

  overrides.set(id, { ...existing, ...patch, id });
  commit();
}

export function deleteVendor(id: number): void {
  if (!locallyCreated.has(id)) return;

  overrides.delete(id);
  locallyCreated.delete(id);
  deletedIds.add(id);
  commit();
}

/** Usado só pelos testes e pelo reset manual em desenvolvimento. */
export function resetWorkforce(): void {
  overrides.clear();
  locallyCreated.clear();
  deletedIds.clear();
  commit();
}
