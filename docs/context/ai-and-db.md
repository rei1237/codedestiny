# AI 호출 · MongoDB/Atlas 튜닝 상세

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## AI & API

- 🔴🔴 **검증은 mock 기본, 실호출은 사전 허락 필수** — 절대 규칙 1번(LLM 실호출 금지, 최우선)이 이 섹션 전체에 적용된다. 프롬프트·분량·폴백을 고쳤다고 실제 Gemini/Workers AI 를 부르지 말 것. mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입)·`scripts/verify-workers-ai-fallback.mjs`(키 제거), 실호출은 `--live` + **사용자 허락 1회 한정**.
- **Gemini 호출**: `lib/llm-client.ts` (실제 구현체, `worker/lib/gemini.js`·`gemini-client.js`는 얇은 래퍼). 모델 `gemini-2.5-flash`, REST `generateContent` 엔드포인트 직접 호출(SDK 미사용). API 키는 `GEMINIF_API_KEY` 단일 키만 사용(다른 키 이름 참조는 제거됨).
- **Workers AI 폴백**: Gemini 실패/타임아웃 시 자동으로 `env.AI.run()` 호출. 기본값은 단일 모델이 아니라 **체인**이다(`lib/llm-client.ts`의 `DEFAULT_WORKERS_AI_MODELS`) — 1차 `@cf/zai-org/glm-4.7-flash`(컨텍스트 131k, `response_format` 지원, 출력 $0.40/M), 2차 `@cf/meta/llama-3.3-70b-instruct-fp8-fast`(컨텍스트 24k, 출력 $2.25/M). 앞에서부터 시도해 첫 성공을 쓰고, 폐기·스키마 거부·빈 응답이면 다음으로 넘어간다. PDF/비PDF는 모델이 아니라 **env 오버라이드 키만** 다르다 — PDF는 `WORKERS_AI_PDF_MODEL`, 그 외는 `WORKERS_AI_MODEL`(둘 다 없으면 `WORKERS_AI_MODEL` → 기본 체인). 오버라이드는 **쉼표 구분 목록**도 받으며 그 순서가 체인이 된다.
- 🔴 **모델 폐기는 예고 없이 온다** — `@cf/meta/llama-3.1-8b-instruct` 와 `@cf/moonshotai/kimi-k2.5` 는 **같은 날(2026-05-30) 폐기**됐다(`5028: This model was deprecated`). 둘 다 새로 쓰지 말 것. Gemini 가 살아 있는 동안은 폴백이 안 쓰여 폐기를 아무도 모르다가 장애 순간에 안전망이 없는 게 드러나므로, **단일 모델로 되돌리지 말 것**(체인이 그 대비다). 유료 전용(Workers Free plan 미지원) 상위 모델로 올리려면 `@cf/zai-org/glm-5.2`(출력 $4.40/M)·`@cf/moonshotai/kimi-k2.6`($4.00/M)를 env 오버라이드로 넣는다.
- **폴백 품질 한계(2026-07-30 실측)**: 70B는 장문 지시에도 **목표 분량의 60~77%만 쓰고 스스로 멈춘다**(`finish_reason: "stop"`, `completion_tokens` 840 / 상한 8,000). **`maxOutputTokens`를 올려도 늘지 않으므로 다시 재지 말 것.** 이 한계가 1차 glm-4.7-flash 에서도 같은지는 **아직 실측 전**이다 — 아래 `fallbackMinChars` 게이트가 그대로 안전장치가 된다. 그럼에도 폴백은 켜 두는 쪽이 맞다 — 끄면 Gemini 장애 시 사용자가 받는 것은 짧은 결과가 아니라 실패 안내 문구다.
- 🔴 **폴백을 켠 유료 라우트는 `fallbackMinChars`를 반드시 함께 준다** (`worker/lib/gemini.js`의 `rejectShortFallback`). 이 라우트들은 "경량 보장 계약"으로 렌더 가능한 텍스트(≥400자)면 결제 성공으로 전달하기 때문에, 그냥 켜면 **2만자 상품이 8% 분량으로 정상 결제 처리**되고 재시도·환불 경로가 사라진다. 관례는 **그 기능의 최소 분량 상수 × 0.4**이며, 문턱 미달이면 호출이 실패로 돌아 각 라우트의 기존 실패 처리가 그대로 돈다. **Gemini 응답에는 적용되지 않는다**(기존 동작 불변).
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
