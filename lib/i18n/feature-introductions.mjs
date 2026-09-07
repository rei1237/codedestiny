export const INTRO_LOCALES = ["ja", "en", "zh"];
export const INTRO_TOPICS = ["saju", "vedic", "astrology", "tarot", "fortune-tea-house", "destiny-compass", "psychotest", "sukuyo-compatibility-ai"];
export const INTRO_ACTIONS = { saju: "checkPrivacyAndCalculate", vedic: "navigateToVedic", astrology: "openAstroModal", tarot: "openTarotModal" };
// 신규 공개 안내는 레거시 홈 액션을 추측하지 않고, 검증된 기능 URL로만 연결한다.
export const INTRO_CTA_PATHS = {
  "fortune-tea-house": "/fortune-tea-house/",
  "destiny-compass": "/destiny-compass/",
  psychotest: "/psychotest/",
  "sukuyo-compatibility-ai": "/sukuyo-compatibility-ai/",
};
export function introductionRoutes(topic) {
  return { ko: `/${topic}/`, ja: `/ja/${topic}/`, en: `/en/${topic}/`, zh: `/zh/${topic}/`, "x-default": `/${topic}/` };
}
export const INTRO_UI = {
  ja: { home: "ホーム", start: "鑑定画面へ進む", updated: "最終更新日", faq: "よくある質問", accessTitle: "公開解説と個別鑑定のご利用範囲", access: "この紹介ページは、ログインや購入をせずに読める公開解説です。個別の鑑定に進む場合は、その画面で求められる入力と、無料・有料の範囲をご確認ください。利用券、月定石、単件購入の対象や条件は機能によって異なります。ここでは新しい無料枠や購入特典を設けていません。詳しい鑑定が提供されても、正確性や特定の成果が保証されるわけではありません。", caution: "占いは娯楽と自己理解のための参考情報です。医療、法律、税務、投資、心理療法や緊急時の判断を代替しません。重要な選択は適切な専門家へご相談ください。", question: "結果が自分に当てはまらないときは？", answer: "無理に出来事を解釈へ合わせる必要はありません。入力の前提を確認し、実際の状況と照らし合わせてください。参考になる部分だけを、小さな行動や対話の問いとして使うこともできます。", contact: "お問い合わせ", related: "ほかの占術を知る" },
  en: { home: "Home", start: "Continue to the reading tool", updated: "Last updated", faq: "Frequently asked questions", accessTitle: "Public guidance and personal readings", access: "This introduction is public and can be read without signing in or making a purchase. If you continue to an individual reading, check the inputs requested and the free or paid scope on that screen. Pass, Moonstone and single-purchase conditions differ between features. This page creates no new allowance, automatic credit or purchase benefit. A more detailed reading is not a guarantee of greater factual accuracy or a particular outcome. Review the terms before choosing a paid option, and contact support with the relevant page if a condition is unclear.", caution: "Fortune content is for entertainment and self-understanding. It does not replace medical, legal, tax, investment, psychotherapy or emergency advice. Important decisions require dependable information and appropriately qualified help.", question: "What if a result does not fit my experience?", answer: "You do not need to force events to fit an interpretation. Check the input assumptions and compare the explanation with your actual circumstances. You may use only the helpful parts as prompts for a small action or a conversation, or decide that the result is not useful to you.", contact: "Contact", related: "Explore another tradition" },
  zh: { home: "首页", start: "进入解读工具", updated: "最后更新", faq: "常见问题", accessTitle: "公开说明与个人解读的使用范围", access: "本介绍是无需登录或购买即可阅读的公开说明。进入个人测算时，请确认对应画面要求的输入，以及实际免费或付费范围。使用券、月光石与单次购买的适用条件因功能而异，本页不新增免费额度、自动赠送或购买权益。更详细的文字也不代表准确性或特定成果得到保证。购买前请阅读相关条款，条件不清楚时可以附上页面网址咨询。", caution: "运势内容仅用于娱乐、自我理解与信息参考，不替代医疗、法律、税务、投资、心理治疗或紧急判断。重要决定请依据可靠信息并咨询合适的专业人士。", question: "结果与自己的经历不符怎么办？", answer: "不必强行让现实符合解读。先检查输入前提，再与实际情况对照。可以只把有启发的部分用于小行动或沟通问题，也可以认为这次解读暂时不适合自己。", contact: "联系我们", related: "了解其他体系" },
};

const READING_CONTEXT = {
  ja: "この案内は、画面で何が扱われ、どこまで参考にできるかを説明するためのものです。結果は診断、医療・法律・投資の助言、あるいは他者の本心を確定する情報ではありません。入力の不確かさや実際の会話、生活条件を残したまま読み、印象に残った部分だけを小さな確認や行動に変えてください。望む答えを得るまで繰り返す必要はありません。気持ちが強く揺れるときは画面から離れ、信頼できる人や適切な専門家に相談することも大切です。",
  en: "This public guide explains what the screen considers and how its output can be used. It is not a diagnosis, medical, legal, financial or investment advice, and it cannot establish another person's private thoughts. Keep uncertainty in the input visible, compare the wording with real conversations and conditions, and turn only the useful part into a small check or action. There is no need to repeat a reading until it gives a preferred answer. If the process increases distress, step away from the screen and seek support from someone you trust or an appropriately qualified professional. A result is most useful when it makes your next conversation, boundary or practical decision clearer rather than replacing it.",
  zh: "这份公开说明用于解释页面会参考什么，以及结果适合怎样使用。它不是诊断，也不能替代医疗、法律、财务或投资建议，更不能确认他人的私人想法。请保留输入资料中的不确定性，把文字与真实对话和生活条件对照，只把确实有帮助的部分转成一个小检查或行动。不必为了得到喜欢的答案反复查看；如果过程让焦虑加重，可以先离开页面，向可信赖的人或合适的专业人士求助。结果真正有价值的地方，是帮助您把下一次沟通、边界或现实选择想得更清楚，而不是代替这些选择。",
};

const ADDITIONAL_FEATURE_INTRODUCTIONS = {
  "fortune-tea-house": {
    ja: { title: "運命の茶屋ガイド｜問いと気持ちを静かに整える相談", description: "タロット、四柱推命、相性、宿曜を入口に、今の悩みを整理する運命の茶屋の公開ガイドです。", heading: "運命の茶屋で、問いの温度を整える", sections: [["四つの茶碗が扱うこと", "茶屋ではタロット、四柱推命、四柱推命の相性、宿曜から入口を選びます。タロットは今の問いと感情、四柱推命は出生情報から読む傾向と時期、相性は二人の関係の運び方、宿曜は月の位置を基準にした距離感を考える手がかりです。どれも結論を代わりに決めるものではなく、同じ悩みを別の角度から言葉にするための枠組みです。"],["入力と質問の準備", "タロットでは質問を短く具体的にすると、結果を行動へつなげやすくなります。出生情報を使う入口では、日付・時刻・暦の区分を画面の案内に従って確認してください。分からない時刻を確定情報のように扱わず、何が不確かかを残して読むことが大切です。相手の情報も、本人の同意と正確さを尊重してください。"],["結果を会話へ戻す", "関係の結果は、相手の気持ちや未来を断定するためのものではありません。『どの場面で急ぎすぎるか』『何を確認せずに期待しているか』のような問いに置き換えると、実際の会話に役立ちます。印象に残った一文を選び、伝えること、休むこと、条件を確認することなど、今日できる一歩に絞りましょう。"],["参考にする範囲", READING_CONTEXT.ja]] },
    en: { title: "Fortune Tea House Guide | A gentle way to sort a question", description: "A public guide to the Fortune Tea House, where tarot, Saju, compatibility and Sukuyo provide different ways to reflect on a concern.", heading: "Use the Fortune Tea House to give a question some room", sections: [["Four ways into the conversation", "The Tea House lets you begin with tarot, Saju, Saju compatibility or Sukuyo. Tarot focuses on the present question and its emotional context. Saju uses birth information to discuss patterns and timing. Compatibility looks at how two charts may be discussed together, while Sukuyo uses lunar-mansion relationships to consider rhythm and distance. None of these tools makes a decision for you; each offers a different vocabulary for describing the same concern."],["Prepare the question and inputs", "A short, specific tarot question is easier to turn into action than a demand for certainty. For entries that use birth information, follow the date, time and calendar instructions on the screen. Do not treat an unknown time as confirmed. When a question involves another person, respect their privacy and consent; a tool is not a substitute for asking them directly."],["Bring the result back to real life", "A relationship reading cannot prove feelings or promise a future event. Translate a memorable phrase into a practical question: where do I rush, what have we not clarified, or what boundary needs to be stated? Choose one small action such as writing a message, pausing before a difficult conversation, or checking a real condition. The usefulness of the reading should remain visible in life, not only on the screen."],["Use it as reference", READING_CONTEXT.en]] },
    zh: { title: "命运茶馆使用指南｜用不同占术整理眼前的心事", description: "了解命运茶馆如何以塔罗、四柱、合盘与宿曜作为入口，帮助您把问题整理成可面对的选择。", heading: "在命运茶馆里，为问题留一点空间", sections: [["四只茶杯对应什么", "茶馆提供塔罗、四柱、四柱合盘和宿曜四种入口。塔罗围绕当下的问题和情绪；四柱从出生资料讨论倾向与时期；合盘帮助观察两人相处的方式；宿曜以月亮所在的二十七宿理解关系的节奏与距离。它们都不是替您做决定的工具，而是把同一件烦恼换一种角度说清楚。"],["先准备问题与资料", "塔罗问题越具体，越容易转化为行动。需要出生资料的入口，请按页面说明核对日期、时间和历法；不知道的时刻不应当作已确认的事实。涉及他人的问题时，也应尊重对方的隐私和同意。工具不能代替真实询问，更不能成为越过边界的理由。"],["把结果带回生活", "关系解读不能证明对方的想法，也不能保证未来会发生什么。可以把触动您的句子改成现实问题：我在哪个场景太着急？有什么期待没有说清？哪条边界需要表达？只选一个今天能做的小行动，例如写下想说的话、让自己暂停，或核对一个实际条件。"],["作为参考的范围", READING_CONTEXT.zh]] },
  },
  "destiny-compass": {
    ja: { title: "運命の羅針盤ガイド｜四柱推命と紫微斗数で今日の方向を考える", description: "四柱推命と紫微斗数を併せて、今の方向と小さな行動を整理する運命の羅針盤の公開ガイドです。", heading: "運命の羅針盤で、次の一歩を見直す", sections: [["二つの体系を混ぜずに読む", "羅針盤は四柱推命の命式と紫微斗数の命盤を並べて見ます。四柱推命は五行や十神から気質と時期の流れを考え、紫微斗数は十二宮と星の配置から仕事、関係、財のような領域の重みを読みます。片方の用語をもう片方の結論として使わず、それぞれが何を説明しているかを分けることが大切です。"],["必要な入力", "生年月日、出生時刻、性別、暦の区分などは画面の案内に従って入力します。出生時刻が曖昧なら、時柱や命宮に関する細かな説明も幅を持って読みます。入力を変えて都合のよい結果を探すより、確かな情報と推定を分ける方が、結果の使い方を誤りにくくなります。"],["方向を行動へ翻訳する", "画面の方向づけは、成功を約束する進路ではありません。仕事なら条件を一つ確認する、関係なら急いで結論を迫らず伝え方を整える、生活なら続ける習慣を一つ選ぶ、といった観察できる行動へ変えてください。解釈と現実の情報が食い違えば、現実の情報を優先し次の行動を調整します。"],["参考にする範囲", READING_CONTEXT.ja]] },
    en: { title: "Destiny Compass Guide | Reflect on direction through Saju and Zi Wei", description: "Learn how Destiny Compass places Saju and Zi Wei Dou Shu side by side to turn a broad concern into a practical next step.", heading: "Use Destiny Compass to reconsider the next step", sections: [["Keep two traditions distinct", "Destiny Compass places a Saju chart beside a Zi Wei Dou Shu chart. Saju uses the Five Elements and ten-god relationships to discuss tendencies and timing, while Zi Wei Dou Shu uses twelve palaces and star placements to consider areas such as work, relationships and resources. One system's vocabulary should not be used as proof for the other. Read what each framework is describing before combining the reflections."],["Enter what you know", "Follow the screen for birth date, time, gender and calendar information. When the time is uncertain, treat detailed claims about the hour pillar or self palace as correspondingly uncertain. Separating confirmed information from an estimate is more useful than changing inputs until a flattering interpretation appears. The output can only be as specific as the information and assumptions it starts with."],["Turn direction into an observable action", "A suggested direction is not a guaranteed route to success. Translate it into something that can be checked: clarify one work condition, slow down a relationship conversation, or retain one useful routine this week. When an interpretation conflicts with evidence from your life, contracts, health or another person's stated wishes, the real-world information takes priority. Revise the action rather than trying to force reality to fit the chart."],["Use it as reference", READING_CONTEXT.en]] },
    zh: { title: "命运罗盘指南｜结合四柱与紫微斗数整理今天的方向", description: "了解命运罗盘如何并列四柱命式与紫微斗数命盘，把模糊的困扰整理成可执行的一小步。", heading: "用命运罗盘重新查看下一步", sections: [["区分两个体系的作用", "命运罗盘把四柱命式与紫微斗数命盘放在一起阅读。四柱通过五行、十神讨论倾向和时期；紫微斗数通过十二宫与星曜位置观察工作、关系、财务等领域的重心。不要把其中一个体系的术语直接当成另一个体系的结论，先确认每个框架各自在解释什么。"],["填写自己真正知道的资料", "请按页面要求填写出生日期、时间、性别与历法。如果出生时间不确定，与时柱或命宫有关的细节也应保留不确定性。把已确认资料与推测分开，比反复修改输入来寻找更喜欢的结果更可靠。结果的细致程度应与资料本身的可靠程度相匹配。"],["把方向变成可观察的行动", "页面给出的方向不是成功保证。可以把它变成可核对的动作：确认一个工作条件、放慢一场关系对话，或保留一个本周有帮助的习惯。当解读与生活证据、合同、健康状况或他人明确表达冲突时，应以现实信息为先，并调整下一步。"],["作为参考的范围", READING_CONTEXT.zh]] },
  },
  psychotest: {
    ja: { title: "心理テスト一覧の読み方｜性格・恋愛・仕事の傾向を考える", description: "性格、恋愛、仕事などの軽い心理テストを、診断と混同せず自己理解のきっかけとして使うためのガイドです。", heading: "心理テストを、自己理解のきっかけにする", sections: [["この一覧にあるもの", "ここにある項目は、性格、恋愛、仕事、共感性、HSP、精神年齢などを題材にした軽い質問形式のテストです。臨床で使う心理検査ではなく、診断名や能力を確定するものでもありません。結果のラベルより、どの説明が自分の普段の反応に当てはまるかを落ち着いて読む用途に向いています。"],["答えるときの注意", "その日の気分、直前の出来事、質問の受け取り方で回答は変わります。迷う設問は、理想の自分ではなく最近の具体的な場面を思い出して選ぶと比較しやすくなります。一回の結果だけで性格や関係を固定せず、当てはまらない部分も含めて見てください。"],["結果を安全に使う", "気になる一文があれば、日記に書く、信頼できる人に聞く、職場での自分の反応を観察するなど、小さな振り返りに使えます。一方で、強い不安、落ち込み、睡眠や生活への影響がある場合は、テスト結果で判断せず専門家に相談してください。他人を決めつけたり、採用・治療の判断に使ったりするものではありません。"],["参考にする範囲", READING_CONTEXT.ja]] },
    en: { title: "Psychological Test Guide | Use personality prompts with care", description: "A guide to using the personality, relationship and work prompts in the psychological-test hub as reflection rather than diagnosis.", heading: "Use psychological tests as a prompt for self-understanding", sections: [["What the collection contains", "The collection groups light, question-based prompts about personality, relationships, work, empathy, HSP and mental age. They are not clinical psychological assessments, and they do not establish a diagnosis, ability level or fixed type. The most useful part is usually not the label but whether a sentence helps you notice a familiar response, preference or situation that deserves more careful thought."],["Answer from a real situation", "Mood, recent events and the way a question is understood can change an answer. When a choice feels difficult, think of a recent concrete scene rather than an ideal version of yourself. Do not turn a single result into a permanent explanation of your personality or relationship. Notice the parts that do not fit as well as the parts that feel familiar; both help establish how much weight the result deserves."],["Use the result safely", "A useful phrase can become a small reflection: write down a pattern, ask a trusted person what they observe, or notice how you react at work this week. It should not be used to label another person, decide employment, justify exclusion, or replace treatment. If distress, sleep, mood or daily functioning is affected, seek qualified support rather than relying on an online prompt. A test is a starting point for a question, not an authority over your life."],["Use it as reference", READING_CONTEXT.en]] },
    zh: { title: "心理测试使用指南｜把性格、恋爱与职场题目当作自我观察", description: "了解如何把心理测试中心的性格、关系和职场题目作为反思起点，而不是把结果当成诊断。", heading: "把心理测试当作认识自己的一个提示", sections: [["这里收录的内容", "这里整理的是围绕性格、恋爱、职场、共情、HSP 与心理年龄的轻量问答测试。它们不是临床心理测验，也不能确认诊断、能力或固定类型。比起记住标签，更值得关注的是：哪一句描述让您想到自己常见的反应、偏好或处境，并愿意多看一眼。"],["从真实场景作答", "当天的心情、刚经历的事件以及对题目的理解都会影响回答。犹豫时，不妨回想最近发生的一个具体场景，而不是选择理想中的自己。不要用一次结果给人格或关系下永久结论；那些不符合的部分同样能帮助判断这次结果该占多大分量。"],["安全地使用结果", "如果有一句话让您思考，可以写下一个重复模式、询问可信赖的人观察到什么，或留意自己这一周在工作中的反应。它不应用来给他人贴标签、决定录用、排斥别人或代替治疗。若焦虑、情绪、睡眠或日常生活已受影响，应寻求合适的专业支持，而不是依赖在线题目。"],["作为参考的范围", READING_CONTEXT.zh]] },
  },
  "sukuyo-compatibility-ai": {
    ja: { title: "宿曜相性ガイド｜二十七宿で関係の会話リズムを考える", description: "二人の生年月日から二十七宿の関係を読み、引力と摩擦を会話の工夫へつなげる宿曜相性の公開ガイドです。", heading: "宿曜相性で、二人のリズムを言葉にする", sections: [["二十七宿と関係の見方", "宿曜は生まれた日に月がいた二十七の宿を基準に、二人の位置関係を読みます。相性は優劣の点数ではなく、近づきやすさ、距離の取り方、同じ場面で生じやすい緊張を考えるための分類です。恋人だけでなく家族、友人、同僚にも使えますが、相手の意思や実際の関係を置き換えるものではありません。"],["必要な情報", "計算には二人の正確な生年月日が必要です。出生時刻を使わない入口でも、日付の取り違えや暦の違いは結果に影響します。入力前に本人へ確認できる情報か、何が推定かを分けてください。相手の個人情報は、本人の同意なく収集・共有しないことが前提です。"],["相性を会話の準備にする", "良い・悪いという一言で終わらせず、どんな状況で片方が急ぎ、もう片方が引くのかを観察しましょう。結果は『次の会話で何を確認するか』『衝突したときにどれくらい間を置くか』を考えるきっかけになります。別れや復縁、相手の本心を保証するものとして使わず、二人の明確な言葉と境界を優先してください。"],["参考にする範囲", READING_CONTEXT.ja]] },
    en: { title: "Sukuyo Compatibility Guide | Read relationship rhythm through 27 mansions", description: "A public guide to Sukuyo compatibility: use two birth dates and the twenty-seven lunar mansions to reflect on attraction, friction and communication.", heading: "Put a relationship rhythm into words with Sukuyo", sections: [["What the twenty-seven mansions describe", "Sukuyo uses the lunar mansion associated with each person's birth date to discuss a relationship between two positions in a set of twenty-seven. Compatibility is not a score that ranks a relationship. It is a way to consider patterns of closeness, distance and friction that may appear in particular scenes. It can be used for partners, family, friends or colleagues, but it never replaces the actual relationship or another person's choice."],["Information needed for a calculation", "The calculation needs accurate birth dates for both people. Even where a birth time is not requested, a mistaken date or calendar assumption can affect the result. Before entering information, distinguish what has been confirmed from what is estimated and consider whether you have a right to use it. Personal information about another person should be handled with their knowledge and consent."],["Prepare a better conversation", "Do not stop at a favorable or unfavorable label. Ask where one person tends to speed up while the other withdraws, what expectation has remained unstated, and how much space a difficult conversation needs. The result can help prepare a question or a pause; it cannot promise a reunion, prove feelings or decide whether a relationship should end. Put clear words, consent and real boundaries ahead of any category."],["Use it as reference", READING_CONTEXT.en]] },
    zh: { title: "宿曜合盘指南｜用二十七宿理解关系的沟通节奏", description: "了解宿曜合盘如何以两人的出生日期和二十七宿为线索，观察吸引、摩擦与沟通节奏。", heading: "用宿曜为两人的节奏找到语言", sections: [["二十七宿在看什么", "宿曜以两人出生当天月亮所在的二十七宿为基础，观察两个位置之间的关系。合盘不是给关系排名的分数，而是帮助理解亲近、距离和摩擦可能在哪些场景出现的分类。它可用于伴侣、家人、朋友或同事，但不能代替真实关系，更不能代替对方的选择。"],["计算需要的资料", "计算需要两人的准确出生日期。即使页面不要求出生时间，日期填错或历法假设不同也会影响结果。输入前请分清哪些资料已确认、哪些只是推测，并确认自己是否有权使用。涉及他人的个人资料，应以知情和同意为前提。"],["把合盘变成沟通准备", "不要停在好或不好的标签上。可以问：谁更容易着急，谁在压力下会退开？哪些期待从未说清？一次困难对话需要留出多大空间？结果可以帮助准备问题或暂停，却不能保证复合、证明心意或决定关系是否结束。明确的表达、同意和现实边界应当优先。"],["作为参考的范围", READING_CONTEXT.zh]] },
  },
};

export const FEATURE_INTRODUCTIONS = {
  saju: {
    ja: {
      title: "韓国式四柱推命の読み方｜五行と行動の傾向を知る",
      description: "生年月日と出生時刻から読む韓国式四柱推命。五行や十神の意味、命式の見方、AI鑑定との違いを知り、日々の選択に生かす方法を解説します。",
      heading: "四柱推命で、自分の選び方を見つめる",
      sections: [
        ["四つの柱は何を表すのか", "四柱推命は、生まれた年・月・日・時を干支で表した命式を読みます。日干は自分を捉える中心の一つで、月の季節やほかの干支との関係を通して、力を発揮しやすい場面を考えます。一つの文字だけで人柄を決めるものではありません。『どんな状況でこの傾向が出やすいか』と問いながら読むと、分類が自分への決めつけになるのを防げます。"],
        ["五行は多ければよいとは限りません", "木は始めて伸ばす力、火は表現や熱意、土は受け止めて形にする力、金は区別や仕上げ、水は考えを深めて流れを読む力として説明されます。例えば木の力が目立つと、着手は早くても、方向が定まらないと終わらせることが難しくなる場合があります。多さも少なさも単純な優劣ではなく、強みが負担に変わる条件を一緒に見ます。"],
        ["入力するときに確かめたいこと", "鑑定画面の生年月日、出生時刻、暦の区分などを確認して入力してください。時刻を知らない場合は、その画面の案内に従い、推定値を確定情報として扱わないことが大切です。命式の計算表示と、AIが説明する性格や時期の文章は役割が異なります。入力を変える前に、何が不確かで、どの部分の読み方に影響しそうかを整理しましょう。"],
        ["十神と時期の流れを日常へ", "十神は日干との関係から、表現、学び、仕事、役割などを読み解く言葉です。大運や年ごとの流れも、出来事の発生を保証する予定表ではありません。仕事運が気になるなら、続けたい習慣と負担を減らしたい習慣を分けてみる。恋愛運なら、相手を変える方法より自分の伝え方を考える。このように具体的な行動へ翻訳して読むことをおすすめします。"],
      ],
    },
    en: {
      title: "Korean Saju Explained | Four Pillars and Five Elements",
      description: "Understand Korean Saju through birth information, the Four Pillars and Five Elements. Learn to separate chart calculations from interpretations and choices.",
      heading: "Read your patterns through Korean Saju",
      sections: [
        ["What the four pillars represent", "Saju expresses the birth year, month, day and hour through stem-and-branch pairs. The day stem provides one reference point for reading relationships within the chart, while the season and other positions add context. One character is not a complete description of a person. Ask under what circumstances a tendency might appear, rather than treating a chart label as a fixed identity. This makes it easier to compare the reading with experiences you can actually recognize."],
        ["More of an element is not automatically better", "Wood can describe starting and developing, Fire expression and enthusiasm, Earth gathering and stabilizing, Metal distinguishing and completing, and Water reflection and responsiveness. These are interpretive themes, not measurements of ability. For example, a strong emphasis on beginning things may become difficulty finishing when direction is unclear. Read a potential strength together with the conditions under which it becomes a burden. Neither abundance nor absence is a simple ranking of personal worth."],
        ["Check the inputs first", "Follow the birth-date, time and calendar fields shown in the selected tool. If the birth time is unknown, use the guidance offered there and remember which details remain uncertain. A chart calculation and an AI explanation do different jobs: one displays a result within the selected system, while the other describes possible meanings in words. Before trying another input, identify what you genuinely know instead of changing details to seek a more flattering answer."],
        ["From ten-god relationships to practical choices", "The ten-god framework describes relationships to the day stem and is used to discuss expression, learning, responsibilities and other themes. Longer cycles and yearly interpretations are not calendars of guaranteed events. A career reading can prompt you to list habits worth retaining and burdens that could be reduced. A relationship reading can help you reconsider how you communicate rather than promise control over someone else. Choose an action whose effects you can observe, and revise it if the real situation suggests a different approach."],
      ],
    },
    zh: {
      title: "韩式四柱命理入门｜理解五行、十神与行为倾向",
      description: "从出生日期、时间与四柱命式认识韩式命理，理解五行与十神的解释方式，区分计算和AI文字，并把运势主题转化为现实中的小行动。",
      heading: "用四柱命理观察自己的选择习惯",
      sections: [
        ["四个柱位表达什么", "四柱命理把出生年、月、日、时表示为干支组合。日干是认识自身的一个参照点，出生季节和其他干支关系则提供更多背景。单独一个字不能概括完整的人格。阅读时可以问自己：这种倾向通常在哪些情况下出现？这样既能与实际经历比较，也能避免把一个命理分类变成对自己的固定定义。"],
        ["五行并不是越多越好", "木可用于说明开始与发展，火对应表达和热情，土帮助理解承接与稳定，金涉及区分和完成，水则关联深入思考与顺应变化。这些是解释行为的主题，不是能力高低的测量。例如，喜欢开始新事物的人，如果方向没有整理清楚，也可能难以收尾。多与少都不宜直接判断优劣，应同时观察优点在什么情况下会变成负担。"],
        ["先核对输入的前提", "请按工具页面要求填写出生日期、时间与历法。如果不知道出生时刻，应查看页面提供的说明，并保留相关不确定性。命式计算与AI解释承担不同任务：前者在所选体系中显示计算结果，后者用文字讨论可能的意义。在修改输入前，先分清哪些资料已经确认，哪些只是估计，不要为了获得更喜欢的答案而任意变动。"],
        ["把十神与时期解读带回日常", "十神根据日干与其他干支的关系，讨论表达、学习、职责等主题。大运和流年不是保证事件发生的日程表。工作解读可以帮助列出值得保留的习惯与需要减轻的负担；关系解读可以提醒调整沟通方式，却不能保证改变他人的选择。尝试选择一个能够观察效果的小行动，并在现实条件变化时重新调整，比寻找一个永久结论更有帮助。"],
      ],
    },
  },
  vedic: {
    ja: {
      title: "ヴェーダ占星術入門｜ラグナと月のナクシャトラを読む",
      description: "ヴェーダ占星術のラグナ、ラシ、ナクシャトラをやさしく解説。出生情報とチャートの関係、西洋占星術との違い、解釈の限界を確認できます。",
      heading: "ヴェーダ占星術で読み解く生まれた空",
      sections: [
        ["チャートを読む三つの入り口", "ラグナは上昇宮で、自分の立ち位置を読む入り口になります。ラシは星座の区分、ナクシャトラは月などの位置をさらに細かく捉える区分です。用語を並べるだけでなく、どの天体の何を説明しているのかを確認しましょう。月の説明と上昇宮の説明が異なっていても、直ちに矛盾や計算ミスとは限りません。それぞれが見ているテーマを分けて読みます。"],
        ["出生時刻と場所の意味", "占星術のチャートでは出生日時に加え、画面で求められる出生地や時差の情報が重要になります。入力欄の案内を確認し、地域や日付を思い込みで置き換えないでください。時刻に不確かさがあれば、上昇宮や時期の細かな説明にも余地を残して読みます。自分の太陽星座を知っていることと、出生チャートに必要な情報がそろっていることは同じではありません。"],
        ["西洋占星術との違い", "ヴェーダ占星術と西洋占星術は共通する天体を扱っていても、星座の基準や解釈の方法が異なります。別のサイトで知った星座と違う表示が出た場合も、まず採用している基準を確かめてください。宿曜占星術の関係分類も、そのままナクシャトラの解釈に置き換えるものではありません。異なる体系を一つの答えに無理にまとめないことが、理解への近道です。"],
        ["時期の解釈をどう使うか", "時期に関する説明は、選択を検討するための背景として読みます。仕事に向く流れとされても、契約条件や生活の見通しを確認する手順は省けません。人間関係なら、連絡の時期を当てるよりも、今伝えたいことと相手の状況を整理する方が役立つ場合があります。解釈が気になったら、実際の情報で確かめられる問いへ置き換えてみましょう。"],
      ],
    },
    en: {
      title: "Vedic Astrology Guide | Lagna, Rashi and Nakshatras",
      description: "Explore Vedic astrology through lagna, rashi and nakshatras. Learn why birth details matter and how to read a chart without confusing different traditions.",
      heading: "Understand the vocabulary of a Vedic birth chart",
      sections: [
        ["Three useful starting points", "Lagna refers to the ascendant and provides one starting point for interpreting a chart. Rashi refers to a zodiac sign, while nakshatras divide the celestial framework more finely and are often discussed in relation to the Moon. Rather than memorizing the words alone, check what placement each explanation describes. Different passages about the Moon and ascendant need not be contradictory: they may be addressing different themes within the same chart."],
        ["Why birth details matter", "A birth chart may require a date, time, location and time-zone information, according to the fields on the selected screen. Follow those instructions rather than silently replacing a place or time with a convenient assumption. If the time is uncertain, leave room for uncertainty in ascendant-related or detailed timing interpretations. Knowing a familiar Sun-sign label is not the same as having all the information requested for an individual birth chart."],
        ["Keep Vedic and Western frameworks distinct", "Vedic and Western astrology discuss many of the same celestial objects but may use different zodiac reference systems and interpretive methods. A sign that differs from one you have seen elsewhere is a reason to check the stated framework before assuming an error. Likewise, a Sukuyo relationship category should not simply be substituted for a nakshatra interpretation. Preserving these distinctions is more informative than forcing several traditions into a single apparently certain answer."],
        ["Use timing as context for reflection", "A period described as favorable for work does not remove the need to examine an offer, a contract or your practical responsibilities. In relationships, identifying what you want to communicate and considering the other person's circumstances may be more useful than trying to predict the exact date of a message. Translate a timing statement into questions you can check with real information. Keep the calculation, its interpretation and your eventual decision separate, so that changing circumstances can still guide your choices."],
      ],
    },
    zh: {
      title: "吠陀占星术入门｜认识上升宫、星座与纳克沙特拉",
      description: "解释吠陀占星术中的拉格纳、拉西与纳克沙特拉，了解出生信息的作用、西洋占星术与宿曜的区别，以及如何审慎使用时期解读。",
      heading: "读懂吠陀出生图的基本语言",
      sections: [
        ["三个理解入口", "拉格纳指上升宫，是理解个人位置的一个入口；拉西表示星座区分；纳克沙特拉则将天区进一步细分，常用于讨论月亮等天体的位置。与其只背下名称，不如确认每段文字具体在解释哪个位置。月亮与上升宫的描述不同，不一定就是矛盾或计算错误，可能是它们分别讨论了不同的生活主题。"],
        ["出生信息为何重要", "出生图可能需要日期、时刻、地点和时区信息，请按照所选工具显示的字段填写。不要未经确认就把出生地或时刻替换为一个方便的假设。时间不确定时，与上升宫或细致时期有关的解释也应保留余地。知道平时熟悉的太阳星座，不等于已经掌握个人出生图所需的全部信息，输入前仍需核对页面的具体要求。"],
        ["与西洋占星术分别理解", "吠陀与西洋占星术虽然讨论部分相同天体，但采用的黄道基准与解释方法可能不同。若页面显示的星座与其他地方看到的不一致，应先核对所用体系，而不是立刻认定某一方错误。宿曜的关系分类也不能直接替代纳克沙特拉的解释。保留这些区别，比强行把多个传统拼成一个确定答案更有助于理解。"],
        ["如何使用时期信息", "被描述为有利于工作的时期，并不会免去核对合同、收入与现实责任的必要步骤。关系问题中，整理自己想表达什么、了解对方目前的处境，可能比预测某天是否收到消息更有用。可以把时期陈述改写为能通过实际资料确认的问题，将计算结果、解释文字与最后的个人决定分开，让现实变化仍然能够影响您的选择。"],
      ],
    },
  },
  astrology: {
    ja: {
      title: "西洋占星術の出生図入門｜太陽・月・ハウスの読み方",
      description: "西洋占星術の出生図を、太陽・月・上昇宮とハウス、アスペクトから読み解く入門ガイド。入力情報、解釈の活用方法と注意点を紹介します。",
      heading: "西洋占星術で、いくつもの自分を知る",
      sections: [
        ["太陽星座だけではない出生図", "出生図は、生まれたときの天体の配置をもとに読む図です。太陽、月、上昇宮はそれぞれ異なる入り口となり、普段の星座占いより多くの要素を扱います。太陽の説明はしっくりこなくても、別の要素が自分の経験に近く感じられることもあります。どれか一つを本当の自分と決めるより、場面によって現れ方が違う可能性を考えてみてください。"],
        ["ハウスとアスペクトをやさしく", "ハウスは、天体のテーマを生活のどの領域で考えるかという区分です。アスペクトは天体同士の角度の関係を示します。調和的と呼ばれる配置でも努力が不要という意味ではなく、緊張を含む配置も悪い出来事の予告ではありません。自分の中で両立しにくい望みがあるなら、どちらかを否定せず、時間や役割を分けて扱う方法を考えることができます。"],
        ["出生日時と場所を確認する", "画面で求められる生年月日、時刻、出生地を確認してください。特に上昇宮やハウスは時刻と場所に関わるため、推定入力では細部を断定しないことが大切です。別の占星術サイトと表示が違うときは、時差や採用する設定を見直しましょう。ヴェーダ占星術との違いを、ただちに正解・不正解の比較にしないようにしてください。"],
        ["配置を行動の選択肢にする", "人との関わりを大切にする解釈があれば、断れずに疲れていないかも一緒に振り返ってみましょう。独立心の説明なら、自分で決める強みと、助けを求めにくい場面の両方を考えます。仕事や恋愛の方向を一つに限定するより、今の環境で試せる選択肢を増やすために読むと、出生図が自己理解の道具として使いやすくなります。"],
      ],
    },
    en: {
      title: "Western Astrology Guide | Planets, Houses and Aspects",
      description: "Read a Western birth chart beyond the Sun sign. Understand planets, houses and aspects, check birth details, and turn interpretations into useful questions.",
      heading: "Explore a Western birth chart beyond one sign",
      sections: [
        ["More than a Sun-sign description", "A birth chart represents celestial placements for a birth time and place. The Sun, Moon and ascendant provide different entry points, and the chart contains more information than a short general horoscope. One description may feel less familiar than another because each is interpreted through a different theme. Rather than choosing one passage as your only true identity, consider whether patterns appear differently across situations and relationships."],
        ["Houses and aspects in plain language", "Houses organize the areas of life through which a placement is interpreted. Aspects describe angular relationships between celestial bodies. A configuration described as harmonious does not mean effort is unnecessary, and one described as tense is not a prediction of harm. If an interpretation suggests competing needs, consider how time, roles or communication might make room for both. You do not have to reject one side of your experience because a chart presents a contrast."],
        ["Check date, time and place", "Confirm the birth information requested by the selected tool. Ascendant and house interpretations are particularly sensitive to time and location, so estimated inputs should not support highly certain details. If another astrology service displays a different chart, review time-zone handling and the stated settings before assuming that one is simply wrong. Differences between Western and Vedic frameworks also need to be understood within their respective methods."],
        ["Turn placements into options", "A passage about valuing connection might prompt you to ask whether you also have enough space to say no. A description of independence can be read alongside the situations in which asking for help is difficult. These questions preserve both the possible strength and its cost. Instead of allowing a placement to dictate one career or relationship outcome, use it to explore options that can be tested in your present circumstances. Your experience remains relevant even when it differs from a familiar astrological description."],
      ],
    },
    zh: {
      title: "西洋占星术出生图入门｜太阳、月亮、宫位与相位",
      description: "从太阳星座之外认识西洋占星术，理解月亮、上升宫、宫位与相位，核对出生日期和地点，并把象征解读转化为现实中的自我观察。",
      heading: "用西洋出生图认识不同情境中的自己",
      sections: [
        ["出生图不只有太阳星座", "出生图根据出生时间与地点呈现天体配置。太阳、月亮与上升宫提供不同的理解入口，比简短的一般星座运势包含更多要素。一段说明不熟悉、另一段更有共鸣，可能与各自讨论的主题不同有关。与其选出唯一一个真正的自己，不如观察这些倾向是否会在不同情境和关系中以不同方式表现。"],
        ["宫位与相位的通俗理解", "宫位用于整理天体主题可能体现在哪些生活领域，相位则说明天体之间的角度关系。被称为和谐的配置不代表不需要努力，被称为紧张的配置也不是坏事的预告。如果解释涉及相互竞争的需要，可以考虑如何通过时间安排、角色分配或沟通同时照顾它们。图中出现对比，并不要求您否定其中一种真实感受。"],
        ["确认时间与地点", "请核对工具要求的出生信息。上升宫和宫位与时间、地点关系较大，因此估计输入不宜支持过于确定的细节。如果其他占星服务显示不同出生图，可以先查看时区处理和采用的设置，再讨论差异。西洋与吠陀体系之间也需要依据各自方法理解，而不是仅凭一个星座名称不同就决定哪一个必然正确。"],
        ["让配置增加选择而不是限制选择", "重视关系的描述，可以提醒您思考自己是否也有说不的空间；独立性的描述，则可以与不容易求助的场景一起阅读。这样既保留可能的长处，也能看到它带来的成本。不要让一个配置直接指定职业或关系结局，可以把它转化为当前环境中能够尝试的选项。即使与常见占星描述不同，您的实际经验也仍然重要。"],
      ],
    },
  },
  tarot: {
    ja: {
      title: "タロット占いの読み方｜カードから気持ちと選択を整理",
      description: "恋愛や仕事の問いをタロットで整理するためのガイド。質問の作り方、カードの位置と象徴、相手の気持ちを断定しない読み方を紹介します。",
      heading: "タロットで、問いの奥にある気持ちを読む",
      sections: [
        ["カードの意味を並べるだけではありません", "タロットはカードの象徴を通して、いまの感情や状況、選択肢を考えます。同じカードでも、質問と置かれた位置によって読み方が変わります。未来の位置に出たから必ず起こるという意味ではありません。どの場面の、誰の選択について読んでいるのかを意識すると、一枚の印象だけで結論を急がずに済みます。"],
        ["質問を少し具体的にする", "『すべてうまくいくか』よりも、『今の関係で自分が丁寧に伝えたいことは何か』のように、自分が選べる範囲を含む問いにすると読みやすくなります。カードの選び方や必要な入力は各画面の案内に従ってください。出生情報を使う機能と、問いを中心に読む機能を同じ条件だと考えず、実際の入力欄を確認しましょう。"],
        ["恋愛・復縁・相手の気持ち", "関係が閉じきっていないと読めても、相手から連絡が来る保証ではありません。距離のあるカードが出ても、相手に愛情がないと断定することはできません。気になる解釈は、互いのペース、確認できていない期待、無理なく伝えられることへ置き換えて考えます。相手の意思を尊重することは、どのカードよりも優先されます。"],
        ["読み終えた後の小さな行動", "印象に残った言葉を一つ選び、今日できる行動へ変えてみましょう。仕事なら確認を先延ばしにしている条件を整理する、恋愛なら返事を急かさず自分の気持ちを短く書く、といった形です。望むカードが出るまで繰り返す必要はありません。不安が強くなったらいったん離れ、実際の対話や信頼できる人の支えを大切にしてください。"],
      ],
    },
    en: {
      title: "Tarot Reading Guide | Questions, Cards and Practical Choices",
      description: "Learn to read tarot through the question, card position and emotional context. Explore love and work themes without treating another person's feelings as fact.",
      heading: "Use tarot to explore the question beneath the question",
      sections: [
        ["More than a list of card meanings", "Tarot uses symbolic images to explore emotions, circumstances and possible choices. The same card may be interpreted differently depending on the question and its position in a spread. A future position does not guarantee an event. Notice which part of the situation a card is addressing and whose choices are involved. This helps prevent a strong first impression from becoming a premature conclusion about an entire relationship or career."],
        ["Make the question more specific", "A question such as what you need to communicate carefully in a relationship gives you more room to act than asking whether everything will work out. Follow the selected screen's instructions for choosing cards and entering information. Some features combine birth information with a reading, while others center on the question. Do not assume the same inputs are required everywhere. A clear question can improve how you use an interpretation without making its answer certain."],
        ["Love, reunion and another person's feelings", "A reading that suggests openness does not promise a message or reunion. A card suggesting distance cannot establish that someone has no affection. Translate an interpretation into questions about pace, expectations that have not been discussed and what you can communicate without pressure. Another person's consent and stated wishes take priority over any card. Symbolic language is not access to private thoughts, and it should not be used to justify ignoring a boundary."],
        ["Choose one small action afterward", "Select a phrase that made you think and turn it into something you can do today. For work, that might mean clarifying an unresolved condition instead of delaying a question. For a relationship, it might mean expressing your feelings briefly without demanding an immediate response. You do not need to repeat a draw until you obtain a preferred card. If checking makes you more anxious, step away and prioritize actual conversation or support from someone you trust. The usefulness of an action can be assessed in reality; the dramatic impact of a card cannot guarantee its outcome."],
      ],
    },
    zh: {
      title: "塔罗占卜阅读指南｜从问题、牌位与象征整理选择",
      description: "了解如何提出塔罗问题、结合牌位与情绪背景阅读卡牌，并在恋爱、复合和工作议题中保留不确定性，把解读转化为可选择的小行动。",
      heading: "用塔罗看见问题背后的感受",
      sections: [
        ["不只是罗列牌义", "塔罗通过牌面象征讨论情绪、处境和可能的选择。同一张牌会因问题和牌阵位置不同而有不同解释，出现在未来位置也不保证某件事发生。阅读时可以确认它在讨论情境中的哪个部分、涉及谁的选择。这样能够避免只凭一张牌的强烈印象，就对整段关系或工作发展过早下结论。"],
        ["把问题问得更具体", "与其问是否一切都会顺利，不如思考在当前关系中自己需要认真表达什么。包含可行动范围的问题，通常更容易转化为有用的反思。选牌与输入方式请按功能页面说明操作。有些功能结合出生信息，有些以提问为中心，不宜假定所有入口都要求相同资料。问题清楚有助于使用解读，却不意味着答案因此获得确定性。"],
        ["恋爱、复合与他人的心意", "解读显示关系仍有开放空间，不代表一定收到联系或复合；牌面表现距离，也不能证明对方完全没有感情。可以把它改写为关于相处速度、未沟通的期待、以及如何不施压地表达自己的问题。对方明确表达的意愿与边界，比任何卡牌都更重要。象征性语言不能读取私人思想，也不能成为忽略拒绝的理由。"],
        ["读完之后选择一个小行动", "挑出一句让您思考的话，转为今天能做的事情。工作方面可以确认一个迟迟未问清的条件，关系方面可以简短表达感受而不要求立即回复。无需抽到喜欢的牌才停止。如果反复查看让焦虑增加，请先离开解读，重视实际对话或可信赖的人的支持。一个行动是否有帮助，可以在现实中观察；一张牌带来的强烈感受并不能保证结果。"],
      ],
    },
  },
};

Object.assign(FEATURE_INTRODUCTIONS, ADDITIONAL_FEATURE_INTRODUCTIONS);

const ADDITIONAL_INTRO_DESCRIPTION_OVERRIDES = {
  "fortune-tea-house": {
    ja: "タロット、四柱推命、相性、宿曜を入口に、今の悩みを整理する運命の茶屋の公開ガイドです。各占術の役割と、現実の選択へつなげる見方を紹介します。",
    zh: "了解命运茶馆如何以塔罗、四柱、合盘与宿曜作为入口，帮助您把问题整理成可面对的选择，并说明各类解读如何回到现实中的沟通与行动。",
  },
  "destiny-compass": {
    ja: "四柱推命と紫微斗数を併せて、今の方向と小さな行動を整理する運命の羅針盤の公開ガイドです。二つの体系を分けて読み、現実の判断へつなげる方法を解説します。",
    zh: "了解命运罗盘如何并列四柱命式与紫微斗数命盘，把模糊的困扰整理成可执行的一小步，并说明如何区分两种体系的解释与现实判断。",
  },
  psychotest: {
    zh: "了解如何把心理测试中心的性格、关系和职场题目作为反思起点，而不是把结果当成诊断，并把提示转化为可以观察的日常选择。",
  },
  "sukuyo-compatibility-ai": {
    ja: "二人の生年月日から二十七宿の関係を読み、引力と摩擦を会話の工夫へつなげる宿曜相性の公開ガイドです。関係を決めつけず、互いの距離感を考える方法を案内します。",
    zh: "了解宿曜合盘如何以两人的出生日期和二十七宿为线索，观察吸引、摩擦与沟通节奏，并把解读转化为尊重彼此边界的对话参考。",
  },
};

for (const [topic, locales] of Object.entries(ADDITIONAL_INTRO_DESCRIPTION_OVERRIDES)) {
  for (const [locale, description] of Object.entries(locales)) {
    FEATURE_INTRODUCTIONS[topic][locale].description = description;
  }
}

const ADDITIONAL_INTRO_TITLE_OVERRIDES = {
  "destiny-compass": { en: "Destiny Compass | Saju and Zi Wei" },
  "sukuyo-compatibility-ai": { en: "Sukuyo Compatibility | 27 Mansions" },
};

for (const [topic, locales] of Object.entries(ADDITIONAL_INTRO_TITLE_OVERRIDES)) {
  for (const [locale, title] of Object.entries(locales)) {
    FEATURE_INTRODUCTIONS[topic][locale].title = title;
  }
}
