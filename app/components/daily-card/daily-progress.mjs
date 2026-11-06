/**
 * 내 캐릭터 출석부의 표시 계산. 🔴 표시 전용이다 — 꿀방울·경험치 규칙과 값은 서버에만 있고,
 * 여기서는 서버가 준 값과 기존 다이어리 기록을 어떻게 보여 줄지만 정한다.
 */

export const DAILY_CARD_TITLE = "내 캐릭터 출석부";

export const QUEST_ID_PREFIX = "home-quest:";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** 영냥이의 한마디. 출석 전·출석 후·오늘 도장을 모두 모은 뒤로 나눈다. */
const CHEER_LINES = {
  ready: ["오늘 도장 아직이다냥.", "꿀방울 받으러 왔냐냥?", "도장 찍고 가라냥."],
  stamped: ["찍었다냥. 퀘스트도 해 봐.", "꿀방울 챙겼다냥.", "하나만 더 해 보자냥."],
  done: ["오늘 도장 다 모았다냥.", "내일도 와라냥.", "나쁘지 않았다냥."],
};

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseYmd(ymd) {
  const match = YMD_PATTERN.exec(String(ymd ?? ""));
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDate ? { year, month, day, date } : null;
}

/** 연속 출석 게이지에서 채워진 칸 수. 주기를 채운 날은 오늘 출석했을 때만 모두 채운 채로 보여 준다. */
export function streakGaugeCount(streak, streakEvery, attended) {
  const safeStreak = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
  const safeEvery = Number.isFinite(streakEvery) && streakEvery > 0 ? Math.floor(streakEvery) : 0;
  if (!safeEvery || !safeStreak) return 0;
  return safeStreak % safeEvery || (attended ? safeEvery : 0);
}

/** 오늘 모은 도장 수(0~3): 출석·작은 실천·한 줄 기록. */
export function journeyStepsDone({ attended, questDone, hasRecord }) {
  return [attended, questDone, hasRecord].filter(Boolean).length;
}

/** 그날 기록이 있는지. 한 줄 기록은 `practiceNote`와 `nightLog`에 함께 저장된다. */
export function entryHasRecord(entry) {
  if (!entry || typeof entry !== "object") return false;
  return [entry.practiceNote, entry.nightLog].some(text => typeof text === "string" && text.trim().length > 0);
}

/** 오늘의 작은 실천 항목. 저장소는 손으로도 고쳐질 수 있으니 모양이 맞는 것만 인정한다. */
export function findQuestTodo(extDay) {
  const todos = extDay && typeof extDay === "object" ? extDay.todos : null;
  if (!Array.isArray(todos)) return undefined;
  return todos.find(item => typeof item?.id === "string" && item.id.startsWith(QUEST_ID_PREFIX) && typeof item.text === "string");
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 다음 KST 자정까지 남은 시간(ms). 항상 1 이상 하루 이하다. */
export function msUntilKstMidnight(nowMs) {
  return DAY_MS - ((nowMs + KST_OFFSET_MS) % DAY_MS);
}

/**
 * 이번 달 출석 달력. 서버가 준 `monthDays`(그 달 출석한 날과 보너스 여부)만 도장으로 찍는다.
 * @param {string} todayYmd KST 기준 오늘
 * @param {Array<{ day: string, bonus?: boolean }> | null | undefined} monthDays
 * @returns {{ year: number, month: number, leading: number, cells: Array<{ day: number, ymd: string, stamped: boolean, bonus: boolean, isToday: boolean, isFuture: boolean }> } | null}
 */
export function monthCalendar(todayYmd, monthDays) {
  const today = parseYmd(todayYmd);
  if (!today) return null;
  const prefix = `${today.year}-${String(today.month).padStart(2, "0")}-`;
  const stamps = new Map();
  for (const item of Array.isArray(monthDays) ? monthDays : []) {
    const day = typeof item?.day === "string" ? item.day : "";
    if (day.startsWith(prefix) && parseYmd(day)) stamps.set(day, Boolean(item.bonus) || stamps.get(day) === true);
  }
  const length = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
  const leading = new Date(Date.UTC(today.year, today.month - 1, 1)).getUTCDay();
  const cells = Array.from({ length }, (_, index) => {
    const day = index + 1;
    const ymd = `${prefix}${String(day).padStart(2, "0")}`;
    return { day, ymd, stamped: stamps.has(ymd), bonus: stamps.get(ymd) === true, isToday: day === today.day, isFuture: day > today.day };
  });
  return { year: today.year, month: today.month, leading, cells };
}

/** 상태에 따른 영냥이의 한마디. 같은 날에는 같은 말이 나온다. */
export function cheerLine(ymd, state) {
  const lines = CHEER_LINES[state] || CHEER_LINES.ready;
  const parsed = parseYmd(ymd);
  const dayNumber = parsed ? Math.floor(parsed.date.getTime() / DAY_MS) : 0;
  return lines[dayNumber % lines.length];
}
