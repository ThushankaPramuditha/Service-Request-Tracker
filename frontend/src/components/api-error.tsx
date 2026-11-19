'use client';
import { useState } from 'react';
import { ApiError, csrf, errorMessage } from '@/lib/api';
export function ErrorNotice({ error, showFields = false }: { error: unknown; showFields?: boolean }) {
  const [message, setMessage] = useState('');
  if (!error) return null;
  return <div className="error" role="alert"><p>{errorMessage(error)}</p>
    {showFields && error instanceof ApiError && Object.keys(error.errors).length > 0 && <ul>{Object.entries(error.errors).map(([field, messages]) => <li key={field}>{field.replaceAll('_', ' ')}: {messages.join(' ')}</li>)}</ul>}
    {error instanceof ApiError && error.status === 419 && <><button type="button" className="secondary" onClick={async () => {
      try { await csrf(); setMessage('Security token refreshed. Review the form before submitting again.'); } catch (e) { setMessage(errorMessage(e)); }
    }}>Reinitialize security token</button><p>{message}</p></>}
  </div>;
}
