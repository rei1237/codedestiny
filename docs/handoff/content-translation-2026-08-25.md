# 콘텐츠 실제 번역 — 인수인계 (2026-08-25)

> **이 문서만 읽고 시작할 수 있게 쓴다.**
> UI 카피 로케일화는 [locale-service-optimization-2026-08-25.md](locale-service-optimization-2026-08-25.md) 가 다룬다.
> 이 문서는 그 문서가 **명시적으로 제외한** 축 — 데이터 파일에 든 서사·해석 **콘텐츠 본문** — 이다.

## 진행 상황

| 슬라이스 | 규모 | 상태 |
|---|---|---|
| 1. `master-love-codex/data/prologue.ts` + `premium.ts` | 2,354자 · 87키 | ✅ **완료** (PR #1131) — 아래 "슬라이스 1에서 정해진 것" |
| 2. `love-simulation/_utils/loveCharacterMatching.ts` | 1,432자 · 80키 | ✅ **완료** — 아래 "슬라이스 2에서 정해진 것" |
| ~~2b. `love-simulation/_data/scenarios.ts`~~ | ~~2,148자~~ | 🗑️ **삭제** — 참조 0이었다(아래) |
| 3. `loveCharacterStories.ts` | 26,723자 | ⛔ 미착수 (캐릭터 단위로 쪼갤 것) |
| 4. `loveCodeMvp.ts` | 106,658자 | ⛔ 미착수 (시나리오 블록 단위로 쪼갤 것) |

### 🔴 슬라이스 1에서 정해진 것 — 뒤 슬라이스는 그대로 따라 쓴다

1. **아키텍처는 운명의 찻집과 같다. 새로 설계하지 말 것.**
   `lib/i18n/scopedCopy.ts` 의 `useScopedCopy(namespace, scope, ko, { skipKeys })` 하나가 엔진이다
   (`useTPick` 위에서 구조를 걸어 다니며 **문자열만** 갈아끼운다). 피처는 얇은 껍데기 훅만 둔다 —
   `useTeaHouseCopy`(fortuneTeaHouse) · `useCodexContentCopy`(masterLoveCodex).
   🔴 컴포넌트가 `useScopedCopy` 를 직접 부르면 가드의 전수 발견에서 빠진다. 껍데기를 통해서만 쓴다.
2. **한국어 정본은 `data/*.ts` 에 그대로 둔다.** 사전의 `ko` 는 그 사본이다
   (`verify-master-love-codex-flow.mjs` 가 `prologue.ts` 소스에서 한국어 마커를 읽는다).
   가드가 사전 ko 와 소스가 일치하는지 매번 대조하므로 한쪽만 고치면 실패한다.
3. **번역 정본은 `i18n/authored/<namespace>-<번호>.json`** → `node scripts/i18n-merge-authored.mjs --namespace <ns> --core`.
   병합 후 `git diff --numstat -- public/i18n/` 이 **추가만 / 삭제 0** 인지 반드시 확인한다
   (병합기가 다른 세션의 미머지 저작까지 함께 내보낸다 — 찻집 문서 함정 5).
4. **로케일 범위(사용자 지시 2026-08-25)**: 손으로 쓰는 것은 **en · ja · zh-CN · zh-TW 넷뿐**이고
   vi·hi·es·fr·de·nl·ms 는 **영어를 그대로 채운다**. 분량이 방대해 전부는 하지 않는다. 다시 꺼내지 말 것.
5. **말투** — 나레이션은 서술체, 화자('연애 고수')는 손님을 맞이하는 차분한 존대
   (ja 는 です・ます, zh 는 您). 화자 **이름**은 콘텐츠가 아니라 `_lib/copy.ts` 의 `narratorName` 이다.
   도메인 용어는 `i18n/glossary.json` 표기를 따른다(사주 = Four Pillars (BaZi) / 四柱推命 / 四柱八字).
6. **가드**: `__tests__/fixtures/scoped-copy-i18n-guard.js` 가 엔진이고
   `__tests__/ui/master-love-codex-content-i18n.static.test.js` · `…/fortune-tea-house-i18n.static.test.js`
   가 각각 부른다. `__tests__/ui/*.test.js` 글롭이 자동으로 잡으므로 **verify:\* 배선이 필요 없다.**
   배선만 하고 번역을 빠뜨리면 그 자리에서 실패한다(음성 테스트 실측 2026-08-25: en.json 키 1개를
   지우자 `en.json 에 masterLoveCodex.heroSpecs.0 가 없다` 로 실패).
7. **판별자는 `skipKeys` 로 지킨다.** 프롤로그: `stage`·`actor`·`background`·`effect`·`speaker`·`mood`·`key`.
   Why Premium 의 `label`(영문 대문자 이브로우)은 브랜드 표기라 번역 대상이 아니다.

### 슬라이스 1에서 함께 고친 것(콘텐츠 축이 아니라 **누수**였다)

- `CodexDialogueBox` 가 대사창 이름표에 `speaker` 리터럴("연애 고수")을 그대로 그리고 있었다 →
  `copy.narratorName`. `_lib/copy.ts` 주석은 이미 그렇게 되어 있다고 적혀 있었지만 실제로는 아니었다.
- `codexAccessLabel` 이 한국어 문장("이용권 포함"/"월정석 사용")을 돌려주고 **CodexGenerating 이 그대로
  렌더**하고 있었다 → 판정은 `noteKey` 로 좁히고 문장은 `_lib/copy.ts` 의 `codexAccessNoteText` 로.
  (`CodexReportStamp` 는 한국어 문자열 비교로 우회하고 있었고, 그 비교도 함께 없앴다.)
- `CODEX_SCORE_TIERS[].korean` 은 읽는 곳이 0이었다(3면 grep) → 삭제. 같은 문구는 `_lib/copy.ts` 의
  `scoreTier*` 가 5개 로케일로 이미 갖고 있다.

### 🔴 슬라이스 2에서 정해진 것 — 슬라이스 3·4는 그대로 따라 쓴다

1. **`scenarios.ts` 는 번역이 아니라 삭제였다.** `git grep` 3면(소스 + `__tests__/` + `scripts/verify-*`)
   전수 결과 `SCENARIO_DB`·`ChoiceWithReaction`·`backgroundEmoji`·`situationDescription`·`npcDialogue`
   가 **자기 파일 밖에 한 번도 안 나온다**. 같은 피처의 나머지 20개 파일 중 import 하는 곳도 0.
   2,148자로 슬라이스 2의 60%였다. 🔴 **뒤 슬라이스도 옮기기 전에 소비처부터 확인할 것** —
   `_data/` 에 있다고 화면에 나오는 것이 아니다.
2. **엔진 함수는 훅을 못 쓴다. 카피를 인자로 받는다.** `loveCharacterMatching.ts` 는 순수 함수라
   `useScopedCopy` 를 직접 부를 수 없다. 컴포넌트가 최상위에서 `useLoveSimCopy("matching", KO)` 로
   받아 **함수 인자로 내려준다**. 새 축을 만든 게 아니라 껍데기 훅
   (`_utils/loveSimCopy.ts`)만 하나 늘렸다 — 찻집·인연의 서와 같은 엔진이다.
3. 🔴 **이 피처에는 로케일 표가 이미 하나 더 있다.** `LoveSimulationEngine.tsx` 의
   `LOVE_SIMULATION_COPY_TRANSLATIONS` — **버튼·필드 라벨·에러 같은 UI 크롬**이고
   **ko·en 만 실제 문구, 나머지 10개는 en 별칭**이다(2026-08-25 실측).
   인연의 서에서 `_lib/copy.ts`(크롬) ↔ `_lib/contentCopy.ts`(콘텐츠)를 가른 것과 같은 경계라
   **감싸지 말고 그대로 두었다**. 그 표를 채우는 것은 UI 축, 즉 locale-service 문서 소관이다.
4. **문장은 `{자리표시자}` 템플릿으로 쪼갠다.** 한국어 조사(`으로`·`이라`)가 붙어 있어 값을 그대로
   이어붙이면 다른 언어에서 어순이 깨진다. `formatTemplate` 이 채우고, 못 채운 자리는 빈 문자열로
   지운다 — 그래서 **로케일마다 자리표시자 집합이 같은지 검사하는 테스트가 따로 있다**.
5. 🔴 **기계 키와 표시 이름을 분리한다.** `GAN_DAY_MASTER`(`갑`→`갑목`) · `BRANCH_ELEMENT`(`자`) ·
   `TEN_GOD_TERMS`(`비견`) · `FALLBACK_PROFILE` 의 키워드는 **사주 계산 결과 문자열과 대조하는
   조회 키**라 로케일 불문 한국어로 남는다(제외 대상 표의 "한국어 타입 리터럴 = 기계 키"와 같은 부류).
   화면에 찍는 이름은 `DAY_MASTER_COPY_KEY`·`BRANCH_COPY_KEY` 로 한 겹 매핑해 사전이 그쪽만 덮게 했다.
6. **화면이 판정 값을 그대로 찍고 있으면 그것도 누수다.** `confidenceLabel: "높음"|"보통"|"낮음"`
   을 `confidenceKey: "high"|"medium"|"low"` 로 바꾸고 문장은 카피가 갖게 했다
   (슬라이스 1의 `codexAccessLabel` 과 같은 모양의 결함이다).
7. **가드**: `__tests__/ui/love-simulation-content-i18n.static.test.js` — 슬라이스 1의 공유 엔진
   `__tests__/fixtures/scoped-copy-i18n-guard.js` 를 그대로 부르고, 여기에 **자리표시자 일치 검사**를
   더했다. `__tests__/ui/*.test.js` 글롭이 잡으므로 verify:* 배선이 필요 없다.
   음성 테스트 실측 2026-08-25: `en.json` 에서 `loveSimulation.matching.coupleGrade.excellent` 를
   지우자 그 키 이름을 대며 실패했다.

### 🔴 슬라이스 2가 남긴 것 — 슬라이스 3·4가 닫아야 한다

매칭 문장의 `{name}`·`{archetype}`·`{profileLine}`·`{bestApproach}` 는 `_data/loveCodeMvp.ts` 의
한국어를 그대로 받는다. 그래서 **지금 비-ko 화면은 틀만 그 언어이고 캐릭터 이름·소개는 한국어**다.
캐릭터 16명 × 4필드(이름·아키타입·프로필라인·베스트어프로치) ≈ 2,560자가 이 구멍을 정확히 메운다 —
🔴 **슬라이스 3을 시작할 때 이 4필드를 첫 덩어리로 잡을 것.** 캐릭터 이름은 `LoveSimulationEngine`
곳곳에도 찍히므로 **캐릭터 표면 전체를 한 PR 에서 함께 옮겨야** 화면이 섞이지 않는다.

또 하나(미조치, 저위험): 매칭 결과는 **만들어진 시점의 언어 그대로 state 에 담긴다.** 매칭 후
언어를 바꾸면 카드가 이전 언어를 유지하고, 다시 매칭해야 갱신된다. 고치려면 문장 대신
`키 + 파라미터`를 state 에 담고 렌더 시점에 조립해야 하는데 상태 구조를 바꿔야 해서 미뤘다.

## 🔴 먼저: 이건 한 세션에 안 끝난다

**실측 2026-08-25 — 한글 139,315자.** 저작 로케일 4개(en·ja·zh-CN·zh-TW)로 옮기면 **약 557,000자**다.

| 파일 | 줄 | 한글 자수 | 무엇 |
|---|---|---|---|
| `app/saju/love-simulation/_data/loveCodeMvp.ts` | 4,546 | **106,658** | 러브 시뮬레이션 시나리오·대사 본문 |
| `app/saju/love-simulation/_data/loveCharacterStories.ts` | 408 | 26,723 | 캐릭터 서사 |
| ~~`app/saju/love-simulation/_data/scenarios.ts`~~ | 135 | ~~2,148~~ | 🗑️ 참조 0이라 삭제 |
| ~~`app/saju/love-simulation/_utils/loveCharacterMatching.ts`~~ | 158 | 1,432 | ✅ 완료 |
| ~~`src/features/master-love-codex/data/prologue.ts`~~ | 78 | 1,387 | ✅ 완료 |
| ~~`src/features/master-love-codex/data/premium.ts`~~ | 56 | 967 | ✅ 완료 |

여기에 자미두수 해석 엔진 문장(`AdvancedZiweiSectionV2` + `_lib` 의 `PALACE_DEFINITION_MAP`·`STAR_MEANING_MAP`)이 더 있는데, 그쪽은 **의도된 제외**다(아래).

## 🔴 자동 번역기를 쓸 수 없다

이 레포에서 번역 자동화는 **Gemini 유료 실호출**이고, CLAUDE.md 절대 규칙 1이 사용자 허락 없는 실호출을 금지한다.
그래서 이 분량은 **손으로 쓰는 수밖에 없다**(선례: `docs/handoff/` 의 "셸 새 카피 = 12개 로케일 수작업").
계획 단계에서 **키 수를 줄이는 것**이 유일한 지렛대다.

## 손대면 안 되는 것 — 이미 판정이 끝난 제외 대상

옮기기 전에 아래를 다시 논의하지 말 것. 각 모듈 헤더에 이유가 적혀 있다.

| 대상 | 왜 제외인가 | 근거 |
|---|---|---|
| 자미두수 해석 엔진 문장 · 12궁/별/사화/밝기 이름 | 도메인 고유명사는 **원어 유지**가 이 레포의 규칙이다(Vedic/Graha·나크샤트라와 동일) | `app/components/ziwei/_lib/advanced-ziwei-copy.ts` 헤더 |
| `data/prologue.ts` 의 `speaker: "연애 고수"` | 대사 스크립트를 가르는 **타입 리터럴 = 기계 키** | `src/features/master-love-codex/_lib/copy.ts` 헤더 |
| `CodexChapter` 의 `/^제\s*\d+\s*장\s*·\s*/` | 서버가 붙이는 접두를 걷는 **기계 계약** | `__tests__/ui/paid-result-locale-copy.test.js` 허용목록 |
| `SikojenpovailuContext` 의 `'금전운' \| '연애운' \| '행운'` | 한국어 **타입 리터럴 = 기계 키** | 위 가드 |
| 서버 렌더 SEO 산문(`page.tsx` 본문) | 한국어 분량을 `verify-adsense-readiness` 가 센다 | locale-service 문서 |

## 어떻게 자를 것인가 — 권하는 순서

🔴 **`loveCodeMvp.ts`(106,658자) 를 첫 슬라이스로 잡지 말 것.** 한 파일이 전체의 76% 라 세션이 반드시 마른다.

1. ~~**`master-love-codex/data/prologue.ts` + `premium.ts`**~~ (2,354자) — ✅ 완료(PR #1131).
2. ~~**`love-simulation/_utils/loveCharacterMatching.ts`**~~ (1,432자) — ✅ 완료. `scenarios.ts` 는 삭제.
3. **`loveCharacterStories.ts`** (26,723자) — 캐릭터 단위로 더 잘린다. 캐릭터 N명씩 나눠 여러 PR.
   🔴 **첫 덩어리는 `loveCodeMvp.ts` 의 캐릭터 4필드**(이름·아키타입·프로필라인·베스트어프로치)다 —
   슬라이스 2가 남긴 구멍을 그게 메운다(위 "슬라이스 2가 남긴 것").
4. **`loveCodeMvp.ts`** (106,658자) — 반드시 **시나리오 블록 단위**로 쪼갠다. 한 PR = 블록 몇 개.

## 시작하기 전에 정해야 할 것 (사용자 결정) — 2026-08-25 결정됨

1. ~~**이 콘텐츠를 비-한국어 사용자에게 정말 낼 것인가?**~~ → **낸다**(사용자 지시로 착수).
2. ~~**4개 로케일 전부인가, 일부인가?**~~ → **en·ja·zh-CN·zh-TW 만 손으로 쓰고 나머지 7개는 영어 복사.**
3. ~~**UI 카피를 먼저 끝낼 것인가?**~~ → UI 축은 사실상 닫혔다(잔여 ~105자). 콘텐츠를 진행한다.

4. ~~**러브 시뮬레이션은 "번역"인가 "각 문화권 재저작"인가?**~~ → **직역 + 템플릿 재설계**
   (사용자 결정 2026-08-25). 재저작은 ko 정본 대조 가드를 포기해야 하고 4개의 독립 저작이 되어
   뒤 슬라이스 13만 자의 기준이 사라진다. 다시 꺼내지 말 것.

열린 질문 없음.

## 지금 상태 (2026-08-25)

- UI 카피 축은 거의 끝났다 — `"use client"` + 한국어 + **배선 전무**가 24개 파일 · 105문자열.
  남은 실제 결함은 `app/_lib/moonlight-store-snapshot.ts`(4) · animal-destiny 연출 컴포넌트 3종(~11) ·
  `love-simulation/_components/DialogueBox.tsx`(2) 정도다.
- 휴먼 디자인은 이번에 5로케일 260항목을 채웠다(PR #1130).
- 🔴 측정기는 **배선 6가지**를 전부 인정해야 수치가 안 부푼다 — 목록은 locale-service 문서에 있다.
