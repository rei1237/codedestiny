# 07. 개인정보 — 수집 항목·PG 전달·로그·처리방침 공백

현재 상태: 회원·결제 정보의 수집 항목과 PG 전달 항목을 코드로 확인했다. 결제 로그 마스킹은 있지만, 구 결제 경로 로그에 원문 IP·UA 가 기한 없이 남는다. 한국어 개인정보처리방침에는 국외 이전 조항과 보호책임자 명시가 없고, 번역본은 한국어 정본보다 오래됐다. 법적 판단은 하지 않는다. 완료 보고가 아니다.

- 측정일: 2026-09-17. 1단계는 개인정보 수집 항목·처리방침을 바꾸지 않았다.
- 관련 문서: [04 회원 인증](04-customer-authentication.md) · [05 이행·증빙](05-fulfillment-and-evidence.md) · [06 CS·사고 대응](06-customer-support-and-incident-response.md)

## 1. 회원 정보 (`User`)

| 항목 | 저장 방식 | 근거 |
|---|---|---|
| 이름·이메일·프로필 이미지 | 평문 | `worker/lib/models.js:39-41` |
| 휴대폰 번호 | 저장 시 AES-256-GCM 으로 암호화(`v1:` 형식). 스키마 정규식은 빈 값·평문 `01X`·`v1:` 암호문을 모두 허용한다. 출처(`signup`·`social`·`checkout`) 기록 | `worker/routes/auth.js:1787`, `worker/lib/models.js:45,54`, `worker/lib/pii-crypto.js:2` |
| 비밀번호 | 해시, 기본 조회에서 제외(`select:false`) | `worker/lib/models.js:55` |
| 출생 정보·성별 | `birthDate`·`birthTime`·`gender`(운세 입력). 운세 프로필 `destinyProfiles` | `worker/lib/models.js:56-58,116` |
| 동의 기록 | `legalConsents`(`termsVersion`·`privacyVersion`·`phoneVersion` 과 각 동의 시각), `guardianConsent` | `worker/lib/models.js:78,92` |
| 소셜 계정 | 공급자별 `id`·`connectedAt`(google·naver·kakao) | `worker/lib/models.js:102` |

- `User` 에 언어·국가·IP·UA 필드는 없다(`worker/lib/models.js:39-122` 필드 전수).
- `twoFA`(TOTP 비밀값 자리)는 스키마 선언만 있고 사용처가 없다(`worker`·`app`·`lib` 에서 `twoFA` 검색 시 `models.js:122` 1건).
- 카드번호·CVC·유효기간 필드는 없다([05](05-fulfillment-and-evidence.md) §5).

## 2. PG 로 넘기는 정보

결제창 구매자 정보는 `worker/payments/index.js:238-257` `buildLegacyPrepareCustomer` 가 만든다.

| 필드 | 값 | 근거 |
|---|---|---|
| 이름 | 계정 이름, 없으면 "Code Destiny 고객" | `:239` |
| 이메일 | 계정 이메일, 없으면 `buyer-<회원 ID 뒤 10자>@code-destiny.com` | `:246` |
| 휴대폰 | 복호화 후 `01X` 10~11자리일 때만, 아니면 빈 값 | `:248-252` |

- 주소·국가·IP·배송 정보는 넘기지 않는다(디지털 콘텐츠). 근거: 결제창 호출부 `lib/payment/portone.ts`·`app/points/PointsClient.tsx` 에서 `address`·`country`·`shipping`·`zipcode`·`delivery` 0건.
- 처리방침의 위탁 표기: 포트원·KG이니시스, 제공 항목 "이름, 휴대폰 번호, 이메일, 결제 정보"(`app/privacy-policy/PrivacyPolicyContent.jsx:112,115`).

## 3. 로그·보관

| 대상 | 동작 | 근거 |
|---|---|---|
| V2 결제 로그 | `phone`·`email`·`name`·`card`·`cardnumber`·`cvc`·`birth` 등 키를 지우고 주문번호는 뒤 8자만 | `worker/payments/log.js:21-26` |
| C7 운영자 알림 본문 | userId·이메일·전화·PG 원문 없음(테스트 고정) | `worker/payments/fulfillment-alert.js` |
| 🔴 구 결제 경로 실패 로그·웹훅 이벤트 | `requestMeta` 에 원문 IP(`cf-connecting-ip`)·UA 저장, **TTL 인덱스 없음** | `worker/routes/payments.js:554,609`, `worker/lib/http.js:100`, `worker/lib/models.js:551-552,559-560,579-580,586-587` |
| 환불 로그 | `console.info` 에 userId 원문 | `worker/lib/payment-refund.js:403-404` |
| 기한이 있는 것 | 리프레시 세션(만료 시), 결제창 퍼널 이벤트 90일, 보안 이벤트 90일 | `worker/lib/models.js:534,608,626` |

- 원문 IP·UA 무기한 보관과 환불 로그 userId 는 1단계 범위 밖 결함이다(보고만).

## 4. 개인정보처리방침 대조

한국어 정본 `app/privacy-policy/PrivacyPolicyContent.jsx`(시행일 `2026-08-25`, `:14`), 12개 절.

| 확인 항목 | 방침 | 코드 실측 | 상태 |
|---|---|---|---|
| 가입 수집 항목 | 이름·이메일·휴대폰·동의 기록(`:39`) | §1 과 일치 | READY |
| 카드번호 | "카드번호 전체와 같은 민감한 결제 원문을 직접 저장하지 않습니다"(`:42`) | 필드 없음 | READY |
| 결제 위탁 | 포트원·KG이니시스(`:112,115`) | 결제창 호출과 일치 | READY |
| 국외 이전 | 조항 없음(`국외 이전`·`국외이전`·`국외로 이전` 0건) | 아래 처리자 후보 참고 | NOT READY |
| 개인정보 보호책임자 | 명시 없음(`보호책임자`·`책임자` 0건). "12. 개인정보 문의" 절은 있음(`:203`) | — | NOT READY |
| 방침에 없는 처리자 후보 | — | 카카오페이 결제 채널(`worker/payments/index.js`·`compat.js`), Google Gemini LLM(`lib/llm-client.ts`, 운세 프롬프트에 출생 정보 `worker/lib/astrology-ai-prompt.js:120-128`), Cloudflare 워커·Workers AI 폴백(`worker/routes/fortune.js`), MongoDB 저장소(호스팅 위치 미확인), Resend 메일(`worker/lib/resend.js`), Google 애널리틱스 gtag(`lib/analytics.ts`) | NOT READY |

- 광고 쿠키(Google AdSense)는 "4. 쿠키, 광고 식별자, Google AdSense 고지" 절에 있다(`:61`).
- 위 후보가 위탁·제3자 제공·국외 이전 중 무엇에 해당하는지, 해외 고객에게 외국 개인정보 법이 적용되는지는 판단하지 않았다 → **LEGAL REVIEW REQUIRED**.
- 개인정보 유출 대응 내부 절차(누가 무엇을 먼저 하는지): 없음(2026-09-18 오너 확인) — 범위 밖 결함. 법적 신고 의무 등 법 해석은 위 LEGAL REVIEW REQUIRED 범위(별도). 근거: [06](06-customer-support-and-incident-response.md) §4.

## 5. 해외 고객에게 보이는 문서

| 문서 | 상태 | 근거 |
|---|---|---|
| 번역 개인정보처리방침(en·ja·zh·zh-TW) | 시행일 `2026-08-19` — 한국어 정본(`2026-08-25`)보다 오래됨. 영어는 "Your mobile number is a required field at sign-up" 로 적혀 있어, 가입 방식별로 휴대폰 수집 시점을 나눈 한국어 정본과 다르다 | `lib/legal/legalContent.ts:391,398,439,487,535`, `app/privacy-policy/PrivacyPolicyContent.jsx:39` |
| 구매 확인 메일 청약철회 안내 | 제목·전문 링크 줄은 한·영 병기, 본문 문장은 한국어 정본 그대로 | `worker/payments/receipt-email.js:161-166`, `lib/legal/refund-policy-rows.js` |
| 해외 번호 | 받지 않는다(국내 `01X` 만) | [04](04-customer-authentication.md) §4 |

## 6. 판정

| 항목 | 상태 |
|---|---|
| 수집 항목·PG 전달 항목 사실 정리 | READY |
| 휴대폰 암호화·카드정보 미저장 | READY |
| V2 결제 로그 마스킹 | READY |
| 구 경로 원문 IP·UA 보관기한 | NOT READY(범위 밖 결함) |
| 국외 이전 조항·보호책임자 명시·처리자 목록 | NOT READY(LEGAL REVIEW REQUIRED) |
| 번역 처리방침 최신화·영문 청약철회 본문 | NOT READY(LEGAL REVIEW REQUIRED 후 2단계) |

**최종 판정: LEGAL REVIEW REQUIRED** — 사실 목록은 준비됐다. 국외 이전·처리자 고지·보호책임자·번역본 정합은 법률 검토 후 처리방침을 고쳐야 한다. 이 문서는 법적 적합성을 판정하지 않는다.
