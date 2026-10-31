import Link from "next/link";
import { TRUST_COPY, TRUST_UI, TRUST_UPDATED, trustRoutes } from "../../lib/i18n/public-trust-copy.mjs";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { mergeOfficialInformation, OFFICIAL_INFORMATION_UPDATED } from "../../lib/brand/official-information.mjs";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import CommerceDisclosure from "./CommerceDisclosure";

export function trustMetadata(locale, pageKey) {
  const copy = TRUST_COPY[locale][pageKey];
  return generatePageMetadata({ path: trustRoutes(pageKey)[locale], title: copy.title, description: copy.description, inLanguage: locale, hreflangPaths: trustRoutes(pageKey) });
}

export default function LocalizedTrustPage({ locale, pageKey }) {
  const copy = TRUST_COPY[locale][pageKey];
  const ui = TRUST_UI[locale];
  const sections = pageKey === "faq"
    ? mergeOfficialInformation(copy.sections.map(([question, answer]) => ({ question, answer })), locale).map(item => [item.question, item.answer, item.id, item.links])
    : copy.sections;
  const updated = pageKey === "faq" && ["en", "ja"].includes(locale) ? OFFICIAL_INFORMATION_UPDATED : TRUST_UPDATED;
  const links = ["about", "faq", "contact", "disclaimer", "privacy", "terms", "refund"];
  const policyPaths = { privacy: "privacy-policy", terms: "terms-of-service", refund: "refund-policy" };
  const graph = [
    // Organization and WebSite are defined once by the root layout.
    buildWebPageJsonLd({ title: copy.title, description: copy.description, path: trustRoutes(pageKey)[locale], locale }),
    buildBreadcrumbJsonLd([{ name: ui.home, path: `/${locale}/` }, { name: ui[pageKey], path: trustRoutes(pageKey)[locale] }]),
    ...(pageKey === "faq" ? [buildFaqPageJsonLd(sections.map(([question, answer]) => ({ question, answer })))] : []),
  ];
  return (
    <main className="policy-doc" lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />
      <header className="policy-doc__head">
        <h1 className="policy-doc__title">{ui[pageKey]}</h1>
        <p className="policy-doc__meta">{ui.updated}: <time dateTime={updated}>{updated}</time></p>
        <p>{copy.intro}</p>
      </header>
      <div className="policy-doc__single"><div className="policy-doc__body"><div className="policy-embed-body">
        {pageKey === "contact" && <CommerceDisclosure locale={locale} />}
        {sections.map(([heading, body, id, productLinks]) => <section className="policy-embed-section" key={heading} id={id}>
          <h2 className="policy-embed-heading">{heading}</h2><p>{body}</p>
          {productLinks?.length > 0 && <div className="cd-chip-wrap">{productLinks.map(link => <Link className="cd-chip" key={link.href} href={link.href}>{link.label}</Link>)}</div>}
        </section>)}
        <section className="policy-embed-section">
          <h2 className="policy-embed-heading">{ui.contact}</h2>
          <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </section>
        <nav aria-label={ui.related} className="cd-chip-wrap">
          {links.map(key => <Link key={key} className="cd-chip" href={`/${locale}/${policyPaths[key] || key}/`}>{ui[key]}</Link>)}
        </nav>
      </div></div></div>
    </main>
  );
}
