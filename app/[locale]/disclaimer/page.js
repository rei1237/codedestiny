import { notFound } from "next/navigation";
import LocalizedTrustPage, { trustMetadata } from "../../components/LocalizedTrustPage";
import { TRUST_LOCALES } from "../../../lib/i18n/public-trust-copy.mjs";
export const dynamicParams = false;
export function generateStaticParams() { return TRUST_LOCALES.map(locale => ({ locale })); }
async function getLocale(params) {
  const { locale } = await params;
  if (!TRUST_LOCALES.includes(locale)) notFound();
  return locale;
}
export async function generateMetadata({ params }) { return trustMetadata(await getLocale(params), "disclaimer"); }
export default async function Page({ params }) { return <LocalizedTrustPage locale={await getLocale(params)} pageKey="disclaimer" />; }
