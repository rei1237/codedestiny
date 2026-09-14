import type { Metadata } from "next";
import { notFound } from "next/navigation";
import catalog from "@/lib/marketing/feature-visual-details.generated.json";
import { renderFeatureDetailPanels, type VisualDetail } from "@/js/feature-detail-panels.mjs";
import DeferredShareWidget from "@/app/components/DeferredShareWidget";
import FeatureIntroductionActions from "../FeatureIntroductionActions";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";
import "@/styles/feature-visual-detail.css";

const items = catalog.items as unknown as Record<string, VisualDetail>;
export const dynamicParams = false;
export function generateStaticParams() {
  return [...new Set(catalog.index.filter(item => item.verification === "verified").map(item => item.slug))].map(slug => ({ slug }));
}
function find(slug: string) {
  const detail = Object.hasOwn(items, slug) ? items[slug] : null;
  return detail?.verification === "verified" ? detail : null;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const detail = find((await params).slug);
  if (!detail) return { title: "소개를 찾을 수 없습니다", robots: { index: false } };
  const url = `https://code-destiny.com/features/${detail.slug}/`;
  const image = detail.ogImage || detail.image || detail.panels.find(panel => panel.verifiedCapture)?.verifiedCapture?.src;
  const description = `${detail.title} · ${detail.description}`;
  const shareTitle = detail.journey?.questions?.[0] || detail.title;
  return {
    title: `${detail.title} 상세 안내 | CODE DESTINY`, description,
    alternates: { canonical: url }, robots: { index: false, follow: true },
    openGraph: { type: "website", title: shareTitle, description, url, images: image ? [{ url: new URL(image, url).href }] : [] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: image ? [new URL(image, url).href] : [] },
  };
}
export default async function FeatureIntroduction({ params }: { params: Promise<{ slug: string }> }) {
  const detail = find((await params).slug);
  if (!detail) notFound();
  const price = resolveServerFeaturePricing({ featureKey: detail.featureKey })?.amountKRW;
  const upper = detail.featureKeyTo ? resolveServerFeaturePricing({ featureKey: detail.featureKeyTo })?.amountKRW : null;
  const priceLabel = detail.accessType === 'free' ? '무료' : price ? `${price.toLocaleString('ko-KR')}원${upper && upper > price ? ` ~ ${upper.toLocaleString('ko-KR')}원` : ''}` : '시작 화면에서 이용 조건 확인';
  return <main className="featureIntroductionPage">
    <div className="mx-auto max-w-[960px]">
      <nav aria-label="기능 소개 탐색" className="featureIntroductionNav">
        <a href="/features/">기능 소개 목록</a>
        <a href="/">홈으로</a>
      </nav>
      <h1 className="featureIntroductionTitle">{detail.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: renderFeatureDetailPanels(detail, { headingLevel: 2, startPriceLabel: priceLabel }) }} />
      <FeatureIntroductionActions detail={{ featureKey: detail.featureKey, featureKeyTo: detail.featureKeyTo, accessType: detail.accessType, href: detail.href, ctaLabel: detail.ctaLabel }} />
      <DeferredShareWidget title={detail.title} description={detail.description} path={`/features/${detail.slug}/`} image={detail.ogImage || detail.image || undefined} contentType="software" />
    </div>
  </main>;
}
