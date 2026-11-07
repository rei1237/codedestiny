// 첫 화면 고민 칩의 정본. 진입 웹툰(/), 꿀꿀 홈, 무료 결과 화면, 띠운세가 같은 목록을 쓴다.
// - featureKey는 worker/lib/paid-feature-registry.js의 키다. 가격은 거기서만 읽는다(여기에 금액을 쓰지 않는다).
// - sajuField는 js/saju-engine.js GAEUN_DB의 분야 키다(무료 고민 답에 쓴다).
// - '돈'과 '올해 흐름'이 같은 tarot-year-fortune을 가리키는 것은 의도한 것이다(2026-11-07 계획 판정).
//   분야만 wealth / lifestyle로 갈린다.

/** @typedef {'love'|'reunion'|'money'|'job'|'year'} HomeConcernId */

export const HOME_CONCERNS = Object.freeze([
  Object.freeze({ id: 'love', label: '연애', featureKey: 'tarot-love-relationship', sajuField: 'love' }),
  Object.freeze({ id: 'reunion', label: '재회', featureKey: 'tarot-reunion-reading', sajuField: 'relationship' }),
  Object.freeze({ id: 'money', label: '돈', featureKey: 'tarot-year-fortune', sajuField: 'wealth' }),
  Object.freeze({ id: 'job', label: '이직', featureKey: 'tarot-ijik', sajuField: 'career' }),
  Object.freeze({ id: 'year', label: '올해 흐름', featureKey: 'tarot-year-fortune', sajuField: 'lifestyle' }),
]);

export const CONCERN_IDS = Object.freeze(new Set(HOME_CONCERNS.map(concern => concern.id)));

/**
 * 주소·저장소에서 읽은 값을 허용 목록 5개로만 좁힌다. 목록 밖이거나 문자열이 아니면 null.
 * @param {unknown} value
 * @returns {HomeConcernId | null}
 */
export function normalizeConcern(value) {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return CONCERN_IDS.has(id) ? /** @type {HomeConcernId} */ (id) : null;
}

/**
 * 무료 만세력 진입 주소. 허용 목록 밖의 concern은 버리고 일반 무료 만세력으로 연다.
 * @param {string|null} concern
 * @param {string} [from] 유입 위치(예: 'entry_webtoon'). 비었거나 없으면 from을 붙이지 않는다.
 */
export function freeEntryHref(concern, from) {
  const id = normalizeConcern(concern);
  const source = String(from ?? '').trim();
  return '/ggulggul/?action=cdOneStepFreeSajuEntry'
    + (source ? `&from=${encodeURIComponent(source)}` : '')
    + (id ? `&concern=${id}` : '');
}

export const REFUND_LINE = '생성에 실패하면 자동 환불돼요';

// 한국어 환불·청약철회 정책(app/refund-policy/page.js). /refund/는 같은 페이지를 다시 내보내는 별칭이다.
export const REFUND_POLICY_HREF = '/refund-policy/';
