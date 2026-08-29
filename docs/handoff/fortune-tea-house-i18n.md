---
status: active
updated: 2026-08-24
next: "\"남은 대상\" 절 — 문자열을 저장하지 않고 조립하는 `data/` 경로를 로케일화한다"
---

# 운명의 찻집(fortune-tea-house) 다국어화 (2026-08-23)

> 이 문서만 읽고 이어서 시작할 수 있게 쓴다. 앞선 세션의 판단 근거와 실패한 접근까지 남긴다.

## 현재 상태

| 갈래 | 규모 | 진행 |
|---|---|---|
| `components/` UI 크롬 | 811개 문자열 / 33개 파일 | ✅ **완료 (33/33)** — 디버그 4종 포함 |
| `data/` 찻잔·십성·서사·CTA | 345 엔트리 | ✅ **완료** — PR #1036 · #1039 · #1042 · #1045 · #1048 |
| 스프라이트 대체 텍스트 16개 | 십성 alt 10 · 꽃돼지 label 6 | ✅ **완료** — 머지됨 |
| `data/tarotAlbumStories.ts` | 16,919자 | ✅ **완료** — PR #1053(조립을 순수 함수로 리팩터) · #1068(메이저 22장 462키). 조각 4개(templates·suitMeta·rankMeta·majorNarratives)가 전부 사전을 탄다 |
| `data/tarotCards.ts` | 11,516자 | ⛔ **라운드 2** — 아래 함정 8. 컴포넌트 직접 참조는 0이지만, 초안이 서버로 가 LLM 응답과 병합되므로 **degrade 시 사용자에게 닿는다**(아래 정정) |
| `lib/` | 17,594자 | ⛔ **라운드 2** — 아래 함정 8 |

PR: #1020 · #1024 · #1025 · #1027 · #1028 머지됨. 이어서 **#1032**(가드 확장) → **#1036**(찻잔 6잔 + `skipKeys`) → **#1039**(십성 10종) → **#1042**(입장 씬 6개 + `mood` 판별 유니언) → **#1045**(스토리 31스텝 + 흐름 카드) 순으로 머지됐고, 타로 앨범은 **#1053**(조립 리팩터 — 한국어 출력 78장 × 23필드 스냅샷 대조로 무변경 확인) → **#1068**(메이저 22장 462키) 로 끝났다.

🔴 **"114,223자 · 56,335자"는 글자 수가 아니라 한글의 UTF-8 바이트였다.** 실제 번역 대상은 `data/` 38,484자(2,056 리터럴) · `lib/` 18,983자(1,083 리터럴) — 문서가 말하던 규모의 1/3이다. 계획을 세울 때 이 값을 쓸 것.

**"파일 단위 한글 30,186자"라는 수치를 근거로 삼지 말 것.** 그건 주석까지 센 값이다. AST 로 JSX 텍스트·문자열/템플릿 리터럴만 뽑은 실제 번역 대상이 `components/` 기준 **811개 / 9,053자**다. 재현:

```bash
# scratchpad 의 extract-tea-house-ui.mjs 와 같은 방식 — ts.createSourceFile 로 파싱해
# JsxText / StringLiteral / TemplateExpression 중 한글을 가진 것만 센다.
```

## 아키텍처 — 새로 설계하지 말 것

`src/features/fortune-tea-house/lib/teaHouseCopy.ts` 의 훅 하나가 전부다.

```ts
const copy = useTeaHouseCopy("landing", KO);
```

- 각 컴포넌트는 한국어를 **모듈 최상위 `KO` 객체 한 곳**에 모은다. 그게 원문의 정본이다.
- 훅이 `KO` 구조를 걸어 다니며 `fortuneTeaHouse.<scope>.<경로>` 사전 값으로 갈아끼운다.
- 구조는 그대로 두고 **문자열만** 바꾼다 — 같은 객체에 섞인 스프라이트 좌표 같은 숫자는 통과한다.

🔴 **`useT` 가 아니라 `useTPick` 위에 있다.** 이 네임스페이스의 한국어는 소스가 정본이라, `useT` 는 키가 없으면 `"번역을 준비 중입니다"` 를 돌려주고 그게 한국어 화면을 통째로 덮는다. `useTPick` 은 값이 없으면 넘겨받은 원문을 유지한다(정적 셸의 `_pvwTrKeep` 과 같은 계약).

🔴 **`KO` 는 반드시 모듈 최상위 상수여야 한다.** 렌더마다 새 객체를 넘기면 `useMemo` 가 매 렌더 다시 돌고, 그 결과가 자식 props 로 내려가면 그쪽 메모까지 연쇄로 깨진다. 가드도 모듈 최상위에서만 `KO` 를 찾는다.

## 가드 — 대상을 스스로 찾는다

`__tests__/ui/fortune-tea-house-i18n.static.test.js`

컴포넌트 디렉터리에서 `useTeaHouseCopy` 호출을 **전수 발견**하고, 각 `KO` 리터럴을 중괄호 균형으로 잘라, 모든 leaf 가 12개 사전에서 해석되고 ko 밖에는 한국어가 없음을 요구한다.

- 배선하고 번역을 빠뜨리면 **그 자리에서 실패**한다(실제로 배치 2에서 관측됐다)
- 배선된 컴포넌트가 0개면 빈 루프로 통과하지 않고 **실패**한다
- `__tests__/ui/*.test.js` 글롭에 자동으로 잡히므로 **별도 배선이 필요 없다**

## 이어서 하는 절차

1. 대상 파일의 한국어를 뽑는다 → 화면 문구인지 **판별자**인지 가른다(아래 함정 1).
2. 모듈 최상위에 `KO` 를 만들고, JSX/로직의 리터럴을 `copy.*` 로 바꾼다.
3. `npm run typecheck` → 배선 오류부터 잡는다.
4. `node --test __tests__/ui/fortune-tea-house-i18n.static.test.js` → **여기서 실패하는 게 정상이다**(번역이 아직 없다). 실패 메시지가 필요한 키를 그대로 알려준다.
5. `i18n/authored/fortuneTeaHouse-0N.json` 에 ko/en/ja/zh-CN/zh-TW 를 쓴다.
6. vi/hi/es/fr/de/nl/ms 를 en 값으로 채운다(사용자 지시: 나중에 일괄 실번역).
7. `node scripts/i18n-merge-authored.mjs --namespace fortuneTeaHouse --core`
8. 12개 사전을 **키 단위로 대조**해 `추가만 / 값 변경 0` 인지 확인한다(아래 함정 5).
9. 가드 재실행 → 통과 확인 → 커밋.

## 🔴 함정 (전부 이번 세션에 실제로 밟았거나 발견한 것)

### 1. 판별자와 라벨이 같은 값일 수 있다

`speaker` 의 `"연이"`·`"꽃돼지?"` 는 스토리 데이터와 대조되는 **동시에** 화면에 이름으로 찍힌다.
→ **비교식은 한국어 그대로 두고, 렌더되는 자리만** 사전을 태운다.

반대로 `TeaCupRitualScene` 의 `speaker="연이"` 는 라벨로 안 쓰이고 판별자뿐이라 **번역 대상이 아니다.**
`calendarLabel(value === "lunar")` 처럼 비교 대상이 영어면 안전하다.

### 2. ✅ 마스코트 표정이 한국어 정규식에 걸려 있었다 — PR #1027 에서 해소

표정을 대사의 한국어 키워드로 골랐다. `TalkingPigYeoni` 는 `mood` 가 없을 때 폴백으로 5줄,
`YeoniDialogueActor` 는 `mood` 를 필수 인자로 받고도 사실상 무시하고 7줄. **대사를 로케일화하는 순간
어떤 키워드도 안 걸려 전부 기본 표정으로 주저앉는 구조**였다 — 에러도 없고 테스트도 안 깨진다.

고친 방식:

- 정규식 12줄을 지우고 `data/yeoniSprites.ts` 의 **`yeoniMoodFrameMap`**(이미 있었고 아무도 안 쓰던 표)과
  새 **`pigMoodFrameMap`** 조회로 바꿨다. 꽃돼지 크롭은 6종, `YeoniMood` 는 8종이라 표가 필요하다.
- `doorway` 를 가리키는 mood 값이 없어 스텝에 선택적 `pigFrame?: PigExpressionId` 를 뒀다.
  우선순위: `pigFrame` → `pigMoodFrameMap[mood]` → (말하지 않는 중이면) `welcome`.
- `TeaHouseStoryStep` 을 **판별 유니언**으로 바꿔, `speaker` 가 나레이션이 아니면 `mood` 를 타입이 강제한다.
- 가드 `__tests__/ui/fortune-tea-house-mood.static.test.js` — 정규식에 한글 없음 · 대사 줄에 mood 있음 ·
  두 표가 8종을 덮음. 셋 다 fail-closed.

🔴 **`data/entryStory.ts` 는 가드 대상이 아니다.** 그 파일 라인의 `mood` 는 **읽는 곳이 없다** —
`TeaHouseEntryScene` 은 `speaker` 와 `text` 만 쓴다(전수 확인 2026-08-23: `git grep '.mood' -- src/features/fortune-tea-house`
→ 소비처 3곳 전부 `story.ts` 의 `currentStep`). 죽은 데이터를 가드로 지키지 않는다.

**그래서 `data/` 배치의 선행 조건은 없어졌다.** 대사를 번역해도 표정은 안 흔들린다.
### 3. ✅ `ko-KR` 하드코딩 4곳 — 전부 해소됨

로케일과 무관하게 날짜·정렬이 한국식으로 나오던 자리다. 네 곳 모두 `useLocale()`(`lib/i18n/useT.ts`)을 쓰도록 고쳤다:

| 파일 | 무엇이었나 |
|---|---|
| `TeaHouseHistoryPanel.tsx` | 일주일 넘은 상담의 날짜가 `toLocaleDateString("ko-KR")` |
| `DestinyCafeTarotAlbum.tsx` | 이름순 정렬이 `localeCompare(…, "ko-KR")` — 어떤 로케일에서도 한글 자모 순 |
| `DestinyCafeTarotAlbum.tsx` | PDF 표지 생성일이 `Intl.DateTimeFormat("ko-KR")` |
| `TeaHouseResultSheet.tsx` | 공유 텍스트의 타임스탬프가 `toLocaleString("ko-KR")` |

🔴 **새로 추가하지 말 것** — 날짜·정렬·숫자 서식은 항상 활성 로케일을 받는다. 정렬 함수에 로케일을 넘겼다면 `useMemo` 의존성에도 넣어야 언어 전환이 반영된다.

### 4. 보간은 조각내지 말 것

`${nameKo} ${nameEn} 타로 카드 이미지` 같은 템플릿을 조각으로 나누면 **영어 어순이 모든 언어에 굳는다.** `{name}` 패턴으로 문장 전체를 한 키에 두고 `String.replace` 로 채운다.

한국어 조사가 붙는 자리는 특히 그렇다 — `{focus}을 중심으로 읽었습니다.` 는 `"Read with {focus} at the centre."` 처럼 **문장을 다시 써야** 한다.

### 5. 저작 병합이 다른 세션의 미머지 편집을 함께 내보낸다

`i18n-merge-authored.mjs` 는 `i18n/authored/` **전체**를 다시 내보낸다. 다른 세션이 작업 중인 저작 파일이 있으면 그 편집까지 내 사전 diff 에 실린다. 이번 세션에 `shell` 네임스페이스에서 두 번(`kbm4p3d`·`kerryje`) 재현됐다.

`--namespace fortuneTeaHouse` 로 걸러도 **매 병합 후 12개 사전을 키 단위로 대조**할 것. 판정 기준은 `추가만 / 삭제 0 / 기존 값 변경 0`.

### 6. 폭·길이 제약이 있는 자리

- `.cd-sig-card__glyph` 계열은 `white-space:nowrap` 인 작은 배지다 → 짧은 형태를 쓴다(`Four Pillars`, `Four Pillars (BaZi)` 아님).
- `speakerIcon` 은 아바타 원 안의 한 글자다 → 모든 로케일에서 1~2자(`Y` / `ヨ` / `蜜`).

### 7. 훅 삽입 위치

컴포넌트 시그니처가 여러 줄이면 `export default function Foo({` 다음 줄에 훅을 넣으면 **파라미터 목록 안**으로 들어간다. `)  {` 로 시그니처 끝을 찾아 그 뒤에 넣을 것. 이번에 두 파일에서 밟았다.

같은 파일에 컴포넌트가 둘이면(예: `EntryActor`, `PersonSajuCard`) **각자 훅을 부르고 같은 scope 를 공유**한다 — copy 를 props 로 내리지 않는다.

### 8. 🔴 조립된 문장은 치환으로 로케일화되지 않는다 — 라운드 2가 이것 때문에 생겼다

`data/` 의 남은 부분은 문자열을 **저장**하지 않고 **조립**한다.

```ts
// data/tarotAlbumStories.ts — buildMinorNarrative
storyTitle: `${rankInfo.storyTitle}과 ${suitInfo.storyNoun}`,        // '과/와' 조사
yeoniMessage: `... 마음의 ${suitInfo.storyNoun}을 너무 세게 ...`,      // '을/를' 조사
story: `... ${title}은 지금 당신에게 ...`,                            // '은/는' 조사
```

```ts
// lib/buildConsultResult.ts:30-42 — 아예 조사 엔진이 있다
function hasFinalConsonant(value: string) { /* 종성 유무 */ }
function subjectParticle(value: string) { return hasFinalConsonant(value) ? "이" : "가"; }
```

조각(`suitMeta`·`rankMetaByNumber`)을 사전에 넣어도 **조립 템플릿과 조사가 한국어 문법에 묶여 있어** 다른 언어의 어순이 나오지 않는다. 게다가 `lib/` 은 전부 순수 함수라 `useTeaHouseCopy`(훅)를 쓸 수 없다.

**해결하려면 데이터 모양을 바꿔야 한다** — 조립을 컴포넌트 쪽으로 올리거나, 로케일별 템플릿을 사전에 두거나, 사전을 인자로 주입하는 형태로. 그 설계를 하기 전에는 착수하지 말 것. 착수했다가 되돌린 흔적이 `TenGodSymbolCard.tsx` 의 주석에 남아 있다.

🔴 **2026-08-24 정정 — `lib/buildConsultResult` 는 로컬 전용이 아니다.** 예전 서술("클라이언트 폴백 경로라 체감 우선순위가 낮다")은 절반만 맞다. 실측한 경로는 둘이다.

| 경로 | 조건 | 사용자에게 닿나 |
|---|---|---|
| 화면에 초안을 직접 표시 | `canUseLocalConsultPreview()` = **localhost/127.0.0.1/::1 에서만** (`FortuneTeaHousePage.tsx:801-804`) | ❌ 프로덕션에는 안 닿는다 |
| 초안을 `draftResult` 로 서버에 보내 **LLM 응답과 병합** | 항상 (`FortuneTeaHousePage.tsx:929,957` → `worker/routes/fortune-tea-house.js:4949`) | ✅ **닿는다** |

두 번째가 핵심이다. `normalizeDraftResult`(`worker/routes/fortune-tea-house.js:2561`)와 `mergeLlmResult` 는 `{ ...fallback, ...draft }` 형태라 **LLM 이 못 채운 필드는 클라 초안의 한국어가 그대로 남는다.** 그 파일 2582-2583 줄 주석이 의도를 명시한다 — "LLM이 통째로 실패해 이 초안이 그대로 degrade 전달될 때도". 즉 **비한국어 사용자가 유료 상담에서 LLM 실패를 만나면 한국어 리딩을 받는다.**

같은 degrade 경로에 워커 자체의 한국어 하드코딩도 있다 — `worker/routes/fortune-tea-house.js:2577` 의 기본 `oneLineAdvice`, `buildFallbackSajuDeepSections`, `buildFallbackCardDetail`.

✅ **고칠 수단은 이미 있다**: 워커는 `getAmbientAiLocale()`(`worker/lib/ai-locale-context.js:27`)로 사용자 로케일을 알고 있고 같은 파일 412줄에서 이미 그것으로 분기한다. 로케일별 degrade 문구를 어디에 둘지(워커 상수 표 vs 클라가 로케일화된 초안을 보냄)가 남은 설계 결정이다.

🔴 **착수 전 사용자 확인이 필요하다** — 유료 흐름의 실패 경로 동작을 바꾸는 일이다.

### 9. 데이터 상수에는 문구가 아닌 문자열이 섞여 있다 — `skipKeys`

컴포넌트가 직접 쓴 `KO` 는 화면 문구만 담지만 `data/` 상수는 아니다. `id: "lotus-moon"` 은 `getTeaHouseCupById` 의 조회 키이고 `particleTone: "pink"` 는 CSS 토큰인데, 가드는 **모든 문자열 leaf** 를 12개 로케일에 요구한다. 그대로 배선하면 사전이 조회 키와 스타일을 덮어쓴다.

```ts
const CUP_SKIP_KEYS = ["id", "particleTone", "accent"];   // 🔴 모듈 최상위 배열 리터럴이어야 한다
const cups = useTeaHouseCopy("teaCups", teaHouseCups, { skipKeys: CUP_SKIP_KEYS });
```

가드도 같은 `skipKeys` 를 파싱한다(안 맞추면 절대 안 쓰이는 키를 채우라고 요구한다). 🔴 상수 선언을 못 읽으면 **조용히 전부 검사하지 않고 실패**시킨다 — 배열을 다른 파일에서 import 하면 그 자리에서 걸린다.

지금까지 쓴 목록: 찻잔 `id`·`particleTone`·`accent` / 십성 `id`·`colorTone` / 입장 씬 `stage`·`actor`·`background`·`speaker`·`mood` / 스토리 스텝 `id`·`stage`·`visual`·`speaker`·`mood`·`pigFrame` / 흐름 카드 `id`·`assetKey`.

### 10. 🔴 `.tsx` 편집이 CRLF 를 떨궈 diff 를 1000줄로 부풀린다

`TeaHouseResultSheet.tsx` 는 저장소에 **CRLF** 로 들어 있다. 편집 도구가 LF 로 다시 쓰면 3줄 수정이 `1012/1008` diff 가 되어 리뷰가 불가능해진다(2026-08-24에 실제로 겪고 되돌렸다). 같은 세션의 다른 tsx 는 멀쩡했고 **차이는 부분 Read 후 편집했다는 것 하나**였다.

- 진단: `git diff --ignore-cr-at-eol <ref> -- <file> --numstat` 이 실제 변경량. 그냥 `--numstat` 과 크게 다르면 개행이 뒤집힌 것
- 복구: `git checkout <ref> -- <file>` 로 원본을 되찾고 **개행을 건드리지 않는 방식**으로 다시 패치(node 로 읽어 `String.replace` 만, 삽입 줄의 개행은 `String.fromCharCode(13)+String.fromCharCode(10)`)
- 커밋 전 `git show --numstat` 으로 항상 확인할 것

## 남은 대상

`components/` 와 `data/` 의 **리터럴 콘텐츠**는 끝났다. 남은 것은 전부 **데이터 모양을 바꿔야** 손댈 수 있다.

| 갈래 | 규모 | 왜 남았나 |
|---|---|---|
| `data/tarotCards.ts` | 11,516자 | 컴포넌트 직접 참조 **0**. 값이 `lib/tarotAdapter`·`lib/buildConsultResult` 를 거쳐서만 화면에 닿는다 |
| `lib/` 전체 | 18,983자 | 전부 순수 함수라 훅을 못 쓴다. `buildConsultResult.ts:30-42` 에 **한국어 조사 엔진**(`hasFinalConsonant`/`subjectParticle`)이 박혀 있다 |
| `data-img-alt` 14개 | — | 정적 셸 마커 도구의 속성 목록 밖. 도구에 속성을 추가할지 손으로 처리할지 미정 |

🔴 **함정 8은 `tarotAlbumStories.ts` 한정으로 해소됐다(PR #1053).** 조립을 `buildTarotAlbumCards(parts)` 라는 순수 함수로 빼고 한국어 템플릿을 `tarotAlbumTemplates` 리터럴로 꺼내, 컴포넌트가 조각마다 `useTeaHouseCopy` 를 걸어 **다시 조립**하게 했다. 조사는 로케일별 템플릿 문장이 각자 품는다.

같은 처방이 `tarotCards.ts`·`lib/` 에도 통할지는 **미검증**이다 — 그쪽은 소비처가 컴포넌트가 아니라 순수 함수(`buildConsultResult`)라 훅을 걸 지점이 없고, 훅 대신 사전을 인자로 주입하려면 호출부 전부를 바꿔야 한다. 착수 전 설계부터 할 것.

**번역 대상이 아닌 것으로 확정된 것**

- `teaHouseLandingCopy`(프롤로그 21문단 포함) — `git grep` 전수 결과 참조처가 `app/admin/cms/_lib/base-values.ts` **하나뿐**이고 그건 CMS 편집 폼이다. 화면에 안 나오므로 번역하면 아무도 안 읽는 사전 값 252개가 늘어난다
- `tenGodLabelToIdMap` 의 한국어 키 — 조회 키다
- `sukuyoRelationshipTypes`/`sukuyoFocusOptions` — `sukuyoCompatibilityAdapter.ts:247` 이 한국어 정규식으로 분기한다
- `visualMotif`(찻잔 6개) — 화면에 나오지만 영어 무드 표기라 12개 로케일 모두 원문 유지
- `yeoniSprites.ts` 의 `label` 18개 — 유일한 소비처 `YeoniDialogueActor.tsx:44-53` 이 `sheet`·`col`·`row` 만 읽는다. 스프라이트 시트 좌표를 고르는 용도이고 화면에 렌더되지 않는다
## 검증

```bash
npm run typecheck
node --test __tests__/ui/fortune-tea-house-i18n.static.test.js
node --test __tests__/ui/fortune-tea-house-mood.static.test.js
npm run test:node          # 위 가드가 이 글롭에 포함된다
npm run i18n:check         # 12개 로케일 키 수 일치
```

사전 키 단위 대조는 `git show HEAD:public/i18n/<loc>.json` 과 작업본을 leaf 키로 펼쳐 비교한다(추가/삭제/값변경을 각각 센다).

## 이 문서가 다루지 않는 것

- vi/hi/es/fr/de/nl/ms 7개 로케일의 실번역 — 사용자가 "나중에 일괄"로 명시한 별도 작업이다. 자동 번역기(`i18n-translate-pending.mjs`)는 Gemini 유료 실호출이라 **허락 없이 돌리지 않는다.**
- `data/teaCups.ts`·`data/story.ts` 등의 콘텐츠 — 함정 2 는 해소됐지만 **훅을 어디서 부를지**를 먼저 정해야 한다(위 「남은 대상」).
