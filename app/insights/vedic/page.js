import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/vedic";
const INSIGHTS_VEDIC_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "베다점성술 인사이트 허브 · 라그나·다샤 해석 가이드 | Code Destiny",
    description: "베다점성술, 베다점, 라그나, 나크샤트라, 다샤 해석을 한국어로 정리한 베다점성술 허브입니다.",
    keywords: ["라그나", "다샤 뜻", "베다 점성술 용어", "조티쉬 용어"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "베다점성술 인사이트"],
    archiveTitle: "베다점성술 인사이트 허브",
    intro: "라그나, 나크샤트라, 다샤 흐름을 한국어 사용자 기준으로 이해하기 쉽게 정리한 베다점 허브입니다.",
  },
  en: {
    title: "Vedic Astrology Insights Hub · Lagna and Dasha Guide | Code Destiny",
    description: "A Vedic astrology hub explaining Jyotish, Lagna, Nakshatra, and Dasha flow for Korean readers.",
    keywords: ["Vedic astrology", "Jyotish", "Lagna", "Nakshatra", "Dasha"],
    breadcrumbs: ["Home", "Fortune Insights", "Vedic Astrology Insights"],
    archiveTitle: "Vedic Astrology Insights Hub",
    intro: "A Jyotish hub that explains Lagna, Nakshatra, and Dasha flow in a clear way for Korean-language users.",
  },
  ja: {
    title: "ヴェーダ占星術インサイトハブ · ラグナ・ダシャー解釈ガイド | Code Destiny",
    description: "ヴェーダ占星術、ジョーティッシュ、ラグナ、ナクシャトラ、ダシャー解釈を韓国語で整理したヴェーダ占星術ハブです。",
    keywords: ["ヴェーダ占星術", "ジョーティッシュ", "ラグナ", "ナクシャトラ", "ダシャー"],
    breadcrumbs: ["ホーム", "運勢インサイト", "ヴェーダ占星術インサイト"],
    archiveTitle: "ヴェーダ占星術インサイトハブ",
    intro: "ラグナ、ナクシャトラ、ダシャーの流れを韓国語ユーザーにもわかりやすく整理したヴェーダ占星術ハブです。",
  },
};
const insightsVedicPageCopy = INSIGHTS_VEDIC_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsVedicPageCopy.title;
const description = insightsVedicPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsVedicPageCopy.keywords,
});

export default function InsightsVedicPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsVedicPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsVedicPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsVedicPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="vedic"
        title={insightsVedicPageCopy.archiveTitle}
        intro={insightsVedicPageCopy.intro}
        serviceCtaPath="/vedic"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
