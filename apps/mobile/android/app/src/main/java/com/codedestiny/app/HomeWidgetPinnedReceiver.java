package com.codedestiny.app;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * requestPinAppWidget 의 성공 콜백. 사용자가 시스템 확인창에서 "추가"를 눌러 위젯이 실제로
 * 생겼을 때만 온다 — 취소하면 오지 않으므로 웹 화면은 완료로 표시하지 않는다.
 */
public class HomeWidgetPinnedReceiver extends BroadcastReceiver {
    static final String EXTRA_TOKEN = "homeWidgetToken";

    @Override
    public void onReceive(Context context, Intent intent) {
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return;
        String token = intent.getStringExtra(EXTRA_TOKEN);
        HomeWidgetPolicy.Choice choice = HomeWidgetStore.pending(context, token);
        if (choice != null) HomeWidgetStore.put(context, widgetId, choice);
        HomeWidgetStore.markAdded(context, token, widgetId);
        HomeWidgetProvider.render(context, AppWidgetManager.getInstance(context), widgetId);
        CodeDestinyHomeWidgetPlugin.notifyAdded(widgetId, token);
    }
}
