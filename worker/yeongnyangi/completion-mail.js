/**
 * Completion mail for paid readings in `yeongnyangi_requests` (영냥이 and the 연이·네오 consultation room).
 *
 * A buyer who left the page while the reading was generating has no other signal that it finished. The mail
 * goes only when the buyer was not watching at completion: `lastViewedAt` (view-heartbeat.js) missing or more
 * than COMPLETION_WATCH_MS older than `completedAt`. A buyer who opens the finished result has a heartbeat after
 * `completedAt`, so a late sweep never mails them either.
 *
 * Transactional notice about a purchased service, so it does not use marketing consent, quotas or weekly caps
 * (email-marketing-task.js). Same claim discipline as worker/payments/receipt-email.js:
 * 🔴 claim (`completionMailSentAt: null` → now) before sending, release on failure, the 10-minute cron retries.
 * 🔴 Privacy: no question text, chapter body or profile data — product name, links and the login hint only.
 * 🔴 Never throws: generation and its stored state must not depend on mail delivery.
 */

import { connectDb, withMongoRetry } from '../lib/db.js';
import { getEnv } from '../lib/env.js';
import { User } from '../lib/models.js';
import { sendEmail as sendEmailViaResend } from '../lib/resend.js';
import { YeongnyangiRequest } from '../lib/yeongnyangi-models.js';
import { BRAND_FACTS } from '../../lib/brand/brand-facts.mjs';

/** Heartbeat younger than this at completion means the buyer was watching. */
export const COMPLETION_WATCH_MS = 60_000;
/** The sweep never reaches older completions (retry budget, and no mail for long-finished readings). */
export const COMPLETION_MAIL_MAX_AGE_MS = 24 * 60 * 60_000;
const BATCH_LIMIT = 5;
const SEND_TIMEOUT_MS = 8_000;
const SITE_ORIGIN = BRAND_FACTS.service.siteUrl;
const BRAND = BRAND_FACTS.service.name;
const PERSONA_NAMES = { yeoni: '연이', neo: '네오' };

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error('completion_mail_timeout')), ms); }),
  ]);
}

/** True when the buyer was not looking at the result page when the reading completed. */
export function leftAtCompletion(row, now = new Date()) {
  const viewed = row?.lastViewedAt ? new Date(row.lastViewedAt).getTime() : NaN;
  if (!Number.isFinite(viewed)) return true;
  const completed = row?.completedAt ? new Date(row.completedAt).getTime() : now.getTime();
  return viewed < completed - COMPLETION_WATCH_MS;
}

/** Subject, HTML and text. Reads only id, persona, locale and product labels from the row. */
export function buildCompletionMail(row) {
  const id = encodeURIComponent(String(row?._id || ''));
  const persona = PERSONA_NAMES[row?.persona] || '';
  const product = row?.snapshot?.product || {};
  const productName = [product.name, product.fishName].map(v => String(v || '').trim()).filter(Boolean).join(' · ');
  const locale = String(row?.snapshot?.locale || '');
  const resultUrl = persona
    ? `${SITE_ORIGIN}/fortune-chat/?consultation=${id}`
    : `${SITE_ORIGIN}/yeongnyangi/result/?id=${id}${locale && locale !== 'ko' ? `&lang=${encodeURIComponent(locale)}` : ''}`;
  const libraryUrl = persona ? `${SITE_ORIGIN}/records/` : `${SITE_ORIGIN}/yeongnyangi/library/`;
  const title = persona ? `${persona} 상담이 완성되었어요` : '영냥이 상담이 완성되었어요';
  const subject = `[${BRAND}] ${title}`;
  const lead = '기다려 주셔서 고마워요. 주문하신 상담 결과가 모두 저장되었어요.';
  const login = '결제하신 계정으로 로그인하면 바로 열어 볼 수 있어요.';
  const library = '결과는 보관함에도 저장되어 추가 결제 없이 언제든 다시 볼 수 있어요.';
  const html = [
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">',
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>`,
    `<p style="font-size:15px;line-height:1.7;margin:0 0 12px">${escapeHtml(lead)}</p>`,
    productName ? `<p style="font-size:14px;color:#444;margin:0 0 20px">상품: ${escapeHtml(productName)}</p>` : '',
    `<p style="margin:0 0 20px"><a href="${escapeHtml(resultUrl)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#5b3a8c;color:#fff;text-decoration:none;font-weight:600">결과 열기</a></p>`,
    `<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 8px">${escapeHtml(login)}</p>`,
    `<p style="font-size:14px;line-height:1.7;color:#333;margin:0 0 8px">${escapeHtml(library)} <a href="${escapeHtml(libraryUrl)}">보관함 열기</a></p>`,
    `<p style="font-size:12px;color:#777;margin:20px 0 0">이 메일은 구매하신 상담의 완료 안내로, 광고 수신 동의와 관계없이 보내 드려요. ${escapeHtml(BRAND)}</p>`,
    '</div>',
  ].join('');
  const text = [title, '', lead, productName ? `상품: ${productName}` : '', `결과 열기: ${resultUrl}`, login, `${library} ${libraryUrl}`]
    .filter(line => line !== '').join('\n');
  return { subject, html, text, resultUrl, libraryUrl };
}

function hasMailKey(env) {
  return Boolean(getEnv(env, 'RESEND_API_KEY') || getEnv(env, 'emailapi'));
}

async function release(env, id, claimedAt, skipped) {
  try {
    await withMongoRetry(env, () => YeongnyangiRequest.updateOne({ _id: id, completionMailSentAt: claimedAt },
      { $set: { completionMailSentAt: null, ...(skipped ? { completionMailSkipped: skipped } : {}) } }, { timestamps: false }));
  } catch {
    // Left claimed: this one order gets no mail. Generation and the stored result are unaffected.
  }
}

/**
 * Sends one completion mail if the row is COMPLETED, unsent and the buyer had left.
 * @param {{ send?: Function, now?: Date, sendTimeoutMs?: number }} [options]
 *   send — test injection point. 🔴 The default is a real Resend send; tests must inject.
 * @returns {Promise<{outcome: string}>} sent | watching | no_email | taken | failed | config | invalid
 */
export async function sendCompletionMail(env, row, options = {}) {
  const { send = sendEmailViaResend, now = new Date(), sendTimeoutMs = SEND_TIMEOUT_MS } = options;
  const id = String(row?._id || '');
  if (!/^[a-f0-9]{64}$/.test(id) || row?.state !== 'COMPLETED') return { outcome: 'invalid' };
  // Without a key the default sender cannot succeed; skip before any DB work (the sweep retries once configured).
  if (send === sendEmailViaResend && !hasMailKey(env)) return { outcome: 'config' };
  let claimed = null;
  try {
    claimed = await withMongoRetry(env, () => YeongnyangiRequest.findOneAndUpdate(
      { _id: id, state: 'COMPLETED', completionMailSentAt: null },
      { $set: { completionMailSentAt: now } }, { new: true, timestamps: false }).lean());
    if (!claimed) return { outcome: 'taken' };
    if (!leftAtCompletion(claimed, now)) {
      await withMongoRetry(env, () => YeongnyangiRequest.updateOne({ _id: id }, { $set: { completionMailSkipped: 'watching' } }, { timestamps: false }));
      return { outcome: 'watching' };
    }
    const user = await withMongoRetry(env, () => User.findOne({ _id: claimed.userId }).select('email').lean());
    const to = String(user?.email || '').trim();
    if (!to) {
      await withMongoRetry(env, () => YeongnyangiRequest.updateOne({ _id: id }, { $set: { completionMailSkipped: 'no_email' } }, { timestamps: false }));
      return { outcome: 'no_email' };
    }
    const { subject, html, text } = buildCompletionMail(claimed);
    let result = null;
    try {
      result = await withTimeout(send(env, { to, subject, html, text, idempotencyKey: `yn-complete:${id}` }), sendTimeoutMs);
    } catch {
      result = null;
    }
    if (result?.ok) return { outcome: 'sent' };
    const config = result?.configError === true;
    await release(env, id, now, config ? 'config' : '');
    return { outcome: config ? 'config' : 'failed' };
  } catch {
    if (claimed) await release(env, id, now, '');
    return { outcome: 'failed' };
  }
}

/**
 * 10-minute cron backstop: completions the immediate queue hook missed (recovery cron, HTTP path, failed send).
 * `lastViewedAt: {$exists:true}` limits it to rows created after the field existed (schema default null), so the
 * first deploy does not mail buyers whose readings finished before the heartbeat could record them watching.
 */
export async function sendPendingCompletionMails(env, options = {}) {
  const { now = new Date(), limit = BATCH_LIMIT, send = sendEmailViaResend } = options;
  if (send === sendEmailViaResend && !hasMailKey(env)) return { scanned: 0, outcomes: [], configError: true };
  await connectDb(env);
  const rows = await withMongoRetry(env, () => YeongnyangiRequest.find({
    state: 'COMPLETED', completedAt: { $gte: new Date(now.getTime() - COMPLETION_MAIL_MAX_AGE_MS) },
    completionMailSentAt: null, lastViewedAt: { $exists: true },
  }).select('_id userId state persona completedAt lastViewedAt completionMailSentAt snapshot.locale snapshot.product.name snapshot.product.fishName')
    .sort({ completedAt: 1 }).limit(limit).lean());
  const outcomes = [];
  for (const row of rows) {
    const { outcome } = await sendCompletionMail(env, row, { ...options, now, send });
    outcomes.push(outcome);
    // Account-level failure (key, sender domain): the next rows would get the same answer.
    if (outcome === 'config') return { scanned: rows.length, outcomes, configError: true };
  }
  return { scanned: rows.length, outcomes, configError: false };
}
