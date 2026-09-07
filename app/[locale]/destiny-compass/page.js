import { notFound } from "next/navigation";
import PublicFeatureIntroduction, { introductionMetadata } from "../../components/PublicFeatureIntroduction";
import { INTRO_LOCALES } from "../../../lib/i18n/feature-introductions.mjs";
export const dynamicParams = false;
export function generateStaticParams() { return INTRO_LOCALES.map(locale => ({ locale })); }
export async function generateMetadata({ params }) { const { locale } = await params; if (!INTRO_LOCALES.includes(locale)) notFound(); return introductionMetadata(locale, "destiny-compass"); }
export default async function Page({ params }) { const { locale } = await params; if (!INTRO_LOCALES.includes(locale)) notFound(); return <PublicFeatureIntroduction locale={locale} topic="destiny-compass" />; }
