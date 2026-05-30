import { normalizeBirthDateInput } from "./birthEnergy";
import {
  buildFavoriteDestinyFromSaju,
  sanitizeFavoriteDestinyText,
  validateFavoriteDestinyReading,
} from "./favoriteDestinyReading";
import { createDestinyBiasCardSvg } from "../utils/createDestinyBiasSvg";
import { createBiasEnergySvg } from "../utils/createBiasEnergySvg";
import {
  getAuraTheme,
  getCheerPoint,
  getDestinyGrade,
  getFansignMessage,
  getMoodKeywords,
  getPairingAlias,
  getStageAuraComment,
} from "./destinyBiasMeta";

export type DestinyBiasAnalyzeInput = {
  userName: string;
  userBirthDateInput: string;
  userBirthTimeInput?: string;
  biasName: string;
  biasBirthDateInput: string;
  biasBirthTimeInput?: string;
  linkedArtistName?: string;
  biasMood: string;
  relationMood: string;
  themeKey?: string;
  themeLabel: string;
};

export type DestinyBiasAnalyzeResult = {
  userName: string;
  biasName: string;
  linkedArtist: string;
  userBirthDate: string;
  biasBirthDate: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  userEnergyType: string;
  biasEnergyType: string;
  auraType: string;
  auraMaterial: string;
  destinyGrade: string;
  gradeTitle: string;
  pairingAlias: string;
  energyColor: string;
  editionLabel: string;
  moodKeywords: string[];
  matchingTags: string[];
  connectionKeyword: string[];
  chemistrySummary: string;
  compatibilityDetail: string;
  energyConnectionDetail: string;
  biasPersonalityReport: string;
  compatibilityReport: string;
  energyConnectionReport: string;
  oneLineDestinyMessage: string;
  stageAuraComment: string;
  destinySignal: string;
  fansignMessage: string;
  stageChemistryKeywords: string[];
  todayMission: string;
  cheerPoint: string;
  biasEnergySvg: string;
  biasEnergySummary: string;
  destinyId: string;
  issuedAt: string;
  cardSvg: string;
  chemistryType: string;
  birthDataStatus: {
    user: "complete" | "dateOnly" | "unknownTime";
    favorite: "complete" | "dateOnly" | "unknownTime";
  };
  sajuSignals: {
    dayMasterRelation?: string;
    dayBranchRelation?: string;
    fiveElementBalance?: string;
    tenGodRelation?: string;
    harmonySignals: string[];
    conflictSignals: string[];
    charmSignals: string[];
    longTermSignals: string[];
  };
  detailedTabs: Array<{
    id: "summary" | "chemistry" | "emotion" | "fanBias" | "stability" | "caution" | "advice";
    label: string;
    shortLabel: string;
    title: string;
    keywords: string[];
    sections: Array<{
      title: string;
      usedSignals: string[];
      text: string;
      action?: string;
    }>;
  }>;
};

function normalizeName(value: string, fallback: string) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 24) : fallback;
}

function toDestinyId(seedText: string) {
  let hash = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    hash ^= seedText.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const value = Math.abs(hash >>> 0).toString(36).toUpperCase().padStart(8, "0");
  return `DB-${value}`;
}

function formatIssuedDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function analyzeDestinyBias(input: DestinyBiasAnalyzeInput): DestinyBiasAnalyzeResult {
  const userName = normalizeName(input.userName, "나");
  const biasName = normalizeName(input.biasName, "최애");

  const normalizedUserBirth = normalizeBirthDateInput(input.userBirthDateInput);
  if (!normalizedUserBirth.ok) {
    const reason = "reason" in normalizedUserBirth ? normalizedUserBirth.reason : "입력 형식을 확인해 주세요.";
    throw new Error(`나의 생년월일: ${reason}`);
  }

  const normalizedBiasBirth = normalizeBirthDateInput(input.biasBirthDateInput);
  if (!normalizedBiasBirth.ok) {
    const reason = "reason" in normalizedBiasBirth ? normalizedBiasBirth.reason : "입력 형식을 확인해 주세요.";
    throw new Error(`최애의 생년월일: ${reason}`);
  }

  const reading = buildFavoriteDestinyFromSaju(
    {
      name: userName,
      birthDate: normalizedUserBirth.value,
      birthTimeInput: input.userBirthTimeInput,
    },
    {
      name: biasName,
      birthDate: normalizedBiasBirth.value,
      birthTimeInput: input.biasBirthTimeInput,
    }
  );

  const validation = validateFavoriteDestinyReading(reading);
  if (!validation.ok) {
    throw new Error(`최애운명 리딩 검증 실패: ${validation.errors[0] || "알 수 없는 오류"}`);
  }

  const userEnergyType = `${reading.sajuSignals.dayMasterRelation || "중립형"} / ${reading.sajuSignals.dayBranchRelation || "일지미상"}`;
  const biasEnergyType = `${reading.chemistryType} · ${reading.sajuSignals.fiveElementBalance || "오행균형"}`;

  const gradeMeta = getDestinyGrade(reading.scores.total);
  const auraMeta = getAuraTheme(`${userName}:${biasName}:${biasEnergyType}`, reading.scores.total);
  const pairingAlias = getPairingAlias(userName, biasName, reading.scores.total);
  const fansignMessage = sanitizeFavoriteDestinyText(
    reading.tabs.find((tab) => tab.id === "advice")?.sections[0]?.text ||
    getFansignMessage(`${userName}:${biasName}:${input.relationMood}`, reading.scores.total)
  );
  const stageAuraComment = getStageAuraComment(reading.scores.total, auraMeta.auraType);
  const cheerPoint = sanitizeFavoriteDestinyText(
    reading.tabs.find((tab) => tab.id === "fanBias")?.sections[0]?.action ||
    getCheerPoint(reading.scores.total, input.relationMood)
  );
  const moodKeywords = getMoodKeywords(`${userName}:${biasName}:${input.biasMood}:${input.relationMood}`, 3);
  const matchingTags = [...moodKeywords, ...reading.imageCard.keywords].slice(0, 6);
  const linkedArtist = normalizeName(input.linkedArtistName || "", `${biasName} Stage Line`);
  const stageChemistryKeywords = [
    reading.imageCard.keywords[0] || "공명",
    reading.imageCard.keywords[1] || "안정",
    moodKeywords[0] || "케미",
  ].slice(0, 3);

  const seed = [
    userName,
    biasName,
    normalizedUserBirth.value,
    normalizedBiasBirth.value,
    String(reading.scores.total),
    input.biasMood,
    input.relationMood,
  ].join("|");

  const destinyId = toDestinyId(seed);
  const issuedAt = formatIssuedDate();

  const cardSvg = createDestinyBiasCardSvg({
    userName,
    biasName,
    userEnergyType,
    biasEnergyType,
    relationMood: input.relationMood,
    linkedArtist,
    compatibilityScore: reading.scores.total,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    destinyGrade: gradeMeta.destinyGrade,
    destinyMessage: sanitizeFavoriteDestinyText(reading.imageCard.oneLineLink),
    destinySignal: sanitizeFavoriteDestinyText(reading.tabs.find((tab) => tab.id === "caution")?.sections[0]?.text || ""),
    fansignMessage,
    destinyId,
    issuedAt,
    energyColor: auraMeta.energyColor,
    pairingAlias,
    editionLabel: auraMeta.editionLabel,
    stageChemistryKeywords,
    themeKey: input.themeKey,
    themeLabel: input.themeLabel,
  });

  const biasEnergySvg = createBiasEnergySvg({
    biasName,
    biasEnergyType,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    energyColor: auraMeta.energyColor,
    relationMood: input.relationMood,
    themeKey: input.themeKey,
    totalScore: reading.scores.total,
    connectionKeywords: reading.imageCard.keywords,
  });

  const summaryTab = reading.tabs.find((tab) => tab.id === "summary");
  const chemistryTab = reading.tabs.find((tab) => tab.id === "chemistry");
  const emotionTab = reading.tabs.find((tab) => tab.id === "emotion");
  const cautionTab = reading.tabs.find((tab) => tab.id === "caution");
  const adviceTab = reading.tabs.find((tab) => tab.id === "advice");
  const stabilityTab = reading.tabs.find((tab) => tab.id === "stability");
  const fanBiasTab = reading.tabs.find((tab) => tab.id === "fanBias");

  return {
    userName,
    biasName,
    linkedArtist,
    userBirthDate: normalizedUserBirth.value,
    biasBirthDate: normalizedBiasBirth.value,
    totalScore: reading.scores.total,
    emotionalScore: reading.scores.emotion,
    fandomScore: reading.scores.fanBias,
    longTermScore: reading.scores.longTerm,
    supportStyleScore: reading.scores.stability,
    userEnergyType,
    biasEnergyType,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    destinyGrade: gradeMeta.destinyGrade,
    gradeTitle: gradeMeta.gradeTitle,
    pairingAlias,
    energyColor: auraMeta.energyColor,
    editionLabel: auraMeta.editionLabel,
    moodKeywords,
    matchingTags,
    connectionKeyword: reading.imageCard.keywords,
    chemistrySummary: sanitizeFavoriteDestinyText(reading.summary),
    compatibilityDetail: sanitizeFavoriteDestinyText(summaryTab?.sections[0]?.text || ""),
    energyConnectionDetail: sanitizeFavoriteDestinyText(emotionTab?.sections[0]?.text || ""),
    biasPersonalityReport: sanitizeFavoriteDestinyText(chemistryTab?.sections[0]?.text || ""),
    compatibilityReport: sanitizeFavoriteDestinyText(summaryTab?.sections[0]?.text || ""),
    energyConnectionReport: sanitizeFavoriteDestinyText(emotionTab?.sections[0]?.text || ""),
    oneLineDestinyMessage: sanitizeFavoriteDestinyText(reading.imageCard.oneLineLink),
    stageAuraComment,
    destinySignal: sanitizeFavoriteDestinyText(cautionTab?.sections[0]?.text || ""),
    fansignMessage,
    stageChemistryKeywords,
    todayMission: sanitizeFavoriteDestinyText(adviceTab?.sections[0]?.action || ""),
    cheerPoint,
    biasEnergySvg,
    biasEnergySummary: sanitizeFavoriteDestinyText(stabilityTab?.sections[0]?.text || ""),
    destinyId,
    issuedAt,
    cardSvg,
    chemistryType: reading.chemistryType,
    birthDataStatus: {
      user: reading.user.birthDataStatus,
      favorite: reading.favorite.birthDataStatus,
    },
    sajuSignals: reading.sajuSignals,
    detailedTabs: reading.tabs.map((tab) => ({
      ...tab,
      sections: tab.sections.map((section) => ({
        ...section,
        text: sanitizeFavoriteDestinyText(section.text),
        action: section.action ? sanitizeFavoriteDestinyText(section.action) : undefined,
      })),
    })),
  };
}
