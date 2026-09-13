import enProfiles from "@/content/fortune/translations/en.json";
import jaProfiles from "@/content/fortune/translations/ja.json";
import zhCnProfiles from "@/content/fortune/translations/zh-CN.json";
import zhTwProfiles from "@/content/fortune/translations/zh-TW.json";
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

const profileTranslations = { en: enProfiles, ja: jaProfiles, "zh-CN": zhCnProfiles, "zh-TW": zhTwProfiles };

const SAJU_INSIGHT_COPY: Record<Exclude<FortuneLocale, "ko">, Record<string, string>> = {
  en: {
    rat: "As the day's energy settles, words lose their edge and cooperation becomes easier. If a clash or penalty appears, pause for one beat before responding.",
    ox: "When Earth energy offers support, routine becomes an asset. Strengthen the basics before expanding further.",
    tiger: "The stronger the Wood energy, the more the tone of a single sentence shapes the outcome.",
    rabbit: "As Resource energy becomes active, considerate action draws better results than explanation alone.",
    dragon: "When Authority energy is clear, sharing responsibility through cooperation becomes the central task.",
    snake: "Ideas become practical when Eating God and Hurting Officer energies are kept in balance.",
    horse: "On days when Companion and Rob Wealth energies run strong, choosing cooperation over competition reduces avoidable loss.",
    goat: "When Eating God energy is active, your senses and taste can connect with a source of income.",
    monkey: "When Hurting Officer and Eating God energies are active together, keep humor from turning cutting.",
    rooster: "As Direct Officer and Seven Killings energies settle, clear rules become a form of protection.",
    dog: "When Resource energy is strong, help others without neglecting your own energy.",
    pig: "When Wealth energy is clear, easing excessive desire can open a wider flow.",
  },
  ja: {
    rat: "日干の気が整うほど言葉の鋭さが和らぎ、協力しやすくなります。冲や刑が見えるときは、一呼吸置いてください。",
    ox: "土の気が支えるときは、習慣が資産になります。無理に広げるより、基本を固めましょう。",
    tiger: "木の気が強いほど、ひと言の温度が結果を左右します。",
    rabbit: "印星の気が働くほど、言葉で説明するより思いやりのある行動が運を招きます。",
    dragon: "官星が明確なほど、責任の重さを分け合う協力が要になります。",
    snake: "食神と傷官のバランスが整うと、アイデアが現実の形に下りてきます。",
    horse: "比肩と劫財が強い日ほど、競争より協力の道を選ぶと損失を抑えられます。",
    goat: "食神が働くと、感覚や好みが収入につながることがあります。",
    monkey: "傷官と食神がともに働くときは、ユーモアが棘にならないよう気をつけてください。",
    rooster: "正官と偏官の気が整うほど、明確な規則が守りになります。",
    dog: "印星が強いほど、人を助けながら自分のエネルギーも守ってください。",
    pig: "財星が澄むほど、欲を少し緩めることで流れがかえって広がります。",
  },
  "zh-CN": {
    rat: "日干之气越有条理，言语的锋芒越容易缓和，合作也会顺畅起来。若出现冲、刑，先停一拍再回应。",
    ox: "土的力量提供支撑时，稳定的习惯会成为资产。与其勉强扩张，不如先巩固基本功。",
    tiger: "木气越强，一句话的温度越容易左右结果。",
    rabbit: "印星之气越活跃，比起言语说明，体贴的行动更能带来顺势。",
    dragon: "官星越清晰，越需要通过合作分担责任的重量。",
    snake: "食神与伤官保持平衡时，想法更容易落到现实。",
    horse: "比肩、劫财较强的日子里，选择合作而非竞争，可以减少不必要的损耗。",
    goat: "食神活跃时，感受力与审美也可能连接到收入。",
    monkey: "伤官与食神同时活跃时，要留意别让幽默变成伤人的锋芒。",
    rooster: "正官、偏官之气越有条理，清晰的规则越能成为保护。",
    dog: "印星较强时，可以帮助别人，也要照顾自己的精力。",
    pig: "财星越清明，适度放下过多欲望，反而更容易打开流动。",
  },
  "zh-TW": {
    rat: "日干之氣越有條理，言語的鋒芒越容易緩和，合作也會順暢起來。若出現沖、刑，先停一拍再回應。",
    ox: "土的力量提供支撐時，穩定的習慣會成為資產。與其勉強擴張，不如先鞏固基本功。",
    tiger: "木氣越強，一句話的溫度越容易左右結果。",
    rabbit: "印星之氣越活躍，比起言語說明，體貼的行動更能帶來順勢。",
    dragon: "官星越清晰，越需要透過合作分擔責任的重量。",
    snake: "食神與傷官保持平衡時，想法更容易落到現實。",
    horse: "比肩、劫財較強的日子裡，選擇合作而非競爭，可以減少不必要的損耗。",
    goat: "食神活躍時，感受力與審美也可能連結到收入。",
    monkey: "傷官與食神同時活躍時，要留意別讓幽默變成傷人的鋒芒。",
    rooster: "正官、偏官之氣越有條理，清晰的規則越能成為保護。",
    dog: "印星較強時，可以幫助別人，也要照顧自己的精力。",
    pig: "財星越清明，適度放下過多欲望，反而更容易打開流動。",
  },
};

export function sajuInsightText(signId: string, original: string | undefined, locale: FortuneLocale): string | undefined {
  if (!original || locale === "ko") return original;
  const value = SAJU_INSIGHT_COPY[locale][signId];
  if (!value) throw new Error(`[fortune:i18n] missing ${locale} saju insight for ${signId}`);
  return value;
}

export function getLocalizedProfile(profile: SignProfile, locale: FortuneLocale): SignProfile {
  if (locale === "ko") return profile;
  const parsed = profileTranslations[locale];
  if (parsed.locale !== locale || parsed.schemaVersion !== 1) throw new Error(`[fortune:i18n] invalid ${locale} profile translation`);
  const translated: Record<string, string> = parsed.translations;
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

export function getLocalizedPeriodReading(
  profile: SignProfile,
  period: FortunePeriodId,
  locale: FortuneLocale,
  koreanReading: string,
): string {
  if (locale === "ko") return koreanReading;
  if (period === "today") return profile.reading;

  const copy = {
    en: {
      tomorrow: `Use tomorrow's score to prepare tonight, not to predict every event. ${profile.luckyHabit} Then decide one thing to begin, one thing to postpone, and where to leave room so ${profile.nameKo}'s strengths can work without being rushed.`,
      weekly: `Read the seven-day table as a schedule, not as seven separate verdicts. Put work that draws on ${profile.nameKo}'s strengths on higher-scoring days. On lower-scoring days, slow down and use this caution as a boundary: ${profile.caution}`,
      monthly: `Divide the month around the turning points shown above. Build on this strength in the earlier stretch — ${profile.strength} — then use the later stretch to consolidate, keeping the caution above as a practical limit.`,
    },
    ja: {
      tomorrow: `明日のスコアは出来事を断定するためではなく、今夜の準備に使います。${profile.luckyHabit} そのうえで、始めること・先送りすること・余白を残すことを一つずつ決めておくと、${profile.nameKo}らしい強みを急がず活かせます。`,
      weekly: `7日分の表は、七つの判定ではなく一週間の予定表として読みます。スコアの高い日に${profile.nameKo}の強みを使う仕事を置き、低い日は速度を落として、次の注意点を境界線にしてください。${profile.caution}`,
      monthly: `上に示した転換点を境に一か月を分けて読みます。前半は「${profile.strength}」という強みを育て、後半は広げたものを整えながら、注意点を現実的な上限として使ってください。`,
    },
    "zh-CN": {
      tomorrow: `明日的评分用于今晚做准备，而不是断定每一件事。${profile.luckyHabit} 在此基础上，分别决定一件要开始的事、一件可延后的事，以及需要保留余地的地方，${profile.nameKo}的优势会更容易发挥。`,
      weekly: `请把七天表当作一周的安排，而不是七个彼此孤立的结论。把能发挥${profile.nameKo}优势的事项放在高分日；低分日则放慢速度，并把这条提醒当作边界：${profile.caution}`,
      monthly: `请以上方标出的转折点划分这个月。前半段发展这项优势——${profile.strength}——后半段则收拢已经展开的事项，并把上方的注意点作为现实边界。`,
    },
    "zh-TW": {
      tomorrow: `明日的評分用來在今晚做準備，而不是斷定每一件事。${profile.luckyHabit} 在此基礎上，分別決定一件要開始的事、一件可延後的事，以及需要保留餘地的地方，${profile.nameKo}的優勢會更容易發揮。`,
      weekly: `請把七天表當作一週的安排，而不是七個彼此孤立的結論。把能發揮${profile.nameKo}優勢的事項放在高分日；低分日則放慢速度，並把這條提醒當作界線：${profile.caution}`,
      monthly: `請以上方標出的轉折點劃分這個月。前半段發展這項優勢——${profile.strength}——後半段則收攏已經展開的事項，並把上方的注意點作為現實界線。`,
    },
  } as const;
  return copy[locale][period];
}
