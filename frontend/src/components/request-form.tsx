'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { createRequest } from '@/lib/requests';
import type { Priority } from '@/types/api';
import { ErrorNotice } from './api-error';
export function RequestForm() {
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  function field(name: string) {
    if (!(error instanceof ApiError) || !error.errors[name]) return null;
    return <span className="field-error">{error.errors[name].join(' ')}</span>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const result = await createRequest({
        title: String(data.get('title')),
        description: String(data.get('description')),
        priority: data.get('priority') as Priority,
      });
      router.push('/requests/' + result.data.id);
    } catch (error) {
      setError(error);
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) {
        setUncertain(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <label>
        Title
        <input name="title" required minLength={3} maxLength={100} />
        {field('title')}
      </label>
      <label>
        Description
        <textarea name="description" required minLength={10} maxLength={500} />
        {field('description')}
      </label>
      <label>
        Priority
        <select name="priority" defaultValue="MEDIUM">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        {field('priority')}
      </label>
      <ErrorNotice error={error} />
      {uncertain && (
        <p role="alert">
          The result is uncertain. <Link href="/requests">Check your requests</Link> before creating
          another, to avoid a duplicate.
        </p>
      )}
      <div className="actions">
        <button disabled={pending || uncertain}>{pending ? 'Creating…' : 'Create request'}</button>
        <Link href="/requests">Cancel</Link>
      </div>
    </form>
  );
}
