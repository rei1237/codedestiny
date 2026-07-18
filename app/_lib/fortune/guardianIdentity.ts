// 사주 가디언 소환진의 "캐릭터 정체성"을 LLM 없이 정적(결정론)으로 만든다.
// 같은 명식이면 항상 같은 이름·칭호·성격·서사가 나오므로 영구해금(재열람) 모델과 정합한다.
// 십성 리딩은 명리 엔진(localSajuCalculator)의 정본 텍스트를 재사용해, 같은 오행이라도
// 월간·시간 기둥이 다르면 리딩이 달라지도록 개인화한다.

import { GANJI_60 } from "./ganjiGuardianSprite";
import { getTenGodOperation, tenGodForStem } from "@/app/saju/animal-destiny/engine/localSajuCalculator";

type ElementKo = "목" | "화" | "토" | "금" | "수";
type StemArg = Parameters<typeof tenGodForStem>[0];

const STEMS_SET = new Set(["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]);

const ELEMENT_LABEL: Record<ElementKo, string> = {
  목: "목(木)", 화: "화(火)", 토: "토(土)", 금: "금(金)", 수: "수(水)",
};

// 오행별 12개 이름 풀 — 일주 인덱스로 결정론 선택(음양으로 한 칸 시프트해 양/음이 서로 다른 이름을 갖게).
const NAME_POOL: Record<ElementKo, string[]> = {
  목: ["새록", "담록", "여울", "도담", "이든", "푸르", "서린", "늘봄", "하람", "다온", "유담", "초아"],
  화: ["노을", "이랑", "다홍", "빛나", "하랑", "온슬", "라온", "단아", "해든", "볕뉘", "이글", "홍아"],
  토: ["마루", "터안", "온달", "든해", "바오", "우리", "나래", "해담", "두리", "하울", "미르", "다올"],
  금: ["서리", "은결", "하연", "새하", "소윤", "정온", "결이", "슬아", "리안", "유리", "온새", "다인"],
  수: ["여운", "물비", "파랑", "하늘", "이슬", "시내", "온유", "바다", "가람", "소하", "유하", "래오"],
};

const TITLE: Record<ElementKo, { 양: string; 음: string }> = {
  목: { 양: "새벽 숲을 여는 수호령", 음: "여린 싹을 품는 수호령" },
  화: { 양: "타오르는 빛의 수호령", 음: "은은한 불씨의 수호령" },
  토: { 양: "든든한 대지의 수호령", 음: "품어 안는 흙의 수호령" },
  금: { 양: "서슬 푸른 칼날의 수호령", 음: "맑게 벼려진 달빛의 수호령" },
  수: { 양: "굽이치는 큰 물의 수호령", 음: "고요한 물길의 수호령" },
};

const FLAVOR: Record<ElementKo, { trait: string; guard: string; birth: string; voice: string }> = {
  목: {
    trait: "새로 뻗어 오르는 생장의 기운",
    guard: "당신이 멈춰 설 때 다시 시작할 용기를 심어 드려요",
    birth: "봄기운이 명식을 밀어 올리던 새벽",
    voice: "따뜻하고 씩씩하게",
  },
  화: {
    trait: "환하게 타오르는 표현의 열기",
    guard: "당신의 빛이 꺼지지 않도록 곁에서 불씨를 지켜 드려요",
    birth: "한낮의 불꽃이 명식 위로 피어오르던 순간",
    voice: "환하고 다정하게",
  },
  토: {
    trait: "가운데를 지키는 단단한 무게중심",
    guard: "당신이 흔들릴 때 발밑을 단단히 받쳐 드려요",
    birth: "흩어진 기운이 대지로 모이던 고요한 한낮",
    voice: "듬직하고 포근하게",
  },
  금: {
    trait: "맑게 벼려낸 분별과 결단",
    guard: "당신이 흐릿할 때 선을 긋고 결정을 도와 드려요",
    birth: "서늘한 금기가 명식을 벼려내던 저물녘",
    voice: "또렷하고 단정하게",
  },
  수: {
    trait: "깊이 흐르는 통찰과 지혜",
    guard: "당신이 조급할 때 흐름을 읽고 때를 기다리게 도와 드려요",
    birth: "깊은 물길이 명식을 적시던 늦은 밤",
    voice: "잔잔하고 지혜롭게",
  },
};

export interface GuardianIdentity {
  name: string;
  title: string;
  personality: string;
  narrative: string;
}

export interface GuardianSection {
  title: string;
  body: string;
}

function normalizeElement(value: string): ElementKo {
  const head = String(value || "").trim().charAt(0);
  if (head === "목" || head === "화" || head === "토" || head === "금" || head === "수") return head;
  return "토";
}

function ganjiIndex(ganji: string): number {
  const idx = GANJI_60.indexOf(ganji as (typeof GANJI_60)[number]);
  return idx >= 0 ? idx : 0;
}

function hasBatchim(word: string): boolean {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

// 받침 유무로 목적격 조사(을/를)를 고른다.
function objectJosa(word: string): "을" | "를" {
  return hasBatchim(word) ? "을" : "를";
}

// 받침 유무로 서술격 조사(이에요/예요)를 고른다.
function copula(word: string): "이에요" | "예요" {
  return hasBatchim(word) ? "이에요" : "예요";
}

export function buildGuardianIdentity(params: {
  ganji: string;
  element: string;
  polarity: string;
  animal: string;
}): GuardianIdentity {
  const element = normalizeElement(params.element);
  const polarity: "양" | "음" = params.polarity === "음" ? "음" : "양";
  const animal = String(params.animal || "").trim() || "수호령";
  const pool = NAME_POOL[element];
  const base = ganjiIndex(params.ganji);
  const name = pool[(base + (polarity === "음" ? 1 : 0)) % pool.length];
  const flavor = FLAVOR[element];

  const personality = `저는 ${name}${copula(name)}. ${animal}의 모습으로 당신 곁에 온 ${ELEMENT_LABEL[element]} 수호령이죠. ${flavor.trait}${objectJosa(flavor.trait)} 품고, ${flavor.voice} 당신을 지켜봐요.`;
  const narrative = `${params.ganji}일주의 기운이 무르익던 그때, ${flavor.birth}에 저는 당신에게 왔어요. ${flavor.guard}. 당신이 흔들리는 밤에도 조용히 곁을 지킬게요.`;

  return {
    name,
    title: TITLE[element][polarity],
    personality,
    narrative,
  };
}

// 월간·시간 기둥의 천간을 일간 대비 십성으로 판정해, 명식별로 달라지는 개인화 섹션을 만든다.
export function buildTenGodReadings(dayStem: string, monthStem: string, hourStem: string): GuardianSection[] {
  if (!STEMS_SET.has(dayStem)) return [];
  const sections: GuardianSection[] = [];

  if (STEMS_SET.has(monthStem)) {
    const god = tenGodForStem(dayStem as StemArg, monthStem as StemArg);
    const op = getTenGodOperation(god);
    sections.push({ title: `타고난 성향 · ${god}`, body: op.personality });
    sections.push({ title: `일과 직업의 결 · ${god}`, body: op.career });
    sections.push({ title: `재물의 흐름 · ${god}`, body: op.wealth });
    sections.push({ title: `관계와 인연 · ${god}`, body: op.love });
  }

  if (STEMS_SET.has(hourStem)) {
    const hgod = tenGodForStem(dayStem as StemArg, hourStem as StemArg);
    const hop = getTenGodOperation(hgod);
    sections.push({ title: `하루 속 수호 리듬 · ${hgod}`, body: hop.luckAmplification });
  }

  return sections;
}
