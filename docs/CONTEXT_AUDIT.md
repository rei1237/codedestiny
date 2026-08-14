# Context Audit

## Purpose

This file is no longer a duplicate current-state summary.
Use it only for:

- documenting conflicts between active documents
- recording exceptions that cannot live in `docs/CURRENT_DEV_BASELINE.md`
- marking older material as historical-only evidence

## Active Document Precedence

1. `AGENTS.md`
2. `docs/CURRENT_DEV_BASELINE.md`
3. `CLAUDE.md`
4. `docs/CONTEXT_AUDIT.md`

If the first three documents disagree, do not merge rules silently. Record the mismatch here, then resolve it before coding.

## Delivery Policy

> 🔴 **2026-08-14 — 이 절이 폐기된 계약을 "Active rule" 로 선언하고 있었다.** 이 파일은 우선순위 4위인데 1위 `AGENTS.md` 와 정반대 규칙을 활성으로 적어 두었고, 바로 위 "세 문서가 disagree 하면 코딩 전에 화해시켜라" 규칙 때문에 **매 세션 시작이 그 화해 작업에 막혔다.** 이 파일의 역할은 충돌·예외의 기록이지 현재 상태의 재서술이 아니다(Purpose 절 참고). 그래서 여기에는 활성 규칙을 쓰지 않는다.

- **활성 배포 규칙은 `AGENTS.md` §Delivery 하나다.** 요약조차 여기 두지 않는다 — 요약이 낡는 것이 정확히 이 사고의 형태였다.
- **Historical — 2026-08-08 "work on `main`, ship with `deploy:safe`" 계약**: 단일 개발자 레포라는 이유로 PR 레인을 걷어내고 워킹트리를 배포 단위로 삼았다. 함께 삭제된 것: worktree-policy judge, release-fast direct lane, release-PR-overlap check, Pages PR contract check, CI-gate waiter, Codex PR helper directory, worktree-pr-policy / pages-build-gate / cloudflare-safe-auto-release 워크플로. 필요하면 2026-08-08 이전 git 히스토리에서 복구한다.
- **Historical — 왜 되돌렸나 (2026-08-11)**: `wrangler` 는 커밋이 아니라 **워킹트리**를 민다. 그래서 프로덕션이 어느 커밋인지 이름 붙일 수 없었고, 베이스가 낡으면 그 사이 머지된 변경이 조용히 증발했다(2026-08-01 하루에 3회). 지금은 릴리스가 `github.sha` 를 체크아웃해 배포하므로 워킹트리라는 개념 자체가 없다.
- **Historical drift**: `release:fast` · `verify:worktree-policy` · `promote.lock` · `deploy:safe [y/N]` 승격 프롬프트 · "preview 는 릴리스의 일부" 를 설명하는 문서는 모두 2026-08-11 이전 것이다.

## Current Conflict Resolutions

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

- Active rule: production is reached only by merging a PR into `main`. **Merging is the user's action and it is the approval** — there is no separate promotion prompt and no preview stage before production.
- Local production deploys are blocked by `scripts/lib/production-deploy-guard.mjs`. Do not work around it.
- Historical drift: notes describing "preview-then-promote", a `[y/N]` promotion gate, or a preview created as part of a release predate 2026-08-11.

## Historical-Only References

The following may still be useful as evidence, but they are not active coding baselines.

> 🔴 **2026-08-14 정정** — 이 목록이 활성 문서 5종(`docs/payment-policy-overview.md` · `payment-policy-content-access.md` · `payment-policy-flow.md` · `deploy-cache.md` · `r2-assets-cache-strategy.md`)을 "역사 참고용"으로 강등하고 있었다. 다섯 모두 `AGENTS.md` §Important Docs 에 활성으로 올라 있고 결제 3부작은 정책 **정본**이다. 제거했다. 이 목록에 무언가를 넣기 전에 `AGENTS.md` §Important Docs 와 대조할 것.

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
