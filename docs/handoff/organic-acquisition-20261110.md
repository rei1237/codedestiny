# Organic acquisition repair

status: blocked-delivery

## Scope and completed changes

- User requested implementation after a read-only GSC/GA4 organic traffic audit.
- Work directory: `D:\Development\codedestiny-worktrees\organic-acquisition-20261110-211311`.
- Implementation commit: `64388836e8d34974719006bc6608bf2d03e12df6`.
- Ignore referral attribution only for eight exact observed OAuth/payment return hosts, before GA config. Search/social/AI and lookalike domains remain unaffected. No referrer text is added to payloads.
- Preserve all authored landing FAQs instead of truncating at five; visible HTML and FAQ JSON-LD share the list.
- Regenerate static mirrors, cache keys and sitemap lastmod signatures; no route inventory change.
- Existing production-origin guard already blocks production measurement on local/staging hosts; no duplicate implementation added.
- No production deploy, Google Analytics admin change, live payment, paid LLM call or DB write.

## Validation

- Targeted Node tests: 49 passed, 0 failed (organic acquisition, consent, purchase analytics, sukuyo scope).
- verify:analytics-events: passed.
- ESLint for changed React files: passed; check:fast full lint/typecheck stages passed.
- check:pre-push: exit 0, including mirrors/sitemap/entity/repo checks.
- git diff --check: passed.
- check:fast first attempt stopped on sitemap drift after shared template changed; regenerated with npm run sitemap:generate.
- Second check:fast stopped in the broad mock Node suite: 4827 passed, 1 failed. `__tests__/fortune/sky-and-range.test.mjs:15` requires missing generated `fortune/data/daily-2026-11-10.json` (ENOENT). This is an environment/data prerequisite, not an assertion failure in the edited paths. Subsequent gates are NOT verified. Log: `D:\Development\Temp\cline\organic-acquisition-check-fast-2.log`. Inspect `scripts/fortune-build-data.mjs` for mock/offline safety before generating data; never fall back to a live paid provider.
- Full frontend build/CI for this commit has NOT run.

## Delivery blocker

- Original directory `D:\Development\code-destiny` is on `feat/world-cast-page` with extensive unrelated uncommitted work.
- main is checked out at `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530` and contains unrelated uncommitted changes. Do not reset, stash, switch or overwrite either checkout.
- Isolated branch: `wt/organic-acquisition-20261110-211311`; base origin/main `f8133dbaa87f6d67eadad94ddd2d82617867d396`, whose CI was success at start.
- No push performed. Keep this worktree and its node_modules junction until integration is safe.
- Safe next action: inspect check:fast log/exit, coordinate with the main checkout owner, integrate only this work after main is available, then run committed-tree pre-push gate, push main and inspect CI once. Do not promote production without explicit approval.

## Resume

In `D:\Development\codedestiny-worktrees\organic-acquisition-20261110-211311`, read this document, verify implementation commit `64388836e8d34974719006bc6608bf2d03e12df6`, and inspect the check:fast log before attempting integration. Preserve every other session's dirty tree. Remaining scope: deeper manse/sukuyo journey and fortune/today hub improvements require further evidence; not implemented by this small repair.