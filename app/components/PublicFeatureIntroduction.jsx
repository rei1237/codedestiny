import Image from "next/image";
import Link from "next/link";
import { FEATURE_INTRODUCTIONS, INTRO_ACTIONS, INTRO_CTA_PATHS, INTRO_TOPICS, INTRO_UI, introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "../../lib/structured-data";
import styles from "./PublicFeatureIntroduction.module.css";

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
  return <main lang={locale} className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{copy.heading}</h1>
        <p className={styles.updated}>{ui.updated}: <time dateTime="2026-09-08">2026-09-08</time></p>
      </div>
      <Image className={styles.pig} src="/icons/app-logo-512.webp" alt="Code Destiny" width={512} height={512} sizes="(max-width: 720px) 88px, 132px" priority />
    </header>
    <div className={styles.content}>
      {copy.sections.map(([heading, body]) => <section key={heading} className={styles.section}>
        <h2>{heading}</h2>
        <p>{body}</p>
      </section>)}
      <section className={styles.access}>
        <h2>{ui.accessTitle}</h2>
        <p>{ui.access}</p>
        <a className={styles.cta} href={ctaHref}>{ui.start}</a>
      </section>
      <details className={styles.faq}>
        <summary>{ui.faq} · {ui.question}</summary>
        <div className={styles.faqBody}>
          <p>{ui.answer}</p>
          <p className={styles.caution}>{ui.caution}</p>
        </div>
      </details>
    </div>
    <nav className={styles.related} aria-label={ui.related}>
      {INTRO_TOPICS.filter(key => key !== topic).map(key => <Link key={key} href={`/${locale}/${key}/`}>{FEATURE_INTRODUCTIONS[key][locale].heading}</Link>)}
      <Link href={`/${locale}/contact/`}>{ui.contact}</Link>
    </nav>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />
  </main>;
}
