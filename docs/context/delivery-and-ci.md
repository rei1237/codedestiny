# Workflow · Delivery Contract · PR CI 티어

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Workflow

### 전달 완료 필수 규칙

- **코드·문구·문서 변경 작업은 검증 → 해당 변경만 커밋 → 원격 푸시 → PR 생성 또는 갱신 → 최신 HEAD의 검사 결과 확인까지가 기본 완료 범위다.** 사용자가 다시 “커밋·푸시·PR 올려”라고 요청하게 만들지 않는다. PR이 이미 있으면 새 PR을 중복 생성하지 않는다.
- **컨텍스트 부족, 긴 작업, 일부 후속 작업이 남았다는 이유로 인수인계 문서만 쓰고 로컬 변경을 방치한 채 종료하지 않는다.** 종료가 가까워지기 전에 검증 가능한 변경을 정리해 전달한다. 인수인계 문서는 원격에 전달된 변경과 남은 작업을 이어 주는 기록이며, 커밋·푸시·PR의 대체물이 아니다.
- 미완료 또는 미검증 항목이 있으면 `docs/handoff/`의 활성 문서에 브랜치, PR URL, 마지막 푸시 SHA, 검사 상태, 남은 작업과 바로 실행할 다음 명령을 짧게 기록한다. 안전하게 분리한 변경만 전달하며, 미검증 부분이 포함된 PR은 draft로 표시하고 완료라고 보고하지 않는다.
- **인수인계 최종 보고에는 ①문서 파일명만 담은 `text` 코드 블록 ②클릭 가능한 절대 경로 ③다른 세션에 그대로 붙여넣을 재개 명령어 코드 블록을 순서대로 제시한다.** 파일명은 확장자까지 원문 그대로 적고, 줄이거나 설명형 링크 이름에 숨기지 않는다. 코드 블록 안에는 목록 기호나 안내 문장을 섞지 않는다. 재개 명령어에는 실제 작업 디렉터리·문서 절대 경로·브랜치/PR·첫 번째 다음 행동을 채운다. 인수인계 문서에도 같은 재개 정보를 남긴다. **답변을 보내기 전에 세 항목이 모두 있는지, 명령을 복사해 이전 대화 없이 재개할 수 있는지 확인한다.**
- 재개 명령어가 자연어 작업 지시라면 “`<작업 디렉터리>`에서 `<문서 절대 경로>`를 읽고, `<브랜치 / PR>`의 상태를 확인한 뒤 `<다음 행동>`부터 이어서 진행하라”처럼 구체적으로 작성한다. 셸 명령을 제시할 때는 경로를 안전하게 인용하고, 실제 검증·재개 명령을 포함한다. 최종 보고에 미완성 자리표시자를 남기지 않는다.
- 사용자에게 명시적으로 커밋·푸시를 보류하라는 지시가 있거나, 비밀정보·인증 실패·원격 장애·외부 승인 게이트로 전달할 수 없으면 예외다. 우회하거나 실패한 변경을 검증 완료로 포장하지 않는다. 정확한 막힌 단계, 보존한 파일/브랜치, 복구 명령을 인수인계와 최종 보고에 남긴다. 가능한 안전한 단계는 먼저 완료한다.
- 최종 보고 첫 부분에 **커밋 SHA·PR 링크·최신 검사 상태**를 명시한다. 커밋·푸시·PR 전달 권한을 머지·운영 배포 권한으로 확대하지 않는다. 별도로 승인된 머지·배포 범위와 기존 외부 게이트는 유지한다.

이 절은 아래 배포 흐름의 전달 완료 기준이다. 사용자에게서 PR 전달까지만 요청받았다면 아래의 머지 단계로 자동 진행하지 않는다.

- 5줄 이상 변경 시 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` 스크립트 실행 → 변경 파일만 `git add` → Conventional Commits
- 🔴 **`config/payment-freeze.json`에 등록된 파일·함수를 건드렸다면 커밋 전 반드시 확인**: `worker/payments/` 재작성 기간 동안 "동결"된 구 결제 코드(예: `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`, `index.html`의 `_cdChooseServicePaymentMode`/`_cdRunDirectKrwCheckout`/`_cdOpenPaidServiceGate`, `js/destiny-profile.js`의 `_dpRenderStandalonePaymentChoice` 등)은 내용이 바뀌면 `npm run verify:payment-freeze`가 CI(`paid-flow-gates`)에서 실패한다. 순수 CSS/문구 변경이라도 예외 없다. 의도한 변경이면 `node scripts/verify-payment-freeze.mjs --update`로 매니페스트를 갱신해 **같은 커밋에** 담을 것 — env 우회나 체크 무력화 금지(트립와이어 자체를 없애면 재작성 중 조용한 분기를 다시 못 잡는다). `worker/payments/`에 대응 구현이 있다면 그쪽도 같은 변경이 필요한지 먼저 확인한다.
 - 🔴 **배포 흐름 (2026-08-20 개정 — 스테이징 컷오버, 커밋 `80d3660c1`)**: `main` 직접 작업·직접 배포는 **폐기**됐다. 다만 "머지가 곧 라이브"는 더 이상 맞지 않는다 — **머지는 스테이징 배포를 비동기로 예약한다.**
  ```
  feature 브랜치 → 커밋 → push → PR → PR CI 자동 검증 → 검사 통과 후 에이전트가 안전하게 Merge
     → main push → 짧은 디스패처가 최신 `main`의 스테이징 배포를 **비동기로 예약**하고 즉시 종료
     → 별도 `workflow_dispatch(mode=staging)` 실행이 고정 SHA로 **스테이징** 빌드·배포·검증
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
- 🔴 **`_next/static` 404 = 파일 부재가 아닐 수 있다**: Pages 배포 전환 틈새에 나간 404 를 Cloudflare 가 `max-age=172800`(2일)로 캐시해, 오리진에 파일이 멀쩡해도 그 URL 만 이틀간 죽는다. HTML 은 캐시되지 않으므로(`no-cache` + 검증자 부재 — 아래 JSD 항목) 새로고침해도 같은 죽은 URL 을 다시 요청한다 — **롤백해도 안 고쳐진다**(내용이 같으면 해시가 같아 같은 URL 을 가리킴). 판별은 `curl <url>` vs `curl <url>?cdcb=1` 로 하고, 다르면 엣지 캐시 오염이다. 배포 파이프라인에 가드 2종이 있다: 배포 전 `ensure:pages-single-deploy`(CF 프로덕션 Git 자동빌드가 켜지면 이중 배포 → 청크 해시 불일치, 자동으로 되끔), 배포 후 `verify:deployed-assets`(참조 자산 전량 200 확인, 죽었으면 잡 실패). 클라이언트 자가복구는 `app/layout.js` 인라인 패치(스타일시트는 error 이벤트가 리스너보다 먼저 끝나므로 사후 스윕이 필수).
  - **근본 차단**: Cache Rules 의 `URI Path starts with /_next/static/` 규칙에서 `Edge TTL → status code 404 → **No store**` 를 건다. 🔴 **"Bypass cache" 가 아니다** — 둘은 다른 계층이다. `Bypass cache` 는 캐시 **적격성**(`cache:false`) 설정이라 매칭되는 **모든** 응답(200 포함)이 캐시에서 빠지고, 내용 해시가 박힌 불변 자산이 매 요청 오리진까지 간다. 우리가 원하는 건 404 만 저장 안 되게 하는 것이므로 상태코드별 TTL 을 쓴다. API 값은 `edge_ttl.status_code_ttl: [{ status_code: 404, value: -1 }]` 이고 **`-1` = no-store, `0` = no-cache** 다(값을 양수로 넣으면 그 초만큼 404 를 캐시한다 — 2026-08-08 에 이 규칙이 `31536000`(1년)으로 들어가 있어 릴리스가 연속 실패했다. 이름은 `next-static-404-no-store` 인데 동작이 정반대였다).
    - 토큰: `CLOUDFLARE_PURGE_TOKEN` 에 Zone/Cache Rules 권한이 있다(2026-08-08 부여). 사후 대응인 자동 퍼지는 `CLOUDFLARE_CACHE_PURGE_TOKEN`·`CLOUDFLARE_ZONE_ID` GitHub 시크릿으로 이미 배선돼 있다 — 없으면 릴리스가 "퍼지 자격 없음"만 찍고 스모크에서 죽는다.
- 🔴 **엣지가 HTML 본문을 다시 쓴다 — 존 설정이라 레포에 안 보인다 (2026-09-02 확정)**: Cloudflare **JavaScript Detections(Bot Fight Mode)** 가 켜져 있어 모든 HTML 응답에 `/cdn-cgi/challenge-platform/scripts/jsd/main.js` 를 주입한다. 본문을 재작성하므로 응답이 `Transfer-Encoding: chunked` 가 되고 **`Content-Length` 와 `ETag` 가 함께 사라진다.** 비-HTML 자산은 검증자를 그대로 유지한다.
  - 그래서 `_headers` 가 HTML 을 `no-cache`(조건부 재검증)로 두어도 **304 가 원천적으로 불가능**하고, 재방문·크롤마다 셸 전량이 다시 내려간다. `_headers` 로도 코드로도 못 고친다 — 유일한 레버는 대시보드 토글이고 **사용자는 봇 보호를 유지하기로 결정했다.**
  - 🔴 **이 원인을 다시 찾아 나서지 말 것 — 이미 세 번 틀렸다**(`_worker.js` 탓 → 대시보드 Cache Rule 탓 → `no-cache` 토큰 탓). 기각 근거와 대조표: [docs/handoff/app-optimization-remaining-2026-09-02.md](../handoff/app-optimization-remaining-2026-09-02.md) §2. 재현: `npm run measure:shell-css` 의 `[1]` 절.
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
  - 🔴 **내부 CI lane은 티어와 무관하게 항상 실행된다.** 건너뛰는 것은 잡이 아니라 그 안의 스텝이다. 마지막 `CI required`가 모든 lane 결과를 `always()`로 집계한다. 브랜치 룰셋을 전환하기 전에는 기존 필수 체크 이름도 유지하고, 전환 후에는 안정된 aggregate 이름 `CI required` 하나만 required로 둔다(`verify:worker-single-deploy`가 배선을 감시).
  - **Merge Queue 준비값**: `pull_request`·`merge_group(checks_requested)`·`push(main)`에서 같은 PR CI가 실행된다. PR의 후속 push만 이전 실행을 취소하고, merge group과 main 건강 검사는 취소하지 않는다. Queue를 쓰면 `Require branches to be up to date`는 끈 상태를 유지해 수동 rebase를 반복하지 않는다.
  - **현재 사용 가능성(2026-09-08 확인)**: 이 저장소는 공개지만 개인 계정(`ownerType: User`) 소유다. GitHub Merge Queue는 조직 소유 공개 저장소 또는 GitHub Enterprise Cloud 조직 소유 비공개 저장소에만 제공되므로 현재 ruleset에는 활성화할 수 없다. `merge_group` 트리거는 향후 조직 이전 시 설정 순서가 뒤집혀 체크가 사라지는 일을 막는 준비다. 이전 전에는 `CI required` 단일 필수 체크 + strict up-to-date 비활성 유지가 권장값이며, 실제 충돌 PR만 머지 직전 수동 갱신한다.
  - **라벨 탈출구**: `full-ci` 는 티어를 `critical` 로 올린다. 경로만으로는 안 잡히는데 사람은 아는 변경에 쓴다(예: 공용 유틸을 고쳐 결제·인증에 **간접** 영향이 가는 경우). 내리는 라벨은 없다 — 그건 게이트를 끄는 버튼이다.
- 🔴 **PR 별 프리뷰 단계는 없다(2026-08-11).** Worker 프리뷰 버전은 라우팅되지 않아 프리뷰 URL 의 `/api/*` 를 **지금 라이브인 워커**(옛 코드)가 응답하고, 그 `/api` 는 프로덕션 DB 를 본다(샌드박스가 아니다). 결제·인증·Worker 변경에는 무용했고 Cloudflare 아티팩트만 쌓였다.
   - 🔴 **다만 2026-08-20 이후 머지는 곧바로 프로덕션이 아니라 스테이징 배포를 비동기로 예약한다** — 위 "배포 흐름" 참고. 실제 스테이징 실행은 최신 대기 항목을 순차 처리하며, 다음 작업·PR·머지를 기다리게 하지 않는다. 스테이징은 프로덕션과 분리된 DB 를 쓰는 실제 배포라 PR 프리뷰보다는 유의미하지만, 별도 결제 샌드박스 채널이 붙어 있는지는 미검증이므로 스테이징 결제 시도를 "안전하다"고 단정하지 않는다.
  - 검증은 **머지 전 PR CI** 와 **배포 자체의 안전장치**가 나눠 맡는다. 릴리스는 승격 전에 내부적으로 Pages 배포본을 만들어 스모크를 돌리고, 승격 후에는 스모크 + Pages/Worker SHA 대조를 하며, 실패하면 양쪽을 함께 자동 롤백한다. 이건 사용자가 기다리는 단계가 아니라 릴리스 잡 안에서 끝난다.
  - 로컬 `npm run deploy:preview` 는 개발용 도구로 남아 있지만 흐름의 일부가 아니다. 실행하면 Cloudflare 에 아티팩트가 남으므로 습관적으로 돌리지 않는다. 변경 집합만 보려면 업로드가 없는 `npm run deploy:check`.
   - **스테이징 도달 감시는 배포 자체보다 좁게 적용한다.** 모든 main 머지는 기존 릴리스 계약대로 스테이징 배포를 비동기로 예약하지만, Landing Watchdog의 장기 감시는 DB 스키마·결제/인증·유료 접근·주요 Worker 라우트 변경에만 실행한다. 오타·UI 문구·CSS·정적 자산은 scope job만 통과하고 무거운 감시는 생략한다. 판정 실패는 감시 실행으로 닫으며, 판정 정본은 `scripts/lib/change-risk.mjs`의 `requiresStagingWatch`다.
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
- **Merging the PR schedules staging asynchronously, not production.** The push to `main` starts a short dispatcher in *Release Cloudflare Pages and Worker*, which queues `workflow_dispatch(mode=staging)` for the latest `main` and then exits. The dispatched staging run checks out one fixed SHA, builds once, promotes the Worker then Pages **on staging**, smokes it, and verifies the live SHA on both layers (`npm run verify:deployed-sha`). Failure auto-rolls back both layers. Production only runs this same promote/smoke/verify sequence when a human fires `workflow_dispatch(mode=production)`.
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

## 격리 워크트리에서 명령 돌리기 (2026-09-04 `CLAUDE.md` 에서 이관)

워크트리를 만들라는 규칙 자체는 `CLAUDE.md` §작업 격리 가 정본이다. 여기 있는 것은 그 안에서 명령이 도는 방식의 실측이다.

- 🔴 **`node_modules` 가 딸려온다고 믿지 말 것** — `.claude/settings.json` 에 `symlinkDirectories: ["node_modules"]` 가 있는데도 실제로는 대개 안 생긴다(2026-08-23 실측: 워크트리 41개 중 **8개만** 보유). 원인은 미확인이다. 그런데도 `npm test`·`typecheck`·`lint`·`verify:*` 는 대개 도는데, 그건 Node·도구들이 상위 디렉터리를 타고 올라가 저장소 루트의 설치본을 주워 쓰기 때문이다.
- 🔴 그래서 **`<rootDir>/node_modules` 같은 절대 경로를 코드에 박으면 그 한 줄만 빗나간다** — `require.resolve` 를 쓸 것. 상위 탐색이 안 통하는 유일한 자리라, 박은 그 도구만 죽고 나머지는 전부 초록불이라 늦게 발견된다. 두 번 났다: `jest.config`(21개 스위트 사망) · `next-build-with-pages-manifest.mjs` 의 next CLI 경로(lint·typecheck·jest 가 **전부 통과한 채로** 빌드에서만 `Cannot find module`).
- 빌드를 돌려야 하면 링크부터 확인한다: `ls -ld node_modules`. 없으면 저장소 루트에서 돌리거나 정션을 건다 — `cmd /c mklink /J "<워크트리 경로>\node_modules" "<저장소 루트 경로>\node_modules"`. 🔴 지울 때는 **링크부터 끊는다**(`cmd /c rmdir "<워크트리 경로>\node_modules"`) — 안 그러면 공유 설치본을 지울 위험이 있다.

## 로컬 `main` 자동 최신화 훅 (2026-09-05 추가)

이 레포는 브랜치 → PR → **사용자 머지** 흐름이라 로컬 `main` 을 갱신하는 주체가 없다. 추가 시점 실측으로 루트 체크아웃의 `main` 이 `origin/main` 보다 10 커밋 뒤처져 있었다. 낡은 로컬 `main` 은 두 가지 사고로 온다 — **이미 머지된 수정을 미해결로 보는 진단 오진**, 그리고 **낡은 지점에서 브랜치를 따는 것**.

- 정본: [.claude/hooks/sync-main-freshness.mjs](../../.claude/hooks/sync-main-freshness.mjs) · 실행 테스트 [.claude/hooks/sync-main-freshness.test.mjs](../../.claude/hooks/sync-main-freshness.test.mjs) (`npm run test:node` 가 글롭으로 잡는다).
- **언제 도는가**: `SessionStart`(startup·resume·clear, fetch 쿨다운 30분) + `PreToolUse` 의 `EnterWorktree`(쿨다운 5분). 쿨다운 스탬프는 `<git-common-dir>/FETCH_HEAD` 의 mtime 이라 **새 파일을 만들지 않고 Claude Code 자신의 fetch 시계를 그대로 읽는다.**
- **무엇을 하는가**: 쿨다운 밖이면 명시 refspec 으로 `origin/main` 만 당기고(8초 상한, 실패해도 진행), 안전할 때만 루트 체크아웃을 `--ff-only` 로 전진시킨다. `EnterWorktree` 경로는 **당기기만** 하고 빠진다 — 워크트리 base 는 `worktree.baseRef: "fresh"` 덕분에 이미 `origin/HEAD` 라서 전진시킬 게 없다. 이 훅이 거기서 하는 일은 그 `fresh` 갱신의 **24시간 쿨다운을 5분으로 좁히는 것**뿐이다(원칙 6 — 새 방어층을 얹지 않는다).
- 🔴 **말은 거의 안 한다** — `main..origin/main` 의 변경 파일이 **200개 이상일 때만** 안내가 나가고, 그 미만이면 전진은 하되 **출력이 0바이트**다. 근거(2026-09-05 실측, `origin/main`): 하루 30~108 커밋이고 `origin/main~10..origin/main` 이 115 파일, `~3..` 이 53 파일이다. 즉 "커밋 N개" 류의 임계는 하루에도 몇 번 걸려 그냥 소음이 된다. 200파일은 대략 **오랜만에 돌아왔거나 전진이 오래 막혀 있던 경우**에만 걸린다.
  - 재현: `git diff --shortstat origin/main~10 origin/main` · `git log --since=10.days --format=%cd --date=format:%Y-%m-%d origin/main | sort | uniq -c`
- 🔴 **전진을 건너뛰는 조건 4가지** — 세션이 격리 워크트리 안이다 / 루트 HEAD 가 `main` 이 아니다 / 루트에 미커밋 변경이 있다(**미추적 파일 포함**) / 루트에 진행 중인 git 작업이 있다(`MERGE_HEAD`·`rebase-merge` 등 6종). 하나라도 걸리면 손대지 않는다. `stash` 는 어디에도 쓰지 않는다 — 프로젝트 루트는 여러 세션이 공유하므로 남의 미커밋 변경을 건드리면 그대로 사고다.
- **이건 가드가 아니라 넛지다.** 모든 실패 경로가 fail-open(조용히 `exit 0`)이고 당기기 실패는 보고하지 않는다 — 오프라인일 때마다 세션 시작을 막으면 아무 일도 못 한다. 원칙 10(fail-closed)의 취지는 테스트에서 지킨다: 임시 bare 원격 + 클론을 만들어 **전진하는 경우 · 건너뛰어야 하는 경우 · 침묵해야 하는 경우(경계 199/200)** 를 실제로 돌린다.
- **끄는 법**: `.claude/settings.json` 의 `hooks.SessionStart` 와 `hooks.PreToolUse` 의 `EnterWorktree` 블록에서 `sync-main-freshness.mjs` 항목을 지운다. 🔴 훅을 고치거나 지웠으면 **세션을 재시작해야 적용된다**(훅이 안 알려준다).

## 개발환경 최적화 전환 (2026-09-08)
공통 변경 검사 계획을 로컬에서 사용하며, CI는 10개 PR 동안 기존 검사와 새 계획을 비교하는 shadow 모드다. required check와 기존 실행 조건은 유지한다. 실제 범위 축소는 관측에서 누락이 없음을 확인한 별도 변경으로 한다. 시작 명령은 check:fast이며 위험 변경은 자동 승격한다. 기존 check:quick --skip-build 호환과 CI Pages 빌드 근거를 보존한다. 전체 incremental typecheck는 실행당 한 번이다. 동시 편집 때문에 모든 수정은 워크트리에서 수행한다. 노력 수준은 위험도에 맞추며 과거 전역 high 지시는 적용하지 않는다.

## 2026-09-08 사용자 전달 방식 변경
PR 생성 후 필수 검사와 최신 base 충돌을 확인하고 에이전트가 안전하게 머지한다. **순차 머지 큐는 Ready PR 한 건만 처리한다.** 후보 워크트리에서 `npm run delivery:admit -- --pr=<number>`가 통과해야 하며, 이 검사는 후보 clean 상태, 최신 `origin/main` 포함, GitHub 필수 CI 통과, 최신 PR HEAD와 검증 증거를 확인한다. 같은 파일을 수정 중인 활성 워크트리는 참고 경고로 기록하지만, PR의 커밋 집합과 GitHub 병합 가능 상태를 별도로 판정하므로 admission을 차단하지 않는다. 스테이징 도달은 admission 조건이 아니다. 하나라도 실패하면 그 PR을 건너뛰거나 다음 PR을 머지하지 않고 원인만 보고한다. 머지 뒤에는 다음 후보의 필수 CI와 admission을 확인해 연속 머지한다. PR 사이에 스테이징을 기다리지 않고 마지막 병합 SHA의 스테이징 Pages·Worker SHA와 읽기 전용 핵심 응답을 한 번 검증한다. 과거 사용자 수동 머지·머지 후 배포 미확인 조항보다 이 지시가 우선한다. 프로덕션 승격은 여전히 사용자의 명시적인 1회 승인 때만 진행한다. branch protection을 우회하지 않으며 실패·필수 승인 대기는 보고한다.

2026-09-08 사용자 추가 지시: 수정 시작 시 워크트리를 자동 생성한다. PR 머지 뒤 스테이징 배포는 비동기로 감시하며, 스테이징 SHA·정상 응답 확인을 다음 작업 시작·다음 PR 머지·새 워크트리 준비의 선행 조건으로 삼지 않는다. 해당 작업의 clean 워크트리는 PR 전달이 끝난 뒤 제거한다. 삭제 전 절대 경로와 미커밋 상태를 확인하고 의존성 정션은 대상이 아닌 링크만 먼저 제거한다. 다른 작업의 워크트리·공유 의존성은 보존한다. 운영 승격은 별도 명시적 승인 때만 수행한다.

## PR preflight와 순차 전달

- 작업 중 빠른 피드백은 `npm run check:fast`; PR 전 필수 검사는 `npm run ci:preflight`다. `--plan`은 검사 성공이 아니다. 실패한 상태에서는 Draft를 포함해 PR을 새로 만들지 않는다.
- preflight는 별도 임시 index와 격리 체크아웃에서 현재 수정본을 검사한다. 사용자의 index·브랜치·미커밋 파일을 변경하지 않는다. CI YAML의 명령을 사용하며 tier에 필요한 Pages/Worker build와 산출물 검사까지 실행한다. LLM·PG·DB 외부 호출은 차단한다.
- 통과 → 변경 파일만 commit → main 최신성 확인 → push → `npm run pr:create -- --title "..." --body-file ...`. 생성기는 검증한 tree/main SHA와 현재 상태가 다르면 거부한다. 직접 GitHub UI/CLI로 만드는 PR을 서버가 사전에 차단할 수는 없으므로 AI는 이 진입점을 사용한다. GitHub 필수 검사는 별도로 유지한다.
- 여러 PR은 전체 파일 diff·공통 코드·선행 기능·migration·CI·main 기준을 먼저 조사해 순서를 정한다. 번호순 머지를 하지 않는다. 기반 공통 코드 → 소비자 순으로 통합하되 미완성 Draft는 보존한다. 활성 worktree 중첩은 권고 진단으로만 남기며, `delivery:admit`에서 전체 worktree를 동기 스캔하지 않는다.
- 저위험·비중첩 PR은 최대 4개까지 `npm run delivery:batch-plan -- --prs=123,124`로 배치 계획을 만든 뒤 연속 머지할 수 있다. 배치 계획은 최신 `origin/main`의 깨끗한 제어용 linked worktree에서 실행하며 PR 상태·필수 CI·파일 중첩을 확인한다. Worker·결제·인증·라우팅·테스트·공통 정적 셸·생성 미러·사이트맵 ledger 변경은 단독 배치로 판정한다.
- `delivery:batch-plan`이 통과한 다중 PR은 배치 입장 증거로 사용하고, 고위험 또는 단독 판정 PR은 기존 `delivery:admit -- --pr=<number>`를 사용한다. 두 명령 모두 merge/push/checkout을 수행하지 않는다.
- 배치 머지 중에도 `main` push마다 최신 main 기준 스테이징 배포가 비동기로 예약된다. 배치 계획을 통과한 경우에는 배치의 마지막 merge SHA를 기준으로 Pages·Worker 도달과 정상 응답을 **후속 감시로** 확인한다. 이 확인은 다음 작업·PR·머지를 막지 않으며, 릴리스 실패·취소·SHA 불일치는 별도 전달·재조정 대상으로 남긴다.
- PR CI는 변경 경로 기반으로 불필요한 러너를 줄인다. Markdown-only PR은 classify에서 문서 신선도만 실행하고 fast(typecheck·lint)를 skip하며, `docs/context`, `docs/handoff`, `docs/dev` 계약 문서는 정적 가드를 추가로 실행한다. 코드·설정·생성물·테스트가 섞이면 기존 fast/build/critical 티어 판정을 유지한다. `CI required` aggregate는 실행된 lane의 성공과 판정된 skip만 허용하고 실패·취소는 차단한다.
- 안전한 작업은 후보 clean 상태·최신 main·`git merge-tree --write-tree`·필수 CI·GitHub 병합 가능·선행 PR 조건을 모두 충족하면 `delivery:admit` 후 SHA를 지정해 연속 merge한다. 활성 worktree 중첩은 이 입장 경로를 막지 않으며, 필요할 때만 `npm run worktree:status`로 조사한다. 마지막 SHA의 staging Pages/Worker SHA·정상 응답은 비동기 후속 검증으로 확인하며, 그 결과를 기다려 다음 작업을 시작하지 않는다. 프로덕션 승격은 별도 1회 승인이 필요하다. --admin·보호 해제·실패 무시·destructive force push는 금지한다.
- 매 merge 후 fetch하고 남은 PR의 새 main 호환성을 확인한다. 겹치거나 기반이 필요한 브랜치만 merge-main/rebase 후 동일 preflight와 GitHub CI를 재실행한다. 타 작업의 미커밋/locked worktree를 수정하지 않는다.
- CI 실패는 job/log → 원인 분류 → 로컬 재현·수정 → preflight → commit/push → 최신 head CI 확인까지 해결한다. 기존 실패를 성공으로 바꾸거나 rerun으로 숨기지 않는다.
- 독립 기능은 독립 PR. 강한 의존 관계는 함께 묶고 UI·인프라는 가능한 분리한다. 범위 밖 수정·대규모 formatter·불필요한 lockfile 변경을 금지한다.

## 2026-09-10 상시 연속 머지 정책

커밋 기반 PR은 각 최신 HEAD의 필수 CI와 delivery:admit을 확인한 뒤 연속 머지한다. PR 사이에 스테이징 도달을 기다리지 않는다. main push는 짧은 디스패처만 실행하고 실제 스테이징 배포·검증은 별도 직렬 실행으로 비동기 처리한다. main 변경으로 무효화된 후보 검증만 갱신한다. PR 생성 전 ci:preflight와 보호 규칙은 유지한다. delivery:batch-plan은 의존성 계획 도구이며 PR별 admission을 대체하지 않는다.

마지막 병합의 전체 SHA를 고정해 `npm run delivery:verify-batch -- --sha=<40자리 SHA>`를 후속 검증으로 실행하고 staging smoke·noindex·핵심 화면을 확인한다. 이 검증과 진행 중인 스테이징 배포는 다음 작업·PR·머지·새 워크트리 준비를 막지 않는다. 실패하면 운영 승격은 중단하고 원인·재조정만 보고한다. 이미 진행 중인 배포는 취소하지 않고 아직 배포하지 않은 낡은 staging 실행은 최신 main에 양보한다. 운영 승격은 별도 1회 승인 때만 수행한다. 이전의 PR별 staging 대기 조항보다 이 정책이 우선한다.
