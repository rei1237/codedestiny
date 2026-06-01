import { useState, useCallback } from "react";
import { Persona, SimulationState, DialogueStep, Choice } from "../_types";
import { SCENARIO_DB, Scenario, ChoiceWithReaction } from "../_data/scenarios";

type LoveCodePartnerProfile = {
  loveStyle: string;
  emotionalExpression: string;
  attachmentPattern: string;
  conflictPattern: string;
  attractionSignal: string;
  distancePattern: string;
  jealousyPattern: string;
  commitmentPattern: string;
  communicationTone: string;
  hiddenFear: string;
  relationshipNeed: string;
};

const ELEMENT_BASE: Record<string, LoveCodePartnerProfile> = {
  목: {
    loveStyle: "직진형 성장 연애",
    emotionalExpression: "감정 표현이 빠른 편",
    attachmentPattern: "가까워지면 주도적으로 이끎",
    conflictPattern: "이슈를 빨리 테이블에 올림",
    attractionSignal: "새로운 제안과 적극적 관심",
    distancePattern: "반응이 없으면 답답해함",
    jealousyPattern: "경계 반응이 빠름",
    commitmentPattern: "속도감 있게 관계 정의",
    communicationTone: "직설적이지만 다정함",
    hiddenFear: "정체된 관계",
    relationshipNeed: "함께 성장하는 감각",
  },
  화: {
    loveStyle: "감정 몰입형 연애",
    emotionalExpression: "설렘과 호감을 크게 표현",
    attachmentPattern: "뜨거운 친밀감을 선호",
    conflictPattern: "즉시 반응 후 빠른 화해 선호",
    attractionSignal: "리액션과 칭찬 빈도가 높음",
    distancePattern: "차가운 분위기에 민감",
    jealousyPattern: "티가 나게 서운함을 표현",
    commitmentPattern: "마음이 정해지면 확실함",
    communicationTone: "생동감 있고 솔직함",
    hiddenFear: "무관심한 침묵",
    relationshipNeed: "감정 교류의 온도",
  },
  토: {
    loveStyle: "안정 지향 연애",
    emotionalExpression: "행동으로 보여주는 편",
    attachmentPattern: "천천히 신뢰를 쌓음",
    conflictPattern: "감정 정리 후 현실적으로 대화",
    attractionSignal: "챙김과 일상 케어",
    distancePattern: "거리가 생기면 관찰 모드",
    jealousyPattern: "겉보다 속으로 오래 고민",
    commitmentPattern: "장기 관계를 전제로 판단",
    communicationTone: "차분하고 묵직함",
    hiddenFear: "예측 불가능한 관계",
    relationshipNeed: "안정감과 일관성",
  },
  금: {
    loveStyle: "기준 중심 연애",
    emotionalExpression: "절제된 표현",
    attachmentPattern: "신뢰 검증 후 깊어짐",
    conflictPattern: "팩트를 분명히 하려는 편",
    attractionSignal: "명확한 약속과 책임",
    distancePattern: "실망 시 거리 조절이 빠름",
    jealousyPattern: "표현은 적지만 강도는 큼",
    commitmentPattern: "확신 전까지 신중",
    communicationTone: "논리적이고 또렷함",
    hiddenFear: "신뢰 붕괴",
    relationshipNeed: "일관된 태도와 존중",
  },
  수: {
    loveStyle: "정서 교감형 연애",
    emotionalExpression: "분위기와 맥락 중심",
    attachmentPattern: "깊은 교감 후 강한 유대",
    conflictPattern: "시간을 두고 마음을 풀어냄",
    attractionSignal: "공감형 질문과 섬세한 경청",
    distancePattern: "상처받으면 조용히 후퇴",
    jealousyPattern: "직접 표현보다 눈치 신호",
    commitmentPattern: "정서적 안전감이 핵심",
    communicationTone: "부드럽고 여백이 있음",
    hiddenFear: "감정이 소비되는 관계",
    relationshipNeed: "공감과 심리적 안전",
  },
};

const DEFAULT_PROFILE: LoveCodePartnerProfile = {
  loveStyle: "균형형 연애",
  emotionalExpression: "상황에 맞춰 표현",
  attachmentPattern: "관계를 천천히 확인",
  conflictPattern: "대화로 풀어가는 편",
  attractionSignal: "관심 표현과 공감",
  distancePattern: "부담되면 잠시 거리 확보",
  jealousyPattern: "신호는 약하지만 예민함",
  commitmentPattern: "합의와 신뢰를 중시",
  communicationTone: "차분하고 예의 바름",
  hiddenFear: "관계의 일방성",
  relationshipNeed: "상호 존중",
};

const ELEMENT_SYNERGY: Record<string, number> = {
  목: 2,
  화: 2,
  토: 1,
  금: 1,
  수: 2,
};

function getPersonaElement(persona: Persona): string {
  const text = `${String(persona.desc || "")} ${String(persona.traits?.tone || "")}`;
  if (text.includes("목")) return "목";
  if (text.includes("화")) return "화";
  if (text.includes("토")) return "토";
  if (text.includes("금")) return "금";
  if (text.includes("수")) return "수";
  return "";
}

function buildPartnerProfile(persona: Persona): LoveCodePartnerProfile {
  const element = getPersonaElement(persona);
  const base = ELEMENT_BASE[element] || DEFAULT_PROFILE;

  const profile: LoveCodePartnerProfile = { ...base };
  const conflictStyle = String(persona.traits?.conflictStyle || "");
  const idealType = String(persona.traits?.idealType || "");
  const attractionBlob = String(persona.traits?.attractionPoints?.join(" ") || "");

  if (conflictStyle.includes("즉시")) {
    profile.conflictPattern = "감정이 올라오면 바로 확인하고 싶어함";
  }
  if (conflictStyle.includes("시간")) {
    profile.conflictPattern = "혼자 정리 후 다시 대화하는 패턴";
    profile.distancePattern = "불안 시 잠시 침묵으로 거리를 둠";
  }
  if (conflictStyle.includes("주관")) {
    profile.commitmentPattern = "관계 기준이 분명하고 타협이 느림";
  }

  if (idealType.includes("지지") || attractionBlob.includes("안정")) {
    profile.relationshipNeed = "정서적 안정과 꾸준함";
  }
  if (idealType.includes("성장") || attractionBlob.includes("도전")) {
    profile.relationshipNeed = "함께 확장되는 관계 경험";
  }
  if (idealType.includes("대화") || attractionBlob.includes("지성")) {
    profile.relationshipNeed = "말이 통하는 깊은 대화";
  }

  return profile;
}

function scenarioBias(profile: LoveCodePartnerProfile, scenario: Scenario): number {
  let score = 0;
  if (scenario.id === "flirt" || scenario.id === "ex") {
    if (profile.jealousyPattern.includes("강") || profile.jealousyPattern.includes("민감")) score += 3;
  }
  if (scenario.id === "bill") {
    if (profile.conflictPattern.includes("바로") || profile.communicationTone.includes("논리")) score += 2;
  }
  if (scenario.id === "rain" || scenario.id === "gift") {
    if (profile.relationshipNeed.includes("안정") || profile.relationshipNeed.includes("공감")) score += 2;
  }
  if (scenario.id === "exhibition") {
    if (profile.relationshipNeed.includes("대화") || profile.emotionalExpression.includes("맥락")) score += 2;
  }
  return score;
}

function selectScenariosForProfile(profile: LoveCodePartnerProfile): Scenario[] {
  const desiredCount = Math.min(5, SCENARIO_DB.length);
  const weighted = [...SCENARIO_DB]
    .map((scenario) => ({
      scenario,
      score: scenarioBias(profile, scenario) + Math.random() * 1.5,
    }))
    .sort((a, b) => b.score - a.score)
    .map((row) => row.scenario);

  return weighted.slice(0, desiredCount);
}

function resolvePreferredElements(persona: Persona): Set<string> {
  const preferred = new Set<string>();
  const desc = String(persona.desc || "");

  if (desc.includes("목")) preferred.add("수");
  if (desc.includes("화")) preferred.add("목");
  if (desc.includes("토")) preferred.add("화");
  if (desc.includes("금")) preferred.add("토");
  if (desc.includes("수")) preferred.add("금");

  const attractionBlob = String(persona.traits?.attractionPoints?.join(" ") || "").toLowerCase();
  if (attractionBlob.includes("밝") || attractionBlob.includes("열정")) preferred.add("화");
  if (attractionBlob.includes("안정") || attractionBlob.includes("신뢰")) preferred.add("토");
  if (attractionBlob.includes("지성") || attractionBlob.includes("유연")) preferred.add("수");
  if (attractionBlob.includes("도전") || attractionBlob.includes("성장")) preferred.add("목");
  if (attractionBlob.includes("원칙") || attractionBlob.includes("정리")) preferred.add("금");

  return preferred;
}

function computePreferenceBonus(persona: Persona, choice: ChoiceWithReaction): number {
  let bonus = 0;
  const preferredElements = resolvePreferredElements(persona);

  if (preferredElements.has(choice.element)) {
    bonus += ELEMENT_SYNERGY[choice.element] ?? 1;
  }

  const conflictStyle = String(persona.traits?.conflictStyle || "");
  if (conflictStyle.includes("즉시") && choice.risk === "LOW") bonus += 1;
  if (conflictStyle.includes("시간") && choice.risk === "HIGH") bonus -= 2;

  const idealType = String(persona.traits?.idealType || "");
  const text = String(choice.text || "");
  if (idealType.includes("대화") && text.includes("설명")) bonus += 1;
  if (idealType.includes("성장") && text.includes("같이")) bonus += 1;
  if (idealType.includes("안정") && (text.includes("괜찮아") || text.includes("기다"))) bonus += 1;

  return Math.max(-3, Math.min(4, bonus));
}

function applyProfileBonus(profile: LoveCodePartnerProfile, choice: ChoiceWithReaction): number {
  let bonus = 0;
  const text = String(choice.text || "");

  if (profile.conflictPattern.includes("바로") && choice.risk === "LOW") bonus += 1;
  if (profile.conflictPattern.includes("침묵") && choice.risk === "HIGH") bonus -= 2;

  if (profile.relationshipNeed.includes("공감") && (text.includes("괜찮아") || text.includes("기다") || text.includes("같이"))) {
    bonus += 2;
  }

  if (profile.relationshipNeed.includes("안정") && (text.includes("다음") || text.includes("약속") || text.includes("함께"))) {
    bonus += 2;
  }

  if (profile.relationshipNeed.includes("대화") && (text.includes("설명") || text.includes("어떻게") || text.includes("생각"))) {
    bonus += 2;
  }

  if (profile.jealousyPattern.includes("민감") && text.includes("알아서")) bonus -= 2;
  if (profile.distancePattern.includes("침묵") && text.includes("말 없이")) bonus += 1;

  return Math.max(-3, Math.min(4, bonus));
}

function personalizeChoices(persona: Persona, scenario: Scenario, profile: LoveCodePartnerProfile): Choice[] {
  const scored = scenario.choices.map((choice) => {
    const preferenceBonus = computePreferenceBonus(persona, choice);
    const profileBonus = applyProfileBonus(profile, choice);
    const totalDelta = Math.max(-10, Math.min(15, choice.affinityDelta + preferenceBonus + profileBonus));
    const signal = totalDelta >= 10 ? "추천" : totalDelta <= 1 ? "주의" : "";

    return {
      text: signal ? `${signal}: ${choice.text}` : choice.text,
      affinityDelta: totalDelta,
      nextStepId: choice.id,
    } satisfies Choice;
  });

  return scored.sort((a, b) => b.affinityDelta - a.affinityDelta);
}

function buildReactionTail(profile: LoveCodePartnerProfile, delta: number): string {
  if (delta >= 9) {
    if (profile.relationshipNeed.includes("공감")) return "(당신의 공감 방식에 마음을 열기 시작했다.)";
    if (profile.relationshipNeed.includes("안정")) return "(신뢰할 수 있는 사람이라는 확신이 생겼다.)";
    return "(호감 신호가 분명히 올라갔다.)";
  }

  if (delta <= 1) {
    if (profile.distancePattern.includes("침묵")) return "(표정은 유지하지만 마음의 거리가 멀어졌다.)";
    return "(표면적으로는 괜찮아 보여도 경계심이 커졌다.)";
  }

  return "";
}

function buildScenarioStoryPrompt(
  profile: LoveCodePartnerProfile,
  scenario: Scenario,
  personaName: string,
  sceneOrder: number,
  totalScenes: number,
): string {
  const sceneHeader = `장면 ${sceneOrder}/${totalScenes} · ${scenario.type} ${scenario.backgroundEmoji}`;
  const storyBase = String(scenario.narrative || scenario.situationDescription || "").trim();

  const profileLine = `${personaName}의 현재 모드: ${profile.loveStyle}, ${profile.communicationTone}.`;
  const tensionLine = `관계 니즈: ${profile.relationshipNeed} / 갈등 패턴: ${profile.conflictPattern}.`;
  const fearLine = `숨은 불안: ${profile.hiddenFear}.`;
  const questionLine = scenario.npcDialogue(personaName);

  return `${sceneHeader}\n\n${storyBase}\n${profileLine}\n${tensionLine}\n${fearLine}\n\n${questionLine}`;
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    currentPersona: null,
    affinity: 50,
    stepIndex: 0,
    isCompleted: false,
    history: [],
  });

  const [activeScenarios, setActiveScenarios] = useState<Scenario[]>([]);

  const startSimulation = useCallback((persona: Persona) => {
    const profile = buildPartnerProfile(persona);
    const selected = selectScenariosForProfile(profile);
    const firstScenario = selected[0];

    setActiveScenarios(selected);
    setState({
      currentPersona: persona,
      affinity: 50,
      stepIndex: 0,
      isCompleted: false,
      history: [
        {
          speaker: "system",
          text: `${persona.name}님과의 대화가 시작되었습니다. (${profile.loveStyle} / ${profile.relationshipNeed})`,
        },
        {
          speaker: "npc",
          text: buildScenarioStoryPrompt(profile, firstScenario, persona.name, 1, selected.length),
        },
      ],
    });
  }, []);

  const handleChoice = useCallback((choice: Choice) => {
    setState((prev) => {
      if (!prev.currentPersona) return prev;

      const nextStepIndex = prev.stepIndex + 1;
      const isLastStep = nextStepIndex >= activeScenarios.length;
      const profile = buildPartnerProfile(prev.currentPersona);

      const newAffinity = Math.max(0, Math.min(100, prev.affinity + choice.affinityDelta));
      
      const newHistory: DialogueStep[] = [
        ...prev.history,
        {
          speaker: "user",
          text: choice.text,
        },
      ];

      // Add NPC reaction
      const currentScenario = activeScenarios[prev.stepIndex];
      const selectedChoice = currentScenario.choices.find(
        (c) => c.id === choice.nextStepId || c.text === choice.text.replace(/^(추천|주의):\s*/, ""),
      );
      if (selectedChoice) {
        const tail = buildReactionTail(profile, choice.affinityDelta);
        newHistory.push({
          speaker: "npc",
          text: `${selectedChoice.reaction(prev.currentPersona.name)}${tail ? ` ${tail}` : ""}`,
        });
      }

      // If there's a next scenario, add its intro
      if (!isLastStep) {
        const nextScenario = activeScenarios[nextStepIndex];
        newHistory.push({
          speaker: "npc",
          text: buildScenarioStoryPrompt(
            profile,
            nextScenario,
            prev.currentPersona.name,
            nextStepIndex + 1,
            activeScenarios.length,
          ),
        });
      }

      return {
        ...prev,
        affinity: newAffinity,
        stepIndex: nextStepIndex,
        isCompleted: isLastStep,
        history: newHistory,
      };
    });
  }, [activeScenarios]);

  const reset = useCallback(() => {
    setState({
      currentPersona: null,
      affinity: 50,
      stepIndex: 0,
      isCompleted: false,
      history: [],
    });
    setActiveScenarios([]);
  }, []);

  return {
    state,
    startSimulation,
    handleChoice,
    reset,
    resolveChoicesForCurrentScenario: () => {
      if (!state.currentPersona) return undefined;
      const scenario = activeScenarios[state.stepIndex];
      if (!scenario) return undefined;
      const profile = buildPartnerProfile(state.currentPersona);
      return personalizeChoices(state.currentPersona, scenario, profile);
    },
    currentScenario: activeScenarios[state.stepIndex],
  };
}
