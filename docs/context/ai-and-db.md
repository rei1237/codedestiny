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
