import { SEO_KEYWORD_CLUSTERS } from "./keyword-clusters";

export const SEO_BRAND_KEYWORDS = [
  "Code Destiny",
  "코드 데스티니",
  "꿀꿀 만세력",
  "codedestiny",
  "꿀꿀 운세",
  "꿀꿀 사주",
];

export const SEO_HIGH_IMPACT_KEYWORDS = [
  "사주",
  "운세",
  "오늘의 운세",
  "무료 사주",
  "사주풀이",
  "궁합",
  "타로",
  "자미두수",
  "숙요점",
  "베다점성술",
  "점성술 차트",
  "동물관상",
  "꿈해몽",
];

export const SEO_CLUSTER_KEYWORDS = SEO_KEYWORD_CLUSTERS.flatMap((cluster) => [
  cluster.mainKeyword,
  ...cluster.relatedKeywords,
]);

export const SEO_ALL_KEYWORDS = Array.from(
  new Set([...SEO_BRAND_KEYWORDS, ...SEO_HIGH_IMPACT_KEYWORDS, ...SEO_CLUSTER_KEYWORDS]),
);
