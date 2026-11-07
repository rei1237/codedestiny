import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb } from '../lib/db.js';
import { json, readJson, methodNotAllowed, handleRouteError } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { HONEY_UNLOCK_PRODUCTS } from '../lib/honey-unlock-catalog.js';
import { HONEY_ATTENDANCE_EVERY, HONEY_STREAK_BONUS, HONEY_STREAK_EVERY, PROMPT_HUB_HONEY_COST } from '../lib/honey-wallet.js';
import { spendHoneyUnlock } from '../lib/honey-unlocks.js';
import { getUnlockedContentSnapshot } from '../lib/content-unlocks.js';
import { CREDENTIAL_CACHE_PREFIXES, purgeCredentialCache } from '../lib/credential-scoped-cache.js';

export async function handleHoneyUnlockRoutes(request, env) {
  const url = new URL(request.url);
  const noStore = { headers: { 'Cache-Control': 'no-store' } };
  try {
    if (url.pathname === '/api/honey/catalog') {
      if (request.method !== 'GET') return methodNotAllowed();
      // 비회원 출석부도 실제 지급 규칙을 보여 주도록 규칙 상수만 공개한다(잔액·출석 여부는 로그인 후 /api/honey/attendance).
      const attendance = { attendanceEvery: HONEY_ATTENDANCE_EVERY, streakEvery: HONEY_STREAK_EVERY, streakBonus: HONEY_STREAK_BONUS, promptCost: PROMPT_HUB_HONEY_COST };
      return json({ ok: true, products: HONEY_UNLOCK_PRODUCTS, otherUses: [], attendance }, noStore);
    }
    if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed();
    const auth = await requireUserFromRequest(request, env);
    if (request.method === 'POST') {
      const security = await enforceSensitiveEndpointSecurity({ env, request, userId: auth.userId,
        endpoint: 'honey:unlock', allowedMethods: ['POST'], requireJson: true,
        rateLimit: { limit: 20, windowSeconds: 60 }, rateLimitKey: `${auth.userId}:honey:unlock`, maxPayloadBytes: 4096 });
      if (!security.ok) return security.response;
    }
    await connectDb(env);
    if (request.method === 'GET') {
      const snapshot = await getUnlockedContentSnapshot({ userId: auth.userId, profileId: url.searchParams.get('profileId') || '' });
      return json({ ok: true, featureKeys: snapshot.featureKeys || [] }, noStore);
    }
    const body = await readJson(request);
    // Never forward client-supplied price, birth identity, user, or entitlement fields.
    const result = await spendHoneyUnlock(env, auth.userId, { productId: body?.productId, profileId: body?.profileId, requestId: body?.requestId, input: body?.input });
    await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
    return json({ ok: true, ...result }, noStore);
  } catch (error) { return handleRouteError(error, { request, env }); }
}
