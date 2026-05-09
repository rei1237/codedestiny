# Premium PDF Generation Audit

작성일: 2026-05-10
범위: Code Destiny 프리미엄 PDF 6종

## 1) 대상 기능 요약

| 기능명 | featureType(표준) | legacy reportType | 프론트 진입 | prepare API | chapter API | pdf API |
|---|---|---|---|---|---|---|
| 사주 인생의 책 | saju_life_book | lifeBook | js/life-book.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |
| 사주 연애 비책 | saju_love_secret | loveSecret | js/love-secret-v2.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |
| 프리미엄 자미두수 | jamidusu_premium | ziweiPremium | js/ziwei-book.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |
| 프리미엄 숙요점 | sookyo_premium | sookyoPremium | js/sukuyo-book.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |
| 프리미엄 베다점 | vedic_premium | vedicPremium | js/vedic-book.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |
| 프리미엄 점성술 | astrology_premium | westernAstrologyPremium | js/astro-book.js | /api/premium-report/prepare | /api/premium-report/chapter | /api/premium-report/pdf |

## 2) 현재 엔진 구조

- 공통 오케스트레이션: worker/routes/premium.js
  - prepare: canonical 계산데이터 수집/검증
  - chapter: 챕터 생성 + JSON pack 주입
  - pdf: 챕터 완료 여부/길이 검증 게이트
- Gemini 서버 통합: worker/lib/gemini.js + worker/lib/gemini-client.js
- 접근/결제 보호: worker/lib/access-control.js
- 관리자 헬스: worker/routes/admin.js

## 3) 중앙 스펙

신규 파일: worker/lib/premium-pdf-specs.js

스펙 필드:
- featureType
- legacyReportType
- minTotalChars
- targetTotalChars
- chapters[] (id/title/minChars/targetChars/requiredDataKeys)
- love_secret는 mode별 chaptersByMode(solo/compatibility)

정의된 최소 기준(요약):
- saju_life_book: 13장, 장당 6000+
- saju_love_secret: 10장, mode별 chapter min 적용
- jamidusu_premium: 13장, 장당 5200+
- sookyo_premium: 13장, 장당 4000+
- vedic_premium: 14장, 장당 4000+
- astrology_premium: 13장, 장당 3500+

## 4) 품질 게이트

신규/강화:
- featureType 입력 지원 및 legacy reportType 호환
- requestId 전파 (prepare/chapter/pdf)
- idempotencyKey 생성: userId + featureType + mode + inputHash
- chapter 길이 검증: 챕터별 min/target 체크
- total 길이 검증: 최종 pdf 단계에서 min/target 체크
- chapter idempotency: 동일 requestId + chapterId 재호출 시 캐시 응답

## 5) 결제/포인트 보호 점검

서버 prepare 단계에서 reportType 기준 requirePremiumReportAccess 수행.
프론트는 featureType + reportType 병행 전송으로 표준화와 호환성을 동시에 확보.

주의 사항:
- life-book / love-secret은 프론트 환급 전략이 다른 기능 대비 약할 수 있어, 실패 시 자동 보상 로직의 추가 점검 필요.

## 6) 관리자 운영 진단 API

신규 엔드포인트:
- GET /api/admin/gemini-health
  - 키 존재 여부 + 선택적 smoke 테스트(?smoke=1)
- GET /api/admin/pdf-health
  - PDF 렌더러 기초 건강 체크(시뮬레이션 바이트)
- GET /api/admin/premium-pdf-health
  - 스펙/키/선택적 smoke 통합 진단

## 7) 환경 변수 점검 포인트

Gemini 키 후보:
- PREMIUM_GEMINI_API_KEY1..4
- GEMINI_API_KEY
- GOOGLE_GEMINI_API_KEY
- GOOGLE_GENERATIVE_AI_API_KEY
- GOOGLE_AI_API_KEY
- GOOGLE_API_KEY
- (legacy 호환) GEMINIF_API_KEY1..4

모델:
- PREMIUM_GEMINI_MODEL
- GEMINI_MODEL

## 8) 현재 리스크

- 기존 워크트리에 대규모 선행 변경이 있어, premium 관련 파일만 제한 수정함.
- pdf-health는 실제 파일 렌더러 대신 시뮬레이션 검증이므로, 배포 환경에서 실렌더 경로 검증 추가 권장.
- reportType별 레거시 chapter 구성과 스펙 chapter 수 차이가 일부 존재(특히 vedic), 운영 데이터로 최종 정합 확인 필요.

## 9) 권장 후속 조치

1. /api/admin/premium-pdf-health?smoke=1 운영 실행
2. 6개 기능 E2E 생성(prepare -> all chapters -> pdf) 로그 수집
3. life/love 실패 환급 로직을 서버 idempotent consume/refund 트랜잭션으로 통일
4. 실제 PDF 바이너리 렌더 경로(서버/워커) 헬스체크 추가
