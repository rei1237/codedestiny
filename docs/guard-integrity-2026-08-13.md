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
| G-4 | `db.transaction-budget.test.js` | 빌드 산출물을 소스로 오인 | ❌ **미조치** |
| G-5 | `verify:*` 177개 중 **54개** 미배선 | 존재하나 아무도 호출 안 함 | ❌ **미조치** |
| G-6 | `deploy:critical` ↔ paid-flow-gates 커버리지 차이 | 검증 안 됨 | ❌ **미조치** |

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

---

## ❌ 미조치 — 다음 세션이 이어받을 것

### G-4. `worker/` 안의 빌드 산출물을 정적 가드가 소스로 오인한다

**재현**: `worker/` 하위 어디든 번들된 JS 를 두면(예: `--outdir` 를 `worker/build-cache/` 로 잘못 지정) 다음이 깨진다.

```
__tests__/worker/db.transaction-budget.test.js
  ✕ worker 의 모든 withTransaction 호출이 명시적 시간 상한을 넘긴다
  + Received: ".wrangler\\size-check\\index.js:54183 (닫는 줄 54192: });)"
```

**원인**: 스캐너가 `WORKER_DIR`(`worker/`) 전체를 `walk()` 하면서 **제외 목록이 없다**. 번들 안에 섞여 들어간 `withTransaction` 호출을 "시간 상한 없는 위반"으로 신고한다.

**현재 상태**: 산출물을 `worker/` **밖**(`build-cache/`)에 두어 **회피**만 했다. 스캐너 자체는 그대로다.

**해야 할 일**: `worker/` 를 훑는 정적 가드 전체에 산출물 제외를 넣는다. 최소 대상:
- `__tests__/worker/db.transaction-budget.test.js` (`walk(WORKER_DIR)`)
- 같은 방식으로 `worker/**` 를 훑는 다른 가드들(`verify:worker-no-undef`, `user-model-single-source.static.test.js` 등 — 전수 확인 필요)

제외할 이름: `build-cache/`, `.wrangler/`, `dist/`, `out/`, `node_modules/`, `*.map`.

**왜 중요한가**: 지금은 아무도 `worker/` 안에 빌드를 안 하니까 조용하다. 누군가 `--outdir` 를 상대경로로 쓰는 순간(그게 자연스러운 표기다) 워커 가드 여러 개가 한꺼번에 거짓 실패한다. 그러면 **가드를 의심하는 대신 코드를 의심하게 된다.**

### G-5. `verify:*` 177개 중 54개가 어디서도 실행되지 않는다

**실측(2026-08-13)**: `verify:*` npm 스크립트 **177개** 중 **54개**가 다른 npm 스크립트·워크플로·`scripts/` 어디에서도 호출되지 않는다. 그중 3개는 마이그레이션 `--check`(본래 수동)이므로 **실질 51개**.

배선 판정 기준은 셋 중 하나라도 있으면 배선으로 봤다: 다른 npm 스크립트가 `npm run <name>` 으로 호출 / 워크플로가 호출 / 누군가 그 **파일 경로**를 직접 실행. 재생성 스크립트는 이 PR 에 포함하지 않았으니 필요하면 위 기준으로 다시 만들 것(이름 기준으로만 세면 103개가 나오는데, 파일 경로 호출을 놓쳐 **과장된 수치**다).

**눈에 띄는 것들** — 이름만 보면 당연히 CI 에 있을 것 같은데 없다:

| 스크립트 | 왜 눈에 띄나 |
|---|---|
| `verify:public-parity` | 셸 6종 ↔ `public/` 미러 정합. 미러가 갈라지면 조용히 갈라진다 |
| `verify:mobile-detail-nonintrusive` | 🔴 **CLAUDE.md 가 "CI 차단"이라고 적어 둔 가드인데 배선이 없다** — 문서와 현실이 어긋난 사례 |
| `verify:auth-public-origin` | OAuth 콜백 origin 고정. 이번 감사에서 인증 엔드포인트를 지울 때 근거로 쓴 가드다 |
| `verify:payment-service-boundary` · `verify:payment-choice-single-instance` · `verify:pass-check-retry` | 결제 경계·결제창 단일 인스턴스·이용권 재시도 |
| `verify:static-asset-cache-keys` · `verify:route-await-dispatch` | 자산 캐시 키 · 라우트 await 디스패치 |

**해야 할 일**:
1. 51개를 셋으로 분류: **배선**(어느 게이트에?) / **삭제**(가치 없음) / **수동 도구로 명시**(스크립트 상단 주석에 "CI 미배선, 수동 실행" 이라고).
2. 🔴 **게이트 추가는 사용자 승인 사항이다**(CI gate scope 룰). 배선 후보는 목록으로 제안하고 승인을 받을 것. G-1 은 형제 가드가 **이미 같은 게이트에 있었기에** "빠진 칸 채우기"로 처리했다 — 그 근거가 없으면 임의로 넣지 말 것.
3. `verify:mobile-detail-nonintrusive` 는 문서가 이미 "CI 차단"이라고 약속하고 있으므로, **배선하거나 문서를 고치거나** 둘 중 하나는 해야 한다. 지금은 약속만 있다.

### G-6. `deploy:critical` 과 `paid-flow-gates` 의 커버리지 관계가 검증되지 않는다

두 목록이 손으로 관리되고, 서로 포함 관계가 아니며, 한쪽에만 있는 검증기가 있다(G-1 이 그 사례였다: `verify:auth-event-loop` 는 게이트에 있는데 형제인 `verify:auth-session-stability` 는 양쪽 다 없었다).

**해야 할 일**: `package.json` 의 `verify:*` 전체를 기준으로 "어느 게이트가 이걸 부르는가" 표를 만드는 메타 가드. 어디에도 안 걸린 검증기는 **의도적 제외로 명시**하게 강제한다.

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
