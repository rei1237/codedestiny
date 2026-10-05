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
  facts?: { heading: string; rows: [string, string][] };
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
      title: "무료 사주팔자 · 타로 · 오늘의 운세 | Code Destiny",
      description: "사주, 타로, 자미두수, 숙요점, 오늘의 운세를 한곳에서 확인하고 지금 필요한 흐름을 차분히 읽어보세요.",
      h1: "무료 사주팔자 · 타로 · 오늘의 운세",
      intro: "Code Destiny는 생년월일과 질문의 맥락을 바탕으로 여러 운세 체계를 차분히 연결해 주는 한국어 운세 공간입니다.",
      mainKeyword: "무료 사주팔자",
      relatedKeywords: ["오늘의 운세", "무료 타로", "자미두수", "숙요점"],
      valuePoints: ["사주와 타로를 한 화면에서 비교", "초보자도 읽기 쉬운 상담형 문장", "심화 리포트로 이어지는 구조"],
      cta: { label: "오늘의 흐름 보기", href: "/today" },
      internalLinks: [
        { href: "/ziwei", label: "자미두수 보기" },
        { href: "/sukuyo", label: "숙요점 궁합 보기" },
        { href: "/insights", label: "운세 인사이트 읽기" },
      ],
      faq: [
        { question: "Code Destiny는 무료인가요?", answer: "기본 사주, 타로, 오늘의 운세는 무료로 시작할 수 있으며 일부 심화 리포트만 유료입니다." },
        { question: "처음이라면 어디서 시작하면 좋나요?", answer: "오늘의 운세로 현재 흐름을 보고, 이후 사주나 자미두수로 확장하면 이해가 쉽습니다." },
        { question: "운세 결과는 확정된 미래인가요?", answer: "아닙니다. 결과는 자기 점검과 선택을 돕는 참고 흐름으로 읽는 것이 좋습니다." },
        { question: "여러 운세를 함께 봐도 되나요?", answer: "네. 사주, 자미두수, 숙요점은 서로 다른 관점으로 현재의 고민을 비춰줍니다." },
      ],
      disclaimer: "모든 운세 콘텐츠는 참고용이며 의료, 법률, 재무 전문가의 조언을 대신하지 않습니다.",
    },
    ja: {
      title: "四柱推命・宿曜・タロット占い｜Code Destiny",
      description: "韓国式四柱推命の命式、宿曜の本命宿と相性、紫微斗数の十二宮を日本語で。占術ごとの見方と必要な入力を確認し、今の悩みに合う占いを選べます。",
      h1: "四柱推命とタロットで 次の一歩を見つけよう",
      intro: "Code Destinyは、韓国式四柱推命、タロット、紫微斗数、宿曜、西洋占星術、ヴェーダ占星術を日本語で探せる占いサービスです。自分の傾向を知りたいときは出生情報を使う命式・命盤から、具体的な悩みを整理したいときは質問に合うタロットから選べます。四柱推命とタロットでは必要な入力も読み方も異なります。各解説から対応する鑑定画面へ進み、公開機能と有料相談の範囲を確認できます。ヨニ、ネオ、ヨンニャンイは同じCode Destiny内で異なる相談体験を案内します。",
      mainKeyword: "無料四柱推命",
      relatedKeywords: ["今日の運勢", "無料タロット", "紫微斗数", "宿曜"],
      valuePoints: ["四柱推命とタロットを横断して確認", "初心者にも読みやすい相談文", "深いレポートへ自然につながる構成"],
      cta: { label: "今日の流れを見る", href: "/ja/today" },
      internalLinks: [
        { href: "/ja/ziwei", label: "紫微斗数を見る" },
        { href: "/ja/sukuyo", label: "宿曜の相性を見る" },
        { href: "/ja/insights", label: "運勢インサイトを読む" },
      ],
      faq: [
        { question: "Code Destinyは無料ですか？", answer: "基本の四柱推命、タロット、今日の運勢は無料で始められ、一部の詳細レポートのみ有料です。" },
        { question: "初めてならどこから始めるとよいですか？", answer: "まず今日の運勢で流れを確認し、その後に四柱推命や紫微斗数へ広げると分かりやすくなります。" },
        { question: "運勢は確定した未来ですか？", answer: "いいえ。自己理解と選択を助ける参考の流れとして読むことをおすすめします。" },
        { question: "複数の占術を一緒に見てもよいですか？", answer: "はい。四柱推命、紫微斗数、宿曜はそれぞれ違う角度から悩みを照らします。" },
      ],
      disclaimer: "占いコンテンツは参考情報であり、医療・法律・財務の専門的助言に代わるものではありません。",
    },
    zh: {
      title: "八字排盘·紫微斗数·塔罗占卜｜Code Destiny",
      description: "从四柱八字、紫微斗数十二宫到宿曜关系与塔罗问题解读。用简体中文了解不同体系的输入与看盘顺序，选择适合自己的命盘或咨询入口。",
      h1: "四柱八字与塔罗 理清自己的下一步",
      intro: "Code Destiny提供四柱八字、紫微斗数、宿曜、西洋占星、吠陀占星与塔罗的简体中文入口。想了解长期的性格与选择模式，可以从出生信息对应的命盘开始；想梳理某个具体问题，可以选择塔罗。八字需要出生资料，塔罗从问题与牌面出发，两者不能套用同一解释。每个介绍页说明本体系的阅读方法，并连接相应工具。妍伊、Neo与Yeongnyangi提供同一平台内不同风格的咨询体验。公开功能和可选付费咨询的范围，以对应服务页说明为准。",
      mainKeyword: "免费四柱八字",
      relatedKeywords: ["今日运势", "免费塔罗", "紫微斗数", "宿曜"],
      valuePoints: ["在同一页面比较八字与塔罗", "新手也容易理解的咨询语气", "可自然延伸到深度报告"],
      cta: { label: "查看今日流向", href: "/zh/today" },
      internalLinks: [
        { href: "/zh/ziwei", label: "查看紫微斗数" },
        { href: "/zh/sukuyo", label: "查看宿曜关系" },
        { href: "/zh/insights", label: "阅读运势洞察" },
      ],
      faq: [
        { question: "Code Destiny是免费的吗？", answer: "基础八字、塔罗与今日运势可以免费开始，部分深度报告为付费内容。" },
        { question: "第一次使用应从哪里开始？", answer: "建议先看今日运势，再进入四柱八字或紫微斗数，会更容易理解。" },
        { question: "运势结果是确定的未来吗？", answer: "不是。它更适合作为自我整理与选择判断的参考。" },
        { question: "可以同时查看多种占术吗？", answer: "可以。八字、紫微斗数与宿曜会从不同角度照亮同一个问题。" },
      ],
      disclaimer: "所有运势内容仅供参考，不能替代医疗、法律或财务等专业建议。",
    },
    "zh-TW": {
      title: "八字排盤·紫微斗數·塔羅占卜｜Code Destiny",
      description: "從四柱八字、紫微斗數十二宮到宿曜關係與塔羅問題解讀。用繁體中文了解不同體系的輸入與看盤順序，選擇適合自己的命盤或諮詢入口。",
      h1: "四柱八字與塔羅 理清自己的下一步",
      intro: "Code Destiny提供四柱八字、紫微斗數、宿曜、西洋占星、吠陀占星與塔羅的繁體中文入口。想了解長期的性格與選擇模式，可以從出生資訊對應的命盤開始；想梳理某個具體問題，可以選擇塔羅。八字需要出生資料，塔羅從問題與牌面出發，兩者不能套用同一解釋。每個介紹頁說明本體系的閱讀方法，並連結相應工具。妍伊、Neo與Yeongnyangi提供同一平台內不同風格的諮詢體驗。公開功能和可選付費諮詢的範圍，以對應服務頁說明為準。",
      mainKeyword: "免費四柱八字",
      relatedKeywords: ["今日運勢", "免費塔羅", "紫微斗數", "宿曜"],
      valuePoints: ["在同一頁面比較八字與塔羅", "新手也容易理解的諮詢語氣", "可自然延伸到深度報告"],
      cta: { label: "查看今日流向", href: "/zh-tw/today" },
      internalLinks: [
        { href: "/zh-tw/ziwei", label: "查看紫微斗數" },
        { href: "/zh-tw/sukuyo", label: "查看宿曜關係" },
        { href: "/zh-tw/insights", label: "閱讀運勢洞察" },
      ],
      faq: [
        { question: "Code Destiny是免費的嗎？", answer: "基礎八字、塔羅與今日運勢可以免費開始，部分深度報告為付費內容。" },
        { question: "第一次使用該從哪裡開始？", answer: "建議先看今日運勢，再進入四柱八字或紫微斗數，會比較容易理解。" },
        { question: "運勢結果是確定的未來嗎？", answer: "不是。它比較適合作為自我整理與選擇判斷的參考。" },
        { question: "可以同時查看多種占術嗎？", answer: "可以。八字、紫微斗數與宿曜會從不同角度照亮同一個問題。" },
      ],
      disclaimer: "所有運勢內容僅供參考，不能取代醫療、法律或財務等專業建議。",
    },
    en: {
      title: "Korean Saju, Tarot & Birth Charts | Code Destiny",
      description: "Explore Korean Saju, Zi Wei Dou Shu, Sukuyo and tarot in English. Compare traditions, check birth-chart inputs and choose a reading for your question.",
      h1: "Korean Saju & tarot for your next step",
      intro: "Code Destiny brings Korean Saju (Four Pillars, also called BaZi), tarot, Zi Wei Dou Shu, Sukuyo, Western astrology and Vedic astrology together. Start with a birth chart when you want to understand recurring patterns, or choose tarot for a specific question. Saju uses birth details; tarot begins with your question and cards. Each guide explains its own method and links to the corresponding tool. Yeoni, Neo and Yeongnyangi offer different reading experiences within the same platform. Public guidance and optional paid consultations are described separately on each service page.",
      mainKeyword: "free saju reading",
      relatedKeywords: ["daily fortune", "free tarot", "zi wei dou shu", "sukuyo"],
      valuePoints: ["Compare Saju and Tarot in one place", "Beginner-friendly consultation language", "A clear path into deeper reports"],
      cta: { label: "Read Today’s Flow", href: "/en/today" },
      internalLinks: [
        { href: "/en/ziwei", label: "Open Zi Wei Dou Shu" },
        { href: "/en/sukuyo", label: "Open Sukuyo Compatibility" },
        { href: "/en/insights", label: "Read Fortune Insights" },
      ],
      faq: [
        { question: "Is Code Destiny free?", answer: "Core Saju, Tarot, and daily fortune readings can be started for free. Some deeper reports are paid." },
        { question: "Where should beginners start?", answer: "Start with the daily flow, then expand into Saju or Zi Wei Dou Shu for more context." },
        { question: "Are fortune results fixed predictions?", answer: "No. They are best used as reflective guidance for choices and self-understanding." },
        { question: "Can I combine several systems?", answer: "Yes. Saju, Zi Wei Dou Shu, and Sukuyo illuminate the same question from different angles." },
      ],
      disclaimer: "Fortune content is for reflection and entertainment and does not replace medical, legal, or financial advice.",
    },
  },
  ziwei: {
    ko: {
      title: "자미두수 무료 해석 | 명반과 12궁 흐름",
      description: "명궁, 재백궁, 관록궁, 부부궁 등 12궁의 흐름으로 성향, 관계, 일, 재물의 방향을 살펴봅니다.",
      h1: "자미두수 명반 해석",
      intro: "자미두수는 삶의 영역을 궁위로 나누고 별의 배치를 통해 현실적인 선택의 흐름을 읽는 동양 점성술입니다.",
      mainKeyword: "자미두수",
      relatedKeywords: ["자미두수 명반", "명궁", "12궁", "재백궁"],
      valuePoints: ["12궁별 핵심 주제 정리", "관계와 직업 흐름 연결", "초보자용 쉬운 해석"],
      cta: { label: "자미두수 시작하기", href: "/ziwei" },
      internalLinks: [
        { href: "/insights/ziwei-basics", label: "자미두수 입문 읽기" },
        { href: "/today", label: "오늘의 흐름 보기" },
      ],
      faq: [
        { question: "자미두수는 사주와 무엇이 다른가요?", answer: "사주가 시간의 기둥과 오행을 중심으로 본다면, 자미두수는 12궁과 별 배치로 삶의 영역을 나눠 봅니다." },
        { question: "출생 시간이 필요한가요?", answer: "정확도가 중요하므로 가능하면 출생 시간을 함께 입력하는 것이 좋습니다." },
        { question: "초보자도 읽을 수 있나요?", answer: "핵심 궁위부터 요약해 보여주므로 처음 보는 사람도 흐름을 따라가기 쉽습니다." },
      ],
      disclaimer: "해석은 참고용이며 실제 선택은 개인의 상황과 판단을 함께 고려해야 합니다.",
    },
    ja: {
      facts: {
  "heading": "紫微斗数の命盤で見る項目",
  "rows": [
    [
      "命宮",
      "性格や持ち味を読むときの出発点。"
    ],
    [
      "官禄宮",
      "仕事や活動のテーマを、配置された星と合わせて読みます。"
    ],
    [
      "財帛宮",
      "お金や資源との向き合い方を読む領域。"
    ],
    [
      "夫妻宮",
      "親密な関係の傾向。相手の気持ちを証明するものではありません。"
    ],
    [
      "比較の前提",
      "同じ出生情報と暦を使います。十二宮と四柱推命の四柱は別の構造です。"
    ]
  ]
},
      title: "紫微斗数の命盤｜十二宮の見方と鑑定入口",
      description: "紫微斗数の命盤を命宮・官禄宮・財帛宮・夫妻宮から読む。必要な出生情報と四柱推命との違いを確認し、日本語の命盤画面へ進めます。",
      h1: "紫微斗数の命盤と十二宮を読む",
      intro: "紫微斗数は出生情報から十二宮と星の配置を定める占術です。まず命宮を確認し、仕事は官禄宮、お金は財帛宮、関係は夫妻宮という順に、テーマと星を組み合わせて読みます。",
      mainKeyword: "紫微斗数",
      relatedKeywords: ["紫微斗数 命盤", "命宮", "十二宮", "財帛宮"],
      valuePoints: [
  "出生年月日と時刻、暦の入力を先に確認します。",
  "星を一つだけ取り出さず、どの宮にあるかを合わせて読みます。",
  "四柱推命の四柱・五行とは別の枠組みとして比較できます。"
],
      cta: { label: "紫微斗数を始める", href: "/ziwei/chart/?lang=ja" },
      internalLinks: [
        { href: "/ja/insights/ziwei-basics-jp", label: "紫微斗数入門を読む" },
        { href: "/ja/today", label: "今日の流れを見る" },
      ],
      faq: [
  {
    "question": "紫微斗数の十二宮とは何ですか？",
    "answer": "性格、家族、仕事、財産、関係などのテーマを分けた十二の領域です。各宮の星の配置を合わせて読み、一つの宮だけで出来事を断定しません。"
  },
  {
    "question": "出生時刻が不明でも命盤を作れますか？",
    "answer": "出生時刻は命宮・身宮の位置に関わります。不明な時刻を仮に入力した場合、その命盤を確定したものとして扱わないでください。"
  },
  {
    "question": "四柱推命との違いは何ですか？",
    "answer": "四柱推命は年・月・日・時の四柱と五行の関係、紫微斗数は十二宮と星の配置を中心に読みます。Code Destinyではそれぞれの解説と道具を分けて提供しています。"
  },
  {
    "question": "命盤はどこから読めばよいですか？",
    "answer": "出生情報を確認し、命宮から始めます。その後、知りたいテーマに応じて官禄宮や夫妻宮などを見て、現実の状況と照らし合わせます。"
  }
],
      disclaimer: "鑑定内容は参考情報であり、実際の選択はご自身の状況と判断を合わせて行ってください。",
    },
    zh: {
      facts: {
  "heading": "紫微命盘的阅读要点",
  "rows": [
    [
      "命宫",
      "阅读性格与行为倾向的起点。"
    ],
    [
      "官禄宫",
      "结合本宫星曜，了解工作与活动的主题。"
    ],
    [
      "财帛宫",
      "观察资源、金钱与管理方式的主题。"
    ],
    [
      "夫妻宫",
      "阅读亲密关系模式，不能证明对方的真实想法。"
    ],
    [
      "比较前提",
      "使用相同出生资料与历法。紫微十二宫和八字四柱是不同结构。"
    ]
  ]
},
      title: "紫微斗数排盘｜十二宫命盘怎么看",
      description: "从命宫、官禄宫、财帛宫与夫妻宫读懂紫微命盘。先核对出生日期、时辰与历法，再进入排盘工具，比较紫微斗数和四柱八字的不同视角。",
      h1: "紫微斗数排盘与十二宫解读",
      intro: "紫微斗数根据出生资料排列十二宫与星曜。先看命宫，再按问题阅读官禄宫、财帛宫或夫妻宫；星曜需要放在宫位结构中理解，不能只凭一颗星判断人生。",
      mainKeyword: "紫微斗数",
      relatedKeywords: ["紫微斗数命盘", "命宫", "十二宫", "财帛宫"],
      valuePoints: [
  "先核对出生日期、时辰与历法。",
  "把星曜放回宫位结构中阅读，而非逐字判断吉凶。",
  "八字的四柱五行与紫微十二宫分开解释，再比较主题。"
],
      cta: { label: "开始紫微斗数", href: "/ziwei/chart/?lang=zh" },
      internalLinks: [
        { href: "/zh/insights/ziwei-basics-zh", label: "阅读紫微斗数入门" },
        { href: "/zh/today", label: "查看今日流向" },
      ],
      faq: [
  {
    "question": "紫微斗数十二宫是什么？",
    "answer": "十二宫分别对应性格、家人、关系、工作与资源等人生主题。阅读时结合宫位与星曜，不把单一宫位当作必然发生的事件。"
  },
  {
    "question": "不知道出生时辰能排盘吗？",
    "answer": "出生时辰参与确定命宫和身宫。若时辰不明，不应随意填一个时间，再把生成的命盘当成确定结果。"
  },
  {
    "question": "紫微斗数和八字有什么不同？",
    "answer": "八字以年、月、日、时四柱及五行关系为核心，紫微斗数以十二宫与星曜配置为核心。Code Destiny分别提供两者的介绍和工具。"
  },
  {
    "question": "新手先看哪个宫？",
    "answer": "先确认出生资料，再从命宫认识整体主题。随后按问题查看官禄宫、夫妻宫等相关宫位，并与现实经历对照。"
  }
],
      disclaimer: "解读仅供参考，实际选择仍应结合个人情况与现实判断。",
    },
    "zh-TW": {
      facts: {
  "heading": "紫微命盤的閱讀要點",
  "rows": [
    [
      "命宮",
      "閱讀性格與行為傾向的起點。"
    ],
    [
      "官祿宮",
      "結合本宮星曜，了解工作與活動的主題。"
    ],
    [
      "財帛宮",
      "觀察資源、金錢與管理方式的主題。"
    ],
    [
      "夫妻宮",
      "閱讀親密關係模式，不能證明對方的真實想法。"
    ],
    [
      "比較前提",
      "使用相同出生資料與曆法。紫微十二宮和八字四柱是不同結構。"
    ]
  ]
},
      title: "紫微斗數排盤｜十二宮命盤怎麼看",
      description: "從命宮、官祿宮、財帛宮與夫妻宮讀懂紫微命盤。先核對出生日期、時辰與曆法，再進入排盤工具，比較紫微斗數和四柱八字的不同視角。",
      h1: "紫微斗數排盤與十二宮解讀",
      intro: "紫微斗數根據出生資料排列十二宮與星曜。先看命宮，再按問題閱讀官祿宮、財帛宮或夫妻宮；星曜需要放在宮位結構中理解，不能只憑一顆星判斷人生。",
      mainKeyword: "紫微斗數",
      relatedKeywords: ["紫微斗數命盤", "命宮", "十二宮", "財帛宮"],
      valuePoints: [
  "先核對出生日期、時辰與曆法。",
  "把星曜放回宮位結構中閱讀，而非逐字判斷吉凶。",
  "八字的四柱五行與紫微十二宮分開解釋，再比較主題。"
],
      cta: { label: "開始紫微斗數", href: "/ziwei/chart/?lang=zh-tw" },
      internalLinks: [
        { href: "/zh-tw/insights/ziwei-basics-tw", label: "閱讀紫微斗數入門" },
        { href: "/zh-tw/today", label: "查看今日流向" },
      ],
      faq: [
  {
    "question": "紫微斗數十二宮是什麼？",
    "answer": "十二宮分別對應性格、家人、關係、工作與資源等人生主題。閱讀時結合宮位與星曜，不把單一宮位當作必然發生的事件。"
  },
  {
    "question": "不知道出生時辰能排盤嗎？",
    "answer": "出生時辰參與確定命宮和身宮。若時辰不明，不應隨意填一個時間，再把生成的命盤當成確定結果。"
  },
  {
    "question": "紫微斗數和八字有什麼不同？",
    "answer": "八字以年、月、日、時四柱及五行關係為核心，紫微斗數以十二宮與星曜配置為核心。Code Destiny分別提供兩者的介紹和工具。"
  },
  {
    "question": "新手先看哪個宮？",
    "answer": "先確認出生資料，再從命宮認識整體主題。隨後按問題查看官祿宮、夫妻宮等相關宮位，並與現實經歷對照。"
  }
],
      disclaimer: "解讀僅供參考，實際選擇仍應結合個人情況與現實判斷。",
    },
    en: {
      facts: {
  "heading": "What a Zi Wei Dou Shu chart shows",
  "rows": [
    [
      "Life Palace",
      "The starting point for the chart’s personality themes."
    ],
    [
      "Career Palace",
      "Work roles and activity, read with the stars placed here."
    ],
    [
      "Wealth Palace",
      "Themes around resources and how they are managed."
    ],
    [
      "Spouse Palace",
      "Patterns in close partnerships; not proof of another person’s thoughts."
    ],
    [
      "Before comparing charts",
      "Use the same birth details and calendar. Zi Wei palaces and Saju pillars are separate structures."
    ]
  ]
},
      title: "Zi Wei Dou Shu Chart & 12 Palaces | Code Destiny",
      description: "Explore a Zi Wei Dou Shu chart through the Life, Career, Wealth and Spouse palaces. Check the birth details needed and open the chart tool in English.",
      h1: "Zi Wei Dou Shu chart: a guide to the 12 palaces",
      intro: "Zi Wei Dou Shu maps birth details into 12 palaces and star placements. Start with the Life Palace, then compare the Career, Wealth and Spouse palaces without treating one star as a complete reading.",
      mainKeyword: "zi wei dou shu",
      relatedKeywords: ["zi wei chart", "life palace", "twelve palaces", "wealth palace"],
      valuePoints: [
  "Birth date and time are chart inputs, not optional personality questions.",
  "Palaces describe different life areas; read stars in their palace context.",
  "Compare a Saju chart separately: its Four Pillars are a different framework."
],
      cta: { label: "Start Zi Wei Dou Shu", href: "/ziwei/chart/?lang=en" },
      internalLinks: [
        { href: "/en/insights/ziwei-basics-en", label: "Read Zi Wei Basics" },
        { href: "/en/today", label: "Check Today’s Flow" },
      ],
      faq: [
  {
    "question": "What do the 12 palaces mean?",
    "answer": "Each palace represents a theme, such as identity, relationships, career or resources. The stars describe that theme within the chart; a palace is not a guaranteed event."
  },
  {
    "question": "Can I use Zi Wei Dou Shu without a birth time?",
    "answer": "The birth hour helps determine the Life and Body palaces. If it is unknown, do not enter an invented time and treat the resulting chart as certain."
  },
  {
    "question": "How is Zi Wei Dou Shu different from BaZi or Saju?",
    "answer": "BaZi and Korean Saju use four birth pillars and Five Element relationships. Zi Wei Dou Shu uses 12 palaces and star placements. Code Destiny provides separate guides and tools for both."
  },
  {
    "question": "How do I start reading a chart?",
    "answer": "Confirm the birth date, calendar and time first. Find the Life Palace, then read a relevant theme such as Career or Spouse. Compare the chart information with your actual situation."
  }
],
      disclaimer: "Readings are reflective guidance only. Real decisions should consider your actual circumstances.",
    },
  },
  sukuyo: {
    ko: {
      title: "숙요점 궁합 보기 | 27숙 관계 흐름",
      description: "27숙을 바탕으로 두 사람의 끌림, 안정감, 갈등 패턴, 회복 타이밍까지 살펴 관계의 흐름을 차분히 이해하도록 돕습니다.",
      h1: "숙요점 궁합과 관계 해석",
      intro: "숙요점은 태어난 날의 숙을 기준으로 관계의 거리감과 반복되는 감정 흐름을 읽는 전통 궁합 체계입니다.",
      mainKeyword: "숙요점 궁합",
      relatedKeywords: ["27숙", "영친관계", "업태관계", "안괴관계"],
      valuePoints: ["관계의 끌림과 긴장 파악", "갈등이 커지는 구간 확인", "회복 대화의 실마리 제공"],
      cta: { label: "숙요점 보기", href: "/sukuyo" },
      internalLinks: [
        { href: "/insights/sukuyo-basics", label: "숙요점 입문 읽기" },
        { href: "/today", label: "오늘의 흐름 보기" },
      ],
      faq: [
        { question: "숙요점은 연애에만 쓰나요?", answer: "연애뿐 아니라 가족, 친구, 동료 관계의 감정 흐름을 살필 때도 사용할 수 있습니다." },
        { question: "좋고 나쁨을 단정하나요?", answer: "단정하기보다 끌림과 부담이 생기는 패턴을 읽어 관계 운영에 참고합니다." },
        { question: "상대 생년월일이 필요한가요?", answer: "두 사람의 숙을 비교해야 하므로 상대의 생년월일이 필요합니다." },
      ],
      disclaimer: "궁합은 관계를 이해하기 위한 참고이며 상대의 마음을 확정하지 않습니다.",
    },
    ja: {
      facts: {
  "heading": "宿曜の入力と六つの関係",
  "rows": [
    [
      "入力",
      "生年月日・出生時刻・当時の時間帯を使います。相性では相手の情報も入力します。時刻不明なら仮の時刻による参考結果で、宿の境界では結果が変わることがあります。"
    ],
    [
      "基本の枠組み",
      "27宿。道具が示す暦と計算の前提を確認します。"
    ],
    [
      "関係の種類",
      "命・業胎・栄親・友衰・安壊・危成。それぞれ異なる関わり方を表します。"
    ],
    [
      "関係の向き",
      "自分と相手の役割を両方読みます。二人を入れ替えると、対になる役割の向きが変わる場合があります。"
    ],
    [
      "ヴェーダ占星術との違い",
      "宿曜の関係分類を、ナクシャトラの解釈にそのまま当てはめません。"
    ]
  ]
},
      title: "宿曜占星術｜本命宿・27宿の相性を調べる",
      description: "生年月日から本命宿を調べ、27宿の関係を読む宿曜占星術。栄親・友衰・安壊・危成・業胎・命の見方と、相性を比べる前の確認点を解説します。",
      h1: "宿曜占星術で本命宿と相性を調べる",
      intro: "宿曜占星術は生年月日に対応する本命宿を求め、二人の宿の関係を読む占術です。Code Destinyの27宿の解説から、本命宿を調べる画面へ進めます。",
      mainKeyword: "宿曜 相性",
      relatedKeywords: ["27宿", "栄親", "業胎", "安壊"],
      valuePoints: [
  "生年月日・出生時刻・当時の時間帯を使います。相性では相手の情報も入力します。時刻不明なら仮の時刻による参考結果で、宿の境界では結果が変わることがあります。",
  "27宿。道具が示す暦と計算の前提を確認します。",
  "命・業胎・栄親・友衰・安壊・危成。それぞれ異なる関わり方を表します。"
],
      cta: { label: "宿曜を見る", href: "/ja/?action=openSukuyoModal" },
      internalLinks: [
        { href: "/ja/insights/sukuyo-basics-jp", label: "宿曜入門を読む" },
        { href: "/ja/today", label: "今日の流れを見る" },
      ],
      faq: [
  {
    "question": "宿曜は恋愛だけに使いますか？",
    "answer": "恋愛だけでなく、家族、友人、同僚との感情の流れを見る時にも役立ちます。"
  },
  {
    "question": "良い悪いを決めつけますか？",
    "answer": "断定ではなく、引力と負担が生まれるパターンを関係運営の参考にします。"
  },
  {
    "question": "相手の生年月日は必要ですか？",
    "answer": "二人の宿を比較するため、相手の生年月日が必要です。"
  },
  {
    "question": "宿曜とヴェーダ占星術のナクシャトラは同じですか？",
    "answer": "月の宿に関わる体系ですが、計算の前提と読み方は異なります。宿曜の相性分類を、ヴェーダ占星術の出生図の解釈へそのまま置き換えないでください。"
  }
],
      disclaimer: "相性診断は関係理解の参考であり、相手の気持ちを確定するものではありません。",
    },
    zh: {
      facts: {
  "heading": "宿曜输入与六类关系",
  "rows": [
    [
      "输入",
      "使用出生日期、时间及当时的时区；配对时也需对方资料。不知道时间时，结果基于默认时间，仅供参考，在月宿边界附近可能变化。"
    ],
    [
      "体系",
      "27宿。先确认工具显示的历法与计算前提。"
    ],
    [
      "关系类型",
      "命、业胎、荣亲、友衰、安坏、危成，分别描述不同的相处模式。"
    ],
    [
      "关系方向",
      "同时阅读双方角色。交换两个人的位置时，成对角色的方向可能改变。"
    ],
    [
      "与吠陀占星比较",
      "宿曜关系分类不能直接替代吠陀占星的月宿解读。"
    ]
  ]
},
      title: "宿曜本命宿查询｜27宿关系与配对解读",
      description: "从出生日期了解宿曜本命宿，比较两人的27宿关系。认识荣亲、友衰、安坏、危成、业胎与命，区分宿曜关系解读和吠陀占星的月宿。",
      h1: "查询宿曜本命宿，了解27宿关系",
      intro: "宿曜以出生日期对应的本命宿为起点，比较两人在27宿体系中的关系。先确认双方出生日期，再看关系分类如何描述吸引、距离与相处模式。",
      mainKeyword: "宿曜相性",
      relatedKeywords: ["27宿", "荣亲关系", "业胎关系", "安坏关系"],
      valuePoints: [
  "使用出生日期、时间及当时的时区；配对时也需对方资料。不知道时间时，结果基于默认时间，仅供参考，在月宿边界附近可能变化。",
  "27宿。先确认工具显示的历法与计算前提。",
  "命、业胎、荣亲、友衰、安坏、危成，分别描述不同的相处模式。"
],
      cta: { label: "查看宿曜", href: "/zh/?action=openSukuyoModal" },
      internalLinks: [
        { href: "/zh/insights/sukuyo-basics-zh", label: "阅读宿曜入门" },
        { href: "/zh/today", label: "查看今日流向" },
      ],
      faq: [
  {
    "question": "宿曜只适合看恋爱吗？",
    "answer": "不只恋爱，也可以用于理解家人、朋友、同事之间的情绪流向。"
  },
  {
    "question": "会直接判断好坏吗？",
    "answer": "不会。它更关注吸引与负担如何形成，帮助你经营关系。"
  },
  {
    "question": "需要对方生日吗？",
    "answer": "需要。宿曜关系要比较两个人的宿，因此需要对方出生日期。"
  },
  {
    "question": "宿曜和吠陀占星的月宿一样吗？",
    "answer": "两者都涉及月宿，但计算前提与解释体系不同。不能把宿曜配对的关系分类直接当成吠陀出生星盘的解释。"
  }
],
      disclaimer: "相性内容用于理解关系，不代表能确定对方真实想法。",
    },
    "zh-TW": {
      facts: {
  "heading": "宿曜輸入與六類關係",
  "rows": [
    [
      "輸入",
      "使用出生日期、時間及當時的時區；配對時也需對方資料。不知道時間時，結果基於預設時間，僅供參考，在月宿邊界附近可能變化。"
    ],
    [
      "體系",
      "27宿。先確認工具顯示的曆法與計算前提。"
    ],
    [
      "關係類型",
      "命、業胎、榮親、友衰、安壞、危成，分別描述不同的相處模式。"
    ],
    [
      "關係方向",
      "同時閱讀雙方角色。交換兩個人的位置時，成對角色的方向可能改變。"
    ],
    [
      "與吠陀占星比較",
      "宿曜關係分類不能直接替代吠陀占星的月宿解讀。"
    ]
  ]
},
      title: "宿曜本命宿查詢｜27宿關係與配對解讀",
      description: "從出生日期了解宿曜本命宿，比較兩人的27宿關係。認識榮親、友衰、安壞、危成、業胎與命，區分宿曜關係解讀和吠陀占星的月宿。",
      h1: "查詢宿曜本命宿，了解27宿關係",
      intro: "宿曜以出生日期對應的本命宿為起點，比較兩人在27宿體系中的關係。先確認雙方出生日期，再看關係分類如何描述吸引、距離與相處模式。",
      mainKeyword: "宿曜相性",
      relatedKeywords: ["27宿", "榮親關係", "業胎關係", "安壞關係"],
      valuePoints: [
  "使用出生日期、時間及當時的時區；配對時也需對方資料。不知道時間時，結果基於預設時間，僅供參考，在月宿邊界附近可能變化。",
  "27宿。先確認工具顯示的曆法與計算前提。",
  "命、業胎、榮親、友衰、安壞、危成，分別描述不同的相處模式。"
],
      cta: { label: "查看宿曜", href: "/zh-tw/?action=openSukuyoModal" },
      internalLinks: [
        { href: "/zh-tw/insights/sukuyo-basics-tw", label: "閱讀宿曜入門" },
        { href: "/zh-tw/today", label: "查看今日流向" },
      ],
      faq: [
  {
    "question": "宿曜只適合看戀愛嗎？",
    "answer": "不只戀愛，也可以用來理解家人、朋友、同事之間的情緒流向。"
  },
  {
    "question": "會直接判斷好壞嗎？",
    "answer": "不會。它更著重吸引與負擔如何形成，幫助你經營關係。"
  },
  {
    "question": "需要對方生日嗎？",
    "answer": "需要。宿曜關係要比較兩個人的宿，因此需要對方的出生日期。"
  },
  {
    "question": "宿曜和吠陀占星的月宿一樣嗎？",
    "answer": "兩者都涉及月宿，但計算前提與解釋體系不同。不能把宿曜配對的關係分類直接當成吠陀出生星盤的解釋。"
  }
],
      disclaimer: "相性內容用於理解關係，不代表能確定對方真實想法。",
    },
    en: {
      facts: {
  "heading": "Sukuyo: inputs and relationship categories",
  "rows": [
    [
      "Input",
      "Birth date, birth time and the time zone at birth; add the other person’s details for compatibility. An unknown time uses a default, so the birth star may change near a boundary."
    ],
    [
      "Framework",
      "27 birth stars. Confirm the calendar and calculation convention shown by the tool."
    ],
    [
      "Categories",
      "Mei, Gyotai, Eishin, Yusui, Ankai and Kisei describe different relationship patterns."
    ],
    [
      "Direction",
      "Read each person’s role. Swapping the two people can reverse the direction of a paired role."
    ],
    [
      "Vedic comparison",
      "Sukuyo relationship categories are not interchangeable with Vedic nakshatra readings."
    ]
  ]
},
      title: "Sukuyo Compatibility & 27 Birth Stars | Code Destiny",
      description: "Find your Sukuyo birth star and compare 27-star relationship patterns. Check the birth dates needed and learn how Sukuyo differs from Vedic astrology.",
      h1: "Find your Sukuyo birth star and explore compatibility",
      intro: "Sukuyo compatibility compares two birth stars in a 27-star system. Start with each person’s birth date, then read the relationship category as a prompt for understanding patterns, not a verdict on the relationship.",
      mainKeyword: "sukuyo compatibility",
      relatedKeywords: ["27 mansions", "eishin", "gyoutai", "ankai"],
      valuePoints: [
  "Birth date, birth time and the time zone at birth; add the other person’s details for compatibility. An unknown time uses a default, so the birth star may change near a boundary.",
  "27 birth stars. Confirm the calendar and calculation convention shown by the tool.",
  "Mei, Gyotai, Eishin, Yusui, Ankai and Kisei describe different relationship patterns."
],
      cta: { label: "Open Sukuyo", href: "/en/?action=openSukuyoModal" },
      internalLinks: [
        { href: "/en/insights/sukuyo-basics-en", label: "Read Sukuyo Basics" },
        { href: "/en/today", label: "Check Today’s Flow" },
      ],
      faq: [
  {
    "question": "Is Sukuyo only for romance?",
    "answer": "No. It can also help with family, friendship, and team relationships."
  },
  {
    "question": "Does it label relationships as good or bad?",
    "answer": "No. It describes attraction and pressure patterns so you can manage the relationship more consciously."
  },
  {
    "question": "Do I need the other person’s birth date?",
    "answer": "Yes. Compatibility requires comparing both people’s mansions."
  },
  {
    "question": "Is Sukuyo the same as a Vedic nakshatra reading?",
    "answer": "No. Both discuss lunar mansions, but their calculation conventions and interpretation systems differ. Do not substitute a Sukuyo relationship category for a Vedic chart reading."
  }
],
      disclaimer: "Compatibility content is reflective guidance and does not determine another person’s feelings.",
    },
  },
  today: {
    ko: {
      title: "오늘의 운세 무료 보기 | 감정·관계·타이밍",
      description: "오늘의 감정 흐름, 관계 주의점, 실행 타이밍을 빠르게 확인하고 하루의 우선순위를 정리하세요.",
      h1: "오늘의 운세",
      intro: "오늘의 운세는 하루의 분위기와 선택의 속도를 정돈하는 짧은 리딩입니다.",
      mainKeyword: "오늘의 운세",
      relatedKeywords: ["무료 운세", "일일 운세", "오늘 운세"],
      valuePoints: ["하루의 감정 흐름 확인", "관계 주의점 점검", "실행 타이밍 조절"],
      cta: { label: "자미두수로 더 깊게 보기", href: "/ziwei" },
      internalLinks: [
        { href: "/fortune", label: "기간별 별자리·띠 운세 보기" },
        { href: "/sukuyo", label: "숙요점으로 관계 보기" },
        { href: "/insights", label: "운세 인사이트 읽기" },
      ],
      faq: [
        { question: "매일 달라지나요?", answer: "네. 날짜 기준의 흐름을 읽기 때문에 매일 확인하기 좋습니다." },
        { question: "아침에만 봐야 하나요?", answer: "아침이 가장 좋지만 중요한 일정 전에도 참고할 수 있습니다." },
        { question: "결과를 어떻게 쓰면 되나요?", answer: "확정된 예언이 아니라 하루의 우선순위를 정하는 참고로 쓰면 좋습니다." },
      ],
      disclaimer: "오늘의 운세는 참고용이며 실제 행동은 자신의 상황과 책임 아래 결정하세요.",
    },
    ja: {
      title: "今日の運勢 無料リーディング | 感情・関係・タイミング",
      description: "今日の感情の流れ、人間関係の注意点、行動に適したタイミングを手早く確認し、一日の優先順位を落ち着いて整えられます。",
      h1: "今日の運勢",
      intro: "今日の運勢は、一日の空気と選択の速度を整える短いリーディングです。",
      mainKeyword: "今日の運勢",
      relatedKeywords: ["無料運勢", "日運", "今日 占い"],
      valuePoints: ["一日の感情の流れを確認", "関係の注意点を点検", "行動タイミングを調整"],
      cta: { label: "紫微斗数でもっと深く見る", href: "/ziwei/chart/?lang=ja" },
      internalLinks: [
        { href: "/ja/fortune", label: "期間別の星座・十二支運勢を見る" },
        { href: "/ja/sukuyo", label: "宿曜で関係を見る" },
        { href: "/ja/insights", label: "運勢インサイトを読む" },
      ],
      faq: [
        { question: "毎日変わりますか？", answer: "はい。日付を基準に流れを読むため、毎日確認するのに向いています。" },
        { question: "朝だけ見るべきですか？", answer: "朝が理想ですが、大切な予定の前に見るのも役立ちます。" },
        { question: "結果はどう使えばよいですか？", answer: "確定した予言ではなく、一日の優先順位を整える参考として使ってください。" },
      ],
      disclaimer: "今日の運勢は参考情報です。実際の行動はご自身の状況と責任で判断してください。",
    },
    zh: {
      title: "今日运势免费查看 | 情绪、关系与时机",
      description: "帮助你快速确认今天的情绪流向、人际关系注意点与适合行动的时机，从容地整理并安排好一整天的优先顺序与节奏。",
      h1: "今日运势",
      intro: "今日运势是一段简短解读，帮助你整理一天的气氛与选择节奏。",
      mainKeyword: "今日运势",
      relatedKeywords: ["免费运势", "每日运势", "今日占卜"],
      valuePoints: ["确认一天的情绪流向", "检查关系注意点", "调整行动时机"],
      cta: { label: "用紫微斗数深入查看", href: "/ziwei/chart/?lang=zh" },
      internalLinks: [
        { href: "/zh/fortune", label: "查看按期间整理的星座与生肖运势" },
        { href: "/zh/sukuyo", label: "用宿曜查看关系" },
        { href: "/zh/insights", label: "阅读运势洞察" },
      ],
      faq: [
        { question: "每天都会变化吗？", answer: "会。它以日期流向为基础，适合每天查看。" },
        { question: "只能早上看吗？", answer: "早上最适合，但重要安排之前查看也有帮助。" },
        { question: "结果应该怎么使用？", answer: "请把它作为整理一天优先顺序的参考，而不是确定预言。" },
      ],
      disclaimer: "今日运势仅供参考，实际行动请结合自己的情况与责任判断。",
    },
    "zh-TW": {
      title: "今日運勢免費查看 | 情緒、關係與時機",
      description: "幫助你快速確認今天的情緒流向、人際關係注意點與適合行動的時機，從容地整理並安排好一整天的優先順序與節奏。",
      h1: "今日運勢",
      intro: "今日運勢是一段簡短解讀，幫助你整理一天的氣氛與選擇節奏。",
      mainKeyword: "今日運勢",
      relatedKeywords: ["免費運勢", "每日運勢", "今日占卜"],
      valuePoints: ["確認一天的情緒流向", "檢查關係注意點", "調整行動時機"],
      cta: { label: "用紫微斗數深入查看", href: "/ziwei/chart/?lang=zh-tw" },
      internalLinks: [
        { href: "/zh-tw/fortune", label: "查看依期間整理的星座與生肖運勢" },
        { href: "/zh-tw/sukuyo", label: "用宿曜查看關係" },
        { href: "/zh-tw/insights", label: "閱讀運勢洞察" },
      ],
      faq: [
        { question: "每天都會變化嗎？", answer: "會。它以日期流向為基礎，適合每天查看。" },
        { question: "只能早上看嗎？", answer: "早上最適合，但重要安排之前查看也有幫助。" },
        { question: "結果應該怎麼使用？", answer: "請把它作為整理一天優先順序的參考，而不是確定預言。" },
      ],
      disclaimer: "今日運勢僅供參考，實際行動請結合自己的情況與責任判斷。",
    },
    en: {
      title: "Daily Fortune Free Reading | Emotion, Relationships, Timing",
      description: "Check today’s emotional tone, relationship cautions, and timing cues so you can set better priorities.",
      h1: "Daily Fortune",
      intro: "The daily fortune is a short reading that helps you tune the pace and priorities of the day.",
      mainKeyword: "daily fortune",
      relatedKeywords: ["free fortune", "daily horoscope", "today reading"],
      valuePoints: ["Read the emotional tone", "Check relationship cautions", "Adjust timing before action"],
      cta: { label: "Go Deeper with Zi Wei", href: "/ziwei/chart/?lang=en" },
      internalLinks: [
        { href: "/en/fortune", label: "Browse Zodiac Fortunes by Period" },
        { href: "/en/sukuyo", label: "Read Relationships with Sukuyo" },
        { href: "/en/insights", label: "Read Fortune Insights" },
      ],
      faq: [
        { question: "Does it change every day?", answer: "Yes. It is based on the day’s flow and is meant for daily use." },
        { question: "Should I only read it in the morning?", answer: "Morning is ideal, but it can also help before important plans." },
        { question: "How should I use the result?", answer: "Use it as a priority-setting guide, not as a fixed prediction." },
      ],
      disclaimer: "Daily guidance is for reflection. Real actions remain your responsibility and should consider your actual context.",
    },
  },
};

// 번체 공개 경로는 새 URL을 늘리지 않고, 기존 허브에서 읽을 수 있는 설명을 보강한다.
const TRADITIONAL_READING_CONTEXT = "閱讀時請先確認頁面要求的出生資料、日期與曆法設定，並保留不知道的部分。命理用語不是對人格或未來的定論；更適合把它視為觀察重複模式、整理下一次對話或小行動的參考。若解讀與實際的健康、法律、財務條件或他人的明確意願不同，應以可確認的現實資訊為先。";
for (const page of Object.values(I18N_SEO_PAGES)) {
  const traditional = page["zh-TW"];
  traditional.intro = `${traditional.intro}${TRADITIONAL_READING_CONTEXT}`;
  traditional.faq.push({
    question: "閱讀結果時應注意什麼？",
    answer: "請保留輸入資料的不確定性，將結果與實際情況、清楚的溝通和可確認的條件一起判斷，不要把它當成對未來或他人心意的保證。",
  });
}
