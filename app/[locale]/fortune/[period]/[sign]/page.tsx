import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { buildSignViewModel } from "@/lib/fortune/build-view";
import { buildPeriodFaqs } from "@/lib/fortune/period-faqs";
import { FORTUNE_PERIOD_IDS, isFortunePeriodId, type FortunePeriodId } from "@/lib/fortune/periods";
import { SIGN_PROFILES, getSignProfile } from "@/lib/fortune/sign-profiles";
import { fortuneLocaleSegment as prefix, FORTUNE_COPY, getLocalizedProfile, normalizeFortuneLocale, periodLabel, periodTitle, signName, type FortuneLocale } from "@/lib/fortune/localization";
import SignFortuneView from "../../../../fortune/[period]/[sign]/SignFortuneView";

export const dynamicParams = false;

const LOCALE_PARAMS = ["en", "ja", "zh", "zh-tw"];
function toLocale(value: string): FortuneLocale | null {
  if (!LOCALE_PARAMS.includes(value)) return null;
  return normalizeFortuneLocale(value === "zh" ? "zh-CN" : value === "zh-tw" ? "zh-TW" : value);
}
function signPageTitle(name: string, period: FortunePeriodId, locale: FortuneLocale): string {
  const label = periodTitle(period, locale);
  if (locale === "ja") return `${name}の${label}運勢 | Code Destiny`;
  if (locale === "zh-CN") return `${name}${label}运势 | Code Destiny`;
  if (locale === "zh-TW") return `${name}${label}運勢 | Code Destiny`;
  return `${name} ${label} Fortune | Code Destiny`;
}
function signDescription(name: string, period: FortunePeriodId, locale: FortuneLocale): string {
  const label = periodLabel(period, locale);
  if (locale === "ja") return `${name}の${label}を、総合運・恋愛運・金運・健康運・仕事運の流れから読み解きます。日柱・月柱・節気・月の位置をもとにした計算根拠と、現実的な行動のヒントも確認できます。`;
  if (locale === "zh-CN") return `从综合运、感情运、财运、健康运与事业运解读${name}的${label}，并展示根据日柱、月柱、节气与月亮位置计算出的参考依据和可落实的行动建议。`;
  if (locale === "zh-TW") return `從綜合運、感情運、財運、健康運與事業運解讀${name}的${label}，並展示根據日柱、月柱、節氣與月亮位置計算出的參考依據和可落實的行動建議。`;
  return `${name} ${label} reading with overall, love, money, health and work guidance, supported by calculated day and month pillars, solar terms and lunar position, plus practical next steps.`;
}

export function generateStaticParams() {
  return LOCALE_PARAMS.flatMap((locale) => FORTUNE_PERIOD_IDS.flatMap((period) => SIGN_PROFILES.map((profile) => ({ locale, period, sign: profile.id }))));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; period: string; sign: string }> }) {
  const { locale: localeParam, period: periodParam, sign } = await params;
  const locale = toLocale(localeParam);
  const period = isFortunePeriodId(periodParam) ? periodParam : null;
  const profile = getSignProfile(sign);
  if (!locale || !period || !profile) return {};
  const name = signName(profile.id, locale);
  const title = signPageTitle(name, period, locale);
  const description = signDescription(name, period, locale);
  const base = `/fortune/${period}/${profile.id}`;
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title, description, keywords: [name, periodLabel(period, locale), FORTUNE_COPY[locale].fortune], ogType: "article", hreflang: { ko: base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default async function LocalizedSignFortunePage({ params }: { params: Promise<{ locale: string; period: string; sign: string }> }) {
  const { locale: localeParam, period: periodParam, sign } = await params;
  const locale = toLocale(localeParam);
  if (!locale || !isFortunePeriodId(periodParam)) notFound();
  const sourceProfile = getSignProfile(sign);
  if (!sourceProfile) notFound();
  const period = periodParam as FortunePeriodId;
  const vm = buildSignViewModel(sourceProfile, period);
  if (!vm) notFound();
  const profile = getLocalizedProfile(sourceProfile, locale);
  const name = signName(profile.id, locale);
  const path = `/${prefix(locale)}/fortune/${period}/${profile.id}`;
  const title = signPageTitle(name, period, locale);
  const description = signDescription(name, period, locale);
  const faqs = buildPeriodFaqs(profile, period, locale);
  return <>
    <SignFortuneView vm={vm} locale={locale} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebPageJsonLd({ title, description, path })) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd({ title, description, path, category: FORTUNE_COPY[locale][sourceProfile.kind], keywords: [name, periodLabel(period, locale)], datePublished: `${vm.dateKey.length === 7 ? `${vm.dateKey}-01` : vm.dateKey}T00:00:00+09:00` })) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([{ name: FORTUNE_COPY[locale].home, path: `/${prefix(locale)}/` }, { name: FORTUNE_COPY[locale].today, path: `/${prefix(locale)}/today` }, { name: `${periodLabel(period, locale)} ${FORTUNE_COPY[locale].fortune}`, path: `/${prefix(locale)}/fortune/${period}` }, { name, path }])) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqPageJsonLd(faqs)) }} />
  </>;
}
