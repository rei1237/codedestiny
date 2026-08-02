# LLM and AI Policy

## 최상위 원칙

- LLM 관련 테스트는 mock/fake/stub이 기본이다.
- 실제 Gemini, Workers AI, OpenAI, 기타 유료 LLM 호출은 사용자 명시 승인 없이는 금지다.
- 승인받은 실제 호출은 그 1회에만 유효하며 다음 호출이나 다음 세션으로 자동 연장되지 않는다.
- 실제 호출 전에는 호출 횟수, provider, 모델, 예상 비용/쿼터 영향, 실패 시 복구 범위를 사용자에게 알려야 한다.

## LLM provider 구조

- 공통 클라이언트: `lib/llm-client.ts`
- Gemini wrapper: `worker/lib/gemini.js`, `worker/lib/gemini-client.js`
- JSON 구조화 helper: `worker/lib/structured-consultation.js`
- Cache store: `worker/lib/llm-cache-store.js`, `lib/llm-cache.ts`
- Budget/timeout: `worker/lib/llm-budget.js`, `worker/lib/sync-llm-timeout.js`
- Locale context: `worker/lib/ai-locale-context.js`, `lib/i18n/ai-locale.js`
- Leak guard: `worker/lib/llm-leak-guard.js`

기본 구조는 Gemini primary, Cloudflare Workers AI fallback이다. fallback model chain과 timeout 정책은 `lib/llm-client.ts`와 env override를 확인한다.

## 프롬프트 파일/생성 위치

- 사주: `worker/lib/saju-ai-prompt.js`, `worker/lib/saju-ai-prompt-templates.mjs`, `worker/lib/saju-premium-chapters.js`
- 자미두수: `worker/lib/ziwei-ai-prompt.js`, `worker/lib/ziwei-ai-prompt-templates.mjs`, `worker/lib/ziwei-deep-report-prompt.mjs`
- 숙요점: `worker/lib/sukuyo-ai-prompt.js`, `worker/lib/sukuyo-ai-prompt-templates.mjs`
- 베다: `worker/lib/vedic-ai-prompt.js`, `worker/lib/vedic-ai-prompt-templates.mjs`, `worker/lib/vedic-premium-generator.js`
- 점성술: `worker/lib/astrology-ai-prompt.js`, `worker/lib/astrology-ai-prompt-templates.mjs`
- 운명의 찻집: `worker/routes/fortune-tea-house.js`, `lib/fortune-tea-house/**`, `lib/yeon/**`
- 네오: `worker/lib/neo-operation-room-prompt.js`
- 연애 비책: `worker/lib/love-secret-ai-prompt.js`, `worker/lib/love-secret-reference.js`
- 마스터 러브 코덱스: `worker/lib/master-love-codex-prompt.mjs`, `worker/lib/master-love-codex-compat-prompt.mjs`
- 작명: `worker/routes/naming-prompt.js`, `worker/lib/naming-*.js`
- 운명 나침반/최애운명: `worker/lib/destiny-compass-report-contract.js`, `worker/lib/destiny-bias-prompts.js`

십이지신 천운 타로는 운영 LLM 프롬프트를 추가하지 않는다. `lib/tarot/tarot-year-data.mjs`의 메이저 카드·십이지신·월별 정적 데이터를 `lib/tarot/tarot-year-premium.mjs`가 `tarot-year-v3` 구조로 조합하며, 저장된 `tarot-year-v2` 결과도 읽을 수 있다. 테스트도 mock 카드만 사용한다.

## 상담 결과 생성 흐름

1. route가 인증/권한/결제 상태를 확인한다.
2. 입력을 정규화하고 나이/생년월일/시간/캘린더 타입을 검증한다.
3. 사주/자미/숙요/점성/베다 등 로컬 계산 엔진이 근거 데이터를 만든다.
4. feature별 prompt builder가 프롬프트를 만든다.
5. 캐시 또는 idempotency key로 중복 생성을 막는다.
6. `callGeminiText` 또는 `callGeminiJsonWithRetry`가 provider를 호출한다.
7. `fallbackMinChars`, schema validation, `hasRenderableLlmText` 등으로 결과 품질을 확인한다.
8. 상담별 MongoDB collection에 저장하고 클라이언트에 반환한다.

## 캐시/중복 방지/실패 처리

- 캐시: `lib/llm-cache.ts`, `worker/lib/llm-cache-store.js`, `LlmResponseCache`
- 중복 방지: 상담별 `idempotencyKey` unique index, `ServiceExecutionTransaction`, `PaidExecutionRecord`
- 실패 처리: AI route의 `LLM_ERROR`, `GENERATION_FAILED`, restore/refund branch 확인
- 결과 누락 방지: `hasRenderableLlmText`, schema parser, repair prompt 경로 확인

## PDF 또는 결과 저장 흐름

- PDF runtime: `worker/lib/pdf-runtime.js`
- Front export: `lib/pdf/export-result-pdf.ts`
- Premium JSON contract: `worker/lib/premium-chapter-json-contract.js`
- 인생의 책/연애 비책 등은 결제/권한 확인 후 로컬 계산 JSON을 먼저 확정하고, 필요한 장만 LLM으로 보강한다.
- PDF archive는 `/api/premium/pdf-archive/*` alias가 `/api/billing/pdf-archive/*`로 rewrite될 수 있다.

## 무료/유료 기능별 차이

- 무료 기능: 로컬 계산 또는 local fallback 중심. LLM이 있더라도 사용자 비용/권한을 건드리지 않아야 한다.
- 유료 회당 AI: 결제/이용권/월정석 access가 먼저다. LLM 실패 시 차감 복구 경로를 확인한다.
- 유료 unlock: 고정 콘텐츠면 `ContentEntitlement` 또는 unlock snapshot으로 재열람 가능해야 한다.
- 관리자/health smoke: 실제 LLM smoke 옵션이 있더라도 사용자 승인 없이는 실행하지 않는다.

## 테스트 원칙

- 실제 LLM API 호출 금지.
- `--live` 플래그 임의 사용 금지.
- env에 실제 key가 있어도 mock/fake fetch 주입으로 검증한다.
- 대표 mock 패턴:
  - `scripts/verify-mindscan-reading.mjs`의 `fetchImpl` 주입
  - `scripts/verify-workers-ai-fallback.mjs`의 provider 경로 강제
  - route별 `__set*ForTest` hook이 있으면 그 hook 사용
- 실제 호출이 필요한 경우 사용자 명시 승인 필요.

## 비용 폭주 방지 체크리스트

- 호출 횟수와 병렬 수 제한 확인
- `timeoutMs`, `EDGE_RESPONSE_DEADLINE_MS`, `clampSyncLlmTimeoutMs` 확인
- `maxOutputTokens`와 prompt size 확인
- 캐시 key와 idempotency key 확인
- retry 중첩 여부 확인
- fallback chain과 `fallbackMinChars` 확인
- 실패 시 같은 요청을 자동 반복하지 않는지 확인
- 관리자 smoke 또는 health endpoint가 실제 호출을 하지 않는지 확인

## 토큰 낭비 방지 체크리스트

- 로컬 계산 결과 중 prompt에 꼭 필요한 필드만 넣는다.
- 중복 챕터/반복 설명을 제거한다.
- locale directive는 systemPrompt/cache key와 함께 다룬다.
- 장문 결과는 섹션 단위 생성/repair를 사용한다.
- 결과 품질 검증은 실제 LLM 재호출보다 parser/unit test로 먼저 검증한다.
- `scripts/report-llm-token-usage.mjs`는 로그 기반 분석용이며 실제 호출을 새로 만들지 않는다.

## 고위험 영역

- `worker/routes/life-book-ai.js`
- `worker/routes/love-secret-ai.js`
- `worker/routes/ziwei-ai.js`
- `worker/routes/vedic-ai.js`
- `worker/routes/astrology-ai.js`
- `worker/routes/master-love-codex.js`
- `worker/routes/fortune-tea-house.js`
- `worker/routes/neo-operation-room.js`
- `worker/routes/naming-prompt.js`
- `lib/llm-client.ts`
- `worker/lib/gemini.js`
- `worker/lib/structured-consultation.js`
