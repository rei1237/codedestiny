# R2 Assets Cache Strategy

## Scope

- Public domain: `https://assets.code-destiny.com`
- R2 bucket: `codedestinyassets`
- R2 object prefix: `assets/`
- Client env: `NEXT_PUBLIC_ASSETS_BASE_URL=https://assets.code-destiny.com`
- Music assets stay on `https://music.code-destiny.com`.
- Do not place R2 account id, access key, or secret key in client code.

## Phase 0 Priority

Move only assets with clear cache value first.

1. Above-the-fold images that are actually rendered on first view.
2. Common images reused across multiple pages.
3. Large background images that are stable.
4. Stable character, card, or sprite images loaded only inside their feature route or modal.

Keep these local until reviewed.

1. Rare feature images.
2. Event or promo images likely to be overwritten.
3. Root metadata assets, favicon, apple touch icon, and manifest icons.
4. Tiny icons that would increase request count.
5. Music files and music album covers.

## Cloudflare Cache Rule Checklist

Rule target:

- Hostname equals `assets.code-destiny.com`
- URI Path starts with `/assets/`

Cache behavior:

- Cache eligibility: eligible for cache, or Cache Everything.
- Edge TTL:
  - Versioned or hash filenames: 1 month to 1 year.
  - Existing overwrite-prone filenames: 1 day to 7 days.
- Browser TTL:
  - Stable assets: 30 days.
  - Normal assets: 1 day to 7 days.
  - Change-prone assets: 1 day.
- Query string:
  - Prefer version or hash filenames.
  - If query versions remain, do not ignore query string until the replacement strategy is confirmed.
- Do not bypass cache for the assets hostname.
- Document purge steps for development and emergency rollback.

Recommended R2 object metadata:

```text
Cache-Control: public, max-age=31536000, immutable
```

Use for versioned or hash filenames.

```text
Cache-Control: public, max-age=604800
```

Use for normal stable filenames.

```text
Cache-Control: public, max-age=86400
```

Use for images that may change.

## Loading Rules

- Do not preload all R2 images.
- Generate an R2 URL only when the component renders the image.
- Use `loading="lazy"` for non-first-view images.
- Use Next Image `priority` only for true first-view critical images.
- Load sprites only when their modal or feature is opened.
- Do not render hidden-tab image batches with `display:none`.
- Prefer route-level rendering, dynamic import, or IntersectionObserver for heavy feature images.

## Phase 1 Pilot Assets

Pilot images:

- `/fuctionassets/%EB%8F%88%EB%8F%85%EC%98%A4%EB%A5%B8%20%EC%97%B0%EC%9D%B4.webp?v=20260612-clean-cut`
- R2 URL shape: `https://assets.code-destiny.com/assets/fuctionassets/%EB%8F%88%EB%8F%85%EC%98%A4%EB%A5%B8%20%EC%97%B0%EC%9D%B4.webp?v=20260612-clean-cut`
- Reason: payment loading sprite, stable, 214.4 KB, should load only while payment UI is open.

- `/fuctionassets/naming.webp`
- R2 URL shape: `https://assets.code-destiny.com/assets/fuctionassets/naming.webp`
- Reason: stable premium naming card image, 184.0 KB, already lazy-loaded.

- `/fuctionassets/love code.webp`
- R2 URL shape: `https://assets.code-destiny.com/assets/fuctionassets/love%20code.webp`
- Reason: route-level love code background, 131.1 KB, loaded only on the love code gate route.

Validation:

1. Open a page that includes the payment provider.
2. Confirm the sprite is not requested before the payment loading UI opens.
3. Open the payment loading UI.
4. Confirm a request to `assets.code-destiny.com/assets/...` appears.
5. Reload and repeat; confirm memory, disk, or Cloudflare edge cache is used.
6. Check Cloudflare R2 Metrics for Class B operation changes after traffic settles.

## Phase 2 Medium-Scope Service Registry Assets

Converted repeated service-card image strings in `app/_lib/serviceFeatureRegistry.ts`.
This changes URL generation only; it does not preload hidden images.

- `/fuctionassets/saju.webp`
- `/fuctionassets/jami.webp`
- `/fuctionassets/sukyo.webp`
- `/fuctionassets/veda.webp`
- `/fuctionassets/jumsung.webp`
- `/fuctionassets/%EC%B5%9C%EC%95%A0%EC%9A%B4%EB%AA%85.webp`
- `/fuctionassets/love code.webp`
- `/fuctionassets/lifebook.webp`

Hold for later review:

- Default logo and PWA/root metadata images.
- Rare feature images used by a single route.
- CSS background images and loader/srcset maps.

## Monitoring

Compare before and after:

- Total image requests on first view.
- Requests to `assets.code-destiny.com`.
- R2 Class B operations.
- Cloudflare cache HIT ratio for `assets.code-destiny.com`.
- LCP and image load timing for first-view pages.

## Rollback

- Leave `NEXT_PUBLIC_ASSETS_BASE_URL` empty to fall back to local public paths.
- Revert each feature-level conversion independently.
- Prefer versioned object names for future replacements instead of overwriting existing object names.
