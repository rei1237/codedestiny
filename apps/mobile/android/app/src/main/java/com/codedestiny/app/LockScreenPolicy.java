package com.codedestiny.app;

/** Pure scheduling policy; neither content generation nor personal data belongs here. */
final class LockScreenPolicy {
    private LockScreenPolicy() {}

    static int minutes(String time, int fallback) {
        if (time == null || !time.matches("\\d{2}:\\d{2}")) return fallback;
        int hour = Integer.parseInt(time.substring(0, 2));
        int minute = Integer.parseInt(time.substring(3, 5));
        return hour < 24 && minute < 60 ? hour * 60 + minute : fallback;
    }

    static boolean isQuiet(int now, int start, int end) {
        if (start == end) return false;
        return start < end ? now >= start && now < end : now >= start || now < end;
    }
}
