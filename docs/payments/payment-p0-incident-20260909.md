# P0 결제 후 서비스 미제공 — 작업 보고서

현재 상태: 구현·검증 진행 중. 운영 배포 및 서비스 전반 완료 보고가 아니다.

## 1. 마스터 인연의 서 장애 원인

### 카카오페이 단건 궁합 거래

운영 DB를 읽기 전용으로 확인했다. 식별자·고객 개인정보는 이 문서에 싣지 않는다.

| 단계 | 확인된 기록 (KST) |
| --- | --- |
| 상품·수단 | master-love-codex-compat, digital_content, kakaopay, 30,000원 |
| 주문 생성 | 2026-09-09 10:59:18 |
| PG 승인 기록 | 10:59:43 |
| 지급 표식 | 10:59:50 |
| 궁합 생성 세션 | 11:00:01, accessType=paid |
| 생성 진행 | chapters=0, generationProgress=null, createdAt=updatedAt |
| 환불 | 19:53:10, refunded/CANCELLED |

**재현한 원인:** 스키마의 generationProgress 기본값은 null인데, 최초 acquireBatchLock이 generationProgress.lockedAt/lockToken을 dotted $set으로 쓴다. MongoDB는 null의 하위 필드를 만들 수 없어 code 28로 거절한다. 실제 격리 replica에서 기존 update의 code 28을 재현했다. 수정 전 실제 /generate 핸들러에도 유효한 로그인·접근 토큰으로 요청해 HTTP 500, 진행 상태 null, 0챕터, updatedAt 불변을 확인했다(외부 네트워크 차단). 이 위치는 챕터 LLM 실행 전에 있다. 수정한 실제 lock 함수는 동일한 null 문서에서 성공하며, 5개 동시 요청 중 하나만 잠금을 얻는다.

신고 거래 DB 상태와 확인한 운영 SHA feef3039345ab18ad1d5c172918218b99f0d46ee의 코드가 이 재현 조건에 일치한다. 사고 당시 요청 로그와 배포 SHA의 직접 연결은 아직 확보하지 못했으므로, 해당 HTTP 요청에서 code 28이 발생했다는 로그 증명과는 구분한다. SecurityEvent 조회에는 관련 이벤트가 없었다.

카카오 가입 정보 누락을 원인으로 단정하지 않는다. 해당 거래는 서비스 입력 검증과 세션 생성까지 이미 통과했다. 이 결함은 카카오페이뿐 아니라 같은 세션 생성기를 쓰는 PC·모바일·이용권 경로에도 적용될 수 있다. 환불 거래는 복구 대상에서 제외한다.

### 패밀리 이용권

소비 후 마지막 한도 종료, 접근 토큰 만료, 최근 소비 마커 회전 이후의 재시도 차단을 회귀 대상으로 수정했다. 기존 승인 회차의 서버 세션은 현재 이용권 신규 이용 자격과 분리해서 복구한다. 소비와 영속 PointHistory 증빙은 하나의 Mongo transaction으로 기록한다. 고객의 특정 패밀리 이용권 기록은 식별되지 않았으므로 신고 건의 개별 원인은 미확정이다.

기존 테스트는 계산/정적 흐름·개별 mock 중심이었다. null 부모에 dotted update를 수행하는 실제 Mongo 동작과 결제 writer→서비스 실행의 경계를 검증하지 않아 이 장애를 놓칠 수 있었다.

## 2. 동일 위험 기능

| Feature | 위험 | 변경/남은 확인 |
| --- | --- | --- |
| 마스터 인연의 서 개인·궁합 | null 진행 상태의 첫 잠금 실패, 만료 토큰, 동시 생성 덮어쓰기, 오류 안내문 완료 처리 | 객체 초기화·잠금 토큰 조건부 저장·소유 세션 복구·정상 챕터만 완료 |
| 나크샤트라 | 과거 null 진행 상태에서 같은 잠금 update 실패 | 잠금 객체 초기화; 현재 신규 생성은 이미 객체를 저장 |
| 공통 이용권 소비자 | 한도 차감 후 증빙 저장 유실, 최근 마커 회전 | 차감/증빙 transaction, 영속 증빙 재조회 |
| V2 회당 상품 | 지급 표식만 있고 재개할 실행권 없음 | payment_entitlements에 주문별 영속 구매권 지급, 기존 서비스별 PaidExecutionRecord와 분리, confirm/webhook/reconcile 공통 적용 |
| 작명 | 선지급 실행 기록과 자체 실행 키 충돌, 동시 생성 재진입, 생성 전 소비 표식 | 기존 실행 신원 재사용·CAS·성공 시 소비 표식 |
| deferred 등록 소비자 | 동일 필드를 $setOnInsert와 $set에 중복 지정, core와 등록의 신원 불일치 | 중복 update 경로 제거, 동일 결정적 문서 신원 사용 |

현재 catalog 132개와 결제 키워드가 있는 소스 991개를 다시 추출했다. 전체 표는 payment-p0-inventory.md/json. 기존 별칭·정적·앱·이용권·음원 SKU 상세 목록은 payment-inventory.json. 공통 어댑터 테스트는 서비스별 E2E 증명이 아니다.

## 3. 구조 변경

Before: PG 검증 → paid → 지급 표식 → 브라우저 증빙 → 현재 이용권/짧은 토큰 검사 → 세션 → null 하위 잠금 update.

After: PG 검증 → paid → 영속 회당 구매권(payment_entitlements) → 지급 표식 → 서비스별 실행/결과(PaidExecutionRecord 등). 지급 실패는 paid 상태로 남아 confirm/reconciliation 재시도. 서비스는 인증된 소유 회차와 환불 상태를 검사해 기존 세션을 재개하고, 성공한 생성 결과만 완료한다. 마스터의 새 요청 키가 같은 결제를 새 회차로 바꾸지 못하도록 결제 증빙에 세션 신원을 연결하고 입력 해시를 확인한다. 기존 암호화 paidResume의 주문 전 저장·소유자 복호화 경로를 재사용한다. 세션 생성 전 브라우저가 종료되어도 서버 주문 목록에서 복구한다. 입력 보관 기간이 지난 미사용 구매권은 재입력 후 결제 게이트 없이 기존 주문으로 시작한다.

## 4. 수정 파일

- worker/routes/master-love-codex.js, worker/lib/master-love-codex-session-access.js: 세션 복구·첫 잠금·잠금 소유권·실패 챕터 처리.
- worker/lib/master-love-codex-quality.js, master-love-codex-prompt.mjs: 새 장의 기존 최소 분량·필수 해석/근거/행동·DNA 지표 검증, 잘못된 응답 캐시 배제, 출생시각 미상 해석 한계 명시. 기존 저장 결과에 새 품질 기준을 소급 적용하지 않는다.
- src/features/master-love-codex/MasterLoveCodexPage.tsx 및 styles/codex.module.css: 서버 보관 회차 목록과 재개 버튼.
- worker/routes/nakshatra-ai.js: null 진행 상태 잠금 초기화.
- worker/routes/naming-prompt.js: 실행권 신원 호환, 동시 생성 CAS, 성공 전 미소비.
- worker/payments/purchase-entitlement-model.js: 기존 서비스 결과와 독립적인 구매권 저장.
- worker/payments/executions.js, index.js, entitlements.js, reconcile.js: 회당 실행권·주문 상태·복구 목록·환불 및 재지급.
- worker/lib/pass-consumption.js, worker/payments/passes.js: 원자적 이용권 소비/증빙과 영속 재시도.
- worker/routes/billing.js: 등록 문서 신원과 update 충돌 제거.
- __tests__/worker/*, __tests__/ui/ai-prompt-pass-recovery.behavior.test.js, __tests__/fixtures/fake-payment-db.mjs: 결제·이용권 회귀 및 DB 어댑터.
- scripts/audit-payment-p0*.mjs, scripts/verify-payment-p0-replica.mjs: 읽기 전용 조사·격리 replica 재현.
- scripts/verify-master-love-codex-flow.mjs: catch 내부 라우팅 검사에 AST 적용.
- sitemap 및 lastmod: 페이지 변경에 따른 정본 생성 결과.

## 5. DB 변경 및 이행

신규 payment_entitlements collection을 사용한다. type=service_run, status=granted/refunded, userId/productId/featureKey/orderId/paymentId/requestId/grantedAt을 보관한다. 주문 기반 결정적 _id로 중복 지급을 막으며 조회·취소도 _id로 수행하므로 별도 신규 인덱스가 필요하지 않다. 기존 paid_execution_records의 서비스별 신원·고유 인덱스와 충돌하지 않는다. 소비 증빙 pointhistories도 결정적 _id를 사용한다. payments.metadata.purchaseGrantVersion, fulfillmentRetryAt, fulfillmentLastError를 추가 사용한다. masterLoveCodexSessions의 기존 null은 재개 시 객체로 초기화하므로 운영 일괄 쓰기가 필요하지 않다.

읽기 전용 실측에서 payments의 merchantUid/impUid unique, paid_execution_records의 executionId unique·paymentId partial unique·userId/featureId/profileId/requestId unique, masterLoveCodexSessions의 id 및 userId/idempotencyKey unique를 확인했다. 추가 index 적용·과거 중복 정리·운영 스키마 migration은 수행하지 않았다. 기존 데이터 삭제, 금액·환불 변경, 이용권 기간/등급/포함 한도 변경 없음.

## 6. 검증

- 결제 V2/패밀리/마스터 회귀: 29 suites, 501 tests 통과 (후속 수정 후 전체 게이트 재검증 진행).
- 격리 Mongo replica: 기존 code 28 재현, 수정한 첫 배치·실패 회차 재잠금, 동시 잠금 1회 통과.
- 같은 replica: 동시 이용권 5요청→차감 1회/증빙 1개, 증빙 DB 실패 전체 롤백, 이용권 만료/마커 삭제 후 같은 회차 복구 통과.
- Node 이용권/격리 작업 검사: 23개 통과.
- verify-master-love-codex-flow 통과. typecheck 통과 후 후속 변경 재검증 진행.
- main 60c096fe3 통합 후 check:fast 및 check:payment 통과: Jest 224 suites / 2,571 tests, Node 1,006 tests. 이후 품질/UI 변경과 cad59b9c5 통합에서 Jest 225 suites / 2,621 tests, Node 1,011 tests 및 841개 페이지 빌드가 통과했으나 main 변경으로 최종 영수증 발급이 차단됐다. a724956a6의 스테이징 mock 모드를 추가 통합해 재검증한다. 최종 ci:preflight 영수증과 원격 CI 결과는 PR의 검증 기록에서 확인한다.
- 스테이징 3개 플래그의 엄격한 조건과 외부 호출 차단 검증 통과. 격리 replica의 실제 인연의 서 생성 핸들러에서 명시적 검증 원고 20개 저장·완료 후 소비를 확인했다. 실제 배포된 스테이징 검증과 구분한다.
- 격리 replica의 실제 인증 라우트: 카카오페이 승인 fixture → /api/billing/coin-gate/deferred/register → 중복 등록 성공, 실행권 1개 확인.
- 같은 replica에서 /generate 실제 라우트에 mock 생성기 주입: 생성 실패 503·미소비 → 같은 세션 모든 챕터 완료 → 완료 재열람에서 생성기 재호출 없음 → 환불 후 402 차단 통과. 짧은 접근 토큰이 없어도 인증한 소유 회차로 수행한다.
- #1870(60c096fe3f04a15d261feb065845ae2a5b8fef51)의 캐시 무효화·한도 CAS를 보존해 통합했다. 통합 후 격리 replica 전체 재통과.
- 후속 환불 호환 보강: 신규 구매권 없는 기존 실행 기록 취소도 성공으로 처리. 관련 2 suites / 134 tests 통과.
- 작명 구매권과 실행 저장 분리, 동시 생성 선점 1회, 성공 시 소비, 완료 재열람 통과.
- 브라우저 복구 동작 mock 3건 통과: 서버 입력 복구·미검증 주문 차단·입력 TTL 이후 기존 주문으로 재입력(결제 게이트 미호출).
- 실제 PG 결제·실기기·스테이징 검증·운영 배포는 미실행. 이후 별도로 승인받은 실제 LLM 응답·모바일 리더 검증은 [품질 보고서](master-love-codex-quality-20260909.md)에 기록했다.
- 추가 인연의 서 검사: 개인판·궁합판 40장 계약, 누락 DNA, 짧은/불완전 상담, 잘못된 캐시, 상대 날짜 오류, 회차 복구를 포함한 2 suites / 50 tests 통과. 기존 코드는 200자만 넘으면 장 성공, 누락 지표는 0점 보정이었다. 새 생성에 장별 minChars와 구조를 적용하고 기준 미달은 동일 구매로 재시도한다. 이 검사는 실제 상담 문장의 타당성·독창성을 보증하지 않는다.
- 취소 회귀: 격리 replica 실제 API에서 refunded/cancelled/canceled 각각 생성 재시도 및 완료 결과 재열람 402, 생성 도중 취소 시 새 챕터 저장·응답 차단 통과. 이미 전달되거나 다운로드된 내용을 회수하는 기능은 아니다.
- 궁합 엔진 검사: verify-master-love-codex-compat-determinism 90쌍, 방향성/동일 입력 결정론·점수 쏠림 검사 통과. 엔진 계산 정책은 변경하지 않았다.

## 7. 과거 이상 결제 조회

읽기 전용 집계 시점의 전체 결제 396건, paid/success/fulfilled 21건, 지급 표식 없음 16건, null 진행 상태·0챕터 마스터 세션 1건이다. 마지막 1건은 확인한 환불 거래다.

21건은 이용권 11건·디지털 상품 10건이다. 디지털 10건을 소유 사용자·주문/요청 키로 연결한 결과 음악 2건은 계정 해금, 매력 리포트 1건은 content_entitlements, 작명 6건은 완료 실행과 저장된 구버전 generatedPrompt 결과가 확인됐다. 작명의 빈 resultId만 보고 결과 유실로 분류하면 오탐이다. 타로 1건은 연결 실행·권한·계정 해금 기록이 없어 수동 확인 대상이다(보관 만료·레거시 제공 여부 미확정). 이용권 11건은 과거 기간/후속 구매 대조가 남았다. 지급 표식 없는 16건을 미지급 확정으로 해석하지 않는다. 자동 복구한 운영 건수 0. 확정 미지급/자동 복구 가능 건수는 미확정.

## 남은 완료 조건

전체 서비스 결과 완료 후 소비 확정/실패 예약 해제, 과거 이용권 사이클 보상 및 환불과 승인 회차의 정책 대조, 마스터 외 모든 진입 UI의 서버 권한 복구·입력 TTL 이후 미사용 구매권 재연결, 모든 SKU별 E2E·기기 테스트, 운영 요청 로그 대조, staging/CI/PR 확인은 아직 완료되지 않았다. 두 불변식의 서비스 전반 증명은 남아 있다.

롤백은 신규 결제 진입을 제어하되 지급된 실행권/기존 세션/복구 경로를 삭제하지 않는 방식으로 진행해야 한다. 정책 변경이나 소급 재과금은 하지 않는다.
