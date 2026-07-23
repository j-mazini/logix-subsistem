import { useSearchParams } from 'react-router-dom';

/**
 * Port of sp-header-identity.js's getCurrentSp(): the ?sp= query param wins
 * and is persisted to sessionStorage; otherwise falls back to whatever was
 * last stored. Same storage key as the static site so switching between the
 * legacy app and this SPA during rollout keeps the same "current SP".
 */
const SP_STORAGE_KEY = 'dhl_sp_portal_current_sp';

export function useCurrentSp(): string {
  const [searchParams] = useSearchParams();
  const spFromQuery = (searchParams.get('sp') || '').trim();

  if (spFromQuery) {
    try {
      sessionStorage.setItem(SP_STORAGE_KEY, spFromQuery);
    } catch {
      /* ignore */
    }
    return spFromQuery;
  }

  try {
    return sessionStorage.getItem(SP_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/** Port of appendSpToLinks(): decorate an internal href with ?sp= so it survives navigation. */
export function withSp(href: string, sp: string): string {
  if (!sp || href.includes('?')) return href;
  return `${href}?sp=${encodeURIComponent(sp)}`;
}

export function initialsFor(sp: string): string {
  return (sp || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
