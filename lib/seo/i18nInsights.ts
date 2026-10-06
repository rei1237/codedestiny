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
    "id": "insightSukuyoBasics",
    "slugByLocale": {
      "ko": "sukuyo-basics",
      "ja": "sukuyo-basics-jp",
      "zh": "sukuyo-basics-zh",
      "zh-TW": "sukuyo-basics-tw",
      "en": "sukuyo-basics-en"
    },
    "titleByLocale": {
      "ko": "숙요점 계산 결과가 다를 때: 본명숙·방향·시간 확인법",
      "en": "Why Sukuyo results differ: inputs, boundaries and direction",
      "ja": "宿曜の結果が違うとき：入力・境界・方向の確認",
      "zh": "宿曜结果不同怎么办：核对输入、边界与方向",
      "zh-TW": "宿曜結果不同怎麼辦：核對輸入、邊界與方向"
    },
    "descriptionByLocale": {
      "ko": "음력 날짜표와 달 황경 계산을 구분하고, 13도 20분 경계와 두 사람의 관계 방향을 예시로 확인합니다.",
      "en": "Compare a lunar-date table with the service’s Moon-longitude method, then check segment boundaries and relationship direction.",
      "ja": "旧暦の日付表と月の黄経による計算を区別し、13度20分の境界と関係を数える方向を具体例で確認します。",
      "zh": "区分农历日期表与月球黄经算法，用13度20分的分界和双向计数示例核对结果。",
      "zh-TW": "區分農曆日期表與月球黃經算法，用13度20分的分界和雙向計數範例核對結果。"
    },
    "h1ByLocale": {
      "ko": "숙요점 계산 결과가 다를 때: 본명숙·방향·시간 확인법",
      "en": "Why Sukuyo results differ: inputs, boundaries and direction",
      "ja": "宿曜の結果が違うとき：入力・境界・方向の確認",
      "zh": "宿曜结果不同怎么办：核对输入、边界与方向",
      "zh-TW": "宿曜結果不同怎麼辦：核對輸入、邊界與方向"
    },
    "bodyByLocale": {
      "ko": [
        "같은 생일을 넣었는데 다른 사이트와 본명숙이 다르다면, 먼저 계산 방식을 확인해야 합니다. 전통 음력 날짜표로 숙을 찾는 방식과 달의 실제 위치를 나누는 방식은 같은 절차가 아닙니다. 이 글은 Code Destiny에서 표시하는 값을 확인하는 순서입니다.",
        "현재 서비스는 입력한 순간의 지구 중심 라히리 항성 달 황경을 27등분합니다. 한 구간은 360도를 27로 나눈 13도 20분입니다. 황경이 13도 19분인 예와 13도 21분인 예는 경계 양쪽에 있으므로 구간 번호가 달라집니다. 이는 설명을 위한 가상 좌표이며 특정 사람의 출생 계산 결과가 아닙니다.",
        "계산을 비교할 때는 양력·음력 입력 구분, 출생 시각, 시간대가 같은지 적어 두세요. 출생 시간을 모르는 경우 임의로 넣은 시각을 사실처럼 취급하면 안 됩니다. 특히 달이 구간 경계 가까이에 있을 때는 시간의 불확실성이 본명숙 분류에 영향을 줄 수 있습니다.",
        "두 사람을 비교할 때는 본명숙 이름뿐 아니라 누구에서 누구를 향해 세는지도 확인합니다. 27칸의 원에서 A를 0번, B를 5번에 놓으면 A에서 B까지는 5칸, B에서 A까지는 22칸입니다. 이 산술 예시는 방향이 바뀌는 이유를 보여 줄 뿐, 두 사람의 감정이나 특정 관계군을 판정하지 않습니다.",
        "관계군의 이름과 실제 생활의 기록은 분리해 보세요. 예를 들어 답장이 늦어 불안했다면 본명숙으로 상대의 속마음을 정하지 말고, 답장을 기다린 시간·미리 합의한 연락 방식·상대가 직접 설명한 사정을 적습니다. 다음 대화에서는 “바쁠 때 언제쯤 답할 수 있는지만 알려줄 수 있을까?”처럼 확인 가능한 부탁을 해 볼 수 있습니다.",
        "계산으로 재현할 수 있는 것은 좌표와 분류입니다. 관계가 좋아질 확률, 연락이 올 날짜, 결혼이나 이별 여부는 이 분류만으로 검증되지 않습니다. 결과가 다를 때는 더 마음에 드는 해석을 고르기보다 입력과 계산 기준을 나란히 비교하세요."
      ],
      "en": [
        "If two sites assign different mansions to the same birthday, compare their methods before comparing their interpretations. A traditional lunar-date lookup and a division of the Moon’s longitude are different procedures. This guide explains the values used by Code Destiny.",
        "The service divides geocentric Lahiri sidereal Moon longitude at the entered moment into 27 segments. Each spans 360/27 degrees, or 13 degrees 20 minutes. Illustrative longitudes of 13 degrees 19 minutes and 13 degrees 21 minutes fall on opposite sides of the first boundary. These are invented coordinates for explaining the arithmetic, not a person’s calculated chart.",
        "Check the calendar input, birth time and time zone together. If the time is unknown, an assumed time is not a verified birth time. Close to a segment boundary, that uncertainty can change the mansion classification.",
        "Direction also matters when comparing two positions. On a 27-position circle, put A at 0 and B at 5: the forward distance from A to B is 5, while B to A is 22. This demonstrates directional counting; it does not establish either person’s feelings or assign a relationship type.",
        "Keep relationship labels separate from observations. If a late reply made you anxious, record how long you waited, what communication you had agreed on, and what the other person actually said. A useful next question might be: “When you are busy, could you let me know roughly when you can reply?” The mansion label cannot answer for them.",
        "Coordinates and classifications can be reproduced from the inputs. A probability of reconciliation, a date of contact, or a decision about marriage cannot be verified from that classification alone. When results differ, compare the inputs and method instead of choosing the most reassuring story."
      ],
      "ja": [
        "同じ誕生日でもサイトによって本命宿が違う場合、解釈より先に計算方法を比べます。旧暦の日付表から宿を探す方法と、月の黄経を区切る方法は別の手順です。ここではCode Destinyが表示する値の確認方法を説明します。",
        "現在のサービスは入力した瞬間の地心・ラヒリ方式の恒星黄経を27等分します。一つの区間は360度÷27、つまり13度20分です。説明用の座標13度19分と13度21分は境界の両側にあるため、区間番号が変わります。これは架空の座標例であり、特定の人の出生計算ではありません。",
        "比較するときは暦の入力区分、出生時刻、タイムゾーンをそろえてください。時刻不明の人に仮の時刻を入れても、確認済みの出生時刻にはなりません。月が区間の境界に近い場合、その不確かさで本命宿の分類が変わることがあります。",
        "二人を比べるときは数える方向も確認します。27個の位置を持つ円でAを0、Bを5に置くと、AからBへは5、BからAへは22進みます。これは方向の違いを示す算術例であり、相手の感情や特定の関係型を判定するものではありません。",
        "関係の名称と実際の出来事は分けて記録します。返信が遅くて不安だったなら、待った時間、連絡についての合意、相手が直接話した事情を書いてみます。「忙しいときは、いつごろ返事できそうかだけ教えてもらえる？」というように、確認できるお願いへ変えてください。",
        "入力から再現できるのは座標と分類です。復縁の確率、連絡が来る日、結婚や別れの判断は、この分類だけでは検証できません。結果が違うときは安心できる物語を選ぶより、入力と方法を並べて確認してください。"
      ],
      "zh": [
        "同一生日在不同网站得到不同本命宿时，先比较算法。查农历日期表与划分月球黄经不是同一过程。本文说明Code Destiny目前使用的数值与核对步骤。",
        "服务把输入时刻的地心拉希里恒星制月球黄经分成27段，每段为360度除以27，即13度20分。假设黄经分别为13度19分和13度21分，两者位于第一条分界的两侧，区段编号便会改变。这是假设坐标示例，不是某位用户的出生计算。",
        "比较时要统一公历或农历输入、出生时间与时区。时间不详时，代填的时刻不能当作已确认的出生时间。月球接近区段边界时，这种不确定性可能改变本命宿分类。",
        "两人的关系还涉及计数方向。在27个位置的圆环上，假设A在0、B在5，从A到B顺数5格，从B到A则是22格。这个例子只解释方向差异，不代表双方感情，也不据此判定某种关系类型。",
        "把关系标签与实际事件分开记录。例如因回复迟而不安，可以记下等待多久、双方约定的联系方式，以及对方亲口说明的情况。下一次可以问：“忙的时候，能否告诉我大概什么时候方便回复？”宿的名称不能代替对方回答。",
        "可以根据输入复现的是坐标和分类。复合概率、联系日期、结婚或分手的决定，不能仅靠这项分类验证。结果不同时，应并列核对输入与算法，而不是选择最令人安心的解释。"
      ],
      "zh-TW": [
        "同一生日在不同網站得到不同本命宿時，先比較算法。查農曆日期表與劃分月球黃經不是同一過程。本文說明Code Destiny目前使用的數值與核對步驟。",
        "服務把輸入時刻的地心拉希里恆星制月球黃經分成27段，每段為360度除以27，即13度20分。假設黃經分別為13度19分和13度21分，兩者位於第一條分界的兩側，區段編號便會改變。這是假設座標範例，不是某位使用者的出生計算。",
        "比較時要統一國曆或農曆輸入、出生時間與時區。時間不詳時，代填的時刻不能當作已確認的出生時間。月球接近區段邊界時，這種不確定性可能改變本命宿分類。",
        "兩人的關係還涉及計數方向。在27個位置的圓環上，假設A在0、B在5，從A到B順數5格，從B到A則是22格。這個例子只解釋方向差異，不代表雙方感情，也不據此判定某種關係類型。",
        "把關係標籤與實際事件分開記錄。例如因回覆遲而不安，可以記下等待多久、雙方約定的聯絡方式，以及對方親口說明的情況。下一次可以問：「忙的時候，能否告訴我大概什麼時候方便回覆？」宿的名稱不能代替對方回答。",
        "可以根據輸入重現的是座標和分類。復合機率、聯絡日期、結婚或分手的決定，不能僅靠這項分類驗證。結果不同時，應並列核對輸入與算法，而不是選擇最令人安心的解釋。"
      ]
    },
    "faqByLocale": {
      "ko": [
        {
          "question": "다른 사이트와 본명숙이 다르면 오류인가요?",
          "answer": "반드시 오류는 아닙니다. 음력 날짜표인지 달 황경 방식인지, 입력 시각과 시간대가 같은지 먼저 확인하세요. 기준이 같은데도 차이가 남으면 입력값과 결과 화면을 첨부해 문의할 수 있습니다."
        },
        {
          "question": "출생 시간을 모르면 어떻게 읽나요?",
          "answer": "시간 미상이라는 조건을 남겨 두세요. 임의 시각으로 나온 한 결과를 확정하지 말고, 경계에 가까운지와 시간에 따라 분류가 달라질 수 있는지를 확인합니다."
        },
        {
          "question": "관계 방향이 다르면 상대 마음도 다른가요?",
          "answer": "방향별 계산 표지는 상대의 감정을 측정하지 않습니다. 상대의 의사는 직접 대화하고 실제 행동을 통해 확인해야 합니다."
        }
      ],
      "en": [
        {
          "question": "Does a different result mean a calculation error?",
          "answer": "Not necessarily. Compare lunar-date lookup versus Moon longitude, then the entered time and time zone. If identical methods and inputs still disagree, contact support with those inputs and result screens."
        },
        {
          "question": "What if my birth time is unknown?",
          "answer": "Keep that uncertainty visible. Do not treat a result from an assumed hour as definitive, especially near a segment boundary."
        },
        {
          "question": "Does a reversed direction reveal different feelings?",
          "answer": "No. A directional label does not measure emotions. Ask the person and consider their actual behaviour."
        }
      ],
      "ja": [
        {
          "question": "他のサイトと違えば計算ミスですか？",
          "answer": "必ずしもそうではありません。旧暦の日付表か月の黄経かを確認し、時刻とタイムゾーンも比べてください。"
        },
        {
          "question": "出生時刻が分からない場合は？",
          "answer": "時刻不明という条件を残し、仮の時刻の結果を確定としないでください。特に区間の境界付近では注意が必要です。"
        },
        {
          "question": "方向が逆なら相手の気持ちも分かりますか？",
          "answer": "方向別の名称は感情を測りません。相手の意思は直接の会話と実際の行動で確認してください。"
        }
      ],
      "zh": [
        {
          "question": "与其他网站不同就是算错了吗？",
          "answer": "不一定。先区分日期表和月球黄经算法，再比较时间与时区。相同方法及输入仍不一致时，可提供输入和结果页面联系支持。"
        },
        {
          "question": "不知道出生时间怎么办？",
          "answer": "保留时间不详这一条件，不把代填时刻的结果当作定论，尤其要注意区段边界。"
        },
        {
          "question": "反向关系能看出对方心情吗？",
          "answer": "不能。方向标签不测量感情，应通过直接沟通与实际行为了解对方意愿。"
        }
      ],
      "zh-TW": [
        {
          "question": "與其他網站不同就是算錯了嗎？",
          "answer": "不一定。先區分日期表和月球黃經算法，再比較時間與時區。相同方法及輸入仍不一致時，可提供輸入與結果頁面聯絡支援。"
        },
        {
          "question": "不知道出生時間怎麼辦？",
          "answer": "保留時間不詳這項條件，不把代填時刻的結果當作定論，尤其要注意區段邊界。"
        },
        {
          "question": "反向關係能看出對方心情嗎？",
          "answer": "不能。方向標籤不測量感情，應透過直接溝通與實際行為了解對方意願。"
        }
      ]
    }
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
