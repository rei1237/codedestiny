# 죽은 코드 제거 — 최종 보고 (1차 안전 패스)

브랜치: `feat/dead-code-cleanup` (from `main` @ c95e7dc2)
작업일: 2026-07-05

## 1. 제거 완료 (커밋 5af06623)

**7개 파일 / 6865줄 삭제.** 전부 참조 그래프 + 전체 grep(import specifier·문자열 경로·HTML `<script>`·config·package.json)로 참조 0 검증.

| 파일 | 근거 |
|------|------|
| `LoveSimulation.jsx` | 실 구현 `app/saju/love-simulation/_components/LoveSimulationEngine.tsx`, 루트 사본 미참조 |
| `CrystalSoulTarot_v2.jsx` | 스크래치본. 실 구현 `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx` |
| `CelestialHarmony.jsx` | 구버전. 실 기능 `app/api/celestial-harmony/route.js` + `worker/routes/celestial-harmony.js` |
| `fix-encoding.js` | index.html 1회성 패치(2026-06-05 적용), package.json 미등록 |
| `fix-acting-btn.js` | 동일 1회성 패치 |
| `tmp/dream.bundle.mjs` | esbuild 스크래치 번들 |
| `tmp/psycho.bundle.js` | esbuild 스크래치 번들 |

**검증(baseline 대비 무회귀)**: tsc 0 errors(=baseline) · next lint 798 warn/1 error(=baseline, 신규 0) · test:worker:auth-payments 21/21 · full CF build exit 0.

## 2. 보류 — 사용자 확인 및 심층 분석 필요

정적으로 "미도달"이나 **동적 로드로 살아있음이 확인/의심**되어 삭제하지 않음.

| 버킷 | 개수 | 보류 사유 (증거) |
|------|------|------|
| `js/*` | 35 → **최소 20+ 확정 live** | 18개는 HTML/inline-runtime `<script>` 로드 확인. 나머지 중 `js/services/sajuWorkerService.js`는 `new Worker(workerPath,{type:'module'})` 동적 워커 로드, `vedic-book.js`·sajuWorker 3종은 `js/core/uiBindings.js`가 참조 → **import 그래프 밖에서 살아있음**. 버킷 전체 보류 |
| `scripts/*` | ~56 | verify-*/migrate-*/test-*/gen-*/seed-* = 독립 실행 dev/ops 엔트리포인트. CI·수동·문서 참조 가능. CLAUDE.md상 migrate/verify 신중 취급 |
| `lib/*` | ~26 | 프롬프트 태그·i18n 키·lazy import 동적 참조 가능 |
| `components/*` | ~18 | lazy import / 배럴 재export 가능 |
| `src/*` (src/features/fortune-tea-house) | ~10 | 신규 트리, 참조 관계 재확인 필요 |
| `types/*` (.d.ts) | ~7 | 앰비언트 타입 선언 가능 |

## 3. 제외 (삭제 금지)

`middleware.ts`, `tailwind.config.js`·`postcss.config.mjs`·`jest.config.cjs`·`next-env.d.ts`, `worker/routes/*`(42개 전부 등록), Cloudflare 설정(wrangler·_routes.json·_headers), 결제/인증(billing/payments/PortOne/JWT), `pages/*`(파일기반 라우팅), `__tests__/*`.

## 4. baseline 대비 결과

| 지표 | baseline | 현재 |
|------|------|------|
| 소스 파일(추정) | app594/worker112/lib87/js81/src80/components46/server37 | 루트 스트레이 7개 감소 |
| Typecheck errors | 0 | 0 |
| Lint warn/error | 798/1 | 798/1 |
| Worker 테스트 | 21/21 | 21/21 |
| Full build | exit 0 | exit 0 |
| 삭제 줄수 | — | -6865 |

## 5. 사람이 최종 확인해야 할 항목

- **의존성(depcheck)**: 사용자 결정에 따라 미실행/보류(package-lock.json 수정 금지). 필요 시 별도 실행 후 보고만.
- **결제·인증 인접**: 어떤 삭제도 하지 않음. `worker/routes/billing.js`·`payments.js` 무변경.
- **js/ ↔ public/js/ source-of-truth**: `js/`=소스, `public/js/`=배포 미러로 추정. 향후 js/ 정리 시 양쪽 동기 + `<script>`/`new Worker`/`importScripts`/동적 주입 전수 확인 필수.
- **PHASE 4 모듈화**: 미착수. 후보(`app/_lib/serviceFeatureRegistry.ts` 9.5k 등)는 순수 추출만 가능하나 회귀 위험 대비 효익 재평가 필요. LLM/결제/인증/데이터블롭·js 엔진은 제외.

## 6. 다음 단계 제안

1. **보류 버킷 심층 분석**(scripts one-off, lib, components, src): 파일별 동적 참조 전수 grep 후 2차 삭제 배치 — 느리고 신중, 오삭제 위험 존재.
2. **PHASE 4 모듈화**: 순수 리팩토링(추출+re-export), public API 유지. 별도 승인 후.
3. 현 상태로 마감 후 PR.
