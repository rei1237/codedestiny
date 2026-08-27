import InsightTopicArchive from "../InsightTopicArchive";
import { getEditorNote } from "../../_content/editor-notes";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";
import { FUSION_FORTUNE_PROFILE } from "../../../lib/seo/entity-registry.mjs";

const path = "/insights/fusion";
const INSIGHTS_FUSION_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "초융합 인사이트 허브 · 여섯 체계 함께 읽기 | Code Destiny",
    description: `${FUSION_FORTUNE_PROFILE.topicSummary} 체계 간 비교 글 허브입니다.`,
    keywords: [FUSION_FORTUNE_PROFILE.primary, ...FUSION_FORTUNE_PROFILE.secondary, "사주 자미두수 비교", "여러 운세 함께 보기"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "초융합 인사이트"],
    archiveTitle: "초융합 운세 인사이트 허브",
    intro: `${FUSION_FORTUNE_PROFILE.topicSummary} 이 허브는 여섯 체계가 같은 질문에 어떻게 다르게 답하는지 비교하며 초융합이 무엇을 보는 방식인지 설명하는 무료 콘텐츠입니다. 내 생년월일시로 여섯 체계를 한 번에 교차 분석하는 AI 리포트는 초융합 운세 서비스에서 이어볼 수 있습니다.`,
  },
  en: {
    title: "Fusion Fortune Insights Hub · Reading Six Systems Together | Code Destiny",
    description: "A dedicated hub comparing how saju, Zi Wei Dou Shu, sukuyo, Vedic astrology, Western astrology, and tarot each read the same question.",
    keywords: ["fusion fortune", "AI fusion fortune", "combined fortune reading", "saju vs Zi Wei"],
    breadcrumbs: ["Home", "Fortune Insights", "Fusion Insights"],
    archiveTitle: "Fusion Fortune Insights Hub",
    intro: "A free hub comparing how six fortune-telling systems each define the same theme, before an AI cross-analysis report is available on the Fusion Fortune service.",
  },
  ja: {
    title: "超融合運勢インサイトハブ · 六つの体系を共に読む方法 | Code Destiny",
    description: "四柱推命、紫微斗数、宿曜、ヴェーダ占星術、西洋占星術、タロットが同じ問いにどう異なる答えを出すかを比較するハブです。",
    keywords: ["超融合運勢", "AI超融合運勢", "統合運勢", "四柱推命と紫微斗数の違い"],
    breadcrumbs: ["ホーム", "運勢インサイト", "超融合インサイト"],
    archiveTitle: "超融合運勢インサイトハブ",
    intro: "六つの運勢体系が同じテーマをどう異なる基準で読むかを比較する無料ハブです。",
  },
};
const insightsFusionPageCopy = INSIGHTS_FUSION_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsFusionPageCopy.title;
const description = insightsFusionPageCopy.description;

const CURATED_FUSION_SLUGS = [
  "ziwei-vs-saju",
  "sukuyo-vs-saju-compatibility",
  "astrology-vs-saju-differences",
  "saju-and-tarot-combined-reading-framework",
];

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsFusionPageCopy.keywords,
});

export default function InsightsFusionPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsFusionPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsFusionPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsFusionPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        editorNote={getEditorNote("/insights/fusion")}
        topic="fusion"
        title={insightsFusionPageCopy.archiveTitle}
        intro={insightsFusionPageCopy.intro}
        serviceCtaPath="/fusion-fortune"
        curatedSlugs={CURATED_FUSION_SLUGS}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
