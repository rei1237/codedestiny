// 2026-11-12 사용자 결정: 무료 운세 3개월 홍보. 표시 전용 정본이다.
// 🔴 endsAt 은 배너 문구·D-N 표시에만 쓴다. 접근 판정·가격·결제·이용권에 쓰지 않는다
//    (자동 유료 전환 없음). 무료 범위의 정본은 lib/payment/free-fortune-policy.mjs 다.
// 정적 셸 배너(templates/home-funnel.html → index.html)와 React 배너(app/components/FreePromoBanner.tsx)가
// 이 파일 하나를 읽는다. 다른 언어 문구는 i18n/authored/freePromo-01.json (ko 는 여기와 같아야 한다).
export const FREE_PROMO = Object.freeze({
  id: 'free-fortune-3m-20270212',
  endsAt: '2027-02-12T23:59:59+09:00',
  ctaHref: '/ggulggul/?action=cdOneStepFreeSajuEntry',
  sharePath: '/?utm_source=share&utm_medium=free_promo&utm_campaign=free_3m',
});

export const FREE_PROMO_COPY_KO = Object.freeze({
  badge: '3개월 한정 · 기본 운세 무료',
  title: '연이가 열어 둔 무료 운세 정원',
  until: '{date}까지 · 종료 후 유료 전환 예정',
  note: 'AI 상담·AI 풀이, 라이트 사주·대운 풀이, 사주 수호신, AI 사주 궁합 분석 등 가격이 표시된 항목은 무료에서 제외돼요.',
  cta: '무료 기본 사주 바로 보기',
  share: '친구에게도 무료일 때 알려주기',
  shareText: '만세력·자미두수·별자리 기본 풀이를 {date}까지 무료로 만나보세요.',
  copied: '링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요.',
  copyFailed: '링크를 복사하지 못했어요. 주소창의 링크를 복사해 주세요.',
  tileBadge: '3개월 한정 무료',
  bubble: '사주부터 타로와 세계 운세까지, 지금 만날 수 있는 무료 운세를 골라보세요',
  all: '무료 운세 전체 보기',
  start: '바로 시작하기',
  groupFun: '재밌는 사주 콘텐츠',
  groupClassic: '정통 사주',
  groupMore: '다른 운세',
  freeBadge: '무료',
  minutes: '약 {n}분',
});

// 2026-11-12 사용자 요청: 무료로 푼 내용을 구체적인 목록으로 보여 준다. 표시 전용 목록이다.
// 🔴 무료 여부를 여기서 정하지 않는다. 각 항목은 policyKey(lib/payment/free-fortune-policy.mjs 의 무료 키)나
//    freeStart(js/core/service-registry.js 의 '무료 시작'·'무료'·'차트 공개' 항목 id)로 이미 무료인 기능만 가리킨다.
//    __tests__/ui/free-promo.test.mjs 가 둘 다 확인한다. 정책에서 빠지면 여기서도 빼야 테스트가 통과한다.
// Campaign cards enter existing features directly. SEO explanation pages remain available separately.
export const FREE_PROMO_SAJU_ACTION = 'cdOneStepFreeSajuEntry';
export const FREE_PROMO_GROUPS = Object.freeze([
  { id: 'fun', labelKey: 'groupFun', items: [
    { id: 'brain', ko: '나의 뇌구조', policyKey: 'saju_brain_reading', action: 'cdOneStepFreeSajuEntry', target: 'destinyAnatomyCard' },
    { id: 'fourCut', ko: '사주 네컷', policyKey: 'saju_fun_shared', action: 'cdOneStepFreeSajuEntry', target: 'sajuFourCutCard' },
    { id: 'dopamine', ko: '도파민·집중력', policyKey: 'saju_fun_shared', action: 'cdOneStepFreeSajuEntry', target: 'dopamineCard' },
    { id: 'hormone', ko: '테토·에겐 바이브', policyKey: 'saju_fun_shared', action: 'cdOneStepFreeSajuEntry', target: 'hormone-vibe-section' },
    { id: 'tTest', ko: '극T 테스트', policyKey: 'saju_fun_shared', action: 'cdOneStepFreeSajuEntry', target: 'tTestCard' },
    { id: 'lotto', ko: '사주 로또 리추얼', policyKey: 'fun.quantumLotto.ritualReport', action: 'cdOneStepFreeSajuEntry', target: 'lottoCard' },
    { id: 'aiPrompt', ko: 'AI 프롬프트 카드', policyKey: 'saju_fun_shared', action: 'cdOneStepFreeSajuEntry', target: 'aiPromptCard' },
    { id: 'skillTree', ko: '인생 스킬 트리', policyKey: 'rpt_skillTreeCard', action: 'cdOneStepFreeSajuEntry', target: 'skillTreeCard' },
    { id: 'bias', ko: '최애운명', policyKey: 'destiny-bias-analyze', href: '/saju/destiny-bias/' },
    { id: 'animal', ko: '십이운성 동물점', policyKey: 'animal-destiny-unlock', href: '/saju/animal-destiny/' },
  ] },
  { id: 'classic', labelKey: 'groupClassic', items: [
    { id: 'natal', ko: '명식·12신살', policyKey: 'saju_natal_reading', action: 'cdOneStepFreeSajuEntry', target: 'sajuCard' },
    { id: 'seasonRhythm', ko: '절기 리듬', policyKey: 'saju_natal_reading', action: 'cdOneStepFreeSajuEntry', target: 'terms24Card' },
    { id: 'compat', ko: '사주 궁합', policyKey: 'section_compat', action: 'cdOneStepFreeSajuEntry', target: 'compatCard' },
    { id: 'manse', ko: '만세력', freeStart: 'manse', href: '/manse/' },
    { id: 'today', ko: '오늘의 운세', policyKey: 'daily-fortune-reading', href: '/today/' },
    { id: 'career', ko: '나의 일 스타일', policyKey: 'saju-career-style', href: '/saju/career-style/' },
  ] },
  { id: 'more', labelKey: 'groupMore', items: [
    { id: 'tarot', ko: '타로', freeStart: 'tarot', action: 'cdHomeTarotEntry' },
    { id: 'ziwei', ko: '자미두수', freeStart: 'ziwei', action: 'cdHomeZiweiEntry' },
    { id: 'sukuyo', ko: '숙요점', freeStart: 'sukuyo', action: 'cdHomeSukuyoEntry' },
    { id: 'vedic', ko: '베다점', freeStart: 'vedic', action: 'cdHomeVedicEntry' },
    { id: 'astro', ko: '점성술', freeStart: 'astrology', action: 'cdHomeAstroEntry' },
    { id: 'humanDesign', ko: '휴먼 디자인', policyKey: 'human_design_reading', href: '/human-design/' },
    { id: 'promptHub', ko: '프롬프트 생성기', policyKey: 'fortune-prompt-hub-generate', href: '/fortune/prompt-hub/' },
  ] },
].map(group => Object.freeze({ ...group, items: Object.freeze(group.items.map(item => Object.freeze(item))) })));

// 6단계(2026-11-21) 무료 운세 카드 목록의 표시 데이터. GUIDED_FREE_LIST_ENABLED 가 켜졌을 때 "무료 운세 전체 보기" 펼침에 쓴다.
// 🔴 표시 전용: 무료 여부·주소는 위 FREE_PROMO_GROUPS 와 정책 파일이 정한다. minutes 는 입력부터 첫 결과까지의 표시용 추정치(실측 아님).
// 포스터는 3:2(320×213). 번역은 freePromo.desc.<id>(i18n/authored/freePromo-01·02.json).
const SI = '/images/service-introductions/', FL = '/images/free-list/';
export const FREE_PROMO_CATALOG = Object.freeze(Object.fromEntries([
  ['brain', SI + 'saju-320.webp', '십성으로 내 머릿속 관심사 지도를 그려요', 2],
  ['fourCut', FL + 'four-cut-320.webp', '오늘의 일주 기운을 네 컷 문장으로 만들어요', 2],
  ['dopamine', FL + 'dopamine-320.webp', '내가 반응하는 자극과 몰입 분야를 살펴봐요', 2],
  ['hormone', FL + 'teto-egen-320.webp', '십성으로 테토·에겐 점수와 매력 결을 봐요', 2],
  ['tTest', FL + 't-test-320.webp', '사주로 내 논리 온도와 T 점수를 재요', 2],
  ['lotto', FL + 'lotto-ritual-320.webp', '오늘의 일진으로 재미용 상징 번호를 뽑아요', 2],
  ['aiPrompt', FL + 'ai-prompt-320.webp', '내 사주 결로 이미지 생성 문구를 만들어요', 2],
  ['skillTree', FL + 'skill-tree-320.webp', '오행을 RPG 능력치와 스킬로 바꿔 봐요', 2],
  ['bias', SI + 'bias-destiny-320.webp', '사주로 나와 잘 맞는 최애의 결을 찾아요', 2],
  ['animal', SI + 'animal-destiny-320.webp', '일주 십이운성으로 나의 수호 동물을 만나요', 2],
  ['natal', FL + 'natal-chart-320.webp', '네 기둥과 별의 자리로 나의 기질을 살펴봐요', 2],
  ['seasonRhythm', FL + 'season-rhythm-320.webp', '태어난 절기로 계절과 생활 리듬을 읽어요', 2],
  ['compat', FL + 'compatibility-320.webp', '두 사람의 사주로 궁합의 결을 살펴봐요', 3],
  ['manse', SI + 'manse-320.webp', '생년월일시로 만세력 명식을 바로 계산해요', 1],
  ['today', SI + 'daily-fortune-320.webp', '오늘의 흐름과 작은 실천을 확인해요', 1],
  ['career', FL + 'career-style-320.webp', '성향과 업무 조건을 여덟 장으로 정리해요', 3],
  ['tarot', SI + 'tarot-320.webp', '카드를 펼쳐 지금의 마음과 선택을 읽어요', 2],
  ['ziwei', SI + 'ziwei-320.webp', '열두 궁의 명반으로 타고난 흐름을 살펴봐요', 2],
  ['sukuyo', SI + 'sukuyo-320.webp', '달의 별자리로 나의 성향과 관계를 읽어요', 2],
  ['vedic', SI + 'vedic-320.webp', '태어난 순간의 하늘 지도로 기질을 살펴봐요', 2],
  ['astro', SI + 'astrology-320.webp', '행성과 하우스로 나의 성향을 살펴봐요', 2],
  ['humanDesign', SI + 'human-design-320.webp', '출생 데이터로 나의 에너지 설계도를 봐요', 2],
  ['promptHub', SI + 'fortune-prompt-hub-320.webp', '내 운세 정보를 AI에 물어볼 질문문으로 만들어요', 2],
].map(([id, image, description, minutes]) => [id, Object.freeze({ image, description, minutes })])));

// 칩·연이의 이동 주소. 셸 액션은 /ggulggul/ 정적 셸에서 실행된다(홈 / 는 React 라 액션을 모른다).
export function freePromoItemHref(item) {
  return item.href || '/ggulggul/?action=' + item.action + (item.target ? '&section=' + item.target : '');
}
export const FREE_PROMO_YEONI = Object.freeze({
  href: '/ggulggul/?action=' + FREE_PROMO_SAJU_ACTION,
  image: '/images/home/free-garden-yeoni-v1-960.webp',
  srcset: '/images/home/free-garden-yeoni-v1-480.webp 480w, /images/home/free-garden-yeoni-v1-640.webp 640w, /images/home/free-garden-yeoni-v1-960.webp 960w',
  sizes: '(max-width: 699px) min(340px, calc(100vw - 64px)), 440px',
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

// Presentation only; access continues to use free-fortune-policy.
// cta 는 카드마다 받는 결과 이름이다(2026-11-16, 예전에는 모두 '바로 시작하기'). 번역은 freePromo.action.<id>.
export const FREE_PROMO_FEATURED = Object.freeze([
  ['natal','saju','네 기둥과 별의 자리로 나의 기질을 살펴봐요','내 명식 보기'],
  ['tarot','tarot','카드를 펼쳐 지금의 마음과 선택을 읽어요','카드 뽑기'],
  ['ziwei','ziwei','열두 궁의 명반으로 타고난 흐름을 살펴봐요','내 명반 보기'],
  ['sukuyo','sukuyo','달의 별자리로 나의 성향과 관계를 읽어요','본명숙 보기'],
  ['vedic','vedic','태어난 순간의 하늘 지도로 기질을 살펴봐요','하늘 지도 보기'],
  ['astro','astrology','행성과 하우스로 나의 성향을 살펴봐요','출생 차트 보기'],
].map(([id,art,description,cta])=>Object.freeze({...FREE_PROMO_GROUPS.flatMap(g=>g.items).find(i=>i.id===id), serviceId:art, image:'/images/home/illustrated/method-'+art+'-160.webp',description,cta})));

export function freePromoEndDate(endsAt, locale) {
  return new Intl.DateTimeFormat(locale || 'ko-KR', {timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(endsAt));
}

export function freePromoEndDateIso(endsAt) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(endsAt));
}
