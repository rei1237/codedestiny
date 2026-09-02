---
status: active
updated: 2026-09-02
next: 열린 PR 5개 머지(#1449→#1446→#1444 스택, #1450·#1454 독립) 후 PR-1(/today)·PR-2(몰입 화면) 착수
---

# 앱 최적화 로드맵 — 상태 저장소 (2026-09-02)

계획 정본: `.claude/plans/humming-dancing-bubble.md` (사용자 승인). 결정 3건: ① 앱 체감 결함 우선 ② N3 는 조사만(산출물: [n3-shell-inline-css-externalization.md](n3-shell-inline-css-externalization.md)) ③ 모바일 검증기 4종 CI 배선 안 함(수동 유지).

## 열린 PR / 머지 순서

- **스택**: #1449(PR-5 safe-area) → #1446(PR-4 터치 타깃) → #1444(PR-3 IME) → #1444 를 main 으로. 자식 둘엔 CI 가 안 돈다(전 게이트가 `pull_request: branches:[main]` 한정 — 오류 아님). 최종 CI 는 #1444 가 합본 검증.
- **독립**: #1450(N3 조사 문서 + 이 문서) · #1454(PR-7 앱 번들 프루닝) — 순서 무관.
- 머지 완료: #1445(PR-6 판별·참조 정합).

## 남은 작업

1. **PR-1 `/today` 결함 2건** — 미착수. 다크 혼재 + 홈 복귀 UI. 근거: `docs/app-audit/DIAGNOSIS_REPORT.md`, 계획 1단계.
2. **PR-2 몰입 화면 3곳 하단 네비 충돌** — 미착수. `CHROMELESS_ROUTES` 추가가 추천 경로(계획 참조).
3. **admin/ 프루닝 — 사용자 결정 대기.** index.html:24316 이 `/admin/login` 으로 실제 네비게이션(deletion-auditor 실측)이라 지우면 앱 내 관리자 진입이 죽는다. 승인 시 `build-mobile-app.mjs` 의 `WEB_ONLY_ARTIFACTS` 에 `"admin"` 추가 + `verify-app-no-portone.mjs` 의 존치 단언을 부재 단언으로 교체.
4. **실기기 검증(기기 미검증 잔존)**: #1444 머지 후 IME(키보드) 동작, OS다크+연이 라이트 다크 플래시 관찰. 수동 검증기: `verify:mobile-bottom-nav-clearance`(safe=0/47) · `verify:mobile-cdp-smoke`.
5. **4단계 릴리스(사용자 액션)**: PR #1397 머지 → `VERSION_CODE 40→41` → `mobile:android:sync` → `bundleRelease` → vc41 AAB+mapping 업로드 → FGS 신고. 근거: `docs/handoff/android-vc41-r8-crash-2026-09-01.md`.
6. **3-A/3-B**: 병행 세션(`feat/home-pr7-axis3-perf` 소유)이 담당 — 3-A 는 프로덕션 INP 328ms(n=5) 재실측 완료(미푸시 커밋 30f1fcd1e), 3-B 도 그 세션 몫. 이 로드맵에서 손대지 말 것.

## 보류 (보고만 — 별도 합의 필요)

- 네오 부팅 첫 프레임 크림 플래시 — activity-alias 토글뿐(네이티브 구조 변경).
- 셸 로그인 모달 소셜 버튼 죽은 CSS(index.html:27380-27403) — deletion-auditor 선행 후 별도.
- 탭바 `/points/` href 가 인터셉터 의존인 구조 — 결제 인접, 변경 시 paid-gate-auditor 선행.
