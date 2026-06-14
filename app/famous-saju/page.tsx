import Link from "next/link";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { generatePageMetadata } from "../../lib/generate-page-metadata";
import { buildCelebrityReading, categoryToSlug, famousSajuCategories, publishedCelebritySajuSeeds } from "../../lib/famous-saju/celebrity-saju-service";

export const metadata = generatePageMetadata({
  path: "/famous-saju",
  title: "유명인 사주 분석 아카이브",
  description: "역사 위인, K-스타, 배우, 가수, 스포츠 스타의 생년월일을 바탕으로 내부 사주 엔진이 계산한 일간·오행·사주 흐름을 정리한 유명인 사주 분석 아카이브입니다.",
  keywords: ["유명인 사주", "연예인 사주", "BTS 사주", "아이유 사주", "손흥민 사주", "유명인 사주풀이"],
});

function CelebrityCard({ slug }: { slug: string }) {
  const celebrity = publishedCelebritySajuSeeds.find((item) => item.slug === slug);
  const reading = celebrity ? buildCelebrityReading(celebrity) : null;
  if (!celebrity || !reading) return null;

  return (
    <Link href={`/insights/famous-saju/${celebrity.slug}`} className="group rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:border-amber-200/50 hover:bg-white/[0.075]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-amber-100/70">{celebrity.category}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{celebrity.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{celebrity.birthDate?.slice(0, 4)}년생 · {reading.dayMasterLabel}</p>
        </div>
        <span className="rounded-full border border-amber-200/30 px-2.5 py-1 text-xs text-amber-100">{reading.elementProfile.dominantElement}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{celebrity.shortBio}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {celebrity.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">{tag}</span>)}
      </div>
      <p className="mt-4 text-sm font-semibold text-amber-100 group-hover:text-amber-50">사주 풀이 보기</p>
    </Link>
  );
}

export default function FamousSajuPage() {
  const webPage = buildWebPageJsonLd({
    title: "유명인 사주 분석 아카이브",
    description: "내부 사주 엔진 계산 결과를 바탕으로 유명인의 일간, 오행, 직업운 흐름을 읽는 아카이브입니다.",
    path: "/famous-saju",
  });
  const breadcrumb = buildBreadcrumbJsonLd([{ name: "홈", path: "/" }, { name: "유명인 사주", path: "/famous-saju" }]);

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100">
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-amber-100/80">Famous Saju Archive</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">유명인 사주 분석 아카이브</h1>
          <p className="mt-5 text-base leading-8 text-slate-300">공개된 생년월일을 바탕으로 내부 사주 엔진이 연주·월주·일주를 계산합니다. 출생 시간이 공개되지 않은 인물은 시주를 만들지 않고 시간 미상으로 표시합니다.</p>
        </div>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label="유명인 사주 카테고리">
          {famousSajuCategories.map((category) => (
            <Link key={category} href={`/famous-saju/category/${categoryToSlug(category)}`} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-200/50 hover:text-amber-100">{category}</Link>
          ))}
        </nav>
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedCelebritySajuSeeds.map((item) => <CelebrityCard key={item.slug} slug={item.slug} />)}
        </section>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </main>
  );
}
