import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/saju";
const INSIGHTS_SAJU_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "사주 인사이트 허브 · 사주팔자·만세력 | Code Destiny",
    description: "사주 공부, 사주풀이, 만세력 보는 법, 오행·십성 해석을 깊이 있게 정리한 사주 인사이트 아카이브입니다.",
    keywords: ["사주 공부", "사주 용어", "사주 독학", "명식 읽는 순서"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "사주 인사이트"],
    archiveTitle: "사주 인사이트 허브",
    intro: "사주팔자, 만세력, 일간, 십성, 대운 해석을 단계별로 정리한 사주 전용 아카이브입니다.",
  },
  en: {
    title: "Saju Insights Hub · Four Pillars and Manse Calendar Guide | Code Destiny",
    description: "A Saju insights archive covering Four Pillars study, readings, Manse calendar use, Five Elements, and Ten Gods interpretation.",
    keywords: ["Saju study", "Four Pillars reading", "Manse calendar guide", "Five Elements", "Ten Gods"],
    breadcrumbs: ["Home", "Fortune Insights", "Saju Insights"],
    archiveTitle: "Saju Insights Hub",
    intro: "A dedicated Saju archive organized step by step around Four Pillars, the Manse calendar, day master, Ten Gods, and major luck.",
  },
  ja: {
    title: "四柱推命インサイトハブ · 四柱八字と万歳暦解釈ガイド | Code Destiny",
    description: "四柱推命の学び、命式鑑定、万歳暦の見方、五行・十神解釈を深く整理した四柱推命インサイトアーカイブです。",
    keywords: ["四柱推命 学習", "四柱推命 鑑定", "万歳暦の見方", "五行", "十神"],
    breadcrumbs: ["ホーム", "運勢インサイト", "四柱推命インサイト"],
    archiveTitle: "四柱推命インサイトハブ",
    intro: "四柱八字、万歳暦、日干、十神、大運の解釈を段階別に整理した四柱推命専用アーカイブです。",
  },
};
const insightsSajuPageCopy = INSIGHTS_SAJU_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsSajuPageCopy.title;
const description = insightsSajuPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsSajuPageCopy.keywords,
});

export default function InsightsSajuPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsSajuPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsSajuPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsSajuPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="saju"
        title={insightsSajuPageCopy.archiveTitle}
        intro={insightsSajuPageCopy.intro}
        serviceCtaPath="/saju"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
