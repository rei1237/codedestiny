import type { FortuneTeaHouseConsultRequest, FortuneTeaHouseConsultResponse, TeaHouseEmotionTone } from "../data/consult";
import { getTenGodMeta } from "../data/tenGods";
import { hashTeaHouseSeed, type TarotOrientation } from "../data/tarotCards";
import { getTeaHouseCupById } from "../data/teaCups";
import { buildFortuneTeaPrompt } from "./buildFortuneTeaPrompt";
import { buildSajuResultSection, buildFortuneTeaSajuSnapshot } from "./sajuAdapter";
import { buildFortuneTeaTarotSnapshot } from "./tarotAdapter";
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
  };
  const seed = `${nickname}|${concernTopic}|${birthInfo}|${teaCup.id}|${teaCup.name}|${teaCup.topic}|${question}`;
  const sajuSnapshot = buildFortuneTeaSajuSnapshot(request);
  const sajuSection = buildSajuResultSection(sajuSnapshot);
  const tarotSnapshot = buildFortuneTeaTarotSnapshot(request, seed);
  const consultPromptSeed = buildFortuneTeaPrompt({ request, teaCup, sajuSnapshot, tarotSnapshot });
  const promptSignature = hashTeaHouseSeed(consultPromptSeed);
  const direction = orientationLabel(tarotSnapshot.orientation);
  const questionSummary = summarize(`${concernTopic ? `${concernTopic} · ` : ""}${question}`, 86);
  const emotionalWeight = seededValue(`${seed}:${promptSignature}:emotion`, 52, 88);
  const hesitation = seededValue(`${seed}:${promptSignature}:hesitation`, 36, 79);
  const hope = seededValue(`${seed}:${promptSignature}:hope`, 45, 91);
  const clarity = seededValue(`${seed}:${promptSignature}:clarity`, 32, 78);
  const primaryTenGod =
    sajuSection.tenGodSnapshot?.available && sajuSection.tenGodSnapshot.primaryTenGod
      ? getTenGodMeta(sajuSection.tenGodSnapshot.primaryTenGod)
      : null;
  const tenGodLine = primaryTenGod
    ? `오늘 찻집에 가장 먼저 들어온 손님은 ${primaryTenGod.nameKo}, ${primaryTenGod.roleInTeaHouse}입니다. ${primaryTenGod.yeoniDescription}`
    : "";
  const sajuBridge = sajuSection.available
    ? `사주에서는 ${sajuSection.summary} ${tenGodLine} 타로에서는 ${tarotSnapshot.nameKo} ${direction}이 ${tarotSnapshot.meaning} 그래서 오늘은 기질의 반복 흐름과 지금 질문의 상징을 따로 떼어 보지 말고, 같은 찻잔 위에 함께 올려두어야 합니다.`
    : `${sajuSection.summary} 대신 ${tarotSnapshot.nameKo} ${direction}과 ${teaCup.name}의 향이 지금 질문의 상징을 더 선명하게 비춥니다.`;
  const synthesisSummary = sajuSection.available
    ? `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 사주는 ${primaryTenGod ? primaryTenGod.nameKo : "기본 기질"}의 결을, 타로는 지금 마음이 흔들리는 장면을 보여줍니다.`
    : `${teaCup.name}${subjectParticle(teaCup.name)} ${teaCup.topic}${objectParticle(teaCup.topic)} 바라보게 하고, 오늘은 현재 고민과 타로의 상징이 상담의 중심이 됩니다.`;

  const result: FortuneTeaHouseConsultResponse = {
    sessionTitle: `${teaCup.name}에 비친 ${tarotSnapshot.nameKo}`,
    questionSummary,
    teaCup,
    saju: sajuSection,
    tarot: {
      cardId: tarotSnapshot.cardId,
      number: tarotSnapshot.number,
      nameEn: tarotSnapshot.nameEn,
      nameKo: tarotSnapshot.nameKo,
      orientation: tarotSnapshot.orientation,
      keywords: tarotSnapshot.keywords,
      meaning: tarotSnapshot.meaning,
      reading: `${tarotSnapshot.nameKo} ${direction}은 ${teaCup.topic}${objectParticle(teaCup.topic)} 바라볼 때 ${tarotSnapshot.meaning} ${tarotSnapshot.keywords[0]}의 결이 가장 먼저 떠오르니, 지금은 마음의 반응과 현실의 순서를 함께 놓고 보아야 합니다.`,
    },
    emotionAnalysis: [
      emotion("마음의 온도", emotionalWeight, `${nickname}의 질문에는 쉽게 식지 않는 감정의 온기가 남아 있습니다.`, "pink"),
      emotion("망설임의 안개", hesitation, "결정을 미루게 만든 이유가 아직 마음 가장자리에 머뭅니다.", "purple"),
      emotion("회복의 빛", hope, "상황을 더 부드럽게 바라보려는 힘이 안쪽에서 살아납니다.", "gold"),
      emotion("현실 감각", clarity, "바로 움직일 수 있는 작은 기준을 찾으려는 흐름입니다.", "blue"),
    ],
    yeoniReading: {
      intro: `당신의 고민을 차분히 읽어보았어요. 오늘의 답은 단순히 좋다, 나쁘다로 나뉘지 않아요. 지금 중요한 건 결과를 맞히는 것보다, ${nickname}의 마음이 어디에서 가장 크게 흔들리고 있는지를 보는 거예요.`,
      main: `${questionSummary}라는 물음에는 ${tarotSnapshot.nameKo} ${direction}의 기운이 겹쳐집니다. ${tarotSnapshot.meaning} ${sajuSection.summary} 그래서 이 흐름에서는 마음이 먼저 움직이고, 현실이 조금 늦게 따라오는 모습이 드러납니다.`,
      advice: `${teaCup.name}${subjectParticle(teaCup.name)} 고른 방향은 ${teaCup.topic}입니다. 결론을 서두르기보다 내가 무엇을 기대하고 무엇을 두려워하는지 나누어 보세요. 오늘은 ${tarotSnapshot.keywords.slice(0, 2).join(", ")}의 흐름을 기준으로 작은 행동 하나만 정해도 충분합니다.`,
      caution: `다만 ${tarotSnapshot.nameKo} ${direction}은 감정이 강할수록 판단이 한쪽으로 기울 수 있음을 함께 비춥니다. 마음이 오래 머물렀다는 이유만으로 그 자리에 계속 있어야 한다는 뜻은 아니에요. 스스로를 너무 오래 외롭게 두지 마세요.`,
    },
    synthesis: {
      title: "연이가 읽은 두 흐름의 접점",
      summary: synthesisSummary,
      sajuTarotBridge: sajuBridge,
    },
    choiceSimulation: [
      {
        id: "wait",
        title: "조금 더 기다린다면",
        subtitle: "마음의 안개가 옅어지는 길",
        result: "성급한 말은 줄어들고, 상대나 상황의 실제 반응을 더 차분히 볼 수 있습니다.",
        caution: "기다림이 회피로 길어지지 않도록 스스로 정한 기한이 필요합니다.",
      },
      {
        id: "speak",
        title: "솔직히 말한다면",
        subtitle: "향을 말로 옮기는 길",
        result: "답답했던 감정이 풀리며 관계나 상황의 기준이 더 분명해질 수 있습니다.",
        caution: "한 번에 모든 것을 털어놓기보다 가장 중요한 한 문장부터 전하는 편이 좋습니다.",
      },
      {
        id: "reset",
        title: "잠시 거리를 둔다면",
        subtitle: "나를 먼저 돌보는 길",
        result: "흔들리던 마음이 자기 리듬을 되찾고, 선택의 기준이 내 쪽으로 돌아옵니다.",
        caution: "거리두기가 단절처럼 보이지 않도록 필요한 최소한의 설명은 남겨 두세요.",
      },
    ],
    actionPrescription: `오늘 밤에는 ${tarotSnapshot.keywords[0]}을 떠올리며, 질문을 한 문장으로 다시 적어 보세요. 그 아래에 지금 당장 할 수 있는 가장 작은 행동 하나를 적으면 충분합니다.`,
    luckyKeywords: [teaCup.name, tarotSnapshot.nameKo, ...tarotSnapshot.keywords.slice(0, 3)],
    closingLine: "오늘 당신에게 필요한 건 완벽한 결론이 아니라, 마음을 덜 다치게 하는 다음 한 걸음이에요. 달빛이 남아 있는 한, 당신의 이야기를 들을 찻잔 하나쯤은 언제나 준비해둘게요.",
  };

  return ensureConsultResultConsistency(result, tarotSnapshot);
}
