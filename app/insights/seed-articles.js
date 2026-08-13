import { INSIGHT_ARTICLES } from "./articles";
import { SEO_GROWTH_ARTICLES } from "./seo-growth-articles";

const DEFAULT_AUTHOR = "Code Destiny Editorial Team";
const SITE_ORIGIN = "https://code-destiny.com";
// 화면에 보이는 대표 이미지는 연이(꽃돼지) 자산, 소셜 공유 썸네일은 기존 브랜드 배지를 유지한다.
// 둘은 의도적으로 분리되어 있으니 한쪽만 바꾸지 말 것.
const DEFAULT_FEATURED_IMAGE = "/icons/app-logo-512.webp";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/icons/꿀꿀 운세 로고.webp`;

// 손수 쓴 본문(contentHtml)을 템플릿으로 덮지 않고 그대로 렌더할 슬러그.
// 저자 글을 새로 넣을 때는 이 Set에 등록하는 대신 글 객체에 `useOriginalContent: true`
// 플래그만 달면 된다(아래 buildSeedArticle 참고). Set은 seo-growth의 article() 헬퍼처럼
// 임의 필드를 버려 플래그를 못 다는 소스의 하위호환용으로 유지한다.
// 나머지 글은 기존 buildMysticSections 템플릿을 유지한다(애드센스 길이 게이트 영향 최소화).
const ORIGINAL_CONTENT_SLUGS = new Set([
  "sukuyo-what-is",
  "sukuyo-bonmyeongsuk-how-to-find",
  "manseoryeok-what-is",
  "ziwei-what-is",
  "ziwei-chart-guide",
  "ziwei-minggong",
  "ziwei-life-palaces",
  "ziwei-career-palace-action",
  "ziwei-vs-saju",
  "ziwei-star-brightness",
  "sukuyo-27-mansions",
  "sukuyo-vs-saju-compatibility",
  "sukuyo-eishin",
  "sukuyo-antai",
  "sukuyo-ankai",
  "sukuyo-myeongseong",
  "sukuyo-wiseong",
  "sukuyo-compatibility-guide",
  "sukuyo-bonmyeongsuk-vs-wolmyeongsuk",
  "sukuyo-useo",
  "sukuyo-love",
  "sukuyo-marriage",
  "tarot-how-to-read",
  "tarot-reunion-reading",
  "tarot-partner-mind-reading",
  "today-tarot-routine",
  "astrology-birth-chart-guide",
  "astrology-houses-what-is",
  "vedic-what-is",
  "vedic-lagna-what-is",
  "nakshatra-what-is",
  "saju-compatibility-how-to",
  "new-year-fortune-framework",
]);

const INSIGHT_IMAGE_PROFILES = [
  {
    id: "ziwei",
    url: "/fuctionassets/jami.webp",
    alt: "자미두수 명반 인사이트 이미지",
    keywords: ["자미", "ziwei", "명궁", "12궁", "궁위", "사화", "자미두수"],
  },
  {
    id: "sukuyo",
    url: "/fuctionassets/sukyo.webp",
    alt: "숙요점 궁합 인사이트 이미지",
    keywords: ["숙요", "27숙", "영친", "업태", "안괴", "본명숙", "월명숙"],
  },
  {
    id: "saju",
    url: "/fuctionassets/saju.webp",
    alt: "사주 명리학 인사이트 이미지",
    keywords: ["사주", "명리", "천간", "지지", "오행", "십성", "용신", "만세력", "일간", "대운", "세운"],
  },
  {
    id: "tarot-major",
    url: "/tarot-cards/theworld.webp",
    alt: "타로 메이저 아르카나 인사이트 이미지",
    keywords: ["아르카나", "major", "arcana", "메이저", "카드"],
  },
  {
    id: "tarot",
    url: "/fuctionassets/tarolove.webp",
    alt: "타로 리딩 인사이트 이미지",
    keywords: ["타로", "tarot", "스프레드", "리딩", "역방향"],
  },
  {
    id: "astrology",
    url: "/fuctionassets/jumsung.webp",
    alt: "점성술 차트 인사이트 이미지",
    keywords: ["점성", "astrology", "태양궁", "달궁", "상승궁", "하우스", "출생차트"],
  },
  {
    id: "vedic",
    url: "/fuctionassets/veda.webp",
    alt: "베다점성술 인사이트 이미지",
    keywords: ["베다", "vedic", "라그나", "나크샤트라"],
  },
  {
    id: "dream",
    url: "/fuctionassets/heamong.webp",
    alt: "꿈해몽 인사이트 이미지",
    keywords: ["꿈", "dream", "해몽", "무의식"],
  },
  {
    id: "love",
    url: "/fuctionassets/lovebible.webp",
    alt: "연애 궁합 인사이트 이미지",
    keywords: ["연애", "궁합", "관계", "재회", "사랑", "속마음"],
  },
  {
    id: "general",
    url: "/fuctionassets/flower4.webp",
    alt: "운세 인사이트 이미지",
    keywords: ["운세", "인사이트", "가이드", "fortune"],
  },
];

function isKnownBrokenImageUrl(value) {
  const url = String(value || "").trim().toLowerCase();
  if (!url) return true;
  return url.includes("/og/code-destiny-og.png");
}

function toAbsoluteAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${SITE_ORIGIN}/${raw}`;
}

function pickTopicImageProfile(article, index) {
  const blob = [
    article?.slug,
    article?.title,
    article?.description,
    article?.category,
    article?.mainKeyword,
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
    ...(Array.isArray(article?.relatedKeywords) ? article.relatedKeywords : []),
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  let bestScore = 0;
  const bestProfiles = [];

  for (const profile of INSIGHT_IMAGE_PROFILES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      if (blob.includes(String(keyword || "").toLowerCase())) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestProfiles.length = 0;
      bestProfiles.push(profile);
    } else if (score > 0 && score === bestScore) {
      bestProfiles.push(profile);
    }
  }

  if (bestProfiles.length > 0) {
    return bestProfiles[Math.abs(index) % bestProfiles.length];
  }

  return INSIGHT_IMAGE_PROFILES.find((profile) => profile.id === "general") || INSIGHT_IMAGE_PROFILES[0];
}

function resolveSeedImage(article, index, title) {
  const explicitImageUrl = String(
    article?.thumbnailUrl
      || article?.featuredImage?.url
      || article?.heroImage
      || article?.image
      || "",
  ).trim();

  const profile = pickTopicImageProfile(article, index);
  const selectedUrl = !isKnownBrokenImageUrl(explicitImageUrl) ? explicitImageUrl : profile.url;
  const selectedAlt = String(article?.featuredImage?.alt || profile.alt || `${title} 대표 이미지`).trim();

  return {
    url: selectedUrl || DEFAULT_FEATURED_IMAGE,
    alt: selectedAlt || `${title} 대표 이미지`,
    width: Math.max(0, Number(article?.featuredImage?.width || 1200) || 1200),
    height: Math.max(0, Number(article?.featuredImage?.height || 630) || 630),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeIsoDate(rawDate, fallbackOffsetDays = 0) {
  const candidate = String(rawDate || "").trim();
  if (candidate) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date(Date.now() - fallbackOffsetDays * 86400000);
  return fallback.toISOString();
}

function renderSectionsToHtml(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return "";

  return sections
    .map((section) => {
      const heading = escapeHtml(section?.heading || "핵심 포인트");
      const body = escapeHtml(section?.body || "").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>");
      return `<section><h2>${heading}</h2><p>${body}</p></section>`;
    })
    .join("\n");
}

function inferCategoryLabel(article) {
  const bag = [
    article?.category,
    article?.title,
    article?.slug,
    article?.mainKeyword,
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
  ].map((value) => String(value || "")).join(" ").toLowerCase();

  if (/자미|ziwei|명궁|궁위/.test(bag)) return "자미두수";
  if (/숙요|27숙|영친|업태|안괴/.test(bag)) return "숙요점";
  if (/타로|arcan|스프레드|카드/.test(bag)) return "타로";
  if (/베다|vedic|라그나|나크샤트라|다샤/.test(bag)) return "베다점";
  if (/점성|astrology|태양궁|상승궁|하우스/.test(bag)) return "점성술";
  if (/궁합|compatibility|연애/.test(bag)) return "궁합";
  if (/오늘|daily/.test(bag)) return "오늘의 운세";
  if (/신년|new\s*year|yearly/.test(bag)) return "신년운세";
  if (/룬|rune/.test(bag)) return "룬";
  if (/오미쿠지|omikuji/.test(bag)) return "오미쿠지";
  if (/사주|명리|오행|십성|대운|일간/.test(bag)) return "사주";
  return "기타";
}

function normalizeTags(article) {
  const categoryLabel = inferCategoryLabel(article);
  const seedTags = [
    ...(Array.isArray(article?.keywords) ? article.keywords : []),
    ...(Array.isArray(article?.relatedKeywords) ? article.relatedKeywords : []),
    categoryLabel,
    String(article?.mainKeyword || "").trim(),
  ];

  const tags = seedTags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const unique = Array.from(new Set(tags));

  if (unique.length < 3) {
    if (categoryLabel === "사주") unique.push("오행", "대운", "재물운");
    if (categoryLabel === "자미두수") unique.push("명궁", "궁위", "관록궁");
    if (categoryLabel === "숙요점") unique.push("27숙", "영친", "관계 흐름");
    if (categoryLabel === "타로") unique.push("카드 리딩", "질문 설계", "감정 흐름");
    if (categoryLabel === "점성술") unique.push("출생차트", "상승궁", "하우스");
    if (categoryLabel === "베다점") unique.push("라그나", "다샤", "카르마");
  }

  return Array.from(new Set(unique)).slice(0, 7);
}

function resolveServiceLink(categoryLabel) {
  if (categoryLabel === "사주") return "/saju/basic";
  if (categoryLabel === "자미두수") return "/ziwei";
  if (categoryLabel === "숙요점") return "/compatibility";
  if (categoryLabel === "타로") return "/tarot";
  if (categoryLabel === "점성술") return "/astrology";
  if (categoryLabel === "베다점") return "/vedic";
  if (categoryLabel === "오늘의 운세") return "/today";
  if (categoryLabel === "궁합") return "/compatibility";
  return "/insights";
}

function resolveCtaLabel(categoryLabel) {
  if (categoryLabel === "사주") return "내 사주의 중심 기운 살펴보기";
  if (categoryLabel === "자미두수") return "내 명반의 중심 궁 살펴보기";
  if (categoryLabel === "숙요점") return "두 사람의 숙요 인연을 깊게 보기";
  if (categoryLabel === "타로") return "지금 질문으로 타로 리딩 시작하기";
  if (categoryLabel === "점성술") return "내 차트가 말하는 사랑과 일을 살펴보기";
  if (categoryLabel === "베다점") return "반복되는 주기를 베다 차트로 살펴보기";
  if (categoryLabel === "오늘의 운세") return "오늘의 선택 흐름 살펴보기";
  if (categoryLabel === "궁합") return "우리 관계의 리듬을 궁합으로 읽어보기";
  return "내 질문에 맞춰 더 깊게 보기";
}

function stableHash(input) {
  const text = String(input || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickVariant(list, seed, offset = 0) {
  if (!Array.isArray(list) || list.length === 0) return "";
  const idx = (stableHash(seed) + offset) % list.length;
  return String(list[idx] || "");
}

function hasFinalConsonant(value) {
  const text = String(value || "").trim();
  const last = text.charCodeAt(text.length - 1);
  const code = last - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function objectParticle(value) {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

function subjectParticle(value) {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function topicParticle(value) {
  return `${value}${hasFinalConsonant(value) ? "은" : "는"}`;
}

function quoteTopicParticle(value) {
  return `"${value}"${hasFinalConsonant(value) ? "이라는" : "라는"}`;
}

function pairWithAnd(first, second) {
  return `${first}${hasFinalConsonant(first) ? "과" : "와"} ${second}`;
}

function axisFlowText(...items) {
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join("·")
    .replace(/흐름·/g, "흐름·")
    .replace(/ 흐름 흐름/g, " 흐름")
    .replace(/의 흐름의 흐름/g, "의 흐름")
    .replace(/흐름의 흐름/g, "흐름");
}

function axisFlowObject(...items) {
  return objectParticle(axisFlowText(...items));
}

function actionFlowText(value) {
  const text = String(value || "").trim();
  return /방식$|순서$|루틴$|선택표$|조정법$/.test(text) ? `${objectParticle(text)} 따라` : `${text}의 흐름을 따라`;
}

function keywordContext(value) {
  const text = String(value || "").trim();
  if (/란$/.test(text)) return `${objectParticle(text)} 읽을 때`;
  return `${text}에서`;
}

function normalizeExcerptLength(text, focus = "", seed = "") {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "상담에서 자주 마주하는 운의 결을 현실 언어로 풀어, 지금 필요한 선택의 기준을 조용히 짚어드립니다.";
  if (raw.length >= 80 && raw.length <= 160) return raw;
  if (raw.length > 160) return raw.slice(0, 157).trimEnd() + "...";
  const focusText = String(focus || "").replace(/\s+/g, " ").trim();
  const focusLabel = focusText.length > 34 ? `${focusText.slice(0, 31).trimEnd()}...` : focusText;
  const focusPrefix = focusLabel ? `${quoteTopicParticle(focusLabel)} ` : "";
  const suffix = pickVariant([
    ` ${focusPrefix}상담식 질문 순서까지 함께 짚어드립니다.`,
    ` ${focusPrefix}현실 판단에 필요한 관찰 순서를 함께 정리했습니다.`,
    ` ${focusPrefix}지금 살필 신호와 다음 선택 기준을 차분히 묶었습니다.`,
  ], `${seed}:excerpt-suffix`);
  const combined = `${raw}${suffix}`;
  if (combined.length <= 160) return combined;
  return combined.slice(0, 157).trimEnd() + "...";
}

function normalizeSeoDescription(text, seed = "", focus = "") {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "상담식 해석 순서로 관계·돈·직업·마음의 결을 읽고, 지금 필요한 선택 기준을 차분히 정리한 인사이트 글입니다.";
  if (raw.length >= 120 && raw.length <= 160) return raw;
  if (raw.length > 160) return raw.slice(0, 157).trimEnd() + "...";
  const focusText = String(focus || "").replace(/\s+/g, " ").trim();
  const focusLabel = focusText.length > 38 ? `${focusText.slice(0, 35).trimEnd()}...` : focusText;
  const focusPrefix = focusLabel ? `${quoteTopicParticle(focusLabel)} 질문에서 ` : "";
  const pad = pickVariant([
    ` ${focusPrefix}핵심 관점과 질문 순서, 다음에 살필 지점을 한 흐름으로 정리했습니다.`,
    ` ${focusPrefix}지금의 흔들림을 읽는 기준과 바로 적용할 관찰 포인트를 함께 담았습니다.`,
    ` ${focusPrefix}오늘의 선택에 대입할 수 있도록 징조, 리듬, 실천 기준을 차분히 묶었습니다.`,
    ` ${focusPrefix}막연한 예감이 생활 속 판단으로 내려오도록 필요한 단서를 골라 정리했습니다.`,
  ], `${seed}:seo-pad`);
  const combined = `${raw}${pad}`;
  if (combined.length <= 160) return combined;
  return combined.slice(0, 157).trimEnd() + "...";
}

function getCategoryLexicon(categoryLabel) {
  if (categoryLabel === "사주") {
    return {
      keyA: "일간",
      keyB: "월지",
      keyC: "십성",
      keyD: "용신",
      keyE: "대운",
      keyF: "오행",
      sceneA: "연애에서 같은 갈등이 반복되는 장면",
      sceneB: "돈이 들어와도 손에 남지 않는 패턴",
      sceneC: "직업은 맞는데 마음이 쉽게 닳는 국면",
      action: "일간 중심으로 이번 달 행동 우선순위 3개를 정하는 방식",
    };
  }

  if (categoryLabel === "자미두수") {
    return {
      keyA: "명궁",
      keyB: "신궁",
      keyC: "관록궁",
      keyD: "재백궁",
      keyE: "부부궁",
      keyF: "사화",
      sceneA: "관계에서 같은 오해가 재연되는 순간",
      sceneB: "성과는 있는데 만족이 비어 있는 시기",
      sceneC: "돈의 흐름은 빠른데 지키는 힘이 약한 국면",
      action: "명궁에서 시작해 관계·직업·재물 축을 한 줄로 잇는 판독 순서",
    };
  }

  if (categoryLabel === "숙요점") {
    return {
      keyA: "27숙",
      keyB: "영친",
      keyC: "업태",
      keyD: "안괴",
      keyE: "성위",
      keyF: "거리감",
      sceneA: "좋아하는데 자꾸 타이밍이 어긋나는 관계",
      sceneB: "말 한마디가 깊은 상처로 남는 순간",
      sceneC: "끌림은 강한데 함께 있으면 소진되는 국면",
      action: "숙성 간 거리 리듬에 맞춰 대화 빈도와 강도를 조절하는 방식",
    };
  }

  if (categoryLabel === "타로") {
    return {
      keyA: "질문 설계",
      keyB: "배열",
      keyC: "감정 흐름",
      keyD: "선택의 그림자",
      keyE: "역방향",
      keyF: "리딩 문장",
      sceneA: "계속 카드만 뽑고 답은 더 흐려지는 상황",
      sceneB: "연애에서 상대 마음을 맞히려다 자신을 놓치는 순간",
      sceneC: "커리어 선택 앞에서 결정을 미루는 국면",
      action: "질문을 좁히고 배열의 축을 고정해 행동 문장으로 번역하는 루틴",
    };
  }

  if (categoryLabel === "점성술") {
    return {
      keyA: "태양",
      keyB: "달",
      keyC: "상승궁",
      keyD: "금성·화성",
      keyE: "토성",
      keyF: "하우스",
      sceneA: "겉으로는 버티는데 밤마다 감정이 무너지는 시기",
      sceneB: "관계 욕구와 독립 욕구가 충돌하는 순간",
      sceneC: "능력은 충분한데 타이밍이 엇나가는 국면",
      action: "차트의 흐름을 성격표가 아니라 삶의 리듬 지도로 읽는 관측 순서",
    };
  }

  if (categoryLabel === "베다점") {
    return {
      keyA: "라그나",
      keyB: "달 별자리",
      keyC: "나크샤트라",
      keyD: "다샤",
      keyE: "라후·케투",
      keyF: "카르마 흐름",
      sceneA: "비슷한 사건이 주기적으로 돌아오는 체감",
      sceneB: "관계의 시작과 종료가 반복되는 국면",
      sceneC: "직업 방향을 바꾸고 싶지만 이유를 모르는 시기",
      action: "주기 단위로 해야 할 일과 멈춰야 할 일을 분리하는 선택표",
    };
  }

  return {
    keyA: "먼저 흔들리는 기운",
    keyB: "반복 패턴",
    keyC: "관계 축",
    keyD: "돈의 흐름",
    keyE: "직업 리듬",
    keyF: "마음 회복력",
    sceneA: "같은 고민이 되풀이되는 장면",
    sceneB: "선택이 늦어져 기회를 놓치는 순간",
    sceneC: "좋은 결과 뒤에 공허함이 남는 국면",
    action: "오늘의 질문에 맞춘 우선순위 조정법",
  };
}

function getCategoryVoicePack(categoryLabel) {
  if (categoryLabel === "사주") {
    return {
      toneTag: "명식 해석",
      intro: "사주는 복잡한 공식보다 생활 리듬으로 읽을 때 훨씬 쉽습니다.",
      hook: "일간과 월령의 언어를 줄이고, 월간 루틴으로 옮길 수 있게 정리합니다.",
      tip: "하루 루틴 한 가지를 먼저 고정하면 사주 해석 체감이 빨라집니다.",
      close: "내 명식을 생활의 리듬으로 번역하는 감각을 차분히 확인해 보세요.",
    };
  }

  if (categoryLabel === "자미두수") {
    return {
      toneTag: "명반 리딩",
      intro: "자미두수는 별 이름 암기보다 궁의 흐름을 스토리로 읽는 게 핵심입니다.",
      hook: "명궁에서 시작해 관계·일·돈으로 이어지는 궁의 흐름을 한 번에 잡아드립니다.",
      tip: "명궁-관록궁-재백궁 순서로 읽으면 해석이 훨씬 덜 헷갈립니다.",
      close: "내 명반에서 지금 강하게 움직이는 궁을 바로 확인해 보세요.",
    };
  }

  if (categoryLabel === "숙요점") {
    return {
      toneTag: "관계 리듬",
      intro: "숙요점은 궁합 점수보다 두 사람의 리듬 차이를 읽는 도구에 가깝습니다.",
      hook: "영친·업태·안괴를 관계 운영 언어로 쉽게 풀어드립니다.",
      tip: "속도와 거리만 조절해도 관계 피로가 눈에 띄게 줄어듭니다.",
      close: "우리 관계의 리듬이 어디서 어긋나는지 가볍게 점검해 보세요.",
    };
  }

  if (categoryLabel === "타로") {
    return {
      toneTag: "타로 리딩",
      intro: "타로는 카드를 많이 뽑는 것보다 질문을 잘 만드는 게 반입니다.",
      hook: "카드 의미를 길게 외우기보다 질문-해석-행동 순서로 정리합니다.",
      tip: "질문을 한 문장으로 좁히면 리딩 정확도가 크게 올라갑니다.",
      close: "지금 질문에 맞는 리딩 문장을 차분히 확인해 보세요.",
    };
  }

  if (categoryLabel === "점성술") {
    return {
      toneTag: "차트 해석",
      intro: "점성술은 성격 맞히기보다 관계와 일의 타이밍을 잡는 데 유용합니다.",
      hook: "태양·달·상승궁을 생활 장면으로 번역해 쉽게 읽습니다.",
      tip: "태양은 목표, 달은 감정, 상승궁은 행동 방식으로 먼저 나눠 보세요.",
      close: "내 차트에서 지금 중요한 축이 무엇인지 직접 확인해 보세요.",
    };
  }

  if (categoryLabel === "베다점") {
    return {
      toneTag: "주기 판독",
      intro: "베다점성술은 반복되는 주기를 읽어 선택 타이밍을 잡는 데 강합니다.",
      hook: "라그나·나크샤트라·다샤의 흐름을 일상 기준으로 가볍게 풀어드립니다.",
      tip: "주기 메모를 3개월만 해도 해석 체감이 훨씬 선명해집니다.",
      close: "내 주기에서 지금 열리는 구간과 쉬어갈 구간을 확인해 보세요.",
    };
  }

  return {
    toneTag: "운세 가이드",
    intro: "운세는 어렵게 볼수록 멀어지고, 생활 언어로 읽을수록 가까워집니다.",
    hook: "복잡한 설명보다 오늘의 질문에 비춰볼 기준부터 보여드립니다.",
    tip: "작은 루틴 하나를 먼저 고정하면 변화가 빠르게 체감됩니다.",
    close: "내 상황에 맞는 다음 한 걸음을 가볍게 확인해 보세요.",
  };
}

function getCategoryExpertFrame(categoryLabel, lex) {
  if (categoryLabel === "사주") {
    return {
      sequence: `전문가식으로는 먼저 일간의 체질을 보고, 월령에서 계절의 힘을 확인한 뒤, 십성과 대운을 겹쳐 읽습니다. ${lex.keyD}은 단독 정답이 아니라 월지의 세력, 오행의 과부족, 현재 질문이 놓인 영역을 함께 본 뒤 조심스럽게 잡아야 합니다.`,
      caution: `사주에서 가장 위험한 오해는 한 글자만 보고 성격이나 운을 단정하는 일입니다. 같은 일간이라도 월령이 다르면 기운의 온도와 쓰임이 달라지고, 같은 십성이라도 대운이 받쳐 주는지에 따라 결과가 전혀 다르게 나타납니다.`,
    };
  }

  if (categoryLabel === "자미두수") {
    return {
      sequence: `자미두수는 명궁 하나로 끝내지 않고, 삼방사정으로 삶의 무대를 넓힌 뒤 관록궁·재백궁·부부궁을 함께 봅니다. 여기에 사화가 어디를 밝히고 어디를 압박하는지 더하면 사건의 방향이 훨씬 선명해집니다.`,
      caution: `자미두수에서 별의 이름만 외우면 해석이 얕아집니다. 같은 주성이라도 어느 궁에 앉았는지, 삼방에서 어떤 별이 받쳐 주는지, 화록·화권·화과·화기가 어느 영역을 건드리는지에 따라 완전히 다른 결로 읽힙니다.`,
    };
  }

  if (categoryLabel === "숙요점") {
    return {
      sequence: `숙요점은 본명숙으로 관계의 기본 리듬을 잡고, 영친·업태·안괴처럼 두 사람 사이의 거리와 압력을 함께 읽습니다. 점수보다 중요한 것은 가까워지는 속도, 상처가 남는 지점, 회복 가능한 대화 간격입니다.`,
      caution: `숙요 궁합을 좋고 나쁨으로만 나누면 실제 관계를 놓치기 쉽습니다. 강하게 끌리는 조합일수록 피로도 함께 커질 수 있고, 편안한 조합일수록 성장 자극이 약해질 수 있으므로 운영 방식까지 같이 보아야 합니다.`,
    };
  }

  if (categoryLabel === "궁합") {
    return {
      sequence: `궁합은 점수보다 두 사람의 일간, 오행 균형, 반복되는 갈등 장면을 함께 읽어야 정확합니다. 강하게 끌리는 이유와 오래 지치게 하는 이유를 분리하고, 대화 속도와 약속의 경계를 현실 기준으로 내려야 관계 해석이 살아납니다.`,
      caution: `궁합에서 가장 큰 오해는 맞는 사람과 안 맞는 사람을 한 번에 가르는 일입니다. 좋은 궁합도 운영을 놓치면 소모되고, 까다로운 궁합도 거리와 역할을 조절하면 오래 갈 수 있습니다.`,
    };
  }

  if (categoryLabel === "신년운세") {
    return {
      sequence: `신년운세는 한 해 전체를 좋다 나쁘다로 자르지 않고, 연간 기조와 분기별 실행 리듬을 나누어 읽습니다. 큰 방향은 대운·연운의 배경에서 잡고, 실제 변화는 월별 반복 신호와 생활 루틴에서 확인해야 합니다.`,
      caution: `신년운세를 무서운 예언처럼 읽으면 시작 전부터 선택이 굳어집니다. 해석의 핵심은 위험을 키우는 말이 아니라, 확장할 달과 정비할 달을 구분해 한 해의 힘을 덜 새게 만드는 데 있습니다.`,
    };
  }

  if (categoryLabel === "오늘의 운세") {
    return {
      sequence: `오늘의 운세는 거대한 운명보다 하루 안에서 움직이는 기분, 약속, 돈, 몸의 리듬을 읽는 데 알맞습니다. 아침에는 기준을 세우고, 낮에는 선택의 속도를 조절하며, 밤에는 오늘 반복된 신호를 짧게 정리하는 방식이 좋습니다.`,
      caution: `오늘의 운세를 하루의 합격·불합격처럼 읽으면 오히려 판단이 좁아집니다. 중요한 것은 오늘 피해야 할 과잉과 살려야 할 작은 기회를 구분해 다음 행동을 가볍게 만드는 것입니다.`,
    };
  }

  if (categoryLabel === "타로") {
    return {
      sequence: `타로는 카드 이름보다 질문의 초점, 배열 위치, 카드 사이의 시선 흐름을 먼저 봅니다. 한 장의 의미를 외우는 것보다 현재 질문에서 무엇이 원인이고 무엇이 조언인지 구분해야 리딩이 실제 선택으로 내려옵니다.`,
      caution: `타로에서 같은 카드를 반복해서 뽑는다고 답이 더 정확해지지는 않습니다. 질문이 흐리면 카드도 흐리게 말하고, 질문이 좁아지면 같은 카드도 관계·일·마음에서 전혀 다른 조언으로 살아납니다.`,
    };
  }

  if (categoryLabel === "점성술") {
    return {
      sequence: `점성술은 태양만 보지 않고 상승궁, 달, 하우스, 행성 간 각도를 함께 읽습니다. 성격표처럼 단정하기보다 어느 삶의 영역에서 사건이 열리는지, 어떤 타이밍에 압력과 기회가 겹치는지를 보는 방식입니다.`,
      caution: `점성술에서 별자리 하나만으로 사람을 판단하면 전문성이 떨어집니다. 같은 태양 별자리라도 상승궁과 달, 금성·화성, 토성의 위치가 다르면 관계 방식과 일의 리듬이 크게 달라집니다.`,
    };
  }

  if (categoryLabel === "베다점") {
    return {
      sequence: `베다점은 라그나로 삶의 출발점을 잡고, 달 별자리와 나크샤트라로 마음의 습관을 본 뒤, 다샤와 고차라로 시기의 문을 읽습니다. 현재 운은 성향보다 주기와 사건의 순서를 함께 볼 때 더 정확해집니다.`,
      caution: `베다점에서 서양식 별자리 감각만 가져오면 해석이 흐려집니다. 라그나, 문라시, 나크샤트라, 다샤의 층위가 서로 다르기 때문에 먼저 어느 층을 읽는지 분명히 해야 합니다.`,
    };
  }

  return {
    sequence: `이 주제는 먼저 반복되는 장면을 잡고, 그 장면이 관계·돈·일·마음 중 어디에서 강하게 나타나는지 나누어 읽습니다. 그런 다음 오늘 바로 바꿀 수 있는 작은 행동 기준으로 내려야 운세가 생활 속에서 힘을 얻습니다.`,
    caution: `운세를 불안하게 소비하면 같은 질문을 반복하게 됩니다. 중요한 것은 맞히는 말보다 지금의 선택을 덜 흔들리게 만드는 기준이며, 그 기준은 장면과 감정과 행동을 함께 볼 때 가장 선명해집니다.`,
  };
}

function sanitizeInsightFocus(value) {
  return String(value || "")
    .replace(/바로\s*써먹기/g, "바로 활용하기")
    .replace(/써먹기/g, "활용하기")
    .replace(/써먹는/g, "활용하는")
    .replace(/타로를/g, "타로 리딩을")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMysticExcerpt(article, categoryLabel, tags) {
  const lex = getCategoryLexicon(categoryLabel);
  const voice = getCategoryVoicePack(categoryLabel);
  const title = sanitizeInsightFocus(article?.title || categoryLabel || "운세 인사이트");
  const focus = title.length > 46 ? `${title.slice(0, 43).trimEnd()}...` : title;
  const keyword = String(article?.mainKeyword || tags[0] || article?.title || categoryLabel || "운세").trim();
  const options = [
    `${voice.toneTag} 관점에서 ${keyword}의 흐름을 풀이했습니다. ${quoteTopicParticle(focus)} 질문을 ${axisFlowText(lex.keyA, lex.keyB)} 두 축으로 나누어 읽으면 선택의 방향이 선명해집니다.`,
    `${lex.sceneA}처럼 비슷한 장면이 반복될 때, 이 주제는 마음이 먼저 흔들리는 자리를 보여 줍니다. ${actionFlowText(lex.action)} 오늘의 질문을 차분히 좁혀 보세요.`,
    `${categoryLabel} 관점에서 이 글은 단순한 예측보다 기운의 결을 읽는 데 가깝습니다. ${axisFlowObject(lex.keyC, lex.keyD, lex.keyE)} 함께 보며 나아갈 때와 정비할 때를 나눕니다.`,
  ];

  const uniqueOptions = options.map((option) => String(option || "").replace(/\s+/g, " ").trim());
  return normalizeExcerptLength(pickVariant(uniqueOptions, `${article?.slug || ""}:excerpt`), focus, article?.slug || keyword);
}

function buildMysticSeoDescription(article, categoryLabel, tags) {
  const lex = getCategoryLexicon(categoryLabel);
  const title = sanitizeInsightFocus(article?.title || categoryLabel || "운세 인사이트");
  const focus = title.length > 52 ? `${title.slice(0, 49).trimEnd()}...` : title;
  const keyword = String(article?.mainKeyword || tags[0] || article?.title || categoryLabel || "운세").trim();
  const options = [
    `${focus}의 핵심 흐름을 ${categoryLabel} 관점으로 정리하고, ${axisFlowText(lex.keyA, lex.keyB, lex.keyE)} 순서로 지금 필요한 선택 기준을 차분히 살핍니다.`,
    `${focus}에서 반복되는 장면을 ${axisFlowText(lex.keyC, lex.keyD, lex.keyF)} 세 단서로 풀어, 삶의 균형과 다음 선택의 방향을 읽는 인사이트 글입니다.`,
    `${categoryLabel} 초보자도 따라올 수 있도록 ${keyword}의 기본 개념, 흔한 오해, ${focus}에 비춰볼 지점을 한 흐름으로 정리했습니다.`,
  ];

  return pickVariant(options, `${article?.slug || ""}:seo`);
}

function getCategoryPracticeFrame(categoryLabel, lex, voice) {
  if (categoryLabel === "사주") {
    return [
      `오늘은 일간의 체질, 월령의 온도, 현재 고민이 놓인 십성 하나만 나누어 적어보세요. 관계는 관성·비겁의 균형을, 돈은 재성의 과욕과 관리력을, 일은 식상과 관성의 순서를 먼저 봅니다. 작은 행동은 대운보다 약해 보여도, 반복되면 운을 쓰는 그릇이 됩니다. ${voice.tip}`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}를 한꺼번에 고치려 하지 마세요. 사주식 실천은 먼저 과한 오행을 덜고, 부족한 오행을 생활 습관으로 보충하는 데서 시작됩니다. 오늘 할 일은 말 한마디 줄이기, 지출 한 번 늦추기, 회복 루틴 하나 지키기처럼 작을수록 정확합니다.`,
      `실천 기준은 "내 일간이 편안해지는가"입니다. 감정이 앞서면 월령의 온도를 보고, 선택이 흔들리면 재성·관성·식상의 순서를 나누어 보세요. 운은 큰 결심보다 매일 같은 시간에 반복되는 작은 균형에서 먼저 움직입니다.`,
    ];
  }

  if (categoryLabel === "자미두수") {
    return [
      `자미두수는 명궁 하나로 끝내지 말고 관록궁, 재백궁, 부처궁을 함께 봐야 실천이 선명해집니다. 오늘은 일의 궁에서 해야 할 일 하나, 돈의 궁에서 줄일 지출 하나, 관계의 궁에서 확인할 말 한 줄만 남기세요. 별의 뜻은 생활의 칸에 내려올 때 힘을 얻습니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 엇갈릴 때는 삼방사정처럼 주변 궁을 함께 살피는 태도가 필요합니다. 한 궁이 흔들린다고 모든 운이 무너지는 것은 아닙니다. 지금은 장면을 키우기보다 어느 궁에서 신호가 먼저 켜졌는지 조용히 분리하세요.`,
      `오늘의 실천은 명궁의 마음, 관록궁의 책임, 재백궁의 관리 순서로 잡으면 좋습니다. 관계는 말의 길이를 줄이고, 돈은 숫자를 확인하며, 일은 가장 무거운 한 가지부터 끝내세요. 운의 별은 흐름을 알려줄 뿐, 방향을 현실로 옮기는 손은 작은 반복입니다.`,
    ];
  }

  if (categoryLabel === "숙요점") {
    return [
      `숙요점의 실천은 상대를 판단하는 말보다 거리와 박자를 조절하는 데 있습니다. 오늘은 내가 먼저 다가가야 하는지, 기다려야 하는지, 혹은 말을 줄여야 하는지만 정하세요. 영친·안괴·성위의 결은 관계의 좋고 나쁨보다 만나는 속도를 알려줍니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 함께 흔들릴 때는 감정의 크기보다 반복되는 반응을 보세요. 같은 말에 같은 상처가 생긴다면 궁합보다 경계선이 먼저입니다. 연락 간격, 부탁의 범위, 기대의 크기 중 하나만 조정해도 관계 흐름은 훨씬 부드러워집니다.`,
      `오늘의 질문은 "이 관계에서 내가 급해지는 순간은 어디인가"입니다. 숙요의 별은 인연의 성질을 말하지만, 실제 균형은 말의 타이밍과 거리감에서 정해집니다. 가까워질수록 약속의 크기보다 지킬 수 있는 리듬을 먼저 보세요.`,
    ];
  }

  if (categoryLabel === "궁합") {
    return [
      `궁합은 점수보다 두 사람이 충돌을 회복하는 방식에서 정확해집니다. 오늘은 상대의 말투를 고치려 하기보다, 내가 반복해서 기대하는 한 가지와 상대가 부담스러워하는 한 가지를 나누어 적어보세요. 관계운은 맞고 틀림보다 조율 가능한 지점을 찾을 때 열립니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}를 함께 보되 결론을 서두르지 마세요. 좋은 궁합도 약속의 범위가 흐려지면 지치고, 어려운 궁합도 거리와 역할이 분명하면 오래 갑니다. 오늘은 확인 질문 하나와 미루던 사과 하나만으로도 흐름을 바꿀 수 있습니다.`,
      `실천은 세 단계면 충분합니다. 먼저 내 감정의 속도를 낮추고, 다음으로 상대가 이해할 수 있는 말로 바꾸고, 마지막으로 오늘 지킬 약속 하나만 남기세요. 궁합의 전문성은 큰 결론보다 반복되는 갈등의 원인을 정확히 분리하는 데 있습니다.`,
    ];
  }

  if (categoryLabel === "신년운세") {
    return [
      `신년운세는 한 해를 한 문장으로 단정하지 않고 분기별 기운을 나누어 쓸 때 정확합니다. 오늘은 올해의 목표를 일·돈·관계·몸 네 칸으로 나누고, 먼저 무리한 칸 하나를 줄이세요. 세운은 큰 방향이고, 실제 변화는 월운의 반복에서 모습을 드러냅니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 한꺼번에 움직이는 해에는 확장보다 순서가 중요합니다. 좋은 운도 준비 없이 쓰면 흩어지고, 조심할 운도 정리와 회복을 먼저 세우면 약해집니다. 이번 달에는 늘릴 것 하나보다 줄일 것 하나를 먼저 정하세요.`,
      `올해의 실천 기준은 "크게 벌리기 전에 담을 그릇을 만들었는가"입니다. 관계는 약속을 줄이고, 돈은 고정 지출을 점검하며, 일은 장기 목표를 월간 루틴으로 낮추세요. 운의 문은 준비된 생활에 더 조용하고 분명하게 열립니다.`,
    ];
  }

  if (categoryLabel === "오늘의 운세") {
    return [
      `오늘의 운세는 오전, 오후, 저녁의 리듬을 나누어 보면 훨씬 정확합니다. 오전에는 급한 연락을 정리하고, 오후에는 돈과 일정의 빈틈을 확인하며, 저녁에는 감정을 회복하는 쪽으로 운을 닫으세요. 하루 운은 큰 예언보다 작은 순서에서 빛납니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 흔들리는 날에는 결정을 미루는 것도 좋은 선택입니다. 오늘은 말의 톤을 낮추고, 지출은 한 번 더 확인하고, 중요한 답장은 감정이 내려간 뒤 보내세요. 작은 지연이 큰 실수를 막는 날이 있습니다.`,
      `오늘 필요한 질문은 "지금 바로 해야 할 일인가, 하루를 두고 봐도 되는 일인가"입니다. 관계는 반응보다 확인을, 돈은 충동보다 점검을, 일은 속도보다 마감을 먼저 보세요. 오늘의 운은 무리하지 않을 때 더 선명하게 살아납니다.`,
    ];
  }

  if (categoryLabel === "타로") {
    return [
      `타로 실천은 카드 이름을 외우는 것보다 질문을 정확히 세우는 데서 시작됩니다. 오늘은 "상대의 마음"보다 "내가 확인해야 할 행동"으로 질문을 바꾸고, 카드 한 장의 키워드를 실제 선택 하나로 내려보세요. 좋은 리딩은 불안을 키우지 않고 행동의 방향을 좁혀줍니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 뒤섞일 때는 배열의 위치를 먼저 보세요. 과거 카드는 원인, 현재 카드는 감정의 압력, 조언 카드는 지금 가능한 선택을 말합니다. 한 장의 카드로 결론을 내리기보다 카드 사이의 시선을 따라가야 정확합니다.`,
      `오늘의 타로 실천은 질문, 카드, 행동을 한 줄씩 남기는 것입니다. "무엇이 두려운가", "카드는 어떤 장면을 보여주는가", "그래서 오늘 무엇을 줄일 것인가"를 적어보세요. 타로의 신비는 막연한 예언보다 선명한 질문에서 더 깊게 열립니다.`,
    ];
  }

  if (categoryLabel === "점성술") {
    return [
      `점성술 실천은 태양별자리 하나보다 상승궁, 달, 하우스의 위치를 함께 보는 데서 정확해집니다. 오늘은 내가 보이는 방식, 실제 감정, 사건이 일어나는 생활 영역을 따로 적어보세요. 별의 언어는 성격표가 아니라 지금 어느 무대가 켜졌는지 알려주는 지도입니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 함께 움직일 때는 행성보다 하우스를 먼저 보세요. 관계 문제인지, 돈의 문제인지, 일의 압력인지 영역을 나누면 같은 별자리도 전혀 다르게 읽힙니다. 오늘은 감정의 원인보다 사건이 놓인 방을 먼저 확인하세요.`,
      `오늘의 실천은 달의 감정, 상승궁의 반응, 태양의 방향을 분리하는 것입니다. 마음이 흔들리면 달을 돌보고, 바깥 반응이 거칠면 상승궁의 방어를 낮추고, 결정은 태양의 장기 방향에 맞추세요. 별은 멀리 있지만 적용은 오늘의 태도에서 시작됩니다.`,
    ];
  }

  if (categoryLabel === "베다점") {
    return [
      `베다점 실천은 라그나의 몸, 달의 마음, 다샤의 시기를 함께 읽을 때 깊어집니다. 오늘은 지금의 고민이 성격 문제인지, 감정의 주기인지, 시기의 압력인지 먼저 나누어 보세요. 카르마의 언어는 운명을 묶는 말이 아니라 반복 패턴을 알아차리는 도구입니다.`,
      `${lex.keyC}·${lex.keyD}·${lex.keyE}가 흔들릴 때는 나크샤트라의 반복성과 다샤의 흐름을 함께 보세요. 같은 선택도 시기가 맞으면 열리고, 시기가 무거우면 준비의 시간이 됩니다. 오늘은 밀어붙일 일 하나와 기다릴 일 하나를 분명히 나누세요.`,
      `오늘의 기준은 "지금 열리는 문인가, 준비해야 할 문인가"입니다. 관계는 반응의 업을 보고, 돈은 유지 가능한 순환을 보며, 일은 다샤의 속도에 맞춰 무리하지 않는 편이 좋습니다. 베다의 지혜는 큰 숙명보다 매일의 반복을 맑게 다듬는 데 있습니다.`,
    ];
  }

  return [
    `낯선 점술 전통을 읽을 때는 먼저 상징의 배경, 질문의 맥락, 실제 행동을 나누어 보세요. ${lex.keyC}가 마음을 흔들고 ${lex.keyD}가 선택을 재촉할수록, 결론보다 관찰 순서가 중요합니다. 오늘은 반복된 징조 하나와 내가 취할 작은 행동 하나만 남기면 충분합니다.`,
    `${topicParticle(axisFlowText(lex.keyC, lex.keyD, lex.keyE))} 문화마다 다른 이름으로 나타나지만, 결국 삶의 균형을 묻는 신호입니다. 전통 점술을 실천으로 옮길 때는 맞고 틀림보다 무엇을 줄이고 무엇을 지킬지부터 정하세요. 상징은 커도 행동은 작을수록 오래 갑니다.`,
    `오늘의 기준은 "이 상징이 내 생활에서 어디에 반복되는가"입니다. 관계에서는 같은 반응을, 돈에서는 같은 지출 습관을, 일에서는 같은 미루는 패턴을 보세요. 오래된 점술의 힘은 미래를 꾸미는 데보다 현재의 반복을 정확히 비추는 데 있습니다. ${voice.tip}`,
  ];
}

function buildMysticSections(article, categoryLabel, tags) {
  const title = String(article?.title || "운세 인사이트").trim();
  const key = String(article?.mainKeyword || tags[0] || categoryLabel || "운세").trim();
  const lex = getCategoryLexicon(categoryLabel);
  const voice = getCategoryVoicePack(categoryLabel);
  const expert = getCategoryExpertFrame(categoryLabel, lex);
  const seed = `${article?.slug || title}:${categoryLabel}`;

  const introLead = pickVariant([
    voice.intro,
    `${topicParticle(key)} 많이 읽는 것보다 내 상황에 맞는 한 줄로 정리하는 일이 더 중요합니다.`,
    `지금 막막하다면 ${key}의 사건보다 패턴부터 읽어보세요. 생각보다 답이 빨리 보입니다.`,
  ], seed, 1);

  const section1 = pickVariant([
    `${introLead} ${voice.hook} 이 주제를 찾는 마음도 그 흐름과 닿아 있습니다. ${lex.sceneA}, ${lex.sceneB} 같은 장면은 우연처럼 보이지만, 실제로는 ${axisFlowText(lex.keyA, lex.keyB)} 두 축이 반복해서 말을 걸어오는 순간일 수 있습니다. ${key}의 핵심은 미래를 확정하는 문장이 아니라, 지금 내 선택이 어디에서 흔들리는지 비춰주는 거울입니다.`,
    `${introLead} ${voice.hook} ${objectParticle(key)} 살필 때는 먼저 사건보다 마음의 방향을 보는 편이 좋습니다. ${subjectParticle(pairWithAnd(lex.sceneA, lex.sceneB))} 겹쳐 보인다면, 겉으로는 작은 고민이어도 안쪽에서는 ${lex.keyA}·${lex.keyB}의 균형이 이미 신호를 보내고 있을 수 있습니다. 이 글은 단정 대신 ${key}의 신호를 생활의 언어로 풀어봅니다.`,
    `${introLead} ${voice.hook} 지금 필요한 것은 거창한 결론보다 ${keywordContext(key)} 반복되는 장면을 알아차리는 눈입니다. ${lex.sceneA}, ${lex.sceneB} 사이에서 마음이 자주 멈춘다면 ${pairWithAnd(lex.keyA, lex.keyB)}의 흐름을 나누어 볼 때입니다. ${topicParticle(key)} 운을 맞히는 말보다 선택의 축을 다시 세우는 거울에 가깝습니다.`,
  ], seed, 7);

  const section2 = expert.sequence;

  const section3 = expert.caution;

  const section4 = pickVariant([
    `${lex.keyA}의 기운이 강해지면 비슷한 장면이 반복됩니다. 첫째, ${lex.sceneA}에서 말하지 않은 기대가 커집니다. 둘째, ${lex.sceneB}처럼 판단 속도가 감정 속도를 못 따라갑니다. 셋째, ${lex.sceneC}에서 성과와 만족의 간격이 벌어집니다. ${keywordContext(key)} 큰 결론보다 짧은 관찰이 좋습니다. 이때 기록 기준은 "언제, 어떤 상황에서, 얼마나 자주"입니다. 균형이 무너진 지점이 훨씬 빠르게 보입니다.`,
    `${lex.keyA}가 과해질 때는 마음이 먼저 알고 몸이 나중에 따라옵니다. ${lex.sceneA}에서는 기대가 커지고, ${lex.sceneB}에서는 말의 속도가 빨라지며, ${lex.sceneC}에서는 결과를 얻고도 허전함이 남기 쉽습니다. 이런 때에는 ${objectParticle(key)} 크게 해석하기보다 하루 안에서 반복되는 신호를 작게 적어두는 편이 정확합니다.`,
    `반복되는 징조는 대개 조용히 옵니다. ${subjectParticle(lex.sceneA)} 잦아지고 ${lex.sceneB}에서 같은 감정이 올라오며 ${lex.sceneC}에서 만족보다 피로가 먼저 느껴진다면, ${pairWithAnd(lex.keyA, lex.keyC)}의 균형을 다시 봐야 합니다. ${key}의 기록은 복잡할 필요가 없습니다. ${keywordContext(key)} 장면, 감정, 다음 행동만 남겨도 흐름이 보입니다.`,
  ], seed, 8);

  const section5 = pickVariant([
    ...getCategoryPracticeFrame(categoryLabel, lex, voice),
  ], seed, 5);

  const section6 = pickVariant([
    `이제 ${key}의 질문을 한 줄로 정리해 보세요. "${keywordContext(key)} 나는 어디에 힘을 쓰고, 어디에서 힘을 잃는가?" 이 답이 보이면 다음 선택이 훨씬 가벼워집니다. 이어지는 ${categoryLabel} 리딩에서는 ${lex.keyA}부터 ${lex.keyE}까지 내 상황에 맞춰 더 깊게 살펴볼 수 있습니다. 글에서 읽은 결을 ${key}의 질문에 대입하는 순간, 운세는 막연한 예언이 아니라 스스로를 돌보는 언어가 됩니다. ${voice.close}`,
    `마지막에는 ${key}의 질문을 좁히는 것이 좋습니다. "내가 지금 지켜야 할 기준은 무엇인가?" 이 한 문장이 서면 ${lex.keyA}, ${lex.keyC}, ${lex.keyE}의 흐름도 덜 흩어집니다. 이어지는 ${categoryLabel} 리딩에서는 지금의 고민을 더 구체적인 장면으로 내려 살필 수 있습니다. ${categoryLabel} 운세는 멀리 있는 예언이 아니라 오늘의 균형을 되찾는 언어입니다. ${voice.close}`,
    `읽고 난 뒤에는 ${keywordContext(key)} 하나만 남겨도 충분합니다. 오늘 반복된 장면과 내 반응, 그리고 내일 바꿀 작은 행동을 ${key}의 기록으로 남기세요. ${categoryLabel} 리딩에서는 ${pairWithAnd(lex.keyB, lex.keyD)}의 긴장을 더 세밀하게 나누어 볼 수 있습니다. 그렇게 ${key}의 질문에 맞춰 읽을 때 운의 말은 불안을 키우지 않고 방향을 밝히는 등불이 됩니다. ${voice.close}`,
  ], seed, 9);

  return [
    { heading: "한눈에 보는 핵심", body: section1 },
    { heading: "처음엔 이 순서로 읽어보세요", body: section2 },
    { heading: "많이 헷갈리는 포인트", body: section3 },
    { heading: "요즘 이런 장면이 반복된다면", body: section4 },
    { heading: "오늘의 질문에 적용하기", body: section5 },
    { heading: "다음 단계: 내 운세에 적용하기", body: section6 },
  ];
}

function normalizeLinkItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        const href = String(item || "").trim();
        if (!href) return null;
        return { href, label: href };
      }

      const href = String(item.href || "").trim();
      const label = String(item.label || "").trim();
      if (!href || !label) return null;
      return { href, label };
    })
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeFaqItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const question = String(item?.question || "").trim();
      const answer = String(item?.answer || "").trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean)
    .slice(0, 10);
}

function buildSeedArticle(article, index) {
  const slug = String(article?.slug || "").trim();
  const title = String(article?.title || "운세 인사이트").trim();
  const resolvedImage = resolveSeedImage(article, index, title);
  const category = inferCategoryLabel(article);
  const tags = normalizeTags(article);
  const useOriginalContent =
    (ORIGINAL_CONTENT_SLUGS.has(slug) || article?.useOriginalContent === true) &&
    Boolean(String(article?.contentHtml || "").trim());
  const rewrittenSections = useOriginalContent
    ? (Array.isArray(article?.sections) ? article.sections : [])
    : buildMysticSections(article, category, tags);
  const contentHtml = useOriginalContent
    ? String(article.contentHtml)
    : `<article><h1>${escapeHtml(title)}</h1>${renderSectionsToHtml(rewrittenSections)}</article>`;
  const excerpt = useOriginalContent
    ? (String(article?.description || "").trim() || buildMysticExcerpt(article, category, tags))
    : buildMysticExcerpt(article, category, tags);
  const description = excerpt;
  const author =
    typeof article?.author === "object" && article?.author
      ? String(article.author.name || DEFAULT_AUTHOR)
      : DEFAULT_AUTHOR;

  const publishedAt = normalizeIsoDate(article?.updatedAt, 120 + index);
  const updatedAt = normalizeIsoDate(article?.updatedAt || article?.publishedAt, 30 + index);
  const internalLinks = normalizeLinkItems(article?.internalLinks);
  const faq = normalizeFaqItems(article?.faq);
  const ctaLinks = normalizeLinkItems(article?.cta?.links);
  const ctaServiceRoute = String(article?.ctaServiceRoute || article?.targetRoute || internalLinks?.[0]?.href || resolveServiceLink(category)).trim();
  const ctaLabel = resolveCtaLabel(category);
  const normalizedCtaLinks = ctaLinks.length > 0
    ? ctaLinks
    : (internalLinks.length > 0 ? internalLinks : [{ href: ctaServiceRoute || "/insights", label: ctaLabel }]);

  const seoTitle = String(article?.metaTitle || article?.seoTitle || `${title} — 상담가의 비밀 노트로 읽는 운의 흐름`).trim();
  const seoDescriptionSource = useOriginalContent
    ? (article?.metaDescription || article?.seoDescription || article?.description || buildMysticSeoDescription(article, category, tags))
    : (article?.metaDescription || article?.seoDescription || buildMysticSeoDescription(article, category, tags));
  const seoDescription = normalizeSeoDescription(String(seoDescriptionSource), slug || title, title);

  return {
    slug,
    title,
    subtitle: String(article?.subtitle || "").trim(),
    intro: String(article?.intro || "").trim(),
    description,
    excerpt,
    sections: rewrittenSections,
    category,
    categoryLabel: category,
    mainKeyword: String(article?.mainKeyword || tags?.[0] || title).trim(),
    relatedKeywords: Array.isArray(article?.relatedKeywords)
      ? article.relatedKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean).slice(0, 12)
      : tags.slice(1, 12),
    searchIntent: String(article?.searchIntent || "운세 주제의 핵심 개념을 이해하고 관련 기능으로 연결하려는 정보 탐색 의도").trim(),
    targetRoute: String(article?.targetRoute || ctaServiceRoute || "/insights").trim(),
    pageType: String(article?.pageType || "insight").trim(),
    tags,
    author,
    publishedAt,
    updatedAt,
    createdAt: publishedAt,
    viewCount: Math.max(0, 1200 - index * 7),
    readingTime: Math.max(4, Math.ceil(contentHtml.replace(/<[^>]+>/g, " ").length / 520)),
    noIndex: false,
    isFeatured: index < 12,
    canonicalUrl: `https://code-destiny.com/insights/${encodeURIComponent(slug)}`,
    seoTitle,
    seoDescription,
    serviceLink: ctaServiceRoute,
    ctaLabel,
    ogImage: toAbsoluteAssetUrl(
      !isKnownBrokenImageUrl(article?.ogImage)
        ? String(article?.ogImage || "").trim()
        : resolvedImage.url,
    ) || DEFAULT_OG_IMAGE,
    internalLinks,
    faq,
    ctaServiceRoute,
    cta: {
      title: String(article?.cta?.title || ctaLabel).trim(),
      links: normalizedCtaLinks,
    },
    relatedPosts: Array.isArray(article?.relatedPosts)
      ? article.relatedPosts.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    featuredImage: resolvedImage,
    contentHtml,
  };
}

const MERGED_INSIGHT_ARTICLES = [...SEO_GROWTH_ARTICLES, ...INSIGHT_ARTICLES];

export const INSIGHT_SEED_ARTICLES = Array.from(
  new Map(
    MERGED_INSIGHT_ARTICLES
      .filter((article) => String(article?.slug || "").trim() && article?.category !== "통합 리다이렉트")
      .map((article) => [String(article.slug).trim().toLowerCase(), article]),
  ).values(),
)
  .map(buildSeedArticle)
  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

export function getInsightSeedBySlug(slug) {
  const safeSlug = String(slug || "").trim().toLowerCase();
  if (!safeSlug) return null;
  return INSIGHT_SEED_ARTICLES.find((article) => article.slug === safeSlug) || null;
}

export function getInsightSeedRelated(slug, limit = 6) {
  const current = getInsightSeedBySlug(slug);
  if (!current) return INSIGHT_SEED_ARTICLES.slice(0, limit);

  const sameCategory = INSIGHT_SEED_ARTICLES.filter(
    (article) => article.slug !== current.slug && article.category === current.category,
  );
  const sameTag = INSIGHT_SEED_ARTICLES.filter(
    (article) =>
      article.slug !== current.slug
      && article.tags.some((tag) => current.tags.includes(tag))
      && article.category !== current.category,
  );

  return [...sameCategory, ...sameTag].slice(0, limit);
}

export function getInsightSeedPrevNext(slug) {
  const idx = INSIGHT_SEED_ARTICLES.findIndex((article) => article.slug === slug);
  if (idx < 0) return { previous: null, next: null };

  return {
    previous: INSIGHT_SEED_ARTICLES[idx - 1] || null,
    next: INSIGHT_SEED_ARTICLES[idx + 1] || null,
  };
}

export function getInsightSeedFilters() {
  const categories = Array.from(new Set(INSIGHT_SEED_ARTICLES.map((article) => article.category))).filter(Boolean);
  const tags = Array.from(new Set(INSIGHT_SEED_ARTICLES.flatMap((article) => article.tags || []))).filter(Boolean);

  return {
    categories: categories.sort((a, b) => a.localeCompare(b, "ko")),
    tags: tags.sort((a, b) => a.localeCompare(b, "ko")).slice(0, 120),
  };
}
