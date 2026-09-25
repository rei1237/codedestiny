import Link from "next/link";
import { TAROT_PROMPT_GUIDE_COPY } from "../../../lib/i18n/tarot-prompt-guide";

export default function TarotPromptGuide() {
  const copy = TAROT_PROMPT_GUIDE_COPY.ko;
  return (
    <article lang="ko" data-article-body="true" className="mx-auto w-full max-w-[960px] px-6 py-12 text-base leading-8 text-[#f5e8ff] sm:px-10">
      <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{copy.title}</h1>
      <p className="mt-4 max-w-prose">{copy.intro}</p>
      <h2 className="mb-3 mt-10 text-xl font-semibold">{copy.stepsTitle}</h2>
      <ol className="max-w-prose list-decimal space-y-3 pl-6">
        {copy.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <h2 className="mb-3 mt-10 text-xl font-semibold">{copy.exampleTitle}</h2>
      <p className="max-w-prose">{copy.example}</p>
      <h2 className="mb-3 mt-10 text-xl font-semibold">{copy.decksTitle}</h2>
      <p className="max-w-prose">{copy.decks}</p>
      <h2 className="mb-3 mt-10 text-xl font-semibold">{copy.limitsTitle}</h2>
      <p className="max-w-prose">{copy.limits}</p>
      <nav aria-label={copy.navigation} className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {[["/insights/tarot/", copy.tarot], ["/methodology/", copy.methodology], ["/contact/", copy.contact]].map(([href, label]) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center text-[#e8d5a3] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{label}</Link>
        ))}
      </nav>
    </article>
  );
}
