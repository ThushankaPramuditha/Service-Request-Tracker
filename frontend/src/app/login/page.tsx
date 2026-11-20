'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ApiError, errorMessage } from '@/lib/api';
export default function Login() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (auth.user) router.replace('/requests');
  }, [auth.user, router]);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');

    try {
      await auth.login(email, password);
      setPassword('');
    } catch (error) {
      const fieldErrors = error instanceof ApiError ? Object.values(error.errors).flat() : [];
      setError([errorMessage(error), ...fieldErrors].join(' '));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="login">
      <div className="brand">Service Request Tracker</div>
      <section className="panel">
        <p className="eyebrow">WORKPLACE SUPPORT</p>
        <h1>Sign in</h1>
        <p>Keep track of your requests, from open to resolved.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  );
}
