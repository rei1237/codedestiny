---
status: active
updated: 2026-09-19
next: "기본 숙요점·기본 자미두수 결과 화면 개선은 Phase 1~4 가 전부 커밋·푸시됐고 main CI 도 07f8f1522 에서 복구됐다. 남은 것은 이 문서의 '남은 문제' 8건이며 서로 독립이라 아무거나 하나만 집어 시작해도 된다. 🔴 먼저 §0 '시작 전 5분'을 읽을 것 — 이 저장소는 (1) 정적 셸 index.html + js/** 바닐라가 무료 결과를 그리고 app/** Next.js 는 SEO 랜딩뿐이며, (2) styles/**·js/** 를 고치면 public/ 미러를 같은 커밋에 넣어야 하고, (3) 캐시 키를 손으로 찍으면 안 되고 반드시 npm run sync:public 으로만 찍는다(이 규칙을 어겨서 2026-09-19 에 main 이 한 번 레드가 됐다). 우선순위 추천은 2번(가드 CI 배선) — 이번 버그가 출시된 직접 원인이고 나머지 7건보다 재발 방지 효과가 크다."
---

# 기본 숙요점 · 기본 자미두수 결과 화면 — 남은 문제 인수인계

2026-09-19 작성. 앞선 작업의 범위는 "**기본(무료) 숙요점·자미두수 결과 화면**의 정보구조·인터랙션·가독성·모바일 UX 개선, 단 계산 결과는 절대 불변"이었다. Phase 1~4 는 끝났다. 이 문서는 **그 과정에서 발견했지만 범위 밖이라 손대지 않은 것들**을 다음 세션이 이어받을 수 있게 정리한 것이다.

---

## §0 시작 전 5분 — 이걸 모르면 헛수고한다

### 이 화면들은 Next.js 라우트가 아니다

`app/**/sukuyo*`·`app/**/ziwei*` 는 **전부 SEO 랜딩**이다. 사용자가 실제로 보는 무료 결과는 **정적 셸 `index.html` 안의 모달**이고, 바닐라 JS 2층 구조로 그려진다.

| 층 | 파일 | 역할 |
|---|---|---|
| **Layer A — 엔진** | `js/saju-engine.js` 의 `renderZiwei()` · `js/saju-engine-tarot-sukuyo-quantum.js` 의 `renderSukuyo()` | HTML **문자열**을 만들어 `innerHTML` 로 꽂는다 |
| **Layer B — 표현** | [js/core/saju/basicFortunePresentation.js](../../js/core/saju/basicFortunePresentation.js) | 그 살아 있는 DOM 을 `.fr-*` 리포트 디자인 시스템으로 **재배치**한다 |

Layer B 1행 주석이 계약을 못박는다: `/* Presentation only. Existing engines, gates and event handlers own all results/actions. */` — **UI 개선은 Layer B 와 [styles/basic-fortune-library.css](../../styles/basic-fortune-library.css) 안에서 끝낸다. 계산 파일은 열지 않는다.**

### 노드는 옮기기만 하고 다시 만들지 않는다

Layer B 가 엔진 산출물을 재배치할 때 **`appendChild` 로 같은 노드 객체를 이동**시킨다. 새로 만들면 엔진이 심어 둔 `onclick`·`data-sy*`·`data-zw*` 가 전부 날아가고, `scripts/verify-sukuyo-reading-house.mjs` 가 컨트롤/ID 를 바이트 단위로 스냅샷 비교하다 바로 문다.

### 🔴 캐시 키를 손으로 찍지 않는다

`index.html` 은 자산을 `?v=build-<내용해시>` 로 핀한다. 이 해시는 **`npm run sync:public` 이 파일 내용에서 계산**한다. 손으로 찍으면 그 파일 자신의 해시가 바뀌어 `index.html` 의 핀이 즉시 낡는다.

2026-09-19 에 실제로 이걸 어겼다. `73c53b0b0` 에서 `js/app.js` 를 손으로 재스탬프했더니 `js/app.js` 자신의 해시가 `65e5d07d1989 → 40d99f5bb8e7` 로 바뀌었고, `index.html` 의 핀은 옛 해시에 남아 **main 이 레드**가 됐다(`Main drift watchdog`·`PR CI` 의 `verify:public-mirror-fresh`). `07f8f1522` 에서 생성기를 돌려 7개 파일(`index.html` + `public/{,en/,ja/,zh/,zh-tw/,static/}index.html`)을 맞춰 복구했다.

**규칙: 소스를 고쳤으면 커밋 직전 마지막 단계로 `npm run sync:public` 을 돌리고 그 산출물을 같은 커밋에 담는다.** 머지 직후에도 다시 돌린다(머지가 소스 해시를 바꾸므로).

### 미러 규율

`styles/*.css` ↔ `public/styles/*.css`, `js/**` ↔ `public/js/**` 는 **바이트 동일**이어야 한다. `sync:public` 이 생성하고 `verify:style-sync`·`verify:public-mirror-fresh` 가 비교한다.

### 🔴 줄바꿈이 파일마다 다르다 (실측)

| 파일 | CRLF | LF |
|---|---|---|
| `scripts/verify-sukuyo-reading-house.mjs` | 96 | 96 (**CRLF 전용**) |
| `scripts/verify-basic-fortune-library.mjs` | 569 | 569 (**CRLF 전용**) |
| `js/core/saju/basicFortunePresentation.js` | 0 | 810 (**LF 전용**) |
| `styles/basic-fortune-library.css` | 0 | 521 (**LF 전용**) |

**CRLF 파일을 Edit 툴이나 `sed` 로 고치면 그 줄만 LF 가 되어 diff 가 오염된다.** node 스크립트로 `utf8` 읽기·쓰기해서 패치할 것.

### 공유 체크아웃이다

`git worktree list` 를 보면 메인 체크아웃 + 워크트리 10여 개가 붙어 있고, **다른 세션의 미커밋 작업이 같은 작업 트리에 살아 있다**(2026-09-19 시점 `marketing/` 44개). 그래서:

- 🔴 `git reset --hard` · `git stash` · `git checkout --` **금지.** 옆 세션 작업을 복구 불가로 지운다.
- `git add .` 금지. **경로를 명시해서** 스테이징한다.
- `npm run verify:public-mirror-fresh` 는 트리가 더러우면 "판정 불가 → 실패"로 빠진다. 로컬 판정이 막히면 대신 **`sync:public` 을 돌리고 `git status` 전후를 비교**해 새로 더러워진 파일만 본다(§1 검증 명령 참고).

---

## §1 끝난 것 — 되돌릴 일이 생기면 이 커밋들

| 커밋 | 내용 | 되돌리기 |
|---|---|---|
| `e84348a1f` | 🔴 "자세히 보기"가 빈 상자를 여는 버그 근본 수정 | `git revert e84348a1f` |
| `1a79ac73a` | 모바일 명반 세로 리스트 + `.fr-map-toggle` 전환 부활 | 독립 |
| `cb32d27bc` | 자미두수 히어로 키워드 · 고정 섹션 내비 · scroll-spy | 독립 |
| `b32dc8d13` | 숙요점 무료/유료 구역 분리 + 본명숙 산문 접기 (18파일) | 독립 |
| `07f8f1522` | 위 §0 의 캐시 핀 복구 | 되돌리면 main 이 다시 레드 |

각 커밋은 단독으로 되돌려도 다른 기능이 흔들리지 않게 잘라 놓았다.

### 참고로 알아 둘 근본 원인 하나

"자세히 보기를 눌렀는데 아무것도 안 나온다"의 정체는 **CSS 특이도 + 노드 이동의 조합**이었다. 엔진이 `.zw-fact-tables.zw-detail-only` 를 만들고, 엔진 인라인 CSS 가 `#ziweiModalSection .zw-dashboard:not([data-zw-view="detail"]) .zw-detail-only { display:none !important }` 로 숨기는데, Layer B 가 **바로 그 숨겨진 노드를 `<details>` 로 감싸 `.zw-dashboard` 밑에 도로 붙여서** 규칙이 여전히 매치됐다. `<details>` 는 정상적으로 열리고 `aria-expanded="true"` 까지 되는데 내용물만 `display:none` 이었다.

수정은 **감싸기 전에 클래스를 떼는 것**이다(버튼 숨기기가 아니라 내용이 실제로 보이게). 같은 유형 재발을 막으려고 `foldIfContent()` 를 만들어 두었다 — 내용이 비었거나 안 보이면 **서랍 자체를 만들지 않는다.** 새 접기 UI 를 추가할 땐 `fold()` 말고 이걸 쓸 것.

⚠️ `foldIfContent()` 에는 함정이 하나 있다. `syReadingBody(traits, labels, collapsible)` 의 **세 번째 인자**가 그것이다. 이 함수는 호출부가 둘인데 요구가 정반대다:

- `basicFortunePresentation.js:139` — 본명숙 결과. 길어서 접어야 한다 → `true`
- `basicFortunePresentation.js:222` — 27숙 도감 리더. 사용자가 "이 숙을 읽겠다"고 **방금 누른** 화면이라 여기서 또 접으면 방금 요청한 글에 닿는 데 한 번 더 눌러야 한다 → 인자 없음(펼친 채)

처음에 이걸 구분 안 하고 둘 다 접었다가 `verify-sukuyo-reading-house.mjs:72` 의 `innerText().length > 400` 에 걸렸다. **Playwright 의 `innerText()` 는 렌더된 텍스트라 닫힌 `<details>` 는 `<summary>` 만 센다** — 이 가드가 그래서 물었다.

---

## §2 남은 문제

각 항목은 서로 독립이다. 아무거나 하나만 집어서 해도 된다. 추천 순서는 **2 → 1 → 3** 이고 나머지는 청소 성격이다.

---

### 1. 🟠 `verify:style-sync` 가 빨간데 CI 가 영영 못 잡는다

**증상**
```
[verify-style-sync] content mismatch: styles/static-policy.css != public/styles/static-policy.css
[verify-style-sync] FAILED: style source/mirror parity is broken.
```

**확인된 것 (2026-09-19 실측)**
- root `styles/static-policy.css` = **9,711 바이트**, 미러 `public/styles/static-policy.css` = **18,918 바이트**.
- 두 파일 모두 **`origin/main` 커밋본과 바이트 동일**하다. 즉 내 작업 트리의 오염이 아니라 **origin/main 자체가 이 상태**다. 선행 결함이다.
- `grep -rn "style-sync" .github/workflows/` → **참조 0건**. 이 가드는 CI 에서 한 번도 돌지 않는다. 그래서 main 이 green 인 채로 이 불일치가 유지된다.

**미확인**
- 어느 쪽이 정본인지. 미러가 두 배인 걸 보면 `sync:public` 의 **연결(concatenate) 단계**가 root 원본에 무언가를 덧붙여 미러를 만드는 것으로 보이는데(`[static-policies] generated 6 pages from current content` 로그가 근처에서 나온다), 그렇다면 **바이트 비교 가드와 생성 규칙이 서로 모순**이다. 생성기 쪽을 읽어서 확정해야 한다.
- 이 불일치가 **언제부터** 인지. `git log --follow` 로 추적 필요.

**볼 곳**
- [scripts/verify-style-sync.mjs](../../scripts/verify-style-sync.mjs) — 바이트 비교 로직
- [scripts/sync-legacy-static-to-public.mjs](../../scripts/sync-legacy-static-to-public.mjs) — `static-policy` 를 생성하는 단계
- `styles/static-policy.css` · `public/styles/static-policy.css`

**검증**
```powershell
npm run verify:style-sync
git log --oneline --follow -- styles/static-policy.css | head
git show origin/main:public/styles/static-policy.css | Measure-Object -Character
```

**위험도 🟠** — 고치는 방향에 따라 갈린다. 가드의 예외 목록에 넣는 건 GREEN, 생성 규칙을 바꾸는 건 배포 산출물이 바뀌므로 RED.
🔴 **CI 게이트 추가는 지시 없이 하지 않는다**(CLAUDE.md). 배선하려면 사용자에게 먼저 물을 것.

---

### 2. 🟠 Playwright 가드 2개가 CI 에 배선되어 있지 않다 — 이번 버그가 출시된 직접 원인

**증상** — 아래 두 가드는 **무료 결과 화면의 최종 DOM 을 보는 유일한 도구**인데 아무도 돌리지 않는다.

| 가드 | 줄 수 | 무엇을 지키나 |
|---|---|---|
| `scripts/verify-basic-fortune-library.mjs` | 569 | §20 계산 불변(`:131-134` `assert.deepEqual(stable(data), stable(previous))`), 빈 서랍 금지(`:152-172`), 유료 경계(`:181-186`), 비-ko 로케일에 한글 혼입 금지(`:339`) |
| `scripts/verify-sukuyo-reading-house.mjs` | 96 | 컨트롤/ID 보존(`:61-62`), 유료 산문 차단(`:63-68`), 27숙 전수 순회(`:70-74`), 360·390·430·1280 오버플로(`:83-89`), 유료 구역 경계(신규) |

**확인된 것 (2026-09-19 실측)**
```
grep -rnE "verify-sukuyo-reading-house|verify-basic-fortune-library" .github/workflows/ package.json
→ 참조 0건
```
npm 스크립트도 없어서 **`node scripts/….mjs` 로 직접 돌려야만** 실행된다.

`verify:ziwei-chart-detail-view` 는 CI 에 있지만 **JSDOM 에서 `renderZiwei()` 만 돌리고 `BasicFortunePresentation.ziwei()` 를 호출하지 않는다.** 그래서 "정상적으로 숨겨진 노드"가 "사용자가 누르는 빈 서랍"으로 바뀌는 **재배치 단계가 가드에 아예 보이지 않았다.** 이게 §1 의 버그가 출시된 이유다.

**미확인**
- CI 러너에 Playwright 브라우저가 설치돼 있는지. 없으면 `npx playwright install chromium` 스텝이 필요하고 러너 시간이 늘어난다.
- 두 가드의 실행 시간(로컬 기준 숙요점 가드는 수십 초). CI 예산에 맞는지.

**검증 (지금 당장 돌려볼 수 있다)**
```powershell
node scripts/verify-sukuyo-reading-house.mjs
node scripts/verify-basic-fortune-library.mjs
```
2026-09-19 `07f8f1522` 기준 숙요점 가드 실측 결과:
```json
{"originalControlsPreserved":true,"mansions":27,"articles":26,"natalUnchanged":true,"viewports":[360,390,430,1280],"errors":[]}
```

**위험도 🔴 (CI 변경)** — 🔴 **CI 게이트 추가는 지시 없이 하지 않는다**(CLAUDE.md, ci-gates-scope). **사용자에게 먼저 제안하고 승인을 받을 것.** 승인 전까지는 "돌려보고 결과 보고"까지만 한다.

---

### 3. 🟡 계산해 놓고 화면에 쓰지 않는 값들

`syBuildBasicReading()`([js/saju-engine-tarot-sukuyo-quantum.js:10037~](../../js/saju-engine-tarot-sukuyo-quantum.js)) 가 만들지만 아무도 읽지 않는 것들이다. **전부 이미 계산된 값이라 새 데이터를 지어내지 않고도 화면을 풍부하게 만들 수 있다.**

| 값 | 생성 위치 | 현재 운명 |
|---|---|---|
| `hero.title` | `:10107-10110` | 아무도 읽지 않음 (`hero.subtitle` 만 `:10380` 에서 쓰임) |
| `hero.mansionLabel` | `:10110` | 아무도 읽지 않음 |
| `summaryCards[0]` (`"나의 본명숙"`) | `:10113-10114` | **`:10375-10378` 에서 명시적으로 걸러짐** — `filter(cardItem => cardItem.label !== '나의 본명숙')` |
| `summaryCards[*].tone` (점수 밴드) | `:10113~` | 마크업이 `label`/`value`/`note` 만 그려서 버려짐 |
| `dailyPrescription.luckyColor` | `:10225` | 기본 화면 미사용 |
| `icon` · `talent` | `:11352-11353` (`_syLastSukuyoBasicResult` 페이로드) | 저장만 되고 소비 0건. ⚠️ `talent` 는 **88~95 사이 점수**라 한 줄 요약으로 못 쓴다 |
| `sData.celebs` | 엔진 | 기본 화면 미사용 |

**🔴 페이로드에 필드를 추가하지 말 것.** `verify-basic-fortune-library.mjs:131-134` 가 `window._syLastSukuyoBasicResult` 를 통째로 스냅샷 비교한다(`assert.deepEqual(stable(data), stable(previous))`). **필드가 하나만 늘어도 "calculation result changed" 로 실패한다.** 필요하면 페이로드 대신 **DOM 에서 읽어라** — Phase 4 가 그렇게 했다.

**볼 곳** — [js/core/saju/basicFortunePresentation.js](../../js/core/saju/basicFortunePresentation.js) 의 `sukuyo()`

**검증**
```powershell
node scripts/verify-basic-fortune-library.mjs   # :131-134 가 계산 불변을 문다
node scripts/verify-sukuyo-reading-house.mjs
```

**위험도 🟢** — 표현 계층 안에서 끝나고, 계산 불변은 가드가 증명한다.

---

### 4. ⚪ `syReadingLabels()` 인덱스 32·33 은 유료 경계다 — 구현하지 말 것

`'회복과 생활 리듬'`(32) · `'흐름을 활용하는 방법'`(33) 이 **5개 로케일 전부에** 작성돼 있는데 참조 0건이다. 유료 `health`/`timing` 형질용 라벨이다.

🔴 `traits` 의 `hidden`·`karma`·`mantra`·`health`·`timing` 은 **결제 렌더러 소유**다. [js/core/saju/basicFortunePresentation.js:153](../../js/core/saju/basicFortunePresentation.js) 이 그렇게 명시하고 `verify-sukuyo-reading-house.mjs:63-68` 이 능동적으로 단언한다. **무료 화면에 올리면 가드가 물고, 물지 않더라도 유료 콘텐츠 무료 유출이다.**

**기록만 하고 손대지 않는다.** 라벨을 지우는 것도 하지 말 것 — 유료 렌더러가 나중에 쓸 수 있다.

---

### 5. 🟡 숙요점 인라인 `<style>` 약 530줄 + 소비되지 않는 커스텀 속성 11개

`js/saju-engine-tarot-sukuyo-quantum.js:10775-10777` 이 `<style id="sy-main-style">` 을 주입한다. `:10779` 가 `--sy-*` 커스텀 속성 11개를 선언하는데 **그 파일 안 소비 0건**이다.

**미확인** — 다른 파일(별도 CSS, 다른 엔진)이 그 변수를 읽는지 전수 확인 안 했다. 🔴 **지우기 전에 `deletion-auditor` 또는 소스·테스트·`scripts/verify-*` 3면 grep**(CLAUDE.md 코딩 원칙 9). 미러(`public/js/**`)도 포함할 것.

**위험도 🟡** — 삭제는 되돌리기 쉽지만 3면 확인 전엔 하지 않는다.

---

### 6. 🟡 `app/components/ZiweiChartPage.tsx` 가 고아다

**확인된 것 (2026-09-19 실측)**
```
git grep -n "ZiweiChartPage" -- '*.ts' '*.tsx' '*.js' '*.mjs'
→ app/components/ZiweiChartPage.tsx:29:export default function ZiweiChartPage() {
→ app/ziwei/chart/page.tsx:66:export default function ZiweiChartPage() {
```
`app/components/` 쪽은 **자기 정의 한 줄뿐, 임포트하는 곳이 없다.** `app/ziwei/chart/page.tsx` 의 동명 함수는 **별개 구현**이다(같은 이름일 뿐).

**미확인** — 문자열 참조·동적 import·테스트 픽스처. 🔴 **"임포터 0" 은 죽음의 증거가 아니다**(CLAUDE.md 원칙 9). 삭제 전 3면 확인.

**위험도 🟡**

---

### 7. 🟡 §18 로딩 스켈레톤 — 모달 열림 경로가 Layer B 밖이다

**증상** — 결과가 뜨기 전 맨 텍스트 상태가 노출된다.

**확인된 것** — 모달을 여는 코드는 [js/core/index-inline-runtime.js:8798](../../js/core/index-inline-runtime.js) 이고 **Layer B 밖**이다. 그래서 `basicFortunePresentation.js` 만 고쳐서는 스켈레톤을 못 넣는다.

실측 `readyMs`: 숙요점 **약 1,174ms** / 자미두수 **1,385~1,692ms** / 점성술 **894~1,632ms**. 스켈레톤을 넣을 만한 길이이긴 하다.

**미확인** — `index-inline-runtime.js` 를 고치면 인라인 스크립트 해시 청크와 CSP 에 영향이 있는지. 이 파일은 `sync:public` 이 캐시 키를 다시 찍는 대상이기도 하다(위 로그의 `Rewrote root asset refs in 2 file(s)`).

**⚠️ 인위적 지연은 넣지 않는다.** `.fr-overlay *` 가 이미 애니메이션을 끄므로 스켈레톤도 애니메이션 없이 CSS 로만.

**위험도 🟠** — 정적 셸 런타임을 건드리므로 GREEN 이 아니다.

---

### 8. ⚪ 방향성(A→B) 관계 표시는 유료 흐름 소유 — 무료 화면에 만들 수 없다

지향 관계 모델(`SY_ROLE_PROFILE` `:7607`, `syBuildRelationDirection` `:7708`, `SY_DIRECTION_PRESENTATION` 의 `→ 내가 상대에게 작용` / `← 상대가 나에게 작용`)은 **전부 궁합(결제) 흐름**에 속하고 `:17981-18058` 에서 유료로만 렌더된다.

**무료 화면에는 상대방 입력 자체가 없다.** 개인화된 방향성을 무료로 옮기려면 결제 경계를 넘어야 하므로 하지 않는다. 궁합 화면의 방향 표시는 `verify:sukuyo-role-direction`(627줄)이 이미 지키고 있다.

무료 화면이 지금 보여주는 건 일반 6유형 용어집(`relationMiniMap`)이다. **여기서 할 수 있는 것은 가독성·대비 개선과 안괴/우쇠 화살표 기호의 오독 방지뿐이다.**

---

## §3 함정 모음 — 여기서 시간을 잃는다

### `sync:public` 이 윈도우 파일 락으로 죽는다

errno `-4094` (UNKNOWN) 로 중간에 터진 적이 2회 있다. 한 번은 `public/styles/static-policy.css` 를 18,918 → 9,711 로 **잘라 놓고** 죽었고, 한 번은 `js/core/index-inline-runtime.js`(**root 소스**) 에서 죽어 **root 는 그대로, 미러만 바뀐 반쪽 동기화**를 남겼다.

**대응: `EXIT=0` 을 직접 확인하고, 0 이 아니면 재실행한다. 그 다음 미러 대칭을 확인한다.**
```powershell
npm run sync:public; echo "EXIT=$LASTEXITCODE"
```

### `.git/index.lock` 이 남아 커밋을 막는다

락 파일을 **보자마자 지우지 말 것.** 다른 세션이 실제로 쓰고 있을 수 있다. 2026-09-19 에 쓴 3중 판정:

1. 배타 열기: `fs.openSync('.git/index.lock','r+')` 가 성공하면 아무 프로세스도 잡고 있지 않다.
2. mtime 이 5분 넘게 얼어 있다.
3. 몇 초 더 기다려도 그대로다.

셋 다 만족할 때만 제거하고, 제거 후 **인덱스가 온전한지**(더러운 파일 수가 전후 동일) 와 `git fsck --connectivity-only` 로 확인한다.

### 더러운 트리에서 rebase 가 막히면 merge 를 쓴다

옆 세션의 미커밋 파일이 있어 rebase 가 거부될 때, **origin/main 의 변경 파일과 내 파일·더러운 파일 사이에 겹침이 0 임을 먼저 증명**하고 `git merge origin/main` 을 쓴다(머지는 해당 경로를 건드리지 않으면 더러운 트리에서도 된다). 🔴 `stash` 는 금지.

**머지 직후 `npm run sync:public` 을 다시 돌린다** — 머지가 소스 해시를 바꿔 미러가 다시 낡는다.

### 스크래치패드가 프로젝트 `node_modules` 를 못 찾는다

스크래치 스크립트에서 `playwright` 등을 쓰려면:
```js
import { createRequire } from 'node:module';
const require = createRequire('D:/Development/code-destiny/package.json');
const { chromium } = require('playwright');
```

### 도는 가드 ≠ 무는 가드

새 단언을 넣었으면 **변이를 넣어 실제로 실패하는지** 확인한다(CLAUDE.md 원칙 10). Phase 4 에서 처음 만든 변이 하나는 **가드 구멍이 아니라 변이 자체가 틀려서** 안 물었다 — `isPaid()` 의 셀렉터 분기만 바꿨는데 가격·잠금 폴백 분기가 여전히 정답을 내서 동작이 안 변했다. 그때 **매직 넘버 하한(`paidPresent >= 5`)도 함께 버렸다** — 엔진 소유 콘텐츠 개수에 가드를 거는 건 깨지기 쉽다.

---

## §4 이번에 정정된 사실 — 옛 기록을 믿지 말 것

앞선 세션 기록에 있었으나 **2026-09-19 재측정 결과 더 이상 사실이 아닌 것들**이다. 그대로 이어받으면 헛수고한다.

| 옛 기록 | 재측정 결과 |
|---|---|
| `verify:sitemap-drift` 가 날짜 롤오버로 레드 | ✅ **지금은 통과.** `[sitemap:check] OK — 추적본이 재생성 결과와 일치한다 (URL 1282개)` |
| `gongGan`·`auxStars`·`badStars`·`calcMeta.lifeFormula` 가 `basic-fortune-library.css:251,257` 에서 CSS 로 숨겨진다 | ❌ **근거 없음.** `styles/*.css` 전수 grep 결과 이 이름들에 대한 규칙이 **0건**이고, `:251`·`:257` 은 지금 각각 `overflow-x: clip` 과 `.fr-profile > .fr-caption` 이다. 네 값은 `js/saju-engine.js:16873`·`:16942-16943` 등에서 **정상 소비**된다. **목록에서 뺀다.** |
| `node_modules/sweph-wasm/wasm/swisseph.wasm` 이 로컬에 없다 | ❌ **오측이었다.** 실제 경로는 `node_modules/sweph-wasm/**dist/**wasm/swisseph.wasm` 이고, 설치본·root·미러 **3개가 전부 바이트 동일**(sha256 `b8edc953c490d073`, 584,227 B) |
| CI 의 벤더 wasm 경고가 main 레드의 원인 | ❌ 벤더 드리프트는 **실패시키지 않는다**(`verify-public-mirror-fresh.mjs:68-80` 의 명시적 예외). 레드의 원인은 §0 의 캐시 핀 7개였다 |

---

## §5 검증 명령 모음

```powershell
# 계산 불변 + 빈 서랍 금지 + 유료 경계 (CI 미배선 — 직접 돌릴 것)
node scripts/verify-basic-fortune-library.mjs
node scripts/verify-sukuyo-reading-house.mjs

# CI 에 있는 것들
npm run verify:ziwei-chart-detail-view
npm run verify:sukuyo-role-direction
npm run verify:sitemap-drift
npm run check:ui

# 미러 (styles/** · js/** 를 고쳤다면 필수)
npm run sync:public; echo "EXIT=$LASTEXITCODE"
npm run verify:style-sync

# 변경 기반 일괄 검사
npm run check:fast
```

**미러 신선도를 더러운 트리에서 판정하는 법** (`verify:public-mirror-fresh` 가 "판정 불가"로 빠질 때):
```bash
git status --porcelain | grep -v '^??' | sed 's/^...//' | sort > before.txt
npm run sync:public
git status --porcelain | grep -v '^??' | sed 's/^...//' | sort > after.txt
comm -13 before.txt after.txt    # 새로 더러워진 = 낡았던 미러
```

**손 확인** (CLAUDE.md 코딩 원칙 16 — 실제 화면 검증):
1. 자미두수 모달 → "명반 근거 표" 열기 → **표가 실제로 보인다**
2. 간소/상세 칩 양방향 전환 → 서랍 내용이 계속 보인다
3. 390px 에서 명반 세로 리스트 → 지도 버튼 → 4×4 + 가로 스크롤 → 되돌리기
4. 320·360·375·390·430px 에서 두 화면 모두 가로 스크롤 없음
5. **두 화면의 모든 펼침 컨트롤을 하나씩 눌러 빈 상자가 없는지 확인**
6. 뒤로가기: 결과→입력, 상세→결과, 브라우저 Back 이 인앱 Back 과 충돌하지 않음

---

## §6 전달 규칙

`main` 직접 커밋. **브랜치·PR 없음.** 작은 단위로 검증 → 즉시 커밋. 회귀가 나면 조건·`try/catch`·CSS 오버라이드를 덧대지 말고 **그 커밋만 되돌린다.**

- 서로 무관한 변경을 한 커밋에 섞지 않는다.
- `git add .` 전에 `git status` 와 `git diff --stat` 을 반드시 본다. **경로 명시로 스테이징한다.**
- push 는 스테이징까지다. **운영 승격은 명시적 1회 승인 때만.**
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
