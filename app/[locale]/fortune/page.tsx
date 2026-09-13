import Link from "next/link";
import { notFound } from "next/navigation";
import { buildSeoMetadata } from "@/lib/seo";
import { FORTUNE_PERIOD_IDS } from "@/lib/fortune/periods";
import { fortuneLocaleSegment as prefix, FORTUNE_COPY, normalizeFortuneLocale, periodLabel, type FortuneLocale } from "@/lib/fortune/localization";

export const dynamicParams = false;
const LOCALES = ["en", "ja", "zh", "zh-tw"];
function resolveLocale(value: string): FortuneLocale | null { return LOCALES.includes(value) ? normalizeFortuneLocale(value === "zh" ? "zh-CN" : value === "zh-tw" ? "zh-TW" : value) : null; }
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale) return {};
  const base = "/fortune";
  const title = locale === "en" ? "Fortune by period" : locale === "ja" ? "期間別運勢" : locale === "zh-CN" ? "按期间查看运势" : "依期間查看運勢";
  const description = locale === "en" ? "Choose today, tomorrow, this week or this month, then compare overall, love, money, health and work guidance for all 12 zodiac and 12 Chinese zodiac signs. Each reading also shows its calculated pillars, solar terms and lunar evidence." : locale === "ja" ? "今日・明日・今週・今月から期間を選び、12星座と12生肖それぞれの総合運・恋愛運・金運・健康運・仕事運を確認できます。日柱・月柱・節気・月の位置から導いた計算根拠もあわせて表示します。" : locale === "zh-CN" ? "从今日、明日、本周或本月中选择期间，查看12星座与12生肖的综合运、感情运、财运、健康运和事业运。页面同时展示根据日柱、月柱、节气与月亮位置计算出的参考依据。" : "從今日、明日、本週或本月中選擇期間，查看12星座與12生肖的綜合運、感情運、財運、健康運和事業運。頁面同時展示根據日柱、月柱、節氣與月亮位置計算出的參考依據。";
  return buildSeoMetadata({ path: `/${prefix(locale)}${base}`, title: `${title} | Code Destiny`, description, keywords: [title, FORTUNE_COPY[locale].zodiac, FORTUNE_COPY[locale].animal], hreflang: { ko: base, en: `/en${base}`, ja: `/ja${base}`, "zh-CN": `/zh${base}`, "zh-TW": `/zh-tw${base}` } });
}

export default async function LocalizedFortuneIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale) notFound();
  const base = `/${prefix(locale)}/fortune`;
  return <main className="min-h-screen px-4 py-12 text-[#3c1830]"><div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">{FORTUNE_COPY[locale].fortune}</h1><p className="mt-3 text-sm text-[#70445c]">{locale === "en" ? "Choose a period to read." : locale === "ja" ? "期間を選んで運勢を読んでください。" : locale === "zh-CN" ? "选择期间查看运势。" : "選擇期間查看運勢。"}</p><ul className="mt-8 grid gap-3 sm:grid-cols-2">{FORTUNE_PERIOD_IDS.map((period) => <li key={period}><Link href={`${base}/${period}`} className="block rounded-2xl border border-[#f4bed1] p-5 font-bold">{periodLabel(period, locale)} {FORTUNE_COPY[locale].fortune}</Link></li>)}</ul></div></main>;
}
