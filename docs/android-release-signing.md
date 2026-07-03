# Code Destiny Android Release Signing

## upload keystore

upload keystore는 Google Play Console에 올릴 Android release 빌드를 서명하는 개인 키 파일입니다.

권장 위치:

```text
C:/Users/user/Documents/CodeDestinyKeys/upload-keystore.jks
```

이미 같은 `applicationId`로 Google Play에 업로드한 적이 있다면 새 keystore를 만들지 말고 기존 upload keystore를 사용해야 합니다.

## 새 keystore 생성

새 앱이거나 아직 Google Play에 업로드 전인 경우에만 실행합니다.

```powershell
cd "C:\Users\user\Downloads\codedestiny-main\apps\mobile\android"

$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:Path="$env:JAVA_HOME\bin;$env:Path"

$KEY_DIR="$env:USERPROFILE\Documents\CodeDestinyKeys"
New-Item -ItemType Directory -Force $KEY_DIR | Out-Null

$keytool="$env:JAVA_HOME\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
  $keytool="keytool.exe"
}

if (Test-Path "$KEY_DIR\upload-keystore.jks") {
  Write-Host "기존 upload-keystore.jks가 이미 있습니다. 덮어쓰지 않습니다."
} else {
  & $keytool `
    -genkeypair -v `
    -keystore "$KEY_DIR\upload-keystore.jks" `
    -storetype JKS `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -alias upload
}
```

입력값:

- keystore password: 직접 정한 비밀번호
- re-enter password: 같은 비밀번호
- first and last name: `Code Destiny`
- organizational unit: `Code Destiny`
- organization: `Code Destiny`
- city/locality: `Seoul`
- state/province: `Seoul`
- country code: `KR`
- correct?: `yes`
- key password for `<upload>`: Enter

비밀번호는 본인이 직접 안전하게 보관합니다. Git, 문서, 채팅, README에 남기지 않습니다.

## 생성 확인

```powershell
Test-Path "$env:USERPROFILE\Documents\CodeDestinyKeys\upload-keystore.jks"
```

`True`가 나와야 합니다.

## release-signing.properties

파일 위치:

```text
apps/mobile/android/release-signing.properties
```

형식:

```properties
CODE_DESTINY_ANDROID_VERSION_CODE=2
CODE_DESTINY_ANDROID_VERSION_NAME=1.0.1

CODE_DESTINY_ANDROID_KEYSTORE_FILE=C:/Users/user/Documents/CodeDestinyKeys/upload-keystore.jks
CODE_DESTINY_ANDROID_KEYSTORE_PASSWORD=ENTER_PASSWORD_HERE
CODE_DESTINY_ANDROID_KEY_ALIAS=upload
CODE_DESTINY_ANDROID_KEY_PASSWORD=ENTER_PASSWORD_HERE
```

`ENTER_PASSWORD_HERE` 두 곳을 직접 입력한 비밀번호로 바꿉니다. key password에서 Enter를 눌렀다면 두 비밀번호는 같습니다.

## Git 금지 파일

절대 Git에 올리지 않습니다.

```text
apps/mobile/android/release-signing.properties
*.jks
*.keystore
local.properties
.env
.env.local
```

확인:

```powershell
git status --short
git check-ignore -v apps/mobile/android/release-signing.properties
git check-ignore -v "$env:USERPROFILE\Documents\CodeDestinyKeys\upload-keystore.jks"
```

Git 추적 대상으로 보이면 파일 삭제가 아니라 추적만 해제합니다.

```powershell
git rm --cached apps/mobile/android/release-signing.properties
git rm --cached "*.jks"
```

## signingReport

```powershell
cd "C:\Users\user\Downloads\codedestiny-main\apps\mobile\android"

$env:JAVA_HOME="C:\Program Files\Java\jdk-21.0.11"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:Path="$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

.\gradlew.bat signingReport
```

목표:

```text
Variant: release
Config: release
Store: C:\Users\user\Documents\CodeDestinyKeys\upload-keystore.jks
Alias: upload
```

## release AAB 생성

```powershell
cd "C:\Users\user\Downloads\codedestiny-main"
npm.cmd run mobile:android:sync

cd "C:\Users\user\Downloads\codedestiny-main\apps\mobile\android"
.\gradlew.bat bundleRelease
Get-ChildItem .\app\build\outputs\bundle\release\*.aab
```

생성 위치:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## release APK 생성

```powershell
cd "C:\Users\user\Downloads\codedestiny-main\apps\mobile\android"
.\gradlew.bat assembleRelease
Get-ChildItem .\app\build\outputs\apk\release\*.apk
```

## Google Play 내부 테스트 전 체크리스트

- `app-release.aab`가 생성되었다.
- `versionCode`가 이전 Play Console 업로드보다 크다.
- `.jks`와 `release-signing.properties`를 백업했다.
- `.jks`, `release-signing.properties`, `.env.local`이 Git에 없다.
- 내부 테스트 트랙에 업로드했다.
- 실제 Android 기기에서 로그인, 결제 진입, 주요 기능 진입을 확인했다.

## 다음 배포

다음 업로드 전 반드시 증가:

```properties
CODE_DESTINY_ANDROID_VERSION_CODE=3
CODE_DESTINY_ANDROID_VERSION_NAME=1.0.2
```
