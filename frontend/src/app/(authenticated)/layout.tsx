'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ApiError, csrf, errorMessage } from '@/lib/api';
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  useEffect(() => {
    if (!auth.loading && !auth.error && !auth.user) router.replace('/login');
  }, [auth.loading, auth.error, auth.user, router]);

  async function handleLogout() {
    setPending(true);
    setError('');

    try {
      await auth.logout();
    } catch (error) {
      setError(errorMessage(error));
      setTokenError(error instanceof ApiError && error.status === 419);
    } finally {
      setPending(false);
    }
  }

  async function refreshSecurityToken() {
    try {
      await csrf();
      setTokenError(false);
      setError('Security token refreshed. You may sign out again.');
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  if (auth.loading)
    return (
      <main>
        <p role="status">Checking your session…</p>
      </main>
    );
  if (auth.error)
    return (
      <main>
        <p role="alert">{auth.error}</p>
        <button onClick={() => void auth.refresh()}>Retry connection</button>
      </main>
    );
  if (!auth.user)
    return (
      <main>
        <p>Opening sign in…</p>
      </main>
    );
  return (
    <>
      <header>
        <Link className="brand" href="/requests">
          Service Request Tracker
        </Link>
        <div>
          {auth.user.name}
          <button className="secondary" disabled={pending} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>
      {error && (
        <div className="notice" role="alert">
          {error}
          {tokenError && (
            <button onClick={refreshSecurityToken}>Reinitialize security token</button>
          )}
        </div>
      )}
      <main key={auth.user.id}>{children}</main>
    </>
  );
}
