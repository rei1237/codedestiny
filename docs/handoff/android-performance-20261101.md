---
status: blocked
date: 2026-11-01
owner: 01a19588-f79a-7e72-b5fa-d72da6964cf9
worktree: D:/Development/code-destiny/.codex-worktrees/android-performance-20261101-142130
code_head: 09878ae29
upstream: 20904183a1b0276584ed6f74313bf1e6cdeaf442
---

# Android 앱 최적화와 매일 09시 출시 추적

자동 추적은 설정했다. 최적화 코드는 로컬 커밋으로 보존했다. 기존 main CI 실패와 다른 세션의 미커밋 변경 때문에 main push는 하지 않았다. 정식 Release 성능 개선이나 공개 출시 완료로 보고하지 않는다.

**출시 추적**

- 자동화 ID `play`, 이 채팅 연결, Asia/Seoul 매일 09:00, 상태 변화·필요 행동만 알림. 실제 공개 출시 확인 후 종료.
- 2026-11-01 16:43 KST [Play Console 게시 개요](https://play.google.com/console/u/0/developers/8929260153073799668/app/4971977067602742831/publishing) 재확인: 1.0.56, 19개 국가/지역 전체 출시 변경사항 검토 중. 관리형 게시 꺼짐. 공개 다운로드 가능 상태는 확인되지 않았다.
- 심사 중인 버전을 수정·취소·재제출하지 않았다. 운영 배포도 하지 않았다.

**수정 파일과 의도**

- `scripts/build-mobile-app.mjs`: 앱 사본의 미사용 소개 그림·브랜드 제작 원본을 참조 검사 후 제외. 소개 그림은 원래 가로·세로 해상도 유지. 기존 이미지 품질 설정과 커지면 원본 유지·애니메이션 제외 정책 재사용. 원본 public 자산과 웹 이미지 경로는 유지.
- `scripts/lib/mobile-json.mjs`: JSON 문자열·큰 정수·지수 표기·중복 키를 그대로 두고 문자열 밖 공백만 제거.
- `app/components/NativeHomeCopy.tsx`, `app/components/MobileBottomNav.tsx`, `app/page.js`: 앱 홈·하단 탭에서 선택 전 다른 화면의 자동 읽기 억제. 웹의 기존 동작과 링크 목적지는 유지. 서버 API·라우팅 경로 변경 없음.
- `scripts/measure-android-startup.mjs`: 운영 앱을 거부하는 별도 benchmark 패키지 전용 5회 실행·메모리 기록 도구. 빠진 warm 시간은 0ms로 처리하지 않고 누락으로 기록.
- `config/sitemap-lastmod.json`: 생성기로 홈 소스 서명만 갱신. 검색 본문·title·canonical·색인 정책 변경 없음.
- 검사: `__tests__/release/mobile-json.test.js`, `mobile-brand-sources.test.js`, `mobile-introduction-images.test.js`, `measure-android-startup.test.js`, `__tests__/ui/native-home-copy.test.cjs`, `layout-preload.static.test.js`.
- 이 인수인계 문서. 다른 세션의 커밋은 merge로 보존했으며 그 변경을 이번 최적화로 집계하지 않았다.

**유지 정책**

결제·가격·이용권·월정석·단건 결제·인증·구매 기록·기존 결과 보관·공개 API/응답·DB 스키마를 이번 변경에서 수정하지 않았다. 소개 그림·목록·텍스트·다국어·오프라인 필수 자료는 앱에 유지한다. 네트워크 지연 다운로드 방식은 적용하지 않았다. 소개 그림의 인코딩은 기존 손실 압축 정책을 사용하며, 해상도 보존을 무손실 픽셀 보존으로 표현하지 않는다.

**실측 조건과 결과**

- 테스트폰 SM-M156S, Android 16, USB 충전, 패키지 `com.codedestiny.app.benchmark`, debug 서명, minify/shrinkResources를 켠 Debug. 실 API는 mock, 외부 통신은 테스트 CSP로 차단. 실결제·실 LLM·운영 DB 호출 없음.
- 기준 소스 `a9634ff14d7ca3854f61840079b780cb23608d40` + 이번 최적화 비교. 네이티브 버전 코드는 테스트용 1. 병합된 최신 upstream UI까지 다시 빌드한 실기기 결과는 아니다.
- 최종 자산 사본 C: 소개 그림 430개 정리 후 추가 78개 제외. 변경 후 전체 후처리의 단일 clean 실행과 병합본 Release는 후속 검증 대상이다.
- 이미지 3,115장 원본과 가로·세로·알파 채널 유무 일치. 소개 manifest의 로컬 이미지 참조 2,670건 누락 0. 네오·인연의 서 소개 실기기 이미지 표시와 캡처 확인.

| 지표 | 기준선 | 최종 테스트 사본 |
|---|---:|---:|
| 압축 전 자산 | 798.87 MB | 782.77 MB |
| AAB 파일 | 470.96 MB | 462.05 MB |
| 전체 Debug APK 파일 | 486.00 MB | 476.42 MB |
| 같은 기기 다운로드 예상 | 466.84 MB | 458.06 MB |
| Activity cold 실행 중앙값·범위 | 1310 ms (1118–3468; n=5) | 1444 ms (1292–2729; n=5) |
| Activity warm 유효 시간 | 154 ms (117–219; n=4) | 119.5 ms (107–139; n=4) |
| 보관함 탭→문서 중앙값·범위 | 205 ms (159.699951171875–251.900146484375; n=5) | 170.599853515625 ms (164.199951171875–207.5; n=5) |
| 홈 자동 RSC 요청 (사본 A, 1회) | 3 | 0 |

다운로드 예상 8.78 MB 감소. AAB와 Play 다운로드 크기는 다르며 bundletool의 추정도 Play Console 계산과 완전히 같지 않다. [Google 공식 기준](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en).

실행 시간은 각 빌드 cold 5회 전부 사용했다. warm은 각 1회에서 유효 시간이 제공되지 않아 n=4이다. first draw와 실제 조작 가능 시각은 다르다. cold 중앙값은 증가했고 범위가 겹친다. 실행 속도 개선은 확정하지 않았으며 성능 후보를 운영에 채택하지 않는다. 홈 DCL 397.6→396.8ms, LCP 388→384ms의 1회 값도 개선 근거로 쓰지 않는다.

초기 비교 cold 중앙값 1319→1621ms도 별도 원자료에 보존했다. 반복 패키징된 중간 APK는 ZIP 엔트리 외 공간이 26.3MB로 커져 비교에서 제외하고 app:clean 후 다시 만들었다. 최종 APK는 기준선보다 작다.

20분 반복 이동은 기준선과 사본 A에서 각각 수행했다. 기준선 PSS 231681–415883KB, 사본 A 194891–443093KB. 배터리 온도는 각각 34.3–35°C / 33.4–33.9°C. 충전·진입 순서 차이가 있어 메모리·전력·발열 개선을 주장하지 않는다. 최종 해상도 사본 C의 20분 soak는 미실행.

**검증 명령과 출력**

- `npm run check:fast -- --plan`: critical 계획 확인.
- `npm run check:fast`: paid-gate suite 90/90·전체 npm test·lint 통과. 홈 서명 변경으로 sitemap-drift에서 중단 → `npm run sitemap:generate` → drift 통과. 이미 통과한 전체 테스트는 반복하지 않고 남은 distinct 명령만 실행해 통과. 처음 명령 자체를 통과로 표시하지 않는다.
- 변경 관련 `node --test` 8개 파일: 26/26 통과. 마지막 이미지 관련 16/16, upstream 통합 후 관련 8/8 재확인.
- `npm run typecheck`: 변경 전후 및 통합 후 통과.
- `npm run verify:app-store-billing-policy`, `verify:capacitor-plugin-registration`, `verify:mobile-bottom-nav-sync`: 통과.
- `node scripts/verify-app-no-portone.mjs --dist dist`: 기준선·최종 통과.
- 앱 웹 산출물 빌드 및 별도 Debug APK/AAB 빌드 통과. 임시 next.config 변경과 Capacitor 생성 파일의 tracked 변경은 복구해 커밋에서 제외했다.
- `npm run check:pre-push`: 커밋된 통합 트리에서 통과.
- 기존 `npm run measure:app-memory -- --package com.codedestiny.app.benchmark ...`: foreground/background/trim 측정 완료. RSS background/foreground 69%는 한 사본의 상태 비교이며 빌드 간 개선 주장이 아니다.
- 기존 `npm run perf:app-route -- --runs=5 --passes=frames --segments=entry,album`: Chromium 1228 실행이 `browserType.launch: spawn UNKNOWN`으로 실패. 수치 없음.
- 실기기: benchmark 설치·업데이트(private marker 유지)·보관함 터치/뒤로가기 5회·5개 언어 선택·소개 그림·백그라운드 복귀 통과. 실제 음악 재생과 작성 입력 보존은 미검증.

**전달 차단과 재개**

- 기존 main `20904183a1b0276584ed6f74313bf1e6cdeaf442`의 [CI 41284797775](https://github.com/rei1237/codedestiny/actions/runs/41284797775) 실패: Static guards의 “Run the static UI guards the release runs”, CI required 실패. 그 위로 push하지 않았다.
- main checkout `C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530`에 다른 세션의 미커밋 8개 파일이 있다(fortune-chat 3개, prompt-hub-honey, saju-reading.css, worker honey 3개). 손대거나 커밋에 섞지 않았다.
- 로컬 코드 커밋: `953ece890`, `50e8436b0`, `2e9417984`; 최신 main 통합 `09878ae29`. 이 문서 커밋은 최종 답변의 전체 SHA로 식별한다.
- 서명 설정 파일 연결이 자동 승인 심사에서 자격증명 노출·공유 위험으로 거절되었다. 해당 파일을 복사·우회하지 않고 테스트 서명으로 검증했다. 정식 서명 Release는 미검증.
- 재개: 최신 main CI 복구와 다른 세션 변경 보존 상태 확인 → 필요한 dependencies 연결 복구 → 이 커밋들의 최소 diff 검토 → 병합본 전체 앱 후처리·정식 Release/실기기 비교(권한 내에서만) → 관련 검사/commit/check:pre-push → main push → 최종 공식 CI 한 번 확인. 공개 출시나 Play 재제출은 별도 요청 전 수행하지 않는다.
- 고유 커밋이 main에 전달되지 않아 이 워크트리·브랜치는 보존한다. 자기 임시 빌드와 benchmark 앱은 정리한다. 다른 세션의 워크트리·파일은 보존한다.

**추가 확인**

정식 Release, 실제 Play 다운로드/설치·OS 설치 전체 용량, 네이티브 초기화/WebView 준비/첫 조작 가능 시각 분리, 느린 실제 네트워크, 실제 음악·입력 유지, 최종 이미지 사본 20분 사용, 최신 upstream을 포함한 실기기 회귀가 남았다. 용량 개선만 확정된 범위로 보고한다.

원자료·수치·스크린샷: `D:/Development/code-destiny/output/android-performance-20261101-01a19588` (`performance.json`, `launch-status.json` 및 개별 측정 JSON/PNG). 개인정보·기기 serial·서명 값·mock APK/AAB는 최종 전달물에 포함하지 않는다.
