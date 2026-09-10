import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import {
  formatBoundaryRange,
  getIlganMonthlyMonthKeys,
  getIlganMonthlyPage,
  getIlganMonthlyStemSlugs,
  monthLabelWithScripts,
} from "@/lib/saju/monthly-ilgan";

export const dynamicParams = false;

const MONTH_KEY = "2026-09";
const CARD = "cd-card";

type PageParams = { month: string; stem: string };

function resolvePage(params: PageParams) {
  if (params.month !== MONTH_KEY) return null;
  return getIlganMonthlyPage(params.month, params.stem);
}

function buildFaqs(page: NonNullable<ReturnType<typeof resolvePage>>) {
  const { period, profile } = page;
  return [
    {
      question: `${period.label} ${profile.name} 운세는 어떤 근거로 읽나요?`,
      answer:
        `${period.label}의 ${monthLabelWithScripts(period)} 월건을 한국 음양력 코어로 계산하고, ${profile.name}의 일간과 월간이 맺는 ${period.stemTenGod} 관계를 중심으로 풀이합니다. 절기 구간은 ${formatBoundaryRange(period)}로 표시되며, 사주 전체의 대운·세운을 넣지 않은 월간 참고 해석입니다.`,
    },
    {
      question: `${profile.name}의 일간을 만세력에서 어떻게 확인하나요?`,
      answer:
        `만세력에서 네 기둥 중 일주를 찾은 뒤, 그 기둥의 앞 글자인 천간을 확인하면 됩니다. ${profile.name}은 ${profile.stemHanja}${profile.element}에 해당합니다. 출생 시각이 절기 경계나 자시 근처라면 입력값과 계산 기준을 다시 확인한 뒤 읽어 주세요.`,
    },
    {
      question: `일간별 월간 운세만으로 사주를 모두 판단할 수 있나요?`,
      answer:
        "아닙니다. 일간별 월간 운세는 한 달의 환경과 선택 방향을 간결하게 보는 콘텐츠입니다. 실제 명식의 오행 분포, 십성 배치, 대운·세운, 출생 시각을 함께 분석해야 개인의 상황을 더 넓게 이해할 수 있으며, 중요한 결정은 현실 조건을 우선해야 합니다.",
    },
  ];
}

export function generateStaticParams() {
  return getIlganMonthlyMonthKeys().flatMap((month) =>
    getIlganMonthlyStemSlugs().map((stem) => ({ month, stem })),
  );
}

export function generateMetadata({ params }: { params: PageParams }) {
  const page = resolvePage(params);
  if (!page) return {};
  const { period, profile } = page;

  return buildSeoMetadata({
    path: page.path,
    title: `${period.label} ${profile.name} 운세`,
    description: `${period.label} ${profile.name} 운세. ${monthLabelWithScripts(period)}의 ${period.stemTenGod} 흐름을 바탕으로 재물운·연애운·직업운·건강운과 실천 전략을 정리합니다.`,
    keywords: [
      `${profile.name} 9월 운세`,
      `${profile.name} 운세`,
      `${profile.stemKo}${profile.element} 일간 운세`,
      "일간별 재물운",
      "일간별 연애운",
    ],
  });
}

function FortuneSection({ heading, text }: { heading: string; text: string }) {
  return (
    <article className={CARD}>
      <h2>{heading}</h2>
      <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">{text}</p>
    </article>
  );
}

export default function IlganMonthlyDetailPage({ params }: { params: PageParams }) {
  const page = resolvePage(params);
  if (!page) notFound();

  const { period, profile } = page;
  const title = `${period.label} ${profile.name} 운세`;
  const description = `${period.label} ${profile.name} 운세. ${monthLabelWithScripts(period)}의 ${period.stemTenGod} 흐름을 바탕으로 재물운·연애운·직업운·건강운을 살펴봅니다.`;
  const faqs = buildFaqs(page);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "사주", path: "/saju" },
    { name: "일간별 월간 운세", path: `/saju/monthly/${params.month}` },
    { name: title, path: page.path },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description, path: page.path });
  const faqJsonLd = buildFaqPageJsonLd(faqs);

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          <Link href="/saju" className="cd-chip">사주</Link>
          <Link href={`/saju/monthly/${params.month}`} className="cd-chip">일간별 월간 운세</Link>
          <span className="cd-chip" aria-current="page">{profile.name}</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">{period.label} · {monthLabelWithScripts(period)}</p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">{profile.summary} {profile.name}은 {profile.stemHanja}{profile.element}에 해당하는 일간으로, 이번 달에는 월건과의 십성 관계를 통해 어떤 영역에 힘을 쓰고 무엇을 조정할지 살펴봅니다.</p>
        </header>

        <section className={CARD} aria-labelledby="summary-heading">
          <h2 id="summary-heading">한 줄 요약</h2>
          <p className="mt-3 break-keep text-base font-bold leading-8 text-[#e8d5a3]">{profile.summary}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">일간</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{profile.name} · {profile.stemHanja}{profile.element} · {profile.polarity} 기운</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">월간과의 십성 관계</dt>
              <dd className="mt-1 font-bold text-[#f4eeff]">{period.monthGanjiHanja} 월간 → {period.stemTenGod}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">절기 기준</dt>
              <dd className="mt-1 break-keep text-sm font-bold text-[#f4eeff]">{formatBoundaryRange(period)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8" aria-labelledby="flow-heading">
          <h2 id="flow-heading">{monthLabelWithScripts(period)}의 월건·절기 흐름</h2>
          <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">{profile.flow}</p>
          <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.7)]">
            이 달의 월간은 {period.monthGanjiHanja}이고, {profile.name}과의 관계는 {period.stemTenGod}으로 계산됩니다. 십성은
            좋고 나쁨을 단번에 판정하는 이름이 아니라, 일간과 환경이 만나 어떤 역할과 선택이 먼저 드러나는지 설명하는 언어입니다.
            따라서 같은 {period.stemTenGod}이라도 명식의 오행 균형과 실제 상황에 따라 체감은 달라질 수 있습니다.
          </p>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="영역별 운세">
          <FortuneSection heading="재물운" text={profile.money} />
          <FortuneSection heading="연애운·관계" text={profile.love} />
          <FortuneSection heading="직업운·실행" text={profile.work} />
          <FortuneSection heading="건강운·회복" text={profile.health} />
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="이번 달 행동 가이드">
          <article className="rounded-2xl border border-emerald-300/25 bg-emerald-300/[0.06] p-5">
            <h2 className="text-base">잘 풀리는 행동</h2>
            <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">{profile.action}</p>
          </article>
          <article className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.06] p-5">
            <h2 className="text-base">주의할 패턴</h2>
            <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">{profile.caution}이 반복되면, 이번 달의 기준을 잃기 쉽습니다. 문제를 크게 단정하기보다 일정·비용·대화 중 한 영역에서 경계를 작게 세워 보세요.</p>
          </article>
        </section>

        <section className="cd-card mt-8" aria-labelledby="check-heading">
          <h2 id="check-heading">만세력에서 내 일간 확인하기</h2>
          <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.82)]">
            일간은 생년월일만 보고 띠처럼 고르는 값이 아니라, 태어난 날짜의 일주에서 천간을 확인해야 합니다. 출생 시간이
            불확실하거나 절기 경계에 가까운 경우에는 먼저 만세력의 입력 달력·시간·절기 기준을 확인하세요. 일간을 확인한 뒤에는
            십성 가이드에서 비견·식상·재성·관성·인성이 실제 관계와 일에서 어떻게 번역되는지 함께 읽으면 이 월간 운세를 더 정확히 활용할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/manse" className="cd-chip">무료 만세력에서 확인</Link>
            <Link href="/saju/ten-gods" className="cd-chip">십성 뜻 살펴보기</Link>
            <Link href="/saju" className="cd-chip">사주 전체 분석으로 이동</Link>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="detail-faq-heading">
          <h2 id="detail-faq-heading">{profile.name} 월간 운세 FAQ</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className={CARD}>
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-8 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <nav className="cd-chip-wrap mt-8" aria-label="관련 사주 콘텐츠">
          <Link href={`/saju/monthly/${params.month}`} className="cd-chip">10천간 월간 운세 허브</Link>
          <Link href="/today" className="cd-chip">오늘의 운세</Link>
          <Link href="/manse" className="cd-chip">무료 만세력</Link>
        </nav>

        <GuideCta target={GUIDE_CTA_TARGETS["/saju/monthly/[month]/[stem]"]} />

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          운세 콘텐츠는 오락과 자기성찰을 위한 참고 정보이며, 사주 전체 명식이나 현실의 조건을 대신하지 않습니다. 건강·법률·재무 등 중요한 판단은 전문가의 조언을 함께 확인하세요.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
