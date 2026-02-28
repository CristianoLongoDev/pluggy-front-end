import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getStoredTokens,
  isTokenExpired,
  refreshAccessToken,
} from '@/lib/tokenStorage';

const API_BASE = 'https://pluggyapi.pluggerbi.com';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  account_id?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    let token = getAccessToken();
    if (!token) return null;

    if (isTokenExpired()) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null;
      token = getAccessToken();
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) return null;

        const retryRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        if (!retryRes.ok) return null;
        return await retryRes.json();
      }

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const tokens = getStoredTokens();
      if (!tokens) {
        setLoading(false);
        return;
      }

      const me = await fetchMe();
      if (me) {
        const userData = me.user ?? me;
        setUser(userData);
      } else {
        clearTokens();
      }
      setLoading(false);
    };

    init();
  }, [fetchMe]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          body.message || body.error || body.msg || 'Email ou senha incorretos';
        return { error: { message } };
      }

      const data = await res.json();
      saveTokens(data.access_token, data.refresh_token, data.expires_in);

      const userData = data.user ?? (await fetchMe());
      if (userData) {
        const u = userData.user ?? userData;
        setUser(u);
      }

      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Erro de conexão com o servidor' } };
    }
  };

  const signOut = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {});
      }
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile: user,
    loading,
    signIn,
    signOut,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
