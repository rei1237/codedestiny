# 쿠팡 파트너스 승인 전 기반

기준일: 2026-10-07 · 계정 식별자: AF7837486 · 운영 공개: OFF

## 현재 상태

- 실제 운영 상품 0건, 실제 초안 0건. 저장소에 상품 seed를 두지 않는다.
- 공개 추천 페이지는 준비 안내만 보이며 noindex다. 로그인은 요구하지 않는다.
- 관리자 미리보기는 기존 관리자 인증을 사용하고, 구매 링크·자체 광고 통계를 비활성화한다.
- 계정 승인·활동 매체 등록·실제 수익 귀속은 미확인이다. 화면 준비와 계정 등록을 혼동하지 않는다.
- API 키, 쿠팡 검색/딥링크 호출, 실제 제휴 클릭, 운영 DB 변경, 운영 승격은 수행하지 않는다.

## 페이지와 연결

공개 경로: /recommendations/, /recommendations/books/, /recommendations/daily-life/, /recommendations/pets/, /recommendations/fandom/

관리 경로: /admin/recommendations/

| 서비스 | 실제 연결 소스 | 추천 입력 |
|---|---|---|
| 영냥이 단일·융합 | app/yeongnyangi/_components/Result.tsx | 완료 상태, product.id, locale |
| 연이 운명의 찻집 | src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx | 기존 consultPricing의 featureKey |
| 네오 전략실 | src/features/neo-war-room/NeoOperationRoomResultPage.tsx | neo-operation-room-consultation |
| 초융합 | app/fusion-fortune/FusionFortuneClient.tsx | fusion-fortune-consultation |
| 종합 상담 | app/fortune-chat/ConsultationResult.tsx | fortune-chat, persona |
| 자미두수 | app/ziwei-ai/ZiweiAiClient.tsx | ziwei-ai-consultation |
| 숙요 궁합 | app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx | 실제 모달 완료 상태, sukuyo-compatibility-ai |
| 베다·서양 점성술 | 각 app/*-ai/result/*ResultClient.tsx | vedic-ai-consultation, astrology-ai-consultation |
| 연애·인생·인연 보고서 | LoveSecretAiResultClient, LifeBookAiResultClient, MasterLoveCodexResultClient | 광고 매핑 키 love-secret-ai, life-book-ai, master-love-codex |
| 휴먼 디자인 | HumanDesignClient, HumanDesignReportClient | human-design-chart, human-design-report |
| 최애 | app/saju/destiny-bias/DestinyBiasClient.tsx | destiny-bias, outcome.partner.groupId |
| 반려동물 | pet-saju.html | pet-saju-ai-consultation / pet-compatibility-ai, 완료 결과의 종 |
| 사주·명리 타로 | js/saju-engine.js, js/saju-engine-tarot-sukuyo-quantum.js | legacy-saju / legacy-tarot |
| 건강 리포트 | js/core/saju/reportDashboard.js | rpt_healthReportCard, 별도 생활 관심사 선택 |

위 광고 매핑 키는 결제 상품 ID의 새 정본이 아니다. 결제 레지스트리와 가격은 수정하지 않는다.
React 공통 진입점은 RecommendationResult, 정적 셸은 mountRecommendation이다.
규칙·입력 정규화·URL 검사·문구는 js/recommendations-*.mjs를 공유한다.
결과 객체, 사주 원국, 건강 해석, 이름, 생년월일, 질문/답변, 주문·보고서 ID를 추천 입력에 전달하지 않는다.
건강 리포트 내부 해석 문구의 검토·수정은 이번 광고 기반 작업에 포함하지 않는다.

## API 없이 등록하는 순서

1. AF7837486 계정의 파트너스 포털에서 상품 링크 또는 간편 링크를 발급한다. 일반 쿠팡 URL에 계정 코드를 붙이지 않는다.
2. 상품 ID·분야·허용 상품 종류·실제 상품명·핵심 속성·자체 추천 이유를 입력한다.
3. 발급 URL 원문, 발급 출처, 상품/검색 연결 유형을 입력한다.
4. 허용된 이미지 주소와 사용 권한 근거를 적는다. 임의 이미지 다운로드·상품 설명/후기 복사·AI 상품 사진 생성은 하지 않는다.
5. 상품 사실·계정 귀속 확인 근거, 서비스·체계·관심사·종·그룹을 등록한다.
6. 가격을 모르면 빈칸, 재고를 모르면 미확인을 선택하고 초안으로 저장한다.
7. 카드 미리보기에서 고지·텍스트·분류를 확인한다. 네 가지 검수 항목을 확인한 뒤 저장본 검수 완료를 기록한다.
8. 상품 검수 완료는 공개 승인과 다르다. 현재 빌드에서는 전체 ON 요청도 거부한다.

초기 허용 링크 형식은 HTTPS link.coupang.com/a/의 영숫자 단축 경로다.
다른 공식 발급 형식도 있을 수 있으나 확인 전 자동 허용하지 않는다.
형식 검사는 공식 발급·계정 귀속을 증명하지 않는다. 원본 쿼리를 보존하며 링크를 따라가 검사하지 않는다.
미지원 링크는 초안으로 보관하고 문서·발급 근거를 확인한 뒤 검사기를 별도 변경한다.

모든 상품 편집은 검수를 해제한다. 검수 유효기간 30일, 가격 표시 유효기간 24시간은 자체 운영 기본값이다.
더 엄격한 쿠팡 정책이 확인되면 그 기준을 우선한다.
수동 카탈로그는 500개까지로 제한한다. 신규 상품 수를 채우기 위한 예시는 운영 DB에 넣지 않는다.

## 분야별 필요한 자료

| 분야 | 승인 후 제공할 자료 |
|---|---|
| 도서·기록 | 공식 링크, 실제 서명·판본·언어·입문 난이도·해당 점술 체계, 이미지 사용 근거 |
| 일상 식품·생활 | 공식 링크, 실제 용도·구성·규격, 식품은 확인 가능한 성분·알레르기·카페인 정보, 이미지 근거 |
| 반려동물 | 공식 링크, 고양이/강아지, 크기·연령·용도 등 확인된 적합 조건, 이미지 근거 |
| 최애·수집 | 공식 링크, 그룹 ID·앨범 버전·구성품·랜덤 구성·유통 근거, 이미지 근거 |

의약품·치료 목적 제품은 허용 종류에 없다. 초기 반려동물 추천은 생활용품 중심이다.
앨범은 그룹 ID 없이는 검수할 수 없다. 일반 수집 용품은 앨범으로 표시하지 않는다.
공식 굿즈·정품·별점·할인·배송 보장 배지를 임의 생성하지 않는다.

## 광고 고지·등록 자료

고지: 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.

독립 추천 화면 첫 상품 이전과 결과 페이지 첫 부분에 표시하고, 결과 블록에서도 광고임을 알린다.
기존 런타임 12개 언어의 동일 의미 문구를 사용한다.
추천은 구매 가능성이나 한국/해외 배송을 보장하지 않는다.

등록 자료의 예정 도메인은 https://code-destiny.com 이며, 위 추천 경로와 실제 광고가 표시될 서비스 경로 목록을 사용한다.
개인 결과 URL의 쿼리·보고서 ID는 등록 자료에 넣지 않는다.
비공개 결과 화면의 매체 등록 방법은 계정 포털 안내로 확인해야 한다.
Android 매체에는 실제 출시 앱의 스토어 주소가 필요하다. 패키지 주소를 추측해 만들지 않는다.
승인 전에는 구매 불가능한 관리자 미리보기만 제공하므로, 공개 심사용 지면이 필요한 경우 별도 승인된 절차를 정해야 한다.

근거: [쿠팡 공식 이용 가이드](https://partners.coupangcdn.com/partners-guide/partners-guide-20251028182159.pdf).
공식 자료에서 링크/API 운영 방식, 첫 부분의 경제적 이해관계 고지, 활동 페이지 등록을 확인했다.
계정별 승인 상태·API 이용 자격·이미지 사용 조건·최신 운영정책·수익 귀속은 별도 확인 대상이다.

## 이동과 통계

- 서버 리다이렉트 없이 공식 원문 URL로 이동한다. 새 탭은 sponsored noopener, no-referrer를 쓴다.
- no-referrer의 수익 귀속 영향은 단정하지 않는다. 공식 리포트 확인 전 귀속 미검증이다.
- Android는 기존 외부 HTTPS Custom Tabs 경로를 사용한다. PG 스킴·결제 복귀 리스너는 변경하지 않는다.
- 통계는 분석 동의를 따른다. CTA 링크는 통계 응답과 독립적이다.
- 노출은 50% 이상 1초, 표시 세션당 한 번이다. 일별 서비스·지면·상품 집계만 저장한다.
- 이벤트 수집에 IP·상담 Referer·사용자/보고서/주문 식별자를 저장하지 않는다. 글로벌 이벤트 유입 상한을 두며 봇 완전 배제를 주장하지 않는다.
- 자체 클릭/노출/탐색과 공식 리포트의 클릭/주문/취소/수익은 분리한다.
- 공식 실적은 기간별 수동 입력이며 값이 없으면 미확인이다. 현재 자체 지표 조회는 최근 30일, 최대 5,000개 집계 행으로 제한하며 상한 도달을 표시한다.
- 상담 전환·결과 열람·성능은 기존 분석에서 확인한다. 광고 지표와 자동 매출 대조는 하지 않는다.

## 비활성화·롤백

js/recommendations-core.mjs의 RECOMMENDATIONS_RELEASED=false가 최상위 공개 차단이다.
관리자 전체 OFF와 disabledServices가 추가 중지 장치다.
관리자에서 승인 확인을 기록해도 현재 빌드는 공개되지 않는다.
향후 공개된 빌드는 다음 조회부터 OFF가 적용되며 열린 광고 화면도 최대 60초마다 설정을 재확인한다.
기존에 열린 외부 쿠팡 탭을 되돌리거나 파트너스 계정을 중지하는 기능은 아니다.
DB에는 상품/설정/일별 집계/수동 공식 리포트 전용 컬렉션만 추가한다.
롤백은 이 기능의 커밋만 git revert하고 공식 CI를 통과시킨다. 기존 결제·사용권·결과 저장 스키마를 되돌릴 필요가 없다.

## 검증 기록

- 규칙·보안·다국어·연결 계약: node --test __tests__/ui/recommendations.test.mjs
- 실제 Worker 핸들러의 DB mock: npm run test:jest -- --runInBand __tests__/worker/recommendations.test.js
- 저장소 검증: npm run check:fast -- --plan 및 npm run check:fast
- 정적 미러: npm run sync:public 및 npm run verify:public-mirror-fresh
- 브라우저는 npm run dev의 외부 통신 차단 mock 서버와 가짜 관리자 토큰만 사용한다. 운영 자격증명은 사용하지 않는다.
- 화면 자료는 coupang-preview/에 보관한다. 실제 상품이 아닌 구성 검수용임을 화면에 표시한다.
- 실결제·실 LLM·운영 DB·쿠팡 실제 클릭·실기기 앱 전환·수익 귀속은 이 검증에 포함하지 않는다.

### 2026-10-07 로컬 확인 결과

- 규칙·URL·분류·다국어 14개, Worker DB mock 6개, 동의·노출 시간·내부 복귀 5개: 총 25개 통과.
- 브라우저: 초안 저장/카드 미리보기/필터, 공개 OFF의 카탈로그 요청 0건, 구매 링크 0개. 360·390·430·1280px 가로 넘침 0, 런타임 오류 0.
- 시각 검수: 제목 줄바꿈과 긴 요소 캡처를 보완한 뒤 독립 검수 통과. 실제 상품 이미지를 사용한 검수는 아님.
- 디자인 detector: 차단 결함 0, 글자 크기 단계 advisory 2개. 기존 서비스 토큰과 읽기 쉬운 고지 크기를 사용했다.
- 타입 검사: tsc --noEmit 통과(최종 실행 결과는 전달 기록 참고).
- check:fast -- --plan은 완료. check:fast는 critical로 자동 승격되어 88개 전체 paid-gate-suite를 실행했고, 장시간 전체 Jest 단계에서 완료되지 않아 중단했다. 전체 게이트 통과로 기록하지 않는다.
- 결제·차감·복구·로그인 로직은 diff 범위 밖이다. 모의 브라우저에서 실 결제 복귀 전체 E2E를 실행한 것은 아니다. 실제 기기/쿠팡 앱 설치 유무/수익 귀속은 후속 검증 대상이다.

화면 재현은 `npm run dev`의 로컬 주소를 확인한 후 PowerShell에서 실행한다.

```powershell
$env:RECOMMENDATIONS_PREVIEW_URL = 'http://127.0.0.1:19436'
node scripts/capture-recommendations-mock.cjs
```

주소는 해당 작업의 dev 출력에 맞춘다. 스크립트는 루프백 외 요청을 모두 차단하며 가짜 관리자 토큰과 메모리 카탈로그만 쓴다. 테스트 초안은 서버 종료 시 사라지고 운영 상품 수에 포함하지 않는다.
