# AI 호출 · MongoDB/Atlas 튜닝 상세

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## AI & API

- **Pro 사용 범위(2026-10-13)**: `lib/gemini-model-policy.js`가 모델 선택의 정본이다. 일반 본문·후속 설명은 Flash를 사용하며, Pro 환경값도 일반 호출에서는 Flash로 제한한다. 서버가 지정한 `fusion-integration`·`fusion-verdict`·`tuna-synthesis`만 Pro를 사용한다. 사용자 질문이나 상품 가격으로 Pro 사용을 결정하지 않는다. 참치의 종합 장도 실행 계획만 정리하는 `action` 장은 제외한다. 실제 명식·천문 계산은 기존 계산 엔진을 유지한다. 재시도는 같은 분류를 따르고, 명시적 컨텍스트 캐시는 모델별로 생성·해제한다. 기존 저장 결과와 본문 분량·품질 기준은 유지한다.
- 🔴🔴 **검증은 mock 기본, 실호출은 사전 허락 필수** — 절대 규칙 1번(LLM 실호출 금지, 최우선)이 이 섹션 전체에 적용된다. 프롬프트·분량·폴백을 고쳤다고 실제 Gemini/Workers AI 를 부르지 말 것. mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입)·`scripts/verify-workers-ai-fallback.mjs`(키 제거), 실호출은 `--live` + **사용자 허락 1회 한정**. 스테이징 허용 계정 실경로(2026-11-18)는 아래 [스테이징 허용 계정 실호출](#스테이징-허용-계정-실호출-2026-11-18-사용자-결정) 절을 따르며, 그 검증 실행도 회차마다 1회 승인이다.
- **Gemini 호출**: `lib/llm-client.ts` (실제 구현체, `worker/lib/gemini.js`·`gemini-client.js`는 얇은 래퍼). 모델 `gemini-2.5-flash`, REST `generateContent` 엔드포인트 직접 호출(SDK 미사용). API 키는 `GEMINIF_API_KEY` 단일 키만 사용(다른 키 이름 참조는 제거됨).
- 🔴 **Gemini 입력은 생성 전에 50,000토큰으로 하드 차단**한다 — 정본 `lib/gemini-input-token-limit.mjs`가 비과금 `models.countTokens`로 전체 `GenerateContentRequest`(시스템 지시·멀티모달 포함)를 확인한다. 50,000 초과는 다른 공급자로도 우회하지 않고, 계산 실패는 Gemini 생성만 막은 뒤 기존 Workers AI 폴백 계약을 따른다. 공통 `llm-client`뿐 아니라 직접 REST를 쓰는 love-reading·mindscan·oracle 3경로에도 같은 정본을 사용한다. 환경값으로 상한을 올리는 우회는 두지 않는다.
- 🔴 **Workers AI 입력도 `env.AI.run()` 전에 50,000토큰 보수 상한으로 하드 차단**한다 — 정본 `lib/workers-ai-input-token-limit.mjs`는 모델 공통 `countTokens` API가 없는 제약 때문에 실제 content의 UTF-8 바이트 수에 채팅 템플릿 여유 512를 더한 값을 토큰 상한으로 사용한다. 기본 GLM/Llama는 공식 컨텍스트 창에서 요청 출력·예약분을 뺀 값이 더 작으면 그 상한을 쓴다. 초과하면 폴백 체인의 첫 모델도 호출하지 않으며, 환경값으로 상한을 올리지 않는다. 공급자 응답에 `usage` 토큰이 있으면 실제 값을 기록하고, 없을 때만 문자 수 추정을 `estimated` 값으로 남긴다.
- **Workers AI 폴백**: Gemini 실패/타임아웃 시 자동으로 `env.AI.run()` 호출. 기본값은 단일 모델이 아니라 **체인**이다(`lib/llm-client.ts`의 `DEFAULT_WORKERS_AI_MODELS`) — 1차 `@cf/zai-org/glm-4.7-flash`(컨텍스트 131k, `response_format` 지원, 출력 $0.40/M), 2차 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`(컨텍스트 24k, 출력 $2.25/M). 앞에서부터 시도해 첫 성공을 쓰고, 폐기·스키마 거부·빈 응답이면 다음으로 넘어간다. PDF/비PDF는 모델이 아니라 **env 오버라이드 키만** 다르다 — PDF는 `WORKERS_AI_PDF_MODEL`, 그 외는 `WORKERS_AI_MODEL`(둘 다 없으면 `WORKERS_AI_MODEL` → 기본 체인). 오버라이드는 **쉼표 구분 목록**도 받으며 그 순서가 체인이 된다.
- 🔴 **모델 폐기는 예고 없이 온다** — `@cf/meta/llama-3.1-8b-instruct` 와 `@cf/moonshotai/kimi-k2.5` 는 **같은 날(2026-05-30) 폐기**됐다(`5028: This model was deprecated`). 둘 다 새로 쓰지 말 것. Gemini 가 살아 있는 동안은 폴백이 안 쓰여 폐기를 아무도 모르다가 장애 순간에 안전망이 없는 게 드러나므로, **단일 모델로 되돌리지 말 것**(체인이 그 대비다). 유료 전용(Workers Free plan 미지원) 상위 모델로 올리려면 `@cf/zai-org/glm-5.2`(출력 $4.40/M)·`@cf/moonshotai/kimi-k2.6`($4.00/M)를 env 오버라이드로 넣는다.
- **폴백 품질 한계(2026-07-30 실측)**: 70B는 장문 지시에도 **목표 분량의 60~77%만 쓰고 스스로 멈춘다**(`finish_reason: "stop"`, `completion_tokens` 840 / 상한 8,000). **`maxOutputTokens`를 올려도 늘지 않으므로 다시 재지 말 것.** 이 한계가 1차 glm-4.7-flash 에서도 같은지는 **아직 실측 전**이다 — 아래 `fallbackMinChars` 게이트가 그대로 안전장치가 된다. 그럼에도 폴백은 켜 두는 쪽이 맞다 — 끄면 Gemini 장애 시 사용자가 받는 것은 짧은 결과가 아니라 실패 안내 문구다.
- 🔴 **폴백을 켠 유료 라우트는 `fallbackMinChars`를 반드시 함께 준다** (`worker/lib/gemini.js`의 `rejectShortFallback`). 이 라우트들은 "경량 보장 계약"으로 렌더 가능한 텍스트(≥400자)면 결제 성공으로 전달하기 때문에, 그냥 켜면 **2만자 상품이 8% 분량으로 정상 결제 처리**되고 재시도·환불 경로가 사라진다. 관례는 **그 기능의 최소 분량 상수 × 0.3**이며(2026-10-30 0.4→0.3: 분량은 목표일 뿐이고 결제 뒤 전달이 우선이다), 문턱 미달이면 호출이 실패로 돌아 각 라우트의 기존 실패 처리가 그대로 돈다. **Gemini 응답에는 적용되지 않는다**(기존 동작 불변).
- JSON 구조화 상담은 `callGeminiJsonWithRetry`가 폴백 응답의 코드펜스·설명문을 자동 정화하므로(`worker/lib/structured-consultation.js`) 라우트별 파서를 고칠 필요가 없다. 그 헬퍼를 안 쓰는 경로만 첫 `{`~마지막 `}` 슬라이스를 직접 넣는다.
- **MongoDB**: 연결 env는 `MONGO_URI`/`MONGODB_URI`. 신규 코드는 기존 두 싱글턴 패턴(`worker/lib/db.js` 또는 `app/_lib/dbConnect.js`) 중 이미 쓰이는 쪽을 따를 것 — 새 패턴 추가 금지.
- 🔴 **Atlas 티어는 M10 이다(2026-08-12, M0 에서 전환). 커넥션 튜닝의 방향이 그때 뒤집혔다 — 되돌리지 말 것.**
  - **M0 의 벽**: 총 연결 500(공유). → 처방은 "커넥션을 **아껴 쓴다**"(작은 풀, 짧은 `maxIdleTimeMS` 로 회전율↑).
  - **M10 의 벽**: 총 연결은 노드당 1,490(3노드)로 널널해진 대신, **신규 커넥션 생성률이 노드당 초당 15개**로 제한된다(M10·M20 전용. M30 이상엔 없다). 초과분은 큐잉되고 포화가 지속되면 드롭된다. → 처방은 "커넥션을 **자주 새로 만들지 않는다**".
  - 그래서 **짧은 `maxIdleTimeMS` 는 M0 의 정답이자 M10 의 오답이다.** 유휴 상한을 줄이는 것은 곧 생성률을 올리는 것이다. 현재 값 60000(`worker/lib/db.js`·`worker/wrangler.toml [vars]` 양쪽). 🔴 **20000 으로 되돌리지 말 것** — `__tests__/worker/db.pool-timeout-alignment.test.js` 가 하한으로 막는다(그 단언은 예전에 `<=30000` 상한이었고, 티어와 함께 방향이 뒤집혔다).
  - 진단은 코드를 읽기 전에 **Atlas Metrics → Connections 그래프 모양**부터 본다: 톱니(sawtooth)면 churn(유휴 상한이 짧다), 계단식 상승이면 누수, 평탄이면 커넥션 문제가 아니다.
  - **M10 은 3노드 리플리카셋이다.** M0 에는 리플리카셋이 없어 `startSession().withTransaction()` 이 영구 503(`MONTHLY_ATOMIC_UNAVAILABLE`)이었고 코드가 그걸 우회하도록 쓰였다. 이제 그 경로 8곳이 **배포 없이 실제로 열린다** — 결제 경로를 만질 때 이 사실을 전제하라. `retryWrites`/`retryReads` 도 이제부터 실효가 있다.
  - 🔴 **새 `withTransaction` 은 반드시 `mongoTransactionOptions()`(`worker/lib/db.js`)를 두 번째 인자로 넘긴다.** 드라이버 기본 상한이 **120초**(`mongodb/lib/sessions.js` `MAX_TIMEOUT`)인데 우리 op 예산은 12초라, 안 넘기면 *"사용자에겐 실패라고 답했는데 트랜잭션은 뒤에서 커밋"* 이 가능해진다. `__tests__/worker/db.transaction-budget.test.js` 가 worker 전역을 스캔해 누락을 막는다.
  - `isTransactionUnsupported` 폴백(`payment-service.js`)은 M10 에서 **더 이상 발동하지 않는다.** 죽은 코드로 보고 지우지 말 것 — 티어가 다시 바뀔 때의 안전망이고, 폴백 조건이 `if (!isTransactionUnsupported(error)) throw error` 라 **타임아웃은 보상 경로로 새지 않는다**(이중 차감 방지의 핵심이므로 이 조건을 느슨하게 바꾸지 말 것).
  - 🔴 **`serverSelectionTimeoutMS` 는 3000 이다(2026-08-13 개정 — 이전의 "8000 을 줄이지 말 것" 규칙은 폐기).** 그 값은 선거 대기 장치가 아니라 **모든 요청의 시도 예산을 밀어 올리는 지렛대**였다: `attemptTimeoutFloor = serverSelectionTimeoutMS + 3500`(`worker/lib/db.js`) 이라 8000 이면 하한이 11500 이 되어 op 예산 8000 을 무시하고 시도당 11.5초씩 admission 슬롯을 붙든다(드문 선거를 위해 상시 비용을 내는 구조였고, 그게 하드 503 의 주요 공급원이었다). 선거 내성은 `retryWrites`/`retryReads` + `withMongoRetry` 재시도가 담당한다.
    - 🔴 **값은 `worker/lib/db.js` 코드 기본값과 `worker/wrangler.toml [vars]` 두 곳에 있고 반드시 같아야 한다.** env 가 코드를 이기므로 **한쪽만 고치면 조용히 무효가 된다** — 2026-08-12 `283afff11` 이 코드 기본값만 낮췄다가 프로덕션에서 통째로 안 먹은 실사고가 있다. 같은 세트: `MONGO_CONNECT_TIMEOUT_MS`(5000) · `MONGO_SOCKET_TIMEOUT_MS`(7000) · `MONGO_WAIT_QUEUE_TIMEOUT_MS`(4000).
- 🔴 **User 스키마 정본은 `worker/lib/models.js` 하나다.** 예전에 같은 `users` 컬렉션에 스키마가 3벌 있었고(레거시 Express·스크립트 전용 사본) 제약이 서로 달라 조용한 데이터 손상이 났다. 스크립트든 라우트든 User 를 쓸 때는 이 모듈에서 import 한다 — 새 `mongoose.model("User", …)` 선언을 만들지 말 것(`__tests__/worker/user-model-single-source.static.test.js` 가 막는다).
- **Cloudflare Workers 제약**: `worker/` 디렉토리는 Node 내장 API(`fs`, `net` 등) 사용 금지, 순수 fetch/Web API 기반 유지. `app/api/*` 라우트 중 Node API가 필요하면 `export const runtime = "nodejs"` 명시.
- **결제**: 클라이언트는 `lib/payment/portone.ts`(PortOne V2 브라우저 SDK 동적 로드), 서버는 `worker/lib/portone.js`(PortOne REST API) — 결제 로직은 SDK 패키지가 아닌 raw fetch로 구현되어 있음.

## 지리 — 워커는 LAX, Atlas 는 서울 (2026-08-21 실측)

> DB 가 느리다는 신고가 오면 **쿼리·인덱스·티어를 보기 전에 이 절을 먼저 본다.** 3.4초의 대부분은
> 쿼리가 아니라 왕복 거리다. 재현 명령은 각 줄에 함께 적었다.

### 무엇이 느린가

| 경로 | 값 | 재현 |
|---|---|---|
| `/api/reviews` 엣지 캐시 **미스** | **3,436~3,477ms** | `curl -s -o /dev/null -w '%{time_total}' 'https://code-destiny.com/api/reviews?page=<매번 다른 수>&limit=5'` |
| `/api/reviews` 엣지 캐시 **히트** | **152~159ms** | 같은 URL 을 두 번 |
| `/api/health` (DB 없음) | 153~174ms | `curl .../api/health` |
| Mongo 핸드셰이크(워커 안) | **1,273~1,305ms · 요청마다** | `npx wrangler tail code-destiny-web --config worker/wrangler.toml --format json` 에서 `[db-connect] ... elapsedMs=` |

🔴 **핸드셰이크는 요청마다 새로 낸다.** 요청 컨텍스트가 끝나면 그 소켓이 못 쓰게 되는 Cloudflare 의
성질 때문이고(`worker/lib/db.js` 소켓 수명 주석, 2026-08-16 실측), 풀 설정으로는 못 없앤다.
8회 요청 중 7회가 새 연결이었다.

### 왜 그런가 — 플랜이 아니라 **애니캐스트 IP 대역**이다

같은 머신(KT/AS4766, 수원)에서 같은 시각:

| 호스트 | A 레코드 | colo | 신규 연결 |
|---|---|---|---|
| `code-destiny.com` | `104.21.7.195` / `172.67.187.253` | **LAX** | 422~465ms |
| `staging.code-destiny.com` | 같은 IP | **LAX** | 431ms |
| `api.code-destiny.com` | 같은 IP | **LAX** | 422ms |
| `code-destiny-web.bulegyung.workers.dev` | `104.21.43.189` / `172.67.184.77` | **LAX** | 423~483ms |
| `codedestiny-5md.pages.dev` | `172.66.47.137` / `172.66.44.119` | **ICN** | **21~48ms** |
| `cloudflare.com` | `104.16.133.229` | **ICN** | 22ms |

재현: `node -e "fetch('https://<host>/cdn-cgi/trace').then(r=>r.text()).then(t=>console.log(t.match(/colo=.*/)[0]))"`

- 프록시 존과 `workers.dev` 가 쓰는 **`104.21.0.0/16` · `172.67.0.0/16` 만** KT 에서 LAX 로 빠진다.
- Pages CDN 대역 **`172.66.0.0/16`** 과 Cloudflare 자사 대역 `104.16.0.0/12` 는 ICN 으로 제대로 들어간다.
- 그래서 **플랜 업그레이드나 워커 설정으로 우회할 수 없다.** `workers.dev` 로 API 를 옮기는
  우회로도 막혀 있다(같은 대역이라 똑같이 LAX 다 — 실측으로 확인했다).
- Cloudflare 커뮤니티에 2026-08 에 같은 신고가 다수 있다(전부 KT/AS4766, 같은 두 프리픽스).

### 3.4초의 구성

DB 연산 수만 다른 세 경로를 비교하면 구조가 나온다(2026-08-21, 같은 시각):

```
DB 연산 0회  /api/health          170ms
DB 연산 1회  /api/reviews/summary 2,732ms   (+2,562ms)
DB 연산 2회  /api/reviews         3,450ms   (+  718ms)
```

첫 DB 연산이 **2,562ms** 인데 이는 핸드셰이크(1,285ms)의 **두 배**와 8ms 차이로 맞는다. 드라이버가
여는 연결이 두 벌이기 때문이다 — SDAM 모니터링 연결과 실제 연산용 풀 연결은 별개다. 두 번째
연산은 718ms 만 더 드는데, 그 연결은 첫 연산과 겹쳐 열리기 때문이다.

🔴 **미검증**: 위 "두 벌" 해석은 산술 일치에서 온 추론이다. 확정하려면 워커에 계측을 넣어
스테이징에서 재야 한다(스테이징도 같은 LAX↔서울 구도라 그대로 재현된다).

### 레버 (2026-08-21 기준, 아직 고르지 않음)

1. **Atlas 리전 이전(서울 → us-west)** — 왕복이 150ms → 한 자릿수가 되므로 3,450ms → 추정 250~400ms.
   티어가 M10(전용)이라 Atlas 라이브 리전 마이그레이션이 가능하다. 🔴 다만 **Cloudflare 가 KT
   라우팅을 고치면 정반대가 된다**(워커가 ICN 으로 가고 DB 만 미국에 남는다). 되돌리기는 같은 작업.
2. **핸드셰이크 2회 → 1회** — 지리와 무관하게 ~1,285ms(37%) 절감이 기대값. 스테이징에서 검증 가능.
3. **엣지 캐시를 인증 경로까지 확장** — 공개 API 에서 22배가 나왔다(3,474ms → 155ms). 다만
   결제·이용권 정합성이 걸리므로 `docs/context/payment-gating.md` 를 먼저 읽을 것.
4. **Cloudflare 에 라우팅 신고** — Free 존은 커뮤니티 채널뿐이다.

### 쿼리·인덱스 (2026-08-30 실측)

- **싱글턴은 완결이다** — `worker/lib/db.js` `connectDb` 하나뿐이고 새 연결 패턴을 추가하지 않는다. 요청당 핸드셰이크는 위 "지리" 절의 Cloudflare 소켓 수명 때문이지 싱글턴 부재가 아니다.
- **요청 경로 쿼리 리터럴 = 인덱스 접두** — `explain` 실측([docs/db-query-plans-2026-08-30.md](../db-query-plans-2026-08-30.md), 재현 `npm run audit:mongo-query-plans`)에서 COLLSCAN 은 `users {referralCode}` 하나였고 나머지 후보 14개는 IXSCAN 이었다. 정적 분석으로 인덱스를 추측해 만들지 말고 `explain` 으로 확정한 뒤 `scripts/migrations/` 에 담는다(생성 실행은 사용자 허가). 새 요청 경로 쿼리가 선언 인덱스의 선두 키를 쓰는지는 `verify:mongo-query-index-shapes`(PR CI critical) 가 정적으로 잡고, 예외는 `config/mongo-query-index-allowlist.json` 에 사유와 함께 둔다 — 리터럴이 아닌 필터(`dynamic`)는 검사 밖이다.
- **캐시 히트는 쿼리가 아니라 핸드셰이크 ~1.3s 를 통째로 건너뛴다** — 그래서 인덱스보다 `worker/lib/cms-cache.js`·`credential-scoped-cache.js` 확장이 더 큰 레버다(결제·인증 판정 경로 제외).

## LLM 안전 규칙 (2026-08-28 `AGENTS.md` 에서 이관)

- AI 작업 전 [docs/LLM_AND_AI_POLICY.md](../LLM_AND_AI_POLICY.md) 를 먼저 읽는다.
- **LLM 정본 파일 5종** — 새 호출 경로를 만들기 전에 여기부터 본다.

  | 파일 | 역할 |
  |---|---|
  | `lib/llm-client.ts` | 프론트/공유 클라이언트 |
  | `worker/lib/gemini.js` | Gemini REST 직접 호출 |
  | `worker/lib/structured-consultation.js` | 구조화 상담 생성 |
  | `worker/lib/llm-cache-store.js` | 응답 캐시 |
  | `worker/routes/*-ai.js` | 기능별 AI 라우트 |

- 🔴 사용자가 **그 정확한 호출**을 명시적으로 승인하지 않으면 `--live` 나 실제 프로바이더 키를 쓰지 않는다.
- 승인된 실호출이라도 사전에 **호출 횟수 · 프로바이더 · 모델 · 비용/타임아웃 위험 · 결과 전달 방식**을 먼저 밝힌다.
- 🔴 테스트 목적으로 승인된 실호출의 **최종 생성 결과 전문은 사용자 검수용으로 반드시 전달**한다. 요약·통과 여부·품질 평가만 보내고 본문을 생략하지 않는다. 채팅 출력 한도를 넘으면 전체 원문을 로컬 검수 파일로 남기고 절대 경로를 전달한다. 비밀값·다른 사용자의 개인정보를 가렸다면 가린 범위도 함께 알린다.
- 캐시 키 · 멱등 키 · 재시도 한도 · `fallbackMinChars` 를 확인한다.
- 유료 AI 라우트는 **생성 전에** 결제/접근을 검사하고, 실패 시 복구·환불을 처리한다.
- 🔴 **생성 실패가 최악이다 (2026-09-25, 사용자 원문: "상한이 너무 빡빡하지 않도록 여유있게 해서 실패하지 않도록 최적화해줘 안된느것이 최악이고 이것은 룰에 추가해서 항상 기억하도록해줘").** 분량을 올리거나 판정기를 손볼 때마다 세 기준을 함께 맞춘다.
  - **하한 여유** — 목표만 올리고 하한은 따라 올리지 않는다. 하한 ≤ 목표 하한 × 약 0.8. 영냥이 v6 요청 하한(`minimumChars`, 프롬프트에 그대로 전달)은 0.73~0.81 이고 `__tests__/ui/yeongnyangi-reading-v6.test.mjs` 가 장·소절마다 0.82 를 넘으면 실패시킨다. **거부선은 요청 하한보다 낮다** — 장 합계는 목표 하한 × 0.7(`chapterFloor`), 소절은 소절 하한 × 0.7(`sectionFloor`, 목표의 약 0.57)이며 같은 테스트가 v4·v5·v6 전 상품에서 이 선을 고정한다(2026-09-27, 모델이 이미 쓴 장을 수백 자 모자라 버리던 재시도 낭비 제거).
  - **토큰 여유** — 출력 토큰 상한 ≥ 목표 상한 글자수의 토큰 환산(`tokensRequiredForChars`, 머리말 1,500자 포함) + thinking 예산. Gemini 2.5 는 thinking 토큰이 `maxOutputTokens` 를 잠식한다(`lib/llm-client.ts`). 잘림은 `FORTUNE_OUTPUT_TRUNCATED` 로 장 전체를 버린다.
  - **형식은 교정, 거부는 최후** — 모델이 자주 어기는 형식 상한(문단 500자 등)은 저장 전에 결정적으로 분할·정규화한다. 예: `worker/yeongnyangi/fortune/reading-quality.ts` `splitSectionParagraph` 는 문장 끝이 없어도 절·공백·상한에서 잘라 모든 조각을 상한 안에 넣는다. 판정기의 상한 검사 자체는 표시 계약으로 남긴다.
  - 🔴 **분량 미달은 단독 실패 사유가 아니다 (2026-09-27, 사용자 원문: "모든 LLM 기능들이 분량 기준이 아니라 내용이 좋아야해 분량 실패로 생성 실패해서 고객에게 전달안되는 일이 없도록 최적화해주길 바란다").** 분량이 모자라면 기존 재시도 예산 안에서 보강을 한 번 요청한다. 보강본이나 마지막 시도는 분량으로 다시 거부하지 않고, 구조(파싱·필수 섹션·빈 본문)·안전·근거·반복만 판정한다. 상한 초과는 거부하지 않고 결정적으로 자른다. 영냥이는 `LENGTH_FAILURES` + `validateReadingQuality(..., {lengthRepair})` 로 적용 완료했다(a7a439b43). 나머지 유료 LLM 약 30곳의 단계 계획은 [llm-length-never-fatal](../handoff/2026-09-27-llm-length-never-fatal.md)에 있다.
  - 새 거부 조건을 넣기 전에 재시도(자동 3회 + 수동 복구 2회)로 회복 가능한 실패인지 확인한다. 같은 입력에서 결정적으로 되풀이되는 거부는 재시도로 회복되지 않는다.
  - 검증은 여전히 mock 이다. 실제 통과율 확인을 위한 과금 실호출은 위 승인 규칙을 따른다.

## 스테이징 허용 계정 실호출 (2026-11-18 사용자 결정)

- **요청(원문)**: "스테이징에서도 llm 기능이 운영과 동일하게 잘되도록해줘야할것 같다. 테스트를 제대로 못하고 운영 반영되어서 이런 문제가 반복되고 명시적으로 승인할때 운영 승격되도록해". 선택(AskUserQuestion): "허용 계정만 실호출 (추천)", "운영과 같은 키".
- **동작**: 정본은 `worker/lib/staging-real-llm.js`이고, `worker/index.js`가 `withEngineRollout(withStagingLlmRouting(withDbScopes(app)))`로 fetch·queue·scheduled 진입을 모두 감싼다.
  - 스테이징 진입마다 `process.env`에 든 LLM 키 사본(nodejs_compat)을 `""`로 지운다. 이렇게 해야 `getEnv`·`readProcessEnv` 폴백과 `installProcessEnv`가 키를 다시 꺼내지 못한다.
  - fetch는 JWT를 DB 없이 확인한다(`peekAccessTokenUserId`). 계정이 시크릿 `STAGING_REAL_LLM_USER_IDS`(쉼표 구분 ObjectId)에 있으면 운영 LLM 플래그와 키가 든 view를 받는다. 플래그는 `PRODUCTION_LLM_FLAGS`: `STAGING_LLM_MOCK_ENABLED=false`, `WORKERS_AI_ENABLED=true`, `GUARDIAN_FORTUNE_LLM_PROVIDER=gemini`, `ENABLE_FUSION_FORTUNE_MOCK_FLOW=false`.
  - 다음 경우는 LLM 키(`STAGING_MASKED_LLM_KEY_NAMES`)와 허용목록을 뺀 view를 받는다. 그래서 키가 워커에 있어도 기존 staging mock이 그대로 돈다.
    - 허용목록 밖 계정, 게스트, 토스 토큰
    - JWT 확인 실패
    - OPTIONS 요청
    - queue, scheduled
  - 허용 view도 `APP_ENV=staging`이다. 따라서 테스트 결제 금액·스테이징 DB·결제 잠금은 스테이징 그대로다. 운영 워커에서는 env를 그대로 넘긴다(no-op).
  - 허용목록에 형식이 틀린 항목이 하나라도 있으면 목록 전체를 무시한다(전원 mock). 키가 없는 스테이징에서는 허용 계정도 mock이다. 운영 플래그만 켜면 전부 과금 Workers AI로 떨어지기 때문이다.
  - 관리자 역할만으로는 허용되지 않는다. 허용목록에 명시한 계정만 허용된다.
- **영냥이 큐**: 배치 단위 queue는 가린 view로 돈다. 장 생성까지 실경로로 보려면 `consumeConsultationQueue`가 행마다 `stagingLlmEnvForUser(env, String(row.userId))`로 env를 바꿔야 한다. 이 훅은 worker/yeongnyangi 소유 세션이 적용한다. 적용 전에는 첫 응답만 실경로이고 큐 장은 mock이다.
- **가드**: 아래 검사가 이 동작을 고정한다.
  - `__tests__/ui/staging-real-llm.test.mjs`: 파싱, 가림, process.env 정리, 진입 라우팅, export 배선
  - `npm run verify:staging-llm-mock`: 허용 밖 mock, 허용 view의 Gemini 경로(stub), 운영 no-op
  - 같은 verify가 두 toml `[vars]` 중 운영과 다른 LLM 변수가 `PRODUCTION_LLM_FLAGS` 또는 양쪽 off 목록에 분류됐는지도 본다. 미분류면 실패한다.
  - 같은 verify가 허용목록이 `[vars]`에 들어가면 실패시킨다.
- **런북**: 키와 허용목록은 스테이징 워커에만 넣는다. 운영 시크릿은 건드리지 않는다.
  1. 키(운영과 같은 값). 일괄 동기화에서는 계속 제외되며(`scripts/lib/staging-secret-policy.mjs`) `--only-key`로만 올린다.
     - `npm run secrets:cf:worker:dry -- --target=staging --only-key=GEMINIF_API_KEY`: 대상 워커가 `code-destiny-web-staging`인지, 출력에 값 없이 `wrangler secret put GEMINIF_API_KEY --name code-destiny-web-staging --config worker/wrangler.staging.toml` 한 줄만 나오는지 확인한다.
     - 확인되면 `npm run secrets:cf:worker -- --target=staging --only-key=GEMINIF_API_KEY`
  2. 허용목록. 동기화 스크립트의 `SECRET_KEYS`에 없으므로 `--only-key`로는 못 올린다. 운영 동기화로 새지 않도록 일부러 넣지 않았다. 직접 올린다: `npx wrangler secret put STAGING_REAL_LLM_USER_IDS --name code-destiny-web-staging --config worker/wrangler.staging.toml`. 값은 프롬프트나 stdin으로 넣고 채팅·파일·커밋에 남기지 않는다. 회원 ID는 스테이징 DB의 `users._id`(24자리 hex)다.
  3. `wrangler secret put`은 새 버전을 바로 배포하므로 재배포가 필요 없다. 동기화 스크립트가 Versions 가드 때문에 `versions secret put`으로 바꿨다면 그 버전 배포는 따로 필요하다.
  4. 확인: 허용 계정으로 로그인해 생성한다. 워커 로그에 `[llm provider_call] provider: 'gemini'`가 찍히는지 본다. 같은 화면을 비허용 계정으로 열면 `staging-mock`이어야 한다.
  5. 끝: 허용목록을 비우거나(`wrangler secret delete STAGING_REAL_LLM_USER_IDS …`) 키를 지우면 즉시 전원 mock으로 돌아간다.
- 🔴 **비용·승인**
  - 운영과 같은 키라 쿼터와 결제 예산을 공유한다. 사용량 계량(`recordGeminiUsage`)은 스테이징 DB에 쓰므로 운영 월 예산 경보는 스테이징 지출을 세지 않는다.
  - 실호출 검증 실행은 여전히 회차마다 사용자 1회 승인이 필요하고, 생성 원문을 전달해야 한다(절대 규칙 1).
  - 스테이징 결제 채널이 실승인일 수 있으므로 실호출 테스트는 관리자 무료 접근이나 이용권 경로로 하고 실결제는 하지 않는다.

## 유료 LLM 전달 계약 (2026-11-18 S5)

- **요청(원문)**: "확실하게 모든 llm 서비스가 제대로 결제 후 제공되어야하고 계속 이런 문제가 생기는데 재발 방지도 준비해줘", "결과가 제공되지 않으면 자동 환불이 되도록해주고".
- 🔴 **보장**: 결제(단건 카드·이용권·월정석·코인)된 유료 LLM 요청은 둘 중 하나로 끝난다 — 본문이 있는 `completed` 로 전달되거나, 환불. 대표 상담 7종은 환불 전에 무료 다시 시도 단계가 있다(아래 [다시 시도 우선](#다시-시도-우선-대표-상담-2026-11-20-r8)). 그 밖의 서비스는 `generation_failed` + 즉시 자동 환불. 금지 상태 3가지:
  1. `partial`·`generating`·`delivery_pending` 에서 영원히 대기
  2. 차감됐는데 결과도 환불도 없음
  3. 결과가 저장됐는데 볼 수 없음(완료 결과 재열람은 저장 원본으로, 추가 결제·차감·LLM 없이 — 보관함 규칙)
- **우선순위**(위에서부터 시도):
  1. Gemini 재시도 — 뒤에 Gemini 시도가 남은 호출은 보조 모델로 내려가지 않는다.
  2. Workers AI 는 **마지막 시도에만**(`lib/llm-client.ts` `finalProviderAttempt`; `finalAttempt === false` 면 Gemini 오류를 그대로 던진다).
  3. 구제 전달 — 본문이 이미 있으면(`delivery_pending`, 저장된 장) 환불·재생성하지 않고 그 본문을 전달한다. 늦은 이용권 차감 거절은 `worker/lib/late-usage-settlement.js` 로 `completed` + `llmMeta.usageSettlement='failed'` 표시.
  4. 확정 실패 → 대표 상담 7종은 다시 시도 가능 보류(무료) → 생성 + 7일 또는 고객 요청 때 환불. 나머지는 즉시 자동 환불 — 모든 결제수단. 공용 환불 경로는 `scripts/verify-paid-llm-delivery-contract.mjs` 의 `SHARED_REFUND_PATHS`.
- **새 유료 LLM 서비스 등록 의무**(빠지면 `npm run verify:paid-llm-delivery` 실패, `run-paid-gate-suite` 배선):
  - `worker/lib/consultation-recovery-registry.js` `PAID_LLM_DELIVERY_CONTRACT` 에 service·files·featureKeys·refunds(공용 환불 기호). 결제 원시함수+LLM 을 함께 쓰는 worker 파일이 미등록이면 실패한다.
  - 같은 파일 `PAID_LLM_DELIVERY_TESTS` 에 서비스 → 전달 테스트(`__tests__/(worker|ui)/*.test.(m)js`, 실재해야 함).
  - 공통 시나리오(정상·모든 시도 실패·늦은 차감 거절·이용권 선차감 후 실패·정체)는 `__tests__/worker/paid-llm-delivery-contract.test.js` 가 실제 이용권 차감·환불 함수와 메모리 DB 로 단언한다(이용권 함수 스텁 금지).
  - 환불 경로가 아직 없는 서비스는 `KNOWN_REFUND_GAPS` 와 정확히 같아야 한다 — 새 구멍은 실패, 메운 구멍은 목록에서 지운다.
- **정체 감시**(`worker/lib/paid-delivery-stuck.js`, 복구 cron `consultation-recovery-task.js` 배선):
  - 시도마다 진전 크기(휘발 필드 제외 문서 JSON 길이)를 기록하고, 1,000자 이상 늘지 않은 시도가 6회 쌓이거나 문서 나이가 6일(7일 복구 창 전)이 되면 정체로 본다.
  - 자동 확정(`STUCK_SETTLERS`)은 두 갈래다.
    - 공용 상태 환불(`GENERIC_STUCK_SETTLERS`: `new-year-ai`·`life-book-ai`): `delivery_pending` → 구제 전달(`usageSettlementReason: 'DELIVERY_STUCK'`), `generating|partial` → 창(생성 + 7일) 안이면 `generation_failed` + `llmMeta.retryable`(환불 없음, 다시 시도 보류), 창 밖이면 `llmMeta.refundEligibleAt` + `settleFailedConsultationRefund`(실패하면 cron 이 이어서 환불). life-book 은 `isStuckDeliveryComplete` 로 완성본일 때만 구제 전달한다(S16).
    - 자기 실패·환불 경로(S16, 2026-11-19): `love-secret-ai`·`neo-operation-room`·`heukwol`·`fortune-tea-house` 는 라우트 모듈이 `settleStuckDelivery(env, { doc, now, model })` 를 내보내고 cron 이 그것을 부른다. 완성본이면 전달, 아니면 본문 없이 창 안이면 다시 시도 보류(R2b·R5~R7), 창 밖이면 기존 환불 경로(1회). 모델 없는 찻집은 `recordDeliveryWatch` 도 내보낸다. 검증기는 공용 밖 설정자의 계약 파일에 이 export 가 없으면 실패한다.
    - `master-love-codex` 는 복구 어댑터가 아니라 자체 복구 작업(`worker/lib/master-love-codex-recovery-task.js`)에서 정체·상한을 닫는다. 웹 종결 실패는 다시 시도 보류, 창이 지나면 `expireCodexRetryHolds` 가 실패+환불로 닫는다.
    - 로그 `paid_delivery_stuck_settled`.
  - 설정자가 없는 복구 어댑터는 경보 로그 `paid_delivery_stuck_unsettled` 만 내고 상태를 바꾸지 않는다. 환불을 핸들러 실패 경로 안에서 인라인으로 하는 서비스는 바깥에서 상태만 `generation_failed` 로 바꾸면 "차감됐는데 환불 없음"을 새로 만들기 때문이다. 목록은 검증기 `KNOWN_STUCK_SETTLE_GAPS` 와 정확히 같아야 한다(2026-11-24 기준 비어 있음 — 새 어댑터는 설정자를 붙이거나 사유와 함께 올린다).

  자동 확정 추가(D1·D2, 2026-11-22): astrology·vedic·ziwei·sukuyo·karma·naming-prompt 는 `settleStuckRetryFirst`(다시 시도 우선, 창 밖이면 기존 환불), nakshatra·human-design·destiny-compass·relationship-boundary 는 결제 회수 확인 → `generation_failed` CAS → 기존 즉시 환불 1회.

  자동 확정 추가(2026-11-24, 경보 전용 0개):
  - celestial-harmony(`settleStuckCelestialDelivery`, `worker/lib/celestial-delivery-store.js`): 저장된 파트가 하나도 없을 때만 소진 종결과 같은 증빙(sourceTransactionId·paymentRef·metadata.billing) 저장 → 잠금 해제 → `failServiceExecution` 즉시 환불. 파트가 있거나 결제 확인 불가·회수된 건은 경보만.
  - fortune(`settleStuckDelivery`, `worker/routes/fortune.js`): 글이 있는 묶음이 하나도 없을 때만, 저장된 resumeBody 의 결제 필드로 핸들러와 같은 증빙 함수(`findAIPromptPaidAccessEvidence`, 차감 없는 조회)·`buildAIPromptVerifiedConsumePayload` 를 다시 불러 catch 와 같은 환불 함수(월정석·코인·카드·이용권)로 즉시 환불한다. 2-스트라이크를 기다리지 않는다. 환불이 실패하면 결제 보존(`LLM_GENERATION_RETRYABLE`) + 경보.

  공통 예외: `RESULT_STORAGE_UNAVAILABLE`·`delivery_pending` 은 환불하지 않고 503 으로 같은 전달을 다시 시도한다. 저장 장애가 계속되면 경보만 남으므로 서비스별 정체 설정자를 붙이는 것이 후속 과제다.
- **대표 상담 완성본 전달**(S16, 2026-11-19 사용자 요청 "결제 후 전체가 제대로 생성되어야 고객에게 전달"): 인생의 책·연애 비책·흑월(웹·토스)·네오 팩폭 전략실·운명의 찻집·마스터 인연의 서.
  - 서비스별 `is<Service>Complete`(필수 장·필드가 모두 비어 있지 않음, 분량은 보지 않음)를 통과해야만 `completed` 가 된다. 정상·구제·정체·늦은 차감·복구 cron 경로 모두 같다.
  - 완료 전 응답은 진행 수치만 낸다(본문·장·브리핑 없음). 화면은 완료 뒤 한 번에 그린다.
  - 축소 전달(장 건너뛰기·부분 전달·대체 문구) 없음. 시도를 다 쓴 장은 다음 라운드로 다시 쓰고, 라운드·상한·정체를 넘기면 본문 없이 다시 시도 보류(아래 절). 창이 지났거나 즉시 환불 예외면 기존 자동 환불(1회).
  - 관문 완화: 2번째 시도부터 최소 분량 ×0.6, 마지막 시도 ×0.3. 근거·체크포인트·반복 문제는 거부 대신 정리 후 수용. 금지어·꾸며낸 날짜/주장·빈 필수 칸·말투 이탈은 그대로 막는다.
  - 신년운세·영냥이는 이 규칙 밖이다(동작 불변). 이미 저장된 완료 결과(옛 축소본 포함)는 그대로 다시 열린다.

### 다시 시도 우선 (대표 상담, 2026-11-20 R8)

- **요청(원문, 2026-11-19)**: "네오 환불은 다시 시도가 가능하도록 그리고 신년 운세 등 대표 상담들도 전달 실패할 경우에 다른 기능들도 다시 시도를 통해서 반드시 결과를 받을 수 있도록해주고". 사용자 결정(2026-11-19): 네오 첫 브리핑 "다시 시도 먼저로 변경 (추천)", 환불 기한 "결제(생성 시작) 후 7일 (추천)".
- **대상**: 사주 카탈로그 `saju-signature` 7종 — 흑월(웹)·네오 팩폭 전략실(첫 브리핑)·연이의 운명 찻집·마스터 인연의 서·연애 비책·신년운세·인생의 책.
- **흐름**: 생성 실패·정체 → 본문 없이 **다시 시도 가능 보류**(추가 결제·차감 없음) → 고객이 다시 시도하면 완성된 장은 두고 빠진 장만 같은 결제 건으로 이어 쓴다 → 끝내 받지 못하면 **생성 시각 + 7일**에 크론이 환불하거나, 그 전에 고객이 환불을 요청하면 바로 환불(기존 멱등 환불 경로). 7일은 다시 시도해도 늘지 않는다(`retryRefundAt`, 복구 cron 7일 창과 같은 `RECOVERY_WINDOW_MS`). 환불되면 다시 시도는 닫힌다.
- **표지**: 흑월은 `ServiceExecutionTransaction` pending + `metadata.retryable`, 코덱스는 `generation_failed` + `deliveryMeta.reviewReason 'RETRY_AVAILABLE'` + `deliveryMeta.retryable`, 나머지는 `generation_failed` + `llmMeta.retryable{since, refundAt, code}`. 응답은 `retry:{available, refundAt, sessionId|resultId}`(최상위 `retryable` 은 클라이언트에서 "계속 폴링"이라 쓰지 않는다). 보관함(`/records`)은 창 안 보류를 "다시 시도 가능"으로 표시한다(`worker/lib/record-library.js`).
- **경로**: 각 서비스 `POST …/retry`(소유자 CAS 재개, 결제 확인·차감 없음) · `POST …/refund-request`. 7일 정산: 네오·연애 비책·흑월·찻집은 라우트의 `settleDue…RetryRefunds` 를 `consultation-delivery-refund.js` `runPendingConsultationRefunds` 가 부르고, 신년·인생의 책은 복구 cron 의 `expireRetryableConsultations` → `refundEligibleAt` → 공용 환불, 코덱스는 `master-love-codex-recovery-task.js` 의 `expireCodexRetryHolds`(`codexRetryDue`).
- **즉시 환불 유지(예외)**: 다시 써도 같은 결과가 나오는 결정적 실패(조립·완성 판정 실패, 흑월 `HEUKWOL_REPORT_(TOO_SHORT|INCOMPLETE)`, 찻집 `BASIS_MISSING|INVALID_INPUT` 등) · Toss 네이티브(다시 시도 UI 없음) · 계산 오류(`BIRTH|CHART|CALCULATION`) · 보류 저장 CAS 실패 · 창(생성 + 7일) 경과 · 결제 취소 · 신년·인생의 책 `supportRecovery`·`DEFERRED_USAGE_APPLY_FAILED`.
- **검증기**(`npm run verify:paid-llm-delivery`, fail-closed): 계약 서비스는 `RETRY_FIRST_POLICY` 또는 `KNOWN_RETRY_PENDING` 중 하나에 정확히 있어야 하고(미분류·이중 분류 실패), 대표 상담은 전부 `RETRY_FIRST_POLICY` 여야 한다. 서비스마다 실패 표지(`paid-delivery-stuck.js` 의 생성 + 7일 계산 import)·`/retry`·`/refund-request` 라우트·크론에 배선된 7일 정산(스케줄러 `worker/index.js` 까지)을 보고, 근거를 하나씩 지운 자기 변이가 모두 실패해야 한다. 나머지 서비스(전문가 상담 등)는 아직 즉시 환불이다 — 옮길 때 `KNOWN_RETRY_PENDING` 에서 지우고 정책에 근거를 붙인다(R10).
- **서술형 엔진 10종(C2, 2026-11-21)**: 타로 오라클·연애 타로·마인드스캔·꿈·요가 구루·사주 궁합·반려 사주·지오맨시·동물 토템·수호 운세(`paid-narrative-delivery.js` 공용 엔진). 스스로 진행할 수 없는 실행은 C1 가드가 pending 으로 보류(`reasonCode PAID_NARRATIVE_*`, `nextRetryAt` 생성 + 7일)한다.
  - 다시 시도: `POST /api/paid-narrative/retry {resultId}` → 빠진 파트의 시도 수만 0 으로(저장된 파트는 그대로, 그 파트가 여전히 없을 때만 CAS) + 24시간 재개 창을 그 시각부터 다시 연다 → 응답 `resumeBody {resumeResultId}` 로 각 상품 라우트를 다시 부르면 빠진 파트만 쓴다. 3회까지.
  - 환불: `POST /api/paid-narrative/refund-request {resultId}` 또는 생성 + 7일 크론(`settleDuePaidNarrativeRetryRefunds`, `runPendingConsultationRefunds`). 같은 executionId 로 `settleExecutionById` 를 부른다(자기 저장 파트는 환불 보호에서 제외). 결제 시점에 실행 기록에 남긴 근거(`sourceTransactionId`=코인 차감 행·이용권 사용 행·PG 참조가 있는 Payment, `metadata.passRefund`, 2026-11-25 부터 같은 기능 키·요청 토큰의 미환불 월정석 V2 원장 차감 — `runMonthlyCreditRefund` 가 같은 settle 에서 복원)를 소유자·기능 키로 확인한 뒤에만 환불한다. 카드면 Payment 의 `paymentRef` 를 기록에 옮긴다.
  - 근거 없음(옛 기록·꿀단지 단건 영수증·근거 없는 프리미엄 토큰 경로·기능 키가 다른 근거) → 환불하지 않고 `PAID_NARRATIVE_REFUND_EVIDENCE_MISSING` + `compensation.adminReviewRequired` 로 운영 검토. 상품이 이미 자체 환불한 소진(`exhaustionClaimed`, feature-question)은 `failureResult.refundOk===true` 일 때만 종결(`PAID_NARRATIVE_EXHAUSTION_REFUNDED`), 아니면 `PAID_NARRATIVE_EXHAUSTION_REFUND_UNCONFIRMED` 운영 검토 — 두 번 환불하지 않는다.
  - 운영 집계: `ServiceExecutionTransaction` `{status:"pending", reasonCode:{$in:["PAID_NARRATIVE_REFUND_EVIDENCE_MISSING","PAID_NARRATIVE_EXHAUSTION_REFUND_UNCONFIRMED"]}}`.
- **스테이징 실호출 확인**: 위 [스테이징 허용 계정 실호출](#스테이징-허용-계정-실호출-2026-11-18-사용자-결정) 절을 따른다(회차마다 1회 승인, 원문 전달).
