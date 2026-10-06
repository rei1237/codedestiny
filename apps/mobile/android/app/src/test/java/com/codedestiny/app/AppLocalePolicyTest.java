package com.codedestiny.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class AppLocalePolicyTest {
    @Test public void regionalLocalesMatchWebLanguages() {
        assertEquals("en", AppLocalePolicy.normalize("en-US"));
        assertEquals("de", AppLocalePolicy.normalize("de-DE"));
        assertEquals("zh-TW", AppLocalePolicy.normalize("zh-Hant-HK"));
        assertEquals("zh-TW", AppLocalePolicy.normalize("zh_HK"));
        assertEquals("zh-CN", AppLocalePolicy.normalize("zh-Hans-SG"));
    }
    @Test public void unsupportedLocalesAreNotPersistedAsKorean() {
        assertEquals("", AppLocalePolicy.normalize("ar"));
        assertEquals("", AppLocalePolicy.normalize(""));
        assertEquals("", AppLocalePolicy.normalize("garbage"));
    }
}
