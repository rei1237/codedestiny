import { NEO_EMAIL_SALE_ENABLED, neoUnitPrice } from '../../lib/neo-consultation/contract.js';

import { AI_LOCALE_HEADER } from '../../lib/i18n/ai-locale.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const neoUnavailable = () => json({ code: 'PRODUCT_SALE_DISABLED', message: '상담을 준비하고 있어요. 아직 결제와 접수는 진행되지 않아요.' }, 503);

// service/userId/admin은 서버에서만 주입한다. URL·body·환경값으로 mock을 켜지 않는다.
export async function handleNeoConsultations(request, { service, userId, admin, checkout, confirm } = {}) {
  const url = new URL(request.url);
  const adminRoute = url.pathname.startsWith('/api/admin/neo-consultations');
  const prefix = adminRoute ? '/api/admin/neo-consultations' : '/api/neo-consultations';
  const parts = url.pathname.slice(prefix.length).split('/').filter(Boolean);
  if (!adminRoute && request.method === 'GET' && parts[0] === 'status') return json({ enabled: NEO_EMAIL_SALE_ENABLED, unitKRW: neoUnitPrice() });
  if (!service) return neoUnavailable();
  if (adminRoute ? !admin?.id : !userId) return json({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' }, 401);
  try {
    let body = {};
    if (request.method !== 'GET') {
      const text = await request.text();
      if (text.length > 350000) return json({ code: 'BODY_TOO_LARGE', message: '입력 내용이 너무 깁니다.' }, 413);
      try { body = JSON.parse(text || '{}'); } catch { return json({ code: 'INVALID_JSON', message: '입력 내용을 확인해 주세요.' }, 400); }
    }
    const [id, action] = parts;
    let order;
    if (request.method === 'GET') {
      if (!id) return json({ orders: adminRoute ? await service.adminList(admin) : await service.list(userId) });
      return json({ order: adminRoute ? await service.adminGet(admin,id) : await service.get(userId,id) });
    }
    if (request.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405);
    if (adminRoute) {
      if (action === 'complete-manual-delivery') order = await service.completeManualDelivery(admin,id,body.version,body.confirmed === true);
      else if (action === 'answer') order = await service.editAnswer(admin,id,body.questionId,body.answer,body.version);
      else if (action === 'review') order = await service.review(admin,id,body.questionId,body.version,body.combinedReadingConfirmed === true,body.chartReadingConfirmed === true);
      else if (action === 'correction') order = await service.requestCorrection(admin,id,body.questionId,body.message,body.version);
      else if (action === 'send') order = await service.enqueueAnswer(admin,id,body.version,body.resend === true);
      else if (action === 'deliver') { await service.adminGet(admin,id); order = await service.deliver(id,body.jobKey); }
      else if (action === 'resolve-delivery') order = await service.resolveDelivery(admin,id,body.jobKey,body.resolution,body.version);
      else return json({ code: 'NOT_FOUND' },404);
    } else {
      if (!id) order = await service.create(userId,{ ...body, locale: body.locale ?? request.headers.get(AI_LOCALE_HEADER) });
      else if (action === 'update') order = await service.update(userId,id,{ ...body.input, locale: body.input?.locale ?? request.headers.get(AI_LOCALE_HEADER) },body.version);
      else if (action === 'quote') order = await service.quote(userId,id,body.version);
      else if (action === 'prepare') order = await service.prepare(userId,id,body.quoteId);
      else if (action === 'checkout' && checkout) return json(await checkout(userId,id));
      else if (action === 'confirm' && confirm) return json(await confirm(userId,id));
      else if (action === 'cancel') order = await service.requestCancellation(userId,id,body.version);
      else if (action === 'correction') order = await service.correct(userId,id,body.questionId,body.text,body.version);
      else return json({ code: 'NOT_FOUND' },404);
    }
    return json({ order });
  } catch (error) {
    return json({ code: error.code || 'NEO_REQUEST_FAILED', message: error.code ? error.message : '처리하지 못했어요. 같은 주문에서 다시 확인해 주세요.' }, error.status || 500);
  }
}

export async function handleNeoRuntimeRequest(request, env, admin) {
  if (!NEO_EMAIL_SALE_ENABLED) return handleNeoConsultations(request);
  const [{getEnv},{getPortOnePublicConfig},{assertPgConfigured}] = await Promise.all([import('../lib/env.js'),import('../lib/portone.js'),import('../payments/pg.js')]);
  let ready = Boolean(getEnv(env,'RESEND_API_KEY')) && getPortOnePublicConfig(env).configured;
  try { assertPgConfigured(env); } catch { ready=false; }
  if (request.method === 'GET' && new URL(request.url).pathname === '/api/neo-consultations/status') return json({enabled:ready,unitKRW:neoUnitPrice()});
  if (!ready) return neoUnavailable();
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const host = new URL(request.url).origin;
    const allowed = new Set([host,'https://code-destiny.com','https://www.code-destiny.com']);
    const frontend = getEnv(env,'AUTH_FRONTEND_BASE_URL');
    if (frontend) { try { allowed.add(new URL(frontend).origin); } catch { /* 잘못된 설정으로 허용 대상을 넓히지 않는다. */ } }
    if ((origin && !allowed.has(origin)) || !String(request.headers.get('content-type')).startsWith('application/json'))
      return json({code:'INVALID_ORIGIN',message:'상담 화면에서 다시 요청해 주세요.'},403);
  }
  const [{createNeoRuntime},{peekAccessTokenUserId}] = await Promise.all([
    import('../neo-consultation/runtime.js'),import('../lib/auth.js'),
  ]);
  const userId = admin ? '' : await peekAccessTokenUserId(request,env);
  const {service,repository,paymentCall} = createNeoRuntime(env,request);
  return handleNeoConsultations(request,{service,userId,admin,
    checkout:async (owner,id) => {
      const order = await service.get(owner,id);
      if (!['pending','payment_failed'].includes(order.state) || order.payment?.blocked || order.cancellationRequestedAt) throw Object.assign(new Error('현재 주문은 결제할 수 없습니다.'),{code:'ORDER_LOCKED',status:409});
      const stored = await repository.get(id);
      if (!stored.checkout || stored.checkout.merchantUid !== order.payment.id) throw Object.assign(new Error('기존 주문의 결제 상태를 확인해 주세요.'),{code:'PAYMENT_MISMATCH',status:409});
      return {order,checkout:stored.checkout};
    },
    confirm:async (owner,id) => {
      const order = await service.get(owner,id);
      if (order.payment && order.payment.status === 'pending') await paymentCall('/orders/'+encodeURIComponent(order.payment.id)+'/confirm',{});
      return {order:await service.get(owner,id)};
    },
  });
}
