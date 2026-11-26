/**
 * `/saju/free` 신살 요약(선택 필드). SAJU_SHINSAL_FACTS_V1 의 'free-saju' 가 켜졌을 때만 engine.ts 가 동적으로 불러온다
 * — 꺼져 있으면 이 파일과 정본 신살 모듈은 받지 않아 첫 화면 번들이 그대로다.
 * 계산·이름은 정본 모듈(lib/saju/natal-core/shinsal/)에서 읽는다. 만세력 배지와 같은 귀인·길신·주의 묶음만, 원국 자리만 고른다
 * (12신살·관계는 만세력 표가 맡는다). 실패하면 빈 배열을 돌려 결과 화면은 옛 문구 그대로 남는다.
 */
import { computeShinsal, SHINSAL_CATALOG_BY_ID } from "@/lib/saju/natal-core/shinsal/index.mjs";
import type { FreeSajuShinsalItem, NatalPillars } from "./compute";

type Hit = { ruleId: string; pillar: string; position?: string; pair?: { pillar: string }[] };
type CatalogEntry = { name: string; category: string; tier: number; hidden?: boolean; catalogIndex: number };

const SUMMARY_CATEGORIES = ["gwiin", "gil", "hyung"];
const PILLAR_KO: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };
const POS_KO: Record<string, string> = { stem: "간", branch: "지", pillar: "주" };

function placeOf(hit: Hit): string {
  const pair = Array.isArray(hit.pair) ? hit.pair.filter((p) => PILLAR_KO[p?.pillar]) : [];
  if (pair.length > 1) return pair.map((p) => `${PILLAR_KO[p.pillar]}지`).join("·");
  return `${PILLAR_KO[hit.pillar]}${POS_KO[hit.position || "branch"] || "지"}`;
}

export function summarizeFreeSajuShinsal(pillars: NatalPillars): FreeSajuShinsalItem[] {
  try {
    const result = computeShinsal({
      pillars: { year: pillars.year, month: pillars.month, day: pillars.day, hour: pillars.hour || null },
      timeUnknown: !pillars.hour,
    }) as unknown as { valid?: boolean; hits?: Hit[] } | null;
    if (!result || result.valid === false || !Array.isArray(result.hits)) return [];
    const catalog = SHINSAL_CATALOG_BY_ID as unknown as Record<string, CatalogEntry | undefined>;
    const groups = new Map<string, { entry: CatalogEntry; places: string[] }>();
    for (const hit of result.hits) {
      const entry = catalog[hit?.ruleId];
      if (!entry || entry.hidden || !SUMMARY_CATEGORIES.includes(entry.category) || !PILLAR_KO[hit.pillar]) continue;
      const group = groups.get(hit.ruleId) || { entry, places: [] };
      const place = placeOf(hit);
      if (!group.places.includes(place)) group.places.push(place);
      groups.set(hit.ruleId, group);
    }
    return [...groups.entries()]
      .sort(([, a], [, b]) => a.entry.tier - b.entry.tier || a.entry.catalogIndex - b.entry.catalogIndex)
      .map(([id, { entry, places }]) => ({ id, name: entry.name, category: entry.category, places }));
  } catch {
    return [];
  }
}
