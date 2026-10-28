import PsychotestExperience from "@/src/features/psychotest/PsychotestExperience";
import { buildFortuneJsonLd, generatePageMetadata } from "../../lib/generate-page-metadata";
import {
  PSYCHOTESTS,
  PSYCHOTEST_HUB_KEYWORDS,
} from "../../lib/psychotest-catalog";
import RouteMetadataLocaleSync from "../components/RouteMetadataLocaleSync";
import { introductionRoutes } from "../../lib/i18n/feature-introductions.mjs";

const PSYCHOTEST_PAGE_METADATA_COPY = {
  ko: {
    title: "무료 심리테스트 22종 | MBTI·HSP·정신연령·연애",
    description:
      "성격, 연애, 직장, 공감, HSP, 정신연령 심리테스트 22종을 주제별로 비교하고 원하는 테스트를 골라 시작하세요. 모든 테스트는 무료입니다.",
    featureList: ["심리테스트 22종 카탈로그", "성격/연애/직장 카테고리 필터형 탐색", "기능별 요약과 추천 키워드 안내"],
    itemListName: "심리테스트 모음",
  },
  en: {
    title: "22 Psychological Tests | Personality, Love, and Work Test Hub",
    description:
      "Explore 22 free psychological tests by function, so you can compare personality, love, work, empathy, HSP, and mental-age tests at a glance.",
    featureList: ["Catalog of 22 psychological tests", "Category browsing for personality, love, and work", "Functional summaries and recommended keywords"],
    itemListName: "Psychological test collection",
  },
  ja: {
    title: "心理テスト22種まとめ | 性格・恋愛・仕事のテストハブ",
    description:
      "無料心理テスト22種を機能別に整理したSEOハブです。性格、恋愛、仕事、共感、HSP、精神年齢テストを一度に比較してすぐ始められます。",
    featureList: ["心理テスト22種カタログ", "性格・恋愛・仕事カテゴリ別探索", "機能別要約とおすすめキーワード"],
    itemListName: "心理テストまとめ",
  },
  zh: {
    title: "22 种心理测试合集 | 性格、恋爱、职场测试中心",
    description:
      "按功能整理 22 种 免费心理测试，可一次比较性格、恋爱、职场、共情、HSP 与心理年龄测试并立即开始。",
    featureList: ["22 种心理测试目录", "性格、恋爱、职场分类探索", "功能摘要与推荐关键词"],
    itemListName: "心理测试合集",
  },
} as const;

const META = {
  path: "/psychotest",
  title: PSYCHOTEST_PAGE_METADATA_COPY.ko.title,
  description: PSYCHOTEST_PAGE_METADATA_COPY.ko.description,
  keywords: PSYCHOTEST_HUB_KEYWORDS,
  featureList: PSYCHOTEST_PAGE_METADATA_COPY.ko.featureList,
  applicationCategory: "LifestyleApplication",
  isAccessibleForFree: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata({ ...META, hreflangPaths: introductionRoutes("psychotest") });
}

const BASE_GRAPH = JSON.parse(buildFortuneJsonLd(META));
const ITEM_LIST = {
  "@type": "ItemList",
  "@id": "https://code-destiny.com/psychotest#itemlist",
  name: PSYCHOTEST_PAGE_METADATA_COPY.ko.itemListName,
  itemListElement: PSYCHOTESTS.map((test, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `https://code-destiny.com/psychotest/${test.slug}`,
    name: test.title,
    description: test.summary,
  })),
};
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [...(Array.isArray(BASE_GRAPH?.["@graph"]) ? BASE_GRAPH["@graph"] : []), ITEM_LIST],
});

export default function PsychotestHubPage() { return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} /><RouteMetadataLocaleSync entries={PSYCHOTEST_PAGE_METADATA_COPY} /><PsychotestExperience /></>; }
