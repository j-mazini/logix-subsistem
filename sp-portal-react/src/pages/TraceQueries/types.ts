export interface DuplicateStopScan {
  timestamp: string;
  location: string;
  vehicleId?: string;
}

export type DuplicateStopReviewStatus = 'pending' | 'approved' | 'reproved';

export interface DuplicateStopReport {
  id: string;
  packageId: string;
  stopAddress: string;
  postcode: string;
  customer: string;
  driverUserId: number;
  driverName: string;
  firstScan: DuplicateStopScan;
  secondScan: DuplicateStopScan;
  minutesBetween: number;
  dhlReportedAt: string;
  status: DuplicateStopReviewStatus;
  reviewNote?: string;
  reviewedAt?: string;
  deductionRefNumber?: string;
}

/* ==================== DHL Case resolution workflow ==================== */

export type TraceQueryCaseType =
  | 'wrong_delivery_location'
  | 'missing_parcel'
  | 'damaged_parcel'
  | 'delivery_not_attempted'
  | 'other';

export const CASE_TYPE_LABEL: Record<TraceQueryCaseType, string> = {
  wrong_delivery_location: 'Wrong Delivery Location',
  missing_parcel: 'Missing Parcel',
  damaged_parcel: 'Damaged Parcel',
  delivery_not_attempted: 'Delivery Not Attempted',
  other: 'Other',
};

/**
 * new — reported by DHL, admin hasn't reviewed/sent it yet. The case is
 *   already linked to the route driver (see TraceQueryCase.driverUserId) —
 *   "new" only gates whether the driver can see it, not who it belongs to.
 * assigned — admin sent it to the linked driver; the 3-day resolution
 *   window is running (see caseDeadlineAlerts.ts, computed from assignedAt).
 * closed — the driver submitted their resolution (notes + photos + a
 *   resolved/not_resolved outcome); this is the only way a case closes.
 */
export type TraceQueryCaseStatus = 'new' | 'assigned' | 'closed';

export type TraceQueryCaseOutcome = 'resolved' | 'not_resolved';

export interface TraceQueryUpdateEntry {
  id: string;
  authorType: 'admin' | 'driver';
  authorName: string;
  note: string;
  /** Data URLs (FileReader.readAsDataURL), same convention as Profile.tsx's avatar upload. */
  photos: string[];
  createdAt: string;
  /** Present only on the driver's closing entry. */
  outcome?: TraceQueryCaseOutcome;
}

export interface TraceQueryCase {
  id: string;
  caseType: TraceQueryCaseType;
  dhlDescription: string;
  packageId: string;
  stopAddress: string;
  postcode: string;
  customer: string;
  /** £ value at stake — becomes the Liquidation Damage deduction amount if closed unresolved. */
  caseValue: number;
  dhlReportedAt: string;

  status: TraceQueryCaseStatus;

  /** The route that ran this delivery — established at case creation, not chosen by the admin. */
  routeName: string;
  /** The driver who ran that route — the actual link this case is about, known from the moment DHL reports the incident. */
  driverUserId: number;
  driverName: string;
  /** Set once the admin reviews the case and sends it to the (already-linked) driver; the 3-day resolution deadline is assignedAt + 72h. */
  assignedAt?: string;
  assignmentNote?: string;

  updates: TraceQueryUpdateEntry[];

  closedAt?: string;
  outcome?: TraceQueryCaseOutcome;

  feedback?: string;
  feedbackAt?: string;
  pdfGeneratedAt?: string;

  /** Set only when outcome === 'not_resolved' — ref number of the generated Liquidation Damage deduction. */
  deductionRefNumber?: string;
}
