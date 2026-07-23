import type { Driver, RegistrationFormData, RegistrationResponse, Document } from '../../types/driver';
import { tokenManager } from '../auth/tokenManager';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011/api/v1';

const getHeaders = () => {
  const token = tokenManager.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const driverService = {
  async getProfile(driverId: string): Promise<Driver> {
    const response = await fetch(`${API_URL}/drivers/${driverId}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch driver profile');
    }

    return response.json();
  },

  async createOrUpdateDriver(data: Partial<Driver>): Promise<Driver> {
    const response = await fetch(`${API_URL}/drivers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create/update driver');
    }

    return response.json();
  },

  async submitRegistration(data: RegistrationFormData): Promise<RegistrationResponse> {
    const response = await fetch(`${API_URL}/drivers/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  },

  async updateStep(driverId: string, step: number, data: any): Promise<Driver> {
    const response = await fetch(`${API_URL}/drivers/${driverId}/steps/${step}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update step ${step}`);
    }

    return response.json();
  },

  async uploadDocument(driverId: string, file: File, documentType: string): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);

    const token = tokenManager.getToken();
    const response = await fetch(`${API_URL}/drivers/${driverId}/documents`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Document upload failed');
    }

    return response.json();
  },

  async deleteDocument(driverId: string, documentId: string): Promise<void> {
    const response = await fetch(`${API_URL}/drivers/${driverId}/documents/${documentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  },

  async getDocuments(driverId: string): Promise<Document[]> {
    const response = await fetch(`${API_URL}/drivers/${driverId}/documents`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  },

  async getRegistrationStatus(driverId: string): Promise<{
    step: number;
    status: string;
    completedSteps: number[];
  }> {
    const response = await fetch(`${API_URL}/drivers/${driverId}/registration-status`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch registration status');
    }

    return response.json();
  },

  async withdrawApplication(driverId: string, reason: string): Promise<void> {
    const response = await fetch(`${API_URL}/drivers/${driverId}/withdraw`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to withdraw application');
    }
  },
};
