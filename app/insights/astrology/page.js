import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/astrology";
const INSIGHTS_ASTROLOGY_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "점성술 인사이트 허브 · 출생차트·상승궁 | Code Destiny",
    description: "점성술 차트, 태양궁·달궁·상승궁, 하우스 해석을 초보자 친화적으로 정리한 점성술 허브입니다.",
    keywords: ["상승궁", "달궁", "태양궁", "하우스 뜻", "점성술 용어"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "점성술 인사이트"],
    archiveTitle: "점성술 인사이트 허브",
    intro: "출생차트 구조와 별자리 해석을 실제 생활 계획으로 연결하는 점성술 실전 가이드 모음입니다.",
  },
  en: {
    title: "Astrology Insights Hub · Birth Chart and Rising Sign Guide | Code Destiny",
    description: "A beginner-friendly astrology hub for birth charts, Sun, Moon, rising signs, and house interpretation.",
    keywords: ["astrology chart", "birth chart", "rising sign", "moon sign", "sun sign", "house interpretation"],
    breadcrumbs: ["Home", "Fortune Insights", "Astrology Insights"],
    archiveTitle: "Astrology Insights Hub",
    intro: "Practical astrology guides that connect birth-chart structure and zodiac interpretation to real-life planning.",
  },
  ja: {
    title: "占星術インサイトハブ · 出生チャート・上昇宮ガイド | Code Destiny",
    description: "出生チャート、太陽星座・月星座・上昇宮、ハウス解釈を初心者にもわかりやすく整理した占星術ハブです。",
    keywords: ["占星術チャート", "出生チャート", "上昇宮", "月星座", "太陽星座", "ハウス解釈"],
    breadcrumbs: ["ホーム", "運勢インサイト", "占星術インサイト"],
    archiveTitle: "占星術インサイトハブ",
    intro: "出生チャートの構造と星座解釈を、実際の生活計画につなげる占星術実践ガイド集です。",
  },
};
const insightsAstrologyPageCopy = INSIGHTS_ASTROLOGY_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsAstrologyPageCopy.title;
const description = insightsAstrologyPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsAstrologyPageCopy.keywords,
});

export default function InsightsAstrologyPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsAstrologyPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsAstrologyPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsAstrologyPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="astrology"
        title={insightsAstrologyPageCopy.archiveTitle}
        intro={insightsAstrologyPageCopy.intro}
        serviceCtaPath="/astrology"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
