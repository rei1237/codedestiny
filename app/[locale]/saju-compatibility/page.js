import { notFound } from "next/navigation";
import PublicFeatureIntroduction, { introductionMetadata } from "../../components/PublicFeatureIntroduction";
import { INTRO_LOCALES } from "../../../lib/i18n/feature-introductions.mjs";
const SAJU_COMPATIBILITY_LOCALES = [...INTRO_LOCALES, "zh-tw"];
export const dynamicParams = false;
export function generateStaticParams() { return SAJU_COMPATIBILITY_LOCALES.map(locale => ({ locale })); }
async function getLocale(params) { const { locale } = await params; if (!SAJU_COMPATIBILITY_LOCALES.includes(locale)) notFound(); return locale; }
export async function generateMetadata({ params }) { return introductionMetadata(await getLocale(params), "saju-compatibility"); }
export default async function Page({ params }) { return <PublicFeatureIntroduction locale={await getLocale(params)} topic="saju-compatibility" />; }
