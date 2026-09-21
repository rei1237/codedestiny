import en from "@/public/i18n/en.json";
import ja from "@/public/i18n/ja.json";
import zhCn from "@/public/i18n/zh-cn.json";
import zhTw from "@/public/i18n/zh-tw.json";
import { resolveKey, valueAtPath } from "@/lib/i18n/dictionary";
import { SIGN_PROFILES } from "./sign-profiles";
import { signName, type FortuneLocale } from "./localization";
import type { MarkedText } from "./i18n-marker";

const dictionaries = { en, ja, "zh-CN": zhCn, "zh-TW": zhTw };
const columns = { en: 1, ja: 2, "zh-CN": 3, "zh-TW": 4 } as const;
// Display terms only. Scores, dates, pillars and relationship calculations remain unchanged.
const terms = [
  ["일진 흐름", "Daily pillars", "日柱の流れ", "日柱变化", "日柱變化"],
  ["일진", "Day pillar", "日柱", "日柱", "日柱"],
  ["월건", "Month pillar", "月柱", "月柱", "月柱"],
  ["음력", "Lunar date", "旧暦", "农历", "農曆"],
  ["절기 구간", "Solar-term interval", "節気の期間", "节气区间", "節氣區間"],
  ["기간", "Period", "期間", "期间", "期間"],
  ["달의 위상", "Moon phase", "月相", "月相", "月相"],
  ["달의 이동", "Moon movement", "月の移動", "月亮运行", "月亮運行"],
  ["달의 자리", "Moon sign", "月の星座", "月亮星座", "月亮星座"],
  ["태양의 자리", "Sun sign", "太陽の星座", "太阳星座", "太陽星座"],
  ["주 시작", "Week begins", "週の始まり", "本周开始", "本週開始"],
  ["가장 좋은 날", "Highest-scoring day", "最もスコアが高い日", "评分最高的日期", "評分最高的日期"],
  ["조심할 날", "Day for care", "慎重に過ごす日", "宜谨慎的日期", "宜謹慎的日期"],
  ["기운이 맞는 날", "Days in harmony", "調和しやすい日", "较易协调的日期", "較易協調的日期"],
  ["부딪히는 날", "Days of friction", "摩擦が生じやすい日", "较易产生摩擦的日期", "較易產生摩擦的日期"],
  ["시작하기 좋은 때", "Time to begin", "始める時期", "适合开始的时机", "適合開始的時機"],
  ["매듭짓기 좋은 때", "Time to complete", "仕上げる時期", "适合收尾的时机", "適合收尾的時機"],
  ["기운이 바뀌는 날", "Turning point", "流れの変わり目", "变化的节点", "變化的節點"],
  ["이달의 삭(신월)", "New moon this month", "今月の新月", "本月新月", "本月新月"],
  ["이달의 망(보름)", "Full moon this month", "今月の満月", "本月满月", "本月滿月"],
  ["이번 주에는 없습니다", "None this week", "今週はありません", "本周没有", "本週沒有"],
  ["이달 안에는 없습니다", "None this month", "今月はありません", "本月没有", "本月沒有"],
  ["지지 관계", "Earthly-branch relationship", "地支の関係", "地支关系", "地支關係"],
  ["오행 생극", "Five-element interaction", "五行の生剋", "五行生克", "五行生剋"],
  ["관계 없음", "No major relationship", "主な関係なし", "无主要关系", "無主要關係"],
  ["비화 — 같은 지지", "Same earthly branch", "同じ地支", "相同地支", "相同地支"],
  ["충 — 정면으로 부딪힘", "Clash — opposing branches", "冲 — 向かい合う地支", "相冲 — 地支对立", "相沖 — 地支對立"],
  ["삼합 — 한 국을 이룸", "Trine — a shared group", "三合 — 一つの局を成す", "三合 — 组成同一局", "三合 — 組成同一局"],
  ["육합 — 짝을 이룸", "Six-harmony pairing", "六合 — 対になる関係", "六合 — 相互配合", "六合 — 相互配合"],
  ["인성 — 기운이 나를 도움", "Resource — energy supports me", "印星 — 自分を支える力", "印星 — 支持自身的力量", "印星 — 支持自身的力量"],
  ["비겁 — 같은 기운이 겹침", "Companion — similar energies overlap", "比劫 — 同じ力が重なる", "比劫 — 相同力量叠加", "比劫 — 相同力量疊加"],
  ["재성 — 내가 다루는 기운", "Wealth — energy I direct", "財星 — 自分が扱う力", "财星 — 自身掌握的力量", "財星 — 自身掌握的力量"],
  ["식상 — 기운이 밖으로 나감", "Output — energy flows outward", "食傷 — 外へ表す力", "食伤 — 向外表达的力量", "食傷 — 向外表達的力量"],
  ["관성 — 기운이 나를 누름", "Authority — pressure on me", "官星 — 自分にかかる圧力", "官星 — 约束自身的力量", "官星 — 約束自身的力量"],
  ["기운이 차오름", "Waxing energy", "満ちていく流れ", "能量渐增", "能量漸增"],
  ["기운이 잦아듦", "Waning energy", "静まっていく流れ", "能量渐缓", "能量漸緩"],
  ["내 궁에 머무름", "In your sign", "自分の星座に滞在", "位于自身星座", "位於自身星座"],
  ["내 궁을 지남", "Passing through your sign", "自分の星座を通過", "经过自身星座", "經過自身星座"],
  ["다른 궁", "Another sign", "別の星座", "其他星座", "其他星座"],
  ["원소 구간", "element interval", "元素の期間", "元素区间", "元素區間"],
  ["원소", "element", "元素", "元素", "元素"],
  ["같은", "same", "同じ", "相同", "相同"],
  ["이동 중", "In transit", "移動中", "运行中", "運行中"],
  ["초현", "Waxing crescent", "満ちていく三日月", "盈眉月", "盈眉月"],
  ["상현", "First quarter", "上弦", "上弦月", "上弦月"],
  ["망", "Full moon", "満月", "满月", "滿月"],
  ["하현", "Last quarter", "下弦", "下弦月", "下弦月"],
  ["신월", "New moon", "新月", "新月", "新月"],
  ["보름", "Full moon", "満月", "满月", "滿月"],
  ["그믐", "Waning crescent", "欠けていく三日月", "残月", "殘月"],
  ["공기", "air", "風", "风", "風"], ["흙", "earth", "地", "土", "土"],
  ["불", "fire", "火", "火", "火"], ["물", "water", "水", "水", "水"],
  ["목", "Wood", "木", "木", "木"], ["화", "Fire", "火", "火", "火"],
  ["토", "Earth", "土", "土", "土"], ["금", "Metal", "金", "金", "金"], ["수", "Water", "水", "水", "水"],
] as const;
const solarTerms = ["소한", "대한", "입춘", "우수", "경칩", "춘분", "청명", "곡우", "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서", "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지"];
const solarNames: Record<Exclude<FortuneLocale, "ko">, readonly string[]> = {
  en: ["Minor Cold", "Major Cold", "Start of Spring", "Rain Water", "Awakening of Insects", "Spring Equinox", "Pure Brightness", "Grain Rain", "Start of Summer", "Grain Full", "Grain in Ear", "Summer Solstice", "Minor Heat", "Major Heat", "Start of Autumn", "End of Heat", "White Dew", "Autumn Equinox", "Cold Dew", "Frost Descent", "Start of Winter", "Minor Snow", "Major Snow", "Winter Solstice"],
  ja: ["小寒", "大寒", "立春", "雨水", "啓蟄", "春分", "清明", "穀雨", "立夏", "小満", "芒種", "夏至", "小暑", "大暑", "立秋", "処暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
  "zh-CN": ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
  "zh-TW": ["小寒", "大寒", "立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種", "夏至", "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
};

export function resolveFortuneMarked(marked: MarkedText | undefined, fallback: string, locale: FortuneLocale): string {
  if (locale === "ko" || !marked) return formatFortuneEvidence(fallback, locale);
  const dictionary = dictionaries[locale];
  if (typeof valueAtPath(dictionary, marked.key) !== "string") throw new Error(`Missing fortune translation: ${locale}:${marked.key}`);
  return formatFortuneEvidence(resolveKey(dictionary, marked.key, locale, marked.vars), locale);
}

// The generator's Korean aliases group gibbous and quarter phases together.
// Use the precise English phase identifier for display, without changing source data.
const moonPhases = [
  ["New moon", "新月", "新月", "新月"],
  ["Waxing crescent", "満ちていく三日月", "盈眉月", "盈眉月"],
  ["First quarter", "上弦の月", "上弦月", "上弦月"],
  ["Waxing gibbous", "満月に向かう月（上弦後）", "盈凸月", "盈凸月"],
  ["Full moon", "満月", "满月", "滿月"],
  ["Waning gibbous", "欠けていく月（下弦前）", "亏凸月", "虧凸月"],
  ["Last quarter", "下弦の月", "下弦月", "下弦月"],
  ["Waning crescent", "欠けていく三日月", "残月", "殘月"],
] as const;

export function formatFortuneEvidence(value: string, locale: FortuneLocale): string {
  if (locale === "ko") return value;
  const phase = value.match(/^(New moon|Waxing crescent|First quarter|Waxing gibbous|Full moon|Waning gibbous|Last quarter|Waning crescent)(?:\s*\/\s*[가-힣]+)?$/);
  if (phase) {
    const row = moonPhases.find(([name]) => name === phase[1]);
    if (row) return row[columns[locale] - 1];
  }
  let text = value;
  const weekday = (index: number) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 8, 13 + index)));
  text = text.replace(/([일월화수목금토])요일/g, (_, day) => weekday("일월화수목금토".indexOf(day)))
    .replace(/\(([일월화수목금토])\)/g, (_, day) => `(${weekday("일월화수목금토".indexOf(day))})`)
    .replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g, (_, year, month, day) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))))
    .replace(/(\d{4})년\s*(\d{1,2})월/g, (_, year, month) => new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1))))
    .replace(/(\d{1,2})월\s*(\d{1,2})일/g, (_, month, day) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(2026, Number(month) - 1, Number(day)))))
    .replace(/(\d+)점/g, "$1/10");
  for (const profile of SIGN_PROFILES) text = text.replaceAll(profile.nameKo, signName(profile.id, locale));
  solarTerms.forEach((term, index) => { text = text.replaceAll(term, solarNames[locale][index]); });
  for (const row of [...terms].sort((a, b) => b[0].length - a[0].length)) text = text.replaceAll(row[0], row[columns[locale]]);
  return text;
}
