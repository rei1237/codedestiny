import type {
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseConsultResponse,
  FortuneTeaSajuSnapshot,
  FortuneTeaTarotSpreadCard,
  FortuneTeaTarotSnapshot,
  TeaHouseEmotionTone,
} from "../data/consult";
import { getTenGodMeta } from "../data/tenGods";
import { drawMajorArcana, drawTarotOrientation, getTarotCardById, getTarotCounselProfile, hashTeaHouseSeed, type TarotOrientation } from "../data/tarotCards";
import { getTeaHouseCupById } from "../data/teaCups";
import { buildFortuneTeaPrompt } from "./buildFortuneTeaPrompt";
import { buildSajuResultSection, buildFortuneTeaSajuSnapshot } from "./sajuAdapter";
import { buildFortuneTeaSukuyoCompatibility } from "./sukuyoCompatibilityAdapter";
import { buildFortuneTeaTarotSnapshot, buildFortuneTeaTarotSpreadCards, normalizeFortuneTeaTarotSpread } from "./tarotAdapter";
import { ensureConsultResultConsistency } from "./validateConsultResult";

function compactText(value: string, fallback: string) {
  const text = value.trim().replace(/\s+/g, " ");
  return text || fallback;
}

function displayName(value: string) {
  const name = compactText(value, "손님");
  if (name === "손님" || name.endsWith("님")) return name;
  return `${name}님`;
}

function hasFinalConsonant(value: string) {
  const chars = Array.from(value.trim());
  const code = chars[chars.length - 1]?.codePointAt(0) || 0;
  return code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : false;
}

function subjectParticle(value: string) {
  return hasFinalConsonant(value) ? "이" : "가";
}

function objectParticle(value: string) {
  return hasFinalConsonant(value) ? "을" : "를";
}

function summarize(value: string, maxLength: number) {
  const text = compactText(value, "아직 말이 되지 못한 마음");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function seededValue(seed: string, min: number, max: number) {
  const hash = hashTeaHouseSeed(seed);
  return min + (hash % (max - min + 1));
}

function orientationLabel(orientation: TarotOrientation) {
  return orientation === "upright" ? "정방향" : "역방향";
}

function emotion(label: string, value: number, description: string, tone: TeaHouseEmotionTone) {
  return { label, value, description, tone };
}

type TarotQuestionType =
  | "reunion"
  | "love"
  | "theirMind"
  | "contact"
  | "relationship"
  | "crush"
  | "breakupHealing"
  | "career"
  | "money"
  | "path"
  | "people"
  | "daily"
  | "choice"
  | "lettingGo";

function detectTarotQuestionType(request: FortuneTeaHouseConsultRequest): TarotQuestionType {
  const source = `${request.selectedTeaCupTopic} ${request.concernTopic || ""} ${request.question}`.toLowerCase();
  if (/재회|다시\s*만|전남|전여|헤어진|헤어졌|돌아오|붙잡/.test(source)) return "reunion";
  if (/상대.*마음|속마음|그 사람.*생각|나를.*어떻게/.test(source)) return "theirMind";
  if (/연락|카톡|문자|dm|디엠|답장|읽씹|안읽씹/.test(source)) return "contact";
  if (/썸|짝사랑|호감|고백/.test(source)) return source.includes("짝사랑") ? "crush" : "love";
  if (/이별|정리|잊|놓아|마음\s*정리|회복/.test(source)) return source.includes("정리") || source.includes("놓아") ? "lettingGo" : "breakupHealing";
  if (/관계|연애|사랑|인연/.test(source)) return "relationship";
  if (/일|직장|사업|커리어|이직|진로/.test(source)) return source.includes("진로") ? "path" : "career";
  if (/돈|금전|재물|수입|지출|투자/.test(source)) return "money";
  if (/인간관계|친구|동료|가족/.test(source)) return "people";
  if (/오늘|하루|운세/.test(source)) return "daily";
  if (/선택|고민|어느|갈까|할까/.test(source)) return "choice";
  return "love";
}

function tarotQuestionTypeLabel(type: TarotQuestionType) {
  const labels: Record<TarotQuestionType, string> = {
    reunion: "재회",
    love: "연애",
    theirMind: "상대방 마음",
    contact: "연락운",
    relationship: "관계 지속 가능성",
    crush: "짝사랑",
    breakupHealing: "이별 후 회복",
    career: "일·직장",
    money: "돈·재물",
    path: "진로",
    people: "인간관계",
    daily: "오늘의 운세",
    choice: "선택 고민",
    lettingGo: "마음 정리",
  };
  return labels[type];
}

function hasContactBoundarySignal(request: FortuneTeaHouseConsultRequest) {
  return /차단|거절|싫다|연락하지 말|그만하|불편|무섭|신고|스토킹|피해/.test(`${request.question} ${request.concernTopic || ""}`);
}

function clampPercent(value: number) {
  return Math.max(8, Math.min(96, Math.round(value)));
}

type TarotCounsel = ReturnType<typeof getTarotCounselProfile>;

type TarotTeaCategoryId =
  | "lotus-moon"
  | "honey-peach"
  | "star-black-tea"
  | "gold-cinnamon"
  | "white-lotus-healing"
  | "black-moon-brown-rice";

type TarotGaugeRule = {
  label: string;
  tone: TeaHouseEmotionTone;
  min: number;
  max: number;
  basis: string;
};

type TarotPlanItem = {
  id: string;
  title: string;
  subtitle: string;
  result: string;
  caution: string;
};

type TarotTeaCategoryRule = {
  id: TarotTeaCategoryId;
  aliases: string[];
  category: string;
  subtitle: string;
  openingLens: string;
  cardTranslation: string;
  innerLens: string;
  patternLens: string;
  possibilityLens: string;
  closingRisk: string;
  actionQuestion: string;
  messageGuide: string;
  forbiddenActions: string[];
  planLabel: string;
  planItems: TarotPlanItem[];
  gauges: TarotGaugeRule[];
  requiredTerms: string[];
  closingMotif: string;
};

const tarotTeaCategoryRules: Record<TarotTeaCategoryId, TarotTeaCategoryRule> = {
  "lotus-moon": {
    id: "lotus-moon",
    aliases: ["달빛 연꽃차", "연애", "재회", "전여친", "전남친", "연락"],
    category: "연애 · 재회",
    subtitle: "아직 닫히지 않은 마음의 가장자리",
    openingLens: "미련과 실제 가능성을 나누어, 다시 가까워져도 덜 다치는 조건을 찾는 자리",
    cardTranslation: "이 카드는 관계가 다시 열리는지보다, 예전 방식 그대로 다시 닿아도 괜찮은지를 먼저 묻습니다.",
    innerLens: "손님의 마음은 확인하고 싶은 쪽으로 달려가지만, 현실의 신호는 말의 길이와 속도를 낮추라고 가리킵니다.",
    patternLens: "두 사람 사이에서는 끝난 줄 알았던 말이 다시 돌아오거나, 한쪽이 답을 받아내려 할수록 다른 쪽이 더 물러나는 패턴이 비칩니다.",
    possibilityLens: "재회 가능성은 완전히 닫혔다기보다, 상대의 경계를 존중하고 과거 갈등을 반복하지 않을 새 기준이 생길 때만 좁게 열립니다.",
    closingRisk: "장문 연락, 답 요구, SNS 확인, 침묵을 시험하는 메시지는 가능성을 여는 행동이 아니라 관계의 압력을 높이는 행동입니다.",
    actionQuestion: "지금 연락해도 되는가",
    messageGuide: "보낸다면 감정 호소가 아니라 부담 없는 확인이어야 해요. 예시는 '부담 주고 싶진 않아. 언젠가 차분히 이야기할 수 있으면 알려줘.' 정도가 안전합니다.",
    forbiddenActions: ["장문으로 지난 감정을 모두 설명하기", "답이 없다는 이유로 다시 확인하기", "SNS나 주변 사람을 통해 상대의 마음을 캐내기"],
    planLabel: "7일 관계 정리/접근 플랜",
    planItems: [
      { id: "day-1", title: "1일차", subtitle: "연락문을 보내지 말고 먼저 식히기", result: "하고 싶은 말을 메모장에만 적고 보내지 마세요. 오늘 떠오르는 문장은 상대에게 보여 줄 문장이 아니라, 손님 마음이 어디에서 제일 아픈지 확인하는 문장입니다.", caution: "밤에 쓴 문장은 다음 날 낮에 다시 읽기 전까지 보내지 마세요." },
      { id: "day-2-3", title: "2~3일차", subtitle: "미련과 가능성 분리하기", result: "상대가 실제로 보인 말과 행동, 내가 상상한 장면을 두 줄로 나누세요. 가능성은 상상보다 확인된 신호 위에서만 봅니다.", caution: "좋았던 기억만 근거로 결론을 만들지 마세요." },
      { id: "day-4-5", title: "4~5일차", subtitle: "짧은 확인 문장만 남기기", result: "연락한다면 안부와 대화 가능 여부만 묻고, 관계 결론은 요구하지 않는 편이 좋습니다. 상대에게 선택지를 남기는 문장이 되어야 합니다.", caution: "한 번 보낸 뒤에는 반응을 기다리는 시간까지 계획에 포함하세요." },
      { id: "day-6-7", title: "6~7일차", subtitle: "반응 없는 경우 다시 밀지 않기", result: "답이 없다면 가능성이 사라졌다고 단정하지 말고, 지금 방식은 멈춰야 한다고 읽으세요. 내 리듬을 회복하는 쪽이 다음 문을 남깁니다.", caution: "침묵을 시험하거나 확인 강박으로 두 번째 메시지를 보내지 마세요." },
    ],
    gauges: [
      { label: "기대", tone: "gold", min: 44, max: 76, basis: "재회 질문에서는 원하는 답을 보고 싶은 향이 먼저 올라오지만, 카드의 방향이 조건 확인을 요구합니다." },
      { label: "불안", tone: "purple", min: 50, max: 84, basis: "관계의 침묵이나 거리감이 길어질수록 답을 받아내고 싶은 압력이 커집니다." },
      { label: "미련", tone: "pink", min: 54, max: 88, basis: "끝난 장면을 마음이 아직 받아들이지 못할 때 이 향이 짙어집니다." },
      { label: "망설임", tone: "blue", min: 42, max: 76, basis: "다가가고 싶은 마음과 다시 다치고 싶지 않은 마음이 같은 자리에서 숨을 고릅니다." },
      { label: "회복", tone: "green", min: 34, max: 70, basis: "상대 반응보다 손님의 하루를 되찾을 기준이 생기면 회복의 빛이 올라옵니다." },
    ],
    requiredTerms: ["재회 가능성", "지금 연락", "금지 행동", "7일"],
    closingMotif: "달빛 연꽃차의 가장자리에 남은 향",
  },
  "honey-peach": {
    id: "honey-peach",
    aliases: ["꿀복숭아차", "썸", "인연", "호감", "짝사랑"],
    category: "썸 · 인연",
    subtitle: "아직 이름 붙지 않은 설렘",
    openingLens: "상대 마음을 확정하지 않고, 관찰 가능한 신호와 다가가도 좋은 속도를 읽는 자리",
    cardTranslation: "이 카드는 호감의 정답을 맞히기보다, 아직 무르익는 중인 온도를 망치지 않는 접근 방식을 묻습니다.",
    innerLens: "손님의 설렘은 빨리 이름 붙이고 싶어 하지만, 지금은 상대의 작은 반응을 과장하지 않고 리듬을 보는 편이 좋습니다.",
    patternLens: "가까워지고 싶은 마음이 앞서면 확인 질문이 늘고, 확인이 늘수록 자연스러운 호흡이 어색해지는 패턴이 비칩니다.",
    possibilityLens: "인연이 커지는 가능성은 고백의 속도보다 편안한 반복, 짧은 대화, 다음 만남의 명분이 자연스럽게 생길 때 열립니다.",
    closingRisk: "호감 확인을 재촉하거나, 반응 하나를 고백의 증거처럼 붙잡거나, 일부러 질투를 유발하는 행동은 설렘의 온도를 낮춥니다.",
    actionQuestion: "연락과 대화의 좋은 리듬",
    messageGuide: "오늘 보내기 좋은 문장은 가볍고 닫히지 않아야 해요. 예시는 '오늘 이야기한 거 생각나서 웃었어. 다음에 또 편하게 얘기하자.' 정도입니다.",
    forbiddenActions: ["상대 반응을 호감의 확정 증거로 몰아가기", "너무 빠른 고백으로 상대의 도망갈 길을 없애기", "답장 속도만으로 마음을 판정하기"],
    planLabel: "7일 썸 리듬 플랜",
    planItems: [
      { id: "day-1", title: "1일차", subtitle: "호감 신호를 과장하지 않기", result: "상대가 실제로 한 말, 먼저 보낸 연락, 만남에서 보인 태도를 세 줄로만 적어보세요. 설렘은 살리고 판정은 늦추는 날입니다.", caution: "상상한 장면을 근거로 마음을 확정하지 마세요." },
      { id: "day-2-3", title: "2~3일차", subtitle: "가벼운 대화 명분 만들기", result: "상대가 부담 없이 답할 수 있는 주제를 하나만 고르세요. 질문은 짧고, 대화가 이어지지 않아도 어색하지 않은 문장이 좋습니다.", caution: "대답을 끌어내려고 질문을 여러 개 쌓지 마세요." },
      { id: "day-4-5", title: "4~5일차", subtitle: "다음 만남의 작은 문 열기", result: "공통 관심사나 지난 대화에서 자연스럽게 이어지는 만남 명분을 하나 제안해 볼 수 있습니다. 핵심은 가볍게, 거절해도 어색하지 않게입니다.", caution: "상대가 망설이면 바로 해명을 길게 붙이지 마세요." },
      { id: "day-6-7", title: "6~7일차", subtitle: "온도 차이 확인하기", result: "상대가 먼저 이어 오는지, 질문을 되돌려 주는지, 만남 제안에 여지를 두는지 보세요. 답보다 리듬이 더 정확한 신호가 됩니다.", caution: "일주일 안에 관계 이름을 정하려고 밀어붙이지 마세요." },
    ],
    gauges: [
      { label: "설렘", tone: "pink", min: 52, max: 86, basis: "복숭아빛 질문에서는 작은 반응도 마음 안에서 크게 번질 수 있습니다." },
      { label: "호기심", tone: "gold", min: 38, max: 72, basis: "카드가 보여주는 매력은 확정된 호감보다 서로를 더 알고 싶어지는 작은 관심에서 읽힙니다." },
      { label: "조심스러움", tone: "blue", min: 40, max: 76, basis: "아직 이름 붙지 않은 관계일수록 속도를 살피려는 마음이 함께 올라옵니다." },
      { label: "기대", tone: "green", min: 44, max: 78, basis: "반복되는 작은 대화가 생기면 기대의 향이 조금 더 선명해집니다." },
      { label: "타이밍", tone: "purple", min: 36, max: 70, basis: "카드의 방향은 지금 당장 확정하기보다 다음 만남의 리듬을 보라고 합니다." },
    ],
    requiredTerms: ["호감", "설렘", "인연", "7일"],
    closingMotif: "꿀복숭아차의 달콤한 김",
  },
  "star-black-tea": {
    id: "star-black-tea",
    aliases: ["별가루 홍차", "진로", "사업", "직장", "이직", "창업"],
    category: "진로 · 사업",
    subtitle: "막막한 길 위에 뜬 작은 별",
    openingLens: "막연한 성공 예언이 아니라 방향, 준비도, 실행 순서, 리스크를 나누어 보는 자리",
    cardTranslation: "이 카드는 운이 열린다는 선언보다, 지금 손에 든 별빛을 어느 길에 먼저 써야 하는지를 묻습니다.",
    innerLens: "손님의 불안은 미래 전체를 한 번에 보려 하지만, 카드는 지금 확인 가능한 다음 실험부터 좁히라고 가리킵니다.",
    patternLens: "막막할수록 선택지를 크게 벌려 놓고도 실행은 늦어지는 패턴이 비칩니다. 별가루 홍차는 큰 결론보다 작은 검증을 먼저 세웁니다.",
    possibilityLens: "확장 가능성은 준비된 재료, 검증 가능한 고객/시장 신호, 손님이 반복해서 해낼 수 있는 실행 리듬이 맞을 때 열립니다.",
    closingRisk: "기세만 믿고 확장하거나, 계약·비용·시간표를 확인하지 않은 채 방향을 바꾸는 행동은 길 위의 별을 흐리게 만듭니다.",
    actionQuestion: "이번 주 실행 우선순위",
    messageGuide: "오늘의 한 문장은 누군가에게 보내는 고백보다 스스로에게 남기는 기준에 가깝습니다. '이번 주에는 확장보다 검증을 먼저 한다.'",
    forbiddenActions: ["성공 예감만으로 비용을 먼저 키우기", "준비되지 않은 확장을 발표하기", "리스크 체크 없이 계약이나 약속을 확정하기"],
    planLabel: "14일 실행 플랜",
    planItems: [
      { id: "day-1-2", title: "1~2일차", subtitle: "막막함의 정체 나누기", result: "불안, 자금, 실력, 시장, 체력 중 어디가 가장 막히는지 하나만 고르세요. 막막함을 한 덩어리로 두면 어떤 카드도 길을 선명하게 비추기 어렵습니다.", caution: "모든 문제를 한 번에 해결하려 하지 마세요." },
      { id: "day-3-5", title: "3~5일차", subtitle: "작은 실험 설계하기", result: "가장 돈과 시간이 적게 드는 검증 하나를 정하세요. 문의 한 번, 샘플 한 개, 포트폴리오 한 장처럼 결과가 보이는 실험이어야 합니다.", caution: "반응을 보기 전에 완성도를 과하게 끌어올리지 마세요." },
      { id: "day-6-10", title: "6~10일차", subtitle: "리스크 체크리스트 쓰기", result: "계약, 비용, 일정, 체력, 협업자, 고객 반응을 표로 나누세요. 카드는 손님의 가능성만큼 놓치기 쉬운 구멍도 함께 비춥니다.", caution: "좋은 말만 해 주는 사람의 반응만 근거로 삼지 마세요." },
      { id: "day-11-14", title: "11~14일차", subtitle: "확장 또는 보류 결정하기", result: "실험 결과가 숫자나 실제 반응으로 남았다면 다음 단계로 넓히고, 반응이 흐리다면 방향을 다듬으세요. 보류도 실패가 아니라 별을 더 선명하게 닦는 시간입니다.", caution: "자존심 때문에 이미 어긋난 방향을 계속 밀지 마세요." },
    ],
    gauges: [
      { label: "방향감", tone: "gold", min: 40, max: 78, basis: "카드의 상징이 길 위에서 먼저 비추는 것은 성공 보장보다 방향의 윤곽입니다." },
      { label: "막막함", tone: "purple", min: 46, max: 82, basis: "선택지가 클수록 손님 마음은 전체를 한꺼번에 해결하려는 압박을 느낄 수 있습니다." },
      { label: "실행력", tone: "green", min: 38, max: 76, basis: "정방향/역방향의 차이는 생각이 행동으로 내려오는 속도를 보여줍니다." },
      { label: "리스크", tone: "blue", min: 34, max: 72, basis: "준비되지 않은 확장과 확인된 기회의 차이를 볼 때 이 게이지가 올라갑니다." },
      { label: "가능성", tone: "pink", min: 42, max: 80, basis: "작은 검증이 실제 반응으로 이어질 여지를 카드가 함께 비춥니다." },
    ],
    requiredTerms: ["진로", "사업", "리스크", "14일"],
    closingMotif: "별가루 홍차 위의 작은 별",
  },
  "gold-cinnamon": {
    id: "gold-cinnamon",
    aliases: ["황금 계피차", "황금 커피차", "금전운", "돈", "수입", "지출", "투자"],
    category: "금전운",
    subtitle: "현실의 온기를 되찾는 금빛 향",
    openingLens: "돈이 들어온다는 예언보다 수입, 지출, 누수, 회복 루틴을 현실적으로 나누어 보는 자리",
    cardTranslation: "이 카드는 큰돈의 약속보다 지금 손에서 새는 금빛과 붙잡을 수 있는 기회를 동시에 보여줍니다.",
    innerLens: "손님의 불안은 당장 결과를 확인하고 싶어 하지만, 금전운에서는 감정의 속도보다 기록과 기준이 더 정확한 길잡이입니다.",
    patternLens: "불안할수록 돈을 더 움켜쥐거나, 반대로 작은 위로를 사느라 지출이 새는 패턴이 비칩니다.",
    possibilityLens: "회복 가능성은 특정 상품이나 한 번의 행운보다, 이번 달 돈이 새는 구멍을 막고 수입화 가능한 행동을 반복할 때 열립니다.",
    closingRisk: "특정 종목, 코인, 고수익 약속, 충동 결제, 빚으로 불안을 덮는 선택은 카드가 경계하는 금빛의 그림자입니다.",
    actionQuestion: "이번 달 돈 관리 기준",
    messageGuide: "오늘 붙잡을 문장은 '새 수입을 기다리기 전에 새는 돈부터 이름 붙인다.'입니다.",
    forbiddenActions: ["불안해서 충동 결제하기", "확정 수익처럼 들리는 말에 기대어 돈을 맡기기", "이번 달 고정 지출을 보지 않고 새 계획부터 세우기"],
    planLabel: "30일 금전 회복 플랜",
    planItems: [
      { id: "day-1-3", title: "1~3일차", subtitle: "돈이 새는 자리 표시하기", result: "최근 지출을 고정비, 위로비, 충동비, 필요투자로 나누세요. 카드는 돈 자체보다 돈을 흘려보내는 마음의 습관을 먼저 비춥니다.", caution: "자책으로 정리하지 말고 항목 이름만 붙이세요." },
      { id: "day-4-10", title: "4~10일차", subtitle: "작은 누수 막기", result: "이번 주 줄일 수 있는 자동결제, 반복 구매, 감정성 소비를 하나만 고르세요. 작게 막은 구멍이 금전 안정감의 첫 온기가 됩니다.", caution: "한 번에 모든 소비를 끊겠다고 세게 조이지 마세요." },
      { id: "day-11-20", title: "11~20일차", subtitle: "수입화 가능한 행동 찾기", result: "손님이 이미 할 수 있는 일 중 돈으로 바뀔 가능성이 있는 행동을 하나 실험하세요. 판매, 제안, 포트폴리오, 견적처럼 실제 반응을 남기는 일이 좋습니다.", caution: "반응이 오기 전부터 큰 비용을 들이지 마세요." },
      { id: "day-21-30", title: "21~30일차", subtitle: "현실 기준 고정하기", result: "수입 예상, 고정 지출, 남길 돈, 쓸 돈을 한 장에 적으세요. 금전운은 막연한 기대가 아니라 반복 가능한 기준에서 살아납니다.", caution: "누군가의 수익담을 내 기준으로 착각하지 마세요." },
    ],
    gauges: [
      { label: "안정감", tone: "gold", min: 36, max: 76, basis: "금전 질문에서는 손에 남는 돈의 감각이 마음의 안정과 곧장 이어집니다." },
      { label: "소비 충동", tone: "purple", min: 38, max: 82, basis: "불안이 커질수록 작은 결제가 위로처럼 느껴질 수 있어 카드가 누수를 비춥니다." },
      { label: "회복력", tone: "green", min: 38, max: 78, basis: "기록과 기준을 세울수록 돈의 흐름을 되찾는 힘이 올라옵니다." },
      { label: "기회감", tone: "pink", min: 34, max: 72, basis: "카드가 보여주는 기회는 특정 투자보다 손님이 실제로 움직일 수 있는 수익화 행동에 가깝습니다." },
      { label: "현실감", tone: "blue", min: 44, max: 84, basis: "지출, 계약, 일정처럼 확인 가능한 항목을 볼수록 이 향이 선명해집니다." },
    ],
    requiredTerms: ["금전", "소비", "30일", "투자"],
    closingMotif: "황금 계피차의 따뜻한 금빛",
  },
  "white-lotus-healing": {
    id: "white-lotus-healing",
    aliases: ["백련 치유차", "마음회복", "마음 회복", "불안", "자존감", "지쳐"],
    category: "마음회복",
    subtitle: "스스로에게 돌아오는 조용한 숨",
    openingLens: "예언보다 회복, 정리, 자기 돌봄, 안전한 감정 루틴을 먼저 찾는 자리",
    cardTranslation: "이 카드는 손님을 더 몰아붙이는 답보다, 지금 마음이 어디에서 너무 오래 버티고 있는지를 보여줍니다.",
    innerLens: "손님의 마음은 이미 충분히 애쓰고 있어서, 오늘 필요한 건 더 강해지는 일이 아니라 덜 해치는 방식으로 숨을 되찾는 일입니다.",
    patternLens: "지칠수록 스스로에게 차갑게 말하고, 그 차가운 말이 다시 피로를 키우는 자기 소모 패턴이 비칩니다.",
    possibilityLens: "회복은 단번에 환해지는 결론보다, 오늘 줄일 말과 오늘 허락할 쉼을 나누는 데서 천천히 열립니다.",
    closingRisk: "감정을 억지로 눌러 없애려 하거나, 스스로를 탓하는 문장을 반복하거나, 위험한 신호를 혼자 견디려는 행동은 멈춰야 합니다.",
    actionQuestion: "오늘 바로 가능한 회복 행동",
    messageGuide: "나에게 해도 되는 말은 '나는 지금 망가진 게 아니라 너무 오래 버틴 중이야.'입니다.",
    forbiddenActions: ["스스로를 몰아붙이는 말 반복하기", "쉬어야 하는 신호를 게으름으로 부르기", "위험한 생각이 올라오는데 혼자만 견디기"],
    planLabel: "7일 회복 루틴",
    planItems: [
      { id: "day-1", title: "1일차", subtitle: "몸의 신호 먼저 확인하기", result: "잠, 식사, 물, 움직임 중 가장 무너진 하나만 확인하세요. 마음의 회복은 몸이 버티는 바닥에서 시작됩니다.", caution: "오늘의 상태를 성격 문제로 몰아가지 마세요." },
      { id: "day-2-3", title: "2~3일차", subtitle: "자기 비난 문장 멈추기", result: "자주 반복하는 차가운 문장을 하나 적고, 그 옆에 덜 아픈 표현을 하나 붙이세요. 말이 바뀌면 마음의 향도 조금 누그러집니다.", caution: "억지로 밝은 말을 만들 필요는 없습니다." },
      { id: "day-4-5", title: "4~5일차", subtitle: "작은 회복 행동 고정하기", result: "10분 산책, 따뜻한 물, 알림 끄기, 방 한 곳 정리처럼 몸이 바로 느끼는 행동을 고르세요. 회복은 큰 결심보다 반복 가능한 숨입니다.", caution: "한 번 못 했다고 루틴 전체를 버리지 마세요." },
      { id: "day-6-7", title: "6~7일차", subtitle: "도움을 요청할 신호 정하기", result: "혼자 감당하기 어려운 생각, 수면 붕괴, 식사 어려움, 위험한 충동이 오면 연락할 사람과 도움 경로를 적어두세요.", caution: "위험 신호가 선명하면 운세처럼 넘기지 말고 바로 도움을 요청하세요." },
    ],
    gauges: [
      { label: "피로", tone: "purple", min: 50, max: 88, basis: "회복 질문에서는 마음이 이미 오래 버틴 흔적이 먼저 향으로 올라옵니다." },
      { label: "자책", tone: "blue", min: 42, max: 80, basis: "카드의 그림자는 스스로에게 돌리는 차가운 말을 보여줍니다." },
      { label: "안정", tone: "gold", min: 28, max: 68, basis: "몸의 리듬과 주변 환경이 정돈될수록 안정의 향이 천천히 올라옵니다." },
      { label: "회복", tone: "green", min: 34, max: 76, basis: "작게 반복할 수 있는 돌봄이 생기면 회복의 결이 살아납니다." },
      { label: "자기돌봄", tone: "pink", min: 30, max: 72, basis: "손님이 자신에게 해도 되는 말을 허락할수록 부드러운 향이 남습니다." },
    ],
    requiredTerms: ["회복", "자기돌봄", "7일"],
    closingMotif: "백련 치유차의 조용한 숨",
  },
  "black-moon-brown-rice": {
    id: "black-moon-brown-rice",
    aliases: ["흑월 현미차", "이별", "위기", "붙잡", "헤어", "끝내"],
    category: "이별 · 위기",
    subtitle: "끝내야 할 것과 지켜야 할 것 사이",
    openingLens: "붙잡을지 끝낼지보다, 안전과 경계와 현실 신호를 먼저 확인하는 자리",
    cardTranslation: "이 카드는 손님을 겁주기보다, 더 붙잡을수록 상처가 커지는 지점과 아직 지켜야 할 기준을 분리합니다.",
    innerLens: "손님의 마음은 잃고 싶지 않은 쪽으로 기울지만, 위기 상담에서는 마음의 크기보다 안전한 거리와 반복 패턴이 먼저입니다.",
    patternLens: "갈등이 커질수록 말이 날카로워지거나, 반대로 두려움 때문에 무조건 붙잡으려는 패턴이 비칩니다.",
    possibilityLens: "관계 회복 가능성은 서로의 경계가 지켜지고 위협, 압박, 통제가 멈출 때만 작게 남습니다. 그 조건이 없으면 정리가 손님을 지키는 길입니다.",
    closingRisk: "차단을 우회하거나, 반복해서 붙잡거나, 위협적인 말을 던지거나, 상대의 거절을 시험하는 행동은 즉시 멈춰야 합니다.",
    actionQuestion: "지금 대화해도 되는가",
    messageGuide: "위험 신호나 거절이 있었다면 보낼 문장을 만들지 않는 편이 맞아요. 대화가 가능하더라도 '지금은 서로 흥분한 것 같아. 시간을 두고 필요한 말만 정리하자.'처럼 압력을 낮춰야 합니다.",
    forbiddenActions: ["차단을 우회해서 연락하기", "마지막이라며 반복해서 붙잡기", "분노로 상대를 시험하거나 위협적인 말을 하기"],
    planLabel: "72시간 안정 플랜",
    planItems: [
      { id: "hour-0-12", title: "0~12시간", subtitle: "즉시 압력 낮추기", result: "연락, 확인, 추궁을 멈추고 몸의 긴장을 먼저 낮추세요. 위기에서는 첫 반응이 관계의 방향을 크게 바꿉니다.", caution: "화가 난 상태에서 보내는 문장은 대부분 손님을 더 불리하게 만듭니다." },
      { id: "hour-12-24", title: "12~24시간", subtitle: "위험 신호 체크하기", result: "차단, 거절, 두려움, 통제, 위협, 반복 갈등이 있었는지 적으세요. 하나라도 선명하면 설득보다 경계가 먼저입니다.", caution: "상대의 거절을 사랑의 시험처럼 해석하지 마세요." },
      { id: "hour-24-48", title: "24~48시간", subtitle: "지킬 것과 놓을 것 나누기", result: "관계에서 지켜야 할 내 안전, 존엄, 생활 리듬을 먼저 쓰고, 붙잡고 싶은 감정은 그 다음에 놓으세요.", caution: "상처를 줄이는 기준 없이 재대화를 시작하지 마세요." },
      { id: "hour-48-72", title: "48~72시간", subtitle: "대화 여부 결정하기", result: "서로 경계를 지킬 수 있고 압박 없는 짧은 대화가 가능할 때만 문을 여세요. 그 조건이 없으면 정리가 더 안전한 선택입니다.", caution: "불안해서 문을 여는 것과 실제로 대화가 가능한 것은 다릅니다." },
    ],
    gauges: [
      { label: "긴장", tone: "purple", min: 54, max: 90, basis: "위기 질문에서는 마음보다 몸의 경계 신호가 먼저 올라옵니다." },
      { label: "상처", tone: "pink", min: 46, max: 86, basis: "카드의 그림자는 반복된 말과 행동이 남긴 자국을 비춥니다." },
      { label: "경계", tone: "blue", min: 48, max: 88, basis: "지켜야 할 거리와 넘지 말아야 할 선이 선명할수록 이 향이 강해집니다." },
      { label: "정리 필요", tone: "gold", min: 38, max: 82, basis: "계속 붙잡는 마음과 실제 안전 조건을 나눌 때 올라오는 게이지입니다." },
      { label: "안전감", tone: "green", min: 22, max: 66, basis: "압박이 줄고 도움을 요청할 길이 보일수록 안전감이 천천히 회복됩니다." },
    ],
    requiredTerms: ["위기", "경계", "72시간", "금지 행동"],
    closingMotif: "흑월 현미차의 어두운 고소함",
  },
};

function resolveTarotTeaCategoryRule(request: FortuneTeaHouseConsultRequest): TarotTeaCategoryRule {
  const id = request.selectedTeaCupId as TarotTeaCategoryId;
  if (tarotTeaCategoryRules[id]) return tarotTeaCategoryRules[id];
  const source = `${request.selectedTeaCupId} ${request.selectedTeaCupName} ${request.selectedTeaCupTopic} ${request.concernTopic || ""} ${request.question}`.toLowerCase();
  return Object.values(tarotTeaCategoryRules).find((rule) => rule.aliases.some((alias) => source.includes(alias.toLowerCase()))) || tarotTeaCategoryRules["lotus-moon"];
}

function isRelationshipTarotCategory(rule: TarotTeaCategoryRule) {
  return rule.id === "lotus-moon" || rule.id === "honey-peach" || rule.id === "black-moon-brown-rice";
}

function buildTarotEmotionAnalysis(params: {
  profile: TarotCounsel;
  questionType: TarotQuestionType;
  rule: TarotTeaCategoryRule;
  seed: string;
  promptSignature: number;
}) {
  const { profile, rule, seed, promptSignature } = params;
  const isReversed = profile.orientation === "reversed";
  return rule.gauges.map((gauge, index) => {
    const value = clampPercent(seededValue(`${seed}:${promptSignature}:tarot:${rule.id}:${gauge.label}:${index}`, gauge.min, gauge.max)
      + (isReversed && (gauge.tone === "purple" || gauge.tone === "blue") ? 6 : 0)
      + (profile.cardId === "major_16_tower" && rule.id === "black-moon-brown-rice" ? 8 : 0)
      + (profile.cardId === "major_19_sun" && gauge.tone === "gold" ? 6 : 0));
    const cardBasis = [
      profile.yesNoNuance,
      profile.relationshipShadow,
      profile.emotionalPattern,
      profile.timingNuance,
      profile.coreSymbol,
    ][index] || profile.advice;
    const openings = [
      `이 ${gauge.label} 수치는 상대방의 속마음이 아니라 ${rule.category} 질문에서 올라온 손님의 마음의 향이에요.`,
      `${gauge.label}의 향은 상대가 무엇을 반드시 느낀다는 뜻이 아니라, 손님 마음이 어디에 민감하게 반응하는지 보여줍니다.`,
      `킁... ${gauge.label}은 지금 질문을 붙잡는 손님의 정서 기류를 카드 쪽에서 맡아 본 값에 가깝습니다.`,
      `${rule.subtitle} 안에서 ${gauge.label}은 행동을 정하기 전 확인해야 할 마음의 농도예요.`,
      `${gauge.label}은 결과 예언이 아니라 손님이 오늘 어느 부분을 먼저 돌봐야 하는지 알려 주는 향입니다.`,
    ];
    const endings = [
      "그래서 이 값은 결론표가 아니라 지금 마음이 어느 방향으로 기울었는지 보는 작은 향표로만 읽어야 합니다.",
      "이 숫자가 높아도 상대의 확정 답은 아니며, 손님이 반응을 해석할 때 조심해야 할 지점을 알려줍니다.",
      "연이는 이 향을 근거로 오늘 말의 속도와 행동의 크기를 조금 줄여 보라고 읽어요.",
      "수치보다 중요한 건 이 마음을 바로 행동으로 밀지 않고, 현실 신호와 맞춰 보는 일입니다.",
      "이 향은 내일 달라질 수 있지만, 오늘 손님이 덜 다치게 움직일 기준은 충분히 비춥니다.",
    ];
    return emotion(
      gauge.label,
      value,
      `${openings[index] || openings[0]} ${profile.nameKr} ${orientationLabel(profile.orientation)}에서는 ${cardBasis} ${gauge.basis} ${endings[index] || endings[0]}`,
      gauge.tone,
    );
  });
}

function buildTarotReading(profile: TarotCounsel, questionType: TarotQuestionType, teaCupName: string, rule: TarotTeaCategoryRule) {
  const direction = orientationLabel(profile.orientation);
  const orientationMeaning = profile.orientation === "upright" ? profile.uprightMeaning : profile.reversedMeaning;
  const questionLabel = tarotQuestionTypeLabel(questionType);
  const relationMeaning = questionType === "reunion" ? profile.reunionMeaning : isRelationshipTarotCategory(rule) ? profile.loveMeaning : profile.advice;
  return `${profile.nameKr} ${direction}은 ${orientationMeaning}의 결로 지금 질문을 비춥니다. ${teaCupName} 위에서 이 카드는 ${profile.coreSymbol}을 먼저 펼치고, ${rule.category}의 현실 질문 안에서는 ${rule.cardTranslation} ${questionLabel} 질문에 닿으면 ${relationMeaning} ${profile.yeoniMetaphor} 오늘은 결론을 단정하기보다 ${rule.actionQuestion}을 서두르기 전에 확인할 신호와 멈출 선을 나누어 보아야 합니다.`;
}

function buildTarotSynthesis(profile: TarotCounsel, questionType: TarotQuestionType, teaCupName: string, rule: TarotTeaCategoryRule): FortuneTeaHouseConsultResponse["synthesis"] {
  const direction = orientationLabel(profile.orientation);
  const questionLabel = tarotQuestionTypeLabel(questionType);
  return {
    title: `${rule.category} 카드가 연 첫 장면`,
    summary: `${teaCupName}은 ${questionLabel} 질문을 ${rule.innerLens} ${profile.nameKr} ${direction}은 ${profile.emotionalPattern} 지금은 마음이 원하는 속도와 현실에서 움직여도 되는 속도를 나누어야 합니다.`,
    sajuTarotBridge: `${rule.patternLens} 카드의 그림자는 ${profile.relationshipShadow} 쪽으로 비치지만, 상대의 마음을 확정하지는 않습니다. 오늘의 기준은 "${rule.actionQuestion}"이며, 가능성은 확인할 조건과 멈출 행동을 분리할 때 더 선명해집니다.`,
  };
}

function buildTarotYeoniReading(params: {
  request: FortuneTeaHouseConsultRequest;
  profile: TarotCounsel;
  questionType: TarotQuestionType;
  teaCupName: string;
  rule: TarotTeaCategoryRule;
}) {
  const { request, profile, teaCupName, rule } = params;
  const boundary = hasContactBoundarySignal(request);
  const shouldStopContact = boundary && (rule.id === "lotus-moon" || rule.id === "black-moon-brown-rice");
  const messageExample = shouldStopContact
    ? "상대가 차단이나 거절 의사를 보였다면, 오늘은 보낼 문장을 만들지 않는 편이 맞아요. 멈춤이 예의가 되는 자리입니다."
    : rule.messageGuide;
  return {
    intro: `${teaCupName}의 향에서 가장 크게 흔들리는 지점은 ${rule.innerLens} ${profile.emotionalPattern} 감정이 진하더라도 오늘은 바로 행동으로 옮기기보다 현실 신호를 먼저 살펴야 합니다.`,
    main: `${rule.possibilityLens} ${profile.advice} ${profile.nameKr} ${orientationLabel(profile.orientation)}의 상징은 ${profile.coreSymbol}을 품고 있어, 지금 흐름이 왜 크게 느껴지는지 비춥니다. 가능성은 ${rule.actionQuestion}에 대한 기준이 있을 때 더 분명해집니다.`,
    advice: shouldStopContact
      ? `${rule.actionQuestion}: 이 질문에서는 멈춤이 먼저입니다. 거절이나 불편함의 신호가 있었다면 오늘 할 일은 보내지 않기, 반응을 시험하지 않기, 안전한 거리를 지키기입니다.`
      : `${rule.actionQuestion}: 조건부로 보아야 합니다. ${messageExample} 오늘 해도 되는 행동은 기준 세우기, 짧게 확인하기, 반응이 없을 때 멈출 선을 정하기입니다. 흐름을 거칠게 만드는 행동은 ${profile.avoidAction}`,
    caution: `오늘의 금지 행동은 ${rule.forbiddenActions.join(", ")}입니다. 행동하기 전에는 이 선택이 가능성을 넓히는지, 압력을 높이는지 한 번만 물어보세요.`,
  };
}

function buildTarotChoiceSimulation(profile: TarotCounsel, rule: TarotTeaCategoryRule) {
  return rule.planItems.map((item) => ({
    ...item,
    result: `${item.result} ${[
      `${profile.nameKr} ${orientationLabel(profile.orientation)}의 첫 흐름은 ${profile.timingNuance}`,
      "이 단계에서는 카드의 결론보다 실제로 확인 가능한 반응을 남기는 일이 더 중요합니다.",
      `${profile.nameKr}의 조언은 여기서 ${profile.advice}`,
      "마지막 단계에서는 결과를 재촉하기보다 다음 기준을 손님 쪽에 남기는 편이 안전합니다.",
    ][rule.planItems.indexOf(item)]}`,
    caution: `${item.caution} ${[
      "이 시점의 금지 행동은 마음이 급해져 첫 단계를 건너뛰는 일입니다.",
      "비교와 상상으로 증거를 부풀리면 찻잔의 향이 쉽게 흐려집니다.",
      `카드가 특히 피하라고 하는 그림자는 ${profile.avoidAction}`,
      "계획의 끝에서는 다시 원점으로 돌아가 같은 행동을 반복하지 않는 것이 중요합니다.",
    ][rule.planItems.indexOf(item)]}`,
  }));
}

function buildTarotActionPrescription(request: FortuneTeaHouseConsultRequest, profile: TarotCounsel, questionType: TarotQuestionType, rule: TarotTeaCategoryRule) {
  if (hasContactBoundarySignal(request) && (rule.id === "lotus-moon" || rule.id === "black-moon-brown-rice")) {
    return `지금 연락해도 되는가: 오늘은 연락하지 않는 편이 맞습니다. 차단, 거절, 불편함의 신호가 있었다면 ${profile.nameKr} ${orientationLabel(profile.orientation)}은 경계를 존중하는 멈춤을 먼저 가리킵니다. 메시지는 보내지 말고, SNS 확인과 반응 시험도 멈추세요.`;
  }
  if (rule.id === "lotus-moon" || questionType === "reunion" || questionType === "contact" || questionType === "theirMind") {
    return `지금 연락해도 되는가: 감정 호소나 답 요구가 들어간다면 며칠 더 기다리세요. 짧고 부담 없는 확인만 가능하다면 한 번은 열 수 있습니다. 예시: "부담 주고 싶진 않아. 언젠가 차분히 이야기할 수 있으면 알려줘." 반응이 없으면 다시 밀지 않는 것이 오늘의 핵심입니다.`;
  }
  const firstPlan = rule.planItems[0];
  return `${rule.actionQuestion}: ${tarotQuestionTypeLabel(questionType)} 질문을 한 문장으로 줄이고, 오늘 할 수 있는 기준으로 좁히세요. 실행 전에는 ${profile.avoidAction}을 피해야 흐름이 덜 거칠어집니다. 해도 되는 행동은 ${rule.planLabel}의 첫 단계인 '${firstPlan.title} - ${firstPlan.subtitle}'처럼 작고 확인 가능한 움직임입니다.`;
}

function buildTarotClosingLine(profile: TarotCounsel, rule: TarotTeaCategoryRule) {
  return `${profile.nameKr} 카드는 ${rule.category} 질문을 겁주기보다 더 정확히 지나가게 하려는 표식이에요. 오늘은 ${rule.actionQuestion}을 서두르기 전에, 손님이 지켜야 할 기준 하나만 조용히 붙잡으세요.`;
}

function buildUnavailableSajuSnapshot(reason = "사주 계산이 잠시 흐려져 오늘은 확인된 질문과 찻잔의 결을 중심으로 읽었습니다."): FortuneTeaSajuSnapshot {
  return {
    available: false,
    coreSummary: "사주의 세부 흐름은 열지 않고, 확인된 질문과 찻잔의 결을 중심으로 읽었습니다.",
    caution: reason,
    tenGodSnapshot: {
      available: false,
      tenGodLabels: [],
      reason,
      source: "fallback",
    },
  };
}

function buildUnavailableSajuSection(snapshot: FortuneTeaSajuSnapshot, request: FortuneTeaHouseConsultRequest): FortuneTeaHouseConsultResponse["saju"] {
  return {
    available: false,
    title: "사주가 비춘 기본 흐름",
    summary: snapshot.coreSummary || "사주의 세부 흐름은 열지 않고, 확인된 질문과 찻잔의 결을 중심으로 읽었습니다.",
    keyPoints: ["사주의 세부 흐름은 열지 않고, 확인된 질문과 찻잔의 결을 중심으로 읽었습니다."],
    birthSummary: {
      nickname: compactText(request.nickname || "", "손님"),
      profileId: request.profileId,
      birthDate: request.birthDate,
      birthTime: request.birthTimeUnknown ? undefined : request.birthTime,
      birthTimeUnknown: Boolean(request.birthTimeUnknown || !request.birthTime),
      hasBirthTime: Boolean(request.birthTime) && !request.birthTimeUnknown,
      calendarType: request.calendarType,
      gender: request.gender,
      birthPlace: request.birthPlace,
      timezone: request.timezone,
    },
    caution: snapshot.caution,
    cautionReading: "사주의 세부 흐름은 열지 않고, 확인된 질문과 찻잔의 결을 중심으로 읽었습니다.",
    actionPrescription: "오늘은 지금 적어주신 질문의 감정과 현실 신호를 한 문장씩 나누어 보세요.",
    tarotBridgeReady: "다른 상담 방식을 열고 싶다면, 같은 질문을 새 상징 위에 다시 올려도 괜찮습니다.",
    tenGodSnapshot: snapshot.tenGodSnapshot,
  };
}

type SajuDeepSection = NonNullable<FortuneTeaHouseConsultResponse["saju"]["deepSections"]>[number];

function buildSajuDeepSections(params: {
  saju: FortuneTeaHouseConsultResponse["saju"];
  nickname: string;
  questionSummary: string;
  teaCupName: string;
  teaCupTopic: string;
  primaryTenGodName?: string;
}): SajuDeepSection[] {
  const { saju, nickname, questionSummary, teaCupName, teaCupTopic, primaryTenGodName } = params;
  const birth = saju.birthSummary;
  const timeLimit = birth?.birthTimeUnknown || !birth?.hasBirthTime
    ? "출생시간이 미상이라 시주의 세밀한 결은 제한적으로 보고, 생년월일과 확인된 명식의 큰 흐름 위주로 살핍니다."
    : `출생시간 ${birth.birthTime}의 결까지 함께 놓고, 드러난 명식의 균형을 더 촘촘히 살핍니다.`;
  const elements = saju.dominantElements?.length ? saju.dominantElements.join(" · ") : "오행의 균형";
  const tenGod = primaryTenGodName || saju.primaryTenGod?.nameKo || "드러난 십성";
  const placeText = birth?.birthPlace ? `${birth.birthPlace}의 시간대 기운까지 상담 기준에 올렸습니다.` : "출생지는 선택값이라 비워 두어도 상담은 이어집니다.";

  return [
    {
      id: "summary",
      title: "핵심 요약",
      tone: "summary",
      body: `${nickname}의 질문은 ${questionSummary}의 결로 들어옵니다. ${teaCupName}는 ${teaCupTopic}을 먼저 비추고, 사주는 ${saju.summary} ${timeLimit} 오늘의 핵심은 마음이 급해지는 지점에서 결론을 바로 닫지 않고, 반복되어 온 반응과 지금 실제로 확인된 신호를 분리하는 데 있습니다.`,
    },
    {
      id: "temperament",
      title: "타고난 기질",
      tone: "summary",
      body: `${saju.dayMaster ? `${saju.dayMaster} 일간` : "드러난 일간"}을 중심에 두면, 손님은 상황을 그냥 흘려보내기보다 마음속 기준에 비추어 오래 곱씹는 결이 있습니다. 그래서 애매한 말이나 미완성된 약속 앞에서는 작은 신호도 크게 느껴질 수 있어요. 이 예민함은 약점만은 아니며, 사람과 일의 분위기를 빨리 감지하는 촉이기도 합니다.`,
    },
    {
      id: "elements",
      title: "오행 균형",
      tone: "element",
      body: `${elements}의 기운이 오늘 상담의 바탕에 놓입니다. 강한 기운은 추진력과 확신을 주지만, 마음이 한쪽으로 몰리면 상대의 반응이나 현실의 속도를 놓칠 수 있습니다. 약한 기운은 부족함으로 단정하지 말고, 하루의 습관으로 천천히 채우는 쪽이 좋아요. ${placeText}`,
    },
    {
      id: "ten-gods",
      title: "십성 구조",
      tone: "tenGod",
      body: `${tenGod}의 흐름은 손님이 관계와 선택 앞에서 어떤 방식으로 자신을 지키는지 보여줍니다. 책임을 크게 느끼는 시기에는 마음이 진중해지지만, 동시에 스스로를 몰아붙이는 말도 강해질 수 있어요. 사주는 이 힘을 꺾으라고 하지 않고, 필요한 자리에서만 쓰도록 온도를 낮추라고 가리킵니다.`,
    },
    {
      id: "strength",
      title: "강점",
      tone: "advice",
      body: `손님의 강점은 감정이 흔들려도 결국 의미를 찾으려는 힘에 있습니다. 그냥 넘기면 편한 장면에서도 왜 마음이 걸렸는지, 무엇을 지키고 싶은지 다시 묻는 기질이 있어요. 이 힘은 상담 주제에서 중요한 기준이 됩니다. 지금은 상대나 상황을 바꾸기 전에, 내가 놓치지 말아야 할 선을 조용히 세우는 편이 좋습니다.`,
    },
    {
      id: "weakness",
      title: "반복되는 약점",
      tone: "caution",
      body: `반복해서 조심할 점은 마음이 불안할수록 확인되지 않은 이야기를 먼저 완성해 버리는 흐름입니다. 사주가 보여주는 약한 기운은 실패의 예고가 아니라, 속도를 늦춰야 하는 자리입니다. 답이 늦게 오거나 상황이 흐릴 때는 추측을 사실처럼 붙들기보다, 오늘 확인 가능한 한 문장만 남기는 편이 손님을 덜 다치게 합니다.`,
    },
    {
      id: "current-flow",
      title: "현재 운의 흐름",
      tone: "flow",
      body: `지금 흐름은 오래 미뤄 둔 감정이 표면으로 올라오는 쪽에 가깝습니다. 그래서 평소라면 넘겼을 말도 마음에 남고, 작은 변화에도 의미를 붙이고 싶어질 수 있어요. 이 시기에는 밀어붙이는 선택보다 정리하는 선택이 더 힘을 냅니다. 질문을 넓게 풀기보다, 가장 알고 싶은 한 가지로 줄이면 운의 방향이 선명해집니다.`,
    },
    {
      id: "life-rhythm",
      title: "일 · 돈 · 관계 · 건강 리듬",
      tone: "flow",
      body: `일과 돈의 자리에서는 감정에 끌려 결정하기보다 기록과 숫자로 확인하는 습관이 필요합니다. 관계에서는 서운함을 오래 참다가 한 번에 꺼내기 쉬우니, 말의 온도를 낮추어 자주 나누는 편이 좋아요. 건강 리듬은 수면과 소화처럼 기본 회복력이 중요하게 떠오릅니다. 몸이 지치면 마음도 확신을 잃기 쉬운 시기입니다.`,
    },
    {
      id: "caution-period",
      title: "앞으로 조심할 시기",
      tone: "caution",
      body: `${saju.cautionReading || "한쪽 결론으로 급히 닫기보다, 감정과 기준을 나누어 보아야 합니다."} 특히 마음이 급해지는 날에는 메시지, 계약, 약속처럼 되돌리기 어려운 행동을 바로 꺼내지 않는 것이 좋습니다. 하루를 넘긴 뒤에도 같은 마음이라면 그때 움직여도 늦지 않습니다.`,
    },
    {
      id: "strategy",
      title: "실천 전략",
      tone: "advice",
      body: `${saju.actionPrescription || "오늘은 마음이 반복해서 향하는 장면을 적고, 그 안에서 지킬 기준 하나만 조용히 골라보세요."} 여기에 한 가지를 더 보태면, 질문을 '상대가 어떻게 생각할까'보다 '나는 무엇을 확인해야 마음이 안전할까'로 바꾸어 보세요. 그 질문이 손님의 다음 행동을 더 차분하게 밝혀줍니다.`,
    },
    {
      id: "one-line",
      title: "오늘의 한 문장 조언",
      tone: "advice",
      body: `오늘은 답을 서두르기보다, 내 마음이 오래 머문 이유와 지금 지켜야 할 기준을 한 잔의 차처럼 천천히 나누어 보세요.`,
    },
  ];
}

function safeBuildSajuSnapshot(request: FortuneTeaHouseConsultRequest) {
  try {
    return buildFortuneTeaSajuSnapshot(request);
  } catch {
    return buildUnavailableSajuSnapshot();
  }
}

function safeBuildSajuSection(snapshot: FortuneTeaSajuSnapshot, request: FortuneTeaHouseConsultRequest) {
  try {
    return buildSajuResultSection(snapshot, request);
  } catch {
    return buildUnavailableSajuSection(snapshot, request);
  }
}

function safeBuildTarotSnapshot(request: FortuneTeaHouseConsultRequest, seed: string): FortuneTeaTarotSnapshot {
  try {
    return buildFortuneTeaTarotSnapshot(request, seed);
  } catch {
    const card = drawMajorArcana(seed);
    const orientation = drawTarotOrientation(seed);
    const meaning = orientation === "upright" ? card.upright : card.reversed;
    return {
      cardId: card.id,
      number: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      orientation,
      keywords: meaning.keywords,
      meaning: meaning.meaning,
      source: "fallback",
    };
  }
}

function safeBuildTarotSpreadCards(request: FortuneTeaHouseConsultRequest, seed: string, representative: FortuneTeaTarotSnapshot) {
  try {
    const spread = buildFortuneTeaTarotSpreadCards(request, seed);
    if (spread.tarotSpreadCards.length) {
      const [first, ...rest] = spread.tarotSpreadCards;
      return {
        tarotSpread: spread.tarotSpread,
        tarotSpreadCards: [
          {
            ...first,
            ...representative,
            positionId: first.positionId,
            positionLabel: first.positionLabel,
            positionMeaning: first.positionMeaning,
            reading: first.reading || `${first.positionLabel} 자리에서 ${representative.nameKo} 카드가 지금 질문의 중심을 비춥니다.`,
          },
          ...rest,
        ] as FortuneTeaTarotSpreadCard[],
      };
    }
  } catch {
    void 0;
  }
  return {
    tarotSpread: normalizeFortuneTeaTarotSpread(request.tarotSpread),
    tarotSpreadCards: [
      {
        ...representative,
        positionId: "present",
        positionLabel: "현재",
        positionMeaning: "지금 질문의 중심 장면",
        reading: `${representative.nameKo} 카드가 지금 질문의 중심 장면을 비춥니다.`,
      },
    ] as FortuneTeaTarotSpreadCard[],
  };
}

function safePromptSignature(seed: string, buildPrompt: () => string) {
  try {
    return hashTeaHouseSeed(buildPrompt());
  } catch {
    return hashTeaHouseSeed(seed);
  }
}

export function buildFortuneTeaHouseConsultResult(request: FortuneTeaHouseConsultRequest): FortuneTeaHouseConsultResponse {
  const nickname = displayName(request.nickname || "");
  const question = compactText(request.question, "오늘 내 마음이 향하는 곳은 어디인가요?");
  const concernTopic = compactText(request.concernTopic || "", "마음의 방향");
  const birthInfo = compactText([request.birthInfo, request.birthDate, request.birthTime, request.gender, request.calendarType].filter(Boolean).join(" "), "");
  const registeredCup = getTeaHouseCupById(request.selectedTeaCupId);
  const teaCup = {
    id: registeredCup?.id || request.selectedTeaCupId,
    name: registeredCup?.name || compactText(request.selectedTeaCupName, "연꽃 달차"),
    topic: registeredCup?.topic || compactText(request.selectedTeaCupTopic, "마음의 진심"),
    reading: registeredCup?.reading || `${compactText(request.selectedTeaCupName, "이 찻잔")}은 ${compactText(request.selectedTeaCupTopic, "마음의 흐름")}을 조용히 비춥니다.`,
    resultPrelude: registeredCup?.resultPrelude,
  };
  const consultationMode = request.consultationMode === "saju" ? "saju" : request.consultationMode === "sukuyo" ? "sukuyo" : "tarot";
  const seed = `${nickname}|${concernTopic}|${birthInfo}|${teaCup.id}|${teaCup.name}|${teaCup.topic}|${question}`;
  const sajuSnapshot = safeBuildSajuSnapshot(request);
  const sajuSection = safeBuildSajuSection(sajuSnapshot, request);
  const tarotSnapshot = safeBuildTarotSnapshot(request, seed);
  const tarotSpreadResult = safeBuildTarotSpreadCards(request, seed, tarotSnapshot);
  const sukuyoCompatibility = buildFortuneTeaSukuyoCompatibility(request);
  const promptSignature = safePromptSignature(seed, () => buildFortuneTeaPrompt({ request, teaCup, sajuSnapshot, tarotSnapshot }));
  const direction = orientationLabel(tarotSnapshot.orientation);
  const tarotCard = getTarotCardById(tarotSnapshot.cardId) || drawMajorArcana(seed);
  const tarotCounselProfile = getTarotCounselProfile(tarotCard, tarotSnapshot.orientation);
  const tarotQuestionType = detectTarotQuestionType(request);
  const tarotTeaRule = resolveTarotTeaCategoryRule(request);
  const tarotReading = buildTarotReading(tarotCounselProfile, tarotQuestionType, teaCup.name, tarotTeaRule);
  const tarotSynthesis = buildTarotSynthesis(tarotCounselProfile, tarotQuestionType, teaCup.name, tarotTeaRule);
  const tarotYeoniReading = buildTarotYeoniReading({
    request,
    profile: tarotCounselProfile,
    questionType: tarotQuestionType,
    teaCupName: teaCup.name,
    rule: tarotTeaRule,
  });
  const tarotChoiceSimulation = buildTarotChoiceSimulation(tarotCounselProfile, tarotTeaRule);
  const tarotActionPrescription = buildTarotActionPrescription(request, tarotCounselProfile, tarotQuestionType, tarotTeaRule);
  const tarotClosingLine = buildTarotClosingLine(tarotCounselProfile, tarotTeaRule);
  const questionSummary = summarize(`${concernTopic ? `${concernTopic} · ` : ""}${question}`, 86);
  const emotionalWeight = seededValue(`${seed}:${promptSignature}:emotion`, 52, 88);
  const hesitation = seededValue(`${seed}:${promptSignature}:hesitation`, 36, 79);
  const hope = seededValue(`${seed}:${promptSignature}:hope`, 45, 91);
  const clarity = seededValue(`${seed}:${promptSignature}:clarity`, 32, 78);
  const tarotEmotionAnalysis = buildTarotEmotionAnalysis({
    profile: tarotCounselProfile,
    questionType: tarotQuestionType,
    rule: tarotTeaRule,
    seed,
    promptSignature,
  });
  const primaryTenGod =
    sajuSection.tenGodSnapshot?.available && sajuSection.tenGodSnapshot.primaryTenGod
      ? getTenGodMeta(sajuSection.tenGodSnapshot.primaryTenGod)
      : null;
  const tenGodLine = primaryTenGod
    ? `오늘 찻집에 가장 먼저 들어온 손님은 ${primaryTenGod.nameKo}, ${primaryTenGod.roleInTeaHouse}입니다. ${primaryTenGod.yeoniDescription}`
    : "";
  const sajuOneLineAdvice = "오늘은 답을 서두르기보다, 내 마음이 오래 머문 이유와 지금 지켜야 할 기준을 한 잔의 차처럼 천천히 나누어 보세요.";
  const sajuDeepSections = consultationMode === "saju"
    ? buildSajuDeepSections({
        saju: sajuSection,
        nickname,
        questionSummary,
        teaCupName: teaCup.name,
        teaCupTopic: teaCup.topic,
        primaryTenGodName: primaryTenGod?.nameKo,
      })
    : undefined;
  const sajuBridge = sajuSection.available
    ? `사주는 ${nickname}${subjectParticle(nickname)} 반복해서 붙잡는 마음의 패턴을 보여주고, ${tenGodLine} 타로는 ${tarotSnapshot.nameKo} ${direction}으로 지금 그 마음이 어떤 상징으로 떠올랐는지 비춥니다. 두 흐름을 함께 보면, 결론을 서두르기보다 기대와 두려움, 추측과 사실을 먼저 분리해 보는 시간이 필요합니다.`
    : `출생정보가 충분하지 않아 사주의 세부 흐름은 만들지 않았어요. 대신 ${teaCup.name}의 관점과 ${tarotSnapshot.nameKo} ${direction}의 상징이 지금 질문의 방향을 더 선명하게 비춥니다. 오늘은 찻잔과 타로, 현재 고민의 흐름을 중심으로 읽어드릴게요.`;
  const synthesisSummary = sajuSection.available
    ? `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 사주는 ${primaryTenGod ? primaryTenGod.nameKo : "기본 기질"}의 결을, 타로는 지금 마음이 흔들리는 장면을 보여줍니다.`
    : `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 오늘은 현재 고민과 타로의 상징이 상담의 중심이 됩니다.`;

  const selectedSynthesisSummary =
    consultationMode === "saju"
      ? sajuSection.available
        ? `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 사주는 ${primaryTenGod ? primaryTenGod.nameKo : "기본 기질"}의 결을 중심으로 오늘 붙잡을 기준을 비춥니다.`
        : `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 드러난 출생정보 안에서 확인되는 흐름만 차분히 살핍니다.`
      : consultationMode === "tarot"
        ? `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, ${tarotSnapshot.nameKo} ${direction}의 상징이 지금 마음의 장면을 선명하게 비춥니다.`
        : consultationMode === "sukuyo"
          ? sukuyoCompatibility.available
            ? `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, ${sukuyoCompatibility.user.sukuyoName || "나의 본명숙"}과 ${sukuyoCompatibility.partner.sukuyoName || "상대의 본명숙"}이 만나는 ${sukuyoCompatibility.relationType || "인연"}의 결을 중심으로 관계의 흐름을 비춥니다.`
            : `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 확인된 정보 안에서만 인연의 온도를 조심스럽게 살핍니다.`
        : synthesisSummary;
  const selectedSajuTarotBridge =
    consultationMode === "saju"
      ? sajuSection.available
        ? `오늘은 사주의 흐름만 따라갑니다. ${tenGodLine || "드러난 기질의 결"}을 중심에 두고, 반복되는 마음의 패턴과 지금 필요한 기준을 차분히 살펴볼게요.`
        : "오늘은 보이는 출생정보 안에서만 읽습니다. 비어 있는 시간이나 기운은 지어내지 않고, 확인된 질문과 기본 흐름만 손님 앞에 펼쳐둘게요."
      : consultationMode === "tarot"
        ? `오늘은 타로의 장면만 따라갑니다. ${tarotSnapshot.nameKo} ${direction}이 비추는 ${tarotSnapshot.keywords.slice(0, 2).join(", ")}의 결을 중심으로, 지금 질문이 어디로 기울어 있는지 살펴볼게요.`
        : consultationMode === "sukuyo"
          ? sukuyoCompatibility.available
            ? `오늘은 숙요점 궁합의 달빛만 따라갑니다. ${sukuyoCompatibility.distanceLabel || "동숙"} 거리와 ${sukuyoCompatibility.relationType || "인연"}의 흐름, ${sukuyoCompatibility.relationDetail?.typeAToB || "순행"}과 ${sukuyoCompatibility.relationDetail?.typeBToA || "역행"}의 방향 안에서 두 사람이 가까워지는 방식과 조심해야 할 온도를 함께 살펴볼게요.`
            : "오늘은 확인된 이름과 질문만 손님 앞에 두겠습니다. 27숙의 자리가 열리지 않은 부분은 연이가 꾸미지 않고 비워둘게요."
        : sajuBridge;
  const selectedYeoniMain =
    consultationMode === "saju"
      ? `${questionSummary}라는 물음은 태어난 흐름 안에서 반복되어 온 반응을 먼저 비춥니다. ${sajuSection.summary} 지금은 결론을 서두르기보다, 손님에게 익숙한 선택의 습관과 오늘 붙잡을 기준을 나누어 보는 시간이 필요해요.`
      : consultationMode === "sukuyo"
        ? `${questionSummary}라는 물음은 두 사람의 달빛이 어느 거리에서 마주 보는지를 먼저 비춥니다. ${sukuyoCompatibility.summary} ${sukuyoCompatibility.scores ? `기본 숙요점 점수는 ${sukuyoCompatibility.scores.total}점, ${sukuyoCompatibility.scores.label}으로 모입니다. ` : ""}지금은 감정의 세기만 보지 말고, 서로에게 다가가는 속도와 멈춰야 할 경계를 함께 살펴야 해요.`
        : `${questionSummary}라는 물음에는 ${tarotSnapshot.nameKo} ${direction}의 상징이 겹쳐집니다. ${tarotSnapshot.meaning} 지금은 마음의 반응과 현실의 순서를 함께 놓고, 카드가 보여주는 장면을 천천히 따라가야 합니다.`;
  const selectedYeoniAdvice =
    consultationMode === "saju"
      ? `${teaCup.name}${subjectParticle(teaCup.name)} 고른 방향은 ${teaCup.topic}입니다. 오늘은 ${primaryTenGod ? primaryTenGod.nameKo : "드러난 기질"}의 흐름을 기준으로, 반복되던 감정과 행동 중 하나를 부드럽게 바꾸어 보세요.`
      : consultationMode === "sukuyo"
        ? `${teaCup.name}${subjectParticle(teaCup.name)} 고른 방향은 ${teaCup.topic}입니다. 오늘은 ${sukuyoCompatibility.adviceKeywords.slice(0, 3).join(", ")}의 결, 그리고 ${sukuyoCompatibility.elementHarmony?.relation || "보완"}의 오행 흐름을 기준으로 관계를 밀어붙이기보다 서로의 속도를 확인하는 한 문장을 먼저 준비해 보세요.`
        : `${teaCup.name}${subjectParticle(teaCup.name)} 고른 방향은 ${teaCup.topic}입니다. 오늘은 ${tarotSnapshot.keywords.slice(0, 2).join(", ")}의 흐름을 기준으로, 보내도 되는 말과 멈춰야 하는 말을 먼저 나누어 보세요.`;
  const selectedYeoniCaution =
    consultationMode === "sukuyo"
      ? "숙요점 궁합은 두 사람이 부딪히는 리듬과 가까워지는 방식을 비추지만, 관계의 결말을 대신 정하지는 않아요. 상대의 마음을 단정하기보다 실제 말과 행동, 서로의 안전한 경계를 함께 확인해 주세요."
      : `다만 ${tarotSnapshot.nameKo} ${direction}은 감정이 강할수록 판단이 한쪽으로 기울 수 있음을 함께 비춥니다. 마음이 오래 머물렀다는 이유만으로 그 자리에 계속 있어야 한다는 뜻은 아니에요. 오늘은 확인된 사실과 마음이 만든 해석을 같은 줄에 섞지 않는 편이 좋습니다.`;

  const result: FortuneTeaHouseConsultResponse = {
    consultationMode,
    sessionTitle: `${teaCup.name}가 비춘 오늘의 ${consultationMode === "saju" ? "사주" : consultationMode === "sukuyo" ? "숙요점 궁합" : "타로"} 상담 기록`,
    questionSummary,
    teaCup,
    saju: consultationMode === "saju"
      ? {
          ...sajuSection,
          deepSections: sajuDeepSections,
          oneLineAdvice: sajuOneLineAdvice,
        }
      : sajuSection,
    tarot: {
      cardId: tarotSnapshot.cardId,
      number: tarotSnapshot.number,
      nameEn: tarotSnapshot.nameEn,
      nameKo: tarotSnapshot.nameKo,
      orientation: tarotSnapshot.orientation,
      keywords: tarotSnapshot.keywords,
      meaning: tarotSnapshot.meaning,
      reading: consultationMode === "tarot"
        ? tarotReading
        : `${tarotSnapshot.nameKo} ${direction}은 ${teaCup.topic}${objectParticle(teaCup.topic)} 바라볼 때 ${tarotSnapshot.meaning} ${tarotSnapshot.keywords[0]}의 결이 가장 먼저 떠오르니, 지금은 마음의 반응과 현실의 순서를 함께 놓고 보아야 합니다.`,
    },
    tarotSpread: tarotSpreadResult.tarotSpread,
    tarotSpreadCards: tarotSpreadResult.tarotSpreadCards,
    sukuyoCompatibility,
    emotionAnalysis: consultationMode === "tarot"
      ? tarotEmotionAnalysis
      : consultationMode === "sukuyo"
      ? [
          emotion("끌림", hope, "두 사람 사이에는 아직 서로를 향해 열리는 빛이 남아 있습니다.", "gold"),
          emotion("긴장", emotionalWeight, "가까워질수록 말의 온도와 속도에 마음이 크게 반응할 수 있어요.", "purple"),
          emotion("미련", seededValue(`${seed}:${promptSignature}:attachment`, 34, 84), "지나간 장면이나 아직 묻지 못한 말이 관계의 달빛 아래 남아 있습니다.", "pink"),
          emotion("거리감", hesitation, "다가가고 싶은 마음과 스스로를 지키려는 마음이 같은 자리에서 숨을 고릅니다.", "blue"),
          emotion("회복", clarity, "서로의 속도를 확인하면 관계를 덜 다치게 움직일 수 있는 힘이 올라옵니다.", "green"),
        ]
      : [
          emotion("기대", hope, `${nickname}의 마음 안쪽에는 아직 부드럽게 열리길 바라는 빛이 남아 있습니다.`, "gold"),
          emotion("불안", emotionalWeight, "결과를 빨리 알고 싶은 마음이 커질수록 작은 신호에도 흔들릴 수 있어요.", "purple"),
          emotion("미련", seededValue(`${seed}:${promptSignature}:attachment`, 34, 84), "지나간 말이나 장면이 아직 찻잔 바닥에 은은하게 남아 있습니다.", "pink"),
          emotion("망설임", hesitation, "움직이고 싶은 마음과 다치고 싶지 않은 마음이 같은 자리에서 숨을 고릅니다.", "blue"),
          emotion("회복", clarity, "오늘 바로 바꿀 수 있는 작은 기준을 찾으려는 힘이 천천히 올라옵니다.", "green"),
        ],
    yeoniReading: {
      intro: consultationMode === "tarot" ? tarotYeoniReading.intro : `연이가 당신의 고민을 차분히 읽어보았어요. 오늘의 답은 단순히 좋다, 나쁘다로 나뉘지 않아요. 지금 중요한 건 ${nickname}의 마음이 어디에서 가장 크게 흔들리고 있는지를 보는 거예요.`,
      main: consultationMode === "tarot" ? tarotYeoniReading.main : selectedYeoniMain,
      advice: consultationMode === "tarot" ? tarotYeoniReading.advice : selectedYeoniAdvice,
      caution: consultationMode === "tarot" ? tarotYeoniReading.caution : selectedYeoniCaution,
    },
    synthesis: {
      title: consultationMode === "tarot" ? tarotSynthesis.title : consultationMode === "saju" ? "연이가 읽은 사주의 결" : consultationMode === "sukuyo" ? "연이가 읽은 27숙 인연의 흐름" : "연이가 읽은 타로의 장면",
      summary: consultationMode === "tarot" ? tarotSynthesis.summary : selectedSynthesisSummary,
      sajuTarotBridge: consultationMode === "tarot" ? tarotSynthesis.sajuTarotBridge : selectedSajuTarotBridge,
    },
    choiceSimulation: consultationMode === "tarot"
      ? tarotChoiceSimulation
      : consultationMode === "sukuyo"
      ? [
          {
            id: "message",
            title: "작게 연락하는 길",
            subtitle: "상대의 속도를 살피는 한 문장",
            result: "관계의 온도를 무리 없이 확인하고, 서로의 현재 리듬을 조금 더 선명하게 볼 수 있습니다.",
            caution: "답을 재촉하는 말보다 부담 없는 확인이 먼저여야 합니다.",
          },
          {
            id: "distance",
            title: "잠시 거리를 두는 길",
            subtitle: "감정의 파도를 가라앉히는 시간",
            result: "강한 끌림이나 불안을 관계의 전부로 보지 않고, 실제 흐름을 차분히 분리할 수 있습니다.",
            caution: "침묵이 벌처럼 느껴지지 않도록 스스로 정한 기한을 남겨 두세요.",
          },
          {
            id: "boundary",
            title: "기준을 밝히는 길",
            subtitle: "두 사람의 약속을 다시 놓는 길",
            result: "반복되던 서운함이 줄고, 관계를 이어갈 수 있는 현실적인 약속이 또렷해질 수 있습니다.",
            caution: "상대를 고치려는 말이 아니라 내가 지키고 싶은 기준부터 전해야 합니다.",
          },
        ]
      : [
          {
            id: "speak",
            title: "지금 움직이는 길",
            subtitle: "마음을 말이나 행동으로 옮기는 길",
            result: "답답했던 감정이 조금 풀리고, 관계나 상황의 기준이 더 분명해질 수 있습니다.",
            caution: "한 번에 모든 것을 밀어붙이기보다 가장 중요한 한 문장부터 전하는 편이 좋습니다.",
          },
          {
            id: "wait",
            title: "기다리며 보는 길",
            subtitle: "마음의 안개가 옅어지는 길",
            result: "성급한 말은 줄어들고, 상대나 상황의 실제 반응을 더 차분히 볼 수 있습니다.",
            caution: "기다림이 회피로 길어지지 않도록 스스로 정한 기한이 필요합니다.",
          },
          {
            id: "reset",
            title: "나를 먼저 지키는 길",
            subtitle: "나를 먼저 돌보는 길",
            result: "흔들리던 마음이 자기 리듬을 되찾고, 선택의 기준이 내 쪽으로 돌아옵니다.",
            caution: "거리두기가 단절처럼 보이지 않도록 필요한 최소한의 설명은 남겨 두세요.",
          },
        ],
    actionPrescription: consultationMode === "tarot"
      ? tarotActionPrescription
      : consultationMode === "sukuyo"
      ? "오늘은 상대에게 묻고 싶은 말을 바로 보내기보다, 기대하는 답과 실제로 확인해야 할 사실을 나누어 적어 보세요. 그다음 부담 없는 한 문장만 남기면 충분합니다."
      : `오늘은 바로 결론을 내리기보다, 하고 싶은 말을 메모장에 먼저 적고 한 번 더 읽어보세요. 그 아래에 보내도 되는 말과 오늘은 멈춰야 하는 말을 따로 나누면 선택의 온도가 낮아집니다.`,
    luckyKeywords:
      consultationMode === "saju"
        ? [teaCup.name, primaryTenGod ? primaryTenGod.nameKo : "기준", ...(sajuSection.dominantElements || ["흐름"]).slice(0, 3)]
        : consultationMode === "sukuyo"
          ? [teaCup.name, sukuyoCompatibility.relationType || "인연", ...sukuyoCompatibility.adviceKeywords.slice(0, 3)]
          : [teaCup.name, tarotSnapshot.nameKo, tarotQuestionTypeLabel(tarotQuestionType)],
    closingLine: consultationMode === "tarot"
      ? tarotClosingLine
      : consultationMode === "sukuyo"
      ? "오늘 두 사람에게 필요한 건 관계의 결말을 서두르는 일이 아니라, 서로의 속도를 덜 다치게 확인하는 한 걸음이에요. 달빛이 남아 있는 한, 연이는 이 인연의 흐름을 조용히 다시 펼쳐둘게요."
      : "오늘 당신에게 필요한 건 완벽한 결론이 아니라, 마음을 덜 다치게 하는 다음 한 걸음이에요. 달빛이 남아 있는 한, 당신의 이야기를 들을 찻잔 하나쯤은 언제나 준비해둘게요.",
  };

  try {
    return ensureConsultResultConsistency(result, tarotSnapshot);
  } catch {
    return result;
  }
}
