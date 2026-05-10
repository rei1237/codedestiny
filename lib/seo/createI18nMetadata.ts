import type { Metadata } from "next";
import { LOCALE_CONFIG, Locale } from "../i18n/locales";
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
    image = "/icons/꿀꿀 운세 로고.webp",
    noindex = false,
    type = "website",
  } = input;

  const localeConfig = LOCALE_CONFIG[locale];
  const canonical = createCanonicalFromLocaleRoutes(locale, routeByLocale);
  const languages = createHreflangFromRoutes(routeByLocale);
  const imageUrl = image.startsWith("http") ? image : new URL(image, canonical).toString();

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
      languages,
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
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: {
      index: !noindex,
      follow: !noindex,
      nocache: noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
      },
    },
    other: {
      "content-language": localeConfig.htmlLang,
    },
  };
}
