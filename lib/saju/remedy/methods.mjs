// 액땜 방법 라이브러리: 방법 id·종류와 케이스별 방법 묶음. 문구는 copy.ko.mjs 에 둔다.
// 순수 데이터. 소비처는 이 표를 바꾸지 않고 index.mjs 의 결과만 읽는다.

export const METHOD_KINDS = Object.freeze(['lifestyle', 'custom', 'direction', 'travel', 'donation', 'relation', 'document', 'safety']);

const kindOf = (id) => {
  const head = id.split('-')[0];
  return METHOD_KINDS.includes(head) ? head : '';
};

// 방법 id 의 첫 토막이 종류다(direction-desk → direction). 표 밖 id 는 쓰지 않는다.
export const METHOD_IDS = Object.freeze([
  'direction-desk', 'direction-walk', 'direction-color-item',
  'travel-move-first', 'travel-overseas', 'travel-buffer', 'travel-direction-trip', 'travel-docs-copy',
  'donation-blood', 'donation-small', 'donation-time',
  'relation-first-contact', 'relation-slow-word', 'relation-elder-call', 'relation-talk-time', 'relation-apology',
  'document-read-twice', 'document-recheck', 'document-handover', 'document-insurance-check', 'document-subscription',
  'document-split-plan', 'document-delay-announce', 'document-spending-log', 'document-savings-split',
  'safety-drive', 'safety-tools', 'safety-exercise', 'safety-kitchen-fire', 'safety-traffic', 'safety-home-check',
  'lifestyle-declutter', 'lifestyle-furniture', 'lifestyle-new-routine', 'lifestyle-delay-decision', 'lifestyle-recheck-big',
  'lifestyle-sun-warm', 'lifestyle-hydrate-rest', 'lifestyle-rhythm', 'lifestyle-regular-checkup', 'lifestyle-fixed-routine',
  'lifestyle-element-activity', 'lifestyle-family-events-pace', 'lifestyle-use-opposite', 'lifestyle-no-speculation',
  'custom-bureom', 'custom-dongji-patjuk', 'custom-ipchunchup', 'custom-kite', 'custom-entrance', 'custom-old-things',
  'custom-samjae-intro', 'custom-son-eomneun-nal', 'custom-sangmun', 'custom-blood-first', 'custom-new-year-aengmagi',
  'custom-travel-first',
]);

export const REMEDY_METHODS = Object.freeze(Object.fromEntries(
  METHOD_IDS.map((id) => [id, Object.freeze({ id, kind: kindOf(id) })]),
));

// 방위·색 정본 표 하나(worker/routes/new-year-ai.js:1676 신년운세 개운법 지침과 같은 연결).
// 목=청록/동쪽, 화=붉은색/남쪽, 토=황토색/중앙, 금=흰색/서쪽, 수=검정과 남색/북쪽.
export const ELEMENT_GUIDE = Object.freeze({
  wood: Object.freeze({ el: '목', han: '木', color: '청록색', direction: '동쪽' }),
  fire: Object.freeze({ el: '화', han: '火', color: '붉은색', direction: '남쪽' }),
  earth: Object.freeze({ el: '토', han: '土', color: '황토색', direction: '중앙' }),
  metal: Object.freeze({ el: '금', han: '金', color: '흰색', direction: '서쪽' }),
  water: Object.freeze({ el: '수', han: '水', color: '검정이나 남색', direction: '북쪽' }),
});

// 케이스별 방법: 생활형 3개 + 풍속 1개(마지막). 카드는 앞의 2~3개와 풍속 1개를 쓴다.
const ZW_PALACE_METHODS = Object.freeze({
  ming: ['lifestyle-fixed-routine', 'lifestyle-delay-decision', 'relation-slow-word', 'custom-new-year-aengmagi'],
  wealth: ['document-spending-log', 'donation-small', 'document-savings-split', 'custom-bureom'],
  career: ['document-handover', 'document-recheck', 'document-split-plan', 'custom-ipchunchup'],
  spouse: ['relation-talk-time', 'relation-slow-word', 'relation-apology', 'custom-dongji-patjuk'],
  travel: ['travel-buffer', 'travel-docs-copy', 'safety-traffic', 'custom-travel-first'],
  health: ['lifestyle-rhythm', 'lifestyle-regular-checkup', 'safety-exercise', 'custom-bureom'],
  home: ['safety-home-check', 'lifestyle-declutter', 'lifestyle-furniture', 'custom-entrance'],
});
export const ZW_PALACE_SLUGS = Object.freeze(Object.keys(ZW_PALACE_METHODS));

export const CASE_METHODS = Object.freeze({
  'gisin-year': ['direction-desk', 'direction-color-item', 'travel-direction-trip', 'custom-new-year-aengmagi'],
  'day-clash': ['lifestyle-furniture', 'travel-move-first', 'lifestyle-delay-decision', 'custom-son-eomneun-nal'],
  'month-clash': ['document-handover', 'document-recheck', 'relation-slow-word', 'custom-entrance'],
  'year-clash': ['relation-elder-call', 'safety-home-check', 'lifestyle-declutter', 'custom-old-things'],
  hyeong: ['document-read-twice', 'safety-traffic', 'document-recheck', 'custom-kite'],
  wonjin: ['relation-first-contact', 'relation-slow-word', 'relation-apology', 'custom-dongji-patjuk'],
  baekho: ['donation-blood', 'safety-drive', 'safety-exercise', 'custom-blood-first'],
  yangin: ['safety-tools', 'safety-drive', 'donation-blood', 'custom-blood-first'],
  yeokma: ['travel-overseas', 'travel-buffer', 'travel-docs-copy', 'custom-travel-first'],
  'sangmun-jogaek': ['lifestyle-family-events-pace', 'lifestyle-declutter', 'relation-elder-call', 'custom-sangmun'],
  samjae: ['lifestyle-recheck-big', 'document-insurance-check', 'document-read-twice', 'custom-samjae-intro'],
  'daewoon-shift': ['lifestyle-declutter', 'document-subscription', 'lifestyle-new-routine', 'custom-old-things'],
  'gongmang-year': ['document-split-plan', 'document-delay-announce', 'lifestyle-new-routine', 'custom-ipchunchup'],
  'element-excess': ['lifestyle-element-activity', 'lifestyle-rhythm', 'direction-color-item', 'custom-bureom'],
  'johu-urgent:warm': ['lifestyle-sun-warm', 'direction-walk', 'lifestyle-rhythm', 'custom-dongji-patjuk'],
  'johu-urgent:hydrate': ['lifestyle-hydrate-rest', 'direction-walk', 'lifestyle-rhythm', 'custom-bureom'],
  ...Object.fromEntries(ZW_PALACE_SLUGS.map((slug) => [`zw-natal-hwagi:${slug}`, ZW_PALACE_METHODS[slug]])),
  ...Object.fromEntries(ZW_PALACE_SLUGS.map((slug) => [`zw-decade-hwagi:${slug}`, ZW_PALACE_METHODS[slug]])),
  'zw-yang-tuo': ['safety-drive', 'safety-tools', 'donation-blood', 'custom-blood-first'],
  'zw-huo-ling': ['lifestyle-delay-decision', 'safety-kitchen-fire', 'relation-slow-word', 'custom-kite'],
  'zw-kong-jie': ['lifestyle-no-speculation', 'document-savings-split', 'donation-small', 'custom-bureom'],
  'zw-empty-ming': ['lifestyle-fixed-routine', 'lifestyle-use-opposite', 'lifestyle-new-routine', 'custom-ipchunchup'],
  'zw-travel-malefic': ['travel-buffer', 'travel-docs-copy', 'safety-traffic', 'custom-son-eomneun-nal'],
  'everyday-balance': ['direction-color-item', 'direction-walk', 'lifestyle-element-activity', 'custom-entrance'],
});

// 카드 풍속 대체 후보(2026-11-28 R9): 앞 카드가 케이스 풍속을 이미 썼으면 이 순서에서 아직 안 쓴 것을 고른다.
// 어느 케이스에도 소개로 어울리는 계절·살림 풍속만 둔다(삼재·상문·손 없는 날·피·길 떠나기처럼 케이스에 묶인 풍속은 넣지 않는다).
export const CUSTOM_FALLBACK_IDS = Object.freeze([
  'custom-new-year-aengmagi', 'custom-kite', 'custom-old-things', 'custom-entrance', 'custom-ipchunchup', 'custom-dongji-patjuk', 'custom-bureom',
]);
// 풍속 문구가 기대는 방법: 그 방법이 같은 카드에 있을 때만 그 풍속을 쓴다(헌혈 이야기에는 헌혈 조건 문구가 함께 있어야 한다).
export const CUSTOM_NEEDS_METHOD = Object.freeze({ 'custom-blood-first': 'donation-blood' });

// 케이스 22개(사주 15 + 자미 7) + 기본 케이스 1개. priority 가 높을수록 앞에 둔다(같으면 caseId 순).
// tone: 카드 그림 표정 기본값(caution=주의, explain=설명). domains 는 소비처가 고를 때 쓰는 생활 영역 이름이다.
const meta = (system, priority, domains, tone = 'explain') => Object.freeze({ system, priority, domains: Object.freeze(domains), tone });
export const CASE_META = Object.freeze({
  'day-clash': meta('saju', 90, ['home', 'move'], 'caution'),
  baekho: meta('saju', 85, ['safety', 'health'], 'caution'),
  yangin: meta('saju', 80, ['safety'], 'caution'),
  samjae: meta('saju', 78, ['plan', 'paperwork'], 'caution'),
  'gisin-year': meta('saju', 75, ['daily', 'mind']),
  hyeong: meta('saju', 72, ['paperwork', 'safety'], 'caution'),
  yeokma: meta('saju', 70, ['travel', 'move']),
  wonjin: meta('saju', 66, ['relation']),
  'sangmun-jogaek': meta('saju', 64, ['family']),
  'year-clash': meta('saju', 62, ['family', 'home']),
  'month-clash': meta('saju', 60, ['work']),
  'daewoon-shift': meta('saju', 58, ['plan', 'daily']),
  'johu-urgent': meta('saju', 55, ['daily', 'health']),
  'gongmang-year': meta('saju', 52, ['plan', 'work']),
  'element-excess': meta('saju', 50, ['daily', 'health']),
  'zw-decade-hwagi': meta('ziwei', 84, [], 'caution'),
  'zw-natal-hwagi': meta('ziwei', 76, []),
  'zw-yang-tuo': meta('ziwei', 70, ['safety'], 'caution'),
  'zw-huo-ling': meta('ziwei', 68, ['mind', 'safety'], 'caution'),
  'zw-kong-jie': meta('ziwei', 65, ['money']),
  'zw-travel-malefic': meta('ziwei', 62, ['travel', 'safety'], 'caution'),
  'zw-empty-ming': meta('ziwei', 54, ['mind', 'daily']),
  'everyday-balance': meta('saju', 10, ['daily']),
});
export const REMEDY_CASE_IDS = Object.freeze(Object.keys(CASE_META));
// 화기 케이스는 궁(variant)에 따라 영역이 정해진다.
export const ZW_PALACE_DOMAINS = Object.freeze({
  ming: Object.freeze(['mind']), wealth: Object.freeze(['money']), career: Object.freeze(['work']), spouse: Object.freeze(['relation']),
  travel: Object.freeze(['travel']), health: Object.freeze(['health']), home: Object.freeze(['home']),
});

/** 케이스(와 변형)의 방법 id 목록. 없으면 []. */
export function methodsFor(caseId, variant = '') {
  const key = variant ? `${caseId}:${variant}` : caseId;
  return [...(CASE_METHODS[key] || CASE_METHODS[caseId] || [])];
}
