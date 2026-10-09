import { withMongoRetry } from './db.js';
import { EmailMarketingPreference } from './email-marketing-models.js';
import {
  EMAIL_MARKETING_CLIENT_SOURCES, EMAIL_MARKETING_CONSENT_TEXT, EMAIL_MARKETING_CONSENT_VERSION, EMAIL_MARKETING_SERVER_SOURCES, RECONFIRM_INTERVAL_MS,
} from '../../lib/marketing/email-marketing.mjs';

const SOURCES = new Set([...EMAIL_MARKETING_CLIENT_SOURCES, ...EMAIL_MARKETING_SERVER_SOURCES]);
const HISTORY_LIMIT = 50;

/**
 * 이메일 광고 동의·철회를 기록하는 유일한 경로. 호출자는 connectDb 를 이미 마쳤어야 한다.
 * 상태가 실제로 바뀔 때만 §50⑦ 처리 결과 고지를 큐잉한다. notify:false 는 탈퇴처럼 받을 주소가 없을 때 쓴다.
 */
export async function recordEmailMarketingConsent(env, userId, { granted, source, now = new Date(), notify = true } = {}) {
  const id = String(userId || '');
  if (!id || typeof granted !== 'boolean' || !SOURCES.has(source)) throw new Error('INVALID_EMAIL_MARKETING_CONSENT');
  const previous = await withMongoRetry(env, () => EmailMarketingPreference.findById(id).select('consent.granted').lean());
  const changed = (previous?.consent?.granted === true) !== granted;
  const consent = { granted, at: now, source, version: EMAIL_MARKETING_CONSENT_VERSION, text: EMAIL_MARKETING_CONSENT_TEXT };
  const $set = { consent, dismissed: true, reconfirmDueAt: granted ? new Date(now.getTime() + RECONFIRM_INTERVAL_MS) : null };
  const update = {
    $set,
    $push: { history: { $each: [consent], $slice: -HISTORY_LIMIT } },
    $setOnInsert: { lastSentAt: new Date(0) },
  };
  if (changed && notify) $set.noticePendingAt = now;
  else if (changed) update.$unset = { noticePendingAt: '' };
  await withMongoRetry(env, () => EmailMarketingPreference.updateOne({ _id: id }, update, { upsert: true }));
  return { changed, granted };
}
