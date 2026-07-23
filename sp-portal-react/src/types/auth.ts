export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'vetting_officer' | 'driver' | 'guest';
  photoUrl?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  loginWithGoogle: (response: any) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export interface GoogleAuthResponse {
  credential?: string;
  clientId?: string;
}
