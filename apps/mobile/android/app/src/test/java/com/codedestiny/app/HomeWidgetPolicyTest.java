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

    @Test public void invalidChoicesAreRejected() {
        assertNull(HomeWidgetPolicy.parse("talisman", "lottery", ""));
        assertNull(HomeWidgetPolicy.parse("affirmation", "Own Pace", "괜찮아"));
        assertNull(HomeWidgetPolicy.parse("affirmation", "own-pace", "   "));
        assertNull(HomeWidgetPolicy.parse("affirmation", "own-pace", new String(new char[41]).replace('\0', '가')));
        assertNull(HomeWidgetPolicy.parse("photo", "own-pace", "괜찮아"));
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
