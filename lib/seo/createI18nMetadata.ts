import type { Metadata } from "next";
import { SEO_CORE_KEYWORDS, mergeKeywords } from "../seo-metadata";
import { getSeoProfileKeywords } from "./entity-registry.mjs";
import { LOCALE_CONFIG, Locale, SEO_INDEXABLE_LOCALES } from "../i18n/locales";
import { siteSeo } from "./siteSeo";
import { createCanonicalFromLocaleRoutes, createHreflangFromRoutes } from "./createHreflang";

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

  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
      ...(languages ? { languages } : {}),
    },
    openGraph: {
      type,
      locale: localeConfig.ogLocale,
      title,
      description,
      url: canonical,
      siteName: localeConfig.siteName,
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
      description,
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
