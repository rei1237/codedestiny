# Cloudflare OpenNext Deployment

Use this project with OpenNext on Cloudflare Workers.

## Why Previous Builds Failed

- `@opennextjs/cloudflare build` internally runs `build` (`bun run build` in Cloudflare).
- If `build` points to `build:cf`, it recursively calls OpenNext build again and fails.
- The correct split is:
	- `build`: `next build`
	- `build:cf`: `@opennextjs/cloudflare build`

## Why "ASSETS is reserved" Happens

- Cloudflare Pages treats `ASSETS` as a reserved binding name.
- If `wrangler.jsonc` contains a Worker-style `assets.binding: "ASSETS"`, Pages deploy can fail with:
	- `The name 'ASSETS' is reserved in Pages projects.`

## Final File Layout

- `wrangler.jsonc`: unified config for Pages/Workers fallback (`main` + `assets.directory` + `pages_build_output_dir`)
- `wrangler.worker.jsonc`: explicit Worker deploy config (used by worker-target deploy scripts)
- `wrangler.toml`: fallback config for environments that call `wrangler deploy` without `--config`
- `next.config.mjs`: normal Next.js config (no special ASSETS binding)

## Required Scripts

- `build`: `next build`
- `clean:cf`: `node scripts/clean-cloudflare-build.mjs` (removes `.open-next`, `.next`, `dist` before Cloudflare build)
- `build:cf`: `npm run clean:cf && node scripts/build-cloudflare.mjs && node scripts/prepare-cloudflare-dist.mjs`
- `build:cf:static`: compatibility command for Cloudflare Pages Deploy command (`npm run build:cf:static`)
- `deploy:cf:static`: `npm run build:cf && node scripts/deploy-pages.mjs`
- `deploy:cf`: `npm run deploy:cf:pages`
- `deploy:cf:full`: `npm run deploy:cf:pages`
- `deploy:cf:pages`: `npm run build:cf && node scripts/deploy-pages.mjs` (always uses `wrangler pages deploy`)
- `deploy:cf:worker`: force Worker deploy path

`scripts/deploy-cloudflare.mjs` auto-detects Cloudflare Pages CI (`CF_PAGES*`).

- In Cloudflare Pages CI, it skips explicit `wrangler pages deploy` and relies on
	`pages_build_output_dir` auto-publish.
- Outside Pages CI, it uses `wrangler pages deploy` for pages-target manual deploy.

`scripts/deploy-pages.mjs` also has the same CI-safe skip logic, so older deploy commands remain safe.

`scripts/prepare-cloudflare-dist.mjs` guarantees `./dist` exists after Cloudflare build by copying from `.open-next/assets` (or `out` fallback).

## Why "wrangler deploy" Can Fail In Pages CI

- `wrangler deploy` is a Worker command, not a Pages command.
- In Pages CI, Wrangler can enter an interactive confirmation path and fail in non-interactive mode.
- Symptom in logs: deploy stage fails right after Wrangler writes logs, sometimes with a config snippet such as `assets.directory: "./dist"`.

Use one of these instead:

- Preferred: no Deploy command in Pages settings (build only).
- If Deploy command is required: `npm run deploy:cf` (or `npm run deploy:cf:pages`).

## Required Cloudflare Build Settings

- Build command: `npm run build:cf`
- `wrangler.jsonc` provides `pages_build_output_dir: ./dist`, so Pages can publish automatically after a successful build.

If your project is still configured with a Pages Deploy command, this also works:

- Build command: `npm run build`
- Deploy command: `npm run deploy:cf`

For local/manual deployment with explicit build step:

- `npm run deploy:cf:full`

And these files should exist:

- `wrangler.jsonc` with `pages_build_output_dir`
- `wrangler.toml` with same `dist` mapping for CLI fallback
- `scripts/deploy-pages.mjs` for deterministic `project-name` and `branch` resolution
- `scripts/deploy-cloudflare.mjs` for environment-aware command routing
- `scripts/prepare-cloudflare-dist.mjs` for deterministic dist output

## Authentication Error (code 10000)

If logs show `Authentication error [code: 10000]` during deploy command:

- Cause: `wrangler pages deploy` is trying to call Cloudflare API from CI with a token that lacks required Pages permissions.
- Fix in this repo: `scripts/deploy-pages.mjs` auto-detects Cloudflare Pages CI and retries deploy without `CLOUDFLARE_API_TOKEN` first.
- Recommendation: remove unnecessary custom API tokens from Pages build environment unless explicitly required.

## Token Setup (Local Deploy)

For local `npm run deploy:cf` you should use a token instead of interactive OAuth:

1. Copy `.env.cloudflare.example` to `.env.cloudflare`.
2. Set `CLOUDFLARE_API_TOKEN`.
3. Confirm `CF_PAGES_PROJECT_NAME` is your Pages project name.

`scripts/deploy-pages.mjs` loads `.env.cloudflare.local`, `.env.cloudflare`, then `.env`.

### Cloudflare Pages Secrets Sync (Recommended)

To avoid file-based secret usage at runtime, sync secrets into Cloudflare Pages:

- Preview (no write): `npm run secrets:cf:pages:dry`
- Apply (writes secrets): `npm run secrets:cf:pages`

The sync script reads values from:
- `.env.cloudflare.local`
- `.env.cloudflare`
- `.env.local`
- `.env`

and pushes only existing keys using:
- `wrangler pages secret put <KEY> --project-name <CF_PAGES_PROJECT_NAME>`

If token is missing, deploy exits early with a clear error instead of opening OAuth login.

## Required Environment Variables

- `NODE_VERSION=20`
- `NEXT_VERSION=15.0.0`

## Wrangler Version

- Keep `wrangler` at `^4.73.0` or newer tested range to avoid known deploy-command edge bugs in older releases.

## Notes

- `open-next.config.ts` and `wrangler.jsonc` must exist in repo root to avoid interactive prompts in CI.
- `wrangler.jsonc`/`wrangler.toml` must point assets to `./dist`.
- `wrangler.jsonc` (Pages) must not define `assets.binding: "ASSETS"`.
- Use `wrangler.worker.jsonc` for Worker deploy path only.
- Commit a lock file (`package-lock.json`) to improve reproducibility and caching.

## Deployment Checklist

- Reserved names:
	- Do not use `ASSETS` binding in Pages config.
- Compatibility flags:
	- Keep `nodejs_compat` enabled.
	- Keep `compatibility_date` pinned (now `2026-03-14`).
- Commands:
	- Build: `npm run build:cf`
	- If Deploy command is mandatory: `npm run deploy:cf`
	- For local full flow: `npm run deploy:cf:full`
	- Dist sanity: `dist/index.html` must exist after build
- Auth:
	- If using `wrangler pages deploy`, ensure token has Pages write scope.
	- Prefer removing unnecessary custom `CLOUDFLARE_API_TOKEN` in Pages CI.
