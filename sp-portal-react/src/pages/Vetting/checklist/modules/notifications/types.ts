/**
 * Notification system for admin-driver communication
 * Tracks document approval status and admin feedback
 */

export type DocumentStatus = 'approved' | 'rejected' | 'pending' | 'pending-review';

export interface DocumentNotification {
  id: string;
  candidateId: string;
  driverId: string;
  documentType: string; // 'rtw_doc', 'dvla_doc', 'nin_doc', etc.
  documentLabel: string; // 'Right to Work', 'Driving Licence', etc.
  status: DocumentStatus;
  adminFeedback?: string; // Reason for rejection or specific notes
  approvedBy?: string; // Admin name/email
  approvedAt: number; // Timestamp
  readBy?: boolean;
  readAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CandidateNotificationSummary {
  candidateId: string;
  candidateName: string;
  totalDocuments: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  unreadCount: number;
  lastUpdated: number;
}
