'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, api, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  quickLogin: (role: 'DEVELOPER' | 'VIEWER') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const stored = getStoredToken();
      if (!stored) {
        setUser(null);
        setToken(null);
        return;
      }
      setToken(stored);
      const res = await api.auth.me();
      setUser(res.user);
      setStoredUser(res.user);
    } catch (err) {
      console.warn('Session expired or unauthorized, clearing token');
      setStoredToken(null);
      setStoredUser(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial hydration from local storage
    const storedTok = getStoredToken();
    const storedUsr = getStoredUser();
    if (storedTok && storedUsr) {
      setToken(storedTok);
      setUser(storedUsr);
      setIsLoading(false);
      // Background verify
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      setToken(res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(name, email, password, role);
      setUser(res.user);
      setToken(res.accessToken);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: 'DEVELOPER' | 'VIEWER') => {
    setIsLoading(true);
    const roleLower = role.toLowerCase();
    const email = `${roleLower}@multicloud.local`;
    const capitalized = `${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()}`;
    const name = `${capitalized} Operator`;
    // Deterministic demo credentials: the quick-login convention first, then
    // the seed-script convention (e.g. "AdminPassword123!"), so persona
    // switching works whether or not the database was seeded.
    const candidatePasswords = [`${capitalized}Pass123!`, `${capitalized}Password123!`];
    const isBadCredentialError = (err: any) =>
      err?.status === 401 || err?.message?.includes('Invalid email or password');

    try {
      for (const password of candidatePasswords) {
        try {
          await login(email, password);
          return;
        } catch (loginErr: any) {
          if (!isBadCredentialError(loginErr)) throw loginErr;
          // try next candidate password
        }
      }
      // User does not exist yet — register with deterministic demo credentials
      await register(name, email, candidatePasswords[0], role);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        quickLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
