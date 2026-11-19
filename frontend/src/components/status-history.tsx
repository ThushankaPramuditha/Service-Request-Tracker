import type { History } from '@/types/api';
import { statusLabel } from '@/lib/requests';
export function StatusHistory({ entries }: { entries: History[] }) {
  return <section className="panel"><h2>Status history</h2>{entries.length === 0 ? <p className="muted">No status changes yet.</p> : <ol className="history">{entries.map(item => <li key={item.id}>
    <strong>{statusLabel(item.from_status)} to {statusLabel(item.to_status)}</strong>
    <p className="muted">User #{item.actor_user_id} · <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></p>
    {item.remark && <p className="text">{item.remark}</p>}
  </li>)}</ol>}</section>;
}
