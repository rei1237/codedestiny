import { transformationTypeToLabel } from "./ziwei-advanced-normalization";
import { ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import {
  ValidationResult,
  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiDeepPalaceReading,
  ZiweiPalace,
  ZiweiPalaceCategoryReading,
  ZiweiPalaceId,
  ZiweiStarMeta,
  ZiweiTransformation,
} from "./ziwei-types";

type PalaceCategorySpec = {
  title: string;
  question: string;
};

const FORBIDDEN_ZIWEI_PHRASES = [
  "핵심 구조 보강",
  "자동 보강",
  "보강 문구",
  "기본 보강",
  "구조 보강",
  "fallback 보강",
  "자동 복구 생성",
  "fallback",
  "데이터 부족",
  "payload",
  "debug",
  "raw json",
];

const PALACE_CATEGORY_SPECS: Record<ZiweiPalaceId, PalaceCategorySpec[]> = {
  ming: [
    { title: "핵심 성향과 인생 기본값", question: "이 명궁은 삶의 기본 반응을 어떻게 만드는가?" },
    { title: "사고방식과 판단 기준", question: "중요한 결정을 내릴 때 어떤 기준이 먼저 작동하는가?" },
    { title: "자존감과 자기인식 구조", question: "자기평가가 흔들리거나 단단해지는 순간은 언제인가?" },
    { title: "대인관계에서 보이는 첫인상", question: "타인은 이 사람을 어떤 결로 읽기 쉬운가?" },
    { title: "반복되는 선택 패턴", question: "비슷한 선택이 반복될 때 명궁은 어디로 끌고 가는가?" },
    { title: "장점이 강하게 발휘되는 상황", question: "명궁 강점은 어떤 현장에서 성과로 전환되는가?" },
    { title: "약점이 드러나는 상황", question: "명궁의 그림자는 어떤 압박에서 문제를 만들기 쉬운가?" },
    { title: "성공을 위한 자기 운영법", question: "명궁을 현실 성과로 연결하려면 무엇을 운영 규칙으로 삼아야 하는가?" },
  ],
  siblings: [
    { title: "형제·자매와의 기본 인연", question: "가까운 혈연과 수평관계의 기본 정서는 무엇인가?" },
    { title: "친구·동료와의 수평 관계", question: "친구와 동료 사이에서 어떤 거리감이 편한가?" },
    { title: "경쟁자와 라이벌 구도", question: "경쟁 압력이 생기면 어떤 방식으로 반응하는가?" },
    { title: "협업 능력", question: "같은 목표를 향해 움직일 때 협업의 강점과 병목은 무엇인가?" },
    { title: "주변 도움과 방해", question: "주변 사람은 어떤 메커니즘으로 도움이 되거나 방해가 되는가?" },
    { title: "공동 프로젝트 운", question: "공동 프로젝트는 어떤 조건에서 성과가 나는가?" },
    { title: "신뢰할 사람의 유형", question: "누구와는 잘 맞고 누구와는 에너지가 새기 쉬운가?" },
    { title: "대운과 인맥 전략", question: "형제궁을 인맥 전략으로 바꾸려면 어떤 타이밍을 읽어야 하는가?" },
  ],
  spouse: [
    { title: "연애 성향", question: "이 부부궁은 사랑을 어떻게 시작하고 확인하는가?" },
    { title: "끌리는 상대 유형", question: "어떤 성향의 사람에게 끌리기 쉬운가?" },
    { title: "장기 관계와 결혼관", question: "관계를 오래 유지할 때 꼭 필요한 조건은 무엇인가?" },
    { title: "파트너의 기질", question: "배우자 또는 파트너는 어떤 방식으로 삶에 개입하기 쉬운가?" },
    { title: "반복되는 갈등", question: "관계에서 반복적으로 부딪히는 주제는 무엇인가?" },
    { title: "애정 표현과 신뢰 조건", question: "애정 표현과 안정감은 어떤 방식에서 생기는가?" },
    { title: "거리감의 원인", question: "소원함과 이별감은 어떤 구조에서 커지기 쉬운가?" },
    { title: "대운과 관계 전략", question: "관계의 시기가 바뀔 때 어떤 선택이 더 안정적인가?" },
  ],
  children: [
    { title: "자녀 인연의 기본 흐름", question: "돌봄과 후속 세대의 인연은 어떤 질감으로 들어오는가?" },
    { title: "자녀와의 관계 방식", question: "보호와 간섭의 경계는 어디에서 흔들리는가?" },
    { title: "후배·제자 운", question: "후배와 아랫사람을 키울 때 어떤 재능이 드러나는가?" },
    { title: "창작물과 결과물 운", question: "내가 만든 결과물은 어떤 구조에서 빛을 보는가?" },
    { title: "생산성과 유산", question: "지속 가능한 성과를 남기기 위한 생산성 구조는 무엇인가?" },
    { title: "돌봄과 책임의 방식", question: "책임감이 과해지거나 부족해지는 지점은 어디인가?" },
    { title: "감정적 보상과 기대", question: "애정과 성과를 섞어 기대할 때 어떤 문제가 생기는가?" },
    { title: "대운과 성과 전략", question: "자녀궁을 창작과 성과 전략으로 바꾸려면 무엇을 읽어야 하는가?" },
  ],
  wealth: [
    { title: "돈을 버는 방식", question: "이 재백궁은 어떤 수익 구조를 선호하는가?" },
    { title: "수입 구조와 흐름", question: "돈이 들어올 때 지속성과 변동성은 어떻게 드러나는가?" },
    { title: "소비 습관과 지출 패턴", question: "지출은 어떤 감정과 상황에서 커지는가?" },
    { title: "저축·투자·자산 형성", question: "자산을 쌓으려면 어떤 속도와 방식이 맞는가?" },
    { title: "사업·거래 운", question: "거래와 사업 판단은 어떤 구조에서 유리한가?" },
    { title: "돈이 들어오는 경로", question: "사람·직무·플랫폼 중 어디에서 재물 문이 열리기 쉬운가?" },
    { title: "돈이 새는 원인", question: "재물 누수는 어디에서 시작되는가?" },
    { title: "대운과 재물 전략", question: "대운에서 재백궁이 흔들릴 때 무엇을 지키는 것이 우선인가?" },
  ],
  health: [
    { title: "기본 체력과 에너지 패턴", question: "이 질액궁은 체력과 에너지를 어떤 리듬으로 쓰는가?" },
    { title: "스트레스의 신체화", question: "스트레스는 몸 어디와 생활 습관에 먼저 드러나는가?" },
    { title: "약해지기 쉬운 생활 영역", question: "일상에서 가장 쉽게 무너지는 축은 무엇인가?" },
    { title: "회복력이 살아나는 조건", question: "회복 속도를 끌어올리는 조건은 무엇인가?" },
    { title: "과로·번아웃 패턴", question: "무리할 때 반복되는 위험 신호는 무엇인가?" },
    { title: "감정과 몸의 연결", question: "정서 변화가 컨디션에 어떤 식으로 번지는가?" },
    { title: "생활 습관 경계", question: "건강 리듬을 무너뜨리는 습관은 무엇인가?" },
    { title: "대운과 회복 전략", question: "질액궁을 회복 전략으로 번역할 때 가장 중요한 기준은 무엇인가?" },
  ],
  travel: [
    { title: "외부 환경에서의 운", question: "밖으로 나갈수록 어떤 기운이 살아나는가?" },
    { title: "이동·여행·이사 흐름", question: "환경 이동은 어떤 식으로 삶의 전환을 만드는가?" },
    { title: "타지·해외 인연", question: "외부 인연과 낯선 환경은 무엇을 열어주는가?" },
    { title: "사회적 확장 방식", question: "천이궁은 어떤 확장 방식을 가장 자연스럽게 지지하는가?" },
    { title: "외부 이미지", question: "사회는 이 사람을 어떤 캐릭터로 읽기 쉬운가?" },
    { title: "밖에서 얻는 기회", question: "새로운 기회는 어떤 움직임을 통해 들어오는가?" },
    { title: "외부 활동 리스크", question: "확장 과정에서 무엇을 특히 조심해야 하는가?" },
    { title: "대운과 확장 전략", question: "천이궁을 활용한 확장 전략은 어떤 순서가 안전한가?" },
  ],
  friends: [
    { title: "친구·지인 인연", question: "노복궁은 어떤 유형의 사람을 끌어들이는가?" },
    { title: "팀원·후배 운", question: "함께 움직이는 사람들과의 힘 배분은 어떻게 나타나는가?" },
    { title: "고객·팬·팔로워 운", question: "대중적 지지나 고객 흐름은 어떤 조건에서 늘어나는가?" },
    { title: "도움을 주는 사람의 유형", question: "실제로 도움이 되는 사람은 어떤 특징을 갖는가?" },
    { title: "나를 소모시키는 사람의 유형", question: "어떤 관계는 에너지를 빼앗기 쉬운가?" },
    { title: "집단 속 역할", question: "집단에서 맡게 되는 역할과 기대는 무엇인가?" },
    { title: "리더십과 추종자 운", question: "사람을 이끌거나 따라야 할 때 어떤 방식이 맞는가?" },
    { title: "대운과 네트워크 전략", question: "노복궁을 네트워크 전략으로 운용하려면 무엇을 기준 삼아야 하는가?" },
  ],
  career: [
    { title: "타고난 직업 성향", question: "관록궁은 어떤 일의 결을 타고났다고 말하는가?" },
    { title: "어울리는 역할과 직무", question: "어떤 자리에서 능력이 자연스럽게 증명되는가?" },
    { title: "조직생활 적응 방식", question: "조직 안에서 힘을 쓰는 방식과 피로 지점은 무엇인가?" },
    { title: "리더십과 책임감", question: "책임을 맡을 때 어떤 리더십이 드러나는가?" },
    { title: "명예와 평판", question: "커리어 평판은 무엇을 통해 쌓이거나 흔들리는가?" },
    { title: "성과·승진 흐름", question: "성과가 누적되는 방식과 평가 포인트는 무엇인가?" },
    { title: "이직·독립 가능성", question: "독립과 전환은 어떤 조건에서 유리해지는가?" },
    { title: "대운과 성공 전략", question: "커리어 전환기에는 무엇을 먼저 정렬해야 하는가?" },
  ],
  property: [
    { title: "주거 안정성", question: "전택궁은 생활 기반의 안정도를 어떻게 보여주는가?" },
    { title: "집·부동산 인연", question: "공간과 자산 기반은 어떤 속성에서 강해지는가?" },
    { title: "가족 기반과 터전", question: "가정 환경은 삶의 리듬을 어떻게 지지하거나 방해하는가?" },
    { title: "집에서 회복되는 방식", question: "회복과 재충전은 어떤 공간 조건에서 잘 일어나는가?" },
    { title: "공간 취향과 생활 패턴", question: "공간을 쓰는 방식에 어떤 습관과 취향이 드러나는가?" },
    { title: "재산 축적 기반", question: "전택궁은 장기 자산의 밑바탕을 어떻게 말하는가?" },
    { title: "이사와 주거 변화", question: "거주 변화는 어떤 시그널에서 결정하는 것이 안전한가?" },
    { title: "대운과 생활 기반 전략", question: "전택궁을 생활 안정 전략으로 바꾸려면 무엇을 보아야 하는가?" },
  ],
  fortune: [
    { title: "마음의 기본 온도", question: "복덕궁이 보여주는 기본 정서는 어떤 온도인가?" },
    { title: "행복을 느끼는 방식", question: "어떤 순간과 환경에서 만족감이 커지는가?" },
    { title: "혼자 있을 때의 내면", question: "혼자 있을 때 생각과 감정은 어떻게 흐르는가?" },
    { title: "스트레스 해소 방식", question: "마음을 풀어내는 가장 효과적인 방식은 무엇인가?" },
    { title: "안정과 불안의 패턴", question: "불안은 어떤 상황에서 커지고 어떤 조건에서 잦아드는가?" },
    { title: "취미·예술·영성 성향", question: "복덕궁은 어떤 취향과 정신적 세계를 선호하는가?" },
    { title: "공허감의 흐름", question: "허무감이 스며들기 쉬운 시점은 언제인가?" },
    { title: "대운과 행복 전략", question: "복덕궁을 행복 전략으로 바꾸려면 무엇을 훈련해야 하는가?" },
  ],
  parents: [
    { title: "부모와의 기본 인연", question: "부모궁은 보호와 기대의 구조를 어떻게 보여주는가?" },
    { title: "보호자와의 관계 흐름", question: "양육자·보호자와의 관계는 어떤 리듬으로 전개되는가?" },
    { title: "윗사람·멘토 운", question: "상사와 멘토 인연은 어떤 형태로 들어오는가?" },
    { title: "제도권·문서 운", question: "기관·문서·규정과의 궁합은 어떠한가?" },
    { title: "보호받는 방식", question: "도움을 받을 때는 어떤 태도와 구조가 통하는가?" },
    { title: "권위와의 관계", question: "권위자와는 어떻게 거리를 잡는 것이 좋은가?" },
    { title: "가족 패턴과 리스크", question: "가족 시스템 안에서 반복되는 패턴은 무엇인가?" },
    { title: "대운과 보호·독립 전략", question: "보호와 독립의 균형을 맞추려면 무엇을 기준 삼아야 하는가?" },
  ],
};

function normalizeSymbol(star?: ZiweiStarMeta): string {
  const raw = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (raw === "○") return "O";
  if (raw === "×") return "X";
  return raw;
}

function starBadge(star: ZiweiStarMeta): string {
  const symbol = normalizeSymbol(star);
  return `${star.name}${symbol ? ` ${symbol}` : ""}`.trim();
}

function unique(items: string[], limit = items.length): string[] {
  return Array.from(new Set(items.filter(Boolean))).slice(0, limit);
}

function palaceById(chart: ZiweiDeepChart, id?: ZiweiPalaceId): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((palace) => palace.id === id) || null;
}

export function sanitizeZiweiDeepText(text: string): string {
  let next = String(text || "");
  FORBIDDEN_ZIWEI_PHRASES.forEach((phrase) => {
    next = next.replaceAll(phrase, "");
  });
  return next.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function removeRepeatedZiweiDeepPhrases(text: string): string {
  const sentences = sanitizeZiweiDeepText(text)
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const sentence of sentences) {
    const key = sentence.replace(/\s+/g, " ");
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    kept.push(sentence);
  }
  return kept.join("\n\n").trim();
}

export function validateNoZiweiDebugPhrases(text: string): ValidationResult {
  const issues = FORBIDDEN_ZIWEI_PHRASES.filter((phrase) => String(text || "").includes(phrase)).map((phrase) => `금지 문구 포함: ${phrase}`);
  return { valid: issues.length === 0, issues };
}

function buildBrightnessSummary(palace: ZiweiPalace): string {
  const strong = palace.strengthSummary?.strongestStars?.map(starBadge) || [];
  const weak = palace.strengthSummary?.weakStars?.map(starBadge) || [];
  return [
    strong.length ? `강하게 드러나는 별은 ${strong.join(", ")}입니다.` : "강세 별이 한곳에 몰리지 않아 역할 분산이 중요합니다.",
    weak.length ? `보완이 필요한 별은 ${weak.join(", ")}로, 기복 관리가 중요합니다.` : "약세 별 압박이 심하지 않아 루틴이 유지되면 안정도가 올라갑니다.",
  ].join(" ");
}

function buildSignalPack(chart: ZiweiDeepChart, palace: ZiweiPalace) {
  const mainStars = palace.mainStars.length
    ? palace.mainStars
    : palace.oppositePalace?.mainStars?.length
      ? palace.oppositePalace.mainStars
      : palace.sanFangSiZheng.mainStars.slice(0, 3);
  const supportStars = unique([
    ...palace.auxiliaryStars.map(starBadge),
    ...palace.luckyStars.map(starBadge),
  ], 4);
  const minorStars = unique([
    ...palace.minorStars.map(starBadge),
    ...palace.maleficStars.map(starBadge),
  ], 5);
  const transformations: ZiweiTransformation[] = unique([
    ...palace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|direct`),
    ...palace.incomingFourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|incoming`),
  ]).map((row) => {
    const [type, starName, mode] = row.split("|");
    return {
      type: type as ZiweiTransformation["type"],
      starName,
      palaceName: palace.name,
      influence: mode === "direct"
        ? `${type} ${starName}이 ${palace.name}에 직접 걸려 사건의 핵심 축을 만듭니다.`
        : `${type} ${starName}이 연결궁에서 유입되어 간접 압력을 만듭니다.`,
    };
  });
  const triadNames = palace.sanFangSiZheng?.palaceNames?.length
    ? palace.sanFangSiZheng.palaceNames
    : palace.triadPalaceIds.map((id) => palaceById(chart, id)?.name || ZIWEI_PALACE_NAME[id]);
  const usedSignals = unique([
    mainStars.length ? `핵심 별 흐름: ${mainStars.map(starBadge).join(", ")}` : "핵심 별은 주변 궁의 영향으로 읽습니다",
    supportStars.length ? `보조 별 흐름: ${supportStars.join(", ")}` : "보조 별의 직접 보강은 약한 편입니다",
    minorStars.length ? `긴장 신호: ${minorStars.join(", ")}` : "긴장 신호는 비교적 약한 편입니다",
    transformations.length ? `변화 흐름: ${transformations.map((item) => `${item.type} ${item.starName}`).join(", ")}` : "변화 신호는 연결된 궁에서 간접적으로 들어옵니다",
    `마주보는 궁 영향: ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}`,
    `함께 움직이는 궁: ${triadNames.join(", ")}`,
  ], 6);

  return {
    mainStars,
    supportStars,
    minorStars,
    transformations,
    triadNames,
    usedSignals,
    brightnessSummary: buildBrightnessSummary(palace),
  };
}

function ensureLength(text: string, palace: ZiweiPalace, category: PalaceCategorySpec): string {
  let next = removeRepeatedZiweiDeepPhrases(text);
  if (next.length >= 250) return next;
  next += ` ${palace.name}의 ${category.title}은 ${category.question}라는 질문을 실제 명반에 붙여 읽어야 합니다. 그래서 주성의 방향성, 보조성의 보강, 사화의 사건성, 공궁이면 대궁과 삼방사정의 대체 신호까지 함께 묶어야 공허한 일반론 대신 현실 상담으로 바뀝니다.`;
  return removeRepeatedZiweiDeepPhrases(next);
}

export function buildZiweiPalaceCategoryReading(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  chartContext: ZiweiDeepChart,
): ZiweiPalaceCategoryReading {
  const signals = buildSignalPack(chartContext, palace);
  const baseMeaning = ZIWEI_PALACE_TEMPLATES[palace.id].meaning;
  const starLine = palace.isEmptyMainStarPalace
    ? `${palace.name}은(는) 중심 별이 직접 놓이지 않아, 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}과 연결된 궁 ${signals.triadNames.join(", ")}의 흐름을 함께 봐야 실제 모습이 분명해집니다.`
    : `${palace.name}의 주성 ${signals.mainStars.map(starBadge).join(", ")}이 이 항목의 해석 중심축을 만듭니다.`;
  const supportLine = signals.supportStars.length
    ? `보조 별 ${signals.supportStars.join(", ")}은 디테일을 살려 주고, 긴장 신호 ${signals.minorStars.join(", ")}은 감정 과속을 조절해야 할 지점을 알려 줍니다.`
    : `보조 별의 직접 영향보다 연결된 궁의 상황이 이 항목의 체감도를 좌우합니다.`;
  const transformLine = signals.transformations.length
    ? `변화 신호는 ${signals.transformations.map((item) => `${item.type} ${item.starName}`).join(", ")}로 나타나며, 갑작스러운 단절보다는 익숙한 패턴이 특정 순간에 과해지며 드러나는 경향이 있습니다.`
    : `직접 변화 신호는 약하지만, ${signals.triadNames.join("·")} 쪽의 흐름이 간접적으로 영향을 주기 쉽습니다.`;
  const relationLine = `이 항목을 삶에 적용할 때는 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}과 ${signals.triadNames.join(", ")}의 맥락을 함께 보아야 합니다. 한 곳만 보면 막연해 보일 수 있지만, 연결된 궁까지 같이 보면 실제 선택 기준이 선명해집니다.`;

  return {
    categoryTitle: category.title,
    categoryQuestion: category.question,
    usedSignals: signals.usedSignals.slice(0, 5),
    interpretation: ensureLength([
      `${category.question}`,
      starLine,
      supportLine,
      transformLine,
      `${baseMeaning} 그래서 ${category.title}은 성향 설명에서 멈추지 말고, 실제 선택 기준과 사람·시간·돈의 배분 방식까지 연결해서 읽어야 효과가 있습니다.`,
      relationLine,
    ].join(" "), palace, category),
    opportunity: ensureLength(`${palace.name}의 ${category.title}에서 기회는 ${signals.mainStars.length ? signals.mainStars.map((star) => star.name).join("·") : `${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}의 영향`}가 방향을 잡고 ${signals.triadNames.slice(0, 2).join("·")}이 실행 무대를 보강할 때 커집니다. ${signals.transformations[0] ? `${signals.transformations[0].type} ${signals.transformations[0].starName} 흐름은 이 기회를 실전 구조로 묶어 주는 힘이 됩니다.` : "직접 신호가 약해도 연결된 궁에서 열리는 우회 기회를 활용할 수 있습니다."}`, palace, category),
    caution: ensureLength(`${category.title}을 해석할 때는 ${signals.brightnessSummary} ${signals.minorStars.length ? `특히 ${signals.minorStars.join(", ")}` : "약세 신호"}를 무시하면 안 됩니다. 이 구간은 마음이 급할수록 오판이 커지므로 속도보다 기준 유지가 우선입니다.`, palace, category),
    action: ensureLength(`${category.title} 실전 조언은 ${signals.mainStars[0]?.name || signals.supportStars[0] || "연결 신호"}의 장점을 한 가지 역할로 고정하고, ${signals.triadNames[0] || palace.name}과 연결된 루틴을 주간 일정에 넣는 것입니다. ${signals.transformations[0]?.type === "화기" ? "집중 압력이 강한 흐름은 일정·예산·관계 규칙으로 먼저 묶어야 강점으로 바뀝니다." : signals.transformations[0] ? `${signals.transformations[0].type} 흐름은 기회가 보여도 반복 가능한 구조를 먼저 세우는 편이 안전합니다.` : "직접 변화 신호가 약할수록 결과를 서두르기보다 기준을 먼저 문장으로 고정하세요."}`, palace, category),
  };
}

export function buildZiweiDeepPalaceReading(chart: ZiweiDeepChart, palace: ZiweiPalace): ZiweiDeepPalaceReading {
  const signals = buildSignalPack(chart, palace);
  const categories = PALACE_CATEGORY_SPECS[palace.id].map((category) => buildZiweiPalaceCategoryReading(palace, category, chart));
  return {
    palaceId: palace.id,
    palaceName: ZIWEI_PALACE_NAME[palace.id],
    palaceBranch: palace.earthlyBranch,
    isEmptyPalace: palace.isEmptyMainStarPalace,
    mainStars: signals.mainStars,
    supportStars: palace.auxiliaryStars,
    minorStars: palace.minorStars,
    transformations: signals.transformations,
    brightnessSummary: signals.brightnessSummary,
    oppositePalace: palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId],
    sanFangSiZheng: {
      sourcePalaces: signals.triadNames,
      keyStars: palace.sanFangSiZheng.mainStars,
      summary: `연결된 궁 ${signals.triadNames.join(", ")}과 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}을 함께 볼 때 ${palace.name}의 실제 흐름이 선명해집니다.`,
    },
    categories,
    summary: removeRepeatedZiweiDeepPhrases(`${ZIWEI_PALACE_TEMPLATES[palace.id].meaning} ${signals.brightnessSummary}`),
    practicalAdvice: unique(categories.map((category) => category.action), 5),
  };
}

export function buildZiweiDeepPalaceText(reading: ZiweiDeepPalaceReading): string {
  return removeRepeatedZiweiDeepPhrases(
    reading.categories
      .map((category, index) => [
        `${index + 1}. ${category.categoryTitle}`,
        `질문: ${category.categoryQuestion}`,
        `해석 신호: ${category.usedSignals.join(" / ")}`,
        category.interpretation,
        `기회: ${category.opportunity}`,
        `주의: ${category.caution}`,
        `실행: ${category.action}`,
      ].join("\n"))
      .join("\n\n"),
  );
}

export function validateZiweiDeepReading(reading: ZiweiDeepChapter): ValidationResult {
  const issues: string[] = [];
  const debugValidation = validateNoZiweiDebugPhrases(`${reading.title}\n${reading.summary.join(" ")}\n${reading.fullText}`);
  issues.push(...debugValidation.issues);
  if (reading.palaceId) {
    if (!reading.palaceReading) {
      issues.push("궁별 상세 데이터 누락");
    } else {
      if (reading.palaceReading.categories.length < 8) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 수 부족`);
      }
      reading.palaceReading.categories.forEach((category) => {
        if (category.interpretation.length < 250) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 해석 길이 부족`);
        }
        if ((category.usedSignals || []).length < 2) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 실제 신호 반영 부족`);
        }
      });
      if (reading.palaceReading.isEmptyPalace && !reading.palaceReading.oppositePalace) {
        issues.push(`${reading.palaceReading.palaceName} 공궁 보완 해석 누락`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}