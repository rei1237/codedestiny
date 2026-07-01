# Mobile Performance Audit

Work date: 2026-07-01; latest pass: 2026-07-02

Scope: route-level mobile performance audit and minimum source changes for Code Destiny. Payment policy, unlock policy, login/signup logic, fortune result generation, and paid-access order were not changed.

## Project Structure

- Framework: Next.js 15 App Router, React 18, static export, root static shell `index.html`.
- Runtime/API: worker-native routes under `worker/routes/**`; Next API/proxy files under `app/api/**`.
- Main shell: first viewport and legacy modal flows are sourced from root `index.html`; generated mirrors live under `public/**`.
- React routes: `app/**/page.tsx|page.js` plus route client shells.
- Global client wrappers: `app/layout.js` mounts `PaymentProcessingProvider`, `NavigationProvider`, `RuntimeClientGuards`, `ToastProvider`, and `AppChrome`.
- Asset hosts: `https://assets.code-destiny.com` for R2 images/fonts, `https://music.code-destiny.com` for music images/audio.
- Heavy static files found during audit:
  - `js/saju-engine.js`: about 2.0 MB.
  - `js/saju-engine-tarot-sukuyo-quantum.js`: about 1.2 MB.
  - `styles/fortune-ui.css`: about 571 KB.
  - `index.html`: about 1.4 MB.
  - `js/core/index-inline-runtime.js`: about 355 KB.
  - `app/music/_data/musicLyrics.ts`: about 284 KB.
- Animation stack: `framer-motion`, route CSS filters, sprite frame timers, and audio playback controls appear in several premium/fortune routes.
- Payment/modal stack: static paid gates in `index.html` and `js/core/index-inline-runtime.js`; React billing modal in `app/_lib/billing-client.ts`.

## Highest-Impact Bottlenecks

1. Root `index.html` loaded `js/dream-ledger.js` for every visitor even though dream modal code already has an on-demand script loader.
2. `/music` loaded the 284 KB lyrics data module before the user opened lyrics.
3. `/fortune-tea-house` warmed hidden sprite frames eagerly and could attempt BGM playback from the first pointer/key interaction.
4. `/neo-operation-room`, `/neo-operation-room/result`, `/premium-unlock`, and `/karma-destiny-ai/result` directly imported heavy client pages from route entry files.
5. Mobile filters, blur, backdrop-filter, and large aura effects were active in `/sukuyo-compatibility-ai`.
6. Build/export post-processing had two race-prone file reads that made repeated verification unstable after route-splitting.
7. `/stories/[storyId]/[chapterId]` loaded the reader settings drawer code before the reader opened settings and updated reader chrome/progress directly on every scroll event.
8. FeatureLandingPage routes carried non-Korean slug tag copy in the shared route chunk, mounted the heavy share widget shortly after entry, and failed route-key lookup on trailing-slash static export URLs.
9. `AppChrome` synchronously imported the full footer link hub and social footer into the global layout chunk even though the footer sits below route content.
10. FeatureLandingPage still pulled a large SVG icon switch, `next/link`, and the full loading message locale bundle into static landing routes even though the route only needs local emoji icons, a normal `/insights` anchor, and lightweight locale detection.

## Applied Changes

- `index.html`
  - Changed `dream-ledger.js` from always-deferred script to a lazy feature script marker.
  - Marker: `<script data-cd-lazy-src="/js/dream-ledger.js?v=build-d4af050ba922" data-cd-mobile-delay="2" data-cd-lowend-skip="1"></script>`
- `app/music/MusicPlayerExample.tsx`
  - Lyrics data is imported only after the lyrics panel is open.
  - Neighbor lyrics warmup is also gated by the open panel state.
  - Music access checks now query the initial/current track window first and defer the full-track refresh until after the first mobile render has settled.
  - Selecting a locked preview track triggers an immediate per-track access refresh without blocking the tap response.
- `app/music/MusicPlaylistPanel.tsx`
  - Playlist rendering starts with 10 tracks and adds the next 10 by user action instead of mounting all 89 cards at once.
- `app/music/moon-music-player.module.css`
  - Mobile disables the decorative cover blur, moonbeam, star, and banner glow layers.
  - Adds the playlist "show more" control style.
- `app/components/FeatureLandingPage.tsx`
  - Mobile and reduced-motion media now remove decorative orb/particle/petal blur layers from paint.
  - Mobile and reduced-motion media also remove the hero icon drop-shadow filter and reduce the OG image wrapper shadow.
  - Non-Korean slug tag fallback copy is loaded only when a non-Korean locale needs it.
  - Share widget import is gated by viewport intersection instead of a fixed 1.2 s timer.
  - Trailing-slash static export paths are normalized before route config, CTA action, and paid metadata lookup.
  - Removed `DestinyIcon`, `next/link`, and full loading-message locale imports from the landing chunk; local emoji rendering and a small locale resolver now cover the route needs.
  - Kept pricing/payment policy, auth, unlock, and OG image loading behavior unchanged.
- `app/components/FeatureLandingPage.slugTags.ts`
  - Holds the non-Korean slug tag fallback map behind a lazy chunk.
- `app/components/AppChrome.tsx`
  - Moved `SiteFooterHub` behind a dynamic import.
  - Footer chunk mounts only when its sentinel approaches the viewport; chromeless routes still omit header, disclaimer, and footer.
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`
  - BGM default is off.
  - Removed global first pointer/key BGM unlock path.
- `app/fortune-tea-house/FortuneTeaHouseClient.tsx`
  - Uses a tiny route fallback CSS module instead of importing the full fortune tea-house feature stylesheet into the route entry.
- `app/fortune-tea-house/fortune-tea-house-route.module.css`
  - Adds the lightweight full-screen loading shell styles for the route-level lazy boundary.
- `src/features/fortune-tea-house/components/TalkingPigYeoni.tsx`
  - Hidden sprite frame warmup is idle-only.
  - Save-Data, slow network, low memory, and low core-count devices skip warmup.
- `app/neo-operation-room/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/neo-operation-room/NeoOperationRoomClient.tsx`
  - Added lazy shell for `NeoOperationRoomPage`.
- `src/features/neo-war-room/NeoOperationRoomPage.tsx`
  - BGM default is off; saved on-state and explicit toggle still work.
  - Page-level prologue, typing, method intro, operation map, and loading sprite intervals pause while `document.hidden`.
- `src/features/neo-war-room/components/NeoSpriteActor.tsx`
  - Talk-frame interval pauses while `document.hidden`.
- `app/neo-operation-room/result/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/neo-operation-room/result/NeoOperationRoomResultClient.tsx`
  - Added lazy shell for result page.
- `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`
  - Retry/back links to `/neo-operation-room` use `prefetch={false}`.
- `app/premium-unlock/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/premium-unlock/PremiumUnlockClient.tsx`
  - Added lazy shell for premium sales content.
- `app/premium-unlock/PremiumSalesContent.tsx`
  - CTA starts the payment flow immediately on click and defers navigation to the next tick.
  - Fixed TypeScript narrowing in markdown chapter splitting.
- `app/_lib/billing-client.ts`
  - Mobile payment modal CSS reduces backdrop blur and heavy shadow cost.
- `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.module.css`
  - Mobile media query disables or weakens heavy backdrop filters, SVG filters, glow, and shadows.
- `app/karma-destiny-ai/result/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`
  - Moved original full client result page behind the lazy shell.
- `app/astrology-ai/result/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/astrology-ai/result/AstrologyAiResultClient.tsx`
  - Moved original full client result page behind the lazy shell.
- `app/life-book-ai/result/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/life-book-ai/result/LifeBookAiResultClient.tsx`
  - Moved original full client result page behind the lazy shell.
- `app/love-secret-ai/result/page.tsx`
  - Route entry now uses a small lazy client shell.
- `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`
  - Moved original full client result page behind the lazy shell.
- `app/saju/destiny-bias/stage/page.tsx`
  - Moved the 38 ms progress interval into a small child component and slowed it to 140 ms.
  - Pauses progress updates while the tab is hidden.
  - Mobile media query hides ray effects, disables several repeated card/ring/feature animations, removes panel backdrop blur, and uses `100dvh`.
  - Moved the stage keyframes and mobile motion rules out of the client JS entry into a CSS module.
- `app/saju/destiny-bias/stage/stage.module.css`
  - Holds the stage animation keyframes, mobile motion reductions, and reduced-motion rules as CSS instead of inline JS text.
- `app/fortune-tea-house/tarot-debug/page.tsx`
  - Keeps metadata on the server page while rendering a small lazy client shell.
- `app/fortune-tea-house/tarot-debug/TarotDebugRouteClient.tsx`
  - Moves the tarot atlas debug UI behind a client-side lazy import.
- `app/fortune-tea-house/tea-cup-debug/page.tsx`
  - Keeps metadata on the server page while rendering a small lazy client shell.
- `app/fortune-tea-house/tea-cup-debug/TeaCupDebugRouteClient.tsx`
  - Moves the tea-cup sprite/debug UI behind a client-side lazy import.
- `app/fortune-tea-house/ten-god-debug/page.tsx`
  - Keeps metadata on the server page while rendering a small lazy client shell.
- `app/fortune-tea-house/ten-god-debug/TenGodDebugRouteClient.tsx`
  - Moves the ten-god symbol map UI behind a client-side lazy import.
- `src/features/fortune-tea-house/components/TeaCupDebugPage.tsx`
  - Adds lazy/async debug asset images with an in-tone fallback when a source fails.
  - Clips mobile horizontal overflow from the debug surface.
- `app/stories/page.tsx`
  - Uses a tiny route-shell CSS module instead of importing the full story presentation stylesheet at the route entry.
- `app/stories/[storyId]/[chapterId]/loading.tsx`
  - Uses the tiny route-shell CSS module for the loading fallback instead of the full story presentation stylesheet.
- `app/stories/stories-route.module.css`
  - Adds the lightweight story route shell and chapter loading fallback styles.
- `components/stories/StoriesIndex.tsx`
  - Uses a story-index-only CSS module instead of the full story presentation stylesheet.
  - Reduces decorative star nodes from 55 to 34.
- `components/stories/storiesIndex.module.css`
  - Adds the SSR-safe index styles needed by `/stories` without detail/reader-only styles.
- `app/stories/[storyId]/page.tsx`
  - Uses a story-detail-only CSS module instead of the full story presentation stylesheet.
- `app/stories/[storyId]/story-detail.module.css`
  - Adds the SSR-safe detail page styles needed by `/stories/[storyId]`.
- `components/stories/ChapterList.tsx`
  - Uses a chapter-list-only CSS module instead of the shared story card CSS module.
- `components/stories/chapterList.module.css`
  - Adds the chapter list and progress panel styles needed by detail pages only.
- `components/stories/ChapterViewer.tsx`
  - Keeps the chapter body in the initial render while loading the settings drawer only after the settings button is tapped.
  - Shows a lightweight drawer shell immediately during the settings panel import.
  - Throttles reader scroll chrome/progress updates to one `requestAnimationFrame` pass and skips unchanged state writes.
- `components/stories/ViewerSettingsPanel.tsx`
  - Exports its props type for the lazy settings panel boundary.
- `components/stories/viewer.module.css`
  - Mobile reader mode disables the starlight background animation and fixed nav backdrop blur.
- `scripts/next-manifest-read-guard.cjs`
  - Added a narrow guard for export-promotion `404.html`/`500.html` rename races when the target file already exists.
  - Added a narrow wait for app route `webpack-runtime.js` during static generation.
  - Added a narrow public-to-`out` copyfile guard for Next export ENOENT races when the target exists or the destination parent needs one retry.
- `scripts/verify-adsense-readiness.mjs`
  - Skips generated paid-route HTML files that disappear during postbuild/export instead of failing the build verification race.
- `scripts/sync-legacy-static-to-public.mjs`
  - Preserves the mobile interaction patch fixed cache key when regenerating public mirrors.
- `scripts/prepare-cloudflare-dist.mjs`
  - Restores generated app route HTML from `.next/server/app` when `out` is sparse.
- `scripts/promote-static-shell-to-root.mjs`
  - Restores generated app route HTML from `.next/server/app` after public assets are merged.

## Route: /

### Found Issues
- Root static shell is very large.
- `styles/fortune-ui.css` is a large render-blocking stylesheet.
- `js/dream-ledger.js` was loaded for all users even though the dream modal has an on-demand action loader.

### Source Files
- `index.html`
- `js/core/index-inline-runtime.js`
- `js/noncritical-defer-loader.js`
- `js/cd-lazy-feature-loader.js`

### Fix Direction
- Applied: move `dream-ledger.js` to lazy feature loading.
- Deferred: split `fortune-ui.css` after visual regression coverage.

### Risk
- Low. `openDreamModal` already calls `__cdLoadScriptOnce('/js/dream-ledger.js?...')`.

### Verification
- Mobile shell loads without an initial `dream-ledger.js` request.
- Dream modal remains reachable through the lazy loader.

## Route: /saju

### Found Issues
- Saju engines are large, but the current shell already lazy-loads them for saju/tarot/compat actions.
- `destiny-profile.js` is still globally deferred for profile cards.

### Source Files
- `index.html`
- `js/core/index-inline-runtime.js`
- `js/saju-engine.js`
- `js/saju-engine-tarot-sukuyo-quantum.js`
- `js/destiny-profile.js`

### Fix Direction
- No logic change in this pass.
- Later: split profile boot into first-viewport card state and full profile manager.

### Risk
- High for engine-loading changes because pricing, unlock, and result flows share the static shell actions.

### Verification
- Main fortune card creation, saju result, tarot result, and compatibility flow.

## Route: /saju/destiny-bias/stage

### Found Issues
- Build artifact evidence showed the route entry among the largest public page entries at `16.78 kB`.
- `app/saju/destiny-bias/stage/page.tsx` was a full `use client` loading page.
- The parent component ran `setInterval(..., 38)` and updated `progress` state, causing the whole animated stage screen to re-render about 26 times per second.
- Mobile still ran wide ray effects, card/ring/feature infinite animations, backdrop blur, large shadow layers, and `min-h-screen`.
- Later manifest evidence showed the route entry at `17,966 B`; the remaining inline `style jsx global` block kept long keyframe/CSS text in the JS route entry.

### Source Files
- `app/saju/destiny-bias/stage/page.tsx`
- `app/saju/destiny-bias/stage/stage.module.css`

### Fix Direction
- Applied: moved progress state into `StageProgressMeter`, slowed updates to 140 ms, and skips updates while `document.hidden`.
- Applied: mobile media query hides ray effects, disables heavier repeated card/ring/feature/title animations, removes panel backdrop blur, and keeps lighter pulse/star motion.
- Applied: replaced `min-h-screen` with `min-h-[100dvh]`.
- Applied: moved keyframes and mobile animation rules from inline `style jsx global` into `stage.module.css`.

### Risk
- Low. The route is a visual loading/stage page; payment, unlock, and saju result calculation paths were not changed.

### Verification
- Build route table now shows `/saju/destiny-bias/stage` at `5.62 kB / 114 kB First Load JS`.
- Manifest evidence after CSS extraction: route entry chunk changed from `17,966 B` to `.next/static/chunks/app/saju/destiny-bias/stage/page-ab8f805991a2f377.js` at `16,047 B`; stage CSS moved to `.next/static/css/b90fee15b53f546e.css` at `4,372 B`.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: h1 `최애운명` visible, progress text updating, horizontal overflow `false`, broken image count `0`, audio elements `0`.
- Mobile computed style checks: ray display `none`, panel backdrop filter `none`, stage CSS link present.

## Route: /fortune-tea-house

### Found Issues
- BGM had `preload="none"` but the default state was enabled.
- Hidden `talkingPigYeoniFrames` rendered with eager loading.
- Route uses `framer-motion` plus blur/drop-shadow effects.
- `/fortune-tea-house/tarot-debug` directly imported `TarotDebugPage`, which put tarot atlas sheets, crop map data, and `TarotAssetCard` in the route entry.
- `/fortune-tea-house/tea-cup-debug` directly imported `TeaCupDebugPage`, which put tea-cup asset candidates, sprite map data, and `TeaCupVisual` in the route entry.
- `/fortune-tea-house/ten-god-debug` directly imported `TenGodDebugPage`, so the 388 KB tea-house feature CSS and ten-god symbol UI loaded as route-initial work.
- `/fortune-tea-house/tea-cup-debug` surfaced a 360px horizontal overflow and a broken debug asset when the R2 `nobackground/선택 UI-Photoroom.png` request failed in Chromium.
- R2 image headers checked: `DestinyCafe/nobackground/선택 UI-Photoroom.png` is `1,603,804 B`, `200 image/png`, but has no `Cache-Control`; `DestinyCafe/선택 UI.webp` is `138,090 B`, `200 image/webp`, also no `Cache-Control`.
- Latest manifest evidence showed `/fortune-tea-house/page` carrying the full feature CSS chunk `.next/static/css/2644ef9d597bfd0c.css` at `388,274 B`.
- Source evidence: `src/features/fortune-tea-house/styles/fortune-tea-house.module.css` is `371,044 B` and `15,840` lines; `app/fortune-tea-house/FortuneTeaHouseClient.tsx` imported it only for the route Suspense fallback.

### Source Files
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`
- `src/features/fortune-tea-house/components/TalkingPigYeoni.tsx`
- `src/features/fortune-tea-house/styles/fortune-tea-house.module.css`
- `app/fortune-tea-house/page.tsx`
- `app/fortune-tea-house/FortuneTeaHouseClient.tsx`
- `app/fortune-tea-house/fortune-tea-house-route.module.css`
- `app/fortune-tea-house/tarot-debug/page.tsx`
- `app/fortune-tea-house/tarot-debug/TarotDebugRouteClient.tsx`
- `app/fortune-tea-house/tea-cup-debug/page.tsx`
- `app/fortune-tea-house/tea-cup-debug/TeaCupDebugRouteClient.tsx`
- `app/fortune-tea-house/ten-god-debug/page.tsx`
- `app/fortune-tea-house/ten-god-debug/TenGodDebugRouteClient.tsx`
- `src/features/fortune-tea-house/components/TeaCupDebugPage.tsx`

### Fix Direction
- Applied: BGM is off by default and no longer starts on a global first interaction.
- Applied: hidden sprite frames warm only during idle and are skipped on constrained devices.
- Applied: `/fortune-tea-house/tarot-debug` now loads the debug UI through a small lazy route shell.
- Applied: `/fortune-tea-house/tea-cup-debug` now loads the debug UI through a small lazy route shell.
- Applied: `/fortune-tea-house/ten-god-debug` now loads the ten-god symbol map through a small lazy route shell.
- Applied: tea-cup debug asset images use lazy/async loading and render a local fallback instead of a broken image.
- Applied: tea-cup debug page clips mobile horizontal overflow.
- Applied: route fallback styles moved to a small local CSS module so the 388 KB tea-house feature CSS is not linked as initial route CSS.
- Later: add long-term R2 `Cache-Control` for static image/font assets and consider replacing the unconnected 1.6 MB PNG preview candidate with the existing mobile webp when that preview is re-enabled.
- Later: reduce mobile blur/filter in the route CSS module.

### Risk
- Low. Character visuals remain; only preloading and default audio behavior changed.

### Verification
- Mobile entry has no audio request before explicit BGM action.
- Talking pig renders current frame without broken images.
- Tarot album still opens and card images lazy-load.
- `/fortune-tea-house` build route table: `636 B / 105 kB First Load JS`.
- Manifest evidence after route fallback CSS split: `/fortune-tea-house/page` initial CSS changed from `.next/static/css/2644ef9d597bfd0c.css` at `388,274 B` to `.next/static/css/4d3bec3f35aa9f1a.css` at `842 B`; route entry JS is `.next/static/chunks/app/fortune-tea-house/page-741665b7b6272a88.js` at `1,166 B`.
- Static HTML evidence: `dist/fortune-tea-house/index.html` links `4d3bec3f35aa9f1a.css` in the initial stylesheet list and does not link `2644ef9d597bfd0c.css` before hydration.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: h1 `운명의 찻집` visible after hydration, horizontal overflow `false`, broken image count `0`, audio preload `none`, audio requests `0`, failed responses `0`.
- `/fortune-tea-house/tarot-debug` manifest evidence: route entry chunk changed from `.next/static/chunks/app/fortune-tea-house/tarot-debug/page-59d6387dfc48e21f.js` at `15,351 B` to `page-66af924ef3251189.js` at `968 B`; atlas/debug symbols moved to lazy chunks.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: HTTP 200, no horizontal overflow, broken image count `0`, audio requests `0`, audio elements `0`, lazy fallback no longer visible after hydration.
- `/fortune-tea-house/tea-cup-debug` manifest evidence: route entry chunk changed from `.next/static/chunks/app/fortune-tea-house/tea-cup-debug/page-9c7e38ef05cfd9c5.js` at `16,960 B` to `page-ac462a7f3fb1aea0.js` at `958 B`; tea-cup debug symbols moved to lazy chunks.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: route loaded to `Tea Cup Sprite Map`, horizontal overflow `false`, broken DOM image count `0`, audio requests/elements `0`.
- `/fortune-tea-house/ten-god-debug` build route table changed from `16.2 kB / 121 kB First Load JS` to `661 B / 105 kB First Load JS`.
- Manifest evidence after lazy shell: route entry is `.next/static/chunks/app/fortune-tea-house/ten-god-debug/page-ad499ec555dc0717.js` at `943 B` and no route-initial CSS file is attached.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: initial fallback visible, h1 `Ten Gods Symbol Map` visible after hydration, horizontal overflow `false`, broken image count `0`, audio requests/elements `0`, failed responses `0`.
- The latest smoke records local Chromium failures for `https://assets.code-destiny.com/DestinyCafe/nobackground/선택 UI-Photoroom.png` and `https://assets.code-destiny.com/Mulmaru.woff2` at 390px/430px; the debug page now shows a controlled fallback instead of a broken image.

## Route: /neo-operation-room

### Found Issues
- Build evidence showed route entry at `55.2 kB`, `172 kB First Load JS`.
- `app/neo-operation-room/page.tsx` directly imported the 112 KB feature page.
- BGM defaulted to enabled.
- Multiple intervals continued while the page was hidden.

### Source Files
- `app/neo-operation-room/page.tsx`
- `app/neo-operation-room/NeoOperationRoomClient.tsx`
- `src/features/neo-war-room/NeoOperationRoomPage.tsx`
- `src/features/neo-war-room/components/NeoSpriteActor.tsx`

### Fix Direction
- Applied: small route lazy shell.
- Applied: BGM off by default.
- Applied: timers pause while `document.hidden`.

### Risk
- Low. Payment/access APIs and operation result generation were not changed.

### Verification
- Build route table changed from `55.2 kB / 172 kB First Load JS` to `1.63 kB / 106 kB First Load JS`.
- Mobile smoke at 360px, iPhone SE, iPhone 13/14, and 430px: no horizontal overflow, media requests `0`, audio `preload=none`, empty audio source, BGM default `false`, broken image count `0`.

## Route: /neo-operation-room/result

### Found Issues
- Build evidence showed route entry at `18.2 kB`, `135 kB First Load JS`.
- Result page directly imported the full result client.
- Visible retry links prefetched the heavy operation-room route.

### Source Files
- `app/neo-operation-room/result/page.tsx`
- `app/neo-operation-room/result/NeoOperationRoomResultClient.tsx`
- `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`

### Fix Direction
- Applied: small route lazy shell.
- Applied: retry/back links use `prefetch={false}`.
- Kept: PDF libraries remain click-time dynamic imports.

### Risk
- Low to medium. Shell and link prefetch changed; result fetch, purchase checks, PDF generation, and result data shape did not change.

### Verification
- Build route table changed from `18.2 kB / 135 kB First Load JS` to `675 B / 105 kB First Load JS`.
- Mobile static smoke at 360px, 390px, and 430px: result body rendered, horizontal overflow `false`, broken DOM images `0`, audio elements `0`, audio requests `0`.
- Network check: `/neo-operation-room` page prefetch `false`.

## Route: /karma-destiny-ai/result

### Found Issues
- Build evidence showed route entry at `10.1 kB`, `118 kB First Load JS`.
- `app/karma-destiny-ai/result/page.tsx` was a full `use client` result page, so polling, chapter reader UI, inline styles, icons, and PDF handlers were in the route entry.

### Source Files
- `app/karma-destiny-ai/result/page.tsx`
- `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`

### Fix Direction
- Applied: split route entry into a small lazy shell.
- Kept: session lookup, result polling, policy copy, and PDF download behavior inside the original client page.

### Risk
- Low. Only the load boundary changed.

### Verification
- Build route table changed from `10.1 kB / 118 kB First Load JS` to `668 B / 105 kB First Load JS`.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: HTTP 200, no horizontal overflow, broken image count `0`, audio requests `0`, audio elements `0`, lazy fallback no longer visible after hydration.

## Route: /premium-unlock

### Found Issues
- Build evidence showed route entry at `20.8 kB`, `171 kB First Load JS`.
- `app/premium-unlock/page.tsx` directly imported the 79 KB client sales page.
- CTA waited before calling `startPayment()`, which made mobile taps feel delayed.

### Source Files
- `app/premium-unlock/page.tsx`
- `app/premium-unlock/PremiumUnlockClient.tsx`
- `app/premium-unlock/PremiumSalesContent.tsx`

### Fix Direction
- Applied: small route lazy shell.
- Applied: CTA calls `startPayment()` immediately and defers only route navigation.

### Risk
- Low. Payment amount, unlock policy, and purchase route were not changed.

### Verification
- Build route table changed from `20.8 kB / 171 kB First Load JS` to `664 B / 105 kB First Load JS`.
- Mobile smoke at 360px, 390px, and 430px: premium CTA mounted, no horizontal overflow, image count `0`, audio count `0`.
- CTA click reaches login guard for `/points/`.

## Route: /sukuyo-compatibility-ai

### Found Issues
- Route uses multiple mobile blur, backdrop-filter, SVG filter, aura, and shadow layers.
- Build route table was already small enough that CSS paint cost was the higher-value mobile issue.

### Source Files
- `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.module.css`

### Fix Direction
- Applied: mobile media query reduces costly blur/filter/shadow effects.
- Kept: layout, paid gate, and result logic unchanged.

### Risk
- Low. Only mobile CSS paint cost changed.

### Verification
- Build route table remains `2.23 kB / 107 kB First Load JS`.
- Mobile CSS check at 360px, 390px, and 430px: horizontal overflow `false`, broken DOM images `0`, audio elements/requests `0`, computed shell/panel backdrop filter and moon aura filter are `none` at 390px.

## Route: /music

### Found Issues
- `app/music/_data/musicLyrics.ts` is about 284 KB.
- `MusicPlayerExample.tsx` loaded lyrics data for current and nearby tracks even when the lyrics panel was closed.
- Audio preload behavior was already good: audio source is set only through play paths.
- `MusicPlaylistPanel.tsx` previously mapped the full filtered list, so the default all-tab playlist could mount all 89 cards.
- Mobile smoke evidence showed only one image and zero audio requests, but also showed the mobile cover ambient layer still computed `filter: blur(20px) saturate(1.02)`.
- `MusicPlayerExample.tsx` queried `/api/music/access` immediately for all locked preview tracks on route entry.

### Source Files
- `app/music/MusicPlayerExample.tsx`
- `app/music/MusicPlaylistPanel.tsx`
- `app/music/moon-music-player.module.css`
- `app/music/_data/musicLyrics.ts`
- `app/music/_hooks/useMusicPlayer.ts`

### Fix Direction
- Applied: lyrics import and neighbor warmup run only when lyrics are open.
- Applied: playlist card mount count is capped to 10 initially, with 10-track incremental "show more".
- Applied: initial music access refresh covers the shared/current initial track window first; full refresh is deferred for 7 seconds and then idle-scheduled.
- Applied: selecting a locked preview track refreshes that track's access immediately without awaiting the network.
- Applied: mobile CSS hides cover ambient blur, moonbeam, star field, and banner glow layers.
- Kept: audio preload policy unchanged.
- Kept: purchase, unlock, download, and full-track access policy unchanged.

### Risk
- Low. Payment/access policy is unchanged; only request timing and render batch size changed.

### Verification
- Initial `/music` render does not import lyrics before panel open.
- Opening lyrics loads the module and still renders lyrics.
- Build route table remains `/music` at `1.31 kB / 106 kB First Load JS`.
- Static artifact evidence: `dist/music/index.html` links route CSS `dd87b2ca806080e7.css` at `122,530 B`; this pass reduces mobile runtime paint work rather than CSS bytes.
- Mobile smoke on built `dist` at 360px, 390px, and 430px: h1 visible, horizontal overflow `false`, DOM image count `1`, lazy images `1`, broken images `0`, audio elements `0`, audio requests `0`, initial playlist items `10`.
- Mobile computed style check at 360px, 390px, and 430px: `coverAmbient`, `stars`, and `moonbeam` display are `none`.
- Initial `/api/music/access` request count is `1` during network-idle smoke; the full refresh is delayed beyond initial route settle. Local Python static server returns `501` for this API because Next API routes are not served by that server.

## Route: /stories

### Found Issues
- `app/stories/page.tsx` used only `page`, `inner`, and `backLink` classes but imported `app/stories/stories.module.css`, the full story presentation stylesheet.
- `components/stories/StoriesIndex.tsx` also imported the full `app/stories/stories.module.css`, while the index route used only the index hero/grid/settings/card layout subset.
- First split evidence showed the full stylesheet still arrived through linked story detail route CSS. That route import was then split too.
- Static HTML evidence after the second split shows `dist/stories/index.html` dynamic story CSS changed from the temporary `296e952a546856dd.css` at `46,010 B` to `d0b0d8d05f70330c.css` at `21,744 B`.
- Decorative stars rendered 55 DOM nodes on every index load.
- A client-only `ssr: false` split was tested and rejected because `npm run postbuild` failed `verify-adsense-readiness` with `/stories` visible content too thin.

### Source Files
- `app/stories/page.tsx`
- `app/stories/StoriesIndexRouteClient.tsx`
- `app/stories/stories.module.css`
- `app/stories/stories-route.module.css`
- `components/stories/StoriesIndex.tsx`
- `components/stories/storiesIndex.module.css`
- `components/stories/StoryCard.tsx`
- `components/stories/storyComponents.module.css`

### Fix Direction
- Applied: route shell styles moved to `stories-route.module.css`.
- Applied: index content styles moved to `components/stories/storiesIndex.module.css`.
- Applied: decorative stars reduced from 55 to 34; mobile CSS hides stars after the 21st node.
- Kept: SSR story list content and AdSense-visible text remain intact.
- Deferred: keep `StoryCard` SSR instead of `ssr: false`; future work can trim card CSS further without removing visible story content.

### Risk
- Low. Story data, links, metadata, and SSR content policy were not changed.

### Verification
- Build route table after safe split: `/stories` is `1.71 kB / 110 kB First Load JS`.
- Manifest evidence: `/stories/page` route entry chunk is `.next/static/chunks/app/stories/page-83237dcafe9595c4.js` at `4,634 B`; route shell CSS is `.next/static/css/8b28ab5ee34e3b8b.css` at `1,172 B`.
- Static HTML evidence: `dist/stories/index.html` links `d0b0d8d05f70330c.css` at `21,744 B` for SSR story index/card content, down from the temporary `46,010 B` chunk produced before detail CSS was split.
- Mobile smoke on built `dist`: `/stories` passed at 360px, 390px, and 430px with horizontal overflow `false`, broken image count `0`, audio elements `0`, and no HTTP 4xx/5xx responses.

## Route: /stories/[storyId]

### Found Issues
- `app/stories/[storyId]/page.tsx` used only 15 detail classes from `app/stories/stories.module.css`, but imported the full `31,134 B` story presentation stylesheet.
- `components/stories/ChapterList.tsx` rendered chapter/progress UI but imported `components/stories/storyComponents.module.css`, which also contains story card cover/badge/shimmer styles.

### Source Files
- `app/stories/[storyId]/page.tsx`
- `app/stories/[storyId]/story-detail.module.css`
- `components/stories/ChapterList.tsx`
- `components/stories/chapterList.module.css`
- `components/stories/storyComponents.module.css`

### Fix Direction
- Applied: story detail page styles moved to `story-detail.module.css`.
- Applied: chapter list/progress styles moved to `chapterList.module.css`.
- Kept: chapter links, reading progress, stored view counts, story metadata, and SSR story detail content unchanged.

### Risk
- Low. The changes are CSS/import boundary changes only.

### Verification
- Build route table changed `/stories/[storyId]` from `4.66 kB / 117 kB First Load JS` after the first safe split to `3.58 kB / 116 kB First Load JS`.
- Manifest evidence: `/stories/[storyId]/page` now uses `.next/static/css/cc6464fa9a8c192f.css` at `11,555 B` and route entry `.next/static/chunks/app/stories/[storyId]/page-ec67742e86d99894.js` at `9,700 B`.
- Static HTML evidence: `dist/stories/code-destiny/index.html` links `cc6464fa9a8c192f.css` and no longer links the old full `stories.module.css` chunk.
- Mobile smoke on built `dist`: `/stories/code-destiny/` passed at 360px, 390px, and 430px with horizontal overflow `false`, broken image count `0`, audio elements `0`, and no HTTP 4xx/5xx responses.

## Route: /stories/[storyId]/[chapterId]

### Found Issues
- Build manifest evidence showed `/stories/[storyId]/[chapterId]` route entry at `18,969 B`.
- `components/stories/ChapterViewer.tsx` directly imported `ViewerSettingsPanel`, so the reading settings drawer, presets, font option UI, and range controls were loaded before the reader tapped settings.
- Later code evidence showed the scroll listener calling `setTopHidden`, `setDockMuted`, and `updateProgress(getScrollPercent(...))` directly on each scroll event.
- CSS evidence showed mobile still running `starlightDrift` background-position animation and `backdrop-filter: blur(14px)` on fixed top/bottom nav.
- Built long chapter evidence: `dist/stories/code-destiny/chapter-57/index.html` is `111,982 B`, so scroll smoothness matters more than adding a route-shell fallback.
- A route-shell lazy split would reduce the entry more, but it would replace the chapter body SSR with a fallback and risk SEO/initial reading regressions.
- `app/stories/[storyId]/[chapterId]/loading.tsx` imported `../../stories.module.css`, so the loading fallback attached the full story presentation stylesheet just to render one skeleton message.

### Source Files
- `app/stories/[storyId]/[chapterId]/page.tsx`
- `components/stories/ChapterViewer.tsx`
- `components/stories/ViewerSettingsPanel.tsx`
- `components/stories/viewer.module.css`
- `app/stories/[storyId]/[chapterId]/loading.tsx`
- `app/stories/stories-route.module.css`
- `lib/stories/data.ts`

### Fix Direction
- Applied: kept the chapter body and reader nav in the initial render.
- Applied: moved `ViewerSettingsPanel` behind a click-time dynamic import.
- Applied: renders a lightweight in-drawer loading shell immediately when the settings button is tapped.
- Applied: coalesced scroll progress/chrome updates with `requestAnimationFrame` and avoids unchanged state writes.
- Applied: mobile CSS disables starlight drift animation and removes fixed nav `backdrop-filter`.
- Applied: chapter loading fallback CSS changed from the full `b57def5230cac992.css` story module at `34,141 B` to the tiny route shell CSS at `1,172 B`.

### Risk
- Low. Story data, navigation, progress storage, and reader setting semantics were not changed.

### Verification
- Build route table: `/stories/[storyId]/[chapterId]` is now `6.15 kB / 114 kB First Load JS`.
- Manifest evidence after build: route entry chunk is `.next/static/chunks/app/stories/[storyId]/[chapterId]/page-0474834e86e17956.js` at `16,707 B`; reader CSS is `.next/static/css/fce937a949d22d4e.css` at `11,243 B`.
- Manifest evidence for `app/stories/[storyId]/[chapterId]/loading`: loading entry chunk is `.next/static/chunks/app/stories/[storyId]/[chapterId]/loading-2f971c51e96cb5e0.js` at `362 B`; loading CSS is `.next/static/css/8b28ab5ee34e3b8b.css` at `1,172 B`.
- Static mobile smoke on built `dist` chapter 57 at 360px, 390px, and 430px: story heading visible, horizontal overflow `false`, broken image count `0`, audio elements `0`, failed responses `0`.
- Mobile computed style checks: starlight shell animation `none`, top nav backdrop filter `none`, bottom nav backdrop filter `none`.
- Settings drawer smoke: drawer opens in 142 ms, 216 ms, and 346 ms across 360px, 390px, and 430px viewports.
- Scroll smoke: programmatic mobile scroll updates progress from `0%` to `56%` without horizontal overflow.

## Route: /tarot and tarot card album

### Found Issues
- Tarot prompt maker client is large.
- Some tarot/card result views use normal `<img>` in large card lists.
- Fortune tea tarot album builds 78-card metadata on modal open, not on first route render.

### Source Files
- `app/tarot/prompt-maker/TarotPromptMakerClient.tsx`
- `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx`
- `app/components/SunHealingTarot.tsx`
- `src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`
- `src/features/fortune-tea-house/components/TarotAssetCard.tsx`

### Fix Direction
- No tarot result logic change in this pass.
- Later: lazy-mount detail sections and segment or virtualize large card grids.

### Risk
- Medium. Tarot routes mix paid/free gates, result logic, share, and download flows.

### Verification
- Card draw, card detail, paid gate, result view, share, and download.

## Route: /astrology-ai/result

### Found Issues
- `app/astrology-ai/result/page.tsx` was a full `use client` result page.
- The route entry included result lookup, chart evidence UI, PDF download handlers, and icon imports before the result shell could settle on mobile.

### Source Files
- `app/astrology-ai/result/page.tsx`
- `app/astrology-ai/result/AstrologyAiResultClient.tsx`

### Fix Direction
- Applied: split the route entry into a small lazy shell.
- Kept: result lookup, auth fetch, PDF download behavior, and saved result data shape unchanged.

### Risk
- Low. Only the load boundary changed.

### Verification
- Build route table: `/astrology-ai/result` is now `667 B / 105 kB First Load JS`.
- Manifest evidence after build: route entry chunk `.next/static/chunks/app/astrology-ai/result/page-74343d1ed8556ad3.js` is `952 B`; the full result UI moved to lazy chunk `.next/static/chunks/1174.fea00a4ef70a45e2.js` at `18.9 kB`.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: HTTP 200, no horizontal overflow, broken image count `0`, audio requests `0`, audio elements `0`, lazy fallback no longer visible after hydration.

## Route: /life-book-ai/result

### Found Issues
- Build evidence showed route entry at `7.15 kB`, `118 kB First Load JS`.
- `app/life-book-ai/result/page.tsx` was a full `use client` result page.
- The route entry included result lookup, report parsing, chapter rendering, PDF download handlers, and icon imports before the result shell could settle on mobile.

### Source Files
- `app/life-book-ai/result/page.tsx`
- `app/life-book-ai/result/LifeBookAiResultClient.tsx`

### Fix Direction
- Applied: split the route entry into a small lazy shell.
- Kept: result lookup, auth fetch, report JSON handling, PDF download behavior, and access policy unchanged.

### Risk
- Low. Only the load boundary changed.

### Verification
- Build route table changed from `7.15 kB / 118 kB First Load JS` to `662 B / 105 kB First Load JS`.
- Manifest evidence after build: route entry chunk `.next/static/chunks/app/life-book-ai/result/page-07937415546bf800.js` is `948 B`; the full result UI moved to lazy chunk `.next/static/chunks/3187.18310afa98e3d9a6.js` at `22.4 kB`.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: HTTP 200, no horizontal overflow, broken image count `0`, audio requests `0`, audio elements `0`, lazy fallback no longer visible after hydration.

## Route: /love-secret-ai/result

### Found Issues
- Build evidence showed route entry at `6.59 kB`, `114 kB First Load JS`.
- `app/love-secret-ai/result/page.tsx` was a full `use client` result page.
- The route entry included result lookup, saju summary rendering, relationship sections, icon imports, and click-time PDF handlers before the result shell could settle on mobile.

### Source Files
- `app/love-secret-ai/result/page.tsx`
- `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`

### Fix Direction
- Applied: split the route entry into a small lazy shell.
- Kept: result lookup, auth fetch, saju summary data shape, PDF download behavior, and access policy unchanged.

### Risk
- Low. Only the load boundary changed.

### Verification
- Build route table changed from `6.59 kB / 114 kB First Load JS` to `674 B / 105 kB First Load JS`.
- Manifest evidence after build: route entry chunk `.next/static/chunks/app/love-secret-ai/result/page-593ea55fdbe38da6.js` is `950 B`; full result UI symbols moved to lazy chunks `.next/static/chunks/3187.18310afa98e3d9a6.js` at `22.4 kB` and `.next/static/chunks/2348.a324deeeac068d3f.js` at `18.4 kB`.
- Static mobile smoke on built `dist` at 360px, 390px, and 430px: HTTP 200, no horizontal overflow, broken image count `0`, audio requests `0`, audio elements `0`, lazy fallback no longer visible after hydration.

## Route: /ziwei-ai, /vedic-ai, /astrology-ai

### Found Issues
- These premium AI routes can import calculation, PDF, chart, and report UI code.
- `/vedic-ai` and `/ziwei-ai` already use route client dynamic shells.
- They also depend on paid access and LLM/PDF flow order.

### Source Files
- `app/ziwei-ai/**`
- `app/vedic-ai/**`
- `app/astrology-ai/**`
- `scripts/verify-ziwei-ai-consultation-flow.mjs`
- `scripts/verify-vedic-ai-flow.mjs`
- `scripts/verify-astrology-ai-flow.mjs`

### Fix Direction
- Applied for `/astrology-ai/result`: lazy route shell split.
- Later: fix existing mojibake in `/vedic-ai` and `/ziwei-ai` fallback shell copy, then audit their hydrated route chunks.

### Risk
- High. Paid result generation and PDF order must remain unchanged.

### Verification
- Existing flow verifiers plus mobile route smoke after any future split.

## Route: /tarot/love, /tarot/mingri, /tarot/year, and FeatureLandingPage-based landing routes

### Found Issues
- `app/components/FeatureLandingPage.tsx` rendered two absolute ambient orbs with inline `filter: blur(52px)` and `filter: blur(64px)`.
- The same component rendered five floating particle nodes and optional petal blur nodes before interaction.
- The previous mobile media query stopped animation and hid only `.flp-particle-extra`, so the expensive blur/filter layers were still painted on mobile.
- `FEATURE_SLUG_TAG_COPY` was embedded in the shared landing route chunk even though Korean routes do not need the non-Korean slug fallback map.
- The share widget mounted after a fixed `1200 ms` timer and pulled the `5069.5a6b23ffb292d009.js` chunk at `437,969 B` plus companion chunks before the user reached the share controls.
- Static export URLs such as `/tarot/love/` produced a trailing slash in `basePath`, while `SLUG_CFG`, `ACTION_MAP`, and `PAID_SLUG_META` are keyed as `/tarot/love`; browser evidence showed fallback `SERVICE` badge and missing action-specific CTA before normalization.
- Route-level dynamic import was tested on `app/tarot/love/page.tsx`, `app/tarot/mingri/page.tsx`, and `app/tarot/year/page.tsx`; build evidence worsened from `132/133 B / 133 kB First Load JS` to `750 B / 134 kB First Load JS`, so that approach was rejected and reverted.
- Latest build evidence showed `DestinyIcon` was bundled into `3079`, while `next/link` and `constants/loadingMessages` added route/layout chunks for a static landing page that only needs emoji icons, a plain `/insights` link, and locale detection.

### Source Files
- `app/components/FeatureLandingPage.tsx`
- `app/components/FeatureLandingPage.slugTags.ts`
- `app/tarot/love/page.tsx` (evidence only, no retained content change)
- `app/tarot/mingri/page.tsx` (evidence only, no retained content change)
- `app/tarot/year/page.tsx` (evidence only, no retained content change)

### Fix Direction
- Applied: hide `.flp-orb`, `.flp-particle`, and `.flp-petal` under mobile/reduced-motion media.
- Applied: remove mobile/reduced-motion hero icon filter and reduce the OG image wrapper shadow.
- Applied: moved non-Korean slug tag fallbacks into `FeatureLandingPage.slugTags.ts` and lazy-load it only when `locale !== "ko"`.
- Applied: defer `ShareWidget` import until its slot intersects the viewport; no initial `5069` share chunk before scroll.
- Applied: normalize trailing slashes in the feature base path before route config/action/paid metadata lookup.
- Applied: replace `DestinyIcon` usage with existing per-slug emoji text rendering for the hero, CTA, and particles.
- Applied: replace the single `next/link` insights link with a normal anchor.
- Applied: replace the full loading-message locale import with a small local locale resolver that preserves `lang` query, `cd_lang`, `cd_locale`, and `cdGetCurrentLanguage` behavior.
- Kept: route entry imports, payment/access logic, pricing policy, unlock policy, and image priority unchanged.

### Risk
- Medium. Paint and chunk loading changes are isolated, but trailing-slash normalization changes CTA href resolution from fallback `/index.html` to the intended feature action URL.

### Verification
- Shared landing chunk `3079` changed from `66,462 B` to `43,108 B`; lazy locale fallback chunk `8290.bcd5009567c7d2c5.js` is `18,763 B`.
- Build route table now shows `/tarot/love`: `122 B / 118 kB First Load JS`, `/tarot/mingri`: `124 B / 118 kB`, `/tarot/year`: `124 B / 118 kB`, plus FeatureLandingPage-based `/animal/mbti`, `/oracle/royal-tea`, `/saju/basic`, and `/vedic/jyotish` at `118 kB`.
- Manifest route referenced JS for `/tarot/love`, `/saju/basic`, `/animal/mbti`, `/oracle/royal-tea`, and `/vedic/jyotish` is now `398,548 B`, down from `424,806 B`.
- Static mobile smoke on exported `out`: `/tarot/love/` 360px, `/saju/basic/` 390px, `/animal/mbti/` 430px, `/oracle/royal-tea/` 360px, and `/vedic/jyotish/` 430px passed with horizontal overflow `false`, broken images `0`, image count `2`, audio/media elements `0`, `.flp-orb` and `.flp-particle` display `none`.
- Initial rendered page assets exclude `5069.5a6b23ffb292d009.js`; after scrolling to the share slot, share buttons render and the `5069` chunk loads.
- Trailing slash action hrefs verified: `/tarot/love/` -> `/index.html?action=openTarotLoveModal`, `/saju/basic/` -> `/index.html?action=checkPrivacyAndCalculate`, `/animal/mbti/` -> `/index.html?action=openMbtiModal`, `/oracle/royal-tea/` -> `/index.html?action=openRoyalTeaOracle`, `/vedic/jyotish/` -> `/index.html?action=navigateToVedic`.
- Locale smoke verified `/tarot/love/?lang=en` renders `What Are We?`, `Start paid feature - 5,000 KRW`, and `View related insights`.

## Global React Chrome: AppChrome/Footer

### Found Issues
- Build manifest evidence showed `/layout` at `554,075 B` of referenced JS before this pass.
- `.next/static/chunks/app/layout-7d740ea634cee9f1.js` contained `SiteFooterHub` CSS module tokens, social links, SEO link groups, business rows, and refund rows.
- `app/components/AppChrome.tsx` synchronously imported `SiteFooterHub`, so every chrome-enabled React route paid for below-the-fold footer code during initial hydration.

### Source Files
- `app/components/AppChrome.tsx`
- `app/components/SiteFooterHub.jsx` (evidence only, no retained content change)
- `app/_components/SocialFooter.js` (evidence only, no retained content change)

### Fix Direction
- Applied: dynamically import `SiteFooterHub` from `AppChrome`.
- Applied: mount the footer only when a footer sentinel approaches the viewport, with a timed fallback only for browsers without `IntersectionObserver`.
- Applied: keep a lightweight SSR footer preview with essential links so static/no-JS pages and Adsense readiness visible-text guards stay intact while the full footer chunk remains deferred.
- Kept: global header, disclaimer banner, chromeless route list, auth, payment, unlock, and full footer content unchanged.

### Risk
- Low to medium. Footer content now loads below the fold instead of being part of the first chrome render; top-of-page behavior is unchanged.

### Verification
- Build chunk evidence: root app layout chunk is now `.next/static/chunks/app/layout-39b2421710be908b.js` at `27,360 B`; full footer code moved to lazy chunk `5062.7c13ccb930a19d8e.js` at `13,810 B`.
- Build manifest evidence: `/layout` referenced JS changed from `554,075 B` to `544,068 B`.
- Mobile smoke on exported `out` at 390px for `/psychotest/`: header visible, lightweight footer preview stays below the initial viewport, full footer absent on initial viewport, horizontal overflow `false`, broken images `0`, media elements `0`, and no initial `5062` footer chunk.
- After scrolling near the bottom of `/psychotest/`, footer renders and `5062.7c13ccb930a19d8e7.js` appears in observed assets.
- Chromeless route smoke on `/music/` at 390px: header `false`, footer `false`, disclaimer `false`, initial footer chunk absent, horizontal overflow `false`.

## Payment, Modal, Unlock, and Login Surfaces

### Found Issues
- Mobile payment modal used blur and heavy shadow styling.
- Some premium CTAs delayed visible feedback by waiting before entering the payment flow.
- Payment and unlock API policy itself is sensitive and was not changed.

### Source Files
- `app/_lib/billing-client.ts`
- `app/premium-unlock/PremiumSalesContent.tsx`
- `index.html`
- `js/core/index-inline-runtime.js`

### Fix Direction
- Applied: mobile payment modal paint cost reduced.
- Applied: premium CTA enters payment flow immediately on click.
- Kept: member pass, monthly credit, single KRW payment, auth, unlock, and route policy unchanged.

### Risk
- Medium. Click timing and modal CSS changed, but billing decisions did not.

### Verification
- Premium CTA mobile click enters loading/auth guard immediately.
- Existing billing policy verifiers remain required for future payment changes.

## Build Pipeline Stability

### Found Issues
- Next static export could attempt to promote `404.html` or `500.html` after the target already existed.
- Adsense readiness verifier could read generated paid-route HTML while postbuild/export was still moving or pruning files.
- `sync:public` rewrote `mobile-interaction-patch.js` mirror cache keys away from the fixed key expected by `verify:runtime-cache-sync`.
- App route HTML existed under `.next/server/app` and generated export routes under `out`, but postbuild restoration only looked at sparse `out`, leaving required routes such as `/about` absent from `dist`.
- Static generation could request `.next/server/webpack-runtime.js` from an app route before that runtime file was visible on disk.
- Next export could throw `ENOENT` during public asset `copyfile` even when the source existed and the target appeared immediately after the failure.
- Next export could leave `out/ads.txt` missing even while the canonical `public/ads.txt` existed, causing `verify-adsense-readiness` to fail after an otherwise valid build.

### Source Files
- `scripts/next-manifest-read-guard.cjs`
- `scripts/verify-adsense-readiness.mjs`
- `scripts/sync-legacy-static-to-public.mjs`
- `scripts/prepare-cloudflare-dist.mjs`
- `scripts/promote-static-shell-to-root.mjs`
- `scripts/run-postbuild.mjs`

### Fix Direction
- Applied: narrow missing-source rename guard only for `404.html`/`500.html` export promotion when the target file exists.
- Applied: narrow wait for app route `webpack-runtime.js` during static generation.
- Applied: optional generated HTML read in Adsense readiness verifier.
- Applied: preserve the mobile interaction patch fixed cache key during public shell regeneration.
- Applied: restore generated app route HTML from `.next/server/app` during dist preparation and static shell promotion.
- Applied: public-to-`out` `copyfile` retries only when the source exists and destination parent creation is safe, or treats the race as done when the target already exists.
- Applied: before Adsense readiness verification, copy required public root files such as `ads.txt` into `out` only when export output exists and the file is missing.

### Risk
- Low. Guards only affect verification/build races and do not change runtime app behavior.

### Verification
- `npm run build` completes after the guards.

## Verification Log

- `npm run typecheck` -> pass.
- `npm run lint` -> pass with existing warnings.
- `node scripts/build-cf-main.mjs` -> pass; final build time `2026-07-01T07:40:22.696Z`, commit short `2f1f289536b5`.
- `npm run postbuild` -> pass; `verify-adsense-readiness` OK.
- Route table after build:
  - `/neo-operation-room`: `1.63 kB / 106 kB First Load JS`.
  - `/neo-operation-room/result`: `675 B / 105 kB First Load JS`.
  - `/karma-destiny-ai/result`: `668 B / 105 kB First Load JS`.
  - `/astrology-ai/result`: `667 B / 105 kB First Load JS`.
  - `/life-book-ai/result`: `662 B / 105 kB First Load JS`.
  - `/love-secret-ai/result`: `674 B / 105 kB First Load JS`.
  - `/saju/destiny-bias/stage`: `5.62 kB / 114 kB First Load JS`; manifest route entry chunk `16,047 B`.
  - `/fortune-tea-house`: `636 B / 105 kB First Load JS`; initial route CSS `842 B`.
  - `/fortune-tea-house/tarot-debug`: manifest route entry chunk `968 B`.
  - `/fortune-tea-house/tea-cup-debug`: manifest route entry chunk `958 B`.
  - `/fortune-tea-house/ten-god-debug`: `661 B / 105 kB First Load JS`; manifest route entry chunk `943 B`.
  - `/music`: `1.31 kB / 106 kB First Load JS`; route CSS `122,530 B`.
  - `/stories`: `1.71 kB / 110 kB First Load JS`; route shell CSS `1,172 B`; SSR story index/card dynamic CSS `21,744 B`.
  - `/stories/[storyId]`: `3.58 kB / 116 kB First Load JS`; detail/chapter CSS `11,555 B`; route entry chunk `9,700 B`.
  - `/stories/[storyId]/[chapterId]`: `6.15 kB / 114 kB First Load JS`; manifest route entry chunk `16,707 B`, reader CSS `11,243 B`.
  - `/stories/[storyId]/[chapterId]/loading`: manifest loading entry chunk `362 B`, route shell CSS `1,172 B`.
  - `/premium-unlock`: `664 B / 105 kB First Load JS`.
  - `/sukuyo-compatibility-ai`: `2.23 kB / 107 kB First Load JS`.
  - `/tarot/love`: `122 B / 118 kB First Load JS`.
  - `/tarot/mingri`: `124 B / 118 kB First Load JS`.
  - `/tarot/year`: `124 B / 118 kB First Load JS`.
  - FeatureLandingPage shared chunk `3079-7aaabfa40dbc2dd6.js`: `43,108 B`; non-Korean slug fallback chunk `8290.bcd5009567c7d2c5.js`: `18,763 B`; heavy share chunk `5069.5a6b23ffb292d009.js`: `437,969 B`, no longer loaded before the share slot is reached.
  - Root app layout chunk `.next/static/chunks/app/layout-39b2421710be908b.js`: `27,360 B`; footer chunk `5062.7c13ccb930a19d8e.js`: `13,810 B`, lazy loaded after footer sentinel approaches the viewport.
- `npm run verify:entry-encoding -- --strict-core` -> pass.
- Mojibake sentinel scan on this pass changed text files -> pass; replacement-character, backslash-u replacement literal, `U+00C3`, `U+00C2`, `U+00EB`, and `U+00F0` counts are `0`. `U+00EC`, `U+00ED`, and `U+00EA` hits are valid Vietnamese/French/Spanish accents in `app/components/FeatureLandingPage.tsx` locale copy, including lines 390, 396, 419, 427, and 442.
- `git diff --check` -> pass with CRLF conversion warnings only.
- `npm run verify:locale-main-sync` -> pass.
- `npm run verify:runtime-cache-sync` -> pass; runtime cache marker `build-ed033e9fa6b0`.
- Mobile smoke tooling: installed temporary `playwright-core` under `%TEMP%\codex-playwright-core` and launched local Chrome; project `package.json`/lockfiles were not changed for this tool.
- Mobile smoke:
  - `/neo-operation-room`: 360px, iPhone SE, iPhone 13/14, 430px passed.
  - `/neo-operation-room/result`: 360px, 390px, 430px passed.
  - `/karma-destiny-ai/result`: 360px, 390px, 430px passed.
  - `/astrology-ai/result`: 360px, 390px, 430px passed.
  - `/life-book-ai/result`: 360px, 390px, 430px passed.
  - `/love-secret-ai/result`: 360px, 390px, 430px passed.
  - `/saju/destiny-bias/stage`: 360px, 390px, 430px passed.
  - `/fortune-tea-house`: 360px, 390px, 430px passed; initial route CSS `842 B`, h1 visible after hydration, audio requests `0`.
  - `/fortune-tea-house/tarot-debug`: 360px, 390px, 430px passed.
  - `/fortune-tea-house/tea-cup-debug`: 360px, 390px, 430px passed.
  - `/fortune-tea-house/ten-god-debug`: 360px, 390px, 430px passed.
  - `/music`: 360px, 390px, 430px passed; h1 visible, horizontal overflow `false`, DOM image count `1`, lazy image count `1`, broken images `0`, audio elements/requests `0`, playlist items `10`, initial `/api/music/access` request count `1`, mobile `coverAmbient`/`stars`/`moonbeam` display `none`.
  - Local static Python server returns `501` for `/api/music/access`; this is expected for the smoke host because Next API/worker routes are not served by that static server.
  - `/stories`: 360px, 390px, 430px passed; horizontal overflow `false`, broken images `0`, audio elements `0`, no HTTP 4xx/5xx responses; CSS links include route shell `8b28ab5ee34e3b8b.css` and SSR index/card CSS `d0b0d8d05f70330c.css`.
  - `/stories/code-destiny`: 360px, 390px, 430px passed; horizontal overflow `false`, broken images `0`, audio elements `0`, no HTTP 4xx/5xx responses; CSS links include detail/chapter CSS `cc6464fa9a8c192f.css`.
  - `/stories/code-destiny/chapter-1`: 360px, 390px, 430px passed; horizontal overflow `false`, broken images `0`, audio elements `0`, no HTTP 4xx/5xx responses; CSS links include reader CSS `fce937a949d22d4e.css` and loading route shell `8b28ab5ee34e3b8b.css`.
  - Local Chromium reported a failed external font request for `https://assets.code-destiny.com/Mulmaru.woff2`; source check shows `styles/globals.css`, `styles/core-ui.css`, and `index.html` use `font-display: swap`.
  - `/stories/code-destiny/chapter-57`: 360px, 390px, 430px passed; settings drawer opens in 142-346 ms, mobile reader animation/backdrop filters are `none`, progress updates after scroll.
  - `/premium-unlock`: 360px, 390px, 430px passed.
  - `/sukuyo-compatibility-ai`: 360px, 390px, 430px passed.
  - `/tarot/love/`: 390px passed; horizontal overflow `false`, broken images `0`, audio/media elements `0`, hero icon renders from the slug emoji, fallback `SERVICE` absent, CTA href `/index.html?action=openTarotLoveModal`, `/insights` is a normal anchor, initial `5069` share chunk absent.
  - `/tarot/love/?lang=en`: 390px passed; h1 `What Are We?`, CTA `Start paid feature`, and insights link copy are localized by the small local resolver.
  - `/saju/basic/`: 390px passed; horizontal overflow `false`, broken images `0`, audio/media elements `0`, fallback `SERVICE` absent, CTA href `/index.html?action=checkPrivacyAndCalculate`, initial `5069` share chunk absent.
  - `/animal/mbti/`: 430px passed; horizontal overflow `false`, broken images `0`, audio/media elements `0`, fallback `SERVICE` absent, CTA href `/index.html?action=openMbtiModal`, initial `5069` share chunk absent.
  - `/oracle/royal-tea/`: 360px passed; horizontal overflow `false`, broken images `0`, audio/media elements `0`, fallback `SERVICE` absent, CTA href `/index.html?action=openRoyalTeaOracle`, initial `5069` share chunk absent.
  - `/vedic/jyotish/`: 430px passed; horizontal overflow `false`, broken images `0`, audio/media elements `0`, fallback `SERVICE` absent, CTA href `/index.html?action=navigateToVedic`, initial `5069` share chunk absent.
  - `/tarot/love/` after scrolling to the share slot: `5069.5a6b23ffb292d009.js` loads on demand.
  - `/psychotest/`: 390px passed; header visible, lightweight footer preview stays below the initial viewport, full footer absent on initial viewport, horizontal overflow `false`, broken images `0`, media elements `0`, initial `5062` footer chunk absent.
  - `/psychotest/` after scrolling near bottom: footer renders and `5062.7c13ccb930a19d8e7.js` appears in observed assets.
  - `/music/`: 390px chromeless route guard passed; header `false`, footer `false`, disclaimer `false`, initial `5062` footer chunk absent, horizontal overflow `false`.

## Deferred Follow-Up

- Split `styles/fortune-ui.css` after snapshot/mobile regression coverage exists.
- Audit other remaining premium result chunks before splitting detail code.
- Trim `components/stories/storyComponents.module.css` card styles further only if SSR card content stays visible.
- Virtualize or segment large tarot/card grids where actual mobile smoke shows long tasks.
- Add repeatable route smoke scripts for mobile overflow, image failures, audio requests, and route chunk thresholds.

## 2026-07-01 Continuation Audit: Global Layout and Tarot Love Entry

Search keys used in this pass: `constants/loadingMessages`, `8219`, `openTarotLoveModal`, `action=openTarotLoveModal`, `get('action')`, `index-inline-runtime.js`, `vendor-chunks`, `build-manifest`.

## Route: Global App Layout

### Found Problems
- `constants/loadingMessages` was imported by layout-mounted client components, pulling a large loading-message chunk into routes that only needed small chrome/status copy.
- The route manifest previously showed chunk `8219-7428d35be5d083a7.js` attached to initial app/layout paths.

### Source Files
- `app/components/PaymentProcessingContext.tsx`
- `app/components/GlobalHeader.tsx`
- `app/components/Toast.tsx`
- `app/components/DisclaimerBanner.jsx`
- `app/components/common/ExitToast.tsx`

### Fix Direction
- Replaced global loading-message imports with local lightweight locale/status fallbacks in the layout-mounted components.
- Kept payment processing, access checking, login, unlock, and billing policy flow unchanged.

### Risk
- Low. Copy fallback and locale helper scope changed; access/payment decisions still use the existing provider flow.

### Verification
- `.next/server/app-paths-manifest.json` and route manifests after build: `/layout has8219=false`.
- `out/tarot/love/index.html` and `dist/tarot/love/index.html`: no initial `8219` script.
- Mobile 390px smoke for `/tarot/love/`: no `8219` script/resource requests, no console errors, no broken images.

## Route: /tarot/love

### Found Problems
- The paid CTA linked to `/index.html?action=openTarotLoveModal`, but the static shell had no allowlisted query action runner.
- Mobile users could pay the route navigation cost and land on the shell before the target modal opened.

### Source Files
- `js/core/index-inline-runtime.js`
- `index.html`

### Fix Direction
- Added an allowlisted shell route-action runner for known `action=` values.
- Routed the action through existing `data-action` elements and `__cdInvokeAction`, preserving the existing modal, access, lock, and payment gates.
- Kept the tarot love experience script lazy; it loads only after the existing modal action runs.

### Risk
- Low to medium. The change affects static shell deep links, but only for explicit allowlisted actions.

### Verification
- Source search before fix found no `get('action')` / query action consumer for the shell path.
- Dist mobile smoke at 390px: clicking the `/tarot/love/` paid CTA opened `#tarotLoveOverlay` with `is-open`.
- `tarot-love-experience.js?v=build-fc9b832dfa79` loaded after the CTA action, not during initial route load.
- Closing `.tarot-love-close` hid the overlay and left body scroll usable.

## Build Guard Follow-Up

### Found Problems
- Next build wrapper/manifest guard missed nested webpack runtime requests for vendor chunks.
- The static export path could fail when `.next/build-manifest.json` omitted `/404` or `/500` files.

### Source Files
- `scripts/next-manifest-read-guard.cjs`
- `scripts/next-build-with-pages-manifest.mjs`

### Fix Direction
- Resolved nested webpack runtime chunk requests to the real `.next/server/vendor-chunks/**` or `.next/server/chunks/**` files.
- Filled `/404` and `/500` build-manifest entries from `/_error` client files when Next omitted them.

### Risk
- Low. Build-time guard only; runtime behavior and product policies are unchanged.

### Verification
- `node --check` passed for changed runtime/build scripts.
- `npm.cmd run build` passed; generated static pages `1048/1048`; runtime cache marker `build-fc9b832dfa79`.
- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed with existing warnings.
- `npm.cmd run verify:entry-encoding -- --strict-core` passed.
- `npm.cmd run verify:locale-main-sync` passed.
- `npm.cmd run verify:runtime-cache-sync` passed.

## Remaining Route-Specific Loading Message Chunk

- After removing the global/layout dependency, `8219-7428d35be5d083a7.js` still appears in route-specific manifests for `/psychotest/page`, `/psychotest/[slug]/page`, `/saju/destiny-bias/stage/page`, `/stories/[storyId]/page`, and admin pages.
- These remaining references come from route-local imports of `constants/loadingMessages`, not from the global layout or `/tarot/love` entry.
- Recommended next minimum pass: replace route-local locale-only imports in the public psychotest, saju destiny-bias, and story detail components with lightweight local locale helpers, then rebuild and compare route manifests.

## 2026-07-01 Continuation Audit: Public Route Chunk and Modal Response Pass

Search keys used in this pass: `constants/loadingMessages`, `8219`, `ShareWidget`, `DeferredShareWidget`, `runBillingCoinGate`, `FortuneTeaHouseClient`, `오버레이-Photoroom`, `tarotModalOverlay`, `openTarotModal`, `verify-mobile-cdp-smoke`.

## Route: /psychotest and /psychotest/[slug]

### Found Problems
- Public psychotest routes still imported the full `constants/loadingMessages` locale bundle through a promo component.
- Route manifests attached chunk `8219` even though the visible route only needed a tiny locale code resolver.

### Source Files
- `app/psychotest/_components/DestinyBiasPromoSection.tsx`

### Fix Direction
- Replaced the loading-message import with a route-local `ko|en|ja|zh` resolver.
- Kept psychotest result logic and route navigation unchanged.

### Risk
- Low.

### Verification
- Build manifest after `npm.cmd run build`: `/psychotest/page has8219=false`, `/psychotest/[slug]/page has8219=false`.
- Mobile CDP smoke for `/psychotest/` and `/psychotest/psycho/`: 360px, 390px, 430px passed; no horizontal overflow, no broken images, no media requests.

## Route: /stories and /stories/[storyId]

### Found Problems
- Story index/detail components imported `constants/loadingMessages` for small locale decisions.
- `ShareWidget` imported the same bundle even when the share slot was below the fold.

### Source Files
- `components/stories/ChapterList.tsx`
- `components/stories/StoriesIndex.tsx`
- `app/components/ShareWidget.tsx`
- `app/components/DeferredShareWidget.tsx`

### Fix Direction
- Replaced loading-message imports with local locale helpers.
- Added viewport-gated `DeferredShareWidget` so the share widget mounts only near view.

### Risk
- Low.

### Verification
- Build manifest: `/stories/page has8219=false`, `/stories/[storyId]/page has8219=false`.
- Mobile CDP smoke for `/stories/` and `/stories/code-destiny/`: 360px, 390px, 430px passed; no horizontal overflow, no broken images, no media requests.

## Route: /saju/destiny-bias/stage

### Found Problems
- The stage page pulled `constants/loadingMessages` for locale normalization only.

### Source Files
- `app/saju/destiny-bias/stage/page.tsx`

### Fix Direction
- Replaced the shared loading-message import with a local locale helper and preserved locale change/storage listeners.

### Risk
- Low.

### Verification
- Build manifest: `/saju/destiny-bias/stage/page has8219=false`.
- Mobile CDP smoke: 360px, 390px, 430px passed; no horizontal overflow, no broken images, no media requests.

## Route: /yeon-star-hug

### Found Problems
- Yeon floating/timeline components still imported `constants/loadingMessages` only to normalize the active locale.
- The route manifest kept loading chunk `8219` even though the visible route did not need the shared loading-message payload.

### Source Files
- `components/yeon/YeonFloatingCharacter.tsx`
- `components/yeon/YeonMessageTimeline.tsx`

### Fix Direction
- Replaced the shared loading-message import with local `ko|en|ja|zh` locale helpers.
- Preserved existing language storage/change event behavior and visible Yeon copy.

### Risk
- Low.

### Verification
- `rg "constants/loadingMessages|getCurrentLoadingLocale|loadingMessages" components/yeon`: no matches.
- Build manifest after `npm.cmd run build`: `/yeon-star-hug` no longer includes chunk `8219`.
- `npm.cmd run typecheck`: passed.

## Route: /fortune-tea-house

### Found Problems
- The route client used `React.lazy`/`Suspense` in a way that failed prerendering.
- Billing client code was statically imported into the feature page even though it is only needed when the user starts the paid tea-house flow.
- Two overlay image URLs pointed at missing `nobackground/*-Photoroom.png` R2 paths, producing broken image requests.

### Source Files
- `app/fortune-tea-house/FortuneTeaHouseClient.tsx`
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`
- `src/features/fortune-tea-house/data/assets.ts`

### Fix Direction
- Switched the route shell to `next/dynamic({ ssr:false })`.
- Moved `runBillingCoinGate` to an on-demand dynamic import inside the existing billing gate function; billing inputs and policy order are unchanged.
- Replaced missing PNG overlay URLs with existing WebP R2 overlay assets.

### Risk
- Low to medium. The billing helper load timing changed, but the same billing gate and payload remain in use.

### Verification
- `npm.cmd run build`: `/fortune-tea-house` first-load JS `106 kB`, route size `1.65 kB`.
- Mobile CDP smoke for `/fortune-tea-house/`: 360px, 390px, 430px passed; no horizontal overflow, no broken images, no media requests.
- Focused URL probe: overlay requests now use `오버레이.webp` and `오버레이2.webp`; failed `*-Photoroom.png` requests are absent.

## Route: /

### Found Problems
- `openTarotModal()` waited for the large saju/tarot core chain before showing `#tarotModalOverlay`.
- On mobile, that made a tap feel unresponsive while `/js/saju-engine.js`, `/js/saju-engine-tarot-sukuyo-quantum.js`, and related runtime files loaded.

### Source Files
- `js/core/index-inline-runtime.js`
- `index.html`
- `scripts/verify-mobile-cdp-smoke.mjs`

### Fix Direction
- Changed `openTarotModal()` to show the modal immediately and continue preloading the core chain in the background.
- Preserved tarot mode setup after the core finishes loading.
- Bumped and synced the static runtime cache key: `build-120e592b3b81`.
- Stabilized the mobile smoke script to serve `dist` first, connect through `ws`, attach to `about:blank`, and use current mobile action selectors.
- Restored first-fold spacing with `#cdMobileDestinyHub .cd-mobile-hub__fold` so recommended cards begin below the mobile fold and do not compete with the fixed bottom nav.

### Risk
- Low. The modal display timing changed; tarot reading/category logic still runs through the same core loaders and handlers.

### Verification
- `npm.cmd run sync:public`: completed; root/public runtime marker `build-120e592b3b81`.
- `npm.cmd run verify:locale-main-sync`: passed.
- `npm.cmd run verify:runtime-cache-sync`: passed.
- `npm.cmd run build`: passed; generated static pages `1048/1048`.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`; primary CTA, tarot touch, bottom nav 5-tab tarot touch, payment pass button wiring all OK; initial audio/video elements `0`.

## Static Export and Postbuild Stability

### Found Problems
- Repeated build verification could preserve stale app-path manifest entries when a generated server page file no longer existed.
- `prepare-cloudflare-dist` and `promote-static-shell-to-root` walked generated output directories that can disappear during export/promote cleanup.
- Several route entries had too little static HTML for the current postbuild adsense/readiness verifier even though their client experience still hydrated correctly.

### Source Files
- `scripts/next-build-with-pages-manifest.mjs`
- `scripts/prepare-cloudflare-dist.mjs`
- `scripts/promote-static-shell-to-root.mjs`
- `scripts/verify-adsense-readiness.mjs`
- `app/life-book-ai/LifeBookAiRouteClient.tsx`
- `app/life-book-ai/page.tsx`
- `app/saju/love-simulation/page.tsx`
- `app/saju/animal-destiny/page.tsx`
- `app/saju/destiny-meeting-place/page.tsx`
- `app/ziwei/chart/page.tsx`

### Fix Direction
- Kept only manifest entries whose generated `.next/server` files actually exist.
- Made generated route collectors tolerate transient `ENOENT` reads while preserving required-file assertions.
- Restored stable static route text without changing paid flows, result generation, or route client behavior.

### Risk
- Low to medium. The changes affect verification/build plumbing, but production route behavior remains on the same route clients and worker policies.

### Verification
- `node scripts\verify-adsense-readiness.mjs`: passed.
- `npm.cmd run build`: passed; generated static pages `1048/1048`; postbuild `adsense-readiness OK`.

## Mobile Feature Coverage Verification

### Found Problems
- `scripts/verify-mobile-feature-coverage.mjs` passed by comparing corrupted feature-name strings against the same corrupted registry text.
- That made the check too weak to prove actual mobile entry coverage, route availability, action wiring, or mobile performance guards.

### Source Files
- `scripts/verify-mobile-feature-coverage.mjs`
- `PERFORMANCE_AUDIT.md`

### Fix Direction
- Replaced name-string matching with source-based checks for service `href` routes, route groups, critical mobile actions, and mobile performance markers.
- The verifier now checks `index.html`, `js/mobile-interaction-patch.js`, `styles/mobile-lite.css`, `app/music/_hooks/useMusicPlayer.ts`, `app/_lib/serviceSections.js`, `app/components/HomeServiceSections.tsx`, and `app/components/FeatureLandingPage.tsx`.
- The check covers mobile bottom navigation, payment lock UX, mobile feature cards, bottom-sheet detail UI, lazy/noncritical script loading, low-end skip guards, touch target sizing, safe viewport handling, hidden-overlay pointer safety, reduced-motion handling, and audio idle preload.

### Risk
- Low. This changed verification only; runtime behavior and payment/unlock logic were not changed.

### Verification
- `npm.cmd run verify:mobile-feature-coverage`: passed.
- Coverage result: service routes `42`, route groups `7`, critical actions `16`, mobile performance markers `15`.

## Route: / and /kkul-kkul-unse React landing shell

### Found Problems
- `app/HomeClient.js` imports `MainLandingPage`, so `app/components/MainLandingPage.tsx` is a live React landing source.
- `MainLandingPage.tsx` imported `constants/loadingMessages` only to resolve the active locale, pulling the shared loading-message module into the landing client path without using loading copy.
- `app/components/HomeServiceSections.tsx` had the same locale-only import pattern and is part of the mobile feature coverage source set.
- Root static mobile CSS had two competing fold rules. The later `mobile-home-consult-priority` rule reset `.cd-mobile-hub__fold` to `min-height:0`, which made `verify-mobile-cdp-smoke` fail `recommended cards begin below first mobile fold`.
- A still later `cd-mobile-brand-hierarchy-v20260702` mobile block reset the same `.cd-mobile-hub__fold` to `min-height:0`, so the first fold passed pre-build but regressed after the final static shell cascade.

### Source Files
- `app/HomeClient.js`
- `app/components/MainLandingPage.tsx`
- `app/components/HomeServiceSections.tsx`
- `index.html`

### Fix Direction
- Replaced the shared loading-message locale imports in the landing components with small local locale normalizers.
- Kept route copy, payment logic, unlock logic, auth logic, and fortune result logic unchanged.
- Changed only the later root mobile fold override to `min-height:calc(100svh - 72px - env(safe-area-inset-bottom,0px))!important`.
- Matched the later brand-hierarchy override to the same `100svh` fold height so it cannot undo the mobile first-fold spacing.

### Risk
- Low. The locale helpers preserve the same storage/runtime language keys; the CSS change only restores first-fold spacing for the existing mobile hub.

### Verification
- `rg "constants/loadingMessages|getCurrentLoadingLocale|normalizeLoadingLocale" app/components/MainLandingPage.tsx app/components/HomeServiceSections.tsx`: no matches.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with pre-existing warnings.
- `npm.cmd run verify:mobile-feature-coverage`: passed.
- `npm.cmd run sync:public`: completed; root/public runtime marker `build-4cccfdf14ab5`.
- `npm.cmd run verify:locale-main-sync`: passed.
- `npm.cmd run verify:runtime-cache-sync`: passed.
- `npm.cmd run build`: passed; generated static pages `1048/1048`.
- Pre-build official `npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`.
- Latest debug CDP smoke after rebuild: passed on `390x844`; primary CTA, tarot touch, bottom nav 5-tab tarot touch, payment pass button wiring, and initial audio/video count all OK.
- Non-debug Chrome launch remains flaky on this Windows desktop session because Chrome intermittently exits with GPU/DawnGraphite cache fatal errors before CDP page setup.

## Current Build and Encoding Verification

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with pre-existing warnings.
- `npm.cmd run build`: passed; generated static pages `1048/1048`; runtime cache key `build-717352ecac94`.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke`: passed on latest `dist/index.html` at `390x844`; primary CTA, tarot touch, bottom nav 5-tab tarot touch, payment pass button wiring, and initial audio/video count all OK.
- `npm.cmd run verify:mobile-cdp-smoke`: failed before page evaluation in non-debug mode because local Chrome exited with `GPU process isn't usable` / `DawnGraphiteCache` file-lock fatal errors.
- `npm.cmd run verify:mobile-feature-coverage`: passed; service routes `42`, route groups `7`, critical actions `16`, mobile performance markers `15`.
- `npm.cmd run verify:entry-encoding -- --strict-core`: passed.
- `npm.cmd run verify:locale-main-sync`: passed.
- `npm.cmd run verify:runtime-cache-sync`: passed.
- `git diff --check` on touched source/report/runtime files: passed; only Git line-ending warnings.
- Mojibake pattern scan on touched text files: no U+FFFD replacement character in content. Recorded expected exceptions:
  - `app/tarot/healing/TarotHealingClient.tsx:39` and `app/tarot/healing/TarotHealingLandingContent.tsx:236-373`: normal Vietnamese, Spanish, and French accented copy.
  - `app/components/ShareWidget.tsx:64`: Vietnamese copy contains normal `ê`.
  - `app/components/ShareWidget.tsx:69`: Dutch copy contains normal `ë`.
  - `index.html:67` and synced mirrors: SEO keywords contain normal Spanish `horóscopo` / `astrología`.
  - `PERFORMANCE_AUDIT.md`: this exception list contains the literal `\\uFFFD` marker for documentation only.

## Mobile CDP Verifier Stability Follow-up

### Found Problems
- Non-debug `npm.cmd run verify:mobile-cdp-smoke` still fails intermittently before app evaluation on this Windows desktop session because Chrome exits with a GPU/DawnGraphite persistent-cache fatal error during CDP setup.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke` reaches the page and passes all mobile assertions on latest `dist/index.html`, so the remaining instability is in local Chrome headless launch rather than the app assertions.

### Source Files
- `scripts/verify-mobile-cdp-smoke.mjs`
- `PERFORMANCE_AUDIT.md`

### Fix Direction
- Added CDP setup retries, target-list fallback, browser-target fallback, OS-assigned debug-port selection, direct `spawn` launch, stderr diagnostics, and `http.request` CDP JSON calls.
- Cleaned generated `code-destiny-mobile-cdp-profile-*` temp profiles after failed launches when Windows released the handles.

### Risk
- Low to medium. This affects verification tooling only, not production runtime behavior.

### Verification
- `node --check scripts/verify-mobile-cdp-smoke.mjs`: passed.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`.
- `npm.cmd run verify:mobile-cdp-smoke`: still fails intermittently before page evaluation with local Chrome GPU/DawnGraphite cache fatal errors.

## Route: /fortune-tea-house Follow-up

### Found Problems
- Route-level `React.lazy` and `next/dynamic({ ssr:false })` both produced a static-export prerender crash for `/fortune-tea-house`: `.next/server/webpack-runtime.js` attempted to require a module id that was not loaded during server render and threw `Cannot read properties of undefined (reading 'call')`.
- Build evidence after the build-safe direct route import showed `/fortune-tea-house` at `335 kB / 489 kB First Load JS`, making it the largest app route in the table.
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx` statically imported the tarot album, result sheet, tea-cup stages, debug panel, and reveal/loading scenes even though the first render only needs the immersive shell, landing scene, BGM toggle, and honey overlay.
- The closed `entryTransition` layer always rendered two `priority` background images (`loadingDesktop`, `loadingMobile`), so first entry could request transition imagery before the user tapped the tea-house CTA.

### Source Files
- `app/fortune-tea-house/FortuneTeaHouseClient.tsx`
- `app/fortune-tea-house/page.tsx`
- `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`

### Fix Direction
- Kept the route wrapper as a direct client import to preserve static export stability.
- Removed the server metadata import from `src/features/fortune-tea-house/data/assets.ts` and replaced it with the exact OG image URL constant.
- Moved tarot album, debug panel, tea-cup stages, question input, scent loading, tarot reveal, entry scene, and result sheet behind stage/open-state `React.lazy` boundaries.
- Added lightweight immediate fallbacks for scene and tarot album loading.
- Rendered the entry transition image layer only while `isEnteringTeaHouse` is true, preventing the closed layer from requesting the two transition backgrounds on initial load.

### Risk
- Low to medium. The change only moves feature UI import timing and hidden transition image mount timing; payment gate order, unlock policy, login/auth, and fortune result generation are unchanged.

### Verification
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed; static pages `1048/1048`.
- Build route table changed from `/fortune-tea-house` `335 kB / 489 kB First Load JS` after the direct-import build fix to `268 kB / 419 kB First Load JS` after stage and album lazy splits.
- `npm.cmd run lint`: passed with pre-existing warnings.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`; primary CTA, tarot touch, bottom nav 5-tab tarot touch, payment pass button wiring, and initial audio/video count all OK.
- `npm.cmd run verify:entry-encoding -- --strict-core`: passed.

## Route: /tarot/healing

### Found Problems
- `app/tarot/healing/TarotHealingLandingContent.tsx` imported `constants/loadingMessages` only for locale normalization.
- `app/tarot/healing/TarotHealingClient.tsx` imported the same shared module only to choose a small route loading string.
- This pulled the shared loading-message locale module into a tarot landing route that otherwise only needs a local language resolver.

### Source Files
- `app/tarot/healing/TarotHealingLandingContent.tsx`
- `app/tarot/healing/TarotHealingClient.tsx`

### Fix Direction
- Replaced the shared `constants/loadingMessages` import with a route-local locale normalizer.
- Kept healing tarot copy, tarot runtime component loading, payment policy, unlock policy, login policy, and fortune generation behavior unchanged.

### Risk
- Low. The helper preserves the same runtime language and localStorage key order used by the existing route.

### Verification
- `rg "constants/loadingMessages|getCurrentLoadingLocale|normalizeLoadingLocale" app/tarot/healing/TarotHealingLandingContent.tsx app/tarot/healing/TarotHealingClient.tsx`: no matches.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with pre-existing warnings.
- `npm.cmd run verify:mobile-feature-coverage`: passed.
- `npm.cmd run verify:entry-encoding -- --strict-core`: passed.
- `npm.cmd run build`: passed; static pages `1048/1048`; runtime cache key `build-717352ecac94`.
- `MOBILE_CDP_DEBUG=1 npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`.

Search keys used in this pass: `constants/loadingMessages`, `getCurrentLoadingLocale`, `normalizeLoadingLocale`, `/tarot/healing`, `verify-mobile-cdp-smoke`.

## Follow-up: Music, Tarot, Premium, R2 Cache, Payment Modal

### Found Problems
- `app/music/MusicPlayerExample.tsx` statically imported `MusicPlaylistPanel`, so the playlist/search/list UI stayed in the music player chunk even though the first mobile interaction can start from the featured player.
- `app/music/MusicRouteClient.tsx` and the tarot route clients used `next/dynamic` without a route loading fallback, leaving mobile users with a blank-feeling gap while route chunks arrive.
- `app/premium-unlock/PremiumUnlockClient.tsx` used a manual `useEffect` module import instead of a route-level dynamic boundary.
- `app/neo-operation-room/NeoOperationRoomClient.tsx` used `next/dynamic({ ssr:false })`, which reproduced the static-export prerender crash pattern seen earlier: `.next/server/webpack-runtime.js` threw `Cannot read properties of undefined (reading 'call')` for `/neo-operation-room`.
- Live R2 header checks found image range responses at `max-age=172800` and music mp3 responses with no `cache-control`; `apply-r2-cache-metadata.mjs` dry-run planned updates but local R2 S3 access key/secret credentials are not configured.
- The mobile CDP smoke only checked payment button wiring. When upgraded to tap the button, it found the payment modal opened with a document-height rect (`7716px`) instead of staying within the `390x844` mobile viewport.

### Source Files
- `app/music/MusicPlayerExample.tsx`
- `app/music/MusicRouteClient.tsx`
- `app/tarot/healing/TarotHealingRouteClient.tsx`
- `app/tarot/self-esteem/TarotSelfEsteemRouteClient.tsx`
- `app/tarot/mindscan/MindScanTarotRouteClient.tsx`
- `app/tarot/numerology/NumerologyTarotRouteClient.tsx`
- `app/tarot/prompt-maker/TarotPromptMakerRouteClient.tsx`
- `app/premium-unlock/PremiumUnlockClient.tsx`
- `app/neo-operation-room/NeoOperationRoomClient.tsx`
- `index.html`
- `scripts/verify-mobile-cdp-smoke.mjs`
- `scripts/verify-r2-public-cache-headers.mjs`
- `package.json`

### Fix Direction
- Moved `MusicPlaylistPanel` behind a dynamic boundary with a lightweight playlist fallback.
- Added lightweight mobile route fallbacks to music and the heavy tarot route wrappers.
- Converted the premium unlock wrapper to `next/dynamic` with the existing fallback.
- Replaced the `/neo-operation-room` `ssr:false` route dynamic wrapper with a direct client import to restore static-export stability.
- Added `verify:r2-public-cache` to measure public image/audio cache headers with HEAD and byte-range requests.
- Strengthened `verify-mobile-cdp-smoke` so offscreen targets are scrolled into view before touch dispatch and the mobile payment button must open a viewport-safe `role="dialog"` modal.
- Tightened the mobile golden-grain modal CSS in root `index.html` with explicit `position:fixed`, `inset:0`, `100dvh`, `max-height:100dvh`, and `overflow:hidden`; synced the marker to mirrors.

### Risk
- Low to medium. Route wrappers and loading boundaries affect import timing and perceived loading only. The `/neo-operation-room` wrapper change trades route-level lazy loading for build stability. Payment, unlock, membership pass, monthly credit, one-time payment, login, and fortune generation policies are unchanged.

### Verification
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with pre-existing warnings.
- `npm.cmd run build`: passed; static pages `1048/1048`; runtime cache key `build-eab15715b1e1`.
- Build route table: `/music` `1.59 kB / 106 kB`, `/premium-unlock` `1.62 kB / 106 kB`, `/tarot/healing` `1.49 kB / 106 kB`, `/tarot/numerology` `1.51 kB / 106 kB`, `/tarot/prompt-maker` `1.52 kB / 106 kB`, `/tarot/self-esteem` `1.5 kB / 106 kB`, `/neo-operation-room` `58.2 kB / 176 kB`.
- `npm.cmd run sync:public`: passed and propagated the mobile payment modal CSS marker to `public/static`, `public/en`, `public/ja`, and `public/zh`.
- `npm.cmd run verify:locale-main-sync`: passed.
- `npm.cmd run verify:runtime-cache-sync`: passed with `build-eab15715b1e1`.
- `npm.cmd run verify:mobile-cdp-smoke`: passed on `390x844`; primary CTA, tarot touch, bottom nav tarot touch, payment button wiring, payment modal touch, and initial audio/video count all OK.
- `npm.cmd run verify:entry-encoding -- --strict-core`: passed.
- `git diff --check` on touched follow-up files: passed; only Git line-ending warnings.
- Mojibake codepoint scan on touched follow-up files: expected exceptions only: normal U+00ED in Spanish SEO keywords and this report's documented exception list.
- `npm.cmd run verify:r2-public-cache`: failed by design against current live R2 headers: the checked mp3 files have missing `cache-control` and `max-age 0 < 2592000`.
- R2 metadata dry-run evidence:
  - assets `DestinyCafe/운명의 찻집.webp`, `인생 총람.webp`: planned `public, max-age=86400, stale-while-revalidate=604800`.
  - music `DestinyCafe/Moonlit Tea House.mp3`, `DestinyWar/White Lion.mp3`: planned `public, max-age=2592000, stale-while-revalidate=604800`.
  - apply is blocked locally because only endpoint/account env values are present; R2 S3 access key id and secret are not configured.
