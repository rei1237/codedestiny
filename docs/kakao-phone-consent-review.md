# 카카오 개인정보 동의항목(전화번호) 심사 대응 상태

> 최종 갱신 2026-08-25 · 대상: 카카오 로그인 `phone_number` 동의항목 신청
> 🔴 이 문서는 **코드 상태**만 기술한다. 카카오 검수 승인 여부는 카카오 개발자 콘솔에서만
> 확인할 수 있고 코드로 보장되지 않는다.

## 1. 심사 요건 대비 현황

카카오는 전화번호 동의항목을 신청할 때 "자체 회원가입 프로세스에서도 전화번호를 수집하는가"를
본다. 2026-08-19 이전에는 **수집하지 않았고**(2026-08-15 정책: 번호는 첫 카드결제 때만 1회 수집)
그 불일치가 신청의 걸림돌이었다. 지금은 다음과 같다.

| 항목 | 상태 | 근거 |
|---|---|---|
| 자체 회원가입에서 전화번호 필수 수집 | **YES** | 화면 [app/components/auth/AuthShell.tsx:463](../app/components/auth/AuthShell.tsx#L463) · 서버 [worker/lib/validation.js:165](../worker/lib/validation.js#L165) |
| 서버가 프론트 우회를 막는가 | **YES** | [worker/routes/auth.js:2519](../worker/routes/auth.js#L2519) (`handleRegister` 는 검증된 값만 쓴다) |
| 소셜 가입도 번호 없이 끝나지 않는가 | **YES** | [worker/routes/auth.js:4670](../worker/routes/auth.js#L4670) — 티켓·본문 둘 다 없으면 400 `phone_required` |
| 개인정보처리방침의 수집 항목·목적이 실제와 같은가 | **YES** | [app/privacy-policy/PrivacyPolicyContent.jsx](../app/privacy-policy/PrivacyPolicyContent.jsx) 2·6·7항, 시행일 `PRIVACY_POLICY_EFFECTIVE_DATE` |
| 동의 기록을 남기는가(개인정보 보호법 제22조) | **YES** | `legalConsents.phoneVersion` / `phoneAcceptedAt` 를 계정 생성과 같은 쓰기에 담는다 |
| 카카오 API 가 전화번호를 반환하는가 | **스테이징에서 실측 대기** | 2026-08-25 스테이징만 scope ON(아래 2·3절) |
| 카카오 검수 상태 | **선택 동의로 승인**(사용자 확인 2026-08-25) | 콘솔에서만 확인 가능 — 코드로는 보장되지 않는다 |

## 2. 지금 코드가 하는 일

- **스테이징만 켜져 있다(2026-08-25 카나리).**
  - 스테이징 [worker/wrangler.staging.toml:170](../worker/wrangler.staging.toml#L170) `SOCIAL_PHONE_SCOPE_PROVIDERS = "kakao"`
  - 프로덕션 [worker/wrangler.toml:146](../worker/wrangler.toml#L146) `SOCIAL_PHONE_SCOPE_PROVIDERS = ""` (아직 꺼짐)
  - 값이 비면 카카오 인가 요청 scope 는 `profile_nickname account_email` 이고, `"kakao"` 면 뒤에
    ` phone_number` 가 붙는다 ([worker/routes/auth.js:1498](../worker/routes/auth.js#L1498)).
  - 🔴 이 불일치는 `scripts/verify-worker-config-parity.mjs` 의 `MUST_DIFFER_KEYS` 에 **한시 선언**돼 있다.
    그 목록은 "선언했는데 값이 같으면" 도 실패시키므로, 프로덕션을 켜는 PR 은 그 줄을 함께 지워야 한다
    — 카나리를 걷어내는 것을 잊어도 가드가 알려 준다.
- 스위치 구현은 [worker/routes/auth.js:1451](../worker/routes/auth.js#L1451) `phoneScopeSuffix` 하나이며,
  공급자별로 따로 켤 수 있다(카카오 `phone_number` / 네이버 `mobile`). **네이버는 계속 꺼져 있다**
  — `mobile` 은 별도 제공 항목 검수 대상이고 승인 여부가 확인되지 않았다.
- 응답 파싱은 이미 있다 — `kakao_account.phone_number` 를 `mapSocialProfile` 이 읽어
  `+82 10-…` 를 `010…` 으로 정규화한다.
- 공급자가 준 번호는 **사용자가 폼에 적은 값보다 우선**한다. 우리 서버가 카카오 API 를 직접
  호출해 받은 값이라 클라이언트를 거치지 않기 때문이다.

## 3. 남은 절차 (코드 변경 없음 — env 한 줄씩)

승인 여부를 코드가 알 수 없고, 틀렸을 때의 대가가 **카카오 로그인 전면 중단**이라 한 번에 켜지
않는다. 스테이징에서 먼저 확인하고 프로덕션으로 승격한다.

1. ~~카카오 개발자 콘솔에서 `phone_number` 동의항목을 신청·승인받는다.~~ (완료 — 선택 동의)
2. ~~스테이징을 켠다: `worker/wrangler.staging.toml` `SOCIAL_PHONE_SCOPE_PROVIDERS = "kakao"`.~~ (2026-08-25)
3. **스테이징 실측** — `staging.code-destiny.com` 에서 카카오 로그인을 돌려 셋을 확인한다.
   - 동의 화면에 "전화번호" 항목이 뜬다
   - **동의**하면 로그인 성공 + `GET /api/me/payment-phone` 이 번호를 돌려준다
   - **거부**해도 로그인은 그대로 성공한다(선택 동의이므로 이쪽이 정상 경로다)
4. 3이 통과하면 프로덕션을 켠다 — [worker/wrangler.toml](../worker/wrangler.toml) 의 `[vars]` 한 줄:

   ```toml
   SOCIAL_PHONE_SCOPE_PROVIDERS = "kakao"
   ```

   같은 PR 에서 `scripts/verify-worker-config-parity.mjs` 의 `vars.SOCIAL_PHONE_SCOPE_PROVIDERS`
   한시 선언을 지운다(안 지우면 가드가 실패한다).
5. 되돌리기는 어느 단계든 그 한 줄을 `""` 로 바꾸는 것이다.

🔴 3번이 통과해도 **이미 로그인한 사용자**의 번호는 채워지지 않는다. 선택 동의는 한 번 거부하면
다음 로그인의 동의 화면에 다시 뜨지 않기 때문이다 — 그 사용자들에게 다시 묻는 경로(카카오
"추가 항목 동의 받기")는 별도 작업이다.

### 🔴 승인 전에 켜지 말 것

카카오는 앱에 등록·승인되지 않은 scope 를 요청하면 authorize 단계에서 **KOE205 로 거절**한다.
즉 미승인 상태에서 이 값을 켜면 **카카오 로그인이 전면 중단**된다. 이 성질은
[__tests__/worker/auth.social-phone-scope.test.js](../__tests__/worker/auth.social-phone-scope.test.js) 가
기본값(=꺼짐)과 함께 고정하고 있다.

## 4. 카카오가 번호를 주지 않아도 가입은 된다

동의항목이 승인되지 않았거나 사용자가 그 항목만 거부한 경우, 로그인은 그대로 성공하고
가입 마무리 화면에서 번호를 직접 입력받는다. 즉 이 심사의 결과와 무관하게 **모든 회원은
전화번호를 갖는다** — 승인은 사용자 입력 단계를 없애 주는 편의일 뿐이다.

## 5. 남은 한계 (솔직히 적어 둘 것)

- 이 서비스에는 **SMS/OTP 소유 검증이 없다**(2026-08-19 전수 검색: `worker/ lib/ scripts/ app/
  components/ config/` 에 SMS 공급자·인증번호 구현 0건). 따라서 번호는 "수집·저장" 까지만
  보장되며, 어떤 필드도 "검증됨"을 주장하지 않는다. 방침에도 본인확인 목적을 적지 않았다.
- 한 번호로 여러 계정을 만들 수 있다(2026-08-19 결정). 가입 시 지급되는 재화가 없어 번호는
  계정 수를 제한하는 장치가 아니었고, 차단은 가족 공용 번호를 막는 부작용만 남겼다. 따라서
  "이 번호를 쓰는 회원"은 여럿일 수 있으며, 번호로 계정을 특정할 수 없다.
