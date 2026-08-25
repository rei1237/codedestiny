import type { LoveStats } from "../_data/loveCodeMvp";

type LoveCodeScoringLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";

const LOVE_CODE_SCORING_TEXT_TRANSLATIONS = {
  ko: {
    openTitle: "운명의 코드가 열린 관계",
    openBody: "서로의 속도와 감정의 결을 알아보는 힘이 좋습니다. 천천히 쌓은 신뢰가 설렘을 오래 지탱합니다.",
    closeTitle: "천천히 가까워지는 인연",
    closeBody: "마음의 온도는 충분히 따뜻합니다. 서두르지 않고 상대의 리듬을 존중할수록 관계가 깊어집니다.",
    tuningTitle: "조율이 필요한 설렘",
    tuningBody: "끌림은 살아 있지만 표현의 속도 차이가 있습니다. 질문보다 확인, 판단보다 배려가 관계를 안정시킵니다.",
    distanceTitle: "거리감 조절이 필요한 관계",
    distanceBody: "마음이 닿기 전에 긴장이 먼저 올라왔습니다. 상대의 불편 신호를 가볍게 넘기지 않는 것이 다음 흐름의 열쇠입니다.",
    temperature: "관계 온도",
    distance: "마음의 거리",
    excitement: "설렘의 흐름",
  },
  en: {
    openTitle: "A Relationship Where Destiny Opens",
    openBody: "You read each other's pace and emotional texture well. Trust built slowly can hold the spark for a long time.",
    closeTitle: "A Bond That Grows Closer Slowly",
    closeBody: "The emotional temperature is warm enough. The more you respect the other person's rhythm without rushing, the deeper the relationship becomes.",
    tuningTitle: "A Spark That Needs Tuning",
    tuningBody: "The attraction is alive, but the speed of expression differs. Confirmation over questioning, and care over judgment, will steady the relationship.",
    distanceTitle: "A Relationship That Needs Distance Control",
    distanceBody: "Tension rose before the heart could fully arrive. Not overlooking the other person's discomfort is the key to the next flow.",
    temperature: "Relationship Temperature",
    distance: "Emotional Distance",
    excitement: "Spark Flow",
  },
  ja: {
    openTitle: "運命のコードが開いた関係",
    openBody: "お互いの速度と感情の質感を読み取る力があります。ゆっくり積み上げた信頼が、ときめきを長く支えます。",
    closeTitle: "少しずつ近づくご縁",
    closeBody: "心の温度は十分に温かいです。急がず相手のリズムを尊重するほど、関係は深まります。",
    tuningTitle: "調整が必要なときめき",
    tuningBody: "惹かれ合う力はありますが、表現の速度に差があります。質問より確認、判断より思いやりが関係を安定させます。",
    distanceTitle: "距離感の調整が必要な関係",
    distanceBody: "心が届く前に緊張が先に高まりました。相手の不快なサインを軽く流さないことが、次の流れの鍵です。",
    temperature: "関係の温度",
    distance: "心の距離",
    excitement: "ときめきの流れ",
  },
  "zh-CN": {
    openTitle: "命运代码开启的关系",
    openBody: "你们很能读懂彼此的速度与情绪纹理。慢慢积累的信任，会让心动维持得更久。",
    closeTitle: "慢慢靠近的缘分",
    closeBody: "心的温度已经足够温暖。越是不急着推进、越尊重对方节奏，关系就越容易加深。",
    tuningTitle: "需要调频的心动",
    tuningBody: "吸引力仍在，但表达速度有所不同。比起追问，确认更好；比起判断，体贴更能稳定关系。",
    distanceTitle: "需要调整距离感的关系",
    distanceBody: "在心意抵达之前，紧张先升了起来。不要轻忽对方的不适信号，这是下一段流向的关键。",
    temperature: "关系温度",
    distance: "内心距离",
    excitement: "心动流向",
  },
  "zh-TW": {
    openTitle: "命運代碼開啟的關係",
    openBody: "你們很能讀懂彼此的速度與情緒紋理。慢慢累積的信任，會讓心動維持得更久。",
    closeTitle: "慢慢靠近的緣分",
    closeBody: "心的溫度已經足夠溫暖。越是不急著推進、越尊重對方節奏，關係就越容易加深。",
    tuningTitle: "需要調頻的心動",
    tuningBody: "吸引力仍在，但表達速度有所不同。比起追問，確認更好；比起判斷，體貼更能穩定關係。",
    distanceTitle: "需要調整距離感的關係",
    distanceBody: "在心意抵達之前，緊張先升了起來。不要輕忽對方的不適訊號，這是下一段流向的關鍵。",
    temperature: "關係溫度",
    distance: "內心距離",
    excitement: "心動流向",
  },
} as const;

/**
 * 🔴 미저작 로케일의 폴백은 **en 이다. ko 가 아니다.**
 * 2026-08-25 이전에는 여기서 ko 를 돌려줬고, 그래서 vi·hi·es·fr·de·nl·ms 7개 로케일 사용자가
 * 관계 지표 라벨과 결과 문안을 **한국어로** 봤다(사용자 지시: 미저작 로케일은 영어를 채운다).
 */
function loveCodeScoringText(key: keyof typeof LOVE_CODE_SCORING_TEXT_TRANSLATIONS.ko, locale: LoveCodeScoringLocale = "ko") {
  if (locale === "ko") return LOVE_CODE_SCORING_TEXT_TRANSLATIONS.ko[key];
  if (locale === "ja" || locale === "zh-CN" || locale === "zh-TW") {
    return LOVE_CODE_SCORING_TEXT_TRANSLATIONS[locale][key];
  }
  return LOVE_CODE_SCORING_TEXT_TRANSLATIONS.en[key];
}

function clampStat(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function applyEffects(stats: LoveStats, effects: Partial<LoveStats>): LoveStats {
  return {
    affection: clampStat(stats.affection + (effects.affection ?? 0)),
    trust: clampStat(stats.trust + (effects.trust ?? 0)),
    chemistry: clampStat(stats.chemistry + (effects.chemistry ?? 0)),
    tension: clampStat(stats.tension + (effects.tension ?? 0)),
    stability: clampStat(stats.stability + (effects.stability ?? 0)),
  };
}

export function resolveResult(stats: LoveStats, locale: LoveCodeScoringLocale = "ko") {
  const score = stats.affection + stats.trust + stats.chemistry + stats.stability - stats.tension * 0.6;

  if (score >= 260) {
    return {
      title: loveCodeScoringText("openTitle", locale),
      body: loveCodeScoringText("openBody", locale),
    };
  }

  if (score >= 220) {
    return {
      title: loveCodeScoringText("closeTitle", locale),
      body: loveCodeScoringText("closeBody", locale),
    };
  }

  if (score >= 180) {
    return {
      title: loveCodeScoringText("tuningTitle", locale),
      body: loveCodeScoringText("tuningBody", locale),
    };
  }

  return {
    title: loveCodeScoringText("distanceTitle", locale),
    body: loveCodeScoringText("distanceBody", locale),
  };
}

export function getRelationshipMetrics(stats: LoveStats, locale: LoveCodeScoringLocale = "ko") {
  return [
    { label: loveCodeScoringText("temperature", locale), value: Math.round((stats.affection + stats.trust) / 2) },
    { label: loveCodeScoringText("distance", locale), value: Math.round((100 - stats.tension + stats.stability) / 2) },
    { label: loveCodeScoringText("excitement", locale), value: Math.round((stats.chemistry + stats.affection) / 2) },
  ];
}
