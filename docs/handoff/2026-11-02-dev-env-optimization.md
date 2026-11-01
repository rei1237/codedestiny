---
status: done
updated: 2026-11-02
next: "완료 — push 하지 않았다. 이 브랜치를 main 에 넣을지는 사용자가 정한다. 넣기 전에 「결과」의 72cda36ab 주의를 확인한다"
---

# 개발 환경 최적화 (2026-11-02)

## 첫 행동

1. 이 워크트리에서 작업한다: `D:\Development\codedestiny-worktrees\dev-env-optimization-20261102-002423`, 브랜치 `wt/dev-env-optimization-20261102-002423`(base `fd675f0da`).
2. 승인된 계획의 정본은 `C:\Users\user\.claude\plans\pasted-content-id-2197-code-prancy-gadget.md`다. 아래 「단계」는 그 요약이다.
3. 단계 0(기준 측정)부터 시작한다. 진단(읽기 전용)은 끝났고, 저장소 파일은 이 문서 말고는 아직 하나도 바꾸지 않았다.

## 지금 상태

- 진단 완료, 계획 승인 완료(2026-11-02). 실행은 아직 시작 전이다.
- **사용자 결정 (2026-11-02):**
  - `docs/product-details/verification/`(추적 PNG 1.16GB): D:에 백업한 뒤 `git rm --cached`로 추적을 해제하고 `.gitignore`에 넣는다.
  - git 정리: `refs/codex/*` 112개를 bundle로 백업하고 삭제한 뒤 `git gc`를 기본 prune으로 실행한다.
  - 워크트리: 머지됐고 깨끗한 5개만 배수한다. 나머지는 보고만 한다.
  - **push하지 않는다.** 이 브랜치에 커밋까지만 한다.
- **진단에서 이미 잰 값 (메인 체크아웃, 읽기 전용, 2026-11-02):**
  - `git status`: 181~200ms.
  - `git grep -l KakaoChannelInvite`: 7,179ms.
  - 루트 `rg -l`: 32,411ms.
  - `rg --files`: 667ms, 21,284파일(docs 6,988 · public 6,725 · app 1,433 · `__tests__` 970 · scripts 964 · content 790 · outputs 780 · worker 699 · marketing 517).
  - 범위 지정 `rg`(app components lib js worker src): 496ms.
  - outputs·docs/product-details·marketing·public을 뺀 `rg`: 479ms.
  - 추적 파일 21,009개.
  - `.git` 9.6GB: loose 객체 66,073개(7.77GiB)와 pack 3개(1.41GiB).
  - `outputs/` 561~588MB. 미추적인데 무시 목록에도 없다.
  - `refs/codex/*` 112개가 outputs 이력 672MB를 붙잡고 있다.
  - `.next` 766MB.
  - D: 여유 공간 126GB.
- **2026-09-08 기존 기준선** (`docs/dev-environment-baseline.md`):
  - typecheck: cold 36.2s, warm 약 4.5s.
  - lint: 21s, 캐시 시 약 3.8s.
  - mock dev ready 1.645s, 홈 첫 응답 11.45s.
  - jest: 217개 스위트, 2,401개 테스트, 100.2s.
  - HMR과 build는 그때 측정하지 못했다.

## 작업 규칙

- **메인 체크아웃 `D:\Development\code-destiny`는 건드리지 않는다.** 다른 세션이 `feat/world-cast-page`에서 미커밋 37건을 작업 중이다.
  - 측정은 읽기 전용(rg, git grep 등)으로만 한다.
- 커밋은 단위별로 하고 경로를 지정한다(`git add .` 금지). push·배포·운영 DB 접근은 하지 않는다.
- 보안·결제·배포 규칙 문구는 삭제하거나 약화하지 않는다. 옮기거나 중복을 줄이는 것만 한다.
- `.env*`, `package-lock.json`, `.wrangler`, worker의 wrangler 구조는 수정하지 않는다. 유료 LLM은 호출하지 않는다.
- 삭제하려면 git grep으로 3면(소스·테스트·verify)과 public 미러를 확인한다.
  - 파일명이나 날짜만 보고 판단하지 않는다.
  - dynamic import, 라우팅, Worker, 배포 스크립트, i18n, 결제·결과 복구에서 쓰이는지도 본다.
- 측정은 2회 이상 해서 중앙값을 기록하고, 그 시점의 `node.exe` 수와 메모리를 함께 적는다.
  - PC가 자원 경합 상태다. 진단 중에 `fork: Resource temporarily unavailable`이 났고 `du`가 시간 초과됐다.
  - 루트 전체 `rg`나 `du`는 오래 걸리니 백그라운드로 돌리지 말고 범위를 좁혀서 잰다.
- 위치는 `.claude/plans/...`(정본 계획)와 이 문서 둘뿐이다. 측정 결과는 마지막에 `docs/dev-environment-baseline.md`로 옮긴다.

## 설계 (코드에 아직 없는 결정과 함정)

### check:fast가 항상 critical로 승격되는 원인

대상은 `scripts/lib/verification-plan.mjs`의 `createVerificationPlan`이다.

- `failClosed = !changes.complete || !files.length || unknown`이다. 깨끗한 트리도 critical이 된다.
- 변경 수집기는 `git ls-files --others --exclude-standard`로 미추적 파일까지 센다.
  - 그래서 무시 목록에 없는 `outputs/` 파일이 `unclassified`로 분류되고 critical이 된다. `.gitignore`에 `outputs/`를 넣으면 해결된다.
- `shared` 정규식 `^(?:lib\/|src\/|config\/|scripts\/|...)`는 `lib/` 아래 문구 수정까지 critical로 올린다. 이번에는 바꾸지 않고 보고만 한다.
- `i18n/authored/*.json`은 `scripts/lib/change-risk.mjs`의 `classifyFile`에서 미분류다. low로 넣기 전에, 이 파일을 소비하는 생성 스크립트를 먼저 확인한다.
- docsOnly가 아니면 `typecheck`가 항상 돈다. CSS·이미지만 바꾼 경우는 typecheck를 생략하되 `test:node`는 유지한다. CSS를 텍스트로 읽는 정적 UI 테스트가 있기 때문이다.
- **유지할 것:** git 오류(`complete=false`)와 미분류 경로의 fail-closed. 결제·인증 변경은 여전히 critical이어야 한다. 결제 파일 하나를 바꾼 `--plan`으로 회귀를 확인한다.
- 수정 1~4(깨끗한 트리, i18n 분류, CSS typecheck 생략, eslint `--cache`)는 각각 별도 커밋으로 한다.

### 문서 모순 (고칠 위치)

- `CLAUDE.md:86`: `npm run check:pre-push` 명령명이 빠져 있다.
- `ARCHITECTURE.md:9,37`: worker가 `/`를 `/ggulggul/`로 301한다고 적혀 있다.
  - 실제 코드(`public/_worker.js:139-155`)는 일반 `/`에 200을 준다. 정본은 CLAUDE.md:73이다.
- `docs/context/reference-basics.md` 8, 15-17, 38, 51, 97행:
  - dev는 mock이고 실연동은 `dev:live`다.
  - 로컬 배포 명령은 CI 전용이다.
  - 로케일은 12개다.
- `docs/dev-environment-baseline.md:59`의 「check:all을 push 전에 돌린다」가 `delivery-and-ci.md:234`와 모순된다.
- AGENTS.md와 CLAUDE.md에 중복 문단이 있다(AGENTS.md:30-31 = CLAUDE.md:94-95, AGENTS.md:18 = CLAUDE.md:51). AGENTS.md:26의 스냅샷 경로 목록은 6곳 중 3곳만 적혀 있다.

### 무시 목록 함정

- `.ignore`는 rg 전용이고 343행이다. 43~343행은 `sync:public`이 다시 생성하는 자동 블록이니 손대지 않는다.
- 32~35행은 `/.claude/worktrees/`를 넣지 말라는 경고다.
- Glob 도구는 `.ignore`를 읽지 않는다.

### git 정리 함정

- `.git`은 모든 워크트리가 공유한다. `--prune=now`는 쓰지 않는다.
  - 다른 세션이 막 만든 객체를 지울 수 있다. 기본 prune(2주, cruft pack)만 쓴다.
- 672MB는 해당 객체가 2주를 넘긴 뒤 다음 gc 때 회수된다.
- gc 전에 실행 중인 `git.exe`가 없는지 확인한다.

### PNG 추적 해제 함정

- 이 커밋이 다른 체크아웃에 머지되면 그곳의 로컬 PNG가 지워진다. 백업 경로와 복구 명령(`git checkout <sha>^ -- docs/product-details/verification`)을 반드시 보고한다.
- 이 폴더에 쓰는 스크립트는 약 100개이고 읽는 코드는 0개다(진단 결과). 쓰기 스크립트가 폴더가 없을 때 직접 만드는지(mkdir recursive) 확인한다.

### 워크트리 배수 함정

- `node_modules`가 정션이다. `git worktree remove --force` 전에 정션을 먼저 끊지 않으면 공유 node_modules가 지워질 수 있다.
  - 끊는 방법: `cmd /c rmdir` 또는 `(Get-Item ... -Force).Delete()`.
- `seo-architecture-rebuild` 워크트리는 절대 지우지 않는다(메모리 규칙).
- 로컬 `main`은 origin/main보다 256커밋 뒤처져 있고, `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530`(dirty 8)에 체크아웃돼 있다.

### 서버·DB 최적화

이미 미머지 워크트리 `wt/infra-optimization-20261031-150228`에 있다(`docs/infrastructure/MONGODB-OPTIMIZATION.md` 등). 다시 하지 않는다.

## 단계

- [x] **0. 기준 측정.**
  - 저장소 규모.
  - 검색: 메인 체크아웃에서 읽기 전용으로 잰다.
  - check:fast 시나리오별 `--plan`과 실행 시간: (a) `styles/*.css` (b) `app/**/*.module.css` (c) 깨끗한 트리 (d) 미추적 `outputs/x.json`.
  - typecheck(warm·cold), lint, test:node, test:jest, 관련 jest 1건.
  - mock dev ready, module.css 수정 뒤 HMR 반영 시간.
  - `build:cf` 1회(로컬 빌드만).
- [x] **1. ignore 정리.**
  - `.gitignore`에 `outputs/`를 추가한다.
  - `.ignore`에 outputs, `docs/product-details/verification`, artifacts, marketing 미디어, `i18n/.*.json`을 추가한다.
  - `.vscode/settings.json`의 exclude를 확장한다.
- [x] **2. check:fast 판정 수정.** 위 「설계」의 4건을 테스트와 함께 각각 커밋한다.
- [x] **3. 문서 정리.**
  - AGENTS.md: 중복을 링크로 바꾸고, 3등급 표·검색 규칙·스냅샷 경로 6곳을 넣는다.
  - CLAUDE.md: 86행을 고치고 3줄 표를 넣는다.
  - ARCHITECTURE.md, reference-basics.md, dev-environment-baseline.md를 고친다.
  - 검증: `verify:doc-freshness`, `verify:handoff-contract`.
- [x] **4. `scripts/verify-repo-hygiene.mjs`.**
  - 실패 조건: 5MB를 넘는 바이너리, docs 아래 새 PNG 20개 초과, 무시되지 않은 루트 산출물 폴더.
  - `check:pre-push` 끝에 연결한다.
  - AGENTS.md에 스크래치 규칙을 한 줄 넣는다.
- [x] **5. PNG 추적 해제.**
  - `robocopy`로 `D:\Development\backups\code-destiny-product-details-verification-20261102\`에 복사하고 파일 수를 대조한다.
  - `git rm -r --cached`, `.gitignore` 추가, `content/product-details/README.md:12` 갱신.
  - 단독 커밋으로 한다.
- [x] **6. git 정리.**
  - `refs/codex` 목록과 `D:\Development\backups\codex-refs-20261102.bundle`을 만들고 `git bundle verify`로 확인한다.
  - `update-ref -d`로 ref를 지운 뒤 `git gc`를 기본 prune으로 실행한다.
  - 전후를 측정한다.
- [x] **7. 워크트리 5개 배수.**
  - 대상: `D:/Development/codedestiny-worktrees/ad-ready-20261030`, `.codex-worktrees/app-global-locale-release-20261029-151727`, `.claude-worktrees/seo-home-snippet-20261031`, `.codex-worktrees/toss-neo-stage-20261101-224614`, `.codex-tmp/consultation-ui/release`(detached).
  - 각각 깨끗한지·머지됐는지·프로세스가 없는지 다시 확인한 뒤 진행한다.
  - 나머지 24개는 표로 보고만 한다.
- [x] **8. 소규모 죽은 파일 정리.**
  - 대상: `_graveyard/`(3), `Rules/`(1), i18n 점파일 스크래치. `es-manual.json`은 점파일이 아니니 따로 확인한다.
  - 보고만 하는 항목: `ifa_oracle_v2_full.html`(테스트가 참조함), `tadagochi.html`, `artifacts/`, `marketing/card-news`, `campaigns/2026-10-05`.
- [x] **9. CSS 충돌 진단.** 분석만 한다. `docs/context/design-and-ui.md`에 짧은 「CSS 수정 규칙」을 넣는다.
- [x] **10. 사후 측정.**
  - 전후 비교표를 `docs/dev-environment-baseline.md`에 넣고 커밋한다.
  - 한국어로 최종 보고한다. 하지 않은 항목(CI 중복, 빌드 `sync:public` 2회, `cpus:1`, `dev:live` 운영 DB 이름, worker 번들 4.79MiB, manifest guard 60초 대기, `articles.js` 806KB, 추적 중인 public 미러, jest runInBand)은 제안으로 남긴다.

## 결과 (2026-11-02)

push 하지 않았다. 커밋은 이 브랜치에만 있다(base `fd675f0da`).

| 단계 | 커밋 | 내용 |
|---|---|---|
| 1 | `a52e66543` | `.gitignore` outputs, `.ignore`, `.vscode/settings.json` exclude |
| 2 | `c74e3b513` | 깨끗한 트리 조기 종료(로컬 fast·ui·worker 만, 테스트 포함) |
| 2 | `2200dac00` | `i18n/authored/*.json` low 분류 |
| 2 | `621ebbb2e` | CSS·이미지·문서만 바뀌면 typecheck 생략 |
| 2 | `7f1029a67` | eslint `--cache --cache-strategy content`(`build-cache/eslint/`) |
| 3 | `42ec753c5` | AGENTS·CLAUDE·ARCHITECTURE·reference-basics·dev-environment-baseline 정리 |
| 4 | `de386bb3a` | `verify:repo-hygiene`, `check:pre-push` 연결, guard-wiring 등록 |
| 5 | `72cda36ab` | 검수 PNG·WebP 5,504개(1.1GB) 추적 해제, `.gitignore`, README |
| 8 | `b8b22379a` | `_graveyard` 참조 없는 JS 3개 삭제 |
| 8 | `31e3f952d` | 참조 없는 i18n 점파일 5개 삭제 |
| 9 | `30c584495` | `docs/context/design-and-ui.md` CSS 수정 규칙 |
| 10 | `716fa5c49` | `docs/dev-environment-baseline.md` 「2026-11-02 최적화 전후」 |

- 전후 수치는 `docs/dev-environment-baseline.md` 「2026-11-02 최적화 전후」에 있다.
- 최종 트리에서 critical 전체 실행(test:node 4,086개, jest 443스위트·7,240개)과 `check:pre-push`(15.6초), `build:cf`(411초, exit 0)가 통과했다. 중간 커밋을 하나씩 따로 돌리지는 않았다.

### 범위가 계획과 달라진 것

- 5단계: 추적 해제는 PNG·WebP 5,504개만 했다. 같은 폴더의 json·md·html 556개는 상품 원장이 인용하므로 추적을 유지했다. 백업은 폴더 전체 6,060파일(1,163,436,683바이트)이다.
- 6단계: 시작 때 112개였던 `refs/codex`가 지울 때 114개로 늘어 있었다. 다른 세션이 계속 만든다.
- 7단계: `toss-neo-stage-20261101-224614`는 다른 세션이 이미 지웠다. 나머지 4개를 배수하고 브랜치 `wt/ad-ready-20261030`·`wt/app-global-locale-release-20261029-151727`·`wt/seo-home-snippet-20261031`를 `-d`로 지웠다. 긴 경로 때문에 폴더 2개는 `\\?\` 접두사 `rmdir`로 지웠다. 루트 `node_modules`는 그대로다.
- 8단계: `Rules/agent-regression-guard.md`(CONTEXT_AUDIT에 보존 여부 미결정), 결제 P0 인벤토리가 고정한 `i18n/.footer-strings.json`·`.rest.json`·`.w1-strings.json`, `i18n/es-manual.json`(이름 참조 없음, 12개 로케일 커밋과 함께 들어옴)은 지우지 않았다.

### 백업과 복구

- 검수 이미지: `D:\Development\backups\code-destiny-product-details-verification-20261102\`. 저장소 안에서 되돌리려면 `git checkout 72cda36ab^ -- docs/product-details/verification`.
- **주의:** `72cda36ab`가 다른 체크아웃에 머지되면 그곳의 로컬 PNG가 작업 트리에서 지워진다. 머지 전에 위 백업이나 복구 명령을 확인한다.
- `refs/codex`: `D:\Development\backups\codex-refs-20261102.bundle`(verify OK, 72 ref)과 `D:\Development\backups\codex-refs-20261102.list`(114 ref: sha·ref·날짜). 복원은 `git fetch <bundle> 'refs/codex/*:refs/codex/*'`, bundle 에 없는 42개(이미 origin/main 에 도달 가능)는 list 의 SHA 로 `git update-ref`.
- `.git`: loose 66,881개(7.78GiB) + pack 1.41GiB → loose 0 + pack 3.42GiB. 이 중 0.83GiB 는 2주 안 된 cruft 라 다음 기본 `git gc`에서 회수된다.

### 남은 워크트리 (보고만)

남은 항목 25개(메인 체크아웃·이 워크트리 포함) 중 dirty 가 있는 것: 메인 체크아웃(37), `tea-report-art-20261026-093356`(머지됨, 46), `perf5-20261101-230523`(29), `tea-pass-payment-20261024`(22), `yeongnyangi-blue-passes-20261024-050530`(머지됨, 8), `android-startup-ab-20261101-232157`(머지됨, 2), `global-purchase-readiness-20261029-104431`(머지됨, 1), `toss-fusion-stage-20261102-001000`(1). 깨끗하고 머지된 것은 `seo-architecture-rebuild-20261101-135310`(보호 대상)뿐이다. 나머지는 깨끗하지만 미머지다.

### 하지 않은 것 (제안)

- CI 중복, 빌드 `sync:public` 2회, `cpus:1`, `dev:live` 운영 DB 이름, worker 번들 4.79MiB, manifest guard 60초 대기, `articles.js` 806KB, 추적 중인 public 미러, jest runInBand.
- `change-risk`의 `shared` 정규식이 `lib/` 문구 수정까지 critical 로 보낸다.
- `build:cf`가 추적 중인 `rss.xml` 4개를 다시 쓴다(되돌려 둠).
- `docs/store-draft-20261029/index.html` 7.2MB.
- 남은 병목: test:jest(6~14분), test:node(약 290초).
- `test:node` 실패 2건은 Playwright headless shell 미설치 때문이었고 설치로 해결했다(환경, 커밋 없음).
