# Mobile Final Completion Audit

## 1. 최종 목표 대응 현황
| 목표 | 검증 근거 | 상태 |
|---|---|---|
| 모바일 첫 화면에서 핵심 CTA 즉시 인지 | compact hero, primary CTA, quick start, bottom nav marker | 완료 |
| 홈 길이와 초기 피로도 축소 | mobile-only compact 구조, category tabs, collapsed all-features/pass/footer | 완료 |
| 모든 기능 카테고리 빠른 탐색 | `MOBILE_FEATURE_REGISTRY.md`, `npm run verify:mobile-feature-coverage` | 완료 |
| 카드 짧고 명확화 | `MobileFeatureCard`, `MobileCompactCard`, `MobileFeatureBottomSheet`, `npm run verify:mobile-runtime-readiness` | 완료 |
| 모든 카드 모바일 touch 진입 | registry route/action 검증, CDP mobile smoke touch 검증 | 완료 |
| 내부 기능 누락 방지 | 107개 required feature row와 source evidence 검증 | 완료 |
| 기능 상세 모바일 요약 우선 | `MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md` | 완료 |
| 결과 화면 요약 우선/상세 접기 원칙 | 상세 템플릿 및 static/React 감사 기록 | 완료 |
| 결제/잠금/이용권 UI 모바일 sheet 우선 | `cd-mobile-payment-lock-ux-v20260701`, `openGoldenGrainCharge` wiring | 완료 |
| 이미지/BGM/스프라이트 체감 성능 | lazy image/audio/sprite 원칙 및 runtime readiness 검증 | 완료 |
| 가로 스크롤 방지 | CDP 390px viewport smoke 검증 | 완료 |
| PC 감성 유지/모바일 별도 구조 | 모바일 breakpoint 전용 shell marker와 public mirror sync 검증 | 완료 |

## 2. 기능 인벤토리
- 보고서: `MOBILE_FEATURE_REGISTRY.md`
- 검증 명령: `npm run verify:mobile-feature-coverage`
- 검증 결과: required feature 107/107, source entry evidence, mobile markers 통과.
- 추가 정밀화: category/hub 행, privacy modal, payment confirmation, animal/hormone/result action entry를 registry에 포함했다.

## 3. 진입 라우팅/액션
- 검증 명령: `npm run verify:mobile-entry-actions`
- 검증 범위: registry의 route/hash/API/action 토큰이 실제 static file, App Router route, dynamic route, worker/API mention, alias, 또는 action implementation으로 이어지는지 확인했다.
- 정밀화 근거: `#mobileFeatureHub`는 실제 `#cdMobileDestinyHub`로 정정했고 `/oracle/hwatu`, `/oracle/kemet`, `/oracle/juyuk`는 `/index.html?action=...` alias로 확인했다.

## 4. 모바일 런타임 구조
- 검증 명령: `npm run verify:mobile-runtime-readiness`
- 검증 범위: viewport, compact hero, quick start, category chips, saved area, Moonlight Pass compact, All Features collapsed, bottom nav, representative internal routes, nested interactive 방지, 44px touch target, hidden overlay pointer-events, 100dvh/safe-area, payment sheet immediate open, plan collapsed toggle, React payment fallback, premium gate CTA, audio lazy source injection, public shell mirror marker.
- sync/cache: `npm run sync:public`, `npm run verify:locale-main-sync`, `npm run verify:runtime-cache-sync` 통과.

## 5. 모바일 CDP Smoke
- 검증 명령: `npm run verify:mobile-cdp-smoke`
- 검증 환경: 390x844 mobile viewport, temporary static server, Chrome CDP touch/click smoke.
- 검증 결과: primary CTA touch OK, tarot touch OK, bottom nav oracle touch OK, payment pass button wiring OK, initial audio/video elements 0, horizontal overflow 없음.

## 6. 결제/잠금/이용권 정책 보존
- 가격, 이용권, 월정석, 단건 결제 우선순위는 변경하지 않았다.
- 모바일 UI는 클릭 즉시 sheet를 열고, 권한/결제 확인은 열린 UI 내부에서 진행되도록 점검했다.
- 이미 구매한 콘텐츠는 worker의 `already_unlocked` 접근 사유와 `ACCESS_ALREADY_UNLOCKED` 흐름으로 확인된다.
- 개인/결제 정보 public cache 정책은 변경하지 않았고, 권한 확인 캐시/stale-while-revalidate는 public cache 없이 유지하는 방향으로 검토했다.
- `profile-card-manage`는 이용권 결제 불가(passExcluded) 기능으로, **family 포함 전 등급이 이용권 커버 대상이 아니다** — 단건결제 또는 월정석으로만 정산된다. family 무료는 이용권 결제가 아니라 정책 계층(`profile-card-mutation-policy.js`)의 0원 바이패스로 처리된다. 서버 정본은 `isPassExcludedPricing`이며 featureKey별 예외 분기는 금지다. (2026-07-16 정정 — 이전 서술은 되돌려진 정책이었다.)
- `npm run verify:billing-pass-policy`, `npm run verify:paid-gate-ui`, `npm run verify:test-account-payment-flow`, `npm run verify:test-account-all-paid-services`, `npm run verify:portone-single-payment`를 실행했다.
- 전체 유료 서비스 test-account flow 결과: 252개 케이스, 총 42,275 차감, 최종 포인트 57,725, PASS.
- PortOne 단건 결제 회귀 verifier는 PASS였지만 로컬 환경에 `PORTONE_API_SECRET`, `PORTONE_CHANNEL_KEY`, `PORTONE_STORE_ID`가 없어 실제 provider 승인 callback은 배포/sandbox 환경에서 추가 확인이 필요하다.
- 실제 결제 승인/실패 callback은 sandbox 계정과 provider 응답이 필요하므로 운영 검증 시 `verify:test-account-payment-flow`, `verify:test-account-all-paid-services`, `verify:billing-pass-policy`, `verify:portone-single-payment`를 함께 사용한다.

## 7. 최종 감사 Verifier
- 검증 명령: `npm run verify:mobile-final-audit`
- 검증 범위: 13개 모바일 보고서 존재, package mobile verifier script 연결, root/public shell marker, cache key sync, registry row count, 최종 감사 필수 기록, core mojibake pattern.
- 기대 출력: Reports 13/13, package scripts 10/10, shell marker files 6/6, cache key 6개 셸 정렬, registry rows 104 이상.
- 🔴 캐시키 해시를 이 문서에 박지 말 것 — `sync:public` 이 셸을 건드릴 때마다 회전하므로 적는 순간 낡는다(2026-08-26 에 `build-e72ad565e0f1` → 실제 `build-472ff1db4370` 으로 어긋나 있던 것을 걷어냈다). 가드가 보는 것은 특정 해시가 아니라 **6개 셸이 같은 해시를 갖는지**다.

## 8. 원 요구사항 Verifier — 2026-08-26 은퇴
`scripts/verify-mobile-original-requirements.mjs` 를 삭제했다. 🔴 되살리지 말 것.

- **왜**: 13개 그룹을 전부 **리터럴 부분문자열 grep** 으로 판정하던 가드라, 마크업이 동적 생성으로
  옮겨가자 조용히 썩었다. 은퇴 시점 실패 19건 중 **10건이 오탐**이었다 — `data-mobile-card-kind`
  (`index.html:18539`) · `data-mobile-detail-section`(`:37509`) · `data-mobile-media`(`:18496`) 는
  전부 `setAttribute` 로 살아 있었고, body scroll lock 은 `PaymentProcessingContext.tsx` 에서
  `app/components/common/PaymentLoading.tsx` 로 이사했는데 가드가 옛 파일만 읽고 있었다.
- 나머지 9건(compact home)은 실제로 없다 — `#cdMobileDestinyHub` 허브 자체가 제거됐다
  (`index.html:7369` 주석이 "그 요소는 어느 셸에도 없다"고 적어 두었다).
- **대체**: 같은 계약을 렌더 기반 가드가 더 강하게 지킨다 — `verify:mobile-detail-render`
  (390x844 로 실제 렌더 후 DOM 쿼리) · `verify:mobile-detail-nonintrusive`(CI 배선) ·
  `verify:mobile-bottom-nav-sync` · `verify:mobile-feature-coverage` · `verify:mobile-lazy-mount-openers`(CI 배선).
- 이 가드는 `package.json` 에 스크립트가 없었고 `.github/workflows/**` 참조도 0건이라, CI 에서
  단 한 번도 돈 적이 없다.

## 9. Live Deployment Gate — 2026-08-26 은퇴
`scripts/verify-mobile-live-deployment.mjs` 를 삭제했다. 🔴 되살리지 말 것.

- **왜**: 프로덕션 HTML 에 `cdMobileDestinyHub` 가 있는지 보는 게이트였는데, 그 허브는 없어졌고
  응답에 문자열이 남아 있던 이유는 **죽은 CSS 379줄이 아직 배포되기 때문**이었다. 즉 통과해도
  잘못된 이유로 통과하는 가드였다. 역시 npm 스크립트·워크플로 참조 0건.
- 배포 SHA 검증은 `scripts/verify-deployed-sha.mjs`(Pages `/version.json` + Worker `/api/version`)가,
  셸 캐시키 정렬은 `verify:mobile-final-audit` 가 이어받는다.

## 10. Build/Dist Gate
- 검증 명령: `npm run build`
- 검증 결과: PASS. `sync:public`, `verify:public-parity`, `i18n:check`, `verify:locale-main-sync`, `verify:runtime-cache-sync`, `verify:adsense-route-policy`, Next build, `postbuild`, `adsense-readiness`가 통과했다.
- 안정화 기록: Next export worker가 완료 후 종료하지 않는 경우 `scripts/next-build-with-pages-manifest.mjs`의 watchdog이 완료된 export를 finalize하며, 실패 시 `.next/out`을 지우고 1회 재시도한다.
- dist 확인: `dist/index.html`, `dist/static/index.html`, `dist/en/index.html`, `dist/ja/index.html`, `dist/zh/index.html`에서 `cd-mobile-bottom-navigation-v20260701`, `MobileFeatureBottomSheet`, 그리고 6개 셸에 정렬된 cache key marker를 확인했다. (2026-08-26: `cdMobileDestinyHub` 는 없어진 요소라 목록에서 뺐고, 캐시키 해시는 회전하므로 박지 않는다.)

## 11. 최종 검증 기록
| 명령 | 결과 |
|---|---|
| `npm run verify:mobile-feature-coverage` | PASS |
| `npm run verify:mobile-entry-actions` | PASS |
| `npm run verify:mobile-runtime-readiness` | PASS |
| `npm run verify:mobile-cdp-smoke` | PASS |
| `npm run verify:mobile-final-audit` | PASS |
| `npm run build` | PASS |
| `npm run verify:billing-pass-policy` | PASS |
| `npm run verify:paid-gate-ui` | PASS |
| `npm run verify:test-account-payment-flow` | PASS |
| `npm run verify:test-account-all-paid-services` | PASS |
| `npm run verify:portone-single-payment` | PASS - provider env 없음 |
| `npm run typecheck -- --pretty false` | PASS |
| `npm run build:worker` | PASS - wrangler dry-run, unenv warning only |
| `npm run verify:entry-encoding -- --strict-core` | PASS |
| `npm run verify:locale-main-sync` | PASS |
| `npm run verify:runtime-cache-sync` | PASS |
| changed text mojibake pattern scan | PASS - 다국어 정상 악센트와 guard regex literal만 예외 |
| `git diff --check` | PASS - 줄끝 경고만 출력, whitespace 오류 없음 |

## 12. 운영 확인 사항
- (2026-08-26 갱신) 라이브 marker 재검증 항목은 8·9절과 함께 은퇴했다. `cdMobileDestinyHub` 는 어느 셸에도 없는 요소라 "아직 안 보인다"가 영영 해소되지 않는 조건이었다. 배포 도달 확인은 `scripts/verify-deployed-sha.mjs` 가 Pages·Worker 양쪽 SHA 를 대조하는 쪽으로 일원화됐다.
- 모바일 브라우저 실제 결제 완료/실패/재시도는 sandbox 계정으로 별도 확인한다.
- iOS Safari와 Android Chrome 실기기 확인은 배포 URL에서 마지막으로 수행한다.
- `index.html` 변경 뒤에는 항상 `npm run sync:public`, `npm run verify:locale-main-sync`, `npm run verify:runtime-cache-sync` 순서를 유지한다.
