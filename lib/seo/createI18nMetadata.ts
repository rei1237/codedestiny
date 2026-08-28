import type { Metadata } from "next";
import { SEO_CORE_KEYWORDS, mergeKeywords } from "../seo-metadata";
import { getSeoProfileKeywords } from "./entity-registry.mjs";
import { LOCALE_CONFIG, Locale, SEO_INDEXABLE_LOCALES } from "../i18n/locales";
import { siteSeo } from "./siteSeo";
import { createCanonicalFromLocaleRoutes, createHreflangFromRoutes } from "./createHreflang";
import { truncateToDisplayWidth } from "../seo";

type CreateI18nMetadataInput = {
  locale: Locale;
  routeByLocale: Record<Locale, string>;
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
};

export function createI18nMetadata(input: CreateI18nMetadataInput): Metadata {
  const {
    locale,
    routeByLocale,
    title,
    description,
    keywords = [],
    image = siteSeo.defaultOgImage,
    noindex = false,
    type = "website",
  } = input;

  const localeConfig = LOCALE_CONFIG[locale];
  const localeIsIndexable = (SEO_INDEXABLE_LOCALES as readonly string[]).includes(locale);
  const shouldNoindex = noindex || !localeIsIndexable;
  const canonical = createCanonicalFromLocaleRoutes(locale, routeByLocale);
  const languages = localeIsIndexable ? createHreflangFromRoutes(routeByLocale) : undefined;
  const imageUrl = image.startsWith("http") ? image : new URL(image, siteSeo.siteUrl).toString();
  const mergedKeywords = mergeKeywords(
    SEO_CORE_KEYWORDS,
    locale === "ko" ? getSeoProfileKeywords(routeByLocale.ko) : [],
    keywords,
  );

  // SERP 설명 폭 절단은 lib/seo.ts 한 곳에서 한다(중복 구현 금지).
  const cappedDescription = truncateToDisplayWidth(description);

  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title,
    description: cappedDescription,
    keywords: mergedKeywords,
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type,
      locale: localeConfig.ogLocale,
      title,
      description: cappedDescription,
      url: canonical,
      // 🔴 사이트 이름 신호는 로케일 표가 아니라 브랜드 한 곳에서 나온다.
      //    로케일 표의 siteName("Code Destiny Japan" 등)을 여기 쓰면 **같은 페이지 안에서** 신호가
      //    갈린다 — dist/ja/today 실측(2026-08-28): og:site_name="Code Destiny Japan" 인데
      //    application-name 과 WebSite 스키마 name 은 둘 다 "꿀꿀 운세"(inLanguage ko-KR)였다.
      //    구글은 네 신호가 일치할 때만 사이트 이름을 채택하므로, 갈려 있는 동안에는 어느 쪽도
      //    잡히지 않는다 — PR #1239 가 한국어 표면에서 없앤 그 갈라짐이 로케일 미러 52쪽에
      //    그대로 남아 있었다(__tests__/ui/site-name-signals.static.test.js).
      //    로케일 표의 siteName 은 빵부스러기 라벨(I18nSeoPageTemplate)에서 계속 쓴다.
      siteName: siteSeo.brandName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: siteSeo.twitterCard,
      title,
      description: cappedDescription,
      images: [imageUrl],
    },
    robots: shouldNoindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    other: {
      "content-language": localeConfig.htmlLang,
    },
  };
}
