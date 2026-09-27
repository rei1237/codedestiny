import { requireAuth } from '../lib/auth.js';
import { connectDb, withMongoRetry } from '../lib/db.js';
import { User } from '../lib/models.js';
import { CrmPreference, CrmRelationship } from '../lib/kakao-crm-models.js';
import { json, readJson, getRoutePath, handleRouteError, createHttpError, notFound, methodNotAllowed } from '../lib/http.js';
import { KAKAO_CHANNEL, CRM_CONSENT_TEXT, CRM_CONSENT_VERSION, CRM_SOURCES } from '../../lib/marketing/kakao-crm.mjs';

function checkOrigin(request) {
  const origin = request.headers.get('Origin');
  const own = new URL(request.url).origin;
  if (!origin || ![own, 'https://code-destiny.com', 'https://staging.code-destiny.com'].includes(origin)) throw createHttpError(403, 'Invalid origin');
}
async function webhook(request, env) {
  const key = String(env.KAKAO_CHANNEL_ADMIN_KEY || '');
  if (!key || request.headers.get('Authorization') !== `KakaoAK ${key}`) return json({ error: 'unauthorized' }, { status: 401 });
  const body = await readJson(request);
  const at = new Date(body.updated_at);
  const resourceId = request.headers.get('X-Kakao-Resource-ID');
  const validId = body.id_type === 'app_user_id' ? /^\d{1,30}$/.test(String(body.id)) : typeof body.id === 'string' && body.id.length > 0 && body.id.length <= 128;
  if (body.channel_public_id !== KAKAO_CHANNEL.publicId || !['added', 'blocked'].includes(body.event) || !['app_user_id', 'open_id'].includes(body.id_type) || !validId || !resourceId || !Number.isFinite(at.getTime()) || at.getTime() > Date.now() + 60000) return json({ error: 'invalid_event' }, { status: 400 });
  // open_id cannot be mapped to a site account. Never guess identity.
  if (body.id_type === 'open_id') return json({ ok: true, mapped: false });
  await connectDb(env);
  const id = String(body.id);
  await withMongoRetry(env, () => CrmRelationship.updateOne({ _id: id }, { $setOnInsert: { relationship: 'unknown' } }, { upsert: true }));
  // Delayed/duplicate callbacks cannot undo a later block. An equal-time block wins.
  const dateFilter = body.event === 'blocked' ? { $lte: at } : { $lt: at };
  await withMongoRetry(env, () => CrmRelationship.updateOne({ _id: id, $or: [{ relationshipAt: dateFilter }, { relationshipAt: { $exists: false } }] }, { $set: {
    relationship: body.event === 'added' ? 'friend' : 'blocked', relationshipAt: at, verifiedAt: new Date(), resourceId, source: 'kakao_webhook',
    ...(body.event === 'added' ? { addedAt: at } : {}),
  } }));
  return json({ ok: true });
}
export async function handleKakaoCrmRoutes(request, env) {
  try {
    const path = getRoutePath(request, '/api/kakao-crm');
    if (path === '/webhook') return request.method === 'POST' ? await webhook(request, env) : methodNotAllowed();
    if (!['/preferences', '/refresh'].includes(path)) return notFound();
    if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed();
    if (request.method === 'POST') checkOrigin(request);
    const auth = await requireAuth(request, env);
    await connectDb(env);
    if (path === '/refresh') {
      if (request.method !== 'POST') return methodNotAllowed();
      if (env.KAKAO_CHANNEL_RELATION_ENABLED !== 'true' || !env.KAKAO_CHANNEL_ADMIN_KEY) return json({ error: 'relation_unavailable', message: '관계 조회 권한과 서버 설정을 확인 중입니다.' }, { status: 503 });
      const linked = await withMongoRetry(env, () => User.findById(auth.userId).select('socialAccounts.kakao').lean());
      const id = linked?.socialAccounts?.kakao?.id;
      if (!id) return json({ relationship: 'unknown', message: '카카오 계정이 연결되지 않아 친구 여부를 조회할 수 없어요.' });
      const url = new URL('https://kapi.kakao.com/v2/api/talk/channels');
      url.searchParams.set('target_id', String(id)); url.searchParams.set('target_id_type', 'user_id'); url.searchParams.set('channel_ids', KAKAO_CHANNEL.publicId);
      const response = await fetch(url, { headers: { Authorization: `KakaoAK ${env.KAKAO_CHANNEL_ADMIN_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, signal: AbortSignal.timeout(2500) });
      if (!response.ok) return json({ relationship: 'unknown', message: '친구 상태 조회에 동의하지 않았거나 조회할 수 없어요.' });
      const data = await response.json();
      const channel = data.channels?.find(c => c.channel_public_id === KAKAO_CHANNEL.publicId);
      const relationship = { ADDED: 'friend', BLOCKED: 'blocked', NONE: 'unknown' }[channel?.relation] || 'unknown';
      const at = new Date(channel?.updated_at || 0);
      // Invalid/missing timestamps do not overwrite webhook evidence.
      if (Number.isFinite(at.getTime()) && at.getTime() > 0 && at.getTime() <= Date.now()) {
        await withMongoRetry(env, () => CrmRelationship.updateOne({ _id: String(id) }, { $setOnInsert: { relationship: 'unknown' } }, { upsert: true }));
        await withMongoRetry(env, () => CrmRelationship.updateOne({ _id: String(id), $or: [{ relationshipAt: { $lt: at } }, { relationshipAt: at, relationship }, { relationshipAt: { $exists: false } }] }, { $set: { relationship, relationshipAt: at, verifiedAt: new Date(), ...(channel.created_at ? { addedAt: new Date(channel.created_at) } : {}), source: 'kakao_relation_api' } }));
      }
      const saved = await withMongoRetry(env, () => CrmRelationship.findById(String(id)).lean());
      const confirmed = saved?.relationship || 'unknown';
      return json({ relationship: confirmed, message: confirmed === 'friend' ? '채널 친구 상태를 확인했어요.' : '조회가 끝났어요. 채널에서 상태를 확인해 주세요.' });
    }
    if (request.method === 'POST') {
      const body = await readJson(request);
      if (body.action === 'dismiss') {
        await withMongoRetry(env, () => CrmPreference.updateOne({ _id: auth.userId }, { $set: { dismissed: true } }, { upsert: true }));
      } else {
        if (typeof body.granted !== 'boolean' || body.version !== CRM_CONSENT_VERSION || !CRM_SOURCES.includes(body.source)) return json({ error: 'invalid_consent' }, { status: 400 });
        const consent = { granted: body.granted, at: new Date(), source: body.source, version: CRM_CONSENT_VERSION, text: CRM_CONSENT_TEXT };
        await withMongoRetry(env, () => CrmPreference.updateOne({ _id: auth.userId }, { $set: { consent, dismissed: true }, $push: { history: consent } }, { upsert: true }));
      }
    }
    const preference = await withMongoRetry(env, () => CrmPreference.findById(auth.userId).select('-history').lean());
    const user = await withMongoRetry(env, () => User.findById(auth.userId).select('socialAccounts.kakao').lean());
    const kakaoId = user?.socialAccounts?.kakao?.id;
    const relationship = kakaoId ? await withMongoRetry(env, () => CrmRelationship.findById(String(kakaoId)).lean()) : null;
    return json({ preference, relationship: relationship?.relationship || 'unknown', relationshipAt: relationship?.relationshipAt || null, consentVersion: CRM_CONSENT_VERSION, consentText: CRM_CONSENT_TEXT, apiSendingEnabled: false });
  } catch (error) { return handleRouteError(error); }
}
