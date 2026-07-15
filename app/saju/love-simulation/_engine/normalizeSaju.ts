// 한 사람의 생년월일시 → NormalizedSaju.
// ★ 일주(및 사주 전반) 계산은 기본 사주 분석(animal-destiny)과 100% 동일한 경로를 쓴다.
//   - 실인물: prefetchKasiContext(음력 권위변환/24절기) → computeNatalFromInput(동일 옵션)
//   - 프리셋 캐릭터: 양력 고정 원국이라 KASI 없이 동일 함수(일주 동일)
// per-person 명리(4기둥·용신·기신·오행·신살)는 이 결정론 엔진이 전부 계산하므로 여기서는 추출만 한다.

import type { AnimalDestinyInput } from "../../animal-destiny/lib/types";
import { computeNatalFromInput, prefetchKasiContext } from "../../animal-destiny/lib/sajuAdapter";
import type { ElementKey, NormalizedPillar, NormalizedSaju } from "./compatibilityTypes";
import { branchElement, stemElement, stemPolarity } from "./relations";

const ELEMENT_KEYS: ElementKey[] = ["wood", "fire", "earth", "metal", "water"];

function isElementKey(value: unknown): value is ElementKey {
  return typeof value === "string" && (ELEMENT_KEYS as string[]).includes(value);
}

function toPillar(raw: unknown): NormalizedPillar | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const ganji = String(record.ganji ?? "");
  const stem = String(record.stem ?? ganji.charAt(0) ?? "");
  const branch = String(record.branch ?? ganji.charAt(1) ?? "");
  if (!stem && !branch) return null;
  return { ganji: ganji || `${stem}${branch}`, stem, branch };
}

function countElements(pillars: Array<NormalizedPillar | null>): Record<ElementKey, number> {
  const counts: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  pillars.forEach((pillar) => {
    if (!pillar) return;
    const se = stemElement(pillar.stem);
    const be = branchElement(pillar.branch);
    if (se) counts[se] += 1;
    if (be) counts[be] += 1;
  });
  return counts;
}

function topElements(counts: Record<ElementKey, number>, limit = 2): ElementKey[] {
  return (Object.entries(counts) as Array<[ElementKey, number]>)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([element]) => element);
}

/** LocalSajuResult(natalAnalysis 포함) → NormalizedSaju. 실패 시 null. */
function extractNormalized(local: ReturnType<typeof computeNatalFromInput>): NormalizedSaju | null {
  const yearPillar = toPillar(local.pillars?.year);
  const monthPillar = toPillar(local.pillars?.month);
  const dayPillar = toPillar(local.pillars?.day);
  const hourPillar = toPillar(local.pillars?.hour);
  if (!dayPillar || !dayPillar.stem || !dayPillar.branch) return null;

  const elementCounts = countElements([yearPillar, monthPillar, dayPillar, hourPillar]);
  const yinYang = stemPolarity(dayPillar.stem) ?? "yang";

  const yongshin = (local.natalAnalysis?.yongshinAnalysis ?? {}) as Record<string, unknown>;
  const coreYongshin = isElementKey(yongshin.coreYongshin) ? yongshin.coreYongshin : null;
  const gisin = Array.isArray(yongshin.gisin) ? yongshin.gisin.filter(isElementKey) : [];
  const judgment = (yongshin.judgment ?? {}) as Record<string, unknown>;
  const dayMasterStrength = typeof judgment.dayMasterStrength === "string" ? judgment.dayMasterStrength : null;

  return {
    pillars: { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar },
    dayStem: dayPillar.stem,
    dayBranch: dayPillar.branch,
    yearBranch: yearPillar?.branch ?? null,
    yinYang,
    elementCounts,
    strongElements: topElements(elementCounts),
    coreYongshin,
    gisin,
    dayMasterStrength,
    timeUnknown: Boolean(local.timeUnknown),
  };
}

/**
 * 실인물(사용자 본인·상대) 명식 정규화. 기본 사주 분석과 동일하게 음력은 KASI 프리페치를 거친다.
 * async — 음력 입력에서 KASI 네트워크 호출이 있을 수 있다.
 */
export async function normalizeSajuForPerson(input: AnimalDestinyInput): Promise<NormalizedSaju | null> {
  try {
    const kasi = await prefetchKasiContext(input);
    return extractNormalized(computeNatalFromInput(input, kasi));
  } catch {
    return null;
  }
}

/** 프리셋 캐릭터 고정 원국 정규화. 양력이라 KASI 없이 동일 엔진(일주 동일). */
export function normalizeCharacterChart(input: AnimalDestinyInput): NormalizedSaju | null {
  try {
    return extractNormalized(computeNatalFromInput(input));
  } catch {
    return null;
  }
}
