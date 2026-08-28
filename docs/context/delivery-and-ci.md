# Workflow · Delivery Contract · PR CI 티어

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Workflow

- 5줄 이상 변경 시 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` 스크립트 실행 → 변경 파일만 `git add` → Conventional Commits
- 🔴 **`config/payment-freeze.json`에 등록된 파일·함수를 건드렸다면 커밋 전 반드시 확인**: `worker/payments/` 재작성 기간 동안 "동결"된 구 결제 코드(예: `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`, `index.html`의 `_cdChooseServicePaymentMode`/`_cdRunDirectKrwCheckout`/`_cdOpenPaidServiceGate`, `js/destiny-profile.js`의 `_dpRenderStandalonePaymentChoice` 등)은 내용이 바뀌면 `npm run verify:payment-freeze`가 CI(`paid-flow-gates`)에서 실패한다. 순수 CSS/문구 변경이라도 예외 없다. 의도한 변경이면 `node scripts/verify-payment-freeze.mjs --update`로 매니페스트를 갱신해 **같은 커밋에** 담을 것 — env 우회나 체크 무력화 금지(트립와이어 자체를 없애면 재작성 중 조용한 분기를 다시 못 잡는다). `worker/payments/`에 대응 구현이 있다면 그쪽도 같은 변경이 필요한지 먼저 확인한다.
- 🔴 **배포 흐름 (2026-08-20 개정 — 스테이징 컷오버, 커밋 `80d3660c1`)**: `main` 직접 작업·직접 배포는 **폐기**됐다. 다만 "머지가 곧 라이브"는 더 이상 맞지 않는다 — **머지는 스테이징까지만 자동으로 간다.**
  ```
  feature 브랜치 → 커밋 → push → PR → PR CI 자동 검증 → 사용자가 Merge
    → main push → "Release Cloudflare Pages and Worker" 가 그 SHA 로 **스테이징**에 자동 배포
    → 프로덕션은 사람이 GitHub Actions 에서 workflow_dispatch(mode=production) 를 수동 실행해야 승격된다
  ```
  - 스테이징: `staging.code-destiny.com` / Worker `code-destiny-web-staging` / DB `code_destiny_staging`(프로덕션과 분리). `robots.txt: Disallow: /` + `X-Robots-Tag: noindex` 로 색인 차단.
  - 프로덕션이 `main` HEAD 보다 뒤처져 있는 것은 **정상 상태**다(승격 전까지). `node scripts/verify-merge-landed.mjs --check=drift --json --soft --base=origin/main --origin=https://code-destiny.com` 로 확인하면 드리프트가 있어도 `severity: "ok"`.
  - 예외: 일일 운세 재발행(`fortune-daily-publish`)은 여전히 프로덕션을 직접 건드린다 — 오늘 운세를 읽는 곳이 프로덕션이라 명시적으로 남긴 예외.
  - 프로덕션 승격(`workflow_dispatch mode=production`)은 실제 배포 행위다. **사용자의 명시적 승인 없이 실행하지 않는다.**
    - 반대로 사용자가 승격을 명시적으로 요청하면 에이전트가 대신 실행한다:
      `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`
    - 그 허락은 요청한 그 한 번에 대한 것이다. 상시 위임이 아니며, 다음 승격에는 다시 요청이 필요하다.
    - 실행 뒤 런을 폴링하지 않는다(`gh run watch`·`gh run view --log` 는 비용 가드 대상이고, 이 저장소에는
      "머지하면 끝 — 배포를 지켜보지 않는다"는 고정 룰이 있다). 런 URL 을 사용자에게 넘기고 끝낸다.
    - 로컬 wrangler 경로는 `scripts/lib/production-deploy-guard.mjs` 가 계속 막는다. 우회하지 않는다.
  - **`main` 에 직접 push 할 수 없다** — 브랜치 룰셋이 막는다. 모든 변경은 PR 을 거친다.
  - **로컬에서 프로덕션 배포는 불가능하다** — `scripts/lib/production-deploy-guard.mjs` 가 `deploy:safe` 승격·`deploy:rollback`·`deploy:cf:worker`·`deploy:cf:pages`·`deploy:cf:opennext` 를 모두 막는다. 로컬에 남는 것은 `deploy:check`(업로드 없음)와 `deploy:preview`·`deploy:smoke` 뿐이다.
  - **Pages 와 Worker 는 항상 같은 SHA 로 나간다.** 릴리스는 `github.sha` 를 체크아웃해 한 번 빌드하고, 배포 후 `npm run verify:deployed-sha` 가 `/version.json`(Pages)과 `/api/version`(Worker)을 읽어 그 SHA 와 대조한다. 하나라도 다르면 릴리스는 실패다.
  - 결제·인증·DB 스키마·배포 인프라 경로가 걸리면 risk level 과 무관하게 `deploy:critical` 전체가 돈다(`scripts/lib/change-risk.mjs` 의 `deepRequired`).
  - 작업 중 취약점, 보안 위험, 재현 가능한 버그를 발견하면 즉시 사용자에게 보고하고, 필요하면 다른 세션에서 분리 디버깅할 수 있도록 위험도와 짧은 제안도 함께 남긴다.
  - 판단이 애매하면 머지하지 말고 안내를 택한다(회귀 위험 상시 점검 원칙 우선).
- 🔴 **낡은 베이스 문제는 CI 배포로 근본 해소됐다 — 되돌리지 말 것**: 예전에는 `wrangler deploy` 가 커밋이 아니라 **워킹트리**를 밀어서, 베이스가 낡으면 그 사이 머지된 `worker/`·`lib/` 변경이 조용히 증발했다(2026-08-01 하루에 3회, #222·#223·#224·#226). 지금은 릴리스가 `github.sha` 를 체크아웃해 배포하므로 워킹트리라는 개념 자체가 없다.
  - `scripts/lib/worker-deploy-base-guard.mjs` 는 로컬 preview 단계의 조기 경보로 남아 있다(`--allow-stale` 로 우회). 가드 자체는 `npm run verify:deploy-base-guard` 가 검증한다.
  - 배포에는 `<stage> <sha7> <커밋 제목>` 라벨이 붙는다. `npx wrangler deployments list` 로 라이브 버전이 어느 커밋인지 확인할 수 있다.
- 🔴 **`_next/static` 404 = 파일 부재가 아닐 수 있다**: Pages 배포 전환 틈새에 나간 404 를 Cloudflare 가 `max-age=172800`(2일)로 캐시해, 오리진에 파일이 멀쩡해도 그 URL 만 이틀간 죽는다. HTML 은 `no-store` 라 새로고침해도 같은 죽은 URL 을 다시 요청한다 — **롤백해도 안 고쳐진다**(내용이 같으면 해시가 같아 같은 URL 을 가리킴). 판별은 `curl <url>` vs `curl <url>?cdcb=1` 로 하고, 다르면 엣지 캐시 오염이다. 배포 파이프라인에 가드 2종이 있다: 배포 전 `ensure:pages-single-deploy`(CF 프로덕션 Git 자동빌드가 켜지면 이중 배포 → 청크 해시 불일치, 자동으로 되끔), 배포 후 `verify:deployed-assets`(참조 자산 전량 200 확인, 죽었으면 잡 실패). 클라이언트 자가복구는 `app/layout.js` 인라인 패치(스타일시트는 error 이벤트가 리스너보다 먼저 끝나므로 사후 스윕이 필수).
  - **근본 차단**: Cache Rules 의 `URI Path starts with /_next/static/` 규칙에서 `Edge TTL → status code 404 → **No store**` 를 건다. 🔴 **"Bypass cache" 가 아니다** — 둘은 다른 계층이다. `Bypass cache` 는 캐시 **적격성**(`cache:false`) 설정이라 매칭되는 **모든** 응답(200 포함)이 캐시에서 빠지고, 내용 해시가 박힌 불변 자산이 매 요청 오리진까지 간다. 우리가 원하는 건 404 만 저장 안 되게 하는 것이므로 상태코드별 TTL 을 쓴다. API 값은 `edge_ttl.status_code_ttl: [{ status_code: 404, value: -1 }]` 이고 **`-1` = no-store, `0` = no-cache** 다(값을 양수로 넣으면 그 초만큼 404 를 캐시한다 — 2026-08-08 에 이 규칙이 `31536000`(1년)으로 들어가 있어 릴리스가 연속 실패했다. 이름은 `next-static-404-no-store` 인데 동작이 정반대였다).
    - 토큰: `CLOUDFLARE_PURGE_TOKEN` 에 Zone/Cache Rules 권한이 있다(2026-08-08 부여). 사후 대응인 자동 퍼지는 `CLOUDFLARE_CACHE_PURGE_TOKEN`·`CLOUDFLARE_ZONE_ID` GitHub 시크릿으로 이미 배선돼 있다 — 없으면 릴리스가 "퍼지 자격 없음"만 찍고 스모크에서 죽는다.
- 세션 전환 시 `/clear`로 컨텍스트 오염 방지
- 🔴 **모델 사용 원칙 (2026-08-14 개정 — 이전의 "코드 리뷰·커밋은 Haiku 고정" 규칙은 폐기)**:
  - **판단이 들어가는 일은 세션 주력 모델에서 그대로 수행한다** — 구현·디버깅·회귀 분석·**코드 리뷰**·설계 결정·삭제 영향 판정. 리뷰는 판단이 가장 많이 필요한 작업이라 가장 가벼운 모델에 고정하면 안 된다(원칙 8·9와 정면 충돌한다). reasoning effort 는 `high` 이상을 기본으로 둔다.
  - **모델을 낮춰도 되는 것은 판단이 없는 기계적 조회뿐이다** — 단순 파일 찾기, 이름 grep, 경로 확인. 🔴 **그 결과만으로 결론을 내리지 않는다**(원칙 8: 이름 스캔은 이번 감사에서 9곳을 오탐했다).
  - 구 모델명(`claude-opus-4.8` 등)을 규칙에 박아 두지 않는다 — 모델은 바뀌고, 존재하지 않는 지정은 규칙 전체를 실행 불가능하게 만든다. 필요하면 세션에서 `/model` 로 고른다.

## Delivery Contract (2026-08-11 — PR 기반 CI/CD)

- 🔴 **이 파일이 배포 계약의 정본이다** (2026-08-28 — `AGENTS.md` §Delivery 를 여기로 흡수했다. 요약을 다른 문서에 두지 않는다). 2026-08-08 의 "PR 정책 폐기 / work on main / ship with `deploy:safe`" 계약을 포함해, 이 파일 안팎의 더 오래된 배포 규칙을 전부 대체한다.
- **GitHub is the source of truth for production.** Production only ever runs a commit that exists on `main`, and `main` is only reachable through a merged PR.
- Never work on `main` directly. Branch (`feature/*`, `fix/*`, `refactor/*`, `chore/*`), commit, push, open a PR. A branch ruleset rejects direct pushes to `main`.
- 🔴 **PR CI 는 변경 경로에 따라 강도가 갈린다** (`.github/workflows/pr-ci.yml`). 모든 PR 에 같은 검사를 돌리면 CSS 한 줄에 전체 회귀를 기다리게 되고, 그러면 게이트를 우회할 방법을 찾게 된다. 반대로 전부 가볍게 하면 결제·인증이 무방비가 된다.

  | 티어 | 걸리는 경로 | 도는 검사 |
  |---|---|---|
  | `fast` | 문구·CSS·이미지·문서·`index.html`·sitemap | typecheck · lint |
  | `standard` | `app/` `components/` `src/` `lib/` `js/` · `package.json` · `next.config` | + `build:cf` · `build:worker` · 워커 크기 |
  | `critical` | **결제 · 인증 · `worker/` · DB 스키마·마이그레이션 · `wrangler.*` · `.env*` · `.github/workflows/` · `package-lock.json`** | + 전체 테스트 · 배포 설정 가드 · ads.txt · 시크릿 스캔 |

  - **판정 정본은 `scripts/lib/change-risk.mjs` 하나다.** `scripts/resolve-ci-tier.mjs` 는 그 두 축(`level`, `deepRequired`)을 티어로 **매핑만** 한다. 배포 파이프라인(`deploy-safe`)과 `check-changed` 도 같은 모듈을 쓴다 — 여기에 경로 목록을 다시 쓰면 CI 와 배포가 같은 커밋을 다르게 판정하고, 그 드리프트가 곧 "CI 는 초록인데 배포에서 터지는 게이트"가 된다.
  - `deepRequired` 를 `level` 과 **함께** 본다. `app/hooks/useCoinGate.ts` 는 `app/` 이라 `level=medium` 이지만 단건 결제 훅이라 `critical` 이어야 한다. 한 축만 보면 구멍이 난다.
  - **변경 파일을 못 구하면 `critical` 로 간다**(fail closed). "모른다"를 "안전하다"로 읽지 않는다.
  - 🔴 **네 잡(`Risk tier`·`Typecheck and lint`·`Build Pages and Worker`·`Critical checks`)은 티어와 무관하게 항상 실행된다.** 건너뛰는 것은 잡이 아니라 그 안의 스텝이다. 잡 자체를 `if` 로 막으면 브랜치 룰셋이 오지 않는 체크를 기다리며 머지를 영영 막는다. 잡 이름 = 룰셋의 필수 체크 이름이므로 바꿀 때 룰셋도 함께 고친다(`verify:worker-single-deploy` 가 감시).
  - **라벨 탈출구**: `full-ci` 는 티어를 `critical` 로 올린다. 경로만으로는 안 잡히는데 사람은 아는 변경에 쓴다(예: 공용 유틸을 고쳐 결제·인증에 **간접** 영향이 가는 경우). 내리는 라벨은 없다 — 그건 게이트를 끄는 버튼이다.
- 🔴 **PR 별 프리뷰 단계는 없다(2026-08-11).** Worker 프리뷰 버전은 라우팅되지 않아 프리뷰 URL 의 `/api/*` 를 **지금 라이브인 워커**(옛 코드)가 응답하고, 그 `/api` 는 프로덕션 DB 를 본다(샌드박스가 아니다). 결제·인증·Worker 변경에는 무용했고 Cloudflare 아티팩트만 쌓였다.
  - 🔴 **다만 2026-08-20 이후 머지는 곧바로 프로덕션이 아니라 스테이징에 반영된다** — 위 "배포 흐름" 참고. 스테이징은 프로덕션과 분리된 DB 를 쓰는 실제 배포라 PR 프리뷰보다는 유의미하지만, 별도 결제 샌드박스 채널이 붙어 있는지는 미검증이므로 스테이징 결제 시도를 "안전하다"고 단정하지 않는다.
  - 검증은 **머지 전 PR CI** 와 **배포 자체의 안전장치**가 나눠 맡는다. 릴리스는 승격 전에 내부적으로 Pages 배포본을 만들어 스모크를 돌리고, 승격 후에는 스모크 + Pages/Worker SHA 대조를 하며, 실패하면 양쪽을 함께 자동 롤백한다. 이건 사용자가 기다리는 단계가 아니라 릴리스 잡 안에서 끝난다.
  - 로컬 `npm run deploy:preview` 는 개발용 도구로 남아 있지만 흐름의 일부가 아니다. 실행하면 Cloudflare 에 아티팩트가 남으므로 습관적으로 돌리지 않는다. 변경 집합만 보려면 업로드가 없는 `npm run deploy:check`.
- **결제·인증 전용 게이트**(`paid-flow-gates.yml`)는 그대로 남아 `pull_request` 에서 결제·로그인·운세 경로가 걸릴 때만 49개 항목(검증기 48 + `npm test`)을 돌린다. 위 티어와 **독립**이며 필수 체크는 아니다.
  - 🔴 **스위트 목록의 정본은 `scripts/run-paid-gate-suite.mjs` 한 벌이다**(2026-08-16). 워크플로에는 스텝을 늘어놓지 않는다. 러너는 ①첫 실패에서 멈추지 않고 전부 돌린 뒤 실패를 모아 보고하며 ②실패한 항목만 **merge-base 워크트리에서 다시 돌려 귀책을 가른다**. base 에서도 실패하면 `PRE-EXISTING` 으로 분류해 **경고로 낮추고 통과**시키고(그 PR 을 고쳐도 초록불이 안 되므로 별도 PR 이 필요하다), base 가 통과했는데 head 가 실패하면 그대로 실패다. base 를 못 구하면 전부 이 변경 책임으로 본다(fail-closed) — 그래서 체크아웃이 `fetch-depth: 0` 이어야 한다.
  - 🔴 **`push: main` 트리거는 게이트가 아니라 건강 신호다**(2026-08-16). 이 게이트의 가드는 트리거 `paths:` **밖** 파일도 읽는다. 실측 사고: PR #678(`CLAUDE.md` 분할)은 이 워크플로를 아예 깨우지 않은 채 머지됐는데 `verify:nakshatra-premium` 이 `CLAUDE.md` 본문을 단언하고 있어 머지 직후부터 main 이 빨간불이 됐고, 80분 뒤 무관한 두 브랜치(`perf/inp-tap-fixed-cost`·`fix/pg-window-idempotency-scope`)가 같은 스텝에서 동시에 죽었다. **고치는 방향은 `paths:` 를 넓히는 것이 아니다** — 가드가 읽는 파일을 다 넣으면 2026-08-08 에 일부러 좁힌 트리거가 되살아난다. 대신 머지된 main 을 한 번 직접 본다.
  - 🔴 **정적 셸 6종(`index.html` + 5미러)이 여기 포함된다**(2026-08-11 추가). 결제창 렌더러 3종 중 **정본이 셸 인라인**(`_cdChooseServicePaymentMode`)인데 정작 그것만 트리거 목록에서 빠져 있어, 셸에서 이용권 카드를 지우거나 3옵션 문구를 바꿔도 `verify:payment-choice-parity` 가 깨어나지 않았다. 셸은 홈 콘텐츠도 겸하므로 PR CI 티어는 `fast` 로 두고(문구 한 줄에 전체 회귀를 돌리지 않는다) 결제 검증만 이 게이트로 깨운다.
  - 🔴 **결제와 무관한 변경에는 이 게이트가 돌지 않는다 (2026-08-14, 사용자 지시로 도입 — 되돌리지 말 것)**. 경로 트리거만으로는 그 지시를 지킬 수 없었다: ①`index.html`(+미러 6)이 결제창 정본이자 홈 콘텐츠 셸이라 팝업 문구 한 줄만 고쳐도 걸리고 ②`js/core/index-inline-runtime.js` 는 `cd:auth-changed` 리스너 때문에 트리거인데 `sync:public` 이 캐시키(`?v=build-…`)만 재생성해도 변경으로 잡힌다. 그래서 **셸을 건드리는 모든 PR** 이 36개 검증기를 깨웠다.
    - 🔴 **고치는 방향은 트리거 `paths:` 에서 셸을 빼는 것이 아니다.** 빼면 2026-08-11 에 막은 구멍(이용권 카드·3옵션 문구를 지워도 `verify:payment-choice-parity` 가 안 깨어남)이 그대로 다시 열린다. 판정은 경로가 아니라 **diff 내용**에서 나와야 한다.
    - 해결은 `scope` 잡(`scripts/resolve-paid-gate-scope.mjs`)이다. **경로가 아니라 diff 내용**으로 판정하고, 판정 재료를 **전부 정본에서** 가져온다 — 결제·인증 축은 `scripts/lib/change-risk.mjs` 의 `requiresDeepVerification`, 트리거 목록은 **이 YAML 의 `paths:` 를 직접 파싱**(목록을 두 벌로 만들지 않는다), 셸의 모호함은 **결제 모달 함수 본문을 중괄호로 잘라낸 실제 구간**. 캐시키만 바뀐 줄은 생성 노이즈로 버린다.
    - 🔴 **마커 단어 목록으로 판정하지 말 것.** 그 방식을 먼저 만들어 실제 커밋으로 검증했더니 **양방향으로 틀렸다** — 문구 전용 PR #629 는 `featureKey` 한 단어에 걸려 돌았고, 결제 진입 경로를 고친 PR #625 는 `data-pvw-cta-bypass` 가 목록에 없어 건너뛰었다. 원칙 10 그대로다.
    - 🔴 **fail-closed 다.** `if: needs.scope.outputs.run != 'false'` 이므로 판정이 실패하거나 출력이 없으면 **돌린다.** 건너뛰는 것은 `run=false` 를 명시적으로 받았을 때뿐이다. 이 조건을 `== 'true'` 로 바꾸지 말 것.
    - 검증 매트릭스(도입 시 실측): 문구 전용 → 건너뜀 / 결제 라우트 → 돎 / 결제 게이트 → 돎 / **셸의 결제 구간만** → 돎 / **셸의 문구만** → 건너뜀.
    - `js/mobile-interaction-patch.js` 도 이때 트리거에 추가했다 — 고스트 클릭 억제가 상세 팝업 CTA 의 진입 클릭을 삼켜 유료 기능 13종이 전부 무반응이었는데(PR #625), 그 파일이 목록에 없어 결제 게이트가 깨어나지 않았다.
- **Merging the PR is the staging deploy trigger, not the production one.** The push to `main` starts *Release Cloudflare Pages and Worker*, which checks out `github.sha` exactly, builds once, and promotes the Worker then Pages **on staging**, smokes it, and verifies the live SHA on both layers (`npm run verify:deployed-sha`). Failure auto-rolls back both layers. Production only runs this same promote/smoke/verify sequence when a human fires `workflow_dispatch(mode=production)`.
- **Local production deploys are blocked** by `scripts/lib/production-deploy-guard.mjs`. `deploy:check`, `deploy:preview`, and `deploy:smoke` still work locally. The break-glass path — for when GitHub Actions itself is unavailable — is `CD_BREAK_GLASS=1 <command> --break-glass`, and anything shipped that way must be re-landed through a PR or the next release silently reverts it.
- Production Cloudflare credentials belong in GitHub Actions secrets. Do not add them to CI workflows from `.env` files.
- `scripts/lib/change-risk.mjs` judges two independent axes: `level` (how deep the ordinary checks go) and `deepRequired` (auth/login, payment/entitlement, DB schema and migrations, `.github/workflows/**`, `wrangler.toml`, `.env*`, `config/env.contract.json`, `scripts/deploy*`). `deepRequired` forces the full `deploy:critical` regression regardless of `level`. `worker/**` stays `level=high` either way.
- Rollback: Actions → *Release Cloudflare Pages and Worker* → Run workflow → `mode: rollback` with `pages_deployment_id` and/or `worker_version_id`. Targets are listable locally with the read-only `npm run deploy:rollback -- --list`. The rollback smokes production afterwards.
- Do not run real LLM API calls, real payments, production DB writes, or production cancel/refund/reconcile actions without explicit user approval for that exact action.
- Use fake/stub LLM responses, sandbox/mock payment flows, and local/test DB or mocked models by default.

## 명령이 어디서 도는가 (2026-08-28 `AGENTS.md` 에서 이관)

| 명령 | 로컬 | CI |
|---|---|---|
| `npm run deploy:check` | ✅ 변경 집합만 확인, 업로드 없음 | — |
| `npm run deploy:preview` | ✅ 로컬 개발 도구, 흐름의 일부가 아님 | — |
| `npm run deploy:smoke -- --base <url>` | ✅ 읽기 전용 | ✅ |
| `npm run deploy:production` / `deploy:rollback --yes` | ❌ 차단 | ✅ |
| `npm run deploy:cf:worker` / `deploy:cf:pages` / `deploy:cf:opennext` | ❌ 차단 | ✅ |

- ❌ 행을 집행하는 것은 `scripts/lib/production-deploy-guard.mjs` 다 — 프로덕션에 쓰는 것은 `GITHUB_ACTIONS=true` 가 아니면 종료된다.
- **브레이크글라스**(GitHub Actions 자체가 죽었을 때)는 `CD_BREAK_GLASS=1` **과** 명시적 `--break-glass` 플래그가 **둘 다** 필요하고, PR 로 다시 랜딩하라는 경고를 찍는다. 🔴 그 단계를 건너뛰면 **다음 정식 릴리스가 그 핫픽스를 조용히 되돌린다.**
- 프로덕션 Cloudflare 자격증명은 GitHub Actions 시크릿에 있다(`CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `CLOUDFLARE_CACHE_PURGE_TOKEN` · `CLOUDFLARE_ZONE_ID`). 저장소 파일에 넣지 않는다.

## Pages 와 Worker 는 한 SHA 로 나간다 — 불변식을 지키는 3가지

Pages 와 Worker 가 서로 다른 코드를 가리키는 것이 이 저장소의 모든 결제·접근 상태 장애의 형태였다.

1. 릴리스가 브랜치 이름이 아니라 `ref: ${{ github.sha }}` 를 체크아웃한다 — 릴리스 도중에 머지가 들어와도 나가는 것이 안 바뀐다.
2. `CD_ALLOW_EMPTY_CHANGESET=true` 로 릴리스가 팁 전체를 변경 집합으로 취급한다 — 변경 집합 휴리스틱이 Worker 를 건너뛰지 못한다.
3. 배포 후 `npm run verify:deployed-sha` 가 `<origin>/version.json`(Pages)과 `<origin>/api/version`(Worker)을 읽어 릴리스 SHA 와 대조하고, 하나라도 다르면 릴리스를 실패시킨다(엣지 전파용 재시도 포함 — 재시도를 넘긴 불일치는 진짜 불일치다).

양쪽 SHA 는 주입·조회가 가능하다:

- Pages: `NEXT_PUBLIC_GIT_SHA` 가 `next.config.mjs` 에서 `GITHUB_SHA` 를 받고, `scripts/write-version-json.mjs` 가 `/version.json` 을 쓴다. 브라우저에서 `/version.json` 이 "무엇이 배포됐나"에 답하고, React 라우트에서는 `window.__cdBuild` 가 같은 답을 한다.
- Worker: 릴리스가 `--var COMMIT_SHA:<sha>` 를 넘기고, `/api/version` 이 `{ gitSha, commit, commitShort, environment }` 를 돌려준다(시크릿 없음).

## 유료 기능을 무엇으로 검증하나

🔴 **PR 별 프리뷰 환경은 없고, 사실 제대로 있었던 적이 없다.** `public/_worker.js` 가 프리뷰의 `/api` 를 **프로덕션 Worker** 로 프록시하고 그 Worker 는 **프로덕션 DB** 를 읽는다 — Worker 프리뷰 버전은 라우팅되지 않으므로, 프리뷰 URL 의 `/api/*` 는 이미 라이브인 워커가 답했다. 정작 확인할 가치가 있던 변경을 그것만 못 건드렸다.

🔴 이것은 2026-08-20 에 도입한 **`staging` 릴리스 타깃과 다르다.** 스테이징은 자체 Pages 프로젝트 · 자체 Worker(`code-destiny-web-staging`) · 자체 MongoDB(`MONGODB_DB_NAME=code_destiny_staging`, `worker/wrangler.staging.toml`)를 가진 실제 배포다. `noindex` + `robots.txt: Disallow: /` 로 색인이 막혀 있고 모든 머지를 자동으로 받는다 — 이 저장소에서 프로덕션 전 검사에 가장 가깝지만, **아래 가드들의 대체재는 아니다**(별도 PortOne 샌드박스 채널이 붙어 있는지는 `미검증`이므로 스테이징 결제를 "무해하다"고 단정하지 말 것).

결제·인증의 신뢰는 대신 세 곳에서 온다:

1. **머지 전** — `critical` 티어가 전체 테스트를 돌리고, `paid-flow-gates.yml` 이 해당 파일이 걸릴 때 결제/인증/운세 검증기를 돌린다. 소스·jsdom 수준 가드라 실제 결제 없이 성립한다.
2. **릴리스 중** — 잡이 빌드하고 Pages 배포본을 올린 뒤, 무엇을 승격하기 전에 스모크를 돌린다.
3. **승격 후** — 프로덕션 스모크, 그다음 양쪽 레이어에 `verify:deployed-sha`. 하나라도 실패하면 Pages 와 Worker 를 함께 롤백한다.

`npm run deploy:preview` 는 로컬 개발 도구로 남아 있다. `.env.local` 에 `CD_PREVIEW_TEST_EMAIL` · `CD_PREVIEW_TEST_PASSWORD` 가 있으면 FAMILY 이용권 계정으로 **이미 로그인된 상태**로 프리뷰를 연다(`scripts/seed-preview-test-account.mjs` 를 격리된 자식 프로세스로 돌려 그 한 계정만 재시드 — "파이프라인은 DB 에 쓰지 않는다"의 유일한 한정 예외이며, 자식이 자기 `MONGO_URI` 를 로드하므로 `deploy-safe.mjs` 의 프로세스 env 는 그걸 보지 않는다). 실행하면 Cloudflare 에 Pages 배포본과 Worker 버전이 남으므로 습관적으로 돌리지 않는다.

그 계정이 **커버하지 못하는 것**:

- 프로필 카드 추가/삭제는 family 를 포함한 모든 티어에서 `passExcluded` 라 여전히 결제창이 뜬다. 버그가 아니라 정책이다.
- 300코인 초과 프리미엄 상담은 이용권 주기당 공정사용 한도가 있다(`resolveFamilyPremiumQuota`).
- 🔴 **`points` 는 통화가 아니다.** `worker/lib/access-control.js` 의 어떤 것도 그것을 읽지 않고, 그것을 차감하는 경로도 없다. 접근을 여는 것은 이용권(`profileSubscription`)과 월정석(`membershipCreditLots`) 뿐이다. 테스트 계정에 포인트를 줘도 아무것도 사지 못한다.

🔴 프리뷰에서 한 일은 **프로덕션에 쓴다** — 실제 해금 기록, 실제 원장 행.

## 테스트 규칙

- LLM 테스트는 mock/fake/stub 응답을 쓴다.
- 결제 테스트는 샌드박스/mock 흐름을 쓴다.
- DB 쓰기는 테스트 DB · 로컬 DB · mock 만 쓴다.
- 테스트에 프로덕션 환경변수를 쓰지 않는다.
- 비용이 발생하는 테스트는 명시적 승인 없이 돌리지 않는다.
- **한국어·다국어 텍스트 변경 시 인코딩 검사**:
  - 변경된 텍스트 파일에서 깨짐 문자를 찾는다 — `U+FFFD`(치환 문자) 및 모지바케 흔적 `Ã` · `Â` · `ì` · `í` · `ê` · `ë` · `ð`
  - 해당하면 `npm run verify:entry-encoding -- --strict-core`
- **결제 변경 시** 최소로 돌릴 것:
  - `npm run verify:billing-pass-policy`
  - `npm run verify:portone-single-payment`
  - `npm run verify:paid-gate-ui`
  - `npm run verify:payment-choice-parity`
  - `npm run verify:checkout-pass-card`
  - `npm run verify:paid-feature-billing-policy`
  - `npm run verify:ai-prompt-billing-policy`
- **Worker/API 변경 시** 관련 라우트 테스트와, 필요하면 `npm run build:worker` 를 포함한다.
