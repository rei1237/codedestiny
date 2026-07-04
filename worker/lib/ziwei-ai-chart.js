import { Lunar, Solar } from "lunar-javascript";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const PALACE_NAMES = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const MAIN_STARS = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const ASSISTANT_STARS = ["문창", "문곡", "좌보", "우필", "천괴", "천월", "녹존", "함지", "천요"];
const MALEFIC_STARS = ["경양", "타라", "화성", "영성", "지공", "지겁"];

const STEM_ALIAS = {
  "甲": "갑",
  "乙": "을",
  "丙": "병",
  "丁": "정",
  "戊": "무",
  "己": "기",
  "庚": "경",
  "辛": "신",
  "壬": "임",
  "癸": "계",
};

const BRANCH_ALIAS = {
  "子": "자",
  "丑": "축",
  "寅": "인",
  "卯": "묘",
  "辰": "진",
  "巳": "사",
  "午": "오",
  "未": "미",
  "申": "신",
  "酉": "유",
  "戌": "술",
  "亥": "해",
};

const FOUR_TRANSFORMATIONS = {
  갑: { huaLu: "염정", huaQuan: "파군", huaKe: "무곡", huaJi: "태양" },
  을: { huaLu: "천기", huaQuan: "천량", huaKe: "자미", huaJi: "태음" },
  병: { huaLu: "천동", huaQuan: "천기", huaKe: "문창", huaJi: "염정" },
  정: { huaLu: "태음", huaQuan: "천동", huaKe: "천기", huaJi: "거문" },
  무: { huaLu: "탐랑", huaQuan: "태음", huaKe: "우필", huaJi: "천기" },
  기: { huaLu: "무곡", huaQuan: "탐랑", huaKe: "천량", huaJi: "문곡" },
  경: { huaLu: "태양", huaQuan: "무곡", huaKe: "태음", huaJi: "천동" },
  신: { huaLu: "거문", huaQuan: "태양", huaKe: "문곡", huaJi: "문창" },
  임: { huaLu: "천량", huaQuan: "자미", huaKe: "좌보", huaJi: "무곡" },
  계: { huaLu: "파군", huaQuan: "거문", huaKe: "태음", huaJi: "탐랑" },
};

const TRANSFORMATION_LABELS = {
  huaLu: "화록",
  huaQuan: "화권",
  huaKe: "화과",
  huaJi: "화기",
};

// 정통 자미두수 명암표(廟旺利平陷) — js/saju-engine.js의 ZW_CLASSICAL_STATE와 동일한 원자료(28성×12지지)를
// 한글 지지 키로 변환한 값. LLM 상담에 가짜 근거를 넣지 않기 위해 반드시 이 표만 사용한다.
const ZIWEI_BRIGHTNESS_TABLE = {
  "자미":{"자":"평","축":"묘","인":"왕","묘":"왕","진":"묘","사":"평","오":"묘","미":"묘","신":"평","유":"평","술":"묘","해":"평"},
  "천기":{"자":"평","축":"함","인":"왕","묘":"왕","진":"평","사":"리","오":"함","미":"평","신":"묘","유":"왕","술":"평","해":"묘"},
  "태양":{"자":"함","축":"함","인":"묘","묘":"묘","진":"왕","사":"왕","오":"묘","미":"왕","신":"평","유":"함","술":"함","해":"함"},
  "무곡":{"자":"묘","축":"왕","인":"리","묘":"평","진":"묘","사":"평","오":"평","미":"평","신":"왕","유":"묘","술":"함","해":"리"},
  "천동":{"자":"왕","축":"함","인":"평","묘":"묘","진":"함","사":"평","오":"함","미":"묘","신":"평","유":"평","술":"리","해":"왕"},
  "염정":{"자":"평","축":"평","인":"묘","묘":"평","진":"묘","사":"함","오":"묘","미":"묘","신":"묘","유":"평","술":"평","해":"평"},
  "천부":{"자":"묘","축":"묘","인":"왕","묘":"평","진":"묘","사":"평","오":"묘","미":"묘","신":"왕","유":"평","술":"묘","해":"평"},
  "태음":{"자":"왕","축":"묘","인":"한","묘":"평","진":"함","사":"함","오":"함","미":"평","신":"평","유":"묘","술":"묘","해":"왕"},
  "탐랑":{"자":"왕","축":"평","인":"묘","묘":"리","진":"평","사":"묘","오":"왕","미":"평","신":"묘","유":"묘","술":"평","해":"묘"},
  "거문":{"자":"왕","축":"묘","인":"평","묘":"함","진":"함","사":"묘","오":"함","미":"묘","신":"묘","유":"평","술":"함","해":"묘"},
  "천상":{"자":"묘","축":"묘","인":"왕","묘":"평","진":"왕","사":"리","오":"묘","미":"묘","신":"왕","유":"평","술":"묘","해":"평"},
  "천량":{"자":"평","축":"묘","인":"묘","묘":"묘","진":"묘","사":"평","오":"묘","미":"함","신":"묘","유":"평","술":"묘","해":"함"},
  "칠살":{"자":"묘","축":"평","인":"묘","묘":"평","진":"왕","사":"평","오":"묘","미":"왕","신":"묘","유":"평","술":"묘","해":"평"},
  "파군":{"자":"왕","축":"함","인":"묘","묘":"함","진":"묘","사":"함","오":"왕","미":"함","신":"함","유":"함","술":"묘","해":"리"},
  "좌보":{"자":"왕","축":"묘","인":"왕","묘":"묘","진":"묘","사":"리","오":"왕","미":"묘","신":"왕","유":"리","술":"왕","해":"리"},
  "우필":{"자":"왕","축":"묘","인":"왕","묘":"리","진":"왕","사":"리","오":"왕","미":"묘","신":"왕","유":"리","술":"묘","해":"리"},
  "문창":{"자":"리","축":"왕","인":"묘","묘":"왕","진":"왕","사":"왕","오":"약","미":"왕","신":"묘","유":"왕","술":"리","해":"왕"},
  "문곡":{"자":"리","축":"왕","인":"묘","묘":"왕","진":"리","사":"왕","오":"리","미":"왕","신":"리","유":"왕","술":"리","해":"왕"},
  "녹존":{"자":"묘","축":"왕","인":"리","묘":"왕","진":"리","사":"약","오":"왕","미":"왕","신":"리","유":"왕","술":"리","해":"약"},
  "천괴":{"자":"평","축":"평","인":"왕","묘":"평","진":"평","사":"평","오":"왕","미":"평","신":"왕","유":"평","술":"평","해":"평"},
  "천월":{"자":"평","축":"평","인":"평","묘":"평","진":"평","사":"평","오":"평","미":"리","신":"묘","유":"리","술":"평","해":"평"},
  "천마":{"자":"왕","축":"리","인":"묘","묘":"리","진":"왕","사":"리","오":"묘","미":"리","신":"왕","유":"리","술":"묘","해":"리"},
  "경양":{"자":"약","축":"리","인":"왕","묘":"묘","진":"왕","사":"리","오":"약","미":"리","신":"왕","유":"묘","술":"묘","해":"리"},
  "타라":{"자":"약","축":"약","인":"리","묘":"왕","진":"묘","사":"함","오":"리","미":"약","신":"함","유":"리","술":"왕","해":"약"},
  "화성":{"자":"약","축":"왕","인":"왕","묘":"리","진":"왕","사":"리","오":"약","미":"평","신":"왕","유":"함","술":"왕","해":"리"},
  "영성":{"자":"약","축":"리","인":"묘","묘":"묘","진":"왕","사":"리","오":"약","미":"리","신":"왕","유":"함","술":"왕","해":"리"},
  "지공":{"자":"리","축":"약","인":"리","묘":"왕","진":"묘","사":"묘","오":"리","미":"리","신":"리","유":"왕","술":"묘","해":"왕"},
  "지겁":{"자":"리","축":"약","인":"리","묘":"리","진":"리","사":"평","오":"리","미":"약","신":"리","유":"왕","술":"묘","해":"왕"},
};

const BRIGHTNESS_SYMBOL = { 묘: "◎", 득: "O", 리: "▲", 평: "△", 함: "X" };
const BRIGHTNESS_MEANING = { 묘: "최상", 득: "득지", 리: "이로움", 평: "균형", 함: "함몰 주의" };

function normalizeBrightnessLevel(level) {
  const lv = clean(level);
  if (lv === "묘" || lv === "왕") return "묘";
  if (lv === "득") return "득";
  if (lv === "리" || lv === "이" || lv === "약") return "리";
  if (lv === "평" || lv === "한" || lv === "불") return "평";
  if (lv === "함" || lv === "실") return "함";
  return "";
}

function brightnessFor(starName, branchKo) {
  const raw = ZIWEI_BRIGHTNESS_TABLE[starName]?.[branchKo];
  return normalizeBrightnessLevel(raw);
}

/** 강약(묘·득·리·평·함) 정보를 { level, symbol, meaning } 형태로 반환. 표에 없는 별이면 null. */
export function describeBrightness(level) {
  const normalized = normalizeBrightnessLevel(level);
  if (!normalized) return null;
  return { level: normalized, symbol: BRIGHTNESS_SYMBOL[normalized], meaning: BRIGHTNESS_MEANING[normalized] };
}

/** "자미◎(최상)" 형태의 표기. 강약 정보가 없으면 별 이름만 반환(가짜 근거 생성 금지). */
export function formatStarWithBrightness(starName, level) {
  const desc = describeBrightness(level);
  return desc ? `${starName}${desc.symbol}(${desc.meaning})` : starName;
}

function mod(value, size = 12) {
  return ((Number(value) % size) + size) % size;
}

function clean(value, max = 0) {
  const text = String(value ?? "").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function normalizeStem(value, fallbackYear) {
  const text = clean(value);
  if (STEMS.includes(text)) return text;
  if (STEM_ALIAS[text]) return STEM_ALIAS[text];
  return STEMS[mod(Number(fallbackYear) - 4, 10)] || "갑";
}

function normalizeBranch(value, fallbackYear) {
  const text = clean(value);
  if (BRANCHES.includes(text)) return text;
  if (BRANCH_ALIAS[text]) return BRANCH_ALIAS[text];
  return BRANCHES[mod(Number(fallbackYear) - 4, 12)] || "자";
}

function parseDate(dateText) {
  const match = clean(dateText).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day };
}

function parseTime(timeText, unknown) {
  if (unknown) return { hour: 12, minute: 0, unknown: true };
  const match = clean(timeText).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]), unknown: false };
}

function getLunarDate(parts, time, calendarType, isLeapMonth) {
  if (calendarType === "lunar") {
    const lunarMonth = isLeapMonth ? -Math.abs(parts.month) : Math.abs(parts.month);
    const lunar = Lunar.fromYmd(parts.year, lunarMonth, parts.day);
    return {
      lunar,
      lunarYear: Number(lunar.getYear()),
      lunarMonth: Math.abs(Number(lunar.getMonth())),
      lunarDay: Number(lunar.getDay()),
      isLeapMonth: Number(lunar.getMonth()) < 0,
      source: "user-lunar-input",
    };
  }

  const solar = Solar.fromYmdHms(parts.year, parts.month, parts.day, time.hour, time.minute, 0);
  const lunar = solar.getLunar();
  return {
    lunar,
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(Number(lunar.getMonth())),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: Number(lunar.getMonth()) < 0,
    source: "lunar-javascript",
  };
}

function hourIndex(hour) {
  return hour === 23 || hour === 0 ? 0 : Math.floor((hour + 1) / 2);
}

function createPalaceShells() {
  return BRANCHES.map((branch, index) => ({
    branchIndex: index,
    name: "",
    earthlyBranch: branch,
    mainStars: [],
    assistantStars: [],
    maleficStars: [],
    transformations: [],
    brightness: {},
    majorLuck: null,
  }));
}

// 별 명암(묘·왕·득·평·함)은 ZIWEI_BRIGHTNESS_TABLE(정통 명암표)에 있는 별만 산출한다.
// (이전에는 별 이름 해시 기반 의사난수를 넣어 가짜 근거로 해석을 유도하는 문제가 있었음 — 표에 없는 별은 절대 추정하지 않는다)
function addStar(palaces, palaceIndex, starName, type) {
  const index = mod(palaceIndex);
  const palace = palaces[index];
  const key = type === "main" ? "mainStars" : type === "assistant" ? "assistantStars" : "maleficStars";
  if (!palace[key].includes(starName)) palace[key].push(starName);
  const level = brightnessFor(starName, palace.earthlyBranch);
  if (level) palace.brightness[starName] = level;
}

function placePalaces(mingIndex, shells) {
  for (let i = 0; i < PALACE_NAMES.length; i += 1) {
    shells[mod(mingIndex - i)].name = PALACE_NAMES[i];
  }
}

function placeMainStars(shells, lunarDay, bureau) {
  let q = Math.floor(lunarDay / bureau);
  const r = lunarDay % bureau;
  let add = 0;
  if (r !== 0) {
    add = bureau - r;
    q = Math.floor((lunarDay + add) / bureau);
  }

  let pos = q;
  if (add > 0) pos = add % 2 === 1 ? q - add : q + add;
  while (pos <= 0) pos += 12;
  while (pos > 12) pos -= 12;

  const ziwei = mod(pos + 1);
  const tianfu = mod(16 - ziwei);

  [
    [ziwei, "자미"],
    [ziwei + 11, "천기"],
    [ziwei + 9, "태양"],
    [ziwei + 8, "무곡"],
    [ziwei + 7, "천동"],
    [ziwei + 4, "염정"],
    [tianfu, "천부"],
    [tianfu + 1, "태음"],
    [tianfu + 2, "탐랑"],
    [tianfu + 3, "거문"],
    [tianfu + 4, "천상"],
    [tianfu + 5, "천량"],
    [tianfu + 6, "칠살"],
    [tianfu + 10, "파군"],
  ].forEach(([index, star]) => addStar(shells, index, star, "main"));
}

function placeAssistantAndMaleficStars(shells, lunarMonth, hourIdx, stemIndex, branchIndex) {
  addStar(shells, 10 - hourIdx, "문창", "assistant");
  addStar(shells, 4 + hourIdx, "문곡", "assistant");
  addStar(shells, 4 + lunarMonth - 1, "좌보", "assistant");
  addStar(shells, 10 - (lunarMonth - 1), "우필", "assistant");

  const kuiYue = [
    [1, 7],
    [0, 8],
    [11, 9],
    [11, 9],
    [1, 7],
    [0, 8],
    [1, 7],
    [2, 6],
    [3, 5],
    [3, 5],
  ][stemIndex] || [1, 7];
  addStar(shells, kuiYue[0], "천괴", "assistant");
  addStar(shells, kuiYue[1], "천월", "assistant");

  const luCunMap = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const luCun = luCunMap[stemIndex] ?? 2;
  addStar(shells, luCun, "녹존", "assistant");
  addStar(shells, luCun + 1, "경양", "malefic");
  addStar(shells, luCun - 1, "타라", "malefic");

  const fireStart = [2, 3, 1, 9][branchIndex % 4] || 2;
  addStar(shells, fireStart + hourIdx, "화성", "malefic");
  addStar(shells, fireStart - hourIdx, "영성", "malefic");
  addStar(shells, 11 - hourIdx, "지공", "malefic");
  addStar(shells, 11 + hourIdx, "지겁", "malefic");

  const peach = [9, 6, 3, 0][branchIndex % 4] ?? 9;
  addStar(shells, peach, "함지", "assistant");
  addStar(shells, lunarMonth + 1, "천요", "assistant");
}

function calculateBureau(stemIndex, mingIndex) {
  const stemStart = [2, 4, 6, 8, 0][mod(stemIndex, 5)];
  const mingStem = STEMS[mod(stemStart + mod(mingIndex - 2), 10)];
  const stemElement = { 갑: 1, 을: 1, 병: 2, 정: 2, 무: 3, 기: 3, 경: 4, 신: 4, 임: 5, 계: 5 };
  const branchElement = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 1, 7: 1, 8: 2, 9: 2, 10: 3, 11: 3 };
  let elementValue = (stemElement[mingStem] || 3) + (branchElement[mingIndex] || 3);
  if (elementValue > 5) elementValue -= 5;
  const bureauByElement = { 1: 3, 2: 4, 3: 2, 4: 6, 5: 5 };
  // 오국 명칭은 국수에 고정된다: 2국=수이국, 3국=목삼국, 4국=금사국, 5국=토오국, 6국=화육국
  const bureauName = { 2: "수이국", 3: "목삼국", 4: "금사국", 5: "토오국", 6: "화육국" };
  const bureau = bureauByElement[elementValue] || 4;
  return { bureau, bureauName: bureauName[bureau] || "금사국" };
}

function applyTransformations(shells, fourTransformations) {
  for (const palace of shells) {
    const stars = new Set([...palace.mainStars, ...palace.assistantStars, ...palace.maleficStars]);
    palace.transformations = Object.entries(fourTransformations)
      .filter(([, star]) => stars.has(star))
      .map(([key, star]) => `${TRANSFORMATION_LABELS[key]}:${star}`);
  }
}

function applyMajorLuck(shells, mingIndex, stemIndex, gender, bureau) {
  const yangStem = [0, 2, 4, 6, 8].includes(stemIndex);
  const male = gender === "male" || gender === "M";
  const direction = yangStem === male ? 1 : -1;
  for (let i = 0; i < 12; i += 1) {
    const index = mod(mingIndex + i * direction);
    const startAge = bureau + i * 10;
    shells[index].majorLuck = {
      range: `${startAge}-${startAge + 9}`,
      startAge,
      endAge: startAge + 9,
      direction: direction > 0 ? "순행" : "역행",
    };
  }
}

function summarizeSanFangSiZheng(outputPalaces) {
  const byBranch = new Map(outputPalaces.map((palace) => [palace.branchIndex, palace]));
  const byName = new Map(outputPalaces.map((palace) => [palace.name, palace]));
  const result = {};

  for (const palace of outputPalaces) {
    const triadA = byBranch.get(mod(palace.branchIndex + 4));
    const triadB = byBranch.get(mod(palace.branchIndex + 8));
    const opposite = byBranch.get(mod(palace.branchIndex + 6));
    result[palace.name] = {
      self: palace.name,
      palaceNames: [palace, triadA, triadB, opposite].filter(Boolean).map((item) => item.name),
      mainStars: [palace, triadA, triadB, opposite].filter(Boolean).flatMap((item) => item.mainStars),
      transformations: [palace, triadA, triadB, opposite].filter(Boolean).flatMap((item) => item.transformations),
      opposite: opposite?.name || "",
    };
  }

  const life = byName.get("명궁");
  const career = byName.get("관록궁");
  const wealth = byName.get("재백궁");
  const spouse = byName.get("부부궁");
  return {
    byPalace: result,
    core: {
      lifeCareerWealth: [life, career, wealth].filter(Boolean).map((item) => item.name),
      relationshipAxis: [life, spouse].filter(Boolean).map((item) => item.name),
    },
  };
}

function yearlyLuckFor(year, outputPalaces) {
  const branch = BRANCHES[mod(Number(year) - 4, 12)];
  const palace = outputPalaces.find((item) => item.earthlyBranch === branch) || outputPalaces[0];
  return {
    year,
    earthlyBranch: branch,
    palaceName: palace?.name || "",
    mainStars: palace?.mainStars || [],
    transformations: palace?.transformations || [],
  };
}

function buildSummary(outputPalaces, lifePalace, bodyPalace, fourTransformations) {
  const starCounts = new Map();
  for (const palace of outputPalaces) {
    for (const star of palace.mainStars) starCounts.set(star, (starCounts.get(star) || 0) + 1);
  }
  const keyStars = [...starCounts.keys()].slice(0, 4);
  const transformStars = Object.values(fourTransformations).filter(Boolean);
  return [
    `명궁은 ${lifePalace || "입력 기준 명궁"}에 놓이고 신궁은 ${bodyPalace || "입력 기준 신궁"}에 놓입니다.`,
    keyStars.length ? `핵심 주성은 ${keyStars.join(", ")}의 흐름이 두드러집니다.` : "주성의 배치는 궁의 연결을 중심으로 읽어야 합니다.",
    transformStars.length ? `사화는 ${transformStars.join(", ")}를 중심으로 삶의 방향성을 강하게 움직입니다.` : "사화 정보는 입력 기준으로 확인 가능한 범위에서 반영되었습니다.",
  ].join(" ");
}

export function calculateZiweiAiChart(input = {}, options = {}) {
  const birthInfo = input.birthInfo && typeof input.birthInfo === "object" ? input.birthInfo : input;
  const dateParts = parseDate(birthInfo.birthDate);
  const timeParts = parseTime(birthInfo.birthTime, birthInfo.birthTimeUnknown === true);
  if (!dateParts || !timeParts) {
    const error = new Error("INVALID_BIRTH_INFO");
    error.code = "INVALID_INPUT";
    throw error;
  }

  const calendarType = clean(birthInfo.calendarType).toLowerCase() === "lunar" ? "lunar" : "solar";
  const gender = clean(birthInfo.gender).toLowerCase();
  const lunarInfo = getLunarDate(dateParts, timeParts, calendarType, birthInfo.isLeapMonth === true);
  const yearStem = normalizeStem(lunarInfo.lunar.getYearGan(), lunarInfo.lunarYear);
  const yearBranch = normalizeBranch(lunarInfo.lunar.getYearZhi(), lunarInfo.lunarYear);
  const stemIndex = STEMS.indexOf(yearStem);
  const branchIndex = BRANCHES.indexOf(yearBranch);
  const hIdx = hourIndex(timeParts.hour);
  const baseIndex = mod(2 + lunarInfo.lunarMonth - 1);
  const mingIndex = mod(baseIndex - hIdx);
  const shenIndex = mod(baseIndex + hIdx);
  const { bureau, bureauName } = calculateBureau(stemIndex, mingIndex);
  const shells = createPalaceShells();

  placePalaces(mingIndex, shells);
  placeMainStars(shells, lunarInfo.lunarDay, bureau);
  placeAssistantAndMaleficStars(shells, lunarInfo.lunarMonth, hIdx, stemIndex, branchIndex);
  const fourTransformations = FOUR_TRANSFORMATIONS[yearStem] || {};
  applyTransformations(shells, fourTransformations);
  applyMajorLuck(shells, mingIndex, stemIndex, gender, bureau);

  const outputPalaces = PALACE_NAMES
    .map((name) => shells.find((palace) => palace.name === name))
    .filter(Boolean)
    .map((palace) => ({
      name: palace.name,
      earthlyBranch: palace.earthlyBranch,
      branchIndex: palace.branchIndex,
      mainStars: palace.mainStars.filter((star) => MAIN_STARS.includes(star)),
      assistantStars: palace.assistantStars.filter((star) => ASSISTANT_STARS.includes(star)),
      maleficStars: palace.maleficStars.filter((star) => MALEFIC_STARS.includes(star)),
      transformations: palace.transformations,
      brightness: palace.brightness,
      majorLuck: palace.majorLuck,
    }));

  const lifePalace = shells[mingIndex]?.name || "명궁";
  const bodyPalace = shells[shenIndex]?.name || "";
  const sanFangSiZheng = summarizeSanFangSiZheng(outputPalaces);
  const targetYear = Number(options.year || new Date().getFullYear());
  const yearlyLuck = yearlyLuckFor(Number.isFinite(targetYear) ? targetYear : new Date().getFullYear(), outputPalaces);
  const strongest = outputPalaces
    .map((palace) => ({ palace: palace.name, score: palace.mainStars.length * 3 + palace.assistantStars.length - palace.maleficStars.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const uncertainty = {
    birthTimeUnknown: timeParts.unknown,
    brightnessUnavailable: false,
    note: timeParts.unknown ? "birth_time_unknown_noon_basis" : "",
  };
  if (timeParts.unknown) {
    console.warn("[ziwei-ai-chart] birth time unknown; calculated on noon basis", {
      birthDate: birthInfo.birthDate,
      calendarType,
    });
  }

  return {
    lifePalace,
    bodyPalace,
    palaces: outputPalaces,
    fourTransformations,
    majorLuck: outputPalaces.map((palace) => ({
      palaceName: palace.name,
      earthlyBranch: palace.earthlyBranch,
      ...palace.majorLuck,
    })),
    yearlyLuck,
    sanFangSiZheng,
    chartSummary: buildSummary(outputPalaces, lifePalace, bodyPalace, fourTransformations),
    mainStars: MAIN_STARS,
    assistantStarCatalog: ASSISTANT_STARS,
    maleficStarCatalog: MALEFIC_STARS,
    bureau: { number: bureau, name: bureauName },
    lunar: {
      year: lunarInfo.lunarYear,
      month: lunarInfo.lunarMonth,
      day: lunarInfo.lunarDay,
      isLeapMonth: lunarInfo.isLeapMonth,
      yearStem,
      yearBranch,
      source: lunarInfo.source,
    },
    keyFeatures: {
      strongestPalaces: strongest,
      keyStars: outputPalaces.flatMap((palace) => palace.mainStars).slice(0, 6),
      transformationStars: fourTransformations,
    },
    uncertainty,
  };
}

export const __ziweiAiChartTestUtils = {
  PALACE_NAMES,
  MAIN_STARS,
  ASSISTANT_STARS,
  MALEFIC_STARS,
  FOUR_TRANSFORMATIONS,
  parseDate,
  parseTime,
};
