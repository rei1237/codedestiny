import { calculateBiasCompatibility } from "./compatibilityScore";
import { normalizeBirthDateInput } from "./birthEnergy";
import { generateBiasPersonalityReport, generateCompatibilityReport, generateEnergyConnectionReport } from "./reportTemplates";
import { createDestinyBiasCardSvg } from "../utils/createDestinyBiasSvg";

export type DestinyBiasAnalyzeInput = {
  userName: string;
  userBirthDateInput: string;
  biasName: string;
  biasBirthDateInput: string;
  biasMood: string;
  relationMood: string;
  themeLabel: string;
};

export type DestinyBiasAnalyzeResult = {
  userName: string;
  biasName: string;
  userBirthDate: string;
  biasBirthDate: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  userEnergyType: string;
  biasEnergyType: string;
  connectionKeyword: string[];
  biasPersonalityReport: string;
  compatibilityReport: string;
  energyConnectionReport: string;
  oneLineDestinyMessage: string;
  todayMission: string;
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
    compatibilityScore: compatibility.totalScore,
    energyType: compatibility.biasEnergyType,
    destinyMessage: energyReport.oneLine,
    destinyId,
    issuedAt,
    themeLabel: input.themeLabel,
  });

  return {
    userName,
    biasName,
    userBirthDate: normalizedUserBirth.value,
    biasBirthDate: normalizedBiasBirth.value,
    totalScore: compatibility.totalScore,
    emotionalScore: compatibility.emotionalScore,
    fandomScore: compatibility.fandomScore,
    longTermScore: compatibility.longTermScore,
    supportStyleScore: compatibility.supportStyleScore,
    userEnergyType: compatibility.userEnergyType,
    biasEnergyType: compatibility.biasEnergyType,
    connectionKeyword: compatibility.connectionKeyword,
    biasPersonalityReport,
    compatibilityReport,
    energyConnectionReport: energyReport.report,
    oneLineDestinyMessage: energyReport.oneLine,
    todayMission: energyReport.mission,
    destinyId,
    issuedAt,
    cardSvg,
  };
}
