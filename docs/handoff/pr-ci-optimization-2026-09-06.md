---
status: active
updated: 2026-09-06
next: 후속 과제 4건 중 하나를 고를 것 — 아무것도 진행 중이지 않다. 급한 것은 `build:cf` 257s.
---

# PR CI 최적화 (2026-09-06)

## 왜

"작은 UI/문구 변경의 PR CI가 수분~십수분씩 걸리는 문제가 최우선 해결 대상이다.
속도를 위해 테스트나 보안 검증을 무작정 제거하지 말고 변경 영향도 기반 조건부 실행 +
캐시 + 중복 제거 + concurrency + artifact 재사용을 최우선 수단으로 사용해라."

## 지금 상태

- **끝났다.** PR 5건 전부 머지되고 룰셋까지 반영됐다. 진행 중인 브랜치·워크트리 없음.
- 머지 후 실측 재현 완료: 문구/문서 PR **155s·161s**(이전 284s), standard **273s**.
- 검사는 하나도 제거하지 않았다 — 스텝 수 90→93(늘어난 3개는 새 잡의 checkout·setup-node·npm ci).

## 남은 작업

이번 범위 밖으로 **보고만** 한 후속 과제 4건. 우선순위 순:

- [ ] **`build:cf` 257s** — standard/critical 티어의 유일한 wall-clock 병목. `.next/cache` 복원은 이미 기각됐다(아래 함정).
- [ ] **`paid-flow-gates.yml` 의 `paths:` 누락 2건** — `scripts/lib/change-risk.mjs`·`scripts/resolve-paid-gate-scope.mjs` 가 빠져 있다. 원칙 10 구멍이며 이번 작업으로 생긴 것은 아니다. 됐다의 기준: 두 파일만 고친 PR 에서 paid-flow-gates 가 실제로 도는 것.
- [ ] **`cloudflare-pages-deploy.yml` 의 `schedule: */20`** — 하루 72회, 중앙값 50s no-op. 줄일지 유지할지 사용자 판단 필요.
- [ ] **`check:critical` 과 `deploy:critical` 이 문자열까지 완전 중복** — 하나로 합칠지.

## 정본 예시

- 티어 판정 정본: `scripts/lib/change-risk.mjs` (CI·로컬·배포 3곳이 같은 모듈을 쓴다)
- PR CI 잡 6개: `.github/workflows/pr-ci.yml` — `classify` → `fast`·`guards`·`build`·`critical` (+`landing-order`)

## 함정

- 🔴 **PR CI 에 잡을 추가하면 룰셋 필수 체크도 같이 갱신해야 한다.** 보고를 못 받는 필수 체크는 머지를 영영 막는다. 이 레포는 classic branch protection 이 **없고** ruleset `main-protection`(id 20666260) 하나가 전부다 — `gh api repos/rei1237/codedestiny/rulesets/20666260`.
- 🔴 그 뒤 **이미 열려 있던 PR 은 `gh pr update-branch` 가 필요하다.** `pull_request` 워크플로는 merge ref 에서 읽히므로 기존 런 re-run 으로는 새 잡이 안 돈다.
- `.next/cache` 를 `actions/cache` 로 복원해도 `build:cf` 는 안 줄어든다 — `next.config.mjs:190-192` 가 프로덕션 빌드에서 `config.cache = false` 다.
- `paid-flow-gates.yml` 의 `push: main` 트리거는 중복처럼 보이지만 의도된 것이다(그 파일 336-340행에 PR #678 사고 기록).

## 검증

```
node scripts/lib/change-risk.mjs --self-test    # 47 cases
npm run verify:ci-tier                          # 22 cases
npm run verify:guard-wiring                     # 워크플로 YAML → 러너 → npm 이름
gh pr checks <PR 번호> --watch --fail-fast
```

## 모르는 것

- `node_modules` 를 `actions/cache` 로 통째 복원하는 것이 `npm ci` 26s 보다 빠른지 — **미검증**. 근거 없이 넣지 않았다.
- `filter: blob:none` 을 `paid-flow-gates` 로 확대해도 되는지 — **미검증**. `scripts/resolve-paid-gate-scope.mjs:107` 이 `git diff --unified=0` 로 패치 본문을 읽어 지연 블롭 페치가 실제로 일어난다.
