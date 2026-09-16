---
status: active
updated: 2026-09-16
next: CI 메타데이터·상품 설명 보완 후 MongoDB 스테이징 트랜잭션 및 결과 복원을 검증하고, 무료/프롤로그 경로와 라우트를 정리해 스테이징 전환 및 최종 출시 게이트를 진행한다. 사용자가 기존 테스트 데이터 이관은 불필요하다고 지시했다. 실제 과금 LLM/PG 테스트는 실행하지 않는다.
---

# 영냥이 CODE DESTINY 단일화

## 결정과 범위 (2026-09-15)

사용자가 기존 하이브리드 결정을 변경했다. 영냥이 UI와 콘텐츠 계약을 CODE DESTINY로 흡수하고 기존 인증·ProfileCard·Payment·Mongo 연결·운세 엔진을 사용한다. 별도 회원·세션·D1·SoulCat Worker를 운영 정본으로 유지하지 않는다. 실제 과금/유료 LLM 테스트는 승인되지 않았다. 스테이징과 게이트 통과 후 운영 승격은 이번 요청에 포함된다.

## 코드 대조

- CD 기준: e821c36c71db38c0c0e6aa909d919aacc3ca8e3b. marketing 미커밋 보존을 위해 `D:\Development\codedestiny-worktrees\yeongnyangi-mongo-20260915-233146`에서 작업한다.
- SoulCat 읽기 원본: `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`. 기존 source와 자산을 이식하며 vendor 엔진 사본은 가져오지 않는다.
- `worker/routes/yeongnyangi-entitlement.js`: 기존 Payment 소유자·상태 검사와 원자 소비 있음. 결과 생성/저장과 소비는 현재 서로 다른 DB이므로 하나의 트랜잭션이 아니다.
- `app/checkout/CheckoutClient.tsx`: 단건 전용 옵션·복귀 경로 있음. 상품 판매 가능 여부 검사가 없어 미개방 상품 직접 진입 위험.
- SoulCat `server/api.ts`, `fortune/books.ts`: 프로필·차트·주문·결과는 SQL/D1. 계정은 Service Binding으로 CD 인증을 위임. local mock 세션은 운영으로 이식하지 않는다.
- 기존 생산용 SoulCat D1이 없다는 내용은 인수인계 기록이다. 운영 리소스/데이터 유무는 전환 전에 다시 확인한다. 기존 스테이징 결제·결과도 임의 삭제하지 않는다.

## 구현 순서와 검증 기준

1. 계산 어댑터·검증·페르소나·등급 계약을 내부 모듈로 이식. CD 정본 import 사용. fixture로 6체계/시간 미상/잘못된 입력 확인.
2. 기존 User/ProfileCard/Payment를 참조하는 Mongo 저장소. 결제 증빙 소비와 구매 스냅샷 생성을 원자화. 작업 lease와 결과 버전을 저장하며 재시도는 동일 주문을 사용한다. 생성 실패는 구매 권리를 없애지 않는다.
3. 내부 API·기존 UI/자산 연결. CD 로그인·프로필을 공유하고 브라우저 저장소는 권한/결과의 근거로 사용하지 않는다. 판매 가능 여부는 서버에서 판정.
4. 결제 화면: 기존 영냥이/생선 자산과 읽기 쉬운 가격·제공 내용, 모바일 44px 조작 영역. 기존 PortOne 호출·검증·복귀 사용.
5. 인증/소유권/변조/중복/실패/복귀/복원 fixture 검증 → targeted 검사 → main 전달 및 CI → 스테이징 전환·smoke → readiness 전 항목 통과 시 운영 승격·smoke.

## 롤백과 배포 게이트

외부 라우트 전환 전까지 기존 서비스 경로를 보존한다. 새 통합 경로가 검증된 뒤에만 SoulCat route를 철회한다. 이전 Pages/Worker 배포 ID를 보존하고 치명적 장애 시 같은 SHA 쌍으로 복원한다. 데이터 삭제와 기존 결제/회원 정책 변경은 하지 않는다. 미완성 통합이나 실패한 CI를 운영으로 승격하지 않는다.

## 현재 상태

**진행 중이며 출시 완료가 아니다.**

- main 전달: `319fba9491b4091266522329cdff461f5690bf34`까지 push. 계산 계약·Mongo 저장소·checkout 자산 포함. 당시 새 API는 아직 Worker 라우터에 연결 전이었다.
- 작업 워크트리: 출생시간 미상 보존 `a7753041d`, 공유 명리 공식 재사용 `83e47a8c0`, API·주문 결합 `4df462450`까지 커밋. 통합 UI 검증 후 main으로 전달 예정.
- 계산: 기존 사주 화면 공식 추출 + 공유 `lib/saju/natal-power.js` 재사용, Worker 사주/자미/숙요/베다/서양/타로 엔진 사용. 28개 상품의 모든 챕터 요청에서 해당 체계 계산 근거만 전달하는 fixture 검증 통과. 실 LLM 품질 검증은 아님.
- 저장소: 기존 User/ProfileCard/Payment + `yeongnyangi_requests`. 결제 소비와 상담 활성화는 Mongo 트랜잭션. userId ObjectId, requestId SHA256 문자열. PG 주문 requestId는 `yn-<상담 id>`. 챕터 lease·완료 CAS로 중복 저장 차단.
- 새로운 UI는 CD 내부 `/yeongnyangi/`, `/fortune/`, `/result/`, `/library/`, `/room/` 하위 경로로 작성 중. 기존 assets를 재사용하며 실제 Cloudflare 라우트 소유권 전환은 아직 하지 않음.
- checkout은 기존 단건 게이트를 사용하며 서버 준비 상태, 상담 ID, 결제 증빙을 확인. 서버 주문 생성도 상담 소유자·상품·금액·기존 결제를 검사하고 브라우저 임의 키를 상담 키로 정규화.
- 프로필 시간 미상은 null + timeUnknown으로 저장/조회. 기존 자정은 00:00 유지. 부족한 출생지역/시간은 상담 스냅샷에 보완 가능.
- 검증: Mongo 저장소 mock 11개, 영냥이 주문 의도 7개 + 기존 주문 테스트 31개, 프로필 회귀 18개 통과. 브라우저 fixture에서 프로필 생성→모의 PG→활성화→생성 실패/재시도→5챕터 완료→새로고침 통과, 28개 상품 표시/가격 선택 확인. 실 PG/실 LLM/실 Mongo E2E 증거가 아니다.
- main CI `34986324562`는 명리 표 사본 미분류로 실패. 새 추출본에서 9개 공유 공식/표를 기존 natal-power import로 대체했고 명리 표 검사 29개와 엔진 계약 35개가 로컬 통과했다.
- check:fast는 결제 게이트 내 Jest 3762개 중 Windows CRLF 정적 정규식 1개로 중단. 해당 변경 파일을 LF로 유지한 후 실패 스위트 39개 통과. 전체 게이트 성공으로 보고하지 않는다.
- 실제 유료 호출/결제/환불, 운영 DB 변경, 프로덕션 승격 없음.

### 출시까지 남은 일

1. 새 변경 targeted 검증, CI 오류 해결 및 main 전달. 사용자 marketing 변경은 별개이며 보존한다.
2. 실제 API mock 통합·인증 만료·모바일 callback·취소/실패 등 범위 보강. 브라우저 스크립트는 `scripts/verify-yeongnyangi-browser.mjs`이며 loopback에서만 실행, 모든 API/외부 네트워크를 fixture로 막는다.
3. Mongo 인덱스 추가 배포/연결 증명, 탈퇴 정리 검증, 기존 D1의 결제·결과 데이터 보존/이관 및 이전 deep link/무료 서비스 경로 정리.
4. Cloudflare의 기존 SoulCat route 소유권을 실제 확인하고 스테이징에 CODE DESTINY UI/API로 전환. 구 Worker/D1을 운영 의존성으로 남기지 않되 데이터 삭제는 하지 않는다.
5. 스테이징 mock smoke, 운영 환경에 mock/test flag가 없고 28개 상품이 준비됐는지 확인. 현재 staging은 Gemini 키를 의도적으로 뺀 환경이므로 상품 준비 상태를 실 운영과 혼동하지 않는다.
6. 모든 readiness gate 통과 이후만 production 승격, Pages/Worker SHA와 비과금 smoke 확인. 이전 배포 ID 보존 및 실패 시 복구.
 `docs/handoff/yeongnyangi-integration.md`의 S3/S4 독립 SoulCat 운영 배포 계획은 이번 결정으로 대체한다.

### 2026-09-16 추가 확인

- 사용자 명시 지시: 영냥이 메인 디자인은 이전 디자인 그대로 유지한다. 원본 FortuneHome/CatMotion/카드/추천/하단 메뉴 및 글꼴·자산을 CD 내부로 복원했다. `.ynOriginal` 범위의 CSS로 다른 화면에 영향을 주지 않는다. 새 크림색 메인 제안은 폐기했다. 결제 화면 개선은 유지한다.
- 기존 메인의 생선·추천 링크는 새 상담 화면의 fish/topic 선택으로 이어진다. 별도 세션을 만들지 않고 authFetch와 logoutWithServer를 사용한다. 기존 무료/프롤로그 경로의 실제 콘텐츠 복원은 아직 남아 있다.
- API route mock 18개 및 탈퇴 회귀 27개 통과. 복원한 메인에서 쓰다듬기, 28개 상품 표시, 모의 결제→실패→재시도→결과 복원 fixture PASS. 타입 검사와 신규 UI lint 오류 없음.
- 첫 check:fast 재검사는 paid-gate 88개와 npm test가 통과한 후 sitemap 날짜 변경에서 중단. sitemap 재생성과 drift 검사는 통과했으며 전체 게이트 재실행 중이다.
- Cloudflare 실제 읽기 확인: 독립 SoulCat Worker는 staging만 존재. staging 5개 세부 route는 아직 soulcat-service-staging 소유. production `/api/*`는 code-destiny-web 소유이고 SoulCat production Worker는 없음.
- D1 읽기 확인: soulcat-fortune는 사용자/프로필/주문/결과 0건. soulcat-fortune-staging는 사용자 5, 프로필 11, 주문/결제/운명서 각 9, 챕터 333, 공유 2, 멸치 원장 1건. 고객 식별정보나 본문을 로그에 출력하지 않았다. 전환 전 보존 이관이 필요하며 삭제/쓰기/새 유료 호출은 수행하지 않았다.
- Cloudflare 환경 파일 토큰은 API에서 401. 기존 Wrangler OAuth 세션으로 읽기 인벤토리를 정상 확인했다. 토큰 값은 출력하거나 문서에 기록하지 않았다.

### 범위 정정 및 CI (2026-09-16, 최신)

- 사용자가 기존 D1 기록은 모두 테스트 데이터이며 보존 이관이 필요 없다고 명시했다. **D1→Mongo 데이터 이관 작업은 하지 않는다.** 기존 자료가 출시 전환을 막는 조건도 아니다. 기존 리소스를 임의 삭제하지는 않았으며 새 운영 경로가 D1에 의존하지 않도록 전환한다.
- main `086a085c8d2e0e440e27d40660c836dae1fa8265` 전달. PR CI `35040824480`에서 Critical checks, Typecheck/lint 통과. Build 실패는 영냥이 하위 페이지 description 누락, Static guards 실패는 yeongnyangi-fusion-all 전용 마케팅 카피 누락. 코드 보완 및 해당 검사 통과 후 재전달 진행 중.
- 로컬 check:fast 최종 실행 exit 0. paid-gate 88개, 마지막 Jest 273스위트/3783테스트, Worker dry-run 빌드와 타입/lint/관련 정적 검사를 통과했다. 실제 LLM/PG 호출은 없음.
- 실제 MongoDB `code_destiny_staging` 연결 및 ping 정상(읽기 전용). 기존 CD 사용자와 Payment 증빙을 찾았으며 실제 거래/환불이나 데이터 쓰기는 하지 않았다. 앞으로 기존 테스트 이관 없이 새 Mongo 상태 머신 자체의 스테이징 검증에 집중한다.
