---
status: blocked
updated: 2026-10-24
next: main a62384f3의 기존 CI 실패 해소를 확인하고 이 작업의 검증 결과를 따라 통합한다.
---

# 일본 Android · iOS · 부적 앱 준비 인수인계

작업 폴더: `D:\Development\code-destiny\.codex-worktrees\mobile-japan-ios-20261024-033316`
브랜치: `wt/mobile-japan-ios-20261024-033316`
현재 코드 커밋: `32bdae18207a0ca2fdf56802e3fc85ef1aadf97e` (v2 기능 뒤 일본어 초기 렌더 수정 포함)
선행 커밋: `803f7d8f43376853abc8b0f781a3570d5dec8eae` 원래 주문에 지연 영수증 연결, `7a4caad1ce9bb890e9c4c47cd57339812bebbda4` 모바일·부적·iOS 준비.
푸시/병합/운영 배포/스토어 업로드: 수행하지 않음.

## 전달 차단 근거

읽기 전용 fetch로 확인한 origin/main은 `a62384f3057afa885375feb1b9aac5fa35c821c7`이다. [PR CI](https://github.com/rei1237/codedestiny/actions/runs/40014072839)의 CI required/Static guards와 [Paid Flow Gates](https://github.com/rei1237/codedestiny/actions/runs/40014072785)가 실패했다. Static guards 로그는 `scripts/verify-sukuyo-reading-house.mjs:58`에서 보이지 않는 `.cdh-honey__details summary` 클릭 대기 시간 초과다. 이 작업이 원격에 올라가기 전 발생한 실패이며 다른 변경의 실패 위로 push하지 않는 저장소 규칙을 따른다.

main 체크아웃에는 다른 세션의 미커밋 홈·네오 변경이 있다. 다른 세션 작업, 메인 node_modules, 외부 워크트리를 reset/stash/삭제하지 않는다. 이 워크트리와 node_modules 정션은 전달 완료 전 보존한다.

## 구현 범위

- 일본 Play 입금 대기 상태에서는 지급/소비하지 않고 재개·로그인·구매 갱신 후 서버 확인. 같은 가격의 최신 상담으로 추측하지 않고 원래 intent/기존 Payment 소유자를 확인한다.
- 이용권·월정석·단건 결제 가격/정책 유지. PurchaseIntent 보존 기간은 24시간→30일 코드 변경이며 운영 MongoDB TTL 인덱스 변경은 실행하지 않았다.
- 동일 서버 계정/기존 권한과 구매 내역 경로 유지. `/records/`와 `/yeongnyangi/library/` 분리 유지. 신규 계정 생성·자동 병합·재구매·재열람 LLM 호출을 추가하지 않음.
- 웹 결제 화면만 앱에서 제외하고 `/points/history/`, `/insights/`, `/insights/famous-saju/` 보존. iOS 신규 구매는 준비 중, Google Play/웹 PG 우회 없음.
- 부적은 영냥이와 연이(꽃돼지)의 3장면, 학업·재물·연애·연락·취업/합격의 승인 v2 15장. 원본 저장과 맞춤 PNG를 구분하며 Android 홈/잠금/둘 다 직접 적용·시스템 선택, iOS 사진 저장 후 대상별 수동 설정을 안내한다.
- iOS 공식 Capacitor SPM 골격·라우터·언어·사진 추가·공유·UserDefaults privacy reason CA92.1 준비. Mac에서 컴파일/서명/전체 개인정보 검토 필요, StoreKit 미구현.
- 정적 앱의 React #418 원인은 주입된 인라인 API 초기화. 기존 외부 브릿지에 초기화하여 React head 인라인 순서를 보존. 실제 Next 출력+수정 후처리의 부적/상점 pageerror 0 확인.

## 자산 경계

사용자는 v2 15장과 실제 홈·잠금 배경화면 설정 흐름을 승인했다. 출처는 `C:\Users\user\Documents\Codex\2026-10-24\x20-2\outputs\talismans-v2` 및 `talisman-collection-v2-manifest.json`이다. `public/assets/talismans/originals/`에 바이트 그대로 연결했고 승인 카탈로그에 15개를 등록했다. 14장 941×1672, contact-flower-pig 940×1672이며 실제 파일/해시 일치를 확인했다. 시각 담당은 15개 원본의 한글 제목·키워드와 부드러워진 영냥이 표정을 확인했다.

원본 저장은 무변형, 적용·맞춤 저장·공유는 전체 원본에 여백을 더한 별도 PNG다. 미리보기와 캔버스는 같은 계산을 사용하고 크롭·늘이기·아트 확대를 하지 않는다. 홈/잠금/둘 다를 선택하고 크기·위치를 조절한다. Android는 명시적 적용 동작과 WallpaperManager의 성공 ID 반환을 구분하며 시스템 chooser 복귀만으로 성공을 표시하지 않는다. iOS는 사진 저장≠배경화면 적용이며 수동 설정을 안내한다. 이미지 속 문구는 한국어다. 실제 기기의 아이콘·시계·하단 문구 간섭은 미검증이다.

## 검증

통과: 모의 서버 결제94, 앱 복귀/API/콘텐츠/인라인 순서26(후속 메뉴 검사1개 추가), 최신 v2 원본/맞춤/메뉴22, iOS CORS1, TypeScript, UI ESLint 오류0·경고6, 플러그인 등록. 이전 앱 PortOne/기능 대응52경로·7그룹·16행동·15마커 검사는 통과했으며 최신 전체 `build:mobile:app`도 통과했다. Next 1843페이지, 앱 HTML1850개 가드·기록/읽기 경로 보존 검사를 통과했다.

Android `gradlew.bat :app:compileDebugJavaWithJavac --no-daemon --max-workers=1 -Dorg.gradle.jvmargs=-Xmx1536m`: 최신 BUILD SUCCESSFUL (24s, 68 tasks). 컴파일 성공은 APK/AAB/실기기 기능 완료가 아니다.

`npm run check:fast -- --plan` critical. 전체 실행은90개 중87개 통과 후 메모리 부족/정적 가드 오류. 정적 가드2개는 수정 후 개별 통과했지만 전체 Jest/paid gate 통과로 보고하지 않는다. 이전 전체 빌드는 Next1843/후처리/최적화까지 완료했으나 실제 경로와 어긋난 검증기5개가 실패했다. 현재 /insights/famous-saju/, /saju/, 앱 내 정보 메뉴를 기준으로 검사하도록 수정했다. v2 최종 앱 빌드·산출물 검사는 통과했다. Android/iOS `cap sync`도 완료했고 Windows가 재생성한 Swift 백슬래시 경로는 검증된 슬래시 설정으로 복원했다.

최신 UI 6조건(ko360/390/430 Android 모의, ko1280 웹, ja390 Android 모의, ko390 iOS 모의) 모두 넘침/pageerror/44px 미만 조작 0개. 15장 선택·해시, 맞춤 크기, 홈/잠금/둘 다 전달, 원본 저장, 시스템 선택 복귀, 취소·미지원·사진 권한 안내 통과. 시각 담당은 제한된 ship, blocker0. 공통 오프라인 화면이 조작을 막으며 재연결 시 복귀하는 기존 정책을 유지한다.

실행하지 않은 운영 검증: 실결제/환불·일본 Console/JPY 상품·실계정 재설치/구매복원·기기 저장/공유/권한·iOS Xcode/서명/StoreKit·Play/TestFlight 업로드. Windows에 연결된 adb 기기는 없었음.

## 재개 순서

1. 현재 main CI가 다른 변경 때문에 빨간지 다시 한 번 확인한다. 여전히 실패면 push하지 않고 원인 담당 변경을 보고한다.
2. 이 워크트리의 마지막 커밋/상태와 아래 최종 검증 결과를 확인한다. 필요한 전체 게이트는 충분한 메모리에서 한 개씩 실행한다.
3. 승인 v2 15장 연결은 완료했다. Android 실제 기기 적용/권한/취소 및 iOS Mac·사진 추가·수동 설정을 확인한다. 같은 계정의 구매 내역과 상담 보관함도 실기기에서 확인한다.
4. main이 복구되고 다른 세션과 충돌하지 않는 시점에 main으로 통합, `npm run check:pre-push`, push, 최종 CI 한 번 확인. 운영 배포·스토어 업로드·실결제는 별도 권한 경계다.
5. 전달이 완료된 뒤에만 본 문서를 done으로 닫고 자신의 정션/워크트리/임시 파일을 정리한다.



## 실행 명령과 증거

- `npm run test:jest -- __tests__/worker/app-store.google-billing.test.js`: 94 passed.
- `node --test __tests__/ui/talisman-catalog.test.js __tests__/ui/talisman-wallpaper-fit.test.js __tests__/release/mobile-account-content.test.js`: 22 passed.
- `node --test __tests__/ui/app-shell-locale-hydration.test.js`: 1 passed. 일본어 상점은 정적 한국어와 초기 렌더를 맞춘 뒤 즉시 선택 언어를 반영하고 언어 변경 이벤트도 처리한다.
- `npm run typecheck`: 통과(최종 부적·native 연결 소스). 후속 언어 수정은 hook 회귀 검사와 해당 파일 ESLint 통과.
- `npx eslint app/app/talismans/TalismanStudio.tsx app/app/talismans/catalog.ts app/app/talismans/wallpaper-fit.ts`: 오류0, 기존 다중 페이지 링크/원본 img 경고6.
- `npm run build:mobile:app`: 최종 32bdae18207a0ca2fdf56802e3fc85ef1aadf97e 산출물 통과. 일본어 상점 초기 문구 불일치를 수정한 뒤 한국어/일본어 상점 모두 pageerror0, 신규 구매 차단·구매내역 링크를 확인했다. 부적6조건도 최종 산출물에서 다시 통과했다.
- `npx cap sync android`, `npx cap sync ios`: 최종 32bdae182 산출물로 두 플랫폼 동기화 통과. iOS 동기화는 Xcode 컴파일을 뜻하지 않는다.
- `gradlew.bat :app:compileDebugJavaWithJavac`: 최신 Java 코드 24초 BUILD SUCCESSFUL.
- `npm run verify:entry-encoding -- --strict-core`: 통과.

증거 보존 위치: `D:\Development\code-destiny\output\mobile-japan-ios-20261024-033316\evidence`. 승인 v2 원본→앱 15개 해시·해상도는 `talismans-v2-source-evidence.json`에 기록했다. 캡처의 시각 검토와 native 모의 검사는 실제 기기의 배경화면 변경 증거가 아니다.

전달 직전 한 번 다시 확인한 origin/main은 a62384f3057afa885375feb1b9aac5fa35c821c7이며 [CI required](https://github.com/rei1237/codedestiny/actions/runs/40014072839/job/120626899788)가 여전히 failure다. 이 작업의 변경은 아직 원격에 없다. 병합·push·공식 CI·배포 완료로 표시하지 않는다.

실출시 전에 운영 PurchaseIntent TTL 인덱스가 30일 설정과 일치하는지 승인된 운영 절차로 확인해야 한다. 모델 코드 수정만으로 기존 운영 인덱스의 변경을 증명하지 않는다.


## Android 설치 후보

최종 소스 32bdae18207a0ca2fdf56802e3fc85ef1aadf97e로 APK/AAB 생성 중이다. 로컬 후보 버전은 versionCode 52 / versionName 1.0.52이며 기존 서명 설정을 사용한다. Play Console의 최신 버전 번호·앱 서명과 대조한 번호는 아니므로 제출 가능 판정으로 쓰지 않는다. 앱 삭제나 데이터 초기화를 통한 설치 우회는 하지 않았다.

앱의 원시 웹 자산은 약 738.8MiB/11641파일이다. 실제 다운로드 크기는 로컬 AAB 파일 크기와 다르며 Console 또는 bundletool에서 별도 측정해야 한다. [Google Play 공식 크기 기준](https://support.google.com/googleplay/android-developer/answer/9859372?hl=en-GB)은 압축 다운로드 기준으로 base module 500MB다. 현재 작업에서는 Console 업로드·심사를 수행하지 않았다.
