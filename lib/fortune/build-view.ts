/**
 * 기간 4종을 하나의 뷰모델로 정규화한다.
 *
 * 화면(SignFortuneView)이 기간마다 다른 자료구조를 알 필요가 없게 하려는 것이고,
 * 더 중요하게는 **기간마다 서로 다른 축을 쓴다는 사실을 이 파일 한 곳에 모아** 두려는 것이다.
 * 구 정적 셸이 재탕이 된 이유가 정확히 그 축이 어디에도 없었기 때문이다.
 *
 *  today/tomorrow — 그날의 일진 · 달 자리 · 위상
 *  weekly         — 7일의 일진 지도(띠마다 합/충 배치가 다르다) · 좋은 날 / 조심할 날
 *  monthly        — 월건(절입일에 바뀜) · 절기 구간 · 삭망 날짜
 */
import type { DailyPackage, DailySignEntry } from "./daily-data";
import { formatKoreanDate, getSignEntry, loadDailyPackage, resolvePeriodDate } from "./daily-data";
import type { FortunePeriodId } from "./periods";
import { PERIOD_TITLE } from "./periods";
import type { SignProfile } from "./sign-profiles";
import { zodiacNameKoFromEn } from "./sign-profiles";
import { animalDayRelation, zodiacDayRelation, type DayRelation } from "./day-relation";
import { averageScores, computeSignScore, type FortuneScore, type ScoreAxis } from "./fortune-score";
import { formatShortDate, loadMonthRange, loadWeekRange, type DayCell } from "./range-data";

export interface FactRow {
  label: string;
  value: string;
}

export interface WeekDayRow {
  ymd: string;
  weekdayKo: string;
  ganji: string;
  /** 그날 이 띠·별자리의 총운 */
  score: number;
  /** 합/충/비화 배지 */
  badge: string;
  kind: "trine" | "clash" | "same" | "neutral";
}

export interface SignViewModel {
  period: FortunePeriodId;
  profile: SignProfile;
  /** 날짜와 무관한 상시 톤 카피. 화면에서 "그날의 운세"로 라벨하지 않는다. */
  entry: DailySignEntry;
  score: { overall: number; love: number; money: number; health: number; work: number };
  basis: ScoreAxis[];
  /** "2026년 8월 16일 (일)" · "8월 17일 ~ 8월 23일" · "2026년 8월" */
  rangeLabel: string;
  /**
   * `<title>` 전용 압축 날짜. 화면에는 쓰지 않는다.
   *
   * 🔴 `rangeLabel` 을 제목에 그대로 넣으면 한국어 SERP 폭(약 28자)을 넘긴다 — 예전 제목
   * `양자리 오늘의 운세 (2026년 8월 16일 (일)) | 무료 별자리 운세 - 코드 데스티니` 는 44자였고
   * 잘린 꼬리에 "무료 별자리 운세" 가 통째로 들어갔다. 연도·요일·괄호를 덜어 "8월 16일" ·
   * "8월 10~16일" 로 줄인다(월간만 연도를 남긴다 — URL 이 고정이라 해가 바뀌면 모호해진다).
   */
  titleDateLabel: string;
  /** 메타 설명·구조화 데이터에 쓰는 짧은 날짜 키 */
  dateKey: string;
  facts: FactRow[];
  /** 기간 고유 서술 — 매 기간 반드시 달라진다 */
  narrative: string;
  relation: DayRelation | null;
  weekDays?: WeekDayRow[];
  highlights?: FactRow[];
}

const BADGE: Record<WeekDayRow["kind"], string> = {
  trine: "합",
  clash: "충",
  same: "비화",
  neutral: "·",
};

function relationFor(profile: SignProfile, ganji: string, ymd: string, moonSign: string): DayRelation | null {
  return profile.kind === "animal"
    ? animalDayRelation(profile.id, ganji)
    : zodiacDayRelation(profile, ymd, moonSign);
}

/** today · tomorrow */
function buildDaily(profile: SignProfile, period: "today" | "tomorrow"): SignViewModel | null {
  const pkg: DailyPackage = loadDailyPackage(period);
  const entry = getSignEntry(pkg, profile.kind, profile.id);
  if (!entry) return null;
  const date = resolvePeriodDate(period);

  const score = computeSignScore(profile, {
    ganji: pkg.calendar.ilchin,
    moonPhase: pkg.sky_today.moon_phase,
    moonSign: pkg.sky_today.moon_sign,
    ymd: date,
  });

  const relation = relationFor(profile, pkg.calendar.ilchin, date, pkg.sky_today.moon_sign);

  return {
    period,
    profile,
    entry,
    score,
    basis: score.basis,
    rangeLabel: formatKoreanDate(date),
    titleDateLabel: formatShortDate(date),
    dateKey: date,
    relation,
    facts: [
      { label: "일진", value: pkg.calendar.ilchin },
      { label: "월건", value: pkg.calendar.wolgeon },
      { label: "음력", value: pkg.calendar.lunar_date },
      { label: "달의 위상", value: pkg.sky_today.moon_phase },
    ],
    narrative:
      `${PERIOD_TITLE[period]} 일진은 ${pkg.calendar.ilchin} 이고 달은 ${zodiacNameKoFromEn(pkg.sky_today.moon_sign)} 자리를 지납니다. ` +
      `아래 점수는 이 값들과 ${profile.nameKo}의 기질이 만나는 지점을 계산한 결과이며, 산출 근거를 그대로 함께 적었습니다.`,
  };
}

/** weekly — 7일의 일진 지도 */
function buildWeekly(profile: SignProfile): SignViewModel | null {
  // 상시 톤 카피는 오늘 패키지에서 빌려온다(날짜 무관한 값이라 어느 날짜에서 읽어도 같다).
  const pkg = loadDailyPackage("today");
  const entry = getSignEntry(pkg, profile.kind, profile.id);
  if (!entry) return null;

  const week = loadWeekRange();
  const perDay = week.days.map((cell: DayCell) => {
    const s = computeSignScore(profile, {
      ganji: cell.ganji,
      moonPhase: cell.moonPhase,
      moonSign: cell.moonSign,
      ymd: cell.ymd,
    });
    const rel = relationFor(profile, cell.ganji, cell.ymd, cell.moonSign);
    const kind = (rel?.kind || "neutral") as WeekDayRow["kind"];
    return { cell, score: s, kind };
  });

  const weekDays: WeekDayRow[] = perDay.map(({ cell, score, kind }) => ({
    ymd: cell.ymd,
    weekdayKo: cell.weekdayKo,
    ganji: cell.ganji,
    score: score.overall,
    badge: BADGE[kind],
    kind,
  }));

  const best = [...weekDays].sort((a, b) => b.score - a.score)[0];
  const worst = [...weekDays].sort((a, b) => a.score - b.score)[0];
  const trineDays = weekDays.filter((d) => d.kind === "trine");
  const clashDays = weekDays.filter((d) => d.kind === "clash");

  const moonShifts = Array.from(new Set(week.days.map((d) => d.moonSign)));

  return {
    period: "weekly",
    profile,
    entry,
    score: averageScores(perDay.map((p) => p.score)),
    basis: perDay[0].score.basis,
    rangeLabel: `${formatShortDate(week.start)} ~ ${formatShortDate(week.end)}`,
    // 같은 달이면 "8월 17~23일", 달을 넘으면 "8월 31일~9월 6일". 뒤쪽 월을 생략하면
    // 월말 주가 "8월 31~6일" 이 되어 거꾸로 읽힌다.
    titleDateLabel:
      week.start.slice(0, 7) === week.end.slice(0, 7)
        ? `${formatShortDate(week.start)}~${Number(week.end.split("-")[2])}일`.replace("일~", "~")
        : `${formatShortDate(week.start)}~${formatShortDate(week.end)}`,
    dateKey: week.start,
    relation: null,
    facts: [
      { label: "기간", value: `${week.start} ~ ${week.end}` },
      { label: "일진 흐름", value: week.days.map((d) => d.ganji).join(" ") },
      { label: "달의 이동", value: moonShifts.join(" → ") },
      { label: "주 시작", value: "월요일 (KST)" },
    ],
    highlights: [
      { label: "가장 좋은 날", value: `${formatShortDate(best.ymd)} (${best.weekdayKo}) · ${best.ganji} · ${best.score}점` },
      { label: "조심할 날", value: `${formatShortDate(worst.ymd)} (${worst.weekdayKo}) · ${worst.ganji} · ${worst.score}점` },
      {
        label: "기운이 맞는 날",
        value: trineDays.length ? trineDays.map((d) => `${d.weekdayKo}요일`).join(", ") : "이번 주에는 없습니다",
      },
      {
        label: "부딪히는 날",
        value: clashDays.length ? clashDays.map((d) => `${d.weekdayKo}요일`).join(", ") : "이번 주에는 없습니다",
      },
    ],
    weekDays,
    narrative:
      `이번 주 7일의 일진은 ${week.days.map((d) => d.ganji).join(" · ")} 로 이어집니다. ` +
      `${profile.nameKo}에게 이 배치는 ${trineDays.length}일이 기운을 북돋고 ${clashDays.length}일이 부딪히는 형태입니다. ` +
      `같은 주라도 띠와 별자리마다 이 지도가 전부 다르기 때문에, 아래 요일별 표를 기준으로 일정을 배치하시면 좋습니다.`,
  };
}

/** monthly — 월건 · 절기 · 삭망 */
function buildMonthly(profile: SignProfile): SignViewModel | null {
  const pkg = loadDailyPackage("today");
  const entry = getSignEntry(pkg, profile.kind, profile.id);
  if (!entry) return null;

  const month = loadMonthRange();

  // 월간의 축은 일진이 아니라 **월건**이다. 절입일에 바뀌므로 매달 12띠 배치가 통째로 회전한다.
  const score = computeSignScore(profile, {
    ganji: month.monthGanji,
    moonPhase: month.moonPhase,
    moonSign: month.moonSign,
    ymd: month.anchorYmd,
  });
  const relation = relationFor(profile, month.monthGanji, month.anchorYmd, month.moonSign);

  const termText = month.termFrom && month.termTo
    ? `${month.termFrom.name}(${month.termFrom.ymd}) → ${month.termTo.name}(${month.termTo.ymd})`
    : "절기 정보 없음";

  return {
    period: "monthly",
    profile,
    entry,
    score,
    basis: score.basis,
    rangeLabel: `${month.year}년 ${month.month}월`,
    titleDateLabel: `${month.year}년 ${month.month}월`,
    dateKey: `${month.year}-${String(month.month).padStart(2, "0")}`,
    relation,
    facts: [
      { label: "월건", value: month.monthGanji },
      { label: "절기 구간", value: termText },
      { label: "이달의 삭(신월)", value: month.newMoonYmd },
      { label: "이달의 망(보름)", value: month.fullMoonYmd },
    ],
    highlights: [
      { label: "시작하기 좋은 때", value: `${month.newMoonYmd} 신월 전후 — 새로 벌이는 일에 힘이 붙습니다` },
      { label: "매듭짓기 좋은 때", value: `${month.fullMoonYmd} 보름 전후 — 결실과 정리에 맞습니다` },
      { label: "기운이 바뀌는 날", value: month.termTo ? `${month.termTo.ymd} ${month.termTo.name}` : "이달 안에는 없습니다" },
    ],
    narrative:
      `${month.year}년 ${month.month}월의 월건은 ${month.monthGanji} 입니다. 월건은 양력 1일이 아니라 절입일에 바뀌므로, ` +
      `이달의 기운은 ${termText} 구간이 이끕니다. 아래 점수는 이 월건과 ${profile.nameKo}의 관계를 계산한 것이라 ` +
      `달이 바뀌면 12띠·12별자리의 배치가 통째로 달라집니다.`,
  };
}

export function buildSignViewModel(profile: SignProfile, period: FortunePeriodId): SignViewModel | null {
  if (period === "weekly") return buildWeekly(profile);
  if (period === "monthly") return buildMonthly(profile);
  return buildDaily(profile, period);
}
