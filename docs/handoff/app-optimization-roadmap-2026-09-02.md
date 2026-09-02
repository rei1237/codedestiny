---
status: active
updated: 2026-09-02
next: PR #1458(27숙 달력 터치 타깃) 사용자 머지 → 남은 잔여 결함(월 입력 터치 타깃·쿠키 배너 앱 억제)은 디자인/컴플라이언스 판단 후 착수
---

# 앱 최적화 로드맵 — 상태 저장소 (2026-09-02)

계획 정본: `C:\Users\user\.claude\plans\humming-dancing-bubble.md` (사용자 승인, 레포에 없음). 결정 3건: ① 앱 체감 결함 우선 ② N3 는 조사만(산출물: [n3-shell-inline-css-externalization.md](n3-shell-inline-css-externalization.md)) ③ 모바일 검증기 4종 CI 배선 안 함(수동 유지).

## 열린 PR

- **#1458** — 27숙 달력 월 이동 버튼 히트 영역 44px(`::after`, 시각 크기 유지). CI 전 게이트 통과, 사용자 머지 대기. 그 외 열린 PR 없음.

## 계획의 PR-1·PR-2 는 이미 해결돼 있다 (2026-09-02 실측)

로드맵이 근거로 삼은 `docs/app-audit/DIAGNOSIS_REPORT.md` 는 2026-08-12 정적 감사라 그 뒤 머지분이 반영돼 있지 않다. 착수 전 재측정 결과:

- **PR-1 `/today`** — `TodayHubClient.tsx` 에 뒤로/홈 `TopNav` 존재, `bg-indigo-50` 0건(전부 반투명 오버레이). 프로덕션 HTML 에 `오늘의 운세 내비게이션` 확인. 수정은 e774414b7.
- **PR-2 몰입 화면 3곳** — `/destiny-compass`·`/master-love-codex`·`/island-consult` 모두 `AppChrome.tsx` 의 `CHROMELESS_ROUTES` 에 등재. `curl` 로 잰 `cd-mnav` 렌더 0건(island-consult 의 2건은 CSS 주석·변수). 수정은 13509c774.

🔴 **DIAGNOSIS_REPORT 의 항목은 그대로 믿지 말고 착수 전에 소스에서 재확인할 것.** 같은 방식으로 이미 해결 확인: luck-sync PWA 설치 카드 앱 게이팅 · `.modal-nav-home` 44px · `.tarot-mode-btn` 44px · `#resultPage`/스티키 CTA 앱 패딩.

## 남은 작업

1. **`.sy-basic-calendar__month`(월 입력, 112x≈29px)** — `<input>` 은 의사요소가 안 먹어 히트 영역만 못 넓힌다. 세로를 키우면 헤드가 15px 커지는 디자인 변경이라 사용자 판단 필요.
2. **쿠키 배너 앱 억제 여부** — `index.html:9067` `#cdCookieConsent` 는 앱에서도 900ms 뒤 뜬다(PG 창 억제만 존재). 컴플라이언스 판단 사항.
3. **`#tarotInnerContainer` safe-area** — `styles/fortune-ui-home.css:1305`·`fortune-ui.css:12426` 이 `max(80px, env(...))`. 의도는 `calc(80px + env(...))` 로 보이나 영향 경미.
4. **admin/ 프루닝 — 사용자 결정 대기.** index.html:24316 이 `/admin/login` 으로 실제 네비게이션이라 지우면 앱 내 관리자 진입이 죽는다. 승인 시 `build-mobile-app.mjs` 의 `WEB_ONLY_ARTIFACTS` 에 `"admin"` 추가 + `verify-app-no-portone.mjs` 의 존치 단언을 부재 단언으로 교체.
5. **실기기 검증**: IME(키보드) 동작, OS다크+연이 라이트 다크 플래시. 수동 검증기: `verify:mobile-bottom-nav-clearance` · `verify:mobile-cdp-smoke`.
6. **4단계 릴리스(사용자 액션)**: `VERSION_CODE 40→41` → `mobile:android:sync` → `bundleRelease` → vc41 AAB+mapping 업로드 → FGS 신고. 근거: `docs/handoff/android-vc41-r8-crash-2026-09-01.md`.
7. **3-A/3-B**: 병행 세션(`feat/home-pr7-axis3-perf` 소유). 이 로드맵에서 손대지 말 것.

## 보류 (보고만 — 별도 합의 필요)

- 네오 부팅 첫 프레임 크림 플래시 — activity-alias 토글뿐(네이티브 구조 변경).
- 셸 로그인 모달 소셜 버튼 죽은 CSS(index.html:27380 부근) — deletion-auditor 선행 후 별도.
- 탭바 `/points/` href 가 인터셉터 의존인 구조 — 결제 인접, 변경 시 paid-gate-auditor 선행.
- 홈 외부 replit 타일(`aesthetic-pig-design`) — 콘텐츠/사업 판단.

## 셸(index.html) 을 고칠 때 필수 후속

`npm run sync:public` → `npm run sitemap:generate`(셸 라우트 5개 서명이 반드시 바뀐다 — 빠뜨리면 CI 가 "Typecheck and lint" 이름으로 실패) → `verify:payment-freeze`. `verify:public-mirror-fresh` 가 `.ignore` 하나만 다르다고 하면 윈도우 개행 위양성이니 CI 판정을 따른다.
