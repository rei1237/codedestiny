import Link from "next/link";
import { notFound } from "next/navigation";
import { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug } from "../seed-articles";

export const dynamicParams = false;

export function generateStaticParams() {
  return INSIGHT_SEED_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);

  if (!article) {
    return {
      title: "인사이트를 찾을 수 없습니다 | Code Destiny",
      description: "요청한 인사이트 글이 존재하지 않습니다.",
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: "/insights",
      },
    };
  }

  const path = `/insights/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: `https://code-destiny.com${path}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);

  if (!article) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <p className="text-xs text-slate-500">운세 인사이트 · {article.category}</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-slate-900 md:text-4xl">{article.title}</h1>
        <p className="mt-4 text-base leading-8 text-slate-700">{article.description}</p>

        <div className="mt-8 space-y-7">
          {article.sections.map((section) => (
            <section key={`${article.slug}-${section.heading}`}>
              <h2 className="text-xl font-semibold leading-8 text-slate-900">{section.heading}</h2>
              <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <Link href="/insights" className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 hover:bg-slate-50">
            인사이트 목록으로 돌아가기
          </Link>
        </div>
      </article>
    </main>
  );
}
