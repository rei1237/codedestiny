# Premium PDF Golden Path (Ziwei Baseline)

## 목표
- Ziwei 흐름을 기준으로 프리미엄 PDF 생성 파이프라인을 공통화한다.
- 운세별 차이는 계산/정규화 어댑터에만 둔다.
- 기존 UI 진입점과 레거시 엔드포인트 호환은 유지한다.

## 대상 범위
- ziweiPremium
- lifeBook
- loveSecret
- sajuNewYear
- sookyoPremium
- westernAstrologyPremium
- vedicPremium

## 서버 공통 파이프라인
1. Start
- 입력: reportType/featureType/requestBody
- 처리: 타입 정규화, requestId 발급, 인증/권한 확인
- 로그: [PremiumPDF][Start]

2. PayloadBuilt
- 처리: canonical 데이터 생성/복원, chapter plan 계산
- 로그: [PremiumPDF][PayloadBuilt]

3. Validation
- 처리: reportType별 필수 필드 검사
- 실패: 422 + normalizedCode=PDF_REPORT_PAYLOAD_MISSING_FIELD
- 로그: [PremiumPDF][Validation]

4. GeminiStart
- 처리: chapter 생성 시작 (단일 챕터 또는 범위 run)
- 로그: [PremiumPDF][GeminiStart]

5. PdfComposed
- 처리: 필수 챕터/전체 길이 검증 후 PDF 준비 상태 전환
- 로그: [PremiumPDF][PdfComposed]

6. Failed
- 처리: 라우트 예외 처리
- 로그: [PremiumPDF][Failed]

## 엔드포인트 구조
- 공통(권장):
  - POST /api/premium-report/prepare
  - POST /api/premium-report/chapter
  - POST /api/premium-report/run
  - POST /api/premium-report/pdf
- 레거시(호환 유지):
  - POST /api/premium/{alias}/generate
  - GET /api/premium/{alias}/status
  - GET /api/premium/{alias}/download

## 필수 검증 실패 응답 규격
- 상태코드: 422
- 필드:
  - ok=false
  - code: 기존 타입별 코드 유지 (호환)
  - normalizedCode=PDF_REPORT_PAYLOAD_MISSING_FIELD
  - message: 사용자 안내형 문구
  - missingFields: 누락 경로 배열

## featureKey 정규화 정책
- 서버는 premium_pdf_* 키를 canonical 키로 해석해야 한다.
- 예:
  - premium_pdf_ziwei -> premium-ziwei-report
  - premium_pdf_western_astrology -> premium-astrology-report
  - premium_pdf_sukyo -> premium-sukuyo-report
  - premium_pdf_vedic -> premium-vedic-report
  - premium_pdf_saju_life_book -> premium-lifebook-report
  - premium_pdf_saju_love_secret -> premium-love-secret-solo

## 어댑터 경계
- 공통 파이프라인은 아래 입력/출력만 보장한다.
  - 입력: canonicalJson, chapterId, mode
  - 출력: chapter text, chapter meta, validation
- 운세별 계산 차이는 각 reportType 어댑터에서만 처리한다.

## 운영 체크리스트
- payment/auth 우회가 없는지 확인
- prepare/chapter/pdf 각 단계 422 메시지 확인
- premium_pdf_*와 canonical key 혼용 시 정상 차감 확인
- Ziwei 기존 흐름 회귀 테스트 우선 확인
