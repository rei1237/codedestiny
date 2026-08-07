# Deployment Policy

The full contract lives in [docs/DEPLOYMENT_AND_INFRA.md](docs/DEPLOYMENT_AND_INFRA.md). This file records the two settings that must hold on the Cloudflare side, because they cannot be enforced from the repository.

An earlier version of this file claimed "GitHub Actions `wrangler pages deploy` is disabled" and "Do not run Pages deploy from GitHub Actions". That was wrong for a long time — GitHub Actions was in fact the deploy authority. What is actually disabled is Cloudflare's **Git integration** auto-deploy.

## Current mode

- Production is reached by `npm run deploy:production` from a developer machine, or by dispatching the **Release Cloudflare Pages and Worker** workflow with `mode: production`. Nothing deploys on push.
- Cloudflare Pages **Git integration** auto-deploy is off, for production and preview alike. Previews are created by `wrangler pages deploy --branch safe-preview-<sha>`, never by Cloudflare's Git trigger.
- Cloudflare **Workers Builds** Git trigger is disconnected for `code-destiny-web` for the same reason.

Both are enforced from the repo: `scripts/ensure-pages-single-deploy.mjs` (and `pages-config-guard.yml`) fail when `deployments_enabled`, `production_deployments_enabled`, or `preview_deployment_setting` drift; `scripts/verify-worker-single-deploy-guard.mjs` fails when a `Workers Builds:` check reappears or a second Worker deploy path is added.

If both were left on, the same commit would deploy twice with different chunk hashes — the cause of the 2026-07 blank-page incident.

## Manual dashboard settings (must be done in Cloudflare)

1. Pages project settings → disable Git integration auto-deploy for push and PR.
2. Workers → `code-destiny-web` → disconnect the Git integration.
3. Caching → Cache Rules → `URI Path starts with /_next/static/` → `Edge TTL: by status code → 404: Bypass cache`. Without this, a transient 404 during a deploy cutover is cached for two days and a rollback does not fix it (identical content hashes to the same URL). The repository API tokens have no Zone permission, so this cannot be scripted.

## After a production deploy

`deploy:production` already runs the checks below; this list is for a manual verification pass.

1. Compare `/version.json` and `/api/version` — `commit` must match on both, or Pages and Worker are running different code.
2. `npm run verify:deployed-assets` — referenced `_next/static` assets must all return 200.
3. Distinguish an edge-cached 404 from a missing file with `curl <url>` versus `curl <url>?cdcb=1`. Different results mean cache poisoning, not a bad build.

## Security notes

- Never commit `.env` files.
- Never expose tokens or secrets in workflow logs.
- Keep API credentials in GitHub/Cloudflare secret stores only.
