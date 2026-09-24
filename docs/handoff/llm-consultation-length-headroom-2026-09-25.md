---
status: active
updated: 2026-09-25
next: "영냥이를 뺀 LLM 상담의 분량을 약간(목표 +10~20%) 올리고, 코딩 원칙 17 의 세 여유 기준(하한·토큰·형식 교정)에 맞춘다. 공통 레버 → 기능별 순서로 세션을 나눈다."
---

# LLM 상담 분량 상향과 생성 여유 (영냥이 외)

다음 세션 첫 문장: 이 문서의 '권장 세션 분할' 1번(paid-narrative 공통 레버)부터 시작한다. 바꿀 숫자마다 `scripts/verify-llm-generation-resilience.mjs` 의 고정값을 먼저 확인하고, 실 LLM 호출 없이 mock 으로만 검증한다.

## 왜

> 영냥이 상담의 고등어의 분량을 좀 더 올려주고 나머지 llm 상담도 약간 더 분량을 올리도록하고 상한이 너무 빡빡하지 않도록 여유있게 해서 실패하지 않도록 최적화해줘 안된느것이 최악이고 이것은 룰에 추가해서 항상 기억하도록해줘 (2026-09-25)

이 세션은 범위를 **영냥이 + 규칙**으로 잘랐다(사용자 확답). 나머지 약 30개 상담은 이 문서로 넘긴다.

## 이 세션에서 끝낸 것 (영냥이)

| 커밋 | 내용 |
|---|---|
| `ba5a782ff` | 문단 분할기 fail-safe — 문장 끝이 없거나 500자를 넘는 한 문장도 절·공백·상한에서 잘라 모든 조각 ≤500. 운영의 고등어 5장 `INVALID_CHAPTER_BLOCKS` ×5 원인 제거 |
| `ed0ffe0c0` | v5 테스트가 "501자 거부"를 정답으로 고정하던 단언을 새 계약으로 교체 |
| `b1cff7e78` | 고등어 v6 하한 5500·목표 [7500,8500](+20%), 5장(action) 가중치 0.85→1.3 → 5장 목표 1,052~1,227 → **1,840~2,085자**. 연어·광어·참치·퓨전은 목표만 +10%. 프로바이더 cap = max(요청, `tokensRequiredForChars(6000)`) + thinking 1024 |
| `2d86ccd70` | 사이트맵 원장(`/`, `/yeongnyangi/1000-won-fortune/` 서명) |

규칙: `CLAUDE.md` 코딩 원칙 17 + `docs/context/ai-and-db.md` "LLM 안전 규칙" 🔴 항목. 요지는 세 가지다.

1. 목표만 올리고 하한은 따라 올리지 않는다 — 하한 ≤ 목표 하한 × 약 0.8.
2. 출력 토큰 ≥ `tokensRequiredForChars(목표 상한)` + thinking 예산. Gemini 2.5 는 thinking 이 `maxOutputTokens` 를 잠식한다(`lib/llm-client.ts:885`).
3. 모델이 자주 어기는 형식 상한은 거부 대신 저장 전 결정적 교정.

## 공통 레버 (하나 바꾸면 여러 기능이 같이 움직인다)

| 파일 | 현재 값 | 영향 |
|---|---|---|
| `worker/lib/paid-narrative-delivery.js` | 기본 프롬프트 "공백 제외 최소 ${minChars}자, 목표 ×1.2~1.4"(:96), base/cap 9500, attempts 1, 타임아웃 15~45초(:103-106) | 꿈 심리분석·지오맨시·타로 유료 3종·작명·천상의 조화·관계 리포트·전문가 후속·펫 사주·시빌·기능 질문 |
| `worker/lib/structured-consultation.js` `callGeminiJsonWithRetry` (:56-107) | 잘림 재시도마다 토큰 ×(1+0.3n), cap 까지 | JSON 상담 대부분(대개 `attempts:1` 로 호출) |
| `worker/lib/llm-budget.js` | 1.5 토큰/글자, 머리말 1,500자, `tokensRequiredForChars(c)=ceil((c+1500)×1.5)` | 검증기가 이 값을 읽는다 |
| `lib/llm-client.ts` | **기본 maxTokens 없음**(:189), thinkingBudget 기본 0 | 모든 호출 — 여기 기본값을 넣으면 전 기능이 바뀐다(범위 밖, 보고만) |

## 기능별 인벤토리 (2026-09-25 코드 읽기 실측, 호출 0회)

"하한/목표" 는 프롬프트·판정기 문구에서 읽은 비율이다 — 0.8 을 넘으면 규칙 17 후보.

| 기능 · 진입점 | 토큰/호출 | 하한 · 목표 | 하한/목표 | 실패 시 사용자 화면 |
|---|---|---|---|---|
| 사주 명식 AI · `worker/routes/fortune.js:4492`, `worker/lib/saju-ai-prompt.js:104` | 11000 | 그룹 5 × 최소 4000 | 목표 미확인 | 20000 미달 → "상담 분량이 유료 기준에 못 미칩니다." |
| 기능 질문(점성·베다·자미·숙요) · `worker/lib/feature-question-delivery.js` | 9500 | 소제목 9 × 최소 2200, 목표 2600 | **0.85** | 소진 → 환불 |
| 점성술 AI · `worker/routes/astrology-ai.js:54` | 11000 | 섹션 3400~5000, 총 20000~32000 | 판정 min–max 범위 | `LLM_QUALITY_CHECK_FAILED` + 환불 안내 |
| 베다 AI · `worker/routes/vedic-ai.js:42` | 12500 | 그룹 4400~6000 | 0.73 | 짧은 그룹 재생성 웨이브 |
| 자미두수 AI · `worker/routes/ziwei-ai.js:50` | 그룹 8000 | 그룹 목표 3600~4500, 판정 0.9~1.18× | **0.9** | `REPORT_QUALITY_FAILED` |
| 자미 딥 리포트 · `worker/routes/ziwei-deep-report.js:258` | 9000 | 장 최소 2200, 총 20000 | 목표 미확인 | 대체 문단 + `ok:false` |
| 카르마 운명 · `worker/routes/karma-destiny-ai.js:94` | 장 7000 | 섹션 최소 1500, 총 30000 | 미확인 | 불완전 → throw |
| 인생의 책 · `worker/routes/life-book-ai.js:210` | 10000/7000 | 장 최소 2000~2400, 목표 3000 | 0.67~0.8 | `SECTION_JSON_MISSING` |
| 연애 비밀 · `worker/routes/love-secret-ai.js:48` | 12500 | 그룹 5000~6500 | 0.77 | 잘림 = 실패 |
| 마스터 러브 코덱스 · `worker/lib/master-love-codex-quality.js:7` | 8000→11000(잘림 후) | 장 최소 2400, 목표 +500~+900 | **0.73~0.83** | `LLM_OUTPUT_TRUNCATED` |
| 낙샤트라 · `worker/routes/nakshatra-ai.js:692` | 10000 | `MIN_TOTAL_CHARS`(:93) | 미확인 | 잘림 → 빈 본문 → 다음 배치 |
| 네오 작전실 · `worker/routes/neo-operation-room.js:1004` | 8192 | 섹션 최소 1150~2000 | 미확인 | 40자 미만 거부 |
| 신년 AI · `worker/routes/new-year-ai.js:123` | 10500 | 총 20000~28000 | 0.71 | 폴백 ×0.4 |
| 지오맨시 · `worker/routes/oracle.js:165` | 11000 | 섹션 최소 3000, 본문 20000 | paid-narrative 기본 | 환불 |
| 숙요 궁합 · `worker/routes/sukuyo-compatibility-ai.js:76` | 8000(cap 12000) | 최대 26000 | 미확인 | 섹션 폐기 |
| 요가 구루 · `worker/routes/yoga-guru.js:69` | 8192 | 최소 800 | 미확인 | 거부 |
| 운명 나침반 · `worker/lib/destiny-compass-report-contract.js:28` | 8500 | 섹션 2000~3600 | 0.56 | 섹션 거부 |
| 휴먼디자인 리포트 · `human-design-report.js` 계약 :61 | 9000 | 18 섹션 800~2200 / 2600~4000 | 판정 min–max | `body_minimum_not_met` |
| 운명의 찻집 · `worker/routes/fortune-tea-house.js:3608` | 12000 | 사주 10000·타로 6000·숙요 8000 | 0.75 재생성 | 웨이브 2 |
| 꿈 심리분석 · `worker/routes/dream.js:1196` | 9500 | 최소 2000, 목표 2400~2800 | **0.83** | 환불 |
| 손금 · `worker/lib/palm-vision.js:469` | 8192(cap 12288) | 상담 최소 1200 | 미확인 | null |
| 동물 토템 · `worker/routes/animal-totem.js:38` | 3000/4800 | 본문 450/800 | 미확인 | 거부(JSON 문자열 길이로 셈 — 과대 측정) |
| 천상의 조화 · `worker/lib/celestial-report-delivery.js:41` | 11000 | 12 파트 | 미확인 | 환불 |
| 작명 · `worker/lib/naming-report-delivery.js` | 9500 | 최소 2500, 목표 3000~3400 | **0.83** | 환불 |
| 초융합 · `worker/lib/fusion-fortune.js:661` | min(12000, 목표×1.8+900) | 총 30000~60000 | 미확인 | 재작성 지시 |
| 타로 lib 3종(아래 우회 경로) | 10000~12000, 잘림 재시도 ×(1+0.4n) | 오라클 `SHORT_RESULT_RATIO` | 미확인 | 오라클은 짧아도 `llm_short` 로 전달 |
| 수호신 운세 · `worker/lib/guardian-fortune-llm-policy.js` | 5200 | 2600~3600 | 0.72 | 기본 provider 가 mock, 템플릿 폴백 |

## 고정 수치 정본과 테스트

- `scripts/verify-llm-generation-resilience.mjs` `assertBudget`(:440-458) — 글자↔토큰·머리말 검사, **숫자가 소스에 문자 그대로 있어야** 통과. 베다·점성·숙요 12000·사주·나침반·인생의 책·12500·CMS 클램프(:1009-1073)를 덮는다. 토큰을 바꾸면 여기부터 갱신.
- 그 밖: `scripts/verify-astrology-sectioned-generation.mjs:163`(≤12000), `scripts/verify-ziwei-deep-paid-reopen-browser.mjs:41`, `__tests__/worker/celestial-paid-delivery.test.js:123`, `life-book-ai.sections.test.js:95`(≤10000), `cms-prompt-model-config.clamp.test.js`, `ziwei-ai.pass-generation.test.js:218`, `dream-psycho-analysis.route.test.js:65`(9500), `__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js:350`, `config/pass-cost-planning-20260921.json`(호출당 토큰 계획값).

## 우회 경로 (공통 레버가 닿지 않는다)

`lib/tarot/love-reading-llm.mjs`, `lib/tarot/mindscan-reading.mjs`, `lib/tarot/oracle-consultation.mjs` 는 llm-client 를 거치지 않고 Gemini REST 를 직접 부른다. 재시도 증가율도 ×1.4 로 따로다.

## 발견한 결함 (범위 밖, 보고만)

- `worker/lib/saju-ai-prompt.js:100-101` 주석은 "9600 토큰 ≈ 6,400자" 인데 상수(:104)는 11000.
- `lib/llm-client.ts` 에 기본 maxTokens 가 없어 호출부가 빠뜨리면 프로바이더 기본값이 조용히 쓰인다.
- 동물 토템은 JSON 문자열(키 포함) 길이로 분량을 재서 실제 본문보다 크게 센다.
- 오라클 상담은 짧은 결과를 `llm_short` 로 전달한다 — 환불하는 paid-narrative 계열과 반대 계약.

## 권장 세션 분할 (한 세션 한 작업)

1. **paid-narrative 공통 레버** — 기본 프롬프트 목표 비율과 base/cap 을 올려 꿈·지오맨시·타로 유료·작명·천상·관계·기능 질문을 한 번에. 기능 질문(0.85)·꿈·작명(0.83)의 하한/목표를 0.8 이하로.
2. **사주·점성·베다·자미 라우트 그룹 AI** — `verify-llm-generation-resilience.mjs` 고정값과 함께. 자미 checkpoint 0.9 하한이 가장 빡빡하다.
3. **나머지 개별 라우트** — 연애 비밀·카르마·인생의 책·신년·초융합·네오·숙요 궁합·찻집·휴먼디자인·나침반·마스터 러브 코덱스.
4. **타로 lib 3종** — 우회 경로라 따로.

각 세션: RED(유료 결과 경로). 결제·환불 로직은 건드리지 않는다. 과금 실호출 0회, 검증은 mock·검증기로.
