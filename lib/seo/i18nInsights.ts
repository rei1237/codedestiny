import { Locale } from "../i18n/locales";
import { I18N_ROUTE_MAP } from "../i18n/routes";

type LocaleTextMap = Record<Locale, string>;

export type I18nInsightArticle = {
  id: "insightZiweiBasics" | "insightSukuyoBasics";
  slugByLocale: LocaleTextMap;
  titleByLocale: LocaleTextMap;
  descriptionByLocale: LocaleTextMap;
  h1ByLocale: LocaleTextMap;
  bodyByLocale: Record<Locale, string[]>;
  faqByLocale: Record<
    Locale,
    Array<{ question: string; answer: string }>
  >;
};

export const I18N_INSIGHT_ARTICLES: I18nInsightArticle[] = [
  {
    id: "insightZiweiBasics",
    slugByLocale: {
      ko: "ziwei-basics",
      ja: "ziwei-basics-jp",
      zh: "ziwei-basics-zh",
      en: "ziwei-basics-en",
    },
    titleByLocale: {
      ko: "자미두수 입문 가이드: 명반을 읽는 순서",
      ja: "紫微斗数 入門ガイド: 命盤の読み順",
      zh: "紫微斗数入门指南：命盘阅读顺序",
      en: "Zi Wei Dou Shu Beginner Guide: Reading Order",
    },
    descriptionByLocale: {
      ko: "자미두수 초보자가 명궁, 재백궁, 관록궁처럼 핵심 궁위를 중심으로 명반을 차분히 읽는 기본 순서를 정리했습니다.",
      ja: "紫微斗数の初心者向けに、宮位中心で命盤を読む基本順序を整理しました。",
      zh: "面向新手整理紫微斗数命盘的关键阅读顺序与理解方法。",
      en: "A practical reading sequence for beginners who want to interpret Zi Wei charts by key palaces.",
    },
    h1ByLocale: {
      ko: "자미두수 입문: 궁위부터 읽는 명반 해석",
      ja: "紫微斗数入門: 宮位から読む命盤解釈",
      zh: "紫微斗数入门：从宫位开始读命盘",
      en: "Zi Wei Dou Shu Basics: Start with Key Palaces",
    },
    bodyByLocale: {
      ko: [
        "자미두수를 처음 볼 때는 모든 별을 한 번에 외우기보다, 먼저 핵심 궁위의 의미를 구분하는 것이 효율적입니다.",
        "명궁과 관계궁을 먼저 확인하고, 이후 재물·직업 축을 연결하면 현재 고민과 직접 연결되는 해석이 가능합니다.",
        "Code Destiny에서는 초심자도 이해하기 쉽도록 핵심 문장을 먼저 제시하고 세부 해설을 단계적으로 제공합니다.",
      ],
      ja: [
        "紫微斗数の初学者は、星を全部覚えるより先に主要宮位の意味をつかむ方が実用的です。",
        "命宮と関係宮を先に確認し、その後に仕事・財の軸をつなげると解釈の精度が上がります。",
        "Code Destinyは要点要約から詳細解説へ進む構成で、初学者にも読みやすく設計されています。",
      ],
      zh: [
        "学习紫微斗数时，不必先记住全部星曜，先掌握关键宫位更高效。",
        "先看命宫与关系宫，再连接事业与财务轴线，更容易得到可执行结论。",
        "Code Destiny 采用先摘要后细节的结构，便于新手循序理解。",
      ],
      en: [
        "For beginners, it is more practical to learn key palaces first rather than memorizing every star at once.",
        "Start with self and relationship palaces, then connect career and finance layers for practical interpretation.",
        "Code Destiny uses summary-first explanations followed by deeper details for easier learning.",
      ],
    },
    faqByLocale: {
      ko: [
        { question: "초보자는 무엇부터 봐야 하나요?", answer: "명궁, 관계궁, 직업궁 순서로 보면 핵심 흐름을 빠르게 파악할 수 있습니다." },
        { question: "사주와 함께 볼 수 있나요?", answer: "네. 사주로 기본 성향을 확인하고 자미두수로 관계·시기 구조를 보완하면 좋습니다." },
      ],
      ja: [
        { question: "最初にどの宮を見るべきですか？", answer: "命宮、関係宮、仕事宮の順で見ると全体像をつかみやすいです。" },
        { question: "四柱推命と併用できますか？", answer: "はい。四柱推命で基礎傾向、紫微斗数で時期・関係を補完できます。" },
      ],
      zh: [
        { question: "新手先看哪几个宫位？", answer: "建议先看命宫、关系宫、事业宫，再扩展到其他宫位。" },
        { question: "能和八字一起看吗？", answer: "可以，八字看底层结构，紫微斗数看宫位层面的节奏。" },
      ],
      en: [
        { question: "Which palaces should beginners read first?", answer: "Start with self, relationship, and career palaces for a reliable overview." },
        { question: "Can I combine this with Bazi?", answer: "Yes. Bazi gives structure, while Zi Wei gives palace-based timing and interaction context." },
      ],
    },
  },
  {
    id: "insightSukuyoBasics",
    slugByLocale: {
      ko: "sukuyo-basics",
      ja: "sukuyo-basics-jp",
      zh: "sukuyo-basics-zh",
      en: "sukuyo-basics-en",
    },
    titleByLocale: {
      ko: "숙요점 관계 해석: 갈등 패턴 읽는 법",
      ja: "宿曜の関係解釈: 衝突パターンの読み方",
      zh: "宿曜关系解读：冲突模式怎么看",
      en: "Sukuyo Relationship Reading: Conflict Pattern Basics",
    },
    descriptionByLocale: {
      ko: "숙요점을 통해 관계의 반복 갈등, 소통 리듬, 회복 타이밍을 함께 읽고 현실적인 대화 기준으로 정리하는 실전 가이드입니다.",
      ja: "宿曜を使って関係の衝突反復と回復タイミングを読む実践ガイドです。",
      zh: "通过宿曜识别关系中的冲突循环与修复窗口。",
      en: "A practical guide to identifying recurring conflict and recovery windows with Sukuyo.",
    },
    h1ByLocale: {
      ko: "숙요점 기본: 관계 충돌 패턴과 회복 타이밍",
      ja: "宿曜の基本: 関係衝突と回復タイミング",
      zh: "宿曜基础：关系冲突与修复节奏",
      en: "Sukuyo Basics: Conflict Cycles and Recovery Timing",
    },
    bodyByLocale: {
      ko: [
        "숙요점은 관계의 감정 온도와 소통 리듬을 구조적으로 볼 수 있는 해석 체계입니다.",
        "갈등이 반복되는 시점과 완화되는 시점을 함께 기록하면 실생활 대응 전략을 세우기 쉬워집니다.",
        "점수 자체보다 상호작용 패턴을 관찰하는 것이 실전 활용에 더 도움이 됩니다.",
      ],
      ja: [
        "宿曜は関係の感情温度と会話リズムを構造的に確認できる分析法です。",
        "衝突が起こりやすい時期と緩和しやすい時期を記録すると対処がしやすくなります。",
        "点数より相互作用パターンに注目する方が実生活で役立ちます。",
      ],
      zh: [
        "宿曜可以结构化观察关系中的情绪温度与沟通节奏。",
        "同时记录冲突高发时段和缓和窗口，更容易制定实际沟通策略。",
        "与其关注单一分数，不如关注互动模式本身。",
      ],
      en: [
        "Sukuyo helps you read emotional rhythm and communication patterns in relationships.",
        "Tracking both conflict-heavy windows and recovery windows makes practical planning easier.",
        "Pattern awareness is usually more useful than a single compatibility score.",
      ],
    },
    faqByLocale: {
      ko: [
        { question: "숙요점은 어떤 관계에 쓰나요?", answer: "연인뿐 아니라 친구, 가족, 동료 관계에도 활용할 수 있습니다." },
        { question: "결과를 어떻게 활용하나요?", answer: "갈등 고위험 시점과 대화 방식 개선 포인트를 미리 준비하는 데 활용하세요." },
      ],
      ja: [
        { question: "どんな関係に使えますか？", answer: "恋人だけでなく、友人・家族・職場関係にも使えます。" },
        { question: "どう活用すればよいですか？", answer: "衝突が起きやすい時期を把握し、会話設計を先に準備するのが有効です。" },
      ],
      zh: [
        { question: "适用于哪些关系？", answer: "不仅适用于情侣，也适用于朋友、家人、同事关系。" },
        { question: "如何实际应用结果？", answer: "提前识别高风险沟通时段，并准备更稳妥的表达策略。" },
      ],
      en: [
        { question: "What relationships can it support?", answer: "It works for couples, friends, family, and team communication." },
        { question: "How should I use the output?", answer: "Use it to anticipate high-friction periods and prepare better communication choices." },
      ],
    },
  },
];

export function getLocalizedInsightList(locale: Locale) {
  return I18N_INSIGHT_ARTICLES.map((item) => ({
    id: item.id,
    slug: item.slugByLocale[locale],
    href: I18N_ROUTE_MAP[item.id][locale],
    title: item.titleByLocale[locale],
    description: item.descriptionByLocale[locale],
  }));
}

export function getLocalizedInsightBySlug(locale: Locale, slug: string) {
  return I18N_INSIGHT_ARTICLES.find((item) => item.slugByLocale[locale] === slug) || null;
}
