import { getAccessTokenSecret } from './auth.js';
import { base64UrlToString, signShareTokenBody, signaturesMatch, stringToBase64Url } from './share-snapshot-core.js';

// 수신거부 링크 토큰: v1.<b64url(userId)>.<HMAC>. 로그인 없이 본인 수신만 끌 수 있다.
// 만료가 없다. 액세스 시크릿을 교체하면 이미 보낸 메일의 링크가 깨지므로, 그때는 확인 페이지가 계정 설정으로 안내한다.
const PREFIX = 'email-marketing-unsubscribe:v1:';
const CRYPTO_ERROR = 'EMAIL_MARKETING_CRYPTO_UNAVAILABLE';

export async function createUnsubscribeToken(env, userId) {
  const id = String(userId || '');
  if (!id) throw new Error('USER_ID_REQUIRED');
  const sig = await signShareTokenBody(PREFIX + id, getAccessTokenSecret(env), { cryptoErrorCode: CRYPTO_ERROR });
  return `v1.${stringToBase64Url(id)}.${sig}`;
}

export async function verifyUnsubscribeToken(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^[A-Za-z0-9_-]{1,200}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2])) return null;
  let userId;
  try { userId = base64UrlToString(parts[1]); } catch { return null; }
  if (!/^[a-f0-9]{24}$/.test(userId)) return null;
  const expected = await signShareTokenBody(PREFIX + userId, getAccessTokenSecret(env), { cryptoErrorCode: CRYPTO_ERROR });
  return (await signaturesMatch(expected, parts[2])) ? userId : null;
}
