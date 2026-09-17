import { notFound } from "next/navigation";
import PublicFeatureIntroduction, { introductionMetadata } from "../../components/PublicFeatureIntroduction";
import { INTRO_LOCALES } from "../../../lib/i18n/feature-introductions.mjs";
// vedic도 zh-TW 번역이 갖춰져 있다 — 다른 허브는 아직이므로 공용 INTRO_LOCALES에는 넣지 않는다.
const VEDIC_LOCALES = [...INTRO_LOCALES, "zh-tw"];
export const dynamicParams = false;
export function generateStaticParams() { return VEDIC_LOCALES.map(locale => ({ locale })); }
async function getLocale(params) { const { locale } = await params; if (!VEDIC_LOCALES.includes(locale)) notFound(); return locale; }
export async function generateMetadata({ params }) { return introductionMetadata(await getLocale(params), "vedic"); }
export default async function Page({ params }) { return <PublicFeatureIntroduction locale={await getLocale(params)} topic="vedic" />; }
