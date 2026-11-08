package com.codedestiny.app;

import java.util.Arrays;
import java.util.List;

/**
 * 홈 화면 위젯 선택값 규칙. Android 타입을 쓰지 않아 JVM 단위 테스트로 검증한다.
 * 선택값은 기기 SharedPreferences 에만 저장되고, 그리는 데 네트워크를 쓰지 않는다.
 */
final class HomeWidgetPolicy {
    static final String KIND_TALISMAN = "talisman";
    static final String KIND_AFFIRMATION = "affirmation";
    /** 승인된 영냥이 부적 원본(public/assets/talismans/originals/*-yeongnyangi-v2.png)의 분야. */
    static final List<String> TALISMANS = Arrays.asList("study",
            "study-flower-pig-v2",
            "study-yeoni-v2",
            "wealth",
            "wealth-flower-pig-v2",
            "wealth-yeoni-v2",
            "love",
            "love-flower-pig-v2",
            "love-yeoni-v2",
            "contact",
            "contact-flower-pig-v2",
            "contact-yeoni-v2",
            "success",
            "success-flower-pig-v2",
            "success-yeoni-v2",
            "yeoni-hanbok",
            "yeoni-moon",
            "yeoni-tea",
            "yeoni-pig-moon", "pig-gold-seed", "pig-camellias", "pig-reunion-knot", "cat-star-chart", "pig-moon-tea");
    static final String DEFAULT_AFFIRMATION_ID = "own-pace";
    /** 작은 위젯에서 네 줄 안에 읽히는 길이. */
    static final int MAX_TEXT = 40;
    /** 확인창을 띄운 뒤 이 시간 안에 생긴 위젯만 그 선택을 미리 보여준다. */
    static final long PENDING_TTL_MS = 10L * 60L * 1000L;

    private HomeWidgetPolicy() {}

    static final class Choice {
        final String kind;
        final String itemId;
        final String text;

        Choice(String kind, String itemId, String text) {
            this.kind = kind;
            this.itemId = itemId;
            this.text = text;
        }

        boolean isTalisman() { return KIND_TALISMAN.equals(kind); }

        @Override public boolean equals(Object other) {
            if (!(other instanceof Choice)) return false;
            Choice o = (Choice) other;
            return kind.equals(o.kind) && itemId.equals(o.itemId) && text.equals(o.text);
        }

        @Override public int hashCode() { return (kind + "\n" + itemId + "\n" + text).hashCode(); }
    }

    /** 잘못된 값은 null. 부적은 문구를 저장하지 않고, 확언은 한 줄로 정리한다. */
    static Choice parse(String kind, String itemId, String text) {
        if (kind == null || itemId == null) return null;
        if (KIND_TALISMAN.equals(kind)) return TALISMANS.contains(itemId) ? new Choice(kind, itemId, "") : null;
        if (isDaily(kind, itemId)) return text != null && text.startsWith("[") && text.endsWith("]") ? new Choice(kind, itemId, text) : null;
        if (!KIND_AFFIRMATION.equals(kind) || !itemId.matches("[a-z0-9-]{1,24}") || text == null) return null;
        String line = text.replaceAll("\\s+", " ").trim();
        if (line.isEmpty() || line.codePointCount(0, line.length()) > MAX_TEXT) return null;
        return new Choice(kind, itemId, line);
    }

    static boolean isDaily(String kind, String id) {
        return ("flower".equals(kind) && "pig-daily".equals(id))
                || ("fortune".equals(kind) && ("cat-daily".equals(id) || "cat-daily-tea".equals(id)))
                || (KIND_AFFIRMATION.equals(kind) && ("cat-daily".equals(id) || "pig-daily".equals(id)));
    }

    static int dailyIndex(long now, String kind, int length) {
        long day = Math.floorDiv(now + 9L * 3600000, 86400000L);
        int offset = "flower".equals(kind) ? 13 : KIND_AFFIRMATION.equals(kind) ? 7 : 0;
        return (int) Math.floorMod(day + offset, (long) length);
    }

    static String encode(Choice choice) {
        return choice.kind + "\n" + choice.itemId + "\n" + choice.text;
    }

    static Choice decode(String stored) {
        if (stored == null) return null;
        String[] parts = stored.split("\n", 3);
        return parts.length == 3 ? parse(parts[0], parts[1], parts[2]) : null;
    }

    /**
     * 위젯 하나에 보여줄 선택. 이 위젯에 저장된 값 → 방금 띄운 확인창의 선택(유효 시간 안)
     * → 마지막으로 확정한 선택 → 기본 확언 순서다. 런처 목록에서 직접 추가한 위젯도 비지 않는다.
     */
    static Choice resolve(Choice stored, Choice pending, long pendingAt, long now, Choice last, Choice fallback) {
        if (stored != null) return stored;
        if (pending != null && now >= pendingAt && now - pendingAt <= PENDING_TTL_MS) return pending;
        if (last != null) return last;
        return fallback;
    }
}
