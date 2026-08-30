---
status: active
updated: 2026-08-30
next: PR #1299 → #1300 → #1302 순서로 머지하고, 스테이징 배포 후 기기에서 신규 구글 계정 가입이 앱으로 돌아오는지 본다
---

# 앱 소셜 로그인이 커스텀탭에서 돌아오지 못하던 문제

## 왜

안드로이드 앱(1.0.37 디버그)에서 **카카오는 "로그인 완료" 화면 뒤 실패 토스트**, **구글·네이버는 로딩 화면에서 영구 정지**. 회원가입·로그인을 고쳐 기기에서 다시 테스트할 수 있게 해 달라는 요청.

## 지금 상태

- PR **#1299**(근본 원인·가드) CI 8/8 초록 · **#1300**(인증 UX) · **#1302**(정리) — 셋 다 **머지 대기**.
- 🔴 #1300·#1302 는 **스택 PR 이라 지금은 CI 가 한 건도 안 돈다.** 워크플로 전부가 `branches: [main]` 이라 base 가 main 이 아니면 트리거되지 않는다. 부모를 머지하면 base 가 자동으로 main 이 되면서 그때 돈다.

## 남은 작업

- [ ] **머지 순서 ① #1299 → ② #1300 → ③ #1302.** 각 머지 후 다음 PR 의 CI 가 초록인지 보고 넘어간다.
- [ ] **기기 재검증 4항목** — ⑴ 신규 구글 계정 가입 → 앱 **안에서** `/signup` 마무리 폼이 뜨는가 ⑵ 카카오 로그인 완주 ⑶ 커스텀탭을 닫고 돌아왔을 때 소셜 버튼 3개가 다시 눌리는가 ⑷ 가입 폼 아래 칸이 키보드에 안 가리는가.
- [ ] 🔴 ⑴⑵ 는 **워커 수정분이라 스테이징/프로덕션에 올라가기 전엔 기기에서 확인되지 않는다** — 앱 번들의 API base 가 `scripts/build-mobile-app.mjs:32` 에서 `https://code-destiny.com` 로 고정돼 있다. 머지 후 CDP `Page.addScriptToEvaluateOnNewDocument` 로 `window.CODE_DESTINY_API_BASE_URL` 을 스테이징으로 덮어 1회성 검증하거나, 사용자 승인 하에 프로덕션 승격 뒤 본다. ⑶⑷ 는 브릿지·React 라 디버그 APK 재설치로 바로 된다.

## 정본 예시

`worker/routes/auth.js:4608` (`appOAuthRedirect` 확정 지점 — 이 아래 모든 종료 응답이 가드 대상)

## 함정

- 🔴 **`--cd-app-viewport-h` 는 죽어 있다** — `app/app/_components/AppShell.tsx:36` 이 설정하는데 레포 전체에서 읽는 곳이 **0곳**이다(`git grep` 히트 1건 = setter 자신). `/app/*` 의 키보드 대응은 지금 아무 일도 하지 않는다. 살리면 `/app/*` 레이아웃 높이가 바뀌고 확인도 기기에서만 되므로 이번 범위에서 뺐다.
- 🔴 **미검증 가설** — 로그인에 성공해도 30분 뒤 조용히 로그아웃될 수 있다. `index.html:12429-12432` 가 만료 토큰을 지우고, `:12458` 의 게스트 판정이 **리프레시를 한 번도 시도하지 않는다.** 기기 트레이스(`localStorage["cd_app_trace_v1"]`)로 먼저 확정할 것. 추측으로 고치지 말 것.
- 레포에 IME 검증기가 없다(`git grep visualViewport -- scripts/` 0건) → #1300 의 키보드 수정은 **정적 가드 불가, 기기 실측뿐**.

## 검증

```
npm run verify:oauth-app-handoff   # #1299 의 신규 가드 — 워커·브릿지·Java·Manifest 4면 대조
npm run verify:guard-wiring
npx jest __tests__/worker/auth     # NODE_OPTIONS=--experimental-vm-modules 필요
```

## 모르는 것

카카오 교환 실패의 정확한 사유. 후보는 grant TTL 180초 초과(`worker/routes/auth.js:44`) · 이중 콜백 · 네트워크 실패인데 **정적으로 확정 못 했다.** 기기 트레이스의 `deepLink:exchangeFailed` 가 `status`·`message` 로 이름을 알려준다 — 🔴 폰 잠금이 풀려 있어야 웹뷰 DevTools 가 응답한다.
