/**
 * Integration point for admin checklist
 * Called when admin changes document status
 */

import { createDocumentNotification } from './service';
import type { DocumentStatus } from './types';

// Map docKey to user-friendly document labels
const DOCUMENT_LABELS: Record<string, string> = {
  rtw_doc: 'Right to Work Details',
  dvla_doc: 'Driving Licence Details',
  nin_doc: 'National Insurance Number',
  dbs_doc: 'DBS Check',
  address_doc: 'Address Verification',
  insurance_doc: 'Insurance Documents',
};

/**
 * Notify driver when admin updates document status
 */
export async function notifyDriverOnStatusChange(
  candidateId: string,
  driverId: string,
  docKey: string,
  documentStatus: string, // from __documentStatus field
  adminName: string = 'Admin Team',
) {
  try {
    // Map document status to notification status
    let notificationStatus: DocumentStatus = 'pending-review';

    if (documentStatus === 'Verified original' || documentStatus === 'Received') {
      notificationStatus = 'approved';
    } else if (
      documentStatus === 'Rejected / replace required' ||
      documentStatus === 'Rejected'
    ) {
      notificationStatus = 'rejected';
    } else if (documentStatus === 'Pending') {
      notificationStatus = 'pending';
    } else if (documentStatus === 'Not requested') {
      notificationStatus = 'pending-review';
    }

    const label = DOCUMENT_LABELS[docKey] || docKey;

    await createDocumentNotification(
      candidateId,
      driverId,
      docKey,
      label,
      notificationStatus,
      undefined, // Admin feedback can be added via CaseRegistrationPanel
      adminName,
    );
  } catch (error) {
    console.error('Failed to notify driver:', error);
    // Don't throw - notification failure shouldn't block the admin workflow
  }
}

/**
 * Notify driver with specific feedback message
 */
export async function notifyDriverWithFeedback(
  candidateId: string,
  driverId: string,
  docKey: string,
  status: DocumentStatus,
  feedback: string,
  adminName: string = 'Admin Team',
) {
  try {
    const label = DOCUMENT_LABELS[docKey] || docKey;

    await createDocumentNotification(
      candidateId,
      driverId,
      docKey,
      label,
      status,
      feedback,
      adminName,
    );
  } catch (error) {
    console.error('Failed to notify driver with feedback:', error);
  }
}
