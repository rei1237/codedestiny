# 가드 무결성 감사 (2026-08-13)

낭비 제거 리팩토링을 하다 **가드 자체가 고장나 있는 것**을 연달아 발견했다. 코드 삭제보다 이쪽이 더 급해서 따로 남긴다.

공통 증상은 하나다 — **초록불인데 아무것도 지키지 않는다.** 가드가 실패하면 누구나 안다. 가드가 조용히 통과하면 아무도 모른다.

---

## 요약

| # | 가드 | 상태 | 조치 |
|---|---|---|---|
| G-1 | `verify:auth-session-stability` | 단언 0개 실행하고 throw | ✅ PR #547 |
| G-2 | `verify:worker-size` | 항상 `exit 0`, 검사 0 | ✅ PR #549 |
| G-3 | `verify-auth-event-loop-guard` SHELLS | 셸 1종 미커버 | ✅ PR #540 |
| G-4 | `db.transaction-budget.test.js` 외 10곳 | 빌드 산출물을 소스로 오인 | ✅ PR #557 |
| G-5 | `verify:*` 미배선 다수 | 존재하나 아무도 호출 안 함 | ✅ PR #558 |
| G-6 | `deploy:critical` ↔ paid-flow-gates 커버리지 차이 | 검증 안 됨 | ✅ PR #558 (G-5 와 같은 가드) |
| G-7 | `verify-auth-event-loop-guard` 대상 목록 | **G-3 재발** — 프로필 카드 무한 로딩으로 프로덕션 표면화 | ✅ PR #567 + 커버리지 메타 가드 |

> **G-5·G-6 후속 정정 (2026-08-13)**
> - 위 "54개"는 손으로 센 값이라 **믿지 말 것.** 정본은 `npm run verify:guard-wiring` 이 계산한다(실측: `verify:*` 178개 중 88개 배선 / 90개 미배선 선언).
> - 아래 G-5 표의 `verify:public-parity` 는 **오류**였다 — 실제로는 `scripts/build-cf-main.mjs` 안에서 `build:cf` 의 blocking 스텝으로 이미 돌고 있었다. 이런 "파일·배열 형태의 배선"을 손으로 세다 놓친 것이 애초에 숫자가 틀린 이유다.
> - 배선한 것은 `verify:mobile-detail-nonintrusive` 하나뿐이다(문서가 이미 "CI 차단"이라 약속하고 있었다). 나머지는 사유와 함께 **미배선으로 선언**했다 — 게이트 추가는 사용자 승인 사항이기 때문이다.

---

## ✅ 해결됨 (참고용 — 같은 패턴을 찾을 때의 본보기)

### G-1. `verify:auth-session-stability` 가 단언 하나도 못 돌고 죽어 있었다

```
Error: app/_lib/auth-client.ts: import 매핑 누락 → "@/js/core/app-context.js"
```

**원인 두 겹**:
1. 하네스가 모든 import 를 명시적 표로 재지정하는데, `auth-client.ts` 가 새로 import 한 `@/js/core/app-context.js` 가 표에 없었다. **이 fail-closed 동작 자체는 옳다** — 고칠 것은 표다.
2. 더 근본적으로, **이 검증기를 부르는 워크플로가 없었다.** 그래서 ①이 생긴 시점에 신호가 0이었다.

**조치**: 스텁 추가(`isApp()` → `false`, 웹 세션 재현이므로) + `paid-flow-gates.yml` 에 배선(형제 가드 `verify:auth-event-loop` 옆). 트리거 경로에 `app/_lib/auth-client.ts` 가 이미 있어, **이번 고장을 낸 그 변경이 앞으로는 가드를 깨운다.** 6/6 통과.

### G-2. `verify:worker-size` 가 존재하지 않는 산출물을 찾고 있었다

```js
if (!existsSync(handlerPath)) {           // .open-next/server-functions/default/handler.mjs
  console.warn("... Skipping size budget check.");
  process.exit(0);                        // ← 항상 여기
}
```

프로덕션 워커는 OpenNext 가 아니라 `wrangler deploy --config worker/wrangler.toml` 로 빌드된다. 그 파일은 애초에 생기지 않는다. `pr-ci.yml` 이 `build:worker` **바로 뒤에서** 이걸 불렀으니 초록불이 예산을 지키는 것처럼 보였다.

**고친 뒤 첫 실측: gzip 2.89 MiB / 무료 플랜 3 MiB = 96.3%, 남은 여유 0.11 MiB.**

**조치**: 실제 wrangler 번들(`build:worker --outdir`)을 재고, 산출물이 없으면 실패하며, 90% 부터 경고.

> 🔴 **함정**: wrangler 는 `--outdir` 를 **설정 파일이 있는 디렉터리**(`worker/`) 기준으로 푼다. 그래서 값이 `../build-cache/worker-bundle` 이다 — 앞의 `../` 가 루트로 되돌리는 부분이고, 빼면 13 MiB 번들이 `worker/` 안에 떨어져 **G-4** 를 유발한다. 오타로 보고 정리하지 말 것.

### G-3. 셸 미러 하나가 가드 목록에서 빠져 있었다

`verify-auth-event-loop-guard.mjs` 의 `SHELLS` 가 6종만 열거해 `public/zh-tw/index.html` 이 빠져 있었다. 추가 후에도 통과 — 드리프트가 아니라 **커버리지 구멍**이었다.

### G-7. 같은 가드의 커버리지 구멍이 **다시** 났다 — 이번엔 프로덕션 증상까지 갔다

G-3 과 **같은 가드, 같은 원인, 다른 파일**이다. `verify-auth-event-loop-guard.mjs` 가 `SHELLS`(index.html 계열)와 `RUNTIMES`(index-inline-runtime.js)만 열거하는데, `js/destiny-profile.js` 도 `cd:auth-changed` 를 듣고 있었다. 그 리스너에만 source 필터가 없었다.

```js
// js/destiny-profile.js — 수정 전
window.addEventListener('cd:auth-changed', _dpScheduleAuthScopeRefresh);
//                                         ^ 이벤트 인자를 받지 않아 필터가 원천적으로 불가능
```

같은 이벤트를 듣는 다른 4곳(`index.html:400`·`:15035`, `js/core/index-inline-runtime.js`, `js/core/access-store.js`)은 전부 필터가 있었다. 워크플로 주석은 *"source 필터 하나만 빠져도 루프가 되살아난다"* 라고 **정확히 경고하고 있었는데**, 가드가 그 파일을 열지 않아 내내 초록불이었다.

**증상**: 이용권 갱신이 스스로 쏘는 되울림(`subscription-sync` / `membership-cache`)마다 프로필 스코프를 통째로 버리고 로딩 카드를 다시 그렸다. 카드가 0장인 계정은 되돌아갈 캐시가 없어 매번 로딩으로 떨어졌고, 5분 세션 하트비트와 탭 재포커스가 그 이벤트를 계속 만들어내 사용자에게는 **무한 로딩**이었다.

라이브 자산을 jsdom 에 얹어 실측한 값:

```
되울림 2발 → 로딩 카드 재그림 3회 + /api/profile 3회
/api/profile 이 느릴 때: 40초마다 잠깐 풀렸다 되돌아가는 진동
```

**조치**: PR #567 이 필터를 넣고 가드 대상에 이 파일을 추가했다. 그런데 그건 **목록을 한 칸 더 늘린 것뿐**이라 세 번째 사고를 미룰 뿐이다. 그래서 별도로 `verify:auth-changed-coverage` 를 만들었다 — 손으로 쓴 목록을 신뢰하지 않고 소스에서 리스너를 **전수 발견**해, 각각이 `filtered`(필터 본문을 잘라 확인) 또는 `benign`(사유 기재, 가능하면 근거도 기계 검사)으로 분류돼 있는지 본다. **분류되지 않은 새 리스너는 실패다.**

곁들여 그 가드가 스스로 드러낸 것 둘:
- `js/core/access-store.js` 의 필터는 **철자가 다르다**(`source` 가 아니라 `authEvent`/`authSource`). 의미는 같지만 정본 정규식으로는 안 잡힌다 — 기존 가드가 이 파일을 안 봤기 때문에 아무도 몰랐다.
- 스캔 대상 6개 중 **3개가 워크플로 트리거 `paths` 에 없었다**(`index-inline-runtime.js` 포함 — 형제 가드가 이미 검사하던 파일인데도). "가드는 검사하는데 CI 가 안 깨어나는" 같은 종류의 구멍이라, 그 정합성도 같은 가드가 기계로 강제하게 했다.

---

## ✅ 나중에 해결됨 — 원래 "미조치"로 남겼던 3건

> **2026-08-14 실측 재확인.** 아래 세 건은 이 문서를 처음 쓸 때 미조치로 남겼고 요약 표만 ✅ 로 갱신돼 **표와 본문이 어긋나 있었다.** 그 상태에서 `CLAUDE.md` 가 본문을 인용해 "3건이 미조치로 남아 있다"고 적었고, 다음 세션이 이미 끝난 일을 다시 하려 들 수 있었다. 진단 기록은 같은 패턴을 찾을 때의 본보기로 그대로 두고, 각 항목 머리에 **무엇이 어떻게 닫혔는지**를 적는다.

### G-4. `worker/` 안의 빌드 산출물을 정적 가드가 소스로 오인한다 — ✅ 해결

> **닫힘**: `__tests__/worker/db.transaction-budget.test.js` 의 `walk()` 가 `isBuildArtifactDir(entry)` 로 산출물 디렉터리를 건너뛴다. 회피(산출물을 `worker/` 밖에 두기)가 아니라 스캐너 자체가 고쳐졌다.

**재현**: `worker/` 하위 어디든 번들된 JS 를 두면(예: `--outdir` 를 `worker/build-cache/` 로 잘못 지정) 다음이 깨진다.

```
__tests__/worker/db.transaction-budget.test.js
  ✕ worker 의 모든 withTransaction 호출이 명시적 시간 상한을 넘긴다
  + Received: ".wrangler\\size-check\\index.js:54183 (닫는 줄 54192: });)"
```

**원인**: 스캐너가 `WORKER_DIR`(`worker/`) 전체를 `walk()` 하면서 **제외 목록이 없다**. 번들 안에 섞여 들어간 `withTransaction` 호출을 "시간 상한 없는 위반"으로 신고한다.

**당시 상태**: 산출물을 `worker/` **밖**(`build-cache/`)에 두어 **회피**만 했다. 스캐너 자체는 그대로였다.

**한 일**: `worker/` 를 훑는 정적 가드에 산출물 제외를 넣었다. 대상:
- `__tests__/worker/db.transaction-budget.test.js` (`walk(WORKER_DIR)`)
- 같은 방식으로 `worker/**` 를 훑는 다른 가드들(`verify:worker-no-undef`, `user-model-single-source.static.test.js` 등 — 전수 확인 필요)

제외할 이름: `build-cache/`, `.wrangler/`, `dist/`, `out/`, `node_modules/`, `*.map`.

**왜 중요한가**: 지금은 아무도 `worker/` 안에 빌드를 안 하니까 조용하다. 누군가 `--outdir` 를 상대경로로 쓰는 순간(그게 자연스러운 표기다) 워커 가드 여러 개가 한꺼번에 거짓 실패한다. 그러면 **가드를 의심하는 대신 코드를 의심하게 된다.**

### G-5. `verify:*` 중 다수가 어디서도 실행되지 않는다 — ✅ 해결

> **닫힘**: `scripts/verify-guard-wiring.mjs`(메타 가드)가 `pr-ci.yml` 에 배선됐다. 모든 `verify:*` 는 **게이트에서 도달 가능하거나**, 아니면 사유와 함께 `UNWIRED_BY_DESIGN` 에 **선언돼 있어야** 하고, 둘 다 아니면 실패한다. fail-closed 3방향이라 낡은 선언·이름이 바뀐 선언도 함께 잡는다.
>
> 🔴 **아래 본문의 "177개 중 54개" 를 인용하지 말 것.** 손으로 센 값이고 이 문서 스스로 이미 한 번 정정했다. 숫자가 필요하면 `npm run verify:guard-wiring` 을 돌려 그 출력을 쓴다.

**실측(2026-08-13)**: `verify:*` npm 스크립트 **177개** 중 **54개**가 다른 npm 스크립트·워크플로·`scripts/` 어디에서도 호출되지 않는다. 그중 3개는 마이그레이션 `--check`(본래 수동)이므로 **실질 51개**.

배선 판정 기준은 셋 중 하나라도 있으면 배선으로 봤다: 다른 npm 스크립트가 `npm run <name>` 으로 호출 / 워크플로가 호출 / 누군가 그 **파일 경로**를 직접 실행. 재생성 스크립트는 이 PR 에 포함하지 않았으니 필요하면 위 기준으로 다시 만들 것(이름 기준으로만 세면 103개가 나오는데, 파일 경로 호출을 놓쳐 **과장된 수치**다).

**당시 눈에 띈 것들** — 이름만 보면 당연히 CI 에 있을 것 같은데 없었다. 아래 표는 **그때의 스냅샷**이며 현재 상태가 아니다(현재는 `npm run verify:guard-wiring` 이 답한다):

| 스크립트 | 왜 눈에 띄었나 | 이후 |
|---|---|---|
| `verify:public-parity` | 셸 6종 ↔ `public/` 미러 정합 | ⚠️ **오판이었다** — `scripts/build-cf-main.mjs` 안에서 `build:cf` 의 blocking 스텝으로 이미 돌고 있었다. 손으로 세다 "파일·배열 형태의 배선"을 놓쳤다 |
| `verify:mobile-detail-nonintrusive` | CLAUDE.md 가 "CI 차단"이라고 적어 둔 가드인데 배선이 없었다 | ✅ `pr-ci.yml` 에 배선됨 (문서가 이미 약속한 것이라 "빠진 칸 채우기"로 처리) |
| `verify:auth-public-origin` · `verify:payment-service-boundary` · `verify:payment-choice-single-instance` · `verify:pass-check-retry` · `verify:static-asset-cache-keys` · `verify:route-await-dispatch` | OAuth origin 고정 · 결제 경계 · 결제창 단일 인스턴스 · 이용권 재시도 · 자산 캐시 키 · 라우트 await 디스패치 | 사유와 함께 `UNWIRED_BY_DESIGN` 에 **선언**됨. 배선은 게이트 추가이므로 사용자 승인 사항 |

**남아 있는 규칙** (이 항목이 닫힌 뒤에도 계속 적용된다):

- 새 `verify:*` 는 **배선하거나, 사유와 함께 `UNWIRED_BY_DESIGN` 에 선언하거나** 둘 중 하나를 해야 한다. 아무것도 안 하면 `verify:guard-wiring` 이 실패시킨다.
- 🔴 **게이트 추가는 사용자 승인 사항이다**(CI gate scope 룰). 배선 후보는 목록으로 제안하고 승인을 받을 것. G-1·`verify:mobile-detail-nonintrusive` 는 **문서나 형제 가드가 이미 그 게이트를 약속하고 있었기에** 빠진 칸 채우기로 처리한 것이다 — 그 근거가 없으면 임의로 넣지 말 것.

### G-6. `deploy:critical` 과 `paid-flow-gates` 의 커버리지 관계가 검증되지 않는다 — ✅ 해결

> **닫힘**: G-5 와 같은 가드(`verify:guard-wiring`)가 답한다. `package.json` 의 `verify:*` 전체를 기준으로 "어느 게이트가 이걸 부르는가"를 계산하므로, 두 손 관리 목록 사이로 검증기가 빠져나가면 실패한다.

두 목록이 손으로 관리되고, 서로 포함 관계가 아니며, 한쪽에만 있는 검증기가 있었다(G-1 이 그 사례였다: `verify:auth-event-loop` 는 게이트에 있는데 형제인 `verify:auth-session-stability` 는 양쪽 다 없었다).

**알려진 한계(그대로 남아 있다)**: "배선됨"은 **호출된다**는 뜻이지 **실패가 머지를 막는다**는 뜻이 아니다. `build-cf-main.mjs` 의 `i18n:check` 스텝은 `optional: true` 라 실패해도 빌드를 세우지 않는다 — 그 아래 i18n 검증기들은 "배선됐지만 비차단"이고, 이 가드는 그 구분을 하지 않는다.

---

---

## 🔴 사고 기록 — 릴리스가 막혔다 (2026-08-12 23:00 KST경)

**증상**: `495653dff` 이후 릴리스가 **연속 실패**했다. 그 커밋 이후 아무것도 배포되지 않았다.

**프로덕션 피해는 없었다.** 라이브 워커는 `495653dff` 에 머물러 있었고, 실패한 릴리스들이 **깨진 커밋의 승격을 막아 준 것**이다. 가드가 제 역할을 했다.

**원인은 두 개, 둘 다 "각 PR 은 정합했는데 합쳐진 main 에서만 깨지는" 형태였다.**

### 사고 1 — `PAYMENT_ROUTE_USER_PROJECTION` 미정의 (배포됐다면 결제 라우터 전체 다운)

`worker/routes/payments.js` 의 `handlePaymentRoutes` **주 요청 경로**가 삭제된 상수를 참조했다.

```js
: await requireUserFromRequest(request, env, {
    userProjection: PAYMENT_ROUTE_USER_PROJECTION,   // ← ReferenceError
```

죽은 핸들러를 줄 범위로 잘라낼 때, 블록 끝의 `};` 를 `handlePaymentConfig` 의 끝으로 보고 잘랐다. 그건 **바로 뒤에 붙어 있던 const 객체의 끝**이었다. 함수와 상수를 한 번에 지웠다.

- **테스트가 못 잡은 이유**: 테스트는 핸들러를 직접 호출한다. 이 줄은 **라우터 경로에만** 있다.
- **잡은 것**: `verify:worker-no-undef`(#548 이 추가). `deploy:critical` 에는 있지만 그 PR 의 PR CI 가 돌린 범위에는 없었다 → **G-6 이 말하는 커버리지 차이가 실제로 사고를 통과시켰다.**

### 사고 2 — env 계약에 죽은 소비자 9건

`config/env.contract.json` 이 `app/_lib/csrf.js` · `app/_lib/legacyApiProxy.js` 를 9개 변수의 소비자로 등재한 채 남았다.

계약을 정리한 시점에 그 두 파일은 **아직 머지되지 않은 다른 브랜치**에서 삭제될 예정이었다. 정리 스크립트는 "디스크에 존재하는 파일만 남긴다" 필터였으므로 **그때는 존재해서 그대로 뒀다.** 두 PR 이 모두 들어온 뒤에야 어긋났다.

### 왜 브랜치 단위 검증으로는 구조적으로 못 잡나

각 PR 은 **자기 base 에서** 검증된다. A 가 심볼을 지우고 B 가 그 심볼의 참조·등재를 지우는데 둘이 서로의 변경을 보지 못하면, **A 도 통과하고 B 도 통과하는데 A+B 는 깨진다.** 브랜치 룰셋이 "최신 base 유지"를 강제하지 않으므로(그리고 강제하면 순차 머지가 되어 느려진다) 이 창은 항상 열려 있다.

### 그래서 하는 것

🔴 **여러 PR 에 걸친 삭제 작업을 마쳤으면, 마지막에 머지된 `main` 을 받아 `npm run check:critical` 을 한 번 돌린다.**

```bash
git fetch origin main && git checkout origin/main
npm run check:critical      # 릴리스가 돌리는 그 체인 (exit 0 이어야 한다)
```

- **언제**: 한 작업 단위가 2개 이상의 PR 로 나뉘고, 그중 하나라도 **심볼·파일을 삭제**할 때.
- **왜 `check:critical` 인가**: 릴리스가 실제로 돌리는 체인이라, 여기서 통과하면 릴리스도 통과한다. 이번 두 사고는 각각 `verify:worker-no-undef` 와 `verify:env-parity` 가 잡았고 **둘 다 이 체인에 있다.**
- **발견하면**: 릴리스가 이미 막혀 있는 상태이므로 **핫픽스가 최우선**이다. 라이브 SHA 는 `curl https://code-destiny.com/api/version` 으로 확인한다 — 실패한 릴리스는 승격을 안 했으므로 보통 프로덕션은 무사하다.

> **G-6 이 닫힌 지금도 이 규율은 남는다.** `verify:guard-wiring` 은 "검증기가 어느 게이트에서도 안 도는 것"을 막지만, **각 PR 이 자기 base 에서만 검증된다는 구조 자체**는 못 바꾼다. A 가 심볼을 지우고 B 가 그 참조를 지우면 A 도 통과·B 도 통과인데 A+B 가 깨진다 — 그건 합쳐진 `main` 에서 한 번 돌려야만 보인다.

---

## 이 감사에서 반복해서 나온 교훈

**1. 부분 테스트 실행은 삭제 작업에서 위험하다.**
`test:worker:auth-payments`(27 스위트)로 통과를 확인하고 넘어갔는데 전체는 **140 스위트**였다. PR #543 이 CI 에서 두 번 실패했고 둘 다 이 이유다. 워커 심볼을 지울 때는 **CI 가 부르는 것과 같은 명령**(`jest --runInBand` 전체 + `test:node` + `smoke:core`)을 돌린다.

**2. 심볼을 지울 때는 `__tests__` 와 `scripts/verify-*` 를 함께 grep 한다.**
`grep`을 소스에만 걸어 `formatOrderDetailResponse`(테스트가 사용)와 `handleOrderDetail`(정적 테스트가 소스 문자열로 단언)을 놓쳤다.

**3. "임포터 0" 은 "죽었다" 가 아니다.**
`lib/payment/portone.ts` 는 import 가 0이지만 `verify-portone-single-payment-regression.mjs` 가 **파일로 읽어** 정본 형태로 단언한다. 지웠으면 낭비 제거가 아니라 deploy:critical 가드 파괴였다.

**4. 계약이 옮겨갔으면 단언도 옮긴다 — 죽은 사본을 되살리지 않는다.**
주문 소유권 검사(`ORDER_FORBIDDEN`)와 주문번호 마스킹은 V2 로 이동했다. 삭제된 구 핸들러를 살려 거기서 재는 대신, 단언을 `worker/payments/` 로 옮겼다.

**5. 가드는 fail-closed 여야 한다.**
G-1 의 "매핑 없으면 throw" 는 옳았다(고장이 드러났다). G-2 의 "산출물 없으면 exit 0" 은 틀렸다(고장이 숨었다). 대상이 없을 때 **통과시키는 가드는 가드가 아니다.**

**6. 🔴 여러 PR 에 걸친 삭제는 합쳐진 `main` 에서 `check:critical` 을 한 번 돌린다.**
브랜치 단위 검증은 이 부류를 **구조적으로** 못 잡는다 — 각 PR 이 자기 base 에서만 검증되므로 A 도 통과, B 도 통과인데 A+B 가 깨진다. 위 사고 기록의 두 건이 정확히 이 형태였고, 그 결과 릴리스가 연속 실패해 **아무것도 배포되지 않는 상태**가 됐다. 삭제가 2개 이상의 PR 로 나뉘면 마지막에 반드시:

```bash
git fetch origin main && git checkout origin/main && npm run check:critical
```

**7. 줄 범위로 코드를 자를 때 블록의 끝을 눈으로 믿지 않는다.**
`};` 를 함수의 끝으로 봤는데 바로 뒤 const 객체의 끝이었다(사고 1). 자른 뒤에는 잘라낸 **첫 줄과 마지막 줄을 출력해 확인**하고, 워커라면 `verify:worker-no-undef` 를 바로 돌린다.

**8. 🔴 손으로 쓴 대상 목록은 가드가 아니라 가드의 **가정**이다 — 그 가정도 검사해야 한다.**
G-3 과 G-7 은 같은 가드에서 같은 이유로 났다: `SHELLS`/`RUNTIMES` 같은 배열이 현실과 어긋났고, 어긋난 것을 아무도 몰랐다. 목록에 한 칸 더 넣는 것은 **다음 사고를 미루는 것**이지 고치는 게 아니다. 규칙이 "이 성질을 가진 모든 코드"에 걸리는 것이라면, 가드도 그 집합을 **소스에서 발견**하고 각 항목이 분류돼 있는지를 봐야 한다(`verify:auth-changed-coverage` 가 그 형태다). 분류되지 않은 새 항목이 실패가 아니면, 그 가드는 자기가 아는 것만 지킨다.

**9. 가드가 검사하는 파일은 그 가드를 부르는 워크플로의 트리거 `paths` 에 있어야 한다.**
없으면 "그 파일만 고친 PR 에서는 가드가 아예 돌지 않는다" — 목록 드리프트와 정확히 같은 종류의 구멍인데 훨씬 눈에 안 띈다. 실제로 G-7 을 고치다 보니 스캔 대상 6개 중 3개가 그 상태였고, 그중 하나는 형제 가드가 **이미 검사하고 있던** 파일이었다. 이 정합성은 사람이 기억할 일이 아니라 기계가 강제할 일이다.
