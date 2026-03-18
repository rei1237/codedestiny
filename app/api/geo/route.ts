import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type LocaleKey =
  | "ko-KR"
  | "en-US"
  | "en-CA"
  | "en-SG"
  | "en-GB"
  | "en-AU"
  | "en-PH"
  | "en-IN"
  | "hi-IN"
  | "en-ZA"
  | "fr-FR"
  | "fr-CA"
  | "de-DE"
  | "it-IT"
  | "hu-HU"
  | "nl-NL"
  | "ja-JP"
  | "zh-CN"
  | "zh-TW"
  | "es-ES"
  | "es-MX"
  | "es-CO"
  | "es-AR"
  | "es-PE"
  | "th-TH"
  | "vi-VN";

const COUNTRY_TO_LOCALE: Partial<Record<string, LocaleKey>> = {
  KR: "ko-KR",
  JP: "ja-JP",
  CN: "zh-CN",
  TW: "zh-TW",
  TH: "th-TH",
  VN: "vi-VN",
  DE: "de-DE",
  IT: "it-IT",
  HU: "hu-HU",
  NL: "nl-NL",
  FR: "fr-FR",
  CA: "en-CA",
  GB: "en-GB",
  AU: "en-AU",
  SG: "en-SG",
  PH: "en-PH",
  IN: "en-IN",
  ZA: "en-ZA",
  ES: "es-ES",
  MX: "es-MX",
  CO: "es-CO",
  AR: "es-AR",
  PE: "es-PE",
};

function getCountryFromHeaders(request: NextRequest) {
  return (
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    ""
  )
    .toUpperCase()
    .trim();
}

function localeFromAcceptLanguage(request: NextRequest): LocaleKey | null {
  const header = request.headers.get("accept-language");
  if (!header) return null;
  const first = header.split(",")[0]?.trim()?.split(";")[0]?.trim();
  if (!first) return null;
  const tag = first.replace("_", "-").toLowerCase();

  if (tag.startsWith("ko")) return "ko-KR";
  if (tag.startsWith("ja")) return "ja-JP";
  if (tag.startsWith("zh-tw") || tag.startsWith("zh-hant")) return "zh-TW";
  if (tag.startsWith("zh")) return "zh-CN";
  if (tag.startsWith("th")) return "th-TH";
  if (tag.startsWith("vi")) return "vi-VN";
  if (tag.startsWith("hi")) return "hi-IN";
  if (tag.startsWith("fr")) return "fr-FR";
  if (tag.startsWith("de")) return "de-DE";
  if (tag.startsWith("it")) return "it-IT";
  if (tag.startsWith("nl")) return "nl-NL";
  if (tag.startsWith("es")) return "es-ES";
  if (tag.startsWith("en")) return "en-US";
  return null;
}

function mapLocaleToWidgetLang(locale: LocaleKey) {
  // Matches the webapp language buttons (goog-te + our deepl scopes)
  if (locale === "ko-KR") return "ko";
  if (locale.startsWith("en-")) return "en";
  if (locale === "ja-JP") return "ja";
  if (locale === "zh-CN") return "zh-CN";
  if (locale === "zh-TW") return "zh-CN"; // widget set supports zh-CN; keep simple
  if (locale === "hi-IN") return "hi";
  if (locale.startsWith("es-")) return "es";
  if (locale.startsWith("fr-")) return "fr";
  if (locale === "th-TH") return "th";
  if (locale === "vi-VN") return "vi";
  if (locale === "de-DE") return "de";
  if (locale === "it-IT") return "it";
  if (locale === "nl-NL") return "nl";
  return "en";
}

export async function GET(request: NextRequest) {
  const country = getCountryFromHeaders(request);
  const byCountry = country ? COUNTRY_TO_LOCALE[country] : undefined;
  const locale = byCountry || localeFromAcceptLanguage(request) || "en-US";
  return NextResponse.json({
    country: country || null,
    locale,
    widgetLang: mapLocaleToWidgetLang(locale),
  });
}

