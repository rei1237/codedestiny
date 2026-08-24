/**
 * /fortune/{today|tomorrow|weekly|monthly} — 24종 인덱스 허브 4개.
 *
 * 이 허브가 없으면 상세 96개가 다시 고아가 된다. 2026-04 에 sitemap 에서 빠지고 사이트
 * 어디에서도 링크되지 않게 된 것이 색인 이탈의 직접 원인이었다.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { siteSeo } from "@/lib/seo/siteSeo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import { buildSignViewModel } from "@/lib/fortune/build-view";
import {
  FORTUNE_PERIOD_IDS,
  PERIOD_LABEL,
  PERIOD_TITLE,
  isFortunePeriodId,
  type FortunePeriodId,
} from "@/lib/fortune/periods";
import { getSiblingProfiles, type SignProfile } from "@/lib/fortune/sign-profiles";
import { FusionCrossSell } from "@/app/components/FusionCrossSell";
import YeoniPortrait from "./YeoniPortrait";

export const dynamicParams = false;

const CARD = "rounded-2xl border border-[#f4bed1]/70 bg-white/85 dark:border-[rgba(244,190,209,0.30)] dark:bg-[#2e0a20]/60";
const MUTED = "text-[#70445c] dark:text-[rgba(255,214,232,0.86)]";
const ACCENT = "text-[#b31955] dark:text-[rgba(255,196,222,0.96)]";

export function generateStaticParams() {
  return FORTUNE_PERIOD_IDS.map((period) => ({ period }));
}

/** 허브는 24종을 모두 계산한다 — 카드에 그날의 총운을 함께 보여주기 위해서다. */
function resolveHub(periodParam: string) {
  if (!isFortunePeriodId(periodParam)) return null;
  const zodiacs = getSiblingProfiles("zodiac");
  const animals = getSiblingProfiles("animal");
  const models = [...zodiacs, ...animals]
    .map((profile) => buildSignViewModel(profile, periodParam))
    .filter(Boolean);
  if (models.length === 0) return null;
  return { period: periodParam, models: models as NonNullable<typeof models[number]>[] };
}

function seoText(periodParam: string) {
  const hub = resolveHub(periodParam);
  if (!hub) return null;
  const sample = hub.models[0];
  const title = PERIOD_TITLE[hub.period];
  return {
    hub,
    path: `/fortune/${hub.period}`,
    // 상세 페이지와 같은 규약 — 브랜드 접미사 없이 약 28자. "별자리 12종·띠 12종" 은
    // 검색어가 아니라 설명이므로 제목에서 빼고 description·H1 에 남긴다.
    title: `${title} 운세 ${sample.titleDateLabel} | 무료 별자리·띠별 운세`,
    description:
      `${sample.rangeLabel} 별자리 12종과 띠 12종의 ${title} 운세를 한자리에서 확인하세요. ` +
      `${sample.facts[0]?.label} ${sample.facts[0]?.value} 기준으로 계산했으며 산출 근거를 함께 공개합니다. ` +
      `총운·애정운·재물운·건강운·직장운과 행운의 색·숫자를 로그인 없이 무료로 제공합니다.`,
    keywords: [
      `${title} 운세`,
      "별자리 운세",
      "띠별 운세",
      "무료 운세",
      "오늘의 운세",
      "일일 운세",
    ],
  };
}

export function generateMetadata({ params }: { params: { period: string } }) {
  const seo = seoText(params.period);
  if (!seo) return {};
  return buildSeoMetadata({
    path: seo.path,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

function SignCard({ vm, period }: { vm: ReturnType<typeof buildSignViewModel>; period: FortunePeriodId }) {
  if (!vm) return null;
  const profile: SignProfile = vm.profile;
  return (
    <li>
      <Link
        href={`/fortune/${period}/${profile.id}/`}
        className={`flex h-full flex-col p-4 transition-colors hover:border-[#b31955]/45 ${CARD}`}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">{profile.symbol}</span>
          <span className="text-sm font-extrabold">{profile.nameKo}</span>
          <span className={`ml-auto text-sm font-bold tabular-nums ${ACCENT}`}>
            {vm.score.overall}<span className={`text-xs ${MUTED}`}>/10</span>
          </span>
        </span>
        <span className={`mt-1 block text-[11px] ${MUTED}`}>{profile.rangeLabel}</span>
        <span className={`mt-2 block text-xs font-bold ${ACCENT}`}>{vm.entry.keyword.kr}</span>
        <span className={`mt-1 block break-keep text-xs leading-6 ${MUTED}`}>
          {vm.entry.sections.overall.kr}
        </span>
      </Link>
    </li>
  );
}

export default function FortunePeriodHubPage({ params }: { params: { period: string } }) {
  const seo = seoText(params.period);
  if (!seo) notFound();

  const { hub } = seo;
  const period = hub.period;
  const label = PERIOD_LABEL[period];
  const sample = hub.models[0];
  const zodiacModels = hub.models.filter((m) => m.profile.kind === "zodiac");
  const animalModels = hub.models.filter((m) => m.profile.kind === "animal");
  const otherPeriods = FORTUNE_PERIOD_IDS.filter((p) => p !== period);

  const webPageJsonLd = buildWebPageJsonLd({ title: seo.title, description: seo.description, path: seo.path });
  const collectionJsonLd = buildCollectionPageJsonLd({ title: seo.title, description: seo.description, path: seo.path });
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.title,
    numberOfItems: hub.models.length,
    itemListElement: hub.models.map((m, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${m.profile.nameKo} ${PERIOD_TITLE[period]} 운세`,
      url: `${siteSeo.siteUrl}/fortune/${period}/${m.profile.id}/`,
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: `${label} 운세`, path: seo.path },
  ]);

  return (
    <>
      <main className="cd-yeoni-surface min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff3f8_44%,#fffaf7_100%)] pb-24 text-[#3c1830] dark:bg-[linear-gradient(165deg,#3a0e28_0%,#2e0a20_55%,#24081a_100%)] dark:text-[#fff1f7]">
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
          <nav aria-label="위치" className={`flex flex-wrap items-center gap-1.5 text-xs ${MUTED}`}>
            <Link href="/" className="hover:underline" data-cd-trans="home.nav.home">홈</Link>
            <span aria-hidden="true">›</span>
            <Link href="/today/" className="hover:underline">오늘의 운세</Link>
            <span aria-hidden="true">›</span>
            <span className={ACCENT}>{label} 운세</span>
          </nav>

          <header className="mt-6 flex items-start gap-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-bold tracking-wider ${ACCENT}`}>{sample.rangeLabel}</p>
              <h1 className="mt-3 break-keep text-3xl font-black leading-tight sm:text-4xl">
                {label} 운세
              </h1>
              <p className={`mt-3 max-w-2xl break-keep text-sm leading-7 ${MUTED}`}>
                별자리 12종과 띠 12종의 {label} 운세를 한자리에서 봅니다. 일진·월건·절기와 달의 위치를 실제로 계산한
                값을 각 기질에 대입해 총운·애정운·재물운·건강운·직장운으로 나누고, 점수가 어떤 값에서 나왔는지
                근거를 함께 공개합니다. 로그인 없이 무료입니다.
              </p>
            </div>
            <YeoniPortrait mood="greet" size={104} priority className="mt-1 hidden sm:block" />
          </header>

          <section aria-labelledby="facts-heading" className={`mt-8 p-5 ${CARD}`}>
            <h2 id="facts-heading" className={`break-keep text-sm font-extrabold ${ACCENT}`}>
              {label}의 기준 값
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              {sample.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className={`text-xs ${MUTED}`}>{fact.label}</dt>
                  <dd className="mt-0.5 break-keep font-bold">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className={`mt-4 break-keep text-sm leading-7 ${MUTED}`}>
              같은 기간이면 누가 언제 열어도 결과가 같습니다. 아래 24종의 점수는 이 기준 값과 각 별자리·띠의 관계를
              계산한 결과라 서로 다릅니다.
            </p>
          </section>

          <section aria-labelledby="zodiac-heading" className="mt-12">
            <h2 id="zodiac-heading" className="break-keep text-lg font-extrabold">
              별자리 {label} 운세 12종
            </h2>
            <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
              태양이 지나는 황도 12궁을 기준으로 합니다. 생일이 궁의 경계일이라면 태어난 시각까지 넣어야 정확합니다.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zodiacModels.map((m) => (
                <SignCard key={m.profile.id} vm={m} period={period} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="animal-heading" className="mt-12">
            <h2 id="animal-heading" className="break-keep text-lg font-extrabold">
              띠별 {label} 운세 12종
            </h2>
            <p className={`mt-2 break-keep text-sm leading-7 ${MUTED}`}>
              태어난 해의 지지를 기준으로 합니다. 띠가 바뀌는 기준은 양력 1월 1일이 아니라 절기상 입춘이므로,
              1~2월 초 출생이라면 만세력으로 확인해 보세요.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {animalModels.map((m) => (
                <SignCard key={m.profile.id} vm={m} period={period} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="next-heading" className="mt-12">
            <h2 id="next-heading" className="break-keep text-lg font-extrabold">이어서 보기</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {otherPeriods.map((p) => (
                <Link
                  key={p}
                  href={`/fortune/${p}/`}
                  className={`p-5 transition-colors hover:border-[#b31955]/45 ${CARD}`}
                >
                  <span className={`text-sm font-extrabold ${ACCENT}`}>{PERIOD_LABEL[p]} 운세</span>
                  <span className={`mt-1 block break-keep text-xs leading-6 ${MUTED}`}>
                    {p === "weekly"
                      ? "7일의 일진 흐름과 좋은 날·조심할 날."
                      : p === "monthly"
                        ? "월건과 절기 구간, 이달의 삭과 보름."
                        : "하루 단위의 일진과 달의 자리."}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <FusionCrossSell fromPath={`/fortune/${period}`} tone="yeoni" />

          <p className={`mt-12 break-keep text-xs leading-6 ${MUTED}`}>
            운세는 참고 자료이며 의료·법률·투자 판단을 대신하지 않습니다. 계산 근거인 일진·월건·절기·달의 위치는
            각 페이지에 그대로 표시하고 있습니다.
          </p>
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </>
  );
}
