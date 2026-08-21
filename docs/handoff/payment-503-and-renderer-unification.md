# 인수인계 — 결제 503 프로덕션 승격 + React/정적 결제 렌더러 통일

> 작성 2026-08-21. 세션이 계속되며 작업이 여러 트랙으로 갈라졌다 — 다음 세션이 이 문서만 읽고
> 이어받을 수 있도록 트랙별로 "끝난 것 / 남은 것 / 방법"을 정리한다. 부족하면 이 문서에 보탤 것.

## 배경

"결제 플로우 503 오류 해소"로 시작해 두 갈래로 커졌다:
1. **결제 전용 DB 소켓 레인**([PR #846](https://github.com/rei1237/codedestiny/pull/846))을 스테이징에서
   재실측해 프로덕션 승격 여부를 판단하는 작업.
2. 사용자가 추가로 지적한 **"React와 정적 환경의 결제 플로우 차이"** — 결제 선택창 렌더러가
   3벌(정적 셸/React/독립 정적) 중복 구현인 것을 통일하는 작업.

두 트랙 모두 부분적으로 끝났고, 각각 남은 작업이 있다.

---

## 트랙 A — 결제 소켓 레인 프로덕션 승격

### 끝난 것

| PR | 내용 | 상태 |
|---|---|---|
| #878 | 결제 확정 시 auth-me/profile 엣지 캐시 무효화 + `/api/me/payment-phone` 503 오분류 수정 | 머지·라이브(스테이징) |
| #880 | `worker/wrangler.toml`에 `PAYMENTS_DB_SOCKET_LANE = "1"` 추가(스테이징과 동일화) + parity 가드 수정 | 머지·라이브(스테이징) |

스테이징 재실측(테스트 계정으로 체크아웃 3회 라이브 재현) 결과: `/api/billing/checkout`·`/api/prepare/v2` 3회 모두
200 OK, `/api/auth/me`·`/api/profile` 각 1회로 팬아웃 수렴 확인. 근거는 #880 PR 본문에 있다.

### 남은 작업 — 🔴 실제 프로덕션 반영은 사람의 승인이 필요하다

`worker/wrangler.toml`의 값은 이제 스테이징과 같지만, **main에 머지된 것은 스테이징에만 자동 배포된다.**
프로덕션에 반영하려면:

1. GitHub Actions → **Release Cloudflare Pages and Worker** → Run workflow
2. `mode: production` (다른 입력은 기본값: `pages_only=false`, `target_sha` 비움 = main HEAD)

**이 실행 자체가 실제 프로덕션 배포 행위다.** CLAUDE.md 규칙 2/3, `AGENTS.md`가 실결제·프로덕션 DB 쓰기와
동급으로 못박은 사항이라 — **그 정확한 승격에 대한 명시적 허락 없이는 실행하지 않는다.** 로컬에서 우회하는
경로는 없다(`scripts/lib/production-deploy-guard.mjs`가 차단).

사용자에게 승격 승인을 받으면: GitHub Actions UI에서 위 절차를 직접 실행(또는 `gh workflow run`으로 대행)하고,
승격 후 `verify:deployed-sha`가 자동으로 Pages/Worker SHA 일치를 확인한다(실패 시 자동 롤백).

---

## 트랙 B — React/정적 결제 렌더러 통일

원 설계는 D-1 → D-2(+D-3) → D-2.5 → D-4 순서였다. **D-1과 D-2.5는 사실상 같은 PR에서 함께 끝났다**(아래
"설계와 실제가 갈린 지점" 참고). 남은 것은 D-2·D-3·D-4다.

### 끝난 것

| PR | 내용 | 상태 |
|---|---|---|
| #886 | CSS 규칙 68개를 `js/core/checkout-entry.js`의 `PAYMENT_CHOICE_CSS_RULES`로 통합, 3렌더러가 참조만 하도록 교체. `verify-payment-choice-parity.mjs`/`verify-paid-gate-ui-regression.mjs`/`verify-billing-pass-policy.mjs`의 CSS 리터럴 단언을 새 정본 위치로 재조준 | 머지·라이브(스테이징) |

### 🔴 설계와 실제가 갈린 지점 — 다음 단계에서 반드시 참고할 것

**"CSS 배열 공유"와 "parity 가드 재정의"는 별도 PR로 나눌 수 없었다.** `verify-payment-choice-parity.mjs`의
CSS 비교 로직이 각 함수 본문에서 **리터럴 배열을 직접 파싱**(`fn.indexOf("[")` ~ `fn.lastIndexOf("].join(")`)
해 값을 eval하는 방식이었기 때문에, 배열을 공유 참조로 바꾸는 순간 그 파싱 자체가 깨진다. D-2(카드 마크업
공유)도 똑같은 함정이 있을 가능성이 높다 — **마크업을 공유 함수 호출로 바꾸기 전에, 그 마크업을 리터럴로
파싱하는 검사가 있는지 먼저 찾아라.**

**더 은밀한 함정도 실제로 겪었다**: `verify-billing-pass-policy.mjs`와 `verify-paid-gate-ui-regression.mjs`에
`assertContains(indexSource, "width:min(520px,100%)", ...)`처럼 **CSS 규칙 문자열을 마커로 삼아 index.html
전체에서 찾는 단언**이 있었다. 이건 카드 마크업이 아니라 CSS 텍스트를 우연히 매칭해 통과하던 것이라, CSS가
옮겨가자 나중에야(로컬 검증을 다 통과하고 **CI에서**) 깨졌다. D-2 착수 전에 아래 검색을 다시 돌려서 이런
우연한 매칭이 더 있는지 먼저 확인할 것:

```
git grep -n "assertContains(indexSource\|assertBefore(indexSource" -- 'scripts/*.mjs'
```

그리고 D-2가 옮길 마크업 조각(`data-mode="pass-store"` 등 실제 HTML 속성, `cd-direct-payment-cardhead` 등
클래스명)으로 같은 검색을 한 번 더 돌려, `indexSource`를 직접 보는 단언이 있으면 미리 새 정본 위치로 재조준
계획에 넣어라.

### 남은 작업

**D-2. 카드 마크업/뷰모델 공유 (중간 위험)**
- `checkout-entry.js`에 순수 함수 `buildPaymentChoiceCardsHtml(input)` 추가. 렌더러별 `escape`/`text`(i18n
  wrapper)/조건값(`allow`/`disabled`/`badgeLabel`/`titleLabel`/`amountText`/`descText` 등)을 인자로 받아 카드
  HTML을 리턴한다. **조건 계산 자체는 옮기지 않는다** — React만 갖는 `monthlyHint.after` 잔량 문구, React만의
  `aria-label`, 셸만의 "이용권만 불가" 분기는 환경별 실제 정보량 차이이므로 강제로 지우지 않는다.
- 현재 앵커(2026-08-21 기준, D-1로 인해 원래 설계 문서의 줄번호에서 이동했다):
  - `index.html:23650` `_cdChooseServicePaymentMode`
  - `app/_lib/billing-client.ts:1008` `openReactPaymentChoiceModalInner`
  - `js/destiny-profile.js:11125` `_dpRenderStandalonePaymentChoice`
- `config/payment-freeze.json`: 위 세 함수 중 index.html·destiny-profile.js의 marker 2개 + `billing-client.ts`
  wholeFile 1개가 동시에 갱신 필요 → `node scripts/verify-payment-freeze.mjs --update` 같은 커밋.
- 검증: `verify:payment-choice-parity` · `verify:checkout-pass-card` · `verify:paid-gate-ui` ·
  `verify:portone-single-payment` · `verify:payment-choice-single-instance` · `verify:pg-window-no-conflict` ·
  `verify:billing-pass-policy`(위 함정 때문에 추가) · `npm test`(checkout-entry.test.js에
  `buildPaymentChoiceCardsHtml` 단위 테스트 신규 — pass/direct/monthly × disabled/recommended 조합) ·
  `npm run sync:public`.
- 🔴 카드 마크업에도 콘텐츠 기반 캐시버스트 핀이 걸린다 — D-1에서 겪은 것과 동일하게, `checkout-entry.js`
  내용이 바뀌면 `verify:payment-choice-parity`의 핀 검사가 독립 정적 페이지(celestial-harmony.html 등 11개,
  root+public) + `billing-client.ts`의 `PAID_SERVICE_RUNTIME_SRC` + `app/layout.js`의 `?v=` 갱신을 요구할
  것이다. D-1 커밋(`git log`에서 "share the payment-choice CSS rules" 커밋)이 정확한 절차를 보여준다.

**D-3. 브릿지 메커니즘 문서화 (무위험, 아직 안 함)**
- `js/core/checkout-entry.js` 헤더 주석에 first-registered-wins 레지스트리
  (`__cdChooseServicePaymentModeCanonical` / `__cdSupportsPassChoice` / `__cdReactFallback`)가 이미 세
  렌더러의 실행 경합을 정확히 분리하고 있음을 명시 — 다음 세션이 "3렌더러가 독립 호출된다"고 재오해해 DOM
  부착까지 억지로 합치려는 시도를 막는다. 코드 변경 없음, D-2 PR에 곁들이면 된다.

**D-4. 로딩 배리어 강화 (낮음~중간 위험, 아직 안 함)**
- `app/_lib/billing-client.ts:1807` `loadPaidServiceRuntimeGate()`의 load/error/8초 타임아웃 3분기는 그대로
  두고, **프리페치 트리거 시점**을 유료 CTA 마운트 시점이나 idle 콜백으로 앞당겨 실제 클릭 이전에 dp 코어
  로드가 끝나 있게 만든다(정적 import 전환이 아니라 현재의 동적 `<script>` 방식 유지).
- 검증: `verify:pg-window-no-conflict`, 수동 네트워크 스로틀 확인.

### 이번 트랙에서 명시적으로 제외된 것 (다시 꺼내지 말 것 — 별도 스파이크 필요)

- ESM 정적 import 전환(React가 `js/destiny-profile.js`를 번들에 정적 포함) — SSR 안전성 감사가 필요한 대형
  작업.
- `_cdOpenPaidServiceGate` 게이팅 오케스트레이션 자체의 이중 정의(셸/dp 각각 별도 구현) 통합 — 렌더러
  통합과 리뷰·롤백 단위가 다르다.

---

## 다음 세션이 시작할 때

1. **원한다면** 트랙 A: 사용자에게 프로덕션 승격 승인을 구하고, 승인되면 `workflow_dispatch(mode=production)` 실행.
2. **원한다면** 트랙 B: 새 워크트리에서 D-2 착수 — 위 "설계와 실제가 갈린 지점"의 `git grep`부터 먼저 돌릴 것.
3. 둘 다 급하지 않다면 이 문서를 남겨두고 다른 작업으로 넘어가도 된다 — 둘 다 사용자의 명시적 요청이 있을 때
   재개하는 성격의 작업이다(하나는 프로덕션 배포 승인 대기, 하나는 저위험 리팩터 연속).
