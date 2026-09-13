import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildFaqPageJsonLd, buildWebPageJsonLd } from "@/lib/structured-data";
import { buildSignViewModel } from "@/lib/fortune/build-view";
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

export function generateStaticParams() {
  return LOCALE_PARAMS.flatMap((locale) => FORTUNE_PERIOD_IDS.flatMap((period) => SIGN_PROFILES.map((profile) => ({ locale, period, sign: profile.id }))));
}

export function generateMetadata({ params }: { params: { locale: string; period: string; sign: string } }) {
  const locale = toLocale(params.locale);
  const period = isFortunePeriodId(params.period) ? params.period : null;
  const profile = getSignProfile(params.sign);
  if (!locale || !period || !profile) return {};
  const name = signName(profile.id, locale);
  const title = `${name} ${periodTitle(period, locale)} ${FORTUNE_COPY[locale].fortune} | Code Destiny`;
  const description = locale === "en" ? `${name} ${periodLabel(period, locale)} reading with love, money, health and work guidance.` : locale === "ja" ? `${name}の${periodLabel(period, locale)}を総合運・恋愛運・金運・健康運・仕事運から読み解きます。` : locale === "zh-CN" ? `从综合运、感情运、财运、健康运与事业运解读${name}的${periodLabel(period, locale)}。` : `從綜合運、感情運、財運、健康運與事業運解讀${name}的${periodLabel(period, locale)}。`;
  const base = `/fortune/${period}/${profile.id}`;
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title, description, keywords: [name, periodLabel(period, locale), FORTUNE_COPY[locale].fortune], ogType: "article", hreflang: { ko: base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default function LocalizedSignFortunePage({ params }: { params: { locale: string; period: string; sign: string } }) {
  const locale = toLocale(params.locale);
  if (!locale || !isFortunePeriodId(params.period)) notFound();
  const sourceProfile = getSignProfile(params.sign);
  if (!sourceProfile) notFound();
  const vm = buildSignViewModel(sourceProfile, params.period as FortunePeriodId);
  if (!vm) notFound();
  const profile = getLocalizedProfile(sourceProfile, locale);
  const name = signName(profile.id, locale);
  const path = `/${prefix(locale)}/fortune/${params.period}/${profile.id}`;
  const title = `${name} ${periodTitle(params.period as FortunePeriodId, locale)} ${FORTUNE_COPY[locale].fortune} | Code Destiny`;
  const description = locale === "en" ? `${name} ${periodLabel(params.period as FortunePeriodId, locale)} reading with overall, love, money, health and work guidance.` : locale === "ja" ? `${name}の${periodLabel(params.period as FortunePeriodId, locale)}を総合運・恋愛運・金運・健康運・仕事運から読み解きます。` : locale === "zh-CN" ? `从综合运、感情运、财运、健康运与事业运解读${name}的${periodLabel(params.period as FortunePeriodId, locale)}。` : `從綜合運、感情運、財運、健康運與事業運解讀${name}的${periodLabel(params.period as FortunePeriodId, locale)}。`;
  const faqs = profile.faqs;
  return <>
    <SignFortuneView vm={vm} locale={locale} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebPageJsonLd({ title, description, path })) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleJsonLd({ title, description, path, category: FORTUNE_COPY[locale][sourceProfile.kind], keywords: [name, periodLabel(params.period as FortunePeriodId, locale)], datePublished: `${vm.dateKey.length === 7 ? `${vm.dateKey}-01` : vm.dateKey}T00:00:00+09:00` })) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd([{ name: FORTUNE_COPY[locale].home, path: `/${prefix(locale)}/` }, { name: FORTUNE_COPY[locale].today, path: `/${prefix(locale)}/today` }, { name: `${periodLabel(params.period as FortunePeriodId, locale)} ${FORTUNE_COPY[locale].fortune}`, path: `/${prefix(locale)}/fortune/${params.period}` }, { name, path }])) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqPageJsonLd(faqs)) }} />
  </>;
}
