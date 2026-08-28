import { siteSeo } from "./siteSeo";

export const SEO_SITE_CONFIG = {
  siteName: siteSeo.brandName,
  brandName: siteSeo.brandName,
  brandFullName: siteSeo.siteName,
  shortName: siteSeo.siteName,
  koreanName: "코드 데스티니",
  legacyName: "꿀꿀 만세력",
  alternateNames: siteSeo.alternateName,
  siteUrl: siteSeo.siteUrl,
  locale: "ko_KR",
  defaultOgImage: siteSeo.defaultOgImage,
  homeTitle: siteSeo.defaultTitle,
  titleTemplate: siteSeo.titleTemplate,
  defaultDescription: siteSeo.defaultDescription,
  defaultLanguages: {
    ko: "/",
    "x-default": "/",
  } as Record<string, string>,
  targetMarkets: ["KR"],
};
