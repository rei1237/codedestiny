# LLM and AI Policy

## Question-focused fortune boundary

- `worker/lib/fortune-question-focus.js` converts the current free-form question into a fixed, non-identifying intent key, answer frame, and action frame. It never returns the original concern.
- Guardian Chat uses that frame only while preparing the current reply. The raw concern is neither logged, saved, shared, nor included in a prompt or result; the context fallback answers the question through the selected system's calculated fields.
- Fusion keeps the same fixed frame in its transient server context. `projectFusionFortuneContextForPrompt` allowlists compact fields for the six calculated systems and omits raw birth input, concern, payment state, and unknown calculator fields before a provider can receive it.
- Quality gate for every system: answer the classified question first, cite one or two actual calculated anchors, translate them into a current pattern and strength/shadow, then offer a reversible action. Unit fixtures assert the six system boundaries, raw-question exclusion, and prompt-size cap without any live provider call.

## 최상위 원칙

- LLM 관련 테스트는 mock/fake/stub이 기본이다.
- 실제 Gemini, Workers AI, OpenAI, 기타 유료 LLM 호출은 사용자 명시 승인 없이는 금지다.
- 승인받은 실제 호출은 그 1회에만 유효하며 다음 호출이나 다음 세션으로 자동 연장되지 않는다.
- 실제 호출 전에는 호출 횟수, provider, 모델, 예상 비용/쿼터 영향, 실패 시 복구 범위를 사용자에게 알려야 한다.

## LLM provider 구조

## 초융합 운세

- `/fusion-fortune`와 `POST /api/fusion-fortune/generate`, `POST /api/fusion-fortune/generate/stream`은 `ENABLE_FUSION_FORTUNE_UI`, `ENABLE_FUSION_FORTUNE_API`, `ENABLE_FUSION_FORTUNE_MOCK_FLOW`을 분리해 제어한다. stream은 기존 생성 코어의 실제 완료 후 단계 이벤트만 전송하며, 결과·상담권 차감·일일 한도·멱등성·실패 release 규칙을 변경하지 않는다.
- 테스트와 기본 개발 환경은 mock만 사용한다. 운영 제공자 연결은 `ENABLE_FUSION_FORTUNE_REAL_LLM=true`, `ALLOW_FUSION_FORTUNE_REAL_LLM=true`, 서버 전용 API key, `NODE_ENV !== test`가 모두 충족될 때만 허용한다.
- 결과는 서버 컨텍스트와 서버 선택 타로 spread만 근거로 삼고 raw prompt·raw response·birthDate·birthTime·고민 원문·결제/이용권 정보는 결과 또는 공유 텍스트에 포함하지 않는다.
- validator가 가시 텍스트 30,000~60,000자(`FUSION_FORTUNE_LENGTH.total` 정본, 2026-09-06 2단계 생성으로 상향. 상한은 같은 날 실호출 5차가 51,203자로 들어와 옛 46,000 을 넘기면서 "넘쳤다는 이유로" degraded 강등이 나자 60,000 으로 재상향했다 — 상한은 목표가 아니라 폭주 완충이다), 7개 결과 섹션(여섯 체계 + 통합 리딩), 안전 표현, 개인정보 노출을 모두 확인한 성공 결과만 이용권과 하루 한도를 commit한다.
- `worker/lib/fusion-fortune-prompt.js`는 여섯 체계의 전문가 계약, 교차 검증 규칙, 생시·출생지 미확인 단정 금지, 섹션별 최소 깊이와 JSON schema를 서버에서 고정한다. 생성은 단일 호출이 아니라 `FUSION_SECTION_GROUP_SPECS`의 9개 섹션 그룹을 **두 요청(stage 1·2)** 으로 나눠 병렬 호출한다 — 1단계는 체계별 6그룹(`status: partial` 로 저장), 2단계는 1단계 요약(`buildFusionStageOneDigest`)을 받아 통합·행동·판정 3그룹을 쓰고 같은 문서를 `completed` 로 덮는다(30,000자를 한 요청으로 뽑으면 출력 상한과 120초 시간 예산이 먼저 바닥난다). 각 단계에서 실패했거나 목표 분량의 80%에 못 미치거나 근거 인용이 빈약한(`evidence_thin`) 그룹만 예산이 남아 있을 때 1회 재생성한다. 2단계는 별도 예약 키(`#s2`)를 쓰고 결제 증빙은 같은 requestId 로 재확인만 하므로 재과금이 없다(가드: `verify:fusion-fortune-stage-flow`). 그래도 남은 그룹은 실제 여섯 계산값을 사용하는 결정론 fallback으로 메우고 동일 validator로 검증한다.
- validator는 동일 긴 문장의 섹션 간 반복(조립 후 전체 검증)과 **한 필드 안 반복**(그룹 검증 `findFusionRepeatedSentenceField` — 60자 이상 문장이 한 필드에서 3회 이상이면 그 묶음을 반려해 보완 물결로 보낸다), 서버가 선택하지 않은 타로 카드, 개인정보·raw 데이터·공포/확정 표현을 거부한다. 문장을 반복해 분량만 채우는 결과는 유료 결과로 제공하지 않는다.
- 오늘의 귀인은 `fusion` 없이 사용자가 고른 카테고리의 어댑터 하나만 실행한다. 프롬프트에는 해당 계산 결과와 해당 체계 전문가 지침만 전달하고, validator가 다른 다섯 체계의 용어·계산 근거·카드를 거부한다.

- 공통 클라이언트: `lib/llm-client.ts`
- Gemini wrapper: `worker/lib/gemini.js`, `worker/lib/gemini-client.js`
- JSON 구조화 helper: `worker/lib/structured-consultation.js`
- Cache store: `worker/lib/llm-cache-store.js`, `lib/llm-cache.ts`
- Budget/timeout: `worker/lib/llm-budget.js`, `worker/lib/sync-llm-timeout.js`
- Locale context: `worker/lib/ai-locale-context.js`, `lib/i18n/ai-locale.js`
- Leak guard: `worker/lib/llm-leak-guard.js`

## AI output locale boundary

- AI output locale support covers every runtime UI locale (12). It is pinned to `RUNTIME_LOCALES`, not written out by hand, so a new UI locale cannot ship with Korean-only AI output. 🔴 Until 2026-08-20 it was five (`ko`, `en`, `ja`, `zh-CN`, `zh-TW`) and the other seven (`vi`, `hi`, `es`, `fr`, `de`, `nl`, `ms`) received a Korean reading under a translated UI.
- Prompt-directive quality per locale is **unmeasured** — measuring it requires paid live LLM calls, which are forbidden by default. What is asserted without live calls: the directive exists, is bilingual (target language + English), and overrides the Korean literals in the prompts.
- `languageLocale` controls generated user-visible AI text only. It must not imply a payment market, tax country, billing country, legal jurisdiction, refund outcome, or legal-pack language.
- Server AI routes must still normalize any incoming locale tag through the AI output allowlist before prompt construction and cache lookup; anything not on it falls back to `ko`.
- LLM cache keys must include the normalized AI output locale. Legal jurisdiction must stay out of fortune-result cache keys unless an approved policy notice is explicitly injected as policy data.
- LLM prompts and fallbacks must not generate legal, refund, tax, subscription, or payment-rights advice. Those notices come from `lib/market-policy/market-policy-registry.js` and legal-pack metadata after approval.
- All locale validation tests continue to use mock/fake/stub provider responses only.

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

## Master Love Codex structured chapters

- New Master Love Codex chapters may include an optional `content` object beside the legacy Markdown `body`.
- `content` is display-only and contains narration, evidence, insight, caution, actions, bridge, and an optional qualitative visualization. It must never contain relationship scores, probabilities, or unsupported percentages.
- Existing saved sessions remain `body`-only and the reader must continue to render them without migration or regeneration.
- The Worker sanitizes every optional field before persistence and the client renders plain text/Markdown only; raw HTML is not accepted.

- `worker/routes/life-book-ai.js`
- `worker/routes/love-secret-ai.js`
- `worker/routes/ziwei-ai.js`
- `worker/routes/vedic-ai.js`
- `worker/routes/astrology-ai.js`
- `worker/routes/master-love-codex.js`
- `worker/routes/fortune-tea-house.js`
- 운명의 찻집 타로는 카드 상세·카드 간 연결·스프레드 요약·행동 처방의 서술 책임을 분리하고, 70자 이상 문장 재사용을 품질 게이트에서 감지하면 모의/실제 공급자 모두 재작성 프롬프트를 한 번 더 실행한다. 실제 호출 검증은 금지하며, 이 흐름은 모의 응답 테스트로만 확인한다.
- `worker/routes/neo-operation-room.js`
- `worker/routes/naming-prompt.js`
- `lib/llm-client.ts`
- `worker/lib/gemini.js`
- `worker/lib/structured-consultation.js`

## Guardian Fortune Stage 13: guarded real LLM path

오늘의 귀인 운세는 기본적으로 mock LLM 경로를 사용한다. 운영 LLM 경로는 다음 조건을 모두 만족하는 staging allowlist 사용자에게만 선택된다.

`POST /api/fortune/guardian/chat`의 공개 자유 입력은 위 allowlist와 별개로 항상 검증된 context/mock generator만 사용한다. 이 SSE 경로는 대화 원문을 DB·공유 draft·운영 로그에 저장하지 않고, 전달 완료 뒤에만 기존 Guardian 사용량을 commit한다. 운영 실 LLM 공개는 비용·모니터링 승인을 별도로 받기 전까지 이 경로에 추가하지 않는다.

- `ENABLE_GUARDIAN_FORTUNE_REAL_LLM=true`
- `ALLOW_REAL_GUARDIAN_FORTUNE_LLM=true`
- `ENABLE_GUARDIAN_FORTUNE_API=true`
- `APP_ENV`/`DEPLOY_ENV`/`ENVIRONMENT` 중 하나가 `staging`
- 로그인 사용자 ID가 `GUARDIAN_FORTUNE_REAL_LLM_ALLOWLIST`에 포함
- `NODE_ENV !== "test"`
- provider가 명시적으로 `gemini`

조건이 하나라도 빠지면 fail-closed로 mock 경로를 사용한다. provider adapter는 `worker/lib/gemini.js`를 서버에서만 사용하며 `fallbackToWorkersAI: false`, timeout 25초, retry 기본 0회(하드캡 1회), JSON response format을 적용한다. 테스트에서는 provider 함수를 주입하고 실제 fetch·API key·네트워크를 호출하지 않는다.

Provider 응답은 parser → validator → sanitize → length normalization을 통과해야 한다. provider 실패나 malformed/unsafe 결과가 발생해도 계산된 `GuardianFortuneContext`가 있으면 `worker/lib/guardian-fortune-fallback.js`가 topic·mode·상위 adapter 근거·integrated insight를 조합해 800~1500자의 share-safe 결과를 만든다. 이 fallback이 실제 사용자에게 전달된 경우에만 사용량을 커밋하고, 결과를 전달하지 못한 완전 실패는 release/rollback한다.

허용 metric은 `requestId`, provider/model, latency, token usage, 추정 비용, topic/mode, generationSource, success, fallbackUsed, errorCode뿐이다. raw prompt, raw response, raw context, 생년월일·생시·출생지·성별·닉네임·concern은 로그와 DB에 저장하지 않는다. 비용 단가는 서버 rate 설정이 있을 때만 계산한다.

즉시 mock으로 되돌려야 할 때는 `ENABLE_GUARDIAN_FORTUNE_REAL_LLM` 또는 `ALLOW_REAL_GUARDIAN_FORTUNE_LLM`을 끄고, API/UI flag를 끄면 기능 전체를 안전하게 차단할 수 있다. Stage 13 검증에서는 실제 운영 호출을 실행하지 않는다.

Stage 14 최종 품질 튜닝에서는 prompt와 fallback이 다음 원칙을 추가로 지킨다.

- LLM은 사주·자미두수·베다점·숙요점·점성술·타로를 직접 계산하지 않고, 서버가 계산한 `GuardianFortuneContext`만 상담 문장으로 번역한다.
- 사주는 일간·십성·오행·현재 흐름을 행동/심리 언어로, 자미두수는 명궁·주제별 궁·주요 별을 역할 구조로, 베다점은 문사인·나크샤트라·라그나를 감정 리듬으로, 숙요점은 관계 거리감으로, 점성술은 태양·달·상승궁을 내면/표현 방식으로, 타로는 서버 카드명·정역방향·position/spread를 오늘의 상징으로만 사용한다.
- 생시나 출생지가 없으면 시주·라그나·상승궁·하우스·신궁을 확정하지 않고, 계산되지 않은 영역은 낮은 확신 또는 제외로 처리한다.
- validator는 상대 마음 확정, 투자/의료/법률 단정, 공포 마케팅, 결제 압박 표현을 완화하고, 보정 불가 결과는 context-driven fallback 또는 안전 실패로 수렴한다.
