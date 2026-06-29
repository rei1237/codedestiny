import type {
  FortuneTeaHouseConsultRequest,
  FortuneTeaHouseConsultResponse,
  FortuneTeaSajuSnapshot,
  FortuneTeaTarotSnapshot,
  TeaHouseEmotionTone,
} from "../data/consult";
import { getTenGodMeta } from "../data/tenGods";
import { drawMajorArcana, drawTarotOrientation, hashTeaHouseSeed, type TarotOrientation } from "../data/tarotCards";
import { getTeaHouseCupById } from "../data/teaCups";
import { buildFortuneTeaPrompt } from "./buildFortuneTeaPrompt";
import { buildSajuResultSection, buildFortuneTeaSajuSnapshot } from "./sajuAdapter";
import { buildFortuneTeaSukuyoCompatibility } from "./sukuyoCompatibilityAdapter";
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
      birthDate: request.birthDate,
      birthTime: request.birthTime,
      hasBirthTime: Boolean(request.birthTime),
      calendarType: request.calendarType,
      gender: request.gender,
    },
    caution: snapshot.caution,
    cautionReading: "사주의 세부 흐름은 열지 않고, 확인된 질문과 찻잔의 결을 중심으로 읽었습니다.",
    actionPrescription: "오늘은 지금 적어주신 질문의 감정과 현실 신호를 한 문장씩 나누어 보세요.",
    tarotBridgeReady: "다른 상담 방식을 열고 싶다면, 같은 질문을 새 상징 위에 다시 올려도 괜찮습니다.",
    tenGodSnapshot: snapshot.tenGodSnapshot,
  };
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
  const sukuyoCompatibility = buildFortuneTeaSukuyoCompatibility(request);
  const promptSignature = safePromptSignature(seed, () => buildFortuneTeaPrompt({ request, teaCup, sajuSnapshot, tarotSnapshot }));
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
        : `${teaCup.name}${subjectParticle(teaCup.name)} 고른 방향은 ${teaCup.topic}입니다. 오늘은 ${tarotSnapshot.keywords.slice(0, 2).join(", ")}의 흐름을 기준으로 작은 행동 하나만 정해도 충분합니다.`;
  const selectedYeoniCaution =
    consultationMode === "sukuyo"
      ? "숙요점 궁합은 두 사람이 부딪히는 리듬과 가까워지는 방식을 비추지만, 관계의 결말을 대신 정하지는 않아요. 상대의 마음을 단정하기보다 실제 말과 행동, 서로의 안전한 경계를 함께 확인해 주세요."
      : `다만 ${tarotSnapshot.nameKo} ${direction}은 감정이 강할수록 판단이 한쪽으로 기울 수 있음을 함께 비춥니다. 마음이 오래 머물렀다는 이유만으로 그 자리에 계속 있어야 한다는 뜻은 아니에요. 의료, 법률, 금전처럼 현실 판단이 필요한 일은 전문가의 조언과 함께 차분히 확인해 주세요.`;

  const result: FortuneTeaHouseConsultResponse = {
    consultationMode,
    sessionTitle: `${teaCup.name}가 비춘 오늘의 ${consultationMode === "saju" ? "사주" : consultationMode === "sukuyo" ? "숙요점 궁합" : "타로"} 상담 기록`,
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
    sukuyoCompatibility,
    emotionAnalysis: consultationMode === "sukuyo"
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
      intro: `인간 상담사 연이로서 당신의 고민을 차분히 읽어보았어요. 오늘의 답은 단순히 좋다, 나쁘다로 나뉘지 않아요. 지금 중요한 건 결과를 맞히는 것보다, ${nickname}의 마음이 어디에서 가장 크게 흔들리고 있는지를 보는 거예요.`,
      main: selectedYeoniMain,
      advice: selectedYeoniAdvice,
      caution: selectedYeoniCaution,
    },
    synthesis: {
      title: consultationMode === "saju" ? "연이가 읽은 사주의 결" : consultationMode === "sukuyo" ? "연이가 읽은 27숙 인연의 흐름" : "연이가 읽은 타로의 장면",
      summary: selectedSynthesisSummary,
      sajuTarotBridge: selectedSajuTarotBridge,
    },
    choiceSimulation: consultationMode === "sukuyo"
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
    actionPrescription: consultationMode === "sukuyo"
      ? "오늘은 상대에게 묻고 싶은 말을 바로 보내기보다, 기대하는 답과 실제로 확인해야 할 사실을 나누어 적어 보세요. 그다음 부담 없는 한 문장만 남기면 충분합니다."
      : `오늘은 바로 결론을 내리기보다, 하고 싶은 말을 메모장에 먼저 적고 한 번 더 읽어보세요. 그 아래에 지금 당장 할 수 있는 가장 작은 행동 하나를 적으면 충분합니다.`,
    luckyKeywords:
      consultationMode === "saju"
        ? [teaCup.name, primaryTenGod ? primaryTenGod.nameKo : "기준", ...(sajuSection.dominantElements || ["흐름"]).slice(0, 3)]
        : consultationMode === "sukuyo"
          ? [teaCup.name, sukuyoCompatibility.relationType || "인연", ...sukuyoCompatibility.adviceKeywords.slice(0, 3)]
          : [teaCup.name, tarotSnapshot.nameKo, ...tarotSnapshot.keywords.slice(0, 3)],
    closingLine: consultationMode === "sukuyo"
      ? "오늘 두 사람에게 필요한 건 관계의 결말을 서두르는 일이 아니라, 서로의 속도를 덜 다치게 확인하는 한 걸음이에요. 달빛이 남아 있는 한, 연이는 이 인연의 흐름을 조용히 다시 펼쳐둘게요."
      : "오늘 당신에게 필요한 건 완벽한 결론이 아니라, 마음을 덜 다치게 하는 다음 한 걸음이에요. 달빛이 남아 있는 한, 당신의 이야기를 들을 찻잔 하나쯤은 언제나 준비해둘게요.",
  };

  try {
    return ensureConsultResultConsistency(result, tarotSnapshot);
  } catch {
    return result;
  }
}
