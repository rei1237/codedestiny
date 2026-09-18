---
status: active
updated: 2026-09-19
next: "사용자가 지목했던 §2 의 9번(자미두수 동물 패널 디자인)은 2026-09-19 에 끝났다 — 커밋 3개(1단계 9812d039f 버튼 정리, 2단계 64f55a98a 엔진 인라인 style → zwla-* 클래스 + 리포트 정규화 CSS, 3번째 44eac0f68 공궁 폴백 팔레트 + 캐시 토큰 수렴). 🔴 시작 전에 §3 의 'sync:public 한 번은 고정점이 아니다' 를 읽을 것 — js/** 를 고치면 sync 를 두 번 돌려야 하고, 이것을 몰라서 2026-09-19 에 main 이 이틀 가까이 레드였다(§1 의 커밋별 토큰 표가 근거이며, '미러를 빠뜨렸다'는 이 문서의 옛 진단은 실측으로 틀렸다). 다음 작업은 §2 의 남은 1~8 중 하나이고 추천 순서는 2 → 1 → 3 이다. 🔴 2번(Playwright 가드 2개가 CI 에 배선되어 있지 않다)을 먼저 권한다 — 이번에 고친 동물 패널도 그 가드가 배선되어 있었다면 출시 전에 잡혔고, 2단계에서 스타일을 verify 로 못 지키는 구멍이 그대로 남아 있다. 🔴 먼저 §0 '시작 전 5분'을 읽을 것 — 이 저장소는 (1) 정적 셸 index.html + js/** 바닐라가 무료 결과를 그리고 app/** Next.js 는 SEO 랜딩뿐이며, (2) styles/**·js/** 를 고치면 public/ 미러를 같은 커밋에 넣어야 하고, (3) 캐시 키를 손으로 찍으면 안 되고 반드시 npm run sync:public 으로만 찍는다(이 규칙을 어겨서 2026-09-19 에 main 이 한 번 레드가 됐다). 엔진 파일 js/saju-engine.js 의 마크업·인라인 <style> 을 또 고칠 일이 생기면 §2-9 의 '권장 접근 2단계'(2층 CSS 전략)와 그 안의 🔴 '여기서 실제로 두 번 틀렸다' 를 반드시 먼저 읽을 것. 🔴 paid-flow-gates.yml 트리거에 styles/** 가 없어서 CSS 단독 커밋은 결제 게이트를 잠재운다 — 엔진과 CSS 는 한 커밋으로."
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

🔴 **`js/**` 를 고쳤으면 `sync:public` 을 두 번 돌린다.** 한 번은 고정점이 아니다 — `index.html` 이 물고 있는 `js/core/index-inline-runtime.js` 의 토큰이 **한 세대 낡은 채로** 커밋된다. 2026-09-19 에 `9812d039f`·`64f55a98a` 가 연달아 이걸 밟아 main 이 레드였다. 기전과 확인법은 §3 의 "`sync:public` 한 번은 고정점이 아니다".

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
| `9812d039f` | §2-9 **1단계** — 동물 패널의 동일 동작 버튼 3개 제거(삭제 25줄 / 추가 0줄) | `git revert 9812d039f` |
| `64f55a98a` | §2-9 **2단계** — 동물 패널을 `.fr-*` 팔레트·타이포로 정규화(인라인 `style=` 50개 → `zwla-*` 클래스 + 리포트 정규화 CSS 45줄, 생성물 11개 포함) | `git revert 64f55a98a` 뒤 `npm run sync:public` 재실행 |
| `44eac0f68` | §2-9 **폴백 정리 + 캐시 토큰 수렴** — 공궁 폴백(`.zwla-empty`)의 보라색 좌측선 제거(CSS 5줄) + `sync:public` 2회차 산출물로 아래의 낡은 런타임 토큰 해소 | `git revert 44eac0f68` 뒤 `npm run sync:public` **두 번** |

각 커밋은 단독으로 되돌려도 다른 기능이 흔들리지 않게 잘라 놓았다.

🔴 **`9812d039f` 이 main CI 를 레드로 만든 원인은 "셸 미러를 빠뜨려서"가 아니었다 — 이 문서에 처음 그렇게 적었지만 실측으로 틀렸다.** 그 커밋은 셸 미러 7개를 **모두 담았다**(`git show --stat 9812d039f` = 12파일, `index.html` + `public/{,static/,en/,ja/,zh/,zh-tw/}index.html` + 엔진·런타임 양쪽 포함). 진짜 원인은 **`sync:public` 한 번이 고정점이 아니라는 것**이다(§3 의 "`sync:public` 한 번은 고정점이 아니다" 항목이 기전을 적어 뒀다). `index.html` 에 박힌 `/js/core/index-inline-runtime.js?v=` 토큰이 **한 세대 낡은 값**으로 남아 커밋된 런타임 파일의 내용 해시와 어긋났고, `verify:public-mirror-fresh` 는 그 한 줄 때문에 셸 7개 전부를 "낡았다"로 물었다. 커밋별 실측:

| 커밋 | `index.html` 에 박힌 토큰 | 런타임 파일의 실제 내용 해시 | 판정 |
|---|---|---|---|
| `a9dfd1cfc` 및 그 이전 6개 | `build-dcd945172362` | `build-dcd945172362` | ✅ OK |
| `9812d039f` (1단계) | `build-dcd945172362` | `build-0776962d3763` | 🔴 **여기서 들어왔다** |
| `d6ad24bb8` · `8deacfaad` · `e87cc3248` | 위와 동일 | 위와 동일 | 🔴 전파(옆 세션 커밋은 원인이 아니다) |
| `64f55a98a` (2단계) | `build-f3607e7cb0bd` | `build-2b5a643397bf` | 🔴 **다시 한 세대 뒤** |
| `341b722e4` · `f48c83fec` | 위와 동일 | 위와 동일 | 🔴 전파 |
| `44eac0f68` (3번째) | `build-2b5a643397bf` | `build-2b5a643397bf` | ✅ 해소 |

재측정 방법은 스크래치 `token-history.mjs` 와 같다 — 커밋마다 `git show <sha>:js/core/index-inline-runtime.js` 를 `normalizeOwnReferenceForHash`(자기 참조만 `__CACHE_KEY__` 로, CRLF→LF) 로 정규화해 sha256 앞 12자리를 구하고, 같은 커밋의 `index.html` 에 박힌 값과 비교하면 된다. 교훈은 §0 규칙에 한 줄을 더한다 — **`js/**` 를 고쳤으면 `sync:public` 을 두 번 돌리고 2회차 변경이 0건인지 확인한 뒤 커밋한다.**

### 참고로 알아 둘 근본 원인 하나

"자세히 보기를 눌렀는데 아무것도 안 나온다"의 정체는 **CSS 특이도 + 노드 이동의 조합**이었다. 엔진이 `.zw-fact-tables.zw-detail-only` 를 만들고, 엔진 인라인 CSS 가 `#ziweiModalSection .zw-dashboard:not([data-zw-view="detail"]) .zw-detail-only { display:none !important }` 로 숨기는데, Layer B 가 **바로 그 숨겨진 노드를 `<details>` 로 감싸 `.zw-dashboard` 밑에 도로 붙여서** 규칙이 여전히 매치됐다. `<details>` 는 정상적으로 열리고 `aria-expanded="true"` 까지 되는데 내용물만 `display:none` 이었다.

수정은 **감싸기 전에 클래스를 떼는 것**이다(버튼 숨기기가 아니라 내용이 실제로 보이게). 같은 유형 재발을 막으려고 `foldIfContent()` 를 만들어 두었다 — 내용이 비었거나 안 보이면 **서랍 자체를 만들지 않는다.** 새 접기 UI 를 추가할 땐 `fold()` 말고 이걸 쓸 것.

⚠️ `foldIfContent()` 에는 함정이 하나 있다. `syReadingBody(traits, labels, collapsible)` 의 **세 번째 인자**가 그것이다. 이 함수는 호출부가 둘인데 요구가 정반대다:

- `basicFortunePresentation.js:139` — 본명숙 결과. 길어서 접어야 한다 → `true`
- `basicFortunePresentation.js:224` — 27숙 도감 리더. 사용자가 "이 숙을 읽겠다"고 **방금 누른** 화면이라 여기서 또 접으면 방금 요청한 글에 닿는 데 한 번 더 눌러야 한다 → 인자 없음(펼친 채)

(함수 정의는 `:192`.) 처음에 이걸 구분 안 하고 둘 다 접었다가 `verify-sukuyo-reading-house.mjs:88` 의 `innerText().length > 400` 에 걸렸다. **Playwright 의 `innerText()` 는 렌더된 텍스트라 닫힌 `<details>` 는 `<summary>` 만 센다** — 이 가드가 그래서 물었다.

---

## §2 남은 문제

각 항목은 서로 독립이다. 아무거나 하나만 집어서 해도 된다.

✅ **9번(사용자 지목 최우선)은 2026-09-19 에 끝났다.** 남은 것은 1~8 이고 추천 순서는 **2 → 1 → 3**, 나머지는 청소 성격이다. 9번 절은 지우지 않고 남겨 뒀다 — 엔진 파일을 고치는 방법(2층 CSS 전략)과 거기서 실제로 틀린 두 가지가 적혀 있어서, 앞으로 엔진 마크업을 또 고칠 사람이 읽어야 한다.

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
| `scripts/verify-basic-fortune-library.mjs` | 569 | §20 계산 불변(`:131-134` `assert.deepEqual(stable(data), stable(previous))`), 빈 서랍 금지(`:152-172`), 유료 경계(`:181-186`), 비-ko 로케일에 한글 혼입 금지(`:487-490`) |
| `scripts/verify-sukuyo-reading-house.mjs` | 111 | 컨트롤/ID 보존(`:61-62`), 유료 산문 차단(`:63-68`), 유료 구역 경계(`:82-84`, 신규), 27숙 전수 순회 + 계산 불변(`:86-89`), 360·390·430·1280 오버플로(`:99-104`) |

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

🔴 `traits` 의 `hidden`·`karma`·`mantra`·`health`·`timing` 은 **결제 렌더러 소유**다. [js/core/saju/basicFortunePresentation.js:194](../../js/core/saju/basicFortunePresentation.js) 가 주석으로 명시하고(`Paid deep-dive fields (hidden/karma/mantra/health/timing) stay in their original gated renderer.`) `verify-sukuyo-reading-house.mjs:63-68` 이 능동적으로 단언한다. **무료 화면에 올리면 가드가 물고, 물지 않더라도 유료 콘텐츠 무료 유출이다.**

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

### 9. ✅ **해결(2026-09-19)** 자미두수 동물 패널이 `.fr-*` 리포트 디자인과 따로 논다

> ✅ **1단계·2단계 모두 완료.** 커밋 2개 — 1단계 `9812d039f`(버튼 정리) · 2단계 `64f55a98a`(팔레트·타이포 정규화). 실측으로 확인된 결과: 인라인 style 노드 **122 → 0**, 본문 중위 **10.92px → 16px**, 14px 미만 텍스트 노드 **74 → 0**, 배경 `#141e2b`·테두리 `#394351`·본문 `#f4efdf`·제목 `#e0c58c`·radius `0`·backdrop `none`, 도감 카드 14장 유지(정보 손실 0), 동일 동작 버튼 3개 제거. 아래 A~G 는 **무엇을 어떻게 고쳤는지의 기록**이고, 남아 있는 범위 밖 결함은 각 절의 🔴 표시를 볼 것.

> 2026-09-19 사용자 지적: *"🐶 내 영혼을 상징하는 자미두수 동물 등의 디자인이 기본 자미두수 명반과 안 맞는다"*
> 앞선 Phase 1~4 는 이 패널의 **디자인을 전혀 건드리지 않았다.** `basicFortunePresentation.js` 에 `zwLifeAnimalPanel`·`zw-detail-panel` 참조가 **0건**이다(전수 grep) — 표현 계층은 이 패널을 이름으로 알지 못한다. 다만 `:644` 가 **남은 자식을 일괄로** `fr-ziwei-explore` 폴드에 옮기기 때문에 위치만 바뀌어 있다(아래 DOM 위치 참고). 즉 **옮기기만 했고 스타일은 엔진이 만든 그대로**다.

**대상**: `#zwLifeAnimalPanel` — 기본(무료) 자미두수 결과 화면의 "내 영혼을 상징하는 자미두수 동물" 패널.

#### 실측 (2026-09-19, Playwright 390×844, 계산된 스타일)

**A. ✅ 해결(2026-09-19 2단계) — 팔레트가 리포트와 무관했다. 이게 "안 맞는다"의 직접 원인이었다**

| | 리포트(`.fr-ziwei` 런타임 토큰) | 동물 패널(인라인 하드코딩) |
|---|---|---|
| 배경 | `--fr-bg: #0b121b` | `linear-gradient(145deg, rgba(24,24,62,.92), rgba(12,26,58,.92))` 남보라 |
| 면 | `--fr-surface: #141e2b` | `rgba(15,23,42,.42)` · `rgba(12,74,110,.2)` · `rgba(76,29,149,.26)` |
| 글자 | `--fr-ink: #f4efdf` | `#fef3c7` · `#dbeafe` · `#cbd5e1` · `#ede9fe` · `#bae6fd` |
| 악센트 | `--fr-accent: #e0c58c` **금색 하나** | `#fcd34d` · `#c4b5fd` · `#bae6fd` **3계열** |

리포트는 남색 바탕에 **금색 악센트 하나**로 통일돼 있는데, 패널은 호박·하늘·보라·슬레이트 **4계열**을 썼다. 스크린샷의 주황/하늘/보라 버튼 3개가 바로 이것이다(1단계에서 삭제됨). 정상 경로에만 하드코딩 색상 **36개**가 있었다.

**조치(2단계)**: 리포트 안에서의 계산된 값이 전부 `--fr-*` 토큰으로 바뀌었다. 실측(Playwright 390·1280, 계산된 스타일):

| | 2단계 전 | 2단계 후 |
|---|---|---|
| 배경 | 보라 radial-gradient | `rgb(20,30,43)` = `#141e2b` = `--fr-surface` |
| 테두리 | `rgba(167,139,250,0.38)` | `rgb(57,67,81)` = `#394351` = `--fr-rule` |
| 글자 | `#cbd5e1` 등 5계열 | `rgb(244,239,223)` = `#f4efdf` = `--fr-ink` |
| 제목 | `#fde68a` | `rgb(224,197,140)` = `#e0c58c` = `--fr-accent` |
| 모서리 | 12px · 16px | `0px` |
| backdrop | `blur(15px)` | `none` |

`visual-checker` 가 후속 캡처의 **262,710 픽셀을 전수 검사해 팔레트 밖 픽셀 0개(0.0000%)** 로 판정했다. ⚠️ 그 이미지에 `#76bad3` 같은 파란 픽셀이 보이지만 **서브픽셀 안티에일리어싱 프린지**다(짝 픽셀이 R 채널을 공유하고 G·B 는 배경값). "남은 파랑"으로 오판하지 말 것.

2차 검수(채널별 5토큰 보간, 총 2,857,704 픽셀)도 같은 결론이다: 이탈률 0.0203% / 0.0014% / 0.0682%, 그리고 **이탈 픽셀이 전부 이모지 글리프(🦅🦉🐗 …) 좌표의 소형 클러스터 14개 안에 갇혀 있고 이모지 밖 이탈은 0픽셀**이다. 즉 컬러 이모지는 팔레트 밖일 수밖에 없고 그것 말고는 보라·파랑 잔재가 없다. 대비도 같이 쟀다 — 본문 **14.60:1**, 보조 **9.71:1**, 악센트 **10.03:1** 로 전부 WCAG AAA, 도감 선택 표시(accent 테두리 vs rule 테두리)는 **5.98:1** 로 1.4.11(3:1) 통과. 참고로 `--fr-rule` vs `--fr-surface` 는 **1.68:1** 이라 카드 경계선이 옅다 — 장식 경계라 기준 대상은 아니지만, 경계를 더 세우고 싶으면 여기가 손댈 곳이다(리포트 전역 토큰이라 이 패널만의 문제가 아니다).

🔴 **예전 색은 지운 것이 아니라 옮겼다.** 엔진 인라인 `<style>` 의 `.zwla-*` 기본 스킨([`js/saju-engine.js:18235-18269`](../../js/saju-engine.js#L18235-L18269), 30규칙 · hex 20 + rgba 19)이 예전 인라인 값을 **그대로** 들고 있다. 리포트 안에서만 `#ziweiModalOverlay #zwLifeAnimalPanel` 이 ID 2개 특이도로 덮는다.

⚠️ **정정(실측)**: 이 기본 스킨의 명분을 처음에 *"`renderZiwei` 의 `targetId` 기본값 `'ziweiSection'` 단독 렌더 경로를 보존한다"* 로 적었는데, **그 경로는 지금 살아 있지 않다.** 전수 grep 결과 `'ziweiSection'` 을 엘리먼트 id 로 쓰는 곳은 [`js/saju-engine.js:22444`](../../js/saju-engine.js#L22444) 의 `document.getElementById(targetId || 'ziweiSection')` **한 곳뿐**이고, `index.html`·`app/**`·`src/**` 에 `id="ziweiSection"` 은 **0건**이다(나머지 `ziweiSection` 히트는 전부 융합운세 LLM 섹션 키라 무관하다). 실제 호출부는 `js/core/saju/modalProfileState.js:259,279` 둘 다 `'ziweiModalSection'` 을 넘긴다. 그러니 저 기본값은 **죽은 폴백**이고 `if(sec)` 에서 조용히 빠진다. 그래도 기본 스킨은 남겨 두는 게 맞다 — 이유는 두 개다: (1) 값이 엔진 쪽에 있어야 리포트 정규화가 `!important` **0개**로 이긴다(값을 지웠다면 덮을 대상이 없어 특이도 싸움이 아니라 재작성이 된다), (2) 엔진을 모달 밖에서 렌더하는 코드가 생기면 패널이 **무스타일**로 나오는 것을 막는다. 즉 보험이지, 지금 도는 경로는 아니다.

⚠️ **`styles/basic-fortune-library.css:18` 만 보고 판단하면 틀린다.** 그 줄은 `.fr-ziwei { --fr-bg:#f4f0e7; --fr-ink:#292d31; … }` 라 "밝은 한지색"처럼 보이지만, **[`:246` 의 `#ziweiModalOverlay.fr-ziwei { --fr-bg:#0b121b; --fr-surface:#141e2b; --fr-ink:#f4efdf; --fr-muted:#bdc6cf; --fr-accent:#e0c58c; --fr-rule:#394351; }` 가 ID 특이도로 이긴다**](../../styles/basic-fortune-library.css#L246). 위 표의 값이 실제 런타임 값이다. 이 저장소는 특이도 싸움이 잦으니 **반드시 계산된 스타일로 확인**할 것.

참고할 기준값: [`:283`](../../styles/basic-fortune-library.css#L283) `#ziweiModalOverlay .fr-chart-stars { color:#e0c58c; font-size:14px; line-height:1.45; }` — 리포트가 **금색 악센트를 14px 로 쓰는 본보기**다. 동물 패널의 보조 텍스트도 여기에 맞추면 된다.

**B. ✅ 해결(2단계) — 타이포 스케일이 리포트의 약 2/3 였다**

| | 리포트 | 패널 |
|---|---|---|
| 본문 | **16px** / line-height 28px | **11.06px** / 17.7px |
| 버튼 | (`.fr-overlay` 규칙상 16px) | **10.5px** |
| summary | — | 11.2 ~ 11.48px |

원인: 인라인 `font-size:0.74rem ~ 0.95rem`. **루트 폰트가 14px** 라 `0.75rem = 10.5px` 다(소스만 보고 12px 로 추정하면 틀린다). `styles/basic-fortune-library.css` 의 `.fr-overlay :is(button, summary, input, select, textarea) { min-height:44px; font-size:16px }` 이 있지만 **인라인 스타일이 이겨서** `font-size` 는 무효였다. 반면 `min-height` 는 인라인 경쟁자가 없어 적용돼 **48px 박스 안에 10.5px 글자**라는 기형이 됐다.

**조치(2단계)**: 실측 — 최소 본문 `10.36px → 14px`, 중위 `10.92px → 16px`, **14px 미만 텍스트 노드 74개 → 0개**. 본문 행간은 리포트와 **정확히 같은 28px**(16px × 1.75)로 맞췄다.

🔴 **행간을 1.8~1.9 로 두면 안 된다.** 2단계 1차 구현이 `line-height:1.8`(본문)·`1.9`(narrative·bridge)였는데, `visual-checker` 가 행 피치 30~31px 을 잡아냈다 — 같은 글이 리포트보다 혼자 길어진다. 리포트 본문은 16px/28px = **1.75** 다. 2차에서 전부 1.75 로 통일했다.

캡션 14px 단계는 실재한다(실측 8곳): `.zw-dp-subtitle` · `.zwla-hero-title` · `.zwla-hero-archetype` · `.zwla-hero-star` · `.zwla-hero-pair` · `.zwla-cell-label` · `.zwla-codex-card-archetype` · `.zwla-codex-card-keywords`. 1차 시각 검수가 "14px 단계가 없다"고 판정했지만 그건 **캡처가 잘려 본문 구간만 보였기 때문**이다 — 크롭 범위를 확인하지 않고 부재를 단언하지 말 것.

**C. ✅ 해결(2단계) — 클래스 CSS 로는 고칠 수 없었다. 엔진 문자열을 고쳤다**

패널의 **DOM 노드 154개 중 126개(82%)가 인라인 `style=`** 였다. `basic-fortune-library.css` 에서 선택자로 덮으려면 속성마다 `!important` 가 필요했다. 그래서 **엔진의 `style="…"` 문자열을 `class="…"` 로 바꿨다**.

**조치(2단계)**: 두 빌더 모두 인라인 `style=` **0개**가 됐다(실측: `_zwBuildLifeAnimalCards` [`:21248-21336`](../../js/saju-engine.js#L21248-L21336) 89줄 — `style=` 0 · hex 0 · rgba 0 / `_zwBuildLifeAnimalCodex` [`:21117-21136`](../../js/saju-engine.js#L21117-L21136) 20줄 — 0 · 0 · 0). 실제 렌더 기준 **인라인 스타일 노드 122개 → 0개**.

그래서 `styles/basic-fortune-library.css` 의 정규화 블록에 **`!important` 가 한 개도 없다.** `#ziweiModalOverlay #zwLifeAnimalPanel`(ID 2개)이 엔진의 `.zw-detail-panel`·`.zwla-*`(클래스 1개)를 특이도로 이기기 때문이다 — 엔진 쪽 해당 선택자들의 박스 속성에 `!important` 가 없음을 전수 확인했다(있는 것은 reduced-motion 블록의 `transition`·`transform` 뿐).

**D. ✅ 해결(2026-09-19 1단계) — 버튼 3개가 전부 같은 동작이고, 2번째를 누르면 화면이 닫혔다**

당시 실측: `js/saju-engine.js:21303`·`:21304`·`:21305` 의 `onclick` 이 **문자열까지 완전히 동일**했다(`identicalOnclick: true`):
```js
window._zwToggleAnimalCodex('zwLifeAnimalCodex')
```
그리고 `_zwToggleAnimalCodex` 는 **토글**이었다 — `detailsEl.open = !isOpen`. 그래서 아래 시퀀스가 났다.

실제 클릭 시퀀스(당시 실측):

| 순서 | 누른 버튼 | 도감 상태 |
|---|---|---|
| 1 | `14주성 동물 도감 보기` | 닫힘 → **열림** |
| 2 | `다른 동물 보기` | 열림 → **닫힘** ← 🔴 |
| 3 | `내 안의 별동물 도감` | 닫힘 → **열림** |

**사용자가 "다른 동물 보기"를 누르면 다른 동물이 나오기는커녕 방금 연 도감이 사라졌다.** 세 버튼 모두 `aria-expanded`·`aria-controls` 가 없었다(§22 위반).

**조치**: 버튼 3개를 fallback·정상 **두 경로에서 모두** 지우고, 그러면서 유일한 호출부를 잃은 `_zwToggleAnimalCodex` 본체도 지웠다(엔진 `-25줄`, 삽입 0줄). 도감 열기는 남은 `<details id="zwLifeAnimalCodex">` 의 `<summary>` 가 네이티브로 수행하므로 `aria-expanded` 는 브라우저가 관리한다. 삭제 3면 확인(소스·`__tests__/`·`scripts/verify-*`): `_zwToggleAnimalCodex` 참조 **0건**.

**E. ✅ 해결(D와 같은 커밋) — 같은 라벨이 화면에 두 번 나왔다**

버튼 `"14주성 동물 도감 보기"` 와 `<summary>` `"14주성 동물 도감 보기"` 가 동시에 렌더됐다. 버튼을 지워 `<summary>` 하나만 남았다.

**F. 로케일 체계 밖** — 전부 한국어 리터럴. `t()`/`labelKeys` 5로케일을 쓰지 않는다.

**G. 🔴 마크업이 두 벌로 복제돼 있다 — 한쪽만 고치면 반쪽이 남는다 (구조는 그대로 남아 있으니 다음 사람도 주의)**

`_zwBuildLifeAnimalCards`([`:21248`](../../js/saju-engine.js#L21248)) 안에 거의 같은 UI 가 두 번 있다. **복제 자체는 2단계에서 없애지 않았다**(요청 범위 밖) — 앞으로도 이 패널을 고칠 때는 **fallback·정상 두 경로를 모두** 고쳐야 한다.

| 경로 | 인라인 `style=` (1단계 전) | (1단계 후) | (2단계 후) | 하드코딩 색 (2단계 후) |
|---|---|---|---|---|
| fallback | 9 | 5 | **0** | 0 |
| 정상 | 42 | 38 | **0** | 0 |

버튼 3개 블록은 두 곳에 있었고 1단계에서 **둘 다** 지웠다. 2단계는 남은 인라인 `style=` 을 두 경로 모두 `zwla-*` 클래스로 옮겨 **양쪽 0개**가 됐다. 색은 엔진 기본 스킨([`:18235-18269`](../../js/saju-engine.js#L18235-L18269))으로 이동했다(위 A 의 🔴 참고).

#### DOM 위치 (실측) — 도달 깊이는 문제없다

```
#zwLifeAnimalPanel
└ div.fr-disclosure-body
  └ details#fr-ziwei-explore.fr-disclosure   ← Phase 1 이 만든 폴드(기본 닫힘)
    └ div.zw-dashboard
      └ div#ziweiModalSection.fr-report
        └ … └ div#ziweiModalOverlay.fr-overlay.fr-ziwei
```

위에 닫힌 `<details>` 는 **1개뿐**이다. "더 살펴보기" 한 번만 열면 닿는다. 도달 깊이는 건드릴 필요 없다.

#### 미확인 — 손대기 전에 반드시 확인할 것

- ~~**유료 경계에 걸리는지.**~~ **확인 완료(2026-09-19, `paid-gate-auditor`)** — 무료 노출이 정책과 일치한다. 근거: `renderZiwei` 본문 전 구간(`17310-22460`)에 게이트 마커(`cd-section-gate`·`data-unlock-key`·`_cdCoinGatePerUse` 등) **0건**; `applySectionGates` 가 보는 id 3개(`index.html:29338`)와 `.zw-basic-paid-gate[data-unlock-key]` 모두 미해당; 자미두수 A유형 잠금 키 5개에 대응 항목 없음(`docs/payment-policy-content-access.md:15,46` — 명반 화면 자체는 C유형 무료); `premium_ziwei` 코인게이트는 2026-09-12 삭제됨(`worker/lib/paid-feature-registry.js:425-429`). 결제 동결(`config/payment-freeze.json`) 대상도 아니다(`verify-payment-freeze` 통과).
- **🔴 CI 구멍(구조적)**: `paid-flow-gates.yml` 트리거에 `styles/**` 와 `public/js/saju-engine.js` 가 **없다**. `js/saju-engine.js`(`:156`)·`index.html`(`:177`) 은 있다. 따라서 **2단계 CSS 만 따로 커밋하면 결제 게이트가 잠든다** — CSS 는 엔진 변경과 같은 커밋에 묶을 것.
- **`.zw-detail-panel` 계열을 다른 패널도 공유한다.** 정의가 `js/saju-engine.js:18151-18226`·`19533`·`19659`·`19826` 네 곳(반응형 분기 포함)에 있다. 여기를 고치면 동물 패널 **밖의 패널도 같이 바뀐다** — `regression-scout` 로 영향 범위를 먼저 훑을 것.
- **`verify-ziwei-chart-detail-view` 가 무엇을 단언하는지.** 엔진 마크업을 JSDOM 으로 검사하므로 문자열을 바꾸면 깨질 수 있다. **읽고 시작할 것.**

#### 볼 곳

- [js/saju-engine.js:21248-21336](../../js/saju-engine.js#L21248-L21336) — `_zwBuildLifeAnimalCards` 두 경로 (2단계 후 줄번호)
- ~~`_zwToggleAnimalCodex` (토글 본체)~~ — **1단계에서 삭제됐다. 존재하지 않는 심볼이니 찾지 말 것.**
- [js/saju-engine.js:21117-21136](../../js/saju-engine.js#L21117-L21136) — `_zwBuildLifeAnimalCodex` (도감 본문, 14주성 전부 생성)
- [js/saju-engine.js:18151-18233](../../js/saju-engine.js#L18151-L18233) — `.zw-detail-panel` / `.zw-dp-title` / `.zw-dp-subtitle` 인라인 CSS. **공유 자산이라 2단계에서 건드리지 않았다.**
- [js/saju-engine.js:18235-18269](../../js/saju-engine.js#L18235-L18269) — 2단계가 새로 넣은 `.zwla-*` 기본 스킨(단독 렌더 경로 보존용). 🔴 여기에 인라인 `style=` 을 다시 늘리면 리포트 쪽에서 속성마다 `!important` 가 필요해진다
- [styles/basic-fortune-library.css:327-371](../../styles/basic-fortune-library.css#L327-L371) — 2단계가 넣은 `#ziweiModalOverlay #zwLifeAnimalPanel` 정규화 블록(`!important` 0개). 블록 머리 주석에 **왜 그 값인지**가 적혀 있다
- [styles/basic-fortune-library.css:1-64](../../styles/basic-fortune-library.css#L1-L64) — `.fr-*` 토큰 (여기 값만 쓴다)
- [styles/basic-fortune-library.css:100-103](../../styles/basic-fortune-library.css#L100-L103) — `.fr-ziwei .fr-palace-summary` 정규화. **이 저장소가 이미 쓰는 선례이므로 이 패턴을 그대로 따라가면 된다**
- [js/core/saju/basicFortunePresentation.js:644](../../js/core/saju/basicFortunePresentation.js#L644) — 패널을 담는 `fr-ziwei-explore` 폴드

#### 권장 접근 — 순서가 중요하다

**1단계 · ✅ 완료 (`9812d039f`). (a) 를 택했다.** 버튼 3개를 지우고 `<summary>` 하나만 남겼다 — 삭제 25줄 / 추가 0줄. `<details>`/`<summary>` 가 같은 일을 네이티브로 하고 `aria-expanded` 도 공짜다. 죽은 `window._zwToggleAnimalCodex` 본체까지 같이 지웠다(전수 grep 으로 호출부 0 확인).

(b) 는 버리지 않고 **기각**했다: 세 버튼에 각각 다른 동작을 주는 안. `_zwBuildLifeAnimalCodex(primaryKey)` 가 14주성을 전부 만들므로 데이터는 있지만, 한 패널에 컨트롤 3개가 필요한 화면이 아니었다. 나중에 "다른 동물 보기"를 **정말** 만들 거라면 여기서부터 시작할 것.

🔴 **없는 데이터를 지어내지 말 것**(요청서 §4·§5). (b) 로 되돌아간다면 각 버튼이 보여줄 내용이 실제 코드에 있는지 먼저 확인한다.

**2단계 · ✅ 완료. 인라인 스타일을 클래스로 옮겼다.** 실제로 쓴 방법은 **두 층으로 나누는 것**이었다 — 이게 이 작업의 핵심이고, 비슷한 패널을 또 고칠 때 그대로 쓰면 된다.

1. **엔진 인라인 `<style>` 에 `zwla-*` 기본 스킨을 넣는다**([`:18235-18269`](../../js/saju-engine.js#L18235-L18269)). 값은 **예전 인라인 값 그대로**. 이게 있어야 2번이 `!important` 0개로 이긴다(덮을 대상이 있으니 특이도만 올리면 된다). 엔진을 모달 밖에서 렌더하는 코드가 생겨도 무스타일이 되지 않는다. ⚠️ 이걸 *"단독 렌더 경로 보존"* 이라고 적었다가 정정했다 — 위 A 절의 ⚠️ 를 볼 것(`id="ziweiSection"` 은 실제로 0건이라 그 경로는 죽어 있다).
2. **`styles/basic-fortune-library.css` 에서 `#ziweiModalOverlay #zwLifeAnimalPanel` 로 리포트용 값만 덮는다**([`:327-371`](../../styles/basic-fortune-library.css#L327-L371)). ID 2개 특이도라 `!important` 가 **0개**다.

지킨 규칙:
- 색은 `var(--fr-accent)` / `var(--fr-surface)` / `var(--fr-ink)` / `var(--fr-muted)` / `var(--fr-rule)` 만. **정규화 블록에 새 hex 0개**(요청서 §14).
- 폰트는 `rem` 을 버리고 리포트와 같은 px(본문 16px, 캡션 14px), 행간은 **1.75**(= 28px).
- **두 경로 모두** 고쳤다(인라인 `style=` fallback 0 · 정상 0).
- 화면에 보이는 라벨 문자열은 **한 글자도 바꾸지 않았다** — 바꾸면 3단계(5로케일)가 딸려오고 `verify-basic-fortune-library.mjs:487-490` 의 비-ko 한글 가드에 걸린다.

🔴 **여기서 실제로 두 번 틀렸으니 다음 사람은 먼저 읽을 것**:
- **그리드 최소폭.** `minmax(240px,1fr)` 로 두면 부모가 225px 일 때 셀이 267px 로 삐져나온다. `minmax(min(240px,100%),1fr)` 로 쓴다.
- **`.zwla-hero` 는 카드가 아니라 래퍼다.** 실측하면 `note`·`fold`·`grid`·`narrative`·`tamagotchi` 가 전부 그 자식이다. 여기에 `padding:20px; border:1px` 을 주면 패널 24 + 래퍼 20 + 인용상자 16 = **3중 들여쓰기**가 되어 390px 에서 한 줄에 한글 11~12자만 들어간다. 클래스 이름이 `hero` 라고 히어로 카드라고 **가정하지 말고** 자식 구조를 실측할 것.

**3단계 · 로케일.** 새 라벨은 `labelKeys` 5로케일 전부 작성. ⚠️ `scripts/verify-basic-fortune-library.mjs:487-490` 이 **비-ko 로케일에 한글이 섞이면 실패**시킨다.

#### 검증

2단계에서 **실제로 돌린 것과 결과**(이 순서대로 돌리면 된다):

```powershell
node scripts/verify-basic-fortune-library.mjs      # EXIT 0, "errors": []  ← CSS 손본 뒤 다시 돌릴 것
node scripts/verify-sukuyo-reading-house.mjs       # 숙요점 회귀 없는지(엔진은 다른 파일이지만 셸 index.html 을 공유한다)
npm run verify:ziwei-chart-detail-view             # ok 48 checks — 엔진 마크업 단언, 2단계에서 깨지기 쉽다
npm run sync:public                                 # 🔴 커밋 직전 마지막. 소스를 또 고쳤으면 반드시 다시
npm run sync:public                                 # 🔴 js/** 를 고쳤으면 2회차까지 — 1회는 고정점이 아니다(§3)
npm run check:fast                                  # EXIT 0 (verify:entry-encoding + jest 281 suites / 3977 tests)
npm run verify:runtime-cache-sync                   # 셸들의 런타임/엔진 토큰이 한 값인지 (OK build-2b5a643397bf)
npm run verify:static-asset-cache-keys              # 루트 bare 자산 4종·참조 34건 (PASS)
```

🔴 `npm run check:fast` 는 `verify:public-mirror-fresh` 와 위의 자미두수 Playwright 가드를 **포함하지 않는다**(`--profile=fast --skip-build` 는 entry-encoding + jest 만 돈다). 미러 신선도와 화면 가드는 **손으로 돌려야 한다** — 이걸 몰라서 CI 에서 처음 터지면 원인 찾는 데 시간이 걸린다.

🔴 그런데 `verify:public-mirror-fresh` 는 **이 공유 체크아웃에서는 영영 초록이 안 된다.** fail-closed 설계라 작업 트리에 커밋되지 않은 변경이 하나라도 있으면 *"판정 불가는 통과가 아니다"* 로 EXIT 1 을 낸다 — 옆 세션의 미커밋 파일이 항상 있으므로 그렇다. 대신 **이 가드가 보는 것을 직접 재라**: (1) `js/saju-engine.js` ↔ `public/js/saju-engine.js`, `styles/*.css` ↔ `public/styles/*.css` 의 sha256 이 같은지, (2) 셸 9개의 `git diff -U0` 변경 줄 중 `?v=`·`v=build-`·`h<12자리hex>` 가 아닌 줄이 **0** 인지. 2단계에서 둘 다 확인했다(각각 IDENTICAL, nonToken=0).

🔴 **그 두 가지로는 부족하다 — 이번에 그래서 main 이 레드였다.** 둘 다 초록인데도 `index.html` 의 토큰 1개가 한 세대 낡아 있었다(§1 의 표). 대체 측정을 **하나 더** 해야 한다: (3) `index.html` 의 `?v=` 참조 **전부**를 자산 내용 해시로 다시 계산해 박힌 값과 비교(2026-09-19 기준 67개 전부 일치, 스크래치 `token-audit.mjs`). 사실상 같은 판정을 명령 두 줄로 얻는 방법이 `verify:runtime-cache-sync` + `verify:static-asset-cache-keys` 다 — **둘 다 공유 체크아웃에서 돈다**(더러운 트리를 요구하지 않는다). 다만 `runtime-cache-sync` 는 "모든 셸이 같은 값을 쓰는가"를 보고 "그 값이 실제 파일 해시인가"는 보지 않으므로, `js/**` 를 고친 커밋에서는 **sync 2회차까지 돌린 뒤** 이 둘을 돌리는 것이 안전하다.

**수동 확인** — 요청서 §23: 패널의 **모든** 펼침 컨트롤을 하나씩 눌러 빈 상자·닫힘이 없는지 본다. 특히 `다른 동물 보기` 를 **연 상태에서** 눌러 볼 것(이번에 발견된 결함이 바로 그 경로다).

실측 프로브를 다시 만들려면 §3 의 "스크래치패드가 프로젝트 `node_modules` 를 못 찾는다" 항목대로 `createRequire` 로 붙인다. `scripts/verify-basic-fortune-library.mjs:1-110` 의 라우트 목킹·프로필 주입을 그대로 복사하면 30줄로 끝난다.

#### 🔴 스크린샷 판정의 함정 — 이번에 2건이 오탐이었다

2단계를 `visual-checker` 로 두 번 검수했다. 색·행간·격자 넘침 지적은 **맞았고 그대로 고쳤다**(1.8/1.9 → 1.75, `.zwla-hero` 패딩 제거, `minmax(min(240px,100%),1fr)`). 그런데 **픽셀에서 되짚어 만든 수치 2건은 틀렸다.** 픽셀은 박스를 보지 못하기 때문이다 — 같은 실수를 반복하지 않으려면 아래 두 개를 기억할 것.

| 스크린샷 판정 | 실제 계산된 스타일 | 왜 어긋났나 |
|---|---|---|
| 폴드 트리거 터치 타깃 **28px** → "44px 권고 미달, 패딩을 주라" | **48px** (`min-height:48px`, 실측 `.zwla-fold-summary`·`.zwla-codex-summary`·`.zwla-codex-card-summary` 전부 `h=48`) | 잉크 상·하단에서 하프리딩을 빼 **라인박스**를 복원했는데, `min-height` 로 늘어난 박스는 잉크에 흔적을 남기지 않는다. `.fr-overlay :is(button,summary,input,select,textarea) { min-height }`([`styles/basic-fortune-library.css:36`](../../styles/basic-fortune-library.css#L36))가 이미 보장하고 있었고 `#ziweiModalOverlay` 는 `fr-overlay` 를 달고 있다(실측 `class="… fr-overlay fr-ziwei"`). **패딩을 더했다면 48 → 64px 로 혼자 커졌을 것이다.** |
| `.zwla-note` 가 **10~11자/행** → "본문보다 밀도가 높다" | 측정폭 **233px ≈ 14.6자/행** (본문 `.zwla-narrative` 는 267px ≈ 16.7자). 콜아웃이 34px 안쪽으로 들어간 정상 값 | 텍스트 **노드 조각**의 `getClientRects()` 폭을 행 폭으로 읽었다. `<b>` 앞뒤로 텍스트 노드가 갈라지면 한 행이 조각 여러 개로 잡혀 폭이 실제보다 짧게 나온다(실측: rect 4개 ↔ 렌더된 행 3개). |

**교훈**: 스크린샷은 "보이는 것"(색·행간·넘침·잘림)에는 강하지만 **박스 모델 수치(터치 타깃·측정폭·패딩)를 되짚는 데는 약하다.** 그런 지적이 오면 고치기 전에 `getComputedStyle` + `getBoundingClientRect` 로 한 번 더 재라 — 이번엔 그래서 불필요한 CSS 2줄을 안 넣었다. 프로브: 스크래치패드 `probe-touch.mjs`(레포에 두지 않았다).

**남은 판정불가 3건**은 `#ziweiModalOverlay` 가 패널을 약 843 CSS px 로 클리핑해서 생긴 촬영 한계다(`'14주성 동물 도감 보기'` 트리거, 격자 7~10번 칸, 도감 카드 10~14번). 다시 찍으려면 캡처 직전 오버레이에 `overflow:visible; max-height:none` 을 임시로 주고 찍는다. 다만 **같은 것을 DOM 수치로는 이미 확인했다**(도감 카드 14장, `childWiderThanParent: 0`, `panelScrollW 315 < docW 390`).

#### 위험도

- **1단계(버튼 정리) 🟢 GREEN** — 중복 컨트롤 제거이고 계산·결제 경계를 건드리지 않는다. ✅ 완료.
- **2단계(인라인→클래스) 🔴 RED** — **엔진 파일 `js/saju-engine.js` 를 고치는 첫 작업**이었다. Phase 1~4 는 Layer B(`basicFortunePresentation.js`)와 CSS 만 건드렸다. ✅ 완료, 회귀 없음. 실제로 확인된 것:
  - `verify:ziwei-chart-detail-view` **ok 48 checks** — 마크업 단언은 깨지지 않았다(이 가드는 `zwla-*` 클래스명을 보지 않는다).
  - `js/**` 변경이라 **생성물 11개**가 따라왔다: `public/js/saju-engine.js` · `public/styles/basic-fortune-library.css` · `index.html` · `public/index.html` · `public/static/index.html` · `public/{en,ja,zh,zh-tw}/index.html` · `js/core/index-inline-runtime.js` · `public/js/core/index-inline-runtime.js`. **셸 9개는 `?v=` 토큰 줄만 바뀐다(비-토큰 변경 줄 0)** — 그 외 줄이 바뀌었으면 손으로 찍은 것이니 되돌릴 것.
  - 🔴 캐시 키는 `npm run sync:public` 으로만 찍었다. 이번에 돈 것은 전역 결정적 키(`7b48b7b84466 → 0776962d3763`, `js/core/index-inline-runtime.js` 에 붙는다)와 자산별 해시 1개다.
- 1단계와 2단계는 **별도 커밋**으로 나눴다(서로 무관한 변경을 한 커밋에 섞지 않는다).
- 🔴 **CSS 를 따로 커밋하지 말 것.** `paid-flow-gates.yml` 트리거에 `styles/**` 가 없어서 CSS 단독 커밋은 결제 게이트를 잠재운다(위 "미확인" 절 참고). 2단계는 엔진과 CSS 를 **한 커밋**에 담았다.
- **3번째 커밋 `44eac0f68` 🟢 GREEN** — 공궁 폴백만 남아 있던 보라색 좌측선을 패널 안으로 스코프해 덮었고(CSS 5줄), 같은 커밋에 `sync:public` **2회차** 산출물을 담아 §1 의 낡은 런타임 토큰을 닫았다. 폴백은 엔진의 공용 `.zw-report-section` 을 함께 달고 나오므로(`js/saju-engine.js:21262`) 공용 클래스를 건드리지 않고 `#ziweiModalOverlay #zwLifeAnimalPanel .zwla-empty` 로만 무력화했다. 실측 전/후: `border-left 3px rgb(138,43,226)` → 4면 `1px rgb(57,67,81)`, `border-radius 10px` → `0`, 배경 `rgba(255,255,255,0.04)` → 투명, `padding 14px` → `16px`.

#### 후속 과제 — 이번 범위 밖에서 확인한 것들 (보고만, 고치지 않았다)

CLAUDE.md 원칙 14 대로 **보고만** 한다. 전부 실측 근거가 있다.

| 항목 | 실측 근거 | 판단 |
|---|---|---|
| 🟡 공용 `.zw-report-section` 이 리포트 팔레트 밖이다 | [`js/saju-engine.js:18230`](../../js/saju-engine.js#L18230) = `background: rgba(255,255,255,0.04); border-radius:10px; padding:14px; border-left:3px solid #8A2BE2`. 리포트 안에서 같은 클래스만 단 노드를 주입해 재니 그 값이 그대로 계산됐다(스크래치 `probe-empty.mjs` 의 `bareShared` 행) | 동물 패널 안에서는 `.zwla-empty` 로 덮었지만 **이 클래스를 쓰는 다른 패널은 여전히 보라색**이다. 다음에 다른 패널을 정규화할 때 같은 2층 전략으로 처리할 것 — 🔴 공용 규칙 자체를 고치면 리포트 밖 렌더까지 바뀐다 |
| 🟡 죽은 코드 2개 | `_zwBuildBasicCanonicalCards` [`:21383`](../../js/saju-engine.js#L21383) 과 그 안의 `#zwBasicCanonicalPanel` [`:21435`](../../js/saju-engine.js#L21435) — `js/**`·`index.html`·`styles/**` 전수 grep 에서 **정의·문자열 자기 자신 외 참조 0건** | 지우는 것은 별건 변경이다. 지우기 전 `deletion-auditor` 로 `__tests__/`·`scripts/verify-*` 3면 확인 |
| 🟠 `paid-flow-gates.yml` 트리거 구멍 | 그 파일에 `styles/` 문자열이 **0건**, `public/js/saju-engine.js` 도 **0건**. `js/saju-engine.js`·`index.html`·`public/*/index.html` 은 있다. `styles/**` 를 트리거로 가진 워크플로는 `pr-ci.yml` **하나뿐** | CSS 단독 커밋이 결제 게이트를 잠재운다. 트리거 추가는 CI 변경이라 🔴 RED — 별건으로 다룰 것 |
| 🟡 `_zwBuildLifeAnimalCards` 마크업 중복 | 같은 카드 골격을 분기별로 반복한다(아래 G 절) | 이번엔 클래스만 바꾸고 구조는 그대로 뒀다. 구조 정리는 `verify:ziwei-chart-detail-view` 48 단언과 함께 다뤄야 한다 |
| ⚪ "`독수리이`" 조사 오류는 **존재하지 않는다** | `grep -c '독수리이' js/saju-engine.js` = **0** | 옛 기록에 그런 지적이 있어도 그 리터럴로는 없다. 다시 찾지 말 것 |

---

## §3 함정 모음 — 여기서 시간을 잃는다

### 🔴 `sync:public` 한 번은 고정점이 아니다 — `js/**` 를 고쳤으면 두 번 돌린다

이번에 main 을 이틀 가까이 레드로 둔 원인이다(§1 의 표). `verify-public-mirror-fresh.mjs:18` 주석은 *"sync:public 이 멱등이라는 것은 실측으로 확인했다(2026-08-21: 연속 두 번 실행 시 2회차 변경 0건)"* 라고 적혀 있지만, **그 측정은 `js/**` 가 안 바뀐 상태에서 한 것이다.** `js/**` 를 고치면 한 번으로 수렴하지 않는다.

기전(실측으로 확인):

1. `index.html` 은 `/js/core/index-inline-runtime.js?v=<런타임 파일 내용 해시>` 를 물고 있다([`scripts/lib/asset-cache-keys.mjs:131`](../../scripts/lib/asset-cache-keys.mjs#L131) 의 `keyForRepoRel`).
2. 그 런타임 파일 **안에도** `saju-engine.js?v=…` 같은 다른 자산 참조가 있고, `sync` 는 한 패스 안에서 그것들도 다시 찍는다(로그: `Restamped index-inline-runtime.js cache keys` / `Updated root index-inline-runtime.js cache keys`).
3. 자기 참조만 자리표시자로 바꾸는 정규화(같은 파일 `:82`)는 **다른 자산을 가리키는 참조는 해시에 그대로 넣는다** — 의도된 설계다(그래야 CDN 이 옛 바이트를 계속 서빙하지 않는다).
4. 따라서 엔진을 고치면 → 런타임 파일 내용이 바뀌고 → 런타임 파일의 해시도 바뀌는데, **`index.html` 에 그 해시를 찍는 일은 이미 그 패스에서 지나가 버렸다.** 다음 실행에서야 따라온다.

즉 `js/**` 를 고친 커밋은 **한 번만 돌리면 `index.html` 의 토큰 1개가 항상 한 세대 낡는다.** CI 의 `verify:public-mirror-fresh` 는 sync 를 한 번 돌려 바뀌는 파일을 세므로, 그 한 줄 때문에 **셸 7개 전부**를 "낡았다"로 보고한다. 로그만 보면 미러를 안 담은 것처럼 보이지만 원인은 전혀 다르다 — 그래서 두 번 잘못 짚었다.

```powershell
npm run sync:public; echo "EXIT=$LASTEXITCODE"   # 1회차
npm run sync:public; echo "EXIT=$LASTEXITCODE"   # 2회차 — 여기서 변경이 더 나오면 1회차는 미완이었다는 뜻
git status --porcelain                            # 2회차 뒤 새로 더러워진 파일이 없어야 한다
```

**커밋 전 직접 확인**(공유 체크아웃에서는 `verify:public-mirror-fresh` 를 못 돌리므로): `index.html` 의 `?v=` 참조 전부를 자산 내용 해시로 다시 계산해 박힌 값과 비교한다. 2026-09-19 기준 참조 67개 전부 일치해야 한다(스크래치 `token-audit.mjs`). 한 개라도 어긋나면 **sync 를 한 번 더 돌리라는 신호**다.

🟡 범위 밖 후속 과제: 생성기가 `index.html` 의 자산 토큰을 **런타임 파일 재작성 뒤에** 찍도록 순서를 바꾸면(또는 수렴까지 루프를 돌면) 이 함정 자체가 없어진다. `verify:public-mirror-fresh` 가 sync 를 **두 번** 돌려 판정하게 하는 것도 같은 값이다 — 지금은 사람이 기억해야 하는 규칙이라 또 낡는다.

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

### `verify-basic-fortune-library.mjs` 가 간헐적으로 타임아웃한다 (가드 결함 아님)

2026-09-19 에 1회 봤다. 실패 지점은 항상 같다:

```
page.waitForFunction: Timeout 30000ms exceeded.
    at closeModalAndWait (scripts/verify-basic-fortune-library.mjs:67:16)
    at scripts/verify-basic-fortune-library.mjs:535:5
```

`:535` 는 **렌더 실패를 목으로 강제한 경로 다음**의 모달 닫기다. 히스토리 상태 경합이라 닫힘 조건이 그 판에서만 늦는다. **재실행하면 EXIT 0, `"errors": []`** 로 붙는다(그렇게 확인했다). 그러니 이 스택이면 CSS·마크업 변경을 되돌리기 전에 **한 번 더 돌려 볼 것** — 이번에 패널 안으로 스코프된 CSS 규칙이 원인인지 30분 의심했는데 아니었다. 계속 재현되면 그때 `closeModalAndWait` 의 대기 조건을 보라.

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
npm run sync:public; echo "EXIT=$LASTEXITCODE"   # 🔴 js/** 를 고쳤으면 2회차까지 (§3 고정점)
npm run verify:style-sync
npm run verify:runtime-cache-sync                 # 셸들의 런타임·엔진 토큰 일치
npm run verify:static-asset-cache-keys            # 루트 bare 자산 해시 일치

# 변경 기반 일괄 검사
npm run check:fast
```

**미러 신선도를 더러운 트리에서 판정하는 법** (`verify:public-mirror-fresh` 가 "판정 불가"로 빠질 때):
```bash
git status --porcelain | grep -v '^??' | sed 's/^...//' | sort > before.txt
npm run sync:public
git status --porcelain | grep -v '^??' | sed 's/^...//' | sort > after.txt
comm -13 before.txt after.txt    # 새로 더러워진 = 낡았던 미러
npm run sync:public              # 🔴 한 번 더 — comm 이 다시 비어야 고정점이다(§3)
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
