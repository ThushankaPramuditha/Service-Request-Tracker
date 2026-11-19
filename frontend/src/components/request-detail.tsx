'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { History, ServiceRequest, Status } from '@/types/api';
import { ApiError } from '@/lib/api';
import { changeStatus, getHistory, getRequest, statusLabel } from '@/lib/requests';
import { ErrorNotice } from './api-error';
import { StatusActions } from './status-actions';
import { StatusHistory } from './status-history';
export function RequestDetail({ id }: { id: string }) {
  const [row, setRow] = useState<ServiceRequest | null>(null); const [history, setHistory] = useState<History[]>([]);
  const [error, setError] = useState<unknown>(null); const [notice, setNotice] = useState(''); const [fresh, setFresh] = useState(false); const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const initial = new AbortController(); controller.current = initial;
    Promise.all([getRequest(id, initial.signal), getHistory(id, initial.signal)]).then(([request, entries]) => {
      if (!initial.signal.aborted) { setRow(request.data); setHistory(entries.data); setFresh(true); }
    }).catch(e => { if (!initial.signal.aborted) setError(e); });
    return () => { controller.current?.abort(); };
  }, [id]);
  async function reload() {
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    setFresh(false); setError(null);
    try { const [request, entries] = await Promise.all([getRequest(id, current.signal), getHistory(id, current.signal)]);
      if (!current.signal.aborted) { setRow(request.data); setHistory(entries.data); setFresh(true); }
    } catch (e) { if (!current.signal.aborted) setError(e); }
  }
  async function submit(status: Status, remark: string) {
    if (!row || !fresh || pending) return false;
    setPending(true); setError(null); setNotice(''); let succeeded = false;
    try { await changeStatus(id, { status, expected_version: row.version, remark }); succeeded = true; setNotice('Status updated and recorded.'); await reload(); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 0 || e.status >= 500)) {
        setNotice(e.code === 'STALE_VERSION' ? 'This request changed in another tab. Latest details are loaded below when available. Review them and choose a new action. Your previous action was not replayed.' : `${e.message} Review the latest status and history before choosing another action. Your action has not been retried.`);
        await reload();
      } else { setError(e); }
    } finally { setPending(false); }
    return succeeded;
  }
  return <><Link href="/requests">All requests</Link><div className="toolbar"><h1>Request {row ? '#' + row.id : ''}</h1><button className="secondary" disabled={pending} onClick={() => void reload()}>Refresh details</button></div>
    {notice && <p className="notice" role="status">{notice}</p>}<ErrorNotice error={error} showFields />
    {!row && !error && <p role="status">Loading request…</p>}
    {row && <><section className="panel"><h2 className="text">{row.title}</h2><p><span className="badge">{statusLabel(row.status)}</span>{statusLabel(row.priority)} priority</p><p className="text">{row.description}</p><div className="metadata"><strong>Version {row.version}</strong><span>Created {new Date(row.created_at).toLocaleString()}</span><span>Updated {new Date(row.updated_at).toLocaleString()}</span></div></section>
      {!fresh && <p role="status">Status actions are disabled until current details and history have loaded.</p>}
      <div className="columns"><StatusActions row={row} disabled={!fresh || pending} submit={submit} /><StatusHistory entries={history} /></div></>}
  </>;
}
