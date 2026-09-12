# Workflow · Delivery Contract · main CI 티어

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Workflow

### 전달 완료 필수 규칙

🔴 **2026-09-12 개정 — 브랜치·PR 조항은 폐기됐다.** 모든 작업은 `main` 체크아웃에서 직접 한다. 아래는 그 흐름의 완료 기준이다.

- **코드·문구·문서 변경 작업은 검증 → 해당 변경만 커밋 → (안정 시점에) `git push origin main` → main CI 결과 확인까지가 기본 완료 범위다.** 사용자가 다시 "커밋·푸시해"라고 요청하게 만들지 않는다.
- **작업을 독립적으로 검증 가능한 단위로 쪼개고, 하나가 동작하면 바로 커밋한다.** 다시 묻지 않는다. 되돌려도 다른 기능이 흔들리지 않는 크기가 기준이며, 무관한 변경을 한 커밋에 섞지 않는다. 커밋 시점의 `main`은 항상 실행 가능해야 한다.
- **커밋은 복구 지점, push는 원격 백업 겸 배포 지점이다.** 로컬 마이크로 커밋은 자주, push는 작업 단위가 안정됐을 때 묶어서 한다(push가 배포를 깨우므로).
- 🔴 **회귀가 나면 덧대지 말고 되돌린다.** 조건 추가 → try/catch → CSS 오버라이드로 이어지는 덧대기 수정은 금지다. 미커밋은 `git reset --hard HEAD`, 나쁜 커밋은 그 커밋만 `git revert`. **이미 커밋된 다른 정상 작업까지 날리지 않는다.** 되돌린 뒤에는 같은 구조로 재시도하지 않고 실패 원인·회귀 영역·기존 접근의 문제·새 접근·수정 범위를 보고한 다음 다르게 구현한다.
- **컨텍스트 부족, 긴 작업, 일부 후속 작업이 남았다는 이유로 인수인계 문서만 쓰고 로컬 변경을 방치한 채 종료하지 않는다.** 종료가 가까워지기 전에 검증 가능한 변경을 정리해 전달한다. 인수인계 문서는 커밋·푸시의 대체물이 아니다.
- 미완료 또는 미검증 항목이 있으면 `docs/handoff/`의 활성 문서에 마지막 커밋 SHA, push 여부, 검사 상태, 남은 작업과 바로 실행할 다음 명령을 짧게 기록한다. 안전하게 분리한 변경만 커밋하며, 미검증 부분을 완료라고 보고하지 않는다.
- **인수인계 최종 보고에는 ①문서 파일명만 담은 `text` 코드 블록 ②클릭 가능한 절대 경로 ③다른 세션에 그대로 붙여넣을 재개 명령어 코드 블록을 순서대로 제시한다.** 파일명은 확장자까지 원문 그대로 적고, 줄이거나 설명형 링크 이름에 숨기지 않는다. 코드 블록 안에는 목록 기호나 안내 문장을 섞지 않는다. 재개 명령어에는 실제 작업 디렉터리·문서 절대 경로·마지막 커밋 SHA·첫 번째 다음 행동을 채운다. 인수인계 문서에도 같은 재개 정보를 남긴다. **답변을 보내기 전에 세 항목이 모두 있는지, 명령을 복사해 이전 대화 없이 재개할 수 있는지 확인한다.**
- 재개 명령어가 자연어 작업 지시라면 "`<작업 디렉터리>`에서 `<문서 절대 경로>`를 읽고, `main`이 clean 한지와 `<마지막 커밋 SHA>`를 확인한 뒤 `<다음 행동>`부터 이어서 진행하라"처럼 구체적으로 작성한다. 셸 명령을 제시할 때는 경로를 안전하게 인용하고, 실제 검증·재개 명령을 포함한다. 최종 보고에 미완성 자리표시자를 남기지 않는다.
- 🔴 **`git add .` 전에 `git status`와 `git diff --stat`을 반드시 본다.** `.env`·secret·API key·credential·개인 설정 파일·로그·임시 파일·빌드 산출물·테스트용 데이터·불필요한 대형 파일이 포함돼 있으면 제외한다. 다른 세션의 미커밋 변경도 섞지 않는다.
- 사용자에게 명시적으로 커밋·푸시를 보류하라는 지시가 있거나, 비밀정보·인증 실패·원격 장애·외부 승인 게이트로 전달할 수 없으면 예외다. 우회하거나 실패한 변경을 검증 완료로 포장하지 않는다. 정확한 막힌 단계, 보존한 파일, 복구 명령을 인수인계와 최종 보고에 남긴다. 가능한 안전한 단계는 먼저 완료한다.
- 최종 보고는 짧게: **완료 / 검증 / 커밋 `<hash> <message>` / push 완료·보류 / 남은 위험.** push 권한을 프로덕션 승격 권한으로 확대하지 않는다. push는 스테이징까지다.

- 5줄 이상 변경 시 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` 스크립트 실행 → 변경 파일만 `git add` → Conventional Commits
- 🔴 **`config/payment-freeze.json`에 등록된 파일·함수를 건드렸다면 커밋 전 반드시 확인**: `worker/payments/` 재작성 기간 동안 "동결"된 구 결제 코드(예: `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`, `index.html`의 `_cdChooseServicePaymentMode`/`_cdRunDirectKrwCheckout`/`_cdOpenPaidServiceGate`, `js/destiny-profile.js`의 `_dpRenderStandalonePaymentChoice` 등)은 내용이 바뀌면 `npm run verify:payment-freeze`가 CI(`paid-flow-gates`)에서 실패한다. 순수 CSS/문구 변경이라도 예외 없다. 의도한 변경이면 `node scripts/verify-payment-freeze.mjs --update`로 매니페스트를 갱신해 **같은 커밋에** 담을 것 — env 우회나 체크 무력화 금지(트립와이어 자체를 없애면 재작성 중 조용한 분기를 다시 못 잡는다). `worker/payments/`에 대응 구현이 있다면 그쪽도 같은 변경이 필요한지 먼저 확인한다.
 - 🔴 **배포 흐름 (2026-09-12 개정 — main 단독 개발. 2026-08-20 스테이징 컷오버 커밋 `80d3660c1` 위에 브랜치·PR 단계만 걷어냈다)**: **로컬** 직접 배포는 여전히 폐기 상태다. 배포는 CI 만 한다. "push 가 곧 라이브"는 아니다 — **push 는 스테이징 배포를 비동기로 예약한다.**
  ```
  main 직접 수정 → 최소 검증 → 커밋 → (안정 시점에) push
     → main CI 1회(`CI required`)
     → 같은 push 가 짧은 디스패처를 깨워 최신 `main`의 스테이징 배포를 **비동기로 예약**하고 즉시 종료
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
      "push 하면 끝 — 배포를 지켜보지 않는다"는 고정 룰이 있다). 런 URL 을 사용자에게 넘기고 끝낸다.
    - 로컬 wrangler 경로는 `scripts/lib/production-deploy-guard.mjs` 가 계속 막는다. 우회하지 않는다.
  - **`main` 에 직접 push 하는 것이 기본 흐름이다**(2026-09-12). 룰셋 `main-protection` 에서 `pull_request`·`required_status_checks` 규칙을 제거했고 `deletion`·`non_fast_forward` 는 유지했다 — main 이 유일한 복구 지점이므로 브랜치 삭제와 force-push 차단이 오히려 더 중요하다. 롤백은 `git revert` 로 하며 force-push 가 필요 없다.
  - **로컬에서 프로덕션 배포는 불가능하다** — `scripts/lib/production-deploy-guard.mjs` 가 `deploy:safe` 승격·`deploy:rollback`·`deploy:cf:worker`·`deploy:cf:pages`·`deploy:cf:opennext` 를 모두 막는다. 로컬에 남는 것은 `deploy:check`(업로드 없음)와 `deploy:preview`·`deploy:smoke` 뿐이다.
  - **Pages 와 Worker 는 항상 같은 SHA 로 나간다.** 릴리스는 `github.sha` 를 체크아웃해 한 번 빌드하고, 배포 후 `npm run verify:deployed-sha` 가 `/version.json`(Pages)과 `/api/version`(Worker)을 읽어 그 SHA 와 대조한다. 하나라도 다르면 릴리스는 실패다.
  - 결제·인증·DB 스키마·배포 인프라 경로가 걸리면 risk level 과 무관하게 `deploy:critical` 전체가 돈다(`scripts/lib/change-risk.mjs` 의 `deepRequired`).
  - 작업 중 취약점, 보안 위험, 재현 가능한 버그를 발견하면 즉시 사용자에게 보고하고, 필요하면 다른 세션에서 분리 디버깅할 수 있도록 위험도와 짧은 제안도 함께 남긴다.
  - 판단이 애매하면 push 하지 말고 안내를 택한다(회귀 위험 상시 점검 원칙 우선). 커밋은 로컬 복구 지점이므로 그대로 쌓아 둔다.
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

## Delivery Contract (2026-09-12 — main 단독 CI/CD)

- 🔴 **이 파일이 배포 계약의 정본이다** (2026-08-28 — `AGENTS.md` §Delivery 를 여기로 흡수했다. 요약을 다른 문서에 두지 않는다). 2026-08-11 의 "PR 기반 CI/CD" 계약과 2026-08-08 의 "work on main / ship with `deploy:safe`" 계약을 포함해, 이 파일 안팎의 더 오래된 배포 규칙을 전부 대체한다.
  - 🔴 **2026-08-08 계약과 헷갈리지 말 것.** 그때 되돌린 이유는 "main 에서 일한다"가 아니라 **로컬 `wrangler` 가 커밋이 아니라 워킹트리를 밀었기 때문**이다(아래 "낡은 베이스" 항목). 지금 릴리스는 `github.sha` 를 체크아웃해 배포하므로 그 원인은 제거됐다. **로컬 배포 금지는 그대로다.**
- **GitHub is the source of truth for production.** Production only ever runs a commit that exists on `main`, and every commit reaches `main` by a direct push.
- Work on `main` directly. Do not create feature/fix/temp branches or pull requests. Commit each verified unit immediately and push when the unit is stable. The safety net is small commits and fast rollback, not isolation.
- 🔴 **워크트리 예외 (2026-09-12 개정 — 같은 날의 "신규 워크트리 생성 금지" 조항을 대체한다).** **동시에 쓰는 세션이 둘 이상일 때는 두 번째 세션부터 워크트리를 만든다**: `powershell -File scripts/create-safe-worktree.ps1 -Slug <이름>`.
  - **왜 예외가 필요한가**: 롤백이 이 계약의 안전장치인데 `git reset --hard`·`git stash`·`git checkout -- <파일>` 은 **누구 작업인지 구분하지 않는다.** 공유 체크아웃에서 한 세션이 자기 실수를 되돌리면 옆 세션의 미커밋 편집이 **복구 수단 없이** 사라진다. 같은 파일 동시 편집도 충돌 표시 없이 나중 저장이 덮는다. 격리를 끈 것 자체가 문제가 아니라, **격리를 끈 상태에서 롤백을 안전장치로 삼은 조합**이 문제다.
  - **실측 근거 (2026-09-12)**: 하루에 세 가지가 다 났다 — 옆 세션의 미커밋 CSS 때문에 `git merge` 가 막혔고, 남의 커밋 3개가 이쪽 push 에 딸려 갔고, 남의 인수인계 문서가 `verify:handoff-contract` 를 깨뜨려 **main 이 빨간 채로 있었다**.
  - **예외의 범위**: 읽기만 하는 세션은 몇 개든 워크트리가 필요 없다. 혼자 쓰는 세션도 만들지 않는다 — 기본은 여전히 main 직접 편집이다.
  - **워크트리에서도 PR 은 만들지 않는다.** 검증 → 커밋 → main 으로 직접 `git merge` → push. 끝나면 즉시 배수한다(`npm run worktree:unmerged` → `npm run cleanup:candidates` → `git worktree remove`).
  - **롤백 시 옆 세션을 지키는 법**: `reset --hard` 대신 내가 만진 파일만 `git checkout -- <파일>`, 커밋된 것은 `git revert <해시>`.
  - `.claude/settings.json` 의 `worktree.bgIsolation` 은 `"none"` 이다 — 워크트리는 **자동이 아니라 의도적으로** 만든다.
- 🔴 **main CI 는 변경 경로에 따라 강도가 갈린다** (`.github/workflows/pr-ci.yml` — 파일명은 2026-09-12 이후에도 그대로다. 트리거만 `push: main` 이다). 모든 push 에 같은 검사를 돌리면 CSS 한 줄에 전체 회귀를 기다리게 되고, 그러면 게이트를 우회할 방법을 찾게 된다. 반대로 전부 가볍게 하면 결제·인증이 무방비가 된다.

  | 티어 | 걸리는 경로 | 도는 검사 |
  |---|---|---|
  | `fast` | 문구·CSS·이미지·문서·`index.html`·sitemap | typecheck · lint |
  | `standard` | `app/` `components/` `src/` `lib/` `js/` · `package.json` · `next.config` | + `build:cf` · `build:worker` · 워커 크기 |
  | `critical` | **결제 · 인증 · `worker/` · DB 스키마·마이그레이션 · `wrangler.*` · `.env*` · `.github/workflows/` · `package-lock.json`** | + 전체 테스트 · 배포 설정 가드 · ads.txt · 시크릿 스캔 |

  - **판정 정본은 `scripts/lib/change-risk.mjs` 하나다.** `scripts/resolve-ci-tier.mjs` 는 그 두 축(`level`, `deepRequired`)을 티어로 **매핑만** 한다. 배포 파이프라인(`deploy-safe`)과 `check-changed` 도 같은 모듈을 쓴다 — 여기에 경로 목록을 다시 쓰면 CI 와 배포가 같은 커밋을 다르게 판정하고, 그 드리프트가 곧 "CI 는 초록인데 배포에서 터지는 게이트"가 된다.
  - `deepRequired` 를 `level` 과 **함께** 본다. `app/hooks/useCoinGate.ts` 는 `app/` 이라 `level=medium` 이지만 단건 결제 훅이라 `critical` 이어야 한다. 한 축만 보면 구멍이 난다.
  - **변경 파일을 못 구하면 `critical` 로 간다**(fail closed). "모른다"를 "안전하다"로 읽지 않는다.
  - 🔴 **내부 CI lane은 티어와 무관하게 항상 실행된다.** 건너뛰는 것은 잡이 아니라 그 안의 스텝이다. 마지막 `CI required`가 모든 lane 결과를 `always()`로 집계한다(`verify:worker-single-deploy`가 배선을 감시).
  - 🔴 **Merge Queue 조항은 2026-09-12 폐기.** `pull_request`·`merge_group` 트리거를 모두 제거했다. main CI 는 `push: main` 과 `workflow_dispatch` 에서만 돈다. concurrency 는 같은 커밋의 중복 실행만 접고, 앞선 커밋의 main 건강 검사는 취소하지 않는다.
  - 🔴 **`full-ci` 라벨 탈출구도 폐기.** PR 이 없으니 라벨을 붙일 곳이 없다. 경로만으로는 안 잡히는데 사람은 아는 변경(예: 공용 유틸을 고쳐 결제·인증에 **간접** 영향)은 `workflow_dispatch` 로 티어를 올려 한 번 더 돌린다. 티어를 **내리는** 수단은 여전히 없다 — 그건 게이트를 끄는 버튼이다.
- 🔴 **배포 전 프리뷰 단계는 없다(2026-08-11).** Worker 프리뷰 버전은 라우팅되지 않아 프리뷰 URL 의 `/api/*` 를 **지금 라이브인 워커**(옛 코드)가 응답하고, 그 `/api` 는 프로덕션 DB 를 본다(샌드박스가 아니다). 결제·인증·Worker 변경에는 무용했고 Cloudflare 아티팩트만 쌓였다.
   - 🔴 **2026-08-20 이후 push 는 곧바로 프로덕션이 아니라 스테이징 배포를 비동기로 예약한다** — 위 "배포 흐름" 참고. 실제 스테이징 실행은 최신 대기 항목을 순차 처리하며, 다음 작업을 기다리게 하지 않는다. 스테이징은 프로덕션과 분리된 DB 를 쓰는 실제 배포지만, 별도 결제 샌드박스 채널이 붙어 있는지는 미검증이므로 스테이징 결제 시도를 "안전하다"고 단정하지 않는다.
  - 검증은 **push 시 main CI** 와 **배포 자체의 안전장치**가 나눠 맡는다. 릴리스는 승격 전에 내부적으로 Pages 배포본을 만들어 스모크를 돌리고, 승격 후에는 스모크 + Pages/Worker SHA 대조를 하며, 실패하면 양쪽을 함께 자동 롤백한다. 이건 사용자가 기다리는 단계가 아니라 릴리스 잡 안에서 끝난다.
  - 로컬 `npm run deploy:preview` 는 개발용 도구로 남아 있지만 흐름의 일부가 아니다. 실행하면 Cloudflare 에 아티팩트가 남으므로 습관적으로 돌리지 않는다. 변경 집합만 보려면 업로드가 없는 `npm run deploy:check`.
   - **스테이징 도달 감시는 배포 자체보다 좁게 적용한다.** 모든 main push는 기존 릴리스 계약대로 스테이징 배포를 비동기로 예약하지만, Landing Watchdog의 장기 감시는 DB 스키마·결제/인증·유료 접근·주요 Worker 라우트 변경에만 실행한다. 오타·UI 문구·CSS·정적 자산은 scope job만 통과하고 무거운 감시는 생략한다. 판정 실패는 감시 실행으로 닫으며, 판정 정본은 `scripts/lib/change-risk.mjs`의 `requiresStagingWatch`다.
- **결제·인증 전용 게이트**(`paid-flow-gates.yml`)는 그대로 남아 `push: main` 에서 결제·로그인·운세 경로가 걸릴 때만 49개 항목(검증기 48 + `npm test`)을 돌린다. 위 티어와 **독립**이며 필수 체크는 아니다. 변경 집합의 base 는 `github.event.before` 이고, 그 값이 `000…0`(첫 push·force)이면 fail-closed 로 전량 실행한다.
  - 🔴 **스위트 목록의 정본은 `scripts/run-paid-gate-suite.mjs` 한 벌이다**(2026-08-16). 워크플로에는 스텝을 늘어놓지 않는다. 러너는 ①첫 실패에서 멈추지 않고 전부 돌린 뒤 실패를 모아 보고하며 ②실패한 항목만 **merge-base 워크트리에서 다시 돌려 귀책을 가른다**. base 에서도 실패하면 `PRE-EXISTING`, base 가 통과했는데 head 가 실패하면 `NEW` 다. base 를 못 구하면 전부 이 변경 책임으로 본다(fail-closed) — 그래서 체크아웃이 `fetch-depth: 0` 이어야 한다.
  - 🔴 **귀책은 책임만 가르고 판정은 바꾸지 않는다 (2026-09-12 개정).** 실패가 하나라도 있으면 `PRE-EXISTING` 이든 `NEW` 든 **스위트는 실패한다.** 예전에는 `PRE-EXISTING` 을 경고로 낮추고 통과시켰는데, 그건 "별도 PR 이 main 을 고쳐 줄 것"이라는 PR 시대 전제였다. main 단독 개발에는 그 별도 PR 이 없어서 **깨진 가드가 main 에 한 번 안착하면 이후 push 가 전부 초록으로 지나갔다** — 실측: `cbbfcd6e4` 가 `verify:paid-gate-scope` 를 깨뜨린 뒤 다음 push `e4c723784` 의 스위트가 초록이었고, 회귀를 한 push 늦게 발견했다. 귀책 정보는 로그와 Job Summary 에 그대로 남는다("이 push 가 깨뜨린 것은 아님").
  - 🔴 **`push: main` 트리거는 게이트가 아니라 건강 신호다**(2026-08-16). 이 게이트의 가드는 트리거 `paths:` **밖** 파일도 읽는다. 실측 사고: PR #678(`CLAUDE.md` 분할)은 이 워크플로를 아예 깨우지 않은 채 머지됐는데 `verify:nakshatra-premium` 이 `CLAUDE.md` 본문을 단언하고 있어 머지 직후부터 main 이 빨간불이 됐고, 80분 뒤 무관한 두 브랜치(`perf/inp-tap-fixed-cost`·`fix/pg-window-idempotency-scope`)가 같은 스텝에서 동시에 죽었다. **고치는 방향은 `paths:` 를 넓히는 것이 아니다** — 가드가 읽는 파일을 다 넣으면 2026-08-08 에 일부러 좁힌 트리거가 되살아난다. 대신 머지된 main 을 한 번 직접 본다.
  - 🔴 **정적 셸 6종(`index.html` + 5미러)이 여기 포함된다**(2026-08-11 추가). 결제창 렌더러 3종 중 **정본이 셸 인라인**(`_cdChooseServicePaymentMode`)인데 정작 그것만 트리거 목록에서 빠져 있어, 셸에서 이용권 카드를 지우거나 3옵션 문구를 바꿔도 `verify:payment-choice-parity` 가 깨어나지 않았다. 셸은 홈 콘텐츠도 겸하므로 main CI 티어는 `fast` 로 두고(문구 한 줄에 전체 회귀를 돌리지 않는다) 결제 검증만 이 게이트로 깨운다.
  - 🔴 **결제와 무관한 변경에는 이 게이트가 돌지 않는다 (2026-08-14, 사용자 지시로 도입 — 되돌리지 말 것)**. 경로 트리거만으로는 그 지시를 지킬 수 없었다: ①`index.html`(+미러 6)이 결제창 정본이자 홈 콘텐츠 셸이라 팝업 문구 한 줄만 고쳐도 걸리고 ②`js/core/index-inline-runtime.js` 는 `cd:auth-changed` 리스너 때문에 트리거인데 `sync:public` 이 캐시키(`?v=build-…`)만 재생성해도 변경으로 잡힌다. 그래서 **셸을 건드리는 모든 변경**이 36개 검증기를 깨웠다.
    - 🔴 **고치는 방향은 트리거 `paths:` 에서 셸을 빼는 것이 아니다.** 빼면 2026-08-11 에 막은 구멍(이용권 카드·3옵션 문구를 지워도 `verify:payment-choice-parity` 가 안 깨어남)이 그대로 다시 열린다. 판정은 경로가 아니라 **diff 내용**에서 나와야 한다.
    - 해결은 `scope` 잡(`scripts/resolve-paid-gate-scope.mjs`)이다. **경로가 아니라 diff 내용**으로 판정하고, 판정 재료를 **전부 정본에서** 가져온다 — 결제·인증 축은 `scripts/lib/change-risk.mjs` 의 `requiresDeepVerification`, 트리거 목록은 **이 YAML 의 `paths:` 를 직접 파싱**(목록을 두 벌로 만들지 않는다), 셸의 모호함은 **결제 모달 함수 본문을 중괄호로 잘라낸 실제 구간**. 캐시키만 바뀐 줄은 생성 노이즈로 버린다.
    - 🔴 **마커 단어 목록으로 판정하지 말 것.** 그 방식을 먼저 만들어 실제 커밋으로 검증했더니 **양방향으로 틀렸다** — 문구 전용 PR #629 는 `featureKey` 한 단어에 걸려 돌았고, 결제 진입 경로를 고친 PR #625 는 `data-pvw-cta-bypass` 가 목록에 없어 건너뛰었다. 원칙 10 그대로다.
    - 🔴 **fail-closed 다.** `if: needs.scope.outputs.run != 'false'` 이므로 판정이 실패하거나 출력이 없으면 **돌린다.** 건너뛰는 것은 `run=false` 를 명시적으로 받았을 때뿐이다. 이 조건을 `== 'true'` 로 바꾸지 말 것.
    - 검증 매트릭스(도입 시 실측): 문구 전용 → 건너뜀 / 결제 라우트 → 돎 / 결제 게이트 → 돎 / **셸의 결제 구간만** → 돎 / **셸의 문구만** → 건너뜀.
    - `js/mobile-interaction-patch.js` 도 이때 트리거에 추가했다 — 고스트 클릭 억제가 상세 팝업 CTA 의 진입 클릭을 삼켜 유료 기능 13종이 전부 무반응이었는데(PR #625), 그 파일이 목록에 없어 결제 게이트가 깨어나지 않았다.
- **Pushing to `main` schedules staging asynchronously, not production.** The push to `main` starts a short dispatcher in *Release Cloudflare Pages and Worker*, which queues `workflow_dispatch(mode=staging)` for the latest `main` and then exits. The dispatched staging run checks out one fixed SHA, builds once, promotes the Worker then Pages **on staging**, smokes it, and verifies the live SHA on both layers (`npm run verify:deployed-sha`). Failure auto-rolls back both layers. Production only runs this same promote/smoke/verify sequence when a human fires `workflow_dispatch(mode=production)`.
- **Local production deploys are blocked** by `scripts/lib/production-deploy-guard.mjs`. `deploy:check`, `deploy:preview`, and `deploy:smoke` still work locally. The break-glass path — for when GitHub Actions itself is unavailable — is `CD_BREAK_GLASS=1 <command> --break-glass`, and anything shipped that way must be committed and pushed to `main` or the next release silently reverts it.
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
- **브레이크글라스**(GitHub Actions 자체가 죽었을 때)는 `CD_BREAK_GLASS=1` **과** 명시적 `--break-glass` 플래그가 **둘 다** 필요하고, `main` 에 커밋·push 로 다시 랜딩하라는 경고를 찍는다. 🔴 그 단계를 건너뛰면 **다음 정식 릴리스가 그 핫픽스를 조용히 되돌린다.**
- 프로덕션 Cloudflare 자격증명은 GitHub Actions 시크릿에 있다(`CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` · `CLOUDFLARE_CACHE_PURGE_TOKEN` · `CLOUDFLARE_ZONE_ID`). 저장소 파일에 넣지 않는다.

## Pages 와 Worker 는 한 SHA 로 나간다 — 불변식을 지키는 3가지

Pages 와 Worker 가 서로 다른 코드를 가리키는 것이 이 저장소의 모든 결제·접근 상태 장애의 형태였다.

1. 릴리스가 브랜치 이름이 아니라 `ref: ${{ github.sha }}` 를 체크아웃한다 — 릴리스 도중에 새 push 가 들어와도 나가는 것이 안 바뀐다.
2. `CD_ALLOW_EMPTY_CHANGESET=true` 로 릴리스가 팁 전체를 변경 집합으로 취급한다 — 변경 집합 휴리스틱이 Worker 를 건너뛰지 못한다.
3. 배포 후 `npm run verify:deployed-sha` 가 `<origin>/version.json`(Pages)과 `<origin>/api/version`(Worker)을 읽어 릴리스 SHA 와 대조하고, 하나라도 다르면 릴리스를 실패시킨다(엣지 전파용 재시도 포함 — 재시도를 넘긴 불일치는 진짜 불일치다).

양쪽 SHA 는 주입·조회가 가능하다:

- Pages: `NEXT_PUBLIC_GIT_SHA` 가 `next.config.mjs` 에서 `GITHUB_SHA` 를 받고, `scripts/write-version-json.mjs` 가 `/version.json` 을 쓴다. 브라우저에서 `/version.json` 이 "무엇이 배포됐나"에 답하고, React 라우트에서는 `window.__cdBuild` 가 같은 답을 한다.
- Worker: 릴리스가 `--var COMMIT_SHA:<sha>` 를 넘기고, `/api/version` 이 `{ gitSha, commit, commitShort, environment }` 를 돌려준다(시크릿 없음).

## 유료 기능을 무엇으로 검증하나

🔴 **변경별 프리뷰 환경은 없고, 사실 제대로 있었던 적이 없다.** `public/_worker.js` 가 프리뷰의 `/api` 를 **프로덕션 Worker** 로 프록시하고 그 Worker 는 **프로덕션 DB** 를 읽는다 — Worker 프리뷰 버전은 라우팅되지 않으므로, 프리뷰 URL 의 `/api/*` 는 이미 라이브인 워커가 답했다. 정작 확인할 가치가 있던 변경을 그것만 못 건드렸다.

🔴 이것은 2026-08-20 에 도입한 **`staging` 릴리스 타깃과 다르다.** 스테이징은 자체 Pages 프로젝트 · 자체 Worker(`code-destiny-web-staging`) · 자체 MongoDB(`MONGODB_DB_NAME=code_destiny_staging`, `worker/wrangler.staging.toml`)를 가진 실제 배포다. `noindex` + `robots.txt: Disallow: /` 로 색인이 막혀 있고 모든 main push 를 자동으로 받는다 — 이 저장소에서 프로덕션 전 검사에 가장 가깝지만, **아래 가드들의 대체재는 아니다**(별도 PortOne 샌드박스 채널이 붙어 있는지는 `미검증`이므로 스테이징 결제를 "무해하다"고 단정하지 말 것).

결제·인증의 신뢰는 대신 세 곳에서 온다:

1. **배포 전** — `critical` 티어가 전체 테스트를 돌리고, `paid-flow-gates.yml` 이 해당 파일이 걸릴 때 결제/인증/운세 검증기를 돌린다. 소스·jsdom 수준 가드라 실제 결제 없이 성립한다.
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

## 격리 워크트리에서 명령 돌리기 (2026-09-04 `CLAUDE.md` 에서 이관 — 2026-09-12 부로 신규 생성은 폐기)

🔴 **워크트리는 자동이 아니라 예외다**(2026-09-12 개정). 단독 세션은 main 에서 직접 일하고, **동시에 쓰는 세션이 둘 이상일 때만** 두 번째부터 만든다 — 근거와 절차는 위 §Delivery Contract 의 「워크트리 예외」항목이 정본이다. 아래는 그때 필요한 실측이자 **아직 남아 있는 과거 워크트리를 배수할 때** 쓰는 자료다.

- 🔴 **`node_modules` 가 딸려온다고 믿지 말 것** — `.claude/settings.json` 에 `symlinkDirectories: ["node_modules"]` 가 있는데도 실제로는 대개 안 생긴다(2026-08-23 실측: 워크트리 41개 중 **8개만** 보유). 원인은 미확인이다. 그런데도 `npm test`·`typecheck`·`lint`·`verify:*` 는 대개 도는데, 그건 Node·도구들이 상위 디렉터리를 타고 올라가 저장소 루트의 설치본을 주워 쓰기 때문이다.
- 🔴 그래서 **`<rootDir>/node_modules` 같은 절대 경로를 코드에 박으면 그 한 줄만 빗나간다** — `require.resolve` 를 쓸 것. 상위 탐색이 안 통하는 유일한 자리라, 박은 그 도구만 죽고 나머지는 전부 초록불이라 늦게 발견된다. 두 번 났다: `jest.config`(21개 스위트 사망) · `next-build-with-pages-manifest.mjs` 의 next CLI 경로(lint·typecheck·jest 가 **전부 통과한 채로** 빌드에서만 `Cannot find module`).
- 빌드를 돌려야 하면 링크부터 확인한다: `ls -ld node_modules`. 없으면 저장소 루트에서 돌리거나 정션을 건다 — `cmd /c mklink /J "<워크트리 경로>\node_modules" "<저장소 루트 경로>\node_modules"`. 🔴 지울 때는 **링크부터 끊는다**(`cmd /c rmdir "<워크트리 경로>\node_modules"`) — 안 그러면 공유 설치본을 지울 위험이 있다.

## 로컬 `main` 자동 최신화 훅 (2026-09-05 추가)

추가 시점(브랜치 → PR → 사용자 머지 흐름)에는 로컬 `main` 을 갱신하는 주체가 없어 루트 체크아웃이 `origin/main` 보다 10 커밋 뒤처져 있었다. 낡은 로컬 `main` 은 **이미 반영된 수정을 미해결로 보는 진단 오진**을 낳는다. 2026-09-12 이후로도 다른 기기·다른 세션의 push 가 있으므로 이 훅은 그대로 유효하다.

- 정본: [.claude/hooks/sync-main-freshness.mjs](../../.claude/hooks/sync-main-freshness.mjs) · 실행 테스트 [.claude/hooks/sync-main-freshness.test.mjs](../../.claude/hooks/sync-main-freshness.test.mjs) (`npm run test:node` 가 글롭으로 잡는다).
- **언제 도는가**: `SessionStart`(startup·resume·clear, fetch 쿨다운 30분) + `PreToolUse` 의 `EnterWorktree`(쿨다운 5분). 쿨다운 스탬프는 `<git-common-dir>/FETCH_HEAD` 의 mtime 이라 **새 파일을 만들지 않고 Claude Code 자신의 fetch 시계를 그대로 읽는다.**
- **무엇을 하는가**: 쿨다운 밖이면 명시 refspec 으로 `origin/main` 만 당기고(8초 상한, 실패해도 진행), 안전할 때만 루트 체크아웃을 `--ff-only` 로 전진시킨다. `EnterWorktree` 경로는 **당기기만** 하고 빠진다 — 워크트리 base 는 `worktree.baseRef: "fresh"` 덕분에 이미 `origin/HEAD` 라서 전진시킬 게 없다. 이 훅이 거기서 하는 일은 그 `fresh` 갱신의 **24시간 쿨다운을 5분으로 좁히는 것**뿐이다(원칙 6 — 새 방어층을 얹지 않는다).
- 🔴 **말은 거의 안 한다** — `main..origin/main` 의 변경 파일이 **200개 이상일 때만** 안내가 나가고, 그 미만이면 전진은 하되 **출력이 0바이트**다. 근거(2026-09-05 실측, `origin/main`): 하루 30~108 커밋이고 `origin/main~10..origin/main` 이 115 파일, `~3..` 이 53 파일이다. 즉 "커밋 N개" 류의 임계는 하루에도 몇 번 걸려 그냥 소음이 된다. 200파일은 대략 **오랜만에 돌아왔거나 전진이 오래 막혀 있던 경우**에만 걸린다.
  - 재현: `git diff --shortstat origin/main~10 origin/main` · `git log --since=10.days --format=%cd --date=format:%Y-%m-%d origin/main | sort | uniq -c`
- 🔴 **전진을 건너뛰는 조건 4가지** — 세션이 격리 워크트리 안이다 / 루트 HEAD 가 `main` 이 아니다 / 루트에 미커밋 변경이 있다(**미추적 파일 포함**) / 루트에 진행 중인 git 작업이 있다(`MERGE_HEAD`·`rebase-merge` 등 6종). 하나라도 걸리면 손대지 않는다. `stash` 는 어디에도 쓰지 않는다 — 프로젝트 루트는 여러 세션이 공유하므로 남의 미커밋 변경을 건드리면 그대로 사고다.
- **이건 가드가 아니라 넛지다.** 모든 실패 경로가 fail-open(조용히 `exit 0`)이고 당기기 실패는 보고하지 않는다 — 오프라인일 때마다 세션 시작을 막으면 아무 일도 못 한다. 원칙 10(fail-closed)의 취지는 테스트에서 지킨다: 임시 bare 원격 + 클론을 만들어 **전진하는 경우 · 건너뛰어야 하는 경우 · 침묵해야 하는 경우(경계 199/200)** 를 실제로 돌린다.
- **끄는 법**: `.claude/settings.json` 의 `hooks.SessionStart` 와 `hooks.PreToolUse` 의 `EnterWorktree` 블록에서 `sync-main-freshness.mjs` 항목을 지운다. 🔴 훅을 고치거나 지웠으면 **세션을 재시작해야 적용된다**(훅이 안 알려준다).

## 개발환경 최적화 전환 (2026-09-08)
공통 변경 검사 계획을 로컬에서 사용하며, CI는 10회 push 동안 기존 검사와 새 계획을 비교하는 shadow 모드다. required check와 기존 실행 조건은 유지한다. 실제 범위 축소는 관측에서 누락이 없음을 확인한 별도 변경으로 한다. 시작 명령은 check:fast이며 위험 변경은 자동 승격한다. 기존 check:quick --skip-build 호환과 CI Pages 빌드 근거를 보존한다. 전체 incremental typecheck는 실행당 한 번이다. 모든 수정은 main 체크아웃에서 직접 수행한다(2026-09-12 개정 — 이전의 "워크트리에서 수행한다" 조항 대체). 노력 수준은 위험도에 맞추며 과거 전역 high 지시는 적용하지 않는다.

## 2026-09-12 전달 흐름 개정 — main 단독 개발 (아래 2026-09-08·09-10 절을 폐기한다)

기본 흐름은 `main`에서 코드 수정 → targeted 검사(`check:fast`) → commit → (안정 시점에) push → main CI 통과 확인에서 끝난다. **브랜치도 PR도 만들지 않는다.** 로컬 전체 preflight도 폐기했다(아래 「전달 흐름과 위험 영역 검증」). 아래 절의 "PR 입장 판정"·"에이전트가 머지"·"워크트리 자동 생성" 문구는 이 절로 대체됐다.

- 커밋 기준: 독립적으로 검증 가능한 단위마다 즉시 커밋한다. 되돌려도 다른 기능이 흔들리지 않는 크기가 기준이며, 커밋 시점의 `main`은 항상 실행 가능해야 한다.
- push 기준: 작업 단위가 안정되면 **한 번에 묶어** push 한다. push 가 CI 와 스테이징 배포를 깨우므로 커밋마다 push 하지 않는다. 목표는 **push 1회 → CI 1라운드**다.
- 롤백: 미커밋은 `git reset --hard HEAD`, 나쁜 커밋은 그 커밋만 `git revert`. 이미 커밋된 다른 정상 작업까지 날리지 않는다. force-push 는 룰셋이 계속 막으며 필요하지도 않다.
- 룰셋 `main-protection`(id 20666260): `pull_request`·`required_status_checks` 규칙 제거(2026-09-12), `deletion`·`non_fast_forward` 유지. 필수 검사가 없으므로 **push 후 `CI required` 결과를 직접 확인하는 것이 에이전트 몫이다.**
- 자동 브랜치 갱신 장치는 전부 제거했다: `pr-branch-sync.yml` 삭제, `landing-watchdog.yml`의 브랜치 갱신 축 삭제. main push마다 PR CI를 재실행시키던 원인이었다.
- 스테이징 검증은 선택: `npm run verify:staging -- --sha=<40자리 SHA>`(= `delivery:verify-batch`), 릴리스 전 `npm run verify:release`(= `deploy:critical`). 사용자 요청·배포 인프라 변경·운영 릴리스 전·대형 결제/로그인 변경·라우팅 변경·스테이징 전용 버그 때만 실행한다. 일상 push 뒤 스테이징 URL·배포 상태·SHA를 폴링하지 않는다.
- 🔴 **동시 세션 전제**: 워크트리 격리를 끄면 여러 세션이 같은 체크아웃을 공유한다. **한 번에 한 세션**이 원칙이고, 내 것이 아닌 미커밋 변경은 보존하고 커밋에 섞지 않는다.

## 2026-09-08 사용자 전달 방식 변경 (2026-09-12 폐기)

> 🔴 **폐기.** PR 생성·입장 판정(`delivery:admit`)·순차 머지 큐·워크트리 자동 생성·머지 후 워크트리 제거 조항은 모두 위 2026-09-12 절로 대체됐고, 해당 스크립트(`delivery-admit.mjs`·`delivery-batch-plan.mjs`·`session-delivery-guard.mjs`·`pr-create.mjs`)는 삭제됐다. 프로덕션 승격이 사용자의 명시적인 1회 승인 때만 이뤄진다는 조항만 그대로 유효하다.

## 전달 흐름과 위험 영역 검증

- **로컬 전체 preflight는 2026-09-12에 폐기했다**(`ci-preflight.mjs`·`ci-preflight-plan.mjs` 삭제, git 히스토리 참조). 그 스크립트는 `pr-ci.yml`을 js-yaml로 파싱해 `fast`/`guards`/`build`/`critical` 잡의 명령을 로컬 격리 체크아웃에서 그대로 재현하는 **CI 복제본**이었다. 설계상 중복이었고 실제로도 전달마다 같은 lint·typecheck·test·build가 로컬에서 한 번, GitHub에서 또 한 번 돌았다. **유일한 공식 검증 게이트는 GitHub CI다.**
- 기본 흐름: `main`에서 코드 수정 → 관련 targeted 검사 → 검증한 변경 파일만 commit → (안정 시점에) `git push origin main` → main CI 통과 확인. CI가 통과하면 그 작업은 완료다 — staging 배포 완료를 기다리거나 staging URL을 확인하지 않는다.
- targeted 검사는 `npm run check:fast` 하나다. 위험 영역(결제·인증·DB 마이그레이션·Cloudflare 배포 설정·운영 라우팅)은 `scripts/lib/change-risk.mjs`가 deepRequired/high로 판정하고 `scripts/lib/verification-plan.mjs`가 `check:critical` 계약 전체 + `test:jest`까지 자동 승격한다. **위험 영역 전용 새 명령을 만들지 않는다.** Cloudflare 배포 설정만 `npm run check:worker`로 worker 빌드를 명시 강제한다.
- `npm run check:all`은 pr-ci의 guards+critical을 로컬에서 재현한다. **일상 흐름에서 쓰지 않는다** — 되살리면 방금 없앤 중복 그대로다. 수동 조사용으로만 남긴다.
- 🔴 **PR 진입점·배치 계획·입장 판정은 2026-09-12에 전부 삭제했다** (`pr:create`·`delivery:admit`·`delivery:batch-plan`·`session:start`/`session:close`). 순서·충돌·배치 계획이라는 개념 자체가 없어졌다 — 커밋이 곧 순서다.
- main CI는 변경 경로 기반으로 불필요한 러너를 줄인다. Markdown-only push는 classify에서 문서 신선도만 실행하고 fast(typecheck·lint)를 skip하며, `docs/context`, `docs/handoff`, `docs/dev` 계약 문서는 정적 가드를 추가로 실행한다. 코드·설정·생성물·테스트가 섞이면 기존 fast/build/critical 티어 판정을 유지한다. `CI required` aggregate는 실행된 lane의 성공과 판정된 skip만 허용하고 실패·취소는 차단한다.
- 🔴 **변경 집합 계산에 주의**: `scripts/check-changed.mjs`의 base 기본값은 2026-09-12에 `origin/main` → `HEAD`/`HEAD^`로 바꿨다. main에서 직접 일하면 `origin/main` 기준 diff가 push 직후 비어 `check:fast`가 **아무것도 검사하지 않은 채 초록**이 된다.
- push 뒤 스테이징 Pages/Worker SHA·정상 응답은 비동기 후속 검증으로만 확인하며, 그 결과를 기다려 다음 작업을 시작하지 않는다. 프로덕션 승격은 별도 1회 승인이 필요하다. --admin·보호 해제·실패 무시·destructive force push는 금지한다.
- CI 실패는 job/log → 원인 분류 → **실패한 검사만** 로컬 재현·수정 → commit/push → 최신 main CI 확인까지 해결한다. 전체 검사를 로컬에서 다시 돌리지 않는다. 기존 실패를 성공으로 바꾸거나 rerun으로 숨기지 않는다.
- 독립 기능은 독립 커밋. 강한 의존 관계는 함께 묶고 UI·인프라는 가능한 분리한다. 범위 밖 수정·대규모 formatter·불필요한 lockfile 변경을 금지한다.

## 2026-09-10 상시 연속 머지 정책 (역사 — 2026-09-12 개정으로 대체)

main push는 짧은 디스패처만 실행하고 실제 스테이징 배포·검증은 별도 직렬 실행으로 비동기 처리한다. 이미 진행 중인 배포는 취소하지 않고 아직 배포하지 않은 낡은 staging 실행은 최신 main에 양보한다. **이 릴리스 게이트 동작만 유효하고, 연속 머지·입장 기준 조항은 폐기됐다** — 전달 기준은 위 2026-09-12 절을 따른다.

## 2026-09-11 `ci-preflight.mjs` 재사용 조건을 파일 겹침 기준으로 완화 (역사 — 2026-09-12 preflight 폐기로 대체)

`ci-preflight.mjs`의 receipt 재사용(`--verify-receipt`)과 PR 생성(`--create-pr`)은 과거 "receipt.base가 방금 fetch한 origin/main과 SHA까지 완전히 같아야 함"을 요구했다. 이 저장소는 개인 계정 소유라 GitHub Merge Queue를 쓸 수 없고 `strict_required_status_checks_policy: false`다 — 즉 GitHub 자신도 "PR 브랜치가 최신 main을 포함해야 머지 가능"을 강제하지 않으며, `delivery-admit.mjs`의 `mergeable`/`mergeStateStatus` 확인은 git 트리 충돌 여부만 본다. 로컬 규칙만 이보다 엄격했던 것이라, main이 이번 PR과 무관한 파일만 전진해도 최대 30분짜리 전체 검증을 처음부터 다시 요구하는 병목이 있었다.

지금은 `upstreamCompatible`/`checkUpstream`(`ci-preflight.mjs`)이 "receipt.base가 최신 main의 조상이고, 그 사이 upstream이 건드린 파일이 이번 후보가 건드린 파일과 하나도 겹치지 않을 때"만 재사용을 허용한다. main이 rebase/force-push로 재작성돼 조상 관계 자체가 깨지면(`ancestor: false`) 항상 차단한다(fail-closed 유지). receipt에는 이제 `files` 필드가 함께 기록되어 재사용 시점에 재계산 없이 그대로 쓰인다. `--create-pr`의 "branch가 최신 main을 이미 포함해야 함" 요구(과거 `merge-base --is-ancestor base HEAD`)는 이 완화의 대상 그 자체이므로 제거했다 — receipt.base가 애초에 HEAD의 조상이라는 사실은 최초 preflight 실행 시점에 이미 확인된다. 검증 루프 진행 중 origin/main이 전진하는 경우(`assertBase`)와 종료 직후 최종 확인도 동일한 `checkUpstream`으로 판정하며, 통과 시 그 시점의 `base`를 갱신해 이후 판정 기준으로 삼는다.

잔여 위험(재사용 완화): 파일명이 겹치지 않아도 의미론적 의존성(예: 다른 파일의 export 시그니처 변경)은 이 검사로 잡히지 않는다. 이는 새로운 위험이 아니라 GitHub Merge Queue 미제공·strict 비활성으로 현재도 감수 중인 위험과 같은 선상이다. (2026-09-12 갱신) `delivery-admit.mjs`의 "최신 main 반영" 게이트와 plain 실행 시작 시 조상 검사(`ci-preflight.mjs`)도 제거했다 — 둘 다 merge-tree 충돌 + 파일 겹침 판정으로 대체됐다(위 2026-09-12 절). (2026-09-12 폐기) `ci-preflight.mjs` 자체를 삭제했다. 여기서 만든 `upstreamCompatible` 판정만 `delivery-admit.mjs`로 옮겨 살아남았고, receipt·격리 체크아웃·CI YAML 재현은 전부 사라졌다.

## 2026-09-11 캐시버스트 false CONFLICTING 자동 복구 (2026-09-12 폐기)

> 🔴 **폐기.** PR 을 쓰지 않으므로 "GitHub 이 PR 을 CONFLICTING 으로 본다" 는 상황 자체가 없어졌다. `scripts/delivery-admit.mjs`·`scripts/delivery-sync.mjs`·회귀 가드 `__tests__/ui/delivery-continuous-merge.test.mjs` 를 함께 삭제했다.
> **살아남은 것**: merge driver 본체 `scripts/git/cachebust-merge-driver.mjs` 와 등록기 `scripts/setup-git-merge-drivers.mjs`, 그리고 `verify:cachebust-merge`. main 에서 직접 작업해도 `git pull` 병합에서 driver 가 그대로 쓰인다.
> 아래 서술은 그 시절의 근거 기록이다 — 같은 함정이 되살아나는지 판단할 때만 읽는다.

`.gitattributes`의 `merge=cachebust` 경로(정적 셸·로케일 미러·로더 JS 등 21개)는 로컬 merge driver(`scripts/git/cachebust-merge-driver.mjs`)가 `?v=build-<hash>`를 정규화한 뒤 3-way 병합한다. **GitHub의 서버측 PR 병합 가능 계산(`gh pr view --json mergeable,mergeStateStatus`)은 이 로컬 driver를 절대 실행하지 않는다 — 플랫폼 제약이고 우리가 고칠 수 있는 버그가 아니다.** 그래서 `origin/main`이 이 파일들을 한 번만 건드려도 내용 차이가 0인 PR까지 전부 `mergeable=CONFLICTING`으로 보인다. 지금까지 해결책은 항상 사람이 하는 "로컬 리베이스 + force-push"였고(과거 인시던트 핸드오프 5건), 그 사이 10~30분짜리 `ci:preflight`가 통째로 무효화되는 병목이 있었다.

- **`scripts/delivery-admit.mjs`**: `mergeable === "CONFLICTING"`이고 base=main·Ready·로컬 head 일치일 때만 **딱 한 번** 자동 복구를 시도한다. driver 등록(`setup-git-merge-drivers.mjs` 재사용) → `origin/main` fetch → **일회용 detached worktree**(`.admit-recovery-<8hex>`, `finally`에서 제거) 안에서 `git rebase origin/main` → 종료 코드뿐 아니라 `git status --porcelain`의 충돌 표식(UU/AA 등)과 트리 clean까지 확인 → PR head 브랜치 하나에만 `--force-with-lease` push → `gh pr view` 재조회 값으로 판정한다.
- **실제 충돌은 예전과 똑같이 차단된다.** 해시를 걷어내고도 충돌이 남으면 즉시 `git rebase --abort`, 일회용 worktree 제거, 복구 이전 `mergeable` 값 그대로 BLOCK한다. 복구 자체가 실패하거나(네트워크·권한·예상 밖 git 상태) 예외를 던져도 원래 값으로 되돌아간다 — 새 경로의 버그가 admission을 통과시키는 일은 없다. 이 변경은 **가용성 수정이지 엄격함의 완화가 아니다**.
- **로컬 브랜치는 건드리지 않는다.** 복구가 성공하면 원격 head만 앞서므로 "후보와 PR head 일치"가 정직하게 BLOCK된다. 운영자는 `git fetch && git reset --hard origin/<branch>`로 로컬을 맞추고 PR CI 결과를 다시 확인한다. 자동화되는 것은 사람이 손으로 하던 리베이스·force-push 한 번이다. 끄려면 `npm run delivery:admit -- --pr=<n> --no-recovery`.
- **push 안전장치**: push 인자는 `cachebustForcePushArgs()` 한 곳에서만 만들고 `main`·`refs/*`·`HEAD`·비정상 브랜치명·비정상 SHA를 전부 거부한다. bare `--force`는 쓰지 않는다.
- **driver 등록 시점**: `node_modules`를 정션으로 빌려 쓰는 격리 워크트리는 npm의 `prepare`가 한 번도 돈 적이 없어 merge driver 등록이 통째로 빠질 수 있다. 그래서 복구 경로가 `setup-git-merge-drivers.mjs`를 스스로 다시 실행한다(idempotent). 등록에 실패하면 복구를 중단하고 원래 판정을 그대로 쓴다. (2026-09-12: 같은 방어를 preflight도 하고 있었으나 그 스크립트는 삭제됐다.)
- **회귀 가드**: `__tests__/ui/delivery-continuous-merge.test.mjs`가 실제 scratch 저장소를 만들어 (1) 해시만 다른 경우 복구 성공 (2) 진짜 내용 충돌은 `reason=conflict`로 차단하고 리베이스를 취소 (3) push 인자가 PR head 브랜치 하나뿐임을 검사한다. 변이 확인 완료: 충돌 검사를 지우면 (2)가, 정규화를 지우면 (1)이 실패한다.
