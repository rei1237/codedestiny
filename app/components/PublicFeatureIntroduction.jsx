import Link from "next/link";
import { FEATURE_INTRODUCTIONS, INTRO_ACTIONS, INTRO_CTA_PATHS, INTRO_TOPICS, INTRO_UI, introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";

export function introductionMetadata(locale, topic) {
  const copy = FEATURE_INTRODUCTIONS[topic][locale];
  return generatePageMetadata({ path: introductionRoutes(topic)[locale], title: copy.title, description: copy.description, inLanguage: locale, hreflangPaths: introductionRoutes(topic) });
}

export default function PublicFeatureIntroduction({ locale, topic }) {
  const copy = FEATURE_INTRODUCTIONS[topic][locale];
  const ui = INTRO_UI[locale];
  const faq = [{ question: ui.question, answer: ui.answer }];
  const graph = [
    buildBreadcrumbJsonLd([{ name: ui.home, path: `/${locale}/` }, { name: copy.heading, path: introductionRoutes(topic)[locale] }]),
    buildFaqPageJsonLd(faq),
  ];
  const ctaHref = INTRO_CTA_PATHS[topic] || `/${locale}/?action=${INTRO_ACTIONS[topic]}`;
  return <main lang={locale} className="mx-auto w-full max-w-3xl px-4 py-8 text-slate-100 md:px-6">
    <header>
      <h1 className="text-3xl font-semibold leading-relaxed text-amber-100">{copy.heading}</h1>
      <p className="mt-4 text-sm text-slate-300">{ui.updated}: <time dateTime="2026-09-08">2026-09-08</time></p>
    </header>
    {copy.sections.map(([heading, body]) => <section key={heading} className="mt-8">
      <h2 className="text-xl font-semibold leading-relaxed text-amber-100">{heading}</h2>
      <p className="mt-3 text-base leading-8 text-slate-200">{body}</p>
    </section>)}
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-amber-100">{ui.accessTitle}</h2>
      <p className="mt-3 text-base leading-8 text-slate-200">{ui.access}</p>
      <a className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-200/40 px-4 py-2 text-amber-100" href={ctaHref}>{ui.start}</a>
    </section>
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-amber-100">{ui.faq}</h2>
      <h3 className="mt-4 text-lg font-semibold">{ui.question}</h3>
      <p className="mt-3 text-base leading-8 text-slate-200">{ui.answer}</p>
      <p className="mt-4 text-sm leading-7 text-slate-300">{ui.caution}</p>
    </section>
    <nav className="mt-8 flex flex-wrap gap-4" aria-label={ui.related}>
      {INTRO_TOPICS.filter(key => key !== topic).map(key => <Link className="inline-flex min-h-11 items-center underline" key={key} href={`/${locale}/${key}/`}>{FEATURE_INTRODUCTIONS[key][locale].heading}</Link>)}
      <Link className="inline-flex min-h-11 items-center underline" href={`/${locale}/contact/`}>{ui.contact}</Link>
    </nav>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />
  </main>;
}
