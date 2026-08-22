import type { Metadata } from "next";
import NumerologyTarotRouteClient from "./NumerologyTarotRouteClient";

const NUMEROLOGY_TAROT_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    "metadata.title": "무료 수비학 타로 | 생명수·오늘수로 보는 5카드 리딩",
    "metadata.description": "생년월일에서 생명수와 오늘수를 계산해 5장의 타로 흐름과 겹쳐 읽어 주는 무료 수비학 타로입니다. 관계, 일, 선택의 방향을 참고용으로 차분히 읽어 보세요.",
    "metadata.keyword.1": "수비학 타로",
    "metadata.keyword.2": "숫자 타로",
    "metadata.keyword.3": "타로 리딩",
    "metadata.keyword.4": "생명수",
    "metadata.keyword.5": "오늘수",
    "guide.what.title": "무엇을 살피나요",
    "guide.what.body": "생년월일에서 흐르는 생명수와 오늘수, 질문 문장에서 떠오르는 질문수를 함께 놓고 다섯 장의 카드가 어디로 기울어 있는지 읽습니다. 숫자는 반복되는 성향을, 카드는 지금 마음과 상황의 장면을 비춥니다.",
    "guide.when.title": "언제 참고하면 좋나요",
    "guide.when.body": "관계의 거리감, 일의 우선순위, 선택 앞의 망설임처럼 바로 결론을 내리기보다 마음의 방향을 차분히 정리하고 싶을 때 어울립니다. 확답을 받기보다 생각의 실마리를 찾는 흐름에 가깝습니다.",
    "guide.reason.title": "입력값이 필요한 이유",
    "guide.reason.body": "생년월일은 개인의 기본 리듬을 잡고, 이름과 질문은 해석의 초점을 좁힙니다. 질문이 구체적일수록 결과는 막연한 길흉보다 지금 확인해야 할 감정, 반복 패턴, 행동 단서에 더 가까워집니다.",
    "flow.1": "생년월일을 바탕으로 생명수와 오늘수를 계산합니다.",
    "flow.2": "질문 문장의 주제와 숫자 리듬을 함께 분류합니다.",
    "flow.3": "다섯 장의 카드가 현재 흐름, 핵심 감정, 선택의 그림자, 현실 행동, 다음 장면을 어떻게 비추는지 정리합니다.",
    "flow.4": "결과에서는 오늘 참고할 문장, 카드별 해석, 7일 실천 흐름, 조심할 표현을 함께 확인합니다.",
    "faq.free.question": "무료와 유료 범위는 어떻게 다른가요?",
    "faq.free.answer": "무료 범위에서는 기본 숫자 흐름과 간단한 성향을 먼저 살필 수 있습니다. 유료 리딩은 선택한 주제에 맞춰 카드별 해석, 숫자와 카드의 연결, 실천 순서가 더 촘촘하게 열립니다.",
    "faq.decision.question": "결과를 중요한 결정의 근거로 삼아도 되나요?",
    "faq.decision.answer": "아닙니다. 수비학 타로는 엔터테인먼트와 자기 성찰을 위한 참고 자료입니다. 의료, 법률, 투자, 결혼, 이혼, 소송, 진로처럼 큰 영향을 주는 결정은 현실 정보와 전문가 상담을 함께 확인해야 합니다.",
    "faq.card.question": "좋지 않은 카드가 나오면 운이 나쁜 건가요?",
    "faq.card.answer": "카드는 확정된 미래를 말하기보다 지금 주의할 태도와 반복되는 마음의 그림자를 비춥니다. 불안을 키우기보다 조정할 행동을 찾는 쪽으로 읽는 것이 좋습니다.",
    "related.tarotGuide": "타로 카드 리딩 입문",
    "related.sajuGuide": "사주 명리학 기본 가이드",
    "related.disclaimer": "운세 및 상담 면책 고지",
    "hero.eyebrow": "수비학 타로 가이드",
    "hero.title": "숫자와 카드가 함께 비추는 오늘의 흐름",
    "hero.body": "수비학 타로는 숫자가 지닌 반복의 결을 타로 카드의 상징과 겹쳐 읽습니다. 결과는 미래를 단정하지 않고, 지금 질문 앞에서 어떤 감정이 강해지는지, 어디에서 판단을 멈추고 다시 들어야 하는지 차분히 비춥니다.",
    "section.flow": "해석은 이렇게 이어집니다",
    "sample.title": "예시 리딩",
    "sample.body": "생명수 6과 오늘수 2가 함께 떠오르면 관계와 책임의 균형이 먼저 보입니다. 여기에 컵 계열 카드가 강하면 마음을 숨기기보다 부드럽게 확인하는 말이 어울리고, 검 계열 카드가 강하면 즉답보다 사실 확인과 거리 조절이 먼저 필요하다고 읽을 수 있습니다.",
    "related.aria": "수비학 타로 관련 링크",
  },
  en: {
    "metadata.title": "Numerology Tarot | Code Destiny",
    "metadata.description": "A five-card tarot reading guided by your life number, day number, and question number. Read it calmly as a reflection point for relationships, work, and choices.",
    "metadata.keyword.1": "numerology tarot",
    "metadata.keyword.2": "number tarot",
    "metadata.keyword.3": "tarot reading",
    "metadata.keyword.4": "life number",
    "metadata.keyword.5": "day number",
    "guide.what.title": "What does it read?",
    "guide.what.body": "It places your life number, today's number, and the number arising from your question beside five cards, then reads where the flow leans. Numbers reveal repeating tendencies, while cards mirror the present feeling and scene.",
    "guide.when.title": "When is it helpful?",
    "guide.when.body": "It suits moments when you want to arrange your heart before deciding, such as distance in a relationship, work priorities, or hesitation before a choice. It is closer to finding a thread of thought than receiving a final answer.",
    "guide.reason.title": "Why are inputs needed?",
    "guide.reason.body": "Your birth date gives the basic rhythm, while your name and question narrow the focus. The more specific the question, the closer the result comes to emotions, repeated patterns, and practical cues you can check now.",
    "flow.1": "It calculates your life number and today's number from your birth date.",
    "flow.2": "It classifies the theme of the question with the number rhythm.",
    "flow.3": "It arranges how five cards reflect the current flow, core feeling, shadow of choice, practical action, and next scene.",
    "flow.4": "The result includes a sentence for today, card-by-card insight, a seven-day practice flow, and expressions to handle gently.",
    "faq.free.question": "How are free and paid readings different?",
    "faq.free.answer": "The free range lets you first check the basic number flow and a simple tendency. Paid readings open denser card-by-card insight, number-card connections, and practical order for your chosen theme.",
    "faq.decision.question": "Can I use the result as the basis for an important decision?",
    "faq.decision.answer": "No. Numerology tarot is for entertainment and self-reflection. Decisions involving health, law, investment, marriage, divorce, lawsuits, or career should be checked with real information and qualified experts.",
    "faq.card.question": "Does an unfavorable card mean bad luck?",
    "faq.card.answer": "Cards point less to a fixed future than to attitudes and repeated shadows that need attention now. It is better to read them as a way to find an adjustable action rather than grow anxious.",
    "related.tarotGuide": "Tarot Card Reading Guide",
    "related.sajuGuide": "Basic Saju Guide",
    "related.disclaimer": "Fortune and Counseling Disclaimer",
    "hero.eyebrow": "Numerology Tarot Guide",
    "hero.title": "Today's flow reflected by numbers and cards",
    "hero.body": "Numerology tarot overlays the repeating texture of numbers with tarot symbolism. It does not declare the future; it calmly reflects which emotions grow stronger before your question and where judgment needs to pause and listen again.",
    "section.flow": "How the reading unfolds",
    "sample.title": "Sample Reading",
    "sample.body": "When life number 6 and today's number 2 appear together, the balance between relationship and responsibility comes forward. If Cups are strong, gentle confirmation fits better than hiding your heart. If Swords are strong, fact-checking and distance control may need to come before an immediate answer.",
    "related.aria": "Numerology tarot related links",
  },
  ja: {
    "metadata.title": "数秘タロット | Code Destiny",
    "metadata.description": "ライフナンバー、今日の数、質問の数をもとに五枚のカードの流れを読む数秘タロットです。関係、仕事、選択の方向を参考として静かに受け取ってください。",
    "metadata.keyword.1": "数秘タロット",
    "metadata.keyword.2": "数字タロット",
    "metadata.keyword.3": "タロットリーディング",
    "metadata.keyword.4": "ライフナンバー",
    "metadata.keyword.5": "今日の数",
    "guide.what.title": "何を見ますか",
    "guide.what.body": "生年月日から流れるライフナンバーと今日の数、質問文から立ち上がる数を並べ、五枚のカードがどこへ傾いているかを読みます。数字は繰り返す傾向を、カードは今の心と状況を映します。",
    "guide.when.title": "いつ参考になりますか",
    "guide.when.body": "関係の距離、仕事の優先順位、選択前の迷いなど、すぐ結論を出すより心の向きを整えたい時に向いています。確答ではなく、考えの糸口を見つける流れです。",
    "guide.reason.title": "入力が必要な理由",
    "guide.reason.body": "生年月日は基本リズムを定め、名前と質問は解釈の焦点を絞ります。質問が具体的なほど、結果は漠然とした吉凶より今確かめるべき感情、反復パターン、行動の手がかりに近づきます。",
    "flow.1": "生年月日をもとにライフナンバーと今日の数を計算します。",
    "flow.2": "質問文のテーマと数字のリズムを合わせて分類します。",
    "flow.3": "五枚のカードが現在の流れ、核となる感情、選択の影、現実行動、次の場面をどう映すかを整理します。",
    "flow.4": "結果では今日の参考文、カード別解釈、七日間の実践、注意したい表現を確認します。",
    "faq.free.question": "無料と有料の範囲はどう違いますか？",
    "faq.free.answer": "無料では基本の数字の流れと簡単な傾向を先に見られます。有料リーディングでは選んだテーマに合わせ、カード別解釈、数字とカードのつながり、実践順序がより細やかに開きます。",
    "faq.decision.question": "重要な決定の根拠にしてもよいですか？",
    "faq.decision.answer": "いいえ。数秘タロットはエンターテインメントと自己省察のための参考です。医療、法律、投資、結婚、離婚、訴訟、進路など大きな影響を持つ決定は、現実の情報と専門家の相談を必ず確認してください。",
    "faq.card.question": "よくないカードは運が悪いという意味ですか？",
    "faq.card.answer": "カードは確定した未来より、今注意したい態度や繰り返す心の影を映します。不安を大きくするより、調整できる行動を見つけるために読むのがよいでしょう。",
    "related.tarotGuide": "タロットカード入門",
    "related.sajuGuide": "四柱推命基本ガイド",
    "related.disclaimer": "占い・相談の免責事項",
    "hero.eyebrow": "数秘タロットガイド",
    "hero.title": "数字とカードが映す今日の流れ",
    "hero.body": "数秘タロットは数字が持つ反復の質をタロットの象徴と重ねて読みます。未来を断定せず、今の問いの前でどの感情が強まるのか、どこで判断を止めてもう一度聞くべきかを静かに映します。",
    "section.flow": "解釈の流れ",
    "sample.title": "例のリーディング",
    "sample.body": "ライフナンバー6と今日の数2が同時に出ると、関係と責任の均衡が先に見えます。カップが強ければ心を隠すより柔らかく確認する言葉が合い、ソードが強ければ即答より事実確認と距離の調整が先に必要だと読めます。",
    "related.aria": "数秘タロット関連リンク",
  },
  zh: {
    "metadata.title": "数字塔罗 | Code Destiny",
    "metadata.description": "依据生命数、今日数与问题数，阅读五张塔罗牌流向的数字塔罗。请把它作为关系、工作与选择方向的温柔参考。",
    "metadata.keyword.1": "数字塔罗",
    "metadata.keyword.2": "数秘塔罗",
    "metadata.keyword.3": "塔罗解读",
    "metadata.keyword.4": "生命数",
    "metadata.keyword.5": "今日数",
    "guide.what.title": "会看见什么",
    "guide.what.body": "它把生日里的生命数、今日数，以及问题文字里浮现的问题数放在一起，观察五张牌正向哪里倾斜。数字照见反复出现的倾向，牌面映出此刻的心与局面。",
    "guide.when.title": "什么时候适合参考",
    "guide.when.body": "当关系的距离、工作的优先级、选择前的犹豫让你不想立刻下结论，而想先整理心的方向时，它会比较合适。它更像寻找思绪线索，而不是索取确定答案。",
    "guide.reason.title": "为什么需要输入",
    "guide.reason.body": "出生日期会定下个人的基本节奏，姓名与问题会收窄解读焦点。问题越具体，结果越接近此刻应确认的情绪、重复模式与行动线索，而不是笼统的吉凶。",
    "flow.1": "根据出生日期计算生命数与今日数。",
    "flow.2": "将问题文字的主题与数字节奏一起分类。",
    "flow.3": "整理五张牌如何映照当前流向、核心情绪、选择阴影、现实行动与下一幕。",
    "flow.4": "结果中会一起确认今日参考语、逐牌解读、七日实践流向与需要谨慎的表达。",
    "faq.free.question": "免费与付费范围有什么不同？",
    "faq.free.answer": "免费范围可先查看基本数字流向与简单倾向。付费解读会依照选择的主题，打开更细致的逐牌解读、数字与牌面的连接、实践顺序。",
    "faq.decision.question": "可以把结果作为重要决定的依据吗？",
    "faq.decision.answer": "不可以。数字塔罗用于娱乐与自我觉察。医疗、法律、投资、婚姻、离婚、诉讼、职业等影响重大的决定，请务必结合现实信息与专业人士意见。",
    "faq.card.question": "出现不好的牌就是运气不好吗？",
    "faq.card.answer": "牌面并不是宣布固定未来，而是照见此刻需要注意的态度与反复出现的心理阴影。与其放大不安，不如把它读成寻找可调整行动的提示。",
    "related.tarotGuide": "塔罗牌解读入门",
    "related.sajuGuide": "四柱命理基础指南",
    "related.disclaimer": "占卜与咨询免责声明",
    "hero.eyebrow": "数字塔罗指南",
    "hero.title": "数字与牌面共同照见今日流向",
    "hero.body": "数字塔罗把数字的重复纹理与塔罗象征叠合阅读。它不宣判未来，而是安静照见你在问题面前哪种情绪变强、哪里需要暂停判断并重新倾听。",
    "section.flow": "解读如何展开",
    "sample.title": "示例解读",
    "sample.body": "当生命数6与今日数2同时出现时，关系与责任的平衡会先浮现。若圣杯牌较强，比起隐藏心意，温柔确认更合适；若宝剑牌较强，可能需要先核对事实并调整距离，而不是立刻作答。",
    "related.aria": "数字塔罗相关链接",
  },
} as const;

function numerologyTarotPageText(key: keyof typeof NUMEROLOGY_TAROT_PAGE_TEXT_TRANSLATIONS.ko) {
  return NUMEROLOGY_TAROT_PAGE_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

export const metadata: Metadata = {
  title: numerologyTarotPageText("metadata.title"),
  description: numerologyTarotPageText("metadata.description"),
  keywords: [
    numerologyTarotPageText("metadata.keyword.1"),
    numerologyTarotPageText("metadata.keyword.2"),
    numerologyTarotPageText("metadata.keyword.3"),
    numerologyTarotPageText("metadata.keyword.4"),
    numerologyTarotPageText("metadata.keyword.5"),
  ],
  alternates: {
    canonical: "/tarot/numerology",
  },
};

const guideCards = [
  {
    title: numerologyTarotPageText("guide.what.title"),
    body: numerologyTarotPageText("guide.what.body"),
  },
  {
    title: numerologyTarotPageText("guide.when.title"),
    body: numerologyTarotPageText("guide.when.body"),
  },
  {
    title: numerologyTarotPageText("guide.reason.title"),
    body: numerologyTarotPageText("guide.reason.body"),
  },
];

const readingFlow = [
  numerologyTarotPageText("flow.1"),
  numerologyTarotPageText("flow.2"),
  numerologyTarotPageText("flow.3"),
  numerologyTarotPageText("flow.4"),
];

const faqItems = [
  {
    question: numerologyTarotPageText("faq.free.question"),
    answer: numerologyTarotPageText("faq.free.answer"),
  },
  {
    question: numerologyTarotPageText("faq.decision.question"),
    answer: numerologyTarotPageText("faq.decision.answer"),
  },
  {
    question: numerologyTarotPageText("faq.card.question"),
    answer: numerologyTarotPageText("faq.card.answer"),
  },
];

const relatedLinks = [
  { href: "/tarot/guide/", label: numerologyTarotPageText("related.tarotGuide") },
  { href: "/saju/guide/", label: numerologyTarotPageText("related.sajuGuide") },
  { href: "/disclaimer/", label: numerologyTarotPageText("related.disclaimer") },
];

export default function NumerologyTarotPage() {
  return (
    <>
      <NumerologyTarotRouteClient />
      <section className="bg-[#060713] px-4 py-12 text-[#f7f1e1] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[#d8b66a]">{numerologyTarotPageText("hero.eyebrow")}</p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">
              {numerologyTarotPageText("hero.title")}
            </h2>
            <p className="mt-4 text-base leading-8 text-[#d8d0bd]">
              {numerologyTarotPageText("hero.body")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {guideCards.map((item) => (
              <article key={item.title} className="rounded-2xl border border-[#d8b66a]/25 bg-white/[0.04] p-5">
                <h3 className="font-serif text-xl font-bold text-[#fff4cf]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d0bd]">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <article className="rounded-2xl border border-[#d8b66a]/25 bg-white/[0.04] p-6">
              <h3 className="font-serif text-2xl font-bold text-[#fff4cf]">{numerologyTarotPageText("section.flow")}</h3>
              <ol className="mt-4 grid gap-3 text-sm leading-7 text-[#d8d0bd]">
                {readingFlow.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </article>

            <article className="rounded-2xl border border-[#d8b66a]/25 bg-[#120e2c] p-6">
              <h3 className="font-serif text-2xl font-bold text-[#fff4cf]">{numerologyTarotPageText("sample.title")}</h3>
              <p className="mt-4 text-sm leading-7 text-[#d8d0bd]">
                {numerologyTarotPageText("sample.body")}
              </p>
            </article>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {faqItems.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <h3 className="text-base font-bold text-[#fff4cf]">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#d8d0bd]">{item.answer}</p>
              </article>
            ))}
          </div>

          <nav className="flex flex-wrap gap-3" aria-label={numerologyTarotPageText("related.aria")}>
            {relatedLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-[#d8b66a]/30 px-4 py-2 text-sm font-semibold text-[#f4dca5] transition hover:border-[#d8b66a]/60 hover:bg-white/[0.06]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
