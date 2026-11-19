'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ApiError, errorMessage } from '@/lib/api';
export default function Login() {
  const auth = useAuth(); const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  useEffect(() => { if (auth.user) router.replace('/requests'); }, [auth.user, router]);
  return <main className="login"><div className="brand">Service Request Tracker</div><section className="panel">
    <p className="eyebrow">WORKPLACE SUPPORT</p><h1>Sign in</h1><p>Keep track of your requests, from open to resolved.</p>
    <form onSubmit={async e => { e.preventDefault(); setPending(true); setError(''); try { await auth.login(email, password); setPassword(''); } catch (e) { setError(errorMessage(e) + (e instanceof ApiError ? ' ' + Object.values(e.errors).flat().join(' ') : '')); } finally { setPending(false); } }}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="error">{error}</p>}<button disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form></section></main>;
}
