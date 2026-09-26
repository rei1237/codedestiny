const TOPIC_LABELS = Object.freeze({
  saju: "사주",
  tarot: "타로",
  sukuyo: "숙요점",
  vedic: "베다점",
  astrology: "점성술",
  ziwei: "자미두수",
  compatibility: "궁합",
});

export function getExplicitInsightTopic(category) {
  const value = String(category || "").trim().toLowerCase();
  if (!value) return null;
  if (/자미두수|ziwei/.test(value)) return "ziwei";
  if (/숙요|27숙/.test(value)) return "sukuyo";
  if (/타로|tarot|arcana/.test(value)) return "tarot";
  if (/베다|vedic|jyotish|나크샤트라/.test(value)) return "vedic";
  if (/점성술|astrology/.test(value)) return "astrology";
  if (/궁합|compatibility/.test(value)) return "compatibility";
  if (/사주|명리/.test(value)) return "saju";
  return null;
}

export function inferInsightTopic(article, fallback = "saju") {
  const explicit = [article?.categoryLabel, article?.categoryName, article?.categorySlug, article?.category]
    .map(getExplicitInsightTopic)
    .find(Boolean);
  if (explicit) return explicit;

  const bag = [
    article?.slug,
    article?.title,
    article?.mainKeyword,
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
    ...(Array.isArray(article?.tags) ? article.tags : []),
  ].map((value) => String(value || "")).join(" ").toLowerCase();

  if (/자미|ziwei|명궁|궁위|관록궁/.test(bag)) return "ziwei";
  if (/숙요|27숙|영친|업태|안괴/.test(bag)) return "sukuyo";
  if (/타로|tarot|arcana|아르카나|스프레드/.test(bag)) return "tarot";
  if (/베다|vedic|jyotish|라그나|나크샤트라|다샤/.test(bag)) return "vedic";
  if (/점성술|astrology|출생차트|네이탈|상승궁|하우스/.test(bag)) return "astrology";
  if (/궁합|compatibility|인연/.test(bag)) return "compatibility";
  if (/사주|명리|만세력|오행|십성|대운|일간/.test(bag)) return "saju";
  return fallback;
}

export function getInsightTopicLabel(topic, fallback = "기타") {
  return TOPIC_LABELS[topic] || fallback;
}
