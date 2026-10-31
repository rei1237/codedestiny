import { connectDb } from '../lib/db.js';
import { requireUserFromRequest, isMobileAppAuthRequest } from '../lib/auth.js';
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson, createHttpError } from '../lib/http.js';
import { readActivationRewards, startFreeSajuTutorial, settleActivationReward } from '../lib/activation-rewards.js';
import { claimSnulifeCode, readSnuCampus, unlockSnuSaju } from '../lib/snu-campus.js';

export function assertActivationOrigin(request, env = {}) {
  if (isMobileAppAuthRequest(request)) return;
  const origin = request.headers.get('Origin');
  const allowed = new Set([new URL(request.url).origin, new URL(env.SITE_URL || 'https://code-destiny.com').origin]);
  if (!origin || !allowed.has(origin)) throw createHttpError(403, '이 페이지에서 다시 시도해 주세요.', { code: 'INVALID_ORIGIN' });
}

export async function handleActivationRewardRoutes(request, env) {
  try {
    const path = getRoutePath(request, '/api/activation-rewards');
    const known = ['/status', '/tutorial/start', '/tutorial/complete', '/first-paid/claim', '/snu/status', '/snu/code', '/snu/request', '/snu/verify', '/snu/unlock'];
    if (!known.includes(path)) return notFound();
    if (request.method !== (path.endsWith('/status') ? 'GET' : 'POST')) return methodNotAllowed();
    if (request.method === 'POST') assertActivationOrigin(request, env);
    const auth = await requireUserFromRequest(request, env);
    // Preserve existing verified members, but all new claims must use the bounded code campaign.
    if (path === '/snu/request' || path === '/snu/verify') return json({ ok: false, code: 'SNULIFE_CODE_REQUIRED', message: 'SNULIFE 게시물의 제휴 코드로 선물을 받아 주세요. 학교 이메일 인증은 더 이상 신청하지 않아도 됩니다.' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    await connectDb(env);
    let result;
    if (path === '/status') result = await readActivationRewards(auth.userId);
    else if (path === '/snu/status') result = await readSnuCampus(auth.userId);
    else {
      const body = await readJson(request);
      if (path === '/snu/code') result = await claimSnulifeCode(auth.userId, body.code, env);

      else if (path === '/snu/unlock') result = await unlockSnuSaju(auth.userId, body.profileId);
      else if (path === '/tutorial/start') result = await startFreeSajuTutorial(auth.userId, body.profileId);
      else result = await settleActivationReward(auth.userId, path === '/tutorial/complete' ? 'tutorial' : 'first_paid', { profileId: body.profileId });
    }
    return json({ ok: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return handleRouteError(error); }
}
