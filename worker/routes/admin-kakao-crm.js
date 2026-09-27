import { connectDb, withMongoRetry } from '../lib/db.js';
import { CrmCampaign } from '../lib/kakao-crm-models.js';
import { json, readJson, notFound, methodNotAllowed } from '../lib/http.js';
import { CRM_CAMPAIGNS, campaignUrl, estimateCampaign, isCrmSendTime, contribution, validAmount } from '../../lib/marketing/kakao-crm.mjs';

// Manual channel operations only. There is intentionally no send/API adapter here.
export async function handleAdminKakaoCrmRoutes(path, request, env, admin) {
  await connectDb(env);
  if (path === '/' && request.method === 'GET') {
    const campaigns = await withMongoRetry(env, () => CrmCampaign.find({}).sort({ updatedAt: -1 }).limit(50).lean());
    return json({ campaigns, creatives: CRM_CAMPAIGNS.map(c => ({ ...c, url: campaignUrl(c.id) })), apiSendingEnabled: false });
  }
  if (request.method !== 'POST') return methodNotAllowed();
  const body = await readJson(request);
  if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(String(body.id || ''))) return json({ error: 'invalid_id' }, { status: 400 });
  if (path === '/draft') {
    if (!CRM_CAMPAIGNS.some(c => c.id === body.creativeId)) return json({ error: 'invalid_creative' }, { status: 400 });
    let estimate;
    try { estimate = estimateCampaign(body); } catch { return json({ error: 'invalid_budget' }, { status: 400 }); }
    if (!estimate.withinBudget || !isCrmSendTime(body.scheduledAt) || new Date(body.scheduledAt).getTime() <= Date.now()) return json({ error: 'budget_or_time', message: '예산과 미래 발송 시각(한국시간 09~20시)을 확인해 주세요.' }, { status: 400 });
    if (typeof body.audienceEvidence !== 'string' || body.audienceEvidence.trim().length < 10 || body.audienceEvidence.length > 1000) return json({ error: 'audience_evidence_required' }, { status: 400 });
    // Immutable draft IDs prevent double creation/review. Revised plans need a new ID.
    try {
      await withMongoRetry(env, () => CrmCampaign.create({ _id: body.id, creativeId: body.creativeId, status: 'draft', recipients: body.recipients, unitCostKRW: body.unitCostKRW, vatRate: body.vatRate, budgetKRW: body.budgetKRW, expectedKRW: estimate.expectedKRW, scheduledAt: new Date(body.scheduledAt), audienceEvidence: body.audienceEvidence.trim() }));
    } catch (error) { if (error?.code === 11000) return json({ error: 'duplicate_campaign' }, { status: 409 }); throw error; }
    return json({ ok: true, sent: false });
  }
  if (path === '/pause') {
    const result = await withMongoRetry(env, () => CrmCampaign.updateOne({ _id: body.id, status: { $ne: 'reported' } }, { $set: { status: 'paused' } }));
    return json({ ok: result.matchedCount === 1, message: '사이트 검토 상태를 중지했습니다. 카카오에 등록한 예약은 카카오 관리자센터에서도 직접 중지해야 합니다.' });
  }
  if (path === '/review') {
    const c = await withMongoRetry(env, () => CrmCampaign.findById(body.id).lean());
    if (!c || c.status !== 'draft') return json({ error: 'not_draft' }, { status: 409 });
    const creative = CRM_CAMPAIGNS.find(item => item.id === c.creativeId);
    if (creative?.paid) return json({ error: 'paid_delivery_evidence_required', message: '유료 상품은 실제 결과 제공 검증 후 캠페인에 편입합니다. 현재 발송 검토 대상에서 제외됩니다.' }, { status: 409 });
    if (body.audienceChecked !== true || body.previewChecked !== true || body.walletChecked !== true || !isCrmSendTime(c.scheduledAt) || new Date(c.scheduledAt).getTime() <= Date.now()) return json({ error: 'review_incomplete' }, { status: 400 });
    const result = await withMongoRetry(env, () => CrmCampaign.updateOne({ _id: body.id, status: 'draft' }, { $set: { status: 'reviewed', reviewedAt: new Date(), reviewedBy: String(admin?.userId || admin?.email || 'admin') } }));
    return json({ ok: result.modifiedCount === 1, sent: false, message: '검토 기록만 저장했습니다. 카카오에서 최종 대상·비용을 재확인한 후 예약하세요.' });
  }
  if (path === '/report') {
    const costs = ['netRevenueKRW', 'messageCostKRW', 'couponCostKRW', 'pgCostKRW', 'llmCostKRW'];
    if (!body.report || !costs.every(k => body.report[k] === null || validAmount(body.report[k])) || !['sent', 'failed'].every(k => Number.isSafeInteger(body.report[k]) && body.report[k] >= 0) || typeof body.report.evidence !== 'string' || body.report.evidence.length < 10 || body.report.evidence.length > 1000) return json({ error: 'invalid_report' }, { status: 400 });
    const report = Object.fromEntries([...costs, 'sent', 'failed', 'evidence'].map(k => [k, body.report[k]]));
    report.contributionKRW = contribution(report);
    report.source = 'admin_report';
    const result = await withMongoRetry(env, () => CrmCampaign.updateOne({ _id: body.id, status: 'reviewed' }, { $set: { status: 'reported', report } }));
    return json({ ok: result.modifiedCount === 1, report }, { status: result.modifiedCount === 1 ? 200 : 409 });
  }
  return notFound();
}
