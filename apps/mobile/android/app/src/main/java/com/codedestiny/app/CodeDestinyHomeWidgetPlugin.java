package com.codedestiny.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.UUID;

/**
 * /app/home-widget/ 설정 화면 전용 브리지. 사용자가 그 화면에서 버튼을 누를 때만 호출된다 —
 * load() 는 참조만 잡고 저장소를 읽지 않으므로 앱 시작 비용이 없다.
 */
@CapacitorPlugin(name = "CodeDestinyHomeWidget")
public class CodeDestinyHomeWidgetPlugin extends Plugin {
    private static volatile CodeDestinyHomeWidgetPlugin active;

    @Override
    public void load() { active = this; }

    static void notifyAdded(int widgetId, String token) {
        CodeDestinyHomeWidgetPlugin plugin = active;
        if (plugin == null) return;
        JSObject data = new JSObject();
        data.put("widgetId", widgetId);
        data.put("token", token == null ? "" : token);
        plugin.notifyListeners("widgetAdded", data, true);
    }

    private static boolean pinSupported(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        try { return AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported(); }
        catch (Exception ignored) { return false; }
    }

    private static int[] installedIds(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] large = manager.getAppWidgetIds(new ComponentName(context, FortuneWidgetProvider.class));
            int[] regular = manager.getAppWidgetIds(HomeWidgetProvider.component(context));
            int[] ids = java.util.Arrays.copyOf(large, large.length + regular.length);
            System.arraycopy(regular, 0, ids, large.length, regular.length);
            return ids;
        }
        catch (Exception ignored) { return new int[0]; }
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : installedIds(context)) HomeWidgetProvider.render(context, manager, id);
    }

    private HomeWidgetPolicy.Choice readChoice(PluginCall call) {
        String kind = call.getString("kind");
        String id = call.getString("itemId");
        String text = call.getString("text", "");
        if (HomeWidgetPolicy.isDaily(kind, id)) {
            JSArray pool = call.getArray("pool");
            if (pool == null || pool.length() == 0 || pool.length() > 2000) return null;
            for (int i = 0; i < pool.length(); i++) {
                Object value = pool.opt(i);
                if (!(value instanceof String) || ((String) value).isEmpty() || ((String) value).length() > 512) return null;
            }
            text = pool.toString();
        }
        return HomeWidgetPolicy.parse(kind, id, text);
    }

    @PluginMethod
    public void getState(PluginCall call) {
        Context context = getContext();
        JSArray widgets = new JSArray();
        for (int id : installedIds(context)) {
            HomeWidgetPolicy.Choice choice = HomeWidgetStore.get(context, id);
            JSObject row = new JSObject();
            row.put("widgetId", id);
            if (choice != null) { row.put("kind", choice.kind); row.put("itemId", choice.itemId); }
            widgets.put(row);
        }
        JSObject response = new JSObject();
        response.put("pinSupported", pinSupported(context));
        response.put("widgets", widgets);
        response.put("addedToken", HomeWidgetStore.addedToken(context));
        response.put("addedWidgetId", HomeWidgetStore.addedId(context));
        call.resolve(response);
    }

    // A character is an artwork choice for one fortune slot, not another pin.
    private boolean replaceFortune(Context context, HomeWidgetPolicy.Choice choice) {
        if (!"fortune".equals(choice.kind)) return false;
        boolean found = false;
        for (int id : installedIds(context)) {
            HomeWidgetPolicy.Choice old = HomeWidgetStore.get(context, id);
            if (old != null && "fortune".equals(old.kind)) {
                HomeWidgetStore.put(context, id, choice);
                HomeWidgetProvider.render(context, AppWidgetManager.getInstance(context), id);
                found = true;
            }
        }
        return found;
    }

    @PluginMethod
    public void requestPin(PluginCall call) {
        Context context = getContext();
        HomeWidgetPolicy.Choice choice = readChoice(call);
        if (choice == null) { call.reject("invalid widget choice"); return; }
        JSObject response = new JSObject();
        if (replaceFortune(context, choice)) { response.put("status", "updated"); call.resolve(response); return; }
        if (!pinSupported(context)) { response.put("status", "unsupported"); call.resolve(response); return; }
        String token = UUID.randomUUID().toString();
        HomeWidgetStore.setPending(context, choice, token, System.currentTimeMillis());
        Intent callback = new Intent(context, HomeWidgetPinnedReceiver.class).putExtra(HomeWidgetPinnedReceiver.EXTRA_TOKEN, token);
        // 시스템이 새 위젯 id 를 extra 로 채워 넣어야 하므로 mutable 이어야 한다(명시적 인텐트).
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
        PendingIntent success = PendingIntent.getBroadcast(context, 0, callback, flags);
        // 확인창 미리보기를 고른 부적·확언으로 그린다. 없으면 런처가 기본 확언 미리보기를 보여 준다.
        Bundle extras = new Bundle();
        extras.putParcelable(AppWidgetManager.EXTRA_APPWIDGET_PREVIEW, HomeWidgetProvider.views(context, choice));
        boolean shown;
        ComponentName provider = "fortune".equals(choice.kind)
                ? new ComponentName(context, FortuneWidgetProvider.class) : HomeWidgetProvider.component(context);
        try { shown = AppWidgetManager.getInstance(context).requestPinAppWidget(provider, extras, success); }
        catch (Exception ignored) { shown = false; }
        response.put("status", shown ? "requested" : "unsupported");
        response.put("token", token);
        call.resolve(response);
    }

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        Integer widgetId = call.getInt("widgetId");
        HomeWidgetPolicy.Choice choice = readChoice(call);
        if (widgetId == null || choice == null) { call.reject("invalid widget choice"); return; }
        boolean installed = false;
        for (int id : installedIds(context)) installed |= id == widgetId;
        JSObject response = new JSObject();
        if (!installed) { response.put("status", "missing"); call.resolve(response); return; }
        if (!replaceFortune(context, choice)) {
            HomeWidgetStore.put(context, widgetId, choice);
            HomeWidgetProvider.render(context, AppWidgetManager.getInstance(context), widgetId);
        }
        response.put("status", "updated");
        call.resolve(response);
    }
}
