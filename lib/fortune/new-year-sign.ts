/**
 * 신년(세운) 띠별 운세 계산 — /fortune/2027 허브와 12띠 상세가 쓴다.
 *
 * 왜 계산으로 두는가: "2027년 {띠} 운세" 검색 결과는 년생별 글과 띠×연도 도구가 차지한다.
 * 12쪽이 같은 틀에 이름만 바꾼 문장이면 얇은 페이지가 된다. 여기서 내는 값(띠 지지와 세운
 * 지지의 합·충·형·파·해·원진, 오행 생극, 삼재, 년생별 천간 관계·납음, 절기 시각으로 자른
 * 월건과 띠의 관계)은 띠마다 다르고 명리의 결정적 규칙이라, 페이지마다 고유한 표가 생긴다.
 *
 * 🔴 오행 생극은 lib/lock-screen-daily-fortune.ts 의 `elementRelation` 한 곳만 쓴다(같은 규칙을
 *    두 벌로 두지 않는다). 한자 → 오행 변환은 lib/fortune/day-relation.ts 가 책임진다.
 * 🔴 세운·월건·절기 시각은 한국 음양력 코어(lib/korean-calendar)가 판정한다. 여기서 연월 경계를
 *    손으로 적지 않는다.
 */
import {
  BRANCH_HANGUL,
  BRANCH_HANJA,
  STEM_HANGUL,
  STEM_HANJA,
  TERM_NAME_KO,
  formatPillar,
  ganji,
  nodeTerms,
} from "@/lib/korean-calendar";
import { NAYIN, ZHI_HIDE_GAN } from "@/lib/saju/myeongri-tables";
import { elementRelation, type ElementRelation } from "@/lib/lock-screen-daily-fortune";
import { branchOfAnimal, elementOfBranch, elementOfStem } from "./day-relation";
import { NEW_YEAR_SEASON, NEW_YEAR_SIGNS, getNewYearSign } from "./new-year-registry.mjs";

// 만세력 표는 납음을 간체 중국어로 들고 있고 손대지 않는 정본이라, 한글화는 소비자인 여기서 한다
// (app/fortune/prompt-hub/saju-prompt-facts.ts 와 같은 방식).
const NAYIN_KO: Record<string, string> = {
  海中金: "해중금", 沙中金: "사중금", 炉中火: "노중화", 山下火: "산하화", 大林木: "대림목",
  平地木: "평지목", 路旁土: "노방토", 壁上土: "벽상토", 剑锋金: "검봉금", 金箔金: "금박금",
  山头火: "산두화", 覆灯火: "복등화", 涧下水: "간하수", 天河水: "천하수", 城头土: "성두토",
  大驿土: "대역토", 白蜡金: "백랍금", 钗钏金: "차천금", 杨柳木: "양류목", 桑柘木: "상자목",
  泉中水: "천중수", 大溪水: "대계수", 屋上土: "옥상토", 沙中土: "사중토", 霹雳火: "벽력화",
  天上火: "천상화", 松柏木: "송백목", 石榴木: "석류목", 长流水: "장류수", 大海水: "대해수",
};

// ── 지지 관계표(인덱스: 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11) ──────────
const YUKHAP: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
const SAMHAP: { members: number[]; label: string }[] = [
  { members: [8, 0, 4], label: "수국(水局)" },
  { members: [11, 3, 7], label: "목국(木局)" },
  { members: [2, 6, 10], label: "화국(火局)" },
  { members: [5, 9, 1], label: "금국(金局)" },
];
const BANGHAP: { members: number[]; label: string }[] = [
  { members: [2, 3, 4], label: "동방 목(寅卯辰)" },
  { members: [5, 6, 7], label: "남방 화(巳午未)" },
  { members: [8, 9, 10], label: "서방 금(申酉戌)" },
  { members: [11, 0, 1], label: "북방 수(亥子丑)" },
];
const HYEONG_GROUPS: number[][] = [[2, 5, 8], [1, 10, 7], [0, 3]];
const SELF_HYEONG = new Set([4, 6, 9, 11]);
const PA: [number, number][] = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]];
const HAE: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const WONJIN: [number, number][] = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]];

/** 삼재: 삼합 띠마다 역마(첫 글자의 충)에서 시작하는 3년. */
const SAMJAE_START: { members: number[]; start: number }[] = [
  { members: [8, 0, 4], start: 2 },
  { members: [11, 3, 7], start: 5 },
  { members: [2, 6, 10], start: 8 },
  { members: [5, 9, 1], start: 11 },
];
const SAMJAE_STAGE = ["들삼재", "눌삼재", "날삼재"] as const;

const ANIMAL_KO_BY_BRANCH = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

export type BranchRelationKind =
  | "same" | "selfHyeong" | "yukhap" | "samhap" | "banghap" | "chung" | "hyeong" | "pa" | "hae" | "wonjin";

export type BranchRelation = { kind: BranchRelationKind; label: string };

export type MonthTone = "harmony" | "clash" | "friction" | "mixed" | "same" | "neutral";

export type TermLabel = { name: string; year: number; month: number; day: number; hour: number; minute: number; label: string; short: string };

export type SeasonMonth = {
  branchIndex: number;
  pillarKo: string;
  pillarHanja: string;
  from: TermLabel;
  to: TermLabel;
};

export type SignMonthRow = SeasonMonth & { relations: BranchRelation[]; tone: MonthTone; point: string };

export type BirthYearRow = {
  year: number;
  pillarKo: string;
  pillarHanja: string;
  age: number;
  nayin: string;
  stemRelation: ElementRelation;
  stemNote: string;
};

export type SamjaeStatus = {
  stage: (typeof SAMJAE_STAGE)[number] | null;
  years: { year: number; stage: string }[];
  /** 삼재가 아닐 때 다음 삼재가 시작되는 해 */
  nextStartYear: number | null;
  label: string;
};

const has = (pairs: [number, number][], a: number, b: number) =>
  pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** 두 지지 사이의 관계를 모두 돌려준다(한 쌍이 합이면서 파일 수 있다). */
export function branchRelations(a: number, b: number): BranchRelation[] {
  const out: BranchRelation[] = [];
  if (a === b) {
    out.push({ kind: "same", label: "같은 지지" });
    if (SELF_HYEONG.has(a)) out.push({ kind: "selfHyeong", label: "자형(自刑)" });
    return out;
  }
  if (has(YUKHAP, a, b)) out.push({ kind: "yukhap", label: "육합(六合)" });
  const trine = SAMHAP.find((t) => t.members.includes(a) && t.members.includes(b));
  if (trine) out.push({ kind: "samhap", label: `반합·${trine.label}` });
  const direction = BANGHAP.find((t) => t.members.includes(a) && t.members.includes(b));
  if (direction) out.push({ kind: "banghap", label: `방합·${direction.label}` });
  if ((a + 6) % 12 === b) out.push({ kind: "chung", label: "충(沖)" });
  if (HYEONG_GROUPS.some((g) => g.includes(a) && g.includes(b))) out.push({ kind: "hyeong", label: "형(刑)" });
  if (has(PA, a, b)) out.push({ kind: "pa", label: "파(破)" });
  if (has(HAE, a, b)) out.push({ kind: "hae", label: "해(害)" });
  if (has(WONJIN, a, b)) out.push({ kind: "wonjin", label: "원진(怨嗔)" });
  return out;
}

const HARMONY_KINDS = new Set<BranchRelationKind>(["yukhap", "samhap", "banghap"]);
const FRICTION_KINDS = new Set<BranchRelationKind>(["hyeong", "pa", "hae", "wonjin", "selfHyeong"]);

function toneOf(relations: BranchRelation[]): MonthTone {
  if (relations.length === 0) return "neutral";
  const kinds = relations.map((r) => r.kind);
  if (kinds.includes("same")) return "same";
  if (kinds.includes("chung")) return "clash";
  const harmony = kinds.some((k) => HARMONY_KINDS.has(k));
  const friction = kinds.some((k) => FRICTION_KINDS.has(k));
  if (harmony && friction) return "mixed";
  return harmony ? "harmony" : "friction";
}

const MONTH_POINT: Record<MonthTone, string> = {
  harmony: "사람·협력이 붙는 달",
  clash: "이동·변동이 생기기 쉬운 달",
  friction: "조정·오해를 살필 달",
  mixed: "손잡되 조건을 확인할 달",
  same: "띠 기운이 겹쳐 두드러지는 달",
  neutral: "띠와 직접 관계가 없는 달",
};

/** 세운의 천간이 태어난 해 천간에 미치는 관계(관점: 태어난 해 천간). */
const STEM_NOTE: Record<ElementRelation, string> = {
  생: "도움(생) · 지원과 배움이 들어오는 결",
  비화: "같은 기운(비화) · 동료와 경쟁이 함께 느는 결",
  설기: "내어 줌(설기) · 기운을 써서 성과로 내는 결",
  극: "압박(극) · 책임과 평가가 커지는 결",
  재: "다룸(재) · 일과 돈을 직접 다루는 결",
};

export const ELEMENT_RELATION_LABEL: Record<ElementRelation, string> = {
  생: "생 · 도움을 받는 관계",
  비화: "비화 · 같은 기운",
  설기: "설기 · 기운을 내어 주는 관계",
  극: "극 · 압박과 책임",
  재: "재 · 내가 다루는 기운",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type CoreTerm = { index: number; year: number; month: number; day: number; hour: number; minute: number };

function toTermLabel(term: CoreTerm): TermLabel {
  return {
    name: TERM_NAME_KO[term.index],
    year: term.year,
    month: term.month,
    day: term.day,
    hour: term.hour,
    minute: term.minute,
    label: `${term.year}년 ${term.month}월 ${term.day}일 ${pad(term.hour)}:${pad(term.minute)}`,
    short: `${term.month}/${term.day}`,
  };
}

const termTime = (t: CoreTerm) => Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute);

function seasonTerms(year: number): CoreTerm[] {
  const terms = [year, year + 1]
    .flatMap((y) => (nodeTerms(y) || []) as CoreTerm[])
    .sort((a, b) => termTime(a) - termTime(b));
  const start = terms.findIndex((t) => t.year === year && TERM_NAME_KO[t.index] === "입춘");
  const slice = start >= 0 ? terms.slice(start, start + 13) : [];
  if (slice.length !== 13 || TERM_NAME_KO[slice[12].index] !== "입춘") {
    throw new RangeError(`한국 음양력 코어가 ${year}년 입춘~${year + 1}년 입춘의 절기를 답하지 못했습니다.`);
  }
  return slice;
}

function buildSeasonMonths(year: number): SeasonMonth[] {
  const terms = seasonTerms(year);
  return terms.slice(0, 12).map((from, i) => {
    // 절입 이틀 뒤 정오를 앵커로 월건을 묻는다 — 경계 시각 자체는 위 절기표가 정한다.
    const anchor = new Date(Date.UTC(from.year, from.month - 1, from.day + 2, 12, 0));
    const core = ganji({ year: anchor.getUTCFullYear(), month: anchor.getUTCMonth() + 1, day: anchor.getUTCDate(), hour: 12, minute: 0 });
    if (!core) throw new RangeError(`한국 음양력 코어가 ${from.year}-${from.month}의 월건을 답하지 못했습니다.`);
    return {
      branchIndex: core.month.branchIndex,
      pillarKo: formatPillar(core.month.stemIndex, core.month.branchIndex, "hangul"),
      pillarHanja: formatPillar(core.month.stemIndex, core.month.branchIndex, "hanja"),
      from: toTermLabel(from),
      to: toTermLabel(terms[i + 1]),
    };
  });
}

function buildSeason(year: number) {
  const core = ganji({ year, month: 6, day: 15, hour: 12, minute: 0 });
  if (!core) throw new RangeError(`한국 음양력 코어가 ${year}년 세운을 답하지 못했습니다.`);
  const { stemIndex, branchIndex } = core.year;
  const pillarHanja = formatPillar(stemIndex, branchIndex, "hanja");
  const terms = seasonTerms(year);
  const nayinRaw = (NAYIN as Record<string, string>)[pillarHanja] || "";
  const hidden = (ZHI_HIDE_GAN as Record<string, readonly string[]>)[BRANCH_HANJA[branchIndex]] || [];
  return {
    year,
    stemIndex,
    branchIndex,
    pillarKo: formatPillar(stemIndex, branchIndex, "hangul"),
    pillarHanja,
    stemHanja: STEM_HANJA[stemIndex],
    stemKo: STEM_HANGUL[stemIndex],
    branchHanja: BRANCH_HANJA[branchIndex],
    branchKo: BRANCH_HANGUL[branchIndex],
    animalKo: ANIMAL_KO_BY_BRANCH[branchIndex],
    stemElement: elementOfStem(STEM_HANJA[stemIndex]) || "",
    branchElement: elementOfBranch(BRANCH_HANJA[branchIndex]) || "",
    nayin: nayinRaw ? `${NAYIN_KO[nayinRaw] || nayinRaw}` : "",
    hiddenStems: hidden.join("·"),
    start: toTermLabel(terms[0]),
    end: toTermLabel(terms[12]),
    months: buildSeasonMonths(year),
  };
}

export type NewYearSeason = ReturnType<typeof buildSeason>;

let seasonCache: NewYearSeason | null = null;

export function getNewYearSeason(): NewYearSeason {
  if (!seasonCache) seasonCache = buildSeason(NEW_YEAR_SEASON.year);
  return seasonCache;
}

function samjaeFor(branch: number, season: NewYearSeason): SamjaeStatus {
  const group = SAMJAE_START.find((g) => g.members.includes(branch));
  if (!group) throw new RangeError(`지지 ${branch} 의 삼재 그룹이 없습니다.`);
  const offset = (season.branchIndex - group.start + 12) % 12;
  if (offset <= 2) {
    const first = season.year - offset;
    const years = SAMJAE_STAGE.map((stage, i) => ({ year: first + i, stage }));
    const stage = SAMJAE_STAGE[offset];
    return { stage, years, nextStartYear: null, label: `${stage}(삼재 ${offset + 1}년 차)` };
  }
  const next = season.year + ((group.start - season.branchIndex + 12) % 12);
  const years = SAMJAE_STAGE.map((stage, i) => ({ year: next + i, stage }));
  const label = next === season.year + 1 ? `삼재 아님 · ${next}년 들삼재 직전 해` : `삼재 아님 · 다음 삼재 ${next}~${next + 2}년`;
  return { stage: null, years, nextStartYear: next, label };
}

function birthRows(branch: number, season: NewYearSeason): BirthYearRow[] {
  const rows: BirthYearRow[] = [];
  const yearEl = season.stemElement;
  let y = season.year - 1;
  while (((y - 4) % 12 + 12) % 12 !== branch) y -= 1;
  for (let i = 0; i < 8; i += 1, y -= 12) {
    const stemIndex = ((y - 4) % 10 + 10) % 10;
    const pillarHanja = formatPillar(stemIndex, branch, "hanja");
    const nayinRaw = (NAYIN as Record<string, string>)[pillarHanja] || "";
    const birthEl = elementOfStem(STEM_HANJA[stemIndex]) || "";
    const relation = elementRelation(yearEl, birthEl);
    let note = STEM_NOTE[relation];
    // 천간합·천간충은 생극과 별개로 드러나는 관계라 덧붙인다.
    if ((stemIndex + 5) % 10 === season.stemIndex) note += ` · ${STEM_HANJA[season.stemIndex]}${STEM_HANJA[stemIndex]} 천간합`;
    const chungPair = season.stemIndex < 4 ? season.stemIndex + 6 : season.stemIndex >= 6 ? season.stemIndex - 6 : -1;
    if (stemIndex === chungPair) note += ` · ${STEM_HANJA[season.stemIndex]}${STEM_HANJA[stemIndex]} 천간충`;
    rows.push({
      year: y,
      pillarKo: formatPillar(stemIndex, branch, "hangul"),
      pillarHanja,
      age: season.year - y,
      nayin: nayinRaw ? NAYIN_KO[nayinRaw] || nayinRaw : "",
      stemRelation: relation,
      stemNote: note,
    });
  }
  return rows;
}

function monthLabel(m: SeasonMonth) {
  return `${m.from.short}~${m.to.short} ${m.pillarHanja}월`;
}

export function buildNewYearSignPage(id: string) {
  const sign = getNewYearSign(id);
  const branchHanja = branchOfAnimal(id);
  if (!sign || !branchHanja) return null;
  const season = getNewYearSeason();
  const branch = BRANCH_HANJA.indexOf(branchHanja);
  const branchElement = elementOfBranch(branchHanja) || "";
  const monthRows: SignMonthRow[] = season.months.map((m) => {
    const relations = branchRelations(branch, m.branchIndex);
    const tone = toneOf(relations);
    return { ...m, relations, tone, point: MONTH_POINT[tone] };
  });

  return {
    path: `${NEW_YEAR_SEASON.path}/${id}`,
    sign,
    season,
    branchIndex: branch,
    branchHanja,
    branchKo: BRANCH_HANGUL[branch],
    branchElement,
    yearRelations: branchRelations(branch, season.branchIndex),
    stemElementRelation: elementRelation(season.stemElement, branchElement),
    branchElementRelation: elementRelation(season.branchElement, branchElement),
    samjae: samjaeFor(branch, season),
    birthRows: birthRows(branch, season),
    monthRows,
    helpfulMonths: monthRows.filter((r) => r.tone === "harmony").map(monthLabel),
    clashMonths: monthRows.filter((r) => r.tone === "clash").map(monthLabel),
    frictionMonths: monthRows.filter((r) => r.tone === "friction" || r.tone === "mixed").map(monthLabel),
  };
}

export type NewYearSignPage = NonNullable<ReturnType<typeof buildNewYearSignPage>>;

export function getNewYearSignIds(): string[] {
  return NEW_YEAR_SIGNS.map((sign) => sign.id);
}

export function getNewYearSignPages(): NewYearSignPage[] {
  return getNewYearSignIds().map((id) => buildNewYearSignPage(id)).filter((p): p is NewYearSignPage => Boolean(p));
}

/** 관계 라벨을 한 줄로. 직접 관계가 없으면 그 사실을 말한다. */
export function relationSummary(relations: BranchRelation[]): string {
  return relations.length ? relations.map((r) => r.label).join(" · ") : "직접 관계 없음";
}

/**
 * 받침에 맞는 조사. 한자 지지(丑·未…) 뒤에 붙일 때는 한글 독음(축·미…)을 넘긴다 —
 * 한자 글자만으로는 받침을 알 수 없다.
 */
export function josa(reading: string, pair: "은/는" | "이/가" | "과/와" | "을/를"): string {
  const last = String(reading).slice(-1).charCodeAt(0);
  const hangul = last >= 0xac00 && last <= 0xd7a3;
  const batchim = hangul && (last - 0xac00) % 28 !== 0;
  const [withBatchim, withoutBatchim] = pair.split("/");
  return batchim ? withBatchim : withoutBatchim;
}
