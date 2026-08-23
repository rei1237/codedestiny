/**
 * 기능 가이드 15종의 "실제 기능으로 가는" 1차 동선 정본.
 *
 * 왜 한곳에 모으는가 — /health-report/guide 는 12개 가이드 중 홀로 기능 링크가 0개였고
 * (칩 5개가 전부 정책·문서였다), 아무도 그것을 몰랐다. 페이지마다 인라인으로 흩어 두면
 * 같은 누락이 다시 조용히 생긴다. 여기 한 표에 두면 빠진 라우트가 눈에 보인다.
 *
 * href 규약:
 *   - `/?action=...` 은 정적 셸 딥링크다. 셸 런타임이 같은 이름의 [data-action] 타일을
 *     찾아 클릭한다(js/core/index-inline-runtime.js 의 __cdFindRouteActionElement).
 *     🔴 새 action 문자열을 발명하지 말 것 — 셸에 타일이 없으면 조용히 무반응이다.
 *     여기서 쓰는 3종은 index.html 에 타일이 실재함을 확인했다.
 *   - 🔴 타일이 **있다고 도는 것은 아니다.** 러너는 보이는 엘리먼트만 클릭한다.
 *     실측 2026-08-24(dist 정적 서버, 412x823): `checkPrivacyAndCalculate` 타일
 *     (index.html 의 #run-btn "무료 사주 분석 시작")은 입력 화면이 아직 안 열린 상태에서
 *     getBoundingClientRect 가 0x0 이라, 딥링크로 들어가면 본문이 한 글자도 안 바뀐다.
 *     그 액션은 /saju 의 생년월일 폼이 프로필을 심은 **뒤에** 넘겨받도록 설계된 것이다
 *     (lib/seo-landing-pages.js 의 saju.ctaHref). 그래서 사주 계산 계열 CTA 는 셸 액션이
 *     아니라 /saju·/manse 랜딩으로 보낸다 — 거기 폼이 실제 진입로다.
 *     반면 openTarotModal·openSukuyoModal·openAstroModal 은 딥링크만으로 모달이 열리는 것을
 *     같은 실측에서 확인했으므로 그대로 쓴다.
 *   - next/link 로 걸어도 된다. ShellHomeHardNavGuard 가 "/" 앵커를 캡처 단계에서 가로채
 *     쿼리를 보존한 채 문서 로드로 보낸다 — 하드 내비를 여기서 또 감싸지 말 것.
 *   - 그 외는 평범한 Next 라우트다.
 *
 * 라벨은 lib/seo-landing-pages.js 의 ctaLabel 보이스를 따른다.
 */
export const GUIDE_CTA_TARGETS = {
  "/saju/guide": {
    from: "saju-guide",
    kicker: "바로 해보기",
    heading: "읽었다면, 내 명식으로 확인해 보세요",
    body: "생년월일과 태어난 시각만 넣으면 네 기둥과 오행 분포가 바로 나옵니다.",
    primary: { href: "/saju", label: "무료로 사주 보기", note: "무료 · 가입 없이" },
    secondary: [
      { href: "/saju/basic", label: "기본 사주 해석" },
      { href: "/compatibility", label: "궁합 보기" },
    ],
  },
  "/saju/ten-gods": {
    from: "ten-gods-guide",
    kicker: "바로 해보기",
    heading: "내 사주에서 십신이 어떻게 놓였는지 보세요",
    body: "만세력으로 여덟 글자를 세우면 어떤 십신이 어느 자리에 앉았는지 확인할 수 있습니다.",
    primary: { href: "/manse", label: "무료로 만세력 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/saju/guide", label: "사주 기본 가이드" }],
  },
  "/saju/five-elements": {
    from: "five-elements-guide",
    kicker: "바로 해보기",
    heading: "내 오행은 어느 쪽으로 기울어 있을까요",
    body: "만세력으로 여덟 글자를 세우면 목화토금수의 분포와 계절감을 함께 볼 수 있습니다.",
    primary: { href: "/manse", label: "무료로 만세력 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/saju/guide", label: "사주 기본 가이드" }],
  },
  "/ziwei/guide": {
    from: "ziwei-guide",
    kicker: "바로 해보기",
    heading: "내 명반을 직접 펼쳐 보세요",
    body: "십이궁에 별이 어떻게 들어앉는지는 자기 명반을 놓고 볼 때 가장 빨리 이해됩니다.",
    primary: { href: "/ziwei/chart", label: "무료 자미두수 명반 만들기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/ziwei", label: "자미두수 소개" }],
  },
  "/sukuyo/guide": {
    from: "sukuyo-guide",
    kicker: "바로 해보기",
    heading: "내 본명숙부터 확인해 보세요",
    body: "27수 중 어느 자리에서 태어났는지 알면, 관계를 재는 거리 계산이 그때부터 시작됩니다.",
    primary: { href: "/?action=openSukuyoModal", label: "내 본명숙 27수 확인하기", note: "무료 · 가입 없이" },
    secondary: [
      { href: "/sukuyo/compatibility", label: "숙요 궁합" },
      { href: "/oracle/sukuyo", label: "숙요 오라클" },
    ],
  },
  "/astrology/guide": {
    from: "astrology-guide",
    kicker: "바로 해보기",
    heading: "내 출생차트를 그려 보세요",
    body: "하우스와 사인, 행성의 배치는 자기 차트를 펼쳐 놓고 읽을 때 비로소 연결됩니다.",
    primary: { href: "/?action=openAstroModal", label: "무료로 출생차트 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/astrology/cosmic", label: "코스믹 리딩" }],
  },
  "/vedic/guide": {
    from: "vedic-guide",
    kicker: "바로 해보기",
    heading: "내 나크샤트라부터 짚어 보세요",
    body: "라그나와 다샤를 읽기 전에, 달이 머문 27개 별자리 중 내 자리를 먼저 확인합니다.",
    primary: { href: "/nakshatra/calc", label: "내 나크샤트라 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/vedic/jyotish", label: "죠티시 리딩" }],
  },
  "/tarot/guide": {
    from: "tarot-guide",
    kicker: "바로 해보기",
    heading: "질문을 세웠다면, 카드를 뽑아 보세요",
    body: "좋은 질문은 뽑기 전에 만들어집니다. 준비가 됐다면 지금 한 장 열어 보세요.",
    primary: { href: "/?action=openTarotModal", label: "타로 카드 뽑기", note: "무료 · 가입 없이" },
    secondary: [
      { href: "/tarot/love", label: "연애 타로" },
      { href: "/tarot/reunion", label: "재회 타로" },
      { href: "/tarot/mindscan", label: "마음 읽기 타로" },
    ],
  },
  "/mayan-calendar/guide": {
    from: "mayan-calendar-guide",
    kicker: "바로 해보기",
    heading: "내 마야 인장을 확인해 보세요",
    body: "촐킨의 주기가 실제로 어떤 날에 걸리는지는 자기 생일을 넣어 볼 때 가장 분명합니다.",
    primary: { href: "/maya", label: "내 마야 인장 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/today", label: "오늘의 운세" }],
  },
  "/calendar/guide": {
    from: "calendar-guide",
    kicker: "바로 해보기",
    heading: "오늘의 일진부터 보고 오세요",
    body: "달력 읽는 법은 오늘 날짜에 대입해 볼 때 가장 빨리 손에 붙습니다.",
    primary: { href: "/today", label: "무료로 오늘의 운세 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/manse", label: "만세력 보기" }],
  },
  "/health-report/guide": {
    from: "health-report-guide",
    kicker: "바로 해보기",
    heading: "내 사주로 생활 리듬을 살펴보세요",
    // 🔴 명리 헬스 리포트는 독립 라우트가 아니라 사주 결과 화면 안의 카드다
    //    (index.html 의 #healthReportCard). 전용 data-action 이 없으므로 사주 계산으로
    //    보내고, 어디서 리포트가 열리는지 여기서 분명히 말한다.
    //    🔴 금액을 쓰지 말 것 — 이 가이드도 코드베이스도 지금 가격을 주장하지 않는다.
    body: "생년월일을 넣어 무료 사주 결과를 열면, 그 화면에서 명리 헬스 리포트 카드가 함께 열립니다.",
    primary: { href: "/saju", label: "무료로 사주 보기", note: "무료 · 가입 없이" },
    secondary: [
      { href: "/saju/five-elements", label: "오행 가이드" },
      { href: "/saju/guide", label: "사주 기본 가이드" },
    ],
  },
  "/music/guide": {
    from: "music-guide",
    kicker: "바로 들어보기",
    heading: "운세 테마 음악을 지금 틀어 보세요",
    body: "글로 읽은 감상 포인트는 실제로 한 곡을 틀어 놓고 확인할 때 가장 잘 남습니다.",
    primary: { href: "/music", label: "달빛 음악 들어보기", note: "무료" },
    secondary: [{ href: "/today", label: "오늘의 운세" }],
  },
  "/compare/fortune-apps": {
    from: "compare-fortune-apps",
    kicker: "직접 확인하기",
    // 🔴 이 페이지의 사실 가드가 우열 판정을 금지한다 — CTA 는 다음 행동만 말하고
    //    외부 서비스명을 넣지 않는다.
    heading: "같은 생년월일로 직접 비교해 보세요",
    body: "설명을 읽는 것보다, 하나의 입력으로 여러 체계를 나란히 돌려 보는 편이 빠릅니다.",
    primary: { href: "/fusion-fortune", label: "여러 체계 한 번에 보기" },
    secondary: [
      { href: "/saju", label: "사주" },
      { href: "/tarot", label: "타로" },
    ],
  },
  "/compare/saju-vs-ziwei": {
    from: "compare-saju-ziwei",
    kicker: "직접 확인하기",
    heading: "두 체계를 같은 생년월일로 놓고 보세요",
    body: "네 기둥과 십이궁이 같은 사람을 어떻게 다르게 그리는지는 나란히 볼 때 드러납니다.",
    primary: { href: "/saju", label: "무료로 사주 보기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/ziwei/chart", label: "자미두수 명반 만들기" }],
  },
  "/compare/sukuyo-vs-vedic": {
    from: "compare-sukuyo-vedic",
    kicker: "직접 확인하기",
    heading: "같은 27수를 두 방식으로 읽어 보세요",
    body: "한쪽은 관계의 거리를, 다른 쪽은 시간의 국면을 재는 눈금으로 씁니다.",
    primary: { href: "/?action=openSukuyoModal", label: "내 본명숙 27수 확인하기", note: "무료 · 가입 없이" },
    secondary: [{ href: "/nakshatra/calc", label: "내 나크샤트라 보기" }],
  },
};
