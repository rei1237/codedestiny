import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/structured-data";
import { buildSignViewModel } from "@/lib/fortune/build-view";
import { FORTUNE_PERIOD_IDS, isFortunePeriodId, type FortunePeriodId } from "@/lib/fortune/periods";
import { getSiblingProfiles } from "@/lib/fortune/sign-profiles";
import { fortuneLocaleSegment as prefix, FORTUNE_COPY, getLocalizedProfile, langBoxText, normalizeFortuneLocale, periodLabel, type FortuneLocale } from "@/lib/fortune/localization";

export const dynamicParams = false;
const LOCALE_PARAMS = ["en", "ja", "zh", "zh-tw"];
function resolveLocale(value: string): FortuneLocale | null { return LOCALE_PARAMS.includes(value) ? normalizeFortuneLocale(value === "zh" ? "zh-CN" : value === "zh-tw" ? "zh-TW" : value) : null; }
function periodPageTitle(label: string, locale: FortuneLocale): string {
  if (locale === "ja") return `${label}の星座・十二支運勢 | Code Destiny`;
  if (locale === "zh-CN") return `${label}星座与生肖运势 | Code Destiny`;
  if (locale === "zh-TW") return `${label}星座與生肖運勢 | Code Destiny`;
  return `${label} Zodiac & Chinese Zodiac Fortune | Code Destiny`;
}
function periodDescription(label: string, locale: FortuneLocale): string {
  if (locale === "ja") return `${label}の${FORTUNE_COPY[locale].fortune}。12星座と12生肖それぞれの総合運・恋愛運・金運・健康運・仕事運を比較できます。日柱・月柱・節気・月の位置から導いた計算根拠もあわせて確認できます。`;
  if (locale === "zh-CN") return `${label}${FORTUNE_COPY[locale].fortune}，可比较12星座与12生肖各自的综合运、感情运、财运、健康运和事业运，并同时查看根据日柱、月柱、节气与月亮位置计算出的参考依据。`;
  if (locale === "zh-TW") return `${label}${FORTUNE_COPY[locale].fortune}，可比較12星座與12生肖各自的綜合運、感情運、財運、健康運和事業運，並同時查看根據日柱、月柱、節氣與月亮位置計算出的參考依據。`;
  return `${label} ${FORTUNE_COPY[locale].fortune}: compare overall, love, money, health and work guidance for all 12 zodiac and 12 Chinese zodiac signs, with calculated day and month pillars, solar terms and lunar position.`;
}

export function generateStaticParams() { return LOCALE_PARAMS.flatMap((locale) => FORTUNE_PERIOD_IDS.map((period) => ({ locale, period }))); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale: localeParam, period } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale || !isFortunePeriodId(period)) return {};
  const label = periodLabel(period, locale);
  const base = `/fortune/${period}`;
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title: periodPageTitle(label, locale), description: periodDescription(label, locale), keywords: [label, FORTUNE_COPY[locale].zodiac, FORTUNE_COPY[locale].animal, FORTUNE_COPY[locale].fortune], hreflang: { ko: base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default async function LocalizedFortunePeriodPage({ params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale: localeParam, period: periodParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale || !isFortunePeriodId(periodParam)) notFound();
  const period = periodParam as FortunePeriodId;
  const base = `/${prefix(locale)}/fortune`;
  const models = [...getSiblingProfiles("zodiac"), ...getSiblingProfiles("animal")].map((profile) => ({ source: profile, translated: getLocalizedProfile(profile, locale), vm: buildSignViewModel(profile, period) })).filter((row) => row.vm);
  const label = periodLabel(period, locale);
  const title = periodPageTitle(label, locale);
  const description = periodDescription(label, locale);
  const guidance = locale === "ja" ? "スコアは振り返りの手がかりとして使い、実際の予定に合うペースを選んでください。" : locale === "zh-CN" ? "请把评分作为整理思路的参考，并按自己的实际安排选择合适节奏。" : locale === "zh-TW" ? "請把評分作為整理思路的參考，並依自己的實際安排選擇合適節奏。" : "Use the score as a reflection prompt and choose the pace that fits your real schedule.";
  return <>
    <main className="cd-yeoni-surface min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#fff3f8_44%,#fffaf7_100%)] pb-24 text-[#3c1830] dark:bg-[linear-gradient(165deg,#3a0e28_0%,#2e0a20_55%,#24081a_100%)] dark:text-[#fff1f7]">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-xs text-[#70445c]"><Link href={`/${prefix(locale)}/`}>{FORTUNE_COPY[locale].home}</Link> <span aria-hidden="true">›</span> <Link href={`/${prefix(locale)}/today`}>{FORTUNE_COPY[locale].today}</Link> <span aria-hidden="true">›</span> {label}</nav>
        <h1 className="mt-6 text-3xl font-black">{label} {FORTUNE_COPY[locale].fortune}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#70445c]">{description} {guidance}</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map(({ source, translated, vm }) => <li key={source.id}><Link href={`${base}/${period}/${source.id}`} className="block rounded-2xl border border-[#f4bed1]/70 bg-white/85 p-4 dark:bg-[#2e0a20]/60"><span className="font-extrabold">{translated.symbol} {translated.nameKo}</span><span className="float-right font-bold text-[#b31955]">{vm!.score.overall}/10</span><span className="mt-1 block text-xs text-[#70445c]">{translated.rangeLabel}</span><span className="mt-2 block text-xs font-bold text-[#b31955]">{langBoxText(vm!.entry.keyword, locale)}</span></Link></li>)}
        </ul>
      </div>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildCollectionPageJsonLd({ title, description, path: `${base}/${period}` })) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([{ name: FORTUNE_COPY[locale].home, path: `/${prefix(locale)}/` }, { name: FORTUNE_COPY[locale].today, path: `/${prefix(locale)}/today` }, { name: label, path: `${base}/${period}` }])) }} />
  </>;
}
