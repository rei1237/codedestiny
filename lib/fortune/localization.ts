import { readFileSync } from "node:fs";
import path from "node:path";
import type { DailySignEntry, LangBox } from "./daily-data";
import type { SignProfile } from "./sign-profiles";
import type { FortunePeriodId } from "./periods";

export const FORTUNE_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW"] as const;
export type FortuneLocale = (typeof FORTUNE_LOCALES)[number];

export function fortuneLocaleSegment(locale: FortuneLocale): string {
  return locale === "ko" ? "" : locale === "zh-CN" ? "zh" : locale === "zh-TW" ? "zh-tw" : locale;
}

export function normalizeFortuneLocale(value: string | null | undefined): FortuneLocale {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "ko" || raw.startsWith("ko-")) return "ko";
  if (raw === "ja" || raw.startsWith("ja-")) return "ja";
  if (raw === "zh-tw" || raw === "zh_hant" || raw === "zh-hant") return "zh-TW";
  if (raw === "zh" || raw === "zh-cn" || raw === "zh_hans" || raw === "zh-hans") return "zh-CN";
  if (raw === "en" || raw.startsWith("en-")) return "en";
  return "ko";
}

export function langBoxText(box: LangBox | undefined, locale: FortuneLocale): string {
  if (!box) return "";
  const key = locale === "ko" ? "kr" : locale;
  const value = box[key] || (locale === "ja" ? box.jp : locale === "zh-CN" ? box.cn : undefined);
  if (typeof value !== "string" || !value.trim()) {
    if (locale !== "ko") throw new Error(`[fortune:i18n] missing ${locale} text`);
    return box.kr || "";
  }
  return value;
}

const SIGN_NAMES: Record<string, Record<FortuneLocale, string>> = {
  aries: { ko: "양자리", en: "Aries", ja: "牡羊座", "zh-CN": "白羊座", "zh-TW": "白羊座" },
  taurus: { ko: "황소자리", en: "Taurus", ja: "牡牛座", "zh-CN": "金牛座", "zh-TW": "金牛座" },
  gemini: { ko: "쌍둥이자리", en: "Gemini", ja: "双子座", "zh-CN": "双子座", "zh-TW": "雙子座" },
  cancer: { ko: "게자리", en: "Cancer", ja: "蟹座", "zh-CN": "巨蟹座", "zh-TW": "巨蟹座" },
  leo: { ko: "사자자리", en: "Leo", ja: "獅子座", "zh-CN": "狮子座", "zh-TW": "獅子座" },
  virgo: { ko: "처녀자리", en: "Virgo", ja: "乙女座", "zh-CN": "处女座", "zh-TW": "處女座" },
  libra: { ko: "천칭자리", en: "Libra", ja: "天秤座", "zh-CN": "天秤座", "zh-TW": "天秤座" },
  scorpio: { ko: "전갈자리", en: "Scorpio", ja: "蠍座", "zh-CN": "天蝎座", "zh-TW": "天蠍座" },
  sagittarius: { ko: "사수자리", en: "Sagittarius", ja: "射手座", "zh-CN": "射手座", "zh-TW": "射手座" },
  capricorn: { ko: "염소자리", en: "Capricorn", ja: "山羊座", "zh-CN": "摩羯座", "zh-TW": "摩羯座" },
  aquarius: { ko: "물병자리", en: "Aquarius", ja: "水瓶座", "zh-CN": "水瓶座", "zh-TW": "水瓶座" },
  pisces: { ko: "물고기자리", en: "Pisces", ja: "魚座", "zh-CN": "双鱼座", "zh-TW": "雙魚座" },
  rat: { ko: "쥐띠", en: "Rat", ja: "子年", "zh-CN": "鼠", "zh-TW": "鼠" },
  ox: { ko: "소띠", en: "Ox", ja: "丑年", "zh-CN": "牛", "zh-TW": "牛" },
  tiger: { ko: "범띠", en: "Tiger", ja: "寅年", "zh-CN": "虎", "zh-TW": "虎" },
  rabbit: { ko: "토끼띠", en: "Rabbit", ja: "卯年", "zh-CN": "兔", "zh-TW": "兔" },
  dragon: { ko: "용띠", en: "Dragon", ja: "辰年", "zh-CN": "龙", "zh-TW": "龍" },
  snake: { ko: "뱀띠", en: "Snake", ja: "巳年", "zh-CN": "蛇", "zh-TW": "蛇" },
  horse: { ko: "말띠", en: "Horse", ja: "午年", "zh-CN": "马", "zh-TW": "馬" },
  goat: { ko: "양띠", en: "Goat", ja: "未年", "zh-CN": "羊", "zh-TW": "羊" },
  monkey: { ko: "원숭이띠", en: "Monkey", ja: "申年", "zh-CN": "猴", "zh-TW": "猴" },
  rooster: { ko: "닭띠", en: "Rooster", ja: "酉年", "zh-CN": "鸡", "zh-TW": "雞" },
  dog: { ko: "개띠", en: "Dog", ja: "戌年", "zh-CN": "狗", "zh-TW": "狗" },
  pig: { ko: "돼지띠", en: "Pig", ja: "亥年", "zh-CN": "猪", "zh-TW": "豬" },
};

const PERIODS: Record<FortuneLocale, Record<FortunePeriodId, string>> = {
  ko: { today: "오늘", tomorrow: "내일", weekly: "이번 주", monthly: "이번 달" },
  en: { today: "Today", tomorrow: "Tomorrow", weekly: "This week", monthly: "This month" },
  ja: { today: "今日", tomorrow: "明日", weekly: "今週", monthly: "今月" },
  "zh-CN": { today: "今日", tomorrow: "明日", weekly: "本周", monthly: "本月" },
  "zh-TW": { today: "今日", tomorrow: "明日", weekly: "本週", monthly: "本月" },
};

export const FORTUNE_COPY: Record<FortuneLocale, Record<string, string>> = {
  ko: { home: "홈", today: "오늘의 운세", fortune: "운세", zodiac: "별자리", animal: "띠", score: "운세 점수", overall: "총운", love: "애정운", money: "재물운", health: "건강운", work: "직장운", advice: "현실적인 조언", luckyColor: "행운의 색", luckyNumber: "행운의 숫자", keyword: "키워드", basis: "이 점수는 이렇게 나왔습니다", facts: "기준 값", relationship: "관계", highlights: "짚어 둘 것", lucky: "행운 포인트", profile: "기본 결", strength: "강점", caution: "주의할 결", habit: "행운을 부르는 습관", reading: "이 운세를 읽는 법", compatible: "흐름이 맞는 쪽", tricky: "조율이 필요한 쪽" },
  en: { home: "Home", today: "Today's Fortune", fortune: "Fortune", zodiac: "Zodiac", animal: "Chinese zodiac", score: "Fortune score", overall: "Overall", love: "Love", money: "Money", health: "Health", work: "Work", advice: "Practical advice", luckyColor: "Lucky color", luckyNumber: "Lucky number", keyword: "Keyword", basis: "How this score was calculated", facts: "Reference points", relationship: "Relationship", highlights: "Key points", lucky: "Lucky points", profile: "Core pattern", strength: "Strength", caution: "Watch point", habit: "Lucky habit", reading: "How to read this", compatible: "Natural flow", tricky: "Needs adjustment" },
  ja: { home: "ホーム", today: "今日の運勢", fortune: "運勢", zodiac: "星座", animal: "干支", score: "運勢スコア", overall: "総合運", love: "恋愛運", money: "金運", health: "健康運", work: "仕事運", advice: "現実的なアドバイス", luckyColor: "ラッキーカラー", luckyNumber: "ラッキーナンバー", keyword: "キーワード", basis: "このスコアの根拠", facts: "基準値", relationship: "関係", highlights: "注目ポイント", lucky: "開運ポイント", profile: "基本の傾向", strength: "強み", caution: "注意点", habit: "運を呼ぶ習慣", reading: "この運勢の読み方", compatible: "流れが合う相手", tricky: "調整が必要な相手" },
  "zh-CN": { home: "首页", today: "今日运势", fortune: "运势", zodiac: "星座", animal: "生肖", score: "运势评分", overall: "综合运", love: "感情运", money: "财运", health: "健康运", work: "事业运", advice: "实际建议", luckyColor: "幸运色", luckyNumber: "幸运数字", keyword: "关键词", basis: "评分依据", facts: "参考值", relationship: "关系", highlights: "重点提示", lucky: "幸运要点", profile: "基本倾向", strength: "优势", caution: "注意点", habit: "带来好运的习惯", reading: "阅读本运势的方法", compatible: "契合的对象", tricky: "需要协调的对象" },
  "zh-TW": { home: "首頁", today: "今日運勢", fortune: "運勢", zodiac: "星座", animal: "生肖", score: "運勢評分", overall: "綜合運", love: "感情運", money: "財運", health: "健康運", work: "事業運", advice: "實際建議", luckyColor: "幸運色", luckyNumber: "幸運數字", keyword: "關鍵詞", basis: "評分依據", facts: "參考值", relationship: "關係", highlights: "重點提示", lucky: "幸運要點", profile: "基本傾向", strength: "優勢", caution: "注意點", habit: "帶來好運的習慣", reading: "閱讀本運勢的方法", compatible: "契合的對象", tricky: "需要協調的對象" },
};

export function signName(id: string, locale: FortuneLocale): string { return SIGN_NAMES[id]?.[locale] || id; }
export function periodLabel(period: FortunePeriodId, locale: FortuneLocale): string { return PERIODS[locale][period]; }
export function periodTitle(period: FortunePeriodId, locale: FortuneLocale): string {
  const label = periodLabel(period, locale);
  return locale === "en" ? label : locale === "ja" ? `${label}の` : `${label}的`;
}

const profileCache = new Map<string, Record<string, string>>();
export function getLocalizedProfile(profile: SignProfile, locale: FortuneLocale): SignProfile {
  if (locale === "ko") return profile;
  const cacheKey = locale;
  if (!profileCache.has(cacheKey)) {
    const file = path.join(process.cwd(), "content", "fortune", "translations", `${locale}.json`);
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed.locale !== locale || parsed.schemaVersion !== 1) throw new Error(`[fortune:i18n] invalid ${locale} profile translation`);
    profileCache.set(cacheKey, parsed.translations || {});
  }
  const translated = profileCache.get(cacheKey)!;
  const field = (key: string, original: string) => translated[`${profile.id}:${key}`] || (() => { throw new Error(`[fortune:i18n] missing ${locale} ${profile.id}:${key}`); })();
  return {
    ...profile,
    nameKo: signName(profile.id, locale),
    nameEn: signName(profile.id, locale),
    rangeLabel: field("rangeLabel", profile.rangeLabel),
    element: field("element", profile.element),
    ruler: field("ruler", profile.ruler),
    keywords: field("keywords", profile.keywords.join(" · ")).split(/\s*[·|,，、]\s*/).filter(Boolean),
    essence: field("essence", profile.essence), strength: field("strength", profile.strength), caution: field("caution", profile.caution), luckyHabit: field("luckyHabit", profile.luckyHabit), reading: field("reading", profile.reading),
    faqs: profile.faqs.map((faq, index) => ({ question: field(`faq:${index}:question`, faq.question), answer: field(`faq:${index}:answer`, faq.answer) })),
  } as SignProfile & Record<string, unknown>;
}
