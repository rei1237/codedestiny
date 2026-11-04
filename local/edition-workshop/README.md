# 한정판 공방 · 로컬 개발판

관리자 콘솔에서 연이·영냥이 작품을 골라 한도를 확정하고, 실제 로컬 EVM의
양도 불가 ERC-721을 발행한다. 실물 발행증의 QR은 거래 영수증과 작품
해시를 다시 확인하는 공개 페이지로 연결된다. 체인 ID는 31337이다.
체인은 프로세스 안에서 실행되며 HTTP RPC나 외부 지갑을 열지 않는다.

## 실행 (PowerShell, Node 24 권장)

저장소 루트에서 다음을 실행한다. 공방 전용 패키지는 루트 배포 번들에 포함되지 않는다.

```powershell
npm install --prefix local/edition-workshop --package-lock=false --ignore-scripts --no-audit --no-fund
$env:CD_EDITION_WORKSHOP='1'
$env:NEXT_PUBLIC_EDITION_WORKSHOP='1'
$env:MOCK_DEV_PORT='32714'
$env:MOCK_DEV_API_PORT='32715'
npm run dev
```

1. http://127.0.0.1:32714/admin/editions/ 에서 **기존 개발용 관리자 로그인**
   (mock 암호: `mock-recommendations-only`)을 사용한다. 운영 자격증명은 입력하지 않는다.
2. 상품명·캐릭터·발행 한도를 입력해 초안을 저장하고, 미리보기를 확인한 후 한도를 확정한다.
3. 번호를 발행하고 확정된 번호의 QR 이미지를 저장한다. 새 비로그인 창에서
   QR 주소를 열거나 /editions/verify/ 에 확인 코드를 입력한다. QR에 포함된
   loopback 주소는 개발 PC용이다. 다른 기기로 인쇄물을 스캔하는 운영 검수와 구분한다.
4. ‘발행 근거 보기’에서 계약 주소, 토큰 번호, 작품 해시, 거래 해시와 블록을 확인한다.
   실물에 인쇄된 번호와 대조한다. 이 증명은 실물의 진위나 보유자를 증명하지 않는다.
5. 개발 서버를 종료하고 두 환경변수를 해제하면 공방을 닫을 수 있다. 운영 빌드에서는
   환경변수 값과 관계없이 비활성이다. 생산용 Worker에 새 API를 노출하지 않는다.

발행 내역·감사기록(SQLite), 로컬 체인, 로컬 발행자 seed는
`local/edition-workshop/.state/`에 함께 보존한다. 커밋·공유하지 않는다.
`CD_EDITION_LOCAL_DIR`로 절대 경로를 지정할 수 있다. 상태 디렉터리당
한 서버만 사용한다. 삭제하면 기존 QR 기록도 사라진다.

## 검증

```powershell
node --test local/edition-workshop/workshop.test.mjs
node local/edition-workshop/browser-check.mjs http://127.0.0.1:32714
npm run check:fast -- --plan
npm run check:fast
```

브라우저 검사는 개발 Edge(또는 PW_CHANNEL에 지정한 Chromium)를 사용한다.
별도의 비로그인 컨텍스트에서 실제 PNG QR을 판독한 주소를 열고 정상·없는 코드·
비인가 관리자 요청을 검증한다. WORKSHOP_SCREEN_DIR를 지정하면 화면을 저장한다.
검증용 에디션도 한도에 포함되므로 운영 데이터에서는 실행하지 않는다.

## 운영 전 별도 결정

실물 수량·작품 상품화 권리·네이버 상품과 QR 정책을 확인하고, 실제 상품번호와
발행번호를 출고 시 대조한다. 메인넷 전환은 계약 감사, 키 관리, 영구 보관, 체인
확정성·재조직 처리, 탐색기, 운영자 권한 및 감사로그를 갖춘 별도 작업이다.
현재 개발용 관리자 로그인은 로컬 대역으로 운영 인증을 대체하지 않는다.
판매 채널·상품 식별자는 내부 참고이며 회원·주문·배송 정보는 수집하지 않는다.
자사몰 결제, 채널 간 재고 예약, 배송·교환·반품 처리는 이번 범위에 없다.
