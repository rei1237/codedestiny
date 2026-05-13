import { getBirthNumberEnergy, getNameHashEnergy, getSeasonEnergy, parseBirthDate } from "./birthEnergy";

export type CompatibilityInput = {
  userBirthDate: string;
  biasBirthDate: string;
  userName: string;
  biasName: string;
  biasMood: string;
  relationMood: string;
};

export type CompatibilityResult = {
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  userEnergyType: string;
  biasEnergyType: string;
  connectionKeyword: string[];
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function mix(base: number, spread: number, seed: number) {
  const wave = Math.sin(seed) * 0.5 + Math.cos(seed * 0.37) * 0.5;
  return clampScore(base + wave * spread);
}

export function calculateBiasCompatibility(input: CompatibilityInput): CompatibilityResult {
  const userDate = parseBirthDate(input.userBirthDate);
  const biasDate = parseBirthDate(input.biasBirthDate);

  const userSeason = getSeasonEnergy(userDate.value);
  const biasSeason = getSeasonEnergy(biasDate.value);

  const userBirthNum = getBirthNumberEnergy(userDate.value);
  const biasBirthNum = getBirthNumberEnergy(biasDate.value);

  const userNameHash = getNameHashEnergy(input.userName);
  const biasNameHash = getNameHashEnergy(input.biasName);

  const dayDiff = Math.abs(userDate.day - biasDate.day);
  const monthDiff = Math.abs(userDate.month - biasDate.month);
  const yearGap = Math.abs(userDate.year - biasDate.year);

  const moodSeed = [...String(input.biasMood || ""), ...String(input.relationMood || "")]
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const baseSeed =
    userBirthNum.sum * 1.17
    + biasBirthNum.sum * 1.39
    + userNameHash.hash * 0.0019
    + biasNameHash.hash * 0.0023
    + dayDiff * 3.1
    + monthDiff * 5.7
    + yearGap * 1.2
    + moodSeed * 0.013;

  const seasonBonus = userSeason.element === biasSeason.element ? 4 : 0;
  const complementBonus = (userSeason.element === "화" && biasSeason.element === "목") || (userSeason.element === "수" && biasSeason.element === "금")
    ? 3
    : 0;

  const emotionalScore = mix(56 + seasonBonus * 2, 32, baseSeed + 3.1);
  const fandomScore = mix(58 + complementBonus * 2, 30, baseSeed + 7.3);
  const longTermScore = mix(52 + Math.max(0, 10 - Math.floor(yearGap / 3)), 33, baseSeed + 11.9);
  const supportStyleScore = mix(55 + Math.max(0, 12 - dayDiff), 28, baseSeed + 19.4);

  const totalScore = clampScore(
    emotionalScore * 0.34
    + fandomScore * 0.28
    + longTermScore * 0.2
    + supportStyleScore * 0.18,
  );

  const userEnergyType = `${userSeason.label} · ${userBirthNum.label}형`;
  const biasEnergyType = `${biasSeason.label} · ${biasBirthNum.label}형`;

  const keywordPool = [
    userNameHash.aura,
    biasNameHash.aura,
    userNameHash.focus,
    biasNameHash.focus,
    `${input.biasMood} 무드`,
    `${input.relationMood} 리듬`,
    `${userSeason.label}`,
    `${biasSeason.label}`,
  ].filter(Boolean);

  const connectionKeyword: string[] = [];
  for (let index = 0; index < keywordPool.length && connectionKeyword.length < 5; index += 1) {
    const value = keywordPool[(index * 3 + totalScore) % keywordPool.length];
    if (!connectionKeyword.includes(value)) {
      connectionKeyword.push(value);
    }
  }

  return {
    totalScore,
    emotionalScore,
    fandomScore,
    longTermScore,
    supportStyleScore,
    userEnergyType,
    biasEnergyType,
    connectionKeyword,
  };
}
