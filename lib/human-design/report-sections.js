// 프리미엄 리포트의 **장 목록과 제목**. 순수 데이터 모듈(의존성 0).
//
// 🔴 워커 밖에 두는 이유는 **결제 전 화면이 18장 목차를 보여 줘야 하기 때문**이다. 잠금 화면은
//    "무엇을 사는 것인지" 를 목차로 보여 주는데, 그 제목이 worker/lib 안에만 있으면 클라이언트가
//    읽을 수 없어 사본을 만들게 되고 사본은 반드시 갈린다.
//
// 🔴 여기 있는 순서가 정본이고, worker/lib/human-design-report-contract.js 가 자기 섹션 표를
//    이 목록과 대조해 어긋나면 **모듈 로드 시점에 던진다.** 한쪽만 고치는 것을 막는 장치다.

export const HD_REPORT_CHAPTER_ORDER = Object.freeze([
  "executiveSummary",
  "energyBlueprint",
  "type",
  "strategy",
  "authority",
  "profile",
  "centersDefined",
  "centersOpen",
  "channels",
  "gatesCore",
  "planetaryActivations",
  "incarnationCross",
  "lifeRelational",
  "lifeWork",
  "lifeSelf",
  "conditioningShadow",
  "practicalGuide",
  "finalSynthesis",
]);

import { normalizeLocale, RUNTIME_LOCALES } from "../i18n/locale-normalize.js";

const LOCALIZED_TITLES = {
  ja: "自分を知る概要|エネルギーの設計図|タイプとエネルギー|人生の進め方|内なる判断の基準|人との関わり方|定義されたセンター|開かれたセンター|チャネル|主要なゲート|惑星の活性化|人生の大きなテーマ|関係とコミュニケーション|仕事とお金|成長と意思決定|条件づけと影のパターン|実践ガイド|全体のまとめ",
  "zh-CN": "认识自己|能量蓝图|类型与能量运作|人生策略|内在权威|人生角色|已定义中心|开放中心|通道|核心闸门|行星激活|人生核心主题|关系与沟通|工作与金钱|成长与决策|制约与阴影模式|实践指南|综合解读",
  "zh-TW": "認識自己|能量藍圖|類型與能量運作|人生策略|內在權威|人生角色|已定義中心|開放中心|通道|核心閘門|行星啟動|人生核心主題|關係與溝通|工作與金錢|成長與決策|制約與陰影模式|實踐指南|綜合解讀",
  vi: "Hiểu về bản thân|Bản thiết kế năng lượng|Loại hình và năng lượng|Chiến lược sống|Thẩm quyền nội tại|Vai trò trong quan hệ|Trung tâm xác định|Trung tâm mở|Kênh năng lượng|Cổng cốt lõi|Kích hoạt hành tinh|Chủ đề lớn của cuộc đời|Quan hệ và giao tiếp|Công việc và tiền bạc|Phát triển và quyết định|Điều kiện hóa và mặt khuất|Hướng dẫn thực hành|Tổng kết",
  hi: "अपने आप को समझें|ऊर्जा की रूपरेखा|प्रकार और ऊर्जा|जीवन की रणनीति|आंतरिक प्राधिकार|संबंधों में आपकी भूमिका|परिभाषित केंद्र|खुले केंद्र|ऊर्जा चैनल|मुख्य द्वार|ग्रहों की सक्रियता|जीवन का मुख्य विषय|संबंध और संवाद|काम और धन|विकास और निर्णय|अनुकूलन और छाया के ढर्रे|व्यावहारिक मार्गदर्शन|समग्र निष्कर्ष",
  es: "Conocerte mejor|Tu diseño energético|Tipo y energía|Estrategia de vida|Autoridad interior|Tu papel en las relaciones|Centros definidos|Centros abiertos|Canales|Puertas principales|Activaciones planetarias|El gran tema de tu vida|Relaciones y comunicación|Trabajo y dinero|Crecimiento y decisiones|Condicionamiento y patrones de sombra|Guía práctica|Síntesis final",
  fr: "Mieux se connaître|Votre schéma énergétique|Type et énergie|Stratégie de vie|Autorité intérieure|Votre rôle dans les relations|Centres définis|Centres ouverts|Canaux|Portes principales|Activations planétaires|Le grand thème de votre vie|Relations et communication|Travail et argent|Évolution et décisions|Conditionnement et parts d’ombre|Guide pratique|Synthèse finale",
  de: "Sich selbst verstehen|Dein Energieplan|Typ und Energie|Lebensstrategie|Innere Autorität|Deine Rolle in Beziehungen|Definierte Zentren|Offene Zentren|Kanäle|Zentrale Tore|Planetare Aktivierungen|Dein großes Lebensthema|Beziehungen und Kommunikation|Arbeit und Geld|Wachstum und Entscheidungen|Konditionierung und Schattenmuster|Praktischer Leitfaden|Gesamtbild",
  nl: "Jezelf begrijpen|Je energieblauwdruk|Type en energie|Levensstrategie|Innerlijke autoriteit|Je rol in relaties|Gedefinieerde centra|Open centra|Kanalen|Belangrijkste poorten|Planetaire activeringen|Het grote thema van je leven|Relaties en communicatie|Werk en geld|Groei en beslissingen|Conditionering en schaduwpatronen|Praktische gids|Eindsynthese",
  ms: "Memahami diri|Pelan tenaga anda|Jenis dan tenaga|Strategi kehidupan|Autoriti dalaman|Peranan dalam hubungan|Pusat yang ditakrifkan|Pusat terbuka|Saluran tenaga|Gerbang utama|Pengaktifan planet|Tema utama kehidupan|Hubungan dan komunikasi|Kerja dan wang|Pertumbuhan dan keputusan|Pengkondisian dan corak bayangan|Panduan praktikal|Rumusan menyeluruh",
};

const BASE_TITLES = {
  executiveSummary: Object.freeze({ ko: "한눈에 보는 나", en: "Executive Summary" }),
  energyBlueprint: Object.freeze({ ko: "에너지 설계도", en: "Energy Blueprint" }),
  type: Object.freeze({ ko: "타입 — 에너지가 작동하는 방식", en: "Type — How Your Energy Works" }),
  strategy: Object.freeze({ ko: "전략 — 삶을 여는 문", en: "Strategy — How Life Opens" }),
  authority: Object.freeze({ ko: "내적 권위 — 결정하는 자리", en: "Authority — Where Decisions Belong" }),
  profile: Object.freeze({ ko: "프로파일 — 세상과 만나는 역할", en: "Profile — Your Role With Others" }),
  centersDefined: Object.freeze({ ko: "정의된 센터 — 늘 같은 방식으로 나오는 힘", en: "Defined Centers — What Is Always On" }),
  centersOpen: Object.freeze({ ko: "열린 센터 — 받아들이고 증폭하는 자리", en: "Open Centers — What You Take In" }),
  channels: Object.freeze({ ko: "채널 — 나를 이루는 회로", en: "Channels — Your Wiring" }),
  gatesCore: Object.freeze({ ko: "핵심 게이트", en: "Core Gates" }),
  planetaryActivations: Object.freeze({ ko: "행성 활성 — 의식과 무의식", en: "Planetary Activations — Conscious and Unconscious" }),
  incarnationCross: Object.freeze({ ko: "인카네이션 크로스 — 삶의 큰 주제", en: "Incarnation Cross — The Larger Theme" }),
  lifeRelational: Object.freeze({ ko: "관계 · 소통 · 사회", en: "Love, Communication, Social Life" }),
  lifeWork: Object.freeze({ ko: "일 · 돈", en: "Career and Money" }),
  lifeSelf: Object.freeze({ ko: "성장 · 의사결정", en: "Growth and Decision Making" }),
  conditioningShadow: Object.freeze({ ko: "조건화와 그림자 패턴", en: "Conditioning and Shadow Patterns" }),
  practicalGuide: Object.freeze({ ko: "실천 가이드", en: "Practical Guide" }),
  finalSynthesis: Object.freeze({ ko: "종합 — 하나의 이야기로", en: "Final Synthesis" }),
};

export const HD_REPORT_SECTION_TITLES = Object.freeze(Object.fromEntries(
  HD_REPORT_CHAPTER_ORDER.map((key, index) => [key, Object.freeze({
    ...BASE_TITLES[key],
    ...Object.fromEntries(Object.entries(LOCALIZED_TITLES).map(([locale, titles]) => [locale, titles.split("|")[index]])),
  })]),
));

for (const key of HD_REPORT_CHAPTER_ORDER) {
  if (RUNTIME_LOCALES.some(locale => !HD_REPORT_SECTION_TITLES[key][locale])) throw new Error(`Missing report title: ${key}`);
}

// 표를 손으로 고치다 한쪽만 바뀌는 것을 로드 시점에 잡는다.
{
  const missing = HD_REPORT_CHAPTER_ORDER.filter((key) => !HD_REPORT_SECTION_TITLES[key]);
  if (missing.length) {
    throw new Error(`report-sections: 제목 없는 장이 있다 — ${missing.join(", ")}`);
  }
  const extra = Object.keys(HD_REPORT_SECTION_TITLES).filter((key) => !HD_REPORT_CHAPTER_ORDER.includes(key));
  if (extra.length) {
    throw new Error(`report-sections: 순서에 없는 제목이 있다 — ${extra.join(", ")}`);
  }
}

/** 결제 전 목차와 생성 화면이 함께 쓰는 목록. */
export function reportContents(locale) {
  const lang = normalizeLocale(locale);
  return HD_REPORT_CHAPTER_ORDER.map((key, index) => ({
    key,
    order: index + 1,
    title: HD_REPORT_SECTION_TITLES[key][lang],
  }));
}
