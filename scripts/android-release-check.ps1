param(
    [switch]$RequireSigning
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $root "apps/mobile/android"
$localProperties = Join-Path $androidDir "local.properties"
$signingProperties = Join-Path $androidDir "release-signing.properties"

function Write-Ok($message) {
    Write-Host "[OK] $message"
}

function Write-WarnLine($message) {
    Write-Host "[WARN] $message"
}

function Write-FailLine($message) {
    Write-Host "[FAIL] $message"
    $script:failed = $true
}

function Find-JavaHome {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin/java.exe"))) {
        return $env:JAVA_HOME
    }

    $java = Get-ChildItem -Path "C:\Program Files\Java" -Directory -Filter "jdk*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if ($java) {
        return $java.FullName
    }

    return $null
}

function Find-AndroidSdk {
    $candidates = @(
        $env:ANDROID_HOME,
        $env:ANDROID_SDK_ROOT,
        (Join-Path $env:LOCALAPPDATA "Android/Sdk")
    ) | Where-Object { $_ }

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    return $null
}

$failed = $false
$javaHome = Find-JavaHome
$androidSdk = Find-AndroidSdk

if ($javaHome) {
    Write-Ok "JDK found: $javaHome"
    & (Join-Path $javaHome "bin/java.exe") -version
    & (Join-Path $javaHome "bin/javac.exe") -version
} else {
    Write-FailLine "JDK not found. Set JAVA_HOME to a JDK 21 path."
}

if ($androidSdk) {
    Write-Ok "Android SDK found: $androidSdk"
} else {
    Write-FailLine "Android SDK not found. Install it with Android Studio, then set ANDROID_HOME."
}

if ($androidSdk) {
    $adb = Join-Path $androidSdk "platform-tools/adb.exe"
    $sdkManager = Join-Path $androidSdk "cmdline-tools/latest/bin/sdkmanager.bat"
    $platform36 = Join-Path $androidSdk "platforms/android-36"
    $platform361 = Join-Path $androidSdk "platforms/android-36.1"
    $buildTools = Join-Path $androidSdk "build-tools"

    if (Test-Path $adb) {
        Write-Ok "adb found"
        & $adb version
    } else {
        Write-FailLine "adb not found. Install Android SDK Platform-Tools."
    }

    if (Test-Path $sdkManager) {
        Write-Ok "sdkmanager found"
    } else {
        Write-WarnLine "sdkmanager not found. Install Android SDK Command-line Tools in Android Studio SDK Manager."
    }

    if ((Test-Path $platform36) -or (Test-Path $platform361)) {
        Write-Ok "Android API 36 platform found"
    } else {
        Write-FailLine "Android API 36 platform not found. Install platform android-36 or android-36.1."
    }

    if ((Test-Path $buildTools) -and (Get-ChildItem -Path $buildTools -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "35.*" -or $_.Name -like "36.*" -or $_.Name -like "37.*" })) {
        Write-Ok "Android Build Tools found"
    } else {
        Write-FailLine "Android Build Tools 35+ not found."
    }
}

if (Test-Path $localProperties) {
    Write-Ok "local.properties found"
} else {
    Write-WarnLine "local.properties not found. Create apps/mobile/android/local.properties with sdk.dir."
}

if (Test-Path $signingProperties) {
    Write-Ok "release-signing.properties found"
} elseif ($RequireSigning) {
    Write-FailLine "release-signing.properties not found. Copy apps/mobile/android/release-signing.example.properties and fill it."
} else {
    Write-WarnLine "release-signing.properties not found. Release .aab cannot be signed until this exists."
}

if (Test-Path (Join-Path $androidDir "gradlew.bat")) {
    Write-Ok "Gradle wrapper found"
} else {
    Write-FailLine "Gradle wrapper missing at apps/mobile/android/gradlew.bat"
}

$googleServicesJson = Join-Path $androidDir "app/google-services.json"
if (Test-Path $googleServicesJson) {
    Write-Ok "google-services.json found (FCM push notifications enabled)"
} else {
    Write-WarnLine "google-services.json not found. Build still works; FCM push notifications stay disabled until this file is added."
}

if ($failed) {
    exit 1
}

Write-Ok "Android release environment check completed"
