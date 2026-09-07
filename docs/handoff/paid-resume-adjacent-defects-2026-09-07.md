---
status: active
updated: 2026-09-07
next: **PR #1740 머지 여부부터 확인한다**(`gh pr view 1740 --json state,mergedAt`). 머지됐으면 아래 "남은 작업" 4건 중 **① music_track 이용권 카드 정책**부터 — 이건 코드가 아니라 **사용자 결정**이 먼저다. 코드로 바로 갈 수 있는 것은 ④(설계급 5건) 중 "복귀 화면 기전 이중화" 하나뿐이다.
---

# 결제 후 자동 재개 — 남은 인접 결함

## 왜

"§인접 결함의 미해결분 해결해, 특히 운명 찻집 인페이지 재시도가 새 attemptId 를 발급해 재과금될 수 있는 건이다." (2026-09-07)
배선 자체는 [paid-feature-resume-2026-09-06.md](paid-feature-resume-2026-09-06.md) 에서 끝났다 — 이 문서는 **그 뒤에 남은 것**만 든다.

## 지금 상태

- **PR #1740**(브랜치 `feat/paid-resume-react-remaining`) — 찻집 재과금 + 재개 배관 구멍 3건을 닫았다. 머지 대기.
- 이 PR 로 닫힌 것: 찻집 `attemptId` 이어받기 · dp `_cdCoinGatePerUse` 폴백 2곳의 `resume` 누락 · `change-risk.mjs` 의 `usePaidResume.ts` deepRequired 누락 · CompassApp 미사용 import.

## 남은 작업

- [ ] **① `music_track` 결제창의 이용권 카드 숨김 — 실측 확인된 정책 이탈이다(1건).** `worker/lib/paid-feature-access.js:11-20` 의 `PASS_EXCLUDED_FEATURE_KEYS` 에는 프로필 카드 8종만 있고 음원 키가 **없다**. 서버는 이용권 사용을 허용하는데 클라이언트만 카드를 감춘다. **판정 기준**: 서버 등재(=이용권 못 씀) 또는 카드 노출(=이용권 씀) 중 하나로 **양쪽이 같은 말을 하면** 끝. 🔴 어느 쪽인지는 **수익화 결정이라 사용자에게 묻는다.**
- [ ] **② 유료 지급 영수증 3키 불일치 (1건, 미검증).** `app/hooks/useCoinGate.ts` 에는 `contentKey`/`profileId` 문자열이 **아예 없다**(전수 확인) — 자기 결제끼리는 저장·소비 모두 빈 값이라 맞는다. 불일치는 `profileId` 를 싣는 **다른 호출부**가 같은 featureKey 로 영수증을 남길 때만 생기는데 **재현 경로를 못 찾았다**. **판정 기준**: 실패하는 구체 경로를 먼저 재현할 것. 🔴 재현 없이 `grantReceiptMatches` 를 느슨하게 풀지 말 것 — 그 함수 주석이 경고하는 방향이고, 느슨해지면 결제 안 한 기능이 열린다.
- [ ] **③ 판정 전 인증 선워밍 이중 (2파일).** `app/hooks/useCoinGate.ts:370-373` · `app/_lib/billing-client.ts:4039-4046`. 둘 다 payment-freeze `wholeFiles` 이고 주석에 양방향 회귀 이력이 있다 — **사용자 판단 후** 손댄다.
- [ ] **④ 설계급 5건** — 원문은 [paid-feature-resume-2026-09-06.md](paid-feature-resume-2026-09-06.md) §인접 결함 "초판에 있던 6건"(`_dpChooseServicePaymentMode` 항목은 #1740 이 닫아 5건이 남는다). 이 중 **복귀 화면 기전 이중화**(`cd_checkout_return_v1` vs 재개 서술자)가 원칙 6 위반이라 우선순위가 가장 높다.
- [ ] **⑤ `js/destiny-profile.js` 를 `change-risk.mjs` 의 deepRequired 로 올릴지 (결정 1건).** 12,900줄에 손이 자주 가는 파일이라 등재하면 거의 모든 PR 이 deep 티어가 된다. **비용 트레이드오프라 사용자 결정.**

## 정본 예시

`src/features/fortune-tea-house/FortuneTeaHousePage.tsx` 의 `unusedPaidAttemptRef` — "결제까지 끝난 시도를 성공할 때까지 붙들어 재제출이 이어받는다" 의 정본. 계약은 `__tests__/ui/fortune-tea-attempt-reuse.static.test.js` 가 소스에 고정한다.

## 함정

- 🔴 **워크트리에서 첫 명령은 `npm run setup:git`** — 안 돌리면 `origin/main` 리베이스가 `index.html` 핀 90줄에서 통째로 충돌한다.
- 🔴 **핀 회전 순서는 `git grep -l "<낡은 핀>"` 전건 치환 → `sync:public`** (역순이면 CI 의 `verify:public-mirror-fresh` 만 떨어진다). `public/ifa-oracle.html` · `public/static/geomancy-oracle-v4.html` 은 미러가 아니라 자체 정본이라 치환 대상에 포함된다.
- 🔴 **`src/**` 도 `config/sitemap-lastmod.json` 을 무효화한다** — `app/**` 만 그런 게 아니다. `npm run sitemap:generate` 결과를 같은 커밋에.
- 🔴 `FortuneTeaHousePage.tsx` 는 저장소에 **CRLF** 다. Edit/sed 로 고치면 줄이 LF 로 바뀌어 `git diff --check` 가 추가한 모든 줄을 trailing whitespace 로 잡고 `check:changed` 가 BLOCKED 된다 — `\r\n` 으로 조립하는 node 스크립트로 패치한다.
- 워크트리의 `check:quick -- --skip-build` 는 `build:worker` 만 `workers-og` 미해결로 BLOCKED 된다(루트 `node_modules/workers-og` 부재 — 코드와 무관). 앞 게이트 출력으로 판정하고 빌드는 CI 에 맡긴다.

## 검증

```
npm run verify:paid-resume-wiring
npm run verify:payment-choice-parity && npm run verify:payment-freeze
npm run verify:paid-gate-ui && npm run verify:portone-single-payment
npm run verify:checkout-pass-card && npm run verify:billing-pass-policy
npm run verify:paid-feature-billing-policy && npm run verify:public-mirror-fresh
node --test __tests__/ui/fortune-tea-attempt-reuse.static.test.js
node --test __tests__/ui/direct-payment-resume.behavior.test.js
node scripts/lib/change-risk.mjs --self-test
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

## 모르는 것

- ①의 정답(음원 다운로드에 이용권을 **쓰게 할지**)과 ⑤(dp 를 deep 티어로 올릴지)는 **정책·비용 결정이라 추측해 채우지 않는다 — 사용자에게 묻는다.**
- ②의 실패 경로는 재현하지 못했다. **미검증**이며, 재현 전까지는 결함으로 단언하지 않는다.
