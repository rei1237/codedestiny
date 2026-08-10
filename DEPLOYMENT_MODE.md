# Deployment Policy

The full contract lives in [docs/DEPLOYMENT_AND_INFRA.md](docs/DEPLOYMENT_AND_INFRA.md). This file records the two settings that must hold on the Cloudflare side, because they cannot be enforced from the repository.

An earlier version of this file claimed "GitHub Actions `wrangler pages deploy` is disabled" and "Do not run Pages deploy from GitHub Actions". That was wrong for a long time — GitHub Actions was in fact the deploy authority. What is actually disabled is Cloudflare's **Git integration** auto-deploy.

## Current mode

- Production is reached by `npm run deploy:production` from a developer machine, or by dispatching the **Release Cloudflare Pages and Worker** workflow with `mode: production`. Nothing deploys on push.
- Cloudflare Pages **Git integration** auto-deploy is off, for production and preview alike. Previews are created by `wrangler pages deploy --branch preview-<branch>-<sha>`, never by Cloudflare's Git trigger.
- Cloudflare **Workers Builds** Git trigger is disconnected for `code-destiny-web` for the same reason.

Both are enforced from the repo: `scripts/ensure-pages-single-deploy.mjs` (and `pages-config-guard.yml`) fail when `deployments_enabled`, `production_deployments_enabled`, or `preview_deployment_setting` drift; `scripts/verify-worker-single-deploy-guard.mjs` fails when a `Workers Builds:` check reappears or a second Worker deploy path is added.

If both were left on, the same commit would deploy twice with different chunk hashes — the cause of the 2026-07 blank-page incident.

## Manual dashboard settings (must be done in Cloudflare)

1. Pages project settings → disable Git integration auto-deploy for push and PR.
2. Workers → `code-destiny-web` → disconnect the Git integration.
3. Caching → Cache Rules → `URI Path starts with /_next/static/` → `Edge TTL: by status code → 404: **No store**`. Without this, a transient 404 during a deploy cutover is cached for two days and a rollback does not fix it (identical content hashes to the same URL).

   🔴 **"No store" is not "Bypass cache".** They are different controls. `Bypass cache` is the cache *eligibility* setting (`cache: false`) — it makes every matching response uncacheable, including the 200s, so content-hashed immutable assets would go to the origin on every request. What we want applies to the 404 alone, which is the per-status-code Edge TTL. In the API that is `edge_ttl.status_code_ttl: [{ "status_code": 404, "value": -1 }]`, where **`-1` = no-store and `0` = no-cache**. A positive value caches the 404 for that many seconds — on 2026-08-08 this rule held `31536000` (one year), so a rule named `next-static-404-no-store` was pinning 404s for a year and failing releases back to back.

   `CLOUDFLARE_PURGE_TOKEN` carries Zone/Cache Rules permission as of 2026-08-08, so this rule can now be scripted.

## After a production deploy

`deploy:production` already runs the checks below; this list is for a manual verification pass.

1. Compare `/version.json` and `/api/version` — `commit` must match on both, or Pages and Worker are running different code.
2. `npm run verify:deployed-assets` — referenced `_next/static` assets must all return 200.
3. Distinguish an edge-cached 404 from a missing file with `curl <url>` versus `curl <url>?cdcb=1`. Different results mean cache poisoning, not a bad build.

## Security notes

- Never commit `.env` files.
- Never expose tokens or secrets in workflow logs.
- Keep API credentials in GitHub/Cloudflare secret stores only.
