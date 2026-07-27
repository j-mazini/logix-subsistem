import { ExpirationStatus, ExpiredDocumentAlert, UserProfile } from '../types/compliance';

const DAYS_WARNING_THRESHOLD = 30; // dias antes do vencimento para alertar

export function getExpirationStatus(expiresAt?: string): ExpirationStatus {
  if (!expiresAt) return 'ok';

  const expiryDate = new Date(expiresAt);
  const today = new Date();
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

export function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;

  const expiryDate = new Date(expiresAt);
  const today = new Date();
  return Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatExpiryDate(expiresAt?: string): string {
  if (!expiresAt) return 'No expiry date';

  return new Date(expiresAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
