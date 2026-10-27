/**
 * 사주 서비스 모아보기 정본 (/saju/#services).
 *
 * "사주"로 들어온 사람이 꿀꿀운세의 사주 기능을 한곳에서 고를 수 있게 모은 순수 데이터다.
 * 그룹 순서가 곧 강약이다 — ① 대표 상담(카드) → ② 무료 → ③ 유료 리포트 → ④ 공부.
 *
 * 🔴 가격 문자열을 적지 않는다. 유료는 featureKey 만 두고 화면이 PriceBadge 로 결제 정본
 *    (worker/lib/paid-feature-registry.js)에서 읽는다. 무료는 free: true.
 * 🔴 registryIds 는 홈 서비스 레지스트리(js/core/service-registry.js)의 methods "saju" 항목과
 *    대조된다 — 레지스트리에 사주 상품을 더하면 여기에도 더해야 가드가 통과한다
 *    (__tests__/ui/saju-service-catalog.static.test.mjs). 레지스트리에 href 가 있으면 같은 href 다.
 * 🔴 "사주 상담"은 영냥이 랜딩이 갖는 검색 키워드다 — 이 목록의 이름·그룹 제목에 쓰지 않는다.
 */
export const SAJU_SERVICE_GROUPS = Object.freeze([
  {
    id: 'saju-signature',
    title: '사주로 읽는 대표 상담',
    lead: '처음이라면 이 여섯 장부터. 명식을 바탕으로 상담사가 깊게 풀어 드려요.',
    items: [
      { registryIds: ['neo-operation-room'], name: '네오의 팩폭 전략실', line: '반복되는 문제를 짚고 다음 행동을 정해요', href: '/neo-operation-room/', featureKey: 'neo-operation-room-consultation', image: '/images/feature-details/neo-operation-room-hero-v1.webp', hue: '#5d5299' },
      { registryIds: ['fortune-tea-house'], name: '연이의 운명 찻집', line: '복잡한 마음을 차분하게 풀어 봐요', href: '/fortune-tea-house/', featureKey: 'fortune-tea-house-tarot-consultation', image: '/images/home/yeoni-tea-together-v1-1200.webp', hue: '#b53660' },
      { registryIds: ['master-love-codex'], name: '마스터 인연의 서', line: '인연의 흐름과 만남의 시기를 읽어요', href: '/master-love-codex/', featureKey: 'master-love-codex', image: '/images/feature-details/master-love-codex-hero-v3.webp', hue: '#8a5a22' },
      { registryIds: ['love-secret-ai'], name: '연애 비책', line: '사주 근거로 연애 고민을 구체적으로', href: '/love-secret-ai/', featureKey: 'love-secret-ai-consultation', image: '/images/home/love-secret-masters-v1-600.webp', hue: '#b0476c' },
      { registryIds: ['new-year-ai'], name: '신년운세', line: '올해의 세운과 시기별 흐름을 미리', href: '/new-year-ai-consultation/', featureKey: 'new-year-ai-consultation', image: '/images/home/new-year-neo-v1-600.webp', hue: '#2e6f62' },
      { registryIds: ['life-book-ai'], name: '인생의 책', line: '기질과 인생의 방향을 긴 흐름으로', href: '/life-book-ai/', featureKey: 'life-book-ai-consultation', image: '/images/home/life-book-yun-v2-600.webp', hue: '#2f6a44' },
    ],
  },
  {
    id: 'saju-free',
    title: '무료로 바로 보기',
    lead: '무료 콘텐츠를 골라 보세요. 나의 일 스타일은 가입 후 프로필 카드로 이용합니다.',
    items: [
      { registryIds: ['career-style'], name: '나의 일 스타일', line: '가입 후 무료 · 성향과 업무 조건을 여덟 장으로', href: '/saju/career-style/', free: true, image: '/images/career-style/yeoni-work-style.webp' },
      { registryIds: ['saju'], name: '무료 사주 풀이', line: '사주팔자·오행·십성·대운을 한 번에', href: '/?action=cdOneStepFreeSajuEntry', free: true },
      { registryIds: ['manse'], name: '만세력', line: '내 명식과 절기·음력 날짜 확인', href: '/manse/', free: true },
      { registryIds: [], name: '사주 궁합', line: '두 사람의 일간·오행으로 보는 궁합', href: '/saju/compatibility/', free: true },
      { registryIds: ['daily-fortune', 'today-hub'], name: '오늘의 운세', line: '오늘의 일진과 하루 흐름', href: '/today/', free: true },
      { registryIds: [], name: '사주 FPTI', line: '사주로 보는 나의 성향 유형', href: '/saju-fpti/', free: true },
      { registryIds: ['famous-saju'], name: '유명인 사주', line: '셀럽의 명식으로 보는 사주 읽기', href: '/insights/famous-saju/', free: true },
      { registryIds: ['luck-sync-diary'], name: '운기 다이어리와 플래너', line: '내 운의 흐름에 맞춰 기록하고 계획', href: '/diary/', free: true },
    ],
  },
  {
    id: 'saju-reports',
    title: '사주 리포트 더 보기',
    lead: '궁금한 주제가 분명할 때 고르는 사주 기반 리포트예요.',
    items: [
      { registryIds: ['saju-sibyl'], name: '시빌라 연간 대비 리포트', line: '한 해를 미리 대비하는 심층 리포트', href: '/saju/sibyl/', featureKey: 'premium-sibyl-dominator' },
      { registryIds: [], name: '영냥이 사주 풀이', line: '영냥이가 생선 등급별로 풀어 주는 사주', href: '/yeongnyangi/1000-won-fortune/' },
      { registryIds: ['destiny-compass'], name: '운명의 나침반', line: '갈림길에서 오늘의 방향 찾기', href: '/destiny-compass/', featureKey: 'destiny-compass-life-voyage' },
      { registryIds: [], name: '사주로 보는 인연의 장소', line: '인연을 만날 가능성이 큰 곳', href: '/saju/destiny-meeting-place/', featureKey: 'destiny_meeting_place' },
      { registryIds: [], name: '최애운명', line: '내 최애와 나의 사주 케미', href: '/saju/destiny-bias/', featureKey: 'destiny-bias-analyze' },
      { registryIds: ['saju-guardian'], name: '사주 가디언 소환진', line: '일주로 불러내는 나의 수호 인장', href: '/saju-guardian/', featureKey: 'saju-guardian-unlock' },
      { registryIds: ['animal-destiny'], name: '십이운성 동물점', line: '십이운성으로 찾는 나의 수호동물', href: '/saju/animal-destiny/', featureKey: 'animal-destiny-unlock' },
      { registryIds: [], name: '사주 뇌구조와 운명 구조도', line: '십성으로 그려 보는 내 머릿속', href: '/saju/destiny-anatomy/' },
      { registryIds: ['naming-ai'], name: '전문가 작명소', line: '사주와 성명학으로 이름 짓기', href: '/naming-ai/', featureKey: 'premium-naming-prompt' },
      { registryIds: [], name: '반려동물 사주', line: '우리 아이의 기질과 나와의 궁합', href: '/pet-saju.html', featureKey: 'pet-saju-ai-consultation' },
      { registryIds: ['fusion-fortune'], name: '초융합 심층 리딩', line: '사주를 포함한 여섯 체계 교차 해석', href: '/fusion-fortune/', featureKey: 'fusion-fortune-consultation' },
    ],
  },
  {
    id: 'saju-study',
    title: '사주 공부하기',
    lead: '내 명식을 스스로 읽고 싶을 때.',
    items: [
      { registryIds: [], name: '사주 명리학 기본 가이드', line: '네 기둥과 여덟 글자부터', href: '/saju/guide/', free: true },
      { registryIds: [], name: '기초 사주 읽기', line: '명식·오행·십성을 차례로', href: '/saju/#landing-guide', free: true },
      { registryIds: [], name: '십신(십성) 알아보기', line: '열 가지 관계 언어', href: '/saju/ten-gods/', free: true },
      { registryIds: [], name: '오행 알아보기', line: '목·화·토·금·수의 균형', href: '/saju/five-elements/', free: true },
      { registryIds: [], name: '사주 인사이트 허브', line: '사주 공부·만세력 보는 법·월별 흐름', href: '/insights/saju/', free: true },
    ],
  },
]);

export const SAJU_SERVICE_ITEMS = Object.freeze(SAJU_SERVICE_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.id }))));
