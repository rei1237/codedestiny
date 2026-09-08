---
status: active
updated: 2026-09-09
next: 최신 main 기준 ci:preflight와 PR 생성을 완료하고 순차 머지 담당자와 통합 순서를 조율한다. PG 회신도 확인한다.
---

# 해외결제 심사 진행 기록 — 2026-09-09

## 현재 결정과 실제 신청 상태

**현재 우선안: 한국 사업자 + 기존 PortOne V2 / KG이니시스 해외카드, KRW 단건결제.**

사용자가 현재 단건결제라고 확인했다. 이용권도 자동갱신 없는 일회 구매이며 기존 가격·혜택을 바꾸지 않는다. 과거 포인트 충전형 계약 문의를 현재 판매 구조로 오인하지 않는다.

- 이니시스 가맹점관리자 → 변경/추가 → 서비스 신청현황에서 **2026-08-20 해외카드 / 처리중** 확인. 승인 완료가 아니다. 해외카드 행에 반려 사유는 표시되지 않았다. 다른 서비스의 반려 사유를 혼동하지 않는다.
- 기존 담당자에게 현재 운세 콘텐츠 단건결제 구조와 처리 상태·보완 서류·브랜드·3DS·수수료·보험·테스트 환경을 문의했고 PortOne을 참조했다. 메일 발송 성공 화면 확인.
- Stripe 공식 Sales 이메일에 한국 사업자 신규/초대 프로그램, 실제 운세 업종, 미국 실체 있는 법인의 적격성 및 일본 고객 관련 제한 문의 발송 성공. Sales 웹폼은 실제 연매출을 요구하여 제출하지 않았으며 대체 이메일을 사용했다. 가입 승인이 아니다.
- Eximbay 공식 온라인 지원 이메일에 공개 금지업종의 사주·운세 범위와 예외 심사 가능 여부를 정확한 사업 설명으로 문의, 발송 성공. 계약 신청/승인으로 계산하지 않는다.
- 중복 해외카드 신청, 유료 계약, 미국 법인 설립, 실카드 결제는 하지 않았다.
- 기존 영문 사업자 서류를 로컬에서 발견했다. 본인정보 문서·계좌·인증정보를 저장소에 복사하지 않았다.

메일 제목으로 후속 확인:
1. `[Code Destiny] 8/20 해외카드 신청 처리중 확인 — 현재 콘텐츠 단건결제 구조`
2. `South Korea merchant eligibility and astrology digital content — Code Destiny`
3. `[Code Destiny] 운세·점성술 디지털 콘텐츠 단건결제 업종 사전 확인`

## 공식 자료와 비교

조사일 기준 공개 지원은 개별 가맹점 승인과 다르다. 성공률·승인 확률·심사 소요일은 근거 없는 숫자를 만들지 않는다.

| 항목 | Stripe 직접 / Atlas 미국 사업자 | Eximbay | 기존 KG이니시스 해외카드 |
|---|---|---|---|
| 한국 사업자 직접 | 공개 지원국에 한국 없음 | 한국 개인·법인 신청 경로 있음 | 기존 계약 있음, 추가 심사 처리중 |
| 실제 운세 업종 | 국가별 제한 및 개별 확인 필요 | 공식 금지업종에 사주·운세: 사전 답변 필수 | 비실물 콘텐츠는 별도 협의; 승인 미확인 |
| 카드 | Visa/Master/Amex 등, 사업국별 | Visa/Master/JCB/Amex/UnionPay/Discover/Diners 안내 | PortOne 공식 안내 Visa/Master/JCB/Diners |
| 실제 청구/정산 | 지원국 사업자 다중통화; USD 예시 | USD/JPY/EUR/GBP/KRW 등 계약별 | KRW 청구·정산 |
| Apple/Google Pay·PayPal | 사업국·수단별 적격성 확인 | Apple Pay·PayPal 안내, Google Pay 미확인 | 현재 해외카드 추가만으로 보장 안 됨 |
| 일본 현지수단 | 미국 계정 PayPay 사용을 가정하지 않음 | PayPay/econtext 안내, 별도 적격성 | 별도 일본결제 상품 검토 필요 |
| 중국/동남아 | 사업국 및 수단별 조건 | Alipay/WeChat/GrabPay 등 안내, 가맹점별 | 해외카드 계약에 포함됐다고 가정하지 않음 |
| PortOne | 현행 연결 여부 별도 확인 | V2 Eximbay 모듈 존재; 모든 수단 동일 지원 아님 | 현재 V2 구현 재사용 |
| 3DS·부정거래 | 3DS/Radar | 3DS·위험관리 서비스, 계약 확인 | 3D인증, 현행 모바일 bypass 있음 |
| 요율 | 미국 국내카드 2.9%+$0.30, 해외카드 +1.5%p, 환전 필요시 +1%p | 글로벌 카드 별도협의; 일부 중국 수단 2.9~5% 공개 | 현 가맹점 추가 특약 견적 요청 |
| 가입·월비용·보증보험 | Atlas $500, 이후 RA $100/년 외 세금·회계 | 가입비·보험·월비용·정산 주기 견적 필요 | 기존 계약 재사용, 추가 보험/비용 확인 필요 |
| 차지백·환전 | 추가 비용·증빙·한국 송금 별도 | 위험관리 제공, 수수료/환율 계약 확인 | 가맹점 책임·수수료·기한 문의 완료 |
| 운영 부담·한국어 지원 | 미국 법인 사용시 회계 부담 큼 | 한국어 지원, 업종 제한이 선결 조건 | 기존 한국어 계약과 구현 재사용 |

근거:
- [Stripe 지원국](https://stripe.com/global), [제한 업종](https://stripe.com/legal/restricted-businesses), [한국 고객 결제수단 안내](https://docs.stripe.com/payments/countries/korea). 마지막 문서는 한국 사업자 온보딩 지원을 의미하지 않는다.
- [Stripe 미국 가격](https://stripe.com/us/pricing), [Atlas 가입](https://docs.stripe.com/atlas/signup).
- [Eximbay 가입·금지업종](https://www.eximbay.com/info-online.do), [결제 서비스](https://www.eximbay.com/service-online.do), [수수료](https://www.eximbay.com/info-online-fee.do), [위험관리](https://www.eximbay.com/service-risk.do).
- [PortOne 이니시스 해외카드](https://help.portone.io/content/inicis-international), [이니시스 추가서비스](https://manual.inicis.com/Tip/addService.html), [별도 일본결제](https://www.inicis.com/japanpayments/).

판단:
- 가장 현실적인 글로벌 구조 / 가장 빠른 추진 경로: 기존 이니시스 해외카드 승인 후 KRW 단건결제. 승인 속도 자체는 보장 불가.
- 유지관리 비용 최소 후보: 기존 이니시스. 수수료 최저 업체는 견적 전 확정할 수 없다.
- 일본 UX 후보: 별도 이니시스 일본결제의 JPY·PayPay 등. 현재 해외카드 승인과 별개이며 업종 승인 확인 필요.
- 미국·유럽 UX 후보: Stripe 지원사업국의 적격 사업자라면 다중통화·월렛이 유리할 수 있으나 현 한국 사업자에게 즉시 실행 가능한 안은 이니시스.
- Eximbay는 업종 허용 답변이 나오기 전 주력으로 선정하지 않는다.

## Atlas 경제성

현 단계에서는 설립하지 않는다. 한국 사업자 해외카드 경로가 이미 신청되어 있고 해외 매출/객단가·미국 회계 견적이 없으므로 추가 법인의 경제성이 입증되지 않았다.

Atlas 설립 $500(첫해 등록대리인 포함), 이후 등록대리인 $100/년. Delaware C corporation franchise tax는 계산법에 따라 최저 $175 또는 $400이며 실제 주식구조에 따라 증가한다. 연차보고 비용, 연방 신고, 기장, 한국 관련 신고, 은행·송금·환전은 추가다. 이 숫자를 연간 총비용으로 제시하면 안 된다. [Delaware 공식 안내](https://corp.delaware.gov/paytaxes/)

외국인 소유 미국 법인은 구조와 거래에 따라 Form 5472 등 의무가 생길 수 있다. 누락 벌금이 큰 만큼 설립 전 미국 세무사와 한국 거래은행/세무사의 확인이 필요하다. [IRS 5472 지침](https://www.irs.gov/instructions/i5472), [한국은행 외환 안내](https://www.bok.or.kr/portal/main/contents.do?menuNo=200405)

수수료 민감도(실제 매출 추정 아님): 미국 국내카드 $10 결제는 $0.59(5.9%), $30은 $1.17(3.9%). 국제카드 및 환전이 모두 적용되면 각각 $0.84(8.4%), $1.92(6.4%). 환불·차지백·세무·송금비 제외. 고정 유지비 F와 경쟁 PG 대비 실효 수수료 절감률 d가 있을 때 손익분기 매출은 F/d. 예를 들어 가정 F=$2,000, d=1%p이면 연 $200,000; 절감률이 0 이하이면 수수료 절감만으로 회수 불가. 실제 매출을 지어내지 않았다.

## 사이트 변경과 기술 경계

- `app/components/CommerceDisclosure.jsx`: 기존 사업자 정본 및 서버 가격 resolver/이용권 가격 상수를 읽는 공개 구매 안내.
- `lib/i18n/commerce-disclosure-copy.mjs`: 영어·일본어·중국어로 실제 업종, 단건결제, KRW 청구, 생성 시점, 문의·환불 안내.
- `app/components/LocalizedTrustPage.jsx`: 각 언어 contact에 공개 안내 삽입. 기존 약관·개인정보·환불 링크 재사용.
- `app/ja/tokushoho/page.js`: 미확인 전화 운영시간 제거, 결제 확인과 AI 생성 완료 구분, 자동갱신 없는 이용권 명시.
- sitemap 및 lastmod 원장은 생성기로 동기화.
- 기존 가격·단건결제·이용권·월정석·환불 자격 정책, 결제/인증/API/DB 로직은 변경하지 않음.
- 사업자 값은 `data-cd-no-trans`로 런타임 번역 변형 방지.

기존 `worker/payments/pg.js`의 서버 금액·통화 검증, webhook 이벤트 중복 방지/서명 검증, confirm/reconcile 및 entitlement 흐름을 재사용한다. 미승인 USD/EUR 채널을 노출하거나 클라이언트 환산가를 청구액으로 쓰지 않는다. 현재 해외카드 KRW 승인이라면 별도 통화 라우터를 추가할 필요가 없다. 다중통화 계약이 실제 승인될 때 서버 상품·통화별 가격표 및 환불/차지백 이벤트 매핑을 함께 확장한다.

## 검증과 남은 작업

- `npm run check:fast -- --plan` 확인 후 `npm run check:fast`: 초기 sitemap drift로 실패, 생성 후 통과. mock Jest 218 suites / 2,422 tests 통과. 이후 가격 예시/번역방지 보완은 추가 검증 기록 참조.
- `npm run typecheck`, `npm run verify:business-identity`, `npm run verify:overseas-payment-notice`, `npm run verify:paid-resume-wiring`, `npm run verify:sitemap-drift`: 통과.
- impeccable detector: CommerceDisclosure `[]`.
- 로컬 mock 개발서버에서 영문 가격 5,000/10,000/20,000 KRW, 등록상호 표시 확인. 360/390/430/1280px에서 문서 가로 넘침 없음. 실기기 테스트와 동일하지 않다.
- 아직 iPhone Safari/Android Chrome/카카오·네이버 인앱 실기기, 공식 PG sandbox 왕복, 승인 채널, 실운영 unlock은 검증하지 않았다. 임의 실카드 거래 없음.
- `worker/payments/index.js`는 전액취소 시 환불 정산·권한회수, 부분취소 시 수동검토 마커를 처리한다. 별도 dispute/chargeback 이벤트 처리 코드는 검색에서 확인되지 않았다. 취소 webhook을 차지백 대응 완료로 오인하지 말고 PG의 통지 방식·응답 기한을 확인한 뒤 분쟁 원장과 접근 정책을 구현해야 한다.
- 기존 공통 면책 배너가 URL과 다른 언어로 잠시 표시되는 문제, 글로벌 상단 정책 링크의 비로케일 경로, 전체 개별 유료 기능의 해외 언어 완성도는 추가 점검 필요. 신규 공개 안내의 번역과 별개다.
- 운영 `/points/` 현재 이용권 혜택 카드에 `월정석으로도 구매 가능`이 표시되어 원화 단건결제 전용 안내와 충돌한다. `app/points/PointsClient.tsx`의 benefits 문구이며 #1845가 같은 파일을 수정 중이다. #1845 통합 뒤 실제 원화 단건결제 정책과 일치하도록 정리한다. #1843은 공통 헤더/정책 UI를 수정 중이므로 해당 변경을 확인한 뒤 남은 언어 문제를 해결한다.
- PR #1844 CI 사전검사 개선의 머지와 스테이징 SHA 검증까지 다른 PR 머지/운영 반영 보류 지시가 다른 작업에서 전달됨. 해제 확인 없이 머지하지 않는다.
- #1844의 main `d397f13983b0a039e62f656f90d723507189015e`를 이 브랜치에 통합했다. 새 필수 `ci:preflight`의 공유 의존성 drift를 발견하여 이 작업의 node_modules만 독립 `npm ci`로 설치했다. 공용 설치본은 변경하지 않았다.
- 최종 preflight 상태: 첫 실행은 위 의존성 drift, 다음 실행은 이 문서 frontmatter 누락에서 중단됐다. 두 원인은 수정했으며 `verify:handoff-contract` 123문서 통과. 재실행 중 #1845 담당자가 staging 후 상점 문구 수정을 이 작업에서 이어받도록 요청하여 중복 검증을 피하려고 검사를 취소했다. **최종 preflight PASS나 PR 생성 완료가 아니다.** 최초 check:fast의 218/2,422 통과를 최신 main 전체 검증으로 대체하지 않는다.
- 현재 순차 열은 1845 → 1843 → 1846 → 1847 → 1848이다. 본 작업은 새 PR로 열에 끼어들지 않는다. #1845의 staging 이후 PointsClient를 통합·수정하고, PR 생성 전 최신 main 기반 preflight를 통과해야 한다. 운영 배포와 기기별 해외결제는 아직 미완료다.
- 후속 진행: #1845의 `8422192d9b7f15dd9bd4e2118d3bbdde3a7a85fb` 및 staging 성공 전달을 받아 main을 통합했다. PointsClient 혜택 카드는 기존 다국어 `notAutoBilling` 문구를 재사용하도록 수정했다. 결제 방식과 가격 로직은 변경하지 않았다.
- PG 회신으로 서류·수수료·업종승인 조건을 확정하고 필요한 본인정보만 그 화면에서 요청한다. 이미 신청한 이니시스 건을 이어가며 중복 신청하지 않는다.

재개 위치: `D:\Development\code-destiny-global-payments`, 브랜치 `codex/global-payment-readiness-20260909`. 이 문서와 최신 PR 상태, 위 제목의 PG 회신을 먼저 확인하고 심사 보완 및 승인 채널 sandbox 검증을 이어간다. 외부 승인 전 작업 전체를 완료로 표시하지 않는다.
