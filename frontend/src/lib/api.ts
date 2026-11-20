const origin = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD'].includes(options.method ?? 'GET')) {
    const token = document.cookie
      .split('; ')
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.slice(11);
    if (token) headers.set('X-XSRF-TOKEN', decodeURIComponent(token));
  }
  let response: Response;
  try {
    response = await fetch(origin + path, {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection. A submitted change may have completed; review the latest data before trying again.',
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login')
      window.dispatchEvent(new Event('auth-expired'));
    throw new ApiError(
      response.status,
      body.code ?? 'API_ERROR',
      body.message ?? 'The request failed.',
      body.errors ?? {},
    );
  }
  return body;
}
export const csrf = () => api<void>('/sanctum/csrf-cookie');
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'An unexpected error occurred.';
