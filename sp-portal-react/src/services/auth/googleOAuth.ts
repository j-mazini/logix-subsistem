import type { User, GoogleAuthResponse } from '../../types/auth';
import { tokenManager } from './tokenManager';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:3011/api/v1';

export const googleOAuthService = {
  async handleGoogleLogin(response: GoogleAuthResponse): Promise<User> {
    if (!response.credential) {
      throw new Error('Google login failed: no credential received');
    }

    try {
      const result = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: response.credential,
        }),
      });

      if (!result.ok) {
        const error = await result.json();
        throw new Error(error.message || 'Google login failed');
      }

      const data = await result.json();

      tokenManager.setToken(data.accessToken, data.expiresIn);
      if (data.refreshToken) {
        tokenManager.setRefreshToken(data.refreshToken);
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || 'driver',
        photoUrl: data.user.photoUrl,
        createdAt: new Date(data.user.createdAt),
        lastLogin: new Date(),
      };

      tokenManager.saveUser(user);
      return user;
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  },

  async refreshAccessToken(): Promise<string> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const result = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!result.ok) {
        tokenManager.clearAll();
        throw new Error('Token refresh failed');
      }

      const data = await result.json();
      tokenManager.setToken(data.accessToken, data.expiresIn);
      return data.accessToken;
    } catch (error) {
      tokenManager.clearAll();
      throw error;
    }
  },

  async logout(): Promise<void> {
    const token = tokenManager.getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    tokenManager.clearAll();
  },

  getGoogleClientId(): string {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is not configured');
    }
    return clientId;
  },
};
