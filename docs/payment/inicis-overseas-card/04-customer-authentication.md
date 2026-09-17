# 04. 회원 인증 — 로그인 방식·비회원 차단·수집 정보

현재 상태: 비회원 결제 차단은 이미 구현돼 있었고 1단계 C2 가 회귀 테스트로 고정했다. 로그인은 이메일+비밀번호와 소셜 OAuth 뿐이며 **본인인증 절차는 없다**. 국내 휴대폰 번호가 없으면 카드 결제를 끝낼 수 없어 해외 고객 결제는 아직 막혀 있다. 완료 보고가 아니다.

- 측정일: 2026-09-17. 이 문서가 인용하는 인증 파일은 1단계에서 바뀌지 않아 `파일:줄` 이 계획 시점 값 그대로다.
- 관련 문서: [02 해외카드 구현](02-overseas-card-implementation.md) · [07 개인정보](07-personal-data-inventory.md) · [08 테스트 결과](08-test-results.md)

## 1. 가입·로그인 방식

| 방식 | 받는 정보 | 확인하는 것 | 근거 |
|---|---|---|---|
| 이메일+비밀번호 | 이메일, 비밀번호(해시 저장), 휴대폰 번호(**필수**), 출생연도(만 14세 판정), 약관·개인정보 동의 | 이메일 형식·비밀번호 규칙·국내 휴대폰 형식. **이메일 소유 확인 없음** | `worker/routes/auth.js:2569` `handleRegister`, `worker/lib/validation.js:217-231` |
| Google OAuth | scope `openid email profile` | 공급자가 준 계정 식별자·이메일·이름 | `worker/routes/auth.js:1622`, `worker/lib/social-profile.js` |
| Naver OAuth | scope `name email` | 같음 | `worker/routes/auth.js:1635` |
| Kakao OAuth | scope `profile_nickname account_email` | 같음 | `worker/routes/auth.js:1649` |

- 소셜 scope 에는 env(`SOCIAL_PHONE_SCOPE_PROVIDERS`·`SOCIAL_BIRTHYEAR_SCOPE_PROVIDERS`)로 전화번호·출생연도 요청을 덧붙일 수 있다(`phoneScopeSuffix`·`birthYearScopeSuffix`). 운영 설정값은 이 문서에서 확인하지 않았다.
- 소셜 이메일이 기존 이메일 계정과 같을 때만 공급자의 `email_verified` 를 확인하고 연결한다(`worker/routes/auth.js:1846`).
- 만 14세 판정은 가입자가 입력한 출생연도로 한다(자기 신고).

## 2. 본인인증 — 없음

- SMS·OTP·휴대폰 본인확인·아이핀 등 **본인인증 절차가 없다.**
  - 근거 1: `worker/lib/models.js:52` 주석 "이 서비스에는 SMS/OTP·본인확인 절차가 아예 없어서(2026-08-19 전수 검색)", `phoneVerified` 류 필드 금지.
  - 근거 2: 2026-09-17 `git grep -i` 로 `worker`·`app`·`lib` 에서 이메일 인증 흐름(`emailVerificationToken`·`verify-email`·`verifyEmail`·`이메일 인증`)과 본인확인 공급자(`danal`·`niceid`·`kcb`·`본인확인`·`sendSms`·`twilio`) 검색 → 해당 흐름 0건.
- `User.twoFA`(`worker/lib/models.js:122`)는 스키마 선언만 있고 사용처가 없다(2026-09-17 `git grep -n twoFA -- worker app lib` 결과 선언 1건). 2단계 인증·본인인증으로 적지 않는다.
- 🔴 OAuth 로그인은 **계정 식별 수단**이다. 법적 본인인증이 아니며, 신청서·화면 어디에도 "본인인증 완료"로 적지 않는다.

## 3. 비회원 결제 차단 (C2 로 고정)

| 강제 | 내용 | 근거 |
|---|---|---|
| 라우트 인증 | V2 결제 라우트 표의 `auth` 값은 `none`·`required` 둘뿐이다. `required` 전부(측정 시 14개, 테스트 하한 13)가 무 JWT → 401 `UNAUTHORIZED`, Mongo 0회 | `worker/payments/index.js` 라우트 표, `__tests__/worker/payments-v2.context.test.js` |
| 위조 토큰 | 다른 비밀키로 서명한 JWT → 401, Mongo 0회 | 같은 테스트 |
| 선물 | 수령·보낸/받은 목록·계정·상세·링크·환불요청 7개 경로 비로그인 401, Mongo 0회 | 같은 테스트 |
| 구 라우터 | `worker/routes/billing.js` `handleCheckout` 이 V2 위임 전에 인증을 먼저 검사한다(정적 단언) | `scripts/verify-worker-security-guards.mjs` |
| 무인증 경로 | 라우트 표는 `GET /features`·`GET /config`·`POST /webhook`(서명 검증) 3개뿐(테스트 고정). 선물 라우터는 수령 링크 미리보기 `/gifts/preview`·수령 준비 `/gifts/context` 만 공개이며 요청 제한이 걸려 있다. 어느 것도 주문·결제를 만들지 않는다 | `worker/payments/index.js` 라우트 표, `worker/payments/gift-routes.js:51` |

- 해외카드 판정도 `user.id` 가 없으면 `AUTH_REQUIRED` 로 닫힌다(2중).
- 세션: 액세스 JWT 기본 30분, 리프레시 14일(`worker/lib/auth.js` `getAccessTokenExpiresIn`·`getRefreshTokenExpiresIn`).
- 범위 밖 결함(보고만): JWT 검사가 탈퇴·비활성 계정 여부를 확인하지 않는다(`worker/lib/auth.js:646-667`).

## 4. 🔴 국내 휴대폰 필수 — 해외 고객 결제 차단 요인

| 경로 | 동작 | 근거 |
|---|---|---|
| 이메일 가입 | 휴대폰 필수. `normalizeKoreanPhoneNumber` 가 `82` 접두를 `0` 으로 바꾼 뒤 `01X` 10~11자리만 받는다 → 해외 번호는 `phone_required` | `worker/lib/pii-crypto.js:103`, `worker/routes/auth.js:2627` |
| 소셜 가입 후 첫 카드 결제 | 번호가 없으면 결제용 번호 모달(한국어)이 뜨고 `01X` 만 받는다. 거부하면 이용권을 포함한 카드 결제가 전부 막힌다 | `worker/routes/auth.js:3574` `handleSavePaymentPhoneNumber`, `app/_lib/payment-phone-prompt.ts` |
| 결제 요청 | 구매자 이름·이메일·번호를 PortOne 결제창 customer 로 넘긴다 | `worker/payments/index.js` `buildLegacyPrepareCustomer` |

→ **국내 번호가 없는 해외 고객은 지금 카드 결제를 끝낼 수 없다.** 해외 번호 허용은 PG 구매자 전화 필드 요건 확인이 필요한 별도 RED 변경이라 1단계 범위 밖이다(플래그 ON 선결 조건 5, [02](02-overseas-card-implementation.md)).

## 5. 판정

| 항목 | 상태 |
|---|---|
| 비회원 주문·확정 차단 | READY(C2 테스트) |
| 로그인 방식 사실 정리 | READY |
| 본인인증 | NOT READY(없음 — 없는 기능으로 표기) |
| 해외 번호로 카드 결제 | NOT READY(국내 휴대폰 필수, PG 필드 요건 확인 필요) |
| 탈퇴·비활성 계정 JWT 차단 | NOT READY(범위 밖 결함) |

**최종 판정: PG APPROVAL REQUIRED** — 비회원 차단은 준비됐다. 해외 고객이 실제로 결제하려면 PG 의 구매자 전화 필드 요건 확인 후 국내 휴대폰 필수를 풀어야 한다.
