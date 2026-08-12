---
name: Code Destiny
description: AI 기반 사주·타로·점성술 운세 서비스 — 연이(핑크 계열)와 네오(퍼플 달빛) 듀얼 페르소나 디자인 시스템
colors:
  yeon-bg: "#fffaf7"
  yeon-bg-deep: "#fff3f8"
  yeon-text: "#3c1830"
  yeon-text-muted: "#70445c"
  yeon-accent: "#b31955"
  yeon-accent-soft: "#f4bed1"
  yeon-gold: "#ead089"
  yeon-gold-soft: "#fff8dc"
  neo-bg: "#0a0818"
  neo-bg-deep: "#13102a"
  neo-text: "#f4eeff"
  neo-text-muted: "#c8aaff"
  neo-accent: "#c4b5fd"
  neo-accent-soft: "#a78bfa"
  neo-gold: "#e8d5a3"
  legacy-midnight-ink: "#0A0E1A"
  legacy-deep-indigo: "#1B2340"
  legacy-moonveil-silver: "#A8B3C7"
  legacy-pearl-mist: "#EDEFF5"
typography:
  display:
    fontFamily: "'CodeDestinyDisplay', var(--font-body)"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'CodeDestinyBody', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "-0.01em"
  premium:
    fontFamily: "'CodeDestinySerifKR', var(--font-display)"
    lineHeight: 1.75
  label:
    fontFamily: "var(--font-body)"
    fontSize: "0.78rem"
    fontWeight: 700
  brand-serif:
    fontFamily: "'CodeDestinySerifLatin', 'CodeDestinySerifKR', 'Cinzel Decorative', 'Cormorant Garamond', 'Nanum Myeongjo', 'Gowun Batang', 'KoPub Batang', 'Noto Serif KR', 'Noto Serif JP', Georgia, 'Times New Roman', serif"
    note: "CodeDestinySerifLatin = Cinzel(OFL) 라틴, CodeDestinySerifKR = Nanum Myeongjo(OFL) 한글. Latin을 앞에 두는 이유: Cinzel unicode-range에 한글이 없어 한글은 자동으로 KR로 내려가고, 영문 킥커는 의도한 Cinzel로 렌더된다(순서를 뒤집으면 ASCII를 포함한 KR 청크가 먼저 걸려 영문까지 명조가 된다). @font-face는 Google과 동일한 unicode-range 청크 94개를 R2(assets.code-destiny.com/fonts/)로 미러링한 생성물 styles/fonts-serif.css에 있다 — 셸은 link, App Router는 globals.css @import. 손으로 고치지 말고 'node scripts/build-serif-font-assets.mjs'로 재생성하고, 'npm run verify:r2-fonts'(Pages 배포 게이트)로 R2 존재+CSP font-src 정합을 확인한다. 라이선스 고지: assets.code-destiny.com/fonts/OFL.txt. 사용처: 홈 .cd-home-guide 킥커/제목, destiny-compass 제목/킥커(var(--font-serif))."
  brand-han:
    fontFamily: "'CodeDestinyHan', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans CJK KR', 'Noto Sans KR', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei'"
    note: "한자 전용 폴백. styles/globals.css 의 @font-face 'CodeDestinyHan' 은 OS 내장 폰트만 local()로 잡고 unicode-range 를 한자 블록(U+2E80-2FDF, U+3005-3007, U+3021-3029, U+3400-4DBF, U+4E00-9FFF, U+F900-FAFF)으로 제한한다. --font-body/display/premium/playful/decorative/serif 스택 맨 앞에 두는 이유: 브랜드 서체(Pretendard·Mulmaru·Gowun Dodum·Nanum Myeongjo)에 한자가 없거나 불완전해 작명첩 한자 이름·자미두수 命宮/紫微斗數 병기가 두부(□)로 뜨거나 화면마다 다르게 렌더됐다. unicode-range 덕에 한글·라틴 렌더링은 영향 없음. 웹폰트 다운로드도 CSP 변경도 없다."
  brand-tech:
    fontFamily: "'Orbitron', 'Space Grotesk', 'Share Tech Mono', 'NeoDunggeunmo', 'Courier New', monospace"
  brand-korean:
    fontFamily: "'Pretendard Variable', 'SUIT', 'MaruBuri', 'Gowun Dodum', 'Noto Sans KR', Arial, sans-serif"
  brand-korean-next:
    fontFamily: "'noto_sans_kr', 'noto_serif_kr', sans-serif"
  brand-feature:
    fontFamily: "'CodeDestinyDecorative', 'CodeDestinyPlayful', 'CodeDestinyNumerologyDisplay', 'CodeDestinyNumerologyPremium', 'Impact', 'Apple Color Emoji', sans-serif"
rounded:
  sm: "8px"
  md: "16px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.yeon-gold}"
    textColor: "{colors.yeon-text}"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  button-primary-neo:
    backgroundColor: "{colors.neo-accent}"
    textColor: "{colors.neo-bg}"
    rounded: "{rounded.pill}"
    padding: "12px 28px"
  toggle-pill:
    backgroundColor: "transparent"
    textColor: "{colors.yeon-text}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: Code Destiny

## 1. Overview

**Creative North Star: "달빛 아래 두 권의 책"**

Code Destiny는 한 명의 사용자가 언제든 펼쳐볼 수 있는 두 권의 책을 가진 서재다. 한쪽은 **연이**의 핑크 표지(로즈·크림·골드, 필요하면 딥 플럼 다크까지), 다른 쪽은 **네오**의 퍼플 표지(미드나잇 잉크·라벤더·샴페인 골드)가 같은 이야기를 다른 색으로 들려준다. 두 표지를 가르는 것은 밝기가 아니라 색상 계열이다. 두 표지는 서로 다른 무드지만 같은 목소리 — 따뜻함, 명리학·점성술에 근거한 전문성, 그리고 몰입감 있는 신비로움 — 를 낸다. `PagedResultViewer`의 책장 넘김 인터랙션이 이 은유를 그대로 실체화한다.

이 시스템이 명시적으로 거부하는 것: 제네릭 AI SaaS 룩(근백색 크림 배경 + 그라디언트 텍스트 + 사이드스트라이프 카드 + 동일 카드 그리드 + 섹션마다 반복되는 eyebrow/번호 스캐폴딩), 그리고 클리셰 타로 사이트의 상투적 보라 그라디언트 배경. 신비로움은 절제된 컬러 글로우와 타이포그래피로 표현하지, 값싼 그라디언트로 때우지 않는다.

**Key Characteristics:**
- 하나의 서비스, 두 개의 표지(연이/네오) — 절대 반쪽만 전환되지 않는다
- 그림자보다 글로우: 깊이는 회색 드롭섀도가 아니라 브랜드 색 글로우로 표현
- 구조(레이아웃 CSS)와 색(caller className)의 분리 — 컴포넌트는 중립으로 짜고 페르소나가 색을 입힌다
- 부드러운 필(pill) 형태의 인터랙티브 요소, 과하지 않은 절제된 터치

## 2. Colors

두 페르소나가 같은 역할(bg/surface/text/accent/gold)을 각자의 값으로 채우는 구조. 전환은 `data-cd-theme="neo"` 속성 또는 `body.neo-mode` 클래스, `localStorage`의 `fortuneThemeModeStateV1` 키(`pig`|`neo`)로 이뤄진다. `styles/theme-tokens.css`의 `--cd-*` CSS 커스텀 프로퍼티가 정본이다.

### Primary — 연이 (핑크 계열)
- **Rose Crimson** (`#b31955`): 연이 모드의 유일한 강조색. CTA, 활성 상태, 포인트 텍스트.
- **Champagne Gold — Yeon** (`#ead089` / soft `#fff8dc`): CTA 그라디언트와 골드 포인트.
- **연이를 정의하는 것은 명도가 아니라 색상 계열이다.** 밝은 크림 배경이 기본이지만, 대비를 위해 어두운 표면이 필요하면 **핑크·와인 계열 다크**(딥 플럼·버건디)를 쓴다. 네이비·퍼플로 새면 그 순간 네오가 된다.

### Primary — 네오 (달빛 다크)
- **Twilight Violet** (`#c4b5fd` / soft `#a78bfa`): 네오 모드의 유일한 강조색이자 `violet-neon` 글로우의 근원.
- **Champagne Gold — Neo** (`#e8d5a3`): 네오 모드 골드 포인트, `moon-glow` 그림자의 근원.
- **Ice Blue — Neo** (`#7dd3fc`, 실사용은 항상 반투명 `rgba(125,211,252,.16~.55)`): 네오의 **보조 글로우**. 강조색이 아니므로 본문 텍스트나 버튼 배경에 쓰지 않는다(One Accent Rule — 모드당 강조색은 바이올렛 하나). 허용 자리는 포커스 링, 선택된 카드의 외곽 글로우, 다크 표면 위 은은한 상단 광원뿐이다. 도입 배경: 연이 상담 채팅(`app/fortune-chat`)에서 네오로 전환할 때 "푸른빛"이 느껴지되 퍼플 계열을 벗어나지 않게 한 겹 더한 것.

### Neutral
- **연이 Cream** (`#fffaf7` → `#fff3f8` 그라디언트): 연이 밝은 배경(기본).
- **연이 Ink** (`#3c1830`, muted `#70445c`): 밝은 배경 위 연이 본문 텍스트.
- **네오 Midnight Ink** (`#0a0818` → `#13102a` 그라디언트): 네오 배경.
- **네오 Pearl Violet** (`#f4eeff`, muted `rgba(200,170,255,.7)`): 네오 본문 텍스트.

### 연이 Dark (핑크 다크 — 어두운 표면이 필요할 때)
연이에서도 대비를 위해 어두운 표면을 쓸 수 있다. 그 다크는 네이비·퍼플이 아니라 **딥 플럼/버건디**다.
- **연이 Deep Plum** (`#3a0e28` → `#24081a` 그라디언트, 상단 글로우 `rgba(174,45,104,.32)`): 연이 다크 표면.
- **연이 Blush Ink** (`#fff1f7`, muted `rgba(255,214,232,.86)`, 강조 `rgba(255,196,222,.96)`): 연이 다크 위 텍스트.
- **연이 Rose Border** (`rgba(244,190,209,.38)`): 연이 다크 표면의 테두리.
- 골드(`#ead089`)는 두 명도에서 모두 보조 포인트로 공통 사용.
- 적용처: 로그인 사용자 카드(`.cd-user-card`) — 네오와 같은 구조·레이아웃에 색 계열만 다르게 입힌 대표 사례.

### Legacy (사용 지양)
- `midnight-ink`(#0A0E1A), `deep-indigo`(#1B2340), `moonveil-silver`(#A8B3C7), `pearl-mist`(#EDEFF5), 정적 `champagne-gold`(#D8B36C), 정적 `twilight-violet`(#9C87D4) — Tailwind 정적 색상으로, `--cd-*` 이전 세대의 네오 전용 팔레트. 신규 작업은 `cd-*` 토큰을 우선 사용하고, 이 값들은 점진적으로 대체한다.

### Named Rules
**The Two Covers Rule.** 배경만 바꾸고 텍스트 색을 조정하지 않는 반쪽 전환은 금지. `cd-*` 토큰 세트는 항상 bg/surface/text/accent/gold를 통째로 같이 교체한다.
**The One Accent Rule.** 각 모드는 강조색을 하나만 쓴다(연이=Rose Crimson, 네오=Twilight Violet). 골드는 보조 포인트로만.

**The Hue-Stays Rule.** 대비를 고치더라도 **색상 계열(hue)은 바꾸지 않는다.** 명도(lightness)와 채도만 조정한다. 연이는 핑크/로즈 계열, 네오는 퍼플/바이올렛 계열을 벗어나면 안 되고, 음악실 아티스트 테마도 각자의 계열을 유지한다. "대비가 낮다 → 회색/검정으로 바꾼다"는 브랜드를 지우는 오답이며, 정답은 같은 계열에서 더 어둡거나 밝은 톤을 고르는 것이다.

**The Veil Rule.** 반투명 오버레이(`rgba(...)` 알파 1 미만, 글로우·베일·글래스 표면)는 팔레트 색이 아니라 **깊이 표현 기법**이다. 브랜드 색 목록과 대조해 "미등록 색"으로 취급하지 않는다. 다만 그 위에 얹히는 **텍스트의 실효 대비는 합성 결과 기준으로** 판단한다.

### 대비·가시성 기준 (데스크탑 기준선)

일반적인 접근성 표준(WCAG 2.1 AA)을 데스크탑 뷰포트 기준으로 적용한다.

| 대상 | 최소 대비 |
|---|---|
| 본문 텍스트 (16px 미만 또는 일반 굵기) | **4.5:1** |
| 큰 텍스트 (18.66px+ bold 또는 24px+) | **3:1** |
| UI 컴포넌트 경계·아이콘·포커스 링 | **3:1** |
| 장식 요소(글로우, 별, 파티클, 배경 패턴) | 기준 없음 — 정보를 담지 않으므로 제외 |

- **보조 텍스트도 예외가 아니다**: `--cd-text-muted` 계열도 4.5:1을 지킨다. "muted라서 흐려도 된다"는 안 된다.
- **비활성(disabled) 요소는 예외**지만, 결제 수단처럼 상태가 바뀌는 요소는 비활성 사유를 텍스트로도 알린다.
- **수정 방향**: 대비 미달 시 텍스트 색만 바꾸지 말고 **표면과 텍스트를 한 세트로** 조정한다(Two Covers Rule). 계열은 유지한다(Hue-Stays Rule).

## 3. Typography

**Display Font:** `CodeDestinyDisplay` (fallback: `CodeDestinyBody` → Pretendard → 시스템 한글 폰트)
**Body Font:** `CodeDestinyBody`, `Pretendard`, `Apple SD Gothic Neo`, `Malgun Gothic`, `Segoe UI`, system-ui
**Premium Font:** `CodeDestinySerifKR` (AI 상담 결과 장문 프로즈 전용, fallback은 Display) — 구 `CodeDestinyPremium`(더잠실체)은 라이선스가 포맷 변환·서브셋을 금지해 935KB 원본을 그대로 내려보내야 했으므로 OFL 명조로 교체했다.

**Character:** 한글 가독성이 최우선인 시스템 폰트 스택 위에, 결과 화면(Premium)과 헤딩(Display)만 커스텀 서체로 차별화 — 본문은 튀지 않고, 상담 결과와 제목만 브랜드 서체가 드러난다.

### Hierarchy
- **Display** (weight 700, letter-spacing -0.01em): 페이지/섹션 헤딩.
- **Premium** (line-height 1.75, measure 66ch): AI 상담 결과 본문(`AiResultProse`). 문단 간격 1.15em, letter-spacing -0.01em.
- **Body** (16px, weight 400, line-height 1.75): 일반 본문. 최대 66ch로 줄 길이 제한.
- **Label** (0.78rem, weight 700): 토글·칩 등 작은 인터랙티브 라벨.

### Named Rules
**The Quiet Body Rule.** 본문/Body는 항상 시스템 한글 폰트 스택을 우선 로드하고, 브랜드 서체(Display/Premium/Decorative)는 헤딩과 상담 결과 프로즈에만 국한한다 — 전체 페이지를 커스텀 폰트로 덮지 않는다.

## 4. Elevation

**The Glow-Not-Shadow Rule.** 이 시스템은 회색 드롭섀도 대신 브랜드 색 글로우로 깊이를 표현한다. 평상시 표면은 대체로 플랫하고, hover/focus/active 같은 상태 변화에서만 글로우가 등장한다.

### Shadow Vocabulary
- **Yeon Ambient** (`0 12px 24px rgba(150,72,104,.12), inset 0 1px 0 rgba(255,255,255,.9)`): 연이 카드/표면의 은은한 로즈 톤 그림자.
- **Neo Ambient** (`0 14px 26px rgba(0,0,0,.34), inset 0 1px 0 rgba(228,214,255,.12)`): 네오 카드/표면의 그림자.
- **Violet Neon** (`0 0 0 1px rgba(167,139,250,.18), 0 0 24px rgba(147,51,234,.35)`): 네오 인터랙티브 요소의 기본 글로우.
- **Violet Neon Focus** (`0 0 0 2px rgba(167,139,250,.55), 0 0 28px rgba(147,51,234,.45)`): 포커스 상태 글로우.
- **Moon Glow** (`0 0 40px -5px rgba(216,179,108,.35), 0 0 80px -20px rgba(156,135,212,.25)`): 골드+바이올렛이 섞인 네오 시그니처 글로우, 신비로움을 상징하는 요소(달, 별자리 등)에 사용.

## 5. Components

### Buttons
- **Shape:** Pill (`border-radius: 999px`).
- **Primary (연이):** 배경 `--cd-cta` 그라디언트(`#fff8dc → #ead089 → #f4bed1`), 텍스트 `#3c1830`.
- **Primary (네오):** 배경 `--cd-cta` 그라디언트(바이올렛-골드 조합), 텍스트 `#090718`.
- **Hover / Focus:** 색 자체보다 `Violet Neon Focus` 글로우(네오) 또는 은은한 스케일/투명도 변화(연이)로 상태 표현.

### Toggle / Pill Chips
- **Style:** `border: 1px solid currentColor`, `border-radius: 999px`, 내부 버튼도 pill. (`PagedResultViewer`의 페이지/전체보기 토글 참고)
- **State:** `aria-pressed="true"`일 때 `background: color-mix(in srgb, currentColor 18%, transparent)`로 옅게 채움, 미선택은 opacity 0.62.

### Cards / Containers
- **Corner Style:** md(16px) 라운드.
- **Background:** `--cd-surface` / `--cd-surface-2` (연이는 백색 계열 반투명, 네오는 미드나잇 잉크 반투명).
- **Shadow Strategy:** Elevation 섹션의 Ambient 그림자(persona별) 사용, 강조가 필요한 요소만 Neon/Moon Glow.
- **Border:** `--cd-border` (연이 로즈 반투명, 네오 라벤더 반투명).

### Prose (AI 상담 결과) — Signature Component
`AiResultProse`(`components/fortune/ai-result-prose.module.css`): 구조 전용 CSS + caller가 색을 입히는 패턴의 대표 사례. 66ch 측정폭, 1.75 줄간격, 문단 간격 1.15em. 인용구(`.quote`)는 `border-left: 3px solid currentColor`로 표시하지만 이는 카드/알림용 사이드스트라이프 금지 규칙과 별개(고전적 인용 표기 관례).

### Paged Result Viewer — Signature Component
`components/fortune/PagedResultViewer.tsx`: 책장을 넘기는 3D 전환(`rotateY`, `perspective:1400px`)으로 AI 상담 결과를 페이지 단위로 보여준다. `prefers-reduced-motion`에서는 크로스페이드로 대체. 이 컴포넌트가 "두 권의 책" 은유의 실제 구현체.

## 6. Do's and Don'ts

### Do:
- **Do** 연이/네오 전환 시 bg·surface·text·accent·gold를 한 세트로 같이 바꾼다(Two Covers Rule).
- **Do** 상태 변화(hover/focus)에서만 글로우를 올린다 — 평상시는 플랫.
- **Do** 인터랙티브 소형 요소(토글/칩)는 pill(999px)로 통일한다.
- **Do** 본문 텍스트는 명암비 4.5:1 이상을 유지한다(연이의 옅은 로즈/네오의 라벤더 뮤트 텍스트 모두 해당).

### Don't:
- **Don't** 제네릭 AI SaaS 룩(크림/샌드 근백색 배경, 그라디언트 텍스트, 카드 사이드스트라이프, 동일 카드 그리드, 섹션마다 반복되는 eyebrow/번호 스캐폴딩)을 쓰지 않는다.
- **Don't** 클리셰 타로 사이트의 상투적 보라 그라디언트 배경을 쓰지 않는다 — 신비로움은 글로우와 타이포로 표현한다.
- **Don't** 배경만 다크로 바꾸고 텍스트 색은 그대로 두는 반쪽 오버라이드를 하지 않는다. (어두운 배경 자체는 금지가 아니다 — 밝은 글씨를 쓰면 당연히 따라온다. 금지는 '반쪽'이다.)
- **Don't** 연이 모드에서 어두운 표면을 네이비·퍼플로 만들지 않는다 — 연이의 다크는 핑크·와인 계열(딥 플럼·버건디)이다.
- **Don't** 회색 드롭섀도를 기본 그림자로 쓰지 않는다 — 브랜드 색 글로우를 우선한다.
- **Don't** 강조색을 모드당 2개 이상 쓰지 않는다(One Accent Rule).
