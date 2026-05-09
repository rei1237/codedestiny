# Deployment Policy

## Current mode

- Cloudflare Pages deployment mode: manual deploy only.
- GitHub Actions `wrangler pages deploy` is disabled.
- Cloudflare Pages GitHub auto-deploy must be disabled in Cloudflare dashboard.

## Operational rules

1. Do not deploy Cloudflare Pages from GitHub push.
2. Do not run Pages deploy from GitHub Actions.
3. Use a single manual Pages deployment path.
4. Keep Worker deployment separated from Pages deployment.
5. If direct Pages deploy script is used for emergency, always rebuild immediately before deploy.
6. Emergency direct deploy must pass `dist/version.json` commit == current Git HEAD commit.
7. Cache validation must follow [docs/deploy-cache.md](docs/deploy-cache.md) after each production release.

## Required after each deployment

1. Cloudflare Caching -> Purge Everything.
2. Browser DevTools -> Application -> remove Service Workers and Cache Storage.
3. Verify latest version on both domains:
   - pages.dev domain
   - custom production domain
4. Compare `/version.json` fields:
   - `commit`
   - `buildTime`
   - `deploymentMode`

## Manual dashboard settings (must be done in Cloudflare)

1. Open Pages project settings.
2. Disable Git integration auto-deploy triggers for push/PR.
3. Ensure only manual deployment is used for production updates.

## Security notes

- Never commit `.env` files.
- Never expose tokens or secrets in workflow logs.
- Keep API credentials in GitHub/Cloudflare secret stores only.
