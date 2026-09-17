# 06. 해외 고객 CS·사고 대응

현재 상태: 고객 문의 채널은 이메일 하나이고, 영어 연락 페이지는 응답기한·언어 지원을 약속하지 않는다. 결제 사고 감지는 1단계 C7 운영자 알림이 생겼지만 채널 운영 설정·담당자·온콜은 정해지지 않았다. 2단계에서 결제 문의 진입점(로케일별 연락 페이지의 `#payment-help` 절 + 결제창 하단 링크)이 생겼다 — **채널이 늘어난 것이 아니라 같은 이메일로 가는 길이 생긴 것이고, 응답기한·언어 지원 보장은 여전히 없다**. 없는 CS 기능을 있다고 적지 않는다. 완료 보고가 아니다.

- 측정일: 2026-09-17. §1 은 2026-09-18 재측정(2단계 결제 문의 진입점).
- 관련 문서: [05 이행·증빙](05-fulfillment-and-evidence.md) · [07 개인정보](07-personal-data-inventory.md) · [09 신청 사실](09-inicis-application-facts.md)

## 1. 문의 채널 — 이메일 하나

주소 정본은 `lib/site-policy-config.js` `SUPPORT_EMAIL` 이다(값은 이 문서에 옮기지 않는다).

| 진입점 | 언어 | 내용 | 근거 |
|---|---|---|---|
| `/contact-us` | 한국어(영어 한 줄 병기) | 메일 링크. "평균 회신 시간: 영업일 기준 1~3일 / Typical response time: 1-3 business days". 결제·환불 문의 유형(중복 결제·결과 미제공·청약철회) 안내. 이 항목에 앵커 `#payment-help` | `app/contact-us/page.js:61,80-81` |
| `/en/contact`·`/ja/contact`·`/zh/contact` | 영어·일본어·중국어 | 같은 메일 주소. 구매 결과가 안 보일 때 보낼 정보 안내, 카드번호·보안코드를 보내지 말라는 안내. **"No new response-time or language-support guarantee is created by this page."** 2단계에서 결제 전용 절(앵커 `#payment-help`)을 3개 로케일에 추가 | `app/[locale]/contact/page.js`, `app/components/LocalizedTrustPage.jsx:33`(앵커 렌더), `lib/i18n/public-trust-copy.mjs:14,35`(ja), `:74,95`(en), `:134,155`(zh) |
| 결제창 하단 링크(`#payment-help`) | 화면 언어(ko·en·ja·zh-CN·zh-TW) | 결제창 정책 링크 줄의 넷째 항목이 위 연락 페이지의 결제 문의 절로 새 탭으로 간다. 🔴 번체(zh-TW)만 `/en/contact#payment-help` 로 보낸다 — `/zh-tw/contact` 라우트가 없다 | `js/core/checkout-entry.js:478`(`POLICY_LINKS_BY_LANG`), `:506`(빌더), 렌더러 3종 `index.html:21771`·`js/destiny-profile.js:12603`·`app/_lib/billing-client.ts:1256`, 가드 `scripts/verify-payment-choice-parity.mjs`(sitemap 대조) |
| `/feedback` | 로케일별 문구, 없으면 영어 | 로그인 필수. 결제 문제 카테고리(카드번호·CVC 입력 금지 경고). 접수 알림은 운영자 메일·Discord·Slack | `app/feedback/FeedbackClient.tsx:262` `LoginGate`, `app/feedback/_lib/categories.ts:85`, `app/feedback/_lib/copy.ts:294,2268-2269`, `worker/lib/feedback-notify.js` |

없는 것 — 신청서·화면에 적지 않는다
- 24시간 응대: 없음(`app/contact-us`·`app/[locale]/contact`·`lib/i18n/public-trust-copy.mjs`·`app/feedback` 에서 `24시간`·`24/7`·`24 hours` 검색 0건).
- 전화 상담: 안내된 전화 상담 채널·운영시간 없음(같은 범위 `전화 상담`·`고객센터 전화` 0건). 사업자 정보 표시용 전화번호 필드(`BUSINESS_IDENTITY.phone`)는 있지만 상담 채널로 안내돼 있지 않다.
- 영문 응답기한: 없음. 영어·일본어·중국어 페이지는 응답 시간을 적지 않고, 오히려 보장하지 않는다고 명시한다. 결제창 링크가 생겼다고 기한이 생긴 것이 아니다.
- 영문 환불 **전용** 창구: 없음. 2단계 `#payment-help` 는 전용 채널이 아니라 같은 이메일로 가는 안내 절이다(환불 요청 접수 폼·전용 주소 없음).
- 채팅·티켓 시스템: 없음(메일·제보 폼뿐).

## 2. 사고 감지·알림

| 사고 | 감지 | 알림 | 근거 |
|---|---|---|---|
| 결제됨·미지급 30분+ | 10분 크론(`*/10 * * * *`) | 운영자 채널(C7), 24시간 간격 최대 7회 | `worker/payments/reconcile.js` `alertPaymentAnomalies`, `worker/wrangler.toml:317` |
| PG 대조 실패(금액·통화·결제번호·상점) | 확정 시 422 + 주문 `failed`(`failureStage:"pg-verify"`) | 운영자 채널(C7), 주문당 1회 | `worker/payments/index.js:731`, `worker/payments/errors.js:95-102` |
| 웹훅 재처리 10회 실패 · 자동 환불 실패(`refund_failed`) | 재처리 중단 / 주문 표식만 | **없음** — 사람이 `/admin/orders` 에서 봐야 한다(범위 밖 결함) | `worker/payments/webhook.js:237` `claimReplayableEvents`, `worker/lib/payment-refund.js:497-500` |
| 차지백·분쟁 | 처리하는 이벤트 없음(`worker/payments` 에서 `chargeback`·`dispute` 0건) | 없음 | — |
| 일일 크론 실패 | 크론 | 텔레그램 — 대화방 미지정이라 공개 채널로 간다(범위 밖 결함) | `worker/lib/cron-failure-alert.js:56` |
| 런타임 오류 | 워커 로그뿐 | **Sentry 등 오류 수집 없음**(`package.json`·`worker`·`app`·`lib` 에서 단어 `sentry` 0건) | — |

- C7 채널(`ADMIN_FEEDBACK_EMAIL`·`FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL`)은 운영 설정 여부를 확인하지 않았다. 없으면 `[pay-alert] unconfigured` 로그만 남는다 → **OWNER INPUT REQUIRED**.

## 3. 대응 수단

| 수단 | 동작 | 근거 |
|---|---|---|
| 해외카드 끄기 | `FOREIGN_CARD_ENABLED` 가 문자열 `"1"` 이 아니면 전 주문 닫힘(기본 OFF). 상품 유형별로는 정책 표 한 줄 `false` | `worker/payments/foreign-card-policy.js:41` |
| 관리자 환불 | `/admin/orders` 에서 전액·부분 환불, 감사 로그 | `app/admin/orders/page.tsx`, `worker/routes/admin-orders.js:218,236,251-252` `refundPaymentAsOperator` |
| PG 콘솔 취소 | 전액취소 웹훅: 대기 주문은 취소, 결제된 주문은 환불 정산·권한 회수·검토 표식. 부분취소는 검토 표식만 | `worker/payments/index.js:130-134` |
| 주문 조회·수동 대조 | `/admin/orders` 목록·상세, 대조 태스크 수동 실행(`POST /reconcile`) | `worker/routes/admin-orders.js:124,153,272` |
| 사고 기록 선례 | 결제 P0 사고 문서 형식 | `docs/payments/payment-p0-incident-20260909.md` |

- 사용자 셀프 취소는 V2 `paid` 주문에 400 이고 7일 검사가 없다(범위 밖 결함, 보고만).

## 4. 담당자·온콜

| 항목 | 상태 |
|---|---|
| 결제 사고 1차 담당자 | **OWNER INPUT REQUIRED** — 레포 문서에 없음 |
| 온콜·대응 시간 | **OWNER INPUT REQUIRED** — `docs` 에 온콜 문서 없음(`on-call`·`온콜` 검색 결과 1단계 인수인계 문서뿐) |
| 개인정보 유출 대응 절차 | **OWNER INPUT REQUIRED** — 문서 없음. 법적 신고 기한 등은 [07](07-personal-data-inventory.md) LEGAL REVIEW |
| C7 알림 수신자·채널(D4) | **OWNER INPUT REQUIRED** — 운영 값 확인 필요 |

## 5. 판정

| 항목 | 상태 |
|---|---|
| 이메일 문의 채널(한·영·일·중 페이지) | READY |
| 영문 응답기한·언어 지원 약속 | NOT READY(약속 없음 — 없는 기능으로 표기) |
| 영문 결제 문의 진입점(연락 페이지 절 + 결제창 링크) | READY(2단계 §1) |
| 영문 환불 **전용** 창구(접수 폼·전용 주소) | NOT READY(없음 — 같은 이메일 1채널) |
| 미이행·PG 대조 실패 알림 코드 | READY(C7) |
| 알림 채널 운영 설정·담당자·온콜 | NOT READY(OWNER INPUT REQUIRED) |
| 웹훅 반복 실패·환불 실패·크론 실패 알림 채널 | NOT READY(범위 밖 결함) |
| 오류 수집(Sentry 등) | NOT READY(없음) |

**최종 판정: OWNER INPUT REQUIRED** — 담당자·온콜·알림 채널 운영 설정은 운영자가 정한다. 신청서에는 "이메일 문의, 응답기한 보장 없음(한국어 페이지 기준 영업일 1~3일 안내)"처럼 있는 것만 적는다.
