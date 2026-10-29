'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, tokenStore } from './api';
import type { Role, User } from './types';

interface AuthState { user: User | null; loading: boolean; login: (email: string, password: string) => Promise<User>; logout: () => void }
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    api<User>('/auth/me').then((r) => setUser(r.data)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
    tokenStore.set(r.data.token);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(() => {
    api('/auth/logout', { method: 'POST' }).catch(() => {});
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const homeFor = (role: Role) => (role === 'ADMIN' ? '/admin/tickets' : '/author/books');

/** Client-side route guard (the API enforces RBAC; this just routes users to the right place). */
export function useRequireRole(role: Role) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [user, loading, role, router]);
  return { user: user?.role === role ? user : null, loading };
}
