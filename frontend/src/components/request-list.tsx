'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listRequests, statusLabel } from '@/lib/requests';
import type { Page, ServiceRequest } from '@/types/api';
import { ErrorNotice } from './api-error';
import { Pagination } from './pagination';
export function RequestList({ query }: { query: string }) {
  const [result, setResult] = useState<Page<ServiceRequest> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    listRequests(query, controller.signal)
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e);
      });
    return () => controller.abort();
  }, [query, attempt]);
  if (error)
    return (
      <>
        <ErrorNotice error={error} />
        <button
          onClick={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        >
          Retry list
        </button>
      </>
    );
  if (!result) return <p role="status">Loading requests…</p>;
  return (
    <section className="panel">
      <p className="muted">
        {result.meta.total} request{result.meta.total !== 1 ? 's' : ''} found
      </p>
      {!result.data.length ? (
        <p>No requests match these filters.</p>
      ) : (
        <ul className="request-list">
          {result.data.map((row) => (
            <li key={row.id}>
              <Link href={'/requests/' + row.id}>{row.title}</Link>
              <p>
                <span className="badge">{statusLabel(row.status)}</span>
                <span className="muted">{statusLabel(row.priority)} priority</span>
              </p>
              <div className="metadata">
                <span>Request #{row.id}</span>
                <span>Version {row.version}</span>
                <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={result.meta.current_page} last={result.meta.last_page} query={query} />
    </section>
  );
}
