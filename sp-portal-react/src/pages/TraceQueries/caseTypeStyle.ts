import type { TraceQueryCaseType } from './types';

/**
 * Visual identity per DHL case type — shared between the admin tabs and the
 * driver's My Cases page so a "Damaged Parcel" badge means the same amber
 * icon everywhere, not just a color picked per-component.
 */
export interface CaseTypeStyle {
  icon: string;
  color: string;
  bg: string;
}

export const CASE_TYPE_STYLE: Record<TraceQueryCaseType, CaseTypeStyle> = {
  wrong_delivery_location: { icon: 'bi-signpost-split-fill', color: '#7c3aed', bg: '#ede9fe' },
  missing_parcel: { icon: 'bi-box-seam-fill', color: '#e11d48', bg: '#ffe4e6' },
  damaged_parcel: { icon: 'bi-exclamation-triangle-fill', color: '#d97706', bg: '#fef3c7' },
  delivery_not_attempted: { icon: 'bi-clock-history', color: '#475569', bg: '#e2e8f0' },
  other: { icon: 'bi-asterisk', color: '#0e7490', bg: '#cffafe' },
};
