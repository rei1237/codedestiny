# Code Destiny Android Release

## 현재 구조

- 방식: Capacitor Android WebView 래퍼
- 웹 산출물: `dist`
- Android 프로젝트: `apps/mobile/android`
- 주요 설정:
  - `apps/mobile/capacitor.config.ts`
  - `apps/mobile/android/app/build.gradle`
  - `apps/mobile/android/variables.gradle`
  - `apps/mobile/android/app/src/main/AndroidManifest.xml`

## 환경 확인

PowerShell에서 실행합니다. `npm.ps1` 실행 정책 오류를 피하려면 `npm.cmd`를 사용합니다.

```powershell
java -version
javac -version
keytool -help
adb version
sdkmanager --list
node -v
npm.cmd -v
cd apps\mobile\android
.\gradlew.bat -v
```

현재 PC처럼 PATH에 JDK/SDK가 없으면 이 방식으로 임시 설정 후 실행합니다.

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

점검 스크립트:

```powershell
.\scripts\android-release-check.ps1
.\scripts\android-release-check.ps1 -RequireSigning
```

## 최초 1회 설정

`apps/mobile/android/local.properties`가 없으면 생성합니다.

```properties
sdk.dir=C\:/Users/user/AppData/Local/Android/Sdk
```

Android SDK Command-line Tools가 없으면 Android Studio에서 설치합니다.

1. Android Studio 실행
2. Settings
3. Languages & Frameworks
4. Android SDK
5. SDK Tools
6. Android SDK Command-line Tools 설치

라이선스 동의가 필요하면 실행합니다.

```powershell
sdkmanager --licenses
```

## Upload Keystore

기존 upload keystore가 있으면 새로 만들지 말고 그대로 사용합니다.

기존 keystore가 없으면 프로젝트 밖에 생성합니다. 비밀번호는 명령 실행 중 직접 입력합니다.

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\Documents\CodeDestinyKeys"
& "C:\Program Files\Java\jdk-21.0.11\bin\keytool.exe" -genkeypair -v -keystore "$env:USERPROFILE\Documents\CodeDestinyKeys\upload-keystore.jks" -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

## Signing Properties

예시 파일을 복사합니다.

```powershell
Copy-Item apps\mobile\android\release-signing.example.properties apps\mobile\android\release-signing.properties
notepad apps\mobile\android\release-signing.properties
```

입력 항목:

```properties
CODE_DESTINY_ANDROID_VERSION_CODE=1
CODE_DESTINY_ANDROID_VERSION_NAME=1.0.0
CODE_DESTINY_ANDROID_KEYSTORE_FILE=C:\\Users\\your-name\\Documents\\CodeDestinyKeys\\upload-keystore.jks
CODE_DESTINY_ANDROID_KEYSTORE_PASSWORD=your-store-password
CODE_DESTINY_ANDROID_KEY_ALIAS=upload
CODE_DESTINY_ANDROID_KEY_PASSWORD=your-key-password
```

`release-signing.properties`, `.jks`, `.keystore`, `.p12`, `.env`, `local.properties`, `.aab`, `.apk`는 Git에 커밋하지 않습니다.

## 모바일 동기화

```powershell
npm.cmd install
npm.cmd run mobile:android:sync
```

Capacitor 명령만 다시 실행해야 할 때:

```powershell
npx cap sync android
```

## Debug APK

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
cd apps\mobile\android
.\gradlew.bat assembleDebug
```

생성 위치:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Release AAB

Google Play 업로드용입니다. `release-signing.properties`가 없거나 keystore가 없으면 실패합니다.

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
cd apps\mobile\android
.\gradlew.bat bundleRelease
```

생성 위치:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## Release APK

기기 설치 테스트용입니다. Play Console 업로드는 `.aab`를 사용합니다.

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
cd apps\mobile\android
.\gradlew.bat assembleRelease
```

생성 위치:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## Signing 확인

```powershell
cd apps\mobile\android
.\gradlew.bat signingReport
```

## 기기 설치 테스트

기기 또는 에뮬레이터가 연결되어 있을 때 실행합니다.

```powershell
adb devices
adb install -r apps\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

앱에서 확인합니다.

- 첫 화면 또는 `/app` 시작 화면이 열린다.
- 스크롤이 자연스럽게 동작한다.
- 로그인 세션이 유지된다.
- 프로필 정보가 계정별로 꼬이지 않는다.
- 결제 화면 진입이 가능하다.
- 코인 결제 문구나 오래된 결제 정책이 보이지 않는다.
- 운명의 찻집, 네오의 팩폭 운명 전략실, 사주, 타로, 숙요점, 베다점, 점성술 진입이 가능하다.
- 뒤로가기 버튼이 자연스럽게 동작한다.
- 네트워크 오류, 로그인 만료, 결제 실패 메시지가 이해 가능하게 표시된다.

## 버전 올리기

`apps/mobile/android/release-signing.properties`에서 수정합니다.

```properties
CODE_DESTINY_ANDROID_VERSION_CODE=2
CODE_DESTINY_ANDROID_VERSION_NAME=1.0.1
```

Google Play에 새 파일을 올릴 때마다 `VERSION_CODE`는 반드시 이전 업로드보다 커야 합니다.

## Google Play 업로드 전 체크리스트

- `applicationId`: `com.codedestiny.app`
- 앱 이름: `Code Destiny`
- `minSdk`: 24
- `targetSdk`: 36
- `compileSdk`: 36
- 직접 선언 권한: `android.permission.INTERNET`
- APK 병합 권한: Google Play Billing과 Capacitor/AndroidX 종속 권한이 추가될 수 있음
- release 빌드가 debug signing으로 대체되지 않는다.
- `app-release.aab`가 생성되어 있다.
- `.jks`, `.keystore`, `.p12`, `release-signing.properties`, `.env`, `local.properties`가 Git에 없다.
- 내부 테스트 트랙에서 로그인, 결제, 주요 기능 진입을 실제 기기로 확인한다.

## 자주 나는 오류

SDK 경로 오류:

```powershell
notepad apps\mobile\android\local.properties
```

`sdk.dir`가 실제 Android SDK 경로인지 확인합니다.

JAVA_HOME 오류:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
```

`npm.ps1` 실행 정책 오류:

```powershell
npm.cmd install
npm.cmd run mobile:android:sync
```

Gradle daemon 오류:

```powershell
cd apps\mobile\android
.\gradlew.bat --stop
.\gradlew.bat assembleDebug
```

signingConfig 오류:

```powershell
Copy-Item apps\mobile\android\release-signing.example.properties apps\mobile\android\release-signing.properties
notepad apps\mobile\android\release-signing.properties
```

minSdk/targetSdk 오류:

```powershell
sdkmanager "platforms;android-36" "build-tools;35.0.0" "platform-tools"
```

WebView 로그인/결제 오류:

- 외부 인증 또는 PG 콜백 도메인이 `https://code-destiny.com/`로 돌아오는지 확인합니다.
- 앱 딥링크는 `com.codedestiny.app://auth`를 사용합니다.
- 쿠키와 세션이 초기화되면 앱 데이터 삭제 후 다시 로그인합니다.
