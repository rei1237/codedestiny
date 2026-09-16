---
status: active
updated: 2026-09-16
next: 초기 운영 릴리스는 완료. 추가 Worker Mongo 검사에서 간헐적 조회 503을 발견해 최종 승격을 보류했다. 연결 보호 수정의 CI와 스테이징 재검증을 완료한 뒤 승격한다.
---

# 영냥이 MongoDB 통합 출시 기록

## 추가 실환경 검증 (진행 중)

- 실제 스테이징 Worker와 Atlas에 격리된 QA 사용자/결제 fixture를 넣고 로그인, 동시 활성화, 증빙의 원자적 소비, PAID 복원, 401/404/금액 불일치 402를 검사했다. 실제 PG·LLM 호출은 0회이며 fixture는 각 실행 후 삭제했다.
- 초기 두 실행에서 활성화 후 조회 503이 관측됐다. 이후 성공 재현만으로 장애가 해결됐다고 판단하지 않는다. 정확한 실패 로그 상관관계를 조사 중이다.
- 코드에서 활성화 트랜잭션이 공통 Mongo 활성 작업 회계 밖에 있는 결함을 확인했다. 전체 트랜잭션과 세션 종료를 기존 withMongoRetry 내부로 옮겨 동시 요청의 연결 교체로부터 보호한다. 읽기/생성의 중복 connectDb도 제거했다.
- 별도 타임아웃 확대나 새 fallback은 넣지 않았다. 이 결함이 최초 503의 단독 원인이었는지는 아직 확정하지 않았다.
- 기존 63725c95e 운영 배포 결과는 아래에 보존한다. 최종 수정본 배포 완료로 해석하지 않는다.

## 통합 결과

영냥이는 CODE DESTINY 내부의 `/yeongnyangi/` 서비스다. 원본 보라색 메인·고양이·생선·방·8장면 프롤로그를 유지하며, 결제 화면과 처리 팝업은 영냥이 자산으로 개선했다. 새 인증 시스템이나 회원 DB를 만들지 않았다. 기존 가격과 단건 결제 정책을 유지한다.

- 6개 체계 × 생선 4등급, 2체계 융합 3종, 전체 융합 1종 = **28개 상품**.
- 상품 가격은 기존 `billing-feature-registry`에서 서버가 조회한다.
- 신규 profile, 부족한 출생 정보 보완, 출생시간 미상, 기존 프로필 선택을 지원한다.
- 무료 버튼은 기존 CODE DESTINY `/today/`, 유료 상담은 영냥이 내부 경로를 사용한다.

## 저장과 결제

기존 User/ProfileCard/Payment 모델과 MongoDB 연결을 공유한다. 실제 기존 컬렉션명은 `users`, `profilecards`, `payments`다. 신규 collection은 `yeongnyangi_requests` 하나다. 주문 준비·계산 스냅샷·결제 참조·챕터·lease·실패/완료 상태를 같은 문서에서 관리한다. `userId`와 `paymentId`는 ObjectId, `profileId`는 기존 프로필 문자열, 상담 `_id`는 SHA256 문자열이다.

`사용자 → 준비된 상담 → 기존 Payment 주문 → PortOne/KG이니시스 → 서버 금액·주문·소유자·상태 검증 → Mongo 트랜잭션 활성화 → 실제 운세 계산 근거를 이용한 해석 → 챕터 저장 → 완료/재조회`

- 영냥이는 ONE_TIME / YEONGNYANGI_FORTUNE 메타데이터 및 direct_only 정책. 이용권·월정석·정기결제 미적용.
- PG 취소/실패/대기와 결제 상태는 기존 Payment가 관리한다. 상담은 CREATED/PAID/GENERATING/COMPLETED/FORTUNE_FAILED/REFUNDED 상태다.
- 같은 상담의 PG 주문 키는 `yn-<상담 id>`로 서버에서 결정한다. 이미 결제된 상담은 새 결제를 거부하고 기존 권리를 사용한다.
- 원자적 증빙 소비/활성화, 180초 lease, 완료 CAS로 중복 생성·저장을 방지한다.
- 생성 실패 시 결제와 완료 챕터를 보존한다. 제한된 재시도 예산 소진 시 운영 복구 도구로 유효 결제를 확인하고 1~5회만 추가할 수 있다.
- 운영·스테이징에 조회 인덱스 `{userId:1,createdAt:-1,_id:-1}`를 추가했다. 기존 문서/인덱스 삭제 없음.

## 엔진

| 체계 | 공유 정본 |
|---|---|
| 사주 | 기존 화면 계산 함수에서 추출한 runtime + `lib/saju/natal-power.js`; 추출 provenance 검사 |
| 자미두수 | `worker/lib/ziwei-ai-chart.js` |
| 숙요 | `worker/lib/sukuyo-astronomy.js`, `sukuyo-relation-core.js` |
| 베다 | `worker/lib/vedic-ai-chart.js` |
| 서양 점성술 | `worker/lib/swiss-ephemeris.js` strict 계산 |
| 타로 | `lib/tarot/tarot-interpretation-engine.mjs` |

계산 결과와 상품/주제별 챕터 근거를 LLM에 전달한다. 영냥이 persona와 등급별 분석 깊이·챕터 계약을 적용하며 잘린 출력이나 품질 계약 미달을 완료로 저장하지 않는다. 운영 provider에 mock fallback을 넣지 않았다.

## 제거한 운영 의존성

- 별도 D1 회원/프로필/주문/결과 및 SoulCat Worker API 의존 제거.
- 구 `/api/yeongnyangi-entitlement` 소비 경로 410 처리, SOULCAT_SERVICE 바인딩 제거.
- staging SoulCat route 5개 제거, 기존 queue/dlq 전달 pause, 구 Worker cron 비활성.
- 원본 홈 배너의 `/_soulcat/assets/` 참조를 내부 자산으로 교체.
- 중요 데이터의 localStorage/IndexedDB/메모리 authoritative source 없음.
- 사용자가 이전 D1 기록은 테스트 데이터라고 지정했으므로 이관하지 않았다. D1/과거 Worker 리소스 자체는 삭제하지 않았다.

## 검증과 한계

- `npm run check:fast`: exit 0, paid-gate 88개, Jest 273스위트/3783테스트, 타입/lint 및 Worker dry-run 통과(해당 시점 기록).
- 엔진/전체 상품 계약 35개, 명리 표 29개/216키 차이 0, 저장소·API·기존 주문·프로필·탈퇴 targeted 회귀 통과.
- 실제 staging Atlas에서 28개 상품의 트랜잭션·변조/타인 접근 거부·중복/lease·실패 재시도·복원·환불 차단·운영 복구 및 fixture 정리 PASS.
- 실제 service/repository/계산 엔진 + staging Mongo를 함께 실행하여 28개 상품의 첫 챕터와 사주 고등어 5개 챕터 완료/재조회 PASS. LLM만 빌드 시 fixture로 교체, 외부 HTTP 차단.
- 390px 브라우저: 원본 메인·방, 프로필 생성, 28상품 선택, 모의 결제 취소/실패/재시도, 생성 실패 복구, 완료 및 새로고침 PASS.
- 실제 staging seed QA 계정의 로그인·me·프로필 생성/조회·상담 목록·재조회 PASS. 전용 계정/프로필/refresh session 정리 완료.
- Google/Kakao/Naver OAuth 시작 경로 302 및 환경별 callback 확인. 실제 외부 OAuth 가입 완료는 미검증.
- 실제 PG 승인/환불, 유료 LLM 호출, 물리 모바일/WebView 인증·외부 결제 왕복은 실행하지 않았다. fixture 성공을 실제 외부 서비스 E2E 성공으로 주장하지 않는다.
- staging은 Gemini 키가 없어 available0인 과금 잠금 상태다. native 제품 enabled28 및 fixture QA와 운영 available28을 구분한다.

## 주요 파일

- `app/yeongnyangi/_original/*`: 원본 메인/방/자산 경험과 공통 인증 연결.
- `app/yeongnyangi/_components/{Consultation,ProfileForm,Result,Library}.tsx`: 입력·구매·생성·복원.
- `app/checkout/CheckoutClient.tsx`, `app/components/PaymentProcessingContext.tsx`: 영냥이 checkout/처리 popup.
- `worker/routes/yeongnyangi.js`, `worker/yeongnyangi/{service.ts,repository.js,payment-intent.js}`: API/상태/결제 결합.
- `worker/lib/yeongnyangi-models.js`, `worker/yeongnyangi/fortune/**`, `providers/**`: Mongo 스키마·공유 계산·해석 계약.
- `scripts/verify-yeongnyangi-browser.mjs`, `scripts/verify-yeongnyangi-mongo-staging.mjs`: 비과금 QA.
- `scripts/migrations/20260916-yeongnyangi-indexes.mjs`, `scripts/recover-yeongnyangi-request.mjs`: additive 인덱스/실패 복구.

## 복구

운영 복구는 `scripts/recover-yeongnyangi-request.mjs --db code_destiny --request <64hex> --attempts 2 --reason <incident>`로 먼저 dry-run한다. 확인한 주문에 한해 `--apply`. 결제·완료 본문·기존 시도 횟수를 덮어쓰지 않으며 도구의 실제 PG/LLM 호출은 차단되어 있다.

이번 승격 전 안정 버전: SHA `78c4a554a34acd08b72b2eaffe667f54a559ce35`, Pages `d850fcfd-025e-4b7b-8275-cf60f46f2d7b`, Worker `382d5d35-171e-4493-b248-7a21a91a75ad`. 치명적 장애 시 기존 Release Cloudflare Pages and Worker의 mode=rollback과 이 두 ID를 사용한다. 새 Mongo 컬렉션을 삭제할 필요는 없다.

## 최종 배포 결과 (2026-09-16 11:28 KST)

배포 소스 SHA: `63725c95e8752d70ef441eab393834215f380542`. 이후 이 문서만 수정한 커밋은 서비스 코드 승격 SHA와 구분한다.

| 확인 항목 | 결과 |
|---|---|
| main PR CI | [35045812676](https://github.com/rei1237/codedestiny/actions/runs/35045812676) success; 273스위트/3783테스트, 릴리스 mock smoke 105개, 타입/lint/정적/빌드 통과 |
| Paid Flow Gates | [35045848560](https://github.com/rei1237/codedestiny/actions/runs/35045848560) success |
| AI Locale Gate | [35045812685](https://github.com/rei1237/codedestiny/actions/runs/35045812685) success |
| Business Identity Gate | [35045846464](https://github.com/rei1237/codedestiny/actions/runs/35045846464) success |
| Secret Scan | [35045812657](https://github.com/rei1237/codedestiny/actions/runs/35045812657) success |
| 스테이징 릴리스 | [35045837473](https://github.com/rei1237/codedestiny/actions/runs/35045837473) success; Pages/API SHA 일치; HTTP 및 28상품 브라우저 fixture PASS |
| 운영 릴리스 | [35046821771](https://github.com/rei1237/codedestiny/actions/runs/35046821771) success; Pages/API SHA 일치 |
| 운영 Pages | `a9bfb9ec-13b7-48dd-bbed-16ebb8a16a74` |
| 운영 Worker | `a7c61f20-1675-4625-b6c6-78fbd20bbc89` 100% |
| 스테이징 Pages | `fe54ea79-db59-42f2-b8d7-ba8a63394ed6` |

운영 smoke 실측:

- 메인/login/영냥이 메인·선택·결과·보관함·방/checkout/health/products/payments config HTTP200. 비로그인 profile/requests는 예상된401. 구 무료/입문 링크는 새 경로로302.
- 상품 `enabled:28`, `available:28`. 운영 mock flag false, 테스트 금액 override 없음, Mongo/Gemini 비밀 설정 존재.
- 운영 기존 QA 계정의 실제 로그인200, me200, profile200(프로필1개), 영냥이 requests200. 실제 운영 Worker→Mongo 조회 정상. 테스트용 운영 결제나 운세 결과는 만들지 않았다.
- Google/Kakao/Naver 시작302 및 운영 callback, PortOne server verification/Inicis/Kakaopay configured 모두 true. 외부 OAuth 가입/실제 PG 승인은 하지 않았다.
- 모바일390×844의 원본 메인/방/운세 선택/로그인 화면200, 수평 넘침 없음, JS 예외/서버5xx 없음. 로그아웃 사용자에게 CODE DESTINY 로그인 CTA 표시 확인.
- 최초 브라우저 smoke는 검사 도구가 auth/refresh까지 막아 networkidle 대기가 실패했다. 서비스 코드 변경 없이 정상 auth refresh를 허용하고 실제 화면의 준비 상태를 기다리도록 고친 뒤 PASS. 생성/결제 등 업무 API POST는 계속 차단했다.
- 승격 후45초 tail: 이벤트21개, outcome ok21, 서버5xx0, 예외0. 이 관찰 구간 밖의 모든 운영 로그가 무오류라는 뜻은 아니다.

## 남은 확인과 운영상 한계

1. 사용자 제한에 따라 실 PG 승인/환불, 실제 유료 LLM 해석 품질, 외부 소셜 신규가입 완료, 물리 모바일/WebView 결제 왕복은 미검증이다. 코드·fixture·Mongo·배포 검증과 구분한다.
2. LLM의 장기 장애나 반복 품질 미달로 재시도 예산이 소진되면 운영 복구 절차가 필요하다. 이미 완료된 챕터/결제 권리는 유지되며 새 결제를 요구하지 않는다. 자동 환불을 구현했다고 주장하지 않는다.
3. 기존 인수인계의 개인정보 고지 검토 항목은 남아 있다. 현재 한국어 개인정보처리방침의 처리 위탁 목록에는 PortOne/KG이니시스만 명시돼 있고 Gemini별 처리·국외이전 고지는 확인되지 않았다. 실제 계약/처리지역/보유기간을 확인한 법무 검토가 필요하며, 확인하지 않은 내용을 임의 작성하지 않았다.
4. 기존 D1/과거 SoulCat 리소스는 삭제하지 않았다. 정식 경로의 의존성을 제거하고 staging route/queue/cron을 비활성화했다.

## 검증 산출물

작업/산출물 경로: `D:\Development\codedestiny-worktrees\yeongnyangi-mongo-20260915-233146`.

- `build-cache/yeongnyangi-final-ci.json`, `yeongnyangi-final-ci.log`
- `build-cache/yeongnyangi-service-mongo-qa.log`, `yeongnyangi-mongo-recovery-qa.log`
- `build-cache/yeongnyangi-staging-smoke.json`, `yeongnyangi-staging-final-browser.log`
- `build-cache/yeongnyangi-production-release.json`, `yeongnyangi-production-smoke.json`
- `build-cache/yeongnyangi-production-auth-smoke.log`, `yeongnyangi-production-oauth-payment.json`
- `build-cache/yeongnyangi-production-browser.json`, `yeongnyangi-production-main-390.png`
- `build-cache/yeongnyangi-production-tail-summary.json`, `yeongnyangi-production-index.log`

운영 비밀값/인증 쿠키/사용자 개인정보를 이 문서에 기록하지 않았다. 다른 세션의 marketing 및 숙요 파일 변경은 커밋에 섞지 않았다.
