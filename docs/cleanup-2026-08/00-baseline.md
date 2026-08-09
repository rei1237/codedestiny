# Phase 0 — 정리 작업 사전 베이스라인 (2026-08-09)

> 목적: "무엇을 지웠는지" 증명하려면 지우기 전 숫자가 있어야 한다. 이 문서는 **삭제 전 상태**의 실측값만 담는다.
> 이 문서의 모든 수치는 실제 명령 실행 결과다. 실행하지 못한 항목은 **미측정**으로 표기했고, 추정치는 넣지 않았다.

## 측정 환경

| 항목 | 값 |
|---|---|
| 측정 시각 | 2026-08-09 20:30~20:40 KST |
| HEAD | `ad5e519ac` (`fix(guardian-fortune): keep a throwing waitUntil from failing a committed usage`) |
| origin/main | `e4fabcd3f` — HEAD 가 2 커밋 앞섬 (미push) |
| 워킹트리 | `public/version.json` 1건 수정 (다른 세션 빌드가 남긴 스탬프) |
| 플랫폼 | Windows 11, Node (`.nvmrc` 기준) |

### 🔴 측정 중 확인된 동시 작업
측정 시점에 **다른 세션이 같은 저장소에서 `npm run deploy:safe` 를 실행 중**이었다(프로세스 2개 생존, `.deploy-state/state.json` 이 3분 전 갱신, `dist/` 에 스모크 통과한 아티팩트 `sha256 b096d31…` / 3,300 파일이 물려 있음). 그 세션의 `next dev` 와 `wrangler tail` 도 함께 떠 있었다.

→ 이 때문에 **`npm run build:cf` 를 실행하지 않았다.** 빌드는 `out/`·`dist/` 를 덮어쓰므로, 상대 세션이 `[y/N]` 에 `y` 를 누르는 순간 검증되지 않은 산출물이 프로덕션에 올라간다. 빌드 의존 지표는 아래 "미측정" 항목으로 분리했다.

---

## 1. 정적 규모

| 항목 | 값 |
|---|---|
| 추적 파일 수 | **4,124** |
| 소스 파일 수 (`.ts/.tsx/.js/.jsx/.mjs/.cjs`) | **2,193** |
| 소스 LOC | **933,490** |
| `'use client'` 파일 수 (`app`/`components`/`src`) | **450** |
| dependencies | **40** |
| devDependencies | **20** |
| npm scripts | **288** (그중 `verify:*` **148**) |
| `scripts/verify-*.mjs` 파일 | **146** |
| sitemap URL 수 (`out/sitemap.xml`, 다른 세션 빌드 산출물 기준) | **312** |

### 영역별 LOC
| 영역 | 파일 | LOC |
|---|---:|---:|
| `app/` | 823 | 248,088 |
| `worker/` | 230 | 145,402 |
| `js/` | 97 | 133,247 |
| `scripts/` | 324 | 67,134 |
| `lib/` | 149 | 51,876 |
| `src/` | 119 | 29,690 |
| `server/` | 35 | 11,102 |
| `components/` | 39 | 8,877 |

> `js/` 와 `public/js/` 는 [scripts/sync-legacy-static-to-public.mjs](../../scripts/sync-legacy-static-to-public.mjs) 가 관리하는 **의도된 미러**다(가드: `verify:public-parity`). 위 표의 `js/` 는 루트 사본만 센 것이고, `public/js/` 121 파일은 별도로 존재한다.

---

## 2. 빌드·타입·린트

| 항목 | 명령 | 결과 | 소요 |
|---|---|---|---|
| 타입체크 | `npm run typecheck` | **exit 0, 에러 0건** | **31초** |
| 린트 | `npm run lint` | **exit 0, 경고 769건, 에러 0건** | **15초** |
| Worker 번들 | `npm run build:worker` (wrangler `--dry-run`) | **Total Upload 13,577.42 KiB / gzip 2,907.05 KiB** | 2초 |
| Worker 크기 예산 가드 | `npm run verify:worker-size` | ⚠️ **exit 0 이지만 실제 검사 안 함** — `handler.mjs not found. Skipping size budget check.` | — |
| Next 프로덕션 빌드 | `npm run build:cf` | **미측정** (동시 배포 세션 충돌) | — |
| 라우트별 First Load JS | 위 빌드 출력 | **미측정** | — |
| 번들 분석 | `npm run analyze` | **미측정** (프로덕션 빌드 필요) | — |

### 선행 베이스라인과의 비교
[docs/orphan-audit/00-baseline.md](../orphan-audit/00-baseline.md) (2026-07-25) 대비:

| 지표 | 2026-07-25 | 2026-08-09 | 변화 |
|---|---:|---:|---|
| 추적 파일 | 3,386 | 4,124 | **+738 (+21.8%)** |
| 린트 경고 | 738 | 769 | +31 |
| 타입 에러 | 0 | 0 | — |
| Worker 업로드 | 11,477.96 KiB | 13,577.42 KiB | **+2,099 KiB (+18.3%)** |
| sitemap URL | 430 | 312 | −118 |
| `scripts/verify-*.mjs` | 76 | 146 | **+70 (+92%)** |

> 2주 만에 Worker 번들이 18% 늘고 verify 스크립트가 두 배가 됐다. 정리 작업의 효과는 이 축에서 측정한다.

---

## 3. 클라이언트 번들 (다른 세션의 2026-08-09 19:09 빌드 산출물 기준)

| 항목 | 값 |
|---|---|
| `out/_next/static` 전체 | **18 MB** |
| `out/_next/static/chunks` | **16 MB / 458개 `.js`** |
| `out/_next/static/css` | **1.9 MB** |

### 상위 청크 (내용 확인 완료)
| 크기 | 청크 | 실제 내용 |
|---:|---|---|
| 1,626 KB | `1832.69c82a3cc2e14b41.js` | **`STORY_EPISODES` — 웹소설 전 회차 원문 전체** |
| 1,492 KB | `8102.be773b2ccd55d1c1.js` | **`INSIGHT_SEED_ARTICLES` — 인사이트 시드 아티클 전체** |
| 658 KB | `6216.50544225edf4e736.js` | 사주 엔진 (`fetchSajuEngineResult`, `resolveAnimalTwelveResult`) |
| 323 KB | `164f4fb6.540588a7465e92b9.js` | jsPDF |
| 316 KB | `4881-22b65df2b46ac40f.js` | (미식별) |
| 299 KB | `428ccf76-0fc8d0ba548d7b26.js` | lunar-javascript 계열 |

> 상위 2개(합 3.1 MB, 전체 청크의 19%)가 **전부 정적 텍스트 데이터**다. Phase 1 Perf 후보 1순위.

---

## 4. 테스트·검증 통과 상태

| 항목 | 명령 | 결과 | 소요 |
|---|---|---|---|
| 전체 테스트 | `npm test` | **exit 0** — jest **105 suites / 920 tests 전부 통과**, node:test **173 tests 전부 통과** (합계 1,093) | **56초** |
| 필수 검증 체인 | `npm run check:critical` | **exit 0 — 19단계 전부 통과** | **49초** |

`check:critical` 구성: `typecheck` → `verify:env-parity` → `smoke:core` → 결제·이용권 12종(`billing-pass-policy`, `portone-single-payment`, `paid-gate-ui`, `payment-choice-parity`, `checkout-pass-card`, `pass-recovery-path`, `paid-feature-common-flow`, `static-paid-gate-failsafe`, `saju-unlock-entitlement-regression`, `profile-card-action-policy`, `paid-gate-profile-scope`, `payment-concurrency-guards` 계열) → `build:worker` → `verify:entry-encoding --strict-core`

### 실행하지 않은 검증 (의도적 제외)
`verify:ai-locale-live`, `verify:mobile-live-deployment`, `verify:deployed-assets`, `verify:env-parity:remote`, `--live` 플래그가 붙는 모든 스크립트.
이유: **실제 LLM 호출·원격 배포본 호출 금지**(CLAUDE.md 코딩 원칙 8). 필요해지면 그때 별도 허락을 받는다.

### `verify:env-parity` 가 남긴 경고 (실패는 아님)
`.env.example` 에 계약(`config/env.contract.json`)에 없는 키가 **17개** 있다:
`GEMINI_CALL_ENABLED, GOOGLE_OAUTH_CALLBACK, KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET, KAKAO_OAUTH_CALLBACK, LLM_DRY_RUN, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_OAUTH_CALLBACK, PDF_DEBUG_MODE, PDF_LLM_MAX_CALLS_PER_JOB, PDF_LLM_MAX_RETRIES, PDF_LLM_PROVIDER, PDF_MOCK_FAIL_CHAPTER_ID, PDF_REAL_LLM_CHAPTER_IDS, WORKERAI, WORKERS_AI_ENABLED`
→ Phase 1 Propagator 후보(문서/계약 드리프트).

---

## 5. 런타임 성능 (재측정하지 않고 기존 실측값 인용)

프로덕션 PSI 실측 — [reports/psi-postdeploy-8/psi-summary.md](../../reports/psi-postdeploy-8/psi-summary.md), URL `https://code-destiny.com`:

| 지표 | 모바일 | 데스크톱 |
|---|---:|---:|
| Performance | 90 | **37** |
| Accessibility | 87 | 93 |
| SEO | 100 | 100 |
| FCP (ms) | 2,029 | 1,378 |
| LCP (ms) | 2,995 | 2,574 |
| CLS | 0.000 | **0.165** |
| TBT (ms) | 64 | **2,525** |
| Main Thread (ms) | 2,630 | **10,423** |

> **데스크톱 Performance 37 / TBT 2,525ms / 메인스레드 10.4초** 가 이번 정리 작업 Perf 축의 실제 목표치다. 모바일은 이미 90.

### 미측정 항목
- **WebView 실기 LCP/TTI** — 실기 또는 에뮬레이터 필요. 이번 회차 미측정.
- **로컬 라우트별 LCP/TTI** — 프로덕션 빌드가 필요해 미측정.

---

## 6. 다음 단계에서 유의할 것

1. **`npm run build:cf` 는 워킹트리를 더럽힌다.** `prebuild:cf` 가 `ensure-ads-txt` · `sync:public` · `sync-music-track-count` · `build-shell-cms-defaults` 를 돌려 추적 파일(ads.txt, `public/js/**` 미러, 정적 셸)을 수정할 수 있다. 빌드 후 반드시 `git status` 확인.
2. **다른 세션과의 동시 작업**이 이번 측정의 최대 변수다. 빌드·배포를 건드리는 측정은 그 세션이 끝난 뒤에 한다.
3. `verify:worker-size` 는 **현재 아무것도 검사하지 않는다**(`handler.mjs` 부재로 skip). Phase 1 Propagator 후보.
