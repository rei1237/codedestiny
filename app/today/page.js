import I18nSeoPageTemplate from "../components/I18nSeoPageTemplate";
import { LOCALE_CONFIG } from "../../lib/i18n/locales";
import { createI18nMetadata } from "../../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey, getLocaleLinksForRoute } from "../../lib/i18n/routes";
import { I18N_SEO_PAGES } from "../../lib/seo/i18nKeywords";

const locale = "ko";
const content = I18N_SEO_PAGES.today.ko;

export const metadata = createI18nMetadata({
  locale,
  routeByLocale: getAlternatesByRouteKey("today"),
  title: content.title,
  description: content.description,
  keywords: [content.mainKeyword, ...content.relatedKeywords],
});

export default function TodayPage() {
  return (
    <I18nSeoPageTemplate
      locale={locale}
      localeLabel={LOCALE_CONFIG[locale].label}
      languageLinks={getLocaleLinksForRoute("today")}
      content={content}
      currentPath={getAlternatesByRouteKey("today")[locale]}
      inLanguage={LOCALE_CONFIG[locale].htmlLang}
    />
  );
}
