# Code Destiny Android — R8 keep 규칙.
#
# 이 앱은 Capacitor 셸이다. 네이티브 코드는 MainActivity 와 CodeDestinyBillingPlugin
# 둘뿐이고, 사주/타로/나크샤트라 계산은 전부 WebView 안의 JS 와 Cloudflare Worker 가
# 수행한다 — 그래서 리플렉션 직렬화 모델을 keep 할 대상이 없다.
#
# Capacitor 는 consumerProguardFiles 로 @CapacitorPlugin 클래스 / Plugin 서브클래스 /
# Cordova 플러그인을 이미 보호한다(node_modules/@capacitor/android/capacitor/build.gradle).
# 여기에는 그것으로 덮이지 않는 것만 적는다.

# ── 크래시 스택 가독성 (Play Console 역난독화) ──
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── 런타임 리플렉션 대상 어노테이션 보존 ──
# Capacitor 의 PluginHandle 이 @CapacitorPlugin / @PluginMethod 를 런타임에 읽어
# 플러그인을 등록한다. 어노테이션이 지워지면 플러그인이 하나도 잡히지 않는다.
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ── 어노테이션 클래스 자체도 keep (vc41 크래시의 근본원인, 2026-09-01) ──
# -keepattributes 만으로는 부족하다: 어노테이션 "클래스"가 keep 루트가 아니면 R8 이
# getAnnotation(CapacitorPlugin.class) 를 항상-null 로 추론해 Plugin.getPermissionStates
# 본문을 통째로 `throw null` 로 접는다(vc41 dexdump 실측 — dex 에는 어노테이션 데이터가
# 남아 있는데 코드만 null 가정으로 최적화돼, 릴리스에서만 setEnabled 가 즉사했다).
# getPermissionState / requestPermissionForAlias 등 권한 모델 전체가 이 클래스들에 걸린다.
-keep class com.getcapacitor.annotation.** { *; }

# ── WebView JS 브릿지 (최우선) ──
# com.getcapacitor.MessageHandler 의 @JavascriptInterface postMessage 가 JS↔네이티브
# 통신 전부다. Capacitor consumer 규칙은 Plugin 서브클래스만 덮으므로 여기서 보호한다.
# 이게 빠지면 앱의 모든 기능이 죽는다.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Google Play Billing ──
# billing AAR 도 consumer 규칙을 싣지만, 결제는 장애 파급이 가장 큰 영역이라 이중 방어한다.
-keep class com.android.billingclient.** { *; }

# ── 커스텀 Capacitor 플러그인 ──
# Capacitor consumer 규칙과 중복이나, 결제 경로라 명시적으로 남긴다.
# @PluginMethod 이름(purchase/consume/acknowledge/queryProducts/restore)이 그대로
# 살아 있어야 JS 쪽 호출이 붙는다.
-keep class com.codedestiny.app.CodeDestinyBillingPlugin { *; }
# 앱 이탈 차단(shouldOverrideLoad)의 마지막 지점. Bridge 가 플러그인 인스턴스를 순회하며
# 이 메서드를 호출하므로, 지워지면 로그인이 다시 외부 브라우저로 새어 나간다.
-keep class com.codedestiny.app.CodeDestinyNavigationPlugin { *; }
# 셸 applyTheme 의 StatusBar.setStyle 호환 구현. @PluginMethod 이름(setStyle)이 살아
# 있어야 네오 전환 시 상태바 아이콘이 뒤집힌다.
-keep class com.codedestiny.app.CodeDestinyStatusBarPlugin { *; }
# 잠금화면 브리지. @PluginMethod 이름(getState/setState/setEnabled/scheduleAlarms/dismiss/
# requestOverlayPermission)이 살아 있어야 /lock-screen-fortune 설정 UI 와 동의 모달이 붙는다.
-keep class com.codedestiny.app.CodeDestinyLockScreenPlugin { *; }
# Zero-Tap Sign-In 브리지. @PluginMethod 이름(isAvailable/create/restore/clear)이 살아 있어야
# window.CodeDestinyNative.credentials 가 붙는다. androidx.credentials 자체는 리플렉션이 없어 keep 불필요.
-keep class com.codedestiny.app.CodeDestinyCredentialsPlugin { *; }
