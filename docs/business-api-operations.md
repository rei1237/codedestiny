# 기업 운세 API 운영

공개 요금은 /business/api/, 연동 예시는 /business/api/docs/, 계정별 키 관리는 /business/api/dashboard/에서 확인한다.

- Worker 설정 BUSINESS_API_SALES는 판매할 상품의 slug를 쉼표로 구분한다. 기본은 판매 닫힘이다. BUSINESS_API_PER_MINUTE 기본값은 계정·상품별 최근 60초간 60회다. 판매 중단은 이미 결제한 계정의 남은 기간에 영향을 주지 않는다.
- 사주는 자체 natal 함수와 프로젝트 달력표의 파생 명식, 자미두수는 기존 calculateZiweiChart의 궁·별 배치, 타로는 프로젝트 덱의 이름과 스프레드 자리만 제공한다. 달력표의 astronomy-engine 출처는 docs/engine-audit/01-license-ledger.md에서 확인한다. 원천표, 해석 본문, 이미지, 상담 질문은 제공하지 않는다. 서양·베다·숙요는 Swiss 기반이며 서비스 제공 권리 확인 전 카탈로그에서 차단한다.
- PortOne V2 이니시스 일반카드 채널과 서버 조회·웹훅 서명을 기존 결제 설정에서 확인한다. 운영 전 승인·취소 이벤트 및 기존 결제 대사 cron이 연결돼야 한다. 결제 확인 중인 주문은 다시 구매하지 않고 대시보드에서 상태를 갱신한다.
- 기존 Payment 주문 ID의 유일성과 데이터베이스 접근 권한을 확인한다. BusinessCredential과 BusinessMeter 컬렉션은 MongoDB 기본 고유 _id를 사용한다. 키는 한 계정에 하나이며 요청 본문이나 Authorization 헤더를 CDN·애플리케이션 로그에 수집하지 않는다.
- 예시는 node scripts/business-api-examples.mjs로 생성하고 --check로 엔진과 대조한다. 최초 연동 시 키를 서버 환경변수 GGUL_FORTUNE_API_KEY에 넣고 공개 문서의 cURL을 실행한다.
