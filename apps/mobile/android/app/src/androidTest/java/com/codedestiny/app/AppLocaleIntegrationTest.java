package com.codedestiny.app;

import android.app.LocaleConfig;
import android.app.LocaleManager;
import android.os.Build;
import android.os.LocaleList;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.os.LocaleListCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.JSObject;
import org.junit.Test;
import static org.junit.Assert.*;

/** Runs on a disposable emulator; no network, accounts or billing calls. */
public class AppLocaleIntegrationTest {
    @Test public void osAndAppSharePreferenceWithoutRecreatingActivity() throws Exception {
        org.junit.Assume.assumeTrue(Build.VERSION.SDK_INT >= 33);
        android.content.Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        LocaleManager manager = context.getSystemService(LocaleManager.class);
        LocaleList original = manager.getApplicationLocales();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            MainActivity[] initial = new MainActivity[1];
            scenario.onActivity(activity -> {
                initial[0] = activity;
                assertEquals(12, new LocaleConfig(activity).getSupportedLocales().size());
                AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags("ja"));
            });
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            assertEquals("ja", manager.getApplicationLocales().toLanguageTags());
            manager.setApplicationLocales(LocaleList.forLanguageTags("de-DE"));
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            scenario.onActivity(activity -> {
                assertSame("locale must preserve the current WebView and inputs", initial[0], activity);
                assertEquals("de", readSnapshot(activity).getString("language"));
            });
            manager.setApplicationLocales(LocaleList.getEmptyLocaleList());
            InstrumentationRegistry.getInstrumentation().waitForIdleSync();
            scenario.onActivity(activity -> assertTrue(readSnapshot(activity).optBoolean("followsSystem", false)));
        } finally {
            manager.setApplicationLocales(original);
        }
    }

    private JSObject readSnapshot(MainActivity activity) {
        try {
            CodeDestinyLocalePlugin plugin = (CodeDestinyLocalePlugin) activity.getBridge().getPlugin("CodeDestinyLocale").getInstance();
            java.lang.reflect.Method method = CodeDestinyLocalePlugin.class.getDeclaredMethod("snapshot");
            method.setAccessible(true);
            return (JSObject) method.invoke(plugin);
        } catch (Exception error) { throw new AssertionError(error); }
    }
}
