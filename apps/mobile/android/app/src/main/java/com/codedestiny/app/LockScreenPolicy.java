package com.codedestiny.app;

/** Pure time policy; no personal data or network calls. */
final class LockScreenPolicy {
    private LockScreenPolicy() {}

    // Identical KST epoch-day selection to lib/lock-screen-content.ts.
    static int contentIndex(long epochMillis, int count, int offset) {
        if (count <= 0) return -1;
        long day = Math.floorDiv(epochMillis + 9 * 3600000L, 86400000L);
        return (int) Math.floorMod(day + offset, (long) count);
    }

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
