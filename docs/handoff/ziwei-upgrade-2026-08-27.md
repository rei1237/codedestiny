# 자미두수 업그레이드 인수인계 (2026-08-27)

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. 근거를 못 찾으면 **추측하지 말고 사용자에게 물어라.**

## 0. 왜 하는 작업인가 — 사용자 요구 원문

> "내 서비스의 기본 자미두수의 명반 다지인을 간소는 현재 디자인을 유지하고 상세를 누르면 첨부한 이미지와 같이 더 상세하게 삼방사정, 대한 유년 소한까지도 볼 수 있도록 확장이 가능하도록해주고 현재 궁합 상담은 숨겨져있는데 화면에 기본적으로 표시가 되도록 ui/ux를 개선해줄 계획을 세워줘 그리고 자미두수 상담 자체를 최고의 자미두수 전문가로서 각 분야에 맞는 여러 카테고리를 제공해주고 더 정확도를 높혀줄 수 있도록 업그레이드하고 싶어"

첨부 이미지는 외부 자미두수 명반 사이트의 화면이었다(12궁 격자 + 삼방사정 연결선 + 삼방사정 표 + 대한·소한 표). 그 이미지의 인물 데이터가 **1980-01-01 14:10 남성**이었고, 우리 엔진 계산과 대조하는 데 그대로 썼다.

### 사용자가 고른 범위 (AskUserQuestion 으로 확정)

1. 상세 확장은 **기본 명반 모달 안**에 (셸 단독, `/ziwei/chart` 는 범위 밖)
2. 정보 범위 = 기존 계산분(삼방사정·대한·유년) **+ 소한(小限) 신설**. 장생·박사·장전·세전 12신과 비성사화는 범위 밖
3. 유료 경계 = **차트 사실은 무료, 해석 문장은 기존 유료 유지**
4. 상담은 **카테고리 확장 + 정확도 로직 동시 개선**

원본 계획: `C:\Users\user\.claude\plans\eventual-strolling-parnas.md`

## 1. 이미 끝난 것 — 다시 하지 말 것

### PR #1156 — 기본 명반 간소/상세 + 소한 + 궁합 노출
브랜치 `worktree-ziwei-chart-detail-view` · 워크트리 `.claude/worktrees/ziwei-chart-detail-view` (keep 상태로 남아 있음)

- 한때 **5개 검사 전부 SUCCESS · `mergeStateStatus: CLEAN`** 이었다(2026-08-26 15:45 KST).
- 🔴 **그 뒤 검사가 통째로 사라져 `BLOCKED` 가 됐다.** `statusCheckRollup` 이 0개다.
  원인은 PR CI 런 `32985754586` 의 **런 단위 결론이 `startup_failure`** 라서, 잡 5개가 모두
  success 였는데도 GitHub 이 그 체크들을 붙잡아 두지 않은 것으로 보인다.
  - 내 변경 탓이 아니다 — 같은 현상이 무관한 브랜치에도 있다(`worktree-drop-dead-mobile-hub`
    run `32984369558`, 0s startup_failure).
  - 그 시각 러너 큐가 심하게 밀려 있었다(무관한 런들이 13~38분 queued). 지금은 큐가 풀렸다.
  - 워크플로 파일 자체는 문제가 아니다 — 두 브랜치의 `pr-ci.yml` 을 js-yaml 로 파싱해
    둘 다 정상(jobs 5개, fast 스텝 22/21개)임을 확인했다.
  - **조치: `gh run rerun 32985754586` 을 실행해 뒀다.** 결과는 이어서 하는 세션이 확인할 것.
  - 그래도 검사가 안 붙으면 **close/reopen** 이 다음 수단이다(base 재타게팅은 CI 를 안 깨운다).
- 판정은 언제나 `gh pr view 1156 --json mergeStateStatus,statusCheckRollup` 로 한다.
  `gh run list` 의 런 단위 `startup_failure` 표시만 보고 코드 문제로 오진하지 말 것.

내용:
- `js/saju-engine.js` `calcZiweiPalaces` 에 **소한(小限)** 계산 추가 → 리턴에 `soHan` / `soHanList` (기존 키는 하나도 안 바꿨다)
- `.zw-dashboard[data-zw-view]` 에 간소/상세 상태. 상세 요소는 마크업에 항상 두고 CSS 로 접는다
- 삼방사정 SVG 오버레이 + 삼방사정 표 + 대한·소한·유년 표
- 궁합 카드를 접힌 `<details>` 밖으로 승격, 금액을 원화로 표기, `ZW_COMPAT_COST` 상수 도입
- 신규 가드 `verify:ziwei-sohan`(35) · `verify:ziwei-chart-detail-view`(46), 둘 다 `pr-ci.yml` **fast 잡**에 배선
- `scripts/lib/ziwei-engine-harness.cjs` 신설(엔진 헤드리스 로딩 공용화)
- `sync:public` 산출물 커밋 완료

### PR #1157 — 상담 카테고리 8 → 15종
브랜치 `worktree-ziwei-consult-categories` · 워크트리 `.claude/worktrees/ziwei-consult-categories` (keep 상태)

- 첫 CI 에서 **`verify:sitemap-drift` 로 한 번 빨간불이 났고, 커밋 `789e500e5` 로 고쳐 재실행 중이다.** 최종 결과는 이어서 하는 세션이 `gh pr checks 1157` 로 확인할 것.
- 로컬 검증은 전부 통과: typecheck · lint(error 0) · jest `__tests__/worker/` 158 스위트 1731 테스트 · `verify:ziwei-consult-categories`(146) · `verify:ziwei-ai-consultation-flow` · `verify:ziwei-personality-context` · `verify:ai-prompt-billing-policy` · `verify:paid-feature-billing-policy` · `verify:guard-wiring` · `verify:sitemap-drift`

🔴 **밟은 함정 — `app/**` 라우트를 고치면 sitemap 원장이 무효화된다.**
`app/ziwei-ai/ZiweiAiClient.tsx` 한 줄만 고쳐도 그 라우트의 서명이 바뀌어
`sitemap.xml` · `public/sitemap.xml` · `config/sitemap-lastmod.json` 세 파일이 소스와 어긋난다.
로컬에서 typecheck·lint·jest 를 다 돌려도 **이건 안 걸린다** — 별도 검증기이기 때문이다.

- 증상: CI 가 **"Typecheck and lint" 잡 이름으로** 실패한다. 이름만 보면 타입 오류처럼 보이지만 아니다.
- 진단: `gh run view <runId> --log-failed` 로 **어느 스텝**인지 먼저 볼 것.
- 고치는 법: `npm run sitemap:generate` 를 돌리고 바뀐 세 파일을 **같은 PR 에** 담는다.
- 확인: `npm run verify:sitemap-drift` → `OK — 추적본이 재생성 결과와 일치한다`
- 🔴 **`app/**` 아래 라우트 파일을 건드리는 PR 은 전부 해당한다.** PR-C 는 워커만 만지므로 아마 해당 없지만, 커밋 전에 `verify:sitemap-drift` 를 한 번 돌려 확인할 것.

내용:
- 도달 불가였던 `lawsuit`·`life_direction` 노출 + 신규 5종(`study`·`move`·`property`·`children`·`family`)
- 🔴 기존 `lawsuit` 템플릿의 **삼합궁 오기 수정**(천이궁의 삼합은 부부궁·복덕궁인데 재백궁·관록궁으로 적혀 있었다)
- 🔴 분류 키워드의 한 글자 `"법"` 제거(`방법`·`요법`까지 물어 평범한 질문을 송사로 보냈다)
- 신규 가드 `verify:ziwei-consult-categories`, `pr-ci.yml` fast 잡에 배선

## 2. 남은 작업

### (A) PR-C — 상담 정확도 로직 · **PR #1157 머지 후에 시작**

`worker/routes/ziwei-ai.js` 와 `worker/lib/ziwei-ai-prompt-templates.mjs` 를 PR #1157 과 같이 만지므로 **머지 뒤 main 에서 분기**한다.

| # | 할 일 | 대상 파일 |
|---|---|---|
| C-1 | 궁간(宮干) 계산을 워커 명반에 추가 → `palaces[].stem` | `worker/lib/ziwei-ai-chart.js` |
| C-2 | 궁간으로 **대한사화** 계산 → `majorLuck[].transformations` | 〃 |
| C-3 | 궁간사화가 그 궁 자신의 별에 떨어지면 **자화(自化)** 표시 | 〃 |
| C-4 | 소한을 워커에도 이식 → `minorLuck` (셸과 **같은 상수 표를 공유**할 것, 두 벌로 적으면 반드시 갈라진다) | 〃 + 공용 모듈 |
| C-5 | 삼방사정 회조·묘왕함약(brightness)·사화 비입/자화를 프롬프트 사실 줄에 추가 | `buildCanonicalZiweiFacts()` (`worker/routes/ziwei-ai.js:1067` 근처) |
| C-6 | "삼방사정 미언급"·"명암 미언급"을 그라운딩 이슈 검출에 추가 | `enforceZiweiChartFacts()` (같은 파일 `:1164` 근처) |
| C-7 | `SECTION_RULES` 의 `triad_axis`·`twelve_palaces` 규칙에 회조/자화 언급 명시 | 같은 파일 `:140` 근처 |

**왜 필요한가 (실측):** `worker/lib/ziwei-ai-chart.js` 는 궁간을 **안 내보낸다** — `calculateBureau()` 안에서 `mingStem` 을 쓰고 버린다. 그래서 상담 프롬프트가 대한사화도 자화도 못 읽는다. 셸 엔진(`js/saju-engine.js:3162~3163`)은 오호둔으로 12궁 전부의 궁간을 이미 갖고 있으니 그 규칙을 그대로 옮기면 된다.

🔴 **줄번호는 PR #1157 머지 전 기준이다.** 그 PR 이 같은 파일에 245줄을 더하므로, 머지 후에는 **줄번호가 아니라 심볼 이름으로 찾을 것**.

### (B) 사용자 판단이 필요한 발견 3건 — 임의로 고치지 말 것

1. **`/ziwei/chart` 의 유료/무료 표기가 어긋나 있다.**
   - `app/components/AdvancedZiweiSectionV2.tsx:1152` 주석: "심화 자미두수 명반은 무료 열람 — 영구 해금 잠금 모델 제거", 실제로 게이트 렌더 없음
   - 그런데 `worker/lib/paid-feature-registry.js` 는 `navigateToZiweiChart: "premium-ziwei"`(200코인 / 20,000원 영구잠금)를, `app/_lib/serviceFeatureRegistry.ts:3924` 는 `accessType:"paid"` 를 들고 있다
   - 어느 쪽이 의도인지 **사용자에게 물어야 한다**. 결제 표기 문제라 방치하면 사용자 혼선이다.

2. **심화 명반 엔진에 별 4개가 없다 — 정확도 관점에서 가장 큰 구멍.**
   - `app/_lib/ziwei-engine.ts:210~225` 는 보좌성 5종(문창·문곡·좌보·우필·록존)과 살성 4종(경양·타라·지공·지겁)만 배치하고 **화성·영성·천괴·천월이 없다**
   - 워커 엔진(`worker/lib/ziwei-ai-chart.js:260` `placeAssistantAndMaleficStars`)과 셸 엔진(`js/saju-engine.js:3234~3252`)에는 넷 다 있다
   - 결과: **같은 사람의 명반이 화면마다 다르게 나온다.** `/ziwei/chart` 는 사화·삼방사정을 표시하면서도 화기가 화성/영성과 겹치는 구간을 구조적으로 못 읽는다
   - 별개 화면이므로 PR-C 에 묶지 말고 **별도 PR 로 하는 것을 권한다**(사용자 확인 필요)

3. **`scripts/verify-ziwei-brightness-constraints.cjs` 가 배선 없이 45건 중 22건 실패 상태다.**
   - PR #1156 에서 공용 하네스로 리팩터했지만(출력 바이트 동일 확인) **낡은 기대값은 손대지 않았다**
   - 고칠지, 은퇴시킬지, 기대값을 다시 뜰지는 사용자 판단

## 3. 방법 — 무엇을 근거로 판정하는가

### 명반 계산을 검증하는 법 (정본 예시)

`scripts/verify-ziwei-sohan.mjs` 가 정본이다. 핵심은 **외부 명반 하나를 통째로 대조해 값을 박는 것**이다.

```js
// scripts/verify-ziwei-sohan.mjs 의 REFERENCE 상수
const REFERENCE = {
  label: "1980-01-01 14:10 남성 (외부 명반 대조본)",
  input: { gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 },
  secha: "己未", juInfo: "목3국(木三局)", mingBranch: "巳",
  daHan: [[3, 12, "己巳", "명궁"], [13, 22, "戊辰", "형제궁"], /* … 7구간 */],
  soHan: [[2023, "癸卯", 45, "酉", "관록궁"], /* … 7년 */],
};
```

엔진을 Node 에서 돌리는 법 (`scripts/lib/ziwei-engine-harness.cjs`):
```js
const { calcChart } = require("./scripts/lib/ziwei-engine-harness.cjs");
const zw = calcChart({ gender: "M", year: 1980, month: 1, day: 1, hour: 14, minute: 10 });
```
🔴 성별은 `calcZiweiPalaces` 의 **인자가 아니라 전역 `GENDER`** 에서 읽는다. 하네스가 대신 세워 준다.

### 렌더 결과를 검증하는 법

`scripts/verify-ziwei-chart-detail-view.mjs` 가 정본이다. 문자열 grep 이 아니라 `renderZiwei` / `_renderZwPanel` 을 헤드리스로 돌려 나온 HTML 을 jsdom 으로 파싱한다. 이 화면은 템플릿 리터럴과 `html +=` 가 뒤섞여 있어서 리터럴 검색으로는 "문자열은 남아 있는데 다른 가지에서 렌더된다"를 못 거른다.

🔴 **궁합 카드는 바깥 래퍼가 아니라 입력 폼(`#zwCompatBirthDate`)을 기준으로 봐야 한다.** 처음에 마커를 바깥 `section` 에 달고 그것만 검사했더니, 안쪽에 `<details>` 를 다시 끼워도 가드가 통과했다(음성 테스트에서 실제로 통과했다).

### 궁 위치를 판정하는 법 (손으로 적지 말 것)

궁은 명궁에서 **역행**으로 배치된다(`b_i = mengIdx - i`). 그래서 지지 +4·+8·+6 은 offset −4·−8·−6 이다.

```js
// scripts/verify-ziwei-consult-categories.mjs
const PALACE_RING = ["명궁","형제궁","부부궁","자녀궁","재백궁","질액궁","천이궁","노복궁","관록궁","전택궁","복덕궁","부모궁"];
// 궁 offset i 의 대궁 = PALACE_RING[(i-6+12)%12], 삼합 = [(i-4)%12, (i-8)%12]
```
이 계산식은 기존 정답 템플릿 3개(love·career·money)로 교차 검증했다. `lawsuit` 의 오기도 이걸로 나왔다.

### 가드를 쓴 뒤에는 반드시 음성 테스트

규칙을 하나씩 되돌려 verify 가 실제로 빨간불이 되는지 본다. 🔴 **복원은 메모리 버퍼로** — `git checkout` 을 쓰면 그 파일의 미커밋 작업이 통째로 날아간다.
PR #1156·#1157 에서 이 방식으로 회귀 13종을 확인했고, 그중 하나(궁합 재접기)는 **첫 가드가 못 잡아서** 가드를 고쳤다.

## 4. 이 레포 고유의 작업 규칙

- 🔴 **파일을 고치기 전에 `EnterWorktree`.** 기본 작업 디렉터리는 여러 세션이 동시에 쓴다.
- 🔴 **`js/**`·`styles/**`·`index.html` 을 고쳤으면 `npm run sync:public` 을 돌리고 산출물을 같은 커밋에 담는다.** 캐시버스트 해시가 회전해 미러 13개가 함께 바뀐다 — `index.html` 의 86줄 diff 는 전부 해시이며 비해시 변경이 0줄인지 확인할 것.
- 🔴 **새 `verify:*` 는 같은 PR 에 배선한다.** `verify:guard-wiring` 이 티어 무관 항상 돌아 미배선 검증기를 즉시 실패시킨다. 이번 두 가드는 `pr-ci.yml` **fast 잡**에 넣었다 — 입력이 `js/saju-engine.js` 나 React 파일이라 티어가 fast/standard 이고, critical 잡에 두면 정작 지켜야 할 경로에서 안 깨어난다.
- 🔴 **`main` 직접 작업·머지 금지. 머지는 사용자가 한다.** 프로덕션 승격(`workflow_dispatch mode=production`)은 사용자가 명시적으로 요청한 그때 한 번만.
- 🔴 **LLM 실호출 금지.** 프롬프트를 고쳐도 Gemini/Workers AI 를 부르지 않는다. mock 정본 `scripts/verify-mindscan-reading.mjs`.
- **워크트리에 `node_modules` 가 없다.** `node scripts/…` 는 상위 탐색으로 돌지만 `npm run lint`·`jest` 는 정션이 필요하다:
  `cmd /c mklink /J "<워크트리>\node_modules" "D:\Development\code-destiny\node_modules"`
  🔴 **끝나면 반드시 `cmd /c rmdir "<워크트리>\node_modules"` 로 링크부터 끊는다.** 안 그러면 공유 설치본을 지울 위험이 있다.
- **워크트리에서 jest:** `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node <경로>`. 안 주면 ESM 파일이 "Cannot use import statement outside a module" 로 죽어 **내 코드가 깨진 것처럼 보인다.**
- **개행:** `js/saju-engine.js` 는 LF, `.mjs`/`.cjs`/`.tsx` 는 작업 트리에서 **CRLF** 다. 스크립트로 편집할 때 LF 로 통일했으면 그대로 되돌려 놓아야 3줄 수정이 300줄 diff 로 안 부푼다.
- **Bash 툴이 백슬래시를 한 겹 벗긴다.** 정규식이 든 패치 스크립트를 heredoc 으로 넘기면 `\\.` 가 `\.` 로 줄어 앵커가 조용히 빗나간다 — Write 툴로 파일을 쓸 것.
- **Git Bash 가 `<ref>:<path>` 를 망가뜨린다.** `git show origin/브랜치:파일` 이 실패하면 PowerShell 을 쓸 것.

## 5. 검증 명령

### PR-C 를 하면 돌릴 것
```
npm run typecheck
npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node __tests__/worker/
npm run verify:ziwei-consult-categories
npm run verify:ziwei-ai-consultation-flow
npm run verify:ziwei-personality-context
npm run verify:ziwei-deep-report-flow
npm run verify:ai-prompt-billing-policy
npm run verify:paid-feature-billing-policy
npm run verify:guard-wiring
```

### `app/**` 아래 라우트 파일을 만졌으면 반드시
```
npm run sitemap:generate     # 바뀐 3파일을 같은 PR 에 담는다
npm run verify:sitemap-drift
```
🔴 이걸 빠뜨리면 CI 가 **"Typecheck and lint" 이름으로** 실패한다(실제 원인은 sitemap 이다).
PR #1157 이 정확히 이걸로 한 번 막혔다.

### 셸(`js/saju-engine.js`)을 만졌으면 추가로
```
npm run sync:public          # 산출물 커밋 필수
npm run verify:ziwei-sohan
npm run verify:ziwei-chart-detail-view
npm run verify:public-mirror-fresh   # 🔴 커밋 후에 돌려야 판정한다(미커밋이면 fail-closed)
npm run verify:paid-gate-ui
npm run verify:payment-choice-parity
npm run verify:mobile-detail-nonintrusive
npm run verify:hero-contrast
node scripts/verify-payment-freeze.mjs
npm run test:node
```

### 두 개 이상 PR 로 나뉘었으면 마지막 `main` 에서
```
npm run check:critical
```

## 6. 첫 30분에 할 일

1. `gh pr checks 1157` — sitemap 수정(`789e500e5`) 후 재실행 결과를 확인한다. **미확인 상태로 넘긴 것이다.** 실패하면 `gh run view <runId> --log-failed` 로 **어느 스텝**인지부터 볼 것(잡 이름이 원인을 가린다)
2. `gh pr view 1156 --json mergeStateStatus,statusCheckRollup` — 재실행으로 검사가 다시 붙었는지 확인. 여전히 0개면 close/reopen 으로 CI 를 깨운다. 머지는 **사용자가 한다**
3. 위 §2-(B) 발견 3건을 사용자에게 보고하고 처리 방향을 묻는다
4. PR #1157 이 머지된 뒤에 PR-C 를 `origin/main` 에서 분기해 시작한다

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.** 특히 자미두수 규칙(궁 배치·사화·소한)은 유파에 따라 갈리므로, 레포 안에 대조 근거가 없으면 외부 명반과 대조하거나 사용자에게 확인한 뒤에만 값을 박는다.
