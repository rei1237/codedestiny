/**
 * 오늘의 숲길 진행 계산. 🔴 표시 전용이다 — 꿀방울·경험치 규칙과 값은 서버에만 있고,
 * 여기서는 서버가 준 값과 기존 다이어리 기록을 어떻게 보여 줄지만 정한다.
 * 숲 조각은 기록에서 계산한 기념품이라 따로 저장하지 않으며 교환 가치가 없다.
 */

export const FOREST_ACTIVITY_TITLE = "프로필 카드와 출석 혜택";

export const QUEST_ID_PREFIX = "home-quest:";

/** 숲 지도의 요일별 조각. 월요일부터 일요일까지. 그림 시트의 칸 순서와 같다. */
export const FOREST_PIECES = [
  { id: "firefly-jar", name: "반딧불 유리병" },
  { id: "moss-cushion", name: "이끼 방석" },
  { id: "pinecone", name: "솔방울" },
  { id: "fern-leaf", name: "고사리 잎" },
  { id: "moon-stone", name: "달빛 돌" },
  { id: "mushroom-lamp", name: "버섯 등불" },
  { id: "petal-letter", name: "꽃잎 편지" },
];

const FOREST_ZONES = [
  { from: 35, name: "고목의 품" },
  { from: 20, name: "등불 샘터" },
  { from: 10, name: "반딧불 골짜기" },
  { from: 5, name: "이끼 오솔길" },
  { from: 0, name: "안개 입구" },
];

const DAILY_LINES = {
  gate: [
    { yeoni: "당신이 오기를 기다렸어요. 오늘은 제가 등불을 들고 앞장설게요.", yeongnyangi: "길은 내가 안다냥." },
    { yeoni: "안개가 조금 걷혔어요. 오늘의 당신을 천천히 들려주세요.", yeongnyangi: "늦지 마라냥." },
    { yeoni: "숲이 오늘은 유난히 고요해요. 함께 걸어 주실래요?", yeongnyangi: "따라오라냥." },
  ],
  lantern: [
    { yeoni: "이 등불은 당신이 다녀간 날마다 하나씩 켜져요.", yeongnyangi: "하나 더 켜 봐라냥." },
    { yeoni: "어제의 불빛이 아직 따뜻해요. 오늘의 불도 나란히 놓아 볼까요?", yeongnyangi: "불은 내가 지킨다냥." },
    { yeoni: "등불이 하나 늘 때마다 숲길이 조금 더 환해져요.", yeongnyangi: "어둡잖아. 켜라냥." },
  ],
  path: [
    { yeoni: "거창하지 않아도 괜찮아요. 오늘의 작은 한 걸음이면 충분해요.", yeongnyangi: "이 정도는 하겠지?" },
    { yeoni: "당신이 할 수 있는 만큼만 골라 주세요. 저는 그 속도에 맞춰 걸을게요.", yeongnyangi: "천천히 와라냥." },
    { yeoni: "오솔길은 서두르는 사람보다 머무는 사람에게 더 많이 보여 줘요.", yeongnyangi: "봐 줄 테니 해 봐." },
  ],
  spring: [
    { yeoni: "이 샘터에 오늘의 마음을 한 줄만 놓아 주세요.", yeongnyangi: "짧아도 된다냥." },
    { yeoni: "잘 쓰지 않아도 괜찮아요. 당신의 말이라면 샘물이 다 받아 줄 거예요.", yeongnyangi: "안 웃을게." },
    { yeoni: "오늘 마음에 남은 장면이 있나요? 그 하나면 충분해요.", yeongnyangi: "하나만 적어라냥." },
  ],
  map: [
    { yeoni: "남은 걸음은 천천히 걸어도 괜찮아요. 이 지도는 언제든 펼쳐 볼 수 있어요.", yeongnyangi: "어디까지 왔나 보자냥." },
    { yeoni: "오늘 걸은 만큼만 지도에 남아요. 당신의 속도면 충분해요.", yeongnyangi: "조금만 더 가자냥." },
    { yeoni: "못 걸은 날이 있어도 숲은 그대로 여기 있어요.", yeongnyangi: "내일 또 오면 된다냥." },
  ],
  done: [
    { yeoni: "오늘도 함께 걸어 주셔서 고마워요. 내일도 여기서 기다릴게요.", yeongnyangi: "내일도 와라냥." },
    { yeoni: "당신이 남긴 불빛 덕분에 숲이 조금 더 따뜻해졌어요.", yeongnyangi: "나쁘지 않았다냥." },
    { yeoni: "오늘도 잘 걸어오셨어요. 이제 편히 쉬어 가세요.", yeongnyangi: "푹 자라냥." },
  ],
};

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseYmdAsUtc(ymd) {
  const match = YMD_PATTERN.exec(String(ymd ?? ""));
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const isSameDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isSameDate ? date : null;
}

function formatYmd(date) {
  return date.toISOString().slice(0, 10);
}

/** 이번 주기에 켜진 등불 수. 주기를 채운 날은 오늘 출석했을 때만 모두 켜진 채로 보여 준다. */
export function litLanternCount(streak, streakEvery, attended) {
  const safeStreak = Number.isFinite(streak) && streak > 0 ? Math.floor(streak) : 0;
  const safeEvery = Number.isFinite(streakEvery) && streakEvery > 0 ? Math.floor(streakEvery) : 0;
  if (!safeEvery || !safeStreak) return 0;
  return safeStreak % safeEvery || (attended ? safeEvery : 0);
}

/** 오늘 끝낸 걸음 수(0~3). */
export function journeyStepsDone({ attended, questDone, hasRecord }) {
  return [attended, questDone, hasRecord].filter(Boolean).length;
}

/** 그날 기록이 있는지. 한 줄 기록은 `practiceNote`와 `nightLog`에 함께 저장된다. */
export function entryHasRecord(entry) {
  if (!entry || typeof entry !== "object") return false;
  return [entry.practiceNote, entry.nightLog].some(text => typeof text === "string" && text.trim().length > 0);
}

function dayQuestDone(extDay) {
  const todos = extDay && typeof extDay === "object" ? extDay.todos : null;
  if (!Array.isArray(todos)) return false;
  return todos.some(item => Boolean(item?.done) && typeof item?.id === "string" && item.id.startsWith(QUEST_ID_PREFIX));
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

function safeReadEntry(readEntry, ymd) {
  try {
    return readEntry(ymd);
  } catch {
    return null;
  }
}

/**
 * 이번 주 숲 지도. 그날 실천을 끝내고 기록도 남겼으면 그 요일의 조각이 채워진다.
 * @param {string} todayYmd KST 기준 오늘(`kstTodayYmd`)
 * @param {(ymd: string) => unknown} readEntry 날짜별 기록 읽기(`readStoredEntry`)
 * @param {Record<string, unknown> | null} ext 확장 기록 맵
 */
export function weekForestMap(todayYmd, readEntry, ext) {
  const today = parseYmdAsUtc(todayYmd);
  if (!today) return [];
  const daysFromMonday = (today.getUTCDay() + 6) % 7;
  return FOREST_PIECES.map((piece, index) => {
    const date = new Date(today.getTime());
    date.setUTCDate(today.getUTCDate() - daysFromMonday + index);
    const ymd = formatYmd(date);
    const extDay = ext && typeof ext === "object" ? ext[ymd] : null;
    return { ymd, piece, isToday: ymd === todayYmd, filled: dayQuestDone(extDay) && entryHasRecord(safeReadEntry(readEntry, ymd)) };
  });
}

/** 레벨에 따른 숲 구역 이름. 표시 전용이다. */
export function forestZoneForLevel(level) {
  const safeLevel = Number.isFinite(level) ? level : 0;
  return (FOREST_ZONES.find(zone => safeLevel >= zone.from) || FOREST_ZONES[FOREST_ZONES.length - 1]).name;
}

/** 날짜와 걸음에 따른 두 캐릭터의 대사. 같은 날에는 같은 대사가 나온다. */
export function dailyLine(ymd, step) {
  const lines = DAILY_LINES[step] || DAILY_LINES.gate;
  const date = parseYmdAsUtc(ymd);
  const dayNumber = date ? Math.floor(date.getTime() / 86_400_000) : 0;
  return lines[dayNumber % lines.length];
}
