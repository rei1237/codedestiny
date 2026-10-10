---
status: active
updated: 2026-10-10
next: "R9 부터: worker/routes/life-book-ai.js 프롬프트에서 출생값 3경로(L1199-1200, L1135-1145, L1166-1172)를 걷어내고 life-book-ai.sections.test.js 에 '프롬프트·본문에 출생값 0건' 테스트를 먼저 쓴다."
---

# 결과 본문 누출 결함 (R9 출생값·R4 증거 ID·LS1 영문 키·R3 정오 문장·R2 네 기둥)

## 왜

"고치지않은 결함에 대해서 각각 수정할 수 있도록 인수 인계 문서를 만들어서 작업할 수 있도록해줘" (2026-10-10). 지금은 결과 페이지와 PDF 에서만 마스킹하고 있다. 생성기는 그대로다.

## 지금 상태

- 아직 고치지 않았다. 규칙은 [2026-10-10-new-year-and-expert-llm-debug.md](2026-10-10-new-year-and-expert-llm-debug.md) '지켜야 할 규칙'을 따른다.
- 공통 원인은 두 가지다. 프롬프트에 원값이나 내부 키가 들어가고, 출력에 결정적 필터가 없다.

## 남은 작업

- [ ] **R9 인생의 책 (worker/routes/life-book-ai.js).** 출생값이 세 경로로 들어간다.
  - L1199-1200: [사용자 입력] 줄. 15개 섹션 모두에 들어간다.
    - → 성별·달력·"시각 입력됨/모름"으로만 바꾼다.
  - L1135-1145: `calculationMeta` 가 통째로 들어간다.
    - → `{available, timeUnknown, birthTimeUnknown, limitation}` 만 남긴다. life-book-ai-saju.js:163 이 timeUnknown 을 쓴다.
  - L1166-1172: frame 스키마 예시 profileSummary 에 실제 값이 들어간다.
    - → 비운다.
  - L1455 부근에 입력 birth 값으로 결정적 출력 필터를 넣는다. L256 maskBirthDate 는 로그 전용이다.
- [ ] **R4 궁합 (master-love-codex).**
  - master-love-codex-evidence.js:62 가 "ID와 값만 인용"이라고 지시한다. compat-prompt.mjs:569 스키마는 evidenceId 를 요구한다.
  - 필터가 없다(routes/master-love-codex.js:586-637 normalizeChapterContent).
  - → 계약 records/crossChecks 의 id 와 일반형 정규식으로 결정적으로 지운다. 지시 문구도 바꾼다.
  - 같은 계열: evidence.js:97 이 path 를 label 로 쓴다.
- [ ] **LS1 속궁합 비밀.**
  - love-secret-ai-facts.js:177·187 이 precisionMetrics 영문 키를 그대로 넘긴다(reference.js:181-188).
  - → 키는 한국어 라벨로, 점수는 등급으로 바꾼다. parse L598 부근에 `(?<=[가-힣])\((attraction|…)\)` 정리를 넣는다.
- [ ] **R3 (R4 공통).**
  - master-love-codex-quality.js:19 가 "출생시각 미상 명반은 정오 가정 명시"를 조건 없이 넣는다.
  - → timeUnknown 일 때만 넣는다. 조건부 정본은 prompt.mjs:449, compat:530 이다.
  - evidence.js:56 cross.context 의 reason 을 한국어 문장으로 바꾼다.
- [ ] **R2 네 기둥.** 사용자 결정이 필요하다(아래 '모르는 것').
- [ ] **재실호출.** R9 → R4 → LS1 → R3 순서로 각 1회 돌린다. 각각 승인이 필요하다.

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
  - 🔴 사용자에게 먼저 묻는다.
