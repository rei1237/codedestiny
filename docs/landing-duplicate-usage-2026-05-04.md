# Landing and Duplicate HTML Usage Classification (2026-05-04)

## Scope
- Root-level `*.html` files in repository root.
- Classification only (no delete/move in this pass).

## Method
1. Collect root `*.html` inventory.
2. Count cross-file references with `git grep` (exclude self-file hits).
3. Check whether each root file has a duplicated copy under `public/`.

## Inventory Summary
- Total root html files: 22
- Temporary artifacts (`_tmp_*`): 4
- Non-temp files analyzed: 18

## A. Keep (Active)
Files with meaningful internal references and/or active service linkage.

- `index.html` (refs: 308, public copy: yes)
- `celestial-harmony.html` (refs: 29, public copy: yes)
- `cosmic-soul-meditation.html` (refs: 35, public copy: yes)
- `destiny-poker.html` (refs: 37, public copy: yes)
- `fortune-teller-fish.html` (refs: 19, public copy: yes)
- `geomancy-oracle-v4.html` (refs: 24, public copy: yes)
- `myungwun_final.html` (refs: 13, public copy: yes)
- `neville-meditation.html` (refs: 21, public copy: yes)
- `royal-tea-oracle.html` (refs: 20, public copy: yes)
- `secret-house-final.html` (refs: 9, public copy: yes)
- `tadagochi.html` (refs: 10, public copy: yes)
- `tarot-ijik.html` (refs: 21, public copy: yes)
- `vedic-astrology.html` (refs: 19, public copy: yes)
- `yoga-guru.html` (refs: 21, public copy: yes)

## B. Keep but Monitor
Low-reference pages that may still be externally linked or legacy-routed.

- `ifa-oracle-about.html` (refs: 2, public copy: yes)

Action (next pass): verify real traffic/backlinks and route entry usage before any cleanup.

## C. Candidate for Archive (No Internal References)
No cross-file references found in repository at scan time.

- `ifa_oracle_v2_full.html` (refs: 0, public copy: no)
- `legacy_index_utf8.html` (refs: 0, public copy: no)
- `secret-house_real.html` (refs: 0, public copy: no)

Action (next pass):
- Move to archive folder or mark deprecated after traffic/log check.
- Do not delete directly in production branch without 7-day verification window.

## D. Temporary Artifacts (Safe Cleanup Candidate)
- `_tmp_4a5465f_index.html`
- `_tmp_7a_index.html`
- `_tmp_live_astro_context.html`
- `_tmp_live_snippet.html`

These are temporary by naming convention and had zero references.

## Duplicate Policy Recommendation
For files that exist in both root and `public/`:
- Treat `public/<file>.html` as deploy/runtime source for static serving.
- Keep root copy only if build/process explicitly requires it.
- If root copy is not required, migrate to single-source policy and enforce sync checks in CI.

## Notes
- This pass intentionally performed classification only to avoid regression.
- No content deletion, move, or route rewrite was executed in this pass.
