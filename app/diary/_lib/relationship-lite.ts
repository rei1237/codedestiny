/**
 * 다이어리 「함께 보기」의 결정적 관계 흐름 어댑터.
 *
 * 유료 사주 궁합의 결과/점수/전생 해석을 재생성하지 않는다. 기존에 무료로 노출하던
 * Lite 범위(관계 흐름과 자미 배치 요약)만, React 다이어리에서 쓸 수 있는 순수 데이터로 낸다.
 */

import { calcZiweiPalaces, type ZiweiChartData } from "@/app/_lib/ziwei-engine";
import type { DiaryBirthInput, DiaryNatalChart } from "@/lib/diary/fortune-adapter";

export interface DiaryRelationshipLite {
  ziweiScore: number | null;
  astroScore: number | null;
  summary: string;
  strengths: string[];
  cautions: string[];
  tips: string[];
  usesNoonForPartner: boolean;
}

type ElementName = "wood" | "fire" | "earth" | "metal" | "water";

function elementByYear(year: number): ElementName {
  return (["metal", "water", "wood", "fire", "earth"] as const)[Math.abs(year) % 5];
}

function relationScore(a: ElementName | undefined, b: ElementName): number {
  if (!a) return 0;
  if (a === b) return 2;
  const creates: Record<ElementName, ElementName> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
  const controls: Record<ElementName, ElementName> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
  if (creates[a] === b || creates[b] === a) return 1;
  if (controls[a] === b || controls[b] === a) return -1;
  return 0;
}

function stars(chart: ZiweiChartData, palace: string): { main: string[]; aux: string[]; bad: string[] } {
  const row = chart.palaceStarData.find((item) => item.palace === palace);
  const names = (items: { name: string }[] | undefined) => (items || []).map((item) => item.name).filter(Boolean);
  return { main: names(row?.stars), aux: names(row?.auxStars), bad: names(row?.badStars) };
}

function overlap(first: string[], second: string[]): number {
  const set = new Set(first);
  return second.reduce((count, item) => count + (set.has(item) ? 1 : 0), 0);
}

/** 기존 자미 Lite와 같은 다섯 궁·가중치로, 다이어리에서 쓸 한 줄 지표만 만든다. */
export function computeDiaryZiweiLite(me: DiaryBirthInput, partner: DiaryBirthInput): number | null {
  try {
    const hour = (value: number | null | undefined) => Number.isInteger(value) ? Number(value) : 12;
    const minute = (value: number | null | undefined) => Number.isInteger(value) ? Number(value) : 0;
    // 성별은 대한 방향에만 영향을 주고 이 Lite가 읽는 별 배치에는 영향을 주지 않는다.
    const mine = calcZiweiPalaces(me.year, me.month, me.day, hour(me.hour), minute(me.minute), "F");
    const theirs = calcZiweiPalaces(partner.year, partner.month, partner.day, hour(partner.hour), minute(partner.minute), "F");
    const pair = (palace: string, base: number, mainWeight: number, auxWeight: number, badWeight: number) => {
      const a = stars(mine, palace);
      const b = stars(theirs, palace);
      return Math.max(20, Math.min(96, Math.round(base + overlap(a.main, b.main) * mainWeight + overlap(a.aux, b.aux) * auxWeight - (a.bad.length + b.bad.length) * badWeight)));
    };
    const love = pair("부부궁", 52, 12, 4, 2.2);
    const harmony = pair("복덕궁", 50, 10, 4, 1.8);
    const work = pair("관록궁", 49, 11, 4, 2.1);
    const money = pair("재백궁", 50, 11, 4, 2);
    const persona = pair("명궁", 50, 10, 4, 1.9);
    return Math.max(20, Math.min(96, Math.round(love * .3 + harmony * .2 + work * .2 + money * .15 + persona * .15)));
  } catch {
    return null;
  }
}

/**
 * 기존 점성 Lite의 행성 조합·가중치를 그대로 사용한다. 천문 라이브러리는 유효한 두 생년월일이
 * 있을 때만 지연 로드하므로 다이어리 첫 화면의 번들/초기 렌더에는 포함하지 않는다.
 */
export async function computeDiaryAstroLite(me: DiaryBirthInput, partner: DiaryBirthInput): Promise<number | null> {
  try {
    const astronomy = await import("astronomy-engine");
    const toDate = (birth: DiaryBirthInput) => new Date(Date.UTC(
      birth.year, birth.month - 1, birth.day,
      (Number.isInteger(birth.hour) ? Number(birth.hour) : 12) - 9,
      Number.isInteger(birth.minute) ? Number(birth.minute) : 0,
    ));
    const signs = (birth: DiaryBirthInput) => {
      const date = toDate(birth);
      const geocentric = (body: typeof astronomy.Body.Venus | typeof astronomy.Body.Mars) =>
        Math.floor(astronomy.Ecliptic(astronomy.GeoVector(body, date, true)).elon / 30) % 12;
      return {
        sun: Math.floor(astronomy.SunPosition(date).elon / 30) % 12,
        moon: Math.floor(astronomy.EclipticGeoMoon(date).lon / 30) % 12,
        venus: geocentric(astronomy.Body.Venus),
        mars: geocentric(astronomy.Body.Mars),
      };
    };
    const score = (a: number, b: number) => {
      let distance = Math.abs(a - b);
      if (distance > 6) distance = 12 - distance;
      if (distance === 0) return 11;
      if (distance === 2 || distance === 4) return 9;
      if (distance === 1 || distance === 5) return 5;
      if (distance === 3) return -4;
      if (distance === 6) return -6;
      return 0;
    };
    const mine = signs(me);
    const theirs = signs(partner);
    const raw = 50
      + score(mine.sun, theirs.sun) * 1.1
      + score(mine.moon, theirs.moon) * 1.35
      + score(mine.venus, theirs.mars) * 1.4
      + score(mine.mars, theirs.venus) * 1.3
      + score(mine.moon, theirs.sun) * .9
      + score(mine.sun, theirs.moon) * .9;
    return Math.max(20, Math.min(96, Math.round(raw)));
  } catch {
    return null;
  }
}

export function buildDiaryRelationshipLite(
  mine: DiaryBirthInput | null,
  myChart: DiaryNatalChart | null,
  partnerName: string,
  partner: DiaryBirthInput | null,
  type: string,
): DiaryRelationshipLite | null {
  if (!mine || !myChart || !partner || !partnerName.trim()) return null;
  const score = relationScore(myChart.dayMasterEl as ElementName | undefined, elementByYear(partner.year));
  const strengths: string[] = [];
  const cautions: string[] = [];
  const tips: string[] = [];
  if (score >= 1) {
    strengths.push("기본 흐름이 자연스럽게 맞물려 대화가 부드럽게 이어질 수 있어요.");
    strengths.push("의사결정의 타이밍을 맞추면 함께 움직일 때 속도가 납니다.");
  } else if (score === 0) {
    strengths.push("서로 다른 역할이 보완되어 실용적인 시너지를 만들기 좋은 흐름이에요.");
    cautions.push("중요한 결정은 각자의 속도를 먼저 확인해 주세요.");
  } else {
    strengths.push("관점이 달라 서로의 생각 폭을 넓혀 주는 조합이에요.");
    cautions.push("느끼는 속도가 다를 수 있으니 중간에 의도를 한 번 확인해 보세요.");
  }
  if (type === "business") {
    strengths.push("역할을 분명히 할수록 결과가 빠르게 정리됩니다.");
    cautions.push("우선순위 기준이 다르면 일정이 밀릴 수 있어요.");
    tips.push("시작 전 목표 세 줄을 맞추고, 끝날 때 다음 행동을 정해 보세요.");
  } else if (type === "friend") {
    strengths.push("편한 대화가 서로의 장점을 꺼내기 좋은 흐름이에요.");
    cautions.push("가벼운 농담도 상대의 컨디션을 한 번 살펴보며 건네세요.");
    tips.push("짧게 근황을 나눈 뒤, 함께 할 작은 약속 하나를 정해 보세요.");
  } else {
    strengths.push("감정 표현이 부드럽게 이어질 때 친밀감이 깊어질 수 있어요.");
    cautions.push("서운함을 오래 미루기보다 작은 말로 먼저 꺼내 보세요.");
    tips.push("오늘 감사한 점 한 문장을 먼저 나눠 보세요.");
  }
  const vibe = score >= 1 ? "잘 맞는 흐름" : score === 0 ? "편안한 흐름" : "천천히 맞출 흐름";
  return {
    ziweiScore: computeDiaryZiweiLite(mine, partner),
    astroScore: null,
    summary: `${partnerName}님과는 ${vibe}이에요. ${strengths[0]}`,
    strengths,
    cautions,
    tips,
    usesNoonForPartner: partner.hour == null || partner.minute == null,
  };
}
