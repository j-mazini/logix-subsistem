import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  Query,
  QueryConstraint,
} from 'firebase/firestore';
import type { DocumentNotification, DocumentStatus } from './types';

const NOTIFICATIONS_COLLECTION = 'candidate_notifications';

/**
 * Create a notification when admin changes document status
 */
export async function createDocumentNotification(
  candidateId: string,
  driverId: string,
  documentType: string,
  documentLabel: string,
  status: DocumentStatus,
  adminFeedback?: string,
  approvedBy?: string,
) {
  try {
    const notification: Omit<DocumentNotification, 'id'> = {
      candidateId,
      driverId,
      documentType,
      documentLabel,
      status,
      adminFeedback,
      approvedBy,
      approvedAt: Date.now(),
      readBy: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await addDoc(
      collection(db, NOTIFICATIONS_COLLECTION),
      notification,
    );
    return { ...notification, id: docRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get all notifications for a driver
 */
export async function getDriverNotifications(driverId: string) {
  try {
    const constraints: QueryConstraint[] = [
      where('driverId', '==', driverId),
      orderBy('approvedAt', 'desc'),
    ];

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      ...constraints,
    ) as Query<DocumentNotification>;

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as DocumentNotification));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get notifications for a specific candidate
 */
export async function getCandidateNotifications(candidateId: string) {
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('candidateId', '==', candidateId),
      orderBy('approvedAt', 'desc'),
    ) as Query<DocumentNotification>;

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    } as DocumentNotification));
  } catch (error) {
    console.error('Error fetching candidate notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, {
      readBy: true,
      readAt: Date.now(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Get summary of notifications for driver dashboard
 */
export async function getNotificationSummary(driverId: string) {
  try {
    const notifications = await getDriverNotifications(driverId);

    const summary = {
      total: notifications.length,
      approved: notifications.filter((n) => n.status === 'approved').length,
      rejected: notifications.filter((n) => n.status === 'rejected').length,
      pending: notifications.filter(
        (n) => n.status === 'pending' || n.status === 'pending-review',
      ).length,
      unread: notifications.filter((n) => !n.readBy).length,
      lastUpdated: notifications[0]?.approvedAt || Date.now(),
    };

    return summary;
  } catch (error) {
    console.error('Error fetching notification summary:', error);
    return {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      unread: 0,
      lastUpdated: Date.now(),
    };
  }
}
