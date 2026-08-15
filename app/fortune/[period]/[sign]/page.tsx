/**
 * /fortune/{today|tomorrow}/{별자리·띠 24종} — 정적 생성 48 라우트.
 *
 * 이 자리에는 원래 fortune/{period}/{sign}.html 정적 셸 96개가 있었다. 본문을 브라우저에서
 * 그렸고(크롤러가 받는 텍스트 0자), JSON-LD 가 `{}` 였고, sitemap 에도 내부 링크에도 없었다.
 * 그래서 App Router 로 옮긴다 — 메타·구조화 데이터·사이트맵·H1 게이트를 레포의 기존 배선이
 * 그대로 검사하게 만드는 것이 이 이전의 목적이다.
 */
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import {
  FORTUNE_PERIODS,
  formatKoreanDate,
  getSignEntry,
  loadDailyPackage,
  resolvePeriodDate,
  type FortunePeriod,
} from "@/lib/fortune/daily-data";
import { SIGN_PROFILES, getSignProfile } from "@/lib/fortune/sign-profiles";
import SignFortuneView from "./SignFortuneView";

export const dynamicParams = false;

const PERIOD_LABEL: Record<FortunePeriod, string> = { today: "오늘", tomorrow: "내일" };

export function generateStaticParams() {
  return FORTUNE_PERIODS.flatMap((period) =>
    SIGN_PROFILES.map((profile) => ({ period, sign: profile.id })),
  );
}

function resolve(periodParam: string, signParam: string) {
  const period = FORTUNE_PERIODS.find((p) => p === periodParam);
  const profile = getSignProfile(signParam);
  if (!period || !profile) return null;

  const pkg = loadDailyPackage(period);
  const entry = getSignEntry(pkg, profile.kind, profile.id);
  if (!entry) return null;

  return { period, profile, pkg, entry, date: resolvePeriodDate(period) };
}

function seoText(periodParam: string, signParam: string) {
  const r = resolve(periodParam, signParam);
  if (!r) return null;
  const label = PERIOD_LABEL[r.period];
  const kindLabel = r.profile.kind === "zodiac" ? "별자리" : "띠";
  return {
    r,
    path: `/fortune/${r.period}/${r.profile.id}`,
    title: `${r.profile.nameKo} ${label}의 운세 (${r.date}) | 무료 ${kindLabel} 운세 - 코드 데스티니`,
    description:
      `${formatKoreanDate(r.date)} ${r.profile.nameKo} ${label}의 운세. 총운 ${r.entry.score.overall}점, ` +
      `애정운·재물운·건강운·직장운과 행운의 색 ${r.entry.lucky.color_kr}, 행운의 숫자 ${r.entry.lucky.number}까지. ` +
      `일진 ${r.pkg.calendar.ilchin} 기준으로 계산한 무료 운세입니다.`,
    keywords: [
      `${r.profile.nameKo} 운세`,
      `${r.profile.nameKo} ${label} 운세`,
      `${label}의 운세`,
      `${kindLabel} 운세`,
      "무료 운세",
      "오늘의 운세",
    ],
  };
}

export function generateMetadata({ params }: { params: { period: string; sign: string } }) {
  const seo = seoText(params.period, params.sign);
  if (!seo) return {};
  return buildSeoMetadata({
    path: seo.path,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function SignFortunePage({ params }: { params: { period: string; sign: string } }) {
  const seo = seoText(params.period, params.sign);
  if (!seo) notFound();

  const { r } = seo;
  const kindLabel = r.profile.kind === "zodiac" ? "별자리" : "띠";

  const webPageJsonLd = buildWebPageJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  });
  const articleJsonLd = buildArticleJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
    category: `${kindLabel} 운세`,
    keywords: seo.keywords,
    datePublished: `${r.date}T00:00:00+09:00`,
    dateModified: r.pkg.generated_at,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: `${PERIOD_LABEL[r.period]}의 ${kindLabel} 운세`, path: `/fortune/${r.period}` },
    { name: r.profile.nameKo, path: seo.path },
  ]);
  const faqJsonLd = buildFaqPageJsonLd(r.profile.faqs);

  return (
    <>
      <SignFortuneView
        profile={r.profile}
        entry={r.entry}
        pkg={r.pkg}
        period={r.period}
        date={r.date}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
