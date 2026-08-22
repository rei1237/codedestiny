import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/tarot";
const INSIGHTS_TAROT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "타로 인사이트 허브 · 질문법과 카드 해석 가이드 | Code Destiny",
    description: "무료 타로, 연애 타로, 재회운 타로, 상대방 속마음 타로의 질문 설계와 카드 해석을 차분한 말로 정리한 타로 인사이트 허브입니다.",
    keywords: ["타로 카드 의미", "타로 카드 해석", "타로 질문 설계", "메이저 아르카나"],
    breadcrumbs: ["꿀꿀 운세 홈", "운세 인사이트", "타로 인사이트"],
    archiveTitle: "타로 인사이트 허브",
    intro: "카드 의미를 외우는 데서 멈추지 않고, 좋은 질문을 세우고 현실에서 확인할 조언으로 이어 가는 타로 해석 아카이브입니다.",
  },
  en: {
    title: "Tarot Insights Hub · Reading Questions and Interpretation Guide | Code Destiny",
    description: "A tarot insights hub for free tarot, love tarot, reunion readings, and question design around someone's true feelings.",
    keywords: ["free tarot", "love tarot", "reunion tarot", "tarot interpretation", "true feelings tarot"],
    breadcrumbs: ["Home", "Fortune Insights", "Tarot Insights"],
    archiveTitle: "Tarot Insights Hub",
    intro: "A warm tarot archive focused less on memorizing card meanings and more on question design, practical guidance, and humane divination service.",
  },
  ja: {
    title: "タロットインサイトハブ · 占いサービス型の質問設計と解釈ガイド | Code Destiny",
    description: "無料タロット、恋愛タロット、復縁運、相手の気持ちタロットの質問設計と解釈を、人に届く言葉でまとめたタロットインサイトハブです。",
    keywords: ["無料タロット", "恋愛タロット", "復縁運タロット", "タロット解釈", "相手の気持ちタロット"],
    breadcrumbs: ["ホーム", "運勢インサイト", "タロットインサイト"],
    archiveTitle: "タロットインサイトハブ",
    intro: "カード意味の暗記よりも質問設計と実践提案に焦点を当てた、占いサービスにも役立つ温かなタロット解釈アーカイブです。",
  },
};
const insightsTarotPageCopy = INSIGHTS_TAROT_PAGE_TEXT_TRANSLATIONS.ko;
const title = insightsTarotPageCopy.title;
const description = insightsTarotPageCopy.description;

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: insightsTarotPageCopy.keywords,
});

export default function InsightsTarotPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: insightsTarotPageCopy.breadcrumbs[0], path: "/" },
    { name: insightsTarotPageCopy.breadcrumbs[1], path: "/insights" },
    { name: insightsTarotPageCopy.breadcrumbs[2], path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="tarot"
        title={insightsTarotPageCopy.archiveTitle}
        intro={insightsTarotPageCopy.intro}
        serviceCtaPath="/tarot"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
