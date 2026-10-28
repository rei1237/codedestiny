import { GRAHA_KO, GRAHA_KEYWORDS, SIGN_LORDS, SIGNS_KO, signIndex, houseFromReference, nakshatraInfo } from "./vedic-derived-calculations.js";
import { getPadaDetail } from "../../constants/nakshatra-attributes.js";

const WORK = {
  Sun: ["판단 기준을 세우고 책임지는 일", "권한과 책임이 함께 주어지는 환경", "모든 결정을 혼자 떠안지 않는 것"],
  Moon: ["사람의 필요를 살피고 경험을 다듬는 일", "꾸준히 반응을 듣고 개선할 수 있는 환경", "타인의 기분과 내 책임을 구분하는 것"],
  Mars: ["문제를 해결하고 실행으로 옮기는 일", "목표와 피드백이 분명한 환경", "속도보다 확인이 필요한 순간을 정하는 것"],
  Mercury: ["정보를 정리하고 말과 글로 연결하는 일", "배움과 교류가 이어지는 환경", "선택지를 늘리기 전에 완료 기준을 세우는 것"],
  Jupiter: ["지식과 경험을 길잡이로 바꾸는 일", "장기적인 성장과 신뢰를 존중하는 환경", "좋은 전망을 작은 실험으로 확인하는 것"],
  Venus: ["감각과 관계를 구체적인 가치로 만드는 일", "품질과 협업을 함께 인정하는 환경", "좋은 관계를 위해 조건을 모호하게 두지 않는 것"],
  Saturn: ["복잡한 일을 지속 가능한 구조로 만드는 일", "숙련과 꾸준함을 인정하는 환경", "참는 능력과 무리한 부담을 구분하는 것"],
  Rahu: ["낯선 분야를 탐색하고 연결하는 일", "새 시도를 작게 검증할 수 있는 환경", "성장 속도에 맞춰 위험과 비용을 점검하는 것"],
  Ketu: ["핵심을 분석하고 불필요한 것을 덜어내는 일", "깊이 집중할 시간과 자율성이 있는 환경", "혼자 아는 결론을 다른 사람이 이해할 말로 전하는 것"],
};

export const CHAKRA_REFLECTIONS = Object.freeze([
  { name: "물라다라 · 기반", theme: "안정감", question: "오늘 나를 편안하게 해 준 일상은 무엇인가요?", action: "잠드는 시간과 쉬는 자리를 한 가지씩 정돈해 보세요." },
  { name: "스바디슈타나 · 감각", theme: "감정과 즐거움", question: "좋아서 하는 일과 의무로 하는 일을 구분하고 있나요?", action: "부담 없는 즐거움에 짧은 시간을 남겨 보세요." },
  { name: "마니푸라 · 의지", theme: "선택과 경계", question: "지금 내가 선택할 수 있는 부분은 어디까지인가요?", action: "오늘 끝낼 수 있는 작은 일 하나를 고르세요." },
  { name: "아나하타 · 마음", theme: "돌봄과 관계", question: "상대를 챙기는 만큼 내 마음도 듣고 있나요?", action: "고마운 일과 필요한 도움을 한 문장씩 말해 보세요." },
  { name: "비슈다 · 표현", theme: "말하기와 듣기", question: "삼킨 말 가운데 차분히 전할 수 있는 것은 무엇인가요?", action: "상대를 평가하기보다 내 느낌과 요청을 나누어 적어 보세요." },
  { name: "아즈나 · 관찰", theme: "생각의 여백", question: "확인한 사실과 걱정으로 예상한 일을 구분하고 있나요?", action: "복잡한 생각을 종이에 옮기고 잠시 화면에서 눈을 떼어 보세요." },
  { name: "사하스라라 · 의미", theme: "가치와 연결", question: "요즘 내 시간을 쓰고 싶은 가치는 무엇인가요?", action: "그 가치와 연결되는 작은 행동을 이번 주 일정에 넣어 보세요." },
]);

export function buildNatalEvidence(raw, timeUnknown) {
  const lagna = !timeUnknown && Number.isFinite(raw?.ascendantSidereal) ? signIndex(raw.ascendantSidereal) : null;
  const planets = Object.entries(raw?.planets || {}).filter(([, value]) => Number.isFinite(value)).map(([name, longitude]) => {
    const sign = signIndex(longitude);
    const nak = nakshatraInfo(longitude);
    return { name, nameKo: GRAHA_KO[name] || name, longitude, sign, signKo: SIGNS_KO[sign],
      house: houseFromReference(sign, lagna),
      navamsaSignKo: timeUnknown ? null : getPadaDetail(nak.index, nak.pada)?.navamsaSignKo || null };
  });
  const houses = lagna == null ? [] : Array.from({ length: 12 }, (_, i) => {
    const sign = (lagna + i) % 12;
    return { house: i + 1, signKo: SIGNS_KO[sign], lord: SIGN_LORDS[sign],
      lordKo: GRAHA_KO[SIGN_LORDS[sign]], planets: planets.filter(p => p.house === i + 1).map(p => p.nameKo) };
  });
  return { zodiac: "sidereal", ayanamsa: "Lahiri", houseSystem: "whole-sign",
    lagna: lagna == null ? null : SIGNS_KO[lagna], houses, planets, timeUnknown: Boolean(timeUnknown) };
}

export function buildLifeReading(sukuyo, india, evidence) {
  const strengths = (sukuyo.strengths || []).slice(0, 2).join(" · ");
  const shadow = (sukuyo.shadows || []).slice(0, 2).join(" · ");
  const keywords = (sukuyo.keywords || []).slice(0, 3).join(" · ");
  const lord = india.lord;
  const work = WORK[lord] || WORK.Moon;
  const vedicBase = india.nameKo + " · 지배성 " + india.lordKo;
  const eastBase = sukuyo.nameKo + "(" + sukuyo.nameHan + ") · " + keywords;
  const houseText = n => {
    const h = evidence?.houses.find(row => row.house === n);
    if (!h) return "출생시간이 없어 하우스 해석은 제외했습니다.";
    return n + "하우스 " + h.signKo + " · 지배성 " + h.lordKo
      + (h.planets.length ? " · 자리한 행성 " + h.planets.join(", ") : "");
  };
  const topic = (id, title, east, indiaText, action, extra = "") => ({
    id, title, sukuyo: east, vedic: indiaText, action,
    evidence: { sukuyo: eastBase, vedic: [vedicBase, extra].filter(Boolean).join(" / ") },
  });
  return [
    topic("nature", "타고난 성향", strengths + "은 이 숙의 강점으로 읽습니다. 반면 " + shadow + "의 모습이 반복되는지 함께 살펴보세요.",
      india.lordKo + "의 상징인 " + (GRAHA_KEYWORDS[lord] || []).join("·") + "을 통해 선택의 동기를 살펴봅니다. " + india.deityRole + "이라는 전통 상징도 함께 읽습니다.",
      "강점이 도움이 된 장면과 지나쳐 부담이 된 장면을 하나씩 적어 보세요."),
    topic("wellbeing", "차크라와 몸·마음 돌봄", keywords + "의 기질을 일상에서 쓰고 난 뒤 충분히 회복할 시간을 남겨 보세요.",
      "차크라는 몸과 마음을 돌아보기 위한 전통적 상징입니다. 아래 일곱 주제는 출생 차트로 측정한 에너지나 건강 상태가 아닙니다.",
      "지금 마음에 닿는 질문 한 가지를 선택하세요. 불편한 증상이 있다면 이 해석 대신 의료진의 평가를 받으세요."),
    topic("career", "직업 적성과 일하는 방식", strengths + "을 업무에서 어떤 행동으로 쓰는지 살펴보세요. 직업 이름보다 역할과 협업 방식이 중요합니다.",
      vedicBase + "의 상징은 " + work[0] + "을 탐색하는 실마리입니다. " + work[1] + "에서 강점을 시험해 보세요.",
      work[2] + "부터 연습하세요. 실제 경험·기술·여건을 함께 판단하세요.", houseText(10)),
    topic("love", "연애와 감정 표현", keywords + "의 성향은 친밀해지는 속도와 표현 방식에서도 드러날 수 있습니다. 상대도 같은 속도를 원한다고 가정하지 마세요.",
      india.ganaKo + " 가나의 기질과 " + india.motiveKo + "의 동기를 나의 관계 욕구를 돌아보는 상징으로 읽습니다. 상대의 속마음을 확정하는 근거는 아닙니다.",
      "연락 빈도와 혼자 쉬는 시간 중 바라는 것 한 가지를 구체적으로 말해 보세요.", houseText(5)),
    topic("marriage", "결혼과 함께 사는 생활", "숙요의 " + strengths + "을 함께 사는 생활의 자원으로 쓰되, " + shadow + "이 갈등에서 반복되는지 점검하세요.",
      "결혼은 한 사람의 별만으로 결정되지 않습니다. 확인된 7하우스와 나밤샤(D9)는 관계를 바라보는 전통적 보조 근거로만 사용합니다.",
      "돈·집안일·가족과의 거리·갈등 후 회복 방식을 서로 이야기해 보세요. 두 사람의 비교는 별도 궁합에서 제공합니다.", houseText(7)),
  ];
}
