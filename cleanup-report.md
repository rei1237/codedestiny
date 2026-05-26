# Cleanup Report

## Deleted
- path: _tmp_a672_saju_engine.js
	reason: temporary root probe file, no production reference
- path: _tmp_ae18d21_index.html
	reason: temporary root probe file, no production reference
- path: _tmp_build_full.log
	reason: temporary log artifact
- path: _tmp_detect_grid.py
	reason: temporary analysis script, outside runtime/import path
- path: _tmp_detect_rows.py
	reason: temporary analysis script, outside runtime/import path
- path: _tmp_disable_resp.json
	reason: temporary debug payload
- path: _tmp_extract_cards.mjs
	reason: temporary extraction helper
- path: _tmp_ganji_crop_preview.png
	reason: temporary screenshot/debug image
- path: _tmp_ganji_preview.py
	reason: temporary probe script
- path: _tmp_head_index.html
	reason: temporary html snapshot
- path: _tmp_head_index_utf8.html
	reason: temporary html snapshot
- path: _tmp_head_premium.js
	reason: temporary js snapshot
- path: _tmp_head_premium_utf8.js
	reason: temporary js snapshot
- path: _tmp_head_raw_premium.js
	reason: temporary js snapshot
- path: _tmp_index_223d56b.html
	reason: temporary index variant
- path: _tmp_index_2b7361d.html
	reason: temporary index variant
- path: _tmp_index_2b7361d_utf8.html
	reason: temporary index variant
- path: _tmp_index_778.html
	reason: temporary index variant
- path: _tmp_index_778_u8.html
	reason: temporary index variant
- path: _tmp_premium_head.js
	reason: temporary premium snapshot
- path: _tmp_premium_head2.js
	reason: temporary premium snapshot
- path: _tmp_premium_recovery_probe.mjs
	reason: temporary premium probe
- path: _tmp_premium_stage.js
	reason: temporary premium stage file
- path: _tmp_premium_stage2.js
	reason: temporary premium stage file
- path: _tmp_sukuyo_only.patch
	reason: temporary local patch artifact
- path: _tmp_sy_aa8a367_public.js
	reason: temporary sync snapshot
- path: _tmp_sy_aa8a367_public_raw.js
	reason: temporary sync snapshot
- path: _tmp_ppt_review
	reason: temporary ppt analysis directory
- path: _tmp_run_24673404984_logs
	reason: temporary runtime logs directory
- path: _tmp_worker_bundle
	reason: temporary worker bundle directory
- path: _tmp_worker_bundle2
	reason: temporary worker bundle directory
- path: js/engines/ziwei-doushu.js.bak
	reason: tracked backup file, no reference found, source file not in active runtime path
- path: public/js/engines/ziwei-doushu.js.bak
	reason: tracked backup file, no reference found

## Archived
- none

## Kept
- path: wrangler.toml
	reason: production Cloudflare worker deployment config
- path: wrangler.assets.toml
	reason: production assets deployment config
- path: package.json
	reason: required build/runtime scripts and dependency graph
- path: package-lock.json
	reason: lockfile integrity for reproducible build
- path: ads.txt
	reason: SEO/ads compliance file
- path: robots.txt
	reason: SEO crawler control
- path: sitemap.xml
	reason: SEO indexation
- path: app/api/auth/*
	reason: auth/login/session critical path
- path: app/api/billing/*
	reason: payment and coin/billing critical path
- path: app/api/premium/*
	reason: premium PDF and paid pipeline route surface

## Risky but untouched
- path: app/components/**
	reason: knip/ts-prune reports contain high false-positive risk with Next App Router and dynamic rendering
- path: worker/lib/**
	reason: premium/pdf/auth runtime dynamic usage and worker route binding risk
- path: app/_lib/**
	reason: many files appear unused by static analysis but can be loaded through runtime path resolution
- path: public/js/**
	reason: mirrored static runtime files managed by sync scripts and index shell references

## Build/Test Result
- typecheck: pass (exit 0)
- lint: fail (exit 1, pre-existing lint backlog; unchanged scope)
- build: pass (exit 0)

## Manual Verification
- auth: not fully executed manually in this pass (no auth route logic/code edited)
- billing: not fully executed manually in this pass (no billing route logic/code edited)
- pdf: not fully executed manually in this pass (no pdf engine/route logic edited)
- deploy: build/export pipeline pass confirmed; worker/pages live deploy not executed in this pass
