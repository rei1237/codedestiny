import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/compatibility";
const INSIGHTS_COMPATIBILITY_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "궁합 인사이트 허브 · 사주·숙요점·자미두수 관계 가이드 | Code Destiny",
    description: "사주 궁합, 숙요점 궁합, 자미두수 궁합을 비교하고 관계 운영법을 정리한 궁합 인사이트 허브입니다.",
    keywords: ["궁합 보는 법", "궁합 종류 비교", "관계 운영법", "궁합 해석 차이"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "궁합 인사이트"],
    archiveTitle: "궁합 인사이트 허브",
    intro: "사주·숙요점·자미두수 관점으로 관계 패턴을 비교하고 실제 소통 규칙을 정리한 궁합 가이드 허브입니다.",
  },
  en: {
    title: "Compatibility Insights Hub · Saju, Sukuyo, and Zi Wei Relationship Guide | Code Destiny",
    description: "A compatibility hub comparing Saju, Sukuyo, and Zi Wei relationship patterns with practical guidance for relating well.",
    keywords: ["compatibility", "Saju compatibility", "Sukuyo compatibility", "Zi Wei compatibility", "love fortune"],
    breadcrumbs: ["Home", "Fortune Insights", "Compatibility Insights"],
    archiveTitle: "Compatibility Insights Hub",
    intro: "A relationship guide hub that compares patterns through Saju, Sukuyo, and Zi Wei, then organizes practical communication rules.",
  },
  ja: {
    title: "相性インサイトハブ · 四柱推命・宿曜・紫微斗数の関係ガイド | Code Destiny",
    description: "四柱推命、宿曜、紫微斗数の相性を比較し、関係の整え方をまとめた相性インサイトハブです。",
    keywords: ["相性", "四柱推命 相性", "宿曜 相性", "紫微斗数 相性", "恋愛運"],
    breadcrumbs: ["ホーム", "運勢インサイト", "相性インサイト"],
    archiveTitle: "相性インサイトハブ",
    intro: "四柱推命・宿曜・紫微斗数の観点から関係パターンを比較し、実際の対話ルールを整理した相性ガイドハブです。",
  },
};
const insightsCompatibilityPageCopy = INSIGHTS_COMPATIBILITY_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsCompatibilityPageCopy.title;
const description = insightsCompatibilityPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsCompatibilityPageCopy.keywords,
});

export default function InsightsCompatibilityPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsCompatibilityPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsCompatibilityPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsCompatibilityPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="compatibility"
        title={insightsCompatibilityPageCopy.archiveTitle}
        intro={insightsCompatibilityPageCopy.intro}
        serviceCtaPath="/compatibility"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
