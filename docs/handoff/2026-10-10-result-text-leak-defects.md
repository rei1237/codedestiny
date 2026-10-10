---
status: active
updated: 2026-10-10
next: "코드 수정은 끝났다(main 7d6dc7ad7). 남은 것은 R9 재실호출 1회뿐이다. 사용자 승인은 받았지만 Gemini 프로젝트 월 지출 한도(429)에 막혔다. 한도를 푼 뒤 harness/r9.mjs 를 한 번 돌리고 birthcheck.mjs 로 본문 출생값 0건을 확인한다."
---

# 결과 본문 누출 결함 (R9 출생값·R4 증거 ID·LS1 영문 키·R3 정오 문장·R2 네 기둥)

## 왜

"고치지않은 결함에 대해서 각각 수정할 수 있도록 인수 인계 문서를 만들어서 작업할 수 있도록해줘" (2026-10-10). 지금은 결과 페이지와 PDF 에서만 마스킹하고 있다. 생성기는 그대로다.

## 지금 상태

- 2026-10-10 코드 수정 완료. 커밋은 아래 '결과' 절에 있다. 남은 것은 R9 실호출 확인뿐이다. 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다.
- 공통 원인은 두 가지다. 프롬프트에 원값이나 내부 키가 들어가고, 출력에 결정적 필터가 없다.

## 남은 작업

- [x] **R9 인생의 책 (worker/routes/life-book-ai.js).** 출생값이 세 경로로 들어간다.
  - L1199-1200: [사용자 입력] 줄. 15개 섹션 모두에 들어간다.
    - → 성별·달력·"시각 입력됨/모름"으로만 바꾼다.
  - L1135-1145: `calculationMeta` 가 통째로 들어간다.
    - → `{available, timeUnknown, birthTimeUnknown, limitation}` 만 남긴다. life-book-ai-saju.js:163 이 timeUnknown 을 쓴다.
  - L1166-1172: frame 스키마 예시 profileSummary 에 실제 값이 들어간다.
    - → 비운다.
  - L1455 부근에 입력 birth 값으로 결정적 출력 필터를 넣는다. L256 maskBirthDate 는 로그 전용이다.
- [x] **R4 궁합 (master-love-codex).**
  - master-love-codex-evidence.js:62 가 "ID와 값만 인용"이라고 지시한다. compat-prompt.mjs:569 스키마는 evidenceId 를 요구한다.
  - 필터가 없다(routes/master-love-codex.js:586-637 normalizeChapterContent).
  - → 계약 records/crossChecks 의 id 와 일반형 정규식으로 결정적으로 지운다. 지시 문구도 바꾼다.
  - 같은 계열: evidence.js:97 이 path 를 label 로 쓴다.
- [x] **LS1 속궁합 비밀.**
  - love-secret-ai-facts.js:177·187 이 precisionMetrics 영문 키를 그대로 넘긴다(reference.js:181-188).
  - → 키는 한국어 라벨로, 점수는 등급으로 바꾼다. parse L598 부근에 `(?<=[가-힣])\((attraction|…)\)` 정리를 넣는다.
- [x] **R3 (R4 공통).**
  - master-love-codex-quality.js:19 가 "출생시각 미상 명반은 정오 가정 명시"를 조건 없이 넣는다.
  - → timeUnknown 일 때만 넣는다. 조건부 정본은 prompt.mjs:449, compat:530 이다.
  - evidence.js:56 cross.context 의 reason 을 한국어 문장으로 바꾼다.
- [x] **R2 네 기둥.** 사용자가 (a) 일주만 남기기를 골랐다.
- [ ] **재실호출.** 사용자는 R9 1회만 승인했다. R4·LS1·R3 은 오프라인 확인으로 끝낸다.
  - 2026-10-10 R9 실행 결과: 30콜 모두 429(Gemini 월 지출 한도 초과)였다. 비용은 $0이고 본문은 없다.
  - 실패한 실행은 build-cache/…/R9-recall-429-20261010 에 있다. R9 폴더는 이전 결과로 되돌렸다.
  - 한도를 푼 뒤 `node build-cache/llm-sample-review-20261009/harness/r9.mjs` 를 한 번 돌린다.
  - 하네스는 이제 라우트처럼 birthInfo 를 generateSectionOnce 에 넘긴다. 결과는 birthcheck.mjs 로 확인한다.

## 결과 (2026-10-10)

- **7f1232ca1 R9**
  - 수정: [사용자 입력]은 성별·달력·시각 입력 여부만 남겼다. calculationMeta 는 화이트리스트로 줄였다. frame 스키마에서 profileSummary 를 뺐다. 본문에는 입력 출생값 필터(scrubSectionBody)를 걸었다.
  - 테스트: life-book-ai.sections.test.js '출생값 0건' 5개.
  - 실측: P1 프롬프트 출생값이 날짜 1000000·시각 10 에서 모두 0이 됐다. 기존 R9 본문에 필터를 걸면 001010000 에서 0이 된다.
- **9b0d383a4 LS1**
  - 수정: precisionMetrics 를 끌림·안정성·소통·갈등 신호·해석 신뢰도 + 높음/보통/낮음 등급으로 바꿨다(≥70 높음, ≥50 보통). parse 에서 "한국어(영문 키)" 꼬리를 지운다.
  - 실측: 영문 키가 presented 15→0, raw 5→0.
- **15aed828f R4·R3**
  - R4 수정: stripCodexEvidenceIds 가 계약 id 와 일반형 ID 를 지운다. evidenceId 와 crossChecks.id 필드는 보존한다. 지시 문구를 바꾸고 label 폴백을 한국어로 했다.
  - R3 수정: 공통 계약에서 무조건 정오 문장을 뺐다. 시각 미상 조건부 문장은 prompt.mjs:449·compat:530 에만 있다. cross.context reason 은 한국어 문장이다.
  - 실측: R4 presented 증거 ID 31→0, R3 presented 0.
- **7d6dc7ad7 R2 (a)**
  - 수정: core 근거 표와 대체 카드(evidenceSummary)를 일주만 남겼다. evidenceTokens 는 그대로 둔다(인용 판정은 some).
  - 검증: verify:neo-output-safety OK.
- check:fast 통과: 372 suites, 5663 tests.

**끝난 판정:** 결과 본문을 마스킹 없이 원문 그대로 검사해서 다음이 0건이어야 한다.
- 출생값
- 증거 ID(`T055`, `F-…` 형식)
- 영문 키
- 조건 없이 나온 정오 문장

## 정본 예시

- 조건부 정오 경고: `worker/lib/master-love-codex-prompt.mjs:449`

## 함정

- 출생값 검사는 scratchpad `birthcheck.mjs` 를 쓴다. 이 스크립트는 일치 비트맵만 출력한다. 값을 출력하는 검사 스크립트는 만들지 않는다.
- R4 normalizeChapterContent 를 테스트하려면 utils 노출이 필요하다(routes/master-love-codex.js:1673).
- 후속(범위 밖): 출생값 줄을 라우트마다 따로 넣고 있다.
  - 위치: new-year-ai.js:1512, ziwei:1380, astrology:1000, vedic:1033, karma-destiny, naming-prompt, love-secret-ai-prompt.js:272, master-love-codex-prompt.mjs:342.
  - 이번 표본에서 본문에 되짚은 것은 R9 뿐이다.

## 검증

```
npx jest __tests__/worker/life-book-ai.sections.test.js __tests__/worker/master-love-codex-quality.test.js __tests__/worker/love-secret-ai-prompt.gate.test.js
npm run check:fast
node build-cache/llm-sample-review-20261009/harness/r9.mjs --plan   # 0회
```

- 오프라인 확인: 기존 R4·LS1·R3 raw.json 을 새 필터에 통과시켜 0건이 되는지 본다.

## 모르는 것

- **R2:** neo-operation-room-basis.js:75 가 core 그룹에 "사주 네 기둥"을 넣는다. 대체 카드 routes/neo-operation-room.js:645 에도 있다.
  - 선택지: (a) 일주만 남긴다, (b) 데이터는 두고 규칙과 후처리로 나열을 막는다.
  - 2026-10-10 사용자 결정: (a). 7d6dc7ad7 에 반영했다.
