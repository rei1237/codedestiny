// Phase 2 생성물(표 형식 { fields, rows })을 행 객체로 한 번만 푼다.
// 데이터 파일은 scripts/naming/build-naming-data.mjs 로만 갱신한다 — 여기서 값을 고치지 않는다.

import poolJson from "./data/hanja-pool.v1.json";
import surnamesJson from "./data/surnames.v1.json";
import suriJson from "./data/suri-81.v1.json";
import samjaeJson from "./data/samjae-125.v1.json";
import blacklistJson from "./data/sound-blacklist.v1.json";
import nameUsageJson from "./data/name-usage.v1.json";
import { NamingEngineError, type Element, type Grade } from "./types";

interface TabularFile {
  schema: string;
  dataVersion: string;
  fields: string[];
  rows: unknown[][];
  [key: string]: unknown;
}

export interface HanjaReading {
  hangul: string;
  kind: "designated" | "dueum";
  hun: string | null;
  /** 이 음으로 이름 글자에 쓰인 횟수(name-usage.v1.json, 자리 합). 없으면 0. */
  nameUse: number;
}
export interface HanjaEntry {
  ch: string;
  readings: HanjaReading[];
  radical: number;
  won: number;
  pil: number;
  jawon: Element | null;
  jawonBasis: "meaning" | "radical" | "reviewer" | "llm" | null;
  confidence: number | null;
  reviewed: boolean;
  disputes: string[];
  /** 불용 관행 출처 계열 수(서로 베낀 출처는 한 계열). 0 이면 해당 없음. */
  buryongLineages: number;
  tags: string[];
  basis: "crawl" | "efamily" | "law-basic-edu" | "adjudicated";
}
export interface SurnameEntry { hangul: string; hanja: string; population: number; won: number[]; pil: number[]; compound: boolean }
export interface SuriEntry { n: number; grade: Grade; flag: "" | "disputed" }
export interface SamjaeEntry { grade: Grade; gradeRaw: string; flag: "" | "disputed" }
export interface BlacklistEntry { text: string; grade: "block" | "warn"; category: string }

export interface NamingData {
  dataVersion: string;
  pool: HanjaEntry[];
  poolByChar: Map<string, HanjaEntry>;
  surnames: SurnameEntry[];
  suri: Map<number, SuriEntry>;
  samjae: Map<string, SamjaeEntry>;
  blacklist: BlacklistEntry[];
  /** 이름 음절 → [첫째 자리, 둘째 자리] 사용 횟수(두 음절 이름 기준). */
  syllableUse: Map<string, readonly [number, number]>;
  /** 이름(성 제외, 1~2음절) → [남, 여, 남(1990년 이후 출생), 여(1990년 이후 출생)] 사용 인원. 추천 모드의 자연 이름 판정. */
  givenUse: Map<string, readonly [number, number, number, number]>;
}

function columns(file: TabularFile, expectedSchema: string): Record<string, number> {
  if (file.schema !== expectedSchema) throw new NamingEngineError("data-schema", `${expectedSchema} 기대, ${file.schema} 받음`);
  return Object.fromEntries(file.fields.map((name, index) => [name, index]));
}

export function samjaeKey(heaven: Element, human: Element, earth: Element): string {
  return `${heaven}|${human}|${earth}`;
}

function decode(): NamingData {
  const poolFile = poolJson as unknown as TabularFile;
  const surnamesFile = surnamesJson as unknown as TabularFile;
  const suriFile = suriJson as unknown as TabularFile;
  const samjaeFile = samjaeJson as unknown as TabularFile;
  const blacklistFile = blacklistJson as unknown as TabularFile;
  const usageFile = nameUsageJson as unknown as TabularFile & {
    syllableFields: string[]; syllableRows: unknown[][]; givenFields: string[]; givenRows: unknown[][];
  };
  const versions = new Set([poolFile, surnamesFile, suriFile, samjaeFile, blacklistFile, usageFile].map((f) => f.dataVersion));
  // 여섯 파일은 한 빌드의 산출물이어야 한다. 섞이면 근거 키와 수치가 어긋난다.
  if (versions.size !== 1) throw new NamingEngineError("data-version-mismatch", [...versions].join(","));

  const u = columns(usageFile, "naming-name-usage/1");
  const hanjaUse = new Map<string, number>(usageFile.rows.map((row) => [`${row[u.ch]}|${row[u.hangul]}`, row[u.use] as number]));
  const y = Object.fromEntries(usageFile.syllableFields.map((name, index) => [name, index]));
  const syllableUse = new Map<string, readonly [number, number]>(usageFile.syllableRows.map((row) => [
    row[y.hangul] as string,
    [row[y.first] as number, row[y.second] as number] as const,
  ]));
  const v = Object.fromEntries(usageFile.givenFields.map((name, index) => [name, index]));
  const givenUse = new Map<string, readonly [number, number, number, number]>(usageFile.givenRows.map((row) => [
    row[v.given] as string,
    [row[v.male] as number, row[v.female] as number, row[v.maleRecent] as number, row[v.femaleRecent] as number] as const,
  ]));

  const sources = (poolFile.cautionSources as { id: string; lineage: string }[]) || [];
  const p = columns(poolFile, "naming-hanja-pool/1");
  const pool: HanjaEntry[] = poolFile.rows.map((row) => {
    const cautions = (row[p.cautions] as [string, number[]][]) || [];
    const lineages = new Set<string>();
    for (const [reasonKey, indexes] of cautions) {
      if (reasonKey !== "buryong") continue;
      for (const index of indexes) lineages.add(sources[index]?.lineage ?? String(index));
    }
    const ch = row[p.ch] as string;
    return {
      ch,
      readings: (row[p.readings] as [string, "designated" | "dueum", string | null][])
        .map(([hangul, kind, hun]) => ({ hangul, kind, hun, nameUse: hanjaUse.get(`${ch}|${hangul}`) ?? 0 })),
      radical: row[p.radical] as number,
      won: row[p.won] as number,
      pil: row[p.pil] as number,
      jawon: row[p.jawon] as Element | null,
      jawonBasis: row[p.jawonBasis] as HanjaEntry["jawonBasis"],
      confidence: row[p.confidence] as number | null,
      reviewed: row[p.reviewed] === true,
      disputes: row[p.disputes] as string[],
      buryongLineages: lineages.size,
      tags: row[p.tags] as string[],
      basis: row[p.basis] as HanjaEntry["basis"],
    };
  });

  const s = columns(surnamesFile, "naming-surnames/1");
  const surnames: SurnameEntry[] = surnamesFile.rows.map((row) => ({
    hangul: row[s.hangul] as string,
    hanja: row[s.hanja] as string,
    population: row[s.population] as number,
    won: row[s.won] as number[],
    pil: row[s.pil] as number[],
    compound: row[s.compound] === true,
  }));

  const r = columns(suriFile, "naming-suri-81/1");
  const suri = new Map<number, SuriEntry>(suriFile.rows.map((row) => [
    row[r.n] as number,
    { n: row[r.n] as number, grade: row[r.grade] as Grade, flag: row[r.flag] as SuriEntry["flag"] },
  ]));
  if (suri.size !== 81) throw new NamingEngineError("data-suri-incomplete", String(suri.size));

  const m = columns(samjaeFile, "naming-samjae-125/1");
  const samjae = new Map<string, SamjaeEntry>(samjaeFile.rows.map((row) => [
    samjaeKey(row[m.heaven] as Element, row[m.human] as Element, row[m.earth] as Element),
    { grade: row[m.grade] as Grade, gradeRaw: row[m.gradeRaw] as string, flag: row[m.flag] as SamjaeEntry["flag"] },
  ]));
  if (samjae.size !== 125) throw new NamingEngineError("data-samjae-incomplete", String(samjae.size));

  const b = columns(blacklistFile, "naming-sound-blacklist/1");
  const blacklist: BlacklistEntry[] = blacklistFile.rows.map((row) => ({
    text: row[b.text] as string,
    grade: row[b.grade] as BlacklistEntry["grade"],
    category: row[b.category] as string,
  }));

  return {
    dataVersion: poolFile.dataVersion,
    pool,
    poolByChar: new Map(pool.map((entry) => [entry.ch, entry])),
    surnames,
    suri,
    samjae,
    blacklist,
    syllableUse,
    givenUse,
  };
}

let cached: NamingData | null = null;

/** 아이솔레이트당 한 번 푼다. */
export function loadNamingData(): NamingData {
  if (!cached) cached = decode();
  return cached;
}
