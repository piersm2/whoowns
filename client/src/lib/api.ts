export class ApiError extends Error {
  status: number;
  issues?: { path: (string | number)[]; message: string }[];
  constructor(status: number, message: string, issues?: ApiError['issues']) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body instanceof FormData || body === undefined ? {} : { 'content-type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.issues?.length ? data.issues.map((i: { path: unknown[]; message: string }) => `${i.path.join('.')}: ${i.message}`).join('; ') : data?.error || res.statusText;
    throw new ApiError(res.status, msg, data?.issues);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  del: (url: string) => request<void>('DELETE', url),
};

export const money = (n: number | null | undefined, digits = 0) =>
  Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits });

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const today = () => new Date().toISOString().slice(0, 10);

export const daysUntil = (iso: string) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
};

export const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
