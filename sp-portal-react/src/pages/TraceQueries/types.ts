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
