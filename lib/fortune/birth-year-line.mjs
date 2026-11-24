/**
 * 띠 일일 운세의 "년생별 한 줄"(2026-11-22, 한국어 화면 전용).
 *
 * 태어난 해의 천간(연간)을 기준으로 그날 일진 천간이 어떤 십성인지 보고, 고정 문구 10개 중 하나를 고른다.
 * 개인 사주의 일간 기준 풀이가 아니다 — 화면은 BIRTH_YEAR_LINE_LABEL 로 그 범위를 밝힌다.
 * 띠와 연간은 입춘 기준이라 1월~입춘 전 출생자는 앞 해로 본다(/fortune/tti-age/).
 * 십성 판정은 원국 엔진과 같은 lib/saju/natal-core/tables.mjs 의 tenGod 을 쓴다.
 */
import { BRANCH_KO, BRANCH_ORDER, STEM_KO, STEM_ORDER, tenGod } from "../saju/natal-core/tables.mjs";

export const BIRTH_YEAR_LINE_LABEL = "태어난 해 천간 기준 간이 참고";

/** 십성 → 한 줄. 오늘·내일 화면 모두에 쓰므로 날짜 표현을 넣지 않는다. */
export const BIRTH_YEAR_LINES = Object.freeze({
  비견: "같은 기운이 겹치는 날이에요. 내 방식대로 밀고 나가기 쉬우니 고집이 되지 않게 한 번 더 들어 보세요.",
  겁재: "비슷한 기운이 경쟁하듯 들어와요. 돈이나 몫을 나누는 자리에서는 조건부터 정해 두세요.",
  식신: "내 기운이 자연스럽게 흘러나가는 날이에요. 만들고, 먹고, 가르치는 일에 손이 잘 가요.",
  상관: "말과 표현이 날카로워지기 쉬워요. 아이디어는 살리되 윗사람 앞에서는 표현을 한 번 다듬으세요.",
  편재: "움직이는 만큼 기회가 보이는 날이에요. 큰돈을 걸기보다 직접 가서 확인하는 쪽이 맞아요.",
  정재: "꼼꼼히 챙긴 만큼 남는 날이에요. 가계부나 정산처럼 작은 숫자를 맞추기 좋아요.",
  편관: "갑작스러운 요구나 압박이 들어오기 쉬워요. 바로 맞서기보다 순서를 정해 하나씩 처리하세요.",
  정관: "규칙과 약속이 힘을 얻는 날이에요. 서류·마감·공식 연락을 먼저 끝내 두면 편해요.",
  편인: "생각이 안쪽으로 깊어지는 날이에요. 혼자 공부하거나 정리하는 시간이 잘 맞아요.",
  정인: "도움과 배움이 들어오는 날이에요. 조언을 구하거나 받은 도움에 답례하기 좋아요.",
});

const mod = (value, size) => ((value % size) + size) % size;

/** 연도의 간지 한글 이름(입춘 이후 기준). 1984 → "갑자" */
export function yearPillarKo(year) {
  return `${STEM_KO[STEM_ORDER[mod(year - 4, 10)]]}${BRANCH_KO[BRANCH_ORDER[mod(year - 4, 12)]]}`;
}

/** rangeLabel("1950 · 1962 · … · 2022년생")에서 기준 연도 이하의 출생연도만 오름차순으로 뽑는다. */
export function birthYearsFromRange(rangeLabel, maxYear) {
  return [...String(rangeLabel || "").matchAll(/\b(1[89]\d\d|20\d\d)\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year <= maxYear)
    .sort((a, b) => a - b);
}

/**
 * @param {{ rangeLabel: string, ilchin: string, dateKey: string }} input  ilchin 은 한자 간지("辛酉"), dateKey 는 "YYYY-MM-DD"
 * @returns {{ year: number, pillarKo: string, tenGod: string, text: string }[]}
 */
export function birthYearLines({ rangeLabel, ilchin, dateKey }) {
  const dayStem = Array.from(String(ilchin || "").trim())[0];
  const maxYear = Number(String(dateKey || "").slice(0, 4));
  if (!STEM_ORDER.includes(dayStem) || !Number.isInteger(maxYear)) return [];
  return birthYearsFromRange(rangeLabel, maxYear).map((year) => {
    const god = tenGod(STEM_ORDER[mod(year - 4, 10)], dayStem);
    return { year, pillarKo: yearPillarKo(year), tenGod: god, text: BIRTH_YEAR_LINES[god] };
  });
}
