---
status: todo
created: 2026-10-10
owner: 다음 세션
next:
  - "1. 이 문서의 '지켜야 할 규칙'과 CLAUDE.md:15-19, docs/context/ai-and-db.md:116-118 을 읽는다."
  - "2. '2026-10-10 진행 결과'를 읽는다. 신년운세(NY1)는 운영 결함으로 결과가 안 나온다. 사용자가 고치라고 하면 결함부터 고치고(mock 테스트 1개), NY1 을 다시 1회 실호출한다."
  - "3. 남은 서비스(사주 AI 상담·인생의 책·운명의 업·운명 찻집·사주 궁합 basic·반려동물 사주)를 우선순위대로 하나씩 한다. 서비스마다 하네스 스크립트를 쓰고 --plan 으로 견적을 낸 뒤 1회 실호출 승인을 따로 받는다."
  - "4. 결과 본문은 결과 페이지(https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV)에 탭으로 더하고 result.md 절대 경로도 함께 전달한다."
---

# 꿀꿀 사주 LLM 서비스 결과 직접 보기 — 인수인계

## 사용자 요청 (2026-10-10)

"꿀꿀 운세의 신년운세 등 사주 llm 서비스들의 결과를 내가 직접 볼 수 있도록 다른 세션에서 진행할 수 있도록 인수인계 문서 남겨줘"

목표는 사용자가 **실제 모델이 만든 최종 결과 원문**을 읽는 것이다. 평가·요약이 아니라 원문을 보여 주는 것이 산출물이다. 결함을 찾으면 적어 두되, 고치는 일은 이 작업의 범위가 아니다(별도 요청으로 받는다).

## 2026-10-10 진행 결과

사용자가 "결과 본문을 보여 달라"고 해서 원 세션(e857fcb4)이 신년운세·연애 비책을 1회씩 실호출했다. 결과 본문은 비공개 결과 페이지 https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV 에 서비스별 탭으로 모았다(생성기는 원 세션 scratchpad 의 `kkul_page.py`: 각 `result.md` 를 그대로 넣고 marked 로 렌더한다). 페이지를 갱신하려면 다른 세션에서 Artifact publish 에 `url` 로 이 주소를 넘긴다.

| ID | 서비스 | 결과 | 호출·비용 | 원문 |
|---|---|---|---|---|
| LS1 | 연애 비책(P1 단독, 썸, 고백 타이밍 질문) | 완료 24,796자, 전부 STOP. action 그룹이 REPEATED_PASSAGE 로 1회 재시도 | 7회 $0.0680 | `LS1/result.md` |
| NY1 | 신년운세(P1, 2027, 부업·이직 질문) | **generation_failed / LLM_QUALITY_CHECK_FAILED.** 본문 없음 | 2회 $0.0202 | `NY1/calls/001.json`·`002.json`(버려진 첫 섹션 원응답) |
| R1~R5 | 연이·네오·인연의 서 개인/궁합·초융합 | 2026-10-10 01:36 결과 그대로 | 표 아래 참고 | `R1..R5/result.md` |

하네스: `harness/lovesecret.mjs`(`worker/routes/love-secret-ai.js` handleStart·runGeneration L1440-1681, generateFirstConsultation L829-983 을 운영 순서대로: 요청당 그룹 1개, 그룹당 최대 2회, 클라이언트 반복 최대 17회), `harness/newyear.mjs`(`new-year-ai.js` handleStart L2439-2543, generateNewYearWave L2343: 요청당 섹션 1개, onReserve·onCheckpoint 는 메모리 기록, 최대 18웨이브·12회에서 멈춤). 실행: 루트에서 `node build-cache/llm-sample-review-20261009/harness/newyear.mjs NY1`.

### 신년운세 운영 결함 (미수정, 별도 요청 필요)

- **증상:** 첫 섹션(질문과 타고난 성향)을 두 번 생성했다. 모델 응답은 둘 다 정상 종료(STOP)였다(4,367자·3,776자). 그런데 둘 다 채택되지 않았고, 섹션 시도 한도 2회에 걸려 상담 전체가 실패했다.
- **원인:** `generateNewYearWave` 의 채택 조건 `noNewIssues` 는 생성 후 품질 이슈가 생성 전 목록에 모두 있어야 통과한다. 그런데 `contentIssues` 가 `MONTHLY_PILLAR_CITATIONS:0/12` 처럼 **숫자가 붙은 이슈 문자열**을 그대로 비교한다. 첫 섹션이 월주를 3개 인용하면 `3/12` 가 되고, 이것이 "새 이슈"로 잡혀 정상 응답이 버려진다.
- **영향:** 첫 섹션에서 월주를 인용하는 유료 신년운세는 같은 이유로 실패할 가능성이 높다. 도입 커밋은 788b83603(2026-09-27), 24285603d(2026-09-14).
- **재현:** 네트워크 없이 NY1 원응답 두 개로 `contentIssues` 전후를 비교하면 재현된다(`build-cache/llm-sample-review-20261009/harness/ny_repro.mjs`. `__newYearAiTestUtils.validateConsultationQuality` 사용).
- **고칠 방향(제안):** 숫자 붙은 이슈는 이름으로 묶어 비교하고, 수치가 나아졌으면 새 이슈로 보지 않는다. 원칙 17에 따라 거절보다 결정적 보정을 우선한다.
- **하위 에이전트가 함께 본 후속 후보(미확인):**
  - 첫 시도에도 빈 "[직전에 쓴 이 부분]" 블록이 붙는다.
  - 대상 섹션 하나가 2회 한도에 걸리면 웨이브 전체가 실패한다.
  - 연애 비책 repair 가 원 프롬프트를 그대로 다시 보낸다.
  - 연애 비책 retryable 이 길이 이슈를 세어, 재개해도 할 일이 없을 수 있다.

## 지켜야 할 규칙

- **실호출은 정확한 1회 승인.** 호출 전에 호출 수·제공자(Gemini)·모델(gemini-2.5-flash)·예상 비용·결과 전달 방식을 먼저 보고한다(`docs/context/ai-and-db.md:117`). 승인 범위는 "서비스 1건 1회"다. 다음 서비스는 다시 승인받는다.
- **원문 전달 의무.** 승인된 실호출의 최종 생성 결과는 생략 없이 전달한다. 채팅에 다 못 담으면 로컬 파일 절대 경로로 전달한다(CLAUDE.md:15).
- **운영 경로 금지.** 실결제, 운영 DB 쓰기, 환불, 배포를 하지 않는다(CLAUDE.md:16). 그래서 아래 "쓰지 말 경로"를 쓰지 않는다.
- **비밀값.** 키를 출력·저장·커밋하지 않는다. 하네스는 `.env.local` 에서 키 이름 `GEMINIF_API_KEY` 를 읽기만 한다.
- **생년월일 원값.** 새 fixture·로그·문서에 원값을 넣지 않는다. 하네스의 고정 프로필 `P1`(남)·`P2`(여, 궁합 상대)만 쓴다(`harness/common.mjs` 상단).
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, migrations, `worker/wrangler.toml` 구조를 건드리지 않는다.

## 쓸 경로: 로컬 하네스

이미 영냥이·네오·마스터 인연의 서·초융합 등을 이 방식으로 실호출 검수했다(`docs/handoff/2026-10-09-llm-consultation-sample-results.md`, `findings.md`).

- **위치:** `D:/Development/code-destiny/build-cache/llm-sample-review-20261009/` (gitignore 대상). 2026-10-10 세션이 워크트리에서 이곳으로 옮겼다. `harness/common.mjs` 의 `ROOT` 가 작업하는 체크아웃을 가리키는지 먼저 확인한다.
- **반드시 저장소 루트에서 실행한다.** 예: `node build-cache/llm-sample-review-20261009/harness/yeong.mjs Y1`. 하위 폴더에서 실행하면 swisseph wasm 을 `process.cwd()/public/...` 에서 못 읽어 `Cannot read properties of undefined (reading 'n')` 로 죽는다(베다·점성 계산이 들어가는 번들).
- **구조:** `common.mjs` 의 `loadBundle()` 이 esbuild 로 실제 worker 코드를 묶는다. 이때 `models.js`·`db.js`·`llm-cache-store.js` 를 stub 으로 바꿔 DB·캐시에 닿지 않는다. `installFetchGuard()` 는 `generativelanguage.googleapis.com` 의 `generateContent`/`countTokens` 만 통과시키고, `--plan` 이면 네트워크를 전부 막는다.
- **예산 장부:** `ledger.json` (200회 / $5 상한). 항목별 호출 수·토큰·비용이 쌓인다. 이전 장부는 `ledger-20261009.json`, `ledger-20261010-d1d8.json`(NY1·LS1 포함).
- **산출물(항목 폴더마다):** `input.json`, `snapshot.json`(계산값), `prompts.json`, `raw.json`, `presented.json`, `calls/NNN.json`, 그리고 사용자에게 줄 `result.md`(`render.mjs`).
- **실행 전 백업:** `--plan` 도 `input.json`·`snapshot.json` 을 덮어쓴다. 기존 항목 폴더를 다시 돌릴 때는 `<ID>-before-YYYYMMDD/` 로 먼저 복사한다.

### 신년운세 스크립트(newyear.mjs) 만드는 법

- **생성기:** `worker/routes/new-year-ai.js`.
  - `__newYearAiTestUtils`(L2659) 가 `normalizeConsultationInput`, `calculateNewYearFortuneData`, `buildSystemPrompt`, `buildFirstPrompt`, `validateConsultationQuality`, `generateConsultationText` 를 내보낸다.
- **운영과 같은 경로로 부른다.** 운영 `/api/new-year-ai/start` 는 `generateConsultationText(env, input, fortuneData, {onCheckpoint, onReserve, savedSections, attempts, deadlineAt, hasCustomQuestion})` 로 호출한다(L2508-2520).
  - `onCheckpoint` 가 있으면 `generateNewYearWave`(L2343, 웨이브 생성)로 간다. 없으면 L1932 의 다른 경로를 탄다.
  - 하네스에서는 `onCheckpoint`·`onReserve` 를 메모리에만 기록하는 함수로 넘겨 운영과 같은 웨이브 경로를 탄다.
- **입력:** P1 프로필 + 주제·질문 1개.
  - 운영 요청 본문 모양은 `normalizeConsultationInput`(L878)을 따른다.
  - `hasCustomQuestion` 은 질문이 2자 이상일 때 true 다.
- **번들 stub:** BASE_STUBS(models/db/llm-cache-store)로 충분한지 확인한다. 라우트가 import 하는 결제·세션 모듈이 로드 시점에 DB 를 건드리면 그 모듈만 추가로 stub 한다. 생성 함수만 쓰므로 결제 코드는 실행되지 않는다.
- **결과 저장:**
  - `generated.text`(최종 본문), `generated.sections`, `generated.quality`, `fortuneData` 를 저장한다.
  - `result.md` 에는 계산값 요약, 6섹션 본문 전체, 품질 이슈, 호출 수와 비용을 담는다.
- **사양:**
  - 6섹션: `NEW_YEAR_AI_SECTIONS` L74-143.
  - 총 20,000~33,000자: L58-59.
  - 섹션당 최대 출력 12k 토큰, 52초 타임아웃.
  - 길이 수리·압축 패스: L1764-1800, L2007.
  - 실호출은 섹션 수 + 수리 횟수만큼 나간다. 대략 6~10회다.
- **비용 견적:** `--plan` 에서 `countTokens` 를 쓸 수 없으므로(네트워크 차단) 프롬프트 길이로 입력 토큰을 어림한다. 출력은 섹션별 상한으로 잡는다. 참고로 영냥이 연어 7장은 7회에 약 $0.09 였다.

## 서비스 목록 (우선순위 순)

가격·feature key 는 `worker/lib/paid-feature-registry.js`, 결과 재열람 URL 은 `lib/records/service-registry.js:7-30`. 모든 서비스가 `worker/lib/gemini.js` 의 `gemini-2.5-flash` 를 쓴다(Workers AI 폴백).

| 순서 | 서비스 | 생성기 | 기존 하네스 |
|---|---|---|---|
| 1 | **신년운세** `/new-year-ai-consultation/` | `worker/routes/new-year-ai.js` | `newyear.mjs` (NY1 실패 — 위 결함) |
| 2 | 사주 AI 상담 | `worker/routes/fortune.js` `/saju-ai-consultation/*`(L6940-6965), `worker/lib/saju-ai-prompt.js` | 없음. `scripts/benchmark-saju-consultation.mjs` 참고 |
| 3 | 인생의 책 | `worker/routes/life-book-ai.js` | `r9.mjs` (프롬프트·snapshot 만, 실호출 안 함) |
| 4 | 운명의 업 | `worker/routes/karma-destiny-ai.js` | 없음 |
| 5 | 연애 비책 | `worker/routes/love-secret-ai.js` + `worker/lib/love-secret-ai-prompt.js` | `lovesecret.mjs` (LS1 완료) |
| 6 | 마스터 인연의 서(사주×자미) | `worker/routes/master-love-codex.js` | `r3.mjs` (솔로·궁합) |
| 7 | 네오 팩폭 전략실 | `worker/routes/neo-operation-room.js` | `r2.mjs` |
| 8 | 운명 찻집 사주·사주궁합 | `worker/routes/fortune-tea-house.js` | 없음 |
| 9 | 사주 궁합 basic | `/api/saju-compat-basic/generate`, `worker/lib/saju-compat-prompts.js` | 없음 |
| 10 | 연이 운명 상담(guardian) | `worker/lib/guardian-fortune-generate.js` | `r1.mjs` |
| 11 | 반려동물 사주 | `worker/routes/pet-saju-ai.js` | 없음 |
| 12 | 초융합(사주 포함) | `worker/routes/fusion-fortune.js` | `r5.mjs` |
| — | 영냥이 사주 생선 | `worker/yeongnyangi/*` | `yeong.mjs` (Y1 등, 2026-10-10 재실행 완료) |

토정비결·오늘의 운세는 LLM 생성기가 없다(조사 시점 2026-10-10).

이미 하네스가 있는 항목(r1·r2·r3·r5)의 이전 결과는 `build-cache/llm-sample-review-20261009/R1..R5/result.md` 에 있다. 사용자가 "이전 결과로 충분"하다고 하면 실호출 없이 그 경로를 전달한다.

## 쓰지 말 경로

- **운영 관리자 우회:** 관리자 역할은 결제를 건너뛴다(`new-year-ai.js:1265`, `2261`). 그래도 운영 Gemini 를 호출하고 운영 DB 에 쓴다. 금지.
- **스테이징:** `worker/wrangler.staging.toml` 이 `STAGING_LLM_MOCK_ENABLED=true` 라서 mock 만 나온다. 실결과를 보려면 키를 넣고 재배포해야 하므로 금지.
- **`scripts/seed-preview-test-account.mjs`:** 운영 MongoDB 에 쓴다. 금지.
- **관리자 프롬프트 랩** (`/api/admin/prompt-lab/generate`, `app/admin/prompts`): 운영 프롬프트를 만들기만 하고 LLM 은 부르지 않는다. 프롬프트 확인용으로만 쓸 수 있다.

## 사용자에게 보여 주는 방식

- 서비스마다 `result.md` 한 개를 전달한다.
  - 맨 위에 서비스명, 상품, 입력 요약(P1, 주제·질문), 호출 수, 비용을 둔다.
  - 그 아래에 최종 본문 전체를 둔다.
- 여러 건을 돌렸다면 `build-cache/llm-sample-review-20261009/INDEX.md` 에 서비스별 `result.md` 절대 경로 목록을 만든다.
- 채팅에는 절대 경로와 짧은 확인 사항만 쓴다. 계산값과 맞지 않는 문장은 "확인 사항"으로 따로 적는다.

## 첫 행동

(신년운세 스크립트는 이미 있다. 아래 2~4는 다른 서비스 스크립트를 새로 쓸 때의 본보기로 읽는다.)

1. `git status`, `git fetch origin` 을 실행한다. 루트에 다른 세션의 미커밋 변경이 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리를 만든다.
   - 하네스는 gitignore 대상이다. 워크트리에서 돌리려면 루트의 `build-cache/llm-sample-review-20261009/` 를 복사하고 `ROOT` 를 그 워크트리로 바꾼다.
2. `worker/routes/new-year-ai.js` L58-143, L1932-2010, L2343-2420, L2495-2530 을 읽는다.
3. `harness/yeong.mjs` 와 `harness/r9.mjs` 를 본보기로 `newyear.mjs` 를 쓴다. `node build-cache/llm-sample-review-20261009/harness/newyear.mjs NY1 --plan` 을 루트에서 실행한다.
4. 견적을 보고하고, 승인을 받으면 `--plan` 없이 1회 실행한다. `NY1/result.md` 의 절대 경로를 전달한다.
