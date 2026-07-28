import {
  DocumentType,
  ExpirationStatus,
  ExpiredDocumentAlert,
  UserProfile,
} from '../types/compliance';

const DAYS_WARNING_THRESHOLD = 30; // dias antes do vencimento para alertar

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `new Date('2025-10-10')` está especificado como meia-noite **UTC**. Ao ser
 * formatado ou comparado em hora local, qualquer utilizador a oeste de
 * Greenwich vê o dia anterior — era por isso que uma verificação de 10 Out
 * aparecia no perfil como 09 Out.
 *
 * As datas do portal (verificações, validades, formações) são datas de
 * calendário, não instantes: são lidas à meia-noite **local**. Strings com
 * hora (`toISOString()` em createdAt/lastUpdated) continuam a ser instantes.
 */
export function parsePortalDate(value: string): Date {
  return DATE_ONLY_PATTERN.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getExpirationStatus(expiresAt?: string): ExpirationStatus {
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);
  if (daysUntilExpiry === null) return 'ok';

  if (daysUntilExpiry < 0) {
    return 'expired';
  }

  if (daysUntilExpiry <= DAYS_WARNING_THRESHOLD) {
    return 'expiring-soon';
  }

  return 'ok';
}

export function getExpirationBadge(status: ExpirationStatus) {
  switch (status) {
    case 'ok':
      return { label: '✓ Valid', className: 'badge-success', icon: 'check-circle-fill' };
    case 'expiring-soon':
      return { label: '⚠ Expiring Soon', className: 'badge-warning', icon: 'exclamation-circle-fill' };
    case 'expired':
      return { label: '✕ Expired', className: 'badge-danger', icon: 'x-circle-fill' };
  }
}

export function getExpiredDocumentAlerts(profiles: UserProfile[]): ExpiredDocumentAlert[] {
  const alerts: ExpiredDocumentAlert[] = [];

  for (const profile of profiles) {
    const expiredOrExpiringDocs = profile.documents.filter((doc) => {
      const status = getExpirationStatus(doc.expiresAt);
      return status === 'expired' || status === 'expiring-soon';
    });

    if (expiredOrExpiringDocs.length > 0) {
      alerts.push({
        profileId: profile.id,
        profileName: profile.name,
        email: profile.email,
        documents: expiredOrExpiringDocs.map((doc) => ({
          name: doc.name,
          type: doc.type,
          expiresAt: doc.expiresAt,
          status: getExpirationStatus(doc.expiresAt),
        })),
      });
    }
  }

  return alerts;
}

/**
 * Horizonte da contagem regressiva no cabeçalho.
 *
 * Deliberadamente maior que DAYS_WARNING_THRESHOLD: o limiar de 30 dias
 * decide quando um documento passa a "expiring soon" (o badge vermelho/âmbar
 * na página Compliance) e essa semântica fica como está. A contagem existe
 * para dar antecedência — renovar um DBS ou um passaporte leva semanas, por
 * isso o aviso tem de aparecer antes de o documento entrar em risco.
 */
const COUNTDOWN_HORIZON_DAYS = 60;

export interface DocumentExpiryEntry {
  profileId: string;
  profileName: string;
  email: string;
  documentName: string;
  type: DocumentType;
  expiresAt: string;
  /** Dias inteiros até vencer. Negativo = já vencido há esses dias. */
  daysRemaining: number;
}

/**
 * Uma linha por documento vencido ou a vencer dentro do horizonte, ordenada
 * do pior para o melhor.
 *
 * Uma linha por documento (e não por perfil, como getExpiredDocumentAlerts):
 * agrupar por vendor esconderia o documento mais crítico dentro do cartão de
 * alguém a meio da lista. Aqui o que está pior aparece primeiro e o vendor é
 * a etiqueta da linha.
 */
export function getDocumentExpiryEntries(
  profiles: UserProfile[],
  horizonDays: number = COUNTDOWN_HORIZON_DAYS,
): DocumentExpiryEntry[] {
  const entries: DocumentExpiryEntry[] = [];

  for (const profile of profiles) {
    for (const doc of profile.documents) {
      if (!doc.expiresAt) continue;

      const daysRemaining = getDaysUntilExpiry(doc.expiresAt);
      if (daysRemaining === null || daysRemaining > horizonDays) continue;

      entries.push({
        profileId: profile.id,
        profileName: profile.name,
        email: profile.email,
        documentName: doc.name,
        type: doc.type,
        expiresAt: doc.expiresAt,
        daysRemaining,
      });
    }
  }

  return entries.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * O documento por vencer mais próximo — o alvo da contagem regressiva.
 *
 * Só documentos ainda válidos: um já vencido não é uma contagem regressiva,
 * é um alerta.
 */
export function getNextExpiry(entries: DocumentExpiryEntry[]): DocumentExpiryEntry | null {
  return entries.find((entry) => entry.daysRemaining >= 0) ?? null;
}

export function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;

  // Dia a dia, não instante a instante: um documento que expira hoje contava
  // como -1 dia (logo, "expired") a partir do primeiro minuto da manhã.
  // `round` em vez de `floor` porque um dia com mudança de hora tem 23 ou 25.
  const expiryDate = startOfDay(parsePortalDate(expiresAt));
  const today = startOfDay(new Date());
  return Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatExpiryDate(expiresAt?: string): string {
  if (!expiresAt) return 'No expiry date';

  return parsePortalDate(expiresAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
