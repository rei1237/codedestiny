import Link from "next/link";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { getCelebrityRelatedList, getCelebritySajuPage, getFamousSajuSeoMetadata, getPublishedCelebrityStaticSlugs, publishedCelebritySajuSeeds, type CelebritySajuMagazineResult } from "../../../../lib/famous-saju/celebrity-saju-service";

type PageParams = { slug: string };
type PageProps = { params: Promise<PageParams> };
type FamousSajuSeoMeta = ReturnType<typeof getFamousSajuSeoMetadata>;
type MagazinePillar = CelebritySajuMagazineResult["pillars"]["year"];
type RelatedCelebrity = { slug: string; category: string; nameKo: string; tags: string[] };

const SITE_ORIGIN = "https://code-destiny.com";

const FAMOUS_SAJU_INSIGHT_TEXT_TRANSLATIONS = {
  ko: {
    "famousSajuInsight.001": "유명인 사주 분석 | 운세 인사이트 허브",
    "famousSajuInsight.002": "유명인 사주 글이 아직 열리지 않았습니다. 운세 인사이트 허브에서 공개 생년월일을 따라 다른 명식의 별빛을 이어 살펴보세요.",
    "famousSajuInsight.003": "시주",
    "famousSajuInsight.004": "일주의 결",
    "famousSajuInsight.005": "오행 균형",
    "famousSajuInsight.006": "활동 강점",
    "famousSajuInsight.007": "십성 분석",
    "famousSajuInsight.008": "명식 안에서 먼저 떠오르는 작용",
    "famousSajuInsight.009": "귀인·강점",
    "famousSajuInsight.010": "중성 신호",
    "famousSajuInsight.011": "주의 신호",
    "famousSajuInsight.012": "신살",
    "famousSajuInsight.013": "원국에 더해지는 섬세한 표식",
    "famousSajuInsight.014": "문답",
    "famousSajuInsight.015": "자주 묻는 질문",
    "famousSajuInsight.016": "연결 명식",
    "famousSajuInsight.017": "함께 보면 좋은 유명인 사주",
    "famousSajuInsight.018": "흐름",
    "famousSajuInsight.019": "명식 해석 순서",
  },
} as const;

function famousSajuInsightText(key: keyof typeof FAMOUS_SAJU_INSIGHT_TEXT_TRANSLATIONS.ko): string {
  return FAMOUS_SAJU_INSIGHT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

function toAbsoluteUrl(value: string) {
  return new URL(value || "/", SITE_ORIGIN).toString();
}

function generateFamousSajuMetadata(seo: FamousSajuSeoMeta) {
  const metadata = generatePageMetadata(seo);
  const imageUrl = toAbsoluteUrl(seo.image || "");
  const publishedTime = new Date(seo.publishedAt).toISOString();
  const modifiedTime = new Date(seo.updatedAt).toISOString();

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article" as const,
      title: seo.title,
      description: seo.description,
      publishedTime,
      modifiedTime,
      authors: ["Code Destiny"],
      section: seo.articleSection,
      tags: seo.keywords.slice(0, 8),
      images: [{ url: imageUrl, width: 1200, height: 630, alt: seo.title }],
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image" as const,
      title: seo.title,
      description: seo.description,
      images: [imageUrl],
    },
  };
}

function withNoindexFollow(metadata: ReturnType<typeof generateFamousSajuMetadata>) {
  return {
    ...metadata,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function generateStaticParams() {
  return getPublishedCelebrityStaticSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const reading = getCelebritySajuPage(slug);
  if (!reading) {
    return generatePageMetadata({
      path: "/insights/famous-saju",
      title: famousSajuInsightText("famousSajuInsight.001"),
      description: famousSajuInsightText("famousSajuInsight.002"),
      keywords: ["유명인 사주", "운세 인사이트", "사주 분석"],
    });
  }

  const metadata = generateFamousSajuMetadata(getFamousSajuSeoMetadata(reading.celebrity, reading));
  return slug === reading.celebrity.slug ? metadata : withNoindexFollow(metadata);
}

const elementRows = [
  { key: "wood", label: "목", hanja: "木", color: "#5fd198", tone: "border-emerald-200/25 bg-emerald-200/10 text-emerald-100" },
  { key: "fire", label: "화", hanja: "火", color: "#f08a8a", tone: "border-rose-200/25 bg-rose-200/10 text-rose-100" },
  { key: "earth", label: "토", hanja: "土", color: "#caa45a", tone: "border-amber-200/25 bg-amber-200/10 text-amber-100" },
  { key: "metal", label: "금", hanja: "金", color: "#b7a6e8", tone: "border-violet-200/25 bg-violet-200/10 text-violet-100" },
  { key: "water", label: "수", hanja: "水", color: "#69a7f7", tone: "border-sky-200/25 bg-sky-200/10 text-sky-100" },
] as const;

const pillarAccents = [
  "border-violet-300/25 bg-[#15102c]",
  "border-violet-300/25 bg-[#15102c]",
  "border-violet-200/70 bg-[#1d1235] shadow-[0_0_36px_rgba(139,92,246,0.2)]",
  "border-violet-300/15 bg-[#100d23]",
] as const;

function displayPillar(value: MagazinePillar | null): MagazinePillar {
  return value || {
    label: famousSajuInsightText("famousSajuInsight.003") as MagazinePillar["label"],
    ganji: "시 미상",
    stem: "시 미상",
    stemTenGod: "생시 미상으로 제외",
    branch: "시 미상",
    branchTenGod: "생시 미상으로 제외",
    hiddenStemCore: "생시 미상으로 제외",
    twelveStage: "생시 미상으로 제외",
    twelveGod: "생시 미상으로 제외",
    majorStars: "생시 미상으로 제외",
    isUnknown: true,
  };
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4 border-b border-violet-200/15 pb-3">
      <p className="text-[11px] font-semibold text-violet-200/80">{label}</p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl">{title}</h2>
    </div>
  );
}

function CelebritySajuHero({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const basis = magazine.threePillarBasis ? "3주 기준" : "4주 기준";
  const dayPillar = magazine.pillars.day.ganji;

  return (
    <header className="pt-8 text-center sm:pt-10">
      <p className="text-xs font-semibold text-violet-200/75">사주 통식 분석 · 유명인</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl [font-family:var(--font-display)]">
        {magazine.profile.displayName}
      </h1>
      <p className="mt-4 text-base font-semibold leading-7 text-violet-100 [font-family:var(--font-premium)]">
        {dayPillar} 일주 - {magazine.summary.coreMetaphor}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-violet-100/65">
        {magazine.summary.subtitle}
      </p>
      <div className="mt-5 inline-flex max-w-full items-center rounded-lg border border-violet-300/25 bg-violet-200/10 px-4 py-2 text-xs font-semibold text-violet-100">
        공개 원국 직접 해석 · {basis}
      </div>
    </header>
  );
}

function CelebritySajuNotice({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  return (
    <section className="mx-auto mt-5 max-w-2xl rounded-lg border border-violet-300/25 bg-[#17102d] px-4 py-2 text-center text-xs leading-6 text-violet-100/75">
      {magazine.threePillarBasis ? "3주 기준입니다. 생시가 공개되지 않아 시주는 제외했고, 오행 수치와 일부 신살은 달라질 수 있습니다." : "공개된 생시를 포함한 4주 기준입니다."} {magazine.summary.cautionNote}
    </section>
  );
}

function CelebritySajuPillarTable({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const pillars = [magazine.pillars.year, magazine.pillars.month, magazine.pillars.day, displayPillar(magazine.pillars.hour)];

  return (
    <section className="mt-8">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar, index) => (
          <article key={`${pillar.label}-${index}`} className={`min-h-[128px] rounded-lg border p-4 ${pillarAccents[index]}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-violet-100/50">{pillar.label}</p>
              {index === 2 ? <span className="rounded-md bg-violet-400 px-2 py-0.5 text-[11px] font-bold text-white">일주</span> : null}
            </div>
            <h2 className={`mt-3 text-3xl font-semibold ${pillar.isUnknown ? "text-violet-100/35" : "text-violet-100"}`}>{pillar.ganji}</h2>
            <div className="mt-3 flex gap-2">
              <span className={`rounded-md px-2 py-1 text-sm font-semibold ${pillar.isUnknown ? "bg-white/5 text-violet-100/35" : "bg-violet-400/20 text-violet-100"}`}>{pillar.stem}</span>
              <span className={`rounded-md px-2 py-1 text-sm font-semibold ${pillar.isUnknown ? "bg-white/5 text-violet-100/35" : "bg-amber-300/20 text-amber-100"}`}>{pillar.branch}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-violet-100/55">
              {pillar.isUnknown ? "미상" : `${pillar.stemTenGod} · ${pillar.branchTenGod}`}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CelebritySajuQuickSummaryCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const strongest = magazine.fiveElements.strongest.join(" · ") || "알 수 없음";
  const weakest = magazine.fiveElements.weakest.join(" · ") || "알 수 없음";
  const tenGod = magazine.tenGods.highlights[0];
  const cards = [
    { label: famousSajuInsightText("famousSajuInsight.004"), title: magazine.pillars.day.ganji, body: magazine.summary.coreMetaphor },
    { label: famousSajuInsightText("famousSajuInsight.005"), title: `${strongest} 강 / ${weakest} 약`, body: magazine.fiveElements.interpretation },
    { label: famousSajuInsightText("famousSajuInsight.006"), title: tenGod?.name || "십성 확인", body: tenGod?.reading || "계산값 기준으로만 조심스럽게 읽습니다." },
  ];

  return (
    <section className="mt-5 grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-lg border border-violet-300/20 bg-[#120d27] p-4">
          <p className="text-xs font-semibold text-violet-200/70">{card.label}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-violet-100/70">{card.body}</p>
        </article>
      ))}
    </section>
  );
}

function FiveElementBarChart({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const max = Math.max(...elementRows.map((item) => magazine.fiveElements[item.key]), 1);

  return (
    <section className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.005")} title={`${magazine.fiveElements.strongest.join("·") || "알 수 없음"} 강, ${magazine.fiveElements.weakest.join("·") || "알 수 없음"} 보완`} />
      <div className="grid grid-cols-5 gap-3">
        {elementRows.map((item) => {
          const count = magazine.fiveElements[item.key];
          const height = count > 0 ? Math.max(18, Math.round((count / max) * 74)) : 12;
          return (
            <div key={item.key} className="text-center">
              <p className="text-xs text-violet-100/50">{item.hanja}</p>
              <div className="mt-2 flex h-20 items-end justify-center">
                <span className={`w-6 rounded-md ${count === 0 ? "border border-dashed border-violet-200/20 bg-transparent" : ""}`} style={{ height: `${height}px`, backgroundColor: count === 0 ? "transparent" : item.color }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-violet-100/60">{count}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {elementRows.map((item) => {
          const count = magazine.fiveElements[item.key];
          if (count > 0) return null;
          return <span key={`empty-${item.key}`} className={`rounded-md border px-2 py-1 text-xs ${item.tone}`}>{item.label} 공백</span>;
        })}
      </div>
      <p className="mt-5 text-sm leading-7 text-violet-100/75">{magazine.fiveElements.interpretation}</p>
    </section>
  );
}

function TenGodHighlightCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  return (
    <section className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.007")} title={famousSajuInsightText("famousSajuInsight.008")} />
      <div className="grid gap-3">
        {magazine.tenGods.highlights.map((item) => (
          <article key={item.name} className="grid gap-4 rounded-lg border border-violet-300/20 bg-[#181031] p-4 sm:grid-cols-[3.5rem_1fr]">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-amber-200/20 bg-amber-200/10 text-lg font-bold text-amber-100">
              {item.name.slice(0, 1)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{item.name} - {item.meaning}</h3>
              <p className="mt-2 text-sm leading-7 text-violet-100/75">{item.reading}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SinsalBadgeGrid({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const groups = [
    { title: famousSajuInsightText("famousSajuInsight.009"), items: magazine.stars.goodStars, tone: "border-emerald-200/25 bg-emerald-100/[0.07] text-emerald-100" },
    { title: famousSajuInsightText("famousSajuInsight.010"), items: magazine.stars.neutralStars, tone: "border-sky-200/25 bg-sky-100/[0.06] text-sky-100" },
    { title: famousSajuInsightText("famousSajuInsight.011"), items: magazine.stars.cautionStars, tone: "border-rose-200/25 bg-rose-100/[0.06] text-rose-100" },
  ];

  return (
    <section className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.012")} title={famousSajuInsightText("famousSajuInsight.013")} />
      <div className="grid gap-3 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-lg border border-violet-300/15 bg-[#17102d] p-4">
            <p className="text-sm font-semibold text-white">{group.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.length ? group.items.map((item) => (
                <span key={`${group.title}-${item.name}-${item.position}`} className={`rounded-md border px-2 py-1 text-xs ${group.tone}`} title={item.reading}>
                  {item.name}
                </span>
              )) : (
                <span className="rounded-md border border-violet-300/15 px-2 py-1 text-xs text-violet-100/35">알 수 없음</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MagazineSection({ section }: { section: CelebritySajuMagazineResult["sections"][number] }) {
  return (
    <section id={section.id} className="scroll-mt-24 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">{section.title}</h2>
      <p className="mt-4 text-sm leading-8 text-violet-100/75 sm:text-base">{section.body}</p>
      {section.cards?.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.cards.map((card) => (
            <div key={`${section.id}-${card.label}`} className="rounded-lg border border-violet-300/15 bg-[#17102d] p-4">
              <p className="text-xs text-violet-200/70">{card.label}</p>
              <h3 className="mt-2 font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-violet-100/60">{card.description}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CelebrityActivityInsightCard({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const activity = magazine.sections.find((section) => section.id === "activity-bridge");
  if (!activity) return null;
  return (
    <section className="mt-5 rounded-lg border border-amber-200/25 bg-[#1a122d] p-4 sm:p-5">
      <p className="text-sm font-semibold text-amber-100">공개 활동과 명식의 연결</p>
      <p className="mt-3 text-sm leading-8 text-violet-100/80 sm:text-base">{activity.body}</p>
    </section>
  );
}

function CelebritySajuFAQ({ faq }: { faq: CelebritySajuMagazineResult["faq"] }) {
  return (
    <section className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.014")} title={famousSajuInsightText("famousSajuInsight.015")} />
      <dl className="divide-y divide-violet-300/10">
        {faq.map((item) => (
          <div key={item.question} className="py-4">
            <dt className="font-semibold text-white">Q. {item.question}</dt>
            <dd className="mt-2 text-sm leading-7 text-violet-100/70">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CelebritySajuCTA({ cta }: { cta: CelebritySajuMagazineResult["cta"] }) {
  return (
    <section className="mt-5 rounded-lg border border-violet-400/40 bg-[#150b2d] p-4 sm:p-5">
      <h2 className="text-xl font-semibold text-white">{cta.title}</h2>
      <p className="mt-3 text-sm leading-7 text-violet-100/70">{cta.description}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/saju/basic/play" className="rounded-lg border border-violet-300 bg-violet-500/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500/30">{cta.buttonText}</Link>
        <Link href="/insights/famous-saju" className="rounded-lg border border-violet-300/20 px-4 py-3 text-center text-sm font-semibold text-violet-100 transition hover:border-violet-200/60">다른 유명인 보기</Link>
      </div>
    </section>
  );
}

function RelatedCelebritySajuList({ related }: { related: RelatedCelebrity[] }) {
  return (
    <section className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.016")} title={famousSajuInsightText("famousSajuInsight.017")} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((item) => (
          <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-lg border border-violet-300/15 bg-[#17102d] p-4 transition hover:border-violet-200/60">
            <p className="text-sm text-violet-200/70">{item.category}</p>
            <p className="mt-1 font-semibold text-white">{item.nameKo}</p>
            <p className="mt-2 text-sm text-violet-100/50">{item.tags.slice(0, 2).join(" · ")}</p>
          </Link>
        ))}
      </div>
    </section>
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
          요청한 slug <span className="text-amber-100">{decodeURIComponent(String(slug || ""))}</span>에 맞는 공개 유명인 명식이 아직 열리지 않았습니다. 아래 글이나 유명인 사주 목록에서 다른 별빛의 흐름을 이어 살펴보세요.
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
            <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 hover:border-amber-200/50">
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
  const { slug } = await params;
  const reading = getCelebritySajuPage(slug);
  if (!reading) return <UnknownCelebrityPage slug={slug} />;

  const { celebrity, magazine } = reading;
  const related = getCelebrityRelatedList(celebrity);
  const canonicalPath = `/insights/famous-saju/${celebrity.slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const seo = getFamousSajuSeoMetadata(celebrity, reading);
  const heroImageUrl = toAbsoluteUrl(celebrity.profileImage || seo.image || "");
  const tableOfContents = magazine.sections.map((section) => ({
    id: section.id,
    title: section.title,
  }));
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: celebrity.nameKo,
    alternateName: celebrity.nameEn,
    birthDate: celebrity.birthDate,
    jobTitle: celebrity.category,
    url: canonicalUrl,
  };
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: seo.headline,
    description: seo.description,
    image: [heroImageUrl],
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: new Date(seo.publishedAt).toISOString(),
    dateModified: new Date(seo.updatedAt).toISOString(),
    author: { "@type": "Organization", name: "Code Destiny" },
    publisher: { "@type": "Organization", name: "Code Destiny" },
    articleSection: seo.articleSection,
    keywords: seo.keywords.join(", "),
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    about: {
      "@type": "Person",
      name: celebrity.nameKo,
      alternateName: celebrity.nameEn,
      birthDate: celebrity.birthDate,
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: magazine.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Code Destiny", item: SITE_ORIGIN },
      { "@type": "ListItem", position: 2, name: "운세 인사이트", item: toAbsoluteUrl("/insights") },
      { "@type": "ListItem", position: 3, name: "유명인 사주 분석", item: toAbsoluteUrl("/insights/famous-saju") },
      { "@type": "ListItem", position: 4, name: `${celebrity.nameKo} 사주 분석`, item: canonicalUrl },
    ],
  };

  return (
    <main data-famous-saju-detail className="min-h-screen bg-[#070512] text-slate-100 [font-family:var(--font-body)]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
body:has(main[data-famous-saju-detail]) > header,
body:has(main[data-famous-saju-detail]) > footer,
body:has(main[data-famous-saju-detail]) > div[class*="LegalUi_disclaimerBar"],
body:has(main[data-famous-saju-detail]) > button.fixed {
  display: none !important;
}
body:has(main[data-famous-saju-detail]) {
  background: #070512;
}
          `,
        }}
      />
      <article className="mx-auto max-w-5xl px-4 pb-10 sm:px-6 sm:pb-14">
        <CelebritySajuHero magazine={magazine} />
        <CelebritySajuNotice magazine={magazine} />
        <CelebritySajuPillarTable magazine={magazine} />
        <FiveElementBarChart magazine={magazine} />
        <CelebritySajuQuickSummaryCards magazine={magazine} />
        <TenGodHighlightCards magazine={magazine} />
        <SinsalBadgeGrid magazine={magazine} />
        <CelebrityActivityInsightCard magazine={magazine} />

        <nav className="mt-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 sm:p-5" aria-label="명식 해석 순서">
          <SectionHeader label={famousSajuInsightText("famousSajuInsight.018")} title={famousSajuInsightText("famousSajuInsight.019")} />
          <ol className="grid gap-2 text-sm text-violet-100/65 sm:grid-cols-2">
            {tableOfContents.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="hover:text-violet-100">{item.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section className="mt-5 grid gap-5">
          {magazine.sections.map((section) => <MagazineSection key={section.id} section={section} />)}
        </section>
        <CelebritySajuFAQ faq={magazine.faq} />
        <CelebritySajuCTA cta={magazine.cta} />
        <RelatedCelebritySajuList related={related} />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </main>
  );
}
