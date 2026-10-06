---
status: active
updated: 2026-10-07
next: 생선 상담 변경 완료 및 main CI 확인 후 최종 Android 빌드. 업로드 트랙 답변과 테스트 계정 준비 상태 확인.
---
# Android 앱 언어 연동 및 최종 출시 대기

## 사용자 요청과 승인
- 최초 요청: 기존 Android 인수인계와 origin/main 3add418ed3a0b7d64bc7deb95ce9456c82fcda89 확인 후 OS 앱 언어 연동과 테스트 계정 인수 검증.
- 추가 요청: 현재 진행 중인 생선 상담 수정이 완료된 이후 앱 빌드를 완성하고 앱스토어에 업로드.
- Android 문맥의 Google Play 업로드 요청으로 해석. 내부 테스트/비공개 테스트/프로덕션 심사 중 트랙은 질문했으며 아직 답변 없음. 프로덕션 공개나 운영 서버 승격으로 확대하지 않는다.
- 실결제, 유료 LLM, 운영 DB 쓰기는 승인되지 않았으며 실행하지 않았다.

## 현재 전달 범위
- 언어 연동 구현 커밋: 030741a48e1e388c452f266d0d318024c5e197fb.
- Android localeConfig 12개 언어, AppCompat 저장(하위 OS), OS 앱별 언어 양방향 동기화.
- 첫 초기화에만 명시적인 기존 웹 언어를 이관. OS 선택 우선, 시스템 기본값 복귀 유지.
- 명시적인 언어 선택 이벤트만 OS로 전달. OS 변경/앱 복귀 이벤트는 되울리지 않는다.
- URL 쿼리 및 앱 런타임 언어 우선순위, React/legacy 번역과 선택기 표시 연결. 재로드 없음. 상담 결과만 바꾸는 수동 언어 override 유지.
- 공유 main HEAD는 시작 시 a13ee2a647cdeddbebfdd0e373ea0378398593f2, origin/main은 정확히 3add418ed3a0b7d64bc7deb95ce9456c82fcda89. 다른 세션 언어/음악/마케팅 변경과 index를 보존.
- 작업 경로 D:/Development/codedestiny-worktrees/android-locale-acceptance-20261007-045252. main 체크아웃이 더럽고 뒤처져 있어 이를 덮어쓰지 않고 격리 커밋을 origin/main으로 fast-forward push한다. PR 없음.

## 검증 증거
- node --test __tests__/ui/android-app-locale.test.js: 7/7 통과. 초기화 중 선택, OS 기본값 복귀, 되울림 방지, URL/해시/history 보존, native 없는 구버전, stale 경로보다 앱 언어 우선.
- npm run test:jest -- --runInBand __tests__/worker/auth.app-refresh-token.test.js __tests__/worker/app-store.google-billing.test.js: 41/41 통과. 서버/Google/DB mock이며 실계정 인수 아님.
- npm run typecheck: 통과.
- 변경 파일 ESLint: 0 errors / 207 warnings. 기존 vanilla bridge 스타일 경고 포함. lint 전체 통과로 표시하지 않는다.
- Android :app:testDebugUnitTest 및 테스트 코드 컴파일: 성공. AppLocalePolicy 2개와 기존 LockScreenPolicy 3개.
- API36 새 전용 AVD의 AppLocaleIntegrationTest: 1/1 통과. OS localeConfig 12개, 앱→OS ja, OS→앱 de-DE→de, 기본값 복귀, 같은 MainActivity 인스턴스 유지.
- instrumentation은 네트워크/계정 호출 없는 작은 HTML fixture를 사용했다. 전체 React 서비스 E2E/최종 Release 증거가 아니다.
- npm run sync:public 뒤 커밋 상태의 npm run verify:public-mirror-fresh: 통과. 캐시 키/정적 셸/JS 미러 포함.
- npm run check:fast -- --plan: critical 승격. 실제 check:fast는 첫 전체 Jest 묶음 실행 중 메모리 경합으로 이번 세션 소유 14개 프로세스만 중단. 전체 로컬 게이트 미완료; 공식 main CI를 확인해야 한다.
- 실패 이력: 빈 워크트리 Capacitor 생성 경로 부족은 assets 디렉터리 생성 후 update로 해결. 잘못된 직접 Jest 호출은 VM modules 옵션 누락으로 실패했고 정식 test:jest 명령 41/41로 재검증. instrumentation getBool API 오용을 optBoolean으로 고친 뒤 빌드/실행 통과.
- 기존 잠긴 AVD는 변경하지 않고 종료. 새 전용 AVD는 검사 후 종료·삭제했다.
- Cap update의 로컬 상대경로 생성물 2개는 output/android-20261007/locale-generated에 백업하고 저장소 정본으로 복원. 공유 main 파일 미수정.

## 후속 빌드와 계정 인수
- 기다릴 채팅: 생선별 추가 질문 정책 설계, thread 01a112ca-92fa-7370-a187-11c5508fc37f, host local. 마지막 확인: active/waitingOnUserInput, 설계 진행 중. 완료 추정 금지. 다른 채팅에 메시지 보낼 권한은 없음.
- 생선 변경이 실제 origin/main에 포함되고 그 최종 SHA의 CI required가 성공한 후 최종 웹 번들→Capacitor sync→기존 키 APK/AAB 제작.
- versionCode는 Play Console 현행 최고값을 다시 확인해 충돌 없이 결정. 과거 47 후보를 그대로 최신 빌드로 업로드하지 않는다.
- output/android-20261007의 기존 1.0.47 후보 파일은 수정하지 않았고 이번 언어 수정이 포함되지 않는다.
- OAuth Google/Kakao/Naver 로그인된 테스트 기기/브라우저, Play 라이선스 계정·SKU는 준비 여부 질문 중. 비밀번호 채팅 수집 금지. 로그인/구매/복구/업데이트 보존 실증은 미완료.
- 후속 실행은 현재 채팅 heartbeat로 생선 작업 완료를 확인하도록 설정한다. 변경 없는 상태는 조용히 유지한다.

## 증거 위치와 재개
- 증거 폴더 D:/Development/code-destiny/output/android-20261007/. locale-account-mock.log, locale-typecheck.log, locale-api36-instrumentation.log, locale-native-build.log, locale-check-fast.log, locale-mirror-check.log.
- 보존 인수인계: D:/Development/code-destiny/output/android-20261007/docs/handoff/android-locale-acceptance-2026-10-07.md.
- 재개: D:/Development/code-destiny에서 위 보존 인수인계를 읽고 030741a48e1e388c452f266d0d318024c5e197fb 포함 여부 및 다른 세션 변경을 확인한다. 생선별 추가 질문 정책 설계 채팅의 완료와 main 반영·CI부터 확인한 뒤 최종 Android 빌드·인수를 수행한다. 업로드 트랙 답변 전에는 임의로 출시하지 않는다.
- 공식 Android 언어 계약: https://developer.android.com/guide/topics/resources/app-languages

## 첫 CI 실패와 대체 구현
- CI 37524826951 / 784196d6408909520bbc860dd47145be931c7755에서 타입·린트는 통과, 정적 검사에서 언어 이벤트 단일 이름 규약과 사이트맵 날짜 테스트가 실패했다.
- 최초 구현 030741a48은 2076d9709에서 되돌렸다. 대체 구현은 기존 cd:locale-ready 이벤트 하나에 source=user/android를 실어 명시 선택과 OS 갱신을 구분한다. 기존 이벤트 규약을 변경하거나 검사를 완화하지 않았다.
- 사이트맵 실패는 다른 세션의 b1a0707b4 원장 갱신을 받은 뒤 통과했다. Android 세션이 사이트맵 로직을 수정하지 않았다.
- 대체 구현·이벤트 규약·사이트맵 회귀 합계 18/18 통과. 네이티브 Java/Manifest/localeConfig는 앞서 API36에서 확인한 구현과 동일하며 최종 앱 재빌드는 생선 작업 완료 뒤 수행한다.
- 전달 SHA/CI 최종 상태/automationId는 output/android-20261007/locale-delivery.json을 따른다. heartbeat id=android, 30분 간격. 최종 빌드와 업로드는 아직 실행하지 않음.
