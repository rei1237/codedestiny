---
status: active
updated: 2026-09-06
next: webpack 영속 캐시를 PR CI 에만 켰고(#1688 머지됨) main 쪽 캐시 워머 워크플로를 올렸다. 워머가 한 번 돈 뒤 PR 빌드의 next 컴파일 시간을 실측해 효과를 확인할 차례다.
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

- [x] **`build:cf` postbuild 병목** — **PR #1680 (머지됨).** postbuild 58.4s → 29.6s, `build:cf` 194s → 166s, build 잡 250s → 234s. externalize 22.3s→1.8s(태그마다 dist 113MB 를 toLowerCase 로 복사 + 미러 수십 벌의 같은 블록을 매번 esbuild 파싱), adsense-readiness 11.8s→3.8s(baseDir 당 패스 22개가 같은 index.html 을 재독).
- [ ] **next 컴파일 90.9s** — `build:cf` 166s 의 최대 단일 덩어리. **PR #1688 (머지됨)** 이 `NEXT_WEBPACK_FS_CACHE=1` 인 곳에서만 webpack 영속 캐시를 켜고(릴리스 빌드는 종전대로 `config.cache = false`), PR CI build 잡에 `actions/cache` 를 달았다. 캐시 경로는 `build-cache/next-webpack` — `.next/cache` 는 `clean:build` 가 지운다. 그 뒤 **main 쪽 워머 `.github/workflows/next-cache-warm.yml` 추가**(이 브랜치): Actions 캐시가 브랜치 스코프라 main 에서 저장하지 않으면 PR 첫 런이 늘 콜드였다. 🔴 **남은 것은 실측이다** — 워머가 한 번 돈 뒤의 PR 빌드에서 next 컴파일이 실제로 얼마나 줄었는지 아직 안 쟀다.
- [ ] **postbuild 다음 병목 `split-dist-boot-tasks` 17.6s** — PR #1680 이 앞뒤를 줄인 뒤 postbuild 29.6s 의 절반 이상이 여기다. 아직 안 봤다.
- [x] **`paid-flow-gates.yml` 의 `paths:` 누락 2건** — **PR #1665 (머지 대기).** 두 줄을 추가했고, YAML 만 교체해 같은 두 커밋으로 판정기를 돌린 before/after 가 `run=false → run=true` 로 갈렸다. 전수 확인: 이 워크플로가 실행하는 스크립트는 `run:` 기준 2개뿐이고 `change-risk.mjs` 는 import 0건이라 폐포가 닫힌다 — 3번째 누락 없음.
- [ ] **(신규) 이 구멍을 기계로 막는 가드가 없다** — `verify:guard-wiring` 은 "검증기가 워크플로에서 도달 가능한가"만 본다. **"워크플로가 실행하는 스크립트와 그 import 폐포가 그 워크플로 자신의 `paths:` 에 있는가"** 축은 아무도 안 본다. 그래서 이 손목록은 지금까지 15번 넘게 같은 형태로 새어 왔다(YAML 주석에 사고 기록이 그만큼 있다). 🔴 가드 추가는 사용자 승인 사항이라(CLAUDE.md CI gate scope, `scripts/verify-guard-wiring.mjs:51`) 임의로 넣지 않았다 — **먼저 물을 것.**
- [x] **문구만 고친 PR 이 `Paid Flow Gates` 를 깨우던 구멍** — **PR #1676 (머지 대기).** `public/i18n/**` 는 트리거에 있는데 판정 기준이 "캐시키가 아닌 줄이 하나라도 있으면 돈다" 뿐이었다(셸에만 "결제 구간" 판정이 있었다). 사전을 읽는 가드를 값 스캐너/키 단언 둘로 나눠, 값은 가드 상수에서 조립한 탐지기로 보고 키·문구는 `scripts`·`__tests__` 에서 찾는다. PR #1671 이 `run=true → run=false`, 결제 커밋 4건은 `run=true` 유지.
- [ ] **`cloudflare-pages-deploy.yml` 의 `schedule: */20`** — 하루 72회, 중앙값 50s no-op. 줄일지 유지할지 사용자 판단 필요.
- [ ] **`check:critical` 과 `deploy:critical` 이 문자열까지 완전 중복** — 하나로 합칠지.

## 정본 예시

- 티어 판정 정본: `scripts/lib/change-risk.mjs` (CI·로컬·배포 3곳이 같은 모듈을 쓴다)
- PR CI 잡 6개: `.github/workflows/pr-ci.yml` — `classify` → `fast`·`guards`·`build`·`critical` (+`landing-order`)

## `build:cf` 166s 분해 (2026-09-06, job 101448056153)

| 구간 | 초 |
|---|---|
| prebuild + next 앞 검증기 13개 (rss:generate 7.2 포함) | 14.6 |
| **next 컴파일** | **90.9** |
| page data 수집 + 정적 720쪽 생성 + finalize | 30.6 |
| **postbuild** | **29.6** (split-dist-boot-tasks 17.6 · adsense-readiness 3.8 · externalize 1.8 · minify 등 나머지) |

재현: `gh api repos/rei1237/codedestiny/actions/jobs/<job id>/logs` 로 받아 줄머리 타임스탬프 차이를 본다.

## 함정

- 🔴 **postbuild 스크립트는 대부분 끝날 때만 출력한다** — 그래서 "`[X]` 다음의 긴 공백"은 X 가 아니라 **그 다음 단계**의 소요다. 처음에 이걸 반대로 읽어 externalize(22.3s)를 adsense-readiness 로, split-dist-boot-tasks(18.2s)를 externalize 로 적었다(PR #1680 커밋 메시지에 그 잘못된 귀속이 남아 있다). 구간은 **출력 시각 사이**로 잰다.

- 🔴 **PR CI 에 잡을 추가하면 룰셋 필수 체크도 같이 갱신해야 한다.** 보고를 못 받는 필수 체크는 머지를 영영 막는다. 이 레포는 classic branch protection 이 **없고** ruleset `main-protection`(id 20666260) 하나가 전부다 — `gh api repos/rei1237/codedestiny/rulesets/20666260`.
- 🔴 그 뒤 **이미 열려 있던 PR 은 `gh pr update-branch` 가 필요하다.** `pull_request` 워크플로는 merge ref 에서 읽히므로 기존 런 re-run 으로는 새 잡이 안 돈다.
- 🔴 **`.next/cache` 로 복원하면 캐시가 영영 빈다** — `build:cf` 의 첫 스텝 `clean:build` 가 `.next` 를 통째로 지운다. 그래서 캐시 경로는 `build-cache/next-webpack` 이다.
- 🔴 **Actions 캐시는 브랜치 스코프다** — PR 런은 자기 브랜치와 기본 브랜치(main)가 저장한 항목만 읽는다. 그래서 `next-cache-warm.yml`(main push)이 필요하고, **PR 쪽과 워머의 캐시 키·경로는 같은 모양이어야 한다**(PR 은 `restore-keys` 접두사로 워머 저장분을 집는다). 한쪽만 바꾸면 조용히 늘 콜드가 된다.
- 워머는 `push: main` 이라 **룰셋 필수 체크와 무관하다** — 필수 체크는 `pull_request` 이벤트로만 보고되므로 잡을 추가해도 룰셋을 건드릴 필요가 없다(PR CI 에 잡을 더할 때와 다르다).
- `paid-flow-gates.yml` 의 `push: main` 트리거는 중복처럼 보이지만 의도된 것이다(그 파일 336-340행에 PR #678 사고 기록).
- 🔴 `paths:` 에 줄을 더할 때는 **들여쓰기 6칸을 지킬 것.** `resolve-paid-gate-scope.mjs` 의 `readTriggerGlobs()` 가 `/^\s{6}- "(.+)"\s*$/` 로 그 목록을 직접 파싱하고, 안 맞는 줄을 만나면 블록 끝으로 보고 **그 아래를 통째로 버린다.**
- 🔴 이 YAML 은 **CRLF** 다. Edit/sed 로 고치면 줄바꿈이 섞이므로 node 로 패치한다(`scripts/resolve-paid-gate-scope.mjs`·`scripts/run-paid-gate-suite.mjs` 도 CRLF, `package.json` 은 LF).
- 🔴 판정기의 사전 필터에서 **참조 검색 범위를 레포 전체로 넓히지 말 것.** 셸의 `data-i18n` 이 사실상 모든 키를 이름으로 들고 있어 문구 PR 이 `index.html` 에 걸린다. 문구 리터럴도 **따옴표로 감싸서** 찾는다 — 맨 문자열이면 `"14장"` 이 남의 문장에 우연히 포함돼 걸린다(둘 다 2026-09-06 실측).

## 검증

```
node scripts/lib/change-risk.mjs --self-test    # 47 cases
npm run verify:ci-tier                          # 22 cases
npm run verify:guard-wiring                     # 워크플로 YAML → 러너 → npm 이름
npm run verify:paid-gate-scope                  # 사전 판정 26 cases
node scripts/resolve-paid-gate-scope.mjs --base <sha>^ --head <sha>   # 실커밋 대조
gh pr checks <PR 번호> --watch --fail-fast
```

## 모르는 것

- `node_modules` 를 `actions/cache` 로 통째 복원하는 것이 `npm ci` 26s 보다 빠른지 — **미검증**. 근거 없이 넣지 않았다.
- `filter: blob:none` 을 `paid-flow-gates` 로 확대해도 되는지 — **미검증**. `scripts/resolve-paid-gate-scope.mjs:107` 이 `git diff --unified=0` 로 패치 본문을 읽어 지연 블롭 페치가 실제로 일어난다.
