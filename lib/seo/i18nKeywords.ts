import { Locale } from "../i18n/locales";

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoLinkItem = {
  href: string;
  label: string;
};

export type SeoPageLocaleContent = {
  title: string;
  description: string;
  h1: string;
  intro: string;
  mainKeyword: string;
  relatedKeywords: string[];
  valuePoints: string[];
  cta: {
    label: string;
    href: string;
  };
  internalLinks: SeoLinkItem[];
  faq: SeoFaqItem[];
  disclaimer: string;
};

type SeoPageKey = "home" | "ziwei" | "sukuyo" | "today";

export const I18N_SEO_PAGES: Record<SeoPageKey, Record<Locale, SeoPageLocaleContent>> = {
  home: {
    ko: {
      title: "무료 사주팔자 · 오늘의 운세 · 자미두수 | Code Destiny",
      description:
        "Code Destiny에서 사주팔자, 오늘의 운세, 자미두수, 숙요점을 무료로 확인하고 성향·연애·관계 흐름을 한 번에 해석하세요.",
      h1: "무료 사주팔자 · 오늘의 운세 · 자미두수",
      intro:
        "Code Destiny는 사주, 자미두수, 숙요점 결과를 한 화면에서 연결해 해석할 수 있는 실전형 운세 플랫폼입니다. 입문자는 오늘의 흐름부터 확인하고, 심화 사용자는 관계·시기 분석까지 이어서 볼 수 있습니다.",
      mainKeyword: "무료 사주팔자",
      relatedKeywords: ["오늘의 운세", "자미두수", "숙요점", "사주 궁합"],
      valuePoints: [
        "사주·자미두수·숙요점 결과를 같은 기준으로 비교",
        "초보자용 요약과 심화 해설을 분리해 이해 부담 감소",
        "핵심 서비스와 인사이트 글을 함께 연결해 탐색 효율 강화",
      ],
      cta: { label: "오늘의 운세 먼저 보기", href: "/today" },
      internalLinks: [
        { href: "/ziwei", label: "자미두수 해석 보기" },
        { href: "/sukuyo", label: "숙요점 궁합 확인" },
        { href: "/insights", label: "운세 인사이트 읽기" },
      ],
      faq: [
        { question: "Code Destiny는 무료인가요?", answer: "핵심 사주·운세 기능은 무료로 제공되며 일부 심화 리포트만 선택형으로 제공됩니다." },
        { question: "사주와 자미두수는 무엇이 다른가요?", answer: "사주는 오행과 일간 중심 해석에 강하고, 자미두수는 명반 궁위 기반의 구조적 해석에 강점이 있습니다." },
        { question: "숙요점은 궁합 확인에만 쓰나요?", answer: "관계 궁합뿐 아니라 소통 패턴, 갈등 반복 지점, 회복 타이밍까지 참고할 수 있습니다." },
        { question: "초보자는 어디서 시작하면 좋나요?", answer: "오늘의 운세 페이지에서 당일 흐름을 먼저 확인한 뒤 자미두수와 숙요점으로 확장하면 이해가 쉽습니다." },
      ],
      disclaimer: "본 콘텐츠는 오락 및 자기성찰 참고용이며 의학·법률·재무 자문을 대체하지 않습니다.",
    },
    ja: {
      title: "無料 四柱推命・今日の運勢・紫微斗数 | Code Destiny",
      description:
        "Code Destinyで四柱推命、今日の運勢、紫微斗数、宿曜を無料で確認。性格・恋愛・人間関係の流れを一つの導線で読めます。",
      h1: "無料 四柱推命・今日の運勢・紫微斗数",
      intro:
        "Code Destinyは四柱推命、紫微斗数、宿曜の結果をつなげて読める実用型占いプラットフォームです。入門者は今日の運勢から、上級者は相性や時期分析まで段階的に進めます。",
      mainKeyword: "無料 四柱推命",
      relatedKeywords: ["今日の運勢", "紫微斗数", "宿曜", "相性占い"],
      valuePoints: [
        "複数占術を同じ文脈で比較して理解しやすい",
        "初級向け要約と詳細解説を分けて読みやすい",
        "サービスページと解説記事を相互リンクで接続",
      ],
      cta: { label: "今日の運勢を見る", href: "/ja/today" },
      internalLinks: [
        { href: "/ja/ziwei", label: "紫微斗数を読む" },
        { href: "/ja/sukuyo", label: "宿曜の相性を確認" },
        { href: "/ja/insights", label: "占いインサイト記事" },
      ],
      faq: [
        { question: "Code Destinyは無料ですか？", answer: "主要な占い機能は無料で利用でき、詳細レポートのみ任意の追加機能として提供しています。" },
        { question: "四柱推命と紫微斗数の違いは？", answer: "四柱推命は五行バランス分析に強く、紫微斗数は命盤の宮位構造を読む分析に強みがあります。" },
        { question: "宿曜は相性専用ですか？", answer: "相性だけでなく、対話の癖や衝突ポイント、関係修復のタイミング整理にも使えます。" },
        { question: "初心者の開始順は？", answer: "今日の運勢で当日の流れをつかんだ後、紫微斗数と宿曜へ進むと理解しやすいです。" },
      ],
      disclaimer: "本コンテンツは娯楽および自己理解の参考情報であり、医療・法律・金融助言ではありません。",
    },
    zh: {
      title: "免费 八字·今日运势·紫微斗数 | Code Destiny",
      description:
        "在 Code Destiny 免费查看八字、今日运势、紫微斗数与宿曜，占卜结果可联动解读，快速掌握性格与关系趋势。",
      h1: "免费 八字·今日运势·紫微斗数",
      intro:
        "Code Destiny 是可联动阅读八字、紫微斗数与宿曜结果的实用占卜平台。新手可从今日运势开始，进阶用户可继续查看关系与时间节奏分析。",
      mainKeyword: "免费 八字",
      relatedKeywords: ["今日运势", "紫微斗数", "宿曜", "合盘"],
      valuePoints: [
        "多种术数结果在同一语境下对照阅读",
        "新手摘要与进阶解析分层展示",
        "服务页与文章页内链闭环，降低跳出",
      ],
      cta: { label: "先看今日运势", href: "/zh/today" },
      internalLinks: [
        { href: "/zh/ziwei", label: "查看紫微斗数" },
        { href: "/zh/sukuyo", label: "查看宿曜关系" },
        { href: "/zh/insights", label: "阅读占卜洞察" },
      ],
      faq: [
        { question: "Code Destiny 是免费的吗？", answer: "核心占卜功能免费开放，部分深度报告为可选增强内容。" },
        { question: "八字和紫微斗数有什么差异？", answer: "八字侧重五行与命局结构，紫微斗数侧重命盘宫位关系和人生阶段节奏。" },
        { question: "宿曜只能看配对吗？", answer: "除配对外，还可用于梳理沟通习惯、冲突触发点和修复节奏。" },
        { question: "新手应该先看哪一页？", answer: "建议先看今日运势，再进入紫微斗数和宿曜页面做延伸分析。" },
      ],
      disclaimer: "本内容仅供娱乐与自我探索参考，不构成医疗、法律或财务建议。",
    },
    en: {
      title: "Free Bazi, Daily Fortune, Zi Wei Dou Shu | Code Destiny",
      description:
        "Use Code Destiny to read Bazi, daily fortune, Zi Wei Dou Shu, and Sukuyo in one flow. Start free and explore personality, timing, and relationship signals.",
      h1: "Free Bazi, Daily Fortune, Zi Wei Dou Shu",
      intro:
        "Code Destiny is a practical fortune platform that connects Bazi, Zi Wei Dou Shu, and Sukuyo readings in one journey. Beginners can start with daily guidance, while advanced users can continue into compatibility and timing analysis.",
      mainKeyword: "free bazi reading",
      relatedKeywords: ["daily fortune", "zi wei dou shu", "sukuyo compatibility", "fortune analysis"],
      valuePoints: [
        "Compare multiple systems in one interpretation context",
        "Separate beginner summaries and advanced analysis",
        "Strong internal links between service pages and insights",
      ],
      cta: { label: "Check Daily Fortune", href: "/en/today" },
      internalLinks: [
        { href: "/en/ziwei", label: "Read Zi Wei Dou Shu" },
        { href: "/en/sukuyo", label: "Check Sukuyo Match" },
        { href: "/en/insights", label: "Read Insight Articles" },
      ],
      faq: [
        { question: "Is Code Destiny free to use?", answer: "Core fortune tools are free, and only selected deep reports are optional enhancements." },
        { question: "How is Bazi different from Zi Wei Dou Shu?", answer: "Bazi focuses on element balance and chart structure, while Zi Wei Dou Shu focuses on palace-based destiny patterns." },
        { question: "Is Sukuyo only for compatibility?", answer: "It is useful for compatibility, communication patterns, conflict triggers, and timing for recovery." },
        { question: "Where should a beginner start?", answer: "Start with the daily page, then expand to Zi Wei Dou Shu and Sukuyo for deeper context." },
      ],
      disclaimer: "Content is for entertainment and self-reflection only and does not replace medical, legal, or financial advice.",
    },
  },
  ziwei: {
    ko: {
      title: "자미두수 무료 해석 | 성향·궁위·관계 흐름 분석",
      description: "자미두수 명반의 핵심 궁위와 별 조합을 바탕으로 성향, 관계, 시기 흐름을 무료로 해석합니다.",
      h1: "자미두수 무료 해석",
      intro:
        "자미두수는 명반의 궁위와 주성 배치를 통해 개인의 성향과 관계 흐름을 구조적으로 읽는 방식입니다. Code Destiny는 입문자도 이해할 수 있도록 핵심 궁위부터 단계적으로 설명합니다.",
      mainKeyword: "자미두수 무료 해석",
      relatedKeywords: ["자미두수 명반", "자미두수 궁위", "무료 자미두수"],
      valuePoints: ["핵심 궁위 우선 해설", "관계 축 중심 요약", "시기 흐름 해석 포인트 제공"],
      cta: { label: "오늘의 흐름과 함께 보기", href: "/today" },
      internalLinks: [
        { href: "/sukuyo", label: "숙요점으로 관계 패턴 보완" },
        { href: "/insights/ziwei-basics", label: "자미두수 기본 가이드" },
      ],
      faq: [
        { question: "자미두수는 초보자도 볼 수 있나요?", answer: "핵심 궁위와 키워드 요약부터 보면 초보자도 흐름을 이해할 수 있습니다." },
        { question: "사주와 함께 보면 좋은가요?", answer: "사주로 기본 성향을 보고 자미두수로 관계/시기 구조를 보완하면 해석 폭이 넓어집니다." },
        { question: "정확도는 어떻게 높이나요?", answer: "출생 정보 정확도를 높이고 반복적으로 해석 포인트를 비교하면 체감 정확도가 올라갑니다." },
        { question: "연애운도 확인 가능한가요?", answer: "관계 관련 궁위와 시기 흐름을 함께 보면 연애 및 대인관계 경향을 파악할 수 있습니다." },
      ],
      disclaimer: "해석은 참고용으로 제공되며 중요한 결정은 현실 정보와 함께 판단하세요.",
    },
    ja: {
      title: "紫微斗数 無料リーディング | 宮位と相性の流れ",
      description: "紫微斗数の命盤をもとに、性格、相性、タイミングの流れを無料で解説します。",
      h1: "紫微斗数 無料リーディング",
      intro:
        "紫微斗数は命盤の宮位と主星配置から、性格と人間関係の推移を読む体系です。Code Destinyでは初心者向けに重要宮位から順番に理解できます。",
      mainKeyword: "紫微斗数 無料",
      relatedKeywords: ["紫微斗数 命盤", "紫微斗数 宮位", "相性占い"],
      valuePoints: ["重要宮位を優先解説", "関係軸の読み方を可視化", "時期判断の要点を整理"],
      cta: { label: "今日の運勢と合わせて見る", href: "/ja/today" },
      internalLinks: [
        { href: "/ja/sukuyo", label: "宿曜で関係傾向を補完" },
        { href: "/ja/insights/ziwei-basics-jp", label: "紫微斗数の基礎記事" },
      ],
      faq: [
        { question: "初心者でも使えますか？", answer: "はい。重要宮位の要約から読み進められる構成です。" },
        { question: "四柱推命と併用できますか？", answer: "四柱推命で基礎傾向を確認し、紫微斗数で時期と関係の構造を補えます。" },
        { question: "精度を上げる方法は？", answer: "出生情報の正確性を高め、複数回の結果比較で解釈精度を上げられます。" },
        { question: "恋愛の流れも分かりますか？", answer: "関係宮位と時期指標を合わせると恋愛傾向を読みやすくなります。" },
      ],
      disclaimer: "占い結果は参考情報です。重要な判断は現実情報と合わせて行ってください。",
    },
    zh: {
      title: "紫微斗数 免费解析 | 宫位与关系节奏",
      description: "基于紫微斗数命盘宫位与主星组合，免费解析性格、关系与阶段节奏。",
      h1: "紫微斗数 免费解析",
      intro:
        "紫微斗数通过命盘宫位和主星结构来判断个性与关系发展。Code Destiny 提供由浅入深的阅读路径，便于新手快速入门。",
      mainKeyword: "紫微斗数 免费",
      relatedKeywords: ["紫微斗数 命盘", "紫微宫位", "关系运势"],
      valuePoints: ["先看关键宫位", "关系轴线解读清晰", "阶段时机提示明确"],
      cta: { label: "结合今日运势查看", href: "/zh/today" },
      internalLinks: [
        { href: "/zh/sukuyo", label: "用宿曜补充关系分析" },
        { href: "/zh/insights/ziwei-basics-zh", label: "紫微斗数基础文章" },
      ],
      faq: [
        { question: "新手能看懂吗？", answer: "可以。页面先解释关键宫位，再逐步延伸到关系与时机判断。" },
        { question: "能和八字一起用吗？", answer: "可以，八字看底层结构，紫微斗数补充宫位层面的关系节奏。" },
        { question: "如何提升参考价值？", answer: "请尽量使用准确出生信息，并连续对比多次结果。" },
        { question: "可以看感情趋势吗？", answer: "可结合关系宫位与阶段时机，观察情感发展节奏。" },
      ],
      disclaimer: "占卜内容仅供参考，请结合现实信息进行决策。",
    },
    en: {
      title: "Zi Wei Dou Shu Free Reading | Palace-Based Analysis",
      description: "Read Zi Wei Dou Shu charts for personality, relationship patterns, and timing signals using palace-based interpretation.",
      h1: "Zi Wei Dou Shu Free Reading",
      intro:
        "Zi Wei Dou Shu reads destiny patterns from palace structure and star placement. Code Destiny provides a beginner-friendly sequence from key palaces to relationship and timing layers.",
      mainKeyword: "zi wei dou shu reading",
      relatedKeywords: ["zi wei chart", "palace reading", "fortune timing"],
      valuePoints: ["Start with key palaces", "Map relationship dynamics", "Read timing with clearer checkpoints"],
      cta: { label: "Pair with Daily Fortune", href: "/en/today" },
      internalLinks: [
        { href: "/en/sukuyo", label: "Use Sukuyo for relation signals" },
        { href: "/en/insights/ziwei-basics-en", label: "Zi Wei fundamentals" },
      ],
      faq: [
        { question: "Can beginners use Zi Wei Dou Shu?", answer: "Yes. Start with key palace summaries, then move to deeper layers." },
        { question: "Should I combine it with Bazi?", answer: "Yes. Bazi gives core structure while Zi Wei adds palace-based dynamics." },
        { question: "How can I improve usefulness?", answer: "Use accurate birth inputs and compare patterns over time." },
        { question: "Can it help with relationship timing?", answer: "It can highlight probable relationship phases and interaction patterns." },
      ],
      disclaimer: "For reflection and entertainment only. Use real-world judgment for important decisions.",
    },
  },
  sukuyo: {
    ko: {
      title: "숙요점 무료 궁합 | 관계 패턴·충돌 포인트 분석",
      description: "숙요점으로 연애·인간관계 궁합을 확인하고 소통 패턴, 갈등 반복 지점, 회복 타이밍을 점검하세요.",
      h1: "숙요점 무료 궁합",
      intro:
        "숙요점은 관계의 리듬과 상호작용 패턴을 점검하는 데 특화된 해석 방식입니다. 단순 궁합 점수보다 실제 대화 습관과 충돌 주기를 확인하는 데 초점을 둡니다.",
      mainKeyword: "숙요점 궁합",
      relatedKeywords: ["숙요점 무료", "숙요점 연애", "숙요점 관계"],
      valuePoints: ["관계 충돌 주기 파악", "대화 습관 체크", "회복 타이밍 힌트 제공"],
      cta: { label: "오늘의 관계 흐름 보기", href: "/today" },
      internalLinks: [
        { href: "/ziwei", label: "자미두수와 함께 보기" },
        { href: "/insights/sukuyo-basics", label: "숙요점 기초 가이드" },
      ],
      faq: [
        { question: "숙요점은 커플만 보나요?", answer: "연인뿐 아니라 친구, 동료, 가족 관계 해석에도 사용할 수 있습니다." },
        { question: "갈등 원인을 알 수 있나요?", answer: "반복되는 대화 패턴과 감정 반응 시점을 확인하는 데 도움이 됩니다." },
        { question: "사주 궁합과 무엇이 다른가요?", answer: "사주는 성향 구조 중심, 숙요점은 관계 상호작용 리듬 중심 해석에 강점이 있습니다." },
        { question: "실전 활용은 어떻게 하나요?", answer: "갈등 빈도가 높은 시기와 회복 가능 시기를 기록하며 대응 전략을 세우면 좋습니다." },
      ],
      disclaimer: "해석 결과는 참고용이며 관계 문제는 당사자 간 대화와 현실 판단이 우선입니다.",
    },
    ja: {
      title: "宿曜 相性 無料診断 | 関係パターン分析",
      description: "宿曜で恋愛・対人相性を確認し、会話傾向、衝突ポイント、回復タイミングを整理できます。",
      h1: "宿曜 相性 無料診断",
      intro:
        "宿曜は関係のリズムと相互作用を読むための実践的な分析です。単純な相性点数より、会話の癖や衝突周期を把握することに重点を置いています。",
      mainKeyword: "宿曜 相性",
      relatedKeywords: ["宿曜 無料", "恋愛 相性", "人間関係 占い"],
      valuePoints: ["衝突周期を可視化", "会話パターンの把握", "回復タイミングの目安"],
      cta: { label: "今日の関係運を見る", href: "/ja/today" },
      internalLinks: [
        { href: "/ja/ziwei", label: "紫微斗数と併用する" },
        { href: "/ja/insights/sukuyo-basics-jp", label: "宿曜の基礎記事" },
      ],
      faq: [
        { question: "恋人以外にも使えますか？", answer: "友人・職場・家族など幅広い関係に応用できます。" },
        { question: "衝突原因の把握に有効ですか？", answer: "反復する会話の崩れ方を整理しやすくなります。" },
        { question: "四柱推命との違いは？", answer: "四柱推命は個人の構造、宿曜は関係の相互作用に強みがあります。" },
        { question: "実生活でどう使う？", answer: "衝突しやすい時期を把握し、先に対話戦略を用意するのがおすすめです。" },
      ],
      disclaimer: "結果は参考情報です。最終判断は当事者の対話と現実状況を優先してください。",
    },
    zh: {
      title: "宿曜 关系配对 免费分析 | 沟通节奏与冲突点",
      description: "通过宿曜查看恋爱与人际关系配对，识别沟通节奏、冲突触发点与修复窗口。",
      h1: "宿曜 关系配对 免费分析",
      intro:
        "宿曜擅长分析关系中的互动节奏，不只看“合不合”，更关注沟通习惯、冲突循环与关系修复时机。",
      mainKeyword: "宿曜 配对",
      relatedKeywords: ["宿曜 免费", "关系分析", "恋爱合盘"],
      valuePoints: ["识别冲突循环", "梳理沟通模式", "给出修复时机线索"],
      cta: { label: "查看今日关系趋势", href: "/zh/today" },
      internalLinks: [
        { href: "/zh/ziwei", label: "结合紫微斗数分析" },
        { href: "/zh/insights/sukuyo-basics-zh", label: "宿曜基础文章" },
      ],
      faq: [
        { question: "只能用于情侣吗？", answer: "也可用于朋友、同事、家人等多种关系。" },
        { question: "能看出冲突原因吗？", answer: "可以辅助识别反复出现的沟通触发点。" },
        { question: "和八字配对有什么不同？", answer: "八字偏个人结构，宿曜更偏互动节奏与关系动力。" },
        { question: "如何落地使用？", answer: "提前记录高风险沟通时段，并在关键节点调整表达方式。" },
      ],
      disclaimer: "结果仅供参考，关系决策请结合现实沟通与共同判断。",
    },
    en: {
      title: "Sukuyo Compatibility Reading | Patterns and Conflict Cycles",
      description: "Use Sukuyo to evaluate relationship dynamics, communication friction, and recovery windows in love and social contexts.",
      h1: "Sukuyo Compatibility Reading",
      intro:
        "Sukuyo is useful for reading interaction rhythms, not just matching scores. It helps identify communication habits, recurring friction points, and practical timing for recovery.",
      mainKeyword: "sukuyo compatibility",
      relatedKeywords: ["relationship reading", "communication patterns", "fortune match"],
      valuePoints: ["Track conflict cycles", "Understand communication habits", "Find recovery timing clues"],
      cta: { label: "Check Today Relationship Flow", href: "/en/today" },
      internalLinks: [
        { href: "/en/ziwei", label: "Combine with Zi Wei" },
        { href: "/en/insights/sukuyo-basics-en", label: "Sukuyo basics" },
      ],
      faq: [
        { question: "Is Sukuyo only for couples?", answer: "No. It can be applied to friends, coworkers, and family dynamics as well." },
        { question: "Can it explain repeated conflicts?", answer: "It can surface recurring interaction patterns that often trigger friction." },
        { question: "How is it different from Bazi matching?", answer: "Bazi focuses on personal structure, while Sukuyo focuses on relational rhythm." },
        { question: "How do I use it in practice?", answer: "Track high-friction windows and prepare communication strategies in advance." },
      ],
      disclaimer: "For reflection support only. Real-world dialogue and consent come first in relationship decisions.",
    },
  },
  today: {
    ko: {
      title: "오늘의 운세 무료 보기 | 일일 흐름·관계·행동 포인트",
      description: "오늘의 운세를 기반으로 감정 흐름, 관계 주의 포인트, 행동 우선순위를 빠르게 확인하세요.",
      h1: "오늘의 운세 무료 보기",
      intro:
        "오늘의 운세는 하루의 감정 에너지와 관계 흐름을 빠르게 정리하는 출발점입니다. 일정·대화·의사결정 타이밍을 조정할 때 참고하기 좋습니다.",
      mainKeyword: "오늘의 운세",
      relatedKeywords: ["무료 운세", "하루 운세", "일일 운세"],
      valuePoints: ["하루 우선순위 빠른 확인", "관계 리스크 포인트 체크", "집중/휴식 타이밍 조정"],
      cta: { label: "자미두수로 심화 해석", href: "/ziwei" },
      internalLinks: [
        { href: "/sukuyo", label: "숙요점으로 관계 점검" },
        { href: "/insights", label: "운세 인사이트 더 보기" },
      ],
      faq: [
        { question: "오늘의 운세는 매일 바뀌나요?", answer: "네. 날짜 기준 흐름 해석이 달라지므로 매일 확인하는 것이 좋습니다." },
        { question: "아침에만 봐야 하나요?", answer: "아침이 가장 좋지만, 중요한 일정 전에도 재확인하면 유용합니다." },
        { question: "정확도는 어떤가요?", answer: "상황 해석의 참고 지표로 활용할 때 가장 효과적입니다." },
        { question: "다른 서비스와 함께 보면 좋은가요?", answer: "자미두수·숙요점과 함께 보면 하루 이슈를 더 입체적으로 볼 수 있습니다." },
      ],
      disclaimer: "당일 운세는 참고 정보이며 실제 행동은 개인의 판단과 책임 하에 결정하세요.",
    },
    ja: {
      title: "今日の運勢 無料 | 1日の流れと行動ポイント",
      description: "今日の運勢から感情、対人、行動優先度を短時間で把握。重要予定前の判断補助に活用できます。",
      h1: "今日の運勢 無料チェック",
      intro:
        "今日の運勢は1日の流れを整えるための最短ルートです。感情の波、対人注意点、行動タイミングを先に把握することで判断ミスを減らせます。",
      mainKeyword: "今日の運勢",
      relatedKeywords: ["無料占い", "デイリー運勢", "恋愛運"],
      valuePoints: ["優先タスクの整理", "対人リスクの先読み", "集中時間の最適化"],
      cta: { label: "紫微斗数で詳細分析", href: "/ja/ziwei" },
      internalLinks: [
        { href: "/ja/sukuyo", label: "宿曜で関係を見る" },
        { href: "/ja/insights", label: "解説記事を読む" },
      ],
      faq: [
        { question: "毎日更新されますか？", answer: "はい。日付ごとに流れが変わるため日次確認がおすすめです。" },
        { question: "朝以外でも見てもいい？", answer: "重要予定の前に再確認すると実用性が高まります。" },
        { question: "精度はどう考えるべき？", answer: "行動判断の補助指標として使うと効果的です。" },
        { question: "他サービスと併用すべき？", answer: "紫微斗数・宿曜と併用すると解像度が上がります。" },
      ],
      disclaimer: "占い結果は参考情報です。最終判断はご自身で行ってください。",
    },
    zh: {
      title: "今日运势 免费查看 | 日常节奏与行动建议",
      description: "快速查看今日运势，掌握情绪起伏、人际注意点与行动优先级。",
      h1: "今日运势 免费查看",
      intro:
        "今日运势适合用作一天的起点判断。先看情绪与关系节奏，再安排沟通和执行顺序，能减少临场决策压力。",
      mainKeyword: "今日运势",
      relatedKeywords: ["免费运势", "每日占卜", "今日建议"],
      valuePoints: ["快速设定当日优先级", "提前识别人际风险", "优化执行节奏"],
      cta: { label: "前往紫微斗数深度分析", href: "/zh/ziwei" },
      internalLinks: [
        { href: "/zh/sukuyo", label: "宿曜关系分析" },
        { href: "/zh/insights", label: "查看洞察文章" },
      ],
      faq: [
        { question: "运势每天都会变吗？", answer: "会。建议按日期每日查看。" },
        { question: "一定要早上看吗？", answer: "重要行程前再次查看也很有帮助。" },
        { question: "准确性如何理解？", answer: "建议作为决策辅助线索，而非唯一依据。" },
        { question: "要不要结合其他页面？", answer: "与紫微斗数、宿曜结合使用，信息更完整。" },
      ],
      disclaimer: "内容仅供参考，实际决策请结合现实信息。",
    },
    en: {
      title: "Daily Fortune Free Reading | Focus, Relationship, Timing",
      description: "Check your daily fortune for emotional flow, relationship caution points, and practical action priorities.",
      h1: "Daily Fortune Free Reading",
      intro:
        "The daily page is your quick planning layer. Use it to scan emotional weather, social friction risk, and timing windows before important decisions.",
      mainKeyword: "daily fortune reading",
      relatedKeywords: ["daily horoscope", "free fortune", "timing guidance"],
      valuePoints: ["Set priorities fast", "Spot social risk early", "Adjust execution timing"],
      cta: { label: "Go Deeper with Zi Wei", href: "/en/ziwei" },
      internalLinks: [
        { href: "/en/sukuyo", label: "Open Sukuyo compatibility" },
        { href: "/en/insights", label: "Read practical insights" },
      ],
      faq: [
        { question: "Does the daily reading update every day?", answer: "Yes. It is meant to be checked on a day-by-day basis." },
        { question: "Should I only check in the morning?", answer: "Morning is ideal, but checking before major events is also useful." },
        { question: "How should I use the result?", answer: "Treat it as guidance for prioritization, not as absolute certainty." },
        { question: "Can I combine it with other pages?", answer: "Yes. Pairing with Zi Wei and Sukuyo gives more context." },
      ],
      disclaimer: "Guidance content only. Final decisions should rely on your real-world context and judgment.",
    },
  },
};
