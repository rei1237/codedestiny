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
import type { FandomProfile } from "./fandomProfileEngine";

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
  cardCaption: string;
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
  bottomNotice: string;
  elementDistribution: {
    user: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
    favorite: Record<"wood" | "fire" | "earth" | "metal" | "water", number>;
  };
  fandomProfile: FandomProfile;
  mzLayer: {
    relationMbti: { type: string; desc: string };
    pastLife: { title: string; story: string };
    gradeMeme: string;
    hashtags: string[];
  };
  detailedTabs: Array<{
    id: "chemi" | "element" | "dayMaster" | "branch" | "booster";
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

  // 5섹션 매핑 (① 한줄케미 / ② 오행궁합 / ③ 일간관계 / ④ 지지케미 / ⑤ 부스터)
  const chemiTab = reading.tabs.find((tab) => tab.id === "chemi");
  const elementTab = reading.tabs.find((tab) => tab.id === "element");
  const dayMasterTab = reading.tabs.find((tab) => tab.id === "dayMaster");
  const branchTab = reading.tabs.find((tab) => tab.id === "branch");
  const boosterTab = reading.tabs.find((tab) => tab.id === "booster");

  const userEnergyType = `${reading.sajuSignals.dayMasterRelation || "중립형"} / ${reading.sajuSignals.dayBranchRelation || "일지미상"}`;
  const biasEnergyType = `${reading.chemistryType} · ${reading.sajuSignals.fiveElementBalance || "오행균형"}`;

  const gradeMeta = getDestinyGrade(reading.scores.total);
  const auraMeta = getAuraTheme(`${userName}:${biasName}:${biasEnergyType}`, reading.scores.total);
  const pairingAlias = getPairingAlias(userName, biasName, reading.scores.total);
  const fansignMessage = sanitizeFavoriteDestinyText(getFansignMessage(`${userName}:${biasName}:${input.relationMood}`, reading.scores.total));
  const stageAuraComment = getStageAuraComment(reading.scores.total, auraMeta.auraType);
  const cheerPoint = sanitizeFavoriteDestinyText(getCheerPoint(reading.scores.total, input.relationMood));
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
    destinySignal: sanitizeFavoriteDestinyText(branchTab?.sections[0]?.text || ""),
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
    compatibilityDetail: sanitizeFavoriteDestinyText(elementTab?.sections[0]?.text || ""),
    energyConnectionDetail: sanitizeFavoriteDestinyText(branchTab?.sections[0]?.text || ""),
    biasPersonalityReport: sanitizeFavoriteDestinyText(dayMasterTab?.sections[0]?.text || ""),
    compatibilityReport: sanitizeFavoriteDestinyText(elementTab?.sections[0]?.text || ""),
    energyConnectionReport: sanitizeFavoriteDestinyText(branchTab?.sections[0]?.text || ""),
    oneLineDestinyMessage: sanitizeFavoriteDestinyText(chemiTab?.sections[0]?.text || reading.imageCard.oneLineLink),
    cardCaption: sanitizeFavoriteDestinyText(reading.imageCard.oneLineLink || reading.imageCard.shortMood),
    stageAuraComment,
    destinySignal: sanitizeFavoriteDestinyText(branchTab?.sections[0]?.text || ""),
    fansignMessage,
    stageChemistryKeywords,
    todayMission: sanitizeFavoriteDestinyText(boosterTab?.sections[0]?.action || ""),
    cheerPoint,
    biasEnergySvg,
    biasEnergySummary: sanitizeFavoriteDestinyText(boosterTab?.sections[0]?.text || ""),
    destinyId,
    issuedAt,
    cardSvg,
    chemistryType: reading.chemistryType,
    bottomNotice: reading.bottomNotice,
    elementDistribution: reading.elementDistribution,
    fandomProfile: {
      ...reading.fandomProfile,
      biasCharacterOneLiner: sanitizeFavoriteDestinyText(reading.fandomProfile.biasCharacterOneLiner),
      entryText: sanitizeFavoriteDestinyText(reading.fandomProfile.entryText),
      tasteFirstAttraction: sanitizeFavoriteDestinyText(reading.fandomProfile.tasteFirstAttraction),
      tasteLongTermReason: sanitizeFavoriteDestinyText(reading.fandomProfile.tasteLongTermReason),
      deepDiveText: sanitizeFavoriteDestinyText(reading.fandomProfile.deepDiveText),
      relationshipText: sanitizeFavoriteDestinyText(reading.fandomProfile.relationshipText),
      obsessionText: sanitizeFavoriteDestinyText(reading.fandomProfile.obsessionText),
      persistenceText: sanitizeFavoriteDestinyText(reading.fandomProfile.persistenceText),
      detachmentReasonText: sanitizeFavoriteDestinyText(reading.fandomProfile.detachmentReasonText),
      detachmentStyleText: sanitizeFavoriteDestinyText(reading.fandomProfile.detachmentStyleText),
      finalPhilosophy: sanitizeFavoriteDestinyText(reading.fandomProfile.finalPhilosophy),
    },
    mzLayer: reading.mzLayer,
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
