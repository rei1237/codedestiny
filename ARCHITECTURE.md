# Code Destiny 작업 지도

이번 작업의 행에서 시작한다. 심볼 → import → 호출부 순서로 확인하며 관련 없는 기능을 함께 읽지 않는다. 5~15파일은 탐색 목표이지 회귀 확인의 제한이 아니다.

## 실행 경계

| 영역 | 원본·진입점 | 검증 출발점 |
|---|---|---|
| 정적 홈 | `index.html`, `js/core/init.js`, `js/core/index-inline-runtime.js` | `verify:js-module-graph`, `verify:public-mirror-fresh` |
| React 화면 | `app/`, `components/`, `src/features/` | `typecheck`, `lint:changed` |
| Worker API | `worker/index.js`, `worker/routes/` | `test:jest`, `verify:worker-no-undef` |
| 결제 코어 | `worker/payments/index.js`, `js/core/payment-service.js` | `check:payment` |
| 결제 표시 | `js/core/checkout-entry.js`, `app/components/PaymentProcessingContext.tsx` | `verify:payment-choice-parity`, `verify:checkout-pass-card` |
| 이용권·권한 | `worker/payments/passes.js`, `worker/payments/entitlements.js`, `js/core/pass-verdict.js` | `verify:pass-snapshot`, `smoke:core` |
| 인증 | `worker/routes/auth.js`, `worker/lib/auth.js`, `app/_lib/auth-store.ts` | `verify:auth-session-stability`, 인증 Jest 테스트 |
| 프로필 | `js/destiny-profile.js`, `worker/routes/profile.js` | 프로필·접근 상태 테스트 |
| LLM | `lib/llm-client.ts`, `worker/lib/gemini.js` | `__tests__/__mocks__/`, `__tests__/fixtures/` |
| DB | `worker/lib/db.js`, `worker/lib/models.js` | DB mock 테스트; 마이그레이션 실행 금지 |

## 기능별 탐색

| 기능 | 먼저 좁힐 위치 |
|---|---|
| 사주 | `js/saju-engine.js`, `components/fortune/`, `app/saju/`의 관련 심볼 |
| 자미두수 | `worker/routes/`, `worker/lib/`의 ziwei 심볼, 대응 app 화면 |
| 숙요점 | `js/saju-engine-tarot-sukuyo-quantum.js`의 sukuyo 심볼, Worker의 sukuyo 경로 |
| 베다·점성술 | `lib/vedicCalculator.js`, `lib/vedicSwissChart.js`, `app/vedic-ai/` |
| 타로 | `lib/tarot/`, `app/tarot/`, 관련 Worker 라우트 |
| 운명의 찻집 | `src/features/fortune-tea-house/`, `worker/routes/fortune-tea-house.js` |
| 네오 | `src/features/neo-war-room/` |
| 모바일 | `apps/mobile/`; 웹 자산은 기존 원본에서 생성 |

## 원본과 공통화 경계

- `public/`에는 실제 자산과 생성 사본이 섞여 있다. `sync:public`과 루트 `.ignore`가 확인한 동일 사본만 기본 검색에서 제외한다. 미러를 직접 수정하지 않는다.
- 정적 홈의 정본은 `app/page.js`가 아니다. 홈 변경은 루트 셸과 해당 JS/CSS에서 시작한다.
- 결제는 이미 상품·주문·PG·권한·이용권·월정석 모듈로 나뉜다. 새 payment-core나 가격표를 만들지 않는다.
- 렌더러의 셸 → 독립 페이지 → React 폴백 우선순위는 의도적이다. 카드 CSS·마크업 공유와 DOM 부착 책임은 구분한다.
- 구 결제 구현은 `config/payment-freeze.json`으로 보호된다. confirm 라우팅을 되돌리는 것만으로 안전한 롤백이 된다고 가정하지 않는다.
- 프로필 대형 파일은 UI·복귀·접근 상태 호출부를 포함한다. shell 파일은 초기화·이벤트·동적 import 순서를 포함한다. 줄 수만으로 분할하지 않는다.
- 인증 문구·로케일은 `app/_lib/auth-session-copy.ts`, 공급자 프로필 정규화는 `worker/lib/social-profile.js`다. 상태·OAuth·DB 책임과 분리한다.

## 상세 정본과 개발 도구

- 안전 규칙·작업별 문서: [CLAUDE.md](CLAUDE.md)
- 구조 상세: [docs/SERVICE_STRUCTURE.md](docs/SERVICE_STRUCTURE.md)
- 기능·라우트: [docs/FEATURE_MAP.md](docs/FEATURE_MAP.md), [docs/ROUTE_MAP.md](docs/ROUTE_MAP.md)
- 로컬 측정과 명령: [docs/dev-environment-baseline.md](docs/dev-environment-baseline.md)
- CI·배포 계약: [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md)

기능 경계는 기존 위치를 유지한다. 이 지도는 새 폴더로 이동하라는 지시가 아니다.

