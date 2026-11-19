'use client';
import { useState } from 'react';
import type { ServiceRequest, Status } from '@/types/api';
import { statusLabel } from '@/lib/requests';
export function StatusActions({ row, disabled, submit }: { row: ServiceRequest; disabled: boolean; submit: (status: Status, remark: string) => Promise<boolean> }) {
  const [remark, setRemark] = useState('');
  const next: Status | null = row.status === 'OPEN' ? 'IN_PROGRESS' : row.status === 'IN_PROGRESS' ? 'RESOLVED' : null;
  if (!next) return <section className="panel"><h2>Request resolved</h2><p>No further status changes are available.</p></section>;
  return <form className="panel" onSubmit={async e => { e.preventDefault(); if (await submit(next, remark)) setRemark(''); }}>
    <h2>Update status</h2><p className="muted">Using version {row.version}. Every successful change is recorded.</p>
    <label>Remark (optional)<textarea value={remark} maxLength={500} onChange={e => setRemark(e.target.value)} /></label>
    <button disabled={disabled}>Mark {statusLabel(next).toLowerCase()}</button>
  </form>;
}
