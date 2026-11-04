# 휴대폰으로 확인하는 스테이징 발행증

스테이징 운영자는 기존 관리자 로그인 후 `/admin/editions/`에서 연이와 영냥이의
검수용 QR을 저장한다. 고객은 일반 카메라로 PNG를 스캔하거나
[발행기록 확인](https://staging.code-destiny.com/editions/verify/)에서 코드를 입력한다.
고객 계정, 지갑, VPN, 개발 PC와 같은 Wi-Fi가 필요하지 않다.

**무엇을 발행하나.** 스테이징 배포 잡이 시리즈별 격리 EVM(chain ID 31337)에서
실제 Edition.sol을 배포하고 한도를 확정한 뒤 토큰을 발행한다. 거래 영수증·발행 이벤트·
QR 코드 해시·작품·공급 상한을 대조한 결과만 공개 JSON과 PNG로 내보낸다.
조회는 이 배포 시점의 기록을 읽는다. 상시 노드나 퍼블릭 테스트넷을 조회하지 않는다.
새 테스트 시리즈는 검토된 staging-series.mjs 항목으로만 추가하며, **스테이징 콘솔은
발행된 QR 열람·인쇄 전용**이다. 로컬 공방의 임의 에디션 생성은 그대로 유지한다.

**인쇄한 QR 유지.** 각 시리즈의 제네시스·테스트 계정·블록 간격은 고정이다.
배포마다 같은 트랜잭션을 재현하고, 고정한 작품·번호·거래 및 블록 해시와 달라지면
배포 전에 실패한다. 기존 항목을 삭제하거나 핀을 덮어쓰지 않는다. 검수용 제네시스는
자산 보관이나 외부 네트워크 서명에 쓰지 않는다. 생성할 때 RPC URL·운영 키·DB를 받지 않는다.

**검증.** 공방 패키지 설치는 README를 따른다.
`node --test local/edition-workshop/staging.test.mjs`는 재배포 재현성, 진짜 PNG 판독,
주소 제한, 위변조 거부를 확인한다. 스테이징 게시 후
`node local/edition-workshop/check-staging-phone.mjs`는 공개된 두 PNG를 다시 내려받아
PIXEL 모바일 브라우저로 열고 번호·거래·없는 코드 처리를 확인한다. 로컬 Edge를 사용할 때는
PowerShell에서 `$env:PW_CHANNEL='msedge'`를 설정한다. WORKSHOP_SCREEN_DIR는 선택 사항이다.

**격리와 롤백.** 결과물은 staging 빌드 dist의 assets/edition-proofs/v1에만 생성한다.
production 빌드에는 표시 플래그와 자료가 없으며, 잘못된 origin으로는 발행할 수 없다.
문제 시 기존 릴리스 절차에서 **스테이징만** 이전 정상 SHA로 되돌린다. 메인넷 배포,
운영 상품·결제·배송·회원정보와 연동하는 경로는 없다.
