---
status: active
updated: 2026-11-04
next: "pr-ci.yml의 CI required와 classify가 Checkout 때문에 5분 제한에 걸리는 결함부터 고치고, 고친 뒤 main push 10회의 소요 시간을 잰다"
---

# CI·로컬 검사 최적화

## 왜

사용자 요구 원문: "불필요한 검사들이 있다면 후속 과제로 그런 검사들 없이 코딩할 수 있도록 최적화해줘 일단 조사부터하고 새 세션에 인수인계해서 진행하도록".

이전 요구(`pr-ci-optimization-2026-09-06.md`)도 유효하다: "속도를 위해 테스트나 보안 검증을 무작정 제거하지 말고 변경 영향도 기반 조건부 실행 + 캐시 + 중복 제거 + concurrency + artifact 재사용을 최우선 수단으로 사용해라."

## 지금 상태

- 조사만 끝났고 구현은 시작하지 않았다. 아래 수치는 2026-11-04 실측이고, 절감 시간은 아직 재지 않았다.
- PR CI 평균 1,365초. Static guards 1,369~1,610초(79단계), Critical 739~771초, Build 608~880초, Typecheck·lint 112~322초.
- 운영 릴리스 41729564058은 테스트 하나의 무작위 실패로 막혔고 `46f083c19`가 그 테스트를 고쳤다.

## 남은 작업

우선순위 순이다. 각 항목의 판정 기준을 만족해야 끝난다.

- [ ] **1. `CI required` 5분 제한** (`.github/workflows/pr-ci.yml:1166`, classify는 `:49`). Checkout이 299초에서 끊겨 런 41717397600, 41714543536, 41712590728이 cancelled 됐다. 83초로 끝난 런도 있어 간헐적이다. 판정: 이 잡이 Checkout을 하지 않거나 필요한 범위만 받고, 10회 연속 timeout이 없다.
- [ ] **2. Checkout 병목.** `fetch-depth: 0` + `filter: blob:none`이 작업별 26~475초로 흔들린다(pr-ci 8곳, deploy 4, landing-watchdog 2, paid-flow-gates 2, secret-scan 1). 전체 이력이 정말 필요한 잡만 남기고, 나머지는 얕은 clone이나 merge-base까지의 깊이로 줄인다. 판정: 평균·최대 Checkout 시간 전후 비교.
- [ ] **3. 게이트 중복.** 스크립트 258개 참조 중 35개가 2곳 이상에서 돈다(check:critical+pr-ci 12, check:critical+paid-gate-suite 12, deploy+pr-ci 6). `check:critical`과 `deploy:critical`은 문자열까지 같다. Paid Flow Gates와 릴리스도 main push에 병행한다. 판정: 스크립트별 실행 위치 표를 만들고 한 커밋에서 같은 입력으로 두 번 도는 것을 없앤다.
- [ ] **4. 릴리스의 재검사.** `scripts/deploy-safe.mjs:724,733`이 PR CI를 통과한 같은 SHA에서 `test:node` 4,248건을 다시 돌린다(약 408초). 이번 실패도 여기서 났다. 같은 SHA의 통과 증거를 재사용할 수 있는지 설계한다. 🔴 결제·인증 fail-closed 약화 금지.
- [ ] **5. 로컬 paid-gate-suite.** 90항목 합 1,218초, 그중 `npm test` 639초. 실패하면 merge-base에서 다시 돌려 2배가 된다. 큰 항목: profile-current-switch 66.7초, ai-consultation-flows 61, payment-phone-consent 44.7(+self-test 39), profile-card-add-entry 28.3, profile-server-first 28. 판정: 작은 변경의 push 전 대기 시간 전후 비교.
- [ ] **6. 미참조 `verify:*` 83개**(전체 343개). CI·스위트·다른 스크립트 어디서도 부르지 않는다. 예: verify:cachebust-merge, verify:adsense-readiness, verify:seo-dist, verify:redirects:live, verify:deployed-assets, verify:public-parity. 수동 운영용이 섞여 있어 항목별로 판정해 표로 사용자에게 보여 준다. 삭제는 그 뒤에 한다.
- [ ] **7. 불안정 테스트 전수 조사.** 부하로 재실행하면 통과한 것: `.claude/hooks/sync-main-freshness.test.mjs`, `__tests__/ui/mock-test-runner.test.mjs`. 난수·시각에 의존하는 테스트를 찾아 고정한다.
- [ ] **8. 이전 문서 미결.** `cloudflare-pages-deploy.yml` schedule(하루 72회)은 사용자 판단 사항, next 컴파일 캐시 효과 미측정, `split-dist-boot-tasks` 17.6초 미조사.

- [ ] **9. 고아 워크트리 재발 방지.** `git worktree remove --force`가 긴 경로에서 "Filename too long"으로 멈추면 등록만 풀리고 파일이 남는다. 2026-11-04 실측 11개 중 6개가 이렇게 실패했다. 판정: 제거 절차가 `core.longpaths` 또는 Node `rmSync`로 끝까지 지우고 남은 폴더가 0개다. 정리 기록은 `D:\Development\Storage-Maintenance\2026-11-04\`다.

## 정본 예시

- 티어 판정: `scripts/lib/change-risk.mjs`, `scripts/resolve-ci-tier.mjs`
- 로컬 선택 실행: `scripts/check-changed.mjs`, `scripts/lib/verification-plan.mjs`
- 재현: `gh api repos/rei1237/codedestiny/actions/jobs/<job id>/logs`의 줄머리 시각 차이

## 함정

- CLAUDE.md: "CI 선택 실행은 10회 push 비교 전까지 shadow다. 기존 검사를 삭제하지 않는다." shadow plan(`check-changed --ci-shadow`) 비교가 아직 끝나지 않았으므로 먼저 그 결과를 모은다.
- 새 가드 추가는 사용자 승인 사항이다(`scripts/verify-guard-wiring.mjs:51`).
- 필수 체크 이름 `CI required`와 룰셋 `main-protection`을 깨면 push가 막힌다. 워크플로 변경은 RED로 다룬다.
- `workflow_dispatch` 런은 봇 staging일 수 있다. 실행 주체는 `gh api .../runs/<id>`의 `triggering_actor`로 본다.
- 운영 영향: fusion_all 질문 상담의 추정 입력은 카드에 따라 40,056까지 올라가 소프트 목표 40,000을 살짝 넘는다. 하드 한도는 Gemini countTokens 50,000이다. 축소 사다리를 worker에서 손볼지는 별도 판단이다.

## 검증

```
npm run check:pre-push
gh run list --repo rei1237/codedestiny --workflow pr-ci.yml --branch main --limit 10
```

## 모르는 것

- shadow plan이 실제로 줄이는 시간. 비교 데이터를 아직 보지 않았다.
- 미참조 verify 83개 중 사람이 손으로 쓰는 것의 수. 사용자에게 물어야 한다.
