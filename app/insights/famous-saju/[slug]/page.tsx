import Image from "next/image";
import Link from "next/link";
import ContentIntegrityNote from "../../../components/ContentIntegrityNote";
import { FusionCrossSell } from "../../../components/FusionCrossSell";
import { generatePageMetadata } from "../../../../lib/generate-page-metadata";
import { getFamousSajuHeroImage, type FamousSajuHeroImage } from "../../../../lib/famous-saju/famous-saju-image";
import { getCelebrityRelatedList, getCelebritySajuPage, getFamousSajuSeoMetadata, getPublishedCelebrityStaticSlugs, publishedCelebritySajuSeeds, type CelebritySajuMagazineResult } from "../../../../lib/famous-saju/celebrity-saju-service";
import { getCelebrityEditorial } from "../../../../lib/famous-saju/celebrity-editorial";
import { buildCelebrityMultiSystem, type MultiSystemRow } from "../../../../lib/famous-saju/celebrity-multi-system";
import { buildAuthorPersonJsonLd } from "../../../../lib/structured-data";
import { truncateToDisplayWidth } from "../../../../lib/seo";

type PageParams = { slug: string };
type PageProps = { params: Promise<PageParams> };
type FamousSajuSeoMeta = ReturnType<typeof getFamousSajuSeoMetadata>;
type MagazinePillar = CelebritySajuMagazineResult["pillars"]["year"];
type RelatedCelebrity = { slug: string; category: string; nameKo: string; tags: string[] };
type TocItem = { id: string; title: string };
type CelebrityEditorialEntry = NonNullable<ReturnType<typeof getCelebrityEditorial>>;

const SITE_ORIGIN = "https://code-destiny.com";

const FAMOUS_SAJU_INSIGHT_TEXT_TRANSLATIONS = {
  ko: {
    "famousSajuInsight.001": "유명인 사주 분석 | 운세 인사이트 허브",
    "famousSajuInsight.002": "유명인 사주 글이 아직 열리지 않았습니다. 운세 인사이트 허브에서 공개 생년월일을 따라 다른 명식의 별빛을 이어 살펴보세요.",
    "famousSajuInsight.003": "시주",
    "famousSajuInsight.004": "일주의 결",
    "famousSajuInsight.005": "오행 균형",
    "famousSajuInsight.006": "십성의 작용",
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

// 검수된 고유 원고가 있는 인물의 제목 규칙(성장 계획 §2). 1900년 이후 출생만 숙요를 세울 수 있어
// 제목에서도 갈라 둔다 — 세우지도 않은 체계를 제목에 걸면 클릭 뒤 빈 표만 보게 된다.
function buildEditorialSeoTitle(celebrity: { nameKo: string; birthDate: string | null; isBirthTimeKnown: boolean }) {
  if (celebrity.isBirthTimeKnown) return `${celebrity.nameKo} 사주 풀이 — 시주까지 본 명식 | 꿀꿀 운세`;
  const birthYear = Number(String(celebrity.birthDate || "").slice(0, 4));
  if (birthYear >= 1900) return `${celebrity.nameKo} 사주·숙요 풀이 | 꿀꿀 운세`;
  return `${celebrity.nameKo} 사주 풀이 — 일주·십성으로 본 행적 | 꿀꿀 운세`;
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

  const seo = getFamousSajuSeoMetadata(reading.celebrity, reading);
  const editorial = getCelebrityEditorial(slug);
  if (editorial?.reviewedAt) {
    // 🔴 색인 여부의 정본은 celebrity-editorial.js 의 reviewedAt 하나다. 검수된 고유 원고가 있는
    // 인물만 index 로 내보내고, 사이트맵(generate-sitemap.mjs)과 readiness 가드가 같은 값을 본다.
    const title = buildEditorialSeoTitle(reading.celebrity);
    return generateFamousSajuMetadata({
      ...seo,
      title,
      headline: title,
      description: truncateToDisplayWidth(editorial.seoDescription),
      updatedAt: editorial.reviewedAt,
    });
  }

  const metadata = generateFamousSajuMetadata(seo);
  // 고유 원고가 없거나 검수 전인 인물은 noindex. 상세 페이지는 이름·생년월일만 바뀌는 템플릿
  // 조립물이라(문장의 83% 가 다른 인물 페이지와 동일) 색인 대상으로 두면
  // Google 의 scaled content abuse 판정을 받는다. 페이지 자체와 내부 링크는 유지하고
  // 허브(/insights/famous-saju)만 색인·광고 대상으로 남긴다.
  return withNoindexFollow(metadata);
}

const elementRows = [
  { key: "wood", label: "목", hanja: "木", color: "#5fd198", tone: "border-emerald-200/25 bg-emerald-200/10 text-emerald-100" },
  { key: "fire", label: "화", hanja: "火", color: "#f08a8a", tone: "border-rose-200/25 bg-rose-200/10 text-rose-100" },
  { key: "earth", label: "토", hanja: "土", color: "#caa45a", tone: "border-amber-200/25 bg-amber-200/10 text-amber-100" },
  { key: "metal", label: "금", hanja: "金", color: "#d9d3c1", tone: "border-stone-200/25 bg-stone-200/10 text-stone-100" },
  { key: "water", label: "수", hanja: "水", color: "#69a7f7", tone: "border-sky-200/25 bg-sky-200/10 text-sky-100" },
] as const;

// 일간 오행별 액센트: 경금=은/화이트골드 계열.
const elementAccent: Record<string, { color: string; soft: string }> = {
  목: { color: "#5fd198", soft: "rgba(95,209,152,0.16)" },
  화: { color: "#f08a8a", soft: "rgba(240,138,138,0.16)" },
  토: { color: "#caa45a", soft: "rgba(202,164,90,0.16)" },
  금: { color: "#d9d3c1", soft: "rgba(217,211,193,0.18)" },
  수: { color: "#69a7f7", soft: "rgba(105,167,247,0.16)" },
};

function accentFor(dayElement: string) {
  return elementAccent[dayElement] || { color: "#c9b7f2", soft: "rgba(201,183,242,0.16)" };
}

const pillarAccents = [
  "border-emerald-200/25 bg-[#0d1d1a]",
  "border-amber-200/25 bg-[#20180b]",
  "border-violet-200/65 bg-[#1d1235] shadow-[0_0_36px_rgba(139,92,246,0.2)]",
  "border-sky-200/20 bg-[#0b1625]",
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

function sectionById(magazine: CelebritySajuMagazineResult, id: string) {
  return magazine.sections.find((section) => section.id === id) || null;
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4 border-b border-amber-100/15 pb-3">
      <p className="text-[11px] font-semibold text-amber-100/80 [font-family:var(--font-decorative)]">{label}</p>
      <h2 className="mt-2 text-xl font-semibold leading-snug text-white sm:text-2xl [font-family:var(--font-premium)]">{title}</h2>
    </div>
  );
}

function OracleQuote({ children, accent }: { children: string; accent: string }) {
  return (
    <blockquote className="mt-5 rounded-r-lg border-l-2 pl-4 text-sm italic leading-7 text-slate-100/80" style={{ borderColor: accent }}>
      {children}
      <cite className="mt-2 block text-[11px] not-italic text-amber-100/55 [font-family:var(--font-decorative)]">— 연이의 상담 노트</cite>
    </blockquote>
  );
}

function splitFortuneParagraphs(value: string) {
  return value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

function Breadcrumb({ celebrity }: { celebrity: RelatedCelebrity }) {
  return (
    <nav aria-label="breadcrumb" className="pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300/70">
        <li><Link href="/insights" className="hover:text-amber-100">운세 인사이트</Link></li>
        <li aria-hidden className="text-slate-500">›</li>
        <li><Link href="/insights/famous-saju" className="hover:text-amber-100">유명인 사주</Link></li>
        <li aria-hidden className="text-slate-500">›</li>
        <li className="text-amber-100/80">{celebrity.category}</li>
        <li aria-hidden className="text-slate-500">›</li>
        <li className="font-semibold text-white">{celebrity.nameKo}</li>
      </ol>
    </nav>
  );
}

function CelebritySajuHero({ magazine, heroImage }: { magazine: CelebritySajuMagazineResult; heroImage: FamousSajuHeroImage }) {
  const basis = magazine.threePillarBasis ? "3주 기준" : "4주 기준";
  const dayPillar = magazine.pillars.day.ganji;
  const accent = accentFor(magazine.dayElement);
  const imagery = magazine.summary.dayMasterImagery || magazine.summary.coreMetaphor;

  return (
    <header className="pt-8 text-center sm:pt-10">
      <p className="text-xs font-semibold text-amber-100/75 [font-family:var(--font-decorative)]">사주 통식 분석 · 유명인</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl [font-family:var(--font-premium)]">
        {magazine.profile.displayName}
      </h1>
      <p className="mt-4 text-base font-semibold leading-7 [font-family:var(--font-display)]" style={{ color: accent.color }}>
        {dayPillar} 일주 · {magazine.summary.coreMetaphor}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-200/70">
        {imagery}
      </p>
      <p className="mx-auto mt-2 max-w-2xl text-xs leading-6 text-slate-300/55">
        {magazine.summary.subtitle}
      </p>
      <div className="mt-5 inline-flex max-w-full items-center rounded-lg border px-4 py-2 text-xs font-semibold [font-family:var(--font-playful)]" style={{ borderColor: accent.color, backgroundColor: accent.soft, color: accent.color }}>
        공개 원국 직접 해석 · {basis}
      </div>
      <figure className="relative mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl border" style={{ borderColor: accent.soft }}>
        <Image
          src={heroImage.src}
          alt={heroImage.alt}
          width={1200}
          height={630}
          priority
          className="h-auto w-full object-cover"
          style={{ aspectRatio: "1200 / 630" }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(7,5,18,0) 45%, rgba(7,5,18,0.85) 100%)` }} />
        {heroImage.source === "pexels" && heroImage.credit ? (
          <figcaption className="absolute bottom-1 right-2 text-[10px] text-slate-200/70">
            Photo:{" "}
            {heroImage.creditUrl ? (
              <a href={heroImage.creditUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-white">
                {heroImage.credit}
              </a>
            ) : (
              heroImage.credit
            )}{" "}
            / Pexels
          </figcaption>
        ) : null}
      </figure>
    </header>
  );
}

function CelebritySajuNotice({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  void magazine;
  return null;
}

function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <ol className="space-y-1.5 text-sm text-violet-100/65">
      {items.map((item, index) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="flex gap-2 hover:text-violet-100">
            <span className="text-violet-300/45">{String(index + 1).padStart(2, "0")}</span>
            <span>{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

function CelebritySajuPillarTable({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const pillars = [magazine.pillars.year, magazine.pillars.month, magazine.pillars.day, displayPillar(magazine.pillars.hour)];

  return (
    <section id="pillars" className="mt-8 scroll-mt-24">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((pillar, index) => (
          <article key={`${pillar.label}-${index}`} className={`min-h-[128px] rounded-lg border p-4 ${pillarAccents[index]}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-100/60 [font-family:var(--font-decorative)]">{pillar.label}</p>
              {index === 2 ? <span className="rounded-md bg-violet-400 px-2 py-0.5 text-[11px] font-bold text-white">일주</span> : null}
            </div>
            <h3 className={`mt-3 text-3xl font-semibold [font-family:var(--font-premium)] ${pillar.isUnknown ? "text-slate-100/35" : "text-white"}`}>{pillar.ganji}</h3>
            <div className="mt-3 flex gap-2">
              <span className={`rounded-md px-2 py-1 text-sm font-semibold ${pillar.isUnknown ? "bg-white/5 text-violet-100/35" : "bg-violet-400/20 text-violet-100"}`}>{pillar.stem}</span>
              <span className={`rounded-md px-2 py-1 text-sm font-semibold ${pillar.isUnknown ? "bg-white/5 text-violet-100/35" : "bg-amber-300/20 text-amber-100"}`}>{pillar.branch}</span>
            </div>
            <dl className="mt-3 space-y-1 text-xs leading-5 text-slate-100/60">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-100/40">십성</dt>
                <dd className="text-right">{pillar.isUnknown ? "미상" : `${pillar.stemTenGod} · ${pillar.branchTenGod}`}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-100/40">12운성</dt>
                <dd className="text-right">{pillar.isUnknown ? "미상" : pillar.twelveStage}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-100/40">신살</dt>
                <dd className="text-right">{pillar.isUnknown ? "미상" : pillar.majorStars}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function CelebritySajuQuickSummaryCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const strongest = magazine.fiveElements.strongest.join(" · ") || "알 수 없음";
  const tenGod = magazine.tenGods.highlights[0];
  // 요약 층위 = 한 줄 핵심만. (구조 설명은 오행 섹션, 생활 처방은 상세 본문에서 별도로 다룬다.)
  const cards = [
    { label: famousSajuInsightText("famousSajuInsight.004"), title: magazine.pillars.day.ganji, body: magazine.summary.coreMetaphor },
    { label: famousSajuInsightText("famousSajuInsight.005"), title: `${strongest} 강`, body: magazine.fiveElements.summaryLine },
    { label: famousSajuInsightText("famousSajuInsight.006"), title: tenGod?.name || "십성 확인", body: tenGod?.meaning || "계산값 기준으로만 조심스럽게 읽습니다." },
  ];

  return (
    <section className="mt-5 grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className="rounded-lg border border-amber-100/15 bg-[#12131f] p-4">
          <p className="text-xs font-semibold text-amber-100/70 [font-family:var(--font-decorative)]">{card.label}</p>
          <h3 className="mt-2 text-lg font-semibold text-white [font-family:var(--font-display)]">{card.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200/75">{card.body}</p>
        </article>
      ))}
    </section>
  );
}

function ConclusionBlock({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const accent = accentFor(magazine.dayElement);
  return (
    <section id="conclusion" className="mt-5 scroll-mt-24 rounded-lg border p-5 sm:p-6" style={{ borderColor: accent.color, backgroundColor: accent.soft }}>
      <p className="text-[11px] font-semibold [font-family:var(--font-decorative)]" style={{ color: accent.color }}>한 줄 결론</p>
      <p className="mt-3 text-base font-medium leading-8 text-white sm:text-lg">{magazine.summary.oneLineReading}</p>
    </section>
  );
}

function FiveElementBarChart({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const counts = elementRows.map((item) => magazine.fiveElements[item.key]);
  const max = Math.max(...counts, 1);
  const baseY = 96;
  const barW = 30;
  const gap = 28;
  const chartW = elementRows.length * barW + (elementRows.length - 1) * gap;

  return (
    <section id="five-elements" className="mt-5 scroll-mt-24 rounded-lg border border-emerald-100/15 bg-[#0d1720] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.005")} title={`${magazine.fiveElements.strongest.join("·") || "알 수 없음"} 강, ${magazine.fiveElements.weakest.join("·") || "알 수 없음"} 보완`} />
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartW} 128`} role="img" aria-label="오행 분포 막대 그래프" className="mx-auto h-40 w-full max-w-md">
          <line x1="0" y1={baseY} x2={chartW} y2={baseY} stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
          {elementRows.map((item, index) => {
            const count = magazine.fiveElements[item.key];
            const height = count > 0 ? Math.max(10, Math.round((count / max) * 74)) : 6;
            const x = index * (barW + gap);
            const y = baseY - height;
            return (
              <g key={item.key}>
                <rect x={x} y={y} width={barW} height={height} rx="5" fill={count === 0 ? "transparent" : item.color} stroke={count === 0 ? "rgba(148,163,184,0.4)" : "none"} strokeDasharray={count === 0 ? "3 3" : undefined} />
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fill="#e2e8f0" fontWeight="600">{count}</text>
                <text x={x + barW / 2} y={baseY + 18} textAnchor="middle" fontSize="14" fill="#cbd5e1" fontWeight="600">{item.hanja}</text>
                <text x={x + barW / 2} y={baseY + 32} textAnchor="middle" fontSize="10" fill="rgba(203,213,225,0.6)">{item.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {elementRows.map((item) => {
          const count = magazine.fiveElements[item.key];
          if (count > 0) return null;
          return <span key={`empty-${item.key}`} className={`rounded-md border px-2 py-1 text-xs ${item.tone}`}>{item.label} 공백</span>;
        })}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-100/85">{magazine.fiveElements.structureLine}</p>
      <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-8 text-slate-200/75">
        {splitFortuneParagraphs(magazine.fiveElements.interpretation).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}

function TenGodHighlightCards({ magazine }: { magazine: CelebritySajuMagazineResult }) {
  const intro = sectionById(magazine, "ten-gods");
  return (
    <section id="ten-gods" className="mt-5 scroll-mt-24 rounded-lg border border-amber-100/15 bg-[#151319] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.007")} title={famousSajuInsightText("famousSajuInsight.008")} />
      {intro?.body ? (
        <div className="mb-4 space-y-3 text-sm leading-8 text-slate-200/70">
          {splitFortuneParagraphs(intro.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      ) : null}
      <div className="grid gap-3">
        {magazine.tenGods.highlights.map((item) => (
          <article key={item.name} className="grid gap-4 rounded-lg border border-violet-300/20 bg-[#171426] p-4 sm:grid-cols-[3.5rem_1fr]">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-amber-200/20 bg-amber-200/10 text-lg font-bold text-amber-100">
              {item.name.slice(0, 1)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-white [font-family:var(--font-display)]">{item.name} · {item.meaning}</h3>
              <div className="mt-2 space-y-3 text-sm leading-7 text-slate-200/75">
                {splitFortuneParagraphs(item.reading).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
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
  const texture = sectionById(magazine, "stars");

  return (
    <section id="stars" className="mt-5 scroll-mt-24 rounded-lg border border-sky-100/15 bg-[#0b1522] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.012")} title={famousSajuInsightText("famousSajuInsight.013")} />
      <div className="grid gap-3 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title} className="rounded-lg border border-slate-100/10 bg-[#121827] p-4">
            <p className="text-sm font-semibold text-white [font-family:var(--font-display)]">{group.title}</p>
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
      {texture?.body ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-8 text-slate-200/75">
          {splitFortuneParagraphs(texture.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      ) : null}
    </section>
  );
}

function MagazineSection({ section, accent }: { section: CelebritySajuMagazineResult["sections"][number]; accent?: string }) {
  return (
    <section id={section.id} className="mt-5 scroll-mt-24 rounded-lg border border-amber-100/15 bg-[#10131d] p-4 sm:p-5">
      <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl [font-family:var(--font-premium)]">{section.title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-8 text-slate-200/75 sm:text-base">
        {splitFortuneParagraphs(section.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      {accent && section.body ? <OracleQuote accent={accent}>{splitFortuneParagraphs(section.body)[0] || section.body}</OracleQuote> : null}
      {section.cards?.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.cards.map((card) => (
            <div key={`${section.id}-${card.label}`} className="rounded-lg border border-sky-100/10 bg-[#121827] p-4">
              <p className="text-xs text-amber-100/70 [font-family:var(--font-decorative)]">{card.label}</p>
              <h3 className="mt-2 font-semibold text-white [font-family:var(--font-display)]">{card.title}</h3>
              <div className="mt-2 space-y-3 text-sm leading-6 text-slate-200/60">
                {splitFortuneParagraphs(card.description).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

// 행적과 사주의 결 — 수동 큐레이션된 실제 행적을 십성/오행과 나란히 배치.
// 이미 위 십성 카드에서 증거로 인용된 행적은 note를 반복하지 않고(다른 층위), 카드 참조만 남긴다.
function CelebrityActivityInsightCard({ magazine, highlightedTenGods }: { magazine: CelebritySajuMagazineResult; highlightedTenGods: Set<string> }) {
  const section = sectionById(magazine, "deeds-and-chart");
  if (!magazine.deeds.length || !section) return null;
  const accent = accentFor(magazine.dayElement);

  return (
    <section id="deeds-and-chart" className="mt-5 scroll-mt-24 rounded-lg border p-4 sm:p-5" style={{ borderColor: accent.color, backgroundColor: "#0f0d1a" }}>
      <SectionHeader label="행적" title={section.title.replace(/^\[|\]$/g, "")} />
      <div className="space-y-3 text-sm leading-8 text-slate-200/75 sm:text-base">
        {splitFortuneParagraphs(section.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <ol className="mt-5 space-y-4">
        {magazine.deeds.map((deed, index) => {
          const alsoInTenGodCard = deed.linkType === "tenGod" && highlightedTenGods.has(deed.link);
          return (
            <li key={deed.deed} className="relative rounded-lg border border-white/10 bg-[#141122] p-4 pl-5">
              <span className="absolute left-0 top-4 h-[calc(100%-2rem)] w-[3px] rounded-full" style={{ backgroundColor: accent.color }} />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: accent.color }}>{String(index + 1).padStart(2, "0")}</span>
                <span className="rounded-md border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: accent.color, color: accent.color }}>
                  {deed.linkType === "tenGod" ? `십성 · ${deed.link}` : `오행 · ${deed.link}`}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-7 text-white">{deed.deed}</p>
              {alsoInTenGodCard ? (
                <p className="mt-2 text-xs leading-6 text-slate-300/55">위 &lsquo;{deed.link}&rsquo; 십성 해석에서 이 행적을 증거로 자세히 풀이했어요.</p>
              ) : (
                <p className="mt-2 text-sm leading-7 text-slate-200/70">{deed.note}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// 인물별 고유 원고(celebrity-editorial.js). 초안(reviewedAt null)도 미리보기로 렌더하되
// 저자·검수 표기는 검수된 뒤에만 붙는다 — 검토했다는 주장은 검토한 페이지만 한다.
function EditorialNarrative({ editorial }: { editorial: CelebrityEditorialEntry }) {
  return (
    <section id="editorial" data-famous-saju-editorial className="mt-6 scroll-mt-24 rounded-lg border border-amber-100/20 bg-[#0f0c1e] p-4 sm:p-6">
      <SectionHeader label="명리학자의 풀이" title="명식에서 행적으로 — 이 인물만의 해설" />
      <div className="space-y-4 text-sm leading-8 text-slate-100/85 sm:text-base">
        {editorial.narrative.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      <p className="mt-5 text-xs leading-6 text-amber-100/60 [font-family:var(--font-decorative)]">
        {editorial.reviewedAt ? `글 · 박병하(명리학자) · 검수 ${editorial.reviewedAt}` : "검수 전 초안 — 검색 색인에 올리지 않은 상태입니다."}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-slate-400/80">
        {editorial.sources.map((source) => (
          <li key={source.url}>
            출처: <a href={source.url} rel="noopener noreferrer" target="_blank" className="underline decoration-slate-500/60 hover:text-amber-100">{source.label}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

const MULTI_SYSTEM_STATUS_LABEL: Record<MultiSystemRow["status"], string> = {
  confirmed: "확정",
  candidate: "후보 2개",
  unavailable: "산출 안 함",
};

// 사주·숙요·베다 달 낙샤트라 세 줄. 자미두수 열은 없다(생시 의존 — 2026-08-30 결정).
// 못 구한 체계도 줄을 지우지 않고 사유(basis)를 보여 준다.
function MultiSystemTable({ rows }: { rows: MultiSystemRow[] }) {
  return (
    <section id="multi-system" data-famous-saju-multi-system className="mt-6 scroll-mt-24 rounded-lg border border-sky-100/15 bg-[#0b1220] p-4 sm:p-6">
      <SectionHeader label="세 체계로 본 명식" title="사주 · 숙요 27수 · 베다 달 낙샤트라" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm text-slate-200/85">
          <thead>
            <tr className="text-xs text-amber-100/70 [font-family:var(--font-decorative)]">
              <th scope="col" className="py-2 pr-3 font-semibold">체계</th>
              <th scope="col" className="py-2 pr-3 font-semibold">값</th>
              <th scope="col" className="py-2 pr-3 font-semibold">상태</th>
              <th scope="col" className="py-2 font-semibold">산출 근거 · 한계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.system} className="border-t border-white/10 align-top">
                <th scope="row" className="py-3 pr-3 font-semibold text-white">{row.label}</th>
                <td className="py-3 pr-3">
                  <p className="font-semibold text-white">{row.value}</p>
                  {row.detail ? <p className="mt-1 text-xs leading-6 text-slate-300/80">{row.detail}</p> : null}
                </td>
                <td className="py-3 pr-3 text-xs">{MULTI_SYSTEM_STATUS_LABEL[row.status]}</td>
                <td className="py-3 text-xs leading-6 text-slate-400/85">{row.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CrossSystemNote({ editorial }: { editorial: CelebrityEditorialEntry }) {
  return (
    <section id="cross-system" className="mt-5 scroll-mt-24 rounded-lg border border-amber-100/15 bg-[#10131d] p-4 sm:p-5">
      <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl [font-family:var(--font-premium)]">체계 교차 해설</h2>
      <p className="mt-4 text-sm leading-8 text-slate-200/80 sm:text-base">{editorial.crossSystemNote}</p>
    </section>
  );
}

function CelebritySajuFAQ({ faq }: { faq: CelebritySajuMagazineResult["faq"] }) {
  if (!faq.length) return null;

  return (
    <section className="mt-5 rounded-lg border border-emerald-100/15 bg-[#0d1720] p-4 sm:p-5">
      <SectionHeader label={famousSajuInsightText("famousSajuInsight.014")} title={famousSajuInsightText("famousSajuInsight.015")} />
      <dl className="divide-y divide-violet-300/10">
        {faq.map((item) => (
          <div key={item.question} className="py-4">
            <dt className="font-semibold text-white [font-family:var(--font-display)]">Q. {item.question}</dt>
            <dd className="mt-2 text-sm leading-7 text-slate-200/70">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CelebritySajuCTA({ cta }: { cta: CelebritySajuMagazineResult["cta"] }) {
  return (
    <section className="mt-5 rounded-lg border border-amber-200/30 bg-[#1a1524] p-4 sm:p-5">
      <h2 className="text-xl font-semibold text-white [font-family:var(--font-premium)]">{cta.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-200/70">{cta.description}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/saju/basic/play" className="rounded-lg border border-violet-300 bg-violet-500/20 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-violet-500/30">{cta.buttonText}</Link>
        <Link href="/insights/famous-saju" className="rounded-lg border border-violet-300/20 px-4 py-3 text-center text-sm font-semibold text-violet-100 transition hover:border-violet-200/60">다른 유명인 보기</Link>
      </div>
    </section>
  );
}

function RelatedCelebritySajuList({ related }: { related: RelatedCelebrity[] }) {
  return (
    <section className="mt-5 rounded-lg border border-sky-100/15 bg-[#0b1522] p-4 sm:p-5">
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
  const editorial = getCelebrityEditorial(celebrity.slug);
  const reviewedAt = editorial?.reviewedAt || null;
  const multiSystem = buildCelebrityMultiSystem({ birthDate: celebrity.birthDate || "", birthTime: celebrity.birthTime, country: celebrity.country, magazine });
  const related = getCelebrityRelatedList(celebrity);
  const relatedSummary: RelatedCelebrity = { slug: celebrity.slug, category: celebrity.category, nameKo: celebrity.nameKo, tags: celebrity.tags };
  const accent = accentFor(magazine.dayElement);
  const canonicalPath = `/insights/famous-saju/${celebrity.slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const seo = getFamousSajuSeoMetadata(celebrity, reading);
  const heroImage = getFamousSajuHeroImage(celebrity.slug, magazine.summary.dayMasterImagery);
  const heroImageUrl = heroImage.source === "pexels" ? heroImage.src : toAbsoluteUrl(celebrity.profileImage || seo.image || "");

  const highlightedTenGods = new Set(magazine.tenGods.highlights.map((item) => item.name));
  const dayPillarSection = sectionById(magazine, "day-pillar-texture");
  const twelveStageSection = sectionById(magazine, "twelve-stage");
  const finalSection = sectionById(magazine, "final-texture");

  const tableOfContents: TocItem[] = [
    editorial ? { id: "editorial", title: "명리학자의 풀이" } : null,
    { id: "multi-system", title: "세 체계로 본 명식" },
    { id: "pillars", title: "원국 4주" },
    { id: "conclusion", title: "한 줄 결론" },
    dayPillarSection ? { id: "day-pillar-texture", title: "일주의 결" } : null,
    { id: "five-elements", title: "오행의 흐름" },
    { id: "ten-gods", title: "십성 해석" },
    { id: "stars", title: "신살의 결" },
    twelveStageSection ? { id: "twelve-stage", title: "12운성" } : null,
    magazine.deeds.length ? { id: "deeds-and-chart", title: "행적과 사주의 결" } : null,
    finalSection ? { id: "final-texture", title: "맺는 문장" } : null,
    editorial ? { id: "cross-system", title: "체계 교차 해설" } : null,
  ].filter((item): item is TocItem => Boolean(item));
  const articleHeadline = reviewedAt ? buildEditorialSeoTitle(celebrity) : seo.headline;
  const articleDescription = reviewedAt && editorial ? truncateToDisplayWidth(editorial.seoDescription) : seo.description;

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
    headline: articleHeadline,
    description: articleDescription,
    image: [heroImageUrl],
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    datePublished: new Date(seo.publishedAt).toISOString(),
    // 검수된 원고는 검수일이 곧 수정일이다 — 사이트맵 lastmod(generate-sitemap.mjs)와 같은 값.
    dateModified: new Date(reviewedAt || seo.updatedAt).toISOString(),
    // 검수된 원고만 실명 저자(박병하 Person 노드). 템플릿 조립물에 사람의 경력을 붙이지 않는다.
    author: reviewedAt ? buildAuthorPersonJsonLd() : { "@type": "Organization", name: "CODE DESTINY" },
    ...(reviewedAt && editorial ? { citation: editorial.sources.map((source) => source.url) } : {}),
    publisher: { "@type": "Organization", name: "CODE DESTINY" },
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
        <Breadcrumb celebrity={relatedSummary} />
        <CelebritySajuHero magazine={magazine} heroImage={heroImage} />
        <CelebritySajuNotice magazine={magazine} />
        {editorial ? <EditorialNarrative editorial={editorial} /> : null}
        <MultiSystemTable rows={multiSystem.rows} />
        <CelebritySajuPillarTable magazine={magazine} />

        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_216px] lg:items-start lg:gap-8">
          <div className="min-w-0">
            <details className="mb-5 rounded-lg border border-violet-300/20 bg-[#100b23] p-4 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold text-violet-100/80 [font-family:var(--font-decorative)]">
                {famousSajuInsightText("famousSajuInsight.019")}
              </summary>
              <div className="mt-3">
                <TableOfContents items={tableOfContents} />
              </div>
            </details>

            <CelebritySajuQuickSummaryCards magazine={magazine} />
            <ConclusionBlock magazine={magazine} />
            {dayPillarSection ? <MagazineSection section={dayPillarSection} accent={accent.color} /> : null}
            <FiveElementBarChart magazine={magazine} />
            <TenGodHighlightCards magazine={magazine} />
            <SinsalBadgeGrid magazine={magazine} />
            {twelveStageSection ? <MagazineSection section={twelveStageSection} /> : null}
            <CelebrityActivityInsightCard magazine={magazine} highlightedTenGods={highlightedTenGods} />
            {finalSection ? <MagazineSection section={finalSection} accent={accent.color} /> : null}
            {editorial ? <CrossSystemNote editorial={editorial} /> : null}
            <CelebritySajuFAQ faq={magazine.faq} />
            <CelebritySajuCTA cta={magazine.cta} />
            <FusionCrossSell fromPath={`/insights/famous-saju/${slug}`} tone="neo" />
            <RelatedCelebritySajuList related={related} />
            <p className="mt-6 text-xs leading-6 text-slate-400/70">{magazine.profile.sourceNote}</p>
            {/* 검수된 고유 원고(reviewedAt)가 있는 인물만 "사람이 검토했다"고 말한다. 나머지는
                이름과 생년월일을 규칙에 대입해 구성한 페이지라 그렇게 주장하지 않는다(그래서 noindex 다). */}
            {reviewedAt ? (
              <ContentIntegrityNote contentSource="editorial" datePublished={seo.publishedAt} dateModified={reviewedAt} />
            ) : (
              <ContentIntegrityNote contentSource="template" />
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-lg border border-violet-300/20 bg-[#100b23] p-4">
              <p className="mb-3 text-[11px] font-semibold text-amber-100/70 [font-family:var(--font-decorative)]">{famousSajuInsightText("famousSajuInsight.019")}</p>
              <TableOfContents items={tableOfContents} />
            </div>
          </aside>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </main>
  );
}
