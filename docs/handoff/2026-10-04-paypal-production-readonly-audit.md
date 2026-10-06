---
status: done
date: 2026-10-04
updated: 2026-10-06
---

# PayPal 운영 읽기 전용 점검

## 2026-10-04 관찰 결과

- 당시 main: `e59bfe07157031b995d5bec300a320ab30a357cc`. PayPal 구현 `65e7e8dfc28794931455e1887305db9c2ded4382`는 150커밋 전 조상이다.
- 당시 운영 Pages `/version.json`과 Worker `/api/version`: 모두 `2710b06f2a4fbe12fa0ac06954ae3a6e7796c097`으로 일치했다. 현재 운영 상태를 보장하는 수치는 아니다.
- [운영 릴리스 37179916083](https://github.com/rei1237/codedestiny/actions/runs/37179916083)의 배포 및 SHA 검증 성공을 확인했다. 해당 릴리스 SHA `f347cd0b377c38718abcd77d62f39f8f47e6b18c`와 당시 현재 운영 SHA를 구분한다.
- 공개 홈·상품 상세에는 PayPal 결제 버튼이 없었다. 비로그인 이용권 확인 창에서는 준비중·비활성 상태였다. 로그인한 전체 상품/이용권 화면은 미확인이다.
- 실제 배포된 checkout-entry.js를 모의 SDK로 실행하여 USD 733센트의 표시 7.33, PAYPAL_SPB, USD 센트 전달, STC sender_account_id/sender_email을 확인했다. 실제 서버 환율 대조나 승인 결제 테스트는 아니다.
- 서버는 저장된 KRW→USD 견적을 재사용하고 금액·통화·원금·환율 날짜를 검증한다. confirm/webhook 공통 경로는 주문 ID·정확한 PayPal 채널·store ID·USD·금액을 확인한다. 국내 채널/통화 폴백은 없다.
- 운영 config는 서버 검증 활성화와 PayPal 채널 존재를 확인시켰다. 실제 키는 기록하지 않는다.
- 실제 승인·환불·은행 연결·운영 주문 생성·운영 배포는 실행하지 않았다. 서버 견적 prepare가 운영 주문을 기록하므로 읽기 전용 범위에서 호출하지 않았다.

## CSP 문제 및 수정

- 운영 /ggulggul/ 및 /points/ HTTP 응답에 CSP가 없었다. 두 shipping _headers 파일의 CSP 각 줄은 2,364자로 [Pages의 2,000자 제한](https://developers.cloudflare.com/pages/configuration/headers/)을 초과했다. 길이 초과는 누락의 유력 원인이며 배포 후 실제 응답으로 복구를 확인해야 한다.
- 중복 script-src-elem/style-src-elem을 제거하고 [CSP 표준](https://www.w3.org/TR/CSP3/)의 부모 지시문 상속을 사용해 각 줄을 1,822자로 줄였다. default-src self, object-src none 및 모든 기존 허용 출처를 유지한다. public 미러는 sync:public으로 생성한다.
- 회귀 검사는 두 파일의 길이 제한과 유효한 PayPal script/connect/frame/style 출처를 확인한다. 수정 전 실패, 수정 후 통과를 확인했다.

## 검증 기록과 전달

- 10월 4일: 관련 Jest 5개 suite / 77개 test, payment-choice-parity, checkout-pass-card, payment-freeze, PortOne single-payment regression, lint 및 6GB 힙 typecheck 통과.
- 당시 전체 check:fast는 기본 힙 OOM 후 6GB 힙으로 재실행했다. Jest 333개 suite / 4,984개 test는 통과했으나 Node test 2,419개 중 외부 통신 차단 검사 1개가 실패했다. 수정 전 main에서도 재현했다. NODE_USE_ENV_PROXY=0과 기존 mock-network-guard를 함께 사용하면 해당 파일 4개 테스트가 통과했다. 전체 check:fast 성공으로 기록하지 않는다.
- 당시 로컬 커밋 d8ca181 / 20a9701은 원격 승인 게이트로 미전달됐고 이후 작업 공간 유지보수로 제거됐다. 10월 6일 사용자가 main 반영 및 CI 확인을 명시적으로 승인했다.
- 승인된 동일 코드 3개 파일과 이 점검 문서를 최신 main에 복원했다. 10월 6일 재검증: 관련 Jest 5개 suite / 77개 test, payment-choice-parity, checkout-pass-card, payment-freeze, 문서 신선도 및 git diff --check 통과. check:fast 계획은 critical이며 빌드는 CI에 위임한다. 이전 전체 검증을 반복하지 않고 정확한 반영 SHA의 공식 CI 결과를 확인한다.
- 운영 승격·실제 결제 승인은 포함되지 않는다. 이 문서는 결제 준비 완료 또는 실제 결제 성공을 선언하지 않는다.
