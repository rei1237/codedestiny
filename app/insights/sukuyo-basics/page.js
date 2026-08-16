import Link from "next/link";
import { createI18nMetadata } from "../../../lib/seo/createI18nMetadata";
import { getAlternatesByRouteKey, getLocaleLinksForRoute, I18N_ROUTE_MAP } from "../../../lib/i18n/routes";
import { I18N_INSIGHT_ARTICLES } from "../../../lib/seo/i18nInsights";
import { getEditorNote } from "../../_content/editor-notes";
import EditorNote from "../../components/EditorNote";

const article = I18N_INSIGHT_ARTICLES.find((item) => item.id === "insightSukuyoBasics");

export const metadata = createI18nMetadata({
  locale: "ko",
  routeByLocale: getAlternatesByRouteKey("insightSukuyoBasics"),
  title: article.titleByLocale.ko,
  description: article.descriptionByLocale.ko,
  keywords: [article.titleByLocale.ko, "숙요점"],
  type: "article",
});

export default function SukuyoBasicsInsightPage() {
  const faq = article.faqByLocale.ko;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <div className="rounded-3xl border border-white/10 bg-[#10182c] px-5 py-6 md:px-8 md:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {getLocaleLinksForRoute("insightSukuyoBasics").map((item) => (
            <Link
              key={item.hrefLang}
              href={item.href}
              hrefLang={item.hrefLang}
              lang={item.hrefLang}
              className={`rounded-full border px-3 py-1 ${item.href === I18N_ROUTE_MAP.insightSukuyoBasics.ko ? "border-amber-300/60 bg-amber-100/10 text-amber-100" : "border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <h1 className="text-2xl font-semibold leading-tight text-amber-50 md:text-4xl">{article.h1ByLocale.ko}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{article.descriptionByLocale.ko}</p>
      </div>

      <EditorNote note={getEditorNote("/insights/sukuyo-basics")} className="mt-6" />

      <article className="mt-6 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        {article.bodyByLocale.ko.map((paragraph, index) => (
          <p key={`ko-sukuyo-${index}`} className="mb-4 text-sm leading-8 text-slate-200 md:text-base">
            {paragraph}
          </p>
        ))}
        <Link href="/sukuyo" className="mt-4 inline-flex rounded-xl border border-cyan-300/35 bg-cyan-700/25 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/35">
          숙요점 서비스로 이동
        </Link>
      </article>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11192f] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">FAQ</h2>
        <div className="mt-4 space-y-3">
          {faq.map((item) => (
            <details key={item.question} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
