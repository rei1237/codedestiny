import { CRM_CAMPAIGNS } from './kakao-crm.mjs';

// 정보통신망법 §50: 별도·선택 동의, 기본 미체크. 문구를 바꾸면 버전도 올리고 이전 버전을 허용 목록에 남길지 판단한다.
export const EMAIL_MARKETING_CONSENT_VERSION = 'email-marketing-2026-10-v1';
export const ACCEPTED_CONSENT_VERSIONS = Object.freeze([EMAIL_MARKETING_CONSENT_VERSION]);
export const EMAIL_MARKETING_CONSENT_TEXT = '선택: 꿀꿀 운세의 운세 콘텐츠, 유료 상담 추천, 이벤트·혜택 등 광고성 정보를 이메일로 받는 데 동의합니다. 주 1회 이내로 발송하며, 동의하지 않아도 가입·상담·결제가 가능하고 메일 하단 수신거부 링크나 계정 설정에서 언제든 철회할 수 있습니다.';
export const EMAIL_MARKETING_CLIENT_SOURCES = Object.freeze(['signup_email', 'signup_social', 'signup_complete', 'preferences']);
export const EMAIL_MARKETING_SERVER_SOURCES = Object.freeze(['email_unsubscribe', 'email_one_click', 'account_withdrawn', 'reconfirm']);

const SITE = 'https://code-destiny.com';
// 연휴 한정 소재(autumn-pause)는 매주 순환에 맞지 않아 뺀다.
export const EMAIL_CAMPAIGNS = Object.freeze(CRM_CAMPAIGNS.filter(c => c.id !== 'autumn-pause').map(c => Object.freeze({
  id: c.id, subject: c.title, body: c.body, button: c.button, path: c.path, image: `/assets/kakao-crm/${c.image}`, paid: c.paid,
})));

const DAY_MS = 86400000;
const KST_OFFSET_MS = 9 * 3600000;
export const FREQUENCY_CAP_MS = 6 * DAY_MS;
export const RECONFIRM_INTERVAL_MS = 2 * 365 * DAY_MS - 30 * DAY_MS;
const ROTATION_BASE_MS = Date.parse('2026-10-13T00:00:00Z');

function toTime(value) {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : NaN;
}

// 해당 KST 주(월~일)의 화요일 날짜. 주간 발송 집계 키로 쓴다.
export function kstWeekKey(value = Date.now()) {
  const t = toTime(value);
  if (!Number.isFinite(t)) throw new Error('INVALID_DATE');
  const kst = new Date(t + KST_OFFSET_MS);
  const sinceMonday = (kst.getUTCDay() + 6) % 7;
  const tuesday = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - sinceMonday * DAY_MS + DAY_MS;
  return new Date(tuesday).toISOString().slice(0, 10);
}

// 화요일 10:00–12:00 KST. 야간 발송 금지 범위보다 훨씬 좁다.
export function isEmailMarketingSendWindow(value = Date.now()) {
  const t = toTime(value);
  if (!Number.isFinite(t)) return false;
  const kst = new Date(t + KST_OFFSET_MS);
  const h = kst.getUTCHours();
  return kst.getUTCDay() === 2 && h >= 10 && h < 12;
}

// 동의 결과 고지·재확인 안내는 광고가 아니지만 야간을 피한다.
export function isEmailMarketingNoticeWindow(value = Date.now()) {
  const t = toTime(value);
  if (!Number.isFinite(t)) return false;
  const h = new Date(t + KST_OFFSET_MS).getUTCHours();
  return h >= 9 && h < 20;
}

export function pickWeeklyCampaign(weekKey, lastCampaignId = '') {
  const t = Date.parse(`${weekKey}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekKey)) || !Number.isFinite(t)) throw new Error('INVALID_WEEK_KEY');
  const n = EMAIL_CAMPAIGNS.length;
  let index = ((Math.round((t - ROTATION_BASE_MS) / (7 * DAY_MS)) % n) + n) % n;
  if (EMAIL_CAMPAIGNS[index].id === lastCampaignId) index = (index + 1) % n;
  return EMAIL_CAMPAIGNS[index];
}

export function emailCampaignUrl(id, weekKey) {
  const c = EMAIL_CAMPAIGNS.find(c => c.id === id);
  if (!c) throw new Error('UNKNOWN_CAMPAIGN');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekKey))) throw new Error('INVALID_WEEK_KEY');
  const url = new URL(c.path, SITE);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'newsletter');
  url.searchParams.set('utm_campaign', `email-weekly-${weekKey}`);
  url.searchParams.set('utm_content', c.id);
  return url.href;
}

// 소셜 가입자의 대체 주소(@social.code-destiny.local)와 탈퇴자 주소(@withdrawn.local)는 실제 수신함이 아니다.
export function isUsableMarketingEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const domain = value.slice(value.lastIndexOf('@') + 1);
  return !/\.(local|invalid|test|example|localhost)$/.test(domain);
}

export function maskMarketingEmail(email) {
  const value = String(email || '');
  const at = value.indexOf('@');
  if (at < 1) return '';
  return `${value.slice(0, Math.min(2, at))}${'*'.repeat(Math.max(1, at - 2))}${value.slice(at)}`;
}

export function emailMarketingExclusion({ preference, user, now = Date.now() } = {}) {
  if (preference?.consent?.granted !== true) return 'consent_missing';
  if (!ACCEPTED_CONSENT_VERSIONS.includes(preference.consent.version)) return 'consent_version_unknown';
  if (!user) return 'user_missing';
  if (user.status === 'withdrawn' || String(user.email || '').endsWith('@withdrawn.local')) return 'withdrawn';
  if (user.guardianConsent?.required) return 'minor';
  if (!isUsableMarketingEmail(user.email)) return 'email_unusable';
  const last = toTime(preference.lastSentAt || 0);
  if (last > 0 && now - last < FREQUENCY_CAP_MS) return 'frequency_cap';
  return null;
}
