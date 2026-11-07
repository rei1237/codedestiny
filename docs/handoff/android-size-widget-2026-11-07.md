---
status: in-progress
updated: 2026-11-07
next: "SM-M156S(RFCXB0CP4AR)를 USB로 다시 연결하고 final3 benchmark APK를 설치해 홈 첫 줄 7개·위젯 진입 버튼·핀 확인창 미리보기를 실기기에서 확인"
---

# Android 앱 용량·속도·홈 화면 위젯 (wt/android-size-widget-20261107-021350)

## 상태
- 브랜치 마지막 커밋: aa2a69ff4. push·Play 업로드는 하지 않았다(사용자 승인 필요).
- 최종 릴리스 빌드: D:\Development\code-destiny\output\android-size-widget-20261107\final3\app-release.aab (280,982,450 B, VERSION_CODE 57 / 1.0.57). 같은 폴더에 app-benchmark.apk.
- check-changed(--base=origin/main --committed-head, ALLOW_DEV_SERVER_DURING_BUILD=1): node 4625/4625, Jest 7666/7666, 빌드 단계까지 exit 0. 로그: output\android-size-widget-20261107\check-changed-aa2a69ff4-b.log

## 측정 결과(SM-M156S 사양)
| 항목 | 기준 | 최종 |
|---|---|---|
| AAB | 482,830,397 | 280,982,450 |
| 예상 다운로드(get-size) | 478,418,868 | 277,306,906 |
| 설치 appBytes | 484,616,704 | 281,684,480 |
| 첫 실행+영냥이 후 data | 5,689,344 | 5,283,840 |
| cache | 1,245,184 | 847,872 |

속도(9회 교차 중앙값, ms): launchTotal 1569→1208, 홈 FCP 1385→1036, 홈 LCP 2073→1832, 영냥이 탭→경로 711→525, 탭→화면 795→610.

## 남은 실기기 확인
1. `adb install -r ...\final3\app-benchmark.apk` (benchmark 패키지만, 실제 com.codedestiny.app은 건드리지 않음)
2. 홈 첫 줄: 사주·타로·자미두수·숙요점·베다점·점성술·오늘의 운세 7개, '무료로 먼저' 격자 숨김
3. "홈 화면에 부적·확언 놓기" 버튼 노출, 핀 확인창 미리보기가 고른 부적/확언인지
4. 스크린샷은 output\android-size-widget-20261107\widget-qa\

## 확인하지 못한 것
- 재부팅 뒤 위젯 표시(기기 PIN 잠금)
- 실제 로그인·Play 테스트 결제(benchmark는 API 모의, 내부 테스트 트랙 업로드 승인 필요)

## 후속 과제(이번 범위 밖)
- 모바일에서 '모든 운세 보기'가 .yh-all과 .cdh-all-cta__btn 두 번 노출
- 낡은 브라우저 검증기: verify-illustrated-home(카드 3장 기대), verify-home-funnel·verify-consultation-home-browser(모바일 #cdQuickServices 순서)
- 위젯 설정 화면 이중 헤더, 추가 버튼이 첫 화면 아래
- 죽은 html[data-runtime-target] 규칙, 하단 여백 선택자, prefetch 테스트, 비회원 인증 갱신 연쇄, local.properties·google-services.json 경고, 960px 썸네일
