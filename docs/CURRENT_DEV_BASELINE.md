# Current Dev Baseline

Last curated: `2026-08-14`

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

> 🔴 **2026-08-14 정정.** 이 절은 2026-08-11 에 폐기된 계약("work on `main`; ship with `deploy:safe`")을 그대로 서술하고 있었다. 우선순위 1위 `AGENTS.md` 와 정반대여서, 규칙상 "코딩 전에 화해시켜라"가 걸려 매 세션 시작을 막았다. 아래는 요약이며 **계약 정본은 `AGENTS.md` §Delivery 하나다** — 여기에 상세를 복제하지 않는다(중복이 곧 다음 드리프트다).

- Source files: `AGENTS.md`, `scripts/lib/change-risk.mjs`, `scripts/lib/production-deploy-guard.mjs`, `.github/workflows/pr-ci.yml`, `.github/workflows/cloudflare-pages-deploy.yml`
- 흐름은 하나다: **브랜치 → 커밋 → push → PR → PR CI → 사용자가 Merge → 그 SHA 가 자동 배포.** 머지가 곧 라이브이고, 배포 전 프리뷰 단계는 없다.
- `main` 직접 push 는 브랜치 룰셋이 막고, 로컬 프로덕션 배포는 `production-deploy-guard.mjs` 가 막는다. 로컬에 남는 것은 `deploy:check`(업로드 없음)·`deploy:preview`(흐름 밖 도구)·`deploy:smoke` 뿐이다.
- PR CI 강도는 변경 경로가 정한다(`fast` / `standard` / `critical`). 판정 정본은 `scripts/lib/change-risk.mjs` 하나이며, `deepRequired`(인증·결제·DB 스키마·배포 파이프라인)는 `level` 과 무관하게 전체 회귀를 강제한다.
- 병렬 세션은 각자 워크트리를 쓰고 각자 PR 을 연다. 머지는 GitHub 에서만 한다.

### 6. SEO 와 서비스 안정성 (2026-08-14 — 새 우선 축)

기능은 충분히 만들었다. 앞으로의 작업 축은 **색인·크롤 가능성**과 **실패했을 때 사용자에게 보이는 것**이다. 아래는 진입점 기록이며 **해결책은 적지 않는다** — 각 항목은 착수 시점에 실측하고 결정한다.

**SEO — 자동으로 지켜지는 것과 아닌 것**

- 지금 CI 에서 **자동으로 도는 SEO 게이트는 둘뿐**이다: `verify-adsense-readiness`(postbuild, 라우트별 렌더 텍스트 분량 미달 시 빌드 실패)와 `verify:sitemap`(`cloudflare-pages-deploy.yml`).
- `seo:check`(프로덕션 URL 200 확인) · `seo:audit`(메타·canonical 리포트) · `verify:seo-entity-registry` 는 **어느 워크플로에도 배선돼 있지 않다.** 마지막 것은 `scripts/verify-guard-wiring.mjs` 에서 "수동"으로 선언돼 있다. 배선 여부는 게이트 추가이므로 사용자 승인 사항이다.
- `scripts/seo-audit.mjs` 의 `indexablePaths` 는 낡았다 — `/pdf/life-book` · `/pdf/love-report` 가 남아 있는데 인생의 책 정본 경로는 `/life-book-ai` 이고 구 경로는 리다이렉트다. 이 목록으로 감사하면 결과가 현실과 어긋난다.
- 라우트를 추가할 때는 `canLoadAdsense()` 기준 게재 가능 여부에 따라 sitemap self-canonical 정합과 최소 렌더 텍스트 분량이 배포를 막는다는 점을 먼저 본다(CLAUDE.md "SEO 콘텐츠 게이트" 절).

**안정성 — 지금 가장 얇은 곳**

- 🔴 **워커 번들이 무료 플랜 한도의 96.3%**(gzip 2.89 / 3 MiB, 여유 0.11 MiB — 2026-08-13 실측). **다음 워커 추가가 배포를 깨뜨릴 수 있는 위치**다. `worker/` 에 무언가 더하기 전에 `npm run verify:worker-size` 로 다시 잰다.
- 가드 무결성 7건(G-1~G-7)은 모두 조치됐다. 재발 방지는 `verify:guard-wiring`(배선 누락 fail-closed)과 `verify:auth-changed-coverage`(리스너 전수 발견)가 맡는다 — 이 둘을 약화시키는 변경은 하지 않는다.
- 머지된 작업이 프로덕션에 도달하지 못하는 조용한 실패는 `landing-watchdog.yml` 이 이슈 하나로 모은다(스택 PR 좌초 · 릴리스 런 취소 · 프로덕션 드리프트).

## Working Rules For Current Tasks

1. Start with this file only for what is current right now. If it drifts, update it instead of adding another summary document.
2. For billing, access, or pass work, read this file together with `docs/PAYMENT_AND_ACCESS.md`.
3. For shell-entry or home runtime work, check `index.html` and `js/core/**` before touching mirrored outputs.
4. Immersive React fortune routes must own their home/back controls and must not render the shared header, footer, or mobile bottom navigation.
5. For premium tarot yearly work, verify both `lib/tarot/tarot-year-premium.mjs` and `worker/routes/tarot.js` before editing UI copy or flow logic.
6. Treat historical audit outputs as evidence only, not as active coding instructions.
7. When presenting options to the user, always state one recommended path first, mark it clearly as the recommendation, and briefly explain why it is the best default. Do not present a flat neutral list unless the user explicitly asks for neutral comparison only.
