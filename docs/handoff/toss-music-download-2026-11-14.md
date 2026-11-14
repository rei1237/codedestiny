---
status: in-progress
updated: 2026-11-14
next: Run coordinator's actual Linux AIT --music-download flow, reconcile inventory and operational limits, then close this handoff.
---

# 첫 행동

Read `apps/toss/test/private-music.mjs` and coordinator's current build/test checkpoint. Coordinator owns private API/bootstrap/SDK/CLI and Linux AIT work; do not start a competing build. This music agent's code and targeted tests are complete. Actual AIT evidence was not yet received at handoff.

# 지금 상태

- Shared worktree: `D:/Development/codedestiny-worktrees/toss-launch-completion-20261114-165438`.
- Branch: `wt/toss-launch-completion-20261114-165438` (shared; do not remove/reset).
- Last music code commit: `4c44944e8`.
- Music commits: `1c2c90f76`, `245e7c523`, `4bc7ca407`, `5030be811`, `10097671d`, `6bc2c4d8b`, `4c39304bb`, `e38e1f1a1`, `4c44944e8`.
- No music-owned uncommitted code or temporary artifacts remain. Other agents' changes are not ours.

# 승인 상태

User asks complete web migration and actual AIT home-to-owned-result verification; maintain moonlight design. On 2026-11-14 user continued to withhold real payments and review requests. Parent explicitly requires no real LLM, payment, production DB writes, or remote audio downloads during development. New native music SKU/price lacks console evidence; no real products were added. Synthetic mock SKU costs 1 KRW solely inside isolated private simulation. Existing web 1000 KRW is not native console price evidence.

# 작업 규칙과 함정

- Preserve original free full-track playback, source MP3 bytes and artwork. No source song file in AIT; no transcoding.
- Original `lib/music-access-policy.js` and `worker/routes/music.js`: single-purchase/monthstone download rights remain; license/license_pass/monthly_subscription do not grant downloads. Web auth, pricing and rights unchanged.
- Native rights are separate account/environment/service-bound orders. A header cannot create native access: `native-context.js` WeakMap is server-bound only.
- Generic native model/catalog/routes/library wiring gained `music`; approved real product array remains unchanged/closed.
- Coordinator will run combined check:fast/pre-push/main CI. Do not duplicate broad gates. Do not claim actual AIT or real file save verified before evidence.
- Installed `@apps-in-toss/web-framework` 3.7.0 declaration at `dist/index.d.ts:1169` and runtime `dist/index.js:1084` exposes File.saveBase64 and File.openPDFViewer only. No URL/stream/append audio-save API in this installed SDK.
- **32 MiB native memory bound is an incomplete large-file transport capability, not a new purchase-policy limit.** Longer original meditation tracks may exceed it. No real originals fetched or measured. Large-track native saving is not complete; keep this explicit in inventory/report. Rights remain intact. UI distinguishes MUSIC_FILE_TOO_LARGE / SDK unsupported and tells user not to repurchase. Per-track console activation must include original size and physical-device save verification.

# 설계

- `worker/toss/music-download.js`: resolves canonical allTracks source-key/feature-key; stable owner-scoped intent via requestId=featureKey; only approved native catalog price (fallback 0 makes new sale fail closed); retained order recovery; metadata read PENDING for prepared owner, COMPLETED for paid; no LLM or generated faux report.
- Download: owner/input validation -> verifiedIntent (ledger/session/order/refund) -> WeakMap-bound original `/api/music/download` proxy -> bounded byte read -> verifiedIntent again -> base64 for native file bridge. Native authority is not decoded from user headers or cookies.
- `MusicShelf.tsx`, canonical music-shelf and d.ts add only source-key/feature-key metadata to original track projection. Free player/search/back stay intact. Track survives login next URL. Owned intent opens directly and restores saved track.
- `MusicDownload.tsx`: fresh native catalog/display-price comparison, remember intent before checkout, stable same-track preparation, recovery links, session remount, login preserving intent, unsupported/oversize messaging; platform adapters for purchase and File.saveBase64.
- `music-download-file.ts`: session revision verified before save; supported native SDK only; safe filename/mime/base64-size check.
- `private-simulation/music-download.mjs`: dependency injection `createMusicSimulation(tracks)`, per-track separate mock product, durable local order, A/B isolation/refund, no LLM. Exact fixture `SUQzBAAAAAAAAA==`, `audio/mpeg`, `모의-음악-저장-검증.mp3` (explicit synthetic ID3 header, not original music).
- Coordinator connected DI in api/bootstrap/SDK. Private SDK only records exact synthetic save to localStorage `private-file-saves` with simulated:true; it does not write device files. Other export payloads fail closed.

# 소유 파일

Music agent: `apps/toss/src/MusicShelf.tsx`, `MusicDownload.tsx`, `music-download-file.ts`, `music-shelf.d.ts`, `apps/toss/canonical/music-shelf.ts`, `worker/toss/music-download.js`, `apps/toss/private-simulation/music-download.mjs`, dedicated music tests. Shared changes committed: `worker/routes/music.js`, `worker/toss/{models,native-consultation,native-tea,routes,unified-records}.js`.
Coordinator: private API/bootstrap/sdk, `private-music.mjs` actual AIT runner, inventory, build/CI/delivery.

# 검증

Passed targeted music tests (12 tests across 7 files):
- `node --test apps/toss/test/music-download.test.mjs` (4)
- `node --test apps/toss/test/music-shelf.test.mjs` (2)
- `node --test apps/toss/test/music-download-ui.test.mjs` (1; rerun after final cleanup/login fix)
- `node --test apps/toss/test/music-download-private.test.mjs` (2)
- `node --test apps/toss/test/music-download-file.test.mjs` (1)
- `node --test apps/toss/test/private-music-file-sdk.test.mjs` (1)
- `node --test apps/toss/test/music-original-download-boundary.test.mjs` (1)

Also `native-purchase-model.test.mjs` 13/13 including music and `native-product-titles.test.mjs` 2/2. Toss `tsc --project apps/toss/tsconfig.json --noEmit --pretty false` passed before final UI wording/cleanup changes; combined final typecheck belongs to coordinator. Installed impeccable `detect apps/toss/src/MusicDownload.tsx apps/toss/src/MusicShelf.tsx` exited 0. No real remote music was downloaded. No real device write was performed.

# 단계

- [x] Original web policy/source and native adapters traced.
- [x] Native owned download and recovery implemented/committed.
- [x] Original free player + download UI + private mock implemented/committed.
- [x] Account/refund/header/price/source/session/native-file tests passed.
- [ ] Actual Linux AIT home -> music -> first track -> mock login -> one mock purchase -> synthetic save -> reopen archive -> same owner download, B same URL denial, 360/390/430 widths (coordinator runner ready).
- [ ] Final combined gates/main CI, Linux AIT/private QR and feature inventory update (coordinator).
- [ ] Operational gate: correct per-track console SKU/price/evidence; large-file bridge capability; real Android/iOS file-save support/size tests. No real activation authorized by this handoff.
