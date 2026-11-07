package com.codedestiny.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Map;

import org.junit.Test;

public class AppImageAliasesTest {
    @Test
    public void dropsVariantsResolveOnlyInsideIntroductionFolders() {
        Map<String, String> table = AppImageAliases.parse(
                "/images/service-introductions/saju-320.webp\t/images/service-introductions/saju-960.webp\n"
                        + "/feature-details/assets/saju-og.webp\t/images/service-introductions/saju-960.webp\n"
                        + "/tarot-cards/thehermit.jpeg\t/tarot-cards/thehermit.webp\n"
                        + "/index.html\t/images/service-introductions/saju-960.webp\n"
                        + "broken line\n");
        assertEquals(3, table.size());
        assertEquals("/tarot-cards/thehermit.webp", AppImageAliases.find(table, "/tarot-cards/thehermit.jpeg"));
        assertEquals("/images/service-introductions/saju-960.webp", AppImageAliases.find(table, "/images/service-introductions/saju-320.webp"));
        assertEquals("/images/service-introductions/saju-960.webp", AppImageAliases.find(table, "/feature-details/assets/saju-og.webp"));
        assertNull(AppImageAliases.find(table, "/images/service-introductions/saju-960.webp"));
        assertNull(AppImageAliases.find(table, "/index.html"));
    }
}
