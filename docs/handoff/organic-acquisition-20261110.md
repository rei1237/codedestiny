# Organic acquisition repair

status: release-in-progress

## Latest delivery result

- Remote main push completed at `9d8ffd2d8e7cd6029433215802e9ece57b2aa0db` (normal fast-forward, other local checkouts untouched).
- CI is in progress: https://github.com/rei1237/codedestiny/actions/runs/42825305023 . Not polled, per delivery contract. Production dispatch has NOT been executed; one-time authorization remains unused.
- Local related tests: 52 passed; Node broad suite: 4831 passed. Local broad Jest stage still running at last observation, no final success claimed.
- Pre-push: exit 0. Browser 8/8 passed. No production promotion or live verification of these changes.
- GitHub reported 76 dependency alerts (1 critical, 36 high, 31 moderate, 8 low); no exploitability assessment or dependency upgrades in this task.
- Next step: check the CI run once on resumption; if success and remote main still matches approved scope, run `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` once. If CI failed, diagnose before releasing. Do not wait/poll workflows or bypass gates.

## Scope and completed changes

- User requested implementation after a read-only GSC/GA4 organic traffic audit.
- Work directory: `D:\Development\codedestiny-worktrees\organic-acquisition-20261110-211311`.
- Implementation commit: `64388836e8d34974719006bc6608bf2d03e12df6`.
- Ignore referral attribution only for eight exact observed OAuth/payment return hosts, before GA config. Search/social/AI and lookalike domains remain unaffected. No referrer text is added to payloads.
- Preserve all authored landing FAQs instead of truncating at five; visible HTML and FAQ JSON-LD share the list.
- Regenerate static mirrors, cache keys and sitemap lastmod signatures; no route inventory change.
- Existing production-origin guard already blocks production measurement on local/staging hosts; no duplicate implementation added.
- User subsequently approved remaining improvements and one production release. No Google Analytics admin change, live payment, paid LLM call or DB write.
- Follow-up commit `859f4c377`: home free-calculator link goes to /manse/, distinct saju guidance label, direct final shell CTA, sukuyo guide link, today hub choice guidance. No new indexable routes.

## Validation

- Targeted Node tests: 49 passed, 0 failed (organic acquisition, consent, purchase analytics, sukuyo scope).
- verify:analytics-events: passed.
- ESLint for changed React files: passed; check:fast full lint/typecheck stages passed.
- check:pre-push: exit 0, including mirrors/sitemap/entity/repo checks.
- git diff --check: passed.
- check:fast first attempt stopped on sitemap drift after shared template changed; regenerated with npm run sitemap:generate.
- Missing daily package resolved with offline-only npm run fortune:build-data; original failing sky/range tests now pass.
- Current check:fast Node suite: 4831 passed, zero failed. Remaining Jest stage running. Log: `D:\Development\Temp\cline\organic-acquisition-check-complete.log`.
- Local Playwright: 390px and 1280px, /, /manse/, /sukuyo/, /fortune/today/ all pass (200, one H1, canonical, journey links, no horizontal overflow). External requests and /api/ blocked. Existing unrelated home image 404 observed; not changed.
- Full frontend build/CI for this commit has NOT run.

## Delivery blocker

- Original directory `D:\Development\code-destiny` is on `feat/world-cast-page` with extensive unrelated uncommitted work.
- main is checked out at `C:\Users\user\Documents\Codex\worktrees\yeongnyangi-blue-passes-20261024-050530` and contains unrelated uncommitted changes. Do not reset, stash, switch or overwrite either checkout.
- Isolated branch: `wt/organic-acquisition-20261110-211311`; base origin/main `f8133dbaa87f6d67eadad94ddd2d82617867d396`, whose CI was success at start.
- Main local checkout remains dirty and must not be touched. Remote main is still the exact base f8133dbaa; current work is its direct descendant. A normal, non-force `git push origin HEAD:main` from this isolated worktree preserves both dirty local checkouts; no branch ref rewrite/reset is permitted.
- After complete local gates: push remote main, inspect CI once, and release through the existing production workflow only when its checks allow. Never bypass deployment guards. Production authorization is for one dispatch only.

## Resume

In `D:\Development\codedestiny-worktrees\organic-acquisition-20261110-211311`, read this document and verify commits `64388836e8d34974719006bc6608bf2d03e12df6` and `859f4c377`, then inspect the final check:fast log before remote integration. Preserve every other session's dirty tree. Production release authorized in the latest user request; never claim completion before workflow results establish it.