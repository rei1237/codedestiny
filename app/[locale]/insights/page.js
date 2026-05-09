import Link from "next/link";
import { PUBLIC_LOCALES, LOCALE_CONFIG } from "../../../lib/i18n/locales";
import { createI18nMetadata } from "../../../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey, getLocaleLinksForRoute } from "../../../lib/i18n/routes";
import { getLocalizedInsightList } from "../../../lib/seo/i18nInsights";
import { resolveLocale } from "../_lib";

const INSIGHTS_COPY = {
  ja: {
    title: "占いインサイト記事 | Code Destiny",
    description: "紫微斗数と宿曜の基礎を日本語でわかりやすく解説するインサイト一覧です。",
    h1: "占いインサイト記事",
    intro: "実践で使える短い解説記事を優先して掲載しています。",
  },
  zh: {
    title: "占卜洞察文章 | Code Destiny",
    description: "聚焦紫微斗数与宿曜的入门与实战应用，提供简洁可执行的文章。",
    h1: "占卜洞察文章",
    intro: "优先提供短而实用的内容，方便快速阅读与落地。",
  },
  en: {
    title: "Fortune Insights | Code Destiny",
    description: "Read practical beginner insights on Zi Wei Dou Shu and Sukuyo in English.",
    h1: "Fortune Insights",
    intro: "Short and actionable articles focused on practical interpretation.",
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = INSIGHTS_COPY[locale];
  return createI18nMetadata({
    locale,
    routeByLocale: getAlternatesByRouteKey("insights"),
    title: copy.title,
    description: copy.description,
    keywords: ["insights", "zi wei", "sukuyo"],
  });
}

export default async function LocaleInsightsIndexPage({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = INSIGHTS_COPY[locale];
  const list = getLocalizedInsightList(locale);

  return (
    <main lang={locale} className="mx-auto w-full max-w-5xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="rounded-3xl border border-white/10 bg-[#10182c] px-5 py-6 md:px-8 md:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {getLocaleLinksForRoute("insights").map((item) => {
            const isCurrent = item.href === getAlternatesByRouteKey("insights")[locale];
            return (
              <Link
                key={item.hrefLang}
                href={item.href}
                hrefLang={item.hrefLang}
                lang={item.hrefLang}
                className={`rounded-full border px-3 py-1 ${
                  isCurrent
                    ? "border-amber-300/60 bg-amber-100/10 text-amber-100"
                    : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <h1 className="text-2xl font-semibold leading-tight text-amber-50 md:text-4xl">{copy.h1}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{copy.intro}</p>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-4 hover:bg-white/10">
            <h2 className="text-base font-semibold text-slate-100">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
