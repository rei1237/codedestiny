# 문서 우선순위 · 가드 무결성 · 워커 크기

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Doc Precedence

- For Codex work, `AGENTS.md` is the active execution contract.
- `docs/CURRENT_DEV_BASELINE.md` is the latest working summary for current service development focus.
- 🔴 [docs/guard-integrity-2026-08-13.md](../guard-integrity-2026-08-13.md) — **가드가 초록불인데 아무것도 안 지키던 사례 모음(G-1~G-8).** 가드를 만지거나 검증기를 지우기 전에 읽을 것. **8건 모두 조치 완료**(G-1~G-7 은 2026-08-14 실측 재확인): 빌드 산출물 오인은 `isBuildArtifactDir()` 제외로, 배선 누락과 `deploy:critical`↔paid-flow-gates 커버리지 차이는 `scripts/verify-guard-wiring.mjs`(fail-closed 3방향)가 `pr-ci.yml` 에 배선되어 각각 막는다.
  - **G-8(2026-08-15)**: `verify:mobile-cdp-smoke` 가 `dist/index.html` 이 있으면 신선도를 안 보고 무조건 그걸 서빙해, 소스를 고쳐도 옛 셸을 검사하며 조용히 통과했다. 지금은 서빙 대상이 명시적이다 — **`MOBILE_CDP_TARGET=source`(기본)** 는 레포 루트를, `dist` 는 산출물을 서빙하되 `index.html`·`js/**`·`styles/**` 중 하나라도 더 새로우면 **실패**한다. 🔴 "있으면 쓴다"로 되돌리지 말 것.
    - 루트를 서빙하므로 **Next 라우트는 파일로 존재하지 않는다.** 새 단언은 "그 URL 에 도달했는가"가 아니라 `window.__cdLastMobileAction`(액션 발화 기록)을 축으로 쓸 것.
    - 이 가드는 `UNWIRED_BY_DESIGN`(`scripts/verify-guard-wiring.mjs`) 에 선언된 **로컬 전용**이다. 모바일 셸의 탭·스크롤 동작을 고쳤으면 손으로 한 번 돌린다.
  - **미배선 검증기 수를 문서에서 세지 말 것** — 손으로 센 값이 두 번 틀렸다. 정본은 `npm run verify:guard-wiring` 의 출력이고, 미배선은 사유와 함께 그 스크립트의 `UNWIRED_BY_DESIGN` 에 선언한다.
  - 🔴 **워커 크기 예산은 유료 플랜 기준 10 MiB 다** (2026-08-23 정정 — 예전 서술의 "3 MiB / 78.7%"는 무료 플랜 기준이라 폐기). 판정 정본은 `scripts/verify-worker-size-budget.mjs` 의 `CF_PAID_LIMIT_BYTES`(기본 예산) 이고, 무료 한도 3 MiB 는 참고용 상수로만 남아 있다. 환경변수 `CF_WORKER_MAIN_BUDGET_BYTES` 로 덮을 수 있다.
    - **실측 2026-08-23: gzip 2.39 MiB = 예산의 23.9%** (무료 한도로 환산하면 79.7%). 재현: `npm run build:worker && npm run verify:worker-size`.
    - 🔴 **이 숫자도 그날의 측정값이다** — 워커에 무언가를 더하기 전에 다시 잰다(가드는 예산의 90% 부터 경고).
    - 여유가 마르면 볼 곳(2026-08-14 gzip 기여도 실측): `lib/tarot` 343 KB · `mongoose` 196 KB · `mongodb` 178 KB · `lunar-javascript` 111 KB · `swisseph.wasm` 252 KB. **raw 크기로 고르지 말 것** — `@mongodb-js/saslprep` 은 raw 553 KB 인데 gzip 기여는 6 KB 다.
  - 🔴 **`worker/wrangler.toml` 의 `minify = true` 를 지우지 말 것.** 지우면 즉시 97% 로 돌아간다. `--minify` 를 플래그로 옮기지도 말 것 — 프로덕션 업로드(`wrangler versions upload`)와 크기 측정(`build:worker`)이 각각 다른 명령이라, 설정 파일이 아니면 한쪽만 고쳤을 때 **가드가 프로덕션이 안 쓰는 값을 잰다.**
- `CLAUDE.md` is project context and reference material.
- If these docs disagree, do not merge the rules silently. Reconcile the mismatch in `docs/CONTEXT_AUDIT.md` before coding.
