---
status: done
updated: 2026-10-24
next: 실기기·일본 Play Console·Mac iOS 출시 게이트를 별도 확인한다.
---

# 일본 Android · iOS · 부적 앱 준비 인수인계

앱 빌드 소스: `c247d4ec353c730841b8b686791fa1b3d533dfdc`. 전달 CI: `7e301512c6945c0af069cb874953d6e89a1e52a9`, `success`.
작업 폴더: `D:\Development\code-destiny\.codex-worktrees\mobile-japan-ios-20261024-033316`. 검증 완료 후 이 작업의 워크트리만 정리한다. 파일과 증거는 `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316`에 남긴다.

## 구현 범위

- 일본 Google Play 입금 대기에서는 지급·acknowledge·consume하지 않는다. 앱 재개·로그인·구매 갱신 후 서버 검증하며 원래 주문과 계정 소유자를 확인한다.
- 같은 계정/권한/구매 내역과 두 보관함을 유지한다. 웹 결제 화면은 앱에서 제외하되 구매 내역·인사이트·유명인 사주 경로는 보존한다.
- 승인 v2 원본15장을 그대로 포함한다. Android 홈·잠금·둘 다 적용과 원본/맞춤 저장·공유, iOS 사진 추가 후 대상별 수동 설정 안내를 구현했다. 이미지 속 문구는 한국어이며 자동 적용 성공을 과장하지 않는다.
- iOS Capacitor SPM 프로젝트·라우터·언어·사진 추가/공유·브랜드 자산을 준비했다. 신규 구매는 준비 중으로 닫았고 StoreKit/실기기/Xcode 검증은 남는다.
- 빌드 기준 main의 이용권 v5 정책과 캐릭터 렌더 수정을 통합했다. 1.0.52는 이전 정책 스냅샷 검수본, 1.0.53이 이번 통합 전달본이다. 이후 main 변경은 이 설치본에 자동 반영되지 않는다.

## 검증 기록

- `npm run test:jest -- __tests__/worker/app-store.google-billing.test.js`: 통합 후 94 passed. 입금 대기·지연 복구·원래 주문과 소유자 연결을 mock으로 확인했다.
- `node --test __tests__/ui/talisman-catalog.test.js __tests__/ui/talisman-wallpaper-fit.test.js __tests__/release/mobile-account-content.test.js __tests__/ui/app-shell-locale-hydration.test.js`: 통합 후 23 passed.
- `npm run typecheck`: 부적·native 연결 소스 통과. 후속 언어 수정은 실제 SSR/hydrate 회귀 검사와 ESLint 통과. 변경 UI ESLint 오류0·정적 링크/원본 img 경고6.
- `npm run build:mobile:app`: 고정 통합 소스 `c247d4ec353c730841b8b686791fa1b3d533dfdc` 통과. 앱 결제 차단 및 구매·기록·읽기 경로 보존 검사 포함.
- `npx cap copy android`, `npx cap copy ios`: 같은 최종 웹 자산 복사 성공. native53 release build 성공. 재현 스크립트 `evidence/v53-run-mobile-gradle-direct.ps1`에 JVM·Gradle8.14.3·버전 인자를 보존했다.
- 최종 정적 산출물 UI: ko360/390/430 Android 모의·ko1280 웹·ja390 Android 모의·ko390 iOS 모의 6조건, 넘침/pageerror/44px 미만 조작0. 15장 선택·원본 해시·맞춤 PNG·홈/잠금/둘 다 전달·취소·미지원·권한 오류·재연결 처리 통과. ko/ja iOS 상점은 신규 구매 차단과 내역 경로 유지.
- Worker dry build, iOS CORS, 앱 복귀/API/기록 검사, strict-core encoding 통과. 유료 LLM·실결제·운영 DB를 사용하지 않았다.
- `npm run check:fast -- --plan`: critical. 이전 전체 실행은 90개 중87개 통과 뒤 메모리 부족 등으로 실패했다. 해당 정적 가드2개는 수정 후 개별 통과. 이 로컬 전체 실행을 성공으로 보고하지 않는다.
- `npm run check:pre-push`: 서비스 레지스트리56·public 미러·사이트맵1019·llms·SEO 프로필62 통과.
- 전달 CI: `7e301512c6945c0af069cb874953d6e89a1e52a9`의 [CI](https://github.com/rei1237/codedestiny/actions/runs/40044483012)는 `success`. 코드 통합은 다른 세션의 체크아웃을 변경하지 않고 격리 워크트리에서 처리했다. 강제 push·PR 생성 없음.
- 빌드 소스와 전달 CI 소스의 차이는 테스트 변수명·문서·결제 동결 검증 해시의 5개 파일뿐이다. 실행 소스가 동일함을 `evidence/mobile-53-runtime-equivalence.json`으로 확인했다. 테스트의 예약 변수명은 기존 main 수정을 통합했고, 상위 main의 결제 파일 캐시 버전 변경은 공식 해시 갱신 명령으로 반영했다. 결제 검증을 우회하지 않았다.
- 최종 CI의 `CI required`, 타입·린트, 정적 가드, 중요 영역 검사와 Pages/Worker 빌드가 성공했다. `Paid Flow Gates`도 같은 전달 SHA에서 성공했다. 시각 검수는 14장 직접 확인 결과 새 차단 이슈0이며 실제 기기 검증은 남는다.

증거: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316\evidence`. 실제 기기 배경화면 변경은 mock/캡처 검증으로 대체하지 않는다. 공통 오프라인 화면은 기존 정책대로 조작을 막고 재연결 시 복귀한다.

## 유지한 정책과 남은 출시 확인

이 작업에서 이용권·월정석·단건 결제의 가격과 혜택을 새로 정하지 않았다. 통합한 main의 승인된 이용권 v5 정책을 그대로 포함한다. 기존 로그인 API와 서버 계정, 구매 내역, `/records/`와 `/yeongnyangi/library/`의 분리, 저장 결과 재열람을 유지한다. 결제 지연 상태/영수증 연결 및 PurchaseIntent 보존 코드 변경은 요청 범위에 포함된다. 운영 DB 인덱스는 변경하지 않았다.

실출시 전 확인: Android 실기기의 저장·공유·권한·홈/잠금/둘 다 적용, 같은 계정의 웹↔앱 구매 내역과 결과 재열람, 일본 Play 국가·현행SKU23개·JPY 가격·지연 승인/취소, 운영 PurchaseIntent TTL30일 인덱스, Mac Xcode·서명·StoreKit·개인정보/심사 요건. 연결된 adb 기기는 없었다. iOS 신규 구매는 준비 중이며 StoreKit 미구현은 출시 차단 조건이다. 실결제·환불·운영 DB 변경·운영 승격·스토어 업로드는 실행하지 않았다.

## Android 1.0.53 설치 후보

빌드 소스: `c247d4ec353c730841b8b686791fa1b3d533dfdc`. 검증된 main의 이용권 v5/유효기간 정책과 후속 캐릭터 렌더 수정을 통합한 고정 스냅샷이다. APK/AAB 생성, release lint와 signing task가 성공했다. 기존 1.0.52는 통합 전 부적 기능 검수본으로 별도 보존하며 최신 전달본으로 사용하지 않는다.

| 파일 | 크기 | SHA-256 |
| --- | --- | --- |
| codedestiny-1.0.53-c247d4ec3.apk | 461,392,402 bytes / 440.0 MiB | `a2df9df70395fb7f4c8dada0f8967857951a89345b5ff17a026e2f48384ad4a7` |
| codedestiny-1.0.53-c247d4ec3.aab | 461,788,286 bytes / 440.4 MiB | `569cf2c555ebf1d16669c7e04457611d6b19505d9d0b44c0c8e1b356beb384a3` |

저장 위치: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316`. `artifact-manifest-1.0.53.json`, `SHA256SUMS.txt`, `mapping-1.0.53-c247d4ec3.txt`와 검증 로그를 함께 보존했다.

- APK: apksigner v2 검증, `com.codedestiny.app`, versionCode 53 / versionName 1.0.53, minSdk 24 / targetSdk 36 확인.
- AAB: jarsigner `jar verified` 확인. 자체 서명 인증서·타임스탬프 경고는 남으며 Play Console의 업로드 인증서와 대조하지 않았다.
- 두 패키지의 version.json 소스 SHA, 승인 원본 15장의 SHA-256, 부적·상점·구매 내역·일반 기록·영냥이 보관함·인사이트·유명인 사주 7개 경로와 복사본 해시가 일치한다.
- iOS 웹 자산도 같은 소스 SHA/원본 15장과 일치한다. Xcode 컴파일·서명·실기기 성공을 뜻하지 않는다.

53 / 1.0.53은 로컬 후보 번호이며 Play Console의 최신 버전과 대조하지 않았다. AAB 파일 크기는 실제 다운로드 크기와 다르다. 2026-10-24 확인한 [Google Play 크기 기준](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en-GB)은 기본 모듈의 압축 다운로드 크기 500 MB다. 최종 다운로드 크기는 Console 또는 bundletool로 별도 측정하며, 현재 파일 크기만으로 제출 가능 판정을 내리지 않는다. 업로드·심사·운영 배포는 수행하지 않았다.
