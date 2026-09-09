# 이용권 선물 운영 계약

정책 버전: `2026-09-09-v1`. standard/premium/vvip/family 30일권의 웹 PG 구매만 지원한다. 가격은 기존 이용권 정본을 사용한다. 월정석·이용권·Play Billing으로 선물을 구매하지 않는다.

## 수령과 이용

구매 후 1년 내 로그인한 한 계정이 수령한다. 본인 수령도 가능하다. 같은 등급은 남은 기간과 한도에 더하고 사용량을 보존한다. 다른 등급이 활성화되어 있으면 기존 이용권 종료 후 수령한다. 링크 보유자가 수령할 수 있으므로 공개 게시하지 않도록 안내한다. 표시명과 메시지는 선택사항이고 이메일·전화번호는 공개하지 않는다.

결제 확인은 기존 subscription confirm, webhook, reconcile을 사용한다. `purchaseType=GIFT`는 구매자의 이용권을 활성화하지 않는다. Gift와 지급 원장 및 수령자의 구독을 동일 세션 트랜잭션으로 확정한다. 트랜잭션 실패 시 일반 지급으로 폴백하지 않는다. 사용자 문서의 지급 주문 기록은 이후 다른 구매가 발생해도 이전 지급의 재생을 차단한다.

## 링크와 복구

`/gift/claim#token=...`의 256비트 난수는 발급 응답에만 존재한다. 저장되는 값은 SHA-256 해시다. 재발급은 명시적 동작이며 기존 링크를 무효화한다. 로그인에는 30분 HttpOnly 컨텍스트 쿠키를 사용하고 OAuth에 raw token을 전달하지 않는다. 수령 링크는 광고·분석 제외, noindex/no-store/no-referrer를 적용한다.

모바일 결제는 `/gift/complete?orderId=...`로 복귀한다. 주문의 소유자와 구매 방식을 검증하고 서버에 저장한 상품·메시지로 완료 화면을 복원한다. localStorage가 없어도 주문 ID로 재확인할 수 있다. 결제 결과가 늦으면 결제 상태 재확인을 제공하며 새 결제를 자동으로 열지 않는다.

## 환불

선물함에서 환불 검토를 요청하면 기존 관리자 주문 화면에서 처리한다. 미수령 전액 환불은 Gift를 REFUND_PENDING으로 잠근 후 PG를 호출한다. PG 오류가 불확실하면 잠금을 유지하고 동일 환불 식별자로 재확인한다. 기존 정기 작업은 요청 식별자가 있는 환불을 최대 5건씩 재조회·복구한다. CLAIMED와 부분 취소는 운영 확인 대상이며 구매자의 구독 회수 함수를 호출하지 않는다. 외부 취소 webhook도 같은 선물을 차단하거나 운영 검토로 표시한다. 만료는 claim 시 서버 시각으로 차단하고 정기 작업에서 상태를 정리한다. 거래 데이터는 만료만으로 삭제하지 않는다.

수령 기한이 지나도 금액·환급 권리를 자동 소멸시키지 않는다. 신유형 상품권 표준약관의 적용, 기한 연장·환급 범위는 출시 전 운영 정책 검토가 필요하다. 코드에서 새 환급률을 정하지 않는다.

## 출시와 롤백

1. 기본적으로 신규 선물 구매는 꺼져 있다. 운영자의 DB 변경 승인 후 Gift/GiftGrant/GiftClaimContext 인덱스를 설치하고 실제 unique 제약을 확인한다. `GIFT_INDEX_MONGODB_URI`를 명시하고 `node scripts/gift-indexes.mjs`로 읽기 확인한다. `--apply`만 생성하며 환경 파일이나 기본 운영 DB를 자동 선택하지 않는다.
2. 승인된 환경에 `GIFTS_ENABLED=1`을 설정한다. prepare에서 인덱스를 다시 확인하므로 선언만으로 활성화되지 않는다. 같은 환경의 Pages와 Worker SHA를 확인한다.
3. 결제 실패율, 선물 생성 지연, claim 실패 코드, REFUND_PENDING 및 관리자 확인 건수를 추적한다. 로그에 토큰·메시지를 남기지 않는다.
4. 롤백은 `GIFTS_ENABLED`를 끄고 신규 구매만 중단한다. 이미 결제된 선물의 검증·수령·환불 API와 DB 필드를 제거하지 않는다.

## 검증

`npm run test:gifts:replica`는 `127.0.0.1:27029`의 `gift-test` replica set, `gift_integration_test` DB만 사용한다. 테스트용 `enableTestCommands=1`이 필요하다. 실 PG는 주입한 mock이며 외부 네트워크는 기존 mock guard로 차단한다. 전용 GitHub Actions 작업이 임시 Mongo 컨테이너에서 같은 테스트를 수행한다.

일반 구매 회귀는 `npm run check:payment`, `npm run check:fast` 및 PR preflight로 검증한다. 실기기/실 PG 증거는 로컬 replica set·브라우저 mock 증거와 구분한다.

`npm run test:gifts:ui`와 `node scripts/verify-gift-checkout.mjs`는 별도로 실행한 로컬 mock 개발 서버를 사용한다 (`MOCK_DEV_PORT=18290 npm run dev`). 360·390·430·1280px 수령·완료·선물함, 로그인 컨텍스트 복귀, 저장소 손실, 공유 취소 및 상점에서 PortOne mock 리다이렉트까지 확인한다. 외부 OAuth 승인은 시뮬레이션하며 실기기 검증을 대체하지 않는다.

참조: [PortOne 웹훅 공식 계약](https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2)의 서명 검증과 전체·부분 취소 구분을 따른다. [공정위 표준약관 지정 자료](https://www.ftc.go.kr/www/selectBbsNttView.do?bordCd=201&key=202&nttSn=11199&pageIndex=1&pageUnit=10&searchCnd=all)는 이번 자동 조회에서 원문 접근에 실패했으며, 적용 여부·만료 후 권리 검토는 출시 전 확인 항목이다.
