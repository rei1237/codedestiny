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
      "zh-TW": "ziwei-basics-tw",
      en: "ziwei-basics-en",
    },
    titleByLocale: {
      ko: "자미두수 입문 가이드: 명반을 읽는 순서",
      ja: "紫微斗数 入門ガイド: 命盤の読み順",
      zh: "紫微斗数入门指南：命盘阅读顺序",
      "zh-TW": "紫微斗數入門指南：命盤閱讀順序",
      en: "Zi Wei Dou Shu Beginner Guide: Reading Order",
    },
    descriptionByLocale: {
      ko: "자미두수 초보자가 명궁, 재백궁, 관록궁처럼 핵심 궁위를 중심으로 명반을 차분히 읽는 기본 순서를 정리했습니다.",
      ja: "紫微斗数の初心者向けに、命宮や財帛宮など核心となる宮位を中心に命盤を落ち着いて読み進める基本の順序を丁寧に整理しました。",
      zh: "面向新手，围绕命宫、财帛宫、官禄宫等核心宫位，系统整理紫微斗数命盘的关键阅读顺序、理解方法与实用要点。",
      "zh-TW": "面向新手，圍繞命宮、財帛宮、官祿宮等核心宮位，系統整理紫微斗數命盤的關鍵閱讀順序、理解方法與實用要點。",
      en: "A practical reading sequence for beginners who want to interpret Zi Wei charts by key palaces.",
    },
    h1ByLocale: {
      ko: "자미두수 입문: 궁위부터 읽는 명반 해석",
      ja: "紫微斗数入門: 宮位から読む命盤解釈",
      zh: "紫微斗数入门：从宫位开始读命盘",
      "zh-TW": "紫微斗數入門：從宮位開始讀命盤",
      en: "Zi Wei Dou Shu Basics: Start with Key Palaces",
    },
    bodyByLocale: {
      ko: [
        "자미두수를 처음 볼 때는 모든 별을 한 번에 외우기보다, 먼저 핵심 궁위의 의미를 구분하는 것이 효율적입니다.",
        "명반은 열두 개의 궁으로 이루어집니다. 명궁을 출발점으로 형제·부부·자녀·재백·질액·천이·노복·관록·전택·복덕·부모궁이 이어지며, 각 궁은 삶의 서로 다른 영역을 맡는다고 봅니다. 별의 이름을 외우기 전에 이 열두 칸이 각각 무엇을 다루는지부터 익히면 이후 해석이 훨씬 수월해집니다.",
        "명궁과 관계궁을 먼저 확인하고, 이후 재물·직업 축을 연결하면 현재 고민과 직접 연결되는 해석이 가능합니다.",
        "한 궁을 읽을 때는 그 궁만 따로 떼어 보지 않고 마주 보는 대궁과 삼합으로 이어지는 궁을 함께 봅니다. 이를 삼방사정이라 부르며, 한 자리만 보고 내린 결론이 과해지는 것을 막아 주는 장치로 이해하면 됩니다.",
        "생년 천간에 따라 네 개의 별에 화록·화권·화과·화기가 붙는데, 이를 사화라고 합니다. 특히 화기는 나쁜 것으로 단정하기보다 그 영역에 힘과 집중이 몰린다는 신호, 그래서 반복해 풀어야 할 과제로 읽는 편이 실전에서 더 쓸모가 있습니다.",
        "자미두수는 명대에 정리된 자미두수전서가 널리 인용되는 문헌이며, 이후 여러 유파를 거치며 별의 배치 규칙과 해석 기준이 갈렸습니다. 같은 생년월일시로도 유파에 따라 명반이 조금씩 다르게 나오는 이유가 여기에 있습니다.",
        "Code Destiny에서는 초심자도 이해하기 쉽도록 핵심 문장을 먼저 제시하고 세부 해설을 단계적으로 제공합니다.",
        "다만 명궁은 태어난 시각을 기준으로 정해지므로, 출생 시간이 불확실하면 전체 배치가 흔들릴 수 있습니다. 결과는 확정된 예언이 아니라 자신을 정리해 보는 참고 자료로 받아들이시길 권합니다.",
      ],
      ja: [
        "紫微斗数の初学者は、星を全部覚えるより先に主要宮位の意味をつかむ方が実用的です。",
        "命盤は十二の宮で構成されます。命宮を起点に兄弟・夫婦・子女・財帛・疾厄・遷移・奴僕・官禄・田宅・福徳・父母の各宮が続き、それぞれが人生の異なる領域を担うと考えます。星の名前を覚える前に、この十二の枠が何を扱うのかを先に押さえると解釈が楽になります。",
        "命宮と関係宮を先に確認し、その後に仕事・財の軸をつなげると解釈の精度が上がります。",
        "一つの宮を読むときは、その宮だけを切り離さず、向かい合う対宮と三合でつながる宮を併せて見ます。これを三方四正と呼び、一か所だけを見て結論を出しすぎることを防ぐ仕組みだと理解してください。",
        "生年の天干によって四つの星に化禄・化権・化科・化忌が付きます。これを四化と呼びます。特に化忌は悪いものと決めつけるより、その領域に力と関心が集まる合図、つまり繰り返し向き合う課題として読む方が実用的です。",
        "紫微斗数は明代に整理された紫微斗数全書が広く引用される文献で、その後さまざまな流派を経て星の配置規則や解釈基準が分かれました。同じ生年月日時でも流派によって命盤が少しずつ異なるのはこのためです。",
        "Code Destinyは要点要約から詳細解説へ進む構成で、初学者にも読みやすく設計されています。",
        "ただし命宮は生まれた時刻を基準に定まるため、出生時間が不確かだと全体の配置が揺らぐことがあります。結果は確定した予言ではなく、自分を整理するための参考資料として受け取ってください。",
      ],
      zh: [
        "学习紫微斗数时，不必先记住全部星曜，先掌握关键宫位更高效。",
        "命盘由十二宫组成。以命宫为起点，依次是兄弟、夫妻、子女、财帛、疾厄、迁移、奴仆、官禄、田宅、福德、父母宫，各自负责人生的不同领域。在记住星曜名称之前，先弄清这十二格分别处理什么，之后的解读会顺畅很多。",
        "先看命宫与关系宫，再连接事业与财务轴线，更容易得到可执行结论。",
        "看某一宫时不要把它单独抽出来，而要连同对面的对宫以及三合相连的宫一起看。这称为三方四正，可以理解为防止只凭一个位置就下过重结论的机制。",
        "生年天干会给四颗星带来化禄、化权、化科、化忌，合称四化。其中化忌与其断定为凶，不如读作力量与关注集中在该领域的信号，也就是需要反复面对的课题，这样在实际使用中更有帮助。",
        "紫微斗数以明代整理的紫微斗数全书流传最广，此后经过多个流派，星曜排布规则与解释标准出现分歧。同样的出生年月日时，不同流派排出的命盘会略有差异，原因就在这里。",
        "Code Destiny 采用先摘要后细节的结构，便于新手循序理解。",
        "不过命宫依出生时刻而定，若出生时间不确定，整体排布可能随之浮动。请把结果当作整理自我的参考材料，而不是既定的预言。",
      ],
      "zh-TW": [
        "學習紫微斗數時，不必先記住全部星曜，先掌握關鍵宮位更有效率。",
        "命盤由十二宮組成。以命宮為起點，依序是兄弟、夫妻、子女、財帛、疾厄、遷移、奴僕、官祿、田宅、福德、父母宮，各自負責人生的不同領域。在記住星曜名稱之前，先弄清楚這十二格分別處理什麼，之後的解讀會順暢許多。",
        "先看命宮與關係宮，再連接事業與財務軸線，更容易得到可執行的結論。",
        "看某一宮時不要把它單獨抽出來看，而要連同對面的對宮，以及三合相連的宮一起看。這稱為三方四正，可以理解為避免只憑一個位置就下過重結論的機制。",
        "生年天干會為四顆星帶來化祿、化權、化科、化忌，合稱四化。其中化忌與其斷定為凶，不如讀作力量與關注集中在該領域的信號，也就是需要反覆面對的課題，這樣在實際運用中更有幫助。",
        "紫微斗數以明代整理的《紫微斗數全書》流傳最廣，此後歷經多個流派，星曜排布規則與解釋標準出現分歧。同樣的出生年月日時，不同流派排出的命盤會略有差異，原因就在這裡。",
        "Code Destiny 採用先摘要後細節的結構，方便新手循序理解。",
        "不過命宮依出生時刻而定，若出生時間不確定，整體排布可能隨之浮動。請把結果當作整理自我的參考資料，而不是既定的預言。",
      ],
      en: [
        "For beginners, it is more practical to learn key palaces first rather than memorizing every star at once.",
        "A chart is built from twelve palaces. Starting at the self palace, they run through siblings, spouse, children, wealth, health, travel, friends, career, property, fortune, and parents, and each is read as covering a different area of life. Learning what those twelve slots cover comes before learning star names.",
        "Start with self and relationship palaces, then connect career and finance layers for practical interpretation.",
        "A single palace is not read in isolation. It is read together with the palace directly opposite it and the two that form a trine, a grouping usually called the three-and-four view. Think of it as a safeguard against drawing an outsized conclusion from one position alone.",
        "The heavenly stem of your birth year attaches four transformations to four stars, commonly rendered as wealth, power, status, and obstruction. The last one is more useful when read as a signal that attention and pressure concentrate in that area, that is, a recurring assignment, rather than as a verdict of misfortune.",
        "The most widely cited source is the Ming-era compendium of Zi Wei Dou Shu, and later lineages diverged on how stars are placed and weighted. That is why the same birth data can produce slightly different charts depending on the school being followed.",
        "Code Destiny uses summary-first explanations followed by deeper details for easier learning.",
        "One caveat: the self palace is fixed by birth time, so an uncertain hour can shift the whole arrangement. Treat the reading as material for reflection rather than a settled forecast.",
      ],
    },
    faqByLocale: {
      ko: [
        { question: "초보자는 무엇부터 봐야 하나요?", answer: "명궁, 관계궁, 직업궁 순서로 보면 핵심 흐름을 빠르게 파악할 수 있습니다." },
        { question: "사주와 함께 볼 수 있나요?", answer: "네. 사주로 기본 성향을 확인하고 자미두수로 관계·시기 구조를 보완하면 좋습니다." },
        { question: "출생 시간을 모르면 볼 수 없나요?", answer: "명궁이 시각으로 정해지므로 정확도는 떨어집니다. 다만 연·월 기준으로 읽히는 부분은 남으므로, 시간이 불확실하다는 전제를 두고 참고 범위를 좁혀 보시길 권합니다." },
        { question: "같은 생일인데 결과가 다르게 나오는 이유는 무엇인가요?", answer: "유파마다 별의 배치 규칙과 비중이 다르기 때문입니다. 어느 쪽이 맞다기보다 기준이 다른 것이므로, 한 체계 안에서 일관되게 읽는 편이 혼란이 적습니다." },
        { question: "화기가 있으면 나쁜 명반인가요?", answer: "그렇게 단정하지 않습니다. 그 영역에 힘과 관심이 몰린다는 신호로 읽고, 반복해서 마주치는 주제를 어떻게 다룰지 정리하는 쪽이 더 유용합니다." },
      ],
      ja: [
        { question: "最初にどの宮を見るべきですか？", answer: "命宮、関係宮、仕事宮の順で見ると全体像をつかみやすいです。" },
        { question: "四柱推命と併用できますか？", answer: "はい。四柱推命で基礎傾向、紫微斗数で時期・関係を補完できます。" },
        { question: "出生時間が分からないと見られませんか？", answer: "命宮が時刻で決まるため精度は落ちます。ただし年・月で読める部分は残るので、時間が不確かだという前提を置いて参考範囲を狭めて見ることをおすすめします。" },
        { question: "同じ誕生日なのに結果が違うのはなぜですか？", answer: "流派ごとに星の配置規則と比重が異なるためです。どちらが正しいというより基準が違うので、一つの体系の中で一貫して読む方が混乱が少なくなります。" },
        { question: "化忌があると悪い命盤ですか？", answer: "そうは断定しません。その領域に力と関心が集まる合図として読み、繰り返し向き合う主題をどう扱うかを整理する方が役立ちます。" },
      ],
      zh: [
        { question: "新手先看哪几个宫位？", answer: "建议先看命宫、关系宫、事业宫，再扩展到其他宫位。" },
        { question: "能和八字一起看吗？", answer: "可以，八字看底层结构，紫微斗数看宫位层面的节奏。" },
        { question: "不知道出生时间就不能看吗？", answer: "命宫依时刻而定，精度会下降。但以年、月为准仍可读到一部分，建议在承认时间不确定的前提下缩小参考范围。" },
        { question: "同样的生日为什么结果不同？", answer: "因为各流派的星曜排布规则与权重不同。与其说哪一方正确，不如说标准不同，在同一体系内保持一致地解读会更少混乱。" },
        { question: "有化忌就是不好的命盘吗？", answer: "并不这样断定。把它读作力量与关注集中在该领域的信号，梳理如何面对反复出现的主题，会更有帮助。" },
      ],
      "zh-TW": [
        { question: "新手先看哪幾個宮位？", answer: "建議先看命宮、關係宮、事業宮，再擴展到其他宮位。" },
        { question: "能和八字一起看嗎？", answer: "可以，八字看底層結構，紫微斗數看宮位層面的節奏。" },
        { question: "不知道出生時間就不能看嗎？", answer: "命宮依時刻而定，準確度會下降。但以年、月為準仍可讀到一部分，建議在承認時間不確定的前提下縮小參考範圍。" },
        { question: "同樣的生日為什麼結果不同？", answer: "因為各流派的星曜排布規則與權重不同。與其說哪一方正確，不如說標準不同，在同一體系內保持一致地解讀會更少混亂。" },
        { question: "有化忌就是不好的命盤嗎？", answer: "並不這樣斷定。把它讀作力量與關注集中在該領域的信號，梳理如何面對反覆出現的主題，會更有幫助。" },
      ],
      en: [
        { question: "Which palaces should beginners read first?", answer: "Start with self, relationship, and career palaces for a reliable overview." },
        { question: "Can I combine this with Bazi?", answer: "Yes. Bazi gives structure, while Zi Wei gives palace-based timing and interaction context." },
        { question: "Can I still read a chart without a known birth time?", answer: "Accuracy drops, because the self palace is fixed by the hour. Year and month layers still read, so it is better to narrow what you rely on and treat the hour as uncertain." },
        { question: "Why do two readings of the same birthday differ?", answer: "Lineages differ on placement rules and weighting. It is less a question of which is correct than of which standard is in use, so staying inside one system keeps the reading consistent." },
        { question: "Does an obstruction transformation mean a bad chart?", answer: "It is not read that way here. It marks where attention and pressure gather, and it is more useful to plan how you will handle that recurring theme." },
      ],
    },
  },
  {
    id: "insightSukuyoBasics",
    slugByLocale: {
      ko: "sukuyo-basics",
      ja: "sukuyo-basics-jp",
      zh: "sukuyo-basics-zh",
      "zh-TW": "sukuyo-basics-tw",
      en: "sukuyo-basics-en",
    },
    titleByLocale: {
      ko: "숙요점 관계 해석: 갈등 패턴 읽는 법",
      ja: "宿曜の関係解釈: 衝突パターンの読み方",
      zh: "宿曜关系解读：冲突模式怎么看",
      "zh-TW": "宿曜關係解讀：衝突模式怎麼看",
      en: "Sukuyo Relationship Reading: Conflict Pattern Basics",
    },
    descriptionByLocale: {
      ko: "숙요점을 통해 관계의 반복 갈등, 소통 리듬, 회복 타이밍을 함께 읽고 현실적인 대화 기준으로 정리하는 실전 가이드입니다.",
      ja: "宿曜を使って、人間関係で繰り返される衝突のパターンと回復に適したタイミングを読み解き、現実的な対話の指針へ整理する実践ガイドです。",
      zh: "通过宿曜识别人际关系中反复出现的冲突循环与修复窗口，帮助你把它整理成现实中可用的沟通节奏与相处参考。",
      "zh-TW": "透過宿曜識別人際關係中反覆出現的衝突循環與修復窗口，幫助你把它整理成現實中可用的溝通節奏與相處參考。",
      en: "A practical guide to identifying recurring conflict and recovery windows with Sukuyo.",
    },
    h1ByLocale: {
      ko: "숙요점 기본: 관계 충돌 패턴과 회복 타이밍",
      ja: "宿曜の基本: 関係衝突と回復タイミング",
      zh: "宿曜基础：关系冲突与修复节奏",
      "zh-TW": "宿曜基礎：關係衝突與修復節奏",
      en: "Sukuyo Basics: Conflict Cycles and Recovery Timing",
    },
    bodyByLocale: {
      ko: [
        "숙요점은 관계의 감정 온도와 소통 리듬을 구조적으로 볼 수 있는 해석 체계입니다.",
        "기준은 태어난 날 달이 머문 자리입니다. 하늘의 길을 스물일곱 구역으로 나누고 그중 어디에 달이 있었는지로 자신의 별자리, 곧 명수를 정합니다. 태양이 아니라 달을 본다는 점이 서양 별자리와 가장 크게 다른 지점입니다.",
        "두 사람의 명수가 스물일곱 자리 안에서 서로 몇 칸 떨어져 있는지를 세어 관계의 성격을 읽습니다. 가까운 자리인지 마주 보는 자리인지에 따라 편안함, 끌림, 긴장 같은 서로 다른 결이 나온다고 봅니다.",
        "갈등이 반복되는 시점과 완화되는 시점을 함께 기록하면 실생활 대응 전략을 세우기 쉬워집니다.",
        "특히 한쪽에서 본 거리와 상대가 본 거리가 다를 수 있다는 점이 중요합니다. 같은 관계인데 한 사람은 편하다고 느끼고 다른 사람은 부담을 느끼는 상황을 이 비대칭으로 설명하는 경우가 많습니다.",
        "숙요점의 뿌리는 당대에 한역된 문수사리보살급제선소설길흉시일선악수요경, 줄여서 숙요경으로 알려진 문헌입니다. 인도의 나크샤트라 체계가 불교 경전을 통해 동아시아로 전해지며 자리 잡은 흐름이라, 나크샤트라와 이름과 순서가 상당 부분 겹칩니다.",
        "점수 자체보다 상호작용 패턴을 관찰하는 것이 실전 활용에 더 도움이 됩니다.",
        "관계의 결과를 미리 정해 두는 도구가 아니라, 반복되는 장면을 알아차리고 대화 방식을 조정해 보는 참고 틀로 쓰시길 권합니다. 사람의 선택이 바뀌면 관계의 흐름도 달라집니다.",
      ],
      ja: [
        "宿曜は関係の感情温度と会話リズムを構造的に確認できる分析法です。",
        "基準になるのは生まれた日に月が位置していた場所です。天の道を二十七の区画に分け、そのどこに月があったかで自分の星、すなわち命宿を決めます。太陽ではなく月を見る点が西洋の星座と最も大きく異なります。",
        "二人の命宿が二十七の並びの中で何区画離れているかを数えて関係の性質を読みます。近い位置か向かい合う位置かによって、心地よさ、引き合い、緊張といった異なる質感が現れると考えます。",
        "衝突が起こりやすい時期と緩和しやすい時期を記録すると対処がしやすくなります。",
        "重要なのは、自分から見た距離と相手から見た距離が異なり得るという点です。同じ関係なのに一方は気楽に感じ、もう一方は負担を感じるという状況を、この非対称で説明する場合が多くあります。",
        "宿曜の源流は唐代に漢訳された文殊師利菩薩及諸仙所説吉凶時日善悪宿曜経、略して宿曜経として知られる文献です。インドのナクシャトラ体系が仏教経典を通じて東アジアに伝わり定着した流れであり、名称と並び順がナクシャトラとかなり重なります。",
        "点数より相互作用パターンに注目する方が実生活で役立ちます。",
        "関係の結末をあらかじめ決める道具ではなく、繰り返される場面に気づき会話の仕方を調整するための参考枠としてお使いください。人の選択が変われば関係の流れも変わります。",
      ],
      zh: [
        "宿曜可以结构化观察关系中的情绪温度与沟通节奏。",
        "判断的基准是出生当天月亮所在的位置。把天空的轨道分成二十七个区段，看月亮当时落在哪一段，据此确定本人的星宿，也就是命宿。看月亮而非太阳，是它与西洋星座最大的差别。",
        "数一数两人的命宿在二十七个位置中相隔几段，据此解读关系的性质。位置相邻还是彼此相对，会呈现出安适、吸引、紧张等不同的质地。",
        "同时记录冲突高发时段和缓和窗口，更容易制定实际沟通策略。",
        "值得注意的是，自己看到的距离与对方看到的距离可能并不相同。同一段关系里一方觉得轻松、另一方却感到负担，常常可以用这种不对称来说明。",
        "宿曜的源头是唐代汉译的文殊师利菩萨及诸仙所说吉凶时日善恶宿曜经，通称宿曜经。它是印度的纳沙特拉体系经由佛教经典传入东亚后定型的脉络，因此名称与次序与纳沙特拉有相当程度的重合。",
        "与其关注单一分数，不如关注互动模式本身。",
        "它不是预先判定关系结局的工具，而是帮助你察觉反复出现的场景、调整沟通方式的参考框架。人的选择改变，关系的走向也会随之改变。",
      ],
      "zh-TW": [
        "宿曜可以結構化觀察關係中的情緒溫度與溝通節奏。",
        "判斷的基準是出生當天月亮所在的位置。把天空的軌道分成二十七個區段，看月亮當時落在哪一段，據此確定本人的星宿，也就是命宿。看月亮而非太陽，是它與西洋星座最大的差別。",
        "數一數兩人的命宿在二十七個位置中相隔幾段，據此解讀關係的性質。位置相鄰還是彼此相對，會呈現出安適、吸引、緊張等不同的質地。",
        "同時記錄衝突高發時段和緩和窗口，更容易制定實際溝通策略。",
        "值得注意的是，自己看到的距離與對方看到的距離可能並不相同。同一段關係裡一方覺得輕鬆、另一方卻感到負擔，常常可以用這種不對稱來說明。",
        "宿曜的源頭是唐代漢譯的《文殊師利菩薩及諸仙所說吉凶時日善惡宿曜經》，通稱宿曜經。它是印度的納沙特拉體系經由佛教經典傳入東亞後定型的脈絡，因此名稱與次序與納沙特拉有相當程度的重合。",
        "與其關注單一分數，不如關注互動模式本身。",
        "它不是預先判定關係結局的工具，而是幫助你察覺反覆出現的場景、調整溝通方式的參考框架。人的選擇改變，關係的走向也會隨之改變。",
      ],
      en: [
        "Sukuyo helps you read emotional rhythm and communication patterns in relationships.",
        "The starting point is where the moon sat on the day you were born. The sky path is divided into twenty-seven segments, and whichever one held the moon becomes your mansion. Reading the moon rather than the sun is the sharpest difference from Western sun signs.",
        "Relationship character is read by counting how many segments apart two people's mansions fall across those twenty-seven positions. Adjacent placements and opposing placements are described as producing different textures, such as ease, attraction, or tension.",
        "Tracking both conflict-heavy windows and recovery windows makes practical planning easier.",
        "One detail matters more than it first appears: the distance measured from your side can differ from the distance measured from theirs. That asymmetry is often how the tradition explains a relationship where one person feels comfortable and the other feels strained.",
        "The lineage traces to a Tang-era Chinese translation of a Buddhist text on auspicious and inauspicious days and lunar mansions, commonly shortened to the Sukuyo Sutra. It carries the Indian nakshatra system into East Asia, which is why the names and ordering overlap substantially with nakshatra.",
        "Pattern awareness is usually more useful than a single compatibility score.",
        "Use it as a frame for noticing repeating scenes and adjusting how you talk, not as a device that settles how a relationship ends. When people change what they choose, the pattern changes with them.",
      ],
    },
    faqByLocale: {
      ko: [
        { question: "숙요점은 어떤 관계에 쓰나요?", answer: "연인뿐 아니라 친구, 가족, 동료 관계에도 활용할 수 있습니다." },
        { question: "결과를 어떻게 활용하나요?", answer: "갈등 고위험 시점과 대화 방식 개선 포인트를 미리 준비하는 데 활용하세요." },
        { question: "27수와 인도 나크샤트라는 어떤 관계인가요?", answer: "같은 뿌리에서 갈라진 체계입니다. 숙요점은 인도의 나크샤트라가 불교 경전을 통해 동아시아로 전해진 흐름이라 이름과 순서가 상당 부분 겹치지만, 이후 동아시아에서 관계 해석 중심으로 발전하며 강조점이 달라졌습니다." },
        { question: "상대와 제가 본 결과가 다른데 오류인가요?", answer: "오류가 아니라 이 체계의 특징입니다. 거리를 세는 방향이 서로 반대라 한쪽에서 편안한 자리가 상대에게는 다르게 읽힐 수 있습니다. 두 방향을 함께 보면 관계의 온도 차를 이해하는 데 도움이 됩니다." },
        { question: "궁합이 나쁘게 나오면 관계를 정리해야 하나요?", answer: "그렇게 쓰는 도구가 아닙니다. 어떤 장면에서 어긋나기 쉬운지를 미리 알아 두고 대화 방식을 조정하는 용도로 보시길 권합니다. 중요한 결정은 두 사람의 실제 대화와 선택으로 정하는 것이 맞습니다." },
      ],
      ja: [
        { question: "どんな関係に使えますか？", answer: "恋人だけでなく、友人・家族・職場関係にも使えます。" },
        { question: "どう活用すればよいですか？", answer: "衝突が起きやすい時期を把握し、会話設計を先に準備するのが有効です。" },
        { question: "二十七宿とインドのナクシャトラはどう関係しますか？", answer: "同じ源から分かれた体系です。宿曜はインドのナクシャトラが仏教経典を通じて東アジアに伝わった流れで、名称と並び順がかなり重なりますが、その後は東アジアで関係解釈を中心に発展し強調点が変わりました。" },
        { question: "相手と自分で結果が違うのは誤りですか？", answer: "誤りではなく、この体系の特徴です。距離を数える向きが互いに逆になるため、一方にとって心地よい位置が相手には違って読まれることがあります。両方向を併せて見ると温度差の理解に役立ちます。" },
        { question: "相性が悪いと出たら関係を整理すべきですか？", answer: "そのように使う道具ではありません。どんな場面ですれ違いやすいかを先に知り、会話の仕方を調整する用途としてご覧ください。大事な判断は二人の実際の対話と選択で決めるのが適切です。" },
      ],
      zh: [
        { question: "适用于哪些关系？", answer: "不仅适用于情侣，也适用于朋友、家人、同事关系。" },
        { question: "如何实际应用结果？", answer: "提前识别高风险沟通时段，并准备更稳妥的表达策略。" },
        { question: "二十七宿与印度的纳沙特拉有什么关系？", answer: "两者同源。宿曜是印度纳沙特拉经由佛教经典传入东亚的脉络，名称与次序相当重合，但此后在东亚以关系解读为中心发展，侧重点有所不同。" },
        { question: "我和对方看到的结果不一样，是出错了吗？", answer: "不是出错，而是这一体系的特点。计数方向彼此相反，因此一方觉得舒适的位置，对方读来可能不同。把两个方向合起来看，有助于理解彼此的温差。" },
        { question: "如果显示合不来，是不是该结束关系？", answer: "它不是这样使用的工具。建议把它当作提前了解在哪些场景容易错开、进而调整沟通方式的参考。重要决定应由两人实际的对话与选择来定。" },
      ],
      "zh-TW": [
        { question: "適用於哪些關係？", answer: "不僅適用於情侶，也適用於朋友、家人、同事關係。" },
        { question: "如何實際應用結果？", answer: "提前識別高風險溝通時段，並準備更穩妥的表達策略。" },
        { question: "二十七宿與印度的納沙特拉有什麼關係？", answer: "兩者同源。宿曜是印度納沙特拉經由佛教經典傳入東亞的脈絡，名稱與次序相當重合，但此後在東亞以關係解讀為中心發展，側重點有所不同。" },
        { question: "我和對方看到的結果不一樣，是出錯了嗎？", answer: "不是出錯，而是這一體系的特點。計數方向彼此相反，因此一方覺得舒適的位置，對方讀來可能不同。把兩個方向合起來看，有助於理解彼此的溫差。" },
        { question: "如果顯示合不來，是不是該結束關係？", answer: "它不是這樣使用的工具。建議把它當作提前了解在哪些場景容易錯開、進而調整溝通方式的參考。重要決定應由兩人實際的對話與選擇來定。" },
      ],
      en: [
        { question: "What relationships can it support?", answer: "It works for couples, friends, family, and team communication." },
        { question: "How should I use the output?", answer: "Use it to anticipate high-friction periods and prepare better communication choices." },
        { question: "How do the twenty-seven mansions relate to Indian nakshatra?", answer: "They share a root. Sukuyo carries the nakshatra system into East Asia through Buddhist texts, so names and ordering overlap substantially, though East Asian practice later centred on relationship reading and shifted its emphasis." },
        { question: "My result and my partner's result disagree. Is that an error?", answer: "It is a property of the system rather than an error. Distance is counted in opposite directions, so a placement that reads as easy from one side can read differently from the other. Looking at both directions helps explain a gap in how each person experiences the relationship." },
        { question: "If compatibility looks poor, should I end the relationship?", answer: "That is not what this is for. Use it to see which situations tend to go sideways and to adjust how you talk about them. Decisions that matter belong to the actual conversations and choices the two of you make." },
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
