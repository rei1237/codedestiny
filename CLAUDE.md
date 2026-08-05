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
5. **사용자 대상 안내는 한국어로 + 추천안은 반드시 명시**: 선택지 제시·제안뿐 아니라, 문제 원인 설명·작업 결과 요약·진행 상황 안내 등 사용자에게 전달하는 모든 텍스트는 기본적으로 한국어로 작성한다(코드/커밋 메시지/파일 내 식별자 제외). 특히 선택지를 제시할 때는 **항상 가장 추천하는 안을 먼저, 분명하게 `추천`이라고 표시해 안내**하고, 왜 그 안을 권하는지 한두 문장으로 바로 설명한다. 사용자가 중립 비교를 명시적으로 요청한 경우를 제외하면, 옵션을 우열 없이 나열만 하고 끝내지 않는다.
6. 🔴 **중첩 사전검사 (수정 전 필수)**: 방어 장치나 UI 계층을 **추가하기 전에, 안쪽·바깥쪽에 이미 같은 장치가 있는지 먼저 확인한다.** 이미 있으면 감싸지 말고 **그 지점을 고친다.** 이중으로 걸면 대개 효과는 그대로면서 비용만 배가되거나, 서로를 무력화한다.
   - **대상**: 재시도(`withMongoRetry`)·타임아웃·캐시(TTL/in-flight dedup)·락/단일비행·트랜잭션·에러 폴백 / 모달·오버레이·스크롤락·결제 게이트·`z-index`·이벤트 델리게이션·지연로딩(`IntersectionObserver`+`loading="lazy"`)
   - **확인 방법**: 이름 grep만으로 판단하지 말 것 — 함수 본문을 **중괄호 균형으로 잘라 내부를 실제로 열어본다**. 이번 감사에서 이름 기반 스캔이 9곳을 오탐했다. 검사 도구: `npm run verify:no-nested-retry`
   - **실제 사고 사례**: 재시도 중첩 → 시도·재연결 배수 증가(`auth.js`가 이미 재시도 중인데 상위에서 또 감쌈) / 지연 장치 중첩 → 요청이 영영 안 나감(IO 하이드레이션 + `loading="lazy"`) / 모달 중첩 → 스크롤락·포커스 상실
7. **회귀 위험 상시 점검 및 안내**: 기존 동작이 있는 코드를 수정할 때는 항상 "이 변경이 다른 기능/경로/케이스를 깨뜨릴 수 있는가"를 점검한다. 공유 모듈·공통 훅·여러 라우트가 참조하는 함수 수정, 조건 분기 변경, 기본값/우선순위 변경 등 회귀 가능성이 있는 지점을 발견하면 작업을 끝낸 뒤 결과만 보고하지 말고, 어떤 회귀 위험이 있는지·어떤 시나리오에서 발생할 수 있는지·확인이 필요한지 여부를 사용자에게 먼저 안내한다. 위험이 낮아 보여도 판단이 애매하면 안내를 생략하지 않는다.
8. 🔴🔴 **LLM 검증은 mock 이 기본 — 실제 모델 호출은 사용자 허락 없이 절대 금지 (예외 없음)**: Gemini(`GEMINIF_API_KEY`)·Workers AI(`env.AI.run`)처럼 **과금·쿼터가 걸린 모델을 실제로 때리는 검증은 어떤 이유로도 임의 실행하지 않는다.** 프롬프트 수정, 분량 조정, 파서·폴백·타임아웃 변경, "품질이 궁금해서", "한 번만 확인" 전부 해당한다. 기본은 **응답을 mock 해서** 로직만 검증한다.
   - **mock 정본 패턴(둘 중 하나를 따를 것, 새 방식 발명 금지)**: `scripts/verify-mindscan-reading.mjs` — `mockFetch` + `fetchImpl` 주입으로 가짜 응답 주입, 실호출은 `--live` 플래그 뒤로 격리 / `scripts/verify-workers-ai-fallback.mjs` — `delete process.env.GEMINIF_API_KEY` 로 폴백 경로 강제. 신규 검증 스크립트도 **기본 실행은 mock, 실호출은 반드시 명시 플래그 뒤**에 둔다.
   - **실호출이 정말 필요하면 실행 전에 멈추고 묻는다**: ①mock 으로는 왜 확인이 안 되는지 ②몇 회 호출하는지 ③어떤 키·모델·라우트를 쓰는지를 한국어로 안내하고 **사용자의 명시적 허락을 받은 뒤에만** 실행한다. 허락은 **그 1회 한정**이며 다음 호출·다음 세션으로 자동 연장되지 않는다. 애매하면 실행하지 말고 묻는다.
   - **금지 행위 예시**: `--live` 플래그 임의 사용 / 실제 프롬프트를 돌려 "실측 분량·품질"을 눈으로 확인 / `curl`·`wrangler dev`·배포된 워커 유료 라우트로 모델 호출 / 테스트용 계정·키로 유료 AI 기능 실행. 문서에 남은 "실측" 수치(예: 폴백 60~77%)는 **이미 측정된 값을 인용하라는 뜻**이지 다시 재보라는 뜻이 아니다.
   - **왜**: 실호출은 (1) 사용자 돈·쿼터를 말없이 태우고 (2) 유료 라우트를 건드리면 결제/차감 부작용까지 남기며 (3) 어차피 1회 샘플이라 로직 검증 근거로도 약하다.

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

- 🔴🔴 **검증은 mock 기본, 실호출은 사전 허락 필수** — 코딩 원칙 8번(최우선)이 이 섹션 전체에 적용된다. 프롬프트·분량·폴백을 고쳤다고 실제 Gemini/Workers AI 를 부르지 말 것. mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입)·`scripts/verify-workers-ai-fallback.mjs`(키 제거), 실호출은 `--live` + **사용자 허락 1회 한정**.
- **Gemini 호출**: `lib/llm-client.ts` (실제 구현체, `worker/lib/gemini.js`·`gemini-client.js`는 얇은 래퍼). 모델 `gemini-2.5-flash`, REST `generateContent` 엔드포인트 직접 호출(SDK 미사용). API 키는 `GEMINIF_API_KEY` 단일 키만 사용(다른 키 이름 참조는 제거됨).
- **Workers AI 폴백**: Gemini 실패/타임아웃 시 자동으로 `env.AI.run()` 호출. 기본값은 단일 모델이 아니라 **체인**이다(`lib/llm-client.ts`의 `DEFAULT_WORKERS_AI_MODELS`) — 1차 `@cf/zai-org/glm-4.7-flash`(컨텍스트 131k, `response_format` 지원, 출력 $0.40/M), 2차 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`(컨텍스트 24k, 출력 $2.25/M). 앞에서부터 시도해 첫 성공을 쓰고, 폐기·스키마 거부·빈 응답이면 다음으로 넘어간다. PDF/비PDF는 모델이 아니라 **env 오버라이드 키만** 다르다 — PDF는 `WORKERS_AI_PDF_MODEL`, 그 외는 `WORKERS_AI_MODEL`(둘 다 없으면 `WORKERS_AI_MODEL` → 기본 체인). 오버라이드는 **쉼표 구분 목록**도 받으며 그 순서가 체인이 된다.
- 🔴 **모델 폐기는 예고 없이 온다** — `@cf/meta/llama-3.1-8b-instruct` 와 `@cf/moonshotai/kimi-k2.5` 는 **같은 날(2026-05-30) 폐기**됐다(`5028: This model was deprecated`). 둘 다 새로 쓰지 말 것. Gemini 가 살아 있는 동안은 폴백이 안 쓰여 폐기를 아무도 모르다가 장애 순간에 안전망이 없는 게 드러나므로, **단일 모델로 되돌리지 말 것**(체인이 그 대비다). 유료 전용(Workers Free plan 미지원) 상위 모델로 올리려면 `@cf/zai-org/glm-5.2`(출력 $4.40/M)·`@cf/moonshotai/kimi-k2.6`($4.00/M)를 env 오버라이드로 넣는다.
- **폴백 품질 한계(2026-07-30 실측)**: 70B는 장문 지시에도 **목표 분량의 60~77%만 쓰고 스스로 멈춘다**(`finish_reason: "stop"`, `completion_tokens` 840 / 상한 8,000). **`maxOutputTokens`를 올려도 늘지 않으므로 다시 재지 말 것.** 이 한계가 1차 glm-4.7-flash 에서도 같은지는 **아직 실측 전**이다 — 아래 `fallbackMinChars` 게이트가 그대로 안전장치가 된다. 그럼에도 폴백은 켜 두는 쪽이 맞다 — 끄면 Gemini 장애 시 사용자가 받는 것은 짧은 결과가 아니라 실패 안내 문구다.
- 🔴 **폴백을 켠 유료 라우트는 `fallbackMinChars`를 반드시 함께 준다** (`worker/lib/gemini.js`의 `rejectShortFallback`). 이 라우트들은 "경량 보장 계약"으로 렌더 가능한 텍스트(≥400자)면 결제 성공으로 전달하기 때문에, 그냥 켜면 **2만자 상품이 8% 분량으로 정상 결제 처리**되고 재시도·환불 경로가 사라진다. 관례는 **그 기능의 최소 분량 상수 × 0.4**이며, 문턱 미달이면 호출이 실패로 돌아 각 라우트의 기존 실패 처리가 그대로 돈다. **Gemini 응답에는 적용되지 않는다**(기존 동작 불변).
- JSON 구조화 상담은 `callGeminiJsonWithRetry`가 폴백 응답의 코드펜스·설명문을 자동 정화하므로(`worker/lib/structured-consultation.js`) 라우트별 파서를 고칠 필요가 없다. 그 헬퍼를 안 쓰는 경로만 첫 `{`~마지막 `}` 슬라이스를 직접 넣는다.
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
- 🔒 **[필수·예외없음] 모든 유료 결제 게이팅 순서** (2026-08-01 개정 — 축이 "언제 검사하는가"에서 "이용권 보유자가 어떤 경로로도 돈을 내지 않는가"로 바뀌었다). 신규/수정 불문 모든 유료 기능은 아래를 그대로 따른다. 벗어나는 결제 구현은 금지이며, 발견 시 즉시 사용자에게 보고한다(작업 중 우연히 마주쳐도 그냥 지나치지 말 것):
  1. **진입 판정은 로컬 스냅샷만** — 구독 스냅샷(`cd_subscription_snapshot_v2`, 판정 정본 `js/core/pass-verdict.js`)이 커버를 확답하면 서버 왕복 없이 **즉시 무료 통과**(낙관 grant, 서버 기록은 백그라운드). 확답하지 못하면 **기다리지 말고 결제창**을 연다. 🔴 **진입 시 서버 이용권 선검사를 되살리지 말 것** — 그 왕복(구 셸 6초 예산+재시도 2회, React 15초 프로브)이 결제창 앞 지연의 본체였다.
  2. **결제창이 이용권 검사 지점** — 결제창 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`)이고, 누르면 그 자리에서 서버에 물어 커버되면 결제 없이 무료로 열고, 아니면 이용권 상점으로 인계한다(`/points?plan=…&cdco=1` → 결제 확인 모달 자동 오픈 → 결제 후 원래 화면 복귀). 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고, 단건/월정석은 동등 우선순위다(`equalPriorityMethods: ["DIRECT_KRW","MOONLIGHT_STONE"]`).
  3. **서버 최종 안전망** — 카드 주문 직전 `grantPassFreeAccessBeforeCardIfAvailable`(`worker/routes/billing.js`)이 **DIRECT_KRW를 명시했더라도** 이용권 커버를 검사해 커버되면 주문을 만들지 않고 `accessMethod:"PASS"`/`charged:0`을 반환한다. 스냅샷 없는 이용권 보유자(새 기기·시크릿창·저장소 삭제)가 결제되지 않는 근거가 여기다.
  4. **단건 결제(PortOne)는 사용자가 결제창에서 '단건'을 고른 이후에만** 실행(`_cdRunDirectKrwCheckout`/`_dpRunDirectKrwCheckout`에 도달).
  - **금지 패턴(=위반, 발견 시 보고 대상)**: ① 결제창에서 **[이용권으로 구매] 카드를 없애거나 단순 상점 링크로 되돌리기**(스냅샷 없는 보유자가 확인할 방법을 잃는다) ② 진입 경로에 서버 이용권 선검사 부활(`CD_PASS_FIRST_BUDGET_MS`·`CD_PASS_SLOW_NOTE` 부활 금지, `snapshotVerdictOnly` 제거 금지) ③ `grantPassFreeAccessBeforeCardIfAvailable` 앞에 `shouldCreateDirectPortOneOrder` 조기 반환 재삽입(= 안전망 자폭) ④ 결제창에 단건 또는 월정석 한쪽만 노출 ⑤ 서버 runtimeGate/paymentPayload에 `paymentMode:"DIRECT_KRW"` 하드코딩(월정석 옵션 소거 — 과거 ziwei-ai에서 제거된 결함) ⑥ 공유 게이트(`useCoinGate`/`_cdOpenPaidServiceGate`/정적 결제 모달) 우회하는 커스텀 체크아웃 ⑦ 🔴 **앱에서 `/points`로 프로그래매틱 이동**(앱 번들에 없고 `app-payment-guard`는 앵커 클릭만 가로챈다 → 빈 화면). 반드시 `window.__cdOpenChargeModal`(가드가 `/app/store/`로 고정)을 먼저 타며, 판정 정본은 `js/core/checkout-entry.js`의 `shouldUseAppStoreEntry()`(애매하면 앱 경로로 폴백).
  - **예외**: 프로필 카드 추가·삭제(D유형, `passExcluded`) **모두** 이용권 결제 불가라 이용권 옵션 없이 곧바로 결제창(단건/월정석)을 연다 — 그래도 두 결제수단은 동등 노출. **family 포함 모든 등급**이 이용권 커버 대상이 아니며(서버 정본은 `isPassExcludedPricing` 하나 — featureKey별 예외 분기 금지), family 무료는 이용권 결제가 아니라 정책 계층(`profile-card-mutation-policy.js`)의 0원 바이패스로 처리된다. 계정당 첫 카드도 등급 무관 무조건 무료. 상세는 [content-access D유형](docs/payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료).
  - **검증**: 결제 관련 수정 시 `npm run verify:billing-pass-policy`·`verify:portone-single-payment`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`를 먼저 실행. `verify:checkout-pass-card`는 문자열이 아니라 **jsdom에서 이용권 카드를 실제로 눌러** 두 갈래(커버→무료 통과 / 미커버→상점 인계)와 앱 분기를 확인한다. 뒤 두 개는 가격/과금유형 정본(`paid-feature-registry.js`)과 프론트 게이트·워커 라우트의 정합성을 보는 가드로, GitHub Actions "Paid Flow Gates"에서도 차단한다. 상세 규칙은 [flow 문서 결제창 노출 규칙](docs/payment-policy-flow.md) 참고.
  - 🔴 **결제수단 선택창 UI는 단일 규격이다** — 렌더러가 3종(정적 셸 `index.html` `_cdChooseServicePaymentMode` + 5미러 / React `app/_lib/billing-client.ts` `openReactPaymentChoiceModalInner` / 독립 정적 폴백 `js/destiny-profile.js` `_dpRenderStandalonePaymentChoice` + `public/js` 사본)이지만 **정본은 셸 인라인 하나**다. CSS 정본은 `_cdEnsureDirectPaymentStyles`의 규칙 배열이고 클래스 프리픽스는 `cd-direct-payment-*`로 고정. 세 곳 모두 "달빛 결제 방식 선택" 제목 + 달 헤더 + **[이용권으로 구매]/단건 결제/월정석 3옵션**(이용권 카드가 맨 위 + `추천` 배지, 클릭 시 그 자리에서 서버 이용권 검사) + 월정석 잔여바(`월정석 재조회`)를 렌더해야 하며, `npm run verify:payment-choice-parity`가 CSS 텍스트 동일성·구조 마커·**3옵션 설명 문구 동일성**을 강제한다(예전에는 문구가 렌더러마다 달라도 통과했다). 진입·복귀·계측 배관은 `js/core/checkout-entry.js` 하나를 공유한다. 페이지 전용 결제창을 새로 만들지 말 것(과거 `celestial-harmony.html`의 `.celestial-pay-*`는 이용권 상점 카드가 없어 제거됨 — 독립 정적 페이지는 `/js/destiny-profile.js`를 로드하면 정본 폴백이 자동 인계된다).
- **코인은 폐지된 개념** — 서버 내부 계산에만 남아있고, 사용자에게는 항상 통화(현재 KRW, `1코인=100원` 고정 — `worker/lib/billing-policy.js`, 프론트는 `lib/payment/coin-pricing.ts`)로 환산해 표시. 신규 UI 작성 시 `coinPrice`/`cost`를 그대로 렌더링하지 말 것
- 신규 유료 기능은 "재열람 가능한 고정 콘텐츠"인지 "매번 생성되는 개인화 결과"인지에 따라 잠금 콘텐츠(`unlock.*`, `forceDeduct: true`) 또는 회당 결제(`PER_USE_PAID_FEATURE_KEY_LIST`)로 등록 — 판별 기준은 [content-access 문서](docs/payment-policy-content-access.md) 참고

### 관련 핵심 파일 레퍼런스

| 파일 | 역할 |
|------|------|
| `worker/lib/paid-feature-registry.js` | 모든 유료 기능 가격/유형 정의 |
| `worker/lib/content-unlocks.js` | 콘텐츠 잠금 해제 관리 (`ContentEntitlement`, `getUnlockedContentSnapshot`) |
| `worker/lib/billing-policy.js` | 코인↔KRW 환산 상수/함수 (`KRW_PER_COIN = 100`) |
| `lib/payment/coin-pricing.ts` | 프론트용 코인→KRW 표시 유틸(`formatKrwFromCoins`) |
| `worker/lib/models.js` | DB 스키마 (`profileSubscription`, `MonthlyCreditLedger`, `pointHistorySchema`) |
| `worker/routes/fortune.js` | 사주/자미두수 접근 게이팅 (`accessSource` 분기) · `PERSISTENT_UNLOCK_KEY_SET` |
| `worker/lib/nakshatra-paid-access.js` | 회당결제 라우트의 서버측 결제 증빙 확인 (`verifyPerUsePayment`) |
| `app/hooks/useCoinGate.ts` | 프론트 단건 결제 훅 |

🔴 **`PERSISTENT_UNLOCK_KEY_SET`은 영구 해금의 기록 주체가 아니다** — 위치도 `content-unlocks.js`가 아니라 `worker/routes/fortune.js`다. 해금을 실제로 기록하는 곳은 `User.unlockedFeatures`이고, coin-gate(`billing.js`)와 카드 단건결제(`payments.js` `recordUserPaidFeature`)가 `isUnlockPaidFeatureKey` 기준으로 함께 쓴다. 저 상수는 `/api/fortune/*` 응답의 `unlockedFeatures`/`unlockMap` 필터와 PointHistory 복구 경로 전용이라, **신규 잠금 기능을 추가할 때 여기 등록하지 않아도 결제·재열람은 정상 동작한다**(같은 계약의 `ziwei-island-deep-report`·`nakshatra-lord-report`·`nakshatra-dasha-map`이 모두 미등록 상태로 동작 중). 등록이 필요한 경우는 그 키를 `/api/fortune/*` 응답으로 내보내야 할 때뿐이다.

## Content Assets

- **캐릭터**: "연이(Yeon)" 마스코트 — `components/yeon/` (FloatingCharacter, SpriteFrame, TypewriterBubble 등)
- **연이 이미지 자산은 화면별로 용도가 고정되어 있다** — 이름이 비슷하다고 임의로 바꾸지 말 것:
  - 메인 홈 히어로 상단(`index.html` `.moon-hero__picture--mascot`): 연이 모드=자는 연이(`/fuctionassets/자는 연이.png`), 네오 모드=전략실 네오(R2 `DestinyWar/전략실 네오 메인-Photoroom.png`, `syncHeroMascot`가 테마 전환 시 교체)
  - 운명 찻집 타로 앨범 히어로(`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`의 `TarotAlbumHero`): 연이 스프라이트7(`fortuneTeaHouseAssets.yeoni.transparent.sprite7CharacterR2`)을 크롭+idle 애니메이션으로 표시 — 자는 연이 이미지로 바꾸지 않는다
  - 어떤 화면에 어떤 연이 자산이 맞는지 확실치 않으면 추측해서 교체하지 말고 반드시 먼저 사용자에게 확인한다(코딩 원칙 1번 참고)
- **음악**: `app/music/` 라우트, 실제 음원은 외부 CDN(`music.code-destiny.com`)에서 서빙 (레포에는 커버아트만 `public/music-covers/`)
- **웹소설/비주얼 노벨(브랜드 정체성)**: 텍스트 리더 `app/stories/`(원문 `lib/stories/chapters/*` + `data.ts`; `models/Story.ts`는 미사용 데드코드). 비주얼 노벨(VN) = 단일 자립형 `public/codedestiny-novel.html`(EP1~5, `/stories`에서 CTA 진입). **전체 스토리 흐름은 만화 이누야샤 구조 참조**(고유명사·설정 차용 없이 구조만) — 가이드: [docs/webnovel_review/webnovel_story_guideline.md](docs/webnovel_review/webnovel_story_guideline.md), 결말 아크 상세: [docs/webnovel_review/webnovel_ending_arc_outline.md](docs/webnovel_review/webnovel_ending_arc_outline.md)
- **PDF 리포트**: 인생의 책은 `/life-book-ai`(구 `app/pdf/life-book`은 리다이렉트), PDF는 클라이언트에서 `html2canvas`+`jspdf`로 생성하며 현재 Worker 쪽 PDF 보조 로직은 `worker/lib/pdf-runtime.js`를 기준으로 본다.
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
- `.env*` 패턴의 모든 환경변수 파일 (절대로 깃허브에 업로드 금지 — `.env.local`, `.env`, 서버 전용 env 파일 등)
- `dist/`, `out/` (빌드 산출물)
- 마이그레이션 스크립트 실행 결과물 (`scripts/migrate-*` 자체는 리뷰 후 신중히 수정)

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

- 🔴 **모바일 최적화 = 인체공학만 (UI 재디자인 금지)**: 모바일 전용 공용 래퍼(`MobileFeatureDetail` / `styles/mobile-lite.css`)는 **탭 타깃(44px)·입력 폰트(16px, iOS 확대 방지)·가로 오버플로 방지·세이프에어리어**까지만 다룬다. 기능이 소유한 요소의 색·타이포·배경·테두리·위치(`sticky`/`fixed`)를 덮거나, 마크업에 없는 배지를 `content: attr()` 로 주입하지 않는다. **기능 화면은 모바일에서도 데스크탑과 같은 자기 디자인으로 보여야 한다.** 특정 기능의 모바일 문제는 공용 래퍼가 아니라 **그 기능의 CSS 에서** 고친다(래퍼로 덮으면 나머지 17개 기능이 함께 망가진다 — 2026-07 sticky 이름판·팔레트 재도색 사고). 가드: `npm run verify:mobile-detail-nonintrusive`(CI 차단) + `npm run verify:mobile-detail-render`(실렌더). 계약: [MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md](MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md)
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
  - 작업 중 취약점, 보안 위험, 재현 가능한 버그를 발견하면 즉시 사용자에게 보고하고, 필요하면 다른 세션에서 분리 디버깅할 수 있도록 위험도와 짧은 제안도 함께 남긴다.
  - 판단이 애매하면 자동 배포하지 말고 안내를 택한다(회귀 위험 상시 점검 원칙 우선).
- 🔴 **워커 배포는 커밋이 아니라 워킹트리를 민다 — 낡은 베이스면 남의 워커 커밋이 사라진다**: `wrangler deploy` 는 PR·CI 를 안 거치고 현재 트리를 그대로 프로덕션에 올린다. 그래서 베이스가 낡았으면 그 사이 main 에 머지된 `worker/`·`lib/` 변경이 **즉시 조용히 증발**한다(2026-08-01 하루에 서로 다른 세션에서 3회 발생 — #222·#223·#224·#226 이 각각 사라졌다). `git status` 가 깨끗한 것과 베이스가 최신인 것은 **별개 문제**라 눈으로는 안 잡힌다.
  - 이제 `scripts/lib/worker-deploy-base-guard.mjs` 가 배포 직전 자동으로 막는다 — "내 HEAD 에 없는데 origin/main 에는 있는 `worker/`·`lib/` 커밋"이 하나라도 있으면 사라질 커밋 목록과 함께 exit 1. 내 변경은 안 잡히고(오탐 없음), `scripts/`·`.github/` 만 바뀐 커밋도 안 잡힌다. 막히면 `git rebase origin/main` → verify 재실행 → 재배포. 의도한 롤백이면 `-- --allow-stale`.
  - 배포에는 `--message "<sha> @<branch>"` 가 자동으로 붙는다. `npx wrangler deployments list` 로 **라이브 버전이 어느 커밋인지 확인**할 수 있다(예전엔 전부 `-` 라 "지금 뜬 게 내 코드인가"를 따질 방법이 없었고, 그게 사고를 키웠다).
  - 가드 자체는 `npm run verify:deploy-base-guard` 가 임시 저장소를 만들어 차단·통과·오탐없음까지 실제 실행으로 검증한다(CI 포함).
- 🔴 **`_next/static` 404 = 파일 부재가 아닐 수 있다**: Pages 배포 전환 틈새에 나간 404 를 Cloudflare 가 `max-age=172800`(2일)로 캐시해, 오리진에 파일이 멀쩡해도 그 URL 만 이틀간 죽는다. HTML 은 `no-store` 라 새로고침해도 같은 죽은 URL 을 다시 요청한다 — **롤백해도 안 고쳐진다**(내용이 같으면 해시가 같아 같은 URL 을 가리킴). 판별은 `curl <url>` vs `curl <url>?cdcb=1` 로 하고, 다르면 엣지 캐시 오염이다. 배포 파이프라인에 가드 2종이 있다: 배포 전 `ensure:pages-single-deploy`(CF 프로덕션 Git 자동빌드가 켜지면 이중 배포 → 청크 해시 불일치, 자동으로 되끔), 배포 후 `verify:deployed-assets`(참조 자산 전량 200 확인, 죽었으면 잡 실패). 클라이언트 자가복구는 `app/layout.js` 인라인 패치(스타일시트는 error 이벤트가 리스너보다 먼저 끝나므로 사후 스윕이 필수).
  - **남은 수동 조치**: Cloudflare 대시보드 → Caching → Cache Rules 에 `URI Path starts with /_next/static/` → `Edge TTL: by status code → 404: Bypass cache` 를 걸면 이 404 가 애초에 캐시되지 않아 근본 차단된다. 레포 토큰들에는 Zone 권한이 없어 코드로는 못 넣는다.
- 세션 전환 시 `/clear`로 컨텍스트 오염 방지
- **모델 선택 규칙**:
  - **코딩 작업**(버그 수정, 기능 구현, 리팩토링 등): `claude-opus-4.8` + reasoning effort `high` 이상 고정 — 복잡한 로직·회귀 분석·설계 결정에 강화된 능력 필요
  - **파일 검색·스캔**(Glob, Grep, 코드베이스 탐색): `claude-haiku-4-5-20251001` 고정 — 검색은 정확도·속도 충분, 사용자 요청 여부 무관 반드시 Haiku 사용 및 안내 필수
  - **커밋 메시지·코드 리뷰·일상 대화**: `claude-haiku-4-5-20251001` 고정 — 토큰 효율성과 빠른 응답 속도 우선

## Codex Override: Worktree-Only PR-First Delivery

- This section is authoritative for Codex and supersedes any older Worker auto-deploy, current-worktree branch, or direct-deploy wording in this file.
- Never edit, commit, push, or deploy from the primary repository worktree, `main`, `master`, or detached HEAD. Create a secondary worktree from the latest `origin/main` with `scripts/create-safe-worktree.ps1`.
- Run `npm run verify:worktree-policy -- --mode=edit` before editing and `npm run verify:worktree-policy -- --mode=pr` before PR creation. PreToolUse hooks enforce the edit rule where supported.
- Do not deploy directly to production during normal coding work.
- Keep high-risk changes on a feature branch and create a PR targeting `main`. For a low-risk, committed secondary-worktree change, `npm run release:fast` may push `HEAD:main` only after range-based checks classify it as low risk. It never commits or bypasses high-risk checks.
- The PR must record validation commands, mock/sandbox validation results, regression risks, confirmed no-regression scope, and rollback method.
- Do not run real LLM API calls, real payments, production DB writes, production Pages/Worker deploys, or production cancel/refund/reconcile actions without explicit user approval for that exact action.
- Use fake/stub LLM responses, sandbox/mock payment flows, and local/test DB or mocked models by default.
- Merge only after required CI checks and review approvals pass, no blocking review or conflict remains, the final diff matches the approved scope, and the user explicitly approves the merge for the current task. Production deployment remains a separate explicit approval and is CI-only from `main`.

## Doc Precedence

- For Codex work, `AGENTS.md` is the active execution contract.
- `docs/CURRENT_DEV_BASELINE.md` is the latest working summary for current service development focus.
- `CLAUDE.md` is project context and reference material.
- If these docs disagree, do not merge the rules silently. Reconcile the mismatch in `docs/CONTEXT_AUDIT.md` before coding.
