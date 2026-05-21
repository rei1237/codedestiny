import type { Metadata } from "next";
import { LOCALE_CONFIG, Locale } from "../i18n/locales";
import { createCanonicalFromLocaleRoutes, createHreflangFromRoutes } from "./createHreflang";

const SEO_REQUIRED_PLATFORM_KEYWORDS = [
  "코드 데스티니",
  "Code Destiny",
  "무료 운세",
  "숙요점",
  "사주팔자",
  "자미두수 명반",
  "타로 카드",
  "베다 점성술",
  "고품질 운세 리포트",
];

function mergeUniqueKeywords(input: string[] = []): string[] {
  return Array.from(
    new Set([...SEO_REQUIRED_PLATFORM_KEYWORDS, ...input.map((item) => String(item || "").trim()).filter(Boolean)]),
  );
}

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
  const mergedKeywords = mergeUniqueKeywords(keywords);

  return {
    title,
    description,
    keywords: mergedKeywords,
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
