# 해외 결제와 국가별 현지화 — 2026-10-06

## 요청 및 계획

PayPal 해외 결제 가능 여부를 근거로 확인하고 영어·일본어·중국어의 용어, 결제 안내, SEO와 국가별 기본 언어를 개선한다. 지원하지 않는 국가 언어는 영어로 표시한다.

1. 운영 공개 결제 설정과 Pages/API 버전을 읽기 전용으로 확인한다.
2. Cloudflare의 신뢰 가능한 `request.cf.country`로 방문 국가의 기본 언어를 정한다. URL과 사용자가 직접 선택한 언어는 유지한다. 브라우저 언어는 국가 판단을 덮어쓰지 않는다.
3. 번역된 진입 URL로 임시 이동하고, 다른 HTML 화면에는 국가 언어를 전달해 기존 번역 런타임을 사용한다. 정적 자산·API·결제 콜백을 언어 경로로 이동시키지 않는다.
4. 영어·일본어·중국어 고객지원에서 PayPal USD와 국내 KRW 결제를 구분하고, 기존 번역 사전과 생성 파이프라인을 유지한다.
5. 국가·저장 언어·URL 충돌, 검색봇, 캐시 분리, 결제 mock 및 번역/SEO 회귀를 검증한다. 변경별 검사 후 커밋·main push·CI를 확인한다.

## 운영 확인

- `/api/payments/config`: HTTP 200, configured=true, paypalChannelKey 존재. 값 자체는 기록하지 않는다. 현재 코드에서 이 필드는 PAYPAL_ENABLED=1 및 상점·API·웹훅 설정이 있을 때만 제공된다.
- `/version.json`와 `/api/version`: 둘 다 `e55f521b1cae8bfe3e34f071e73126f17b6d3dde`.
- 따라서 PayPal USD 결제를 제공하는 운영 설정은 활성 상태다. 실제 해외 구매자의 결제 승인·정산 성공은 이번 읽기 전용 확인으로 입증하지 않았다.
- 실결제·환불·유료 LLM·운영 DB 쓰기·운영 승격은 개발 검증 범위에 포함하지 않는다.

## 유지 경계

가격·이용권·월정석·단건 정책, 주문 금액/환율 고정, 서버 승인 검증, 인증·DB 스키마를 유지한다. IP는 저장하지 않으며 국가로 구매자의 계정 국가를 추정하지 않는다. 해외 접속의 신규 유료 구매는 PayPal만 허용하며 일반 이용권·영냥이 전용 이용권 구매도 포함한다. 보유 이용권·월정석의 사용과 과거 주문 확인은 유지한다. 문제 시 이번 작업 커밋만 revert한다.

## 공식 근거

- [PortOne PayPal V2](https://developers.portone.io/opi/ko/integration/pg/v2/paypal-v2?v=v2): PAYPAL_SPB/loadPaymentUI와 서버 확인 흐름.
- [Cloudflare Request](https://developers.cloudflare.com/workers/runtime-apis/request/): 엣지에서 제공하는 country 값.
- [Google 다국어 사이트](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites): 언어별 URL과 hreflang을 유지하고 자동 언어 분기로 검색 접근을 차단하지 않는다.
- [PayPal SDK 지역 설정](https://developer.paypal.com/sdk/js/v5/configuration): PayPal 자체 버튼/창은 구매자 지역과 브라우저 설정을 자동 감지한다. PortOne에 문서화되지 않은 locale bypass를 임의로 추가하지 않는다.

## 검증 결과

- 운영 공개 설정만 읽기 전용 확인. 실제 해외 회선·결제 승인·정산은 미검증.
- 국가 분기/API/언어 우선순위 8건, 이용권 구매·복구 35건, SEO/현지화 회귀 포함 targeted 53건 통과.
- PayPal Jest 2 suites / 13 tests 통과. 전체 Jest 344 suites / 5,168 tests 통과.
- check:fast 초기 실행은 전체 Node 2,859건 중 2건과 캐시 핀·가격 번역 검사에서 실패. 문장 검사 대소문자, 사이트맵 서명, 캐시 핀, data-cd-vars 금액 비교를 보완했고 해당 검사를 재실행해 통과했다. 초기 check:fast 자체는 통과로 기록하지 않는다.
- 결제 UI parity 및 self-test 통과, 번역 가격 비교 112개 키×12언어/69개 마크업 통과. payment-freeze 통과.
- 로컬 Chromium: 영어·일본어·중국어 간체·번체 ×390/1440px. 외부 요청 차단/API mock. 홈 주요 CTA 겹침 없음. 후기·기사 인용은 한국어 원문 보존, 주변 안내 번역. 번역 보완 뒤 8개 화면에서 신규 안내 61개, 이용권 한도·가격의 한국어 잔존/미치환 변수/가로 넘침 없음까지 검사했다. 최신 main의 네오 소개를 통합했고 기사·후기의 한국어 원문은 남긴다.
- 검색 엔진의 canonical/hreflang 접근 유지, 새로 만든 번역 URL 없음. 국가별 임시 이동 대상은 기존 사이트맵에 존재함을 검사.
- 사용자 직접 언어 선택과 언어 URL을 우선한다. 국가 감지가 안 되면 기본 언어는 영어이며, 결제 국가 제한은 신뢰 가능한 Cloudflare 국가 정보로만 적용한다.
- TypeScript 검사 통과. 셸 사전·생선 가격 11개 회귀검사 통과.
- 변경된 소스와 생성물을 함께 커밋하며 main CI가 최종 게이트다. 운영 승격은 하지 않았다.
