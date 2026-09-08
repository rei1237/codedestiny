# AdSense readiness delivery

- Worktree: `D:\Development\cd-adsense-readiness`
- Branch: `codex/adsense-approval-readiness-20260909`
- PR: https://github.com/rei1237/codedestiny/pull/1859
- Report: [README.md](README.md)
- Expert review packet: [review/index.html](review/index.html), all 20 pending.
- Production state: NOT READY, not deployed, no AdSense submission.

## Verified locally

- `npm run check:fast`: PASS, including lint, typecheck, sitemap drift, 987 Node tests, 221 Jest suites / 2442 tests, billing/pass/PortOne/resume/unlock static guards, Worker dry-run build and encoding.
- `node --test __tests__/ui/publisher-integrity.test.mjs`: 9 PASS, including production-origin review/ad gate.
- `node scripts/verify-publisher-browser.mjs`: 12 viewport/page combinations PASS with external network blocked; no ad requests.
- `impeccable detect` on hub/integrity/footer source: no findings.
- `node scripts/ensure-ads-txt.mjs --check`: PASS.
- `sync:public` and `sitemap:generate` completed. `verify:public-mirror-fresh` PASS after rebase to `495afa4b7`; generation leaves tracked mirrors unchanged.
- Frontend production build is deferred to required PR CI per project contract. This does not establish production behavior.

## Remaining gates

1. Required PR CI and conflict status for latest main.
2. Actual reviewer confirmation of manuscripts, dates and evidence; populate `CONTENT_REVIEWS` only after confirmation. `adsAllowed` is a separate decision. A future content revision must re-open review when its recorded manuscript hash changes.
3. Account ads.txt discrepancy: investigate crawl/account recheck; public 200 alone does not establish resolution.
4. Explicit merge/deployment authorization, then production SHA parity and public URL/rendering audit.
5. GSC link report: two observed external links, both to home; remaining page-level data and locale/editorial quality review are required before any broad deindex/deletion.

## Resume

```powershell
Set-Location D:\Development\cd-adsense-readiness
Get-Content docs/adsense/HANDOFF.md
git status --short
node scripts/build-editorial-review-packet.mjs
```

Do not restart in the shared checkout, replace unknown metrics with zero, manufacture reviewer approvals, merge or deploy without the applicable authorization. Keep this worktree until successful approved merge/staging verification.
