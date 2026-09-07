// Editorial copy only. Legal contracts and purchase conditions remain in lib/legal.
export const TRUST_LOCALES = ["ja", "en", "zh"];
export const TRUST_KEYS = ["about", "contact", "disclaimer", "faq"];
export const TRUST_UPDATED = "2026-09-08";
export function trustRoutes(key) {
  return { ko: `/${key}/`, ...Object.fromEntries(TRUST_LOCALES.map(locale => [locale, `/${locale}/${key}/`])), "x-default": `/${key}/` };
}
export const TRUST_UI = {
  ja: { home: "ホーム", updated: "最終更新日", contact: "お問い合わせ", related: "サービスとご利用案内", about: "CODE DESTINYについて", faq: "よくある質問", disclaimer: "免責事項", privacy: "プライバシーポリシー", terms: "利用規約", refund: "返金ポリシー" },
  en: { home: "Home", updated: "Last updated", contact: "Contact", related: "Service and support", about: "About CODE DESTINY", faq: "Frequently asked questions", disclaimer: "Disclaimer", privacy: "Privacy policy", terms: "Terms of service", refund: "Refund policy" },
  zh: { home: "首页", updated: "最后更新", contact: "联系我们", related: "服务与使用说明", about: "关于 CODE DESTINY", faq: "常见问题", disclaimer: "免责声明", privacy: "隐私政策", terms: "服务条款", refund: "退款政策" },
};
export const TRUST_COPY = {
  ja: {
    about: {
      title: "CODE DESTINYについて｜占いの考え方と制作方針",
      description: "CODE DESTINYの四柱推命・紫微斗数・宿曜占星術とAIによる鑑定の考え方、制作責任、結果の活用方法をご案内します。",
      intro: "CODE DESTINYは、韓国式の四柱推命をはじめ、異なる占術から自分自身を見つめ直すための占いサービスです。生年月日が示す象徴と、いま抱えている問いを整理し、次の一歩を考える時間をお届けします。",
      sections: [
        ["占術を混ぜず、それぞれの視点を大切に", "四柱推命は生まれた年・月・日・時を四つの柱として読み、五行の偏りや行動の傾向を考えます。紫微斗数は十二の宮と星の配置を通して、仕事や人間関係などの領域を見渡します。宿曜占星術は宿の関係から、親しみやすさや距離の取り方を考える体系です。同じ生年月日を使っても、計算の前提と解釈の言葉は同一ではありません。"],
        ["星とカードが照らすもの", "ヴェーダ占星術ではラグナ（上昇宮）やナクシャトラ（月の宿）などを扱い、西洋占星術では天体・ハウス・アスペクトを読みます。タロットはカードの象徴から、質問に含まれる感情や選択肢を整理します。複数の占術が似たテーマを示しても、出来事の実現や鑑定の正確さが証明されたという意味ではありません。"],
        ["計算とAIの役割", "生年月日や出生時刻など、各画面で求められる情報をもとに、対応する計算や解釈を行います。AIを用いる相談では、その結果と相談内容を読みやすい文章へ整理します。文章が自然でも誤りや矛盾が含まれる可能性があります。出生情報に不確かさがある場合は、それを踏まえた参考として読み、実際の経験と照らし合わせてください。"],
        ["制作と内容への責任", "公開されている韓国語の紹介では、代表者が10年にわたり命理学を学び、相談に携わってきたと説明しています。これは本人による経歴の説明であり、公的な資格や第三者認証を示すものではありません。四柱推命や暦の解説は執筆または最終確認の対象としています。編集チームという表記は運営者の制作・確認機能を指し、架空の専門家を意味しません。"],
        ["月明かりのように、選択に余白を", "運命の茶屋ではヨニが気持ちをほどく手紙のように、ネオの相談では現実的な行動を整理する視点から、問いに向き合います。世界観は心を落ち着けるための表現です。相手の本心を断定したり、不安をあおって購入を勧めたりする根拠にはしません。気になる一文を、明日試せる小さな行動へ置き換えてみてください。"],
        ["ご利用範囲と大切な限界", "公開の紹介や解説は、このページからそのままお読みいただけます。個別機能の無料範囲、有料の詳細鑑定、利用券・月定石・単件購入の条件は各画面でご確認ください。占いは娯楽・自己理解のための参考情報であり、医療、法律、税務、投資、心理療法や緊急時の判断を代替しません。内容の誤りや使いにくい箇所は、該当ページとともにお問い合わせください。"],
      ],
    },
    contact: {
      title: "お問い合わせ｜ご利用相談・内容の訂正 CODE DESTINY",
      description: "CODE DESTINYへのご利用相談、不具合や翻訳の報告、鑑定内容の訂正依頼はこちら。連絡に必要な情報と個人情報の注意点をご案内します。",
      intro: "操作で困ったこと、読みにくい翻訳、内容の誤りなどがあれば、下記の窓口へお知らせください。ご利用の状況を確認できる情報があると、問題の切り分けに役立ちます。",
      sections: [
        ["ご連絡いただきたい内容", "お問い合わせの件名に、機能名とご相談の要点をお書きください。本文にはページのURL、表示言語、発生した日時、端末とブラウザ、行った操作、画面に出たエラー文を添えていただけると確認しやすくなります。何度も同じ操作を繰り返す必要はありません。"],
        ["お支払い後に結果が表示されない場合", "購入履歴などでお支払いの状態をご確認のうえ、確認できる注文番号と日時、対象サービスをお知らせください。調査前に同じ購入を重ねることはお控えください。この案内は返金の可否や結果の提供時期を約束するものではありません。適用条件は利用規約と返金ポリシーをご確認ください。"],
        ["送らないでいただきたい情報", "パスワード、認証コード、カード番号全桁、セキュリティコード、本人確認書類はメールに記載しないでください。画像を添える場合は、関係のない個人情報を隠してください。相性相談の相手など、第三者の出生情報も不具合の説明に必要でなければ送信しないでください。"],
        ["翻訳・解説へのご指摘", "日本語として不自然な箇所や占術用語の誤りは、該当する文章とページURLをお知らせください。宿曜占星術とヴェーダ占星術など、体系ごとに異なる用語や計算の前提も確認対象です。ご指摘をいただいたこと自体が、変更時期や個別の鑑定結果を保証するものではありません。"],
        ["窓口の範囲", "この窓口はサービスの操作・掲載内容に関する連絡先です。医療、法律、投資の助言や心理療法、緊急対応を提供する窓口ではありません。差し迫った危険や体調の急変がある場合は、占いの結果や返信を待たず、地域の緊急窓口や適切な専門家へご相談ください。返信時間や対応言語について、ここで新しい保証は設けていません。"],
      ],
    },
    disclaimer: {
      title: "免責事項｜占い・AI相談をご利用になる前に CODE DESTINY",
      description: "CODE DESTINYの占いとAI相談は自己理解のための参考情報です。解釈の限界、専門家への相談、重要な判断における注意点をご確認ください。",
      intro: "CODE DESTINYの鑑定は、娯楽と自己理解のための参考情報です。未来を確定する予言ではなく、状況や気持ちを異なる角度から考える手がかりとしてお読みください。",
      sections: [
        ["解釈には限界があります", "四柱推命、紫微斗数、宿曜占星術、ヴェーダ占星術、西洋占星術、タロットは、それぞれの象徴体系を用います。解釈が現在の状況に重なることはあっても、事実の証明や将来の出来事の確約にはなりません。出生時刻や暦の選択、質問の表現によって読み方が変わる場合もあります。"],
        ["AIの文章を確定情報として扱わないでください", "AIが作成する相談文には、誤り、情報の不足、文脈の取り違えが含まれる可能性があります。整った文章や詳しい説明は、正確性の保証ではありません。違和感があるときは、現実の状況や確かな情報を優先してください。複数の結果が一致しても、それだけで正しいと判断しないことが大切です。"],
        ["専門的な判断の代わりにはなりません", "本サービスは医療、法律、税務、投資、心理療法、緊急時の判断を代替しません。体調、契約、資産、生活や安全に関わる重要な決定は、資格を持つ専門家や適切な相談機関へご相談ください。金運は収益を予測する投資助言ではなく、健康に関する表現は診断や治療方針ではありません。"],
        ["特定の成果を保証しません", "復縁、連絡、就職、合格、昇進、結婚、資産の増加など、特定の出来事や時期を保証しません。相手の気持ちを本人の確認なしに確定することもできません。恋愛や相性の解釈は、相手の意思を尊重し、自分の行動や境界線を見直すための問いとしてご利用ください。"],
        ["不安が強くなったとき", "同じ問いを繰り返して不安が増すときは、鑑定から少し離れ、信頼できる人に話すなど現実の支えを優先してください。緊急の危険がある場合は、サービスの返信や占いの結果を待たず、地域の緊急窓口へ連絡してください。購入や有料鑑定が問題の解決を約束するものではありません。"],
        ["関連する規約と連絡先", "個人情報の取り扱いはプライバシーポリシー、サービスの利用条件は利用規約、お支払いに関する返金条件は返金ポリシーでご確認ください。このページはそれらの条件を変更するものではありません。誤解を招く表現や内容の誤りについては、ページURLと該当箇所をお問い合わせ窓口へお知らせください。"],
      ],
    },
    faq: {
      title: "よくある質問｜AI占い・鑑定の使い方 CODE DESTINY",
      description: "四柱推命と紫微斗数の違い、宿曜の相性、AI鑑定の読み方、無料・有料の確認方法から個人情報やお問い合わせまで、よくある質問にお答えします。",
      intro: "初めての占いでも、ご自身のペースで選べるように。鑑定の仕組みと利用時の注意点をまとめました。個別の価格や利用条件は、実際のご利用画面と規約をご確認ください。",
      sections: [
        ["CODE DESTINYはどんなサービスですか？", "四柱推命、紫微斗数、宿曜占星術、ヴェーダ占星術、西洋占星術、タロットなどを扱う占い・相談サービスです。未来を決めつけるのではなく、自己理解や選択を整理するための参考情報をお届けします。各体系の違いを大切にしながら解説しています。"],
        ["無料で読めるものはありますか？", "公開されている紹介、解説、FAQはログインや購入をせずに読めます。個別の鑑定や相談で無料の範囲がどこまでかは、各機能の画面でご確認ください。このFAQは新しい無料枠や無制限利用を設定するものではありません。"],
        ["AI占いはどのように作られますか？", "各機能で入力する出生情報や質問、対応する計算結果をもとに、AIを用いる相談では解釈を文章に整理します。計算と文章生成は役割が異なり、AIの説明に誤りが含まれることもあります。結果は現実の状況と照らし合わせてお読みください。"],
        ["四柱推命と紫微斗数は何が違いますか？", "四柱推命は年・月・日・時の干支から五行や十神などを読み、紫微斗数は十二宮に配置される星を通して生活の領域を見ます。どちらが必ず正しいという比較ではなく、性格や関係を異なる枠組みから眺めるものです。"],
        ["宿曜占星術の相性は何を見ますか？", "宿と宿の関係をもとに、親しみやすさ、刺激の強さ、距離感などを考えます。同じ関係区分でも、二人の経験や対話の仕方は異なります。相性の名称だけで、関係を続けるかどうかを決めないでください。"],
        ["出生時刻がわからなくても使えますか？", "必要な情報は機能によって異なります。時刻が必要な画面では、不明時の選択肢や入力案内を確認してください。仮の時刻を入れる場合は、それが確定情報ではないことを意識し、時刻に依存する細かな解釈を断定しないでください。"],
        ["ヴェーダ占星術と西洋占星術は同じですか？", "同じ天体を扱っても、基準や解釈の方法が異なります。ヴェーダ占星術のラグナやナクシャトラと、西洋占星術のハウスやアスペクトを、説明なしに同じ意味で置き換えることはできません。各ページの前提を確認してお読みください。"],
        ["鑑定結果はいつも当たりますか？", "絶対的な正確さや特定の成果を保証するものではありません。気になる解釈は、自分が繰り返しやすい行動や、今日できる小さな選択を見直すきっかけにしてください。健康・法律・投資などの重要な判断では専門家の助言を優先してください。"],
        ["有料機能では何が追加されますか？", "詳細な鑑定や相談など、対象機能の画面に記載された内容をご利用いただくものです。利用券、月定石、単件購入の対象や条件は同一ではありません。お支払い前に、その画面で提供内容と条件を確認してください。有料であることは正確性の保証ではありません。"],
        ["個人情報はどう扱われますか？", "収集する情報、利用目的、保存期間、権利の行使方法はプライバシーポリシーに記載しています。問い合わせにパスワードやカード情報は送らないでください。他の人の出生情報を使う場合も、その人のプライバシーに配慮してください。"],
        ["返金を希望するときは？", "利用規約と返金ポリシーを確認し、問い合わせ窓口へ対象の注文番号や日時、状況をお知らせください。可否は適用される条件に基づいて確認されます。このFAQで一律の返金や対応期限を約束するものではありません。"],
        ["不具合や翻訳の誤りはどこへ連絡できますか？", "お問い合わせページに記載されたメール窓口をご利用ください。ページURL、表示言語、問題の箇所を添えると確認しやすくなります。決済済みで結果が表示されない場合は、重ねて購入する前に注文の状態を確認してください。"],
      ],
    },
  },
  en: {
    about: {
      title: "About CODE DESTINY | Our Readings and Editorial Approach",
      description: "Learn how CODE DESTINY approaches Saju, Zi Wei Dou Shu, astrology and tarot, how AI supports readings, and who takes responsibility for published content.",
      intro: "CODE DESTINY brings several traditions of fortune reading into a space for reflection. A reading offers a way to explore your habits, relationships and questions; it does not settle your future for you.",
      sections: [
        ["Different traditions, distinct foundations", "Korean Saju interprets the year, month, day and hour of birth through four pillars, five elements and their relationships. Zi Wei Dou Shu examines stars within twelve palaces associated with areas of life. Sukuyo considers lunar mansions and relationships between them. These systems can suggest different questions about the same person, but they do not share a single interchangeable calculation or vocabulary."],
        ["Astrology and tarot", "Vedic astrology uses concepts such as the lagna, or ascendant, and nakshatras, or lunar mansions. Western astrology interprets planets, houses and aspects within its own framework. Tarot uses card imagery to explore a question, emotional context and possible choices. Agreement between readings does not establish that an event will happen or that an interpretation has been independently verified."],
        ["Where AI fits", "Each feature asks for the information relevant to its calculation or reading. In AI-assisted consultations, available results and the question are organized into explanatory prose. Calculation and language generation serve different purposes. A fluent answer can still contain errors, omit context or interpret an uncertain birth time too confidently. Compare any useful observation with your lived experience and reliable information."],
        ["Editorial responsibility", "The Korean About page identifies the operator as the author or final reviewer of Saju and calendar explanations. It describes ten years of study and consultation in the operator's own account. That statement is not an independently certified qualification. The name CODE DESTINY editorial team refers to the operator's content production and review function, rather than an invented individual expert. Published errors can be reported through the contact page."],
        ["A world built around reflection", "Yeoni's fortune tea house uses a warm, letter-like voice to help readers put feelings into words. Neo takes a more direct approach, organizing a concern into practical choices. These characters provide a style of conversation, not access to another person's private thoughts. A helpful reading should leave room for consent, uncertainty and the choices available in everyday life."],
        ["Access and limits", "Public introductions and educational pages can be read without a purchase. Individual tools describe their own free access, detailed paid readings and applicable pass, Moonstone or single-purchase conditions. Check those screens before choosing an option. Fortune content is for entertainment and self-understanding; it is not medical, legal, tax, investment, psychotherapy or emergency advice. Important decisions call for an appropriately qualified professional, not a stronger prediction."],
      ],
    },
    contact: {
      title: "Contact CODE DESTINY | Support and Content Corrections",
      description: "Contact CODE DESTINY about service problems, translation errors or content corrections. Find what to include and how to avoid sharing sensitive information.",
      intro: "Use the email address below to report a problem with the service or its published content. A clear description helps distinguish a display issue, an input problem and a question about a reading.",
      sections: [
        ["Describe the problem", "Include the feature name, page URL, selected language, approximate time, device and browser, the action you took and any error message. Explain what you expected to see and what happened instead. You do not need to repeat a failed operation many times to make a useful report."],
        ["If a purchased result is missing", "Check the purchase status and include the order reference, date and affected service if available. Avoid making the same purchase again before the original status has been clarified. This contact guidance does not promise a refund or a delivery deadline. The terms of service and refund policy remain the source of the applicable conditions."],
        ["Keep sensitive information out of email", "Do not send passwords, verification codes, full payment-card numbers, security codes or identity documents. Remove unrelated personal details from screenshots. A technical report usually does not require another person's birth information or the full text of a private consultation. Send only what is necessary to explain the problem."],
        ["Report a translation or factual issue", "Quote the relevant wording and include its page URL and language. If terminology appears to confuse Saju with another tradition, explain which part is unclear. Reports help identify material that needs review, but do not establish a promised revision date or guarantee a different personal reading."],
        ["The scope of this contact channel", "This is a service and content support address, not a medical, legal, investment, psychotherapy or emergency service. If someone is in immediate danger, contact the appropriate local emergency service instead of waiting for a reading or a reply. No new response-time or language-support guarantee is created by this page."],
      ],
    },
    disclaimer: {
      title: "CODE DESTINY Disclaimer | Limits of Fortune and AI Advice",
      description: "Understand the limits of CODE DESTINY fortune readings and AI consultations, when professional advice is needed, and why specific outcomes are not guaranteed.",
      intro: "CODE DESTINY provides entertainment and reference information for self-understanding. Readings are interpretive material, not established facts about the future or instructions that override your judgment.",
      sections: [
        ["Interpretation has limits", "Saju, Zi Wei Dou Shu, Sukuyo, Vedic astrology, Western astrology and tarot use different symbolic frameworks. A description that feels familiar is not proof that a predicted event will occur. Birth time, calendar choices and the wording of a question may affect interpretation. Uncertain inputs should remain uncertain when you read the result."],
        ["AI text is not verified fact", "AI-assisted explanations may contain mistakes, missing context or contradictions. Detail and fluency do not guarantee accuracy. When an answer conflicts with your circumstances or dependable evidence, prioritize that evidence. Similar statements from several readings do not independently validate one another."],
        ["Professional advice comes first", "The service does not replace medical, legal, tax, investment, psychotherapy or emergency judgment. Consult an appropriately qualified professional about important decisions affecting health, contracts, assets, safety or livelihood. A money reading is not an investment recommendation, and health-related language is not a diagnosis or a treatment plan."],
        ["No promised outcome", "CODE DESTINY does not guarantee reunion, contact from another person, employment, examination success, promotion, marriage, investment returns or any event at a stated time. A reading cannot establish another person's private intentions without their confirmation. Relationship interpretations should support reflection while respecting consent and boundaries."],
        ["If readings increase anxiety", "Take a break if repeating a question makes you more worried. Seek support from a trusted person or an appropriate professional. In an emergency, do not wait for a consultation result or a support reply. Buying a reading does not guarantee resolution of a personal, financial or health problem."],
        ["Related documents", "The privacy policy explains personal-information handling. The terms of service and refund policy state the applicable service and purchase conditions. This disclaimer does not rewrite those conditions. Report a misleading phrase or content error with the page URL and relevant passage through the contact channel below."],
      ],
    },
    faq: {
      title: "CODE DESTINY FAQ | AI Readings, Access and Service Help",
      description: "Find answers about Saju, Zi Wei Dou Shu, Sukuyo compatibility and AI readings, plus guidance on access, personal information, refunds and contacting support.",
      intro: "Start with the questions that matter to you. These answers explain the service without replacing the conditions shown by each feature or the published legal documents.",
      sections: [
        ["What is CODE DESTINY?", "It is a fortune-reading and consultation service covering Saju, Zi Wei Dou Shu, Sukuyo, Vedic and Western astrology, and tarot. Readings are reference material for entertainment, reflection and exploring choices. The different traditions retain their own assumptions and terminology."],
        ["Can I read anything without paying?", "Public introductions, educational explanations and this FAQ are readable without signing in or purchasing. Each individual feature states its own access conditions. This answer does not add a free allowance, unlimited access or an automatic benefit to any existing product."],
        ["How are AI readings created?", "AI-assisted consultations organize relevant inputs, available calculations and your question into prose. Calculation and text generation are distinct steps, and an explanation can contain mistakes. Compare the result with real circumstances instead of treating fluent language as proof."],
        ["How do Saju and Zi Wei Dou Shu differ?", "Saju reads relationships among birth-year, month, day and hour pillars, including five elements and ten-god relationships. Zi Wei Dou Shu works with stars placed in twelve palaces. They offer different interpretive perspectives rather than a contest with one guaranteed winner."],
        ["What does Sukuyo compatibility consider?", "It considers relationships between lunar mansions as a way to reflect on closeness, stimulation and personal distance. A relationship category does not account for every experience or conversation between two people. Do not let its label make a relationship decision for you."],
        ["What if I do not know my birth time?", "Input requirements differ by tool. Check the relevant screen for an unknown-time option or guidance. If you use an estimated time, remember that time-dependent details remain uncertain. Do not turn a guess into a precise claim about your life."],
        ["Are Vedic and Western astrology the same?", "No. They share some celestial objects but use different reference systems and interpretive methods. Vedic concepts such as lagna and nakshatra should not be substituted for Western terms without explaining the distinction. Read the framework stated on the relevant page."],
        ["Are the results always accurate?", "No absolute accuracy or particular outcome is guaranteed. A useful passage can become a question about a recurring habit or a small action you can try. For medical, legal, financial or safety decisions, seek qualified advice and dependable information."],
        ["What do paid features add?", "They provide the detailed reading or consultation described on the selected feature screen. Pass, Moonstone and single-purchase conditions may differ. Review the displayed scope and conditions before payment. A paid result is not a promise of greater factual certainty or a particular life outcome."],
        ["How is personal information handled?", "The privacy policy explains collected information, purposes, retention and relevant rights. Do not send passwords or payment-card details in support messages. Respect other people's privacy when considering whether to enter their birth information."],
        ["How can I ask about a refund?", "Read the terms and refund policy, then contact support with the order reference, date and circumstances. Eligibility is assessed under the applicable conditions. This FAQ does not promise a refund in every case or create a new response deadline."],
        ["Where should I report an error?", "Use the email listed on the contact page and include the URL, language and relevant passage or error message. If payment has completed but a result is missing, check the order status before repeating the purchase. Avoid including unrelated private information."],
      ],
    },
  },
  zh: {
    about: {
      title: "关于 CODE DESTINY｜命理解读、AI咨询与内容制作原则",
      description: "了解 CODE DESTINY 如何分别运用四柱命理、紫微斗数、宿曜占星术、占星与塔罗，并说明AI的作用、内容责任及解读的使用边界。",
      intro: "CODE DESTINY 是一个帮助用户认识自己、梳理问题的运势与咨询服务。我们将不同传统体系的象征语言整理为易读的说明，让出生信息与眼前的困惑成为思考的起点，而不是替您决定未来。",
      sections: [
        ["尊重不同体系的前提", "韩式四柱命理以出生年、月、日、时组成四柱，通过五行、十神等关系理解性格与行为倾向。紫微斗数从十二宫和星曜配置观察生活领域；宿曜占星术则借助宿与宿的关系思考人与人的距离。这些体系有各自的计算和解释方法，不能把不同名称当成完全相同的概念。"],
        ["占星与塔罗各自的视角", "吠陀占星术使用拉格纳，也就是上升宫，以及纳克沙特拉，也就是月宿等概念；西洋占星术则在自身框架内解释行星、宫位与相位。塔罗通过牌面象征整理问题中的情绪和选择。多个体系出现相似主题，并不代表某件事已经获得事实验证或必然发生。"],
        ["计算与AI分别做什么", "各功能会要求与其计算或解读有关的输入。使用AI的咨询将可用的计算结果与提问整理成说明文字。计算和语言生成承担不同任务，流畅的文字仍可能存在错误、遗漏或对语境的误解。出生时间不确定时，应保留这种不确定性，不要把细节解读当作确定事实。"],
        ["谁对内容负责", "现有韩文介绍说明，运营者从事命理学习与咨询已有十年，并执笔或最终审核四柱及历法说明。这是本人对经历的陈述，不代表经第三方认证的专业资格。“CODE DESTINY 编辑团队”表示运营者的内容制作与审核职能，不是为虚构人物添加专家身份。发现内容错误时，可以通过联系页面反馈。"],
        ["让世界观服务于理解", "命运茶屋中的妍儿以温暖、像书信一样的语气陪伴用户整理感受；尼奥则更直接地帮助梳理可执行的选择。这些角色是表达方式，并不具备读取他人真实内心的能力。解读应给沟通、同意与现实条件留下空间，而不是借助不安推动购买。"],
        ["如何使用这些内容", "公开介绍和解说可以直接阅读。个别功能的免费范围、付费详细内容以及使用券、月光石、单次购买条件，请以对应页面和现有政策为准。运势内容仅供娱乐、自我理解与参考，不能替代医疗、法律、税务、投资、心理治疗或紧急判断。重大决定应结合可靠信息并咨询相关专业人士。"],
      ],
    },
    contact: {
      title: "联系 CODE DESTINY｜使用咨询、故障反馈与内容更正",
      description: "通过 CODE DESTINY 的联系渠道反馈使用问题、翻译错误或内容疑问。了解应提供的信息，以及避免发送密码和支付资料等敏感信息的方法。",
      intro: "如果您遇到操作问题、翻译不自然或内容错误，可以通过下方邮箱反馈。清楚描述页面和操作过程，有助于区分显示问题、输入问题与解读内容的疑问。",
      sections: [
        ["建议提供哪些信息", "请在主题中写明功能名称和主要问题，在正文中提供页面网址、显示语言、发生时间、设备和浏览器、已执行的操作以及错误提示。可以说明原本期待看到什么、实际显示了什么。无需为了证明问题而反复执行同一操作。"],
        ["支付后没有显示结果", "请先查看购买状态，如有订单编号、支付时间和目标服务，请一并告知。原订单状态未确认前，避免重复购买。这段说明不承诺退款资格或结果提供期限；具体条件仍以服务条款和退款政策为准。"],
        ["不要通过邮件发送敏感信息", "请勿发送密码、验证码、完整银行卡号、安全码或身份证件。附图时请遮盖与问题无关的个人资料。技术问题通常不需要第三方的出生信息或完整私人咨询内容，只提供说明问题所必需的信息即可。"],
        ["反馈翻译与知识性问题", "请附上相关原句、页面网址和语言。若发现四柱、宿曜或吠陀占星术的术语混用，也可以说明哪些概念不清楚。反馈有助于确定需要审核的内容，但不构成对更改时间或个人解读结果变化的承诺。"],
        ["发送前的最后检查", "请确认邮件地址、页面链接和订单编号是否填写正确，并再次检查附件中有没有无关的个人资料。仅凭一句无法使用通常难以判断问题发生在哪个步骤，可以描述从哪个页面进入、点击了什么以及何时停止。如果问题已经自行恢复，也可以说明恢复前后有哪些不同，帮助后续核对。"],
        ["联系渠道的用途", "此邮箱用于服务操作与已发布内容的咨询，不提供医疗、法律、投资建议、心理治疗或紧急救助。如果存在迫切危险，请联系当地紧急服务或合适的专业机构，不要等待运势结果或邮件回复。本页不新增回复时限或语言支持保证。"],
      ],
    },
    disclaimer: {
      title: "CODE DESTINY 免责声明｜运势与AI咨询的使用边界",
      description: "了解 CODE DESTINY 运势和AI咨询的参考性质、解读局限及专业咨询边界。重要的健康、法律、投资与安全决定不应仅依据运势结果。",
      intro: "CODE DESTINY 的运势与咨询内容用于娱乐、自我理解和信息参考。它们不是关于未来的确定事实，也不能代替您对现实情况的判断。",
      sections: [
        ["象征解读存在局限", "四柱命理、紫微斗数、宿曜占星术、吠陀占星术、西洋占星术与塔罗采用不同的象征框架。文字与个人经历相似，并不能证明预测会发生。出生时刻、历法选择和问题表述可能影响解读；输入存在不确定性时，阅读结果也应保留相应的余地。"],
        ["AI文字不等于核实后的事实", "AI辅助咨询可能包含错误、信息缺失或前后矛盾。语言自然、解释详细都不是准确性的保证。当结果与现实条件或可靠证据冲突时，应优先考虑现实信息。多个解读表达相似观点，也不意味着它们相互完成了独立验证。"],
        ["不能替代专业判断", "本服务不能替代医疗、法律、税务、投资、心理治疗或紧急情形下的判断。涉及健康、合同、资产、安全与生计的重要决定，应咨询具备相应资格的专业人士。财运解读不是投资建议，健康相关表述也不是疾病诊断或治疗方案。"],
        ["不保证特定结果", "CODE DESTINY 不保证复合、收到联系、就业、考试通过、晋升、婚姻、投资回报或某个时间发生特定事件。未经本人确认，也不能认定他人的真实意图。关系解读应帮助反思自己的行动，同时尊重对方意愿与双方的边界。"],
        ["焦虑增加时请先暂停", "如果不断重复同一个问题让您更加不安，请暂时离开解读，寻求可信赖的人或适当专业人士的支持。存在紧急危险时，不要等待咨询结果或客服回复，应联系当地紧急服务。购买付费内容并不保证解决个人、经济或健康问题。"],
        ["相关政策和更正渠道", "个人信息处理请查看隐私政策；服务使用和购买条件请查看服务条款及退款政策。本页不修改这些条件。若发现误导性表达或内容错误，可以将页面网址和相关段落发送至下方联系渠道，以便确认需要审核的部分。"],
      ],
    },
    faq: {
      title: "CODE DESTINY 常见问题｜AI运势、使用范围与服务说明",
      description: "解答四柱命理、紫微斗数、宿曜关系和AI解读的常见疑问，并说明免费与付费范围的确认方式、个人信息、退款咨询及联系渠道。",
      intro: "从您关心的问题开始阅读。这些说明帮助您理解服务，不替代各功能页面列明的使用条件或正式政策文件。",
      sections: [
        ["CODE DESTINY 是什么服务？", "这是涵盖四柱命理、紫微斗数、宿曜占星术、吠陀与西洋占星术、塔罗等内容的运势和咨询服务。解读用于娱乐、自我理解和梳理选择，各体系保留自己的计算前提与术语，并不把未来描述为确定事实。"],
        ["有不付费就能阅读的内容吗？", "公开介绍、知识解说和本FAQ无需登录或购买即可阅读。个别测算或咨询的免费范围请查看该功能页面。本说明不新增免费额度、无限使用或自动赠送等权益，也不改变现有产品条件。"],
        ["AI运势如何生成？", "使用AI的咨询会根据相关输入、可用计算结果和问题整理为说明文字。计算与文字生成属于不同环节，文字中仍可能存在错误。请结合实际情况理解内容，不要把表达流畅当作正确的证据。"],
        ["四柱命理和紫微斗数有什么区别？", "四柱以出生年、月、日、时的干支关系分析五行与十神等内容；紫微斗数则通过星曜在十二宫中的配置观察生活领域。它们提供不同的解释角度，不是一个必然正确、另一个错误的比较。"],
        ["宿曜关系依据什么判断？", "宿曜从月宿之间的关系思考亲近感、刺激和距离。相同关系分类下，两个人的经历与沟通方式仍可能完全不同。不要只依据一个关系名称决定是否继续交往，应结合双方的意愿和现实互动。"],
        ["不知道出生时间可以使用吗？", "不同工具要求的信息不同，请先查看页面是否提供时间不详选项或相关说明。如使用估计时间，应记住依赖时刻的细节具有不确定性，不宜把假定输入推导出的解释当作精确的人生结论。"],
        ["吠陀占星术与西洋占星术相同吗？", "两者虽涉及部分相同天体，但采用的基准和解释方法不同。拉格纳、纳克沙特拉等概念不能不加说明就替换成西洋占星术术语。阅读时请确认页面采用的体系与计算前提。"],
        ["结果总是准确吗？", "本服务不保证绝对准确或特定成果。您可以把有启发的段落转化为对重复习惯的提问，或当天可尝试的小行动。医疗、法律、投资与安全等重要决定应优先参考可靠信息和专业建议。"],
        ["付费功能增加哪些内容？", "付费范围以所选功能页面描述的详细解读或咨询为准。使用券、月光石与单次购买的适用条件可能不同，请在支付前核对内容和条件。付费并不代表事实准确性或人生结果得到保证。"],
        ["个人信息如何处理？", "隐私政策说明收集的信息、使用目的、保留期限与相关权利。联系客服时不要发送密码或支付卡资料。输入他人的出生信息前，也应尊重对方隐私，避免提供与使用目的无关的资料。"],
        ["如何咨询退款？", "请先阅读服务条款与退款政策，再通过联系渠道提供订单编号、时间和具体情况。是否适用退款取决于相关条件。本FAQ不承诺所有情况均可退款，也不新增固定处理期限。"],
        ["在哪里反馈故障或翻译错误？", "使用联系页面列明的邮箱，并附上网址、显示语言、相关文字或错误提示。若已支付但未显示结果，请在重复购买前确认订单状态。反馈时避免附带与问题无关的私人信息。"],
      ],
    },
  },
};
