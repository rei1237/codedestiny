# Code Destiny Cleanup Audit

## 1. 현재 검증 상태

기준 커밋: `74faf9976 chore: snapshot current service before cleanup`

브랜치: `chore/service-cleanup-audit`

검증 명령:

| 항목 | 결과 | 근거 |
| --- | --- | --- |
| install | PASS | `npm install` 완료. 추적 파일 변경 없음. |
| lint | PASS | `npm run lint` exit 0. 기존 경고 다수 유지: unused vars, no-img-element, no-html-link-for-pages, no-var. |
| typecheck | PASS | `app/music/_data/musicManifest.ts`의 가사 template literal 복구 후 `npm run typecheck` 통과. |
| build | PASS | `npm run build` 통과. sync/public parity/i18n/locale/runtime-cache, Next compile, static export, postbuild 완료. |
| test | N/A | `package.json`에 `test` 스크립트 없음. |
| worker dry-run | PASS | `npm run build:worker` 통과. `whatwg-url` default export warning 1건. |
| cleanup audit script | PASS | `npm run audit:cleanup` dry-run 완료. `reports/*-report.json` 3개 갱신. |

초기 발견 및 처리:

- `app/music/_data/musicManifest.ts:174`부터 음악 가사/텍스트로 보이는 원문이 template literal로 감싸지지 않아 TypeScript/Next build를 막고 있었고, 해당 블록만 복구함.
- lint는 현 시점 기준 기존 경고가 많아 cleanup 후 회귀 판단 기준으로 "경고 수 증가 없음"을 우선 적용해야 함.
- `npm run build`의 `sync:public`, `verify:public-parity`, `verify:i18n-runtime`, `verify:locale-main-sync`, `verify:runtime-cache-sync`는 모두 통과함.
- touched files 기준 깨진 문자열/인코딩 패턴 및 운세 금지 표현 exact scan에서 추가 노출 없음.

검색 근거:

- 구조: `rg --files app components lib utils worker scripts styles public`
- 감사: `npm run audit:cleanup`
- 결제/이용권: `membership|single|coin|pass|entitlement|paidGate|unlock`
- 프로필: `profileCard|profile-card|ProfileCard|destiny-profile`
- PDF/LLM: `pdfReady|pdf-archive|localAssembly|externalGeneration|callGeminiText`
- R2/assets: `getAssetUrlFromPublicPath|assets.code-destiny.com|music.code-destiny.com|fuctionassets|preload`
- 레거시 정책: `1년권|연간권|yearly|annual|subscriptionTier|passTier|membershipTier`
- debug: `console.log|console.debug|console.info|debugger`

## 2. 삭제 후보

| 파일/모듈 | 삭제 후보 이유 | 사용처 검색 결과 | 위험도 | 추천 조치 |
| ----- | -------- | --------- | --- | ----- |
| `_tmp_saju_3c71.js` | 루트 임시 JS, 2.36 MB | `audit:cleanup` unusedCandidates 상위. 보호 경로 아님. | 낮음 | 파일명 exact `rg` 후 삭제 검증 |
| `_tmp_bfd_saju.js` | 루트 임시 JS, 1.43 MB | `audit:cleanup` unusedCandidates 상위. 보호 경로 아님. | 낮음 | 파일명 exact `rg` 후 삭제 검증 |
| `_tmp_313a8bd.js` | 루트 임시 JS, 1.24 MB | `audit:cleanup` unusedCandidates 상위. 보호 경로 아님. | 낮음 | 파일명 exact `rg` 후 삭제 검증 |
| `_tmp_ziwei.diff` | 루트 임시 diff | `audit:cleanup` unusedCandidates. | 낮음 | 파일명 exact `rg` 후 삭제 검증 |
| `.codex-next-dev.log`, `.next-dev-server.log`, `.codex-*.log`, `codex-dev-server-*.log`, `dev-server.log`, `tmp-codex-animal-dev.log` | 개발 로그 산출물 | `audit:cleanup` unusedCandidates. 런타임 import/route 아님. | 낮음 | exact `rg` 후 묶음 삭제 |
| `tsconfig.tsbuildinfo` | TypeScript 캐시 산출물 | `audit:cleanup` unusedCandidates. | 낮음 | `.gitignore` 포함 여부 확인 후 삭제 |
| `all_webp_files.txt` | 일회성 `dist` WebP inventory | `git grep "all_webp_files"` 결과 문서/보고서 외 참조 없음. | 낮음 | 삭제 완료 |
| `seo-audit-report.md`, `seo-audit-report.json` | 감사 산출물로 보임 | `audit:cleanup` unusedCandidates. | 중간 | SEO 작업 기록 여부 확인 전 보류 |
| `js/saju-engine.js`, `js/saju-engine-tarot-sukuyo-quantum.js` | 감사 스크립트상 unused지만 runtime loader 문자열 참조 존재 | `js/core/index-inline-runtime.js`에서 `/js/saju-engine.js?v=...`, `/js/saju-engine-tarot-sukuyo-quantum.js?v=...` 로드 | 높음 | 삭제 금지. 번들/분할 후보로만 관리 |
| `public/**` mirror HTML/JS/CSS | 중복 파일로 탐지됨 | sync 대상 mirror. `npm run sync:public` 산출물 | 높음 | 직접 삭제 금지 |
| `server/**` payment/profile routes | Worker와 중복으로 보임 | legacy fallback 및 tests 존재 | 높음 | Worker route 활성 범위와 fallback traffic 증거 확보 전 삭제 금지 |

## 3. 중복 코드 후보

| 영역 | 중복 내용 | 현재 위치 | 통합 위치 제안 | 위험도 |
| -- | ----- | ----- | -------- | --- |
| 프로필 조회/접근 | `resolveCurrentId`, `resolveSingleProfileAccess`, `listUserProfiles`, pass entitlement 계산 | `worker/routes/profile.js`, `worker/routes/user.js` | `worker/lib/profile-source-of-truth.js` | 중간 |
| 프로필 카드 결제 정책 | `profile-card-manage`, 50 coin, 5,000 KRW, monthly credit 처리 | `worker/routes/profile.js`, `worker/routes/user.js`, `worker/routes/billing.js`, `worker/lib/profile-card-mutation-policy.js` | 기존 `worker/lib/profile-card-mutation-policy.js` 확장 | 높음 |
| 정적/React 결제 게이트 | PortOne SDK load, `/api/billing/coin-gate`, pass/direct 선택 UI | `index.html`, `js/destiny-profile.js`, `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts` | `lib/payment/access-gate.ts`, `components/payment/PaymentWaitOverlay.tsx` | 높음 |
| 결제 대기 UI | static gate overlay와 React `PaymentProcessingContext` 병행 | `index.html`, `app/components/PaymentProcessingContext.tsx`, `app/components/PaymentProcessingOverlay.tsx` | 공통 상태 contract 우선 정리 | 중간 |
| R2/public asset URL | React 일부만 `getAssetUrlFromPublicPath` 사용, static shell은 URL hardcode | `lib/r2-public-url.ts`, `index.html`, `js/mobile-performance-bootstrap.js`, `js/io-image-lazy-loader.js` | `lib/assets/r2-url.ts` + static map 생성 | 중간 |
| PDF archive/payload | `pdfReady`, `pdf-archive`, `localAssembly`, validation 반복 | `worker/routes/astro.js`, `saju-lifebook.js`, `saju-new-year.js`, `saju-love-secret.js`, `ziwei-book.js` | `worker/lib/pdf-ready.js`, `worker/lib/pdf-archive-url.js` | 높음 |
| static mirror duplicates | root source와 `public/**` mirror 동일 파일 | `index.html`, `public/index.html`, `public/static/index.html`, locale mirrors | 기존 sync 절차 유지 | 높음 |
| CSS mirror duplicates | `styles/fortune-ui.css`와 `public/styles/fortune-ui.css` | `styles/**`, `public/styles/**` | sync source 유지 | 중간 |

## 4. 병목 후보

| 영역 | 병목 원인 | 근거 | 개선 방향 | 예상 효과 |
| -- | ----- | -- | ----- | ----- |
| 메인 shell | `index.html` 1.27 MB, inline runtime/HTML 과다 | `large-files-report.json` 상위 | route별 데이터/카드 map 외부화, noncritical block 지연 | 초기 HTML parse 감소 |
| 정적 사주 엔진 | `js/saju-engine.js` 1.88 MB, quantum 985.6 KB | large/duplicate report, runtime loader 참조 | 기능별 chunk 분리, lazy load map 정리 | 기능 진입 전 JS 비용 감소 |
| static mirror | 동일 대형 파일이 public mirror에 복제 | duplicate report 218 groups | source/mirror는 유지하되 배포 산출물 용량 추적 | 저장소/배포 용량 관리 |
| Swiss ephemeris assets | `.se1`, wasm이 root/public vendor에 중복 | duplicate report | 실제 fetch 경로 확인 후 한 경로로 수렴 후보 | 정적 자산 중복 감소 |
| font preload | font 4종 선언, 1종 preload | `index.html` font/preload 검색 | 실제 first paint font만 preload 유지 | 네트워크 초기 경쟁 완화 |
| R2 music covers | first viewport 근처 image 3개 eager | `index.html` music.code-destiny.com 검색 | viewport 위치 확인 후 lazy/fetchpriority 조정 | R2 초기 호출 감소 |
| React runtime payment src | `PAID_SERVICE_RUNTIME_SRC`가 `build-5e369f274cec`, static은 `build-ddb9d94bea3a` | `app/_lib/billing-client.ts:220`, `index.html` cache key 검색 | cache key single source 후보 | stale runtime 로딩 위험 감소 |
| debug output | 관계 타로, PDF, billing, music player 등에 console 출력 | debug keyword search | 운영 필요 로그와 dev 로그 분리 | 콘솔 노이즈 및 민감 맥락 노출 감소 |
| music manifest | 가사 template literal 누락으로 build 차단됨 | 초기 typecheck/build 실패, 복구 후 PASS | manifest generator 재발 방지 후보 | 기본 검증 유지 |
| 대형 client data | `app/saju/love-simulation/_data/loveCodeMvp.ts` 615.9 KB | large report | route chunk 영향 확인 후 dynamic data import | React route bundle 감소 |

## 5. 모듈화 후보

| 영역 | 현재 문제 | 새 모듈 제안 | 적용 순서 |
| -- | ----- | ------- | ----- |
| 결제 접근 | static/React/Worker 사이 policy contract 산재 | `lib/payment/access-gate.ts`, `worker/lib/payment-access-gate.js` | registry read-only adapter부터 |
| 결제 정책 | coin/pass/monthly/single branch가 여러 파일에 반복 | 기존 `worker/lib/billing-policy.js` 확장 | profile-card policy와 분리 유지 |
| 프로필 source of truth | Worker route 2곳과 static cache bridge 병행 | `worker/lib/profile-source-of-truth.js`, `app/_lib/profile-normalizer.ts` | server list/current resolver 먼저 |
| R2 asset URL | URL 생성/폴백이 static과 React에 분산 | `lib/assets/r2-url.ts` | React helper 유지 후 static map 생성 |
| PDF ready payload | archive URL, mime, localAssembly validation 반복 | `worker/lib/pdf-ready-payload.js` | 신규 helper + 한 PDF route 적용 |
| 운세 입력 정규화 | 사주/자미/숙요/점성 입력 정규화가 기능별 분산 | `lib/fortune/input-normalizer.ts` | read-only parser부터 |
| 에러/empty/loading UI | React paid feature와 static paid feature UI가 별도 | `components/common/ErrorState.tsx`, `components/payment/PaymentWaitOverlay.tsx` | React route만 먼저 |
| debug/logging | console 직접 호출 다수 | `worker/lib/runtime-log.js`, `lib/dev-log.ts` | 운영 로그 허용 목록 작성 |

## 6. 회귀 위험 보호 영역

- 결제: `worker/routes/billing.js`, `worker/routes/payments.js`, `worker/lib/billing-policy.js`, `worker/lib/paid-feature-registry.js`, `lib/payment/portone.ts`, `app/_lib/billing-client.ts`, `js/destiny-profile.js`, `index.html`
- 이용권/월정석/단건결제: coin/pass/monthly credit/single purchase branch 전부 보호. 특히 프로필 50 coin 정책은 이용권 무료 통과 제외 유지.
- 프로필 카드: `worker/routes/profile.js`, `worker/routes/user.js`, `worker/lib/profile-card-mutation-policy.js`, `app/_lib/profile-card-storage.ts`, `app/me/page.tsx`, `js/destiny-profile.js`
- PDF 생성: `worker/routes/*book*.js`, `worker/routes/astro.js`, `worker/pdf-v2/**`, `worker/lib/premium-pdf-execution.js`, `worker/lib/pdf-runtime.js`
- 운세 엔진: `js/saju-engine.js`, `js/saju-engine-tarot-sukuyo-quantum.js`, `app/_lib/ziwei*`, `lib/tarot/**`, `worker/routes/tarot.js`
- React 유료 기능: `app/hooks/useCoinGate.ts`, `app/_lib/billing-client.ts`, `app/components/PaymentProcessingContext.tsx`, premium pages/routes
- 정적 유료 기능: `index.html`, `js/destiny-profile.js`, `js/core/index-inline-runtime.js`, `js/core/uiBindings.js`
- R2 에셋: `lib/r2-public-url.ts`, `index.html` R2/music/font URLs, `worker/routes/admin.js`, `worker/routes/insights.js`
- MongoDB: `worker/lib/models.js`, `app/_lib/models/**`, `server/models/**`, migration scripts. 운영 DB index/field 변경 금지.

## 7. 1차 실행 제안

1. `app/music/_data/musicManifest.ts` 기존 build blocker를 복구해 기준 검증을 정상화.
2. `_tmp_*`, `.codex*.log`, dev-server logs, `tsconfig.tsbuildinfo`를 exact `rg`로 재확인 후 묶음 삭제.
3. 삭제 후 `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:worker` 재실행.
4. 결제/프로필/PDF/R2는 삭제 없이 `cleanup-candidates.md`에 유지.
