import { notFound } from "next/navigation";
import PublicFeatureIntroduction, { introductionMetadata } from "../../components/PublicFeatureIntroduction";
import { INTRO_LOCALES } from "../../../lib/i18n/feature-introductions.mjs";
const COMPATIBILITY_LOCALES = [...INTRO_LOCALES, "zh-tw"];
export const dynamicParams = false;
export function generateStaticParams() { return COMPATIBILITY_LOCALES.map(locale => ({ locale })); }
async function getLocale(params) { const { locale } = await params; if (!COMPATIBILITY_LOCALES.includes(locale)) notFound(); return locale; }
export async function generateMetadata({ params }) { return introductionMetadata(await getLocale(params), "compatibility"); }
export default async function Page({ params }) { return <PublicFeatureIntroduction locale={await getLocale(params)} topic="compatibility" />; }
