// 2026-11-12 사용자 결정: 무료 운세 3개월 홍보. 표시 전용 정본이다.
// 🔴 endsAt 은 배너 문구·D-N 표시에만 쓴다. 접근 판정·가격·결제·이용권에 쓰지 않는다
//    (자동 유료 전환 없음). 무료 범위의 정본은 lib/payment/free-fortune-policy.mjs 다.
// 정적 셸 배너(templates/home-funnel.html → index.html)와 React 배너(app/components/FreePromoBanner.tsx)가
// 이 파일 하나를 읽는다. 다른 언어 문구는 i18n/authored/freePromo-01.json (ko 는 여기와 같아야 한다).
export const FREE_PROMO = Object.freeze({
  id: 'free-fortune-3m-20270212',
  endsAt: '2027-02-12T23:59:59+09:00',
  ctaHref: '/ggulggul/#cdQuickServices',
  sharePath: '/?utm_source=share&utm_medium=free_promo&utm_campaign=free_3m',
});

export const FREE_PROMO_COPY_KO = Object.freeze({
  badge: '3개월 한정',
  title: '지금만 전부 무료',
  until: '2027년 2월 12일 이후 유료 전환 예정',
  note: 'AI 상담과 라이트 사주·대운 풀이는 무료에서 제외돼요.',
  cta: '무료 운세 보러 가기',
  share: '친구에게도 무료일 때 알려주기',
  shareText: '만세력·자미두수·별자리 풀이를 지금 무료로 볼 수 있어요. 2027년 2월 12일 이후 유료 전환 예정이에요.',
  copied: '링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.',
  copyFailed: '링크를 복사하지 못했어요. 주소창의 링크를 복사해 주세요.',
  tileBadge: '3개월 한정 무료',
  bubble: '2월 12일까지 연이가 이만큼 활짝 열어 뒀어요! 저를 콕 누르면 바로 사주 보러 가요.',
  groupFun: '재밌는 사주 콘텐츠',
  groupClassic: '정통 사주',
  groupMore: '다른 운세',
});

// 2026-11-12 사용자 요청: 무료로 푼 내용을 구체적인 목록으로 보여 준다. 표시 전용 목록이다.
// 🔴 무료 여부를 여기서 정하지 않는다. 각 항목은 policyKey(lib/payment/free-fortune-policy.mjs 의 무료 키)나
//    freeStart(js/core/service-registry.js 의 '무료 시작'·'무료'·'차트 공개' 항목 id)로 이미 무료인 기능만 가리킨다.
//    __tests__/ui/free-promo.test.mjs 가 둘 다 확인한다. 정책에서 빠지면 여기서도 빼야 테스트가 통과한다.
// 2026-11-13(6c-2): 사주 결과 안 카드 9개(네컷·도파민·테토에겐·극T·로또·AI 프롬프트·스킬 트리·명식·절기)는
//    설명 페이지 /saju/<slug>/ 로 보낸다. 주소는 lib/marketing/free-feature-details.mjs 의 href 와 같아야 한다(테스트가 확인).
//    그 페이지의 시작 버튼이 /ggulggul/?action=cdOneStepFreeSajuEntry(사주 입력)로 이어진다. details 가 이 파일을 import 하므로 거꾸로 import 하지 않는다(순환).
// 2026-11-13: 궁합·타로·자미두수·숙요·베다·점성술·휴먼 디자인은 설명 페이지로 보낸다.
//    그 페이지의 시작 버튼(/?action=… 또는 /ggulggul/?action=…)이 셸 기능으로 이어진다.
export const FREE_PROMO_SAJU_ACTION = 'cdOneStepFreeSajuEntry';
export const FREE_PROMO_GROUPS = Object.freeze([
  { id: 'fun', labelKey: 'groupFun', items: [
    { id: 'fourCut', ko: '사주 네컷', policyKey: 'saju_fun_shared', href: '/saju/four-cut/' },
    { id: 'dopamine', ko: '도파민·집중력', policyKey: 'saju_fun_shared', href: '/saju/dopamine/' },
    { id: 'hormone', ko: '테토·에겐 바이브', policyKey: 'saju_fun_shared', href: '/saju/teto-egen/' },
    { id: 'tTest', ko: '극T 테스트', policyKey: 'saju_fun_shared', href: '/saju/t-test/' },
    { id: 'lotto', ko: '사주 로또 리추얼', policyKey: 'fun.quantumLotto.ritualReport', href: '/saju/lotto-ritual/' },
    { id: 'aiPrompt', ko: 'AI 프롬프트 카드', policyKey: 'saju_fun_shared', href: '/saju/ai-prompt-card/' },
    { id: 'skillTree', ko: '인생 스킬 트리', policyKey: 'rpt_skillTreeCard', href: '/saju/skill-tree/' },
    { id: 'bias', ko: '최애운명', policyKey: 'destiny-bias-analyze', href: '/saju/destiny-bias/' },
    { id: 'animal', ko: '십이운성 동물점', policyKey: 'animal-destiny-unlock', href: '/saju/animal-destiny/' },
  ] },
  { id: 'classic', labelKey: 'groupClassic', items: [
    { id: 'natal', ko: '명식·12신살', policyKey: 'saju_natal_reading', href: '/saju/natal-chart/' },
    { id: 'seasonRhythm', ko: '절기 리듬', policyKey: 'saju_natal_reading', href: '/saju/season-rhythm/' },
    { id: 'compat', ko: '사주 궁합', policyKey: 'section_compat', href: '/saju/compatibility/' },
    { id: 'manse', ko: '만세력', freeStart: 'manse', href: '/manse/' },
    { id: 'today', ko: '오늘의 운세', policyKey: 'daily-fortune-reading', href: '/today/' },
    { id: 'career', ko: '나의 일 스타일', policyKey: 'saju-career-style', href: '/saju/career-style/' },
  ] },
  { id: 'more', labelKey: 'groupMore', items: [
    { id: 'tarot', ko: '타로', freeStart: 'tarot', href: '/tarot/' },
    { id: 'ziwei', ko: '자미두수', freeStart: 'ziwei', href: '/ziwei/' },
    { id: 'sukuyo', ko: '숙요점', freeStart: 'sukuyo', href: '/sukuyo/' },
    { id: 'vedic', ko: '베다점', freeStart: 'vedic', href: '/vedic/' },
    { id: 'astro', ko: '점성술', freeStart: 'astrology', href: '/astrology/' },
    { id: 'humanDesign', ko: '휴먼 디자인', policyKey: 'human_design_reading', href: '/human-design/guide/' },
    { id: 'promptHub', ko: '프롬프트 생성기', policyKey: 'fortune-prompt-hub-generate', href: '/fortune/prompt-hub/' },
  ] },
].map(group => Object.freeze({ ...group, items: Object.freeze(group.items.map(item => Object.freeze(item))) })));

// 칩·연이의 이동 주소. 셸 액션은 /ggulggul/ 정적 셸에서 실행된다(홈 / 는 React 라 액션을 모른다).
export function freePromoItemHref(item) {
  return item.href || '/ggulggul/?action=' + item.action;
}
export const FREE_PROMO_YEONI = Object.freeze({
  href: '/ggulggul/?action=' + FREE_PROMO_SAJU_ACTION,
  image: '/images/fortune-chat/persona/yeoni-cheer.webp',
});

// 한국 시간 달력 기준으로 남은 날 수. 마감 당일 0, 마감 뒤 null.
// 정적 셸이 Function#toString 으로 같은 본문을 인라인하므로 ES5 문법만 쓴다.
export function freePromoDaysLeft(endsAt, now) {
  var end = Date.parse(endsAt);
  var t = now == null ? Date.now() : Number(now);
  if (!(end > 0) || !(t > 0) || t > end) return null;
  var KST = 9 * 3600000, DAY = 86400000;
  return Math.floor((end + KST) / DAY) - Math.floor((t + KST) / DAY);
}

export function freePromoDayLabel(days) {
  if (days == null) return '';
  return days === 0 ? 'D-DAY' : 'D-' + days;
}
