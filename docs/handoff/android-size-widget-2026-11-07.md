---
status: active
updated: 2026-11-08
next: "final6 빌드(88c8d17dc 포함) 뒤 /oracle/hwatu-life/·/tarot/love/ 히어로 이미지 재확인, 그다음 사용자 승인 받아 push·내부 테스트 트랙"
---

# Android 앱 용량·속도·홈 화면 위젯 (wt/android-size-widget-20261107-021350)

## 상태
- 빌드 기준 커밋: 869eb11c2. push·Play 업로드는 하지 않았다(사용자 승인 필요).
- 최종 릴리스 빌드: D:\Development\code-destiny\output\android-size-widget-20261107\final4\app-release.aab (283,330,476 B, VERSION_CODE 57 / 1.0.57). 같은 폴더에 app-benchmark.apk. final3(aa2a69ff4, 280,982,450 B)는 범위 밖 수정 이전 빌드.
- check-changed(--base=origin/main --committed-head, ALLOW_DEV_SERVER_DURING_BUILD=1): node 4625/4625, Jest 7666/7666, 빌드 단계까지 exit 0. 로그: output\android-size-widget-20261107\check-changed-aa2a69ff4-b.log

## 측정 결과(SM-M156S 사양)
| 항목 | 기준 | 최종 |
|---|---|---|
| AAB | 482,830,397 | 283,330,476 (final3 280,982,450 + 목록 썸네일) |
| 예상 다운로드(get-size) | 478,418,868 | 279,620,527 (final3 277,306,906) |
| 설치 appBytes(final3 실측) | 484,616,704 | 281,684,480 |
| 첫 실행+영냥이 후 data | 5,689,344 | 5,283,840 |
| cache | 1,245,184 | 847,872 |

속도(9회 교차 중앙값, ms): launchTotal 1569→1208, 홈 FCP 1385→1036, 홈 LCP 2073→1832, 영냥이 탭→경로 711→525, 탭→화면 795→610.

## 남은 실기기 확인
1. `adb install -r ...\final4\app-benchmark.apk` (benchmark 패키지만, 실제 com.codedestiny.app은 건드리지 않음)
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
- final4(869eb11c2)로 다시 빌드했다.

## final4 실기기 확인(2026-11-08, benchmark 패키지, pm clear 뒤)
- `/ggulggul/` 첫 줄: 사주·타로·자미두수·숙요점·베다점·점성술·오늘의 운세 7개, '무료로 먼저' 격자 숨김, 깨진 이미지 0(127장 중 목록 썸네일 -320 5장).
- 진입 화면 `/`·`/feature-details/`: "홈 화면에 부적·확언 놓기" 버튼 노출(display flex), 깨진 이미지 0.
- 손님 영냥이 진입 API: geo → `/api/auth/me` 1회 → restore-credential/challenge. refresh·로그아웃 방송 없음.
- 스크립트·결과: scratchpad measure/qa-final4.mjs·qa-final4b.mjs, output\android-size-widget-20261107\widget-qa\qa-final4*.json, f4-*.png
- 기존 문제(이번 변경과 무관, 11-07 스크린샷에도 있음): `/ggulggul/`의 "어떤 운세를 볼까요?" 제목과 격자가 화면 왼쪽 끝에 붙고 오른쪽 카드가 잘림.

## final5 (2026-11-08, 기준 커밋 679d9c3e1)
추가 개선 계획 A단계 커밋: 02f700000(검증된 죽은 이미지 묶음 제외), 00309f1e3(fortune/date는 웹에서만), 6fb484d68(앱은 한국어 페이지만, 언어 선택 숨김), 9acee48c9(영냥이 타로 webp만), 8175b4d6f(타로 jpeg→webp), d8238ca72(홈 idle 때 영냥이 prefetch), 679d9c3e1(PortOne 가드 검증 경로 /today).

| 항목 | 기준 | final4 | final5 |
|---|---|---|---|
| AAB | 482,830,397 | 283,330,476 | 233,027,011 |
| 예상 다운로드(get-size) | 478,418,868 | 279,620,527 | 230,003,720 (기준 대비 -52%) |

속도(final4·final5 9회 교차 중앙값, ms. ab45/summary.txt): launchTotal 1294→1098, 홈 FCP 1117→939, 홈 LCP 1757→1672, 영냥이 탭→화면 586→494. 홈 long task는 2→4로 늘었지만 탭→화면이 92ms 빨라져 prefetch(d8238ca72)는 유지한다.

실기기 확인(benchmark 패키지, output\android-size-widget-20261107\widget-qa\final5, qa-final5.json·qa-links.json):
- 깨진 이미지 0: /mini-games/, /neo-operation-room/, /yeongnyangi/, /stories/, /world/, /fortune-tea-house/, /codedestiny-novel.html, /fortune/, /ggulggul/. 실패한 리소스 요청 0.
- /oracle/hwatu-life/, /tarot/love/: 히어로(fuctionassets/*.webp)와 만세력 카드 로고가 https://code-destiny.com 절대 주소라 benchmark CSP(img-src 'self')에 막혔다. 실제 앱에서는 네트워크로 받아 오고 오프라인이면 깨진다. 88c8d17dc에서 화면용 이미지를 같은 출처 경로로 바꿨다(공유·메타는 절대 주소 유지, 앱에 없는 /og/ 제외). final6 빌드에서 확인해야 한다.
- 로케일·날짜 링크: /today, /insights/sukuyo-basics, /insights/ziwei-basics, /oracle/hwatu, /oracle/juyuk, /ggulggul 실제 DOM에 남은 로케일·fortune/date 링크 0(app-payment-guard가 실행 중에 지운다). /en/ 링크를 눌러도 홈으로 돌아오고 막다른 화면이 없다. /ja/tokushoho/는 앱에 남아 열린다.
- tsc에서 9acee48c9의 TarotCardArt.tsx IS_APP_BUILD import 누락을 찾아 3d9a9c4e4에서 고쳤다. next.config의 ignoreBuildErrors 때문에 빌드는 통과했었다.
