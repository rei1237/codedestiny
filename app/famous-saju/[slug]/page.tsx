import Link from "next/link";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { getPexelsSectionImage } from "../../../lib/server/pexels";
import { getCelebrityRelatedList, getCelebritySajuPage, publishedCelebritySajuSeeds } from "../../../lib/famous-saju/celebrity-saju-service";

type PageProps = { params: { slug: string } };

export function generateStaticParams() {
  return publishedCelebritySajuSeeds.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) {
    return generatePageMetadata({ path: `/famous-saju/${params.slug}`, title: "유명인 사주 분석 | Code Destiny", description: "유명인 사주 분석 상세 페이지입니다.", keywords: ["유명인 사주", "사주풀이"] });
  }
  const { celebrity, dayMasterLabel, dayElement } = reading;
  return generatePageMetadata({
    path: `/famous-saju/${celebrity.slug}`,
    title: `${celebrity.name} 사주풀이 | ${dayMasterLabel} ${celebrity.category} 성격·직업운 분석`,
    description: `${celebrity.name}의 공개 생년월일을 기준으로 내부 사주 엔진이 계산한 일간, 오행, 직업운, 관계 흐름 분석입니다.`,
    keywords: [...celebrity.seoKeywords, `${dayElement} 일간`, dayMasterLabel],
  });
}

function PillarBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>;
}

export default async function FamousSajuDetailPage({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) notFound();
  const { celebrity, saju, dayMasterLabel, hourText, elementProfile, summary, sections } = reading;
  const related = getCelebrityRelatedList(celebrity);
  const image = await getPexelsSectionImage(`${celebrity.category} destiny stars`, "career");
  const personJsonLd = { "@context": "https://schema.org", "@type": "Person", name: celebrity.name, alternateName: celebrity.nameEn, birthDate: celebrity.birthDate, jobTitle: celebrity.category, url: `https://code-destiny.com/famous-saju/${celebrity.slug}` };

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100">
      <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <Link href="/famous-saju" className="text-sm text-amber-100/80 hover:text-amber-50">유명인 사주 아카이브</Link>
        <header className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-amber-100/80">{celebrity.category}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">{celebrity.name} 사주풀이와 운세 흐름 분석</h1>
            <p className="mt-5 text-base leading-8 text-slate-300">{summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">{celebrity.tags.map((tag) => <span key={tag} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200">{tag}</span>)}</div>
          </div>
          <figure className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <img src={image.src} alt={image.alt} className="h-56 w-full object-cover" loading="lazy" />
            {image.source === "pexels" && image.credit ? <figcaption className="px-3 py-2 text-xs text-slate-400">Photo by <a className="underline" href={image.creditUrl} rel="noreferrer" target="_blank">{image.credit}</a> on Pexels</figcaption> : null}
          </figure>
        </header>
        <section className="mt-8 rounded-lg border border-amber-200/20 bg-amber-100/[0.06] p-4 text-sm leading-7 text-amber-50/90">
          {saju.timeUnknown ? "출생 시간이 공개되어 있지 않아 시주는 제외하고 연주·월주·일주 중심으로 분석했습니다." : `공개된 출생 시간 ${celebrity.birthTime} 기준으로 시주(${hourText})까지 함께 계산했습니다.`}
        </section>
        <section className="mt-8 grid gap-3 sm:grid-cols-4">
          <PillarBox label="연주" value={saju.pillars.year.ganji} />
          <PillarBox label="월주" value={saju.pillars.month.ganji} />
          <PillarBox label="일주" value={saju.pillars.day.ganji} />
          <PillarBox label="시주" value={saju.pillars.hour?.ganji || "시간 미상"} />
        </section>
        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">{dayMasterLabel} 오행 분석</h2>
          <div className="mt-5 grid gap-3">{Object.entries(elementProfile.ratios).map(([element, pct]) => <div key={element} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3 text-sm"><span className="font-semibold text-slate-200">{element}</span><span className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-amber-200" style={{ width: `${pct}%` }} /></span><span className="text-right text-slate-300">{pct}%</span></div>)}</div>
        </section>
        <section className="mt-8 grid gap-4">{sections.map((section) => <section key={section.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5"><h2 className="text-xl font-semibold text-white">{section.title}</h2><p className="mt-3 text-base leading-8 text-slate-300">{section.body}</p></section>)}</section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white">함께 보면 좋은 유명인 사주</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <Link key={item.slug} href={`/famous-saju/${item.slug}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50"><p className="text-sm text-amber-100/70">{item.category}</p><p className="mt-1 font-semibold text-white">{item.name}</p><p className="mt-2 text-sm text-slate-400">{item.tags.slice(0, 2).join(" · ")}</p></Link>)}</div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
    </main>
  );
}
