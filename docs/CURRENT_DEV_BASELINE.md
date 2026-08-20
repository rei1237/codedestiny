# Current Dev Baseline

Last curated: `2026-08-15`

## Curation Rules

1. This document is the only time-sensitive working summary for current development.
2. Keep only repo facts that are directly useful for the current working tree and the active service roadmap.
3. Prefer current code, current tests, and root operating docs over historical audits or generated reports.
4. Exclude these paths from default reference unless the user explicitly asks for them:
   `.claude/worktrees/**`, `.codex-worktrees/**`, `.cleanup/**`, `reports/**`, `docs/performance-audit/results/**`
5. If a detail is no longer actionable for current development, remove it here and keep it only as historical evidence elsewhere when needed.

## Active Sources

- Execution contract: `AGENTS.md`
- Current working summary: `docs/CURRENT_DEV_BASELINE.md`
- Project operating context: `CLAUDE.md`
- Conflict and exception log: `docs/CONTEXT_AUDIT.md`
- Structure references: `docs/SERVICE_STRUCTURE.md`, `docs/FEATURE_MAP.md`, `docs/ROUTE_MAP.md`
- Risk and platform references: `docs/PAYMENT_AND_ACCESS.md`, `docs/LLM_AND_AI_POLICY.md`, `docs/DEPLOYMENT_AND_INFRA.md`, `docs/DEBUGGING_GUIDE.md`

## Current Focus

### 1. Billing, access, and pass safety

- Source files: `worker/routes/billing.js`, `worker/routes/payments.js`, `worker/lib/paid-feature-registry.js`, `worker/lib/billing-policy.js`, `worker/lib/profile-limits.js`, `worker/lib/payment-refund.js`
- Why it matters now: current work keeps touching purchase entry, pass coverage, entitlement repair, and access-policy enforcement. Server policy remains the final authority.

### 2. Session, profile, and points state consistency

- Source files: `app/_lib/auth-client.ts`, `app/_lib/auth-store.ts`, `app/_lib/user-session-cache.ts`, `app/_lib/consultationResultPolling.ts`, `js/destiny-profile.js`, `app/points/PointsClient.tsx`, `app/points/history/PointHistoryClient.tsx`, `worker/lib/auth.js`, `worker/lib/db.js`
- Why it matters now: sign-in state, profile hydration, points history, and client/server state repair are still active regression areas.
- Profile card CRUD lives only in the static shell (`js/destiny-profile.js`, mirrored to `public/js/`). The React `/me` duplicate was removed; `/points` and `/points/history` own subscription and payment history, and the mobile "마이" tab routes to the shell via `/?action=dpOpenList`.

### 3. Premium tarot yearly experience

- Source files: `lib/tarot/tarot-year-premium.mjs`, `worker/routes/tarot.js`, `app/tarot/year/page.tsx`, `js/tarot-year-fortune-experience.js`, `styles/tarot-year-fortune.css`, `__tests__/worker/tarot-year-premium.test.js`
- Why it matters now: the yearly tarot premium flow spans content generation, UI entry, server response shape, and regression tests as one active surface.

### 4. Static shell and runtime sync

- Source files: `index.html`, `js/core/index-inline-runtime.js`, `js/core/uiBindings.js`
- Why it matters now: the root shell is still the live home source of truth, and mirror sync remains a recurring regression risk.

### 5. PR-based delivery safety

> 🔴 **2026-08-20 정정.** 아래는 요약이며 **계약 정본은 `AGENTS.md` §Delivery 하나다** — 여기에 상세를 복제하지 않는다(중복이 곧 다음 드리프트다).

- Source files: `AGENTS.md`, `scripts/lib/change-risk.mjs`, `scripts/lib/production-deploy-guard.mjs`, `.github/workflows/pr-ci.yml`, `.github/workflows/cloudflare-pages-deploy.yml`
- 🔴 **2026-08-20 컷오버(커밋 `80d3660c1`)로 "머지가 곧 라이브"는 더 이상 맞지 않는다.** 흐름: **브랜치 → 커밋 → push → PR → PR CI → 사용자가 Merge → 그 SHA 가 스테이징(`staging.code-destiny.com`, DB 분리)에 자동 배포.** 프로덕션(`code-destiny.com`)은 사람이 `workflow_dispatch(mode=production)` 을 수동 실행해야 승격된다 — main HEAD 보다 뒤처져 있는 것이 정상 상태다. 일일 운세 재발행만 예외로 프로덕션을 직접 건드린다.
- `main` 직접 push 는 브랜치 룰셋이 막고, 로컬 프로덕션 배포는 `production-deploy-guard.mjs` 가 막는다. 로컬에 남는 것은 `deploy:check`(업로드 없음)·`deploy:preview`(흐름 밖 도구)·`deploy:smoke` 뿐이다.
- PR CI 강도는 변경 경로가 정한다(`fast` / `standard` / `critical`). 판정 정본은 `scripts/lib/change-risk.mjs` 하나이며, `deepRequired`(인증·결제·DB 스키마·배포 파이프라인)는 `level` 과 무관하게 전체 회귀를 강제한다.
- 병렬 세션은 각자 워크트리를 쓰고 각자 PR 을 연다. 머지는 GitHub 에서만 한다.

### 6. SEO 와 서비스 안정성 (2026-08-14 — 새 우선 축)

기능은 충분히 만들었다. 앞으로의 작업 축은 **색인·크롤 가능성**과 **실패했을 때 사용자에게 보이는 것**이다. 아래는 진입점 기록이며 **해결책은 적지 않는다** — 각 항목은 착수 시점에 실측하고 결정한다.

**SEO — 자동으로 지켜지는 것과 아닌 것**

- 지금 CI 에서 **자동으로 도는 SEO 게이트는 둘뿐**이다: `verify-adsense-readiness`(postbuild, 라우트별 렌더 텍스트 분량 미달 시 빌드 실패)와 `verify:sitemap`(`cloudflare-pages-deploy.yml`).
- `seo:check`(프로덕션 URL 200 확인) · `seo:audit`(메타·canonical 리포트) · `verify:seo-entity-registry` 는 **어느 워크플로에도 배선돼 있지 않다.** 마지막 것은 `scripts/verify-guard-wiring.mjs` 에서 "수동"으로 선언돼 있다. 배선 여부는 게이트 추가이므로 사용자 승인 사항이다.
- **`scripts/seo-audit.mjs` 의 색인 대상 정본은 배열이 아니라 사이트맵이다** (2026-08-14 에 전환됨, 2026-08-15 재확인). 예전에는 하드코딩 목록이 판정을 지배해 **이슈 11건 중 10건이 거짓**이었고, 그래서 목록을 고치는 대신 사이트맵에서 유도하도록 바꿨다. 남은 `seedIndexablePaths`(`:26~`)는 **판정 기준이 아니라** ①사이트맵을 못 읽었을 때의 폴백 ②사이트맵과 어긋나면 이슈로 신고해 목록이 다시 썩지 않게 하는 장치다. 🔴 그 seed 를 "색인 대상 정본"으로 다시 취급하지 말 것.
- 라우트를 추가할 때는 `canLoadAdsense()` 기준 게재 가능 여부에 따라 sitemap self-canonical 정합과 최소 렌더 텍스트 분량이 배포를 막는다는 점을 먼저 본다(CLAUDE.md "SEO 콘텐츠 게이트" 절).

**안정성 — 지금 가장 얇은 곳**

- **워커 번들: 무료 플랜 한도의 78.7%**(gzip 2.36 / 3 MiB, 여유 0.64 MiB — 2026-08-14 실측). 2026-08-14 이전에는 97.0%(여유 0.09 MiB)로 다음 워커 추가가 PR CI 를 막는 위치였고, `worker/wrangler.toml` 에 `minify = true` 를 켜서 해소했다. `worker/` 에 무언가 더하기 전에 `npm run build:worker && npm run verify:worker-size` 로 다시 잰다.
  - **다음에 여유가 다시 마르면 볼 곳** (2026-08-14 gzip 한계 기여도 실측): `lib/tarot` 343 KB(예산 11.2%) · `mongoose` 196 KB · `mongodb` 178 KB · `lunar-javascript` 111 KB · `swisseph.wasm` 252 KB. 🔴 **raw 크기로 고르지 말 것** — `@mongodb-js/saslprep` 은 raw 553 KB 인데 gzip 기여는 6 KB 다(반복 유니코드 테이블). 예산이 gzip 이므로 순위가 완전히 뒤바뀐다.
- 가드 무결성 7건(G-1~G-7)은 모두 조치됐다. 재발 방지는 `verify:guard-wiring`(배선 누락 fail-closed)과 `verify:auth-changed-coverage`(리스너 전수 발견)가 맡는다 — 이 둘을 약화시키는 변경은 하지 않는다.
- 머지된 작업이 스테이징에 도달하지 못하는 조용한 실패는 `landing-watchdog.yml` 이 이슈 하나로 모은다(스택 PR 좌초 · 릴리스 런 취소 · 드리프트). 🔴 2026-08-20 컷오버 이후 감시 대상은 **스테이징**이다 — 프로덕션은 정상적으로 뒤처져 있으므로 프로덕션 기준으로 보면 영구 red 이슈가 된다.

### 7. LLM 토큰 사용량 (2026-08-15 — 사용자 지시로 착수)

방침은 **출력 분량(결제 계약) 유지, 낭비만 제거**다. 분량 상수(`SAJU_AI_MIN_RESULT_CHARS` 등)는 건드리지 않는다.

- **입력이 출력보다 비싼 기능이 있다.** 사주 AI 상담 1건은 LLM 5회 × 각 10만자 = 입력 50만자인데 출력은 15,200자였다. 최적화 판단은 출력 단가($2.5/1M)만 보지 말고 **총량**으로 한다.
- 계측은 이미 있다 — `lib/llm-client.ts` 의 `[llm token_usage]` 로그를 `scripts/report-llm-token-usage.mjs` 가 라우트별로 집계한다(`cacheHit`·`duplicateBlocked`·`providerCallCount`·`cachedContentTokenCount` 포함). **전후 동일 방식 재실행이 이 스크립트의 설계 용도다.**
- 🔴 **캐시를 새로 배선할 때는 `cache.minChars` 를 함께 준다.** `withLLMCache` 의 저장 조건은 `!truncated` 뿐이라, 잘리지 않았지만 분량 미달인 응답이 TTL 30일 동안 굳는다. 실패 후 재생성이 같은 키에서 같은 미달을 다시 받는다. 직전 시도가 실패였으면 `skipRead` 도 함께(쓰기는 유지 — 성공한 재생성이 스스로 덮어쓴다).
- 🔴 **사주 그룹 프롬프트의 배열 순서(`worker/routes/fortune.js` `buildSajuAISectionPrompt`)는 불변 접두사 → 가변 접미사다.** Gemini 암묵 캐싱은 공통 **접두사**에만 걸린다. 뒤집으면 6만자가 정가로 돌아간다.
- 🟡 **넘긴 작업 2건 — 둘 다 미해결이다.**
  - 숙요 궁합의 서버측 중복 생성 창(`findOne`~`create` 사이 60~100초, 중복 1회 = LLM 6회)은 스키마·계약 변경이 함께 필요하다 → [docs/handoff/sukuyo-duplicate-generation-window.md](handoff/sukuyo-duplicate-generation-window.md)
  - 프롬프트 JSON 덤프를 섹션이 쓰는 만큼만 싣기(사주 기준 남은 덤프 47,105자, 그중 `earthStorageOpenings` 하나가 9,853자). 사주 5그룹에 `evidenceRefs` 선언이 없어 새 설계가 필요하고, **모델이 보는 정보를 줄이는** 작업이라 위험도가 가장 높다 → [docs/handoff/llm-prompt-json-slicing.md](handoff/llm-prompt-json-slicing.md)
- 🟡 **남은 개별 항목**(각각 작고 서로 무관해 골라서 하면 된다) → [docs/handoff/llm-optimization-leftovers.md](handoff/llm-optimization-leftovers.md)
  - ~~모델 오버라이드 무효 버그(`lib/llm-client.ts:159-170`)~~ — **2026-08-19 조치 완료**(`resolveGeminiEndpoint` 가 `apiEndpoint` 없이도 해석된 `model` 로 URL 조립).
  - 나머지: sukuyo 의 `attempts: 2` 와 `capTokens` 불일치 · JSON 스키마를 프롬프트 텍스트로 보내는 것(Gemini 네이티브 `responseSchema` 미사용) · 토큰 집계 사각지대 2곳(`lib/tarot/mindscan-reading.mjs` · `love-reading-llm.mjs` 가 `llm-client` 미경유)
- 🔴 **thinking 토큰은 이미 전역 OFF다**(`lib/llm-client.ts:456` + `:139-145`, 옵트인 호출자 0건). 여기서 더 아낄 것이 없으니 다시 조사하지 말 것.

## Working Rules For Current Tasks

1. Start with this file only for what is current right now. If it drifts, update it instead of adding another summary document.
2. For billing, access, or pass work, read this file together with `docs/PAYMENT_AND_ACCESS.md`.
3. For shell-entry or home runtime work, check `index.html` and `js/core/**` before touching mirrored outputs.
4. Immersive React fortune routes must own their home/back controls and must not render the shared header, footer, or mobile bottom navigation.
5. For premium tarot yearly work, verify both `lib/tarot/tarot-year-premium.mjs` and `worker/routes/tarot.js` before editing UI copy or flow logic.
6. Treat historical audit outputs as evidence only, not as active coding instructions.
7. When presenting options to the user, always state one recommended path first, mark it clearly as the recommendation, and briefly explain why it is the best default. Do not present a flat neutral list unless the user explicitly asks for neutral comparison only.
