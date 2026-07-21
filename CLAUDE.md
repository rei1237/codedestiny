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
6. 🔴 **중첩 사전검사 (수정 전 필수)**: 방어 장치나 UI 계층을 **추가하기 전에, 안쪽·바깥쪽에 이미 같은 장치가 있는지 먼저 확인한다.** 이미 있으면 감싸지 말고 **그 지점을 고친다.** 이중으로 걸면 대개 효과는 그대로면서 비용만 배가되거나, 서로를 무력화한다.
   - **대상**: 재시도(`withMongoRetry`)·타임아웃·캐시(TTL/in-flight dedup)·락/단일비행·트랜잭션·에러 폴백 / 모달·오버레이·스크롤락·결제 게이트·`z-index`·이벤트 델리게이션·지연로딩(`IntersectionObserver`+`loading="lazy"`)
   - **확인 방법**: 이름 grep만으로 판단하지 말 것 — 함수 본문을 **중괄호 균형으로 잘라 내부를 실제로 열어본다**. 이번 감사에서 이름 기반 스캔이 9곳을 오탐했다. 검사 도구: `npm run verify:no-nested-retry`
   - **실제 사고 사례**: 재시도 중첩 → 시도·재연결 배수 증가(`auth.js`가 이미 재시도 중인데 상위에서 또 감쌈) / 지연 장치 중첩 → 요청이 영영 안 나감(IO 하이드레이션 + `loading="lazy"`) / 모달 중첩 → 스크롤락·포커스 상실
7. **회귀 위험 상시 점검 및 안내**: 기존 동작이 있는 코드를 수정할 때는 항상 "이 변경이 다른 기능/경로/케이스를 깨뜨릴 수 있는가"를 점검한다. 공유 모듈·공통 훅·여러 라우트가 참조하는 함수 수정, 조건 분기 변경, 기본값/우선순위 변경 등 회귀 가능성이 있는 지점을 발견하면 작업을 끝낸 뒤 결과만 보고하지 말고, 어떤 회귀 위험이 있는지·어떤 시나리오에서 발생할 수 있는지·확인이 필요한지 여부를 사용자에게 먼저 안내한다. 위험이 낮아 보여도 판단이 애매하면 안내를 생략하지 않는다.

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
- 🔒 **[필수·예외없음] 모든 유료 결제 게이팅 순서** — 신규/수정 불문 모든 유료 기능은 반드시 아래 순서를 그대로 따른다. 이 순서를 벗어나는 결제 구현은 금지이며, 발견 시 즉시 사용자에게 보고한다(작업 중 우연히 마주쳐도 그냥 지나치지 말 것):
  1. **이용권(pass) 선(先)검사** — 서버 `canUseByPass`/`buildPassPaymentDecision`(정본: `worker/routes/billing.js`)로 이용권 커버 여부를 먼저 판정. 커버되면 **결제창 없이 무료 통과**.
  2. **미커버 시에만 결제창 노출** — 결제창에는 **단건결제(KRW, PortOne)와 월정석(월정석 잔액 기반)이 항상 함께, 동등 우선순위로** 표시되어야 한다(`equalPriorityMethods: ["DIRECT_KRW","MOONLIGHT_STONE"]`). 한쪽만 노출하거나 한쪽으로 직행하면 안 된다.
  3. **단건 결제(PortOne)는 사용자가 결제창에서 '단건'을 고른 이후에만** 실행(`_cdRunDirectKrwCheckout`/`_dpRunDirectKrwCheckout`에 도달). 그 이전 단계에서 `paymentMode: "DIRECT_KRW"`를 게이트에 강제하지 않는다.
  - **금지 패턴(=위반, 발견 시 보고 대상)**: ① 이용권 선검사 없이 결제창/PortOne/`openChargeModal`/`/points`로 직행 ② 결제창에 단건 또는 월정석 한쪽만 노출 ③ 서버 runtimeGate/paymentPayload에 `paymentMode:"DIRECT_KRW"` 하드코딩(선검사 스킵+월정석 옵션 소거 — 과거 ziwei-ai에서 제거된 결함) ④ 공유 게이트(`useCoinGate`/`_cdOpenPaidServiceGate`/정적 결제 모달) 우회하는 커스텀 체크아웃.
  - **예외**: 프로필 카드 추가·삭제(D유형, `passExcluded`) **모두** 이용권 결제 불가라 선검사 없이 곧바로 결제창(단건/월정석)을 연다 — 그래도 두 결제수단은 동등 노출. **family 포함 모든 등급**이 이용권 커버 대상이 아니며(서버 정본은 `isPassExcludedPricing` 하나 — featureKey별 예외 분기 금지), family 무료는 이용권 결제가 아니라 정책 계층(`profile-card-mutation-policy.js`)의 0원 바이패스로 처리된다. 계정당 첫 카드도 등급 무관 무조건 무료. 상세는 [content-access D유형](docs/payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료).
  - **검증**: 결제 관련 수정 시 `npm run verify:billing-pass-policy`·`verify:portone-single-payment`·`verify:paid-gate-ui`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`를 먼저 실행. 뒤 두 개는 가격/과금유형 정본(`paid-feature-registry.js`)과 프론트 게이트·워커 라우트의 정합성을 보는 가드로, GitHub Actions "Paid Flow Gates"에서도 차단한다. 상세 규칙은 [flow 문서 결제창 노출 규칙](docs/payment-policy-flow.md) 참고.
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
- **연이 이미지 자산은 화면별로 용도가 고정되어 있다** — 이름이 비슷하다고 임의로 바꾸지 말 것:
  - 메인 홈 히어로 상단(`index.html` `.moon-hero__picture--mascot`): 연이 모드=자는 연이(`/fuctionassets/자는 연이.png`), 네오 모드=전략실 네오(R2 `DestinyWar/전략실 네오 메인-Photoroom.png`, `syncHeroMascot`가 테마 전환 시 교체)
  - 운명 찻집 타로 앨범 히어로(`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`의 `TarotAlbumHero`): 연이 스프라이트7(`fortuneTeaHouseAssets.yeoni.transparent.sprite7CharacterR2`)을 크롭+idle 애니메이션으로 표시 — 자는 연이 이미지로 바꾸지 않는다
  - 어떤 화면에 어떤 연이 자산이 맞는지 확실치 않으면 추측해서 교체하지 말고 반드시 먼저 사용자에게 확인한다(코딩 원칙 1번 참고)
- **음악**: `app/music/` 라우트, 실제 음원은 외부 CDN(`music.code-destiny.com`)에서 서빙 (레포에는 커버아트만 `public/music-covers/`)
- **웹소설/비주얼 노벨(브랜드 정체성)**: 텍스트 리더 `app/stories/`(원문 `lib/stories/chapters/*` + `data.ts`; `models/Story.ts`는 미사용 데드코드). 비주얼 노벨(VN) = 단일 자립형 `public/codedestiny-novel.html`(EP1~5, `/stories`에서 CTA 진입). **전체 스토리 흐름은 만화 이누야샤 구조 참조**(고유명사·설정 차용 없이 구조만) — 가이드: [docs/webnovel_review/webnovel_story_guideline.md](docs/webnovel_review/webnovel_story_guideline.md), 결말 아크 상세: [docs/webnovel_review/webnovel_ending_arc_outline.md](docs/webnovel_review/webnovel_ending_arc_outline.md)
- **PDF 리포트**: 인생의 책은 `/life-book-ai`(구 `app/pdf/life-book`은 리다이렉트), PDF는 클라이언트에서 `html2canvas`+`jspdf`로 생성 (`worker/lib/pdf-v2/`는 존재하지 않음)
- 이미지는 Next.js `<Image>` 컴포넌트 사용 (`img` 태그 금지) — 단, `next.config.mjs`에 `images.unoptimized: true` 설정됨
- **관상(동물상/얼굴 분석)**: React가 아니라 **루트의 바닐라 JS 규칙 엔진**(`AnalysisEngine.js`=얼굴 랜드마크→하드코딩 점수/템플릿, `PhysiognomyUI.js`=DOM 렌더/결제 게이트)이며 `index.html?action=openPhysiognomyApp` 모달로 구동. **LLM 미사용**. `app/physiognomy`·`app/animal/physio`는 SEO 랜딩 껍데기. ⚠️ **두 파일은 루트와 `public/`에 별도 사본으로 존재(심링크 아님) — 수정 시 반드시 `cp`로 동기화**. 리포트 섹션은 `expertReportHtml`(엔진)을 `PhysiognomyUI.js`의 `createExpertReportSections` 파서가 헤딩 키워드로 쪼개 카드로 렌더하므로, 섹션 HTML의 헤딩 문구와 파서 `headingKeywords`를 함께 맞춰야 한다. 오관·점 정밀 분석은 프리미엄(회당 5,000원, `physiognomy-ogwan-mole-deep`). 검증: `npm run verify:physiognomy-report`(jsdom 필요 — devDependency) + `verify:physiognomy-scoring`

## 신규 페이지/라우트 추가 시 SEO 콘텐츠 게이트 (배포 차단 주의)

`scripts/verify-adsense-readiness.mjs`는 `build:cf`의 `postbuild` 단계(GitHub Actions에서만 완주 가능 — Windows 로컬은 `/_not-found` prerender 이슈로 `next build`가 끝까지 안 돔)에서 `out/sitemap.xml`에 있는 모든 라우트의 **서버 렌더링된 텍스트 분량**을 검사해 미달 시 배포 자체를 실패시킨다. 카운트 방식(`getVisibleText`, 같은 파일 527번째 줄 부근)은 `<script>`/`<style>`/`<svg>`만 제거하고 나머지 모든 태그 텍스트를 그대로 합산하므로, **클라이언트 전용(`ssr:false`)으로 마운트되는 인터랙티브 도구는 텍스트로 잡히지 않는다** — 서버 컴포넌트에 실제 문단/리스트/FAQ 등 실질 콘텐츠가 있어야 한다.

- 라우트가 `app/components/adsense-route-policy.js`의 `canLoadAdsense()` 기준으로 광고 게재 가능(AdSense-eligible)이면: sitemap에 self-canonical로 반드시 포함되어야 하고(`verifyAdsenseEligibleRouteSitemapAlignment`), noindex/nofollow가 없어야 한다.
- 광고 게재 **불가능**하지만 sitemap에 색인 가능 상태로 남아있는 라우트(예: `/`, 로케일 인덱스 `/ja`, `/zh`, `/en` 및 그 하위, `/today`, `/manse`, `/oracle/*`, `/psychotest/*` 등 다수)는 `verifyBlockedIndexableSitemapRouteQuality`가 **최소 1800자**의 렌더링 텍스트를 요구한다(2026-07 기준 실측 임계값, 같은 파일 상단 `minimumBlockedIndexableVisibleTextLength` 상수 참고 — 값이 바뀔 수 있으니 코드에서 재확인할 것).
- 신규 유틸리티/허브형 페이지(도구 UI가 `dynamic(..., { ssr: false })`로 마운트되는 경우 특히), 신규 로케일(`/ja`, `/zh`, `/en`) 인덱스·소개 페이지를 추가할 때는 한두 줄짜리 intro만 넣지 말고, 실제 설명 문단·지원 항목 목록·FAQ 등 서버 렌더링되는 실질 콘텐츠를 함께 작성한다.
- 페이지 추가/사이트맵 변경 후에는 반드시 실제 GitHub Actions "Deploy Cloudflare Pages" 실행 결과로 최종 확인한다 — 로컬 `next build`가 Windows에서 완주되지 않아 `out/` 기반 검사를 로컬 재현할 수 없다.

## AdSense 승인·검증·ads.txt (2026-07 감사)

- **ads.txt는 삭제 금지 파일**(레코드: `google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0`). 과거 대량 "sync local development state" 커밋(`2fbe1502`)이 실수로 지운 사건이 있어, `scripts/ensure-ads-txt.mjs`가 `prebuild:cf` 맨 앞에서 root·`public`의 ads.txt를 **자가치유**(누락·불일치 시 재기록)하고, `npm run verify:ads-txt`(= ensure `--check`)가 CI("Deploy Cloudflare Pages")와 postbuild(`verify-adsense-readiness`의 4위치 단언)에서 존재를 강제한다. git에서 지워져도 빌드 산출물엔 항상 존재한다. **root·public의 `ads.txt`를 지우지 말 것.**
- **`google-adsense-account` 검증 메타태그**(`ca-pub-9863227498729828`)는 소유권 확인용(광고 미서빙)이라 `app/layout.js`의 `metadata.other`와 **6개 정적 셸 `<head>` 전부**에 둔다. 광고 **서빙 코드**(`adsbygoogle.js`/`<ins class=adsbygoogle>`/`adsbygoogle.push`)만 `app/components/DeferredAdsense.tsx`로 중앙화 강제된다 — `verify-adsense-readiness.mjs`의 `embedsAdsenseCode()`가 검증 메타태그(HTML `<meta>` + layout JS 선언)를 걷어낸 뒤에만 광고코드를 검사하므로, 검증 메타태그는 어느 페이지·셸에 있어도 게이트를 통과한다(다른 파일에 실제 광고코드를 넣으면 게이트가 여전히 막는다).
- **홈 `/`은 정적 셸 `index.html`의 승격본**이다(`scripts/promote-static-shell-to-root.mjs`가 `public/index.html`→루트 `dist/index.html`). 따라서 **홈 콘텐츠·메타는 `app/page.js`가 아니라 정적 셸에 둔다**(`app/page.js`는 승격에 덮여 홈에서 미사용). 홈 하단 운세 입문 콘텐츠 섹션(`.cd-home-guide`, theme-tokens `--cd-*` 사용)은 **한국어 3개 셸**(루트 `index.html`, `public/index.html`, `public/static/index.html`)에만 있고 전 뷰포트에 노출한다(숨김 금지). en/ja/zh 셸 현지화 콘텐츠는 후속 과제.

## Forbidden (수정 금지)

- `.wrangler/`, `worker/wrangler.toml`
- `package-lock.json`
- `.env*` 패턴의 모든 환경변수 파일 (절대로 깃허브에 업로드 금지 — `.env.local`, `.env`, `server/.env` 등)
- `dist/`, `out/` (빌드 산출물)
- 마이그레이션 스크립트 실행 결과물 (`scripts/migrate-*` 자체는 리뷰 후 신중히 수정)

## 디자인 스킬 (impeccable)

UI/UX 관련 요청(디자인/리디자인/비평/감사/폴리싱/애니메이션/컬러/타이포/레이아웃 등 프론트엔드 개선 전반)은 항상 `impeccable` 스킬(`.claude/skills/impeccable/`)을 사용한다. 단축 커맨드 `/audit`, `/critique`, `/polish`가 등록되어 있고, 나머지 명령은 `/impeccable <command> [target]` 형태로 호출한다(전체 목록은 `/impeccable` 단독 실행). 프로젝트 전략/브랜드 컨텍스트는 루트 `PRODUCT.md`(register: product, 브랜드 성격: 따뜻함·전문성·신비로움), 시각 시스템은 루트 `DESIGN.md`(연이=핑크 계열, 네오=퍼플 달빛 두 페르소나, Glow-Not-Shadow 규칙 등)를 참고한다. `.tsx`/`.jsx`/`.css`/`.html` 등 UI 파일을 Edit/Write/MultiEdit하면 디자인 감지 후크가 자동으로 실행되어 문제를 시스템 리마인더로 알려준다(`.claude/settings.json`의 `hooks.PostToolUse`, `.impeccable/config.json`에서 on/off·예외 관리).

## UI/UX Standards

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
  - **연이 다크 팔레트 정본**은 `DESIGN.md`의 "연이 Dark(핑크 다크)" 절 — 딥 플럼 `#3a0e28`→`#24081a`, 텍스트 `#fff1f7`, 테두리 `rgba(244,190,209,.38)`. 새로 어두운 표면을 만들 때 이 값을 쓴다.
  - **대표 사례**: 로그인 사용자 카드(`.cd-user-card`)는 두 모드가 **구조·레이아웃은 동일하고 색 계열만 다르다**(연이=핑크 다크, 네오=퍼플 다크). 확정 규칙은 `index.html` 문서 끝의 `cd-user-card-yeon-pink-v20260721` 블록 — 앞쪽 블록들에 연이용 밝은 오버라이드가 `!important`로 흩어져 있어 여기서 최종 확정한다. 되돌리지 말 것.
- **개별 기능(App Router 페이지·React 컴포넌트)은 원칙적으로 연이/네오 분기가 필요 없다** — 대신 일반 `dark:`(시스템 다크모드) 클래스만 병행하면 된다. 이미 `.neo-mode`를 참조하는 기존 화면(예: 운명 찻집 히어로, 메인 마스코트 동기화)을 수정할 때만 그 화면의 기존 분기 로직을 유지·존중하고, 신규 기능에 연이/네오 분기를 새로 도입하지 않는다 — 필요해 보이면 먼저 사용자에게 확인한다.
- **모바일 컬렉션 카드는 2열 16:9 포스터 그리드 + 이미지 노출** (2026-07 개정 — 이전의 "심볼 우선, 모바일 이미지 미로딩" 규칙은 폐기). 데스크톱과 동일하게 전 컬렉션의 대표 이미지를 보여준다. 심볼(`.tarot-tile__img-placeholder`)은 이미지가 아직 없거나 로드 실패했을 때의 폴백 전용.
  - **비율은 16:9 고정** — 원본 아트가 전부 가로 배너(1300~1500px)이고 그림 안에 제목 문구가 박혀 있어, 세로 포스터로 크롭하면 좌우 캐릭터와 제목이 잘린다. 세로 비율로 바꾸지 말 것.
  - **성능 보전 3종**: ① 컬렉션은 접힌 채 시작하고 열릴 때만 하이드레이션(`cd:collection-toggle` → `__cdScheduleCollectionHydration`) ② `IntersectionObserver`로 뷰포트 진입분만 ③ Cloudflare Image Resizing(`/cdn-cgi/image/width=...`)으로 카드 크기에 맞춰 축소 수신(장당 150~200KB → 16~26KB). 실패 시 원본 R2 → 심볼 순으로 폴백.
  - **주의 — 지연 장치를 두 개 걸지 말 것**: 하이드레이션이 이미 IO로 게이트되므로 생성하는 `<img>`는 `loading="eager"`여야 한다. `lazy`를 함께 걸면 요청이 영영 나가지 않는다. 마크업에 정적으로 박힌 `loading="lazy"` 이미지도 닫힌 컬렉션 안에서 파싱되면 열려도 요청이 안 나가므로, 하이드레이션이 노드를 새로 붙여 깨운다.
  - 구현 정본: `js/core/index-inline-runtime.js`·`js/core/uiBindings.js`의 `__(cd)HydrateCollectionImagesChunked` / `buildResizedCollectionImageUrl`. 그리드 열 수의 실제 정본은 CSS가 아니라 `index.html` `classifyCards()`의 인라인 `grid-template-columns` (인라인 `!important`라 CSS보다 셈).

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
- **워커 변경 자동 배포 규칙**: `worker/` 코드를 수정해 커밋/푸시하는 경우, 아래 "문제없음" 조건을 모두 만족하면 **사용자에게 매번 묻지 말고 `npm run deploy:cf:worker`까지 이어서 진행**한다(Pages/정적은 GitHub Actions가 처리하므로 워커만 수동 배포하면 됨). 배포 후 Version ID·라우트·크론 스케줄 등 결과를 보고한다.
  - **문제없음(자동 배포 진행) 조건**: `typecheck`·관련 `verify:*`·해당 테스트가 모두 통과 + 변경이 수술적이고 회귀 위험이 낮음 + 배포 자체가 표준 절차(강제/롤백/시크릿 변경 없음).
  - **문제 가능성 있음(자동 배포 보류 + 먼저 안내)**: 신뢰성/우선순위/기본값 등 동작 모델을 바꾸는 변경, 공유 모듈·여러 라우트가 참조하는 함수 수정, 크론/`wrangler.toml`(수정 금지)·바인딩·시크릿에 영향, 검증이 변경을 충분히 커버하지 못함, 또는 결제·인증 등 장애 시 파급이 큰 영역. 이때는 위험·시나리오·확인 필요 여부를 먼저 안내하고 사용자 판단을 받은 뒤 배포한다.
  - 판단이 애매하면 자동 배포하지 말고 안내를 택한다(회귀 위험 상시 점검 원칙 우선).
- 세션 전환 시 `/clear`로 컨텍스트 오염 방지
- **모델 선택 규칙**:
  - **코딩 작업**(버그 수정, 기능 구현, 리팩토링 등): `claude-opus-4.8` + reasoning effort `high` 이상 고정 — 복잡한 로직·회귀 분석·설계 결정에 강화된 능력 필요
  - **파일 검색·스캔**(Glob, Grep, 코드베이스 탐색): `claude-haiku-4-5-20251001` 고정 — 검색은 정확도·속도 충분, 사용자 요청 여부 무관 반드시 Haiku 사용 및 안내 필수
  - **커밋 메시지·코드 리뷰·일상 대화**: `claude-haiku-4-5-20251001` 고정 — 토큰 효율성과 빠른 응답 속도 우선
