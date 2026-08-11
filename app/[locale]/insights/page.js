import Link from "next/link";
import { PUBLIC_LOCALES, LOCALE_CONFIG, localeUrlSegment } from "../../../lib/i18n/locales";
import { createI18nMetadata } from "../../../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey, getLocaleLinksForRoute } from "../../../lib/i18n/routes";
import { getLocalizedInsightList } from "../../../lib/seo/i18nInsights";
import { resolveLocale } from "../_lib";

const INSIGHTS_COPY = {
  ja: {
    title: "占いインサイト記事 | Code Destiny",
    description: "紫微斗数と宿曜の基礎から実践的な読み解き方まで、日本語でわかりやすく解説するインサイト記事の一覧です。",
    h1: "占いインサイト記事",
    intro:
      "紫微斗数と宿曜占星術を中心に、初めての方でも迷わず読み進められるよう、専門用語をかみ砕いて解説する記事を集めています。生年月日や相性の悩みから、実際の相談でよく聞かれる疑問まで、短時間で要点をつかめる構成にしています。気になるテーマから読み始めて、必要に応じて他の記事にも目を通してみてください。",
    keywords: ["占い", "紫微斗数", "宿曜", "無料占い", "運勢"]
  },
  zh: {
    title: "占卜洞察文章 | Code Destiny",
    description: "聚焦紫微斗数与宿曜占星术的入门知识与实战应用，为你提供简洁、可执行且易于快速阅读与落地实践的洞察文章。",
    h1: "占卜洞察文章",
    intro:
      "本页面精选了围绕紫微斗数与宿曜占星术展开的入门与实战文章，力求用简明易懂的语言拆解专业术语。无论你关心的是性格分析、感情相处还是时机选择，都可以从贴近生活的角度快速抓住重点。建议先从最感兴趣的主题读起，再逐步扩展到其他相关文章。",
    keywords: ["占卜", "紫微斗数", "宿曜", "免费算命", "运势"]
  },
  "zh-TW": {
    title: "命理探索文章 | Code Destiny",
    description: "聚焦紫微斗數與宿曜占星術的入門知識與實戰應用，為你提供簡潔、可執行且易於快速閱讀與落地實踐的洞察文章。",
    h1: "命理探索文章",
    intro:
      "本頁面精選了圍繞紫微斗數與宿曜占星術展開的入門與實戰文章，力求用簡明易懂的語言拆解專業術語。無論你關心的是性格分析、感情相處還是時機選擇，都可以從貼近生活的角度快速抓住重點。建議先從最感興趣的主題讀起，再逐步擴展到其他相關文章。",
    keywords: ["占卜", "紫微斗數", "宿曜", "免費算命", "運勢"]
  },
  en: {
    title: "Fortune Insights | Code Destiny",
    description: "Read practical beginner insights on Zi Wei Dou Shu and Sukuyo in English.",
    h1: "Fortune Insights",
    intro:
      "This page gathers beginner-friendly articles on Zi Wei Dou Shu and Sukuyo astrology, breaking down technical terms into everyday language. Whether you are curious about personality patterns, relationship compatibility, or timing for decisions, each article focuses on practical takeaways you can use right away. Start with the topic that interests you most, then explore the rest at your own pace.",
    keywords: ["fortune insights", "zi wei dou shu", "sukuyo", "daily fortune", "free fortune reading"]
  },
};

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((locale) => ({ locale: localeUrlSegment(locale) }));
}

export async function generateMetadata({ params }) {
  const locale = resolveLocale((await params).locale);
  const copy = INSIGHTS_COPY[locale];
  return createI18nMetadata({
    locale,
    routeByLocale: getAlternatesByRouteKey("insights"),
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
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
