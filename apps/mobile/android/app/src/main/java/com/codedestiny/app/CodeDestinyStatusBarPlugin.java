package com.codedestiny.app;

import android.app.Activity;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * @capacitor/status-bar 의 setStyle 호환 미니 구현.
 *
 * 셸의 연이/네오 토글(applyTheme)은 이미 Capacitor.Plugins.StatusBar.setStyle 을 방어적으로
 * 호출하고 있다 — 그런데 공식 플러그인이 설치돼 있지 않아 조용히 스킵됐고, 그 결과 네오(다크)
 * 모드에서 상태바 아이콘이 MainActivity 기본값(다크 아이콘) 그대로 남아 보이지 않았다.
 * 공식 패키지를 설치하면 package-lock.json 이 바뀌므로(수정 금지 정책), 셸이 부르는 이름과
 * 시그니처 그대로를 네이티브에서 직접 제공한다. 셸 6미러는 한 글자도 바꾸지 않는다.
 *
 * 의미는 공식 플러그인과 동일하다:
 *   style "DARK"  = 다크 배경용 → 밝은 아이콘 (네오)
 *   style "LIGHT" = 밝은 배경용 → 어두운 아이콘 (연이)
 *
 * 하단 시스템 내비게이션 바도 함께 뒤집는다 — edge-to-edge 라 3버튼 내비 기기에서
 * 상태바와 같은 가시성 문제가 그대로 생기기 때문이다.
 *
 * ⚠️ 훗날 공식 @capacitor/status-bar 를 설치하게 되면 플러그인 이름("StatusBar")이 충돌한다.
 *    그때는 이 파일과 MainActivity 의 registerPlugin 을 함께 제거할 것.
 */
@CapacitorPlugin(name = "StatusBar")
public class CodeDestinyStatusBarPlugin extends Plugin {

    @PluginMethod
    public void setStyle(PluginCall call) {
        String style = call.getString("style", "LIGHT");
        // DARK(다크 배경) = appearanceLight false(밝은 아이콘). 그 외(LIGHT/DEFAULT)는 연이 기본.
        boolean lightBars = !"DARK".equalsIgnoreCase(style);

        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                Window window = activity.getWindow();
                WindowInsetsControllerCompat controller =
                        WindowCompat.getInsetsController(window, window.getDecorView());
                controller.setAppearanceLightStatusBars(lightBars);
                controller.setAppearanceLightNavigationBars(lightBars);
            } catch (Exception ignored) {
                // 시스템 바 외형은 장식이다 — 실패해도 앱 동작을 막지 않는다.
            }
            call.resolve();
        });
    }
}
