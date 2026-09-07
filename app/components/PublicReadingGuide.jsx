import { PUBLIC_READING_COPY } from "../../lib/i18n/public-reading-copy.mjs";

export default function PublicReadingGuide({ locale, topic }) {
  const sections = PUBLIC_READING_COPY[locale]?.[topic];
  if (!sections) return null;
  return <div className="mx-auto w-full max-w-3xl px-4 py-8 text-slate-100 md:px-6">
    {sections.map(([heading, body]) => <section key={heading} className="mb-8">
      <h2 className="text-xl font-semibold leading-relaxed text-amber-100">{heading}</h2>
      <p className="mt-3 text-base leading-8 text-slate-200">{body}</p>
    </section>)}
  </div>;
}
