# Mobile Performance Optimization Report

## 1. Actual File Metrics

Measured from `index.html` after the mobile UI work and before final sync.

| Item | Before | After |
|---|---:|---:|
| HTML size | 1471.4 KB | 1471.9 KB |
| Approx DOM tags | 4033 | 4033 |
| Eager local JS | 14 files / 787.0 KB | 14 files / 792.4 KB |
| Noncritical JS | 13 files / 428.9 KB | 13 files / 428.9 KB |
| Mobile delay level 2 noncritical JS | 0 key heavy files | 6 key heavy files |
| Lazy feature JS | 6 files / 175.4 KB | 6 files / 175.4 KB |
| Images | 41 | 41 |
| Lazy images | 37 | 38 |
| Eager or auto images | 4 | 3 |
| Missing width/height | 0 | 0 |
| Missing decoding | 3 | 0 |
| Audio tags in home | 0 | 0 |
| Source tags with src in home | 0 | 0 |
| Background-image URL rules | 4 | 4 |

## 2. Initial Loading Changes

| Target | Previous State | Change |
|---|---|---|
| `UNSETAMA2.webp` card image | Offscreen card was `loading="eager"` | Changed to `loading="lazy"`, `fetchpriority="low"`, and mobile `sizes` |
| Hidden payment loader sprite | Logo background matched the hidden overlay | Scoped the background image to `#sajuLoaderOverlay[aria-hidden="false"]` |
| Heavy noncritical scripts | Juyuk, Sibyl, scroll helpers could load after first feature-intent tap | Moved them to `data-cd-mobile-delay="2"` with low-end skip |
| Mobile media hints | Static images without `sizes` remained uncorrected at runtime | Added mobile runtime media guard for `sizes`, lazy loading, decoding, and media `preload="none"` |
| Mobile blur/filter cost | Bottom sheet and payment overlays used heavier blur on mobile | Reduced mobile backdrop blur and disabled blur on preview chips/backdrop |

## 3. Audio and Music

| Area | Finding | Change |
|---|---|---|
| Home shell | No `<audio>` tags and no `<source src>` tags | No audio download on home initial render |
| Music player hook | `new Audio()` is created with `preload="none"` and `src` is assigned inside playback | Existing user-gesture policy preserved |
| Playlist manifest | `app/music/_data/musicManifest.ts` contains 101 `.mp3` entries | No audio URL is assigned to an audio element before play |
| Playlist rendering | Filtered playlist rendered all matching tracks | `MusicPlaylistPanel` now renders first 10 tracks and adds 10 more per tap |

## 4. Sprite and Animation

| Area | Finding | Change |
|---|---|---|
| Payment sprite | Sprite/logo CSS was present in the initial document | Background image now applies only while the overlay is open |
| Hidden overlay animation | Hidden loader descendants could keep animation state | Mobile runtime pauses hidden loader animation state |
| Reduced motion | Some mobile preview/loader motion still animated | Added reduced-motion guards for music stars, loader sprite, preview hero animation |

## 5. Files Changed

| File | Purpose |
|---|---|
| `index.html` | Mobile performance attributes, lazy script delay, hidden sprite lazy scope, cache key marker |
| `js/mobile-interaction-patch.js` | Mobile media preload/sizes guard and mobile motion/blur guards |
| `app/music/MusicPlaylistPanel.tsx` | First 10 playlist item rendering with incremental load |
| `app/music/moon-music-player.module.css` | Playlist more button styling |

## 6. Verification Log

- `node --check js/mobile-interaction-patch.js`: pass
- `npm run typecheck -- --pretty false`: pass
- `npm run sync:public`: pass
- `npm run verify:locale-main-sync`: pass
- `npm run verify:runtime-cache-sync`: pass, runtime cache hash `build-a79e2a606633`
- `npm run verify:entry-encoding -- --strict-core`: pass
- Mojibake scan on changed text files and synced mirrors: pass
- `git diff --check`: pass, line-ending warnings only in the two touched music route files
- Protected login markers verified in root and synced mirrors: pass
- Mobile browser home check at `390x844`: 89 images marked by the mobile media guard, 87 lazy images, 2 eager images, 0 missing `decoding`, 0 missing `sizes`, 0 audio tags, 0 audio resource requests, hidden loader sprite background `none`
- `/music` route browser render check: blocked by existing Next dev artifact `Cannot find module './vendor-chunks/framer-motion.js'`; TypeScript validation passed and playlist rendering was verified at code level

## 7. Remaining Performance Notes

- The largest eager JS files remain `index-inline-runtime.js` and `destiny-profile.js`. They are tied to home runtime/auth/profile behavior and were not split in this pass to avoid payment/auth/profile regressions.
- The home document still contains many hidden modal/result nodes. Previous lazy-mount guards reduce interaction cost, but full route extraction remains the deeper structural optimization.
- Static image `sizes` still has legacy gaps, but the mobile runtime guard normalizes those after boot and all images now have width/height and decoding.
- Mobile patch include key verified in root and mirrors: `mobile-perf-media-guard-v20260701`, `/js/mobile-interaction-patch.js?v=build-20260701-mobile-perf-lite`
