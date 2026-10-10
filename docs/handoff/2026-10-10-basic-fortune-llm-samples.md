---
status: active
updated: 2026-10-10
next: "사용자에게 하네스 ledger 상한 상향(현재 누계 165회/$2.14, 상한 200회/$5)과 B3 애니멀 토템 1회 실호출을 함께 승인받는다."
---

# 기본 운세 LLM 결과(B1~B7) 실호출 → 결과 페이지·PDF 추가

## 왜

"꿀꿀 운세 타로라든지 사주 화면에서 궁합이라든지 애니멀 토템이라든지 사주, 숙요, 자미두수, 베다점에도 각 기본 운세의 상담에 대한 llm 결과가 없는데 이 부분들도 이후에 지금 llm 결과에서 볼 수 있도록 조치해" (2026-10-10)

타로에 대한 사용자 결정: "모든 타로 llm를 호출해서 결과를 넣어주길 바라며, love-reading은 … 원인 파악후 llm 비용 최적화를 먼저 한 이후에 진행"

## 지금 상태

- 아직 하나도 돌리지 않았다.
- 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다. 서비스마다 1회씩 승인받고, 원문을 전달하고, P1·P2 만 쓴다.
- 결과 페이지: https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV (v5)

## 남은 작업

모두 Gemini gemini-2.5-flash 이고 `runPaidNarrativeDelivery` 를 탄다.

**공통 하네스(새로 만든다).**
- 핸들러(코인·결제·DB)는 거치지 않는다. 다음 순서로 어댑터를 직접 돌린다:
  1. seed 로 시작한다.
  2. 상태는 `paidNarrativeInsert`(worker/lib/paid-narrative-delivery.js:31)로 만든다.
  3. 조각마다 `adapter.produce(task, state)` 를 부른다.
  4. 끝나면 `render` 를 부른다.
- 서버 재개용 등록부는 `worker/lib/paid-narrative-adapters.js:51-61` 이다.

| 순서 | ID | 서비스 | 진입 | 예상 호출 |
|---|---|---|---|---|
| 1 | B3 | 애니멀 토템 | routes/animal-totem.js:600-632 | 1~2 |
| 2 | B2 | 사주 궁합 basic | routes/saju-compat-basic.js:52-102 (P1+P2) | 4~8 |
| 3 | B6 | 자미 기본 상담 | lib/feature-question-delivery.js + ziwei-ai-prompt.js | 10~20 |
| 4 | B7 | 베다 기본 상담 | 같은 엔진 + vedic-ai-prompt.js | 10~20 |
| 5 | B5 | 숙요 기본 상담 | 같은 엔진 + sukuyo-ai-prompt.js | 10~20 |
| 6 | B4 | 사주 AI 상담 | fortune.js:614 runSajuAISectionWaves, saju-ai-prompt.js:52-120 | 5~10 |
| 7 | B1a | 오라클 타로 | tarotOracleNarrativeAdapter + seedTarotOracleNarrative (3장) | 17~34 |
| 8 | B1b | 마인드스캔 | mindscanNarrativeAdapter + seedMindscanNarrative | 25~50 |
| 9 | B1c | 속마음 타로 | loveTarotNarrativeAdapter + seedLoveTarot | 🔴 [최적화 문서](2026-10-10-love-tarot-call-optimization.md) 완료 후 9~18 |

- [ ] **0. 상한 승인.** 전체 약 90~220회, 약 $1~3(추정)이다. 상한 200회/$5 를 넘으므로 `harness/common.mjs` LIMITS 상향을 먼저 승인받는다.
- [ ] **1~9.** 항목마다 다음 순서로 진행한다:
  1. `--plan` 으로 0회 견적을 낸다.
  2. 승인을 받는다.
  3. 1회 실행한다.
  4. 채점한다.
  5. `<ID>/result.md` 절대 경로를 전달한다.
- [ ] **결과 반영.**
  - `pdf/make_pdfs.py` 에 제목을 더한다.
  - `harness/kkul_page.py` ITEMS 에 탭을 더한다.
  - 같은 URL 에 다시 게시한다.
  - 꿀꿀 기본 명리 타로 모달은 LLM 이 없다(결정적 템플릿). 탭에는 "LLM 없음"으로만 적는다.

**끝난 판정:** 9개 탭과 PDF 가 결과 페이지에 있고, 항목마다 판정(합격/조건부/불합격)이 적혀 있다.

## 정본 예시

- 어댑터를 구동하는 mock: `__tests__/worker/animal-totem-paid-delivery.test.js`, `__tests__/worker/love-tarot-delivery.route.test.js`

## 함정

- 카드나 패를 뽑는 곳(애니멀 토템, 타로)은 브라우저의 Math.random 대신 고정 배열을 넣는다.
- B4 는 `createGeminiContextCache` 가 하네스 펜스에 막힌다. 그래서 null 을 돌려주는 스텁이 필요하고, runSajuAISectionWaves 를 export 해야 한다.
- B6·B7 차트는 r6·r8 하네스의 P1 차트를 재사용한다.
- Artifact `files` 는 D: 경로를 거부한다. scratchpad 로 복사해 `root` 로 게시하고, 게시가 끝나면 복사본을 지운다.
- 후속(범위 밖): 애니멀 토템 five 모드 가격이 코드는 50, `paid-feature-registry.js:303` 은 30 이다.

## 검증

```
python build-cache/llm-sample-review-20261009/pdf/make_pdfs.py
python build-cache/llm-sample-review-20261009/harness/kkul_page.py
node <scratchpad>/birthcheck.mjs build-cache/llm-sample-review-20261009/pdf/kkul-results.html   # 출생값 0건
```

## 모르는 것

- 숙요 basicResult 와 사주 sajuResult 를 P1 으로 만드는 경로가 확인되지 않았다. 핸들러 입력 형태를 먼저 읽는다.
