/** Presentation only: consumes the existing engine's fixed table and decisions. */
export const SAJU_GUEST_VERSION = "tea-guests-v1";
const GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const IDS = ["bigeon", "geopjae", "siksin", "sanggwan", "pyeonjae", "jeongjae", "pyeongwan", "jeonggwan", "pyeonin", "jeongin"];
const ELEMENTS = { wood: "wood", fire: "fire", earth: "earth", metal: "metal", water: "water", 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
const STEM_ELEMENTS = { 甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water", 갑: "wood", 을: "wood", 병: "fire", 정: "fire", 무: "earth", 기: "earth", 경: "metal", 신: "metal", 임: "water", 계: "water" };
const list = value => (Array.isArray(value) ? value : value ? [value] : []).map(v => ELEMENTS[v]).filter(Boolean);

export function guestGrade(element, decisions) {
  if (!element || !decisions) return "unavailable";
  // Explicitly approved precedence for overlapping engine arrays. Never infer missing grades.
  for (const [field, grade] of [["yong", "yong"], ["hee", "hee"], ["gi", "gi"], ["gu", "gu"], ["han", "han"]]) {
    if (list(decisions[field]).includes(element)) return grade;
  }
  return "unavailable";
}

export function buildSajuGuests({ facts, decisions, timing } = {}) {
  if (!facts) return [];
  const guests = [];
  const add = (scope, position, stem, tenGod, extra = {}) => {
    const index = GODS.indexOf(tenGod);
    if (index < 0 || !stem) return;
    const element = STEM_ELEMENTS[stem];
    guests.push({
      id: `${scope}:${position}:${stem}`, tenGodId: IDS[index], tenGod,
      scope, position, grade: guestGrade(element, decisions),
      traditional: [1, 3, 6, 8].includes(index) ? "challenging" : [2, 5, 7, 9].includes(index) ? "auspicious" : "neutral",
      evidence: { source: SAJU_GUEST_VERSION, stem, element, ...extra },
    });
  };
  for (const position of ["year", "month", "day", "hour"]) {
    const row = facts.heavenlyStemTenGods?.[position];
    if (row) add("natal", `${position}:stem`, row.stem, row.tenGod);
    const branch = facts.hiddenStemsByBranch?.[position];
    for (const hidden of branch?.hiddenStems || []) {
      add("natal", `${position}:hidden:${hidden.layer || hidden.stem}`, hidden.stem, hidden.tenGod, { branch: branch.branch, layer: hidden.layer });
    }
  }
  const table = facts.fixedTenGodTable || [];
  for (const [scope, rows] of [["daewoon", timing?.daewoonRows], ["sewoon", timing?.sewoonRows]]) {
    for (const [index, row] of (rows || []).entries()) {
      const stem = Array.from(row.pillar || "")[0];
      const fixed = table.find(item => item.stem === stem || item.stemKorean === stem);
      // Luck guests use the same engine-supplied fixed table, not an LLM judgment.
      add(scope, String(index), stem, fixed?.tenGod, { year: row.year, startYear: row.startYear, endYear: row.endYear, isCurrent: row.isCurrent === true });
    }
  }
  return guests;
}

export function kstDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
