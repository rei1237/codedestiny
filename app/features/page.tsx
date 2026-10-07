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
        <h1>지금의 고민에서 시작해요</h1>
        <p>마음에 닿는 서비스를 골라 바로 시작하세요. 준비할 정보와 결과 예시는 이용 방법에서 살펴볼 수 있어요.</p>
      </header>
      <FeatureIntroductionCatalog items={items} />
    </div>
  </main>;
}
