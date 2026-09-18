# 09. KG이니시스 해외카드 신청 사실 — 13문항 답·사업자 정보·예상 거래금액

현재 상태: 해외카드 신청서 13문항에 코드와 레포 기록으로 확인한 사실만 답했다. 특약은 2026-08-20 에 신청했고, 레포 최신 기록(2026-09-09) 기준 처리중이며 승인은 확인되지 않았다. `FOREIGN_CARD_ENABLED` 가 꺼져 있어 어느 주문에도 해외카드 결제창 파라미터를 싣지 않는다. 사업자 정보·MID 일치, 예상 해외 거래금액, 사고 담당자는 레포로 알 수 없어 **OWNER INPUT REQUIRED** 로 남겼다. 완료 보고가 아니다.

- 측정일: 2026-09-17. 8번 문항(해외 고객 CS)은 2026-09-18 2단계 반영 후 재측정. 이 문서는 신청서를 쓸 때의 근거다. 승인 사실이 아니므로 화면·마케팅에 "해외카드 지원"으로 옮기지 않는다.
- 시크릿·MID·사업자등록번호 **값**은 적지 않는다(위치만).
- 관련 문서: [01 결제 구조](01-current-payment-architecture.md) · [02 해외카드 구현](02-overseas-card-implementation.md) · [03 상품 범위](03-overseas-card-product-scope.md) · [04 회원 인증](04-customer-authentication.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [06 CS·사고 대응](06-customer-support-and-incident-response.md) · [07 개인정보](07-personal-data-inventory.md) · [08 테스트 결과](08-test-results.md)

## 1. 신청 상태

| 항목 | 상태 | 근거 |
|---|---|---|
| 신청 | 기존 KG이니시스 가맹점에 해외카드 서비스 추가 신청(2026-08-20). 가맹점관리자 서비스 신청현황 "처리중", 해외카드 행 반려 사유 표시 없음 | `docs/handoff/global-payment-readiness-20260909.md:19` |
| 판매 구조 설명 | 한국 사업자 + PortOne V2 / KG이니시스, KRW 단건결제. PG 담당자에게 "운세 콘텐츠 단건결제 구조"로 문의했다. 이용권도 자동갱신 없는 1회 구매다 | 같은 문서 `:15-20` |
| 승인 | 확인되지 않았다 | **PG APPROVAL REQUIRED** |
| PortOne 안내(외부) | 승인·정산 KRW, VISA·MASTER·JCB·DINERS, 결제창 언어 ko·en·zh, 결제창 방식만, 3D 인증. PC·모바일 차이와 발급국 판별 필드는 안내에 없다 | `help.portone.io/content/inicis-international`(2026-09-17 조회). 승인 범위의 정본은 PG 회신이다 |

## 2. 13문항 답

신청서에는 "답" 열만 옮긴다. READY 가 아닌 문항은 없는 것을 없다고 적는다.

| # | 문항 | 답 | 상태 | 근거 |
|---|---|---|---|---|
| 1 | 판매 상품 | 디지털 콘텐츠만 판다. 운세·상담 결과 단건 171개(1회 이용 124개 + 계정 귀속 영구 열람 47개), 달빛 이용권 4등급(30일, 자동갱신 없음), 이용권 선물(수령 링크로 전달, 결제자와 이용자가 다를 수 있는 선불 상품). 실물 없음. 선물의 운영 활성 여부는 OWNER INPUT REQUIRED | READY | [03](03-overseas-card-product-scope.md) §1 |
| 2 | 판매 객단가 | 원화(KRW). 단건 171개 최저 ₩1,000 · 중앙값 ₩5,000 · 최고 ₩30,000 · 단순 평균 ₩9,392. 이용권 ₩9,900 · ₩29,900 · ₩59,000 · ₩149,000(선물 같은 가격). 전체 175개 최고 ₩149,000 · 단순 평균 ₩10,593. 판매 가중 평균은 운영 주문을 열람하지 않아 산출하지 않았다 | READY | [03](03-overseas-card-product-scope.md) §3 |
| 3 | 서비스 제공기간 | 단건: 결제 확인 후 즉시 지급·생성, 로그인 후 같은 계정에서 다시 열람. 이용권: 결제 확인 후 30일(재구매 시 연장). 선물: 결제 후 1년 안에 수령, 수령 후 이용권 30일 | READY | [03](03-overseas-card-product-scope.md) §4 |
| 4 | 결제 URL | `https://code-destiny.com`(운영). 스테이징 주소는 적지 않는다 | READY | §3 |
| 5 | 내·외국인 해외카드 구분 | 국적·IP·언어로 가르지 않는다. 서버가 주문마다 기능 플래그·로그인·상품 유형·결제수단으로 해외카드 결제창을 보여도 되는지 정하고, 판정이 없으면 파라미터를 싣지 않는다. 카드 발급국은 결제 전에 알 수 없다. 지금은 플래그가 꺼져 있어 전 주문 비노출 | READY | [02](02-overseas-card-implementation.md) §1·§2 |
| 6 | 비회원 주문 차단 | 모든 주문 생성·결제 확정에 로그인이 필요하다. 비회원 주문 경로가 없다(로그인 없는 요청·위조 토큰은 401, 테스트 고정) | READY | [04](04-customer-authentication.md) §3 |
| 7 | 회원 가입 인증 방식 | 이메일+비밀번호(이메일 소유 확인 없음, 국내 휴대폰 번호 필수) 또는 Google·Naver·Kakao 계정 로그인. **본인인증(휴대폰 본인확인·SMS 등) 절차는 없다** | READY | [04](04-customer-authentication.md) §1·§2 |
| 8 | 해외 고객 CS | 이메일 문의 1채널. 영어·일본어·중국어 연락 페이지에 결제 문의 절(앵커 `#payment-help`)이 있고, 결제창 하단 링크가 화면 언어별로 그 절로 간다(번체는 영어 페이지로). 응답기한·언어 지원은 보장하지 않으며 24시간·전화·채팅 상담은 없다 | READY | [06](06-customer-support-and-incident-response.md) §1 |
| 9 | 사고 대응 담당자 | 결제됨·미지급 30분 이상과 PG 대조 실패를 10분 주기 작업이 운영자 채널(관리자 메일·Discord·Slack 웹훅)로 알린다. 채널의 운영 설정 여부는 확인하지 않았고, 담당자·온콜 기록은 레포에 없다 | NOT READY(OWNER INPUT REQUIRED) | [05](05-fulfillment-and-evidence.md) §2, [06](06-customer-support-and-incident-response.md) §4 |
| 10 | 실물 해외배송 | 없음(디지털 콘텐츠) | READY | [03](03-overseas-card-product-scope.md) §2 |
| 11 | 배송추적 | 해당 없음 | READY | [03](03-overseas-card-product-scope.md) §2 |
| 12 | 개인정보 수집 범위 | 회원: 이름·이메일·휴대폰(암호화 저장)·출생 정보·성별·동의 기록·소셜 계정 식별자. PG 전달: 이름·이메일·국내 휴대폰 번호만(주소·국가 없음). 카드번호·CVC 는 저장하지 않는다. 1단계에서 수집 항목을 늘리지 않았다 | NOT READY(LEGAL REVIEW REQUIRED — 처리방침 국외 이전·보호책임자·처리자 목록) | [07](07-personal-data-inventory.md) |
| 13 | 해외카드 예상 거래금액 | **UNKNOWN — OWNER INPUT REQUIRED** | NOT READY(OWNER INPUT REQUIRED) | §5 |

## 3. 결제 URL — 운영만 적는다

| 구분 | 주소 | 신청서 | 근거 |
|---|---|---|---|
| 운영 사이트 | `https://code-destiny.com` | 적는다 | `worker/wrangler.toml:150` `SITE_BASE_URL` |
| 결제창을 여는 화면 | 홈 정적 셸과 정적 서비스 페이지, App Router 유료 콘텐츠 페이지, 이용권·선물 상점 `/points` | 운영 주소 아래 경로만 | 결제창 호출 `index.html:23530`, `js/destiny-profile.js:5706`, `app/points/PointsClient.tsx:4568` |
| 🔴 스테이징 | `https://staging.code-destiny.com` | **적지 않는다** — 청구액을 `PAYMENT_TEST_AMOUNT_KRW` 로 바꿔 실제 가격과 다르다 | `worker/wrangler.staging.toml:180`, `worker/lib/portone.js:62-63` |

## 4. 사업자·가맹점 정보 — 값은 옮기지 않는다

| 항목 | 레포 위치 | 상태 |
|---|---|---|
| 상호·대표자·사업자등록번호·통신판매업 신고번호·전화·이메일·주소 | `lib/site-policy-config.js:40` `BUSINESS_IDENTITY`(키 `companyName`·`representative`·`registrationNumber`·`mailOrderNumber`·`phone`·`email`·`address`). 사이트 푸터 공개값의 정본 | 신청서 값과 같은지 **OWNER INPUT REQUIRED** |
| MID | 소스·`worker/wrangler.toml`·`worker/wrangler.staging.toml` 에 값이 없다. 워커 시크릿 env `MID` 로만 읽는다(`worker/lib/portone.js:14,116`) | 신청 대상 MID 확인 **OWNER INPUT REQUIRED** |
| PortOne 상점·채널 | 시크릿 env `PORTONE_STORE_ID`·`PORTONE_CHANNEL_KEY` 로 읽는다(이름만 확인, 값 미출력) | 확인하지 않음 |
| 통화 | KRW 고정. 확정 때 PortOne 재조회 통화가 KRW 가 아니면 422 `CURRENCY_MISMATCH` + 주문 실패 | READY — `worker/payments/pg.js:132`, `worker/payments/errors.js:99` |

## 5. 예상 해외 거래금액 — UNKNOWN — OWNER INPUT REQUIRED

추정할 근거 데이터가 레포와 코드에 없다. 숫자를 만들지 않는다.

| 확인한 곳 | 결과 | 근거 |
|---|---|---|
| 주문(`Payment`) | 국가·로케일·언어·IP 필드 없음 | `worker/lib/models.js:296-381` |
| 회원(`User`) | 국가·로케일·시간대 필드 없음 | `worker/lib/models.js:38-122` |
| 결제창 퍼널 이벤트 | 국가·로케일 필드 없음 | `worker/lib/models.js:593-609` |
| 해외카드 판정 스냅숏(C4) | "해외카드 결제창을 보여도 되는가"만 남긴다. 플래그가 꺼져 있어 지금은 전부 닫힘 | `worker/payments/foreign-card-policy.js:69` `toForeignCardSnapshot` |
| 결제 후 판별 | PortOne V2 카드 정보에 해외 발급 전용 필드가 없어, 승인 뒤에도 해외 발급 카드 거래만 골라 집계할 수 없다 | [02](02-overseas-card-implementation.md) §5 |

- 운영자가 정할 것: 신청서에 적을 예상 거래금액과 그 산정 근거. 이 문서에는 운영자가 준 값만 적는다.

## 6. 신청서·화면에서 하지 않는 것

| 하지 않는다 | 이유 |
|---|---|
| "해외카드 결제 지원"·카드 브랜드명 나열 | 승인 전이다. 비한국어 결제창 고지는 "해외 발급 카드 결제는 준비 중이며 아직 보장되지 않는다"만 말하고, 브랜드명이 다시 들어가면 가드가 실패한다(C1) |
| "본인인증 완료"·"실명 확인" | 본인인증 절차가 없다. OAuth 로그인은 계정 식별 수단이다 |
| "24시간 고객센터"·"전화 상담"·"다국어 응대 보장" | 없다 |
| 배송·배송추적 기재 | 실물이 없다 |
| 예상 해외 거래금액 숫자 기재 | 근거 데이터가 없다(§5) |
| 스테이징 URL 기재 | 청구액이 실제 가격과 다르다(§3) |
| 선물을 빼고 적기 | 양도 가능한 선불 상품이다. PG 위험 요인으로 숨기지 않고 적는다 |

## 7. 해외카드를 켜기 전에

- 운영에서 `FOREIGN_CARD_ENABLED` 를 켜는 일과 운영 승격은 1단계 범위가 아니다.
- 켜기 전 조건 10개는 [02](02-overseas-card-implementation.md) §7 체크리스트가 정본이다. 첫 조건이 이 신청의 승인 확인이다.
- 2단계(UI): ~~결제창 약관·환불·개인정보 링크~~·~~영문 결제 문의 진입점~~·~~서버측 환불 동의 기록(이용권 레일)~~ 2026-09-18 완료([핸드오프](../../handoff/inicis-overseas-card-phase2-20260918.md)). 남은 것 — 영문 결제 정보(이용권 모달·영냥이·선물 안내의 한국어 하드코딩. 🔴 7개 로케일 `payment.directModal` 영어화는 이미 돼 있었다 — 실측으로 확인), 단건 결제창의 환불 동의 체크박스와 그 서버 기록.
- 3단계(법무): 처리방침 국외 이전·보호책임자·처리자 누락, 번역 법무 문서 시행일, 영문 환불정책, 이 문서 갱신 — LEGAL REVIEW REQUIRED. 질의서: [10 법률 검토 질의서](10-legal-review-questions.md)(2026-09-18 작성, 검토 대기).

## 8. 판정

| 항목 | 상태 |
|---|---|
| 코드로 답한 문항(1·2·3·4·5·6·7·10·11) | READY |
| 8 해외 고객 CS | READY(이메일 1채널 — 응답기한·언어 지원 보장 없음을 그대로 적는다) |
| 9 사고 대응 담당자·알림 채널 운영 설정 | NOT READY(OWNER INPUT REQUIRED) |
| 12 개인정보 처리방침 | NOT READY(LEGAL REVIEW REQUIRED) |
| 13 예상 해외 거래금액 | NOT READY(OWNER INPUT REQUIRED) |
| 사업자 정보·MID 일치 | NOT READY(OWNER INPUT REQUIRED) |
| 해외카드 특약 승인 | NOT READY(PG APPROVAL REQUIRED) |

**최종 판정: OWNER INPUT REQUIRED** — 코드로 답할 수 있는 문항은 준비됐다. 예상 해외 거래금액·사업자 정보와 MID 일치·사고 담당자는 운영자가 채운다. 해외카드 결제를 여는 것은 그 뒤 PG 승인과 [02](02-overseas-card-implementation.md) §7 체크리스트가 끝난 다음이다.
