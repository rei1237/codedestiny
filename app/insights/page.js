import Link from "next/link";
import { INSIGHT_SEED_ARTICLES } from "./seed-articles";

export const metadata = {
  title: "운세 인사이트 | Code Destiny",
  description:
    "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
  alternates: {
    canonical: "/insights",
  },
  openGraph: {
    type: "website",
    title: "운세 인사이트 | Code Destiny",
    description:
      "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
    url: "https://code-destiny.com/insights",
  },
  twitter: {
    card: "summary_large_image",
    title: "운세 인사이트 | Code Destiny",
    description:
      "사주, 자미두수, 숙요점, 타로, 점성술을 실제 생활 전략으로 번역한 장문 인사이트 아카이브입니다.",
  },
};

export default function InsightsPage() {
  const cards = INSIGHT_SEED_ARTICLES;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <p className="text-xs tracking-[0.16em] text-slate-500">FORTUNE INSIGHTS</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 md:text-4xl">운세 인사이트</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">
          Code Destiny 서비스에서 실제로 자주 받는 질문을 바탕으로, 사주·자미두수·숙요점·타로·점성술을
          과장 없는 설명형 글로 정리했습니다. 각 글은 핵심 원리와 실전 적용 방법을 함께 담고 있습니다.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((article, index) => (
          <article key={article.slug} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">초기 인사이트 {index + 1} · {article.category}</p>
            <h2 className="mt-2 text-lg font-semibold leading-7 text-slate-900">
              <Link href={`/insights/${article.slug}`} className="hover:underline">
                {article.title}
              </Link>
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">{article.description}</p>
            <div className="mt-4">
              <Link
                href={`/insights/${article.slug}`}
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
              >
                글 읽기
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
