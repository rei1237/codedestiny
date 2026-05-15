import type {
  BranchKo,
  SajuEngineResult,
  StageSource,
  StemKo,
  TwelveStage,
  TwelveStagePillars,
  TwelveStageResult,
} from "./types";
import { STAGE_KEY_TO_HANJA, STAGE_KEY_TO_LABEL, STAGE_LABEL_TO_KEY } from "@/components/fortune/animal-twelve/animalTwelveData";

const STEM_KO_LIST: StemKo[] = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCH_KO_LIST: BranchKo[] = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const STEM_HAN_TO_KO: Record<string, StemKo> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

const BRANCH_HAN_TO_KO: Record<string, BranchKo> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const TWELVE_STAGE_TABLE: Record<StemKo, Record<BranchKo, TwelveStage>> = {
  갑: { 해: "장생", 자: "목욕", 축: "관대", 인: "건록", 묘: "제왕", 진: "쇠", 사: "병", 오: "사", 미: "묘", 신: "절", 유: "태", 술: "양" },
  을: { 오: "장생", 사: "목욕", 진: "관대", 묘: "건록", 인: "제왕", 축: "쇠", 자: "병", 해: "사", 술: "묘", 유: "절", 신: "태", 미: "양" },
  병: { 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절", 자: "태", 축: "양" },
  정: { 유: "장생", 신: "목욕", 미: "관대", 오: "건록", 사: "제왕", 진: "쇠", 묘: "병", 인: "사", 축: "묘", 자: "절", 해: "태", 술: "양" },
  무: { 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절", 자: "태", 축: "양" },
  기: { 유: "장생", 신: "목욕", 미: "관대", 오: "건록", 사: "제왕", 진: "쇠", 묘: "병", 인: "사", 축: "묘", 자: "절", 해: "태", 술: "양" },
  경: { 사: "장생", 오: "목욕", 미: "관대", 신: "건록", 유: "제왕", 술: "쇠", 해: "병", 자: "사", 축: "묘", 인: "절", 묘: "태", 진: "양" },
  신: { 자: "장생", 해: "목욕", 술: "관대", 유: "건록", 신: "제왕", 미: "쇠", 오: "병", 사: "사", 진: "묘", 묘: "절", 인: "태", 축: "양" },
  임: { 신: "장생", 유: "목욕", 술: "관대", 해: "건록", 자: "제왕", 축: "쇠", 인: "병", 묘: "사", 진: "묘", 사: "절", 오: "태", 미: "양" },
  계: { 묘: "장생", 인: "목욕", 축: "관대", 자: "건록", 해: "제왕", 술: "쇠", 유: "병", 신: "사", 미: "묘", 오: "절", 사: "태", 진: "양" },
};

const STAGE_ALIAS_MAP: Record<string, TwelveStage> = {
  jangsaeng: "장생",
  mogyok: "목욕",
  gwandae: "관대",
  geonrok: "건록",
  jewang: "제왕",
  soe: "쇠",
  byeong: "병",
  sa: "사",
  myo: "묘",
  jeol: "절",
  tae: "태",
  yang: "양",
  "長生": "장생",
  "沐浴": "목욕",
  "冠帶": "관대",
  "建祿": "건록",
  "帝旺": "제왕",
  "衰": "쇠",
  "病": "병",
  "死": "사",
  "墓": "묘",
  "絶": "절",
  "胎": "태",
  "養": "양",
  "양육": "양",
};

type PillarKey = "year" | "month" | "day" | "hour";

function pickChar(source: string, list: string[]) {
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (list.includes(ch)) return ch;
  }
  return "";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStageResult(pillar: PillarKey, stage: TwelveStage, source: StageSource): TwelveStageResult {
  const stageKey = STAGE_LABEL_TO_KEY[stage];
  return {
    key: stageKey,
    labelKo: stage,
    hanja: STAGE_KEY_TO_HANJA[stageKey],
    pillar,
    source,
  };
}

export function normalizeStem(value: unknown): StemKo | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const han = pickChar(raw, Object.keys(STEM_HAN_TO_KO));
  if (han) return STEM_HAN_TO_KO[han];

  const ko = pickChar(raw, STEM_KO_LIST);
  if (ko) return ko as StemKo;

  return null;
}

export function normalizeBranch(value: unknown): BranchKo | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const han = pickChar(raw, Object.keys(BRANCH_HAN_TO_KO));
  if (han) return BRANCH_HAN_TO_KO[han];

  const ko = pickChar(raw, BRANCH_KO_LIST);
  if (ko) return ko as BranchKo;

  return null;
}

export function normalizeTwelveStage(value: unknown): TwelveStage | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if ((Object.values(STAGE_KEY_TO_LABEL) as string[]).includes(raw)) {
    return raw as TwelveStage;
  }

  const compact = raw
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");

  const aliasHit = STAGE_ALIAS_MAP[raw] || STAGE_ALIAS_MAP[compact];
  if (aliasHit) return aliasHit;

  const hanCandidate = pickChar(raw, ["長", "沐", "冠", "建", "帝", "衰", "病", "死", "墓", "絶", "胎", "養"]);
  if (hanCandidate) {
    const exact = STAGE_ALIAS_MAP[raw.replace(/\s+/g, "")];
    if (exact) return exact;
  }

  return null;
}

function extractStemFromPillar(pillar: unknown): StemKo | null {
  const p = toRecord(pillar);
  return (
    normalizeStem(p.stem) ||
    normalizeStem(p.gan) ||
    normalizeStem(p.g) ||
    normalizeStem(p.heavenlyStem) ||
    normalizeStem(p.dayMaster) ||
    normalizeStem(p.ganji) ||
    normalizeStem(p.pillar)
  );
}

function extractBranchFromPillar(pillar: unknown): BranchKo | null {
  const p = toRecord(pillar);
  return (
    normalizeBranch(p.branch) ||
    normalizeBranch(p.zhi) ||
    normalizeBranch(p.z) ||
    normalizeBranch(p.earthlyBranch) ||
    normalizeBranch(p.ganji) ||
    normalizeBranch(p.pillar)
  );
}

function pickPillar(source: Record<string, unknown>, key: PillarKey) {
  const pillars = toRecord(source.pillars);
  const fourPillars = toRecord(source.fourPillars);

  const shortMap: Record<PillarKey, string> = {
    year: "y",
    month: "m",
    day: "d",
    hour: "h",
  };

  return pillars[key] || pillars[shortMap[key]] || fourPillars[key] || source[key];
}

function extractDayStem(source: Record<string, unknown>): StemKo | null {
  const dayMaster = toRecord(source.dayMaster);
  const fromDayPillar = extractStemFromPillar(pickPillar(source, "day"));

  return (
    normalizeStem(dayMaster.stem) ||
    normalizeStem(source.dayMasterGanKr) ||
    normalizeStem(source.dayMaster) ||
    normalizeStem(source.dayStem) ||
    fromDayPillar
  );
}

function extractExistingPillarStages(source: Record<string, unknown>) {
  const out: Partial<Record<PillarKey, TwelveStage>> = {};

  const direct = toRecord(source.twelveStage || source.twelveStages || source.twelveFortune || source.twelveFortunes);
  (["year", "month", "day", "hour"] as PillarKey[]).forEach((pillar) => {
    const stage = normalizeTwelveStage(direct[pillar]);
    if (stage) out[pillar] = stage;
  });

  const list = Array.isArray(source.twelveStages) ? source.twelveStages : [];
  list.forEach((item) => {
    const row = toRecord(item);
    const pillarRaw = String(row.pillar || row.type || row.position || "").toLowerCase();
    const stage = normalizeTwelveStage(row.stage || row.label || row.value || row.name);
    if (!stage) return;

    if (pillarRaw.includes("year") || pillarRaw.includes("연")) out.year = stage;
    if (pillarRaw.includes("month") || pillarRaw.includes("월")) out.month = stage;
    if (pillarRaw.includes("day") || pillarRaw.includes("일")) out.day = stage;
    if (pillarRaw.includes("hour") || pillarRaw.includes("시")) out.hour = stage;
  });

  (["year", "month", "day", "hour"] as PillarKey[]).forEach((pillar) => {
    const pillarObj = toRecord(pickPillar(source, pillar));
    const stage = normalizeTwelveStage(
      pillarObj.twelveStage || pillarObj.twelveFortune || pillarObj.stage || pillarObj.lifeStage,
    );
    if (stage) out[pillar] = stage;
  });

  return out;
}

function selectRepresentativeStage(stages: Partial<Record<PillarKey, TwelveStage>>): TwelveStage | undefined {
  if (stages.day) return stages.day;
  if (stages.month) return stages.month;

  const values = [stages.year, stages.month, stages.day, stages.hour].filter(Boolean) as TwelveStage[];
  if (!values.length) return undefined;

  const counter = new Map<TwelveStage, number>();
  values.forEach((stage) => {
    counter.set(stage, (counter.get(stage) || 0) + 1);
  });

  let winner: TwelveStage | undefined;
  let maxCount = 0;
  counter.forEach((count, stage) => {
    if (count > maxCount) {
      winner = stage;
      maxCount = count;
    }
  });

  return winner || values[0];
}

export function validateTwelveStageInput(dayStem: unknown, branch: unknown) {
  const stem = normalizeStem(dayStem);
  const normalizedBranch = normalizeBranch(branch);

  if (!stem || !normalizedBranch) {
    return {
      ok: false,
      error: "잘못된 천간/지지 입력입니다.",
    };
  }

  return {
    ok: true,
    dayStem: stem,
    branch: normalizedBranch,
  };
}

export function getTwelveStage(dayStem: unknown, branch: unknown): TwelveStage | null {
  const validated = validateTwelveStageInput(dayStem, branch);
  if (!validated.ok) return null;
  return TWELVE_STAGE_TABLE[validated.dayStem][validated.branch];
}

export function getTwelveStagesForPillars(sajuResult: SajuEngineResult): TwelveStagePillars {
  const source = toRecord(sajuResult);
  const existing = extractExistingPillarStages(source);

  const dayStem = extractDayStem(source);
  const yearBranch = extractBranchFromPillar(pickPillar(source, "year"));
  const monthBranch = extractBranchFromPillar(pickPillar(source, "month"));
  const dayBranch = extractBranchFromPillar(pickPillar(source, "day"));
  const hourBranch = extractBranchFromPillar(pickPillar(source, "hour"));

  const computed = {
    year: dayStem && yearBranch ? getTwelveStage(dayStem, yearBranch) || undefined : undefined,
    month: dayStem && monthBranch ? getTwelveStage(dayStem, monthBranch) || undefined : undefined,
    day: dayStem && dayBranch ? getTwelveStage(dayStem, dayBranch) || undefined : undefined,
    hour: dayStem && hourBranch ? getTwelveStage(dayStem, hourBranch) || undefined : undefined,
  } as Partial<Record<PillarKey, TwelveStage>>;

  const merged: Partial<Record<PillarKey, TwelveStage>> = {
    year: existing.year || computed.year,
    month: existing.month || computed.month,
    day: existing.day || computed.day,
    hour: existing.hour || computed.hour,
  };

  const stageResults: TwelveStageResult[] = (["year", "month", "day", "hour"] as PillarKey[])
    .map((pillar) => {
      const stage = merged[pillar];
      if (!stage) return null;
      const sourceType: StageSource = existing[pillar] ? "saju-engine" : "local-fallback";
      return toStageResult(pillar, stage, sourceType);
    })
    .filter(Boolean) as TwelveStageResult[];

  return {
    primary: selectRepresentativeStage(merged),
    year: merged.year,
    month: merged.month,
    day: merged.day,
    hour: merged.hour,
    stageResults,
  };
}

export function getPrimaryAnimalStage(sajuResult: SajuEngineResult): TwelveStage | null {
  const stages = getTwelveStagesForPillars(sajuResult);
  return stages.primary || null;
}

export function getNormalizedSajuCore(sajuResult: SajuEngineResult) {
  const source = toRecord(sajuResult);
  return {
    dayStem: extractDayStem(source),
    yearBranch: extractBranchFromPillar(pickPillar(source, "year")),
    monthBranch: extractBranchFromPillar(pickPillar(source, "month")),
    dayBranch: extractBranchFromPillar(pickPillar(source, "day")),
    hourBranch: extractBranchFromPillar(pickPillar(source, "hour")),
  };
}

export interface FourPillarStageItem {
  pillar: PillarKey;
  stem: StemKo | null;
  branch: BranchKo | null;
  stage?: TwelveStage;
}

export function getFourPillarStageItems(sajuResult: SajuEngineResult): Record<PillarKey, FourPillarStageItem> {
  const source = toRecord(sajuResult);
  const pillarStages = getTwelveStagesForPillars(sajuResult);

  const yearPillar = pickPillar(source, "year");
  const monthPillar = pickPillar(source, "month");
  const dayPillar = pickPillar(source, "day");
  const hourPillar = pickPillar(source, "hour");

  return {
    year: {
      pillar: "year",
      stem: extractStemFromPillar(yearPillar),
      branch: extractBranchFromPillar(yearPillar),
      stage: pillarStages.year,
    },
    month: {
      pillar: "month",
      stem: extractStemFromPillar(monthPillar),
      branch: extractBranchFromPillar(monthPillar),
      stage: pillarStages.month,
    },
    day: {
      pillar: "day",
      stem: extractStemFromPillar(dayPillar),
      branch: extractBranchFromPillar(dayPillar),
      stage: pillarStages.day || pillarStages.primary,
    },
    hour: {
      pillar: "hour",
      stem: extractStemFromPillar(hourPillar),
      branch: extractBranchFromPillar(hourPillar),
      stage: pillarStages.hour,
    },
  };
}

export const __TWELVE_STAGE_TESTING__ = {
  STEM_KO_LIST,
  BRANCH_KO_LIST,
  TWELVE_STAGE_TABLE,
};
