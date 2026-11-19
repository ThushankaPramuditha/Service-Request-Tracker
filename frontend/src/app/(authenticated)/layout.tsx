'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ApiError, csrf, errorMessage } from '@/lib/api';
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth(); const router = useRouter(); const [error, setError] = useState(''); const [pending, setPending] = useState(false); const [tokenError, setTokenError] = useState(false);
  useEffect(() => { if (!auth.loading && !auth.error && !auth.user) router.replace('/login'); }, [auth.loading, auth.error, auth.user, router]);
  if (auth.loading) return <main><p role="status">Checking your session…</p></main>;
  if (auth.error) return <main><p role="alert">{auth.error}</p><button onClick={() => void auth.refresh()}>Retry connection</button></main>;
  if (!auth.user) return <main><p>Opening sign in…</p></main>;
  return <><header><Link className="brand" href="/requests">Service Request Tracker</Link><div>{auth.user.name}<button className="secondary" disabled={pending} onClick={async () => { setPending(true); setError(''); try { await auth.logout(); } catch (e) { setError(errorMessage(e)); setTokenError(e instanceof ApiError && e.status === 419); } finally { setPending(false); } }}>Sign out</button></div></header>
    {error && <div className="notice" role="alert">{error}{tokenError && <button onClick={async () => { try { await csrf(); setTokenError(false); setError('Security token refreshed. You may sign out again.'); } catch (e) { setError(errorMessage(e)); } }}>Reinitialize security token</button>}</div>}
    <main key={auth.user.id}>{children}</main></>;
}
