---
status: active
updated: 2026-09-25
next: "세션 1(acf88e953)·세션 2(cbd7a81ee~044ad44d5, 사주·점성·베다·자미 라우트 그룹)는 끝났다. 3번 나머지 개별 라우트부터 — 목표만 올리고 하한 ≤ 목표 하한 × 0.8, 거부 상한 ≥ 목표 상한 × 1.15, 토큰 ≥ tokensRequiredForChars(거부 상한)+thinking."
---

# LLM 상담 분량 상향과 생성 여유 (영냥이 외)

다음 세션 첫 문장: 이 문서의 '권장 세션 분할' 3번(나머지 개별 라우트)부터 시작한다 — 목록이 길므로 계획 단계에서 한 세션 몫(4~5개)으로 자르고, 라우트마다 판정 하한·목표·거부 상한·토큰을 먼저 읽어 `scripts/verify-llm-generation-resilience.mjs` 7절 표(`PAID_PART_TARGETS` 또는 `ROUTE_GROUP_TARGETS`)에 한 줄씩 넣은 뒤, 실 LLM 호출 없이 mock 으로만 검증한다.

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

## 세션 1에서 끝낸 것 (paid-narrative 계열, `acf88e953`)

하한·과제당 시도 3회·결제/환불 로직은 그대로다. 프롬프트 목표만 올렸다. 모든 호출이 thinking 0 이다.

| 기능 · 위치 | 판정 하한 | 목표 (전 → 후) | 하한/목표 하한 | 필요 토큰 ≤ 현재 |
|---|---|---|---|---|
| 기능 질문 · `worker/lib/feature-question-delivery.js:57` | 2200 | 2600 → **2800~3200** | 0.85 → 0.79 | 7050 ≤ 9500 |
| 꿈 심리분석 · `worker/routes/dream.js` 파트 프롬프트 | 2000 | 2400~2800 → **2600~3100** | 0.83 → 0.77 | 6900 ≤ 9500 |
| 지오맨시 · `worker/routes/oracle.js:173` | 3000 | 3600~4200 → **3900~4600** | 0.83 → 0.77 | 9150 ≤ 11000 |
| 작명 · `worker/lib/naming-report-delivery.js:64` | 2500 | 3000~3400 → **3200~3700** | 0.83 → 0.78 | 7800 ≤ 9500 |
| 천상의 조화 카드 · `worker/lib/celestial-report-delivery.js:51` | 필드 500 | 600~700 → **650~750** | 0.83 → 0.77 | 6필드×750 → 9000 ≤ 11000 |
| 관계 리포트 · `worker/lib/relationship-report-delivery.js:57` | 2000 | 2200~2500 → **2600~3000** | 0.91 → 0.77 | 6750 ≤ 9500 |
| 펫 사주(기본 프롬프트)·연애 타로·마음 스캔·타로 오라클 | 과제 minChars | ×1.2~1.4 / ×1.25 → **×1.3~1.5** | 0.83·0.8 → 0.77 | 최대 과제 2500×1.5 → 7875 ≤ 9500 |

가드: `scripts/verify-llm-generation-resilience.mjs:1078` 7절 — 판정 하한 코드·목표 문구·토큰 코드를 한 표로 묶어 셋 중 하나라도 소스에서 사라지거나, 하한/목표 하한 > 0.8 이거나, 목표 상한이 토큰에 안 들면 실패한다. 비율형 4곳은 정규식으로 `1/a ≤ 0.8` 을 본다. 변이 2종(비율 퇴행·하한 변경)으로 무는 것 확인.

검증(과금 호출 0회): `verify:llm-generation-resilience` ok(940 checks) · jest 15 suites/412 tests · `node --test` paid-generation-timeout 17·worker-binding-budget 3 · `verify-paid-gate-ui-regression` PASS · `check:fast --committed-head` critical 등급 exit 0(jest 296 suites/4207 tests 포함). 옆 세션의 미커밋 마케팅 파일이 있어 `--committed-head` 로 돌렸다.

🔴 **정정 — "공통 레버" 는 공통이 아니었다.** `runPaidNarrativeDelivery` 의 기본 프롬프트·9500 토큰(`paid-narrative-delivery.js:96`)을 실제로 쓰는 곳은 펫 사주(`worker/lib/pet-report-delivery.js`)뿐이다. 나머지 호출부(기능 질문·꿈·지오맨시·타로 3종·전문가 후속·수호신·동물 토템·요가)는 모두 자체 `produce` 로 프롬프트와 토큰을 따로 정한다. 작명·천상·관계는 `runPaidNarrativeDelivery` 를 아예 쓰지 않는다. 그래서 파일별로 고쳤다.

## 세션 2에서 끝낸 것 (사주·점성·베다·자미 라우트 그룹 AI)

커밋: `cbd7a81ee` 사주 · `f4d988574` 점성 · `0e1aae029` 베다 · `044ad44d5` 자미 + 검증기 7절. 판정 하한·결제/환불 로직·재시도 횟수·타임아웃은 그대로다. 필드를 셋으로 나눴다 — `minChars` 판정 하한, `targetMinChars~maxChars`(자미는 `targetChars`) 프롬프트 목표, `hardMaxChars`(자미는 목표 × `SECTION_GROUP_MAX_OVER_TARGET` 1.25) 거부 상한. 프롬프트 문구는 세션 1과 같은 "공백 제외 최소 X자, 목표 A~B자".

| 기능 · 위치 | 판정 하한 | 목표 (전 → 후) | 거부 상한 (전 → 후) | 토큰/호출 (전 → 후) | 전체 상한 (전 → 후) |
|---|---|---|---|---|---|
| 사주 5그룹 · `worker/lib/saju-ai-prompt.js:43`, 프롬프트 `worker/routes/fortune.js:346` | 4000 | 4000~6000 → **5000~6000** | 없음 | 11000 → **12000**(웨이브 2도) | — |
| 점성 6섹션 · `worker/routes/astrology-ai.js:918` | 3400 | 3400~5000 → **4300~5000** | 5000 → **6000** | 11000 → **12000** | 32000 → **38000**(소제목까지 센다) |
| 베다 읽기 4그룹 · `worker/routes/vedic-ai.js:63` | 4400 | 4400~6000 → **5500~6000** | 6000 → **7000** | 12500 → **13000** | 25000 → **30000** |
| 베다 근거 그룹 | 2600 | 2600~4200 → **3300~4200** | 4200 → **5000** | 〃 | 합계 제외 |
| 자미 6그룹 · `worker/routes/ziwei-ai.js:100` | 목표 × 0.9 → **절대값 3240~4050**(구 하한 그대로) | 3600~4500 → **4100~5100** | 목표 × 1.18 → **× 1.25** | 실효 8000 → **12000**(총 48000 → 72000) | 30000 → **38000** |

하한/목표 하한은 넷 다 1.0(자미 0.9)이었고 이제 모두 ≤ 0.8 이다. 자미는 예전 실효 토큰이 8000(= `charsAllowedByTokens` 5,333자, 머리말 몫을 빼면 3,833자)이라 목표(최대 4,500자)조차 예산 모델상 빠듯했다.

가드: `scripts/verify-llm-generation-resilience.mjs:1120` 7절 `ROUTE_GROUP_TARGETS` — 숫자는 모듈에서 읽고 프롬프트 문구·거부 상한 코드·토큰 코드가 소스에 그대로 있는지 본다. 행마다 하한 ≤ 목표 하한 × 0.8, 거부 상한 ≥ 목표 상한 × 1.15, `tokensRequiredForChars(거부 상한 또는 목표 상한)` ≤ 토큰, 그룹 하한 합 ≥ 배달 하한, 그룹 거부 상한 합 ≤ 전체 상한. 2·3절 `assertBudget` 은 이제 `hardMaxChars` 로 잰다. 변이 5종(자미 하한 상향·자미 cap 11000 복귀·점성 거부를 maxChars 로·베다 거부 상한 6500·사주 목표 문구 삭제) 모두 무는 것 확인.

검증(과금 호출 0회): `verify:llm-generation-resilience` ok(1046 checks) · `verify-saju-ai-section-plan`(160) · `verify-astrology-sectioned-generation` · `verify-astrology-ai-flow` · `verify-vedic-ai-flow` · `verify-ziwei-ai-consultation-flow` · `verify-ziwei-personality-context` 모두 ok · jest 13 suites/170 tests(사주·점성·베다·자미 유료 배달·프롬프트). `check:fast --committed-head --base=origin/main`(네 커밋 전체) critical 등급 exit 0 — paid-gate-suite 88/0, jest 296 suites/4207 tests, build:worker 포함. 옆 세션의 미커밋 마케팅 파일이 있어 커밋 기준으로 돌렸다.

남은 위험(추정·미측정): 평균 출력이 10~14% 늘어 호출당 45초(자미·베다·점성) 타임아웃에 가까워지고, 보고서당 출력 비용도 그만큼 는다. 운영 로그에서 그룹별 소요 시간 분포를 먼저 볼 것. 되돌림은 라우트별 커밋 `git revert` 하나(자미 커밋은 검증기 7절을 함께 담고 있어 자미만 되돌리면 7절도 같이 빠진다).

## 공통 레버 (하나 바꾸면 여러 기능이 같이 움직인다)

| 파일 | 현재 값 | 영향 |
|---|---|---|
| `worker/lib/paid-narrative-delivery.js` | 기본 프롬프트 "최소 ${minChars}자, 목표 ×1.3~1.5"(:96), base/cap 9500, attempts 1 | **펫 사주만**(위 정정). 다른 호출부는 자체 `produce` |
| `worker/lib/structured-consultation.js` `callGeminiJsonWithRetry` (:56-107) | 잘림 재시도마다 토큰 ×(1+0.3n), cap 까지 | JSON 상담 대부분(대개 `attempts:1` 로 호출) |
| `worker/lib/llm-budget.js` | 1.5 토큰/글자, 머리말 1,500자, `tokensRequiredForChars(c)=ceil((c+1500)×1.5)` | 검증기가 이 값을 읽는다 |
| `lib/llm-client.ts` | **기본 maxTokens 없음**(:189), thinkingBudget 기본 0 | 모든 호출 — 여기 기본값을 넣으면 전 기능이 바뀐다(범위 밖, 보고만) |

## 기능별 인벤토리 (2026-09-25 코드 읽기 실측, 호출 0회)

"하한/목표" 는 프롬프트·판정기 문구에서 읽은 비율이다 — 0.8 을 넘으면 규칙 17 후보.

| 기능 · 진입점 | 토큰/호출 | 하한 · 목표 | 하한/목표 | 실패 시 사용자 화면 |
|---|---|---|---|---|
| 사주 명식 AI · `worker/routes/fortune.js:4492`, `worker/lib/saju-ai-prompt.js:113` | ~~11000~~ 12000(세션 2) | 그룹 5 × 최소 4000, 목표 5000~6000(세션 2) | 0.8 | 20000 미달 → "상담 분량이 유료 기준에 못 미칩니다." |
| 기능 질문(점성·베다·자미·숙요) · `worker/lib/feature-question-delivery.js` | 9500 | 소제목 9 × 최소 2200, 목표 2800~3200(세션 1) | 0.79 | 소진 → 환불 |
| 점성술 AI · `worker/routes/astrology-ai.js:54` | ~~11000~~ 12000(세션 2) | 섹션 최소 3400, 목표 4300~5000, 거부 6000, 총 20000~38000(세션 2) | 0.79 | `LLM_QUALITY_CHECK_FAILED` + 환불 안내 |
| 베다 AI · `worker/routes/vedic-ai.js:42` | ~~12500~~ 13000(세션 2) | 그룹 최소 4400, 목표 5500~6000, 거부 7000(세션 2) | 0.8 | 짧은 그룹 재생성 웨이브 |
| 자미두수 AI · `worker/routes/ziwei-ai.js:50` | ~~그룹 8000~~ 12000(세션 2) | 그룹 최소 3240~4050, 목표 4100~5100, 거부 목표 × 1.25(세션 2) | 0.79 | `REPORT_QUALITY_FAILED` |
| 자미 딥 리포트 · `worker/routes/ziwei-deep-report.js:258` | 9000 | 장 최소 2200, 총 20000 | 목표 미확인 | 대체 문단 + `ok:false` |
| 카르마 운명 · `worker/routes/karma-destiny-ai.js:94` | 장 7000 | 섹션 최소 1500, 총 30000 | 미확인 | 불완전 → throw |
| 인생의 책 · `worker/routes/life-book-ai.js:210` | 10000/7000 | 장 최소 2000~2400, 목표 3000 | 0.67~0.8 | `SECTION_JSON_MISSING` |
| 연애 비밀 · `worker/routes/love-secret-ai.js:48` | 12500 | 그룹 5000~6500 | 0.77 | 잘림 = 실패 |
| 마스터 러브 코덱스 · `worker/lib/master-love-codex-quality.js:7` | 8000→11000(잘림 후) | 장 최소 2400, 목표 +500~+900 | **0.73~0.83** | `LLM_OUTPUT_TRUNCATED` |
| 낙샤트라 · `worker/routes/nakshatra-ai.js:692` | 10000 | `MIN_TOTAL_CHARS`(:93) | 미확인 | 잘림 → 빈 본문 → 다음 배치 |
| 네오 작전실 · `worker/routes/neo-operation-room.js:1004` | 8192 | 섹션 최소 1150~2000 | 미확인 | 40자 미만 거부 |
| 신년 AI · `worker/routes/new-year-ai.js:123` | 10500 | 총 20000~28000 | 0.71 | 폴백 ×0.4 |
| 지오맨시 · `worker/routes/oracle.js:165` | 11000 | 섹션 최소 3000, 목표 3900~4600(세션 1) | 0.77 | 환불 |
| 숙요 궁합 · `worker/routes/sukuyo-compatibility-ai.js:76` | 8000(cap 12000) | 최대 26000 | 미확인 | 섹션 폐기 |
| 요가 구루 · `worker/routes/yoga-guru.js:69` | 8192 | 최소 800 | 미확인 | 거부 |
| 운명 나침반 · `worker/lib/destiny-compass-report-contract.js:28` | 8500 | 섹션 2000~3600 | 0.56 | 섹션 거부 |
| 휴먼디자인 리포트 · `human-design-report.js` 계약 :61 | 9000 | 18 섹션 800~2200 / 2600~4000 | 판정 min–max | `body_minimum_not_met` |
| 운명의 찻집 · `worker/routes/fortune-tea-house.js:3608` | 12000 | 사주 10000·타로 6000·숙요 8000 | 0.75 재생성 | 웨이브 2 |
| 꿈 심리분석 · `worker/routes/dream.js:1196` | 9500 | 최소 2000, 목표 2600~3100(세션 1) | 0.77 | 환불 |
| 손금 · `worker/lib/palm-vision.js:469` | 8192(cap 12288) | 상담 최소 1200 | 미확인 | null |
| 동물 토템 · `worker/routes/animal-totem.js:38` | 3000/4800 | 본문 450/800 | 미확인 | 거부(JSON 문자열 길이로 셈 — 과대 측정) |
| 천상의 조화 · `worker/lib/celestial-report-delivery.js:41` | 11000 | 12 파트, 카드 필드 최소 500·목표 650~750(세션 1) | 0.77 | 환불 |
| 작명 · `worker/lib/naming-report-delivery.js` | 9500 | 최소 2500, 목표 3200~3700(세션 1) | 0.78 | 환불 |
| 초융합 · `worker/lib/fusion-fortune.js:661` | min(12000, 목표×1.8+900) | 총 30000~60000 | 미확인 | 재작성 지시 |
| 타로 lib 3종(아래 우회 경로) | 10000~12000, 잘림 재시도 ×(1+0.4n) | 오라클 `SHORT_RESULT_RATIO` | 미확인 | 오라클은 짧아도 `llm_short` 로 전달 |
| 수호신 운세 · `worker/lib/guardian-fortune-llm-policy.js` | 5200 | 2600~3600 | 0.72 | 기본 provider 가 mock, 템플릿 폴백 |

## 고정 수치 정본과 테스트

- `scripts/verify-llm-generation-resilience.mjs` `assertBudget`(:440-458) — 글자↔토큰·머리말 검사, **숫자가 소스에 문자 그대로 있어야** 통과. 베다·점성·숙요 12000·사주·나침반·인생의 책·12500·CMS 클램프(:1009-1073)를 덮는다. 토큰을 바꾸면 여기부터 갱신. 세션 2부터 7절에 라우트 그룹 표 `ROUTE_GROUP_TARGETS`(:1120)가 붙었다 — 숫자는 모듈에서 읽으므로 값만 바꾸면 따라오고, 문구·거부·토큰 코드를 바꾸면 표를 함께 고친다.
- 그 밖: `scripts/verify-astrology-sectioned-generation.mjs:163`(≤12000), `scripts/verify-ziwei-deep-paid-reopen-browser.mjs:41`, `__tests__/worker/celestial-paid-delivery.test.js:123`, `life-book-ai.sections.test.js:95`(≤10000), `cms-prompt-model-config.clamp.test.js`, `ziwei-ai.pass-generation.test.js:218`, `dream-psycho-analysis.route.test.js:65`(9500), `__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js:350`, `config/pass-cost-planning-20260921.json`(호출당 토큰 계획값).

## 우회 경로 (공통 레버가 닿지 않는다)

`lib/tarot/love-reading-llm.mjs`, `lib/tarot/mindscan-reading.mjs`, `lib/tarot/oracle-consultation.mjs` 는 llm-client 를 거치지 않고 Gemini REST 를 직접 부른다. 재시도 증가율도 ×1.4 로 따로다.

## 발견한 결함 (범위 밖, 보고만)

- ~~`worker/lib/saju-ai-prompt.js:100-101` 주석은 "9600 토큰 ≈ 6,400자" 인데 상수(:104)는 11000.~~ 세션 2에서 주석을 12000 기준으로 고쳤다.
- (세션 2) 베다·점성 그룹 토큰은 CMS 오버라이드가 `minTokens: tokensRequiredForChars(minChars)` 까지 낮출 수 있다(`vedic-ai.js` `cmsPromptModelConfig`). CMS 로 낮추면 거부 상한까지는 못 담는다. 현재 CMS 미설정이면 코드 기본값(13000·12000). 자미는 `max(그룹 기본값, CMS/6)` 라 해당 없음.
- (세션 2) 자미 비체크포인트 경로 `generateInitialConsultation`(재생성 비율 0.8·그룹 하한 목표 × 0.4)은 유일한 호출부가 checkpoint 를 넘겨 운영에서 타지 않는다. 손대지 않았다.
- `lib/llm-client.ts` 에 기본 maxTokens 가 없어 호출부가 빠뜨리면 프로바이더 기본값이 조용히 쓰인다.
- 동물 토템은 JSON 문자열(키 포함) 길이로 분량을 재서 실제 본문보다 크게 센다.
- 오라클 상담은 짧은 결과를 `llm_short` 로 전달한다 — 환불하는 paid-narrative 계열과 반대 계약.
- (세션 1) `worker/lib/island/consult/palace-delivery.js:37` 목표 ×1.2~1.4(하한/목표 0.83) — 인벤토리에 없던 호출부. 3번 세션에 넣는다.
- (세션 1) 형식 거부 후보(원칙 17 세 번째 기준): 기능 질문·전문가 후속은 문장 끝 구두점이 없으면 거부, 연애 타로 matrix 는 "정확히 4문단"(`love-tarot-delivery.js:52`), 마음 스캔 요약은 "정확히 10문단"이 아니면 거부한다. 거부 대신 결정적 교정으로 바꿀지 별도 판단.
- (세션 1) 천상의 조화 `CELESTIAL_HARMONY_MAX_OUTPUT_TOKENS` 클램프 하한이 8000 이라 env 로 낮추면 목표 상한(9000 토큰 필요)을 못 담는다. 현재 env 미설정이면 기본 11000.
- (세션 1, 추정·미측정) 목표를 올린 만큼 생성 시간이 늘어 45초 타임아웃에 가까워진다. 운영 로그에서 파트별 소요 시간 분포를 먼저 볼 것.
- (세션 1) 동물 토템·요가 구루·수호신은 1번 목록에 없어 손대지 않았다 — 3번에 포함.

## 권장 세션 분할 (한 세션 한 작업)

1. ~~**paid-narrative 계열**~~ — 끝(`acf88e953`, 위 표).
2. ~~**사주·점성·베다·자미 라우트 그룹 AI**~~ — 끝(`cbd7a81ee`~`044ad44d5`, 위 표).
3. **나머지 개별 라우트** — 연애 비밀·카르마·인생의 책·신년·초융합·네오·숙요 궁합·찻집·휴먼디자인·나침반·마스터 러브 코덱스 + 섬 궁전 상담(`palace-delivery.js`)·동물 토템·요가 구루·수호신.
4. **타로 lib 3종** — 우회 경로라 따로.

각 세션: RED(유료 결과 경로). 결제·환불 로직은 건드리지 않는다. 과금 실호출 0회, 검증은 mock·검증기로.
