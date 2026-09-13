import Link from "next/link";
import { notFound } from "next/navigation";
import { FORTUNE_PERIOD_IDS } from "@/lib/fortune/periods";
import { fortuneLocaleSegment as prefix, FORTUNE_COPY, normalizeFortuneLocale, periodLabel, type FortuneLocale } from "@/lib/fortune/localization";

export const dynamicParams = false;
const LOCALES = ["en", "ja", "zh", "zh-tw"];
function resolveLocale(value: string): FortuneLocale | null { return LOCALES.includes(value) ? normalizeFortuneLocale(value === "zh" ? "zh-CN" : value === "zh-tw" ? "zh-TW" : value) : null; }
export function generateStaticParams() { return LOCALES.map((locale) => ({ locale })); }

export default async function LocalizedFortuneIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  if (!locale) notFound();
  const base = `/${prefix(locale)}/fortune`;
  return <main className="min-h-screen px-4 py-12 text-[#3c1830]"><div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">{FORTUNE_COPY[locale].fortune}</h1><p className="mt-3 text-sm text-[#70445c]">{locale === "en" ? "Choose a period to read." : locale === "ja" ? "期間を選んで運勢を読んでください。" : locale === "zh-CN" ? "选择期间查看运势。" : "選擇期間查看運勢。"}</p><ul className="mt-8 grid gap-3 sm:grid-cols-2">{FORTUNE_PERIOD_IDS.map((period) => <li key={period}><Link href={`${base}/${period}`} className="block rounded-2xl border border-[#f4bed1] p-5 font-bold">{periodLabel(period, locale)} {FORTUNE_COPY[locale].fortune}</Link></li>)}</ul></div></main>;
}
