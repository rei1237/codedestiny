# Entry Commonization Phase 1 (2026-03-28)

## Goal

- Reduce duplicated inline bootstrap blocks across locale entry pages.
- Keep runtime behavior identical while moving reusable snippets to external assets.

## Applied Scope

- Pages:
  - public/static/index.html
  - public/de-de/index.html
  - public/en-us/index.html
  - public/es-es/index.html
  - public/fr-fr/index.html
  - public/hi-in/index.html
  - public/ja-jp/index.html
  - public/ms-my/index.html
  - public/nl-nl/index.html
  - public/zh-cn/index.html
  - public/fortune/index.html

## Externalized Blocks

1. Luck-Sync placeholder style
- Before: inline <style id="lsd-styles-placeholder"> block in each page.
- After: shared stylesheet reference /styles/luck-sync-placeholder.css

2. Mobile safe render bootstrap script
- Before: inline IIFE in body (mobile-safe-render/mobile-gpu-lite setup).
- After: shared script reference /js/inline/mobile-safe-render-init.js

## Safety Notes

- No action names or event handlers were renamed.
- No fortune/saju algorithm, API, payment, or result schema code was modified.
- Script execution timing preserved with defer.
- For HTML text safety, prefer apply_patch or file copy sync from canonical source; avoid bulk shell rewrite for multilingual pages.

## Safety Runbook (Encoding)

1. Run `npm run verify:entry-encoding` after any entry HTML edits.
2. `build:cf` now includes `verify:entry-encoding` and fails fast on encoding anomalies.
3. If corruption is detected, restore from known clean canonical file/commit first, then reapply minimal patch.

## Phase 2 Candidate

- Move remaining inline bootstrap scripts (except SEO structured data) into /js/inline/*.js.
- Introduce a single shared entry include fragment generation step for locale HTML.
- Add CI check that fails when prohibited inline script/style patterns are reintroduced.
