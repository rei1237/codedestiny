// 유명인 상세 페이지의 "여러 체계로 본 명식" 표.
//
// 사주(기존 매거진 값을 그대로 인용) + 숙요 27수 + 베다 달 낙샤트라 근사, 세 줄이 전부다.
// 🔴 자미두수는 넣지 않는다 — 생시가 없으면 명궁을 세울 수 없고, 유명인 대부분은 생시 미상이다
//    (2026-08-30 사용자 결정). 여기에 열을 늘리기 전에 그 결정을 뒤집었는지부터 확인할 것.
// 🔴 각 줄에는 "산출 근거·한계" 한 줄이 반드시 붙는다 — 못 구한 체계는 숨기지 않고 사유를 보여 준다.
//    구할 수 없는 값을 비워 두고 표를 접으면 독자에게는 "계산했더니 없더라"로 읽힌다.

import type { CelebritySajuMagazineResult } from "./celebrity-saju-service";
import { calcSukuyoForServer, type SukuyoCalcResult } from "../sukuyo-engine-server";
import { calculateVedicChart } from "../vedicCalculator";

export type MultiSystemStatus = "confirmed" | "candidate" | "unavailable";

export type MultiSystemRow = {
  system: "saju" | "sukuyo" | "vedic";
  label: string;
  status: MultiSystemStatus;
  /** 표에 크게 보이는 값. unavailable 이면 "산출 안 함". */
  value: string;
  /** 값을 한 문장으로 푼 것. unavailable 이면 빈 문자열. */
  detail: string;
  /** 산출 근거·한계 한 줄. 세 줄 모두 비어 있으면 안 된다. */
  basis: string;
};

export type VedicMoonApproximation = {
  status: Exclude<MultiSystemStatus, "unavailable">;
  /** 확정이면 1개, 후보면 그날 00:00 과 23:59 의 낙샤트라 2개(같은 순서). */
  nakshatras: string[];
  rashi: string;
};

export type CelebrityMultiSystem = {
  rows: MultiSystemRow[];
  sukuyo: SukuyoCalcResult | null;
  vedic: VedicMoonApproximation | null;
};

export type MultiSystemInput = {
  birthDate: string;
  birthTime?: string | null;
  country?: string;
  magazine: Pick<CelebritySajuMagazineResult, "pillars" | "dayElement">;
};

/** 한국 음양력 코어의 지원 범위. lib/sukuyo-engine-server.ts 가 이 밖에서 RangeError 를 던진다. */
export const SUKUYO_YEAR_RANGE = { min: 1900, max: 2100 } as const;
/** 그레고리력 시행일. 그 전 날짜는 율리우스력 환산이 검증돼 있지 않아 천체 위치를 계산하지 않는다. */
export const VEDIC_GREGORIAN_START = "1582-10-15";
/** 서울. 달 낙샤트라는 지심 황경이라 위치 영향이 미미하지만 KST 하루 창을 정하는 데는 시간대가 필요하다. */
const SEOUL = { tzOffset: 9, latitude: 37.57, longitude: 126.98 } as const;

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseBirthTime(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function buildSukuyoRow(birthDate: string): { row: MultiSystemRow; result: SukuyoCalcResult | null } {
  const label = "숙요 27수";
  const date = parseBirthDate(birthDate);
  if (!date) {
    return { row: { system: "sukuyo", label, status: "unavailable", value: "산출 안 함", detail: "", basis: "생년월일이 YYYY-MM-DD 꼴이 아니라 음력 환산을 하지 않는다." }, result: null };
  }
  if (date.year < SUKUYO_YEAR_RANGE.min || date.year > SUKUYO_YEAR_RANGE.max) {
    return {
      row: {
        system: "sukuyo",
        label,
        status: "unavailable",
        value: "산출 안 함",
        detail: "",
        basis: `숙요는 음력 월·일로 정하는데 한국 음양력 코어는 ${SUKUYO_YEAR_RANGE.min}~${SUKUYO_YEAR_RANGE.max}년만 답한다. ${date.year}년생은 범위 밖이라 추정하지 않는다.`,
      },
      result: null,
    };
  }
  // 🔴 시각을 넘기지 않는다 — 27수는 음력 날짜만으로 정해지므로 생시 미상이어도 확정값이다.
  const result = calcSukuyoForServer(date.year, date.month, date.day);
  return {
    row: {
      system: "sukuyo",
      label,
      status: "confirmed",
      value: `${result.mansion} · ${result.element} · ${result.direction}`,
      detail: result.traits.core,
      basis: `한국 음양력(KST) 기준 음력 ${result.lunarMonth}월 ${result.lunarDay}일${result.isLeap ? "(윤달)" : ""}에서 정한 수(宿). 생시와 무관하게 확정된다.`,
    },
    result,
  };
}

export function buildVedicRow(input: Pick<MultiSystemInput, "birthDate" | "birthTime" | "country">): { row: MultiSystemRow; result: VedicMoonApproximation | null } {
  const label = "베다 달 낙샤트라";
  const date = parseBirthDate(input.birthDate);
  if (!date) {
    return { row: { system: "vedic", label, status: "unavailable", value: "산출 안 함", detail: "", basis: "생년월일이 YYYY-MM-DD 꼴이 아니라 달 위치를 계산하지 않는다." }, result: null };
  }
  if (input.birthDate < VEDIC_GREGORIAN_START) {
    return {
      row: {
        system: "vedic",
        label,
        status: "unavailable",
        value: "산출 안 함",
        detail: "",
        basis: `${VEDIC_GREGORIAN_START} 이전 날짜는 율리우스력·그레고리력 환산이 검증돼 있지 않다. 달은 하루에 한 수(宿)를 지나므로 열흘 오차면 값이 무의미해 계산하지 않는다.`,
      },
      result: null,
    };
  }
  if ((input.country || "KR") !== "KR") {
    return {
      row: {
        system: "vedic",
        label,
        status: "unavailable",
        value: "산출 안 함",
        detail: "",
        basis: "출생지 시간대가 검증되지 않은 인물이라 하루 창을 정할 수 없다. 한국 출생만 KST 로 계산한다.",
      },
      result: null,
    };
  }

  const time = parseBirthTime(input.birthTime);
  const at = (hour: number, minute: number) =>
    calculateVedicChart({ year: date.year, month: date.month, day: date.day, hour, minute, ...SEOUL }).moon;

  if (time) {
    const moon = at(time.hour, time.minute);
    const name = String(moon.nakshatra.name);
    return {
      row: {
        system: "vedic",
        label,
        status: "confirmed",
        value: `${name} (${moon.rashi.name})`,
        detail: `달의 낙샤트라 ${name}, 주재 ${moon.nakshatra.lord}·상징 ${moon.nakshatra.symbol}.`,
        basis: `생시 ${input.birthTime} KST 의 달 사이드리얼 황경(라히리 아야남샤)에서 정한 값. 자체 수식 근사라 경계 근처에서는 1수 차이가 날 수 있다.`,
      },
      result: { status: "confirmed", nakshatras: [name], rashi: String(moon.rashi.name) },
    };
  }

  const start = at(0, 0);
  const end = at(23, 59);
  const first = String(start.nakshatra.name);
  const last = String(end.nakshatra.name);
  if (first === last) {
    return {
      row: {
        system: "vedic",
        label,
        status: "confirmed",
        value: `${first} (${start.rashi.name})`,
        detail: `달의 낙샤트라 ${first}, 주재 ${start.nakshatra.lord}·상징 ${start.nakshatra.symbol}.`,
        basis: "생시 미상이지만 그날 00:00 과 23:59(KST) 의 달이 같은 수(宿)에 있어 하루 내내 확정된다. 자체 수식 근사.",
      },
      result: { status: "confirmed", nakshatras: [first], rashi: String(start.rashi.name) },
    };
  }
  const rashi = start.rashi.name === end.rashi.name ? String(start.rashi.name) : `${start.rashi.name}→${end.rashi.name}`;
  return {
    row: {
      system: "vedic",
      label,
      status: "candidate",
      value: `${first} 또는 ${last}`,
      detail: `달이 그날 ${first}(${start.nakshatra.lord})에서 ${last}(${end.nakshatra.lord})로 넘어갔다. 생시를 알아야 한쪽으로 정해진다.`,
      basis: "생시 미상이라 00:00 과 23:59(KST) 두 시각을 계산했고 결과가 갈려 후보 2개로 둔다. 한쪽을 골라 서술하지 않는다.",
    },
    result: { status: "candidate", nakshatras: [first, last], rashi },
  };
}

export function buildSajuRow(magazine: MultiSystemInput["magazine"], birthTimeKnown: boolean): MultiSystemRow {
  const day = magazine.pillars.day;
  const basis = birthTimeKnown
    ? "연·월·일·시 4주. 이 페이지 아래 원국 표와 같은 값이다."
    : "생시 미상이라 연·월·일 3주만 세운다. 시주가 빠지므로 격국·용신은 단정하지 않는다.";
  return {
    system: "saju",
    label: "사주 명리",
    status: "confirmed",
    value: `${day.ganji} 일주 · ${magazine.dayElement} 일간`,
    detail: `일간 ${day.stem}(${magazine.dayElement}) 이 지지 ${day.branch} 위에 앉은 ${day.ganji} 일주. 십성으로는 지지가 ${day.branchTenGod}.`,
    basis,
  };
}

export function buildCelebrityMultiSystem(input: MultiSystemInput): CelebrityMultiSystem {
  const birthTimeKnown = Boolean(parseBirthTime(input.birthTime));
  const sukuyo = buildSukuyoRow(input.birthDate);
  const vedic = buildVedicRow(input);
  return {
    rows: [buildSajuRow(input.magazine, birthTimeKnown), sukuyo.row, vedic.row],
    sukuyo: sukuyo.result,
    vedic: vedic.result,
  };
}
