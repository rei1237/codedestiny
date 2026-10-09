import { connectDb, withMongoRetry } from '../lib/db.js';
import { EmailMarketingPreference, EmailMarketingState } from '../lib/email-marketing-models.js';
import { DEFAULT_WEEKLY_CAP, MAX_WEEKLY_CAP } from '../lib/email-marketing-task.js';
import { json, readJson, notFound, methodNotAllowed } from '../lib/http.js';
import { EMAIL_CAMPAIGNS, emailCampaignUrl, kstWeekKey, pickWeeklyCampaign } from '../../lib/marketing/email-marketing.mjs';

// 주간 광고 메일의 킬스위치와 현황. 여기서는 메일을 보내지 않는다 — 발송은 10분 크론의 화요일 창에서만 일어난다.
// 감사 로그는 admin.js 의 authorizeAdminRequest 가 남긴다.
export async function handleAdminEmailMarketingRoutes(path, request, env, admin) {
  await connectDb(env);
  if (path === '/' && request.method === 'GET') {
    const weekKey = kstWeekKey(new Date());
    const [consented, control, runs] = await Promise.all([
      withMongoRetry(env, () => EmailMarketingPreference.countDocuments({ 'consent.granted': true })),
      withMongoRetry(env, () => EmailMarketingState.findById('control').lean()),
      // 'run:' 접두 _id 범위를 기본 인덱스 순서로 최근 8주만 읽는다.
      withMongoRetry(env, () => EmailMarketingState.find({ _id: { $gt: 'run:', $lt: 'run;' } }).sort({ _id: -1 }).limit(8).lean()),
    ]);
    const current = runs.find(r => r.weekKey === weekKey);
    const campaign = EMAIL_CAMPAIGNS.find(c => c.id === current?.campaignId) || pickWeeklyCampaign(weekKey);
    return json({
      consented, weekKey, runs,
      control: { enabled: control?.enabled === true, weeklyCap: control?.weeklyCap || DEFAULT_WEEKLY_CAP, updatedBy: control?.updatedBy || null, updatedAt: control?.updatedAt || null },
      maxWeeklyCap: MAX_WEEKLY_CAP,
      campaign: { ...campaign, url: emailCampaignUrl(campaign.id, weekKey) },
    });
  }
  if (path !== '/control') return notFound();
  if (request.method !== 'POST') return methodNotAllowed();
  const body = await readJson(request);
  const cap = Number(body.weeklyCap);
  if (typeof body.enabled !== 'boolean' || !Number.isSafeInteger(cap) || cap < 1 || cap > MAX_WEEKLY_CAP) return json({ error: 'invalid_control', message: `켜기/끄기와 1~${MAX_WEEKLY_CAP} 사이 주간 상한을 입력해 주세요.` }, { status: 400 });
  const updatedBy = String(admin?.userId || admin?.email || 'admin');
  await withMongoRetry(env, () => EmailMarketingState.updateOne({ _id: 'control' }, { $set: { enabled: body.enabled, weeklyCap: cap, updatedBy } }, { upsert: true }));
  // 설정 오류로 멈춘 주는 관리자가 원인을 고친 뒤 다시 켤 때만 풀린다.
  if (body.enabled) await withMongoRetry(env, () => EmailMarketingState.updateOne({ _id: `run:${kstWeekKey(new Date())}` }, { $unset: { configAbortedAt: '', alertedAt: '' } }));
  return json({ ok: true, message: body.enabled ? `켰습니다. 화요일 10~12시(한국시간)에 주 ${cap}건 이내로 발송합니다.` : '껐습니다. 다음 틱부터 광고 메일을 보내지 않습니다(동의·철회 고지 메일은 계속 나갑니다).' });
}
