# 제휴 광고 결과 하단 적용 — 2026-10-16

status: pending-production-approval

## 현재 확인
- 운영 관리자: 쿠팡 초안 9건, 검수 0건, 전체와 두 판매처 OFF. 운영 쓰기 미실행.
- 쿠팡 추가 인증 후 code-destiny.com 및 /ggulggul/, /yeongnyangi/ 등록 확인. 공식 상품 링크 발급 가능. 최종 승인 완료는 확인하지 않았으며 활동 스크린샷 등록 안내가 남아 있음.
- 최종 승인은 정산/API 조건이며 광고 시작 조건과 구분. 근거: https://partners.coupangcdn.com/partners-guide/partners-guide-20251028182159.pdf
- 알리 포털 직접 접근은 사이트 보안 정책으로 차단. 기존 운영자 확인과 공식 링크 6개는 affiliate-aliexpress-20261009.json에 보존.

## 구현
- 결과 하단 최대 2개. 글 하단은 렌더와 서버 선택 모두 차단. 서가는 기존 탐색 기능 유지.
- 초융합 finalVerdict.doNow / timingAndAction.luckyActions와 휴먼디자인 practicalGuide의 steps만 태그로 변환. 다른 결과의 비구조화 원문을 무작정 분석하지 않으며 명시적 실천 필드가 없는 화면은 추천을 숨김.
- 색상·상징 소품은 서가에서 직접 선택한 색상/모티프에만 매칭. 오행 보충·개운·액막이 효능 주장 없음.
- 건강기능식품은 별도 supplement-information 주제를 직접 선택한 서가만 허용. 오행·질환·증상 기반 추론 없음. 기존 evidence/attributes 필드로 식품안전나라 제품 URL 및 인정 정보·기능성·섭취 주의사항을 요구. 이는 관리자의 실제 제품 검수를 대체하지 않음.
- 결제/인증/DB 스키마/운세 계산/생성·재열람 계약 변경 없음.

## 검수할 등록 자료
- affiliate-release-20261016.json: 도서 4개, 기록장 1개, 새 쿠팡 팔찌 1개, 건강기능식품 1개. 모두 초안이며 자동 공개하지 않음.
- 팔찌 공식 링크 https://link.coupang.com/a/hS0Skh2NGK — 도트라인 CH06 자수정 6mm. 천연 표기는 판매자 설명이며 독립 감정이 아님. 보라색 장식으로만 소개.
- 도서·기록장은 공식 포털에서 현재 선택 상품의 링크를 재발급하고 실제 연결 제목·옵션과 구매 가능 버튼을 확인. 가격은 저장하지 않음.
- 건강기능식품 후보는 락토핏 골드 100g(2g × 50포) 1개. 판매 상세의 제조사·40억 CFU·아연 2.55mg을 식품안전나라 신고 20040020016643과 대조. 20억 CFU 제품(20040020016655)은 별도 제품이므로 혼용하지 않음. 우유·대두 및 섭취 주의사항을 카드에 표시. 개인에게 적합하다는 판단은 하지 않음.
- 알리 6개는 기존 JSON을 사용하며, 보석 진위·효능·미확인 가격은 미표시.

## 운영 적용 순서
1. 최종 main CI 확인.
2. 검수한 상품·계정 근거·공개 설정을 사용자에게 제시하고 운영 DB 변경 및 운영 승격 승인 획득.
3. 기존 관리자에서 동일 ID 초안 보완 → 재조회 → 상품별 검수. 최종 승인 여부를 모르면 완료로 기록하지 않음.
4. 공식 배포 및 버전 일치 확인 후 판매처별 공개. API와 실제 결과/서가 노출 확인.
5. 광고 고지와 상품 링크가 함께 보이는 활동 캡처를 쿠팡에 제출. 공식 보고서 확인 전 수익 미확인.
6. 이상 시 해당 상품/판매처 OFF. 코드 회귀는 이번 커밋만 revert.

## 검증
- 추천 코어·문맥 Node 테스트 25개 통과. 오행 정보만으로 건강기능식품 미노출, 글 미노출, 결과 상징품 미노출, 명시적 탐색 및 조언 필드 제한 포함. 정적 DOM에서 최대 2개·저장 버튼 이후 배치·상단 고지·실패 시 숨김도 확인.
- Impeccable detect: 0건.
- 두 브랜드 mock 서가 360·390·430·1280px: 화면 넘침 0, 44px 미만 조작부 0, 최소 토큰 대비 6.09:1, 페이지 오류 0. 결과 미리보기 390px 최대 2개. 실제 운영 노출 증거와 구분.
- check:fast의 paid-gate-suite 88개 및 lint 통과. sitemap drift 발견 후 정본 생성기로 갱신하고 통과. 나머지 계획 단계는 별도 이어 실행 중. CI는 최종 전달 결과를 별도로 기록.

## 공개 후보 링크
|상품|배치|공식 링크|
|---|---|---|
|아주 작은 습관의 힘|습관 실천 결과·서가|https://link.coupang.com/a/hS1OQsOAge|
|거절 잘 하는 법|관계 경계 실천 결과·서가|https://link.coupang.com/a/hS1SfXXGeG|
|돈의 심리학 뉴 에디션|소비 점검 결과·서가|https://link.coupang.com/a/hS10EiZvHg|
|딥 워크|집중 실천 결과·서가|https://link.coupang.com/a/hS15pZCqw8|
|모닝글로리 비움 연습장 랜덤 2개|기록 실천 결과·서가|https://link.coupang.com/a/hS2aPLVrLo|
|도트라인 CH06 자수정 6mm 팔찌|보라색 상징 선택 서가|https://link.coupang.com/a/hS0Skh2NGK|
|락토핏 골드 50포 1개|건강기능식품 정보 직접 선택 서가|https://link.coupang.com/a/hS2jw54gNM|

건강기능식품 근거: https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/searchHomeHFDetail.do?prdlstReportLedgNo=2022021000248804

## 기존 알리 후보 (10월 9일 사용자 확인)
|상품|공식 링크|
|---|---|
|태슬 장식 금속 책갈피|https://s.click.aliexpress.com/e/_c359R0RR|
|고양이 모양 저금통|https://s.click.aliexpress.com/e/_c3gY8lB3|
|초록색 도넛 장식 팔찌|https://s.click.aliexpress.com/e/_c3bNiDg5|
|초록색 클로버 귀걸이|https://s.click.aliexpress.com/e/_c4amvaQH|
|금색 고양이 장식|https://s.click.aliexpress.com/e/_c37MP109|
|초록색 비즈 팔찌|https://s.click.aliexpress.com/e/_c3gr3LZB|

공개 제안: 전역 및 두 판매처 ON, 활동 가능·매체 등록 확인 기록, 쿠팡 AF7837486 / 알리 NEO2277. 이는 승인 후 적용할 제안이며 현재 운영 설정은 계속 OFF. 개별 검수 미통과 상품은 공개하지 않음. 최종 승인 완료로 기록하지 않음.
