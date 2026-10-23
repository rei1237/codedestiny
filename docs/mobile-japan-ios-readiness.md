---
status: in-progress
updated: 2026-10-24
next: Android 앱 번들·기기 검증, iOS Mac 검증과 승인 자산 연결
---

# 일본 결제·Android·iPhone 앱 준비

## 현재 범위

기존 Capacitor 앱, 로그인 API, 서버 사용자 ID를 재사용한다. 가입 계정 병합이나 별도 앱 계정 생성은 하지 않는다. 이용권·월정석·단건 결제 가격표를 바꾸지 않는다. 운영 배포와 스토어 제출은 이 작업에 포함하지 않는다.

| 기능 | 앱 경로·처리 | 검증 경계 |
| --- | --- | --- |
| 사주·타로·자미두수·베다점·숙요점·점성술 | 기존 서비스 레지스트리와 내보낸 웹 페이지 | 기능별 결과까지는 기기 확인 필요 |
| 연이 찻집·네오 전략실 | 기존 셸과 상담 API | 새 유료 LLM 호출 없이 검사 |
| 영냥이 상담 보관함 | /yeongnyangi/library/ | /records/와 별개로 유지 |
| 일반 저장 기록 | /records/ | 재열람 시 새 상담 생성·추가 차감 경로 변경 없음 |
| 구매 내역 | /points/history/ → 기존 /api/payments/me?view=history | 같은 서버 계정의 내역 |
| Android 새 구매 | Google Play → 서버 검증 → 기존 권한 지급 | 실결제·Console 설정은 별도 |
| iPhone 새 구매 | 준비 중 안내, Google Play·웹 PG로 우회하지 않음 | StoreKit 상품·서버 영수증 검증 미구현, 출시 차단 |
| 부적 | /app/talismans/ | 승인 이미지가 없으므로 실제 상품 이미지 준비 중 |

앱 후처리는 웹 결제 화면 /points/와 /premium-unlock/를 제거한다. /points/history/, /insights/, /famous-saju/는 보존한다. 관리자 UI는 기존 정책대로 앱에서 제외한다.

## 일본 Google Play 편의점 현금 결제

Google Play의 일본 지원 결제수단이다. 앱이 편의점 버튼을 직접 만들거나 노출을 보장하지 않는다. 실제 노출은 사용자 국가·Play 계정·상품·Google 결제 화면에 따라 확인해야 한다.

- Android 구매 상태: PURCHASED=1, PENDING=2. 서버 Developer API 구매 상태는 PURCHASED=0이므로 서로 혼동하지 않는다.
- 입금 대기에서는 지급·acknowledge·consume을 실행하지 않는다. 앱 재개, 로그인 변경, Play 구매 갱신 때 서버 검증을 다시 한다.
- Google가 돌려준 cd-intent 식별자를 원래 상담에 연결한다. 같은 가격대의 최신 의도로 추측하지 않는다.
- 기존에 기록된 주문은 임시 의도 만료 뒤에도 같은 소유자의 결제 기록으로 복원한다. 타계정·취소/환불 영수증은 새 권한을 주지 않는다.
- Play가 돌려준 formattedPrice와 통화를 화면에 표시한다. 일본 실판매 가격·세금·정산은 Console 대조 전 미검증이다. 기존 서버 KRW 가격 스냅샷은 일본의 실제 청구액 증거가 아니다.

실출시 전: 일본 테스트 계정, license tester의 지연 승인·지연 취소 수단, 현행 SKU 23개 및 대상 국가·JPY 가격을 확인한다. 실제 현금 결제·환불은 별도 승인이 필요하다. 지급이 보류된 구형 미기록 영수증은 새 구매를 요구하지 않고 주문 검토 대상으로 남긴다.

공식 근거: [일본 Play 결제수단](https://support.google.com/googleplay/answer/9462077?hl=ja), [pending 처리](https://developer.android.com/google/play/billing/integrate#pending).

## 부적과 원본

캐릭터는 영냥이, 연이(꽃돼지) 두 정체성이다. 선택 장면은 영냥이·연꽃 속 연이·찻집의 연이 세 가지다. 학업·재물·연애·연락·취업/합격·평온·행운과 잠금/홈 구성을 구분한다. 최초 시안 3장에 이어 학업·재물·연애·연락·합격 15개 PNG를 직접 파일·해시 검증했다. 14장은 941×1672, contact-flower-pig는 940×1672이며 서로 다른 PNG 15개다. 원본 시각 검토도 수행했지만 실제 기기 적용과 사용자 최종 승인은 아니다. 원래 이미지 채팅에서 영냥이 표정·이미지 안 설명 수정 요청이 이어져 최종 자산 등록은 보류했다. 현 카탈로그의 1440×2560 최소 규격에도 못 미치므로 확대본을 고해상도 원본으로 등록하지 않는다.

승인 후 public/assets/talismans/catalog.json에 다음 데이터를 등록한다.

- id, scene, category, composition, approval=approved
- /assets/talismans/originals/ 아래 PNG 경로
- 실제 width, height, SHA-256. 최소 1440×2560, 최대 4096×8192, 25MP·16MiB 이내

사용자 동작 전에 원본의 크기·PNG 헤더·SHA-256을 검증한다. 모바일 이미지 최적화·중복 제거는 이 원본 경로를 건드리지 않는다. 가이드와 시계는 화면에만 표시하며 저장 원본에 합성하지 않는다.

Android: ACTION_CREATE_DOCUMENT로 사용자가 저장 위치를 선택한다. 공유는 FileProvider + 시스템 chooser, 배경화면은 WallpaperManager의 시스템 선택 화면을 연다. 저장소 전체/사진 읽기 권한이나 자동 적용은 없다. 시스템 화면을 열었다는 결과와 실제 저장 완료를 구분한다.

iPhone: 저장 버튼에서만 사진 추가 권한을 요청하며 PNG 데이터를 그대로 저장한다. 공유는 시스템 공유 화면이다. 설정 → 배경화면 → 새로운 배경화면 추가에서 사용자가 사진을 선택한다. 자동 배경화면 적용 기능은 없다.

## iOS 빌드와 출시 게이트

Windows에서 공식 Capacitor 8.4.1 SPM 프로젝트를 생성했다. 정적 다중 페이지 라우터, 기존 OAuth URL scheme, App/Browser 플러그인, 원본 저장·공유와 언어 연결을 준비했다. 기존 승인 브랜드 아이콘·시작 화면을 재사용한다.

Mac에서 Xcode 26 이상을 준비한 뒤 다음 순서로 확인한다. 유료 멤버십 가입, 약관 동의, 인증서 생성·업로드는 자동 실행하지 않는다.

```sh
npm ci
npm install --prefix apps/mobile --ignore-scripts
npm run build:mobile:app
node scripts/build-ios-brand-assets.mjs
cd apps/mobile
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

실제 iOS 컴파일·서명·실기기·TestFlight·스토어 심사는 미검증이다. StoreKit 구성, Apple 로그인/계정 삭제 심사 요건, 개인정보·전체 privacy manifest, App Store Connect 상품과 계약 상태를 확인하기 전 제출하지 않는다. 일본의 외부 결제 선택지는 별도 계약·고지·수수료 조건이 있으므로 자동 도입하지 않는다.

앱 자체의 UserDefaults 사용에는 PrivacyInfo.xcprivacy의 CA92.1을 선언했다. 전체 SDK/수집 정보 심사는 별도다. Windows의 cap update가 생성한 SPM 로컬 경로는 슬래시로 정규화했으며 Mac에서는 cap sync ios로 다시 생성한다.

공식 근거: [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup), [iOS SPM](https://capacitorjs.com/docs/ios/spm), [Apple 일본 배포 조건](https://developer.apple.com/support/app-distribution-in-japan/).

## 검증 기록

서버 모의 결제 94개, 앱 복귀/API/기록 보존 26개, 승인 카탈로그·원본 검증 8개, iOS CORS 1개 통과. TypeScript와 변경 UI lint 통과. Android :app:compileDebugJavaWithJavac 성공(2m39s, 68 tasks); APK/AAB·실기기 완료를 뜻하지 않는다.

정적 앱 React #418은 앱 헤더에 추가하던 인라인 API 초기화가 원인이었다. 초기화를 외부 브릿지로 옮긴 뒤 실제 Next 출력+수정 후처리의 부적·상점 두 화면에서 pageerror 0을 확인했다. 전체 앱 재생성과 산출물 검증은 진행 중이다.

check:fast 전체 실행은 90개 중 87개 통과 뒤 메모리 부족 등으로 실패했다. 두 정적 가드 문제는 수정 후 개별 통과했지만 전체 Jest/전체 게이트 통과로 보고하지 않는다. 원격 main a62384f3057afa885375feb1b9aac5fa35c821c7의 CI required·Static guards·paid-flow-gates 실패를 확인하여 그 위로 병합·push하지 않았다.

남은 확인: 부적 시안 사용자 승인, 실제 PNG 저장·공유 취소·권한 거부·배경화면 선택, 일본 Play 계정/상품, 같은 계정의 웹↔Android↔iPhone 구매 내역과 보관함 재열람, Mac iOS 빌드와 StoreKit.
