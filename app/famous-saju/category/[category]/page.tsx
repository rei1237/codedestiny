import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { categoryToSlug, getCelebritiesByCategory, publishedCelebritySajuSeeds } from "../../../../lib/famous-saju/celebrity-saju-service";

type PageProps = { params: { category: string } };

const categorySlugs = Array.from(new Set(publishedCelebritySajuSeeds.map((item) => categoryToSlug(item.category))));

export function generateStaticParams() {
  return categorySlugs.map((category) => ({ category }));
}

function getCategoryLabel(slug: string) {
  return publishedCelebritySajuSeeds.find((item) => categoryToSlug(item.category) === slug)?.category || "";
}

export function generateMetadata({ params }: PageProps) {
  const label = getCategoryLabel(params.category);
  return generatePageMetadata({
    path: `/famous-saju/category/${params.category}`,
    title: `${label || "유명인"} 사주 분석 모음`,
    description: `${label || "유명인"} 분야 인물들의 일간, 오행, 직업운 흐름을 내부 사주 엔진 계산 기반으로 모아본 페이지입니다.`,
    keywords: [`${label} 사주`, "유명인 사주", "연예인 사주", "사주풀이"],
  });
}

export default function FamousSajuCategoryPage({ params }: PageProps) {
  const label = getCategoryLabel(params.category);
  if (!label) notFound();
  const items = getCelebritiesByCategory(params.category);

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100">
      <section className="mx-auto max-w-5xl px-5 py-12">
        <Link href="/famous-saju" className="text-sm text-amber-100/80 hover:text-amber-50">유명인 사주 아카이브</Link>
        <h1 className="mt-5 text-3xl font-bold tracking-normal text-white sm:text-5xl">{label} 사주 분석 모음</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">공개 생년월일이 있는 {label} 인물만 노출하며, 출생 시간이 공개되지 않은 경우 시주는 제외합니다.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-lg border border-white/10 bg-white/[0.045] p-4 hover:border-amber-200/50">
              <p className="text-sm text-amber-100/70">{item.birthDate?.slice(0, 4)}년생</p>
              <h2 className="mt-2 text-lg font-semibold text-white">{item.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.shortBio}</p>
              <div className="mt-4 flex flex-wrap gap-2">{item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">{tag}</span>)}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
