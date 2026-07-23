import React, { createContext, useState, useCallback, useEffect } from 'react';
import type { User, AuthContextType, GoogleAuthResponse } from '../types/auth';
import { googleOAuthService } from '../services/auth/googleOAuth';
import { tokenManager } from '../services/auth/tokenManager';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = tokenManager.getToken();
      const storedUser = tokenManager.getUser();

      if (storedToken && !tokenManager.isTokenExpired()) {
        setToken(storedToken);
        setUser(storedUser);
      } else if (storedToken && tokenManager.isTokenExpired()) {
        try {
          googleOAuthService.refreshAccessToken().then((newToken) => {
            setToken(newToken);
            const refreshedUser = tokenManager.getUser();
            setUser(refreshedUser);
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          tokenManager.clearAll();
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const loginWithGoogle = useCallback(async (response: GoogleAuthResponse) => {
    setIsLoading(true);
    try {
      const user = await googleOAuthService.handleGoogleLogin(response);
      const storedToken = tokenManager.getToken();
      setToken(storedToken);
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011/api/v1';

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();

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
      setToken(data.accessToken);
      setUser(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await googleOAuthService.logout();
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      tokenManager.saveUser(updatedUser);
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!token && !!user,
    token,
    loginWithGoogle,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
