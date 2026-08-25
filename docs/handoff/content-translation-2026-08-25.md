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
| 3a. `loveCodeMvp.ts` 의 캐릭터 표면 4필드 | 1,643자 · 64키 | ✅ **완료** (PR #1133) — 아래 "슬라이스 3a에서 정해진 것" |
| C. UI 크롬 전량 (`LoveSimulationEngine`) | 1,243자 · 113키 | ✅ **완료** (PR #1135) — 아래 "UI 크롬 슬라이스" |
| 3b. `loveCharacterStories.ts` | 26,723자 | ⛔ 미착수 (캐릭터 단위로 쪼갤 것) |
| 4. `loveCodeMvp.ts` 나머지 | 105,015자 | ⛔ 미착수 (시나리오 블록 단위로 쪼갤 것) |

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

### ~~슬라이스 2가 남긴 것~~ — 슬라이스 3a 가 닫았다

~~매칭 문장의 `{name}`·`{archetype}`·`{profileLine}`·`{bestApproach}` 가 한국어를 그대로 받는다.~~
→ ✅ PR #1133. 실측 1,643자(2,560자 추정보다 작았다).

여전히 미조치(저위험): 매칭 결과는 **만들어진 시점의 언어 그대로 state 에 담긴다.** 매칭 후
언어를 바꾸면 카드가 이전 언어를 유지하고, 다시 매칭해야 갱신된다. 고치려면 문장 대신
`키 + 파라미터`를 state 에 담고 렌더 시점에 조립해야 하는데 상태 구조를 바꿔야 해서 미뤘다.

### 🔴 슬라이스 3a에서 정해진 것 — 뒤 슬라이스는 그대로 따라 쓴다

1. **`data/` 상수의 로케일화는 "리터럴 표를 정본으로 세우고 원본이 그걸 펼쳐 쓰는" 모양이다.**
   `LOVE_CHARACTER_COPY_KO`(16명 × 4필드)를 `_data/loveCodeMvp.ts` 에 **객체 리터럴**로 두고,
   `LOVE_CHARACTERS` 의 각 항목이 `...LOVE_CHARACTER_COPY_KO["<id>"]` 로 펼쳐 쓴다.
   사본이 아니라 **유일한 출처**라 드리프트가 구조적으로 불가능하다.
   🔴 `map` 으로 만들어 내지 말 것 — 가드가 AST 로 **리터럴 선언**을 찾아 검사 대상을 정하므로
   파생시키면 "리터럴을 못 찾았다"로 통째로 죽는다.
2. **한 상수에서 번역 대상은 표시 4필드뿐이다.** `id`·`dayMaster`(`병화`)·`element`·`keywords`·
   `matchKeywords`·`sajuMatchProfile` 은 사주 계산 결과와 대조하는 **조회 키**라 한국어로 남는다
   (슬라이스 2의 5번과 같은 부류). 그래서 `skipKeys` 대신 **필드를 아예 분리한 표**를 만들었다 —
   `skipKeys` 로 걷어내려면 스킵 이름을 8개 넘게 적어야 하고 그건 손으로 쓴 대상 목록이 된다.
3. **고유명사 표기는 새로 정하지 말고 이미 나간 것을 따른다.** 캐릭터 이름은 `shellRuntime`
   사전(같은 페이지 `page.tsx` 소개 문단, 키 `f2205`·`f2211`·`f2217`·`f2222`·`f2223`)에 이미
   12개 로케일로 나가 있었다 — **en·zh 는 로마자**(`Kang Tae-jun`), **ja 는 カタカナ**(`カン・テジュン`).
   아키타입도 그중 7개가 이미 번역돼 있어 그대로 가져왔다. `Neo`·`Yeoni` 는 `glossary.json` 의
   `doNotTranslate` 라 en·zh 에서 원형 유지, ja 만 관용 표기(`ネオ`·`ヨニ`)다.
   🔴 **새 캐릭터·지명을 옮기기 전에 `i18n/authored/shellRuntime-*.json` 부터 grep 할 것.**
4. **가드는 파일명을 손으로 적지 않는다.** `__tests__/ui/love-simulation-content-i18n.static.test.js`
   가 `i18n/authored/loveSimulation-*.json` 을 **디렉터리에서 전수 발견**하고, ko 대조 범위도
   한 파일이 아니라 **피처 전체 TS 소스**다. 다음 청크(`-03.json`)는 파일을 만들기만 하면 자동으로
   검사에 든다. scope 집합 단언만 함께 갱신하면 된다(현재 `["characters", "matching"]`).
   음성 테스트 실측 2026-08-25 — 4건 전부 실패 확인: en.json 키 삭제 / ja.json 에 한국어 잔존 /
   저작 ko 를 소스와 불일치 / `characters` 배선 제거.
5. 🔴 **화면이 섞이는 범위를 정직하게 적을 것.** 이 피처의 캐릭터 선택 화면은 아직 생 한국어 JSX
   ("대화할 상대 선택"·"프로필 보기"·"…형 성향과 가장 가까워요")가 그대로 있다 — **UI 축이고
   locale-service 문서 소관이다.** 그래서 지금 비-ko 화면은 *이름·아키타입·소개만* 그 언어이고
   껍데기는 한국어다. 슬라이스 3a 는 그걸 고치지 않았다(감싸지 않는다 — 슬라이스 2의 3번).
6. **하위 컴포넌트의 `alt` 는 남겨 두었다.** `CharacterPortrait`·`CharacterProfileCrop`·
   `CharacterDialogueCrop` 은 `character` 만 받아서 카피를 넘기려면 prop 을 늘려야 한다.
   다음에 이 셋을 건드릴 때 함께 처리할 것(3곳, `LoveSimulationEngine.tsx` 686·703·717 근처).

## 🔴 먼저: 이건 한 세션에 안 끝난다

**실측 2026-08-25(PR #1135 이후, `app/saju/love-simulation` 전체 · 주석 제외)**

| 항목 | 자수 |
|---|---|
| 피처의 한글 총량 | **145,146** |
| 이미 사전에 든 것 (257키 = matching 80 + characters 64 + chrome 113) | **3,790** |
| **남은 것** | **약 141,356** |
| 저작 로케일 4개로 옮기면 | **약 565,000** |

재는 법: `node scripts/…` 가 아니라 아래 한 줄이다(파일별 한글 자수, 주석 제외).
사전에 든 양은 `i18n/authored/loveSimulation-*.json` 의 `ko` 값 한글 자수 합이다.

🔴 **"거의 다 됐다"가 아니다.** 세 슬라이스를 합쳐 끝낸 것이 전체의 **2.6%** 다.

| 파일 | 줄 | 한글 자수 | 무엇 |
|---|---|---|---|
| `app/saju/love-simulation/_data/loveCodeMvp.ts` | 4,620 | **105,015** | 러브 시뮬레이션 시나리오·대사 본문 (캐릭터 표면 4필드 1,643자는 ✅ 완료) |
| `app/saju/love-simulation/_data/loveCharacterStories.ts` | 408 | 26,723 | 캐릭터 서사 |
| ~~`app/saju/love-simulation/_data/scenarios.ts`~~ | 135 | ~~2,148~~ | 🗑️ 참조 0이라 삭제 |
| ~~`app/saju/love-simulation/_utils/loveCharacterMatching.ts`~~ | 158 | 1,432 | ✅ 완료 |
| ~~`src/features/master-love-codex/data/prologue.ts`~~ | 78 | 1,387 | ✅ 완료 |
| ~~`src/features/master-love-codex/data/premium.ts`~~ | 56 | 967 | ✅ 완료 |

여기에 자미두수 해석 엔진 문장(`AdvancedZiweiSectionV2` + `_lib` 의 `PALACE_DEFINITION_MAP`·`STAR_MEANING_MAP`)이 더 있는데, 그쪽은 **의도된 제외**다(아래).

### 🔴 UI 크롬 슬라이스 (PR #1135) — 콘텐츠 축이 아니라 **누수**였다

이 문서는 원래 UI 카피를 locale-service 문서 소관으로 밀어 두었는데, 사용자 지시(2026-08-25)로
"비-ko 화면에 남은 한국어"를 닫는 쪽이 우선이 되어 여기서 함께 처리했다.

1. `LOVE_SIMULATION_COPY_TRANSLATIONS` 는 **ko·en 2개짜리 표**였고 10개 로케일이 en 별칭이었다 —
   ja·zh 사용자가 자기 언어 화면에서 **영어 크롬**을 봤다. 표를 걷어내고
   `useLoveSimCopy("chrome", LOVE_SIMULATION_CHROME_KO)` 로 12개 로케일 사전을 타게 했다.
   🔴 **옛 en 문구 50개는 글자 그대로** `loveSimulation-03.json` 의 en 값으로 옮겼다(문구 변경 0).
2. 그 표에 없던 **생 한국어 약 70곳**(버튼·제목·배지·alt·안내)이 11개 로케일에 한국어로 나가고 있었다.
3. 🔴 **함수 멤버는 사전이 못 덮는다.** `preparingStoryDialogue: (name) => …` 같은 멤버는
   `useScopedCopy` 가 문자열만 갈아끼우므로 그대로 통과한다. `{name}` 템플릿 + `formatTemplate` 로
   바꿔야 한다(`formatTemplate` 은 `_utils/loveCharacterMatching.ts` 에서 export 한다).
4. **하위 컴포넌트가 한국어를 조립하고 있으면 prop 으로 올린다.** `CharacterPortrait` ·
   `CharacterProfileCrop` · `CharacterDialogueCrop` · `MetricBar` 가 `alt`/판정 문구를 안에서
   만들고 있었다 — 부모가 카피를 넘기게 바꿨다.
5. **강조 `<span>` 이 낀 문장은 3조각 키로 나눈다**(`mainMatchLeadPrefix`/`Highlight`/`Suffix`).
   언어에 따라 앞뒤 어느 쪽이 비어도 되게 두었다.
6. 함께 고친 결함: `loveCodeScoringText` 의 폴백이 **ko** 였다 — vi·hi·es·fr·de·nl·ms 7개 로케일이
   관계 지표 라벨과 결과 문안을 한국어로 봤다. 폴백을 en 으로 바꿨다.
   🔴 **다른 피처에도 같은 모양이 있는지 볼 것**: `if (locale === "en" || …) return TABLE[locale]; return TABLE.ko;`
7. 🔴 **가드 구멍을 하나 막았다.** 자리표시자 검사가 저작 파일만 보고 **배포되는 사전은 안 봤다** —
   사전에서 `{index}/{total}` 을 지워도 통과했다(`formatTemplate` 이 빈 문자열로 지우므로 화면에서
   값이 통째로 사라지는데도). 이제 공유 엔진 `__tests__/fixtures/scoped-copy-i18n-guard.js` 가
   사전 값의 자리표시자를 ko 와 대조한다(찻집·인연의 서도 함께 덮인다).
8. 🔴 **건드리면 안 되는 것**: `buildSajuCompatibilityVerdict` 는
   `verify-love-compat-determinism.mjs` 가 시그니처를 **문자 그대로** 단언한다
   (`buildSajuCompatibilityVerdict(profile: CompatibilityProfile)`). 여기 든 한국어
   (`끌림 {n}`·리스크·데이트 팁)를 옮기려면 그 결정론 계약을 먼저 다시 설계해야 한다.
9. **첫 페인트 회귀(수용함)**: 예전에는 `getLoveSimulationCopy(locale)` 가 동기적으로 en 을 줬는데
   이제 사전을 비동기로 읽어 도착 전에는 원문(ko)이 보인다. 같은 파일의 `matching`·`characters` 가
   이미 같은 계약이고 사전 캐시는 모듈 전역이라, 감싸서 이중화하지 않았다(원칙 6).

## 🔴 자동 번역기 — Gemini 는 금지, Workers AI 는 "가능하지만 그냥은 안 된다"

**사용자 제안(2026-08-25): "Cloudflare Workers AI 로 무료 경계선까지 번역하면 좋겠다."**
레포 실측으로 확인한 것과 아직 확인 못 한 것을 나눠 적는다.

**실측으로 확인한 것**
- `worker/wrangler.toml` 에 `[ai] binding = "AI"` 가 있고, `lib/llm-client.ts` 가 Gemini 실패 시
  `env.AI.run` 으로 내려간다. 기본 모델은 `@cf/zai-org/glm-4.7-flash`(131k 컨텍스트,
  `response_format` 지원) → `@cf/meta/llama-3.3-70b-instruct-fp8-fast` 순이다.
- 🔴 **`env.AI.run` 은 워커 런타임 안에서만 존재한다.** 번역기
  `scripts/i18n-translate-pending.mjs` 는 로컬 Node 라 그 바인딩을 못 부른다. 쓰려면
  **REST(`POST /accounts/{account_id}/ai/run/{model}`)** 로 가야 하고, 그건 Workers AI Run 권한이
  붙은 토큰이 필요하다. 레포에 `CF_ACCOUNT_ID`·`CF_API_TOKEN` 이름은 이미 있다.
- 🔴 **CLAUDE.md 절대 규칙 1은 Gemini 와 Workers AI 를 **함께** 지목한다.** 그러므로 Workers AI 로
  바꾼다고 해서 허락이 면제되지 않는다 — ①mock 으로 왜 안 되는지 ②몇 회 ③어떤 키·모델인지 밝혀
  1회 한정 허락을 받아야 하고, 막는 주체는 훅 `guard-costly-commands.mjs` 다.

**아직 확인 못 한 것 (미검증 — 추측으로 적지 않는다)**
- 기존 `CF_API_TOKEN` 에 Workers AI Run 스코프가 있는지. 배포용 토큰이면 대개 없다.
- **모델별 Neuron 소비율.** 무료 허용량(일 단위)을 141,356자 × 4 로케일이 며칠에 나눠 들어가는지는
  **재 보기 전에는 알 수 없다.** 여기 숫자를 지어 적지 말 것.

**그래서 권하는 순서**
1. 토큰 스코프부터 확인한다(대시보드). 없으면 Workers AI Run 전용 토큰을 새로 판다.
2. `scripts/i18n-translate-pending.mjs` 에 `--provider workers-ai` 를 더한다. **파이프라인은 그대로
   재사용한다** — 청크 캐시(중단 재개·재청구 없음), 반환값 검증(키 집합 동일 / 자리표시자 보존 /
   한글 잔존 없음), 실패 청크 3회 재시도. 백엔드만 갈아끼우는 것이 핵심이다.
3. **캘리브레이션 1회**: 50키 × 1로케일만 돌려 실제 Neuron 소비를 읽고, 거기서 하루치 배치 크기를
   역산한다. 그 수치를 이 문서에 날짜와 함께 남긴다.
4. 그 다음에야 일 단위 배치로 돌린다. 🔴 품질은 가드가 못 잡는다 — 기계적 결함(키 누락·자리표시자
   증발·한글 잔존)만 잡힌다. 톤·존대·용어는 로케일별로 표본을 눈으로 봐야 한다.

## ~~자동 번역기를 쓸 수 없다~~ (2026-08-25 갱신 — 위 절로 대체)

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
3. ~~**`loveCodeMvp.ts` 의 캐릭터 표면 4필드**~~ (1,643자) — ✅ 완료(PR #1133).
4. **`loveCharacterStories.ts`** (26,723자) — 캐릭터 단위로 더 잘린다. 캐릭터 N명씩 나눠 여러 PR.
   🔴 **다음 세션은 여기부터.** 저작 파일은 `i18n/authored/loveSimulation-03.json` 으로 잡고,
   가드의 scope 집합 단언에 새 scope 를 더하는 것 말고는 배선할 게 없다(위 3a-4).
   🔴 **옮기기 전에 소비처부터 확인할 것** — `LoveCharacterStorySection.tsx` 가 실제로 무엇을
   렌더하는지 먼저 본다(슬라이스 2의 `scenarios.ts` 는 참조 0이라 번역이 아니라 삭제였다).
5. **`loveCodeMvp.ts` 나머지** (105,015자) — 반드시 **시나리오 블록 단위**로 쪼갠다. 한 PR = 블록 몇 개.
   🔴 **장면 제목은 이미 로케일화됐다고 믿지 말 것**(실측 2026-08-25). `LOVE_SCENE_TITLE_TRANSLATIONS`
   에 실제 문구가 있는 로케일은 **`ko` 하나뿐**이고, 나머지 11개는 `LOVE_SCENE_TITLE_GENERIC` 이
   기계로 만든다 — en 은 `titleKey` 를 단어로 쪼갠 로마자(`Court Sunlight · Chapter 1`), ja·zh 등은
   `ラブコード 3章` 처럼 **장 번호뿐이라 장면 구분이 사라진다.** 제목도 옮길 몫에 든다.
   그 외 남은 몫은 `situation`·`dialogue`·`choices[].text/response/insight` 다.

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
