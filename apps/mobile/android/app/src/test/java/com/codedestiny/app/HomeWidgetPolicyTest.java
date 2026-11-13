package com.codedestiny.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class HomeWidgetPolicyTest {
    private static final HomeWidgetPolicy.Choice FALLBACK = new HomeWidgetPolicy.Choice("affirmation", "own-pace", "오늘은 내 속도로 가도 괜찮아");

    @Test public void choicesSurviveStorageRoundTrip() {
        HomeWidgetPolicy.Choice talisman = HomeWidgetPolicy.parse("talisman", "wealth", "ignored");
        assertEquals("", talisman.text);
        assertEquals(talisman, HomeWidgetPolicy.decode(HomeWidgetPolicy.encode(talisman)));
        HomeWidgetPolicy.Choice line = HomeWidgetPolicy.parse("affirmation", "own-pace", "  오늘은 내\n속도로   가도 괜찮아 ");
        assertEquals("오늘은 내 속도로 가도 괜찮아", line.text);
        assertEquals(line, HomeWidgetPolicy.decode(HomeWidgetPolicy.encode(line)));
    }

    @Test public void dailyContentFollowsCompanionAndKoreanMidnight() {
        String pool = "[\"one\",\"two\",\"three\"]";
        for (String[] pair : new String[][]{{"flower", "pig-daily"}, {"fortune", "cat-daily"}, {"fortune", "cat-daily-tea"}, {"affirmation", "pig-daily"}}) {
            HomeWidgetPolicy.Choice choice = HomeWidgetPolicy.parse(pair[0], pair[1], pool);
            assertNotNull(choice);
            assertEquals(choice, HomeWidgetPolicy.decode(HomeWidgetPolicy.encode(choice)));
            long midnight = 15L * 3600000;
            int first = HomeWidgetPolicy.dailyIndex(midnight - 1, pair[0], 3);
            assertEquals((first + 1) % 3, HomeWidgetPolicy.dailyIndex(midnight, pair[0], 3));
        }
        assertNull(HomeWidgetPolicy.parse("flower", "cat-daily", pool));
        assertNull(HomeWidgetPolicy.parse("fortune", "pig-daily", pool));
        assertNotNull(HomeWidgetPolicy.parse("talisman", "yeoni-moon", ""));
    }

    @Test public void invalidChoicesAreRejected() {
        assertNull(HomeWidgetPolicy.parse("talisman", "lottery", ""));
        assertNull(HomeWidgetPolicy.parse("affirmation", "Own Pace", "괜찮아"));
        assertNull(HomeWidgetPolicy.parse("affirmation", "own-pace", "   "));
        assertNull(HomeWidgetPolicy.parse("affirmation", "own-pace", new String(new char[41]).replace('\0', '가')));
        assertNull(HomeWidgetPolicy.parse("photo", "own-pace", "괜찮아"));
        assertNotNull(HomeWidgetPolicy.parse("talisman", "peace", ""));
        assertNotNull(HomeWidgetPolicy.parse("talisman", "peace-flower-pig-v3", ""));
        assertNotNull(HomeWidgetPolicy.parse("talisman", "peace-yeoni-v3", ""));
        assertNull(HomeWidgetPolicy.decode("talisman\nwealth"));
        assertNull(HomeWidgetPolicy.decode(null));
    }

    @Test public void widgetShowsStoredThenFreshPendingThenLastThenDefault() {
        HomeWidgetPolicy.Choice stored = HomeWidgetPolicy.parse("talisman", "love", "");
        HomeWidgetPolicy.Choice pending = HomeWidgetPolicy.parse("talisman", "study", "");
        HomeWidgetPolicy.Choice last = HomeWidgetPolicy.parse("affirmation", "breathe", "천천히 숨 쉬어도 돼");
        long at = 1_000_000L;
        assertEquals(stored, HomeWidgetPolicy.resolve(stored, pending, at, at + 1, last, FALLBACK));
        assertEquals(pending, HomeWidgetPolicy.resolve(null, pending, at, at + HomeWidgetPolicy.PENDING_TTL_MS, last, FALLBACK));
        // 취소된 확인창의 선택은 만료 뒤 런처 목록에서 추가한 위젯으로 새지 않는다.
        assertEquals(last, HomeWidgetPolicy.resolve(null, pending, at, at + HomeWidgetPolicy.PENDING_TTL_MS + 1, last, FALLBACK));
        assertEquals(FALLBACK, HomeWidgetPolicy.resolve(null, null, 0L, at, null, FALLBACK));
    }
}
