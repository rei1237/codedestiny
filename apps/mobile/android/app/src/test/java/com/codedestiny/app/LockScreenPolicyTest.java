package com.codedestiny.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class LockScreenPolicyTest {
    @Test public void publicContentChangesAtKstMidnight() {
        assertEquals(2, LockScreenPolicy.contentIndex(53999999L, 3, 5));
        assertEquals(0, LockScreenPolicy.contentIndex(54000000L, 3, 5));
        assertEquals(2, LockScreenPolicy.contentIndex(54000000L, 3, 7));
        assertEquals(-1, LockScreenPolicy.contentIndex(54000000L, 0, 7));
    }
    @Test public void quietHoursCrossMidnightAndExcludeEnd() {
        assertTrue(LockScreenPolicy.isQuiet(23 * 60, 22 * 60, 7 * 60));
        assertTrue(LockScreenPolicy.isQuiet(6 * 60, 22 * 60, 7 * 60));
        assertFalse(LockScreenPolicy.isQuiet(7 * 60, 22 * 60, 7 * 60));
        assertFalse(LockScreenPolicy.isQuiet(12 * 60, 22 * 60, 7 * 60));
        assertFalse(LockScreenPolicy.isQuiet(600, 600, 600));
    }
    @Test public void invalidTimesDoNotRollIntoAnotherDay() {
        assertEquals(540, LockScreenPolicy.minutes("24:00", 540));
        assertEquals(540, LockScreenPolicy.minutes("09:90", 540));
        assertEquals(540, LockScreenPolicy.minutes("bad", 540));
        assertEquals(1439, LockScreenPolicy.minutes("23:59", 540));
    }
}
