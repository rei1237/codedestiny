---
status: done
updated: 2026-10-11
next: "4번 수정과 타로 분량 조절은 2026-10-11-paid-llm-length-and-delivery.md 로 넘겼다."
---

# 유료 상담 품질 후속: 엔진 공통 작업에 들어가지 않은 항목

## 왜

"그 작업에 포함되지 않은 항목을 진행할 문서 만들어서 진행할 명령어도 정해줘" (2026-10-11)

[기본 운세 LLM 결과 문서](2026-10-10-basic-fortune-llm-samples.md)의 실호출 채점(B1~B7)에서 유료 상담 결함이 나왔다. 그중 엔진 공통 결함은 다른 세션이 고치고 있다. 이 문서는 그 작업에 **들어가지 않은** 항목만 다룬다.

등급은 **RED** 다. 유료 전달·자동 환불·개인정보 전송에 닿는다. 시작할 때 위험·검증·롤백을 한 번 보고하고 진행한다. 롤백은 커밋 revert 다.

## 결과 (2026-10-11)

- 사용자 결정: 1=A(출생 원값 제거), 2=A(마인드스캔 5위치).
- 1·2번은 이미 통합 브랜치 `wt/llm-quality-integration-20261011` 에 있었다. 사용자 승인("내가 머지 대행")을 받아 main 에 머지했다(`e0f430c1f`). 중복 구현은 하지 않았다.
  - 1번 B4: `c59d97018`(재시도 거부 사유·번호 소제목), `03dd7d167`(life_domains 가이드), `dcd7a483b`(인과 패턴 적용 범위). B4 재호출 합격은 그 세션 기록에 있다.
  - 2번 출생 원값 제거: `ad835d9ce`(사주 AI), `2402ad6d8`(베다·자미·숙요).
  - c5d5ee328·33e72b685 도 같은 머지로 들어갔다.
  - 그사이 main 에 영냥이 단계 A 의 다른 구현(556d2af0e)이 들어와 10개 파일이 충돌했다. 사용자 결정("어떻게 다르게 구현했는지 보고 더 나은 쪽 채택")에 따라 단계 C 가 딛고 있는 통합 구현을 채택했다. main 에만 있던 다섯 가지는 테스트로 먼저 실패시킨 뒤 옮겼고, `55c458344` 로 origin/main 을 머지했다. 내용은 [2026-10-10-yeongnyangi-fusion-quality-defects.md](2026-10-10-yeongnyangi-fusion-quality-defects.md) '단계 A 결과'에 있다.
- 3번 마인드스캔 5위치: `f6a24b4d5`.
  - 위치를 화면 순서로 맞췄다: 위 겉으로 보이는 태도, 왼쪽 상대의 현재 마음, 가운데 망설이는 이유, 오른쪽 드러나지 않은 마음, 아래 관계가 향하는 흐름.
  - 쌍마다 위치 하나를 읽는다. 부분 수는 25 → 19 다.
  - 테스트 "each dealt card is read in exactly one position, in screen order" 를 먼저 실패시킨 뒤 고쳤다.
  - B1b 실호출 재검은 하지 않았다. 별도 승인이 필요하다.
- 4번: 아래 '실호출 결과' 와 '수정안' 을 본다. 수정은 별도 승인을 받는다.

## 지금 상태

다른 세션의 엔진 공통 작업은 아직 main 에 없다(2026-10-11 09:38 확인). → 위 '결과' 대로 `e0f430c1f` 에서 반영됐다.

- 워크트리: `D:\Development\codedestiny-worktrees\paid-narrative-engine-20261011-020659`
- 브랜치: `wt/paid-narrative-engine-20261011-020659`
- 미푸시 커밋:
  - `c5d5ee328` fix(paid-narrative): server-bound evidence hash, sentence dedupe, scoped question parts
  - `33e72b685` fix(tarot): love reading in 9 parts; server-bound hash and sentence dedupe for love, oracle, mindscan
- 그 작업이 이미 다루는 것(여기서 다시 하지 않는다):
  - evidenceHash 를 서버가 붙인다.
  - 문장 단위 반복을 제거한다(`dropRepeatedReportSentences`).
  - `<p>`·`<br>`·`<div>` 를 문단 구분으로 바꾼다.
  - 점성술·자미두수·숙요·베다 질문 상담의 부분마다 범위·한 줄 답·앞 부분 요약(`narrativePriorDigest`)·KST 기준일을 붙인다.
  - feature-question facts 에서 `birth*` 키를 뺀다.
  - 분량 보강(`repairShortParts`)을 선택 사항으로 바꾼다.
  - 연애 타로를 9부분으로 묶는다.
- 시작 전에 `git merge-base --is-ancestor c5d5ee328 origin/main` 과 `33e72b685` 를 확인한다. main 에 없으면 2·3번의 코드 변경은 미룬다. 1번(B4)과 4번 조사는 겹치는 파일이 없어 바로 할 수 있다.

## 사용자 결정 (시작할 때 한 번에 묻는다)

1. **출생 원값을 LLM 에 보내는가?** 지금은 사주 AI·베다·숙요 상담이 생년월일시를 보낸다. 처리방침 문서에서 LLM 전송 근거를 찾지 못했다.
   - (A, 권장) 원값을 빼고 계산 결과(명식·차트·숙)만 보낸다. 상담 품질 영향은 작다. 계산은 이미 서버가 끝냈기 때문이다.
   - (B) 현행을 유지하고, 처리방침에 "외부 AI 제공자에게 출생 정보 전송"을 명시한다. 이 경우 법무 문구는 사용자가 정한다.
2. **마인드스캔 7위치를 어떻게 하나?** 5쌍(10장)을 뽑는데 서버가 7위치로 풀면서 6·7번째 위치에 이미 쓴 보조 카드를 다시 쓴다.
   - (A, 권장) 상담 위치를 뽑은 5쌍에 맞춘다. 조각이 25개에서 줄어 비용도 준다. 화면 위치 문구도 함께 바꾼다.
   - (B) 7쌍을 뽑는다. paid-draw·화면·결제 흐름을 함께 바꿔야 해서 범위가 크다.

## 남은 작업

### 1. B4 사주 AI 상담: life_domains 연속 거부 → 자동 환불 (독립, 먼저)

증상: B4 실호출에서 life_domains 그룹이 2회 연속 검증에 실패해 REFUNDED 로 끝났다. 원문과 판정은 `build-cache/llm-sample-review-20261009/B4/result.md` 에 있다.

- [ ] **프롬프트와 검증의 충돌.**
  - 가이드: `worker/lib/saju-ai-prompt.js:78-90` 의 life_domains 가이드가 5장 "현재 고민과 명식의 연결"과 6장 "일/돈/관계/연애/건강 리듬"을 요구한다. minChars 는 4000 이고, 재물·직업·건강 리듬을 쓰게 한다.
  - 검증: `worker/routes/fortune.js:222-256` 의 `SAJU_AI_RESULT_UNSUPPORTED_PATTERNS` 는 바로 그 연결을 금지한다. element-causality, element-health-causality, ten-god-income-causality, specific-financial-product 등이다.
  - 할 일: 가이드에 "오행·십성을 돈·건강의 원인으로 쓰지 말고 성향·리듬 관찰로 쓴다"를 명시한다. 금지 패턴을 피하는 문장 예시도 1개 넣는다.
  - 테스트: 가이드 문구가 금지 패턴을 스스로 만족시키지 않는지 검사한다.
- [ ] **재시도에 실패 사유가 없다.** `fortune.js:4931-4940` 호출부가 `allowRepair: false, lengthRepair: true` 다. 그래서 두 번째 시도가 거부 사유 없이 같은 프롬프트로 다시 생성한다. `runSajuAISectionWaves` 는 L614 에 있다.
  - 할 일: 거부된 패턴 id 와 해당 문장을 두 번째 시도 프롬프트에 넣는다. 호출 수는 늘리지 않는다(시도 ≤2 유지).
- [ ] **번호 소제목이 장 정규식을 깨뜨린다.** 모델이 "1. …" 형식 소제목을 쓰면 장 분리가 어긋난다. 출력 규칙에 소제목 형식을 고정하거나, 파서에서 정규화한다. 둘 중 하나만 한다.
- [ ] **수락된 장에도 오행→연봉 인과가 남는다.** 검증이 어느 그룹·어느 필드에 적용되는지 확인한다. 적용 범위가 빠졌으면 넓힌다.
  - L5007: cross-chapter 실패 시 life_domains 에 qualityRepair 를 표시한다. 이 경로도 함께 본다.
- [ ] 검증 단계:
  1. 단위 테스트를 돌린다. 관련 파일: `__tests__/worker/saju-paid-delivery-recovery.test.js`, `saju-ai-prompt-domain-templates.test.js`.
  2. `npm run check:fast` 를 돌린다.
  3. B4 실호출을 1회 승인받고 돌린다. 하네스는 `harness/b4.mjs` 이고, 예상 4~8회, 약 $0.06~0.12 다. 합격 기준은 COMPLETED 이고 금지 패턴 0건이다.

### 2. 출생 원값 LLM 전송 (결정 1 이후)

- 사주 AI:
  - `worker/lib/saju-ai-prompt.js:2246` 의 `canonicalSajuResult = {...promptSource, factSnapshot, advancedFactors, engineContext}` 가 원 결과를 통째로 펼친다. 그래서 `calculationMeta`·`daewunBridge` 의 출생 원값이 들어간다.
  - L2312 의 `analysisResult` 가 `worker/lib/fortune-question-prompt.js:371,417` 의 payload 로 간다. L415 는 profile 도 넣는다.
- 베다: `worker/lib/vedic-ai-prompt.js`
  - L138-163: profile 에 birthDate·birthTime·timezone·lat·lon 이 있다.
  - L509: 프롬프트 문장 `출생 정보: ${profile.birthDate} ${profile.birthTime} ${profile.timezone}`.
  - L528·L720: `analysisResult: vedicResult` 원본을 보낸다.
  - L347: partnerBirth.
- 숙요: `worker/lib/sukuyo-ai-prompt.js:639-643` 도 analysisResult 와 profile 을 보낸다.
- [ ] 결정이 A 이면 각 경로에 "LLM payload 에 출생 원값 문자열이 없다"는 실패 테스트를 먼저 쓴다. 테스트 픽스처는 P1·P2 만 쓴다. 그다음 allowlist 로 줄인다.
- [ ] 베다·숙요는 c5d5ee328 이 main 에 들어온 뒤에 한다. feature-question-delivery.js 가 이 프롬프트를 소비하고, 그 커밋이 같은 파일의 facts 를 바꾼다.
- [ ] 결정이 B 이면 코드를 바꾸지 않는다. 처리방침 문구 초안만 만들어 사용자 확인을 받는다.

### 3. 마인드스캔 5쌍→7위치 카드 재사용 (결정 2 이후, 33e72b685 가 main 에 들어온 뒤)

- `lib/tarot/mindscan-reading.mjs`:
  - L31: `INNER_HEART_TAROT_SPREAD` 가 7위치다.
  - L703-717: `buildSectionInputs` 가 6위치를 `main[2].subCard / main[1].subCard` 로, 7위치를 `main[4].subCard / main[3].subCard` 로 만든다. 이미 해석한 카드를 다시 쓴다.
  - L944: `buildMindscanDeliveryFacts` 는 5쌍을 요구한다.
- `worker/lib/mindscan-delivery.js`: 7위치×3필드(meaning·emotion·action)에 intro·summary·masterAdvice·closing 을 더해 25조각이다. 이 파일은 33e72b685 가 고친다.
- [ ] 결정이 A 이면 "섹션 입력의 카드가 위치끼리 중복되지 않는다"는 실패 테스트를 먼저 쓴다. 그다음 위치 수를 맞춘다. 화면 고정 테스트(`__tests__/ui/mindscan-immersive.static.test.js`)도 함께 확인한다.
- [ ] 실호출 재검은 B1b 하네스(`harness/b1b.mjs`, 부분당 1회)로 1회 승인받는다.

### 4. 나머지 유료 상품 부분 범위 조사 (조사만, 고치지 않음)

엔진 공통 작업은 feature-question·연애·오라클 타로·마인드스캔의 부분 범위만 고친다. 나머지 서버 재개 상품의 상태는 아래와 같다(2026-10-11 origin/main 기준 1차 확인).

| 상품 | 위치 | 부분 구성 | 1차 판단 |
|---|---|---|---|
| geomancyOracle | `worker/routes/oracle.js:190` (섹션 L122) | 섹션마다 `prompt: title`, minChars 3000 | **위험 높음.** B6·B1a 와 같은 모양이다. 제목만 주므로 부분마다 전체를 다시 해석할 가능성이 크다. |
| dreamPsychoAnalysis | `worker/routes/dream.js:1218` | 장마다 a/b 로 나누고 범위 문장이 있다 | 양호. 장끼리 반복되는지만 본다. |
| petSajuReport·petCompatReport | `worker/lib/pet-report-delivery.js:1` | "그 부분만, 반복 금지" 지시가 있다. 앞 부분 요약은 없다 | 중간. |
| sajuCompatBasic | `worker/lib/saju-compat-schema.js:332` | 그룹별 필드 스키마 | 양호(B2 조건부 합격). |
| animal-totem·yogaGuruCourse·guardianPaidTurn·expertFollowUp | 단일 task | 1조각 | 해당 없음. |

- [x] 위험 높음·중간 상품은 저장된 실제 결과가 있으면 그것으로 반복률을 잰다. 없으면 실호출 견적만 내고 승인을 받는다. 결과는 이 표에 적는다.
- [x] 고칠 대상이 나오면 c5d5ee328 의 feature-question 패턴(부분 범위 + `narrativePriorDigest`)을 재사용하는 안을 적는다. 수정은 별도 승인을 받는다.

#### 실호출 결과 (2026-10-11)

- 조건: Gemini gemini-2.5-flash, 부분당 1회, 재시도 없음.
- 하네스: `harness/fu.mjs G4|D4|P4`. 운영 엔진(`runPaidNarrativeDelivery`)을 인증·결제 없이 돌린다.
- 원문은 `build-cache/llm-sample-review-20261009/{G4,D4,P4}/` 에 있다. 파일은 `result.md`·`raw.json`·`calls/` 이다.
- 반복률 두 가지를 쟀다.
  - 같은 문장: 앞 부분에 이미 나온 문장과 정규화 후 같은 문장 수.
  - 12자 조각 중복: 공백을 뺀 본문의 12자 조각 중 앞 부분에도 있는 비율.

| 상품 | 호출·비용 | 결과 | 분량 | 같은 문장 / 조각 중복 | 판정 |
|---|---|---|---|---|---|
| 지오맨시 (G4) | 7회 $0.019 | COMPLETED 7/7 | 합 8,496자. 7부분 모두 3,000자 미달, 목표 20,000자의 42% | 0 / 0~8.7% | **위험 높음 확정.** 문장은 바꿔 쓰지만, 7부분 모두 "원인=불의 충동" 재해석으로 시작하고 세 형상을 모두 다시 푼다. timing 부분은 7필드 전체(종합·판단·흐름·위험·시점·행동·경구)를 다시 썼다. 6부분이 한 문단이다. |
| 정신분석 해몽 (D4) | 10회 $0.032 | COMPLETED 10/10 | 합 16,835자. 8/10 부분이 2,000자 미달 | 1 / 0~10.2% | **중간.** 장마다 관점(프로이트·융·영적)은 갈린다. 다만 6/10 부분이 "복도·이직 지연" 요약으로 시작한다. chapter-3-b 에 `### 3.` 소제목이 샜다. |
| 반려동물 사주 리포트 (P4) | 1회 $0.0025 (승인 11회 중) | **DELIVERY_REVIEW_REQUIRED, 0/13** | — | — | **위험 높음 확정.** personality:0 의 응답이 `{"body":"{\"personality\":[...],\"habitats\":[...],...}"}` 였다. 기본 프롬프트의 전체 리포트 JSON 스키마를 body 안에 문자열로 넣었다. 엔진이 거부했고, 2회차는 하네스 가드가 막았다. 운영에서도 같은 프롬프트로 2회차를 보내므로 실패가 반복될 가능성이 높다. 나머지 12부분은 측정하지 못했다. |

- 시험 입력:
  - 지오맨시: 질문 "회사를 그만두고 온라인 가게", 연금술 테마. 원인 Puer, 흐름 Amissio, 신탁 Albus.
  - 해몽: 복도·열쇠·엘리베이터 꿈.
  - 반려동물: 강아지, 생일은 임의 값(사람 출생 정보 아님), 시각 모름. P1·P2 는 쓰지 않았다(사람 출생 정보가 필요 없는 상품).

#### 수정안 (별도 승인 필요)

공통 원인은 기본 프롬프트가 "전체 JSON 하나"를 지시하는데 부분 지시가 그 뒤에 붙는 구조다. 정본은 c5d5ee328 의 `feature-question-delivery.js` 와 33e72b685 의 `tarot-oracle-delivery.js` 다.

1. **반려동물 (`worker/routes/pet-saju-ai.js` · `worker/lib/pet-report-delivery.js`)**
   - 문제: seed 의 `prompt` 가 `buildReportPrompt` 전체다(`pet-saju-ai.js:129`). 이 함수는 사실 블록 뒤에 "아래 JSON 스키마를 채우세요"와 전체 스키마를 붙인다.
   - 수정: seed 에는 사실 블록(`buildReportFacts`)과 공통 규칙만 넣는다. 해몽은 이미 `dream.js:1217` 에서 `[출력 규칙]` 앞까지만 잘라 넣는다.
   - 다음 테스트를 먼저 쓴다.
     - "부분 프롬프트에 전체 스키마 키(personality·habitats)가 없다."
     - "body 가 `{` 로 시작하면 거부된다." (정정: 이 거부는 없다. 분량이 짧을 때만 우연히 거부된다.)
   - compat 도 같은 구조라 함께 본다.
2. **지오맨시 (`worker/routes/oracle.js`)**
   - 기본 프롬프트에서 JSON 스키마와 필드별 분량 규칙을 빼고 seed 에 넣는다. 지금 남은 규칙은 "answer 5~7문장, advice 한 줄 경구" 다. 이 규칙이 3,000자 지시와 충돌해 분량이 짧다.
   - 섹션마다 범위 문장을 둔다. 예: "이번 부분은 risk 만. 세 형상의 기본 상징 설명은 answer 에서 끝났다."
   - produce 에 `narrativePriorDigest` 를 붙인다.
   - `parseNarrativeResponse` 로 서버 해시를 붙이고, `dropRepeatedReportSentences` 를 적용한다.
   - 다음 테스트를 먼저 쓴다: "answer 이외 부분 프롬프트에 앞 부분 요지가 있고 스키마 지시가 없다."
3. **해몽 (`worker/routes/dream.js`)**
   - produce 에 `narrativePriorDigest` 와 "꿈 장면 요약은 1장에서만" 범위 문장을 더한다.
   - 소제목 누출(`###`)은 별도 도우미로 정리한다. (정정: `normalizeNarrativeBody` 는 본문 중간 소제목을 남긴다.)
   - 우선순위는 1·2 다음이다.
4. 재검은 각 하네스로 부분당 1회 다시 승인받는다. 예상 호출은 7·10·13회다.

## 정본 예시

- 부분 범위 패턴: c5d5ee328 의 `worker/lib/feature-question-delivery.js`. main 에 들어온 뒤 거기서 읽는다.
- 최소 호출 래퍼: `build-cache/llm-sample-review-20261009/harness/b1b.mjs` 의 `HARNESS_ONE_CALL` 과 CAP 부분.

## 지켜야 할 규칙

- 실호출은 서비스마다 **정확히 1회 승인**받는다. 승인 전에 호출 수·제공자(Gemini)·모델(gemini-2.5-flash)·예상 비용·전달 방법을 보고한다.
- **최소 호출**: "최소한의 호출로 진행하도록해 너무 비용이 크다." 재검은 부분당 1회로 한다.
- 원문 전달 의무: 결과는 원문 전체나 절대 경로로 전달한다.
- 생년월일 원값은 픽스처·로그·문서·결과 페이지·PDF 어디에도 쓰지 않는다. P1·P2 만 쓴다.
- 실결제·운영 DB 쓰기·환불·배포를 하지 않는다. admin 우회·staging·seed-preview-test-account.mjs 도 쓰지 않는다.
- `.env.local` 의 `GEMINIF_API_KEY` 는 읽기만 한다. 출력·저장·커밋하지 않는다.
- 기대값만 바꿔서 검사를 통과시키지 않는다. TDD 로 실패 테스트를 먼저 쓴다.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, migrations, `worker/wrangler.toml` 구조를 건드리지 않는다.
- git:
  - 루트에 다른 세션의 미커밋이 있으면 `scripts/create-safe-worktree.ps1 -Slug <slug>` 로 워크트리를 만든다. PowerShell 에서 이 스크립트에 `2>&1` 를 붙이지 않는다(중간에 멈춘다).
  - 검증 순서: check:fast → 커밋 → `git push origin HEAD:main` → CI 1회 확인. 브랜치 push 와 PR 은 만들지 않는다.
  - 워크트리를 지울 때는 node_modules 링크를 먼저 끊는다: `(Get-Item -LiteralPath "$w\node_modules" -Force).Delete()`.
- 다른 세션의 미푸시 커밋이 건드린 파일은 그 커밋이 main 에 들어오기 전에 고치지 않는다. 대상 파일:
  - feature-question-delivery.js
  - narrative-format.js
  - paid-narrative-candidate.js
  - paid-narrative-delivery.js
  - paid-report-quality.js
  - love-tarot-delivery.js
  - mindscan-delivery.js
  - tarot-oracle-delivery.js

## 함정

- 엔진은 분량을 의도적으로 참고값으로만 쓴다(`paid-narrative-delivery.js:175`, 테스트 "length is advisory..."). 분량 미달을 거부로 바꾸지 않는다.
- B4 는 feature-question 엔진이 아니라 `fortune.js` 의 자체 파도(`runSajuAISectionWaves`)를 쓴다. 엔진 공통 수정이 B4 에는 닿지 않는다.
- CI 실패 일부는 이 작업 전부터 있었다. public 미러가 오래돼 `scripts/sync-legacy-static-to-public.mjs` 가 필요하다. 새 실패와 구분한다.

## 모르는 것

- 처리방침에 LLM 제공자 전송 조항이 따로 있는지. grep 으로는 찾지 못했다.
- 숙요 숙 배정 OFFSET 이 맞는지. B5 판정에서 확인 필요로 남겼고, 이 문서 범위 밖이다.
