---
status: open
updated: 2026-09-13
next: 프로덕션 워커 로그 표본 확보가 선행 조건. 그 전에는 코드를 켜지 않는다.
---

# 회당결제 2단계(PER_USE_ENFORCE) 승격 — 근거와 절차

2026-08-01 에 시작한 **1단계(관측 전용)** 가 6주째 그대로다. 이 문서는 "왜 아직 안 켰는가"와
"켜려면 무엇을 해야 하는가"를 실측으로 고정한다. **코드는 이 세션에서 한 줄도 바꾸지 않았다**
(주석의 VVIP 가격 오기 1건 제외 — 아래 참조).

## 현재 상태 (2026-09-13 실측)

플래그 정의는 레포 전체에 **한 곳**뿐이다.

```js
// worker/routes/nakshatra-premium.js:239-242
// 🔴 1단계는 관측 전용이다 — 증빙 결과를 로그로만 남기고 아무것도 막지 않는다.
//    차단(402)은 실사용 로그에서 정상 결제 경로가 전부 proven:true 로 찍히는 것을 확인한 뒤 켠다.
//    이 순서를 지키는 이유: 검증이 과하면 이미 결제한 사용자가 402 를 맞아 돈만 나간다.
const PER_USE_ENFORCE = false;
```

도입 커밋은 `a8ee1a00b`(2026-08-01). `git log -L` 기준 그 뒤 **값 변경 0회**다.

소비처는 죽은 분기 2개뿐이다 — `PER_USE_ENFORCE` 가 `false` 라 블록 전체가 도달 불가다.

| 라우트 | 가격 | 증빙 호출 | 차단 분기 | 실효 관문 |
|---|---|---|---|---|
| `/api/nakshatra-premium/muhurta` | ₩5,000 (50코인) | `observePerUsePayment(…, "muhurta")` | `:299` `if (PER_USE_ENFORCE && proof)` — **죽음** | `requireAuth` 뿐 |
| `/api/nakshatra-premium/vvip-codex` | ₩30,000 (300코인) | `observePerUsePayment(…, "vvip-codex")` | `:366` 동일 — **죽음** | `requireAuth` 뿐 |
| `/api/nakshatra/compat` | ₩10,000 (100코인) | `verifyPerUsePayment(…)` | **차단 코드가 아예 없다** | `requireAuth` 뿐 |

🔴 **compat 은 플래그조차 없다.** `worker/routes/nakshatra.js:174-184` 는 `verifyPerUsePayment` 의
반환값을 변수에 담지도 않고 `logPerUsePaymentProof` 인자로 흘려보낸다. 즉 2단계는 compat 에 대해
**토글이 아니라 코드 추가**다.

가격 정본은 `worker/lib/paid-feature-registry.js:232-235`(compat `100/10000`, muhurta `50/5000`,
vvip-codex `300/30000`)다.

## 가드가 `false` 를 고정하고 있다

```js
// scripts/verify-nakshatra-premium.mjs:572-573
// 1단계는 관측 전용 — 차단 스위치가 꺼져 있어야 한다. 2단계에서 true 로 바꾸면서 이 단언도 뒤집는다.
check("🔴 1단계: 차단 스위치가 꺼져 있다(PER_USE_ENFORCE = false)", /PER_USE_ENFORCE = false/.test(premium));
```

이 가드는 `scripts/run-paid-gate-suite.mjs:112` 를 거쳐 `.github/workflows/paid-flow-gates.yml` 의
**차단 경로**에 있다. 값만 바꾸고 단언을 그대로 두면 CI 가 빨갛게 막는다 — 설계된 동작이다.

`scripts/verify-human-design.mjs:348` 은 반대 방향의 단언이다: human-design **차트**는 무료화되면서
`PER_USE_ENFORCE` 라는 문자열 자체가 라우트에 남아 있지 않을 것을 강제한다. 나크샤트라와 혼동하지 말 것.

## 🔴 왜 같은 헬퍼를 쓰는 나머지는 이미 차단인가

`verifyPerUsePayment`(`worker/lib/nakshatra-paid-access.js`)를 쓰는 워커 핸들러 **12개 중 9개가
이미 402 로 차단**한다. 관측 전용으로 남은 것은 나크샤트라 3종뿐이다.

| 핸들러 | 차단? | 증거 |
|---|---|---|
| nakshatra-premium muhurta | ❌ 관측 | `nakshatra-premium.js:299` (플래그 false) |
| nakshatra-premium vvip-codex | ❌ 관측 | `nakshatra-premium.js:366` (플래그 false) |
| nakshatra compat | ❌ 관측 | `nakshatra.js:174-184` (차단 코드 없음) |
| fortune guardian(연이 운명 상담) | ✅ | `fortune.js:6277-6286` → `guardian-fortune-usage.js:657` `status: 402` |
| fusion-fortune(초융합 운세) | ✅ | `fusion-fortune.js:52-60` → `lib/fusion-fortune.js:1320` `status: 402` |
| human-design-report | ✅ | `human-design-report.js:394-411` (`proven===null` → degraded, `!==true` → 402) |
| animal-totem | ✅ | `animal-totem.js:570-592` (503 / 402) |
| tarot year · oracle-consultation · ijik | ✅ | `tarot.js:330-354` · `:455-478` · `:559-583` |
| relationship-boundary-test | ✅ | `relationship-boundary-test.js:375-377` (503 / 402) |

연이·초융합 두 상담의 승격은 `4d009ca3c`(2026-08-07, 전용 재화 폐지와 함께)다. 근거 주석은
`worker/lib/nakshatra-paid-access.js:3-9`.

## 🔴 왜 지금 켤 수 없는가 — 증빙을 로컬에서 볼 수 없다

1단계의 종료 조건은 도입 주석이 직접 적어 뒀다: **"실사용 로그에서 정상 결제 경로가 전부
`proven:true` 로 찍히는 것을 확인한 뒤"**.

그런데 그 증빙을 남기는 곳은 이것뿐이다.

```js
// worker/lib/nakshatra-paid-access.js:228-239
export function logPerUsePaymentProof(featureKey, proof) {
  console.info("[nakshatra-paid-access]", JSON.stringify({ featureKey, proven, source, reason }));
}
```

`console.info` 는 Cloudflare 워커 런타임 로그로만 나간다. 집계 저장소도, 조회 API 도, 관리자 화면도
없다 — 확인하려면 **`wrangler tail` 실시간 관측이나 Logpush 설정**이 필요하고, 둘 다 프로덕션
접근이다. 로컬 검증으로는 이 조건을 충족시킬 방법이 **없다**.

근거 없이 켜면 도입 주석이 경고한 그대로가 된다: 증빙 조회가 정상 결제를 놓치는 케이스가 하나라도
있으면 **이미 돈을 낸 사용자가 402 를 맞는다.** 매출이 걸린 판단이므로 표본 없이 진행하지 않는다.

한편 방치의 비용도 실재한다 — 세 라우트는 지금 `requireAuth` 만 통과하면 본문이 나간다. 즉
**로그인 계정이 결제 없이 ₩5,000·₩30,000·₩10,000 상품 본문을 받을 수 있다.** 이 문서는 그 상태를
"알고 있으면서 근거를 기다리는 중"으로 명시한다.

## 승격 절차 (체크리스트)

1. **표본 확보** — 프로덕션에서 `wrangler tail` 또는 Logpush 로 `[nakshatra-paid-access]` 라인을
   수집한다. 세 `featureKey` 각각에 대해 정상 결제 건이 `proven:true` 로 찍히는지, `proven:false`
   / `VERIFY_THREW` 비율이 얼마인지 본다. **`proven:false` 가 정상 결제에서 한 건이라도 나오면
   켜지 않는다** — 먼저 `verifyPerUsePayment` 의 조회 경로를 고친다.
2. `worker/routes/nakshatra-premium.js:242` → `const PER_USE_ENFORCE = true;`
3. `worker/routes/nakshatra.js` compat 에 차단 분기 **신설** — `verifyPerUsePayment` 반환값을
   변수에 담고 `proven === null` → 503(degraded), `proven === false` → 402. 형태는
   `nakshatra-premium.js:299-302` 과 `relationship-boundary-test.js:375-377` 을 따른다.
   🔴 `VERIFY_THREW`(예외)는 **402 로 만들지 않는다** — `verify-nakshatra-premium.mjs:578-579` 가
   "증빙 확인이 터져도 본문을 막지 않는다"를 단언한다.
4. `scripts/verify-nakshatra-premium.mjs:573` 단언을 반전한다(`PER_USE_ENFORCE = true`).
   compat 차단을 단언하는 줄도 함께 추가한다 — 안 그러면 3번이 조용히 되돌아가도 가드가 안 문다.
5. `npm run verify:nakshatra-premium` + **변이 검증**: 세 라우트 각각에서 차단 분기를 지웠을 때
   가드가 무는지 확인한다. 도는 가드와 무는 가드는 다르다.
6. 롤백은 `:242` 를 `false` 로 되돌리고 단언을 원복하는 커밋 하나. force-push 불필요.

## 이번 세션에서 한 것

`worker/lib/nakshatra-paid-access.js:4` 의 주석이 vvip-codex 를 **₩50,000** 이라 적고 있었다.
정본은 전부 **₩30,000** 이다 — `paid-feature-registry.js:235`(`cost: 300 / 30000`), 라우트
`coinPrice: 300`, `VvipClient.tsx` `AMOUNT_KRW = 30000`, `verify-nakshatra-premium.mjs:515`.
주석만 틀렸으므로 주석을 고쳤다. 기록은 [`docs/CONTEXT_AUDIT.md`](../CONTEXT_AUDIT.md).

## 다음 세션의 첫 문장

> `docs/handoff/per-use-enforce-stage2-2026-09-13.md` 를 읽었다. 나크샤트라 3종은 아직 관측
> 전용이고, 승격의 선행 조건은 프로덕션 워커 로그 표본이다. 표본 없이 플래그를 켜지 않는다.
