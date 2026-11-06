/** Keep authentication/authorization failures out of the payment and preview paths. */
export function tossTeaAccessError(surface: 'web' | 'toss', status: number, payload: { code?: unknown; reason?: unknown; error?: unknown }): (Error & { code: string; paymentRequired: true }) | null {
  if (surface !== 'toss') return null;
  const code = String(payload.code || payload.reason || payload.error || '');
  const denied = status === 403 || (status !== 401 && code === 'ACCESS_DENIED');
  const login = status === 401 || (!denied && ['LOGIN_REQUIRED', 'SESSION_EXPIRED'].includes(code));
  if (!denied && !login) return null;
  return Object.assign(new Error(denied ? '이 상담을 이용할 권한을 확인할 수 없어요. 계정을 확인한 뒤 다시 시도해 주세요.' : '로그인이 만료되었어요. 다시 로그인한 뒤 상담을 이어가 주세요.'), {code: denied ? 'ACCESS_DENIED' : 'LOGIN_REQUIRED', paymentRequired: true as const});
}
