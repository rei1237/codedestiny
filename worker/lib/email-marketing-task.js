/**
 * 주간 광고 이메일과 §50 고지 메일 크론 태스크. worker/index.js 10분 크론 분기에서 매 틱 부른다.
 *
 * - A. 고지(09–20 KST): 동의·철회 처리 결과(§50⑦)와 2년 주기 수신동의 확인(§50⑧). 킬스위치와 무관하다.
 * - B. 광고(화 10–12 KST): EmailMarketingState 'control' 문서가 enabled:true 일 때만. 문서가 없으면 0건이다.
 *
 * 🔴 Resend 키·발신 도메인·쿼터를 결제 영수증 메일과 공유한다. weeklyCap 과 TICK_LIMIT 이 그 쿼터를 지키는 하드 상한이다.
 * 🔴 수신자마다 lastSentAt CAS 로 먼저 선점한 뒤 보낸다. 겹친 틱의 중복 발송과 발송 직전 철회를 막는다.
 */
import { connectDb, withMongoRetry } from './db.js';
import { User } from './models.js';
import { EmailMarketingPreference, EmailMarketingState } from './email-marketing-models.js';
import { recordEmailMarketingConsent } from './email-marketing-consent.js';
import { createUnsubscribeToken } from './email-marketing-token.js';
import { buildConsentResultNotice, buildMarketingEmail, buildReconfirmNotice, unsubscribeUrlFor } from './email-marketing-template.js';
import { sendEmail } from './resend.js';
import { escapeTelegramHtml, sendTelegramMessage } from './telegram.js';
import {
  ACCEPTED_CONSENT_VERSIONS, FREQUENCY_CAP_MS, RECONFIRM_INTERVAL_MS, emailMarketingExclusion, isEmailMarketingNoticeWindow,
  isEmailMarketingSendWindow, isUsableMarketingEmail, kstWeekKey, pickWeeklyCampaign,
} from '../../lib/marketing/email-marketing.mjs';

// 광고 메일을 별도 서브도메인으로 분리할 때 이 상수만 바꾼다(그 도메인을 Resend 에서 먼저 인증해야 한다).
export const MARKETING_FROM = '꿀꿀 운세 <admin@code-destiny.com>';
export const DEFAULT_WEEKLY_CAP = 300;
export const MAX_WEEKLY_CAP = 5000;
const TICK_LIMIT = 40;
const NOTICE_LIMIT = 20;
const SEND_INTERVAL_MS = 500;
const TIME_BUDGET_MS = 4 * 60 * 1000;

const defaultSleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clampCap(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? Math.min(n, MAX_WEEKLY_CAP) : DEFAULT_WEEKLY_CAP;
}

// 네트워크·429·5xx·설정 오류는 다시 시도할 가치가 있다. 4xx(주소 거부 등)는 이번 주 몫을 소진한 것으로 둔다.
function isRetryable(result) {
  return result.configError || result.status === 0 || result.status === 429 || result.status >= 500;
}

async function loadUsers(env, ids) {
  if (!ids.length) return new Map();
  const users = await withMongoRetry(env, () => User.find({ _id: { $in: ids } }).select('email status guardianConsent.required').lean());
  return new Map(users.map(u => [String(u._id), u]));
}

async function ensureRun(env, weekKey, now) {
  const _id = `run:${weekKey}`;
  return withMongoRetry(env, () => EmailMarketingState.findOneAndUpdate({ _id }, { $setOnInsert: { weekKey, campaignId: pickWeeklyCampaign(weekKey).id }, $set: { lastRunAt: now } }, { upsert: true, new: true }).lean());
}

// 주 1회만 알린다. 결제 영수증 메일도 같은 키·도메인이라 같이 막혀 있다는 점을 함께 적는다.
async function alertConfigFailure(env, { weekKey, now, task, result, fetchImpl }) {
  await ensureRun(env, weekKey, now);
  const claimed = await withMongoRetry(env, () => EmailMarketingState.updateOne({ _id: `run:${weekKey}`, alertedAt: null }, { $set: { alertedAt: now } }));
  if (!claimed.modifiedCount) return;
  const fromDomain = /@([^\s>]+)/.exec(String(result.from || MARKETING_FROM))?.[1] || '(unknown)';
  const text = [
    '🔴 <b>광고·고지 메일 발송이 설정 오류로 중단됐다</b>',
    '',
    `태스크: 이메일 마케팅 (${escapeTelegramHtml(task)})`,
    `발신 도메인: ${escapeTelegramHtml(fromDomain)}`,
    `Resend 응답: ${result.status || 0} ${escapeTelegramHtml(result.error || '')}`,
    '',
    '같은 API 키·발신 도메인을 쓰는 <b>결제 영수증 메일</b>도 함께 막혀 있을 수 있다.',
    '고친 뒤 관리자 화면에서 발송을 다시 켜면 이번 주 중단 표시가 풀린다.',
  ].join('\n');
  const sent = await sendTelegramMessage(env, { text, disablePreview: true, fetchImpl });
  if (!sent.ok) console.error('[email-marketing] config alert failed:', sent.error || 'unknown');
}

async function runNotices(env, { now, deadline, sleep, fetchImpl }) {
  const summary = { consentNotices: 0, reconfirmNotices: 0, failed: 0, skipped: 0 };
  const [pending, due] = await Promise.all([
    withMongoRetry(env, () => EmailMarketingPreference.find({ noticePendingAt: { $type: 'date' } }).sort({ noticePendingAt: 1 }).limit(NOTICE_LIMIT).select('consent noticePendingAt').lean()),
    withMongoRetry(env, () => EmailMarketingPreference.find({ 'consent.granted': true, reconfirmDueAt: { $lte: now } }).sort({ reconfirmDueAt: 1 }).limit(NOTICE_LIMIT).select('consent reconfirmDueAt').lean()),
  ]);
  const users = await loadUsers(env, [...new Set([...pending, ...due].map(p => String(p._id)))]);
  const jobs = [
    ...pending.map(p => ({
      kind: 'consentNotices', id: String(p._id),
      claim: { filter: { _id: p._id, noticePendingAt: p.noticePendingAt }, update: { $unset: { noticePendingAt: '' } } },
      rollback: { filter: { _id: p._id, noticePendingAt: { $exists: false } }, update: { $set: { noticePendingAt: p.noticePendingAt } } },
      build: () => buildConsentResultNotice({ env, granted: p.consent?.granted === true, at: p.consent?.at || p.noticePendingAt }),
    })),
    ...due.map(p => {
      const next = new Date(now.getTime() + RECONFIRM_INTERVAL_MS);
      return {
        kind: 'reconfirmNotices', id: String(p._id),
        claim: { filter: { _id: p._id, 'consent.granted': true, reconfirmDueAt: p.reconfirmDueAt }, update: { $set: { reconfirmDueAt: next } } },
        rollback: { filter: { _id: p._id, reconfirmDueAt: next }, update: { $set: { reconfirmDueAt: p.reconfirmDueAt } } },
        build: () => buildReconfirmNotice({ env, consentAt: p.consent?.at }),
      };
    }),
  ];
  for (const job of jobs) {
    if (Date.now() > deadline) { summary.stopped = 'time_budget'; break; }
    const claimed = await withMongoRetry(env, () => EmailMarketingPreference.updateOne(job.claim.filter, { ...job.claim.update }));
    if (!claimed.modifiedCount) continue;
    const user = users.get(job.id);
    if (!user || user.status === 'withdrawn' || !isUsableMarketingEmail(user.email)) { summary.skipped += 1; continue; }
    const result = await sendEmail(env, { to: user.email, from: MARKETING_FROM, ...job.build() });
    if (result.ok) summary[job.kind] += 1;
    else {
      summary.failed += 1;
      if (isRetryable(result)) await withMongoRetry(env, () => EmailMarketingPreference.updateOne(job.rollback.filter, { ...job.rollback.update }));
      if (result.configError) { summary.stopped = 'config_error'; await alertConfigFailure(env, { weekKey: kstWeekKey(now), now, task: 'notice', result, fetchImpl }); break; }
      if (result.status === 429) { summary.stopped = 'rate_limited'; break; }
    }
    await sleep(SEND_INTERVAL_MS);
  }
  return summary;
}

async function runWeekly(env, { now, deadline, sleep, fetchImpl }) {
  const control = await withMongoRetry(env, () => EmailMarketingState.findById('control').lean());
  if (control?.enabled !== true) return { skipped: 'disabled' };
  const weekKey = kstWeekKey(now);
  const runId = `run:${weekKey}`;
  const weeklyCap = clampCap(control.weeklyCap);
  const run = await ensureRun(env, weekKey, now);
  if (run?.configAbortedAt) return { skipped: 'config_aborted', weekKey };
  const remaining = weeklyCap - (run?.sent || 0);
  if (remaining <= 0) return { skipped: 'weekly_cap', weekKey, weeklyCap };

  const candidates = await withMongoRetry(env, () => EmailMarketingPreference.find({
    'consent.granted': true,
    'consent.version': { $in: ACCEPTED_CONSENT_VERSIONS },
    lastSentAt: { $lt: new Date(now.getTime() - FREQUENCY_CAP_MS) },
  }).sort({ lastSentAt: 1 }).limit(Math.min(TICK_LIMIT, remaining)).select('consent lastSentAt lastCampaignId lastWeekKey').lean());
  const users = await loadUsers(env, candidates.map(p => String(p._id)));
  const summary = { weekKey, candidates: candidates.length, sent: 0, failed: 0, skipped: 0, excluded: {} };

  for (const pref of candidates) {
    if (Date.now() > deadline) { summary.stopped = 'time_budget'; break; }
    const id = String(pref._id);
    const user = users.get(id);
    const exclusion = emailMarketingExclusion({ preference: pref, user, now: now.getTime() });
    if (exclusion) {
      summary.skipped += 1;
      summary.excluded[exclusion] = (summary.excluded[exclusion] || 0) + 1;
      if (exclusion === 'withdrawn' || exclusion === 'user_missing') {
        await recordEmailMarketingConsent(env, id, { granted: false, source: 'account_withdrawn', now, notify: false });
      } else if (exclusion === 'email_unusable' || exclusion === 'minor') {
        // 큐 맨 앞에 계속 남아 실제 수신자를 밀어내지 않게 뒤로 보낸다. 발송한 것은 아니다.
        await withMongoRetry(env, () => EmailMarketingPreference.updateOne({ _id: pref._id, lastSentAt: pref.lastSentAt }, { $set: { lastSentAt: now, lastError: exclusion, lastErrorAt: now } }));
      }
      continue;
    }
    const campaign = pickWeeklyCampaign(weekKey, pref.lastCampaignId);
    const claimed = await withMongoRetry(env, () => EmailMarketingPreference.updateOne(
      { _id: pref._id, 'consent.granted': true, lastSentAt: pref.lastSentAt },
      { $set: { lastSentAt: now, lastCampaignId: campaign.id, lastWeekKey: weekKey } },
    ));
    if (!claimed.modifiedCount) { summary.skipped += 1; continue; }

    const unsubscribeUrl = unsubscribeUrlFor(env, await createUnsubscribeToken(env, id));
    const mail = buildMarketingEmail({ env, campaign, weekKey, unsubscribeUrl });
    const result = await sendEmail(env, {
      to: user.email, from: MARKETING_FROM, ...mail,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    if (result.ok) summary.sent += 1;
    else {
      summary.failed += 1;
      const error = String(result.error || result.status || 'send_failed').slice(0, 200);
      const restore = isRetryable(result)
        ? { lastSentAt: pref.lastSentAt, lastCampaignId: pref.lastCampaignId ?? null, lastWeekKey: pref.lastWeekKey ?? null, lastError: error, lastErrorAt: now }
        : { lastError: error, lastErrorAt: now };
      await withMongoRetry(env, () => EmailMarketingPreference.updateOne({ _id: pref._id, lastSentAt: now }, { $set: restore }));
      if (result.configError) {
        summary.stopped = 'config_error';
        await withMongoRetry(env, () => EmailMarketingState.updateOne({ _id: runId }, { $set: { configAbortedAt: now } }));
        await alertConfigFailure(env, { weekKey, now, task: 'weekly', result, fetchImpl });
        break;
      }
      if (result.status === 429) { summary.stopped = 'rate_limited'; break; }
    }
    await sleep(SEND_INTERVAL_MS);
  }

  if (summary.sent || summary.failed || summary.skipped) {
    await withMongoRetry(env, () => EmailMarketingState.updateOne({ _id: runId }, { $inc: { sent: summary.sent, failed: summary.failed, skipped: summary.skipped } }), { retries: 0 });
  }
  return summary;
}

/**
 * @param {object} env
 * @param {{ now?: Date, fetchImpl?: Function, sleep?: Function }} [options] sleep·fetchImpl 은 테스트 주입구다.
 */
export async function runEmailMarketingTasks(env, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const sleep = options.sleep || defaultSleep;
  const inNotice = isEmailMarketingNoticeWindow(now);
  const inSend = isEmailMarketingSendWindow(now);
  if (!inNotice && !inSend) return { notices: { skipped: 'outside_window' }, weekly: { skipped: 'outside_window' } };
  await connectDb(env);
  const deadline = Date.now() + TIME_BUDGET_MS;
  const ctx = { now, deadline, sleep, fetchImpl: options.fetchImpl };
  const result = {};
  // 두 작업을 서로 격리한다. 고지 실패가 광고 발송을, 광고 실패가 고지를 막지 않는다.
  try { result.notices = inNotice ? await runNotices(env, ctx) : { skipped: 'outside_window' }; }
  catch (error) { console.error('[email-marketing] notices failed:', error?.message || error); result.notices = { error: String(error?.message || error) }; }
  try { result.weekly = inSend ? await runWeekly(env, ctx) : { skipped: 'outside_window' }; }
  catch (error) { console.error('[email-marketing] weekly failed:', error?.message || error); result.weekly = { error: String(error?.message || error) }; }
  console.log('[email-marketing] tick', JSON.stringify(result));
  return result;
}
