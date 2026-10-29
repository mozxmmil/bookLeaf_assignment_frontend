/**
 * Thin typed fetch wrapper. All backend calls go through here so auth headers,
 * error parsing and the base URL live in one place.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'bl_token';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { field: string; message: string }[]) {
    super(message);
  }
  fieldErrors() {
    return Object.fromEntries((this.details ?? []).map((d) => [d.field, d.message]));
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal };

export async function api<T>(path: string, opts: Options = {}): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Please check your connection and try again.');
  }
  if (res.status === 204) return { data: undefined as T };
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/login')) {
      tokenStore.clear();
      window.location.href = '/login?expired=1';
    }
    throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return json;
}
