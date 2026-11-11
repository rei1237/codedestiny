import { authFetch } from './auth-client';
/** A read-only session check for deterministic local readings. Never probes billing. */
export async function hasFreeReadingSession(): Promise<boolean> {
  const response = await authFetch('/api/auth/me', { method: 'GET', cache: 'no-store' }, { retryOn401: false, forceFresh: true });
  if (!response.ok) return false;
  const data = await response.json();
  return data?.authenticated === true && Boolean(data?.user?.id);
}
