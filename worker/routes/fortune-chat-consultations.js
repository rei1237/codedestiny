// Yeoni/Neo consultations on the shared consultation pipeline (worker/yeongnyangi): the same requests, queue,
// chapter generation, validation and recovery as Yeongnyangi, at the fortune-chat per-use price with the
// account's one free consultation. Creating and activating are gated by ENABLE_FORTUNE_CHAT_CONSULTATIONS;
// reading, continuing and listing stay open so a consultation already started is never stranded by the flag.
// Every consultation needs an account; guests only read the flag (/consultations/status) and log in to start.
import { requireUserFromRequest } from '../lib/auth.js';
import { withMongoRetry } from '../lib/db.js';
import { json, readJson, createHttpError, handleRouteError, notFound } from '../lib/http.js';
import { enforceSensitiveEndpointSecurity } from '../lib/security/index.js';
import { CHAT_FEATURE_KEYS, isChatFeatureKey, chatPaymentRequestId, hasRequestAccess } from '../yeongnyangi/access-methods.js';
import { readAndContinueFortune } from '../yeongnyangi/delivery.js';
import { retryFortune } from '../yeongnyangi/retry.js';
import { CHAT_ACCESS_CHOICES } from '../yeongnyangi/per-use-access.js';
import { ownerId, readRequest, YeongnyangiRequest } from '../yeongnyangi/repository.js';
import { activateFortune, drawTarotSpread, prepareFortune, presentFortune } from '../yeongnyangi/service.ts';

import { chatQuestionProducts } from '../yeongnyangi/payments/catalog.ts';
import { questionConversation } from '../yeongnyangi/question-followup.ts';
import { QUESTION_POLICY_VERSION, FOLLOWUP_LIMITS, questionScopes } from '../yeongnyangi/fortune/ask/question-policy.ts';

const PERSONAS = ['yeoni', 'neo'];
const readOptions = { retries: 1, retryOnOperationTimeout: true, retryAdmissionOnOverload: true };
const messages = {
  QUESTION_SCOPE_REQUIRED: '질문과 필요한 상황을 확인한 뒤 상담 범위를 선택해 주세요.',
  QUESTION_PRODUCT_MISMATCH: '질문의 범위와 선택한 상품이 달라요. 상담 범위를 다시 확인해 주세요.',
  QUESTION_SCOPE_UNSUPPORTED: '이 체계에서 지원하는 상담 범위를 확인해 주세요.',
  PARTNER_REQUIRED: '두 사람을 비교하려면 상대 프로필도 선택해 주세요.',
  QUESTION_FOLLOWUP_BUSY: '같은 질문의 답변을 확인 중이에요. 잠시 후 다시 확인해 주세요.',
  QUESTION_FOLLOWUP_SUPPORT: '추가 질문 횟수는 사용하지 않았어요. 기존 상담을 기준으로 지원 문의를 남겨 주세요.',
  QUESTION_CONVERSATION_CLOSED: '이 상담의 추가 질문이 마무리됐어요. 저장된 답변은 계속 읽을 수 있어요.',
  INVALID_PERSONA: '상담할 친구를 다시 골라 주세요.',
  PRODUCT_NOT_FOUND: '이 운세는 아직 대화형 상담으로 준비되지 않았어요. 다른 운세를 골라 주세요.',
  QUESTION_REQUIRED: '가장 궁금한 한 가지를 적어 주세요.',
  INVALID_CONSULTATION_KIND: '타로로 볼 고민의 종류를 다시 골라 주세요.',
  PROFILE_REQUIRED: '상담할 프로필을 선택해 주세요.',
  PROFILE_NOT_FOUND: '이 계정에서 프로필을 찾지 못했어요. 다시 선택해 주세요.',
  BIRTH_TIME_REQUIRED: '이 운세에는 출생시간이 필요해요. 프로필의 시간을 확인해 주세요.',
  BIRTH_PLACE_REQUIRED: '이 운세에는 출생지역이 필요해요. 도시와 국가를 입력해 주세요.',
  PREMIUM_BIRTH_REQUIRED: '이 상담에는 출생시간, 성별, 출생지역이 모두 필요해요.',
  INVALID_BIRTH_DATE: '생년월일을 다시 확인해 주세요.',
  INVALID_LUNAR_DATE: '음력 날짜와 윤달 여부를 다시 확인해 주세요.',
  INVALID_BIRTH_TIME: '출생시간을 시와 분으로 입력해 주세요.',
  READING_LOCALE_UNAVAILABLE: '이 상담은 한국어로 이용해 주세요.',
  PAYMENT_REQUIRED: '이번 상담은 1회 결제 후 이어서 볼 수 있어요.',
  FREE_TRIAL_USED: '신규 무료 상담은 종료됐어요. 상담 범위와 결제 수단을 확인해 주세요.',
  PAYMENT_EVIDENCE_PENDING: '결제 확인이 아직 끝나지 않았어요. 다시 결제하지 말고 잠시 후 다시 확인해 주세요.',
  PG_PAYMENT_NOT_PAID: '진행 중인 결제가 있어요. 결제를 마치거나 취소한 뒤 다시 선택해 주세요.',
  FREE_TRIAL_RESTORED: '상담을 완료하지 못했어요. 기존 상담 내역을 기준으로 지원 문의를 남겨 주세요.',
  PAYMENT_NOT_ACTIVE:'결제 또는 환불 상태 확인이 필요해요. 다시 결제하지 말고 결제 내역을 확인해 주세요.',
  PRICE_CHANGED: '상담 가격이 바뀌었어요. 처음 화면에서 가격을 확인한 뒤 다시 시작해 주세요.',
  LLM_NOT_CONFIGURED: '지금은 상담을 준비하고 있어요. 결제는 진행되지 않아요.',
  GENERATION_QUEUE_UNAVAILABLE: '상담 재개를 접수하지 못했어요. 잠시 후 같은 상담에서 다시 시도해 주세요.',
  GENERATION_REVIEW_REQUIRED: '남은 이야기를 이어서 만드는 중이에요. 이미 저장된 부분은 지금 볼 수 있고, 추가 결제 없이 복구해요.',
  FORTUNE_PROVIDER_FAILED: '상담을 잠시 멈췄어요. 다시 결제하지 말고 같은 상담에서 이어가 주세요.',
  FORTUNE_NOT_FOUND: '상담을 찾지 못했어요.',
};

const enabled = env => String(env?.ENABLE_FORTUNE_CHAT_CONSULTATIONS || '').trim() === 'true';
const persona = value => (PERSONAS.includes(value) ? value : '');
const isChat = row => Boolean(persona(row?.persona)) && isChatFeatureKey(row?.featureKey);



async function present(env, userId, row) {
  const paid = hasRequestAccess(row);
  return {
    ...presentFortune(row),
    persona: row.persona,
    paidFeatureKey: row.featureKey,
    paymentRequestId: chatPaymentRequestId(String(row._id)),
    ...(paid || row.state !== 'CREATED' ? {} : { freeTrialAvailable: false }),
  };
}

// A Yeongnyangi request never answers here; this route only serves the consultations it created.
async function readChat(env, userId, id) {
  const row = await readRequest(env, userId, id);
  if (!isChat(row)) throw createHttpError(404, messages.FORTUNE_NOT_FOUND, { code: 'FORTUNE_NOT_FOUND' });
  return row;
}

async function list(env, userId, chosen) {
  const rows = await withMongoRetry(env, () => YeongnyangiRequest.find({ userId: ownerId(userId), persona: chosen, featureKey: { $in: CHAT_FEATURE_KEYS } })
    .select('_id productId state paymentId accessMethod persona createdAt completedAt completedChapters snapshot.product.systems snapshot.manifest.id snapshot.analysis.consultation.question')
    .sort({ createdAt: -1, _id: -1 }).limit(30).lean(), readOptions);
  return rows.map(row => ({
    id: row._id, persona: row.persona, state: row.state, paid: hasRequestAccess(row), domain: row.snapshot?.product?.systems?.[0] || '',
    completedChapters: row.completedChapters || 0, totalChapters: row.snapshot?.manifest?.length || 0,
    question: row.snapshot?.analysis?.consultation?.question || '', createdAt: row.createdAt, completedAt: row.completedAt,
  }));
}

/** `path` is relative to /api/fortune-chat and starts with /consultations. */
export async function handleFortuneChatConsultations(request, env, path) {
  try {
    const url = new URL(request.url), method = request.method.toUpperCase();
    // Guests pick the room before they log in, so only the flag is public here — never a consultation.
    if (/^\/consultations\/status\/?$/.test(path)) {
      return method === 'GET' ? json({ ok: true, enabled: enabled(env) }) : notFound();
    }
    if (/^\/consultations\/catalog\/?$/.test(path)) {
      return method === 'GET' ? json({ok:true,enabled:enabled(env),version:QUESTION_POLICY_VERSION,products:chatQuestionProducts().map(product=>({...product,scope:questionScopes[product.fishId],followups:FOLLOWUP_LIMITS[product.fishId]}))}, {headers:{'Cache-Control':'no-store'}}) : notFound();
    }
    const match = path.match(/^\/consultations(?:\/([a-f0-9]{64})(?:\/(activate|generate|draw|conversation))?)?\/?$/);
    if (!match) return notFound();
    const [, id, action] = match;
    const auth = await requireUserFromRequest(request, env);
    if (method !== 'GET') {
      const security = await enforceSensitiveEndpointSecurity({ env, request, userId: auth.userId, endpoint: `fortune-chat:consultations:${action || 'create'}`,
        allowedMethods: ['POST'], requireJson: true, rateLimit: { limit: 30, windowSeconds: 60 }, rateLimitKey: `${auth.userId}:fortune-chat-consultations:write` });
      if (!security.ok) return security.response;
    }
    const noStore = { headers: { 'Cache-Control': 'private, no-store' } };
    if (!id && method === 'GET') {
      const chosen = persona(url.searchParams.get('persona'));
      if (!chosen) throw createHttpError(400, messages.INVALID_PERSONA, { code: 'INVALID_PERSONA' });
      // `enabled` tells the page whether to open the new room for a fresh consultation; history and reading stay open either way.
      return json({ ok: true, enabled: enabled(env), consultations: await list(env, auth.userId, chosen) }, noStore);
    }
    if (!id && method === 'POST') {
      if (!enabled(env)) return notFound();
      const body = await readJson(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw createHttpError(400, '상담 요청 정보를 확인해 주세요.', { code: 'INVALID_REQUEST' });
      // Keep the deployed paid client usable until the question-first UI ships.
      // Any tier-bearing request must use the new contract; it cannot fall back to a legacy product.
      if((body.questionDecision!==undefined||body.fishId!==undefined)&&body.questionDecision?.version!==QUESTION_POLICY_VERSION)throw createHttpError(400,'질문과 상담 범위를 먼저 확인해 주세요.',{code:'QUESTION_SCOPE_REQUIRED'});
      const chosen = persona(body.persona);
      if (!chosen) throw createHttpError(400, messages.INVALID_PERSONA, { code: 'INVALID_PERSONA' });
      const row = await prepareFortune(env, auth.userId, body, { persona: chosen });
      return json({ ok: true, consultation: await present(env, auth.userId, row) }, { status: 201, ...noStore });
    }
    if (!id) return notFound();
    if (!action && method === 'GET') {
      await readChat(env, auth.userId, id);
      return json({ ok: true, consultation: await present(env, auth.userId, await readAndContinueFortune(env, auth.userId, id)) }, noStore);
    }
    if (action === 'activate' && method === 'POST') {
      if (!enabled(env)) return notFound();
      const body = await readJson(request);
      await readChat(env, auth.userId, id);
      const access = CHAT_ACCESS_CHOICES.includes(body?.access) ? body.access : '';
      const row = await activateFortune(env, auth.userId, id, { access });
      return json({ ok: true, consultation: await present(env, auth.userId, row) }, noStore);
    }
    if ((action === 'draw' || action === 'conversation') && method === 'POST') {
      await readChat(env, auth.userId, id);
      const body = await readJson(request);
      const row = action === 'draw' ? await drawTarotSpread(env, auth.userId, id, body) : await questionConversation(env, auth.userId, id, body);
      return json({ok:true,consultation:await present(env,auth.userId,row)},noStore);
    }
    if (action === 'generate' && method === 'POST') {
      await readChat(env, auth.userId, id);
      const row = await retryFortune(env, auth.userId, id);
      return json({ ok: true, consultation: await present(env, auth.userId, row) }, { status: row.state === 'COMPLETED' ? 200 : 202, ...noStore });
    }
    return notFound();
  } catch (error) {
    const code = error?.code || error?.payload?.code;
    if (code === 'GENERATION_QUEUE_UNAVAILABLE') return json({ ok: false, code, message: messages[code], retryable: true, retryAfterSeconds: 30 }, { status: 503, headers: { 'Retry-After': '30' } });
    if (code && messages[code] && error?.status) return handleRouteError(createHttpError(error.status, messages[code], { ...error.payload, code }), { request, env });
    if (error?.code && error?.status && !error.payload) {
      return handleRouteError(createHttpError(error.status, '상담을 이어가지 못했어요. 잠시 후 다시 확인해 주세요.', { code: error.code }), { request, env });
    }
    return handleRouteError(error, { request, env });
  }
}
