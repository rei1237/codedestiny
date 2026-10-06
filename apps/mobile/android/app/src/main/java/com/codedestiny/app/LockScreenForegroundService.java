package com.codedestiny.app;

import android.content.Context;
import android.content.Intent;

/** Stops the retired screen-on service when upgrading to scheduled notifications. */
public final class LockScreenForegroundService {
    private LockScreenForegroundService() {}

    static void stop(Context context) {
        // Keep the old component name stable even when R8 inlines this migration helper.
        Intent legacyService = new Intent().setClassName(
                context.getPackageName(), "com.codedestiny.app.LockScreenForegroundService");
        try {
            context.stopService(legacyService);
        } catch (Exception ignored) {}
    }
}
