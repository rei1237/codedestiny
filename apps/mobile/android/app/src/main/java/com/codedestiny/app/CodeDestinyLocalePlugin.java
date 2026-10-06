package com.codedestiny.app;

import android.content.Context;
import android.content.res.Configuration;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.app.LocaleManagerCompat;
import androidx.core.os.LocaleListCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** One native preference for both Activities and the existing web language pickers. */
@CapacitorPlugin(name = "CodeDestinyLocale")
public class CodeDestinyLocalePlugin extends Plugin {
    private static final String PREFS = "cd_app_locale";

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!prefs.getBoolean("initialized", false)) {
                String previous = AppLocalePolicy.normalize(call.getString("language", ""));
                // An OS choice always wins. Import an existing explicit web choice just once.
                if (AppCompatDelegate.getApplicationLocales().isEmpty() && !previous.isEmpty()) {
                    AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(previous));
                }
                prefs.edit().putBoolean("initialized", true).apply();
            }
            call.resolve(snapshot());
        });
    }

    @PluginMethod
    public void setLanguage(PluginCall call) {
        String language = AppLocalePolicy.normalize(call.getString("language", ""));
        if (language.isEmpty()) { call.reject("Unsupported app language"); return; }
        getActivity().runOnUiThread(() -> {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(language));
            call.resolve(snapshot());
        });
    }

    private JSObject snapshot() {
        LocaleListCompat selected = AppCompatDelegate.getApplicationLocales();
        LocaleListCompat effective = selected.isEmpty() ? LocaleManagerCompat.getSystemLocales(getContext()) : selected;
        String language = "";
        for (int i = 0; i < effective.size() && language.isEmpty(); i++) {
            language = AppLocalePolicy.normalize(effective.get(i).toLanguageTag());
        }
        JSObject result = new JSObject();
        result.put("language", language.isEmpty() ? "ko" : language);
        result.put("followsSystem", selected.isEmpty());
        return result;
    }

    @Override protected void handleOnConfigurationChanged(Configuration config) {
        notifyListeners("languageChanged", snapshot());
    }

    @Override protected void handleOnResume() {
        notifyListeners("languageChanged", snapshot());
    }
}
