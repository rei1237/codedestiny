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

export function generateStaticParams() { return LOCALE_PARAMS.flatMap((locale) => FORTUNE_PERIOD_IDS.map((period) => ({ locale, period }))); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale: localeParam, period } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale || !isFortunePeriodId(period)) return {};
  const label = periodLabel(period, locale);
  const base = `/fortune/${period}`;
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title: `${label} ${FORTUNE_COPY[locale].fortune} | Code Destiny`, description: `${label} ${FORTUNE_COPY[locale].fortune}: 12 ${FORTUNE_COPY[locale].zodiac} and 12 ${FORTUNE_COPY[locale].animal} readings.`, keywords: [label, FORTUNE_COPY[locale].zodiac, FORTUNE_COPY[locale].animal, FORTUNE_COPY[locale].fortune], hreflang: { ko: base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default async function LocalizedFortunePeriodPage({ params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale: localeParam, period: periodParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale || !isFortunePeriodId(periodParam)) notFound();
  const period = periodParam as FortunePeriodId;
  const base = `/${prefix(locale)}/fortune`;
  const models = [...getSiblingProfiles("zodiac"), ...getSiblingProfiles("animal")].map((profile) => ({ source: profile, translated: getLocalizedProfile(profile, locale), vm: buildSignViewModel(profile, period) })).filter((row) => row.vm);
  const label = periodLabel(period, locale);
  const title = `${label} ${FORTUNE_COPY[locale].fortune} | Code Destiny`;
  const description = locale === "ja" ? `${label}の${FORTUNE_COPY[locale].fortune}。12星座と12生肖のリーディングをまとめて確認できます。` : locale === "zh-CN" ? `${label}${FORTUNE_COPY[locale].fortune}，汇总12星座与12生肖的解读。` : locale === "zh-TW" ? `${label}${FORTUNE_COPY[locale].fortune}，彙整12星座與12生肖的解讀。` : `${label} ${FORTUNE_COPY[locale].fortune}: 12 ${FORTUNE_COPY[locale].zodiac} and 12 ${FORTUNE_COPY[locale].animal} readings.`;
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
