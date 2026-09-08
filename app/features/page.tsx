import type { Metadata } from "next";
import catalog from "@/lib/marketing/feature-visual-details.generated.json";
import FeatureIntroductionCatalog from "./FeatureIntroductionCatalog";
import "@/styles/feature-visual-detail.css";
export const metadata: Metadata = { title: "기능 소개 | CODE DESTINY", description: "사주·타로·자미두수·점성술 등 Code Destiny의 기능별 제공 내용과 준비 정보를 살펴보고, 지금의 고민에 맞는 상담을 골라 보세요.", alternates: { canonical: "https://code-destiny.com/features/" }, robots: { index: false, follow: true } };
export default function FeatureIntroductions() {
  const items = [...new Map(catalog.index.filter(item => item.verification === "verified").map(item => [item.slug, item])).values()];
  return <main className="featureCatalogPage">
    <div className="featureCatalogShell">
      <a href="/" className="featureCatalogHome">홈으로</a>
      <header className="featureCatalogHeader">
        <h1>내 고민에 맞는 이야기</h1>
        <p>결과에서 확인할 내용과 필요한 준비를 먼저 살펴보고, 지금의 고민에 맞는 기능을 골라 보세요.</p>
      </header>
      <FeatureIntroductionCatalog items={items} />
    </div>
  </main>;
}
