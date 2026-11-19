'use client';
import { useRouter } from 'next/navigation';
export function RequestFilters({ query }: { query: string }) {
  const params = new URLSearchParams(query); const router = useRouter();
  return <form className="filters" onSubmit={e => {
    e.preventDefault(); const data = new FormData(e.currentTarget); const next = new URLSearchParams();
    for (const name of ['search', 'status', 'priority']) { const value = String(data.get(name) ?? '').trim(); if (value) next.set(name, value); }
    router.push('/requests?' + next.toString());
  }}>
    <label>Search title<input name="search" type="search" maxLength={100} defaultValue={params.get('search') ?? ''} placeholder="Find a request…" /></label>
    <label>Status<select name="status" defaultValue={params.get('status') ?? ''}><option value="">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select></label>
    <label>Priority<select name="priority" defaultValue={params.get('priority') ?? ''}><option value="">All priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label>
    <button>Search</button>
  </form>;
}
