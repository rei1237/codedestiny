import type { Metadata } from "next";
import { notFound } from "next/navigation";
import catalog from "@/lib/marketing/feature-visual-details.generated.json";
import { renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import DeferredShareWidget from "@/app/components/DeferredShareWidget";
import FeatureIntroductionActions from "../FeatureIntroductionActions";
import "@/styles/feature-visual-detail.css";

const items = catalog.items as unknown as Record<string, VisualDetail>;
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.index.filter(item => item.verification === "verified").map(item => ({ slug: item.slug }));
}
function find(slug: string) {
  const detail = Object.hasOwn(items, slug) ? items[slug] : null;
  return detail?.verification === "verified" ? detail : null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const detail = find((await params).slug);
  if (!detail) return { title: "소개를 찾을 수 없습니다", robots: { index: false } };
  const url = `https://code-destiny.com/features/${detail.slug}/`;
  const image = detail.image || detail.panels.find(panel => panel.verifiedCapture)?.verifiedCapture?.src;
  return {
    title: `${detail.title} | CODE DESTINY`, description: detail.description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: detail.title, description: detail.description, url, images: image ? [{ url: new URL(image, url).href }] : [] },
    twitter: { card: "summary_large_image", title: detail.title, description: detail.description, images: image ? [new URL(image, url).href] : [] },
  };
}
export default async function FeatureIntroduction({ params }: { params: Promise<{ slug: string }> }) {
  const detail = find((await params).slug);
  if (!detail) notFound();
  return <main className="featureIntroductionPage">
    <div className="mx-auto max-w-[960px]">
      <nav aria-label="기능 소개 탐색" className="featureIntroductionNav">
        <a href="/features/">기능 소개 목록</a>
        <a href="/">홈으로</a>
      </nav>
      <h1 className="featureIntroductionTitle">{detail.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: renderFeatureDetailPanels(detail, { headingLevel: 2 }) }} />
      <FeatureIntroductionActions detail={{ featureKey: detail.featureKey, featureKeyTo: detail.featureKeyTo, accessType: detail.accessType, href: detail.href, ctaLabel: detail.ctaLabel }} />
      <DeferredShareWidget title={detail.title} description={detail.description} path={`/features/${detail.slug}/`} image={detail.image || undefined} contentType="software" />
    </div>
  </main>;
}
