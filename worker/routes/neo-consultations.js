import { NEO_EMAIL_SALE_ENABLED, neoUnitPrice } from '../../lib/neo-consultation/contract.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const neoUnavailable = () => json({ code: 'PRODUCT_SALE_DISABLED', message: '상담을 준비하고 있어요. 아직 결제와 접수는 진행되지 않아요.' }, 503);

// service/userId/admin은 서버에서만 주입한다. URL·body·환경값으로 mock을 켜지 않는다.
export async function handleNeoConsultations(request, { service, userId, admin } = {}) {
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
      if (action === 'answer') order = await service.editAnswer(admin,id,body.questionId,body.answer,body.version);
      else if (action === 'review') order = await service.review(admin,id,body.questionId,body.version);
      else if (action === 'correction') order = await service.requestCorrection(admin,id,body.questionId,body.message,body.version);
      else if (action === 'send') order = await service.enqueueAnswer(admin,id,body.version,body.resend === true);
      else if (action === 'deliver') { await service.adminGet(admin,id); order = await service.deliver(id,body.jobKey); }
      else if (action === 'resolve-delivery') order = await service.resolveDelivery(admin,id,body.jobKey,body.resolution,body.version);
      else return json({ code: 'NOT_FOUND' },404);
    } else {
      if (!id) order = await service.create(userId,body);
      else if (action === 'update') order = await service.update(userId,id,body.input,body.version);
      else if (action === 'quote') order = await service.quote(userId,id,body.version);
      else if (action === 'prepare') order = await service.prepare(userId,id,body.quoteId);
      else if (action === 'correction') order = await service.correct(userId,id,body.questionId,body.text,body.version);
      else return json({ code: 'NOT_FOUND' },404);
    }
    return json({ order });
  } catch (error) {
    return json({ code: error.code || 'NEO_REQUEST_FAILED', message: error.code ? error.message : '처리하지 못했어요. 같은 주문에서 다시 확인해 주세요.' }, error.status || 500);
  }
}
