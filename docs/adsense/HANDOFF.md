# AdSense readiness delivery

- Worktree: `D:\Development\cd-adsense-readiness`
- Branch: `codex/adsense-core-editorial-20260909`
- Prior PR: https://github.com/rei1237/codedestiny/pull/1859 (merged externally; follow-up PR contains the 20-manuscript revision)
- Report: [README.md](README.md)
- Expert review packet: [review/index.html](review/index.html), 20 AI-edited; human review remains unconfirmed. See [findings](review/AI-EDITORIAL-REVIEW.md).
- Production state: NOT READY, not deployed, no AdSense submission.

## Verified locally

- `npm run check:fast`: PASS, including lint, typecheck, sitemap drift, 991 Node tests, 221 Jest suites / 2442 tests, billing/pass/PortOne/resume/unlock static guards, Worker dry-run build and encoding.
- `node --test __tests__/ui/publisher-integrity.test.mjs`: 11 PASS, including production-origin review/ad gate.
- `node scripts/verify-publisher-browser.mjs`: 30 viewport/page combinations PASS with external network blocked; no ad requests.
- `impeccable detect` on hub/integrity/footer source: no findings.
- `node scripts/ensure-ads-txt.mjs --check`: PASS.
- `sync:public` and `sitemap:generate` completed. `verify:public-mirror-fresh` PASS after rebase to `495afa4b7`; generation leaves tracked mirrors unchanged.
- Frontend production build is deferred to required PR CI per project contract. This does not establish production behavior.

## Remaining gates

1. Inspect latest PR CI and conflict status. `delivery:admit` additionally checks active worktree overlaps; the shared home/sitemap work must be integrated sequentially. Do not discard other worktree changes.
2. AI editing of all 20 selected manuscripts is complete. It does not establish personal review by the operator; populate `CONTENT_REVIEWS` only after confirmation. `adsAllowed` is a separate decision. A future content revision must re-open review when its recorded manuscript hash changes.
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

## AI editorial revision verification

`node scripts/verify-editorial-manuscripts.mjs` verifies fixed manuscript hashes, author schema, no human/ad escalation, and omission of unproven article lastmod. `sitemap:generate` retains 488 URLs. The worktree now has its own dependencies installed from its lockfile, not a shared node_modules junction. `npm run ci:preflight` produces SHA/tree-specific evidence in the worktree git directory; inspect its actual receipt/result rather than inferring PASS from this document. Latest-main overlap remains a separate admission condition.
