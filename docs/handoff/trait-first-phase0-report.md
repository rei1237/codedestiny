---
status: in-progress
updated: 2026-11-22
next: 승인 게이트 A — 네오 승인 후 Phase 1(결제→생성→전달 무결성 감사, docs/handoff/trait-first-phase1-integrity.md)
---

# Trait-First Phase 0 진단 보고서 (읽기 전용)

지시서: [trait-first-upgrade.md](trait-first-upgrade.md). 이 단계에서 코드는 한 줄도 바꾸지 않았다. 아래 근거는 2026-11-22 main(`7b0a35ce1`)에서 grep과 파일 읽기로 확인한 값이다. "미확인"이라고 적은 항목은 근거를 찾지 못했다는 뜻이며, 없다는 단언이 아니다.

## 요약

1. **첫 섹션이 이미 성향인 유료 기능이 6종이다**: 신년운세·연애 비책·카르마·흑월·인생의 책·마스터 인연의 서. 이 6종은 장 구조를 그대로 두고 근거 주입과 어조만 바꾸면 되므로, 완성 판정·체크포인트 위험이 사실상 없다.
2. **나머지 유료 기능(약 20종)은 첫 섹션이 질문 답이나 총론이다.** 성향 섹션을 새로 넣으면 필수 장 목록, `is<Service>Complete`, 체크포인트 재개, 클라이언트에 하드코딩된 순서가 한꺼번에 바뀐다. 결제 후 미제공 위험이 가장 큰 곳이다.
3. **무료 LLM 결과는 사실상 없다.** 무료 사주·타로·영냥이 무료·데일리는 전부 결정적 계산이다. 지시서의 "무료 LLM 첫 섹션"은 대상이 거의 없다.
4. **근거 계층이 이미 있다**: `analysis-basis-contract`, `fortune-reasoning-contract`, `engine-fact-snapshot`, `fortune-glossary`. TraitProfile은 새 축으로 만들지 않고 이 계층을 확장해서 넣는다.
5. **`[vars]` 플래그는 추가할 수 없다.** 텍스트 바인딩 예산이 가득 차 있다. 기존 `withEngineRollout` 코드 기본값 경로를 쓴다.
6. **사주 메인 스냅샷에 없는 필드**가 있다. 신살·특수 조합·오행 과다/부족 판정은 영냥이 경로에만 있고, 희신은 저장소 전체에서 출처를 찾지 못했다.

---

## 공통 구조 (모든 표의 전제)

| 항목 | 실측 | 근거 |
|---|---|---|
| LLM 호출 단일 경로 | 모든 워커 LLM 호출 → `callGeminiText` → `callLLM` | `worker/lib/gemini.js:114`, `lib/llm-client.ts:1393` |
| 기본 모델·timeout | `gemini-2.5-flash`, 기본 30s | `lib/llm-client.ts:157`, `:160` |
| 폴백 모델 | Workers AI `@cf/zai-org/glm-4.7-flash` → llama-3.3-70b, **마지막 시도에서만** | `lib/llm-client.ts:679-681` |
| 결제 컨텍스트 | 공급자를 1회만 시도 | `worker/lib/gemini.js:134` |
| JSON 재시도 | `callGeminiJsonWithRetry` | `worker/lib/structured-consultation.js:78` |
| 생성 방식 | **큐 없음.** 요청 1회에 1부분 동기 생성 + 체크포인트 재개(상한 85s, 엣지 응답 100s). 예외: 초융합은 SSE + `ctx.waitUntil` | `worker/lib/sync-llm-timeout.js` |
| 결제 수단 | PASS(이용권) · DIRECT_KRW(PortOne 카드) · MOONLIGHT_STONE(월정석). 1만원 미만 상품은 월정석 제외 | `worker/lib/paid-feature-registry.js:503-518`, `:432` |
| 코인 | 내부 원장 단위, 사용자에게 비노출 | `docs/context/design-canon.md:34` |
| 앱 결제 | Google Play Billing, 토스 IAP. PayPal(PortOne)은 `PAYPAL_ENABLED` 뒤. Apple StoreKit 없음 | `apps/mobile/.../CodeDestinyBillingPlugin.java`, `worker/routes/app-store.js:42`, `worker/toss/purchases.js:24` |
| 전달 계약 | 대표 상담은 `is<Service>Complete` 판정, 다시 시도 우선 보류, 생성 +7일 환불 | `worker/lib/consultation-recovery-registry.js` `PAID_LLM_DELIVERY_CONTRACT`, `scripts/verify-paid-llm-delivery-contract.mjs:81-109` `RETRY_FIRST_POLICY` |
| 즉시 환불 목록 | 다시 시도 우선이 아직 아닌 서비스 | `scripts/verify-paid-llm-delivery-contract.mjs:118-122` `KNOWN_RETRY_PENDING` |
| 알려진 구멍 | `KNOWN_REFUND_GAPS`(운세 채팅 단건 카드, 토스 네이티브, 손금), `KNOWN_STUCK_SETTLE_GAPS` 12종 | 같은 파일 `:59-63` 외 |
| 정체 감시 | 6회 시도 기준 정체 감지 | `worker/lib/paid-delivery-stuck.js` |
| LLM 캐시 | 키 = 프롬프트·systemPrompt·모델 등의 해시 + `keyExtra`. Mongo `LlmResponseCache`, TTL 30일. 별도 버전 필드 없음 → **프롬프트를 바꾸면 캐시는 자동으로 분리된다** | `lib/llm-cache.ts:66-82`, `worker/lib/llm-cache-store.js` |
| 저장 결과 재열람 | 저장된 원본을 사용(추가 생성 없음, 보관함 규칙). 프롬프트 버전과 무관 | `CLAUDE.md` 보관함 절, `docs/context/library-preservation.md` |
| 플래그 | `env.X === "true"`. `[vars]` 텍스트 바인딩 예산이 가득 참 → 코드 기본값 `withEngineRollout`, 같은 이름 `[vars]`가 덮어씀 | `worker/lib/engine-rollout.js:6-38`, `worker/index.js:2187` |

---

## 3-1. LLM 기능 전수 표

표기:
- 실패 처리 **R**: 다시 시도 우선(빠진 장만 재개, 7일 뒤 정산 환불)
- 실패 처리 **P**: 즉시 환불(`KNOWN_RETRY_PENDING`)
- 실패 처리 **갭**: `KNOWN_REFUND_GAPS`
- 결제 경로: 따로 적지 않은 유료 기능은 전부 웹 PortOne + 이용권 + 월정석(1만원 이상)이며, Android·토스도 같은 `/api` 핸들러로 들어온다(플랫폼 절 참고).
- `W/` = `worker/`

### 유료

| 기능 | 엔진 | 프롬프트 빌더 | 모델·max_tokens·timeout | 출력 | 저장·캐시 키 | 실패 | 현재 첫 섹션 |
|---|---|---|---|---|---|---|---|
| 서양 점성술 AI | 서양 | `W/routes/astrology-ai.js:1171` `buildSectionPrompt`, system `:930` (이용권 소모 `:1515`) | flash · 12000 (`:73`) · 호출 `:1230` | 텍스트 섹션 | `AstrologyAiConsultation`, `astrology-ai-sectioned-v1` (`:1217`) | R | `opening_core` (`:977`) |
| 베다 AI | 베다 | `W/routes/vedic-ai.js:1063` `buildGroupPrompt` | flash · 13000 (`:76`) · `vedicTimeoutMs` (`:1470`) | JSON (`:1468`, 파싱 `:1136`) | `vedic-ai-group-v1` (`:1483`) | R | `karma_origin` (`:85`) |
| 자미두수 AI | 자미 | `W/routes/ziwei-ai.js:1536` `buildSectionGroupPrompt` | flash · 72000/6그룹 (`:84`) · 40s (`:93`) | JSON | `ziwei-ai-v5` (`:1688`), `ziwei-delivery-v2` (`:2042`) | R | `foundation` (`:119`) |
| 자미 심층 리포트 | 자미 | `W/routes/ziwei-deep-report.js`, `ziwei-deep-report-prompt.mjs:290` | 9000/18000 · 60s | JSON | 리포트 문서 | P | `overview` (`:44`) |
| 숙요 궁합 AI | 숙요 | `buildSectionGroupPrompt` (`:1326`) | 45s (`:116`) | JSON | `sukuyo-compat-ai-v2` (`:1517`) | R | `overview` "總論" (`:70`) |
| 낙샤트라 AI | 베다 | `W/lib/nakshatra-ai-prompt.js:181` | 10000 · thinking 0 · 45s | JSON | `nakshatra-delivery-v4` (`:972`) | P | `dualStarSummary` (`:21`) |
| 신년운세 | 사주 | `buildSectionPrompt` (`:1970`) | 12000/14250 · 52s | 섹션 | `new-year-ai-v2-natal-v2` (`:2237`) | R | **`nature` "타고난 성향과 올해 너의 자리" (`:163`)** |
| 사주궁합 프리미엄 | 사주 | `W/lib/saju-compat-premium-prompt.js:137` | 8192 | 섹션 | `saju-compat-premium-prompt-v1` | R | `overview` "관계 총론" |
| 인생의 책 | 사주 | `buildSectionPrompt` (`:1477`) | 10000/7000 · 45s | JSON | `life-book-ai-v2-natal-v2` (`:3494`) | R | **"타고난 사주의 원형" (`:203`)** |
| 연애 비책 | 사주 | `W/lib/love-secret-ai-prompt.js:476` | 12500/15000 · 54s | 섹션 | `love-secret-ai-v2` (`:928`) | R | **`nature` "타고난 연애 기질" (`:336`)** |
| 네오 팩폭 전략실 | 사주 | `W/lib/neo-operation-room-prompt.js:1456` | 8192 · 45s | JSON (`:1497`) | `neo-operation-room-v3-init` (`:1176`) | R | `opening` "작전 개시 — 네오의 첫 진단" (`:944`) |
| 전문가 후속 질문(네오·카르마·연애 비책) | 사주 | `W/lib/expert-follow-up-delivery.js` | — | 섹션 | 후속 문서 | R | `answer` (`:91`) |
| 카르마 | 사주 | `buildChapterPrompt` (`:2142`) | 7000 | 장 | 장 문서 | R | **`chapter-00` "타고난 기질과 마음의 결" (`:420`)** |
| 훈민정음 작명 | 사주 | `W/lib/naming-report-delivery.js:32` | — | 리포트 | `naming-result-v20260712` | R | "작명가의 총평" |
| 흑월 | 사주 | `W/lib/heukwol-report.js:143` | 16000 · 60s | 리포트 | 리포트 문서 | R | **`temperament` "타고난 성향 · 위기가 반복되는 출발점" (`:12`)** |
| 천상의 조화 | 복합 | `W/lib/celestial-report-delivery.js:58` | 7000 · 45s | 리포트 | 리포트 문서 | P | 미확인 |
| 사주 AI 유료 | 사주 | `W/lib/saju-ai-prompt.js:2201`, `:2486` (핸들러 `W/routes/fortune.js:4848`) | 12000 · 48s | 섹션 그룹 | `SAJU_AI_PROMPT_VERSION|NATAL_CORE_VERSION` (`fortune.js:5098`) | P | `answer_core` (`saju-ai-prompt.js:104`) |
| 질문 생성기 | 복합 | `W/lib/feature-question-delivery.js` | — | 목록 | — | P | 해당 없음 |
| 운명 찻집 | 사주(십성 손님) | `generateFortuneTeaGroup` | 12000 · 62s | 그룹 | `yeoni-evidence-v2` | R | `core` "명식 심층 판독" (`:3919`) |
| 마스터 인연의 서 | 사주 | `master-love-codex-prompt.mjs:499` | 8000/16000 · 45s | 장 | `CODEX_EVIDENCE_VERSION` | R | **`gate` "제1장 · 운명의 문 — 당신이라는 사람" (`:55`)** |
| 초융합 운세 | 6엔진 | `lib/fusion-fortune-prompt.js:750` | 통합·결론은 Pro · 60s · **SSE** | 장 | `fusion-expert.v2` (`:1828`) | R | `saju` "상담의 서문과 사주" (`:233`) |
| Human Design | HD | `W/lib/human-design-report-prompt.js:152` | — | JSON | `HD_REPORT_VERSION` | P | `executiveSummary` |
| Destiny Compass House | 6축 | `W/lib/destiny-compass-report-contract.js:337` | 8500 · 42s | JSON | `COMPASS_REPORT_VERSION` | P | `opening` "지금 당신의 자리" (`:47`) |
| 관계 경계 테스트 | — | — | — | 리포트 | — | P | "프롤로그: 첫 장면" |
| 영냥이 유료 질문 | 복합 | `W/yeongnyangi/service.ts` | — | 장 | 캐시 `['yeongnyangi-response-v1', owner, requestId, section]` (`providers/response-cache.ts:16`). `PROMPT_VERSION` chapter-v4/v7은 키에 **없음** | P | 미확인(서버가 제목 공급) |
| 서술형 10종 (타로 오라클·연애 타로·마인드스캔·꿈·요가 구루·사주궁합 기본 `saju-compat-basic-p4`·반려동물 사주·지오맨시·애니멀 토템·수호 운세 유료 턴) | 타로·사주 외 | `W/lib/paid-narrative-delivery.js:108` | 9500 · 15-45s | 텍스트 | 버전 상수 없음 | R (2026-11-21 C2) | 기능별 상이 |

미확인: 운명의 섬(12궁 상담), Love Code / Secret House, 운세 채팅(물고기), 손금, 토스 네이티브 세부. 판매 여부와 LLM 사용 여부를 Phase 1 첫머리에서 확인한다.

### 무료 (LLM 사용처는 4곳뿐)

| 기능 | 근거 | 비고 |
|---|---|---|
| Destiny Compass 무료 해설 다듬기 | `worker/routes/destiny-compass.js:238` | 결정적 결과를 문장으로 다듬기만 함 |
| 운명 구조도 해설 | `worker/routes/destiny-anatomy.js:189` | 운영에서는 `ENABLE_DESTINY_ANATOMY_REAL_LLM`으로 꺼져 있음 |
| 찻집 꿀편지 | `worker/routes/fortune-tea-house.js:5948` | 꿀방울 소비 |
| 영냥이 후속 질문 | `worker/yeongnyangi/question-followup.ts:101` | 유료 주문에 포함된 분량 |
| 수호 운세 무료 티어 | `worker/lib/guardian-fortune-usage.js:10` | 2026-10-07 종료 |
| 무료 사주·무료 타로·영냥이 무료·데일리 메일·잠금화면·master-say·idol-chemi·famous-saju·심리테스트 | — | **LLM 없음**(결정적). 성향을 넣는다면 LLM이 아니라 결정적 문구로, 이번 범위 밖 |

### 클라이언트에 하드코딩된 섹션 순서 (지시서 4-1 9번)

| 화면 | 근거 | 위험 |
|---|---|---|
| 사주 AI | `js/saju-engine.js:7297-7328`가 서버 `SAJU_AI_SECTION_GROUPS`(`saju-ai-prompt.js:104`)와 이중 정의 | 서버만 바꾸면 새 섹션이 안 보임 |
| 서양 점성술 폴백 제목 17개 | `app/astrology-ai/.../AstrologyAiResultClient.tsx:321-339` | 같음 |
| 자미 | `lib/ziwei/ziwei-ai-chapters.ts:10`, `:25`, `:60` | 같음 |
| 초융합 | `app/fusion-fortune/fusion-thread.tsx:30`, `:60` | 같음 |
| 네오 탭 | `NeoOperationRoomResultPage.tsx:1112-1176` | 같음 |
| 수호 운세 | `FortuneChatClient.tsx:511` | 같음 |
| 타로 오라클 | `TarotPromptMakerClient.tsx:2384` | 같음 |
| 찻집 | 해시된 i18n 키 (`TeaHouseResultSheet.tsx:67`, `:226`) | 키 추가 필요 |
| 베다·영냥이 | 서버가 제목을 공급 | 낮음 |
| 화자·웹툰 레이어 | LLM 본문을 바꾸지 않음 | 없음 |

### 플랫폼

- **Android**: `dist` 번들을 재사용하고 같은 `/api`를 쓴다(`app/_lib/api-config.ts:27`, `:83`).
- **토스**: `/api/toss`(`worker/index.js:1064`)로 들어오지만, `worker/toss/native-*.js`가 같은 라우트 핸들러를 import한다.
- 결론: 생성 파이프라인은 하나이고, 화면 순서만 위 클라이언트 표의 영향을 받는다.

---

## 3-2. 엔진별 가용 필드

| 엔진 | 필드 | 있음(근거) | 없음·제약 |
|---|---|---|---|
| **사주** (`W/lib/saju-ai-prompt.js:1369` `buildSajuMyeongsikFactSnapshot`) | 일간 | `:1445` | |
| | 4주 8글자·12운성 | `:1404` | |
| | 십성 천간/지장간/분포/고정표 | `:1416` / `:1422` / `:1462` / `:1467` | 그룹 비율 판정(과다·부재·잠재)은 없음 → 추출기에서 계산 |
| | 오행 개수·우세 오행 | `:1456` | **비율 없음** |
| | 신강/신약 | `:1494` | |
| | 격국 | `:1475` (`saju-gyeokguk.js`) | |
| | 용신/기신 | `:1496` | **희신: 저장소 전체 grep으로 출처 없음** |
| | 대운 | `:1500` | |
| | 조후·충 | `:1493` | |
| | 시각 모름 | `lib/saju/natal-core/index.mjs:199` | |
| | 신살 | `W/lib/saju-derived-signals.js`, `saju-shinsal.js` | **영냥이 경로에만 있음** |
| | 특수 조합 | `saju-derived-signals.js:61-67`, `:97-98` | 영냥이 경로에만 있음. 부록 A-4 11종 중 일부만 |
| | 오행 과다/부족 | `saju-derived-signals.js:32` (임계 29% / 16%) | 영냥이 경로에만 있음. **지시서 35% / 5%와 다름** |
| **자미** (`W/lib/ziwei-ai-chart.js:467`) | 명궁/신궁 | `:544-545` | |
| | 12궁 주성·보좌·살성·밝기 | `:579-615` | |
| | 생년사화 | `:522` | |
| | 공궁 차성안궁 | `W/routes/ziwei-ai.js:1122` | |
| | 정본 사실 | `ziwei-ai.js:1131`, `:1227` | |
| | 성향 태그 | `W/lib/ziwei-personality-context.js` | |
| | 시각 모름 | `:567` 정오 기준 | dataQuality partial 처리 필요 |
| **서양** (`W/routes/astrology-ai.js:766`, 조립 `:880-908`) | 태양·달 | ✓ | |
| | ASC | ✓ | 시각 없으면 null (`:818`) |
| | 하우스 | ✓ | 시각 없으면 빈 값 (`:806`) |
| | 10행성 | `:124` | |
| | 원소·모드 분포 | `:703` | |
| | 애스펙트·스텔리움 | ✓ | |
| | 근거 | `:1682` | 행성×별자리 성향 문장 자산 **없음** |
| **베다** (`W/lib/vedic-ai-chart.js:611`) | 라그나 | `:692` | |
| | 달 라시·낙샤트라·파다 | `:707`, `:580` | |
| | 아야남샤 | Lahiri `:674` | |
| | D9/D10, 다샤 | ✓ | |
| | 아트마카라카 | `vedic-ai-prompt.js:204`(관리자·클라이언트) | **유료 vedic-ai 경로에 전달되지 않음** |
| | 낙샤트라 전용 | `W/routes/nakshatra-ai.js:680` → `nakshatra-codex.js:142`, `nakshatra-ai-prompt.js:122` `buildFactContext` | |
| **숙요** (`W/lib/sukuyo-coordinate.js`, `sukuyo-premium.js:8`) | 본명숙 27(牛 제외, Lahiri 달) | `sukuyo-ai-prompt.js:188` `normalizeBasicResult`, traits `:175` | |
| | 危/胃 표기 | `sukuyo-premium.js:19`, `:24`는 둘 다 "위". `lib/sukuyo-engine-server.ts`는 위1/위2 | **키에 한자 병기 필요**(지시서 F와 일치) |
| | 일요·칠요 | 미확인 | |
| **타로** | 78장 정/역 | `lib/tarot/tarot-cards.mjs:17`, `:42`, `:49`, `:656` | |
| | 스프레드 포지션 | `lib/tarot/spreads.mjs:65+` (fusion `current`/`inner` `:67`) | "나/본질" 포지션이 없는 스프레드는 첫 카드로 |
| | 사실 스냅샷 | `W/lib/tarot-fact-consumer.js:10`, `:33` | `TAROT_CONSUMER_FACTS_V1` 플래그 뒤 |

---

## 3-3. 기존 성향 텍스트 자산 (부록 KB보다 우선)

| 대상 | 자산 | 쓰임 | 부록과의 관계 |
|---|---|---|---|
| 일간 10 | `W/lib/saju-derived-signals.js:212` `DAY_MASTER_VIEW` | 프롬프트(영냥이) | 1순위 재사용 |
| | `lib/free-saju/copy.ts:36` `WEAPON_BY_DAY_STEM` | UI | 표현 참고 |
| | `js/saju-engine.js:9195` `ILJU_DB` (60일주) | UI | 일지 보조 fact 재료 |
| | `W/lib/love-secret-reference.js:21` `ILGAN_LOVE` | 연애 프롬프트 | 연애 기능 전용 |
| | `W/lib/saju-section/paid-health.src.js:283`, `lib/saju/ilgan-monthly-registry.mjs`, `js/core/saju/reading-rich.js:75`, `reading-personas.js:58` | 기타 | 참고 |
| 십성 10 | `W/lib/saju-temperament.js` `TRAITS` | 프롬프트 빌더 약 11곳 | 1순위. 부록 A-3과 대조 필요 |
| 십성 그룹 | `saju-derived-signals.js:54-60` `FAMILY_MEANING` | 영냥이 | 부록 A-2의 과다·부재·잠재는 빈칸 보충 |
| 오행 과다/부족 | `saju-derived-signals.js:18-29` `TEMPERAMENT` | 영냥이 | **임계값 충돌**(29/16% vs 지시서 35/5%) → 네오 결정 필요 |
| 자미 14주성 | `app/_lib/ziwei-star-interpretations.ts:9-87` | UI | 부록 B-1과 대조 |
| | `W/lib/ziwei-personality-context.js` | 프롬프트 태그 | 1순위 |
| 베다 | `W/lib/vedic-ai-knowledge.js` (`NAKSHATRA_TRAITS:6`, `PLANET_SIGNIFICATIONS:36`, `SIGN_TRAITS:48`) | 프롬프트 | 1순위 |
| 낙샤트라 | `constants/nakshatra-attributes.js`, `constants/nakshatra-expert-prose.js` | 프롬프트·UI | 부록 E는 보충 |
| 서양 12궁 | `lib/fortune/sign-profiles.ts:49` `ZODIAC_PROFILES` | **UI만** | 워커 프롬프트용 자산 없음 → 부록 D가 주 재료 |
| | `karma-destiny-ai-calculations.js:86` | 원소·모드만 | |
| 27숙 | `lib/sukuyo-engine-server.ts:85` `BASE_DATA`, `W/lib/sukuyo-premium.js:8` `SUKUYO_MANSIONS` | 엔진·프롬프트 | 1순위, 부록 F는 대조용 |
| 타로 78 | `lib/tarot/rich-card-meanings.mjs:70` `MAJOR`, `:824` `MINOR` | 프롬프트·UI | 1순위, 부록 C는 대조용 |

내용 충돌을 나란히 비교하는 일은 Phase 2에서 `docs/context/trait-kb-review.md`(네오 검수용 표)에 담는다.

---

## 지시서 전제의 실재 여부

| 전제 | 결과 | 근거 |
|---|---|---|
| `sajuAdapter.ts` `calculateLocalResult()` | 3개 있음(동물 운명·Compass·찻집 클라이언트). **유료 LLM 경로가 아님** → 불변 유지가 쉽다 | `app/saju/animal-destiny/lib/sajuAdapter.ts:284` 외 |
| `normalizeSaju.ts`, KASI prefetch | 있음. 손대지 않음 | `app/saju/love-simulation/_engine/normalizeSaju.ts`, `prefetchKasiContext` (`sajuAdapter.ts:197`) |
| `Rules/agent-regression-guard.md`, `docs/payment-policy-flow.md` | 있음. 10항 폐기는 지시서대로 미적용 | |
| `verify:billing-pass-policy`, `verify:checkout-pass-card` | 있음 | `package.json:215`, `:309` |
| `_graveyard/` | main 트리에 없음 | |
| 결과 섹션 제목 i18n | 중앙 체계 없음. 기능별 사전과 하드코딩이 섞여 있음 | 클라이언트 표 |
| KV/R2 결과 저장 | 없음. 결과는 Mongo, R2는 이미지, KV 바인딩 없음 | |
| 큐 | 없음(동기 + 체크포인트) → 지시서 4-1 6번 "큐 작업 호환"은 **진행 중 보류 건의 장 계획 호환**으로 읽는다 | `sync-llm-timeout.js` |
| `[vars]` 플래그 추가 | 불가(바인딩 예산 가득) → `withEngineRollout` | `worker/lib/engine-rollout.js:6-38` |

---

## 확인된 위험 (Phase 1에서 깊게 판다)

| # | 위험 | 근거 | 영향 |
|---|---|---|---|
| 1 | 새 첫 섹션 추가 → 필수 장 목록·`is<Service>Complete`·체크포인트 재개(빠진 장만)가 함께 바뀜. 배포 시점에 진행 중인 보류 건(옛 장 계획)과 새 계획이 섞이면 다시 시도가 미완성으로 판정됨 | `consultation-recovery-registry.js`, `RETRY_FIRST_POLICY` | **결제 후 미제공 직결.** 장 계획 버전을 실행 문서에 고정해야 함 |
| 2 | 출력 토큰 잘림. 장당 8192~16000이고 thinking이 잠식. 기존 장에 성향 문단을 끼우면 `FORTUNE_OUTPUT_TRUNCATED` | `docs/context/ai-and-db.md` LLM 안전 규칙 | 별도 장이나 부분으로 분리해야 안전 |
| 3 | 동기 생성 부분이 1 늘어남 → 요청 1회 추가. 정체 감시 6회 기준과 상호작용 | `paid-delivery-stuck.js` | 시간 위험은 낮음. 감시 임계는 확인 필요 |
| 4 | P(즉시 환불) 서비스에서는 검증기 거부가 곧 환불 | `KNOWN_RETRY_PENDING` | **새 거부 조건을 만들지 않는다**(지시서 6-4와 정합) |
| 5 | 사주 메인 스냅샷에 신살·특수 조합·오행 과다/부족이 없고, 희신은 출처가 없음 | 3-2 표 | 추출기가 `saju-derived-signals.js` 재사용. 희신은 Phase 2에서 제외 또는 네오 결정 |
| 6 | 클라이언트 하드코딩 순서. 서버만 바꾸면 새 섹션이 안 보이고, 옛 결과는 빈 섹션으로 보일 수 있음 | 클라이언트 표 | 서버·클라이언트 동시 변경 + 옛 결과(키 없음) 렌더 호환 |
| 7 | `[vars]` 추가 시 바인딩 한도로 배포 실패 가능 | `engine-rollout.js` | `withEngineRollout`만 사용 |
| 8 | 이번 변경과 무관하게 이미 있는 구멍: `KNOWN_REFUND_GAPS`(운세 채팅 단건 카드·토스 네이티브·손금), `KNOWN_STUCK_SETTLE_GAPS` 12종(점성술·베다·자미·숙요·낙샤트라·HD·Compass·관계·작명·천상·fortune·카르마) | `verify-paid-llm-delivery-contract.mjs` | Phase 1 매트릭스에 그대로 올린다 |
| 9 | 고아 주문 점검. 기존 정체 감시와 `ServiceExecutionTransaction` pending 사유 코드 집계를 재사용하는 편이 새 스크립트보다 낫다 | `paid-delivery-stuck.js` | **운영 DB는 읽기 전용 쿼리라도 실행 전 승인 필요** |
| 10 | 영냥이 캐시 키에 `PROMPT_VERSION`이 없음. 같은 requestId·section이면 프롬프트를 바꿔도 옛 응답이 나옴 | `W/yeongnyangi/providers/response-cache.ts:16` | 재생성 경로에서 의도와 다를 수 있음. 재열람은 원본이라 무해 |
| 11 | 오행 과다/부족 임계값 충돌(기존 29/16% vs 지시서 35/5%) | `saju-derived-signals.js:32` | 같은 사용자가 영냥이와 다른 서비스에서 다른 판정을 받을 수 있음 → 기존 값 유지 권장 |

---

## 구현 계획 초안 (게이트 A 승인 대상)

1. **추출기**:
   - 위치: `worker/lib/trait-profile/`. 근거 계층 옆에 둔다.
   - 형태: 순수 함수. 입력은 기존 스냅샷(`buildSajuMyeongsikFactSnapshot`, ziwei chart, astrology chart, vedic chart, sukuyo normalize, tarot facts)만 받고, 엔진 코드는 수정하지 않는다.
   - KB: 3-3의 기존 자산을 우선하고, 부록은 빈칸(서양 행성×별자리, 십성 그룹 부재·잠재, 특수 조합 일부)만 채운다.
2. **주입**:
   - `buildBasisFactLines` / `engineFactPrompt` 옆에 `<trait_profile>` 블록 하나를 추가한다.
   - 어조 규칙(지시서 6-2)은 공통 system 조각 하나로 만든다.
3. **1차 적용**:
   - 대상은 첫 섹션이 이미 성향인 6종(신년운세·연애 비책·카르마·흑월·인생의 책·마스터 인연의 서).
   - 장 구조, 완성 판정, 클라이언트 순서는 그대로 두고 근거 주입과 어조만 바꾼다. 위험 1·6이 생기지 않는다.
4. **2차 적용(별도 승인)**:
   - 대상은 첫 섹션을 새로 만들어야 하는 서비스.
   - 엔진별로 장 계획 버전을 올리고, 실행 문서에 버전을 고정한다. 완성 판정, 클라이언트 순서, 옛 결과 호환까지 한 커밋 단위로 처리한다.
   - 순서는 Phase 1 감사 결과로 정한다.
5. **플래그**:
   - `withEngineRollout` 기본값 off로 둔다(예: `TRAIT_FIRST_SAJU`).
   - 같은 이름의 `[vars]`가 있으면 덮어쓰지만 새로 추가하지는 않는다.
6. **폴백**:
   - 6-4 (a) 성향 섹션만 재생성하는 경로는 동기 85s 상한을 고려해 다음 체크포인트 부분으로 넘긴다.
   - (b) TraitProfile 템플릿 섹션은 결정적이다.
   - (c) 원문을 그대로 전달한다.
   - 새 거부 조건은 만들지 않는다.
7. **골든셋(Phase 5)**: 실행 전에 호출 수·모델·예상 비용을 밝히고 회차별 1회 승인을 받는다. 생성 원문은 전부 전달한다.

## 영향 파일 후보 (지금은 수정하지 않음)

- 근거·추출: `worker/lib/analysis-basis-contract.js`, `worker/lib/engine-fact-snapshot.js`, `worker/lib/saju-ai-prompt.js`(스냅샷 읽기만), `worker/lib/saju-derived-signals.js`(재사용), `worker/lib/engine-rollout.js`, 신규 `worker/lib/trait-profile/*`
- 1차 6종: 신년운세·인생의 책·카르마 라우트의 `buildSectionPrompt`/`buildChapterPrompt`, `worker/lib/love-secret-ai-prompt.js`, `worker/lib/heukwol-report.js`, `master-love-codex-prompt.mjs`
- 2차: `worker/routes/astrology-ai.js`, `vedic-ai.js`, `ziwei-ai.js`, `nakshatra-ai-prompt.js`, `lib/fusion-fortune-prompt.js`, `neo-operation-room-prompt.js`, `destiny-compass-report-contract.js`, `paid-narrative-delivery.js` 등, 그리고 위 클라이언트 순서 파일
- 감사만: `scripts/verify-paid-llm-delivery-contract.mjs`, `worker/lib/consultation-recovery-registry.js`, `worker/lib/paid-delivery-stuck.js`
- 결제 실행 파일(PortOne/이니시스): **현재 수정 필요 없음으로 판단.** Phase 1에서 바뀌면 별도 결제 게이트를 연다.

## 네오에게 결정이 필요한 것 (게이트 A)

1. **1차 적용 범위**: 첫 섹션이 이미 성향인 6종부터 장 구조를 바꾸지 않고 시작한다(추천). 첫 섹션 신설은 Phase 1 뒤 엔진별 별도 승인으로 한다. 이유는 위험 1·2·6을 피하면서 효과를 먼저 볼 수 있기 때문이다.
2. **오행 과다/부족 임계값**: 기존 29%/16% 유지(추천, 서비스 간 일관성) 또는 지시서 35%/5% 중에서 고른다.
3. **희신**: 출처가 없으므로 TraitProfile에서 제외한다(추천).
4. **운영 DB 읽기 전용 고아 주문 집계**: Phase 1에서 실행할지 정한다(별도 승인).
