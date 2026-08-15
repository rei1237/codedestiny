/**
 * /fortune/today · /fortune/tomorrow — 24종 인덱스 허브.
 *
 * 이 페이지가 없으면 24개 상세가 다시 고아가 된다. 2026-04 에 sitemap 에서 빠지고 사이트
 * 어디에서도 링크되지 않게 된 것이 색인 이탈의 직접 원인이었다(전수 grep 기준 외부 참조 0건).
 * 허브는 내부 링크 진입점이자 "오늘 열두 띠·열두 별자리를 한 번에" 보는 실사용 화면이다.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildWebPageJsonLd,
} from "@/lib/structured-data";
import {
  FORTUNE_PERIODS,
  formatKoreanDate,
  getSignEntry,
  loadDailyPackage,
  resolvePeriodDate,
  type DailyPackage,
  type FortunePeriod,
} from "@/lib/fortune/daily-data";
import { getSiblingProfiles, type SignProfile } from "@/lib/fortune/sign-profiles";
import { siteSeo } from "@/lib/seo/siteSeo";

const SITE_URL = siteSeo.siteUrl;

export const dynamicParams = false;

const PERIOD_LABEL: Record<FortunePeriod, string> = { today: "오늘", tomorrow: "내일" };

export function generateStaticParams() {
  return FORTUNE_PERIODS.map((period) => ({ period }));
}

function resolve(periodParam: string) {
  const period = FORTUNE_PERIODS.find((p) => p === periodParam);
  if (!period) return null;
  return { period, pkg: loadDailyPackage(period), date: resolvePeriodDate(period) };
}

function seoText(periodParam: string) {
  const r = resolve(periodParam);
  if (!r) return null;
  const label = PERIOD_LABEL[r.period];
  return {
    r,
    path: `/fortune/${r.period}`,
    title: `${label}의 운세 - 별자리 12종·띠 12종 무료 운세 (${r.date}) | 코드 데스티니`,
    description:
      `${formatKoreanDate(r.date)} 별자리 12종과 띠 12종의 ${label} 운세를 한자리에서 확인하세요. ` +
      `일진 ${r.pkg.calendar.ilchin}, ${r.pkg.calendar.current_jeolgi} 기준으로 계산했습니다. ` +
      `총운·애정운·재물운·건강운·직장운과 행운의 색·숫자를 로그인 없이 무료로 제공합니다.`,
    keywords: [
      `${label}의 운세`,
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

function SignCard({ profile, period, pkg }: { profile: SignProfile; period: FortunePeriod; pkg: DailyPackage }) {
  const entry = getSignEntry(pkg, profile.kind, profile.id);
  return (
    <li>
      <Link
        href={`/fortune/${period}/${profile.id}/`}
        className="flex h-full flex-col rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 transition-colors hover:border-amber-400/50 hover:bg-slate-900"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">{profile.symbol}</span>
          <span className="text-sm font-extrabold text-slate-100">{profile.nameKo}</span>
          {entry && (
            <span className="ml-auto text-sm font-bold tabular-nums text-amber-300">
              {entry.score.overall}<span className="text-xs text-slate-500">/10</span>
            </span>
          )}
        </span>
        <span className="mt-1 block text-[11px] text-slate-500">{profile.rangeLabel}</span>
        {entry && (
          <>
            <span className="mt-2 block text-xs font-bold text-amber-200">{entry.keyword.kr}</span>
            <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
              {entry.sections.overall.kr}
            </span>
          </>
        )}
      </Link>
    </li>
  );
}

export default function FortunePeriodHubPage({ params }: { params: { period: string } }) {
  const seo = seoText(params.period);
  if (!seo) notFound();

  const { r } = seo;
  const label = PERIOD_LABEL[r.period];
  const otherPeriod: FortunePeriod = r.period === "today" ? "tomorrow" : "today";
  const zodiacs = getSiblingProfiles("zodiac");
  const animals = getSiblingProfiles("animal");

  const webPageJsonLd = buildWebPageJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  });
  const collectionJsonLd = buildCollectionPageJsonLd({
    title: seo.title,
    description: seo.description,
    path: seo.path,
  });
  // 24종을 ItemList 로 명시해 허브가 목록 페이지임을 분명히 한다.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seo.title,
    numberOfItems: zodiacs.length + animals.length,
    itemListElement: [...zodiacs, ...animals].map((profile, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${profile.nameKo} ${label}의 운세`,
      url: `${SITE_URL}/fortune/${r.period}/${profile.id}/`,
    })),
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "오늘의 운세", path: "/today" },
    { name: `${label}의 운세`, path: seo.path },
  ]);

  return (
    <>
      <main className="min-h-screen bg-[#070A11] pb-24 text-slate-100">
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
          <nav aria-label="위치" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-amber-200">홈</Link>
            <span aria-hidden="true">›</span>
            <Link href="/today/" className="hover:text-amber-200">오늘의 운세</Link>
            <span aria-hidden="true">›</span>
            <span className="text-slate-300">{label}의 운세</span>
          </nav>

          <header className="mt-6">
            <p className="text-xs font-bold tracking-wider text-amber-300">
              {formatKoreanDate(r.date)} · {r.pkg.calendar.lunar_date}
            </p>
            <h1 className="mt-3 break-keep text-3xl font-black leading-tight text-white sm:text-4xl">
              {label}의 운세
            </h1>
            <p className="mt-3 max-w-2xl break-keep text-sm leading-7 text-slate-400">
              별자리 12종과 띠 12종의 {label} 운세를 한자리에서 봅니다. 그날의 일진 간지와 절기, 달의 위상을
              실제로 계산한 값을 각 기질에 대입해 총운·애정운·재물운·건강운·직장운으로 나눕니다.
              로그인 없이 무료입니다.
            </p>
          </header>

          <section aria-labelledby="sky-heading" className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
            <h2 id="sky-heading" className="break-keep text-sm font-extrabold text-amber-200">
              {label}의 기준 값
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-500">일진</dt>
                <dd className="mt-0.5 font-bold text-slate-100">{r.pkg.calendar.ilchin}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">월건</dt>
                <dd className="mt-0.5 font-bold text-slate-100">{r.pkg.calendar.wolgeon}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">세운</dt>
                <dd className="mt-0.5 font-bold text-slate-100">{r.pkg.calendar.year_ganji}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">달의 위상</dt>
                <dd className="mt-0.5 font-bold text-slate-100">{r.pkg.sky_today.moon_phase}</dd>
              </div>
            </dl>
            <p className="mt-4 break-keep text-sm leading-7 text-slate-300">
              절기는 {r.pkg.calendar.current_jeolgi} 구간이며 달은 {r.pkg.sky_today.moon_sign} 자리를 지납니다.
              이번 달 삭(신월)은 {r.pkg.sky_today.this_month_new_moon}, 망(보름)은 {r.pkg.sky_today.this_month_full_moon} 입니다.
              같은 날이면 누가 언제 열어도 결과가 같습니다.
            </p>
          </section>

          <section aria-labelledby="zodiac-heading" className="mt-12">
            <h2 id="zodiac-heading" className="break-keep text-lg font-extrabold text-white">
              별자리 {label} 운세 12종
            </h2>
            <p className="mt-2 break-keep text-sm leading-7 text-slate-400">
              태양이 지나는 황도 12궁을 기준으로 합니다. 생일이 궁의 경계일이라면 태어난 시각까지 넣어야 정확합니다.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {zodiacs.map((profile) => (
                <SignCard key={profile.id} profile={profile} period={r.period} pkg={r.pkg} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="animal-heading" className="mt-12">
            <h2 id="animal-heading" className="break-keep text-lg font-extrabold text-white">
              띠별 {label} 운세 12종
            </h2>
            <p className="mt-2 break-keep text-sm leading-7 text-slate-400">
              태어난 해의 지지를 기준으로 합니다. 띠가 바뀌는 기준은 양력 1월 1일이 아니라 절기상 입춘이므로,
              1~2월 초 출생이라면 만세력으로 확인해 보세요.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {animals.map((profile) => (
                <SignCard key={profile.id} profile={profile} period={r.period} pkg={r.pkg} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="next-heading" className="mt-12">
            <h2 id="next-heading" className="break-keep text-lg font-extrabold text-white">
              이어서 보기
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link href={`/fortune/${otherPeriod}/`} className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 hover:bg-amber-400/20">
                <span className="text-sm font-extrabold text-amber-200">{PERIOD_LABEL[otherPeriod]}의 운세</span>
                <span className="mt-1 block break-keep text-xs leading-6 text-amber-100/70">
                  하루 앞뒤 흐름을 이어서 확인합니다.
                </span>
              </Link>
              <Link href="/today/" className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 hover:border-amber-400/40">
                <span className="text-sm font-extrabold text-slate-100">오늘의 운세 허브</span>
                <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
                  사주·숙요·베다·점성술·자미두수 다섯 체계.
                </span>
              </Link>
              <Link href="/saju/" className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5 hover:border-amber-400/40">
                <span className="text-sm font-extrabold text-slate-100">사주 풀이</span>
                <span className="mt-1 block break-keep text-xs leading-6 text-slate-400">
                  연·월·일·시 네 기둥으로 보는 내 명식.
                </span>
              </Link>
            </div>
          </section>

          <p className="mt-12 break-keep text-xs leading-6 text-slate-500">
            운세는 참고 자료이며 의료·법률·투자 판단을 대신하지 않습니다. 계산 근거인 일진·월건·절기·달 위상은
            위에 그대로 표시하고 있습니다.
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
