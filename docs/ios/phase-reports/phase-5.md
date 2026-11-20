# iOS Phase 5 — 인증 (2026-11-20)

승인: 사용자 원문 "다음 페이즈 5 진행해줘"(2026-11-20). 범위는 진단·구현·main push(스테이징)까지. 운영 승격·시크릿 등록·콘솔 변경·실로그인·Phase 6 은 비승인.

## 0. RED 선보고 (구현 전 작성)

### 위험

1. 공유 인증 경로(`/api/auth/oauth/complete`)에 1회용 소비를 넣으면 웹·안드로이드 재시도가 깨질 수 있다.
   - 웹 콜백(app/auth/_components/StaticOAuthCallbackRedirect.tsx)은 5xx·네트워크 실패 때 같은 grant 로 다시 부른다. 재시도 전에 `/me` 를 먼저 확인하므로, 첫 호출이 성공했으면 그 탐침에서 끝난다.
   - 서버가 503(인프라 실패)으로 끝난 호출은 소비를 되돌려야 재시도가 산다 → 503 경로에서 소비 기록을 지운다.
   - 남는 경우: 앱에서 성공 응답이 유실되면 재교환이 거부되어 다시 로그인해야 한다. 이것은 재생 차단의 대가로 받아들인다.
2. 앱 handoff 페이지(buildAppOAuthHandoffResponse)는 안드로이드 intent:// 만 안다. iOS 분기를 넣다가 안드로이드 이동 URL 이 바뀌면 안드로이드 로그인이 전면 중단된다.
   - 안드로이드 기대값은 __tests__/ui/oauth-app-handoff.test.js 가 그대로 지킨다.
3. 네이티브 SIWA 엔드포인트는 비인증 경로다. id_token 검증이 느슨하면 남의 Apple 신원으로 로그인된다.
   - Apple JWKS 서명, iss, aud(=번들 ID), exp, nonce(=sha256(원 nonce)), sub 를 모두 확인한다.
   - 설정(Team ID·키 ID·.p8·번들 ID) 중 하나라도 없으면 503 `apple_signin_not_configured` 만 돌려준다(fail-closed). 아무것도 쓰지 않는다.
   - 웹 SIWA 와 같이 계정을 자동 생성하지 않는다. 신규는 가입 마무리(생년 확인)로 보낸다. 같은 이메일 계정에 자동 연결하지 않는다.
4. Apple refresh token 은 장기 비밀이다.
   - worker/lib/pii-crypto.js 의 AES-256-GCM 키(PII_ENC_KEY)로 암호화하고, Apple sub 를 AAD 로 묶는다.
   - 키가 없으면 저장을 건너뛴다(평문 저장 금지).
5. 탈퇴에 Apple revoke 를 넣으면 외부 호출 실패가 탈퇴를 막을 수 있다.
   - revoke 는 거부 조건을 모두 통과한 뒤 best-effort 로 부른다. 실패하거나 미설정이면 로그만 남기고 탈퇴는 계속한다.
   - 보관함 분리·구매 기록 보존, 환불 규칙은 바꾸지 않는다.
6. 앱 오류 분류를 잘못 고치면 일시 장애에서 사용자를 로그아웃시킨다. 401 만 재로그인, 503·네트워크는 재시도 안내로 둔다.

### 검증

- 서버 단위 테스트(mock, 실 Apple 호출 없음): 로컬에서 만든 RSA·EC 키로 JWKS·토큰 엔드포인트를 흉내 낸다. 확인 항목:
  - nonce·aud·exp·서명 오류 거부
  - 미설정이면 503
  - grant 재사용 거부와 503 뒤 재시도 허용
  - handoff 의 iOS 커스텀 스킴과 안드로이드 intent 유지
  - revoke 미설정 건너뜀
- `npm run check:fast`(종료 코드 직접 확인) → `npm run check:pre-push` → push → `gh workflow run ios-shell-build.yml --ref main` 1회(Swift 컴파일 + 기존 링크 전달 7건).
- 실제 Apple·Google·카카오·네이버 로그인은 비승인이다. 사용자 기기 체크리스트로 남긴다.

### 롤백

- 커밋을 축별로 나눈다. 회귀가 나면 해당 커밋만 `git revert` 한다.
  - grant 1회용
  - handoff iOS 분기
  - 네이티브 SIWA
  - 탈퇴 revoke
  - 브리지
  - Swift
- 네이티브 SIWA 는 env 가 없으면 꺼져 있으므로 운영 영향은 grant 1회용·handoff 두 커밋뿐이다.
- 새 스키마 필드(`socialAccounts.apple.refreshTokenEnc`)는 기본값 "" 인 추가 필드다. 되돌려도 기존 문서와 충돌하지 않는다.
