import Link from "next/link";
import { notFound } from "next/navigation";
import { PUBLIC_LOCALES, LOCALE_CONFIG } from "../../../../lib/i18n/locales";
import { createI18nMetadata } from "../../../../lib/seo/createI18nMetadata";
import { getLocaleLinksForRoute, I18N_ROUTE_MAP } from "../../../../lib/i18n/routes";
import { I18N_INSIGHT_ARTICLES, getLocalizedInsightBySlug } from "../../../../lib/seo/i18nInsights";
import { resolveLocale } from "../../_lib";

function getRouteByLocaleForInsight(articleId) {
  if (articleId !== "insightZiweiBasics" && articleId !== "insightSukuyoBasics") return null;
  return I18N_ROUTE_MAP[articleId];
}

export function generateStaticParams() {
  const params = [];
  for (const locale of PUBLIC_LOCALES) {
    for (const article of I18N_INSIGHT_ARTICLES) {
      params.push({ locale, slug: article.slugByLocale[locale] });
    }
  }
  return params;
}

export async function generateMetadata({ params }) {
  const resolved = await params;
  const locale = resolveLocale(resolved.locale);
  const article = getLocalizedInsightBySlug(locale, resolved.slug);
  if (!article) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const routeByLocale = getRouteByLocaleForInsight(article.id);
  if (!routeByLocale) {
    return {
      robots: { index: false, follow: false },
    };
  }

  return createI18nMetadata({
    locale,
    routeByLocale,
    title: article.titleByLocale[locale],
    description: article.descriptionByLocale[locale],
    keywords: [article.titleByLocale[locale], "insights"],
    type: "article",
  });
}

export default async function LocalizedInsightArticlePage({ params }) {
  const resolved = await params;
  const locale = resolveLocale(resolved.locale);
  const article = getLocalizedInsightBySlug(locale, resolved.slug);
  if (!article) {
    notFound();
  }

  const routeByLocale = getRouteByLocaleForInsight(article.id);
  if (!routeByLocale) {
    notFound();
  }

  const currentPath = routeByLocale[locale];
  const relatedRouteKey = article.id === "insightZiweiBasics" ? "ziwei" : "sukuyo";
  const serviceLink = I18N_ROUTE_MAP[relatedRouteKey][locale];
  const insightHubLink = I18N_ROUTE_MAP.insights[locale];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    mainEntity: article.faqByLocale[locale].map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.titleByLocale[locale],
    description: article.descriptionByLocale[locale],
    inLanguage: LOCALE_CONFIG[locale].htmlLang,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://code-destiny.com${currentPath}`,
    },
  };

  return (
    <main lang={locale} className="mx-auto w-full max-w-4xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="rounded-3xl border border-white/10 bg-[#10182c] px-5 py-6 md:px-8 md:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {getLocaleLinksForRoute(article.id).map((item) => {
            const isCurrent = item.href === currentPath;
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

        <h1 className="text-2xl font-semibold leading-tight text-amber-50 md:text-4xl">{article.h1ByLocale[locale]}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{article.descriptionByLocale[locale]}</p>
      </div>

      <article className="mt-6 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        {article.bodyByLocale[locale].map((paragraph, index) => (
          <p key={`${article.id}-${index}`} className="mb-4 text-sm leading-8 text-slate-200 md:text-base">
            {paragraph}
          </p>
        ))}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={serviceLink} className="rounded-xl border border-cyan-300/35 bg-cyan-700/25 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/35">
            Related Service
          </Link>
          <Link href={insightHubLink} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
            More Insights
          </Link>
        </div>
      </article>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11192f] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">FAQ</h2>
        <div className="mt-4 space-y-3">
          {article.faqByLocale[locale].map((item) => (
            <details key={item.question} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
