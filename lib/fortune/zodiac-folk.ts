/**
 * 띠·민속 달력 계산 — /fortune/tti-age, /fortune/samjae, /fortune/son-eomneun-nal, /compatibility/tti 가 쓴다.
 *
 * 왜 계산으로 두는가: "몇 년생 무슨 띠", "삼재띠", "손없는날", "띠궁합" 검색은 표와 날짜를 바로 찾는
 * 조회형 의도다. 손으로 적은 표는 한 칸만 틀려도 고칠 곳이 흩어지므로, 값은 전부 한국 음양력 코어
 * (lib/korean-calendar)와 신년 띠 계산(lib/fortune/new-year-sign.ts)에서 뽑는다.
 *
 * 🔴 기준 연도는 빌드 날짜로 정하지 않는다. 빌드할 때마다 나이·달력 범위가 바뀌면 lastmod 와 본문이
 *    예고 없이 흔들린다. 해가 바뀌면 AGE_BASE_YEARS·SON_EOMNEUN_RANGE 를 날짜를 적은 커밋으로 올린다.
 * 🔴 삼재·지지 관계 규칙은 new-year-sign.ts 한 곳에만 둔다(samjaeFor·branchRelations 재사용).
 */
import {
  BRANCH_HANGUL,
  BRANCH_HANJA,
  STEM_HANGUL,
  STEM_HANJA,
  TERM_NAME_KO,
  lunarToSolar,
  nodeTerms,
  solarToLunar,
} from "@/lib/korean-calendar";
import { branchRelations, samjaeFor, type SamjaeStatus } from "./new-year-sign";

/** 나이 표의 기준 연도(2026-11-22 설정). 매년 1월에 한 해씩 올린다. */
export const AGE_BASE_YEARS = [2026, 2027] as const;
/** 나이 표에 싣는 가장 이른 출생연도. 마지막 출생연도는 AGE_BASE_YEARS[0] 이다(미래 연도는 싣지 않는다). */
export const TTI_AGE_FIRST_YEAR = 1930;
/** 손없는날 달력 범위(양력, 양 끝 포함, 2026-11-22 설정). AGE_BASE_YEARS 와 함께 올린다. */
export const SON_EOMNEUN_RANGE = { from: { year: 2026, month: 11 }, to: { year: 2027, month: 12 } } as const;
/** 삼재 연도표 범위. 삼합 네 무리가 한 번씩 다 돌도록 12년을 넉넉히 덮는다. */
export const SAMJAE_TABLE_RANGE = { from: 2022, to: 2036 } as const;

export type ZodiacAnimal = {
  branchIndex: number;
  /** /fortune/today/{id}·/fortune/2027/{id} 와 같은 id */
  id: string;
  name: string;
  /** 검색에서 함께 쓰는 다른 이름 */
  alias?: string;
  animal: string;
  branchKo: string;
  branchHanja: string;
};

const ANIMALS: [string, string, string, string?][] = [
  ["rat", "쥐띠", "쥐"],
  ["ox", "소띠", "소"],
  ["tiger", "호랑이띠", "호랑이", "범띠"],
  ["rabbit", "토끼띠", "토끼"],
  ["dragon", "용띠", "용"],
  ["snake", "뱀띠", "뱀"],
  ["horse", "말띠", "말"],
  ["goat", "양띠", "양"],
  ["monkey", "원숭이띠", "원숭이"],
  ["rooster", "닭띠", "닭"],
  ["dog", "개띠", "개"],
  ["pig", "돼지띠", "돼지"],
];

export const ZODIAC_ANIMALS: readonly ZodiacAnimal[] = Object.freeze(
  ANIMALS.map(([id, name, animal, alias], branchIndex) => ({
    branchIndex,
    id,
    name,
    ...(alias ? { alias } : {}),
    animal,
    branchKo: BRANCH_HANGUL[branchIndex],
    branchHanja: BRANCH_HANJA[branchIndex],
  })),
);

/** 띠 이름에 별칭을 붙인 표기. 예: 호랑이띠(범띠) */
export function animalLabel(animal: ZodiacAnimal): string {
  return animal.alias ? `${animal.name}(${animal.alias})` : animal.name;
}

/** 입춘 기준 그해의 천간·지지 인덱스. 1984 갑자년이 기준이다. */
export function yearStemIndex(year: number): number {
  return (((year - 4) % 10) + 10) % 10;
}
export function yearBranchIndex(year: number): number {
  return (((year - 4) % 12) + 12) % 12;
}

export type MonthDay = { month: number; day: number };

export type BirthYearInfo = {
  year: number;
  pillarKo: string;
  pillarHanja: string;
  animal: ZodiacAnimal;
  /** 그해 입춘 시각(한국 시간). 명리에서 띠가 바뀌는 경계 */
  ipchun: MonthDay & { hour: number; minute: number };
  /** 그해 음력 설(양력 날짜). 민간에서 띠를 나누는 다른 경계 */
  seollal: MonthDay;
  /** 기준 연도별 나이. 연 나이 = 기준 연도 − 출생연도, 만 나이는 생일 전이면 1 적다 */
  ages: { baseYear: number; age: number }[];
};

function ipchunOf(year: number): BirthYearInfo["ipchun"] {
  const term = (nodeTerms(year) || []).find((t: { index: number }) => TERM_NAME_KO[t.index] === "입춘");
  if (!term) throw new RangeError(`한국 음양력 코어가 ${year}년 입춘을 답하지 못했습니다.`);
  return { month: term.month, day: term.day, hour: term.hour, minute: term.minute };
}

function seollalOf(year: number): MonthDay {
  const solar = lunarToSolar(year, 1, 1, false);
  if (!solar) throw new RangeError(`한국 음양력 코어가 ${year}년 음력 1월 1일을 답하지 못했습니다.`);
  return { month: solar.month, day: solar.day };
}

export function birthYearInfo(year: number): BirthYearInfo {
  const stem = yearStemIndex(year);
  const branch = yearBranchIndex(year);
  return {
    year,
    pillarKo: `${STEM_HANGUL[stem]}${BRANCH_HANGUL[branch]}`,
    pillarHanja: `${STEM_HANJA[stem]}${BRANCH_HANJA[branch]}`,
    animal: ZODIAC_ANIMALS[branch],
    ipchun: ipchunOf(year),
    seollal: seollalOf(year),
    ages: AGE_BASE_YEARS.map((baseYear) => ({ baseYear, age: baseYear - year })),
  };
}

/** 최근 출생연도부터 TTI_AGE_FIRST_YEAR 까지 내림차순. */
export function birthYearTable(): BirthYearInfo[] {
  const rows: BirthYearInfo[] = [];
  for (let y = AGE_BASE_YEARS[0]; y >= TTI_AGE_FIRST_YEAR; y -= 1) rows.push(birthYearInfo(y));
  return rows;
}

/** 띠마다 표 범위 안의 출생연도(내림차순). */
export function birthYearsByAnimal(): { animal: ZodiacAnimal; years: number[] }[] {
  return ZODIAC_ANIMALS.map((animal) => {
    const years: number[] = [];
    for (let y = AGE_BASE_YEARS[0]; y >= TTI_AGE_FIRST_YEAR; y -= 1) if (yearBranchIndex(y) === animal.branchIndex) years.push(y);
    return { animal, years };
  });
}

// ── 손없는날 ────────────────────────────────────────────────────────────────

/** 음력 날짜 끝자리별 손(태백살)의 방위. 9·0으로 끝나는 날은 손이 하늘로 올라가 없다고 본다. */
export function sonDirection(lunarDay: number): "동쪽" | "남쪽" | "서쪽" | "북쪽" | null {
  const last = lunarDay % 10;
  if (last === 1 || last === 2) return "동쪽";
  if (last === 3 || last === 4) return "남쪽";
  if (last === 5 || last === 6) return "서쪽";
  if (last === 7 || last === 8) return "북쪽";
  return null;
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export type SonDay = {
  day: number;
  weekday: (typeof WEEKDAY_KO)[number];
  weekend: boolean;
  lunarMonth: number;
  lunarDay: number;
  isLeapMonth: boolean;
};

export type SonMonth = { year: number; month: number; days: SonDay[] };

export function sonEomneunMonths(range = SON_EOMNEUN_RANGE): SonMonth[] {
  const out: SonMonth[] = [];
  let year: number = range.from.year;
  let month: number = range.from.month;
  while (year < range.to.year || (year === range.to.year && month <= range.to.month)) {
    const days: SonDay[] = [];
    const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= length; day += 1) {
      const lunar = solarToLunar(year, month, day);
      if (!lunar) throw new RangeError(`한국 음양력 코어가 ${year}-${month}-${day} 의 음력을 답하지 못했습니다.`);
      if (sonDirection(lunar.lunarDay) !== null) continue;
      const w = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      days.push({
        day,
        weekday: WEEKDAY_KO[w],
        weekend: w === 0 || w === 6,
        lunarMonth: lunar.lunarMonth,
        lunarDay: lunar.lunarDay,
        isLeapMonth: lunar.isLeapMonth,
      });
    }
    out.push({ year, month, days });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

/** 음력 윤달이 시작하는 양력 날짜. 없으면 null. */
export function leapMonthStart(lunarYear: number): { lunarMonth: number; solar: { year: number; month: number; day: number } } | null {
  for (let m = 1; m <= 12; m += 1) {
    const solar = lunarToSolar(lunarYear, m, 1, true);
    if (solar) return { lunarMonth: m, solar };
  }
  return null;
}

// ── 삼재 ────────────────────────────────────────────────────────────────────

/** 출생 띠 branch 가 year 에 삼재인지. 규칙은 new-year-sign.ts 의 samjaeFor 한 곳이다. */
export function samjaeOf(branch: number, year: number): SamjaeStatus {
  return samjaeFor(branch, { year, branchIndex: yearBranchIndex(year) });
}

export type SamjaeGroup = {
  members: ZodiacAnimal[];
  /** 삼재가 드는 세 해의 지지(예: 寅卯辰) */
  yearBranches: ZodiacAnimal[];
  /** SAMJAE_TABLE_RANGE 와 겹치는 삼재 3년 묶음 */
  cycles: { start: number; end: number }[];
};

/** 삼합 네 무리. 묶음은 같은 해에 삼재가 드는 띠끼리 모아 계산으로 얻는다. */
export function samjaeGroups(): SamjaeGroup[] {
  const groups = new Map<string, SamjaeGroup>();
  for (const animal of ZODIAC_ANIMALS) {
    const starts = new Set<number>();
    for (let y = SAMJAE_TABLE_RANGE.from; y <= SAMJAE_TABLE_RANGE.to; y += 1) {
      const status = samjaeOf(animal.branchIndex, y);
      if (status.stage) starts.add(status.years[0].year);
    }
    const sorted = [...starts].sort((a, b) => a - b);
    const key = sorted.join(",");
    const group = groups.get(key);
    if (group) {
      group.members.push(animal);
      continue;
    }
    const first = sorted[0];
    groups.set(key, {
      members: [animal],
      yearBranches: [0, 1, 2].map((i) => ZODIAC_ANIMALS[yearBranchIndex(first + i)]),
      cycles: sorted.map((start) => ({ start, end: start + 2 })),
    });
  }
  return [...groups.values()].sort((a, b) => a.cycles[0].start - b.cycles[0].start);
}

// ── 띠궁합 ──────────────────────────────────────────────────────────────────

export type TtiCompatRow = {
  animal: ZodiacAnimal;
  samhap: ZodiacAnimal[];
  yukhap: ZodiacAnimal[];
  chung: ZodiacAnimal[];
  wonjin: ZodiacAnimal[];
  /** 형·파·해. 같은 띠끼리의 자형도 여기에 담는다. */
  minor: { animal: ZodiacAnimal; label: string }[];
};

export function ttiCompatibilityRows(): TtiCompatRow[] {
  return ZODIAC_ANIMALS.map((animal) => {
    const row: TtiCompatRow = { animal, samhap: [], yukhap: [], chung: [], wonjin: [], minor: [] };
    for (const other of ZODIAC_ANIMALS) {
      const minorLabels: string[] = [];
      for (const relation of branchRelations(animal.branchIndex, other.branchIndex)) {
        if (relation.kind === "samhap") row.samhap.push(other);
        else if (relation.kind === "yukhap") row.yukhap.push(other);
        else if (relation.kind === "chung") row.chung.push(other);
        else if (relation.kind === "wonjin") row.wonjin.push(other);
        else if (relation.kind === "hyeong") minorLabels.push("형");
        else if (relation.kind === "selfHyeong") minorLabels.push("자형");
        else if (relation.kind === "pa") minorLabels.push("파");
        else if (relation.kind === "hae") minorLabels.push("해");
      }
      if (minorLabels.length) row.minor.push({ animal: other, label: minorLabels.join("·") });
    }
    return row;
  });
}

/** 띠 이름 목록을 가운뎃점으로 잇는다. */
export function joinAnimals(animals: ZodiacAnimal[]): string {
  return animals.map((a) => a.name).join("·");
}
