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

export const HD_REPORT_SECTION_TITLES = Object.freeze({
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
});

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
  const lang = locale === "en" ? "en" : "ko";
  return HD_REPORT_CHAPTER_ORDER.map((key, index) => ({
    key,
    order: index + 1,
    title: HD_REPORT_SECTION_TITLES[key][lang],
  }));
}
