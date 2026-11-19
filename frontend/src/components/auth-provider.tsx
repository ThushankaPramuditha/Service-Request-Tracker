'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, ApiError, csrf, errorMessage } from '@/lib/api';
import type { Data, User } from '@/types/api';

type Auth = { user: User | null; loading: boolean; error: string; refresh: () => Promise<void>; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> };
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const identityRequest = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    identityRequest.current?.abort();
    const current = new AbortController(); identityRequest.current = current;
    setLoading(true); setError('');
    try { const result = await api<Data<User>>('/api/auth/me', { signal: current.signal }); if (!current.signal.aborted) setUser(result.data); }
    catch (e) { if (!current.signal.aborted) { if (e instanceof ApiError && e.status === 401) setUser(null); else setError(errorMessage(e)); } }
    finally { if (!current.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const expired = () => { identityRequest.current?.abort(); setUser(null); setLoading(false); };
    window.addEventListener('auth-expired', expired);
    // Initial state is already loading; state changes occur after the request settles.
    const initial = new AbortController(); identityRequest.current = initial;
    api<Data<User>>('/api/auth/me', { signal: initial.signal }).then(result => { if (!initial.signal.aborted) setUser(result.data); })
      .catch(e => { if (!initial.signal.aborted && !(e instanceof ApiError && e.status === 401)) setError(errorMessage(e)); })
      .finally(() => { if (!initial.signal.aborted) setLoading(false); });
    return () => { identityRequest.current?.abort(); window.removeEventListener('auth-expired', expired); };
  }, [refresh]);
  async function login(email: string, password: string) {
    identityRequest.current?.abort(); setLoading(false);
    await csrf();
    const result = await api<Data<User>>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setUser(result.data); setError('');
  }
  async function logout() {
    identityRequest.current?.abort();
    try { await api<void>('/api/auth/logout', { method: 'POST' }); }
    catch (e) { if (!(e instanceof ApiError && e.status === 401)) throw e; }
    setUser(null);
  }
  return <Context.Provider value={{ user, loading, error, refresh, login, logout }}>{children}</Context.Provider>;
}
export function useAuth() { const auth = useContext(Context); if (!auth) throw new Error('AuthProvider required'); return auth; }
