// Reading order is an editorial navigation choice, not evidence of expert review.
export const EDITORIAL_READING_PATHS = [
  { title: "계산 기준부터 확인하기", slugs: ["how-we-calculate-saju", "midnight-birth-day-pillar", "why-saju-results-differ-between-services", "saju-without-birth-time-three-pillars-guide", "manseoryeok-what-is"] },
  { title: "사주의 해석 순서", slugs: ["ten-gods-beginner-map", "ten-gods-practical-map-love-work-money", "yongshin-finding-method-practical-guide", "daewoon-sewoon-reading-complete-guide"] },
  { title: "서로 다른 체계 비교하기", slugs: ["ziwei-vs-saju", "sukuyo-vs-saju-compatibility", "astrology-vs-saju-differences", "sukuyo-bonmyeongsuk-vs-wolmyeongsuk"] },
  { title: "관계와 상징을 읽는 기초", slugs: ["ziwei-star-brightness", "sukuyo-27-mansions", "sukuyo-love", "sukuyo-compatibility-guide", "astrology-birth-chart-guide", "vedic-lagna-what-is", "tarot-reunion-reading"] },
];
export const EDITORIAL_READING_SLUGS = EDITORIAL_READING_PATHS.flatMap((path) => path.slugs);
