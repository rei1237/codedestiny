# Mobile Feature Entry Performance Checklist

Updated: 2026-05-18
Scope: Main static shell feature-entry flow on mobile touch devices
Primary runtime: index.html + js/core/index-inline-runtime.js

## 1) Test Environment
- Device class A: mid/high Android (8GB RAM, 5G/Wi-Fi)
- Device class B: low/mid Android (4GB RAM, 4G)
- Browser: Chrome latest stable (no extensions)
- Network profiles:
  - Profile 1: Wi-Fi (good)
  - Profile 2: Fast 4G
  - Profile 3: Slow 4G (optional stress)
- Build mode: production build output, no dev server

## 2) Instrumentation Signals (Dev-only)
Enable one of:
- URL query: ?cdPerfDebug=1
- Host: localhost/127.0.0.1/::1
- Global flag: window.__cdPerfDebug = 1

Required console markers:
- [Perf] main screen first render
- [Perf] mobile tap latency
- [Perf] feature click
- [Perf] feature module loaded
- [Perf] feature screen ready
- [Perf] api start
- [Perf] api end
- [Perf] duplicate API prevented

## 3) Measurement Procedure
1. Open target screen with cleared cache.
2. Wait until first paint is stable.
3. Tap one feature entry tile once.
4. Capture these durations per attempt:
   - click_to_module_loaded: feature module loaded - feature click
   - click_to_screen_ready: feature screen ready - feature click
   - tap_latency: mobile tap latency
5. Repeat 10 runs per feature (cold 3 + warm 7).
6. Execute for at least 5 high-traffic feature entries.
7. During each run, verify no duplicate GET bursts for:
   - /api/auth/me
   - /api/billing/balance
   - /api/fortune/pig-coin/balance
   - /api/subscription/status

## 4) Pass Thresholds
Wi-Fi profile:
- tap_latency p95 <= 110ms
- click_to_module_loaded p50 <= 650ms, p95 <= 1100ms
- click_to_screen_ready p50 <= 1200ms, p95 <= 1900ms

Fast 4G profile:
- tap_latency p95 <= 130ms
- click_to_module_loaded p50 <= 900ms, p95 <= 1500ms
- click_to_screen_ready p50 <= 1700ms, p95 <= 2600ms

Stability:
- duplicate API prevented count should not increase continuously on single tap flow
- no stuck overlay state after feature load completion
- no auth/payment regression (login-required, insufficient-balance paths intact)

## 5) Regression Safety Checks
- Auth guard markers remain present in root and mirrored shells.
- Coin deduction and subscription-gate behavior unchanged.
- Feature entry remains functional on both desktop and mobile.
- Locale/public sync checks pass before release.

## 6) Evidence Template (Per Feature)
- Feature key:
- Device/network:
- Run count:
- tap_latency (p50/p95):
- click_to_module_loaded (p50/p95):
- click_to_screen_ready (p50/p95):
- Duplicate API prevented logs:
- Notes (jank, visual delay, fallback behavior):

## 7) Quick Acceptance Decision
- PASS: all thresholds met on Wi-Fi + Fast 4G and no functional regression
- CONDITIONAL PASS: only p95 misses within +15%, no UX breakage
- FAIL: repeated threshold misses or any auth/payment/feature-entry regression
