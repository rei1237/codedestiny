# 운명의 찻집(fortune-tea-house) 다국어화 (2026-08-23)

> 이 문서만 읽고 이어서 시작할 수 있게 쓴다. 앞선 세션의 판단 근거와 실패한 접근까지 남긴다.

## 현재 상태

| 갈래 | 규모 | 진행 |
|---|---|---|
| `components/` UI 크롬 | 811개 문자열 / 33개 파일 | **183개 / 24개 파일 완료** |
| `data/` | 114,223자 | 미착수 |
| `lib/` | 56,335자 | 미착수 |

PR: **#1020** (`feat/fortune-tea-house-chrome-i18n`) — 커밋 7개.

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

### 2. TalkingPigYeoni 의 표정이 한국어 정규식에 걸려 있다 — 데이터 배치의 지뢰

`pickPigExpressionFrame` 은 스텝에 `mood` 가 없으면 **대사의 한국어 키워드로 표정을 고른다**:

```ts
if (mood === "playful" || /꿀|달고/.test(text)) …
if (mood === "comfort" || /괜찮|안심|덜 아프|기다/.test(text)) …
if (mood === "thinking" || /향|마음|질문|선택|망설/.test(text)) …
```

**`data/story.ts`·`data/entryStory.ts` 의 대사를 로케일화하는 순간, mood 없는 스텝은 전부 조용히 `welcome` 표정으로 주저앉는다.** 에러도 안 나고 테스트도 안 깨진다.

고칠 자리는 번역된 텍스트 위의 정규식이 아니라 **데이터에서 `mood` 를 필수로 만드는 것**이다. 데이터 배치를 시작하기 전에 이것부터 처리할 것.

### 3. `ko-KR` 하드코딩 3곳이 남아 있다

로케일과 무관하게 날짜·정렬이 한국식으로 나온다. `TeaHouseHistoryPanel` 의 것은 이미 `useLocale()` 로 고쳤고, 남은 것:

| 파일 | 줄 | 내용 |
|---|---|---|
| `DestinyCafeTarotAlbum.tsx` | 144 | `localeCompare(b.titleKo, "ko-KR")` — 정렬 기준 |
| `DestinyCafeTarotAlbum.tsx` | 1800 | `new Intl.DateTimeFormat("ko-KR", …)` |
| `TeaHouseResultSheet.tsx` | 120 | `new Date().toLocaleString("ko-KR")` |

해당 파일 배치에서 함께 고칠 것. 정본은 `useLocale()`(`lib/i18n/useT.ts`).

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

## 남은 대상

| 파일 | 문자열 |
|---|---|
| `TeaHouseResultSheet.tsx` | 160 |
| `QuestionInputScene.tsx` | 157 |
| `DestinyCafeTarotAlbum.tsx` | 101 |
| `HoneyDropRewardOverlay.tsx` | 79 |
| `TeaHouseSukuyoResultPanel.tsx` | 51 |
| `TeaHouseSajuResultPanel.tsx` | 45 |
| 디버그 페이지 4종 | ~13 (내부용 — 후순위) |

그다음이 `data/`(114,223자)·`lib/`(56,335자)이고, **함정 2를 먼저 처리해야 한다.**

## 검증

```bash
npm run typecheck
node --test __tests__/ui/fortune-tea-house-i18n.static.test.js
npm run test:node          # 위 가드가 이 글롭에 포함된다
npm run i18n:check         # 12개 로케일 키 수 일치
```

사전 키 단위 대조는 `git show HEAD:public/i18n/<loc>.json` 과 작업본을 leaf 키로 펼쳐 비교한다(추가/삭제/값변경을 각각 센다).

## 이 문서가 다루지 않는 것

- vi/hi/es/fr/de/nl/ms 7개 로케일의 실번역 — 사용자가 "나중에 일괄"로 명시한 별도 작업이다. 자동 번역기(`i18n-translate-pending.mjs`)는 Gemini 유료 실호출이라 **허락 없이 돌리지 않는다.**
- `data/teaCups.ts`·`data/story.ts` 등의 콘텐츠 — 위 함정 2 해결이 선행돼야 한다.
