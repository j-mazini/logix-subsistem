const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string, expiresIn: number = 3600): void => {
    localStorage.setItem(TOKEN_KEY, token);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    localStorage.setItem('tokenExpiresAt', expiresAt.toISOString());
  },

  clearToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('tokenExpiresAt');
  },

  isTokenExpired: (): boolean => {
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  clearRefreshToken: (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  saveUser: (user: any): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: (): any => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  clearUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },

  clearAll: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('tokenExpiresAt');
  },
};
