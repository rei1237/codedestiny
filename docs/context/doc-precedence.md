# 문서 우선순위 · 가드 무결성 · 워커 크기

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Doc Precedence

- `AGENTS.md` 는 **Codex 진입점**이다 — 규칙 정본이 아니라 `CLAUDE.md` 로 보내는 표지판이다. 실행 계약의 정본은 `CLAUDE.md` 와 이 디렉터리(`docs/context/*.md`)이며, 배포 계약은 [delivery-and-ci.md](delivery-and-ci.md) 하나다.
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
- `CLAUDE.md` 는 매 세션 자동 로드되는 규약 정본이자 이 디렉터리로 가는 라우팅 표다.
- If these docs disagree, do not merge the rules silently. Reconcile the mismatch in `docs/CONTEXT_AUDIT.md` before coding.

## 문서 갱신 규칙 (2026-08-28 `AGENTS.md` 에서 이관)

변경의 성격에 따라 아래 문서를 **같은 PR 에서** 갱신한다.

| 변경 | 갱신할 문서 |
|---|---|
| 구조 변경 | [docs/SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md) |
| 신규 기능 | [docs/FEATURE_MAP.md](../FEATURE_MAP.md) |
| 신규 라우트·API | [docs/ROUTE_MAP.md](../ROUTE_MAP.md) |
| 결제·접근 변경 | [docs/PAYMENT_AND_ACCESS.md](../PAYMENT_AND_ACCESS.md) |
| LLM·프로바이더·프롬프트 흐름 | [docs/LLM_AND_AI_POLICY.md](../LLM_AND_AI_POLICY.md) |
| 인프라·배포·R2·env | [docs/DEPLOYMENT_AND_INFRA.md](../DEPLOYMENT_AND_INFRA.md) |
| 반복 이슈·장애 대응 | [docs/DEBUGGING_GUIDE.md](../DEBUGGING_GUIDE.md) |
| 활성 문서 드리프트·낡은 참조 정책 | [docs/CURRENT_DEV_BASELINE.md](../CURRENT_DEV_BASELINE.md) 를 먼저, 예외는 [docs/CONTEXT_AUDIT.md](../CONTEXT_AUDIT.md) 에 |

- 🔴 정보가 불확실하면 추측해서 적지 말고 `확인 필요` 라고 쓴다.

## 활성 참조 문서 목록

- [docs/CURRENT_DEV_BASELINE.md](../CURRENT_DEV_BASELINE.md) — 현재 개발 초점(유일한 시간 민감 요약)
- [docs/SERVICE_STRUCTURE.md](../SERVICE_STRUCTURE.md)
- [docs/FEATURE_MAP.md](../FEATURE_MAP.md)
- [docs/ROUTE_MAP.md](../ROUTE_MAP.md)
- [docs/PAYMENT_AND_ACCESS.md](../PAYMENT_AND_ACCESS.md)
- [docs/LLM_AND_AI_POLICY.md](../LLM_AND_AI_POLICY.md)
- [docs/DEPLOYMENT_AND_INFRA.md](../DEPLOYMENT_AND_INFRA.md)
- [docs/DEBUGGING_GUIDE.md](../DEBUGGING_GUIDE.md)
- [docs/CONTEXT_AUDIT.md](../CONTEXT_AUDIT.md) — 충돌·예외·역사 기록(현재 상태의 재서술이 아니다)
- [docs/payment-policy-overview.md](../payment-policy-overview.md) · [content-access](../payment-policy-content-access.md) · [flow](../payment-policy-flow.md) — 결제 정책 정본 3부작
- [docs/deploy-cache.md](../deploy-cache.md)
- [docs/r2-assets-cache-strategy.md](../r2-assets-cache-strategy.md)
