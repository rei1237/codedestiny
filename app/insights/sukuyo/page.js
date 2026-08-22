import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/sukuyo";
const INSIGHTS_SUKUYO_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "숙요점 인사이트 허브 · 27숙·궁합 해석 가이드 | Code Destiny",
    description: "숙요점, 숙요점 궁합, 27숙, 본명숙, 영친관계·업태관계·안괴관계를 집중 해설한 숙요점 전용 허브입니다.",
    keywords: ["숙요점 뜻", "숙요점 용어", "영친관계", "업태관계", "안괴관계"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "숙요점 인사이트"],
    archiveTitle: "숙요점 인사이트 허브",
    intro: "숙요점 27숙 관계 분석, 숙요 궁합, 본명숙과 월명숙 해석을 실전 사례 중심으로 제공하는 숙요점 허브입니다.",
  },
  en: {
    title: "Sukuyo Insights Hub · 27 Mansions and Compatibility Guide | Code Destiny",
    description: "A dedicated Sukuyo hub focused on 27 mansions, natal mansion, and relationship patterns such as Ei-Shin, Gyotai, and Ankair.",
    keywords: ["Sukuyo", "Sukuyo compatibility", "27 mansions", "natal mansion", "Ei-Shin", "Gyotai", "Ankair"],
    breadcrumbs: ["Home", "Fortune Insights", "Sukuyo Insights"],
    archiveTitle: "Sukuyo Insights Hub",
    intro: "A Sukuyo hub for 27-mansion relationship analysis, compatibility, natal mansions, and monthly mansions through practical examples.",
  },
  ja: {
    title: "宿曜インサイトハブ · 二十七宿・相性解釈ガイド | Code Destiny",
    description: "宿曜、宿曜相性、二十七宿、本命宿、栄親・業胎・安壊関係を集中的に解説する宿曜専用ハブです。",
    keywords: ["宿曜", "宿曜 相性", "二十七宿", "本命宿", "栄親関係", "業胎関係", "安壊関係"],
    breadcrumbs: ["ホーム", "運勢インサイト", "宿曜インサイト"],
    archiveTitle: "宿曜インサイトハブ",
    intro: "宿曜二十七宿の関係分析、宿曜相性、本命宿と月命宿の解釈を実例中心で提供する宿曜ハブです。",
  },
};
const insightsSukuyoPageCopy = INSIGHTS_SUKUYO_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsSukuyoPageCopy.title;
const description = insightsSukuyoPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsSukuyoPageCopy.keywords,
});

export default function InsightsSukuyoPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsSukuyoPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsSukuyoPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsSukuyoPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="sukuyo"
        title={insightsSukuyoPageCopy.archiveTitle}
        intro={insightsSukuyoPageCopy.intro}
        serviceCtaPath="/sukuyo"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
