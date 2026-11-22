import { definitions, type Command } from "./formation";

export type EncounterId = "tutorial" | "single" | "multi" | "waves" | "boss";
export type EnemySpec = {
  name: string;
  hp: number;
  atk: number;
  defense: number;
  boss?: boolean;
};
const petal: EnemySpec = {
  name: "분홍 종이학",
  hp: 840,
  atk: 104,
  defense: 12,
};
const moth: EnemySpec = { name: "먹빛 종이학", hp: 690, atk: 120, defense: 8 };
const keeper: EnemySpec = {
  name: "달무리 학 수호령",
  hp: 3800,
  atk: 168,
  defense: 25,
  boss: true,
};
export const encounters: Record<
  EncounterId,
  { name: string; description: string; waves: EnemySpec[][] }
> = {
  tutorial: {
    name: "꽃잎의 첫 수",
    description:
      "피해는 버스터, 게이지는 아츠, 다음 턴의 치명타는 퀵으로 준비하세요.",
    waves: [[{ ...petal, hp: 540, atk: 48 }]],
  },
  single: {
    name: "향로의 불씨",
    description: "한 대상에게 카드 순서와 스킬 효과를 시험합니다.",
    waves: [[{ ...petal, hp: 1730, atk: 130 }]],
  },
  multi: {
    name: "쌍월의 정원",
    description: "표적을 선택해 두 적의 공격 횟수를 줄이세요.",
    waves: [[petal, moth]],
  },
  waves: {
    name: "꽃비 내리는 길",
    description: "첫 무리를 지나면 남은 체력과 게이지로 다음 무리를 맞습니다.",
    waves: [[petal], [moth, { ...petal, hp: 1150 }]],
  },
  boss: {
    name: "달무리의 주인",
    description:
      "차지 두 칸에서 강공격을 예고합니다. 이때 공격하면 반향 피해 35를 받아요.",
    waves: [[keeper]],
  },
};

type SkillEffect =
  | "charge"
  | "delay"
  | "arts"
  | "guard"
  | "expose"
  | "finish"
  | "stars"
  | "rhythm"
  | "heal"
  | "burst";
type Skill = {
  name: string;
  effect: SkillEffect;
  value: number;
  cooldown: number;
  description: string;
};
type SkillData = [SkillEffect, number, number, string];
type Kit = {
  skills: [SkillData, SkillData, SkillData];
  ultimate: Command;
  hits: Record<Command, number>;
  passiveDescription: string;
  weakness: string;
};
export const kits: Record<string, Kit> = {
  yeon: {
    skills: [
      [
        "heal",
        110,
        3,
        "전열에서 체력 비율이 가장 낮은 동료의 HP를 110 회복합니다.",
      ],
      ["guard", 25, 4, "이번 턴 전열이 받는 적 공격을 25% 줄입니다."],
      ["charge", 10, 4, "전열 전체의 운명 게이지가 10 오릅니다."],
    ],
    ultimate: "Arts",
    hits: { Quick: 2, Arts: 2, Buster: 1 },
    passiveDescription: "턴 종료에 자신의 HP를 12 회복합니다.",
    weakness: "단일 공격의 위력이 낮습니다.",
  },
  neo: {
    skills: [
      ["delay", 1, 4, "선택한 적의 차지를 한 칸 줄입니다."],
      ["expose", 22, 3, "이번 턴 선택한 적이 받는 피해가 22% 증가합니다."],
      ["burst", 28, 4, "두 턴 동안 자신의 버스터 피해가 28% 증가합니다."],
    ],
    ultimate: "Buster",
    hits: { Quick: 3, Arts: 1, Buster: 2 },
    passiveDescription: "자신의 치명타 피해 배율이 1.6배입니다.",
    weakness: "치명타 자원을 스스로 확보하기 어렵습니다.",
  },
  yun: {
    skills: [
      ["charge", 15, 4, "전열 전체의 운명 게이지가 15 오릅니다."],
      ["delay", 2, 4, "선택한 적의 차지를 두 칸 줄입니다."],
      ["arts", 24, 4, "두 턴 동안 전열 전체의 아츠 피해가 24% 증가합니다."],
    ],
    ultimate: "Arts",
    hits: { Quick: 2, Arts: 3, Buster: 1 },
    passiveDescription: "아츠 한 장당 게이지를 2 더 얻습니다.",
    weakness: "버스터 카드가 한 장뿐입니다.",
  },
  pje: {
    skills: [
      ["expose", 30, 4, "이번 턴 선택한 적이 받는 피해가 30% 증가합니다."],
      [
        "guard",
        45,
        4,
        "자신의 HP 60을 사용하여 이번 턴 전열이 받는 적 공격을 45% 줄입니다. 남는 HP는 최소 1입니다.",
      ],
      [
        "finish",
        40,
        3,
        "두 턴 동안 남은 체력이 절반 이하인 적에게 자신의 피해가 40% 증가합니다.",
      ],
    ],
    ultimate: "Buster",
    hits: { Quick: 2, Arts: 2, Buster: 2 },
    passiveDescription: "자신이 받는 적 공격이 6% 감소합니다.",
    weakness: "마무리 스킬은 적의 체력이 절반 이하일 때만 유효합니다.",
  },
  moka: {
    skills: [
      ["stars", 12, 3, "다음 손패의 치명타 자원을 12 생성합니다."],
      [
        "heal",
        95,
        3,
        "전열에서 체력 비율이 가장 낮은 동료의 HP를 95 회복합니다.",
      ],
      [
        "rhythm",
        30,
        3,
        "두 턴 동안 자신이 연달아 실행하는 두 번째 이후 카드 피해가 30% 증가합니다.",
      ],
    ],
    ultimate: "Quick",
    hits: { Quick: 4, Arts: 2, Buster: 1 },
    passiveDescription: "퀵 한 장당 다음 턴 치명타 자원을 2 더 얻습니다.",
    weakness: "연속 공격은 자신의 카드가 손에 있어야 합니다.",
  },
  ln: {
    skills: [
      [
        "heal",
        160,
        3,
        "전열에서 체력 비율이 가장 낮은 동료의 HP를 160 회복합니다.",
      ],
      ["guard", 30, 4, "이번 턴 전열이 받는 적 공격을 30% 줄입니다."],
      ["stars", 8, 3, "다음 손패의 치명타 자원을 8 생성합니다."],
    ],
    ultimate: "Quick",
    hits: { Quick: 3, Arts: 2, Buster: 1 },
    passiveDescription: "자신의 첫 운명 게이지가 10 증가합니다.",
    weakness: "전열의 게이지를 즉시 올려 주는 스킬이 없습니다.",
  },
};
kits["moka-stage"] = {
  skills: [
    ["charge", 12, 4, "전열 전체의 운명 게이지가 12 오릅니다."],
    ["arts", 20, 4, "두 턴 동안 전열 전체의 아츠 피해가 20% 증가합니다."],
    ["stars", 6, 3, "다음 손패의 치명타 자원을 6 생성합니다."],
  ],
  ultimate: "Arts",
  hits: { Quick: 3, Arts: 4, Buster: 1 },
  passiveDescription: "아츠 한 장당 게이지를 2 더 얻습니다.",
  weakness: "기본 모카보다 체력과 직접 피해가 낮습니다.",
};
export function battleKit(variantId: string, baseCharacterId: string) {
  return kits[variantId] ?? kits[baseCharacterId];
}
export const skillRank = (rank = 1) =>
  Math.max(1, Math.min(5, Math.trunc(rank)));
export function skillDefinitions(
  id: string,
  levels: number | number[] = 1,
): Skill[] {
  const variant = definitions[id] ?? definitions[id + "-base"];
  return battleKit(variant.battleVariantId, variant.baseCharacterId).skills.map(
    ([effect, base, cooldown, description], i) => {
      const rank = skillRank(Array.isArray(levels) ? levels[i] : levels);
      const value =
        effect === "delay" ? base : Math.round(base * (1 + (rank - 1) * 0.1));
      const recovery = effect === "delay" ? (rank - 1) * 2 : 0;
      const detail =
        description.replace(String(base), String(value)) +
        (recovery ? " 자신의 게이지 +" + recovery + "." : "");
      return {
        name: variant.skills[i],
        effect,
        value,
        cooldown: effect === "delay" && rank >= 3 ? cooldown - 1 : cooldown,
        description: detail,
      };
    },
  );
}
export const cardRules: Record<
  Command,
  { power: number; gauge: number; stars: number }
> = {
  Quick: { power: 0.85, gauge: 6, stars: 8 },
  Arts: { power: 0.95, gauge: 18, stars: 1 },
  Buster: { power: 1.45, gauge: 2, stars: 1 },
};
