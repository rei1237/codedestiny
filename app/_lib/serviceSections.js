export const SERVICE_SECTIONS = [
  {
    id: "saju",
    title: "사주 & 명리",
    items: [
      { href: "/saju/basic", title: "사주 만세력 기본 해석", desc: "오행·십성 기반 명식 분석 · 무료" },
      { href: "/saju/sibyl", title: "시빌라 시스템", desc: "사주 기반 진로 적성 × 운명 위험 계수 · 기본 무료" },
      { href: "/saju/lifebook", title: "인생의 책", desc: "프리미엄 사주 심층 분석 · 50,000원" },
      { href: "/saju/love-bible?premiumIntent=love-secret-pdf&mode=solo", title: "연애 비책", desc: "사주 기반 연애 전략 · 1인 30,000원 / 궁합 +10,000원 (총 40,000원)" },
      { href: "/saju/love-simulation", title: "LOVE CODE", desc: "사주 연애 시뮬레이션 · 잠금 해제 10,000원" },
      { href: "/saju/destiny-bias", title: "최애운명", desc: "사주 기반 팬덤 공명 분석 · 1회 5,000원" },
      { href: "/saju/animal-test", title: "십이운성 동물점", desc: "사주 속 십이운성으로 깨어나는 나만의 수호 동물 · 해금 10,000원" },
      { href: "/saju/destiny-meeting-place", title: "사주로 보는 인연의 장소", desc: "인연 장소·도시·타이밍 독립 분석 · 1회 10,000원" },
    ],
  },
  {
    id: "core",
    title: "동서양 명리",
    items: [
      { href: "/ziwei/chart", title: "자미두수 명반", desc: "기본 서비스 무료 · 궁합 5,000원" },
      { href: "/astrology/cosmic", title: "점성술 코즈믹", desc: "기본 서비스 무료 · 궁합 5,000원" },
      { href: "/vedic/jyotish", title: "베다 점성술", desc: "기본 서비스 무료 · 궁합 5,000원" },
    ],
  },
  {
    id: "tarot",
    title: "타로 리딩",
    items: [
      { href: "/tarot/mingri", title: "명리학 타로", desc: "카드와 십성을 잇는 리딩 · 무료" },
      { href: "/tarot/love", title: "우리는 무슨 사이?", desc: "6카드 연애 관계 리딩 · 5,000원" },
      {
        href: "/tarot/prompt-maker",
        title: "타로 프롬프트 라이브러리",
        desc: "질문 설계 + 카드 드로우 + 오라클 문장 정리 · 1회 5,000원 · 63 스프레드",
        image: "/fuctionassets/연애 재회 타로 프롬프트 메이커.webp",
        alt: "타로 프롬프트 라이브러리",
      },
      { href: "/tarot/healing", title: "따뜻한 태양 회복 타로", desc: "감정 온도와 회복 루틴 · 무료" },
      { href: "/tarot/self-esteem", title: "자존감 레벨업", desc: "나를 다시 세우는 5카드 · 무료" },
      { href: "/tarot/reunion", title: "재회운 등대 타로", desc: "다시 닿아도 안전한 거리 · 5,000원" },
      { href: "/tarot/year", title: "십이지신 천운(天運)", desc: "열두 달의 수호 리듬 · 3,000원" },
      { href: "/tarot/crystal-soul/", title: "원석 소울 타로", desc: "원석과 카드의 결 리딩 · 5,000원" },
      { href: "/tarot/mindscan/", title: "속마음 알아보기", desc: "겉말과 속마음의 간격 리딩 · 5,000원" },
      { href: "/celestial-harmony.html", title: "천체의 선율", desc: "행성 11카드 코즈믹 리딩 · 10,000원" },
      { href: "/tarot-ijik.html", title: "이직 운명의 카드", desc: "7카드 커리어 스프레드 · 5,000원" },
    ],
  },
  {
    id: "oracle",
    title: "신탁 & 해몽",
    items: [
      { href: "/oracle/hwatu", title: "타짜들의 화투점", desc: "12달 화투패 운세" },
      { href: "/oracle/hwatu-life", title: "화투 인생 패 테스트", desc: "타짜 컨셉 7문항 심리테스트" },
      { href: "/oracle/ifa", title: "IFA 오라클", desc: "요루바 256 오두 신탁 · 3,000원" },
      { href: "/oracle/kemet", title: "고대 이집트 신탁", desc: "케멧 오라클 리딩" },
      { href: "/oracle/juyuk", title: "주역 거북점", desc: "64괘 상징 해석" },
      { href: "/oracle/sukuyo", title: "숙요점", desc: "기본 서비스 무료 · 궁합 5,000원" },
      { href: "/oracle/rune", title: "스톤헨지 룬 오라클", desc: "고대 룬 상징 리딩" },
      { href: "/geomancy-oracle-v4.html", title: "지오맨시 흙점", desc: "대지의 징후 16행 신탁" },
      { href: "/royal-tea-oracle.html", title: "타세오그래피 찻잎 점", desc: "런던 로열 컵 문양 리딩" },
      { href: "/destiny-poker.html", title: "데스티니 포커", desc: "신들과 벌이는 운명의 카드 대결" },
      { href: "/dream/tarot", title: "드림 프롬프트", desc: "꿈 문장 AI 프롬프트" },
      { href: "/dream/psycho", title: "정신분석 해몽", desc: "프로이트 관점 해석" },
    ],
  },
  {
    id: "special",
    title: "특별 콘텐츠",
    items: [
      { href: "/secret-house_real.html", title: "나는 솔로 시크릿 하우스", desc: "자동 일간 캐치 연애 시뮬" },
      { href: "/animal/physio", title: "AI 동물 관상", desc: "셀카 얼굴형 분석" },
      { href: "/animal/mbti", title: "MBTI 동물 궁합", desc: "16유형 케미 분석" },
      { href: "/animal/totem", title: "애니멀 토템", desc: "수호 동물 메시지" },
      { href: "/flower/destiny", title: "운명의 꽃", desc: "통합 아틀리에" },
      { href: "/flower/astrology", title: "점성술 꽃", desc: "성운 테마 시각화" },
      { href: "/flower/jamidusu", title: "자미두수 꽃", desc: "명궁 테마 리포트" },
      { href: "/flower/sukuyo", title: "숙요 꽃", desc: "달 위상 기반 꽃" },
    ],
  },
];

const SERVICE_SECTION_TRANSLATIONS = {
  en: [
    {
      title: "Saju & Myeongri",
      items: [
        ["Basic Saju Manse Calendar Reading", "Five elements and Ten Gods birth chart analysis · Free"],
        ["Sibyl System", "Saju career aptitude and destiny risk coefficient · Basic free"],
        ["Book of Life", "Premium deep Saju analysis · KRW 50,000"],
        ["Love Secret Strategy", "Saju-based love strategy · Solo KRW 30,000 / compatibility +KRW 10,000 (total KRW 40,000)"],
        ["LOVE CODE", "Saju love simulation · Unlock KRW 10,000"],
        ["Destiny Bias", "Saju-based fandom resonance analysis · KRW 5,000 per reading"],
        ["Twelve Growth Animal Oracle", "Your guardian animal awakened through Twelve Growth Stars in Saju · Unlock KRW 10,000"],
        ["Destined Meeting Place by Saju", "Independent reading for relationship places, cities, and timing · KRW 10,000 per reading"],
      ],
    },
    {
      title: "Eastern & Western Fate Systems",
      items: [
        ["Zi Wei Dou Shu Chart", "Basic service free · Compatibility KRW 5,000"],
        ["Cosmic Astrology", "Basic service free · Compatibility KRW 5,000"],
        ["Vedic Astrology", "Basic service free · Compatibility KRW 5,000"],
      ],
    },
    {
      title: "Tarot Readings",
      items: [
        ["Myeongri Tarot", "A reading that connects cards and Ten Gods · Free"],
        ["What Are We?", "6-card love relationship reading · KRW 5,000"],
        ["Tarot Prompt Library", "Question design, card draw, and oracle sentence summary · KRW 5,000 per use · 63 spreads", "Tarot Prompt Library"],
        ["Warm Sun Healing Tarot", "Emotional temperature and recovery routines · Free"],
        ["Self-Esteem Level Up", "A 5-card reading that helps you stand again · Free"],
        ["Reunion Lighthouse Tarot", "The safe distance for reconnecting · KRW 5,000"],
        ["Twelve Zodiac Heaven Luck", "Guardian rhythm of twelve months · KRW 3,000"],
        ["Crystal Soul Tarot", "Stone and card texture reading · KRW 5,000"],
        ["Mind Scan Tarot", "Reading the gap between spoken words and inner feelings · KRW 5,000"],
        ["Celestial Harmony", "11-card planetary cosmic reading · KRW 10,000"],
        ["Career Change Destiny Cards", "7-card career spread · KRW 5,000"],
      ],
    },
    {
      title: "Oracles & Dreams",
      items: [
        ["Hwatu Oracle of Card Masters", "12-month Hwatu card fortune"],
        ["Hwatu Life Card Test", "7-question psychology test with a card-master concept"],
        ["IFA Oracle", "Yoruba 256 Odu oracle · KRW 3,000"],
        ["Ancient Egyptian Oracle", "Kemet oracle reading"],
        ["I Ching Turtle Oracle", "64 hexagram symbolic reading"],
        ["Sukuyo Astrology", "Basic service free · Compatibility KRW 5,000"],
        ["Stonehenge Rune Oracle", "Ancient rune symbol reading"],
        ["Geomancy Earth Oracle", "16-line earth sign oracle"],
        ["Tasseography Tea Leaf Oracle", "London royal cup pattern reading"],
        ["Destiny Poker", "A destiny card duel with the gods"],
        ["Dream Prompt", "AI prompt from dream sentences"],
        ["Psychoanalytic Dream Reading", "Freudian interpretation"],
      ],
    },
    {
      title: "Special Content",
      items: [
        ["I Am Solo Secret House", "Automatic daily love-catch simulation"],
        ["AI Animal Face Reading", "Selfie face-shape analysis"],
        ["MBTI Animal Compatibility", "16-type chemistry analysis"],
        ["Animal Totem", "Guardian animal message"],
        ["Destiny Flower", "Integrated atelier"],
        ["Astrology Flower", "Nebula-themed visualization"],
        ["Zi Wei Flower", "Life palace themed report"],
        ["Sukuyo Flower", "Moon-phase based flower"],
      ],
    },
  ],
  ja: [
    {
      title: "四柱推命・命理",
      items: [
        ["四柱推命 万歳暦 基本解釈", "五行・十神にもとづく命式分析 · 無料"],
        ["シビュラシステム", "四柱推命ベースの適職適性 × 運命リスク係数 · 基本無料"],
        ["人生の書", "プレミアム四柱推命深層分析 · 50,000ウォン"],
        ["恋愛秘策", "四柱推命ベースの恋愛戦略 · 1名 30,000ウォン / 相性 +10,000ウォン（合計 40,000ウォン）"],
        ["LOVE CODE", "四柱推命恋愛シミュレーション · 解錠 10,000ウォン"],
        ["推し運命", "四柱推命ベースのファンダム共鳴分析 · 1回 5,000ウォン"],
        ["十二運星どうぶつ占い", "四柱推命の十二運星から目覚める私だけの守護動物 · 解錠 10,000ウォン"],
        ["四柱推命で見る縁の場所", "縁の場所・都市・タイミング独立分析 · 1回 10,000ウォン"],
      ],
    },
    {
      title: "東西の命理",
      items: [
        ["紫微斗数命盤", "基本サービス無料 · 相性 5,000ウォン"],
        ["コズミック占星術", "基本サービス無料 · 相性 5,000ウォン"],
        ["ヴェーダ占星術", "基本サービス無料 · 相性 5,000ウォン"],
      ],
    },
    {
      title: "タロットリーディング",
      items: [
        ["命理タロット", "カードと十神をつなぐリーディング · 無料"],
        ["私たちはどんな関係？", "6枚カード恋愛関係リーディング · 5,000ウォン"],
        ["タロットプロンプトライブラリ", "質問設計 + カードドロー + オラクル文整理 · 1回 5,000ウォン · 63スプレッド", "タロットプロンプトライブラリ"],
        ["あたたかな太陽回復タロット", "感情の温度と回復ルーティン · 無料"],
        ["自己肯定感レベルアップ", "自分をもう一度立て直す5枚カード · 無料"],
        ["復縁運 灯台タロット", "もう一度届いても安全な距離 · 5,000ウォン"],
        ["十二支天運", "十二か月の守護リズム · 3,000ウォン"],
        ["クリスタルソウルタロット", "天然石とカードの質感リーディング · 5,000ウォン"],
        ["本音を読むタロット", "表の言葉と本音の距離を読む · 5,000ウォン"],
        ["天体の旋律", "惑星11カード コズミックリーディング · 10,000ウォン"],
        ["転職運命のカード", "7枚カード キャリアスプレッド · 5,000ウォン"],
      ],
    },
    {
      title: "神託・夢占い",
      items: [
        ["花札師たちの花札占い", "12か月花札運勢"],
        ["花札人生カードテスト", "勝負師コンセプトの7問心理テスト"],
        ["IFAオラクル", "ヨルバ256オドゥ神託 · 3,000ウォン"],
        ["古代エジプト神託", "ケメトオラクルリーディング"],
        ["易経亀占い", "64卦象徴解釈"],
        ["宿曜占星術", "基本サービス無料 · 相性 5,000ウォン"],
        ["ストーンヘンジ ルーンオラクル", "古代ルーン象徴リーディング"],
        ["ジオマンシー土占い", "大地の兆し16行神託"],
        ["タッセオグラフィー茶葉占い", "ロンドンロイヤルカップ文様リーディング"],
        ["デスティニーポーカー", "神々と挑む運命のカード対決"],
        ["ドリームプロンプト", "夢の文章AIプロンプト"],
        ["精神分析夢占い", "フロイト視点の解釈"],
      ],
    },
    {
      title: "特別コンテンツ",
      items: [
        ["私はソロ Secret House", "自動日干キャッチ恋愛シミュレーション"],
        ["AIどうぶつ人相", "セルフィー顔型分析"],
        ["MBTIどうぶつ相性", "16タイプのケミ分析"],
        ["アニマルトーテム", "守護動物メッセージ"],
        ["運命の花", "統合アトリエ"],
        ["占星術の花", "星雲テーマ視覚化"],
        ["紫微斗数の花", "命宮テーマレポート"],
        ["宿曜の花", "月相ベースの花"],
      ],
    },
  ],
  "zh-CN": [
    {
      title: "八字与命理",
      items: [
        ["八字万年历基础解读", "五行·十神命式分析 · 免费"],
        ["西比拉系统", "基于八字的职业适性 × 命运风险系数 · 基础免费"],
        ["人生之书", "高级八字深度分析 · 50,000韩元"],
        ["恋爱秘籍", "八字恋爱策略 · 单人30,000韩元 / 合盘 +10,000韩元（共40,000韩元）"],
        ["LOVE CODE", "八字恋爱模拟 · 解锁10,000韩元"],
        ["本命偏爱", "基于八字的粉丝共鸣分析 · 每次5,000韩元"],
        ["十二运星动物占", "从八字十二运星唤醒你的守护动物 · 解锁10,000韩元"],
        ["八字中的缘分地点", "缘分地点、城市与时机独立分析 · 每次10,000韩元"],
      ],
    },
    {
      title: "东西方命理",
      items: [
        ["紫微斗数命盘", "基础服务免费 · 合盘5,000韩元"],
        ["宇宙占星术", "基础服务免费 · 合盘5,000韩元"],
        ["吠陀占星术", "基础服务免费 · 合盘5,000韩元"],
      ],
    },
    {
      title: "塔罗解读",
      items: [
        ["命理塔罗", "连接卡牌与十神的解读 · 免费"],
        ["我们是什么关系？", "6张牌恋爱关系解读 · 5,000韩元"],
        ["塔罗提示词库", "问题设计 + 抽牌 + 神谕句整理 · 每次5,000韩元 · 63个牌阵", "塔罗提示词库"],
        ["暖阳疗愈塔罗", "情绪温度与恢复日常 · 免费"],
        ["自尊感升级", "重新支撑自己的5张牌 · 免费"],
        ["复合灯塔塔罗", "再次靠近也安全的距离 · 5,000韩元"],
        ["十二生肖天运", "十二个月守护节奏 · 3,000韩元"],
        ["水晶灵魂塔罗", "原石与卡牌质感解读 · 5,000韩元"],
        ["内心扫描塔罗", "读取表面话语与真实心意的距离 · 5,000韩元"],
        ["天体的旋律", "行星11张牌宇宙解读 · 10,000韩元"],
        ["转职命运卡牌", "7张牌职业牌阵 · 5,000韩元"],
      ],
    },
    {
      title: "神谕与解梦",
      items: [
        ["牌手花札占", "12个月花札牌运势"],
        ["花札人生牌测试", "牌手概念7题心理测试"],
        ["IFA神谕", "约鲁巴256奥杜神谕 · 3,000韩元"],
        ["古埃及神谕", "凯美特神谕解读"],
        ["周易龟占", "64卦象征解读"],
        ["宿曜占星", "基础服务免费 · 合盘5,000韩元"],
        ["巨石阵卢恩神谕", "古代卢恩象征解读"],
        ["地占土之神谕", "大地征兆16行神谕"],
        ["茶叶占卜", "伦敦皇家杯纹样解读"],
        ["命运扑克", "与诸神展开的命运卡牌对决"],
        ["梦境提示词", "梦句AI提示词"],
        ["精神分析解梦", "弗洛伊德视角解读"],
      ],
    },
    {
      title: "特别内容",
      items: [
        ["我是Solo秘密之家", "自动日干捕捉恋爱模拟"],
        ["AI动物面相", "自拍脸型分析"],
        ["MBTI动物合盘", "16型化学反应分析"],
        ["动物图腾", "守护动物讯息"],
        ["命运之花", "综合工作室"],
        ["占星花", "星云主题视觉化"],
        ["紫微斗数花", "命宫主题报告"],
        ["宿曜花", "月相基础花朵"],
      ],
    },
  ],
  "zh-TW": [
    {
      title: "八字與命理",
      items: [
        ["八字萬年曆基礎解讀", "五行·十神命式分析 · 免費"],
        ["西比拉系統", "基於八字的職業適性 × 命運風險係數 · 基礎免費"],
        ["人生之書", "高級八字深度分析 · 50,000韓元"],
        ["戀愛祕策", "八字戀愛策略 · 單人30,000韓元 / 合盤 +10,000韓元（共40,000韓元）"],
        ["LOVE CODE", "八字戀愛模擬 · 解鎖10,000韓元"],
        ["本命偏愛", "基於八字的粉絲共鳴分析 · 每次5,000韓元"],
        ["十二運星動物占", "從八字十二運星喚醒你的守護動物 · 解鎖10,000韓元"],
        ["八字中的緣分地點", "緣分地點、城市與時機獨立分析 · 每次10,000韓元"],
      ],
    },
    {
      title: "東西方命理",
      items: [
        ["紫微斗數命盤", "基礎服務免費 · 合盤5,000韓元"],
        ["宇宙占星術", "基礎服務免費 · 合盤5,000韓元"],
        ["吠陀占星術", "基礎服務免費 · 合盤5,000韓元"],
      ],
    },
    {
      title: "塔羅解讀",
      items: [
        ["命理塔羅", "連接卡牌與十神的解讀 · 免費"],
        ["我們是什麼關係？", "6張牌戀愛關係解讀 · 5,000韓元"],
        ["塔羅提示詞庫", "問題設計 + 抽牌 + 神諭句整理 · 每次5,000韓元 · 63個牌陣", "塔羅提示詞庫"],
        ["暖陽療癒塔羅", "情緒溫度與恢復日常 · 免費"],
        ["自尊感升級", "重新支撐自己的5張牌 · 免費"],
        ["復合燈塔塔羅", "再次靠近也安全的距離 · 5,000韓元"],
        ["十二生肖天運", "十二個月守護節奏 · 3,000韓元"],
        ["水晶靈魂塔羅", "原石與卡牌質感解讀 · 5,000韓元"],
        ["內心掃描塔羅", "讀取表面話語與真實心意的距離 · 5,000韓元"],
        ["天體的旋律", "行星11張牌宇宙解讀 · 10,000韓元"],
        ["轉職命運卡牌", "7張牌職業牌陣 · 5,000韓元"],
      ],
    },
    {
      title: "神諭與解夢",
      items: [
        ["牌手花札占", "12個月花札牌運勢"],
        ["花札人生牌測試", "牌手概念7題心理測試"],
        ["IFA神諭", "約魯巴256奧杜神諭 · 3,000韓元"],
        ["古埃及神諭", "凱美特神諭解讀"],
        ["周易龜占", "64卦象徵解讀"],
        ["宿曜占星", "基礎服務免費 · 合盤5,000韓元"],
        ["巨石陣盧恩神諭", "古代盧恩象徵解讀"],
        ["地占土之神諭", "大地徵兆16行神諭"],
        ["茶葉占卜", "倫敦皇家杯紋樣解讀"],
        ["命運撲克", "與諸神展開的命運卡牌對決"],
        ["夢境提示詞", "夢句AI提示詞"],
        ["精神分析解夢", "佛洛伊德視角解讀"],
      ],
    },
    {
      title: "特別內容",
      items: [
        ["我是Solo秘密之家", "自動日干捕捉戀愛模擬"],
        ["AI動物面相", "自拍臉型分析"],
        ["MBTI動物合盤", "16型化學反應分析"],
        ["動物圖騰", "守護動物訊息"],
        ["命運之花", "綜合工作室"],
        ["占星花", "星雲主題視覺化"],
        ["紫微斗數花", "命宮主題報告"],
        ["宿曜花", "月相基礎花朵"],
      ],
    },
  ],
  vi: [
    {
      title: "Saju & Mệnh lý",
      items: [
        ["Luận Saju Manse cơ bản", "Phân tích mệnh cục theo ngũ hành và Thập Thần · Miễn phí"],
        ["Hệ thống Sibyl", "Năng khiếu nghề nghiệp và hệ số rủi ro vận mệnh dựa trên Saju · Cơ bản miễn phí"],
        ["Cuốn sách cuộc đời", "Phân tích Saju chuyên sâu cao cấp · 50.000 KRW"],
        ["Bí quyết tình yêu", "Chiến lược tình yêu dựa trên Saju · 1 người 30.000 KRW / tương hợp +10.000 KRW (tổng 40.000 KRW)"],
        ["LOVE CODE", "Mô phỏng tình yêu Saju · Mở khóa 10.000 KRW"],
        ["Destiny Bias", "Phân tích cộng hưởng fandom dựa trên Saju · 5.000 KRW/lần"],
        ["Bói động vật Thập Nhị Vận Tinh", "Linh thú hộ mệnh thức tỉnh từ Thập Nhị Vận Tinh trong Saju · Mở khóa 10.000 KRW"],
        ["Nơi gặp duyên qua Saju", "Phân tích độc lập về địa điểm, thành phố và thời điểm duyên phận · 10.000 KRW/lần"],
      ],
    },
    {
      title: "Mệnh lý Đông Tây",
      items: [
        ["Lá số Tử Vi Đẩu Số", "Dịch vụ cơ bản miễn phí · Tương hợp 5.000 KRW"],
        ["Chiêm tinh Cosmic", "Dịch vụ cơ bản miễn phí · Tương hợp 5.000 KRW"],
        ["Chiêm tinh Vệ Đà", "Dịch vụ cơ bản miễn phí · Tương hợp 5.000 KRW"],
      ],
    },
    {
      title: "Bài đọc Tarot",
      items: [
        ["Myeongri Tarot", "Bài đọc nối lá bài với Thập Thần · Miễn phí"],
        ["Chúng ta là gì của nhau?", "Bài đọc quan hệ tình yêu 6 lá · 5.000 KRW"],
        ["Thư viện prompt Tarot", "Thiết kế câu hỏi + rút bài + tổng hợp câu oracle · 5.000 KRW/lần · 63 trải bài", "Thư viện prompt Tarot"],
        ["Tarot Mặt Trời Hồi Phục", "Nhiệt độ cảm xúc và routine hồi phục · Miễn phí"],
        ["Nâng cấp lòng tự trọng", "5 lá giúp bạn đứng vững lại · Miễn phí"],
        ["Tarot Ngọn Hải Đăng Tái Hợp", "Khoảng cách an toàn để chạm lại · 5.000 KRW"],
        ["Thiên vận 12 con giáp", "Nhịp bảo hộ của mười hai tháng · 3.000 KRW"],
        ["Tarot Linh Hồn Pha Lê", "Bài đọc theo kết cấu đá và lá bài · 5.000 KRW"],
        ["Đọc thầm tâm trí", "Đọc khoảng cách giữa lời nói ngoài mặt và cảm xúc bên trong · 5.000 KRW"],
        ["Giai điệu thiên thể", "Bài đọc cosmic 11 lá hành tinh · 10.000 KRW"],
        ["Lá bài vận mệnh đổi việc", "Trải bài sự nghiệp 7 lá · 5.000 KRW"],
      ],
    },
    {
      title: "Oracle & Giải mộng",
      items: [
        ["Bói Hwatu của cao thủ bài", "Vận may 12 tháng bằng bộ bài Hwatu"],
        ["Bài test cuộc đời Hwatu", "Bài test tâm lý 7 câu theo concept cao thủ bài"],
        ["Ifa Oracle", "Oracle Yoruba 256 Odu · 3.000 KRW"],
        ["Oracle Ai Cập cổ đại", "Bài đọc Kemet oracle"],
        ["Bói rùa Kinh Dịch", "Giải nghĩa biểu tượng 64 quẻ"],
        ["Sukuyo Astrology", "Dịch vụ cơ bản miễn phí · Tương hợp 5.000 KRW"],
        ["Stonehenge Rune Oracle", "Bài đọc biểu tượng rune cổ"],
        ["Geomancy Earth Oracle", "Oracle 16 hàng dấu hiệu của đất"],
        ["Bói lá trà Tasseography", "Bài đọc hoa văn tách trà hoàng gia London"],
        ["Destiny Poker", "Trận đấu bài vận mệnh với các vị thần"],
        ["Dream Prompt", "Prompt AI từ câu chữ trong mơ"],
        ["Giải mộng phân tâm học", "Diễn giải theo góc nhìn Freud"],
      ],
    },
    {
      title: "Nội dung đặc biệt",
      items: [
        ["I Am Solo Secret House", "Mô phỏng tình yêu bắt daily stem tự động"],
        ["AI xem tướng động vật", "Phân tích dáng mặt từ selfie"],
        ["Tương hợp động vật MBTI", "Phân tích chemistry 16 kiểu"],
        ["Animal Totem", "Thông điệp linh thú hộ mệnh"],
        ["Destiny Flower", "Atelier tích hợp"],
        ["Astrology Flower", "Trực quan hóa chủ đề tinh vân"],
        ["Zi Wei Flower", "Báo cáo chủ đề cung Mệnh"],
        ["Sukuyo Flower", "Hoa dựa trên pha Mặt Trăng"],
      ],
    },
  ],
};

export function getLocalizedServiceSections(locale = "ko") {
  const normalizedLocale = locale === "zh" ? "zh-CN" : locale;
  const localized = SERVICE_SECTION_TRANSLATIONS[normalizedLocale] || (normalizedLocale === "ko" ? null : SERVICE_SECTION_TRANSLATIONS.en);
  if (!localized) return SERVICE_SECTIONS;

  return SERVICE_SECTIONS.map((section, sectionIndex) => {
    const translatedSection = localized[sectionIndex];
    if (!translatedSection) return section;

    return {
      ...section,
      title: translatedSection.title || section.title,
      items: section.items.map((item, itemIndex) => {
        const translatedItem = translatedSection.items?.[itemIndex];
        if (!translatedItem) return item;
        return {
          ...item,
          title: translatedItem[0] || item.title,
          desc: translatedItem[1] || item.desc,
          alt: translatedItem[2] || item.alt,
        };
      }),
    };
  });
}
