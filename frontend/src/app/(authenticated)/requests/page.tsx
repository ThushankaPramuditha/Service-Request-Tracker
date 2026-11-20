'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RequestFilters } from '@/components/request-filters';
import { RequestList } from '@/components/request-list';
function RequestsContent() {
  const query = useSearchParams().toString();
  return (
    <>
      <div className="toolbar">
        <div>
          <p className="eyebrow">WORKPLACE SUPPORT</p>
          <h1>Your requests</h1>
          <p className="muted">Track progress and keep a clear record of each change.</p>
        </div>
        <Link className="button" href="/requests/new">
          New request
        </Link>
      </div>
      <RequestFilters key={'filters-' + query} query={query} />
      <RequestList key={query} query={query} />
    </>
  );
}
export default function Requests() {
  return (
    <Suspense fallback={<p>Loading filters…</p>}>
      <RequestsContent />
    </Suspense>
  );
}
