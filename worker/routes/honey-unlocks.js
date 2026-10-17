import { requireUserFromRequest } from '../lib/auth.js';
import { connectDb } from '../lib/db.js';
import { json, readJson, methodNotAllowed, handleRouteError } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { HONEY_UNLOCK_PRODUCTS, HONEY_LETTER_COST, TAROT_ALBUM_UNLOCK_COST } from '../lib/honey-unlock-catalog.js';
import { PROMPT_HUB_HONEY_COST } from '../lib/honey-wallet.js';
import { spendHoneyUnlock } from '../lib/honey-unlocks.js';
import { getUnlockedContentSnapshot } from '../lib/content-unlocks.js';
import { CREDENTIAL_CACHE_PREFIXES, purgeCredentialCache } from '../lib/credential-scoped-cache.js';

export async function handleHoneyUnlockRoutes(request, env) {
  const url = new URL(request.url);
  const noStore = { headers: { 'Cache-Control': 'no-store' } };
  try {
    if (url.pathname === '/api/honey/catalog') {
      if (request.method !== 'GET') return methodNotAllowed();
      return json({ ok: true, products: HONEY_UNLOCK_PRODUCTS, otherUses: [
        { title: '종합 운세 프롬프트', group: '프롬프트', honeyCost: PROMPT_HUB_HONEY_COST, description: '나의 입력으로 프롬프트 1회 만들기', href: '/fortune/prompt-hub/' },
        { title: '연이의 꿀편지', group: '연이 특전', honeyCost: HONEY_LETTER_COST, description: '완료된 찻집 상담을 바탕으로 받는 편지', condition: '기존 상담 결과가 필요해요. 상담 기록에서 이용해 주세요.', href: '/fortune-tea-house/' },
        { title: '타로 앨범', group: '연이 특전', honeyCost: TAROT_ALBUM_UNLOCK_COST, description: '찻집에서 모은 타로를 앨범으로 보기', condition: '운명의 찻집에서 앨범과 보유 카드를 확인해 주세요.', href: '/fortune-tea-house/' },
      ] }, noStore);
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
    const result = await spendHoneyUnlock(env, auth.userId, { productId: body?.productId, profileId: body?.profileId, requestId: body?.requestId });
    await purgeCredentialCache(request, CREDENTIAL_CACHE_PREFIXES);
    return json({ ok: true, ...result }, noStore);
  } catch (error) { return handleRouteError(error, { request, env }); }
}
