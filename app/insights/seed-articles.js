import { INSIGHT_ARTICLES } from "./articles";
import { SEO_GROWTH_ARTICLES } from "./seo-growth-articles";

const DEFAULT_AUTHOR = "Code Destiny Editorial Team";
const SITE_ORIGIN = "https://code-destiny.com";
const DEFAULT_FEATURED_IMAGE = "/icons/꿀꿀 운세 로고.webp";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}${DEFAULT_FEATURED_IMAGE}`;

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
  if (categoryLabel === "오늘의 운세") return "/daily-fortune";
  if (categoryLabel === "궁합") return "/compatibility";
  return "/insights";
}

function resolveCtaLabel(categoryLabel) {
  if (categoryLabel === "사주") return "내 사주에서 이 흐름을 직접 확인하기";
  if (categoryLabel === "자미두수") return "내 명반에서 이 궁의 신호를 확인하기";
  if (categoryLabel === "숙요점") return "두 사람의 숙요 인연을 깊게 보기";
  if (categoryLabel === "타로") return "지금 질문으로 타로 리딩 시작하기";
  if (categoryLabel === "점성술") return "내 차트가 말하는 사랑과 일을 살펴보기";
  if (categoryLabel === "베다점") return "반복되는 주기를 베다 차트로 확인하기";
  if (categoryLabel === "오늘의 운세") return "오늘 밀어붙일 타이밍 확인하기";
  if (categoryLabel === "궁합") return "우리 관계의 리듬을 궁합으로 읽어보기";
  return "관련 운세 서비스로 이어보기";
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

function normalizeExcerptLength(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "상담에서 자주 마주하는 운의 신호를 현실 언어로 풀어, 지금 바로 실행 가능한 선택의 문장으로 바꿔드립니다.";
  if (raw.length >= 80 && raw.length <= 160) return raw;
  if (raw.length > 160) return raw.slice(0, 157).trimEnd() + "...";
  const suffix = " 상담실에서 바로 쓰는 질문 순서까지 함께 제시합니다.";
  const combined = `${raw}${suffix}`;
  if (combined.length <= 160) return combined;
  return combined.slice(0, 157).trimEnd() + "...";
}

function normalizeSeoDescription(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "운세 상담 현장에서 검증된 해석 순서로 관계·돈·직업·마음의 흐름을 읽고, 바로 적용 가능한 선택 기준을 제시하는 인사이트 글입니다.";
  if (raw.length >= 120 && raw.length <= 160) return raw;
  if (raw.length > 160) return raw.slice(0, 157).trimEnd() + "...";
  const pad = " 핵심 신호와 실전 적용 포인트, 관련 서비스 연결까지 한 흐름으로 정리했습니다.";
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
      action: "차트를 성격표가 아닌 삶의 리듬 지도로 읽는 관측 순서",
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
      action: "주기 단위로 해야 할 일과 멈춰야 할 일을 분리하는 실전표",
    };
  }

  return {
    keyA: "핵심 신호",
    keyB: "반복 패턴",
    keyC: "관계 축",
    keyD: "돈의 흐름",
    keyE: "직업 리듬",
    keyF: "마음 회복력",
    sceneA: "같은 고민이 되풀이되는 장면",
    sceneB: "선택이 늦어져 기회를 놓치는 순간",
    sceneC: "좋은 결과 뒤에 공허함이 남는 국면",
    action: "실전에서 바로 적용 가능한 우선순위 조정법",
  };
}

function buildMysticExcerpt(article, categoryLabel, tags) {
  const lex = getCategoryLexicon(categoryLabel);
  const keyword = String(article?.mainKeyword || tags[0] || article?.title || categoryLabel || "운세").trim();
  const options = [
    `${keyword}의 답은 멀리 있지 않습니다. ${lex.keyA}와 ${lex.keyB}를 먼저 읽으면, 관계·돈·직업·마음의 반복 패턴이 한 번에 보이기 시작합니다.`,
    `${lex.sceneA}이 계속된다면 신호는 이미 충분합니다. 상담 현장에서 쓰는 ${lex.action}으로, 당신의 고민을 실행 가능한 문장으로 바꿔드립니다.`,
    `${categoryLabel} 해석은 길흉 판정이 아니라 리듬 판독입니다. ${lex.keyC}·${lex.keyD}·${lex.keyE}를 연결해 지금 밀어붙일 타이밍과 멈출 타이밍을 짚어드립니다.`,
  ];

  return normalizeExcerptLength(pickVariant(options, `${article?.slug || ""}:excerpt`));
}

function buildMysticSections(article, categoryLabel, tags) {
  const title = String(article?.title || "운세 인사이트").trim();
  const key = String(article?.mainKeyword || tags[0] || categoryLabel || "운세").trim();
  const lex = getCategoryLexicon(categoryLabel);
  const seed = `${article?.slug || title}:${categoryLabel}`;

  const introLead = pickVariant([
    `상담실 문이 닫히고 조명이 낮아질 때, 사람들은 늘 같은 질문을 꺼냅니다.`,
    `오랜 상담 기록을 펼치면, 겉모습은 달라도 고민의 결은 비슷합니다.`,
    `운이 흔들리는 시기에는 사건보다 신호를 먼저 읽어야 길을 잃지 않습니다.`,
  ], seed, 1);

  const section1 = `${introLead} ${title}를 찾는 이유도 거기에 있습니다. ${lex.sceneA}과 ${lex.sceneB}은 우연처럼 보이지만, 실제로는 ${lex.keyA}와 ${lex.keyB}가 보내는 반복 신호인 경우가 많습니다. ${key}는 미래를 확정하는 문장이 아니라, 지금의 선택이 어떤 방향으로 흘러갈지 보여주는 지도입니다. 그래서 이 주제는 단순 지식이 아니라, 불안한 순간에 중심을 붙잡는 기준이 됩니다.`;

  const section2 = pickVariant([
    `실제 상담에서는 먼저 사람의 중심축을 확인합니다. ${lex.keyA}으로 현재 에너지의 결을 잡고, ${lex.keyC}과 ${lex.keyD}를 이어 관계와 돈의 충돌 지점을 찾습니다. 마지막으로 ${lex.keyE}를 겹쳐 직업과 역할의 압력을 읽습니다. 이 순서를 지키면 해석이 추상에서 끝나지 않고, 오늘 당장 바꿀 행동까지 연결됩니다.`,
    `고수들은 화려한 키워드를 늘어놓기 전에 질문의 순서를 정리합니다. 1) 지금 가장 아픈 장면은 무엇인가, 2) 그 장면이 언제 반복되는가, 3) 반복될 때 늘 같은 반응을 하는가. 그다음 ${lex.keyB}, ${lex.keyD}, ${lex.keyF}를 붙여 읽습니다. 이렇게 보면 원인과 결과가 한 줄로 이어져, 다음 선택이 빠르게 정리됩니다.`,
    `해석의 첫 단계는 맞히기가 아니라 구조화입니다. ${lex.keyA}과 ${lex.keyB}로 출발점, ${lex.keyC}으로 관계 방식, ${lex.keyD}으로 자원 흐름, ${lex.keyE}로 사회적 역할을 본 뒤 ${lex.keyF}로 회복력을 확인합니다. 상담 현장에서 가장 정확도가 높은 방식은 늘 이 기본 순서입니다.`,
  ], seed, 2);

  const section3 = pickVariant([
    `초보자가 가장 많이 놓치는 부분은 좋은 신호와 나쁜 신호를 너무 빨리 나누는 습관입니다. 예를 들어 강한 에너지는 성과를 만들지만, 동시에 소진의 대가를 요구할 수 있습니다. 반대로 약한 신호는 느리지만 오래 가는 힘이 되기도 합니다. 핵심은 길흉 판정이 아니라, 어디에서 힘이 나고 어디에서 비용이 새는지 읽는 눈입니다.`,
    `많은 사람이 “한 가지 키워드”에 매달립니다. ${lex.keyA} 하나, 카드 한 장, 행성 하나로 결론을 내리면 해석은 선명해 보이지만 실제 삶에서는 자주 빗나갑니다. 현실은 항상 복수의 축이 동시에 움직입니다. 그래서 상담에서는 단정 대신 조건을 붙입니다. 어떤 선택을 하면 문이 열리고, 어떤 반응을 반복하면 다시 닫히는지까지 말해야 합니다.`,
    `또 하나의 착각은 불안을 줄이기 위해 더 많은 정보를 쌓는 것입니다. 하지만 정보가 늘수록 결정이 늦어지는 경우가 많습니다. 해석의 목적은 지식 축적이 아니라 행동 선택입니다. 지금 필요한 건 완벽한 답이 아니라, 틀리지 않을 다음 한 걸음입니다.`,
  ], seed, 3);

  const section4 = `${lex.keyA} 신호가 강해질 때 현실에는 공통된 장면이 나타납니다. 첫째, ${lex.sceneA}에서 말하지 않은 기대가 커집니다. 둘째, ${lex.sceneB}처럼 판단 속도가 감정 속도를 따라가지 못합니다. 셋째, ${lex.sceneC}에서 성과와 만족의 간격이 벌어집니다. 이런 때일수록 문제를 크게 해석하기보다 패턴을 짧게 관찰해야 합니다. 반복의 간격과 강도를 기록하면, 어디서부터 균형이 무너졌는지 의외로 빨리 드러납니다.`;

  const section5 = pickVariant([
    `관계에서는 확인 질문 한 줄을 먼저 쓰세요. “지금 내가 원하는 건 이해인지, 해결인지?” 이 문장 하나가 오해를 줄입니다. 돈에서는 큰 결정을 24시간 늦춰 감정 열기를 식히고, 직업에서는 한 주에 하나의 성과 지표만 고정하세요. 마음이 흔들릴 때는 원인 분석보다 수면·호흡·산책 같은 회복 루틴을 먼저 복구하는 편이 빠릅니다.`,
    `관계·돈·직업·마음은 따로 움직이지 않습니다. 관계가 흔들리면 지출이 빨라지고, 지출이 빨라지면 직업 결정이 급해집니다. 그래서 실전에서는 네 영역을 함께 조율합니다. 오늘은 관계에서 말의 톤을 낮추고, 돈에서는 자동 결제 목록을 정리하고, 직업에서는 한 가지 미루던 연락을 끝내세요. 마음은 “완벽”이 아니라 “완료”를 기준으로 잡으면 안정됩니다.`,
    `가장 효과적인 방법은 작은 기준을 반복하는 것입니다. 관계는 대화 길이보다 대화의 리듬을, 돈은 수입 크기보다 지출 의식을, 직업은 야심보다 루틴의 지속성을 먼저 점검하세요. 마음은 성과가 아니라 회복 주기를 지켜야 오래 버팁니다. 운은 큰 결심 한 번보다 작은 습관 열 번에서 더 빠르게 바뀝니다.`,
  ], seed, 5);

  const section6 = `당신의 질문도 이제 한 줄로 정리할 수 있습니다. “지금 나는 어디에서 힘을 쓰고, 어디에서 힘을 잃는가.” 이 질문에 답이 보이면 다음 선택은 훨씬 가벼워집니다. 아래 연결된 ${categoryLabel} 서비스에서 ${lex.keyA}부터 ${lex.keyE}까지 당신의 실제 흐름을 직접 확인해 보세요. 글에서 읽은 신호를 자신의 장면에 대입하는 순간, 운세는 구경거리가 아니라 삶을 조율하는 기술이 됩니다.`;

  return [
    { heading: "왜 이 주제가 중요한가", body: section1 },
    { heading: "실제 상담에서는 어디를 먼저 보는가", body: section2 },
    { heading: "초보자가 가장 많이 착각하는 부분", body: section3 },
    { heading: "이 신호가 강할 때 현실에서 나타나는 모습", body: section4 },
    { heading: "관계·돈·직업·마음에서 활용하는 법", body: section5 },
    { heading: "관련 운세 서비스로 이어지는 안내", body: section6 },
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
  const rewrittenSections = buildMysticSections(article, category, tags);
  const contentHtml = `<article><h1>${escapeHtml(title)}</h1>${renderSectionsToHtml(rewrittenSections)}</article>`;
  const excerpt = buildMysticExcerpt(article, category, tags);
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
  const seoDescription = normalizeSeoDescription(String(article?.metaDescription || article?.seoDescription || excerpt));

  return {
    slug,
    title,
    subtitle: String(article?.subtitle || "").trim(),
    intro: String(article?.intro || "").trim(),
    description,
    excerpt,
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
      .filter((article) => String(article?.slug || "").trim())
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
