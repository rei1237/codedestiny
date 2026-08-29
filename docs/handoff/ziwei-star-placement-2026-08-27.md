---
status: active
updated: 2026-08-27
next: "§9-(D) 남은 2건(이 PR 범위 밖) — 🔴 §3 을 처음부터 다시 조사하지 말 것"
---

# 자미두수 별 배치 정합 (PR-E) 인수인계 — 2026-08-27

> 🟢 **이 인수인계는 소진됐다.** 아래 §9(결과)에 무엇이 어떻게 결론 났는지 있다.
> 남은 것은 §9-(D) 두 건뿐이고 둘 다 이 PR 범위 밖이다. 다시 §3 을 처음부터 조사하지 말 것.

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 앞선 인수인계: [ziwei-upgrade-2026-08-27.md](ziwei-upgrade-2026-08-27.md) (§2-(A) PR-C 와 §2-(B) 는 **전부 끝났다**)

## 0. 왜 하는 작업인가 — 사용자 요구 원문

> "내 서비스의 기본 자미두수의 명반 다지인을 간소는 현재 디자인을 유지하고 상세를 누르면 첨부한 이미지와 같이 더 상세하게 삼방사정, 대한 유년 소한까지도 볼 수 있도록 확장이 가능하도록해주고 현재 궁합 상담은 숨겨져있는데 화면에 기본적으로 표시가 되도록 ui/ux를 개선해줄 계획을 세워줘 그리고 자미두수 상담 자체를 최고의 자미두수 전문가로서 각 분야에 맞는 여러 카테고리를 제공해주고 더 정확도를 높혀줄 수 있도록 업그레이드하고 싶어"

PR-E 는 그중 **"정확도를 높인다"** 의 남은 조각이다: **같은 사람의 명반이 화면마다 다르게 나온다.**

이 작업은 사용자가 AskUserQuestion 으로 직접 고른 것이다 — *"별도 PR 로, PR-C 다음에"*.

## 1. 이미 끝난 것 — 다시 하지 말 것

| PR | 내용 | 상태 |
|---|---|---|
| #1156 | 기본 명반 간소/상세 토글 · 소한 신설 · 궁합 카드 노출 | **머지됨** `295b6e777` |
| #1157 | 상담 카테고리 8 → 15종 · 삼합궁 오기 수정 | **머지됨** `dc458180a` |
| #1158 | 인수인계 문서 | **머지됨** `14d411c64` |
| **#1160** | **PR-C** — 궁간·대한사화·자화·소한을 명반에 싣고 프롬프트가 읽게 함 | **머지됨** `0133f47a4` |
| **#1162** | **PR-D** — `/ziwei/chart` 무료 표기 정정 · 명암 가드 기호 버그 | **머지됨** `f03b16309` |

기준 커밋: **`main` = `f03b16309`** (2026-08-27). 아래 줄번호는 전부 그 커밋 실측이다.

### PR-C 가 남긴 것 중 PR-E 가 쓸 것

- `scripts/verify-ziwei-worker-chart-facts.mjs` — **워커 명반을 셸 엔진과 인덱스로 대조하는 가드(114건)**. PR-E 도 같은 방식으로 붙이면 된다
- `scripts/lib/ziwei-engine-harness.cjs` — 셸 엔진을 Node 에서 헤드리스로 돌린다: `calcChart({gender:"M",year:1980,month:1,day:1,hour:14,minute:10})`
- `lib/ziwei-minor-limit.js` — 셸·워커·앱이 함께 import 하는 상수 모듈의 **선례**. 🔴 키를 지지 문자가 아니라 **인덱스(0~11)** 로 잡는다(셸은 한자 `寅`, 워커는 한글 `인`, 앱은 한자)

## 2. 남은 작업 — 세 엔진의 별이 어긋난다

### 2-1. 실측: 엔진별 배치 별 목록

| 엔진 | 파일 | 별 수 |
|---|---|---|
| 앱(심화) | [app/_lib/ziwei-engine.ts:210-226](../../app/_lib/ziwei-engine.ts#L210-L226) | **23** |
| 워커(AI 상담) | [worker/lib/ziwei-ai-chart.js](../../worker/lib/ziwei-ai-chart.js) `placeAssistantAndMaleficStars` | **29** |
| 셸(기본 명반) | [js/saju-engine.js:3210-3253](../../js/saju-engine.js#L3210-L3253) | **28** |

주성 14개는 셋 다 같다. 갈리는 것은 보좌성·살성이다:

| 별 | 앱 | 워커 | 셸 |
|---|:---:|:---:|:---:|
| 문창·문곡·좌보·우필·경양·타라·지공·지겁 | ✅ | ✅ | ✅ |
| 록존/녹존 | ⚠️ **`록존`** | `녹존` | `녹존` |
| **천괴** | ❌ | ✅ | ✅ |
| **천월** | ❌ | ✅ | ✅ |
| **화성** | ❌ | ✅ | ✅ |
| **영성** | ❌ | ⚠️ 배치가 셸과 다름 | ✅ |
| **천마** | ❌ | ❌ | ✅ |
| 함지·천요 | ❌ | ✅ | ❌ |

### 2-2. 앱 엔진은 자기 자신과 모순이다 — 데이터는 이미 다 있다

- [app/_lib/ziwei-strength.ts:99-106](../../app/_lib/ziwei-strength.ts#L99-L106) 이 **천괴·천월·천마·화성·영성 5개의 12지 고전 명암표를 완비**하고 있다. 배치만 빠졌다
- [app/_lib/ziwei-engine.ts:314](../../app/_lib/ziwei-engine.ts#L314) `LUCKY_STAR_SET` 이 이미 `천괴·천월·천마` 를 담고 있다 — **배치하지도 않는 별을 행운성으로 분류**한다
- 🔴 **`록존` vs `녹존` 키 불일치**: 엔진은 [ziwei-engine.ts:219](../../app/_lib/ziwei-engine.ts#L219) 에서 `"록존"` 으로 넣는데 고전표 키는 [ziwei-strength.ts:99](../../app/_lib/ziwei-strength.ts#L99) 의 `녹존` 이다. 조회에 실패해 [ziwei-engine.ts:265-279](../../app/_lib/ziwei-engine.ts#L265-L279) 의 지지 인덱스 폴백으로 떨어진다 — **별개 버그이며 이번에 같이 고칠 것**

### 2-3. 영향 화면 2곳

`app/_lib/ziwei-engine.ts` 의 `calcZiweiPalaces` → `calculateZiweiChart` 를 타는 곳:

1. **`/ziwei/chart`** — `app/ziwei/chart/page.tsx` → `ZiweiChartClientLoader.tsx` → `app/components/AdvancedZiweiSectionV2.tsx:15-19`
   "심화"를 표방하면서 셸의 **기본** 명반(28별)보다 5별 적다
2. **`/destiny-compass`** — `app/destiny-compass/_engine/adapters/ziweiAdapter.ts` (`baseWeight: 0.2`), `registry.ts` 의 `ADAPTERS`

🔴 **회귀 위험**: [ziwei-engine.ts:375-379](../../app/_lib/ziwei-engine.ts#L375-L379) `palaceScore` 가 보좌성/살성 **개수**를 센다(`aux.length * 3`, `bad.length * 4`). 별을 5개 더하면 궁 점수가 바뀌고, `ziweiAdapter.ts:56,61,141` 이 `p.score` 를 정규화해 쓰므로 **destiny-compass 의 방향 점수와 순위까지 함께 바뀐다.** 착수 전에 `regression-scout` 로 훑고, 사용자에게 선보고할 것(CLAUDE.md 원칙 7).

## 3. 🔴 착수 전에 풀어야 할 정본 문제 2건

인수인계 원칙: **자미두수 규칙은 유파에 따라 갈리므로, 레포 안에 대조 근거가 없으면 값을 박지 말 것.**

### (A) 영성(鈴星) 기점 — 워커가 셸과 다르다

**셸** [js/saju-engine.js:3242-3253](../../js/saju-engine.js#L3242-L3253) — 화성·영성이 **각자 기점을 갖고 둘 다 `+ hourIdx`**:
```js
var hlStart = {
    '寅':{h:1, l:3}, '午':{h:1, l:3}, '戌':{h:1, l:3},      // 寅午戌 → 화성 丑, 영성 卯
    '申':{h:2, l:10}, '子':{h:2, l:10}, '辰':{h:2, l:10},   // 申子辰 → 화성 寅, 영성 戌
    '巳':{h:3, l:10}, '酉':{h:3, l:10}, '丑':{h:3, l:10},   // 巳酉丑 → 화성 卯, 영성 戌
    '亥':{h:9, l:10}, '卯':{h:9, l:10}, '未':{h:9, l:10}    // 亥卯未 → 화성 酉, 영성 戌
};
var huoZhi  = (hlStart[yearZhi].h + hourIdx) % 12;
var lingZhi = (hlStart[yearZhi].l + hourIdx) % 12;
```

**워커** [worker/lib/ziwei-ai-chart.js:291-293](../../worker/lib/ziwei-ai-chart.js#L291-L293) — 영성이 **화성 기점에서 역행**:
```js
const fireStart = [2, 3, 1, 9][branchIndex % 4] || 2;
addStar(shells, fireStart + hourIdx, "화성", "malefic");
addStar(shells, fireStart - hourIdx, "영성", "malefic");   // 🔴 여기
```

- **화성은 두 엔진이 일치한다.** 워커의 `[2,3,1,9][branchIndex % 4]` 는 子→寅(2)·丑→卯(3)·寅→丑(1)·卯→酉(9) 로 셸의 `h` 와 삼합군별로 같은 값이다
- **영성만 갈린다.** 워커에는 셸의 `l` 에 해당하는 별도 기점 표가 아예 없다

**지금까지 모은 근거(전부 레포 내부):**
- ✅ 셸 편: [scripts/verify-ziwei-brightness-constraints.cjs:93,110](../../scripts/verify-ziwei-brightness-constraints.cjs#L93) 이 C·D 케이스의 영성 명암을 `○|◎` 로 기대하고 **그 두 건은 통과한다**(2026-08-27 실측, PR-D 의 기호 버그 수정 이후). 셸 배치를 지지하지만 **명암이 우연히 맞을 수도 있어 결정적이지는 않다**
- ❌ 워커 편: 워커의 `- hourIdx` 를 지지하는 근거는 **레포 안에 하나도 없다**. 가드도 테스트도 없다

🔴 **미검증**: 어느 쪽이 정본인지 외부 명반으로 확인하지 않았다. **PR-C 의 대조 인물(1980-01-01 14:10 남성) 명반을 다시 떠서 영성 위치를 보면 바로 갈린다.** 그 대조가 안 되면 사용자에게 물을 것.

→ 판정이 나면 **앱뿐 아니라 워커도 고쳐야 한다.** 워커가 틀린 쪽이면 그건 유료 AI 상담 명반의 정확도 결함이므로, PR-E 범위를 넘더라도 사용자에게 보고할 것.

### (B) 천마(天馬) — 셸에만 있고, 명암 가드가 4/4 전패로 잡는다

**셸** [js/saju-engine.js:3226-3228](../../js/saju-engine.js#L3226-L3228):
```js
var maMap = {'申':2,'子':2,'辰':2, '亥':5,'卯':5,'未':5, '寅':8,'午':8,'戌':8, '巳':11,'酉':11,'丑':11};
// 申子辰→寅, 亥卯未→巳, 寅午戌→申, 巳酉丑→亥  (역마 규칙)
```
**워커에는 천마 배치가 없다.** 다만 명암표에는 `천마` 행이 있다([ziwei-ai-chart.js:84](../../worker/lib/ziwei-ai-chart.js#L84)).

🔴 **`verify-ziwei-brightness-constraints.cjs` 가 천마를 4개 케이스에서 4건 모두 실패로 잡는다**(A·C·D 는 △ 기대에 ▲, B 는 X 기대에 △). 별 하나가 전 케이스 실패라 **배치 규칙이나 명암표 둘 중 하나가 틀렸다는 신호**다.

- 위 `maMap` 자체는 표준 역마 규칙으로 보인다 → 명암 **기대값** 쪽이 낡았을 가능성이 더 크다
- 그러나 그 45개 기대값에는 **출처 주석이 전혀 없다**(PR-D 에서 확인·기록함). 이것만으로는 못 가른다

→ 천마를 앱에 넣기 전에 이 4/4 전패를 먼저 풀 것. 안 풀리면 **천마만 빼고 4개(천괴·천월·화성·영성)를 먼저 넣는 것도 방법**이다.

## 4. 🔴 시도했다가 반증된 것 — 반복하지 말 것

| 시도/주장 | 결과 |
|---|---|
| "결손 별은 4개(화성·영성·천괴·천월)" — 인수인계 §2-(B)-2 | **틀렸다. 5개다.** 천마가 빠져 있었다 |
| "`serviceFeatureRegistry.ts` 의 `accessType` 은 소비처 0곳" — 인수인계 §2-(B)-1 | **틀렸다.** `app/app/AppHomeClient.tsx:177` 이 무료/유료 배지를 그리고, `scripts/verify-adsense-route-policy.mjs:139` 가 유료 라우트 집합을 뽑는다. PR-D 에서 정정 |
| "`/ziwei/chart` 에 결제창이 뜬다" | **아니다.** 진입 게이트가 없다. 유료는 페이지 안쪽 `ziwei-deep-pdf` 뿐 |
| 명암 가드 실패 22건이 전부 실제 불일치 | **아니다.** 3건은 엔진의 ASCII `O` 를 전각 `○` 로 비교하던 스크립트 버그였다(PR-D 에서 수정, 22→19) |
| 소한 100세분을 워커 명반에 그대로 싣기 | **하지 말 것.** `worker/routes/ziwei-ai.js` 가 `JSON.stringify(chart)` 를 섹션 그룹마다 반복 전송한다 — 명반 JSON 이 9,937 → **18,418자**가 됐다. PR-C 는 대상 연도 ±5년 창으로 제한했다(`MINOR_LUCK_PROMPT_SPAN_YEARS`) |
| 대한사화를 `{label,star,palace}` 객체로 싣기 | **하지 말 것.** 같은 이유로 2,386자가 늘었다. 기존 `palace.transformations` 와 같은 `"화록:무곡(재백궁)"` 문자열 표기를 쓸 것 |

## 5. 방법 — 무엇을 근거로 판정하는가

### 정본 가드 3개

| 파일 | 무엇을 하는가 |
|---|---|
| `scripts/verify-ziwei-worker-chart-facts.mjs` | **PR-E 가 그대로 따를 것.** 셸을 하네스로 돌려 워커와 **인덱스로** 대조(표기 축이 다르므로). 양성/음성 쌍, fail-closed 매핑 검사 포함 |
| `scripts/verify-ziwei-sohan.mjs` | 외부 명반 1건을 통째로 박아 대조하는 방식의 정본. **기대값에 출처를 주석으로 남기는 형식**을 여기서 베낄 것 |
| `scripts/verify-ziwei-personality-context.mjs` | 모듈 모킹 없이 손으로 세운 chart 를 프로덕션 함수에 넘기고 실패를 누적해 일괄 보고 |

### 대조 인물 (PR-C 와 같은 사람)

```
1980-01-01 14:10 KST, 남성 · 세차 己未 · 목3국 · 명궁 巳
대한: [3-12 己巳 명궁] [13-22 戊辰 형제궁] [23-32 丁卯 부부궁] [33-42 丙寅 자녀궁]
      [43-52 丁丑 재백궁] [53-62 丙子 질액궁] [63-72 乙亥 천이궁]
소한: 2023 癸卯 45세 酉 관록궁 · 2026 丙午 48세 子 질액궁
```
셸 구동: `const { calcChart } = require("./scripts/lib/ziwei-engine-harness.cjs")` · 🔴 성별은 인자가 아니라 전역 `GENDER` 에서 읽는다(하네스가 대신 세운다).

### 가드를 쓴 뒤에는 반드시 음성 테스트

규칙을 하나씩 되돌려 verify 가 실제로 빨간불이 되는지 본다. 🔴 **복원은 메모리 버퍼로** — `git checkout` 을 쓰면 그 파일의 미커밋 작업이 통째로 날아간다.
PR-C 에서 이 방식으로 11종을 확인했다(궁간 제거 / 소한 창 해제 / 자화 판정 반전 / 소한 방향 뒤집기 / 셸 표 오기 / 검출 개념어 비우기 ×2 / 매핑 누락 / 사실 줄 제거 / 섹션 규칙 원복 / 나이 기준 분리).

## 6. 이 레포 고유의 작업 규칙

- 🔴 **파일을 고치기 전에 `EnterWorktree`.** 기본 작업 디렉터리는 여러 세션이 동시에 쓴다
- 🔴 **`origin/main` 에서 분기한다.** 로컬 `main` 은 자주 뒤처져 있다 — PR-C 착수 때 로컬은 `21db091f`, origin 은 `14d411c6` 이었다
- **워크트리에 `node_modules` 가 없다.** `node scripts/…` 는 상위 탐색으로 돌지만 `npm run lint`·jest 는 정션이 필요하다:
  `cmd /c mklink /J "<워크트리>\node_modules" "D:\Development\code-destiny\node_modules"` (Git Bash 에서는 `cmd /c` 가 먹지 않는다 — **PowerShell 툴로 실행할 것**)
  🔴 끝나면 **링크부터 끊는다**: `cmd /c rmdir "<워크트리>\node_modules"`
- **워크트리에서 jest**: `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand`
- 🔴 **워크트리 세션의 Bash 툴은 복잡한 명령을 거부한다** — heredoc·다중 파이프·`/tmp` 경로가 걸린다. 임시 스크립트는 **Write 툴로 워크트리 안에** 쓰고 `node <파일>` 로 돌릴 것
- **`app/**` 아래를 만졌으면** `npm run sitemap:generate` → `npm run verify:sitemap-drift`. 빠뜨리면 CI 가 **"Typecheck and lint" 이름으로** 실패한다(원인은 sitemap 이다)
- 🔴 **새 `verify:*` 는 같은 PR 에 배선한다.** `verify:guard-wiring` 이 티어 무관 항상 돈다. ziwei 가드는 전부 `pr-ci.yml` **fast 잡**이다 — `scripts/resolve-ci-tier.mjs` 는 `worker/routes/ziwei-ai.js` 만 critical 로 못 박으므로 critical 에 두면 정작 지켜야 할 경로에서 잠든다
- 🔴 **`main` 직접 작업·머지 금지. 머지는 사용자가 한다.** 프로덕션 승격은 사용자가 명시적으로 요청한 그때 한 번만
- 🔴 **LLM 실호출 금지.** 앱 엔진은 LLM 을 안 부르지만, 워커 프롬프트를 건드리면 mock 정본 `scripts/verify-mindscan-reading.mjs` 를 따를 것

## 7. 검증 명령

```
npm run typecheck
npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand
npm run test:node
npm run verify:ziwei-worker-chart-facts     # PR-C 가 만든 가드 — 워커를 고치면 필수
npm run verify:ziwei-sohan
npm run verify:ziwei-island                 # 명반 서명 불변 확인
npm run verify:ziwei-ai-consultation-flow
npm run verify:ziwei-personality-context
npm run verify:analysis-basis-contract
npm run verify:guard-wiring
npm run sitemap:generate && npm run verify:sitemap-drift    # app/** 수정 시
node scripts/verify-ziwei-brightness-constraints.cjs        # 미배선 — 손으로 돌릴 것
```

현재 기준선(2026-08-27 `f03b16309` 실측):
- jest **176 스위트 / 1,970 테스트 통과**
- `test:node` **551 통과 / 0 실패**
- `verify-ziwei-brightness-constraints.cjs` **45건 중 19건 실패**(미배선, 의도된 상태 — PR-D 가 파일 머리에 사유를 박아 뒀다)

## 8. 첫 30분에 할 일

1. `origin/main` 을 fetch 하고 거기서 `EnterWorktree`. 로컬 main 을 믿지 말 것
2. **§3-(A) 영성 정본을 먼저 판정한다.** 1980-01-01 14:10 남성 외부 명반을 떠서 영성 위치를 셸/워커 값과 대조. 대조가 안 되면 **사용자에게 묻고 멈춘다** — 이게 안 풀리면 앱에 영성을 넣을 수 없다
3. **§3-(B) 천마 4/4 전패를 판정한다.** 안 풀리면 천마를 빼고 4개만 넣는 안을 사용자에게 제시
4. `regression-scout` 로 `palaceScore` → `/destiny-compass` 영향 경로를 훑고 **사용자에게 선보고**(원칙 7)
5. 확정된 별만 [app/_lib/ziwei-engine.ts:210-226](../../app/_lib/ziwei-engine.ts#L210-L226) 에 추가 + `록존` → `녹존` 통일
6. 가드 신설 — 세 엔진의 별 목록이 어긋나면 실패시킨다. 🔴 손으로 적은 배열이 아니라 **소스에서 전수 발견해 미분류를 실패**시킬 것(원칙 10)

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.** 자미두수 규칙은 유파에 따라 갈린다.

---

## 9. 결과 (2026-08-27 · `worktree-ziwei-star-parity`)

기준 커밋 `f03b16309` 에서 작업했다. 아래 수치는 전부 그 워크트리 실측이다.

### (A) §3-(A) 영성 정본 — **셸이 맞다. 워커를 고쳤다.**

유파 논쟁 없이 갈렸다. 워커는 `fireStart + hourIdx`(화성) / `fireStart - hourIdx`(영성) 로
**같은 기점**을 썼다. 그러면 `2 × hourIdx ≡ 0 (mod 12)` 인 **자시·오시 출생(전체의 1/6)에서
화성과 영성이 같은 궁에 겹친다.** 실측으로 1991-09-02 11:45 과 2000-01-01 12:00 이 둘 다
화성·영성 모두 卯 였다.

보강 근거 셋: ① 명암 가드 C 케이스는 셸 배치 → `묘(◎)` 통과 / 워커 배치 → `함(X)` 실패
② 워커에 영성 전용 기점 표가 없고 `- hourIdx` 를 지지하는 가드·테스트가 리포에 0건
③ 셸 표가 고전 규칙(寅午戌→화성丑·영성卯, 나머지 삼합국→영성戌)과 일치.

→ 기점표를 `lib/ziwei-fire-bell.js` 로 빼고 워커·앱이 함께 import 한다(`lib/ziwei-minor-limit.js` 선례).
   셸은 브라우저 클래식 스크립트라 import 가 불가능하므로 리터럴 `hlStart` 를 두고,
   새 가드가 그 리터럴을 파싱해 공용 상수와 대조한다.

### (B) §3-(B) 천마 4/4 전패 — **배치 문제가 아니었다. 천마를 그대로 넣었다.**

인수인계가 세운 두 가설(배치 규칙 / 명암표)이 **둘 다 아니다.** 셋째 원인이 있었다:
셸의 `zwComputeStarStrength`([js/saju-engine.js:15373](../../js/saju-engine.js#L15373))는 고전표를
그냥 읽지 않고 **튜닝 점수 모델**(`zwComputeBrightnessScore` — 계절 보정·별/지지 바이어스·
상호작용 바이어스 합산 후 `classicalBlend` 혼합)을 쓴다. 천마에는 `lunarMonth` 계절 보정까지 붙는다.

**결정적 증거**: A·B·D 케이스는 천마가 셋 다 **巳** 인데 기대값이 A=`△`, B=`X`, D=`△` 로 갈린다.
배치 규칙은 같은 지지에 서로 다른 기대값을 만들 수 없다 → 45개 기대값은 배치가 아니라 그 튜닝 모델을 겨눈 것이다.
`maMap`(표준 역마 규칙)은 무죄다.

그리고 **앱 엔진은 그 튜닝 모델을 쓰지 않는다** — `getBrightness` 는 고전표를 직접 조회한다.
그래서 천마를 앱에 넣어도 이 가드와 무관하다(寅묘◎ · 巳리▲ · 申왕◎ · 亥리▲ 로 결정론적).

🔴 `verify-ziwei-brightness-constraints.cjs` 의 45건 중 19건 실패는 **그대로 남아 있다**(변경 없음).
그것은 셸의 튜닝 명암 모델 대 출처 없는 기대값의 문제이고, 별 배치와는 축이 다르다.

### (C) 한 것

| 파일 | 내용 |
|---|---|
| `lib/ziwei-fire-bell.js` (신설) | 화성·영성 기점 정본. 인덱스 기반, 셸·워커·앱 공용 |
| `worker/lib/ziwei-ai-chart.js` | 영성 기점 수정 · **천마 신설**(명암표 행만 있고 배치가 없었다) · 카탈로그 갱신 |
| `app/_lib/ziwei-engine.ts` | 천괴·천월·천마·화성·영성 **5개 추가**(23 → 28별) · `록존`→`녹존` 통일 · **오행국 명칭 오기 수정** |
| `scripts/verify-ziwei-star-parity.mjs` (신설) | 3-엔진 별 정합 가드. fast 잡에 배선 |
| `.github/workflows/pr-ci.yml` · `paid-flow-gates.yml` | 가드 배선 · `lib/ziwei-fire-bell.js` 트리거 등록 |

**오행국 명칭 오기**(조사 중 발견): 앱 `juLabels` 가 `{2:목3국, 3:화6국, 6:수2국}` 으로 2·3·6 이
서로 밀려 있었다. 셸(`juNames`)·워커(`bureauName`)는 둘 다 `{2:수2국, 3:목3국, 6:화6국}` 이다.
실측: 1980-01-01 14:10 명반이 셸·워커 `목3국` 인데 앱만 `화6국` 이었고, **그러면서 자기 대한은
3-12(=목3국)로 그렸다** — 앱 출력끼리 모순이었다. 가드 ⑥ 이 이제 라벨과 대한 시작 나이를 함께 본다.

### (D) 🔴 남은 것 — 이 PR 범위 밖, 아직 안 고쳤다

1. **`destiny-island.html` 의 `ASSIST_MEANING` 키가 `록존`** ([destiny-island.html:1968](../../destiny-island.html#L1968)).
   워커 명반은 `녹존` 을 내므로 섬 상세의 보좌성 설명에서 **녹존 한 줄이 조용히 누락**된다
   ([destiny-island.html:2019](../../destiny-island.html#L2019) 의 `if(meaning)`). 이번에 워커에 천마를
   추가했으므로 **천마 설명도 없다**(칩은 그려지고 설명 문단만 안 나온다 — 기능 손상은 아니다).
   손대면 `npm run sync:public` 으로 `public/destiny-island.html` 미러를 함께 커밋해야 한다.

2. **`1997-02-10` 만 세 엔진의 음력일이 갈린다.** 셸에는
   [js/saju-engine.js:849-856](../../js/saju-engine.js#L849) 의 `KASI_LOCAL_PATCH_SEED` 에 그 하루짜리
   덮어쓰기(음력 1월 3일)가 있고, 워커·앱은 lunar-javascript(음력 1월 4일)를 쓴다. 음력일이 하루
   다르면 자미 위치가 밀려 **14주성이 통째로 어긋난다**(실측: 셸 辰 vs 앱·워커 丑, 14별 전부 -3칸).
   어느 달력이 맞는지는 자미두수가 아니라 **역법** 문제라 이 작업의 판정 범위 밖으로 뒀다.
   🔴 그 날짜는 새 가드의 케이스에서 뺐고(빼지 않으면 달력을 검사하게 된다), 대신 가드 ⑤ 가
   케이스 전체에서 셸·워커의 음력월·음력일 일치를 요구한다 — 시드가 하나라도 케이스 범위 안으로
   들어오면 그때 빨간불이 된다. `verify-ziwei-brightness-constraints.cjs` 의 C 케이스가 이 날짜다.

### (E) 회귀 실측 — destiny-compass

별 5개 추가는 `palaceScore` 의 `aux.length*3` / `bad.length*4` 를 통해 궁 점수를 바꾸고,
`ziweiAdapter` 가 `maxScore` 로 정규화해 쓰므로 방향 점수가 함께 움직인다(`baseWeight: 0.2`).
변경 전/후를 같은 프로세스에서 실측했다:

| 대조 인물 | 바뀐 것 |
|---|---|
| 1980-01-01 14:10 M | `rest` 0.973 → 0.993 (+0.020). 궁 순위 동일 |
| 1991-09-02 11:45 F | `study` 0.512 → 0.483 (−0.029). 궁 순위 동일 |
| 2000-01-01 12:00 F | `love` 0.836 → 0.781 (−0.055) · **약한 궁 형제궁 → 부모궁** |

8개 방향 중 6개는 이미 1.000 에 포화해 있어 움직이지 않았다. 고정 기대값을 깨는 것은 없다 —
`verify-destiny-compass-determinism.mjs` 는 소스 텍스트 단언뿐이고(점수 핀 0건), jest 에도
compass 점수 스냅샷이 없다(검색 범위: `__tests__/`, `scripts/verify-*`).
사용자가 AskUserQuestion 으로 "변동을 그대로 수용"을 골랐다.

워커 명반 JSON 은 9,645 → **9,664자**(+19). §4 가 경고한 프롬프트 비대와는 자릿수가 다르다.

### (F) 검증

`typecheck` ✅ · `lint` 오류 0(경고는 무관 파일의 기존분) · jest **176 스위트 / 1,970 테스트 통과**
· `test:node` **551 통과 / 0 실패** — 셋 다 §7 기준선과 같다.
verify 11종 전부 통과: `ziwei-star-parity` · `ziwei-worker-chart-facts` · `ziwei-sohan` ·
`ziwei-island` · `ziwei-ai-consultation-flow` · `ziwei-personality-context` · `ziwei-chart-detail-view` ·
`ziwei-consult-categories` · `analysis-basis-contract` · `guard-wiring` · `no-nested-retry`.
`sitemap:generate` → `verify:sitemap-drift` ✅.

**음성 테스트 9종 전부 빨간불 확인**(복원은 메모리 버퍼, `git checkout` 미사용) — 목록은
`scripts/verify-ziwei-star-parity.mjs` 머리말에 있다.
