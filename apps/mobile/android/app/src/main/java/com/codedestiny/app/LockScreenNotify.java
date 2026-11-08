package com.codedestiny.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.TimeZone;

/** Standard, private notifications. No birth data, reading text or payment data is cached here. */
final class LockScreenNotify {
    static final String CHANNEL_SERVICE = "cd_lockscreen_service";
    static final String CHANNEL_ALARM = "cd_lockscreen_alarm";
    static final String SNAPSHOT = "public_content_v2";
    private LockScreenNotify() {}

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // Reuse the existing ID: createNotificationChannel preserves the user's blocked state.
        NotificationChannel channel = new NotificationChannel(CHANNEL_ALARM, "CODE DESTINY", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        nm.createNotificationChannel(channel);
    }

    static boolean allowed(Context ctx) {
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = ctx.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL_ALARM);
            return c == null || c.getImportance() != NotificationManager.IMPORTANCE_NONE;
        }
        return true;
    }

    static void cancelContent(Context ctx) {
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        for (int i = 2000; i < 2008; i++) nm.cancel(i);
        nm.cancel(4711);
        nm.cancel(4800);
    }

    static Notification buildServiceNotification(Context ctx) {
        // Compatibility only for an old service instance during update; no service is declared now.
        return new NotificationCompat.Builder(ctx, CHANNEL_ALARM).setSmallIcon(R.drawable.ic_stat_yeongnyangi).build();
    }

    // Version 3 stored text pools but no art. Upgraded alarms may run before the reader opens.
    private static String legacyImage(JSONObject options) {
        String id = options.optString("talismanId");
        String portrait = id.contains(":") ? id.substring(id.indexOf(':') + 1) : options.optString("pigPoseKey");
        switch (portrait) {
            case "cat-quote": return "/assets/yeongnyangi/companion/quote.webp";
            case "cat-daily": return "/assets/yeongnyangi/companion/daily.webp";
            case "yeoni": return "/assets/yeongnyangi/companion/yeoni.webp";
            case "pig1": return "/images/fortune-tea-house/flower-pig-single-a.webp";
            case "pig2": return "/images/fortune-tea-house/flower-pig-single-b.webp";
            case "moka": case "yun": case "luna": case "rab": case "crow": case "universe":
                return "/images/novel/world/" + portrait + ".webp";
            default: return "/assets/yeongnyangi/original/hero-480.webp";
        }
    }

    static boolean postContent(Context ctx, int id, boolean test) {
        ensureChannels(ctx);
        SharedPreferences prefs = ctx.getSharedPreferences(CodeDestinyLockScreenPlugin.PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(CodeDestinyLockScreenPlugin.KEY_ENABLED, false) || !allowed(ctx)) return false;
        try {
            JSONObject state = new JSONObject(prefs.getString(CodeDestinyLockScreenPlugin.KEY_STATE, "{}"));
            JSONObject options = state.optJSONObject("prefs");
            if (options == null || !options.optBoolean("enabled", false)) return false;
            Calendar now = Calendar.getInstance();
            if (!test && options.optBoolean("quietEnabled", true) && LockScreenPolicy.isQuiet(
                    now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE),
                    LockScreenPolicy.minutes(options.optString("quietStart", "22:00"), 1320),
                    LockScreenPolicy.minutes(options.optString("quietEnd", "07:00"), 420))) return false;
            JSONObject snapshot = new JSONObject(prefs.getString(SNAPSHOT, "{}"));
            if (!snapshot.optString("locale").equals(options.optString("locale", "ko"))) return false;
            String kind = options.optString("displayKind", "");
            if (kind.isEmpty()) {
                for (String candidate : new String[]{"quote", "daily", "affirmation"}) {
                    if (!options.optBoolean(candidate + "Enabled", true)) continue;
                    if (!kind.isEmpty()) { kind = "talisman"; break; }
                    kind = candidate;
                }
            }
            if (kind.isEmpty()) kind = "talisman";
            if (snapshot.has("displayKind") && (!kind.equals(snapshot.optString("displayKind"))
                    || !options.optString("talismanId").equals(snapshot.optString("talismanId")))) return false;
            if ("daily".equals(kind) && !"cat".equals(snapshot.optString("companionGroup", "cat"))) kind = "talisman";
            if ("flower".equals(kind) && !"yeoni".equals(snapshot.optString("companionGroup"))) return false;
            boolean talisman = "talisman".equals(kind);
            JSONObject card = snapshot.optJSONObject(kind);
            if (card == null && talisman && !snapshot.has("displayKind")) {
                card = new JSONObject().put("title", "ko".equals(options.optString("locale", "ko")) ? "오늘의 부적" : "Talisman")
                        .put("image", legacyImage(options));
            }
            if (card == null) return false;
            SimpleDateFormat date = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            date.setTimeZone(TimeZone.getTimeZone("Asia/Seoul"));
            String localDate = date.format(now.getTime());
            String key = localDate + "|" + options.optString("talismanId") + "|" + snapshot.optString("locale") + "|" + snapshot.optInt("version", 2) + "|" + kind;
            if (!test && key.equals(prefs.getString("posted_" + id, ""))) return false;
            String title = card.optString("title", "CODE DESTINY");
            String text = card.optString("text");
            JSONObject pools = snapshot.optJSONObject("publicPools");
            if (!"daily".equals(kind) && pools != null) {
                org.json.JSONArray pool = pools.optJSONArray(kind);
                if (pool != null && pool.length() > 0) {
                    int index = LockScreenPolicy.contentIndex(now.getTimeInMillis(), pool.length(), "quote".equals(kind) ? 5 : "flower".equals(kind) ? 13 : 7);
                    text = pool.optString(index, text);
                }
            }
            if (text.isEmpty() && !talisman) return false;
            // Daily is always a generic invitation. It must never contain cached personal fortune.
            if ("daily".equals(kind)) text = snapshot.optString("privateSummary", "CODE DESTINY");
            Intent detail = new Intent(ctx, LockScreenActivity.class)
                    .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent tap = PendingIntent.getActivity(ctx, id, detail, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            String safe = "daily".equals(kind) ? snapshot.optString("privateSummary", "CODE DESTINY") : text;
            android.graphics.Bitmap character = null;
            String asset = card.optString("image");
            if (talisman && asset.startsWith("/") && !asset.contains("..")) try (java.io.InputStream stream = ctx.getAssets().open("public" + asset)) {
                android.graphics.BitmapFactory.Options bitmapOptions = new android.graphics.BitmapFactory.Options();
                bitmapOptions.inSampleSize = 2;
                character = android.graphics.BitmapFactory.decodeStream(stream, null, bitmapOptions);
            } catch (java.io.IOException ignored) { /* Text remains usable when an asset is unavailable. */ }
            if (talisman && character == null) return false;
            Notification publicVersion = new NotificationCompat.Builder(ctx, CHANNEL_ALARM)
                    .setSmallIcon(R.drawable.ic_stat_yeongnyangi).setLargeIcon(character).setContentTitle(title).setContentText(safe)
                    .setStyle(talisman ? new NotificationCompat.BigPictureStyle().bigPicture(character) : new NotificationCompat.BigTextStyle().bigText(safe)).setContentIntent(tap).build();
            Notification notification = new NotificationCompat.Builder(ctx, CHANNEL_ALARM)
                    .setSmallIcon(R.drawable.ic_stat_yeongnyangi).setLargeIcon(character).setContentTitle(title).setContentText(text)
                    .setStyle(talisman ? new NotificationCompat.BigPictureStyle().bigPicture(character) : new NotificationCompat.BigTextStyle().bigText(text))
                    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publicVersion)
                    .setCategory(NotificationCompat.CATEGORY_REMINDER).setAutoCancel(true)
                    .setOnlyAlertOnce(true).setContentIntent(tap).build();
            ctx.getSystemService(NotificationManager.class).notify(id, notification);
            if (!test) prefs.edit().putString("posted_" + id, key).apply();
            return true; // posted, never evidence of lockscreen visibility
        } catch (org.json.JSONException | SecurityException e) { return false; }
    }
}
