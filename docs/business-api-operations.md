# 기업 운세 API 운영

공개 요금은 /business/api/, 연동 예시는 /business/api/docs/, 계정별 키 관리는 /business/api/dashboard/에서 확인한다.

- Worker 설정 BUSINESS_API_SALES는 판매할 상품의 slug를 쉼표로 구분한다. 기본은 판매 닫힘이다. BUSINESS_API_PER_MINUTE 기본값은 계정·상품별 최근 60초간 60회다. 판매 중단은 이미 결제한 계정의 남은 기간에 영향을 주지 않는다.
- 사주는 자체 natal 함수와 프로젝트 달력표의 파생 명식, 자미두수는 기존 calculateZiweiChart의 궁·별 배치, 타로는 프로젝트 덱의 이름과 스프레드 자리만 제공한다. 달력표의 astronomy-engine 출처는 docs/engine-audit/01-license-ledger.md에서 확인한다. 원천표, 해석 본문, 이미지, 상담 질문은 제공하지 않는다. 서양 기본 차트와 기업용 서양 계산은 MIT Astronomy Engine을 사용한다. 베다·숙요는 현지 출생일 1900~2050년, 확정된 시각과 당시 시차를 지원한다. 기업 계산에는 Swiss 의존성이 없다. 숙요의 두 숙 경계 2각분 이내는 HTTP 400 MANSION_BOUNDARY이며 베다의 파다 경계는 수 분 차이로 결과가 달라질 수 있다. 기존 서비스의 Swiss 잔존 경로와 검증 범위는 [천문력 전환 기록](engine-audit/35-business-ephemeris-release.md)을 참고한다.
- PortOne V2 이니시스 일반카드 채널과 서버 조회·웹훅 서명을 기존 결제 설정에서 확인한다. 운영 전 승인·취소 이벤트 및 기존 결제 대사 cron이 연결돼야 한다. 결제 확인 중인 주문은 다시 구매하지 않고 대시보드에서 상태를 갱신한다.
- 기존 Payment 주문 ID의 유일성과 데이터베이스 접근 권한을 확인한다. BusinessCredential과 BusinessMeter 컬렉션은 MongoDB 기본 고유 _id를 사용한다. 키는 한 계정에 하나이며 요청 본문이나 Authorization 헤더를 CDN·애플리케이션 로그에 수집하지 않는다.
- 예시는 node scripts/business-api-examples.mjs로 생성하고 --check로 엔진과 대조한다. 최초 연동 시 키를 서버 환경변수 GGUL_FORTUNE_API_KEY에 넣고 공개 문서의 cURL을 실행한다.
