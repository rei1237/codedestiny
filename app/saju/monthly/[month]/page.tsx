import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { siteSeo } from "@/lib/seo/siteSeo";
import GuideCta from "@/app/components/GuideCta";
import { GUIDE_CTA_TARGETS } from "@/app/components/guide-cta-targets";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import {
  getIlganMonthlyMonthKeys,
  getIlganMonthlyPage,
  getIlganMonthlyPeriod,
  ILGAN_MONTHLY_STEMS,
  monthLabelWithScripts,
  formatBoundaryRange,
} from "@/lib/saju/monthly-ilgan";

export const dynamicParams = false;

const MONTH_KEY = "2026-09";
const CARD = "rounded-2xl border border-[#e8d5a3]/35 bg-white/5 p-5 transition-colors hover:border-[#e8d5a3]/70";

const HUB_FAQS = [
  {
    question: "일간별 월간 운세는 무엇을 기준으로 보나요?",
    answer:
      "태어난 날의 천간인 일간을 기준으로 해당 월의 월건 천간과 십성 관계를 살핍니다. 월건과 절기 경계는 한국 표준시의 사주 계산 코어에서 산출하며, 일간 하나만으로 사주 전체를 단정하지 않고 한 달의 선택 방향을 참고하는 방식으로 풀이합니다.",
  },
  {
    question: "2026년 9월 정유월 운세에서 절기 날짜가 중요한 이유는 무엇인가요?",
    answer:
      "사주의 월건은 양력 1일에 일괄적으로 바뀌지 않고 절입 시각을 경계로 움직입니다. 그래서 이 페이지는 정유월(丁酉月)의 시작과 다음 절기 시각을 계산해 표시하고, 날짜를 임의로 고정하지 않습니다.",
  },
  {
    question: "내 일간은 어디서 확인할 수 있나요?",
    answer:
      "생년월일과 출생 시각을 만세력에 입력한 뒤 네 기둥 가운데 일주 천간을 확인하면 됩니다. 경계 시각 출생이라면 절기와 자시 처리에 따라 결과가 달라질 수 있으므로 만세력 결과를 먼저 확정하고 일간별 운세를 읽는 순서를 권합니다.",
  },
];

export function generateStaticParams() {
  return getIlganMonthlyMonthKeys().map((month) => ({ month }));
}

function resolvePeriod(month: string) {
  if (month !== MONTH_KEY) return null;
  return getIlganMonthlyPeriod(month);
}

export function generateMetadata({ params }: { params: { month: string } }) {
  const period = resolvePeriod(params.month);
  if (!period) return {};

  return buildSeoMetadata({
    path: `/saju/monthly/${params.month}`,
    title: `${period.label} 일간별 운세`,
    description: `${period.label} ${monthLabelWithScripts(period)} 일간별 운세. 갑목·을목부터 계수까지 10천간의 재물운·연애운·직업운·건강운 흐름을 절기 기준으로 정리합니다.`,
    keywords: [period.primaryKeyword, "정유월 운세", "10천간 월간 운세", "2026년 9월 사주 운세"],
  });
}

function IlganCard({ month, slug }: { month: string; slug: string }) {
  const page = getIlganMonthlyPage(month, slug);
  if (!page) return null;
  const { profile } = page;

  return (
    <li>
      <Link href={page.path} className={`block h-full ${CARD}`}>
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-base font-extrabold text-[#f4eeff]">{profile.name}</span>
          <span className="text-xs font-bold text-[#e8d5a3]">{profile.stemHanja}{profile.element}</span>
        </span>
        <p className="mt-3 break-keep text-sm leading-7 text-[rgba(244,238,255,0.78)]">{profile.summary}</p>
        <span className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#e8d5a3]">
          {profile.name} 운세 읽기 →
        </span>
      </Link>
    </li>
  );
}

export default function IlganMonthlyHubPage({ params }: { params: { month: string } }) {
  const period = resolvePeriod(params.month);
  if (!period) notFound();

  const title = `${period.label} 일간별 운세`;
  const description = `${period.label} ${monthLabelWithScripts(period)} 일간별 운세. 10천간의 월간 흐름을 절기와 십성 관계를 기준으로 살펴봅니다.`;
  const path = `/saju/monthly/${params.month}`;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "사주", path: "/saju" },
    { name: "일간별 월간 운세", path },
  ]);
  const webPageJsonLd = buildWebPageJsonLd({ title, description, path });
  const collectionJsonLd = buildCollectionPageJsonLd({ title, description, path });
  const faqJsonLd = buildFaqPageJsonLd(HUB_FAQS);

  return (
    <>
      <main className="cd-main-shell cd-guide">
        <nav className="cd-chip-wrap" aria-label="위치">
          <Link href="/" className="cd-chip">홈</Link>
          <Link href="/saju" className="cd-chip">사주</Link>
          <span className="cd-chip" aria-current="page">일간별 월간 운세</span>
        </nav>

        <header className="cd-main-header">
          <p className="text-xs font-bold tracking-[0.18em] text-[#e8d5a3]">{period.label} · {monthLabelWithScripts(period)}</p>
          <h1 className="cd-main-title">{title}</h1>
          <p className="cd-main-intro">
            태어난 날의 천간인 일간은 사주에서 나를 대표하는 기준점입니다. 이 허브에서는 갑목부터 계수까지 10천간을
            나누어 {period.label}의 사주 운세 흐름을 살펴봅니다. {monthLabelWithScripts(period)}의 월건은
            <span className="font-bold text-[#e8d5a3]"> {period.monthGanjiHanja}</span>로 계산되며, 절기 경계와 일간·월간의
            십성 관계를 함께 보여 줍니다. 같은 달이라도 일간이 달라지면 재물·연애·직업·건강에서 먼저 움직이는 주제가 달라질 수 있습니다.
          </p>
        </header>

        <section className="cd-card" aria-labelledby="period-heading">
          <h2 id="period-heading">이번 달의 사주 기준</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">월건</dt>
              <dd className="mt-1 text-lg font-bold text-[#e8d5a3]">{period.monthGanji}월({period.monthGanjiHanja}月)</dd>
            </div>
            <div>
              <dt className="text-sm text-[rgba(244,238,255,0.58)]">절기 구간</dt>
              <dd className="mt-1 break-keep text-sm font-bold text-[#f4eeff]">{formatBoundaryRange(period)}</dd>
            </div>
          </dl>
          <p className="mt-5 break-keep text-sm leading-7 text-[rgba(244,238,255,0.78)]">
            월건은 양력 1일에 맞춰 임의로 바꾸지 않고 절입 시각을 기준으로 계산합니다. {period.termFrom.name}부터
            {period.termTo.name} 전까지의 계절감이 이 달의 바탕이 되며, 각 상세 페이지에서는 이 월건의 천간이 해당 일간과
            어떤 십성으로 만나는지 풀어 씁니다. 일간별 운세는 사주 전체를 대신하는 판정이 아니라, 한 달 동안 어느 영역에
            힘을 배분하고 어떤 반복 패턴을 조정할지 정리하는 검색용 월간 가이드입니다.
          </p>
        </section>

        <section className="mt-12" aria-labelledby="ilgan-list-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="ilgan-list-heading">10천간 월간 운세</h2>
              <p className="mt-2 break-keep text-sm leading-7 text-[rgba(244,238,255,0.7)]">
                내 만세력에서 확인한 일간을 골라 {period.label}의 고유 해석을 읽어 보세요. 일간 이름과 슬러그는 한 레지스트리에서
                관리하고, 월건·절기·십성 값은 계산 결과를 사용합니다.
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {ILGAN_MONTHLY_STEMS.map((profile) => <IlganCard key={profile.slug} month={params.month} slug={profile.slug} />)}
          </ul>
        </section>

        <section className="cd-card mt-12" aria-labelledby="read-order-heading">
          <h2 id="read-order-heading">일간별 운세 읽는 순서</h2>
          <ol className="mt-4 space-y-3 text-sm leading-7 text-[rgba(244,238,255,0.78)]">
            <li><span className="mr-2 font-bold text-[#e8d5a3]">1.</span>만세력에서 태어난 날의 천간인 일간을 확인합니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">2.</span>이번 달 월건의 천간과 내 일간이 맺는 십성 관계를 확인합니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">3.</span>재물운·연애운·직업운·건강운에서 반복되는 선택 습관을 읽습니다.</li>
            <li><span className="mr-2 font-bold text-[#e8d5a3]">4.</span>잘 풀리는 행동과 주의할 패턴을 실제 일정에 맞는 작은 조정으로 바꿉니다.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/manse" className="cd-chip">만세력에서 일간 확인하기</Link>
            <Link href="/saju/ten-gods" className="cd-chip">십성 해석 가이드</Link>
            <Link href="/saju" className="cd-chip">사주 전체 분석</Link>
          </div>
        </section>

        <GuideCta target={GUIDE_CTA_TARGETS["/saju/monthly/2026-09"]} />

        <section className="mt-12" aria-labelledby="hub-faq-heading">
          <h2 id="hub-faq-heading">자주 묻는 질문</h2>
          <div className="mt-4 space-y-3">
            {HUB_FAQS.map((faq) => (
              <details key={faq.question} className="cd-card">
                <summary className="cursor-pointer font-bold text-[#f4eeff]">{faq.question}</summary>
                <p className="mt-3 break-keep text-sm leading-7 text-[rgba(244,238,255,0.78)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-10 break-keep text-xs leading-6 text-[rgba(244,238,255,0.55)]">
          운세 콘텐츠는 오락과 자기성찰을 위한 참고 정보입니다. 건강·법률·재무처럼 중요한 결정은 실제 조건과 해당 분야 전문가의 조언을 함께 확인하세요.
        </p>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
