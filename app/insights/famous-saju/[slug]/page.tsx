import Link from "next/link";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { getCelebrityRelatedList, getCelebritySajuPage, getFamousSajuSeoMetadata, getPublishedCelebrityStaticSlugs, publishedCelebritySajuSeeds, type CelebritySajuMagazineResult } from "../../../../lib/famous-saju/celebrity-saju-service";
import { getPexelsSectionImage, type PexelsSectionImage } from "../../../../lib/server/pexels";

type PageProps = { params: { slug: string } };
type FamousSajuSeoMeta = ReturnType<typeof getFamousSajuSeoMetadata>;
type MagazinePillar = CelebritySajuMagazineResult["pillars"]["year"];
type RelatedCelebrity = { slug: string; category: string; nameKo: string; tags: string[] };
type HeroVisualImage = PexelsSectionImage & { visualLabel: string };

const SITE_ORIGIN = "https://code-destiny.com";

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

export function generateMetadata({ params }: PageProps) {
  const reading = getCelebritySajuPage(params.slug);
  if (!reading) {
    return generatePageMetadata({
      path: "/insights/famous-saju",
      title: "유명인 사주 분석 | 운세 인사이트 허브",
      description: "유명인 사주 글이 아직 열리지 않았습니다. 운세 인사이트 허브에서 공개 생년월일을 따라 다른 명식의 별빛을 이어 살펴보세요.",
      keywords: ["유명인 사주", "운세 인사이트", "사주 분석"],
    });
  }

  const metadata = generateFamousSajuMetadata(getFamousSajuSeoMetadata(reading.celebrity, reading));
  return params.slug === reading.celebrity.slug ? metadata : withNoindexFollow(metadata);
}

const elementRows = [
  { key: "wood", label: "목", color: "#65d46e" },
  { key: "fire", label: "화", color: "#f87171" },
  { key: "earth", label: "토", color: "#d6a84f" },
  { key: "metal", label: "금", color: "#e5e7eb" },
  { key: "water", label: "수", color: "#60a5fa" },
] as const;

const dayStemVisualRequests: Record<string, { query: string; visualLabel: string }> = {
  갑: { query: "majestic green tree forest moonlight petals stars", visualLabel: "큰 나무" },
  을: { query: "delicate vines wild flowers green garden moonlight stars", visualLabel: "꽃과 덩굴" },
  병: { query: "golden sunrise sun light sky flowers cosmic", visualLabel: "태양" },
  정: { query: "warm candle flame fire night flowers stars", visualLabel: "촛불" },
  무: { query: "wide earth mountain golden field moonlight stars", visualLabel: "넓은 땅" },
  기: { query: "soft soil garden earth flowers dawn stars", visualLabel: "비옥한 흙" },
  경: { query: "silver metal crystal moonlight mountain stars", visualLabel: "은빛 금속" },
  신: { query: "white crystal jewelry silver moonlight stars", visualLabel: "보석" },
  임: { query: "deep blue ocean sea waves moonlight stars", visualLabel: "바다" },
  계: { query: "clear rain water lake moonlight flowers stars", visualLabel: "비와 호수" },
};

function getDayStemVisualRequest(stem: string) {
  return dayStemVisualRequests[stem] || { query: "mystical moonlight flowers stars destiny", visualLabel: "달빛" };
}

function displayPillar(value: MagazinePillar | null): MagazinePillar {
  return value || {
    label: "시주",
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

function CelebritySajuHero({ magazine, profileImage, visualImage }: { magazine: CelebritySajuMagazineResult; profileImage?: string | null; visualImage: HeroVisualImage }) {
  const initials = magazine.profile.displayName.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 2) || "CD";
  const portraitSrc = profileImage || visualImage.src;
  const portraitAlt = profileImage ? `${magazine.profile.displayName} 프로필 이미지` : `${magazine.profile.displayName} ${visualImage.visualLabel} 상징 이미지`;

  return (
    <header className="relative mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-[#090b18] px-5 py-7 shadow-[0_34px_120px_rgba(0,0,0,0.42)] sm:px-7 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-9 lg:py-10">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30 saturate-[0.9]" style={{ backgroundImage: `url("${visualImage.src}")` }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,238,190,0.24),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(147,197,253,0.18),transparent_34%),linear-gradient(105deg,rgba(6,8,20,0.96)_0%,rgba(17,16,39,0.88)_52%,rgba(60,40,76,0.66)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.42)_0_1px,transparent_1px),radial-gradient(circle_at_72%_64%,rgba(255,219,178,0.34)_0_1px,transparent_1px)] [background-size:54px_54px,78px_78px]" />
      <div className="relative z-10">
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-amber-100/85 [font-family:var(--font-premium)]">
          <span className="rounded-full border border-amber-100/25 bg-amber-100/10 px-3 py-1">{magazine.profile.groupOrJob}</span>
          <span className="rounded-full border border-sky-100/20 bg-sky-100/10 px-3 py-1">{magazine.profile.birthTimeLabel}</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">{visualImage.visualLabel} 이미지</span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">읽는 시간 8분</span>
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-normal leading-tight tracking-normal text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.38)] sm:text-6xl [font-family:var(--font-display)]">
          {magazine.summary.title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-100 sm:text-lg [font-family:var(--font-premium)]">{magazine.summary.oneLineReading}</p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{magazine.summary.subtitle}</p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{magazine.profile.sourceNote}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/saju/basic/play" className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-50 [font-family:var(--font-premium)]">
            내 사주도 이런 방식으로 보기
          </Link>
          <Link href="/insights/famous-saju" className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50 [font-family:var(--font-premium)]">
            다른 유명인 보기
          </Link>
        </div>
      </div>
      <div className="relative z-10 mt-7 lg:mt-0">
        <div className="mx-auto flex aspect-[4/5] max-w-[340px] items-center justify-center overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(155deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] p-3 shadow-2xl shadow-black/30">
          {portraitSrc ? (
            <img src={portraitSrc} alt={portraitAlt} className="h-full w-full rounded-[26px] object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_28%,rgba(255,236,185,0.28),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-center">
              <span className="text-6xl font-bold text-amber-50">{initials}</span>
              <span className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/70">Code Destiny</span>
              <span className="mt-2 text-sm text-slate-300">{magazine.summary.coreMetaphor}</span>
            </div>
          )}
        </div>
        {visualImage.credit && (
          <p className="mx-auto mt-3 max-w-[340px] text-right text-[11px] text-slate-400">
            Photo by {visualImage.creditUrl ? <a href={visualImage.creditUrl} className="text-amber-100/80">{visualImage.credit}</a> : visualImage.credit}
          </p>
        )}
      </div>
    </header>
  );
}

function CelebritySajuNotice({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  return (
    <section className="mt-6 rounded-2xl border border-amber-200/25 bg-amber-100/[0.07] p-4 text-sm leading-7 text-amber-50/90">
      {magazine.threePillarBasis ? "3주 기준입니다. 생시가 공개되지 않아 시주는 제외했고, 오행 수치와 일부 신살은 달라질 수 있습니다." : "공개된 생시를 포함한 4주 기준입니다."} {magazine.summary.cautionNote}
    </section>
  );
}

function CelebritySajuPillarTable({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const pillars = [magazine.pillars.year, magazine.pillars.month, magazine.pillars.day, displayPillar(magazine.pillars.hour)];
  const rows = [
    ["천간", (pillar: MagazinePillar) => pillar.stem],
    ["천간 십성", (pillar: MagazinePillar) => pillar.stemTenGod],
    ["지지", (pillar: MagazinePillar) => pillar.branch],
    ["지지 십성", (pillar: MagazinePillar) => pillar.branchTenGod],
    ["지장간 핵심", (pillar: MagazinePillar) => pillar.hiddenStemCore],
    ["12운성", (pillar: MagazinePillar) => pillar.twelveStage],
    ["12신살", (pillar: MagazinePillar) => pillar.twelveGod],
    ["주요 신살", (pillar: MagazinePillar) => pillar.majorStars],
  ] as const;

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">Saju Chart</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">사주 원국</h2>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-300">{magazine.threePillarBasis ? "시주 제외" : "시주 포함"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="w-28 rounded-l-2xl bg-white/10 px-3 py-3 text-slate-300">구분</th>
              {pillars.map((pillar, index) => (
                <th key={pillar.label} className={`bg-white/10 px-3 py-3 text-white ${index === pillars.length - 1 ? "rounded-r-2xl" : ""}`}>
                  <span className="block text-xs text-slate-400">{pillar.label}</span>
                  <span className="mt-1 block text-lg">{pillar.ganji}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, render]) => (
              <tr key={label}>
                <th className="border-b border-white/10 px-3 py-3 font-semibold text-amber-100/85">{label}</th>
                {pillars.map((pillar) => (
                  <td key={`${label}-${pillar.label}`} className={`border-b border-white/10 px-3 py-3 leading-6 ${pillar.isUnknown ? "text-slate-500" : "text-slate-200"}`}>
                    {render(pillar)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CelebritySajuQuickSummaryCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const strongest = magazine.fiveElements.strongest.join(" · ") || "알 수 없음";
  const weakest = magazine.fiveElements.weakest.join(" · ") || "알 수 없음";
  const tenGod = magazine.tenGods.highlights[0];
  const cards = [
    { label: "일주의 결", title: magazine.pillars.day.ganji, body: magazine.summary.coreMetaphor },
    { label: "오행 균형", title: `${strongest} 강 / ${weakest} 약`, body: magazine.fiveElements.interpretation },
    { label: "활동 강점", title: tenGod?.name || "십성 확인", body: tenGod?.reading || "계산값 기준으로만 조심스럽게 읽습니다." },
  ];

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/70">{card.label}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{card.body}</p>
        </article>
      ))}
    </section>
  );
}

function FiveElementBarChart({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const max = Math.max(...elementRows.map((item) => magazine.fiveElements[item.key]), 1);

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-2xl font-semibold text-white">오행 그래프</h2>
      <div className="mt-5 grid gap-4">
        {elementRows.map((item) => {
          const count = magazine.fiveElements[item.key];
          const width = count > 0 ? Math.max(10, Math.round((count / max) * 100)) : 100;
          return (
            <div key={item.key} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="font-semibold text-slate-200">{item.label}</span>
              <span className={`h-3 overflow-hidden rounded-full bg-white/10 ${count === 0 ? "border border-dashed border-white/20" : ""}`}>
                <span className="block h-full rounded-full" style={{ width: `${width}%`, backgroundColor: item.color, opacity: count === 0 ? 0.18 : 0.9 }} />
              </span>
              <span className="text-right text-slate-300">{count}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-300">{magazine.fiveElements.interpretation}</p>
    </section>
  );
}

function TenGodHighlightCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold text-white">십성 하이라이트</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {magazine.tenGods.highlights.map((item) => (
          <article key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
            <p className="text-xs text-amber-100/70">Ten Gods</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{item.name}</h3>
            <p className="mt-2 text-sm text-slate-400">{item.meaning}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.reading}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SinsalBadgeGrid({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const groups = [
    { title: "귀인·강점", items: magazine.stars.goodStars, tone: "border-emerald-200/25 bg-emerald-100/[0.07] text-emerald-100" },
    { title: "중성 신호", items: magazine.stars.neutralStars, tone: "border-sky-200/25 bg-sky-100/[0.06] text-sky-100" },
    { title: "주의 신호", items: magazine.stars.cautionStars, tone: "border-rose-200/25 bg-rose-100/[0.06] text-rose-100" },
  ];

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-2xl font-semibold text-white">신살 배지</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-slate-300">{group.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.items.length ? group.items.map((item) => (
                <span key={`${group.title}-${item.name}-${item.position}`} className={`rounded-full border px-3 py-1.5 text-xs ${group.tone}`} title={item.reading}>
                  {item.name}
                </span>
              )) : (
                <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-500">알 수 없음</span>
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
    <section id={section.id} className="scroll-mt-24 border-t border-white/10 py-8">
      <h2 className="text-2xl font-semibold leading-snug text-white">{section.title}</h2>
      <p className="mt-4 text-base leading-8 text-slate-300">{section.body}</p>
      {section.cards?.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.cards.map((card) => (
            <div key={`${section.id}-${card.label}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-amber-100/70">{card.label}</p>
              <h3 className="mt-2 font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
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
    <section className="mt-8 rounded-3xl border border-amber-200/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(147,197,253,0.08))] p-5">
      <p className="text-sm font-semibold text-amber-100">공개 활동과 명식의 연결</p>
      <p className="mt-3 text-base leading-8 text-slate-200">{activity.body}</p>
    </section>
  );
}

function CelebritySajuFAQ({ faq }: { faq: CelebritySajuMagazineResult["faq"] }) {
  return (
    <section className="mt-8 border-t border-white/10 py-8">
      <h2 className="text-2xl font-semibold text-white">자주 묻는 질문</h2>
      <dl className="mt-4 divide-y divide-white/10">
        {faq.map((item) => (
          <div key={item.question} className="py-4">
            <dt className="font-semibold text-white">Q. {item.question}</dt>
            <dd className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CelebritySajuCTA({ cta }: { cta: CelebritySajuMagazineResult["cta"] }) {
  return (
    <section className="mt-4 rounded-3xl border border-amber-200/25 bg-amber-100/[0.07] p-5 sm:p-6">
      <h2 className="text-2xl font-semibold text-white">{cta.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{cta.description}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/saju/basic/play" className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-50">{cta.buttonText}</Link>
        <Link href="/insights/famous-saju" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50">나와 비슷한 일주 찾기</Link>
        <Link href="/saju/basic/play" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-amber-200/50">내 오행 밸런스 확인하기</Link>
      </div>
    </section>
  );
}

function RelatedCelebritySajuList({ related }: { related: RelatedCelebrity[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-white">관련 유명인 사주</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((item) => (
          <Link key={item.slug} href={`/insights/famous-saju/${item.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-200/50">
            <p className="text-sm text-amber-100/70">{item.category}</p>
            <p className="mt-1 font-semibold text-white">{item.nameKo}</p>
            <p className="mt-2 text-sm text-slate-400">{item.tags.slice(0, 2).join(" · ")}</p>
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

  const { celebrity, magazine } = reading;
  const related = getCelebrityRelatedList(celebrity);
  const canonicalPath = `/insights/famous-saju/${celebrity.slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const seo = getFamousSajuSeoMetadata(celebrity, reading);
  const dayStemVisualRequest = getDayStemVisualRequest(magazine.pillars.day.stem);
  const pexelsHeroImage = await getPexelsSectionImage(dayStemVisualRequest.query, "famous");
  const heroVisualImage: HeroVisualImage = {
    ...pexelsHeroImage,
    alt: pexelsHeroImage.alt || `${celebrity.nameKo} ${dayStemVisualRequest.visualLabel} 상징 이미지`,
    visualLabel: dayStemVisualRequest.visualLabel,
  };
  const heroImageUrl = toAbsoluteUrl(celebrity.profileImage || heroVisualImage.src || seo.image || "");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1c153d_0%,#0d1022_48%,#060814_100%)] text-slate-100 [font-family:var(--font-body)]">
      <article className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-amber-100/80">
          <Link href="/insights" className="hover:text-amber-50">운세 인사이트 허브</Link>
          <span className="text-slate-500">/</span>
          <Link href="/insights/famous-saju" className="hover:text-amber-50">유명인 사주 분석</Link>
        </div>

        <CelebritySajuHero magazine={magazine} profileImage={celebrity.profileImage} visualImage={heroVisualImage} />
        <CelebritySajuNotice magazine={magazine} />
        <CelebritySajuPillarTable magazine={magazine} />
        <CelebritySajuQuickSummaryCards magazine={magazine} />
        <FiveElementBarChart magazine={magazine} />
        <TenGodHighlightCards magazine={magazine} />
        <SinsalBadgeGrid magazine={magazine} />
        <CelebrityActivityInsightCard magazine={magazine} />

        <nav className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5" aria-label="매거진 목차">
          <p className="text-sm font-semibold text-amber-100">읽는 순서</p>
          <ol className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {tableOfContents.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="hover:text-amber-100">{item.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section className="mt-2">
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
