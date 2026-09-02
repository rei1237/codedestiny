# impeccable 캘리브레이션 · UI/UX 표준 상세

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## 디자인 스킬 (impeccable)

UI/UX 관련 요청(디자인/리디자인/비평/감사/폴리싱/애니메이션/컬러/타이포/레이아웃 등 프론트엔드 개선 전반)은 항상 `impeccable` 스킬(`.claude/skills/impeccable/`)을 사용한다.

**🔴 훅 캘리브레이션 (2026-07-22, 되돌리지 말 것)**: 감지 훅이 앱 전역에서 14,612건을 뱉었는데 그중 **14,333건(98.1%)이 팔레트 드리프트 3종**이었다. 원인은 코드가 아니라 규칙이 이 프로젝트와 구조적으로 안 맞기 때문이며, 그대로 두면 "지적 해소"를 위해 브랜드 색을 갈아엎게 된다. `.impeccable/config.json`의 `ignoreRules` 4종은 그 결론이다 — 임의 억제가 아니므로 근거 없이 되살리지 말 것.
- `design-system-color`(12,991): 알파 1 미만 반투명 베일(글로우·글래스 표면, 236종)까지 "미등록 팔레트 색"으로 셈. 오버레이는 팔레트가 아니라 깊이 표현 기법이다(DESIGN.md *The Veil Rule*).
- `design-system-radius`(1,076): 실제 코드가 1~94px 42종을 쓰는데 DESIGN.md는 8/16/999px 3종만 선언. 만족시키려면 전면 토큰 마이그레이션(=대규모 시각 리팩터)이 필요해 비용이 이득을 넘는다.
- `ai-color-palette`(40) / `cream-palette`: 규칙이 "purple/violet 그라디언트, cyan-on-dark, 크림/베이지"를 AI 슬롭으로 판정하는데, 그게 **정확히 네오(트와일라잇 바이올렛)·DEST1NOVA(시안)·연이(크림) 브랜드 정체성**이다. 정면 충돌하는 오탐.
- **끄지 않은 것 = 계속 지켜야 할 기준**: `gray-on-color`(대비), `low-contrast`, `tiny-text`, `line-length`, `text-overflow`, `layout-transition`(성능), `broken-image`, `skipped-heading`, `gradient-text`(DESIGN.md donts와 일치) 등. 캘리브레이션 후 전역 239건만 남으며 전부 실제 조치 대상이다.
- 폰트는 억제가 아니라 **문서화로 해결**했다(266건 → 0). DESIGN.md `typography`에 실제 사용 서체(Cinzel·Orbitron·SUIT·MaruBuri 등)를 `brand-*` 역할로 선언. 새 서체를 도입하면 여기에도 추가한다.
- **대비 수정 방법**: DESIGN.md "대비·가시성 기준"(데스크탑 WCAG AA: 본문 4.5:1, 큰 텍스트·UI 3:1) 를 따르되, *The Hue-Stays Rule* — 대비를 맞추려고 **색상 계열을 바꾸지 말고 명도/채도만** 조정한다. 회색·검정으로 도망가는 것은 오답. 단축 커맨드 `/audit`, `/critique`, `/polish`가 등록되어 있고, 나머지 명령은 `/impeccable <command> [target]` 형태로 호출한다(전체 목록은 `/impeccable` 단독 실행). 프로젝트 전략/브랜드 컨텍스트는 루트 `PRODUCT.md`(register: product, 브랜드 성격: 따뜻함·전문성·신비로움), 시각 시스템은 루트 `DESIGN.md`(연이=핑크 계열, 네오=퍼플 달빛 두 페르소나, Glow-Not-Shadow 규칙 등)를 참고한다. `.tsx`/`.jsx`/`.css`/`.html` 등 UI 파일을 Edit/Write/MultiEdit하면 디자인 감지 후크가 자동으로 실행되어 문제를 시스템 리마인더로 알려준다(`.claude/settings.json`의 `hooks.PostToolUse`, `.impeccable/config.json`에서 on/off·예외 관리).

## UI/UX Standards

- 🔴 **모바일 최적화 = 인체공학만 (UI 재디자인 금지)**: 모바일 전용 공용 래퍼(`MobileFeatureDetail` / `styles/mobile-lite.css`)는 **탭 타깃(44px)·입력 폰트(16px, iOS 확대 방지)·가로 오버플로 방지·세이프에어리어**까지만 다룬다. 기능이 소유한 요소의 색·타이포·배경·테두리·위치(`sticky`/`fixed`)를 덮거나, 마크업에 없는 배지를 `content: attr()` 로 주입하지 않는다. **기능 화면은 모바일에서도 데스크탑과 같은 자기 디자인으로 보여야 한다.** 특정 기능의 모바일 문제는 공용 래퍼가 아니라 **그 기능의 CSS 에서** 고친다(래퍼로 덮으면 나머지 17개 기능이 함께 망가진다 — 2026-07 sticky 이름판·팔레트 재도색 사고). 가드: `npm run verify:mobile-detail-nonintrusive`(CI 차단) + `npm run verify:mobile-detail-render`(실렌더). 계약: [MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md](../../MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md)
- 🔴 **몰입형 기본(신규 기능 전면 적용)**: 앞으로 추가하는 모든 신규 기능/페이지/화면은 **전역 헤더·푸터 없이 몰입형(immersive)으로 제작한다.** 공용 사이트 헤더(네비게이션 바)와 푸터를 붙이지 말고, 해당 기능 자체의 몰입 경험(풀블리드 배경·자체 상단바/뒤로가기·자체 CTA)으로 화면을 채운다. 기존 헤더/푸터가 이미 붙은 화면을 수정할 때만 그 구조를 존중하고, 신규 화면에는 새로 도입하지 않는다 — 특정 기능에 헤더/푸터가 꼭 필요해 보이면 추측하지 말고 먼저 사용자에게 확인한다.
- 🔴 **생년 정보 자동 입력(프로필 카드) — 필수, 신규·기존 공통**: 생년월일·태어난 시각·성별·양/음력 등 생년 정보를 입력받는 **모든 기능**은 공용 훅 `app/hooks/useAiProfileSeed.ts`(변환 `seedFromDestinyProfile`, 저장 `app/_lib/profile-card-storage.ts`)로 **현재 선택된 프로필 카드에서 자동 프리필**한다. 사용자가 이미 입력·편집한 값은 덮어쓰지 않는다(빈 값만 채움). 비로그인·프로필 없음이면 수동 입력으로 폴백하고, 프로필 전환(`destinyProfileChanged` 이벤트)은 자동 반영한다. **프로필 조회/시드 로직을 새로 만들지 말고 이 훅을 재사용**한다(중복 구현 금지). 참조: `app/astrology-ai/AstrologyAiClient.tsx`, `app/destiny-compass/_components/CompassApp.tsx`(BirthGate).
- 애니메이션은 Tailwind `transition-*`/`animate-*` 클래스만 (외부 라이브러리 신규 도입 지양 — 단 `framer-motion`은 기존 의존성으로 이미 사용 중)
- 모바일 퍼스트: `sm:` → `md:` → `lg:` 순서로 작성
- 다크모드 `dark:` 병행 필수
- 이미지 `alt` 속성 필수, 인터랙티브 버튼 `aria-label` 필수
- **연이/네오 테마 분기(`.neo-mode` 클래스, `styles/theme-tokens.css`)는 루트 셸(`index.html`과 그 6개 미러: `public/index.html`, `public/{en,ja,zh,static}/index.html`)에만 적용되는 규칙이다.**
  - **두 모드를 가르는 축은 명도가 아니라 색상 계열이다** (2026-07 개정 — 이전의 "연이는 항상 밝게, 다크 표면 금지" 규칙은 폐기).
    - **연이(pig) = 핑크 계열.** 로즈 크림슨(`#b31955`)·로즈(`#f4bed1`)·크림(`#fffaf7`/`#fff3f8`)·샴페인 골드(`#ead089`)를 쓴다. **밝은 배경이 기본이지만 어두운 배경도 허용한다** — 대신 그 다크는 반드시 **핑크·와인 계열**(예: 딥 플럼/버건디)이어야 하고 네이비·퍼플로 새면 안 된다.
    - **네오 = 퍼플 계열.** 미드나잇 잉크(`#0a0818`/`#13102a`) + 트와일라잇 바이올렛(`#c4b5fd`/`#a78bfa`) + 샴페인 골드(`#e8d5a3`).
  - **밝은 글씨를 쓰면 배경은 어두워야 한다** — 이건 위반이 아니라 당연한 짝이다. 진짜 금지는 **배경만 바꾸고 글자색을 안 바꾸는 반쪽 오버라이드**다(가독성 붕괴의 주원인). 표면·텍스트·강조색을 항상 한 세트로 함께 바꾼다.
  - 본문 텍스트 명암비는 어느 모드·어느 명도에서든 **4.5:1 이상**을 지킨다.
  - 🔴 **impeccable 훅은 대비를 못 잡는다 — 이걸 "검사 통과"로 읽지 말 것.** `low-contrast` 룰은 브라우저·스크린샷 엔진에만 있고, 파일 저장 시 도는 정적 엔진에는 대비 룰이 아예 없다(색 관련은 리터럴 `text-gray-*` 정규식인 `gray-on-color` 하나뿐). `.impeccable/config.json` 에 켜는 옵션도 없다. 그래서 눈에 안 보이는 화면에도 "No design-quality issues found" 가 그대로 나온다. `ignoreRules` 4종과는 무관한 기능 공백이므로 **억제를 풀어서 해결하려 하지 말 것**(오탐 14,333건이 돌아온다).
  - 그 공백을 메우는 가드가 **`npm run verify:hero-contrast`** 다. 컴포넌트가 **토큰 밖에서 어두운 불투명 배경을 직접 칠하고**(예: 히어로의 `bg-[linear-gradient(...rgba(38,16,28,.98)...)]`) 그 위 글자는 스킴에 따라 뒤집히는 토큰(`text-[var(--x)]`)을 쓰면, 라이트 모드에서 배경만 어두워지고 잉크는 라이트용으로 남는 반쪽 오버라이드가 된다(연애 비책 AI 히어로 실측 **1.11:1**). 3:1 미만이면 실패, 3~4.5:1 은 경고. 자기 배경을 칠하는 요소(CTA·칩)는 대상에서 제외된다. **UI 수정 시 `verify:mobile-detail-nonintrusive` 와 함께 돌린다.**
  - 고치는 법은 글자색만 유틸로 덮는 게 아니라, CSS 모듈에 **무조건부 토큰 스코프**를 만들어 surface·text·accent 를 세트로 교체하고 배경을 칠하는 래퍼에 그 클래스를 다는 것이다(정본 예시: `app/love-secret-ai/love-secret-theme.module.css` 의 `.onDark`). 유틸로 한 곳씩 고치면 다음에 하나 빠뜨렸을 때 같은 버그가 재발한다.
  - **연이 다크 팔레트 정본**은 `DESIGN.md`의 "연이 Dark(핑크 다크)" 절 — 딥 플럼 `#3a0e28`→`#24081a`, 텍스트 `#fff1f7`, 테두리 `rgba(244,190,209,.38)`. 새로 어두운 표면을 만들 때 이 값을 쓴다.
  - **대표 사례**: 로그인 사용자 카드(`.cd-user-card`)는 두 모드가 **구조·레이아웃은 동일하고 색 계열만 다르다**(연이=핑크 다크, 네오=퍼플 다크). 확정 규칙은 `index.html` 문서 끝의 `cd-user-card-yeon-pink-v20260721` 블록 — 앞쪽 블록들에 연이용 밝은 오버라이드가 `!important`로 흩어져 있어 여기서 최종 확정한다. 되돌리지 말 것.
  - **달빛 예화(月花) 라인아트**(홈 히어로 문양·달·섹션 구분선, 2026-09-03): SVG data-URI `mask-image` 마스크는 손으로 고치지 말고 `node scripts/design/gen-yehwa-motifs.mjs` 로 `styles/yehwa-motifs.css` 를 **재생성**한다(`--check` 가 드리프트를 잡고 `__tests__/ui/home-yehwa-motifs.static.test.js` 가 그것을 돌린다). 네오는 같은 마스크를 `html.neo-mode body …` 에서 샴페인골드로 재도색만 한다. 토큰 정본은 `DESIGN.md` §2 "달빛 예화 모티프".
- **개별 기능(App Router 페이지·React 컴포넌트)은 원칙적으로 연이/네오 분기가 필요 없다** — 대신 일반 `dark:`(시스템 다크모드) 클래스만 병행하면 된다. 이미 `.neo-mode`를 참조하는 기존 화면(예: 운명 찻집 히어로, 메인 마스코트 동기화)을 수정할 때만 그 화면의 기존 분기 로직을 유지·존중하고, 신규 기능에 연이/네오 분기를 새로 도입하지 않는다 — 필요해 보이면 먼저 사용자에게 확인한다.
- 🔴 **그 결과 App Router 는 네오 단일 세계다 — 셸에서 테마를 바꿔도 따라오지 않는다.** 위 규칙(분기는 루트 셸에만)의 필연적 귀결인데, 이걸 결함으로 오인해 "테마 토글을 붙이자"로 가는 일이 반복돼 여기 실측과 함께 못 박는다.
  - **실측 2026-08-24** (스테이징, `localStorage.fortuneThemeModeStateV1` 을 `pig`/`neo` 로 바꿔 픽셀 대조): `/health-report/guide` · `/about` · `/privacy-policy` · `/saju` · `/destiny-compass` 는 **차이 0**, `/fortune-chat` 은 차이 10(노이즈). 즉 **테마에 반응하는 App Router 라우트는 사실상 없다.**
  - `app/layout.js` 의 인라인 스크립트가 `data-cd-theme="neo"` 를 `<html>` 에 달기는 한다. 그게 `styles/theme-tokens.css` 의 `--cd-*` 페르소나 토큰을 뒤집지만, **App Router 에서 그 토큰을 읽는 파일이 5개뿐**이고(`destiny-compass` 2 · `fortune-chat` 1 · `app/home-cosmic.module.css`) 그중 홈 모듈은 셸 승격 탓에 렌더되지 않는다. 그래서 속성이 붙어도 화면은 그대로다 — **죽은 배선이 아니라 도달 범위가 없는 배선**이다. 지우지 말 것: 셸과 키를 공유하므로 앞으로 토큰을 쓰는 화면이 생기면 그때 살아난다.
  - 규모 실측(같은 날, `origin/main`): App Router 라우트 **219개** / 하드코딩 hex 를 가진 파일 **284개**(값 **6,304개**) / 테마를 참조하는 파일 **2개**(하나는 진단용). 즉 "App Router 가 연이 라이트를 지원하게 만든다"는 284파일짜리 프로젝트이며, 부분 적용은 반쪽만 바뀐 화면을 만든다. **하려면 별도 계획으로 하고, 곁다리로 시작하지 말 것.**
  - 몰입형 43개 라우트는 애초에 자기 팔레트를 갖는 다크가 의도다(위 "몰입형 기본"). 그래서 App Router 가 네오로 고정된 것은 사고가 아니라 **정합된 상태**다.
  - 문서형 표면이 네오를 소비하는 방식은 **사설 네임스페이스 무조건부 스코프**다 — 가이드 15종 `--gd-*`(`styles/globals.css` 의 `.cd-guide`), 푸터 `--sfh-*`(`app/components/SiteFooterHub.module.css`), 하단 탭바(`styles/mobile-bottom-nav.css`). 전역 `--cd-*` 를 서브트리에서 덮지 않는 이유는 나중에 공용 위젯이 그 안에 들어왔을 때 조용히 뒤집히는 원격 작용을 막기 위해서다.
- **모바일 컬렉션 카드는 2열 16:9 포스터 그리드 + 이미지 노출** (2026-07 개정 — 이전의 "심볼 우선, 모바일 이미지 미로딩" 규칙은 폐기). 데스크톱과 동일하게 전 컬렉션의 대표 이미지를 보여준다. 심볼(`.tarot-tile__img-placeholder`)은 이미지가 아직 없거나 로드 실패했을 때의 폴백 전용.
  - **비율은 16:9 고정** — 원본 아트가 전부 가로 배너(1300~1500px)이고 그림 안에 제목 문구가 박혀 있어, 세로 포스터로 크롭하면 좌우 캐릭터와 제목이 잘린다. 세로 비율로 바꾸지 말 것.
  - **성능 보전 3종**: ① 컬렉션은 접힌 채 시작하고 열릴 때만 하이드레이션(`cd:collection-toggle` → `__cdScheduleCollectionHydration`) ② `IntersectionObserver`로 뷰포트 진입분만 ③ Cloudflare Image Resizing(`/cdn-cgi/image/width=...`)으로 카드 크기에 맞춰 축소 수신(장당 150~200KB → 16~26KB). 실패 시 원본 R2 → 심볼 순으로 폴백.
  - **주의 — 지연 장치를 두 개 걸지 말 것**: 하이드레이션이 이미 IO로 게이트되므로 생성하는 `<img>`는 `loading="eager"`여야 한다. `lazy`를 함께 걸면 요청이 영영 나가지 않는다. 마크업에 정적으로 박힌 `loading="lazy"` 이미지도 닫힌 컬렉션 안에서 파싱되면 열려도 요청이 안 나가므로, 하이드레이션이 노드를 새로 붙여 깨운다.
  - 구현 정본: `js/core/index-inline-runtime.js`·`js/core/uiBindings.js`의 `__(cd)HydrateCollectionImagesChunked` / `buildResizedCollectionImageUrl`. 그리드 열 수의 실제 정본은 CSS가 아니라 `index.html` `classifyCards()`의 인라인 `grid-template-columns` (인라인 `!important`라 CSS보다 셈).

## 모바일 · 몰입형 경험 (2026-08-28 `AGENTS.md` 에서 이관)

- 🔴 **모바일 UI 회귀는 고위험이다.** 라우트 동작 · safe area · 터치 타깃 · 앱 결제 라우팅을 보존한다.
- **몰입형 React 운세 경험**은 공용 헤더·푸터·모바일 하단 내비게이션을 렌더하지 않는다. 대신 페이지 안에서 접근 가능한 홈·뒤로가기 이탈 제어를 제공한다.
