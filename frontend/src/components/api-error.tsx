'use client';
import { useState } from 'react';
import { ApiError, csrf, errorMessage } from '@/lib/api';
export function ErrorNotice({ error }: { error: unknown }) {
  const [message, setMessage] = useState('');
  if (!error) return null;
  return <div className="error" role="alert"><p>{errorMessage(error)}</p>
    {error instanceof ApiError && error.status === 419 && <><button className="secondary" onClick={async () => {
      try { await csrf(); setMessage('Security token refreshed. Review the form before submitting again.'); } catch (e) { setMessage(errorMessage(e)); }
    }}>Reinitialize security token</button><p>{message}</p></>}
  </div>;
}
