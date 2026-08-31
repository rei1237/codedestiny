---
status: active
updated: 2026-09-01
next: 사용자가 PR #1397 머지 → vc41 AAB 업로드 + FGS 신고(영상 첨부)
---

# Android vc41 R8 크래시 수정과 Play 제출

## 왜

vc41 릴리스 APK 가 잠금화면 설정 ON / '다른 앱 위에 표시' 허용 직후 튕기고 잠금화면이 안 떴다(디버그는 정상). 원래 되던 기능의 회귀.

## 지금 상태

- 근본원인 확정: `-keepattributes` 만으로는 부족 — 어노테이션 **클래스**가 keep 루트가 아니면 R8 이 `Plugin.getPermissionStates` 를 `throw null` 로 접는다(원본 vc41 dexdump 실측). #1396 의 `getPermissionState` 신규 호출이 최초로 밟아 릴리스에서만 즉사.
- 수정 4파일 = PR #1397 (fix/android-vc41-r8-crash, CI 초록). 에뮬레이터(pixel_7/android-36)에서 릴리스 APK 실기동으로 동의→권한→오버레이→화면 끄고 켜기→잠금화면 표시 전 구간 무크래시 확인.
- 산출물+시연영상: `C:\Users\user\Desktop\CodeDestiny-Build\20260901-0305-1.0.41-41-a2cd382bd\` (BUILD_INFO.txt 에 해시·검증 내역). 직전 크래시 빌드 폴더는 `-폐기-크래시빌드` 로 개명해 둠.

## 남은 작업 (전부 사용자 몫)

- [ ] PR #1397 머지
- [ ] Play Console: vc41 AAB + mapping.txt 업로드 (폐기 폴더의 AAB 금지)
- [ ] Play Console 앱 콘텐츠 → 특수용도 FGS 신고 + `잠금화면-시연영상.mp4` 첨부 — 문안은 [docs/play-console-submission-values.md](../play-console-submission-values.md)
- [ ] 메인 체크아웃 `apps/mobile/android/release-signing.properties` · `Desktop\CodeDestiny-업로드-준비\_전부하기.ps1` 의 버전 40→41 갱신(워크트리 가드 밖이라 미처리)
- 판정 기준: Play Console 에서 vc41 이 검토 통과, 신규 경고 0

## 정본

- keep 규칙: `apps/mobile/android/app/proguard-rules.pro:26`
- 방어 순서: `apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyLockScreenPlugin.java:71`

## 함정

- 이 크래시는 **릴리스(R8)에서만** 난다 — 디버그 검증은 증거가 못 된다. 재검증은 `assembleRelease` APK 를 에뮬레이터에 깔고 동의 플로우를 밟을 것.
- 에뮬레이터 `cdtest` 는 headless(-no-window)로 앱 띄우면 exit 5 로 죽는다 — 창 모드(`-gpu auto`)로 돌릴 것.

## 미검증

- 실기기(Android 10~16 매트릭스) 미실시 — 에뮬레이터 android-36 단일 검증.
