---
status: done
updated: 2026-09-13
next: 남은 2건은 각각 선행 조건이 있다 — fortune.js 는 결제 가드 재작성, PER_USE_ENFORCE 는 프로덕션 로그 표본
---

# 죽은 코드 후속 과제 정리 (2026-09-13)

직전 세션(`07d4d0c46` · `814f0a15c` · `7fc4f4ba9` 계열)이 남긴 후속 항목을 닫았다.
격리 워크트리 `wt/deadcode-followups-20260913-124759` 에서 작업해 `48939597b` 로 main 에 머지했다.

## 머지 메모

옆 세션이 `config/sitemap-lastmod.json` 을 미커밋으로 쥐고 있어 한 차례 머지를 보류했다가,
main 이 clean 해진 뒤(`a0be2bbe1`) 합쳤다. 충돌은 그 원장 **한 건뿐**이었고 나머지
(`index.html`·public 미러 7개)는 자동 병합됐다.

🔴 원장 충돌은 손으로 고치지 않는다 — 생성물이다. 또 `npm run sitemap:generate` 는 기존
원장을 읽으므로 **충돌 마커가 남은 채로는 파싱에 실패한다**. 한쪽 판본을 먼저 복원한 뒤
(`git show main:config/sitemap-lastmod.json > config/sitemap-lastmod.json`) 재생성해야 한다.
`checkout --` 는 공유 체크아웃에서 금지이므로 `git show` 를 썼다.

## 머지 후 CI 가 문 것 2건 (둘 다 닫음)

머지 커밋 `48939597b` 의 CI 에서 `Main drift watchdog` · `PR CI` 두 워크플로가 실패했다.
둘 다 같은 `Static guards` lane 이고, 첫 실패가 두 번째를 가리고 있었다.

| 커밋 | 무엇을 물었나 |
|---|---|
| `44c29239a` | `verify:public-mirror-fresh` — 미러 7개가 낡았다 |
| `54c98770a` | `verify:handoff-contract` — `status: open` 은 허용값이 아니다(active·blocked·done) |

🔴 **워크트리에서 만든 미러는 머지 후에 다시 낡는다.** `24cb4d724` 가 `styles/fortune-ui.css`
를 건드렸고 main 쪽도 `index.html` 을 건드려, 둘이 자동 병합된 뒤의 `index.html` 기준
캐시버스트 해시가 워크트리에서 만든 미러와 어긋났다. 병합이 깨끗해도 **생성물은 다시
만들어야 한다** — 머지 직후 `npm run sync:public` 을 고정점까지 돌리고 그 결과를 커밋할 것.

두 번째는 `84a07a8a0` 이 만든 `per-use-enforce-stage2` 문서의 프론트매터다. 계약이
`8be828c24`(워크트리 분기 이후 main)에서 조여져 있었다. 선행 조건이 로그 표본이므로
`blocked` 가 맞는 값이다.

## 착수 전 실측이 목록과 달랐던 것

계획은 기억이 아니라 실측을 따랐다.

| 인계된 항목 | 실측 |
|---|---|
| `js/user.js:459` | 그 파일은 레포에 없다. 실제는 `worker/routes/user.js:436,459` 의 `if (false && …)` 2블록 |
| `/insights/` 죽은 링크 | 웹에선 **살아 있다**(`app/insights/page.js`, `out/insights/*`). 죽는 건 앱 번들뿐 |
| iching-engine 디자인 훅 8건 | "8"은 어떤 집계로도 재현되지 않는다. 진짜 묶음은 `index.html` 주역 레지스트리의 죽은 셀렉터 **11개** + CSS 1개 |
| VVIP ₩50,000 | 주석만 틀렸다. 정본은 전부 ₩30,000 |

## 닫은 것

| 커밋 | 내용 |
|---|---|
| `84a07a8a0` | VVIP 가격 오기 정정(주석 ₩50,000 → ₩30,000) + 2단계 승격 문서 |
| `d93d7415e` | `worker/routes/user.js` 도달 불가 2블록 삭제(409 PROFILE_SINGLE_LOCKED / 403 PROFILE_LIMIT_EXCEEDED) |
| `6433adc5c` | `worker/lib/access-control.js` 상수-false 컨텍스트 바인딩 연쇄 삭제(68줄) |
| `24cb4d724` | `index.html` 주역 레지스트리 죽은 셀렉터 11개 + `.juyuk-modal-card` CSS |
| `aa9688096` | 레퍼럴 배선 완성 — 끊겨 있던 reader 를 `AuthShell.tsx` 에 잇는다 |
| `44c29239a` | (머지 후속) 캐시버스트 해시 체인 재고정 — 미러 7개 |
| `54c98770a` | (머지 후속) `per-use-enforce-stage2` 프론트매터 `open` → `blocked` |

### 🔴 커밋 `6433adc5c` 를 되살릴 때

`requiresContextBoundPremiumPaymentEvidence()` 가 `reportType` 을 보지도 않고 상수 `false` 를
돌려주는 바람에 네 조각이 함께 죽어 있었다: `premiumTokenMatchesRequestBinding` ·
`buildContextBindingClause` · `findEvidenceByPaymentTokens` 의 `requireContextBinding` 옵션과
조기 반환 · `tokenBindingOk`. 실제로 돌던 조회 경로는 `buildBindingClause` 뿐이라 판정 결과는
바뀌지 않는다. 출발점은 그 함수를 reportType 화이트리스트로 되돌리는 것이고, 이 커밋 하나를
`git revert` 하면 네 조각이 함께 돌아온다. 삭제 자리에 같은 내용의 주석을 남겨 뒀다.

### 🔴 커밋 `aa9688096` 의 검증 규칙 쌍

쓰는 쪽 `js/inline/legacy-action-launcher.js` 와 읽는 쪽
`app/components/auth/AuthShell.tsx` 의 `readPendingReferral` 이 **글자 그대로 같은 규칙**이어야
한다(코드 `/^[A-Z0-9_-]{6,24}$/`, 토큰 24~1800). 한쪽만 느슨해지면 서버
(`worker/lib/validation.js`)가 되던지는 값이 저장돼 가입이 실패한다. 양쪽 주석이 서로를 가리킨다.

## 하지 않기로 한 것과 그 이유

1. **`/insights/` 앱 번들 잔존 앵커를 `<!--cd-app-strip-->` 로 감싸기 — 건너뜀.**
   `scripts/build-mobile-app.mjs:45` 가 설계를 명시한다: *"여기서 파일을 지우고, 가드가 남은
   링크를 제거한다. 한쪽만 하면 404가 난다."* 앱 번들 HTML 에 앵커가 남는 건 누락이 아니라
   의도된 분업이고, `scripts/app-payment-guard.js:285`(`/^\/insights(\/|\?|#|$)/ → redirect: null`)
   가 지정된 제거자다. 마커를 더해도 fail-closed 파서의 대상만 늘고 동작은 그대로다.
   (`stripAppOnlyMarkedBlocks` 는 `DIST` 복사본만 건드리므로 웹 링크는 안전하다는 것은 확인했다.)

2. **`worker/routes/fortune.js:2815` 뒤 죽은 차감 213줄 — 별도 세션.**
   `scripts/verify-ai-prompt-billing-policy.mjs:106-107` 이 그 죽은 줄의 **문자열 존재**를
   요구한다. 지우려면 가드를 "`LEGACY_COIN_DISABLED` 가 무조건 선행 리턴된다"는 단언으로 먼저
   교체하고 변이 검증을 해야 한다. 결제 가드 변경이라 범위를 나눴다.

3. **PER_USE_ENFORCE 2단계 승격 — 프로덕션 로그 표본이 선행 조건.**
   정본은 [`per-use-enforce-stage2-2026-09-13.md`](per-use-enforce-stage2-2026-09-13.md).
   증빙이 `console.info` 로만 나가 로컬에서 볼 방법이 없다.

## 보고만 (범위 밖)

- **소셜 가입은 레퍼럴을 아예 안 보낸다** — `AuthShell.tsx` 의 `finishSocialSignup` 이
  `/api/auth/oauth/complete-signup` 에 referral 3필드를 싣지 않는다. 이메일 가입만 이번에 이었다.
  기능 확대라 손대지 않았다. 카카오 공유 유입이 소셜 가입으로 끝나면 보상이 여전히 유실된다.
- `js/core/service-registry.js:510` 의 `href:"/insights/famous-saju/"` — 앱 자산에도 남지만
  레지스트리 구조 변경이라 별건.
- `js/iching-engine.js:295` `var _pressTimer` — 미사용 1줄. 가치가 낮아 끼워 넣지 않았다.
- `docs/handoff/2026-09-12-pass-quota-refund-followups.md:31` — `verifyPerUsePayment` 호출부 중
  환급 장치가 없는 7개 라우트. 별건으로 살아 있다.
- `.claude/hooks/sync-main-freshness.test.mjs` 의 "대규모 변경이면 fast-forward" 테스트가
  병렬 부하에서 한 번 흔들렸다(실제 `git fetch` 를 도는 40초 테스트, 단독 실행은 통과).
  프로젝트 코드가 아니라 훅 자체 검사다.

## 다음 세션의 첫 문장

> `docs/handoff/deadcode-followups-2026-09-13.md` 를 읽었다. 죽은 코드 후속 4건은 닫혀
> main 에 머지됐고, 남은 것은 `fortune.js` 죽은 차감 213줄(결제 가드 재작성 선행)과
> PER_USE_ENFORCE 2단계(프로덕션 로그 표본 선행)다.
