# Context Audit

## Purpose

This file is no longer a duplicate current-state summary.
Use it only for:

- documenting conflicts between active documents
- recording exceptions that cannot live in `docs/CURRENT_DEV_BASELINE.md`
- marking older material as historical-only evidence

## Active Document Precedence

> 🔴 **2026-08-28 개정** — 예전 순서는 `AGENTS.md` 를 1위에 두었는데, 그 파일은 `CLAUDE.md` 의 미러였고 내용이 낡아 있었다. `AGENTS.md` 는 이제 Codex 진입점(표지판)일 뿐 규칙을 담지 않는다.

1. `CLAUDE.md` — 규약 정본(절대 규칙 · 코딩 원칙 · 결제 게이팅 절대 순서)
2. `docs/context/*.md` — 주제별 상세 정본. `CLAUDE.md` 라우팅 표가 어느 것을 읽을지 정한다
3. `docs/CURRENT_DEV_BASELINE.md` — 현재 개발 초점(유일한 시간 민감 요약)
4. `docs/CONTEXT_AUDIT.md` — 충돌·예외·역사 기록(현재 상태의 재서술이 아니다)

`AGENTS.md` 는 순위에 들어가지 않는다 — 1번으로 보내는 진입점이다.

If the first three documents disagree, do not merge rules silently. Record the mismatch here, then resolve it before coding.

## Delivery Policy

> 🔴 **2026-08-14 — 이 절이 폐기된 계약을 "Active rule" 로 선언하고 있었다.** 이 파일은 우선순위 4위인데 1위 `AGENTS.md` 와 정반대 규칙을 활성으로 적어 두었고, 바로 위 "세 문서가 disagree 하면 코딩 전에 화해시켜라" 규칙 때문에 **매 세션 시작이 그 화해 작업에 막혔다.** 이 파일의 역할은 충돌·예외의 기록이지 현재 상태의 재서술이 아니다(Purpose 절 참고). 그래서 여기에는 활성 규칙을 쓰지 않는다.

- **활성 배포 규칙은 `docs/context/delivery-and-ci.md` 하나다**(2026-08-28 — `AGENTS.md` §Delivery 를 그 파일로 흡수했다). 요약조차 여기 두지 않는다 — 요약이 낡는 것이 정확히 이 사고의 형태였다.
- **Historical — 2026-08-08 "work on `main`, ship with `deploy:safe`" 계약**: 단일 개발자 레포라는 이유로 PR 레인을 걷어내고 워킹트리를 배포 단위로 삼았다. 함께 삭제된 것: worktree-policy judge, release-fast direct lane, release-PR-overlap check, Pages PR contract check, CI-gate waiter, Codex PR helper directory, worktree-pr-policy / pages-build-gate / cloudflare-safe-auto-release 워크플로. 필요하면 2026-08-08 이전 git 히스토리에서 복구한다.
- **Historical — 왜 되돌렸나 (2026-08-11)**: `wrangler` 는 커밋이 아니라 **워킹트리**를 민다. 그래서 프로덕션이 어느 커밋인지 이름 붙일 수 없었고, 베이스가 낡으면 그 사이 머지된 변경이 조용히 증발했다(2026-08-01 하루에 3회). 지금은 릴리스가 `github.sha` 를 체크아웃해 배포하므로 워킹트리라는 개념 자체가 없다.
- **Historical drift**: `release:fast` · `verify:worktree-policy` · `promote.lock` · `deploy:safe [y/N]` 승격 프롬프트 · "preview 는 릴리스의 일부" 를 설명하는 문서는 모두 2026-08-11 이전 것이다.

## Current Conflict Resolutions

### `docs/DEPLOYMENT_AND_INFRA.md` 첫 절이 폐기된 배포 계약을 지시한다 (2026-08-24, **표시 완료**)

- **충돌 내용**: 그 문서의 첫 절 "Current release policy (2026-08-08)" 이 **"PR-first delivery was
  retired"** 로 시작해 로컬 `deploy:safe` 배포를 지시한다. `CLAUDE.md` 절대 규칙 3(브랜치 → PR →
  CI → 사용자가 머지 → 스테이징 자동, 프로덕션은 수동 `workflow_dispatch`)과 정반대다.
- **왜 위험했나**: 이 문서는 고아가 아니다. `docs/context/doc-precedence.md` §활성 참조 문서 목록(2026-08-28 이전에는 `AGENTS.md` §Important Docs)과
  `docs/CURRENT_DEV_BASELINE.md:21` 이 **활성 참조**로 올려 두고 있다. `Rules/agent-regression-guard.md`
  는 아무도 안 읽어서 충돌이 안 드러났지만(2026-08-15 항목), 이쪽은 읽으라고 지시된 문서다.
- 🔴 **같은 문서 안에 두 계약이 공존**한다 — 아래 "배포" 절(2026-08-11 개정)은 이미 GitHub Actions
  전용이라고 적고 있다. 즉 어느 절을 읽느냐로 결론이 갈린다.
- **조치**: 문서를 다시 쓰지 않고 첫 절 위에 날짜 박은 🔴 정정 배너를 달아 폐기 표시했다. 아래
  내용은 역사 기록으로 남긴다 — 왜 그 계약이 있었고 왜 되돌렸는지가 유용하다.
- **정본**: 활성 배포 계약은 `docs/context/delivery-and-ci.md` 하나다. 요약조차 다른 문서에 두지 않는다.
- 실제로 폐기된 절을 따라 하면 `scripts/lib/production-deploy-guard.mjs` 가 막아 exit 1 이 난다 —
  즉 사고로 이어지지는 않지만, 읽는 사람의 시간을 태우고 계약을 오해하게 만든다.

### AI 출력 로케일 — 5개에서 12개로 (2026-08-20)

- **Active rule**: AI 출력 로케일 = 런타임 UI 로케일 전부. 정본은 `lib/i18n/ai-locale.js` 의
  `AI_OUTPUT_LOCALES` 이고 `lib/i18n/locale-normalize.js` 의 `RUNTIME_LOCALES` 와 **같은 값이어야 한다**
  (`verify:ai-locale-pipeline` (9) 와 `verify:market-policy-registry` 가 대조한다).
- 갱신한 문서: `docs/LLM_AND_AI_POLICY.md` · `docs/SERVICE_STRUCTURE.md` · `docs/INTERNATIONAL_MARKET_LOCALIZATION.md`.
- **Historical, 고치지 않음**: `docs/LEGAL_MARKET_RESEARCH_2026_08_06.md` 는 2026-08-06 스냅샷이라
  본문의 "five locales only" 와 Locale Matrix 의 `AI output` 열을 그대로 두고 정정 주석만 달았다.
- 🔴 **언어 ≠ 시장.** 12개 언어로 상담문을 쓰는 것이 시장 개방·과세·관할·환불권을 뜻하지 않는다.
  `KR` 외 모든 시장은 여전히 `enabled: false` 다.
- 🔴 **미검증**: 각 언어의 상담문 품질은 과금 실호출 없이는 잴 수 없다. 가드가 단언하는 것은
  "지시문이 존재하고 병기이며 프롬프트의 한국어 리터럴을 무효화한다"까지다.

### Static home source of truth

- Active rule: root `index.html` is the live home source.
- Related detail: `public/**/index.html` files are generated mirrors and should not be patched directly unless explicitly requested.

### Runtime API source of truth

- Active rule: `worker/**` is the primary runtime API surface.
- Exception note: `server/**` remains legacy or fallback only when no Worker equivalent exists.

### Payment wording and access model

- Active rule: user-facing payment terms stay `이용권`, `월정석`, `단건 결제`.
- Historical drift: older docs and code comments may still mention coins or legacy payment phrasing. Treat those as implementation residue, not current product copy.

### Deployment safety

- 🔴 **Active rule (superseded 2026-08-20, commit `80d3660c1`)**: merging a PR into `main` reaches only **staging** (`staging.code-destiny.com`, isolated DB `code_destiny_staging`) automatically. Production (`code-destiny.com`) is reached only by a human running `workflow_dispatch(mode=production)` on *Release Cloudflare Pages and Worker* — **that dispatch is now the promotion approval**, not the merge. Production is expected to lag `main` HEAD between dispatches; `verify-merge-landed.mjs` reports that state as `severity: "ok"`. The one standing exception is `fortune-daily-publish`, which still writes straight to production.
- Local production deploys are blocked by `scripts/lib/production-deploy-guard.mjs`. Do not work around it.
- Historical drift: notes describing "preview-then-promote", a `[y/N]` promotion gate, or a preview created as part of a release predate 2026-08-11. Notes describing "merging is the user's action and it is the [production] approval" — including this file's own prior wording — predate 2026-08-20 and describe the pre-cutover contract, not the current one.

### 결제 방식 우선순위 — `Rules/agent-regression-guard.md` 와 정면 충돌 (2026-08-15, **해결**)

- **충돌 내용**: `Rules/agent-regression-guard.md` 10항은 해제·차감 판정 순서를 **①단건 결제 ②월정석 ③이용권** 으로 규정한다. `CLAUDE.md` 와 `docs/payment-policy-*.md` 는 **①이용권 ②월정석 ③코인** 이며, 결제창에서 단건과 월정석은 **동등 우선순위**(`equalPriorityMethods`)다. 두 규칙은 양립할 수 없다.
- **왜 지금 발견됐나**: `Rules/agent-regression-guard.md` 는 `AGENTS.md`·`CLAUDE.md`·`docs/**` 어디에서도 참조되지 않는 고아 문서였다(2026-08-15 확인 — 검색 범위: `scripts/**`, `.github/**`, `package.json`, `AGENTS.md`, `CLAUDE.md`, `docs/CONTEXT_AUDIT.md`, `docs/CURRENT_DEV_BASELINE.md`). 읽히지 않았기 때문에 충돌이 드러나지 않았을 뿐이다.
- 🔴 **결정 (2026-08-15, 사용자): 이용권 우선으로 확정, `Rules/` 10항 폐기.** 이전에는 "조용히 합치지 말 것"으로 보류했으나(Active Document Precedence 규칙) 사용자가 정본을 정했다.
  - 실제 코드·verify 가드가 강제하는 것은 `CLAUDE.md` 쪽(이용권 우선)이다 — `verify:billing-pass-policy`·`verify:checkout-pass-card` 가 "이용권 카드가 결제창 맨 위 + `추천` 배지" 를 단언한다.
  - **`Rules/` 10항 폐기가 현행 구현·verify 가드와 일치**한다(위 두 verify 가 이용권 우선을 단언).
- **정본**: 결제 순서는 `CLAUDE.md` §결제 게이팅 과 `docs/payment-policy-flow.md`. `Rules/` 10항은 폐기 표시로 이력만 보존한다(1~9항은 유효).

### `Rules/agent-regression-guard.md` 의 나머지 항목 (2026-08-15)

- 5항(커밋 전 `git diff --name-only`/`--numstat` 점검)·8항(내부 탐색 과정 비노출)은 `CLAUDE.md` §검증 · 커밋 과 §코딩 원칙 에 반영했다.
- 1·3·4항은 `CLAUDE.md` 코딩 원칙 7 과 결제 규칙에 이미 같은 취지가 있다. (원칙 3 은 2026-09-04 폐기 후 2026-09-06 삭제 — 아래 절 참조.)
- 2항(대규모 롤백 금지)·6항(커밋 메시지 범위 제한)·7항(회귀 시 복구 우선순위)·9항(프리미엄/기본 운세 가격 분리)은 **다른 활성 문서에 대응 항목이 없다.** 살릴지 폐기할지 결정되지 않았으므로 `Rules/` 파일을 그대로 둔다.
- 🔴 `Rules/` 는 `scripts/verify-doc-freshness.mjs` 의 `REPO_PREFIXES`·`ROOT_REPO_PATHS` 어디에도 없어 **참조 무결성 검사를 받지 않는다.** 이 디렉터리를 계속 쓸 거라면 그 목록에 넣어야 한다.

### 코딩 원칙 3 "수술적 변경" 폐기 → 결번 (2026-09-04 폐기 · 2026-09-06 삭제, **해결**)

- **왜**: 사용자 판정 — "필요한 부분만 · 인접 코드를 개선하지 않는다"가 **범위 안의 결함까지 손대지 않는 근거**로 쓰여 작업이 대충 끝났다.
- **2026-09-04 에 무엇이 남고 무엇이 갔나**: 폐기된 것은 "인접 코드를 개선하지 않는다 / 깨지지 않은 것을 리팩터링하지 않는다 / 무관한 데드코드는 언급만". 남은 것은 **기존 스타일 따르기**와 **내 변경으로 생긴 미사용 import·변수 제거**. 취지는 코딩 원칙 7(회귀 위험 선보고)과 신설 14(주입 규칙 우선순위) 첫 항이 이어받았다.
- 🔴 **2026-09-06, 사용자 요청으로 폐기 표시 자체를 삭제하고 원칙 14 의 인접 결함 오버라이드도 걷어냈다.** 이제 **인접 결함 축은 주입 규칙(`oh-my-fable`)을 그대로 따른다** — 요청한 동작이 그것 없이는 성립하지 않는 경우가 아니면 고치지 말고 후속 과제로 보고만 한다. **범위 안에서 발견한 것도 같다.** 2026-09-04 에 "남은 것"으로 적었던 두 줄(기존 스타일 따르기 · 내 변경으로 생긴 미사용 import 제거)은 이 삭제로 규약 문서에서 사라졌고, 각각 하네스 기본 지시와 `lint` 가 대신 받는다.
- 🔴 **번호는 비우지 않았다.** `원칙 N` 을 번호로 가리키는 줄이 레포에 338개이고(2026-09-04, 전 레포 `git grep` 실측), 훅 테스트가 번호 문자열을 직접 단언한다(`.claude/hooks/session-context-budget.test.mjs` 의 `/원칙 12/`). 3번 자리는 **결번**으로 남기고 4번 이후는 그대로 둔다 — 재사용도 재번호도 하지 않는다.
- **같이 고친 곳**: `CLAUDE.md`, `docs/context/coding-principles.md`, `AGENTS.md`(원칙 개수 단언), `Rules/agent-regression-guard.md`, `docs/vedic-basic-feature-guard.md`. `docs/context/CLAUDE.archive-2026-08-15.md` 는 대조용 스냅샷이라, `docs/handoff/**` 는 당시 규칙 아래 실제로 한 일의 기록이라 **건드리지 않았다**.

### `CLAUDE.md` 구조 최적화 (2026-09-04, **해결**)

세션마다 자동 로드되는 이 파일에서 "지금 읽지 않아도 되는 것"을 덜어 내고, 상호 모순 4건을 정본을 정해 해소했다. 삭제는 하지 않았고 전부 이동이다.

- **어디로 옮겼나**
  - `## Workflow` 절 — 내용 대부분이 `docs/context/delivery-and-ci.md` §Workflow 의 중복이었다. 남은 실행 규칙(커밋 순서·`git diff` 점검·CI 폴링 금지·왕복 묶기)은 `CLAUDE.md` §검증 · 커밋 으로 합쳤다. **절 이름이 바뀌었으므로** `Rules/agent-regression-guard.md` 와 이 문서의 §Workflow 참조를 함께 고쳤다.
  - 세션 경제 실측(300k 초과 = 총소비 69.7% · `/clear` 고정비 0.1% · 인수인계 미독 29/54 · Bash 콜 비중 50.0% · 폴링 364콜 · `sed -n` 664콜) → `docs/context/coding-principles.md` §세션 경제 실측. `CLAUDE.md` 에는 규칙만 남겼다.
  - 워크트리 `node_modules`·`symlinkDirectories`·`require.resolve`·`mklink`/`rmdir` 순서 실측 → `docs/context/delivery-and-ci.md` §격리 워크트리에서 명령 돌리기. `CLAUDE.md` 에는 **"믿지 말 것 · `require.resolve` 를 쓸 것 · 빌드 전 `ls -ld node_modules`"** 세 줄만 남겼다(빠지면 조용히 빗나가는 축이라 요약을 남긴다).
  - 사고 날짜·건수 서사(2026-08-25 승격 대기 5건, 2026-08-14 Haiku 룰 폐기, 2026-08-20 워크트리 2회, 2026-08-23 41개 중 8개)는 규칙 문장에서 빼고 해당 context 문서에 남겼다.
- **모순 4건과 결론**
  - **(A) 절대 규칙 6(삭제 금지) vs 죽은 코드는 지운다** — 축이 다르다. 규칙 6 을 "**사용자에게 보이는 것**(기능·라우트·배지·콘텐츠)"으로 한정하고, "참조 0인 죽은 코드는 원칙 9 의 3면 grep 뒤 격리하지 말고 삭제"를 같은 항목 안에 붙였다. 별도의 「레포 함정」 항목으로 흩어져 있어 반대처럼 읽히던 것을 한 자리로 모았다.
  - **(B) 절대 규칙 3(`main` 금지) vs 사용자 요청 시 프로덕션 승격** — 예외가 아니라 **승인 지점의 정의**다. "사용자가 명시적으로 요청하면 그때 한 번 대신 실행한다, 상시 위임이 아니다"로 한 문장에 붙여 두 조항이 떨어져 읽히지 않게 했다.
  - **(C) 워크트리 필수 vs 조사 예외** — 예외("읽기만 하는 조사·질문, 사용자가 여기서 하라고 한 경우")를 문단 끝이 아니라 **필수 문장 바로 뒤**로 올렸다.
  - **(D) 원칙 1(불확실하면 묻는다) vs 원칙 8(추정 금지)** — 충돌이 아니다. 1 은 *요구사항 해석*, 8 은 *사실 단언*이다. 8 에 "이름 grep 결과만으로 결론 내지 않는다"를 명시해 경계를 분명히 했다.
- 🔴 **번호·절 제목은 바꾸지 않았다**(§Workflow 하나 제외, 참조 3곳 동시 수정). `code-locator` 전수 조회 실측(2026-09-04): `CLAUDE.md` 직접 참조 68건 + `원칙 N` 번호 참조 100건 이상 + 절 제목 참조 40건 이상. 워크플로 `paths` 트리거에 `CLAUDE.md` 를 넣은 곳은 0건이라 CI 게이트가 이 파일을 직접 물지는 않는다 — 링크 무결성은 `npm run verify:doc-freshness` 를 손으로 돌려 확인해야 한다(`verify:guard-wiring` 의 `UNWIRED_BY_DESIGN` 에 들어 있다).

## Historical-Only References

The following may still be useful as evidence, but they are not active coding baselines.

> 🔴 **2026-08-14 정정** — 이 목록이 활성 문서 5종(`docs/payment-policy-overview.md` · `payment-policy-content-access.md` · `payment-policy-flow.md` · `deploy-cache.md` · `r2-assets-cache-strategy.md`)을 "역사 참고용"으로 강등하고 있었다. 다섯 모두 활성 참조 목록에 올라 있고 결제 3부작은 정책 **정본**이다. 제거했다. 이 목록에 무언가를 넣기 전에 `docs/context/doc-precedence.md` §활성 참조 문서 목록과 대조할 것(2026-08-28 이전에는 `AGENTS.md` §Important Docs 였다).

- `PROJECT_STRUCTURE.md`
- `PAYMENT_POLICY.md`
- `PAYMENT_CONCURRENCY_AUDIT.md`
- `CLOUDFLARE_PAGES_SETUP.md`
- `DEPLOY_CHECKLIST.md`
- `docs/admin-subscription-tier-simulation-checklist-2026-04-22.md`
- `docs/portone-resubmission-checklist-2026-04-16.md`

## Notes Requiring Care

- `docs/payment-policy-flow.md` contains a title date older than its latest referenced revision history. Treat current content and active billing docs as authoritative over the title date alone.
- `worker/wrangler.toml` may describe public vars and placeholders, but production secrets still live outside the repo.
- `app/api/*` can exist for Next/App Router needs, but the deployed runtime path must always be verified against `worker/index.js` and the active Pages routing model.

## Maintenance Rule

When a new stale reference or document conflict is found:

1. update `docs/CURRENT_DEV_BASELINE.md` if the current baseline changed
2. remove the stale link from active docs when possible
3. record the exception here only if the older material must remain for evidence
