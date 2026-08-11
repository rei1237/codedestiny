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
      title: "無料四柱推命・タロット・今日の運勢 | Code Destiny",
      description: "四柱推命、タロット、紫微斗数、宿曜占星術、今日の運勢までを一か所で確認しながら、今の流れを落ち着いて丁寧に読み解けます。",
      h1: "無料四柱推命・タロット・今日の運勢",
      intro: "Code Destinyは、生年月日と相談内容の流れをもとに複数の占術をつなげて読める運勢プラットフォームです。",
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
      title: "免费四柱八字、塔罗与今日运势 | Code Destiny",
      description: "在一个地方查看四柱八字、塔罗、紫微斗数、宿曜占星术与今日运势，安静而细致地读懂当下的流向，并为你的选择提供参考。",
      h1: "免费四柱八字、塔罗与今日运势",
      intro: "Code Destiny依据出生信息与提问背景，把多种命理体系连接成易读的咨询式解读。",
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
      title: "免費四柱八字、塔羅與今日運勢 | Code Destiny",
      description: "在同一個地方查看四柱八字、塔羅、紫微斗數、宿曜占星術與今日運勢，安靜而細膩地讀懂當下的流向，並為你的選擇提供參考。",
      h1: "免費四柱八字、塔羅與今日運勢",
      intro: "Code Destiny依據出生資訊與提問背景，把多種命理體系串連成好讀的諮詢式解讀。",
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
      title: "Free Saju, Tarot, and Daily Fortune | Code Destiny",
      description: "Explore Saju, Tarot, Zi Wei Dou Shu, Sukuyo, and daily guidance in one calm fortune platform.",
      h1: "Free Saju, Tarot, and Daily Fortune",
      intro: "Code Destiny connects birth-data based traditions with question-centered readings so you can understand your current flow from several angles.",
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
      title: "紫微斗数 無料鑑定 | 命盤と十二宮の流れ",
      description: "命宮、財帛宮、官禄宮、夫妻宮など十二宮の流れから、性格、人間関係、仕事、お金の方向性までを落ち着いて読み解きます。",
      h1: "紫微斗数の命盤鑑定",
      intro: "紫微斗数は人生の領域を宮で分け、星の配置から現実的な選択の流れを読む東洋占星術です。",
      mainKeyword: "紫微斗数",
      relatedKeywords: ["紫微斗数 命盤", "命宮", "十二宮", "財帛宮"],
      valuePoints: ["十二宮ごとの主要テーマを整理", "関係と仕事の流れを接続", "初心者にもやさしい解説"],
      cta: { label: "紫微斗数を始める", href: "/ja/ziwei" },
      internalLinks: [
        { href: "/ja/insights/ziwei-basics-jp", label: "紫微斗数入門を読む" },
        { href: "/ja/today", label: "今日の流れを見る" },
      ],
      faq: [
        { question: "紫微斗数は四柱推命と何が違いますか？", answer: "四柱推命が時間の柱と五行を中心に見る一方、紫微斗数は十二宮と星の配置で人生の領域を読みます。" },
        { question: "出生時間は必要ですか？", answer: "精度に関わるため、できるだけ出生時間も入力することをおすすめします。" },
        { question: "初心者でも読めますか？", answer: "重要な宮から要約するため、初めてでも流れを追いやすい構成です。" },
      ],
      disclaimer: "鑑定内容は参考情報であり、実際の選択はご自身の状況と判断を合わせて行ってください。",
    },
    zh: {
      title: "紫微斗数免费解读 | 命盘与十二宫流向",
      description: "通过命宫、财帛宫、官禄宫、夫妻宫等十二宫的流向，细致查看你的性格、人际关系、事业与财富方向，并给出可参考的建议。",
      h1: "紫微斗数命盘解读",
      intro: "紫微斗数把人生领域分成不同宫位，并从星曜分布中读取现实选择的流向。",
      mainKeyword: "紫微斗数",
      relatedKeywords: ["紫微斗数命盘", "命宫", "十二宫", "财帛宫"],
      valuePoints: ["整理十二宫核心主题", "连接关系与事业流向", "适合新手的清晰解读"],
      cta: { label: "开始紫微斗数", href: "/zh/ziwei" },
      internalLinks: [
        { href: "/zh/insights/ziwei-basics-zh", label: "阅读紫微斗数入门" },
        { href: "/zh/today", label: "查看今日流向" },
      ],
      faq: [
        { question: "紫微斗数和八字有什么不同？", answer: "八字偏重时间柱与五行结构，紫微斗数则通过十二宫与星曜配置观察人生领域。" },
        { question: "需要出生时间吗？", answer: "为了提高准确度，建议尽量输入出生时间。" },
        { question: "新手能看懂吗？", answer: "页面会先整理关键宫位，因此第一次接触也能跟上整体脉络。" },
      ],
      disclaimer: "解读仅供参考，实际选择仍应结合个人情况与现实判断。",
    },
    "zh-TW": {
      title: "紫微斗數免費解讀 | 命盤與十二宮流向",
      description: "透過命宮、財帛宮、官祿宮、夫妻宮等十二宮的流向，細膩查看你的性格、人際關係、事業與財富方向，並提供可參考的建議。",
      h1: "紫微斗數命盤解讀",
      intro: "紫微斗數把人生領域分成不同宮位，並從星曜分布中讀取現實選擇的流向。",
      mainKeyword: "紫微斗數",
      relatedKeywords: ["紫微斗數命盤", "命宮", "十二宮", "財帛宮"],
      valuePoints: ["整理十二宮核心主題", "連結關係與事業流向", "適合新手的清楚解讀"],
      cta: { label: "開始紫微斗數", href: "/zh-tw/ziwei" },
      internalLinks: [
        { href: "/zh-tw/insights/ziwei-basics-tw", label: "閱讀紫微斗數入門" },
        { href: "/zh-tw/today", label: "查看今日流向" },
      ],
      faq: [
        { question: "紫微斗數和八字有什麼不同？", answer: "八字偏重時間柱與五行結構，紫微斗數則透過十二宮與星曜配置觀察人生領域。" },
        { question: "需要出生時間嗎？", answer: "為了提高準確度，建議盡量輸入出生時間。" },
        { question: "新手看得懂嗎？", answer: "頁面會先整理關鍵宮位，因此第一次接觸也能跟上整體脈絡。" },
      ],
      disclaimer: "解讀僅供參考，實際選擇仍應結合個人情況與現實判斷。",
    },
    en: {
      title: "Free Zi Wei Dou Shu Reading | Chart and Twelve Palaces",
      description: "Read personality, relationships, career, and wealth through the twelve palaces of a Zi Wei Dou Shu chart.",
      h1: "Zi Wei Dou Shu Chart Reading",
      intro: "Zi Wei Dou Shu divides life into palaces and reads the placement of stars to clarify practical decision patterns.",
      mainKeyword: "zi wei dou shu",
      relatedKeywords: ["zi wei chart", "life palace", "twelve palaces", "wealth palace"],
      valuePoints: ["Palace-by-palace theme summary", "Career and relationship context", "Beginner-friendly explanations"],
      cta: { label: "Start Zi Wei Dou Shu", href: "/en/ziwei" },
      internalLinks: [
        { href: "/en/insights/ziwei-basics-en", label: "Read Zi Wei Basics" },
        { href: "/en/today", label: "Check Today’s Flow" },
      ],
      faq: [
        { question: "How is Zi Wei different from Saju?", answer: "Saju focuses on pillars and elements, while Zi Wei reads life areas through palaces and star placement." },
        { question: "Do I need birth time?", answer: "Yes, birth time improves chart accuracy and is strongly recommended." },
        { question: "Is it beginner friendly?", answer: "Yes. The page starts with key palaces before moving into deeper details." },
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
      title: "宿曜占星 相性診断 | 27宿の関係の流れ",
      description: "27宿をもとに、二人の引力、安心感、衝突のパターン、そして関係が回復するタイミングまでを丁寧に読み解いていきます。",
      h1: "宿曜の相性と関係リーディング",
      intro: "宿曜は生まれた日の宿を基準に、関係の距離感と繰り返す感情の流れを読む伝統的な相性体系です。",
      mainKeyword: "宿曜 相性",
      relatedKeywords: ["27宿", "栄親", "業胎", "安壊"],
      valuePoints: ["関係の引力と緊張を把握", "衝突が強まる時期を確認", "回復の会話の糸口を探す"],
      cta: { label: "宿曜を見る", href: "/ja/sukuyo" },
      internalLinks: [
        { href: "/ja/insights/sukuyo-basics-jp", label: "宿曜入門を読む" },
        { href: "/ja/today", label: "今日の流れを見る" },
      ],
      faq: [
        { question: "宿曜は恋愛だけに使いますか？", answer: "恋愛だけでなく、家族、友人、同僚との感情の流れを見る時にも役立ちます。" },
        { question: "良い悪いを決めつけますか？", answer: "断定ではなく、引力と負担が生まれるパターンを関係運営の参考にします。" },
        { question: "相手の生年月日は必要ですか？", answer: "二人の宿を比較するため、相手の生年月日が必要です。" },
      ],
      disclaimer: "相性診断は関係理解の参考であり、相手の気持ちを確定するものではありません。",
    },
    zh: {
      title: "宿曜关系解读 | 27宿相性流向",
      description: "依据27宿细致查看两个人的吸引力、稳定感、冲突模式与关系修复时机，帮助你更加从容地理解彼此之间的相处流向。",
      h1: "宿曜相性与关系解读",
      intro: "宿曜以出生日期对应的宿为基础，观察关系距离感与反复出现的情绪流向。",
      mainKeyword: "宿曜相性",
      relatedKeywords: ["27宿", "荣亲关系", "业胎关系", "安坏关系"],
      valuePoints: ["看清关系的吸引与紧张", "确认冲突容易放大的阶段", "找到修复对话的线索"],
      cta: { label: "查看宿曜", href: "/zh/sukuyo" },
      internalLinks: [
        { href: "/zh/insights/sukuyo-basics-zh", label: "阅读宿曜入门" },
        { href: "/zh/today", label: "查看今日流向" },
      ],
      faq: [
        { question: "宿曜只适合看恋爱吗？", answer: "不只恋爱，也可以用于理解家人、朋友、同事之间的情绪流向。" },
        { question: "会直接判断好坏吗？", answer: "不会。它更关注吸引与负担如何形成，帮助你经营关系。" },
        { question: "需要对方生日吗？", answer: "需要。宿曜关系要比较两个人的宿，因此需要对方出生日期。" },
      ],
      disclaimer: "相性内容用于理解关系，不代表能确定对方真实想法。",
    },
    "zh-TW": {
      title: "宿曜關係解讀 | 27宿相性流向",
      description: "依據27宿細膩查看兩個人的吸引力、穩定感、衝突模式與關係修復時機，幫助你更從容地理解彼此之間的相處流向。",
      h1: "宿曜相性與關係解讀",
      intro: "宿曜以出生日期對應的宿為基礎，觀察關係距離感與反覆出現的情緒流向。",
      mainKeyword: "宿曜相性",
      relatedKeywords: ["27宿", "榮親關係", "業胎關係", "安壞關係"],
      valuePoints: ["看清關係的吸引與緊張", "確認衝突容易放大的階段", "找到修復對話的線索"],
      cta: { label: "查看宿曜", href: "/zh-tw/sukuyo" },
      internalLinks: [
        { href: "/zh-tw/insights/sukuyo-basics-tw", label: "閱讀宿曜入門" },
        { href: "/zh-tw/today", label: "查看今日流向" },
      ],
      faq: [
        { question: "宿曜只適合看戀愛嗎？", answer: "不只戀愛，也可以用來理解家人、朋友、同事之間的情緒流向。" },
        { question: "會直接判斷好壞嗎？", answer: "不會。它更著重吸引與負擔如何形成，幫助你經營關係。" },
        { question: "需要對方生日嗎？", answer: "需要。宿曜關係要比較兩個人的宿，因此需要對方的出生日期。" },
      ],
      disclaimer: "相性內容用於理解關係，不代表能確定對方真實想法。",
    },
    en: {
      title: "Sukuyo Compatibility Reading | 27 Lunar Mansions",
      description: "Read attraction, emotional safety, friction patterns, and recovery timing through the 27 Sukuyo mansions.",
      h1: "Sukuyo Compatibility and Relationship Reading",
      intro: "Sukuyo reads relational distance and recurring emotional patterns through the lunar mansion linked to each birth date.",
      mainKeyword: "sukuyo compatibility",
      relatedKeywords: ["27 mansions", "eishin", "gyoutai", "ankai"],
      valuePoints: ["See attraction and tension clearly", "Spot high-friction windows", "Find better recovery conversations"],
      cta: { label: "Open Sukuyo", href: "/en/sukuyo" },
      internalLinks: [
        { href: "/en/insights/sukuyo-basics-en", label: "Read Sukuyo Basics" },
        { href: "/en/today", label: "Check Today’s Flow" },
      ],
      faq: [
        { question: "Is Sukuyo only for romance?", answer: "No. It can also help with family, friendship, and team relationships." },
        { question: "Does it label relationships as good or bad?", answer: "No. It describes attraction and pressure patterns so you can manage the relationship more consciously." },
        { question: "Do I need the other person’s birth date?", answer: "Yes. Compatibility requires comparing both people’s mansions." },
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
      cta: { label: "紫微斗数でもっと深く見る", href: "/ja/ziwei" },
      internalLinks: [
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
      cta: { label: "用紫微斗数深入查看", href: "/zh/ziwei" },
      internalLinks: [
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
      cta: { label: "用紫微斗數深入查看", href: "/zh-tw/ziwei" },
      internalLinks: [
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
      cta: { label: "Go Deeper with Zi Wei", href: "/en/ziwei" },
      internalLinks: [
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
