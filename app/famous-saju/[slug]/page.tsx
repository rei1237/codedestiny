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
    return generatePageMetadata({
      path: `/famous-saju/${params.slug}`,
      title: "유명인 사주 분석 | Code Destiny",
      description: "유명인 사주 분석 상세 페이지입니다.",
      keywords: ["유명인 사주", "사주풀이"],
    });
  }

  const { celebrity, dayMasterLabel, dayElement } = reading;
  return generatePageMetadata({
    path: `/famous-saju/${celebrity.slug}`,
    title: `${celebrity.name} 사주풀이 | ${dayMasterLabel} 유명인 사주 분석`,
    description: `${celebrity.name}의 공개 생년월일을 기존 사주 엔진으로 계산해 연주·월주·일주${celebrity.birthTimeStatus === "verified" ? "·시주" : ""}, 오행 흐름, 직업운과 관계운을 분석합니다.`,
    keywords: [...celebrity.seoKeywords, `${dayElement} 일간`, dayMasterLabel, `${celebrity.name} 사주풀이`],
  });
}

function PillarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default async function FamousSajuDetailPage({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) notFound();

  const { celebrity, saju, dayMasterLabel, hourText, elementProfile, summary, sections, timeNotice } = reading;
  const related = getCelebrityRelatedList(celebrity);
  const heroImage = await getPexelsSectionImage(`${celebrity.category} destiny portrait night sky`, "destiny");
  const sectionImages = await Promise.all(
    sections.map((section) => getPexelsSectionImage(section.imageQuery, section.imageSection)),
  );
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: celebrity.name,
    alternateName: celebrity.nameEn,
    birthDate: celebrity.birthDate,
    jobTitle: celebrity.category,
    url: `https://code-destiny.com/famous-saju/${celebrity.slug}`,
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#221844_0%,#0d1022_48%,#060814_100%)] text-slate-100">
      <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <Link href="/famous-saju" className="text-sm font-semibold text-amber-100/80 hover:text-amber-50">
          유명인 사주 아카이브
        </Link>

        <header className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-amber-100/80">{celebrity.category}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">
              {celebrity.name} 사주풀이와 운세 흐름 분석
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-300">{summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {celebrity.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <figure className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <img src={heroImage.src} alt={heroImage.alt} className="h-64 w-full object-cover" />
            {heroImage.source === "pexels" && heroImage.credit ? (
              <figcaption className="px-3 py-2 text-xs text-slate-400">
                Photo by <a className="underline" href={heroImage.creditUrl} rel="noreferrer" target="_blank">{heroImage.credit}</a> on Pexels
              </figcaption>
            ) : null}
          </figure>
        </header>

        <section className="mt-8 rounded-2xl border border-amber-200/20 bg-amber-100/[0.06] p-4 text-sm leading-7 text-amber-50/90">
          {timeNotice}
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-4">
          <PillarBox label="연주" value={saju.pillars.year.ganji} />
          <PillarBox label="월주" value={saju.pillars.month.ganji} />
          <PillarBox label="일주" value={saju.pillars.day.ganji} />
          <PillarBox label="시주" value={saju.pillars.hour?.ganji || hourText} />
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">{dayMasterLabel} 오행 분석</h2>
          <div className="mt-5 grid gap-3">
            {Object.entries(elementProfile.ratios).map(([element, pct]) => (
              <div key={element} className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="font-semibold text-slate-200">{element}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-amber-200" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-right text-slate-300">{pct}%</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {sections.map((section, index) => {
            const image = sectionImages[index];
            return (
              <section key={section.title} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                <img src={image.src} alt={image.alt} className="h-52 w-full object-cover" loading="lazy" />
                <div className="p-5 md:p-7">
                  <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                  <p className="mt-3 text-base leading-8 text-slate-300">{section.body}</p>
                  {image.source === "pexels" && image.credit ? (
                    <p className="mt-4 text-xs text-slate-500">
                      Photo by <a className="underline" href={image.creditUrl} rel="noreferrer" target="_blank">{image.credit}</a> on Pexels
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white">함께 보면 좋은 유명인 사주</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link key={item.slug} href={`/famous-saju/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
                <p className="text-sm text-amber-100/70">{item.category}</p>
                <p className="mt-1 font-semibold text-white">{item.name}</p>
                <p className="mt-2 text-sm text-slate-400">{item.tags.slice(0, 2).join(" · ")}</p>
              </Link>
            ))}
          </div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
    </main>
  );
}
