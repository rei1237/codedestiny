---
status: active
updated: 2026-09-06
next: PR #1604 가 머지된 뒤 origin/main 에서 워크트리를 새로 파고, 가드 규칙 (ii)·(iii) 을 먼저 넣어 현 소스가 그대로 통과하는지 확인한다.
---

# 프롬프트 허브 — 산출 데이터가 비어 있는 도구 3개 배선

## 왜

> "종합 프롬프트 생성기에서 자미두수 부분은 명궁이나 궁을 선택해야 한다고 나와있는데 … 전체적인 궁이 들어가도록 해줘. 그리고 각 기능에 차트 등이 실제로 나오는지도 조사하고 안 나오면 넣어줘"

사용자 확인: 여기서 "차트"는 **화면 시각 차트가 아니라 프롬프트에 실리는 산출 데이터 블록**이다. 시각 차트 렌더링(원칙 16 목업 필요)은 범위 밖.

## 지금 상태

- 자미두수 12궁 전체(도구·종합 양쪽) = **PR #1604**, CI 5개 통과, **사용자 머지 대기**.
- 조사 결과: 허브 16개 도구 중 확정 산출 데이터가 실리는 것은 9개. **산출 가능한데 비어 있는 것이 3개 — 수비학·호라리·육효.** 나머지(타로·꿈·basic·psych)는 입력이나 엔진이 없어 산출 대상이 아니다.

## 남은 작업

세 도구를 **한 PR 로** 묶는다(`buildComputedFactsFor` 의 `switch` 한 곳과 가드 한 파일을 공유하고, 나누면 sitemap 원장 재생성이 3번 반복된다 — #1557 선례).

- [ ] **수비학** — `numerology-prompt-facts.ts` 신규(동기)
- [ ] **호라리** — 🔴 새 파일이 아니라 `astro-prompt-facts.ts` 안에 `buildHoraryPromptFacts` 를 나란히 둔다(비동기)
- [ ] **육효** — `yukhyo-prompt-facts.ts` 신규(동기)
- [ ] **종합에서 수비학을 실제 산출로 이동** — `comprehensive-prompt-facts.ts:31` 의 `NON_COMPUTABLE_LABEL` 에서 `numerology` 를 뺀다(타로·꿈만 남음)
- [ ] **가드 새 규칙 2개**(아래 §함정)
- [ ] 판정 기준: `npm run verify:prompt-hub-facts-wiring` 요약 줄의 동기 스모크가 6→8, 비동기 건너뜀이 3→4 로 오른다

## 정본 예시

새 빌더는 `app/fortune/prompt-hub/meihua-prompt-facts.ts` 형태를 그대로 따른다(파싱 실패 시 `""`, `catch { return ""; }`, `[... 산출 데이터]` 헤더, 빈 줄 뒤 "확정 데이터" 마무리 문단).

## 함정

### 공통
- **모든 블록에 `- 산출하지 않은 것:` 줄을 넣는다.** 각 도구의 `answerSections` 가 이미 "주요 시그니피케이터" 같은 항목을 요구해서, 침묵하면 LLM 이 확실히 지어낸다.
- 🔴 마무리 문단은 **빈 줄 하나**로 갈라야 한다 — 종합의 `headerAndData()` 가 `split("\n\n")[0]` 으로 자른다. 블록 중간에 빈 줄이 생기면 종합에서 뒷부분이 통째로 사라진다.

### 수비학
- 🔴 `buildNumerologyContext()` 를 쓰지 말 것 — 함께 내놓는 `questionNumber` 가 영어 토픽 키에만 반응해 **한국어 주제에는 언제나 9** 다(실행 확인).
- 🔴 `calculateLifePath` 는 **파싱 실패에 조용히 9 를 돌려준다**(실행 확인). 빌더가 `YYYY-MM-DD` 를 먼저 검증하고 어긋나면 `""`.
- `calculatePersonalDay` 는 오늘 날짜에 의존 → **기준일을 줄에 박아 적는다**(`- 개인일수(2026-09-06 기준): …`). 마스터수는 `11(마스터수)` 로.
- 엔진은 `lib/tarot/numerology-tarot.mjs` 의 `calculateLifePath`·`calculatePersonalDay`·`NUMEROLOGY_DATA` 만 지연 `import()` 로 부른다(정적 import 는 허브 첫 페인트를 늦춘다). 음력 입력은 `lunarToSolar` 로 환산하고 환산일을 한 줄 더 적는다 — `astro-prompt-facts.ts` 의 `resolveSolarBirth` 와 같은 형태.
- 🔴 **종합의 생년월일은 선택 필드다.** 그냥 옮기면 생년월일 없는 사용자에게서 수비학이 조용히 사라져 그 파일 상단 🔴 주석을 정면으로 어긴다. 산출 실패 시 `nonComputable` 에 `"수비학(생년월일 미입력)"` 을 넣는다 — 즉 상수 표를 **런타임 결과**로 바꾼다.

### 호라리
- 같은 파일에 두는 이유: 필요한 것이 사실상 전부 `astro-prompt-facts.ts` 의 비-export 자산(`fetchJson`·`resolveCoordinates`·`fetchChart`·`SIGN_KO`·`PLANET_KO`·`ASPECT_KO`·`degreeInSign`)이다. 같은 파일이면 `case "horary"` 가 점성술·베다와 같은 청크를 지연 로드해 라벨 표가 중복 번들되지 않는다.
- `Coordinates` 타입에 `timezone?: string` 을 더하고 `resolveCoordinates` 가 `payload.timezone` 을 실어 준다(2줄). 호라리 도구에는 시간대 필드가 없어 **질문 장소의 시간대가 유일한 근거**다. geocode 가 주는 `"Asia/Seoul"`·`"UTC+5"` 두 형태를 `/api/astrology/basic` 이 이미 둘 다 받는다. 점성술·베다는 이 필드를 무시한다.
- 🔴 시간대가 빈 값이면 `"Asia/Seoul"` 을 **명시적으로 보내고 그 사실을 줄에 적는다** — 안 그러면 워커가 말없이 +9 로 채운다.
- 폴백 2단: 시각·장소 **파싱 실패 → `""`**. 파싱은 됐는데 **좌표·차트 실패 → 짧은 블록**("질문 장소의 좌표를 확인하지 못해 산출하지 않았습니다(추정 금지)").
- 낼 수 있는 것: ASC·MC·하우스 커스프 12개·행성의 별자리/각도/하우스/역행·오브 8° 이내 각. 🔴 시그니피케이터 지정·리셉션·컨시더레이션·각의 접근/분리는 **엔진에 없다** → `산출하지 않은 것` 줄에 명시.
- 🔴 `astro-prompt-facts.ts` 를 건드리므로 **점성술·베다 회귀 확인 필수**(#1553/#1556/#1559 로 최근 고친 경로).

### 육효
- `meihua-calc.ts` 의 64괘 자산(`getGuaByLines`·`getHexagramName`·`calculateMutualHexagram`·`GUA_BY_NUMBER`) 재사용.
- 파싱 계약: `sixLines` 를 `split(/[^가-힣0-9]+/)` 로 토큰화 → `노음`/`6`(음·동) · `소양`/`7`(양·정) · `소음`/`8`(음·정) · `노양`/`9`(양·동) **정확 일치만**. 순서는 아래→위(필드 placeholder 가 이미 그렇게 안내). 🔴 **정확히 6개가 다 맞을 때만 진행, 그 밖은 전부 `""`.** 동전면 표기(`앞뒤뒤`)는 받지 않는다 — 세 닢/두 닢 규칙이 갈리는데 레포에 정본이 없다. `questionTime` 으로 괘를 뽑는 것은 레포에 없는 입괘법을 지어내는 것이다.
- 산출: 본괘 · 호괘 · 동효 자리 · 지괘. 🔴 `calculateChangedHexagram` 은 **한 효만** 뒤집으므로 쓰지 말고, 파싱한 배열에서 동효를 **전부** 뒤집어 `getGuaByLines` + `getHexagramName` 으로 이름을 얻는다. 동효가 없으면 `- 동효: 없음` 으로 두고 지괘 줄을 뺀다.
- 🔴 **넣지 않는 것**: 납갑·육친·육수·세응·공망·용신(엔진 없음) / 일진·월건(쓰이는 자리가 공망·왕상휴수 판정인데 그게 없어 재료만 주면 지어낸다) / `calculateElementRelation` 체용(매화역수 개념이지 육효가 아니다). 팔괘 오행은 사실이므로 적되 🔴 `(오행 화)` 처럼 괄호에 넣고 **뒤에 조사를 붙이지 않는다**(가드의 오행 조사 검사).

### 가드 (`scripts/verify-prompt-hub-facts-wiring.mjs`)
- `SAMPLES` 에 **동기 빌더 2건만** 추가(수비학·육효). 🔴 `buildHoraryPromptFacts` 는 넣지 말 것 — async 라 `usedSamples` 에 등록되지 않아 "낡은 항목" 검사에서 되레 실패한다.
- 🔴 **새 규칙 (ii)** — 지금 규칙 (a)는 `<도구>-calc.ts` 가 있는 도구만 `case` 를 요구해 계산 모듈 없는 세 도구가 전부 사각지대다. 호라리는 더 나쁘다: 빌더를 `astro-prompt-facts.ts` 에 넣는 순간 규칙 (b)가 점성술 case 만으로 통과해 **배선을 통째로 빠뜨려도 초록불**이다. 추가할 규칙 — 모든 `*-prompt-facts.ts` 의 `export function build<X>PromptFacts` 에서 `toolId = X.toLowerCase()` 를 뽑아, 그 id 가 `toolIds` 에 있으면 `caseIds` 에도 있어야 한다. 현 소스 9개 빌더 전부가 이 규약을 지켜 **예외 표가 필요 없다**(전수 확인).
- **새 규칙 (iii)** — 동기 빌더마다 `builder({})` 가 `""` 인지 본다. 현재 6개 전부 통과(실행 확인). `calculateLifePath("") → 9` 류의 침묵 기본값이 새어 나오는 회귀를 이게 잡는다.
- 🔴 두 규칙을 **먼저** 넣고 현 소스에서 그대로 통과하는지 본다. 여기서 실패하면 규칙이 과한 것이다.
- CI 배선 불필요 — pr-ci 의 fast 잡이 `paths` 필터 없이 항상 이 스크립트를 부른다.

## 검증

```
npm run verify:prompt-hub-facts-wiring
npm run lint
npm run typecheck
npm run sitemap:generate   # PromptHubClient.tsx 를 건드리면 config/sitemap-lastmod.json 을 같은 커밋에
npm run check:quick        # 되쓰는 rss.xml·public/rss.xml·insights/rss.xml·public/insights/rss.xml·.ignore 는 커밋 전에 되돌린다
```

화면 확인: 수비학 `1996-05-29` → 블록 등장 / 생년월일 삭제 → 소멸. 육효 예시 6효 → 본괘 수화기제·지괘 풍뢰익 / `sixLines` 를 `abc` 로 → 소멸. 호라리 `서울 강남구` → ASC·커스프 / 장소를 `zzz` 로 → 폴백 블록. 종합에서 수비학만 체크하고 생년월일을 비우면 `"수비학(생년월일 미입력)"` 한 줄.

## 모르는 것

- 육효 동전면 표기의 세 닢/두 닢 규칙 — 레포에 정본이 없다. 🔴 추측해서 채우지 말고 사용자에게 묻는다.
- 실제 LLM 응답 품질은 절대 규칙 1 때문에 확인 불가. 프롬프트 **텍스트**까지만 검증한다.

## 범위 밖 (언급만)

- **화면 시각 차트** — 자미두수 12궁 판은 `ZiweiAiClient.tsx` 안에 styled-jsx 와 엉켜 인라인으로만 존재한다. 허브로 끌어오려면 컴포넌트 추출 + 원칙 16(목업 → 승인 → 구현).
- 육효 일진·월건 → 공망·왕상휴수 / 호라리 컨시더레이션·리셉션 / 수비학 이름 기반 수·개인년 — 전부 판정 엔진이 레포에 없다.
