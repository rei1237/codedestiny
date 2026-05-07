# AdSense Audit Report

Date: 2026-05-07
Site: https://code-destiny.com
Scope: Reject-risk audit with locale cleanup follow-up (diagnose -> fix -> validate -> report)

## Executive Summary

Current state is improved, but not fully ready for safest AdSense resubmission.

- Major duplicate-locale index risk was reduced by removing low-quality locale surfaces and keeping only 3 maintained locale hubs.
- Locale SEO signals (hreflang, sitemap locale roots, middleware language map, locale switcher, redirects) were aligned for retained locales.
- Build validation passed.
- Remaining high-impact risks are homepage UX quality/performance and stale legacy locale prefix logic in some runtime helpers.

Decision: CONDITIONAL GO. Submit only after resolving open P1 items below.

## Findings (Prioritized)

| ID | Issue | Rejection Likelihood | Priority | Status | Affected Files | Fix Method |
|---|---|---|---|---|---|---|
| A-01 | Duplicate/low-value multilingual pages (same-language clones) | High | P0 | Fixed | app/de-de/page.js, app/es-es/page.js, app/fr-fr/page.js, app/hi-in/page.js, app/ms-my/page.js, app/nl-nl/page.js, public/de-de/index.html, public/es-es/index.html, public/fr-fr/index.html, public/hi-in/index.html, public/ms-my/index.html, public/nl-nl/index.html | Removed unsupported locale routes/static files; kept only en-us, ja-jp, zh-cn and replaced redirect-only behavior with localized landing content. |
| A-02 | Locale signal mismatch across SEO/router could cause crawl confusion | High | P0 | Fixed | app/layout.js, lib/seo-site-urls.ts, lib/generate-page-metadata.ts, middleware.js, app/components/LocaleSwitcher.tsx, public/_redirects | Reduced locale set to ko/en/ja/zh in metadata, sitemap source, middleware, UI switcher, and redirects; normalized locale root redirects to avoid loops. |
| A-03 | Locale hubs previously looked like thin redirect stubs | Medium | P1 | Fixed | app/_locale/LocaleShellPage.js, app/en-us/page.js, app/ja-jp/page.js, app/zh-cn/page.js | Implemented translated locale hub pages with locale-specific metadata and policy/methodology entry links. |
| A-04 | Hidden stale locale-prefix logic can still generate unsupported locale paths | Medium | P1 | Open | app/_lib/localePath.js, js/core/index-inline-runtime.js, public/js/core/index-inline-runtime.js, lib/i18n-locales.js | Remove legacy locale slugs (hi-in/es-es/fr-fr/de-de/nl-nl/ms-my) from runtime prefix maps or route-generation helpers, or enforce safe fallback to root locale. |
| A-05 | Homepage UX quality/performance risk (desktop severe, mobile borderline) | Medium | P1 | Open | reports/psi-summary.md, reports/psi-mobile.json, reports/psi-desktop.json, index.html, js/core/index-inline-runtime.js | Reduce JS main-thread cost, remove layout-shift triggers, reduce unused CSS/JS, and stabilize hero/section rendering order. |
| A-06 | Accessibility debt on homepage interactive labels/ARIA (policy risk for quality review) | Medium | P1 | Open | reports/psi-mobile.json, reports/psi-desktop.json, index.html, js/core/index-inline-runtime.js | Fix aria-label vs visible-name mismatches, invalid ARIA role usage, dialog labeling, and contrast issues on key cards. |
| A-07 | Policy/trust pages existence and discoverability | Low | P2 | Passed | app/about/page.js, app/methodology/page.js, app/faq/page.js, app/privacy-policy/page.js, app/terms-of-service/page.js, app/layout.js, app/robots.ts | Keep policy pages linked from header/footer and locale hubs; keep crawlability and sitemap/robots references stable. |
| A-08 | Static export caveat for middleware/API behavior parity | Low | P2 | Monitor | next.config.mjs, middleware.js, public/_redirects | Keep explicit redirect/proxy rules and avoid relying on server runtime-only assumptions in exported build. |

## Validation Evidence

- Build: success (static pages generated).
- Locale retention confirmed: en-us, ja-jp, zh-cn only in main SEO and routing touchpoints.
- Redirect normalization confirmed in public/_redirects for retained locale roots.
- PSI snapshot indicates remaining P1 quality/performance gaps:
  - Mobile: LCP 3001ms, FCP 2101ms.
  - Desktop: Performance 27, TBT 5861ms, CLS 1.293.

## What Was Completed in This Pass

1. Removed unsupported locale app routes and static locale duplicates.
2. Added translated locale hub pages for en-us, ja-jp, zh-cn.
3. Synced hreflang/OG alternates/sitemap source/middleware/locale switcher/redirect rules.
4. Verified build health after modifications.

## Required Before AdSense Resubmission (Blocking Checklist)

1. Resolve A-04 stale runtime locale-prefix logic to prevent accidental unsupported locale URLs.
2. Resolve A-05 desktop performance + CLS/TBT regression on homepage.
3. Resolve A-06 core accessibility errors on homepage interactive elements.
4. Re-run PSI and keep evidence files in reports/ with improved metrics.

## Resubmission Recommendation

- Recommended after P1 blockers are resolved and revalidated.
- If immediate submission is required, risk is lower than before locale cleanup, but still moderate due to quality/performance/accessibility flags.
