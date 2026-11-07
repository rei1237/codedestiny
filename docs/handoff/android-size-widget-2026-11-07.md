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

## 범위 밖 문제 수정(사용자 요청 "범위 밖의 문제도 수정해")
| 문제 | 커밋 |
|---|---|
| 모바일 '모든 운세 보기' 두 번 노출 | 52ede0666 |
| 낡은 브라우저 검증기 3종 | 52ede0666 |
| 위젯 설정 화면 이중 헤더·추가 버튼이 첫 화면 아래 | 3feed241d |
| 죽은 html[data-runtime-target] 규칙 → html:root | f72b10bbf |
| 하단 여백 검증기 선택자 + 찻집 입장 '다음 대사'가 시스템 UI에 가리던 실제 버그 | 05a97a7b7 |
| native-home-copy prefetch 테스트 | b0802378c |
| 앱 비회원 영냥이 진입 때 me 401→refresh 401×2→로그아웃 방송 | 6f5200d98 |
| 릴리스 점검 local.properties·google-services.json 오탐 경고 | 2ce0caf4d |
| 목록 썸네일이 960×640을 디코드 → 기능당 -320 썸네일 한 장 유지(약 +2.7MB) | f9275e33d |
| 위 수정(auth-client·AppChrome 등 공유 모듈)으로 사이트맵 원장 서명 156개가 어긋나 verify:sitemap-drift 차단 → 재생성 | 12c8e67ec |

- access-state 이중 호출(profileId 유무)은 코드 읽기로 세운 가설이었고 기기 기록(me→refresh→me)에는 없었다. 손님은 부르지 않는다. 로그인 상태 기기 추적에서 다시 볼 것.
- 위 수정 이후 APK는 아직 다시 빌드하지 않았다(final3는 aa2a69ff4 기준). 다음: scratchpad build-android.ps1로 재빌드 → 실기기 확인.
