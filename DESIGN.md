---
name: Code Destiny
description: AI 기반 사주·타로·점성술 운세 서비스 — 연이(밝은 꽃)와 네오(달빛 다크) 듀얼 페르소나 디자인 시스템
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
    fontFamily: "'CodeDestinyPremium', var(--font-display)"
    lineHeight: 1.75
  label:
    fontFamily: "var(--font-body)"
    fontSize: "0.78rem"
    fontWeight: 700
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

Code Destiny는 한 명의 사용자가 언제든 펼쳐볼 수 있는 두 권의 책을 가진 서재다. 낮에는 **연이**의 밝은 꽃 표지(크림·로즈·골드)가, 밤에는 **네오**의 달빛 다크 표지(미드나잇 잉크·라벤더·샴페인 골드)가 같은 이야기를 다른 조명으로 들려준다. 두 표지는 서로 다른 무드지만 같은 목소리 — 따뜻함, 명리학·점성술에 근거한 전문성, 그리고 몰입감 있는 신비로움 — 를 낸다. `PagedResultViewer`의 책장 넘김 인터랙션이 이 은유를 그대로 실체화한다.

이 시스템이 명시적으로 거부하는 것: 제네릭 AI SaaS 룩(근백색 크림 배경 + 그라디언트 텍스트 + 사이드스트라이프 카드 + 동일 카드 그리드 + 섹션마다 반복되는 eyebrow/번호 스캐폴딩), 그리고 클리셰 타로 사이트의 상투적 보라 그라디언트 배경. 신비로움은 절제된 컬러 글로우와 타이포그래피로 표현하지, 값싼 그라디언트로 때우지 않는다.

**Key Characteristics:**
- 하나의 서비스, 두 개의 표지(연이/네오) — 절대 반쪽만 전환되지 않는다
- 그림자보다 글로우: 깊이는 회색 드롭섀도가 아니라 브랜드 색 글로우로 표현
- 구조(레이아웃 CSS)와 색(caller className)의 분리 — 컴포넌트는 중립으로 짜고 페르소나가 색을 입힌다
- 부드러운 필(pill) 형태의 인터랙티브 요소, 과하지 않은 절제된 터치

## 2. Colors

두 페르소나가 같은 역할(bg/surface/text/accent/gold)을 각자의 값으로 채우는 구조. 전환은 `data-cd-theme="neo"` 속성 또는 `body.neo-mode` 클래스, `localStorage`의 `fortuneThemeModeStateV1` 키(`pig`|`neo`)로 이뤄진다. `styles/theme-tokens.css`의 `--cd-*` CSS 커스텀 프로퍼티가 정본이다.

### Primary — 연이 (밝은 꽃)
- **Rose Crimson** (`#b31955`): 연이 모드의 유일한 강조색. CTA, 활성 상태, 포인트 텍스트.
- **Champagne Gold — Yeon** (`#ead089` / soft `#fff8dc`): CTA 그라디언트와 골드 포인트.

### Primary — 네오 (달빛 다크)
- **Twilight Violet** (`#c4b5fd` / soft `#a78bfa`): 네오 모드의 유일한 강조색이자 `violet-neon` 글로우의 근원.
- **Champagne Gold — Neo** (`#e8d5a3`): 네오 모드 골드 포인트, `moon-glow` 그림자의 근원.

### Neutral
- **연이 Cream** (`#fffaf7` → `#fff3f8` 그라디언트): 연이 배경.
- **연이 Ink** (`#3c1830`, muted `#70445c`): 연이 본문 텍스트.
- **네오 Midnight Ink** (`#0a0818` → `#13102a` 그라디언트): 네오 배경.
- **네오 Pearl Violet** (`#f4eeff`, muted `rgba(200,170,255,.7)`): 네오 본문 텍스트.

### Legacy (사용 지양)
- `midnight-ink`(#0A0E1A), `deep-indigo`(#1B2340), `moonveil-silver`(#A8B3C7), `pearl-mist`(#EDEFF5), 정적 `champagne-gold`(#D8B36C), 정적 `twilight-violet`(#9C87D4) — Tailwind 정적 색상으로, `--cd-*` 이전 세대의 네오 전용 팔레트. 신규 작업은 `cd-*` 토큰을 우선 사용하고, 이 값들은 점진적으로 대체한다.

### Named Rules
**The Two Covers Rule.** 배경만 바꾸고 텍스트 색을 조정하지 않는 반쪽 전환은 금지. `cd-*` 토큰 세트는 항상 bg/surface/text/accent/gold를 통째로 같이 교체한다.
**The One Accent Rule.** 각 모드는 강조색을 하나만 쓴다(연이=Rose Crimson, 네오=Twilight Violet). 골드는 보조 포인트로만.

## 3. Typography

**Display Font:** `CodeDestinyDisplay` (fallback: `CodeDestinyBody` → Pretendard → 시스템 한글 폰트)
**Body Font:** `CodeDestinyBody`, `Pretendard`, `Apple SD Gothic Neo`, `Malgun Gothic`, `Segoe UI`, system-ui
**Premium Font:** `CodeDestinyPremium` (AI 상담 결과 장문 프로즈 전용, fallback은 Display)

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
- **Don't** 배경만 다크로 바꾸고 텍스트 색은 그대로 두는 반쪽 오버라이드를 하지 않는다.
- **Don't** 회색 드롭섀도를 기본 그림자로 쓰지 않는다 — 브랜드 색 글로우를 우선한다.
- **Don't** 강조색을 모드당 2개 이상 쓰지 않는다(One Accent Rule).
