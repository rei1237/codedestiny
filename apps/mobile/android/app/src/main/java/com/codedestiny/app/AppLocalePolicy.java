package com.codedestiny.app;

import java.util.Locale;

final class AppLocalePolicy {
    private AppLocalePolicy() {}
    static String normalize(String value) {
        Locale locale = Locale.forLanguageTag(value.replace('_', '-'));
        String language = locale.getLanguage();
        if ("zh".equals(language)) {
            return "Hant".equals(locale.getScript()) || "TW".equals(locale.getCountry())
                    || "HK".equals(locale.getCountry()) || "MO".equals(locale.getCountry()) ? "zh-TW" : "zh-CN";
        }
        switch (language) {
            case "ko": case "en": case "ja": case "vi": case "hi": case "es":
            case "fr": case "de": case "nl": case "ms": return language;
            default: return "";
        }
    }
}
