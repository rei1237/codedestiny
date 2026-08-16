import InsightTopicArchive from "../InsightTopicArchive";
import { getEditorNote } from "../../_content/editor-notes";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/dream";
const INSIGHTS_DREAM_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "꿈해몽 인사이트 허브 · 꿈 상징 해석 가이드 | Code Destiny",
    description: "꿈해몽, 무료 꿈해몽, 꿈 상징 해석, 꿈 기록법을 현실적인 자기 점검과 일상 기록으로 연결하는 꿈해몽 인사이트 허브입니다.",
    keywords: ["꿈해몽", "무료 꿈해몽", "꿈 상징", "꿈 해석"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "꿈해몽 인사이트"],
    archiveTitle: "꿈해몽 인사이트 허브",
    intro: "꿈 상징을 자기이해와 일상 루틴으로 연결하는 꿈해몽 실전 가이드를 제공합니다.",
  },
  en: {
    title: "Dream Interpretation Insights Hub · Dream Symbol Guide | Code Destiny",
    description: "A dream interpretation hub that connects dream symbols, free dream readings, and dream journaling with practical self-checks.",
    keywords: ["dream interpretation", "free dream interpretation", "dream symbols", "dream meaning"],
    breadcrumbs: ["Home", "Fortune Insights", "Dream Insights"],
    archiveTitle: "Dream Interpretation Insights Hub",
    intro: "Practical dream guides that connect dream symbols with self-understanding and daily routines.",
  },
  ja: {
    title: "夢占いインサイトハブ · 夢の象徴解釈ガイド | Code Destiny",
    description: "夢占い、無料夢占い、夢の象徴解釈、夢日記を現実的な自己点検と日常記録につなげる夢占いインサイトハブです。",
    keywords: ["夢占い", "無料夢占い", "夢の象徴", "夢の解釈"],
    breadcrumbs: ["ホーム", "運勢インサイト", "夢占いインサイト"],
    archiveTitle: "夢占いインサイトハブ",
    intro: "夢の象徴を自己理解と日常ルーティンにつなげる、夢占い実践ガイドをお届けします。",
  },
};
const insightsDreamPageCopy = INSIGHTS_DREAM_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsDreamPageCopy.title;
const description = insightsDreamPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsDreamPageCopy.keywords,
});

export default function InsightsDreamPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsDreamPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsDreamPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsDreamPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        editorNote={getEditorNote("/insights/dream")}
        topic="dream"
        title={insightsDreamPageCopy.archiveTitle}
        intro={insightsDreamPageCopy.intro}
        serviceCtaPath="/dream"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
