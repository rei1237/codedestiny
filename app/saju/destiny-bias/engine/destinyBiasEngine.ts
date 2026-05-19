import { calculateBiasCompatibility } from "./compatibilityScore";
import { normalizeBirthDateInput } from "./birthEnergy";
import {
  generateBiasPersonalityReport,
  generateBiasEnergySummary,
  generateChemistrySummary,
  generateCompatibilityReport,
  generateDestinySignal,
  generateEnergyConnectionReport,
} from "./reportTemplates";
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
  biasName: string;
  biasBirthDateInput: string;
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

  const compatibility = calculateBiasCompatibility({
    userBirthDate: normalizedUserBirth.value,
    biasBirthDate: normalizedBiasBirth.value,
    userName,
    biasName,
    biasMood: input.biasMood,
    relationMood: input.relationMood,
  });

  const reportArgs = {
    userName,
    biasName,
    userBirthDate: normalizedUserBirth.value,
    biasBirthDate: normalizedBiasBirth.value,
    userEnergyType: compatibility.userEnergyType,
    biasEnergyType: compatibility.biasEnergyType,
    totalScore: compatibility.totalScore,
    emotionalScore: compatibility.emotionalScore,
    fandomScore: compatibility.fandomScore,
    longTermScore: compatibility.longTermScore,
    supportStyleScore: compatibility.supportStyleScore,
    relationMood: input.relationMood,
    biasMood: input.biasMood,
    connectionKeyword: compatibility.connectionKeyword,
  };

  const biasPersonalityReport = generateBiasPersonalityReport(reportArgs);
  const compatibilityReport = generateCompatibilityReport(reportArgs);
  const energyReport = generateEnergyConnectionReport(reportArgs);
  const chemistrySummary = generateChemistrySummary(reportArgs);
  const destinySignal = generateDestinySignal(reportArgs);
  const biasEnergySummary = generateBiasEnergySummary(reportArgs);

  const gradeMeta = getDestinyGrade(compatibility.totalScore);
  const auraMeta = getAuraTheme(`${userName}:${biasName}:${compatibility.biasEnergyType}`, compatibility.totalScore);
  const pairingAlias = getPairingAlias(userName, biasName, compatibility.totalScore);
  const fansignMessage = getFansignMessage(`${userName}:${biasName}:${input.relationMood}`, compatibility.totalScore);
  const stageAuraComment = getStageAuraComment(compatibility.totalScore, auraMeta.auraType);
  const cheerPoint = getCheerPoint(compatibility.totalScore, input.relationMood);
  const moodKeywords = getMoodKeywords(`${userName}:${biasName}:${input.biasMood}:${input.relationMood}`, 3);
  const matchingTags = [...moodKeywords, ...compatibility.connectionKeyword].slice(0, 6);
  const linkedArtist = normalizeName(input.linkedArtistName || "", `${biasName} Stage Line`);
  const stageChemistryKeywords = [
    compatibility.connectionKeyword[0] || "Neon",
    compatibility.connectionKeyword[1] || "Rhythm",
    moodKeywords[0] || "Spark",
  ].slice(0, 3);

  const seed = [
    userName,
    biasName,
    normalizedUserBirth.value,
    normalizedBiasBirth.value,
    String(compatibility.totalScore),
    input.biasMood,
    input.relationMood,
  ].join("|");

  const destinyId = toDestinyId(seed);
  const issuedAt = formatIssuedDate();

  const cardSvg = createDestinyBiasCardSvg({
    userName,
    biasName,
    userEnergyType: compatibility.userEnergyType,
    biasEnergyType: compatibility.biasEnergyType,
    relationMood: input.relationMood,
    linkedArtist,
    compatibilityScore: compatibility.totalScore,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    destinyGrade: gradeMeta.destinyGrade,
    destinyMessage: energyReport.oneLine,
    destinySignal,
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
    biasEnergyType: compatibility.biasEnergyType,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    energyColor: auraMeta.energyColor,
    relationMood: input.relationMood,
    themeKey: input.themeKey,
    totalScore: compatibility.totalScore,
    connectionKeywords: compatibility.connectionKeyword,
  });

  return {
    userName,
    biasName,
    linkedArtist,
    userBirthDate: normalizedUserBirth.value,
    biasBirthDate: normalizedBiasBirth.value,
    totalScore: compatibility.totalScore,
    emotionalScore: compatibility.emotionalScore,
    fandomScore: compatibility.fandomScore,
    longTermScore: compatibility.longTermScore,
    supportStyleScore: compatibility.supportStyleScore,
    userEnergyType: compatibility.userEnergyType,
    biasEnergyType: compatibility.biasEnergyType,
    auraType: auraMeta.auraType,
    auraMaterial: auraMeta.auraMaterial,
    destinyGrade: gradeMeta.destinyGrade,
    gradeTitle: gradeMeta.gradeTitle,
    pairingAlias,
    energyColor: auraMeta.energyColor,
    editionLabel: auraMeta.editionLabel,
    moodKeywords,
    matchingTags,
    connectionKeyword: compatibility.connectionKeyword,
    chemistrySummary,
    compatibilityDetail: compatibilityReport,
    energyConnectionDetail: energyReport.report,
    biasPersonalityReport,
    compatibilityReport,
    energyConnectionReport: energyReport.report,
    oneLineDestinyMessage: energyReport.oneLine,
    stageAuraComment,
    destinySignal,
    fansignMessage,
    stageChemistryKeywords,
    todayMission: energyReport.mission,
    cheerPoint,
    biasEnergySvg,
    biasEnergySummary,
    destinyId,
    issuedAt,
    cardSvg,
  };
}
