# Cleanup Candidates

## 삭제 검증 대기

| 후보 | 상태 | 다음 확인 |
| --- | --- | --- |
| `_tmp_saju_3c71.js` | 삭제 후보 | `rg "_tmp_saju_3c71|_tmp_saju_3c71.js"` 후 제거 |
| `_tmp_bfd_saju.js` | 삭제 후보 | `rg "_tmp_bfd_saju|_tmp_bfd_saju.js"` 후 제거 |
| `_tmp_313a8bd.js` | 삭제 후보 | `rg "_tmp_313a8bd|_tmp_313a8bd.js"` 후 제거 |
| `_tmp_ziwei.diff` | 삭제 후보 | `rg "_tmp_ziwei|_tmp_ziwei.diff"` 후 제거 |
| `.codex-next-dev.log`, `.next-dev-server.log`, `.codex-*.log`, `codex-dev-server-*.log`, `dev-server.log`, `tmp-codex-animal-dev.log` | 삭제 후보 | exact filename `rg` 후 제거 |
| `tsconfig.tsbuildinfo` | 삭제 후보 | `.gitignore` 확인 후 제거 |
| `all_webp_files.txt` | 처리 완료 | `git grep "all_webp_files"` 결과 문서/보고서 외 참조 없음. 삭제 완료 |
| `seo-audit-report.md`, `seo-audit-report.json` | 보류 | SEO 감사 기록 보존 필요성 확인 |

## 삭제 금지 또는 보류

| 후보 | 보류 이유 | 필요한 증거 |
| --- | --- | --- |
| `js/saju-engine.js` | static runtime loader가 직접 로드 | bundle split 전 기능별 smoke |
| `js/saju-engine-tarot-sukuyo-quantum.js` | static runtime loader가 직접 로드 | tarot/sukuyo/saju smoke |
| `public/**` mirror | sync 산출물 | root source 변경 후 sync 절차만 허용 |
| `server/**` payment/profile fallback | legacy compatibility 가능성 | Worker route coverage, traffic/fallback evidence |
| `worker/routes/billing.js` console output | 결제 진단 로그일 수 있음 | 운영 로그 정책 확정 |
| PDF localAssembly/externalGeneration guards | LLM 회귀 방지 핵심 guard | PDF smoke 통과 후 공통화 |
| `fortune/data/**`와 `public/fortune/data/**` | 생성/배포 mirror 데이터 | generator 및 sitemap/rss 경로 확인 |
| `js/vendor/sweph-wasm/**`와 `public/js/vendor/sweph-wasm/**` | 브라우저 fetch 경로 민감 | 실제 wasm/ephe fetch path 확인 |
| `css/index-inline-extracted.css`, `public/css/index-inline-extracted.css` | 코드 참조는 감사 보고서 외 없음. 단, sync가 root `css`를 `public/css`로 복사하고 stale 제거는 보장하지 않음 | source+mirror 삭제 정책 정리 |
| `scripts/verify-paid-feature-billing-policy.mjs` | 처리 완료. `sukuyo-symbolic-comparison` 기대값을 현재 Worker registry 및 Sukuyo engine의 50코인 설정과 일치시킴 | `node scripts/verify-paid-feature-billing-policy.mjs` 통과 |

## 모듈화 대기

| 영역 | 후보 모듈 | 선행 조건 |
| --- | --- | --- |
| 프로필 current/list resolver | `worker/lib/profile-limits.js` | current/access helper 일부 통합 완료. `listUserProfiles` 추가 공통화는 route test 필요 |
| 프로필 카드 mutation access | `worker/lib/profile-card-mutation-policy.js` 확장 | profile 50 coin regression pass |
| 결제 게이트 | `lib/payment/access-gate.ts` | static/React featureKey contract 정리 |
| R2 URL | `lib/assets/r2-url.ts` | static shell cache key map 확인 |
| PDF ready payload | `worker/lib/pdf-ready-payload.js` | PDF route 1개에 먼저 적용 |
| 운세 입력 정규화 | `lib/fortune/input-normalizer.ts` | 사주/자미/숙요 fixture 확보 |
