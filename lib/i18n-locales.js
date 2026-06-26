/**
 * lib/i18n-locales.js
 * Locale landing metadata used by static locale shell pages.
 */

const LOCALE_META_TRANSLATIONS = {
  "en-us": {
    lang: "en",
    htmlLang: "en",
    dir: "ltr",
    title: "Free Four Pillars of Destiny & AI Tarot | Code Destiny",
    description:
      "Discover your life blueprint through Eastern Meta-Psychology. Free Saju (Four Pillars), AI Tarot, Zi Wei Dou Shu, Vedic Astrology, and 20+ fortune services.",
    heading: "Your Cosmic Blueprint Awaits",
    subheading:
      "Decoded from your birthdate using Four Pillars of Destiny, Zi Wei Dou Shu & AI Tarot",
    cta: "Explore Free Now ->",
    services: [
      { emoji: "🌟", name: "Four Pillars (Saju)", desc: "Your life archetype decoded", href: "/saju/basic" },
      { emoji: "🔮", name: "AI Tarot", desc: "Daily guidance from the cosmos", href: "/tarot/healing" },
      { emoji: "✨", name: "Zi Wei Dou Shu", desc: "Imperial star chart reading", href: "/ziwei/chart" },
      { emoji: "🪐", name: "Cosmic Astrology", desc: "Vedic & Western planets aligned", href: "/astrology/cosmic" },
      { emoji: "💫", name: "Destiny Flower", desc: "Your soul's floral archetype", href: "/flower/destiny" },
      { emoji: "🐾", name: "Spirit Animal", desc: "Your power animal revealed", href: "/saju-picture" },
    ],
    trustLine: "Trusted by 100,000+ seekers worldwide · English/Japanese/Chinese supported",
    premiumTeaser:
      "Unlock your complete Destiny Report - a deep-dive personal life blueprint crafted with premium AI analysis.",
    premiumCta: "See Premium Plans",
  },
  "ja-jp": {
    lang: "ja",
    htmlLang: "ja",
    dir: "ltr",
    title: "無料四柱推命・AIタロット | Code Destiny",
    description:
      "生年月日で分かる四柱推命・AIタロット・紫微斗数・西洋占星術など20種以上の占いを無料で。あなただけの運命の設計図を今すぐ確認。",
    heading: "あなたの宇宙的設計図",
    subheading: "四柱推命・紫微斗数・AIタロットで生年月日から解読",
    cta: "今すぐ無料で試す ->",
    services: [
      { emoji: "🌟", name: "四柱推命", desc: "命式で読む人生の構造", href: "/saju/basic" },
      { emoji: "🔮", name: "AIタロット", desc: "宇宙からの毎日のメッセージ", href: "/tarot/healing" },
      { emoji: "✨", name: "紫微斗数", desc: "帝王の星座盤占い", href: "/ziwei/chart" },
      { emoji: "🪐", name: "コズミック占星術", desc: "ヴェーダ＆西洋惑星の融合", href: "/astrology/cosmic" },
      { emoji: "💫", name: "運命の花", desc: "魂の花占い", href: "/flower/destiny" },
      { emoji: "🐾", name: "動物霊視", desc: "あなたのスピリットアニマル", href: "/saju-picture" },
    ],
    trustLine: "世界100,000人以上が利用 · 英語/日本語/中国語のみ対応",
    premiumTeaser: "あなただけのプレミアム運命レポートで、人生の青写真を完全解読。",
    premiumCta: "プレミアムプランを見る",
  },
  "zh-cn": {
    lang: "zh-CN",
    htmlLang: "zh-CN",
    dir: "ltr",
    title: "免费四柱八字·AI塔罗 | Code Destiny",
    description:
      "通过生辰八字解读您的人生蓝图。免费四柱推命、AI塔罗、紫微斗数、吠陀占星等服务，一键获取宇宙能量分析。",
    heading: "您的宇宙命运图谱",
    subheading: "四柱八字·紫微斗数·AI塔罗，从出生日期解读专属命盘",
    cta: "立即免费探索 ->",
    services: [
      { emoji: "🌟", name: "四柱八字", desc: "解读您的人生结构", href: "/saju/basic" },
      { emoji: "🔮", name: "AI塔罗", desc: "每日宇宙指引", href: "/tarot/healing" },
      { emoji: "✨", name: "紫微斗数", desc: "帝王星盘命理", href: "/ziwei/chart" },
      { emoji: "🪐", name: "宇宙占星", desc: "吠陀与西方星象融合", href: "/astrology/cosmic" },
      { emoji: "💫", name: "命运之花", desc: "灵魂花卉原型", href: "/flower/destiny" },
      { emoji: "🐾", name: "灵性动物", desc: "揭示您的力量图腾", href: "/saju-picture" },
    ],
    trustLine: "全球超10万用户信赖 · 仅支持英文/日文/中文页面",
    premiumTeaser: "解锁专属高级命运报告，以高端AI分析打造的人生全景蓝图。",
    premiumCta: "查看高级方案",
  },
};

export const LOCALE_META = LOCALE_META_TRANSLATIONS;
export const DEFAULT_LOCALE_META = LOCALE_META["en-us"];
