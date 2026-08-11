import I18nSeoPageTemplate from "../../components/I18nSeoPageTemplate";
import { PUBLIC_LOCALES, LOCALE_CONFIG, localeUrlSegment } from "../../../lib/i18n/locales";
import { createI18nMetadata } from "../../../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey, getLocaleLinksForRoute } from "../../../lib/i18n/routes";
import { I18N_SEO_PAGES } from "../../../lib/seo/i18nKeywords";
import { resolveLocale } from "../_lib";

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale: localeUrlSegment(locale) }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const content = I18N_SEO_PAGES.ziwei[locale];
  return createI18nMetadata({
    locale,
    routeByLocale: getAlternatesByRouteKey("ziwei"),
    title: content.title,
    description: content.description,
    keywords: [content.mainKeyword, ...content.relatedKeywords],
  });
}

export default async function LocaleZiweiPage({ params }) {
  const locale = resolveLocale((await params).locale);
  const content = I18N_SEO_PAGES.ziwei[locale];

  return (
    <I18nSeoPageTemplate
      locale={locale}
      localeLabel={LOCALE_CONFIG[locale].label}
      languageLinks={getLocaleLinksForRoute("ziwei")}
      content={content}
      currentPath={getAlternatesByRouteKey("ziwei")[locale]}
      inLanguage={LOCALE_CONFIG[locale].htmlLang}
    />
  );
}
