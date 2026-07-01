# Mobile Screen Length Reduction Report

## 1. Scope

- Source edited: `index.html`
- Generated mirrors synced: `public/index.html`, `public/static/index.html`, `public/en/index.html`, `public/ja/index.html`, `public/zh/index.html`
- Policy unchanged: payment, unlock, login, pass, pricing, and fortune result generation logic were not modified.

## 2. Mobile Home Changes

| Area | Change |
|---|---|
| Hero compact | Removed forced full-height mobile hub, reduced fold gap, kept the primary CTA in the first screen |
| Duplicate helper CTA | Hid the duplicate two-button assist row and kept the four Quick Start actions |
| Quick Start | Preserved 무료 사주, 오늘의 타로, 오늘의 운세, 나의 운명 카드 as compact 2x2 actions |
| Category tabs | Kept the horizontal quick navigation visible in the first fold |
| Today cards | Forced a compact 2-column grid with 82px cards and thumbnail-only media |
| Moonlight Pass | Kept plan cards hidden by default, made the home pass block more compact, and preserved the plan bottom-sheet flow |
| Footer | Verified mobile business details start collapsed |

## 3. Collection Length Changes

| Rule | Implementation |
|---|---|
| One-line collection summaries | Existing mobile CSS keeps collection subtitles clamped to one line and hides long lede/feature lines |
| Card descriptions | Existing mobile card system clamps descriptions and uses small thumbnail cards |
| Maximum initial cards | Open mobile collections now show the first 4 cards only |
| More button | Added `cd-mobile-collection-more` button to reveal the remaining cards without removing any feature |
| Paid/free badges | Existing mobile card badge compaction remains active |

## 4. Browser Verification

Measured at `390x844` on the local static shell.

| Check | Result |
|---|---|
| Primary CTA position | top `188`, bottom `232`, height `44` |
| Mobile fold height | `367px` |
| Duplicate assist row | `display: none` |
| Quick Start visible actions | `4` |
| Today card grid | `148px 148px` columns |
| Today card heights | `82px` each |
| Moonlight plan details | hidden by default |
| Footer business details | closed by default |
| Tarot collection initial state | 12 total, 4 visible, 8 hidden |
| Tarot collection more button | `더 보기 8` visible |

## 5. Verification Commands

- `npm run sync:public`: pass
- `npm run verify:locale-main-sync`: pass
- `npm run verify:runtime-cache-sync`: pass, cache `build-11ae5bc63d0d`
- `npm run typecheck -- --pretty false`: pass
- Browser mobile check: pass

## 6. Markers

- `mobile-screen-length-v20260701`
- `mobile-collection-limit-v20260701`
- `cd-mobile-screen-length-priority-v20260701`
