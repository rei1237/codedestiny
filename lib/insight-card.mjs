// Shared public contract. Never add profile, question, order or result identifiers here.
import {insightCharacter} from './insight-art.mjs';
export const INSIGHT_BRANDS = Object.freeze({
  yeongnyangi: '영냥이', tea: '연이', neo: '네오', daily: '연이의 오늘 타로',
  codex: '마스터 인연의 서', karma: '운명의 업', astrology: '서양 점성술',
  vedic: '베다점', naming: '작명 상담', compass: '운명 나침반', humanDesign: '휴먼디자인',
});
export const INSIGHT_LIMIT = 120;
export const INSIGHT_ID = /^ic_[a-f0-9]{40}$/;
export const INSIGHT_TOKEN = /^[a-f0-9]{64}$/;
export const INSIGHT_TTL = 30 * 86400000;
export const INSIGHT_LOCALES = ['ko', 'en', 'ja', 'zh'];
export function insightAudience(brand) { return brand === 'yeongnyangi' ? 'yeongnyangi' : 'ggulggul'; }
export function insightPath(id, brand, channel = 'copy') {
  if (!INSIGHT_ID.test(id) || !Object.hasOwn(INSIGHT_BRANDS, brand)) throw new Error('INVALID_CARD');
  return '/share/?card=' + id + '&utm_medium=share&utm_source=' +
    (['copy', 'native', 'kakao', 'image'].includes(channel) ? channel : 'share') +
    '&utm_campaign=insight_' + insightAudience(brand);
}
export function insightOgPath(card) {
  return '/api/og?' + new URLSearchParams({title: INSIGHT_BRANDS[card.brand] + ' · ' + card.day,
    desc: card.text, badge: 'insight', character:insightCharacter(card.brand), theme: card.brand === 'neo' ? 'dark' : 'light'});
}
export function projectInsight(input, now = new Date()) {
  if (!input || input.consent !== true || !Object.hasOwn(INSIGHT_BRANDS, input.brand) ||
    !INSIGHT_LOCALES.includes(input.locale) || !['paid', 'daily', 'free'].includes(input.source)) return null;
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  // Reject instead of silently rewriting the preview the owner approved.
  if (!text || text.length > INSIGHT_LIMIT || /[<>\u0000-\u001f\u007f]/.test(text) ||
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d{2,4}[- ]?\d{3,4}[- ]?\d{4}\b|\b\d{6}[- ]?\d{7}\b|https?:|(?:주민번호|계좌번호|비밀번호|password)/i.test(text)) return null;
  const day = String(input.day || '');
  const stamp = Date.parse(day + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== day ||
    stamp > now.getTime() + 86400000 || stamp < now.getTime() - 366 * 86400000) return null;
  return { brand: input.brand, source: input.source, locale: input.locale, day, text };
}
export async function insightDigest(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
}
export function publicInsight(row) {
  return { id: row._id, brand: row.brand, source: row.source, locale: row.locale, day: row.day,
    text: row.text, expiresAt: new Date(row.expiresAt).toISOString() };
}
