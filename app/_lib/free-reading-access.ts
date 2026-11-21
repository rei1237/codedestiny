import { authFetch } from './auth-client';
import { FREE_READING_GUEST_ENABLED } from '../../lib/guided-flow/flags.mjs';
export { FREE_READING_GUEST_ENABLED };
/** A read-only session check for deterministic local readings. Never probes billing. */
export async function hasFreeReadingSession(): Promise<boolean> {
  const response = await authFetch('/api/auth/me', { method: 'GET', cache: 'no-store' }, { retryOn401: false, forceFresh: true });
  if (!response.ok) return false;
  const data = await response.json();
  return data?.authenticated === true && Boolean(data?.user?.id);
}
/** L1: whether a guest (signed out or session check unavailable) may open the free basic result of an opted-in page (/today/ only).
 *  Pages that are not listed in FREE_READING_GUEST_ENABLED keep calling hasFreeReadingSession() alone. */
export function freeReadingGuestAllowed(): boolean {
  return FREE_READING_GUEST_ENABLED === true;
}
