# 운영 한정판 공방 테스트

운영 관리자 로그인에서 상품을 직접 등록하고 테스트 NFT 발행을 요청한다.
상품명·캐릭터·한도는 추가할 때 확정된다. 테스트 상품은 최대 100개, 상품별 한도는 1~100개다.
발행 요청과 발행 완료를 구분하며, 발행 상태 새로고침으로 완료된 QR을 조회한다.

- 관리자: /admin/editions/
- 고객: /editions/verify/?code=<24자리 코드>, 로그인·지갑 연결 불필요
- 운영 데이터: codedestinyassets의 edition-workshop/test-v1/만 사용
- 스테이징은 기존 staging 저장소와 정적 발행증을 유지
- 공방은 판매·결제·주문 연동을 수행하지 않는다.
- 연이 이미지: docs/design/character-references/yeoni-profile-v1.png 기준의 public/assets/mascot/yeoni-profile-v1.webp

## 발행과 공개

관리자 인증 후 조건부 R2 쓰기로 순번을 접수한다. 중복 요청은 같은 번호로 처리한다.
Edition test issuer 작업은 GitHub Actions 내부의 격리 Ganache 체인(31337)에서 계약을 배포·발행하고 거래를 검증한다.
이 체인은 재현용이며 퍼블릭 테스트넷이나 메인넷이 아니다. 지갑 소유권 이전·판매 인증에 사용하지 않는다.
기존 발행의 계약·거래·작품 해시는 고정값과 대조해 변경 시 공개를 중단한다.
JSON·PNG 업로드가 모두 성공한 뒤 목록을 마지막으로 공개한다.
사이트·Worker 배포는 발행 작업에서 하지 않는다.

발행 요청은 전용 workflow_dispatch로 전달하고, 전달 실패/누락은 20분 간격 예약 작업에서 다시 읽는다.
관리자는 요청 대기와 발행 완료를 화면에서 구분한다. 실제 예약 실행은 GitHub 사정으로 지연될 수 있다.
QR에 담긴 공개 주소는 고정 운영 도메인만 사용한다. 다른 origin·메인넷 대상은 거부한다.

## 검증

- node --test local/edition-workshop/production-test.test.mjs local/edition-workshop/studio.test.mjs
- npm run check:fast -- --plan
- npm run check:fast
- npm run check:pre-push

테스트는 모의 R2와 격리 EVM만 사용한다. 운영 검증 시 사용자 승인된 테스트 상품만 추가한다.
번호 무효화·상품 수정·메인넷 발행은 이 운영 테스트 UI에 없다.
문제 발생 시 이번 변경 커밋을 되돌리고 공식 배포 workflow로 이전 배포본을 복구한다.
기존 발행증 데이터를 임의 삭제하지 않는다.

