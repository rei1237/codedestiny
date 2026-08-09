# Phase 1 — 정적 분석 (후보 수집만, 아무것도 지우지 않음)

> 실행일: 2026-08-09 / 베이스: `177e01a4d`
> 도구는 전부 `npx` 일회성 실행. `package.json` · `package-lock.json` 변경 없음.
> **이 문서의 목록은 "후보"일 뿐이다.** 삭제 판단은 [02-dynamic.md](02-dynamic.md) 를 통과한 것만 한다.

---

## 1. 도구별 원시 결과

| 도구 | 명령 | 결과 |
|---|---|---|
| madge | `npx madge --circular --extensions ts,tsx,js,jsx app lib worker src components` | 1,428 파일 처리 (7.7초) — **순환 참조 1건** |
| depcheck | `npx depcheck --ignores=…` | 미사용 의존성 15, **미선언(unlisted) 의존성 14** |
| ts-prune | `npx ts-prune` | 미사용 export **830건** |
| knip | `npx knip --no-exit-code` (설정 없음) | unused files 643 / unused exports 690 / unused types 182 / duplicate exports 7 / unlisted deps 17 |
| jscpd | `npx jscpd --min-tokens 120 --min-lines 25` | **91 clones / 8,880 중복 라인 (1.46%)** |

### 1-1. 순환 참조 (madge)
```
lib/llm-client.ts > lib/llm-cache.ts
```
전체 1,428 파일에 순환이 **단 1건**. 이 축은 건강하다.

### 1-2. jscpd 상위 클론
| 라인 | A | B |
|---:|---|---|
| **764 × 7쌍** | `app/_lib/serviceFeatureRegistry.ts:862` | 같은 파일 `:3918 :4682 :5446 :6210 :6974 :7738 :8502` |
| 122 | `worker/routes/nakshatra-ai.js:324` | `worker/routes/neo-operation-room.js:339` |
| 118 | `js/tarot-reunion-experience.js:143` | `js/tarot-year-fortune-experience.js:48` |
| 116 | `worker/routes/ziwei-ai.js:508` | `worker/routes/ziwei-island-ai.js:171` |
| **98 + 77** | `worker/lib/fortune-access-guard.js:175, :99` | `worker/routes/fortune.js:1733, :1657` |
| 87 | `js/mobile-interaction-patch.js:1887` | 같은 파일 `:2068` |
| 76 | `worker/routes/admin.js:2279` | `worker/routes/insights.js:49` |
| 65 × 2 | `worker/routes/astrology-ai.js:1353` | `nakshatra-ai.js:503`, `neo-operation-room.js:977` |

### 1-3. depcheck 미선언 의존성 — 실제 설치 여부까지 확인
| 패키지 | 사용처 | node_modules 해결 |
|---|---|---|
| `ws` | `scripts/verify-mobile-cdp-smoke.mjs` (**npm 스크립트에 배선됨**) | transitive 로만 해결 |
| `@babel/parser` | `scripts/verify-i18n-no-hardcoded-korean.mjs` (**배선됨**) | transitive 로만 해결 |
| `acorn` | `scripts/lib/i18n-source-scan.mjs` | transitive 로만 해결 |
| `playwright` | `scripts/verify-i18n-rendered-korean.mjs`, `verify-mobile-detail-render.mjs` | `@playwright/test` 경유 |
| `esbuild` | `__tests__/fortune/maya-calendar.test.js` | transitive |
| `puppeteer-core` / `parse5` / `@aws-sdk/client-s3` | 일회성 스크립트 | transitive |
| **`redis`** | `server/services/kasi-calendar.service.js` | ❌ **설치되지 않음** |

---

## 2. Perf 축 (선행 orphan-audit 미커버 영역)

### 2-1. 클라이언트로 나가는 정적 텍스트 데이터
2026-08-09 19:09 빌드 산출물(`out/`) 실측.

| 청크 | 크기 | 내용 | HTML 정적 참조 | 판정 |
|---|---:|---|---|---|
| `1156.726f70fe2d8eb27f.js` | **285.3 KB** | `serviceFeatureRegistry` 12로케일 표 | ✅ **4개 라우트 HTML 이 직접 참조** (`/tarot/crystal-soul`, `/tarot/mindscan`, `/tarot/numerology`, `/tarot/prompt-maker`) | **확정 낭비** |
| `8102.be773b2ccd55d1c1.js` | 1,491.6 KB | `INSIGHT_SEED_ARTICLES` 전체 | ❌ 없음 — `app/insights/InsightsCosmicClient.js:330` 의 런타임 `import()` | 지연 로드(경로 진입 시 발생) |
| `1832.69c82a3cc2e14b41.js` | 1,626.0 KB | `STORY_EPISODES` 웹소설 전문 | ❌ 없음 — `app/admin/cms/_lib/base-values.ts:77` 의 런타임 `import()` (호출자 `app/admin/cms/page.tsx` 는 `"use client"`) | 관리자 화면 진입 시 발생 |

**1156 의 상세**: 위 4개 라우트의 클라이언트 컴포넌트들은 registry 에서 `lookupServerCoinPrice` **하나만** 쓴다. 그 함수가 필요로 하는 것은 `FEATURE_KEY_PRICE_TABLE` + `normalizePaidFeatureKey` 뿐인데, 같은 모듈에 9,504줄짜리 12로케일 카피 표가 붙어 있어 통째로 실린다.

### 2-2. `serviceFeatureRegistry.ts` 구조
9,504줄. 로케일 12종(`ko en ja zh-CN zh-TW vi hi es fr de nl ms`)이 각 764줄. 그중 **`en` 블록이 `vi hi es fr de nl ms` 7개와 바이트 단위로 동일**(전부 미번역 영어 사본). 서비스가 실제 지원하는 로케일은 `ko/ja/zh/en` 4종이다.

### 2-3. Perf 오탐으로 판정한 것 (검사했고 문제 없음)
- **worker 모듈 최상단 초기화**: `worker/lib`·`worker/routes` 전수 스캔 결과 top-level `await` 0건, 무거운 초기화 0건. 전부 상수 `Set`/`Map`. cold start 부담 없음.
- **framer-motion**: 전 사용처가 `LazyMotion` + `m` 조합(올바른 트리셰이킹 패턴). 전체 import 없음.
- **lodash 류 전체 import**: 해당 의존성 자체가 없음.
- **`js/` ↔ `public/js/` 중복**: [scripts/sync-legacy-static-to-public.mjs](../../scripts/sync-legacy-static-to-public.mjs) 가 관리하는 의도된 미러(가드 `verify:public-parity`). 삭제 대상 아님.

### 2-4. 아직 살아 있는 성능 부채 (기존 문서 기준, 이번에 재확인만)
[docs/performance-audit/06-final-performance-report.md](../performance-audit/06-final-performance-report.md) 의 미해결 항목 + [reports/psi-postdeploy-8](../../reports/psi-postdeploy-8/psi-summary.md) 실측:
- 데스크톱 Performance **37**, TBT **2,525 ms**, 메인스레드 **10,423 ms**
- Worker 업로드 11,478 KiB(7/25) → **13,577 KiB**(8/9), 2주 만에 +18.3%

---

## 3. Propagator 축 (이번 회차 핵심)

### 3-1. 🔴 `CLAUDE.md` 가 실제 코드 구조와 어긋난 지점
매 세션 AI 가 최우선으로 읽는 문서다. 여기가 틀리면 다음 세션이 그대로 복제한다.

| # | CLAUDE.md 기재 | 실제 |
|---|---|---|
| P-1 | Folder Structure 에 `veda/` — "베다 점성술 엔진 (ephemeris, knowledge-base)" | **디렉터리 없음.** 베다 엔진 실체는 `lib/vedicSwissChart.js`·`lib/vedicCalculator.js`·`worker/lib/vedic-*.js`·`worker/lib/nakshatra-*.js` |
| P-2 | Folder Structure 에 `models/` — "Mongoose 모델 (Story, Chapter)" | **디렉터리 없음** (`models/Story.ts` 를 데드코드로 언급한 138행 서술도 대상이 이미 부재) |
| P-3 | 웹소설 원문 = `lib/stories/chapters/*` + `data.ts` | 실제 리더 `app/stories/page.tsx` 는 **`lib/stories/vn` 의 `STORY_EPISODES`** 를 읽는다. `chapters/`(32파일 312KB)·`data.ts` 는 코드 임포터 0건 |
| P-4 | `grantPassFreeAccessBeforeCardIfAvailable`(**6368~**) | 실제 `worker/routes/billing.js:6439` (71줄 드리프트) |

### 3-2. 죽은 가드 · 안 도는 테스트
| # | 항목 | 근거 |
|---|---|---|
| P-5 | `npm run verify:worker-size` 가 **아무것도 검사하지 않는다** | 실행 로그: `handler.mjs not found. Skipping size budget check.` → exit 0. OpenNext 산출물이 있어야만 도는데 현재 배포 경로는 OpenNext 를 안 쓴다 |
| P-6 | `__tests__/guardian-fortune/contract.test.js` 가 **어느 러너에서도 안 돈다** | jest `testPathIgnorePatterns` 에 제외되어 `npx jest --listTests` 에 안 나오고, `test:node` 글롭(`__tests__/ui/*.test.js` + maya-calendar)에도 안 걸린다. 파일은 2026-08-08 에 수정됨 |
| P-7 | `scripts/verify-*.mjs` 16개가 `package.json` 미배선 | 선행 감사(2026-07-25)가 13개를 "위임 실행·문서화·의도적 보관"으로 **오판정 아님**으로 결론. 목록만 갱신 |

### 3-3. 계약 · 설정 드리프트
| # | 항목 | 근거 |
|---|---|---|
| P-8 | `tsconfig.json` `exclude` 7개가 **전부 존재하지 않는 경로** | `_scripts-archive`, `.codex-worktrees`, `.claude/worktrees`, `.release-clean`, `_release-clean`, `veda`, `build` — 전수 확인 결과 하나도 없음 |
| P-9 | `.env.example` 에 계약 미등록 키 **17개** | `verify:env-parity` 가 INFO 로 흘리고 통과시킴 (목록은 [00-baseline.md](00-baseline.md) §4) |
| P-10 | 배선된 verify 스크립트 2개가 **미선언 의존성에 의존** | `verify:mobile-cdp-smoke` → `ws`, `verify:i18n-no-hardcoded-korean` → `@babel/parser`. transitive 해결이 끊기면 조용히 깨진다 |
| P-11 | `server/services/kasi-calendar.service.js` 가 **설치되지 않은 `redis`** 를 import | 레거시 Express 경로. 실행하면 즉시 실패 |
| P-12 | `next.config.mjs` 가 `eslint.ignoreDuringBuilds: true` + `typescript.ignoreBuildErrors: true` | 빌드가 타입/린트 오류를 막지 않는다. 현재 둘 다 0건이라 잠복 중 |

### 3-4. 정본이 불분명한 공존 모듈
| # | 항목 | 상태 |
|---|---|---|
| P-13 | `lib/seo.ts` (`buildSeoMetadata`, 다수 라우트) **와** `lib/seo.v2.ts` (`SEO_V2_SITE`, `robots.ts`·`generate-page-metadata.ts`) 공존 | 둘 다 살아 있음. `.v2` 가 정본인지 이행 잔재인지 문서에 없음 |
| P-14 | `worker/lib/fortune-access-guard.js` ↔ `worker/routes/fortune.js` 에 **175줄 동일 코드** | 결제 게이팅 경로. 한쪽만 고치면 게이트가 갈린다 |
| P-15 | `app/components/AdvancedZiweiSection.tsx`(36KB) 와 `AdvancedZiweiSectionV2.tsx`(151KB) 공존 | V2 만 사용됨(`ZiweiChartClientLoader.tsx`, `base-values.ts`). 비-V2 는 임포터 0 |

### 3-5. Propagator 오탐으로 판정한 것
- **`*RouteClient` / `*Client` 25쌍은 중복이 아니다.** App Router 페이지가 `RouteClient`(동적 import 래퍼)를 통해 `Client`(본체)를 부르는 **의도된 규약**이다. 25쌍 중 peer 참조가 0인 것은 `app/tarot/mindscan/MindScanTarotClient.tsx` **1건뿐**이고, 그 라우트의 `page.tsx` 는 `MindScanTarotRouteClient` 를 쓴다.

---

## 4. Dead 축 — knip 후보의 실제 크기

knip 이 "unused files" 643건을 뱉었으나 설정 없이 돌린 결과라 노이즈가 크다. 단계별로 좁힌 실측:

| 단계 | 건수 | 비고 |
|---|---:|---|
| knip 원시 | 643 | `.claude/skills/**`·`scripts/**`·`__tests__/**`·`server/**`·`js/**` 포함 |
| 앱 코드만 (위 제외) | **242** (4,150 KB) | |
| 전 파일종류 basename 참조 0건 (docs·md 포함) | 2 | |
| **코드·설정 참조 0건** (docs/`*.md`/`reports` 제외) | **86** (595 KB) | ← 실질 후보 |

84건은 "코드에는 없고 감사 문서(`reports/unused-files-report.json` 등)에만 언급"된 상태다.

**참조 스캔 범위**: `node_modules`·`.next`·`out`·`dist`·`.git` 만 제외하고 나머지 전부. 즉 `.html`(정적 셸 6종)·`.java`(안드로이드 11파일)·`.gradle`·`proguard-rules.pro`·`AndroidManifest.xml`·`worker/wrangler.toml`·`i18n/**`·`.css` 가 모두 포함됐다.

전체 86건 목록은 [02-dynamic.md](02-dynamic.md) 에 등급과 함께 싣는다.
