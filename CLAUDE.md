# Code Destiny

> AI 기반 사주·타로·점성술 운세 서비스 (code-destiny.com)
> Next.js 15 · Cloudflare Pages/Workers · 2026-07

## Quick Start

```bash
npm run dev            # 로컬 개발 서버 (local-auth 포함)
npm run dev:next       # Next.js dev 서버만
npm run api            # server/ Express API 서버
npm run build          # UTF-8 콘솔 + Cloudflare 빌드
npm run build:cf       # prebuild:cf && build
npm run lint           # next lint
npm run typecheck      # tsc --noEmit
npm run deploy:cf:pages    # Cloudflare Pages 배포
npm run deploy:cf:worker   # Cloudflare Worker 배포
npm run deploy:cf:opennext # OpenNext 경유 배포
```
`verify:*` / `seed:*` / `migrate:*` 스크립트 다수 존재 — 결제·AI·i18n·보안 회귀 검증용. 관련 기능 수정 시 해당 `verify:*` 먼저 실행.

## 코딩 원칙 (최우선 적용 — [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) 기반)

이 섹션은 아래 다른 규칙과 충돌 시 우선한다. 속도보다 신중함에 무게를 두되, 사소한 작업에는 판단력을 발휘한다.

1. **코딩 전 사고**: 가정을 명시할 것. 불확실하면 숨기지 말고 질문할 것. 해석이 여럿이면 하나를 임의로 고르지 말고 제시할 것. 더 단순한 방법이 있으면 그것을 말하고, 필요하면 반박할 것.
2. **단순성 우선**: 요청한 것만 구현. 1회성 코드에 추상화 금지. 요청받지 않은 유연성/설정가능성 추가 금지. 발생 불가능한 시나리오의 에러 처리 금지. 200줄이 50줄로 줄어들 수 있다면 다시 쓸 것.
3. **수술적 변경**: 필요한 부분만 수정. 인접 코드/주석/포맷팅을 "개선"하지 않는다. 깨지지 않은 것을 리팩토링하지 않는다. 기존 스타일을 그대로 따른다(자신의 취향과 달라도). 무관한 데드코드를 발견하면 언급만 하고 삭제하지 않는다. 단, 자신의 변경으로 생긴 미사용 import/변수/함수는 제거한다.
4. **목표 지향 실행**: 작업을 검증 가능한 목표로 변환한다 (예: "버그 수정" → "재현 테스트 작성 후 통과시키기"). 다단계 작업은 `단계 → 검증 방법` 형태로 간단히 계획을 밝힌다.
5. **사용자 대상 안내는 한국어로**: 선택지 제시·제안뿐 아니라, 문제 원인 설명·작업 결과 요약·진행 상황 안내 등 사용자에게 전달하는 모든 텍스트는 기본적으로 한국어로 작성한다(코드/커밋 메시지/파일 내 식별자 제외).

## Folder Structure

```
app/            # Next.js App Router (라우트, app/api/*, [locale]/)
worker/         # Cloudflare Worker 백엔드 (routes/, lib/ — billing/AI/pdf/music)
server/         # 레거시 Express API (routes/, models/, services/)
lib/            # 공유 라이브러리 (llm-client, mongodb, i18n, payment)
veda/           # 베다 점성술 엔진 (ephemeris, knowledge-base)
components/     # 공용 React 컴포넌트 (yeon/, stories/, ui/, fortune/)
models/         # Mongoose 모델 (Story, Chapter)
pages/          # 레거시 Pages Router (_app, _document, 에러 페이지)
scripts/        # 빌드/배포/검증/마이그레이션 스크립트
apps/mobile/    # Capacitor 모바일 래퍼
public/, dist/, out/   # 정적 자산 및 빌드 산출물
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, `output: "export"` 정적 빌드), React 18.3.1
- **언어/스타일**: TypeScript 5.5 (`strict: false`, `strictNullChecks: true`), Tailwind 3.4
- **DB**: MongoDB — native driver(`lib/mongodb.ts`)와 Mongoose(`app/_lib/dbConnect.js`) 이중 연결
- **AI**: Gemini REST 직접 호출(`gemini-2.5-flash`) + 실패 시 Cloudflare Workers AI 폴백
- **배포**: Cloudflare Pages + Workers (wrangler 4.73, `@opennextjs/cloudflare`)
- **결제**: PortOne V2 (+ Inicis 일부 연동), 포인트/코인 기반 유료 기능
- **인증**: 커스텀 JWT (NextAuth 아님), Google/Kakao/Naver OAuth
- **i18n**: `ko`(기본, prefix 없음) / `ja`, `zh`, `en`(경로 prefix)

## Code Rules

- ES Modules만 사용, `any` 타입 지양
- `strictNullChecks` 위반 금지 (tsconfig `strict` 자체는 off이므로 과신 금지)
- 환경변수 하드코딩 금지 — 반드시 `process.env`/`env` 바인딩 경유
- 스타일은 Tailwind 클래스만 (인라인 스타일 지양)
- 외부 API 호출·DB 접근에는 try-catch 필수
- Cloudflare Worker 코드는 번들 1MB 제한 유의
- 네이밍: 컴포넌트 `PascalCase`, 유틸 `camelCase`, 라우트 폴더 `kebab-case`
- 컴포넌트: 서버 컴포넌트 기본, 클라이언트는 `'use client'` 명시, Props `interface`는 파일 상단 정의

## AI & API

- **Gemini 호출**: `lib/llm-client.ts` (실제 구현체, `worker/lib/gemini.js`·`gemini-client.js`는 얇은 래퍼). 모델 `gemini-2.5-flash`, REST `generateContent` 엔드포인트 직접 호출(SDK 미사용). API 키는 `GEMINIF_API_KEY` 단일 키만 사용(다른 키 이름 참조는 제거됨).
- **Workers AI 폴백**: Gemini 실패/타임아웃 시 자동으로 `env.AI.run()` 호출 — PDF 작업은 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, 그 외는 `@cf/meta/llama-3.1-8b-instruct`.
- **MongoDB**: 연결 env는 `MONGO_URI`/`MONGODB_URI`. 신규 코드는 기존 두 싱글턴 패턴(`lib/mongodb.ts` 또는 `app/_lib/dbConnect.js`) 중 이미 쓰이는 쪽을 따를 것 — 새 패턴 추가 금지.
- **Cloudflare Workers 제약**: `worker/` 디렉토리는 Node 내장 API(`fs`, `net` 등) 사용 금지, 순수 fetch/Web API 기반 유지. `app/api/*` 라우트 중 Node API가 필요하면 `export const runtime = "nodejs"` 명시.
- **결제**: 클라이언트는 `lib/payment/portone.ts`(PortOne V2 브라우저 SDK 동적 로드), 서버는 `worker/lib/portone.js`(PortOne REST API) — 결제 로직은 SDK 패키지가 아닌 raw fetch로 구현되어 있음.

## 결제 시스템 & 잠금 콘텐츠 규칙

본 서비스는 3가지 재화(이용권/월정석/코인)와 2가지 과금 방식(회당 결제/영구 해금)으로 유료 기능을 관리한다. 상세 정책은 문서로 분리되어 있으니 신규 기능 추가 전 반드시 참고할 것:

- [docs/payment-policy-overview.md](docs/payment-policy-overview.md) — 재화 정의(이용권/월정석/코인), 코인 표시 규칙
- [docs/payment-policy-content-access.md](docs/payment-policy-content-access.md) — 잠금 콘텐츠 vs 회당 결제 vs 무료 판별 기준 및 현재 목록
- [docs/payment-policy-flow.md](docs/payment-policy-flow.md) — 게이팅 우선순위, 결제 플로우, 변경 이력

**핵심 요약**:
- **이용권**(30일, 구독형이나 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가, 구독 아님) → **코인**(레거시 내부 단위) 순으로 게이팅
- **모든 유료 결제는 이용권 선검사 후 미커버 시에만 결제창 노출** — 결제창은 단건결제(KRW)+월정석 2옵션 동등 제시. 결제창/PortOne 직행 및 서버 runtimeGate `paymentMode` 하드코딩 금지 — [flow 문서 결제창 노출 규칙](docs/payment-policy-flow.md) 참고
- **코인은 폐지된 개념** — 서버 내부 계산에만 남아있고, 사용자에게는 항상 통화(현재 KRW, `1코인=100원` 고정 — `worker/lib/billing-policy.js`, 프론트는 `lib/payment/coin-pricing.ts`)로 환산해 표시. 신규 UI 작성 시 `coinPrice`/`cost`를 그대로 렌더링하지 말 것
- 신규 유료 기능은 "재열람 가능한 고정 콘텐츠"인지 "매번 생성되는 개인화 결과"인지에 따라 잠금 콘텐츠(`unlock.*`, `forceDeduct: true`) 또는 회당 결제(`PER_USE_PAID_FEATURE_KEY_LIST`)로 등록 — 판별 기준은 [content-access 문서](docs/payment-policy-content-access.md) 참고

### 관련 핵심 파일 레퍼런스

| 파일 | 역할 |
|------|------|
| `worker/lib/paid-feature-registry.js` | 모든 유료 기능 가격/유형 정의 |
| `worker/lib/content-unlocks.js` | 콘텐츠 잠금 해제 관리 (`ContentEntitlement`, `PERSISTENT_UNLOCK_KEY_SET`) |
| `worker/lib/billing-policy.js` | 코인↔KRW 환산 상수/함수 (`KRW_PER_COIN = 100`) |
| `lib/payment/coin-pricing.ts` | 프론트용 코인→KRW 표시 유틸(`formatKrwFromCoins`) |
| `worker/lib/models.js` | DB 스키마 (`profileSubscription`, `MonthlyCreditLedger`, `pointHistorySchema`) |
| `worker/routes/fortune.js` | 사주/자미두수 접근 게이팅 (`accessSource` 분기) |
| `app/hooks/useCoinGate.ts` | 프론트 단건 결제 훅 |

## Content Assets

- **캐릭터**: "연이(Yeon)" 마스코트 — `components/yeon/` (FloatingCharacter, SpriteFrame, TypewriterBubble 등)
- **음악**: `app/music/` 라우트, 실제 음원은 외부 CDN(`music.code-destiny.com`)에서 서빙 (레포에는 커버아트만 `public/music-covers/`)
- **웹소설**: `app/stories/`, 모델은 `models/Story.ts`/`models/Chapter.ts`
- **PDF 리포트**: 인생의 책은 `/life-book-ai`(구 `app/pdf/life-book`은 리다이렉트), PDF는 클라이언트에서 `html2canvas`+`jspdf`로 생성 (`worker/lib/pdf-v2/`는 존재하지 않음)
- 이미지는 Next.js `<Image>` 컴포넌트 사용 (`img` 태그 금지) — 단, `next.config.mjs`에 `images.unoptimized: true` 설정됨

## 신규 페이지/라우트 추가 시 SEO 콘텐츠 게이트 (배포 차단 주의)

`scripts/verify-adsense-readiness.mjs`는 `build:cf`의 `postbuild` 단계(GitHub Actions에서만 완주 가능 — Windows 로컬은 `/_not-found` prerender 이슈로 `next build`가 끝까지 안 돔)에서 `out/sitemap.xml`에 있는 모든 라우트의 **서버 렌더링된 텍스트 분량**을 검사해 미달 시 배포 자체를 실패시킨다. 카운트 방식(`getVisibleText`, 같은 파일 527번째 줄 부근)은 `<script>`/`<style>`/`<svg>`만 제거하고 나머지 모든 태그 텍스트를 그대로 합산하므로, **클라이언트 전용(`ssr:false`)으로 마운트되는 인터랙티브 도구는 텍스트로 잡히지 않는다** — 서버 컴포넌트에 실제 문단/리스트/FAQ 등 실질 콘텐츠가 있어야 한다.

- 라우트가 `app/components/adsense-route-policy.js`의 `canLoadAdsense()` 기준으로 광고 게재 가능(AdSense-eligible)이면: sitemap에 self-canonical로 반드시 포함되어야 하고(`verifyAdsenseEligibleRouteSitemapAlignment`), noindex/nofollow가 없어야 한다.
- 광고 게재 **불가능**하지만 sitemap에 색인 가능 상태로 남아있는 라우트(예: `/`, 로케일 인덱스 `/ja`, `/zh`, `/en` 및 그 하위, `/today`, `/manse`, `/oracle/*`, `/psychotest/*` 등 다수)는 `verifyBlockedIndexableSitemapRouteQuality`가 **최소 1800자**의 렌더링 텍스트를 요구한다(2026-07 기준 실측 임계값, 같은 파일 상단 `minimumBlockedIndexableVisibleTextLength` 상수 참고 — 값이 바뀔 수 있으니 코드에서 재확인할 것).
- 신규 유틸리티/허브형 페이지(도구 UI가 `dynamic(..., { ssr: false })`로 마운트되는 경우 특히), 신규 로케일(`/ja`, `/zh`, `/en`) 인덱스·소개 페이지를 추가할 때는 한두 줄짜리 intro만 넣지 말고, 실제 설명 문단·지원 항목 목록·FAQ 등 서버 렌더링되는 실질 콘텐츠를 함께 작성한다.
- 페이지 추가/사이트맵 변경 후에는 반드시 실제 GitHub Actions "Deploy Cloudflare Pages" 실행 결과로 최종 확인한다 — 로컬 `next build`가 Windows에서 완주되지 않아 `out/` 기반 검사를 로컬 재현할 수 없다.

## Forbidden (수정 금지)

- `.wrangler/`, `worker/wrangler.toml`
- `package-lock.json`
- `.env*` 패턴의 모든 환경변수 파일 (절대로 깃허브에 업로드 금지 — `.env.local`, `.env`, `server/.env` 등)
- `dist/`, `out/` (빌드 산출물)
- 마이그레이션 스크립트 실행 결과물 (`scripts/migrate-*` 자체는 리뷰 후 신중히 수정)

## UI/UX Standards

- 애니메이션은 Tailwind `transition-*`/`animate-*` 클래스만 (외부 라이브러리 신규 도입 지양 — 단 `framer-motion`은 기존 의존성으로 이미 사용 중)
- 모바일 퍼스트: `sm:` → `md:` → `lg:` 순서로 작성
- 다크모드 `dark:` 병행 필수
- 이미지 `alt` 속성 필수, 인터랙티브 버튼 `aria-label` 필수
- **연이(pig) 모드는 항상 밝은 꽃 컨셉** — 크림/로즈/골드 팔레트(`#fffaf7`·`#fff3f8`·`#ead089`·`#b31955`, 텍스트 `#3c1830`/`#70445c`). 연이 모드에서 다크 배경 표면(네이비/퍼플)을 남기지 말 것. 네오 모드는 달빛 다크(네이비-퍼플 + 라벤더 + 샴페인 골드). 어느 모드든 배경만 바꾸고 글자색을 안 바꾸는 반쪽 오버라이드 금지(가독성 붕괴의 주원인). 토큰은 `styles/theme-tokens.css`.
- **모바일 목록 카드는 심볼(글리프/이모지) 우선** — 컬렉션 목록의 대표 이미지는 모바일에서 로딩하지 않고 `.tarot-tile__img-placeholder`의 심볼을 노출(로딩 절감·직관성). 원본 이미지는 상세 팝업/디테일 오버레이에서만. 구현: `js/core/uiBindings.js`·`js/core/index-inline-runtime.js`의 `__(cd)HydrateCollectionImagesChunked`가 `window.__cdMobileRuntime`이면 조기 반환.

## 검색 & 수정 원칙 (토큰 절약)

- 사용자가 "전체 검색"을 명시하지 않는 한 프로젝트 전체를 훑지 않는다. 요청 키워드(기능명/함수명/에러 문구/라우트명)를 먼저 추출해 Grep/Glob으로 좁혀서 필요한 위치만 읽는다.
- 검색 순서: 정확 키워드 → 동의어/별칭 → 호출 경로. 관련 후보 파일이 3개를 넘으면 먼저 범위를 사용자에게 확인한다.
- 동일 목적의 검색/읽기 결과는 재사용하고, 코드가 바뀌지 않았다면 다시 조회하지 않는다.
- 요청 범위를 벗어난 파일은 열거나 수정하지 않는다. 관련 없는 리팩토링/정리를 끼워 넣지 않는다.
- 전체 빌드/전체 테스트/레포 전체 스캔은 사용자가 요청했거나 변경 영향이 명백히 넓을 때만 수행한다.
- 최종 보고 시 어떤 키워드로 어떤 파일을 좁혀 찾았는지 한 줄로 남긴다.

## Workflow

- 5줄 이상 변경 시 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` 스크립트 실행 → 변경 파일만 `git add` → Conventional Commits
- 세션 전환 시 `/clear`로 컨텍스트 오염 방지
