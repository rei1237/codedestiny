import Link from "next/link";
import { SEO_SITE_CONFIG } from "../../lib/seo/siteConfig";

function toAbsolute(path) {
  return new URL(path, SEO_SITE_CONFIG.siteUrl).toString();
}

export default function I18nSeoPageTemplate({
  locale,
  localeLabel,
  languageLinks,
  content,
  currentPath,
  inLanguage,
}) {
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.h1,
    description: content.description,
    url: toAbsolute(currentPath),
    inLanguage,
    isPartOf: {
      "@type": "WebSite",
      name: "Code Destiny",
      url: SEO_SITE_CONFIG.siteUrl,
      inLanguage,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage,
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main lang={locale} className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <section className="rounded-3xl border border-white/10 bg-[#111827] px-5 py-6 md:px-8 md:py-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          {languageLinks.map((item) => {
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

        <h1 className="text-2xl font-semibold leading-tight text-amber-50 md:text-4xl">{content.h1}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{content.intro}</p>

        <div className="mt-5 inline-flex rounded-xl border border-emerald-200/35 bg-emerald-900/25 px-3 py-2 text-xs text-emerald-100">
          <span>{content.mainKeyword}</span>
        </div>

        <Link
          href={content.cta.href}
          className="mt-6 inline-flex rounded-xl border border-cyan-300/35 bg-cyan-700/25 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-600/35"
        >
          {content.cta.label}
        </Link>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">{localeLabel}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-200 md:text-base">
          {content.valuePoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11192f] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">Related Links</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {content.internalLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1628] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">FAQ</h2>
        <div className="mt-4 space-y-3">
          {content.faq.map((item) => (
            <details key={item.question} className="rounded-xl border border-white/15 bg-white/5 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">{item.question}</summary>
              <p className="mt-2 text-sm leading-7 text-slate-200">{item.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-slate-400">{content.disclaimer}</p>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  );
}
