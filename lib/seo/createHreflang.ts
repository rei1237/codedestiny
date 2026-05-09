import { SEO_SITE_CONFIG } from "./siteConfig";
import { LOCALE_CONFIG, LOCALES, Locale } from "../i18n/locales";

function toAbsolute(path: string): string {
  return new URL(path, SEO_SITE_CONFIG.siteUrl).toString();
}

export function createHreflangFromRoutes(routeByLocale: Record<Locale, string>) {
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    const hrefLang = LOCALE_CONFIG[locale].hrefLang;
    const route = routeByLocale[locale];
    languages[hrefLang] = toAbsolute(route);
  }

  languages["x-default"] = toAbsolute(routeByLocale.ko);
  return languages;
}

export function createCanonicalFromLocaleRoutes(locale: Locale, routeByLocale: Record<Locale, string>) {
  return toAbsolute(routeByLocale[locale]);
}
