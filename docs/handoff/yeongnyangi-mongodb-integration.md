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

분석 진행 중. 구현·테스트·배포 완료 아님. `docs/handoff/yeongnyangi-integration.md`의 S3/S4 독립 SoulCat 운영 배포 계획은 이번 결정으로 대체한다.
