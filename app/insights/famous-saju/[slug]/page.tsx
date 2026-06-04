import Link from "next/link";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { getPexelsSectionImage } from "../../../../lib/server/pexels";
import { getCelebrityRelatedList, getCelebritySajuPage, getFamousSajuSeoMetadata, getPublishedCelebrityStaticSlugs, publishedCelebritySajuSeeds } from "../../../../lib/famous-saju/celebrity-saju-service";

type PageProps = { params: { slug: string } };

export function generateStaticParams() {
  return getPublishedCelebrityStaticSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) {
    return generatePageMetadata({
      path: "/insights/famous-saju",
      title: "유명인 사주 분석 | 운세 인사이트 허브 | Code Destiny",
      description: "유명인 사주 분석 글을 찾지 못했습니다. 운세 인사이트 허브에서 공개 생년월일 기반 유명인 사주 글을 확인할 수 있습니다.",
      keywords: ["유명인 사주", "운세 인사이트", "사주 분석"],
    });
  }

  return generatePageMetadata(getFamousSajuSeoMetadata(reading.celebrity, reading));
}

function PillarBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function UnknownCelebrityPage({ slug }: { slug: string }) {
  const suggestions = publishedCelebritySajuSeeds.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100">
      <section className="mx-auto max-w-5xl px-5 py-14">
        <Link href="/insights" className="text-sm font-semibold text-amber-100/80 hover:text-amber-50">
          운세 인사이트 허브
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-white sm:text-5xl">아직 준비되지 않은 유명인 사주입니다</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          요청한 slug <span className="text-amber-100">{decodeURIComponent(String(slug || ""))}</span>에 맞는 공개 유명인 데이터를 찾지 못했습니다. 아래 글이나 유명인 사주 분석 목록에서 다른 사주 콘텐츠를 확인할 수 있습니다.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/insights/famous-saju" className="rounded-lg border border-amber-200/40 bg-amber-100/10 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-100/15">
            유명인 사주 목록
          </Link>
          <Link href="/insights" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-200/40">
            운세 인사이트 허브
          </Link>
        </div>
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((item) => (
            <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
              <p className="text-sm text-amber-100/70">{item.category}</p>
              <h2 className="mt-1 font-semibold text-white">{item.nameKo}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.tags.slice(0, 3).join(" · ")}</p>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}

export default async function FamousSajuInsightDetailPage({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) return <UnknownCelebrityPage slug={params.slug} />;

  const { celebrity, saju, calculationStatus, dayMasterLabel, hourText, elementProfile, summary, sections, timeNotice, engineInputSummary, heroImageQuery, heroCopy, coreKeywords, analysisBadge, insightCards, reliabilityNotes } = reading;
  const related = getCelebrityRelatedList(celebrity);
  const heroImage = await getPexelsSectionImage(heroImageQuery, "default");
  const sectionImages = await Promise.all(
    sections.map((section) => getPexelsSectionImage(section.imageQuery, section.imageSection)),
  );
  const canonicalPath = `/insights/famous-saju/${celebrity.slug}`;
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: celebrity.nameKo,
    alternateName: celebrity.nameEn,
    birthDate: celebrity.birthDate,
    jobTitle: celebrity.category,
    url: `https://code-destiny.com${canonicalPath}`,
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${celebrity.nameKo} 사주 분석`,
    description: summary,
    mainEntityOfPage: `https://code-destiny.com${canonicalPath}`,
    author: { "@type": "Organization", name: "Code Destiny" },
    publisher: { "@type": "Organization", name: "Code Destiny" },
    inLanguage: "ko-KR",
  };
  const insightLinks = [
    { href: "/insights/saju-four-pillars-basics", title: "사주팔자 기초 가이드", description: "연주·월주·일주·시주의 기본 흐름을 먼저 이해합니다." },
    { href: "/insights/ten-heavenly-stems-practical", title: "십간으로 보는 일간 감각", description: "갑을병정부터 임계까지 일간의 색을 쉽게 읽습니다." },
    { href: "/insights/twelve-earthly-branches-and-seasons", title: "지지와 계절감 읽기", description: "월지와 계절의 기운이 사주 전체에 주는 리듬을 살핍니다." },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#221844_0%,#0d1022_48%,#060814_100%)] text-slate-100">
      <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-amber-100/80">
          <Link href="/insights" className="hover:text-amber-50">운세 인사이트 허브</Link>
          <span className="text-slate-500">/</span>
          <Link href="/insights/famous-saju" className="hover:text-amber-50">유명인 사주 분석</Link>
        </div>

        <header className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-amber-100/80">{celebrity.category}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-normal text-white sm:text-5xl">
              {celebrity.nameKo} 사주 분석: {dayMasterLabel}과 오행 흐름
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">{heroCopy}</p>
            <p className="mt-4 inline-flex rounded-full border border-amber-200/30 bg-amber-100/10 px-3 py-1.5 text-sm font-semibold text-amber-50">
              {analysisBadge}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {coreKeywords.map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-slate-200">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <figure className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <img src={heroImage.src} alt={heroImage.alt} width={1200} height={627} className="h-64 w-full object-cover" />
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

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {insightCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <p className="text-xs text-slate-400">{card.label}</p>
              <p className="mt-2 text-lg font-semibold text-white">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
            </div>
          ))}
        </section>

        {saju ? (
          <section className="mt-8 grid gap-3 sm:grid-cols-4">
            <PillarBox label="연주" value={saju.pillars.year.ganji} />
            <PillarBox label="월주" value={saju.pillars.month.ganji} />
            <PillarBox label="일주" value={saju.pillars.day.ganji} />
            <PillarBox label="시주" value={saju.pillars.hour?.ganji || hourText} />
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-semibold text-white">계산 데이터 확인 필요</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{engineInputSummary}</p>
          </section>
        )}

        {calculationStatus === "calculated" && saju ? (
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
        ) : null}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="text-xl font-semibold text-white">분석 기준</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reliabilityNotes.map((note) => (
              <div key={note.label} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <p className="text-sm font-semibold text-amber-100">{note.label} · {note.level}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{note.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {sections.map((section, index) => {
            const image = sectionImages[index];
            return (
              <section key={section.title} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
                <img src={image.src} alt={image.alt} width={1200} height={627} className="h-52 w-full object-cover" loading="lazy" />
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
          <h2 className="text-xl font-semibold text-white">관련 글 추천</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">비슷한 분야의 유명인 사주와 운세 인사이트 글을 이어서 읽어볼 수 있습니다.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
                <p className="text-sm text-amber-100/70">{item.category}</p>
                <p className="mt-1 font-semibold text-white">{item.nameKo}</p>
                <p className="mt-2 text-sm text-slate-400">{item.tags.slice(0, 2).join(" · ")}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {insightLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-amber-200/20 bg-amber-100/[0.06] p-5">
          <h2 className="text-xl font-semibold text-white">내 사주도 이어서 보기</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/saju/basic/play" className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-50">
              내 사주도 분석해보기
            </Link>
            <Link href="/insights" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-200/40">
              운세 인사이트 더 보기
            </Link>
            <Link href="/compatibility" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-200/40">
              궁합으로 확장하기
            </Link>
            <Link href="/ziwei/chart" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-200/40">
              자미두수 보기
            </Link>
            <Link href="/sukuyo" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-amber-200/40">
              숙요점 보기
            </Link>
          </div>
        </section>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    </main>
  );
}
