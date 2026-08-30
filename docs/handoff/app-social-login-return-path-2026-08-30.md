---
status: active
updated: 2026-08-30
next: PR #1309 를 머지하고 → 프로덕션 승격(사용자 지시 필요) → 기기(1.0.38)에서 로그인 후 30분 경과 뒤 콜드부팅이 로그아웃되지 않는지 본다
---

# 앱 로그인이 성공 직후 스스로 로그아웃되던 문제

## 왜

앱(1.0.37)에서 카카오는 실패 토스트, 구글·네이버는 로딩 화면 정지. 커스텀탭 복귀 경로 자체는 PR #1299 로 고쳤고, 그 뒤 **기기 트레이스로 진짜 원인 3개를 확정**했다.

## 지금 상태

- PR **#1309** — 원인 3개 수정 + `verify:oauth-app-handoff` [4]절 신설. CI 전 항목 초록, **머지 대기**.
- 앱 **1.0.38** 로컬 재빌드 진행/완료(versionCode 38). 기기 RFCXB0CP4AR 에는 아직 1.0.37.

## 확정된 원인 3개 (기기 트레이스 2026-08-29 근거)

1. **브릿지가 `/api/*` 를 리타게팅하면서 자격증명을 안 실었다.** 앱 출처가 `https://localhost` 라 `SameSite=Lax` 쿠키가 안 나가는데, 셸에서 `Authorization` 을 다는 곳은 `/api/auth/refresh` 뿐이다 → 부팅 프로브 `/api/auth/me` 가 401 → `__cdForceSignOut('auth-me-probe')` 가 토큰 3종 삭제. 트레이스에 `deepLink:exchangeOk` 가 2번인데 `lsKeys: ["cd_app_trace_v1"]` 뿐이었던 이유.
2. **`verifyRefreshSessionToAuth` 가 리프레시 토큰을 쿠키에서만 읽었다** → 앱은 액세스 TTL(30분)마다 전 요청 401. 위 1번과 합쳐 30분마다 강제 로그아웃.
3. **`isAuthInfraFailure` 가 메시지만·대소문자 구분해서 봤다** → `MongoPoolClearedError` 등이 `handleOAuthComplete` 3회 재시도를 못 타고 503 `"Database is temporarily unavailable."` 로 샜다(트레이스의 `exchangeFailed`).

## 남은 작업

- [ ] **#1309 머지.** 다른 열린 PR(#1307·#1308)과 파일 겹침 0이라 순서 자유.
- [ ] 🔴 **프로덕션 승격** — 원인 2·3은 워커 수정이라 승격 전엔 기기에 안 닿는다(앱 API base 가 `scripts/build-mobile-app.mjs` 에서 `https://code-destiny.com` 고정). 승격은 사용자 지시가 있어야 실행한다: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`.
- [ ] **기기 재검증** — ⑴ 카카오/구글/네이버 로그인 완주 ⑵ **로그인 30분 뒤 앱을 완전 종료했다 재실행**해도 로그인 유지 ⑶ 커스텀탭을 닫고 돌아왔을 때 소셜 버튼 3개가 다시 눌리는가 ⑷ 가입 폼이 키보드에 안 가리는가.

## 함정

- 🔴 **`release-signing.properties` 는 gitignore 라 워크트리에 안 딸려온다.** 저장소 루트에서 복사해야 gradle 이 versionCode/키스토어를 읽는다. 여기 있는 값이 곧 빌드 버전이다 — 재빌드 전에 올릴 것.
- 🔴 **`--cd-app-viewport-h` 는 죽어 있다** — `app/app/_components/AppShell.tsx:36` 이 설정만 하고 읽는 곳이 0곳. `/app/*` 키보드 대응은 지금 아무 일도 안 한다.
- `worker/routes/auth.js:2412` `readRefreshTokenFromRequest` 는 `worker/lib/auth.js` 정본과 같은 로직의 **사본**이다. 지금은 일치하고 `__tests__/worker/auth.app-refresh-token.test.js` 가 지키지만, 갈리면 이 문제가 재발한다.
- 레포에 IME 검증기가 없다(`git grep visualViewport -- scripts/` 0건) → 키보드 수정은 정적 가드 불가, 기기 실측뿐.

## 검증

```
npm run verify:oauth-app-handoff   # [4]절이 브릿지 부착 4항목·리졸버 수신 3항목을 fail-closed 검사
npm run verify:auth-p0p1
npx jest __tests__/worker/auth     # NODE_OPTIONS=--experimental-vm-modules 필요
npm run mobile:android:sync        # 웹 번들 → cap sync (gradle node_modules 경로 재작성은 커밋 금지)
```

## 정본 예시

`scripts/app-native-bridge.js` `installAppApiRetarget` — 앱의 모든 `/api/*` 가 지나는 단일 지점. 인증 헤더는 호출부가 아니라 여기서 붙인다(웹 blast radius 0).
