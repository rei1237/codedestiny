import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/ziwei";
const INSIGHTS_ZIWEI_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "자미두수 인사이트 허브 · 명반·12궁 해석 | Code Destiny",
    description: "자미두수, 자미두수 명반, 자미두수 12궁, 명궁·재백궁·관록궁 해석을 집중 정리한 자미두수 전용 허브입니다.",
    keywords: ["자미두수 공부", "자미두수 용어", "명궁 재백궁 관록궁", "12궁 이름"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "자미두수 인사이트"],
    archiveTitle: "자미두수 인사이트 허브",
    intro: "자미두수 명반, 12궁, 사화, 궁합 해석을 실제 명반 읽기 순서에 맞춰 제공하는 자미두수 SEO 허브입니다.",
  },
  en: {
    title: "Zi Wei Dou Shu Insights Hub · Chart and 12 Palaces Guide | Code Destiny",
    description: "A dedicated Zi Wei Dou Shu hub focused on natal charts, the 12 palaces, Ming Palace, Wealth Palace, and Career Palace.",
    keywords: ["Zi Wei Dou Shu", "Zi Wei chart", "12 palaces", "Ming Palace", "how to read Zi Wei"],
    breadcrumbs: ["Home", "Fortune Insights", "Zi Wei Insights"],
    archiveTitle: "Zi Wei Dou Shu Insights Hub",
    intro: "A Zi Wei SEO hub that follows the real order of reading charts, 12 palaces, transformations, and compatibility.",
  },
  ja: {
    title: "紫微斗数インサイトハブ · 命盤・十二宮解釈ガイド | Code Destiny",
    description: "紫微斗数、紫微斗数命盤、十二宮、命宮・財帛宮・官禄宮の解釈を集中的に整理した紫微斗数専用ハブです。",
    keywords: ["紫微斗数", "紫微斗数 命盤", "紫微斗数 十二宮", "命宮", "紫微斗数の見方"],
    breadcrumbs: ["ホーム", "運勢インサイト", "紫微斗数インサイト"],
    archiveTitle: "紫微斗数インサイトハブ",
    intro: "紫微斗数命盤、十二宮、四化、相性解釈を、実際の命盤を読む順序に沿って提供する紫微斗数SEOハブです。",
  },
};
const insightsZiweiPageCopy = INSIGHTS_ZIWEI_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsZiweiPageCopy.title;
const description = insightsZiweiPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsZiweiPageCopy.keywords,
});

export default function InsightsZiweiPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsZiweiPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsZiweiPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsZiweiPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="ziwei"
        title={insightsZiweiPageCopy.archiveTitle}
        intro={insightsZiweiPageCopy.intro}
        serviceCtaPath="/ziwei"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
