import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SERVICE = {
  h1: "🔮 명리학 타로",
  description:
    "연애, 재회, 사업, 건강 등 고민의 문을 따라 한 장 리딩 또는 세 장 흐름으로 카드와 십성의 결을 읽는, 감성 있는 점술 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/ai%20tarrot.webp",
  landingPoints: ["질문별 오라클 리딩", "한 장 리딩과 세 장 흐름", "카드와 십성의 조율 해석"],
  seoText:
    "명리학 타로는 질문의 문맥 위에 타로 카드를 놓고, 점술 서비스 관점에서 지금 필요한 선택의 방향을 사람의 언어로 번역해 주는 서비스입니다.",
  localized: {
    en: {
      title: "Mingri Tarot - Choice Reading with Cards and Ten Gods",
      h1: "🔮 Mingri Tarot",
      description:
        "A sensitive divination service that reads tarot cards and the texture of the Ten Gods through one-card readings or three-card flows for love, reunion, business, health, and other concerns.",
      landingPoints: ["Oracle reading by question", "One-card and three-card flows", "Balanced reading of cards and Ten Gods"],
      seoText:
        "Mingri Tarot places tarot cards over the context of your question and translates the direction of the choice you need now into human language.",
      valueGuideTitle: "Six Ways to Use Mingri Tarot Well",
      valueSections: [
        {
          title: "1. The texture of the question opens the texture of the reading",
          body:
            "When tarot feels vague, the cause is often the question rather than the card. A focused question, such as what to change first in this project this month, leads the reading toward today's choice. Mingri Tarot opens more clearly when each doorway of concern is separated and named.",
        },
        {
          title: "2. One card shows direction; three cards show context",
          body:
            "A one-card reading is useful for catching the key signal of the day, while a three-card flow connects where the matter came from, where it stands now, and where it is moving. Use one card when time is short, and three cards for repeating patterns.",
        },
        {
          title: "3. The same card changes completely by context",
          body:
            "If a Cup card appears, it is not always only an emotional issue. In work it may point to collaboration, and in finance it may reveal a spending emotion pattern. The heart of Mingri Tarot is translating the card through the question context, not only naming the card.",
        },
        {
          title: "4. Even difficult cards should end as action items",
          body:
            "When Tower or Sword cards appear, it is easy to jump to a pessimistic conclusion. Yet the purpose of the card is closer to showing the shadow in the flow than announcing fear. A small choice, such as adjusting your schedule, changing conversation style, or setting a spending limit, turns anxiety into control.",
        },
        {
          title: "5. Love and reunion readings should check your pattern first",
          body:
            "The riskiest relationship tarot interpretation is one that fixes the other person in place. It is healthier to ask what message you send when anxious before deciding who the other person is. Mingri Tarot is most valuable when it reveals your repeated choice habits in a relationship.",
        },
        {
          title: "6. Records reveal the repeating signals of the cards",
          body:
            "After a reading, briefly record your emotion, the actual flow one week later, and the actions you changed. Within a few weeks, repeated card combinations in your own life begin to appear. Tarot becomes stronger when used as a record of choices, not only as a single event.",
        },
      ],
    },
    ja: {
      title: "四柱推命タロット - カードと十神が照らす選択リーディング",
      h1: "🔮 四柱推命タロット",
      description:
        "恋愛、復縁、仕事、健康など悩みの扉に合わせて、1枚リーディングまたは3枚の流れでタロットと十神の気配を読む、感性豊かな占いです。",
      landingPoints: ["質問別オラクルリーディング", "1枚リーディングと3枚の流れ", "カードと十神を調和して読む"],
      seoText:
        "四柱推命タロットは、質問の文脈にタロットを重ね、今必要な選択の方向を人の言葉でやさしく映します。",
      valueGuideTitle: "四柱推命タロットをよく使う6つの方法",
      valueSections: [
        {
          title: "1. 質問の質感が、リーディングの質感を開きます",
          body:
            "タロットが曖昧に感じられるとき、その原因はカードではなく質問にあることが多いものです。「うまくいきますか」より、「今月この計画で先に変える一つは何か」と範囲を絞るほど、読みは今日の選択につながります。四柱推命タロットは、悩みの扉を分けて問いを整えるほど澄んで開きます。",
        },
        {
          title: "2. 1枚は方向を、3枚は文脈を見せます",
          body:
            "1枚リーディングは今日の核心サインをすばやく受け取るのに向き、3枚の流れは過去から今、そしてこれからへ続く気配を読むのに向いています。時間がないときは1枚で優先順位を決め、くり返す悩みは3枚でパターンを見ると、読みが安定します。",
        },
        {
          title: "3. 同じカードでも、文脈でまったく違って読まれます",
          body:
            "たとえばカップのカードが出たからといって、必ず恋愛感情だけを示すとは限りません。仕事では協働関係を、金銭では消費にまつわる感情の癖を映すことがあります。カード名を当てるより、質問の文脈に合わせて翻訳する感覚が四柱推命タロットの核心です。",
        },
        {
          title: "4. 不安なカードが出ても、最後は行動項目にします",
          body:
            "タワーやソード系のカードが出ると、結果を悪く決めつけたくなることがあります。けれどカードの役目は恐怖の予告ではなく、流れに潜む影を知らせることに近いものです。予定の組み替え、話し方の調整、支出上限の設定など、今日差し出せる小さな選択にまとめると、不安はコントロール感へ変わります。",
        },
        {
          title: "5. 恋愛・復縁リーディングは、相手の判定より自分のパターンを見ます",
          body:
            "関係タロットでいちばん危ういのは、相手を決めつける読みです。「相手はこういう人」と断じる前に、「不安なとき私はどんな言葉を送るのか」を見るほうが健やかです。四柱推命タロットは相手の心理を確定するためではなく、関係の中でくり返す自分の選択習慣を照らすときに深く働きます。",
        },
        {
          title: "6. 記録を残すと、カードのくり返すサインが見えてきます",
          body:
            "リーディング直後の感情、1週間後の実際の流れ、自分が変えた行動を短く記録してみてください。数週間たつと、自分の状況でよく出るカードの組み合わせが見え始めます。タロットを一度きりの出来事ではなく、自分だけの選択記録として使うほど、占いの言葉は生活の方向へ降りてきます。",
        },
      ],
    },
    "zh-CN": {
      title: "命理塔罗 - 牌与十神映照的选择解读",
      h1: "🔮 命理塔罗",
      description:
        "面向恋爱、复合、事业、健康等问题，通过一张牌或三张牌流向，读取塔罗与十神气息的细腻占卜服务。",
      landingPoints: ["按问题进行神谕解读", "一张牌与三张牌流向", "牌与十神的协调解读"],
      seoText:
        "命理塔罗把塔罗牌放在问题语境之上，从占卜视角把此刻所需的选择方向翻译成人能理解的语言。",
      valueGuideTitle: "正确使用命理塔罗的6个方法",
      valueSections: [
        {
          title: "1. 问题的质感会打开解读的质感",
          body:
            "当塔罗显得模糊时，原因多半不是牌，而是问题本身。与其问「会顺利吗」，不如问「本月这个项目我最先要改变的一点是什么」。问题越收束，解读越能落到今天的选择上。",
        },
        {
          title: "2. 一张牌看方向，三张牌看语境",
          body:
            "一张牌适合快速抓住今日核心信号，三张牌则适合连接过去、现在与即将到来的流向。时间紧时用一张牌定优先级，反复出现的问题用三张牌看模式，解读会更稳定。",
        },
        {
          title: "3. 同一张牌会因语境完全不同",
          body:
            "例如出现圣杯牌，并不一定只代表情感问题。在工作语境中，它可能指向协作关系；在财务语境中，它可能显出消费情绪模式。命理塔罗的核心不是说出牌名，而是按问题语境进行翻译。",
        },
        {
          title: "4. 即使出现不安的牌，也要以行动项结束",
          body:
            "塔牌或宝剑牌出现时，人很容易直接悲观判断。但牌的目的更像是指出流向里的阴影，而不是预告恐惧。把它整理成调整日程、改变沟通方式、设定支出上限等今日可做的小选择，不安就会变成掌控感。",
        },
        {
          title: "5. 恋爱与复合解读应先检查自己的模式",
          body:
            "关系塔罗中最危险的解读，是直接断定对方。比起「对方就是这种人」，先看见「我不安时会发出怎样的信息」会健康得多。命理塔罗的价值在于发现关系中反复出现的自我选择习惯。",
        },
        {
          title: "6. 记录会显出牌的重复信号",
          body:
            "解读后简短记录当下情绪、一周后的实际流向，以及自己改变的三个行动。几周后，你会开始看见哪些牌组在你的情境中反复出现。把塔罗作为选择记录，而不只是一次事件，运势文字会落到生活方向中。",
        },
      ],
    },
    "zh-TW": {
      title: "命理塔羅 - 牌與十神映照的選擇解讀",
      h1: "🔮 命理塔羅",
      description:
        "面向戀愛、復合、事業、健康等問題，透過一張牌或三張牌流向，讀取塔羅與十神氣息的細膩占卜服務。",
      landingPoints: ["按問題進行神諭解讀", "一張牌與三張牌流向", "牌與十神的協調解讀"],
      seoText:
        "命理塔羅把塔羅牌放在問題語境之上，從占卜視角把此刻所需的選擇方向翻譯成人能理解的語言。",
      valueGuideTitle: "正確使用命理塔羅的6個方法",
      valueSections: [
        {
          title: "1. 問題的質感會打開解讀的質感",
          body:
            "當塔羅顯得模糊時，原因多半不是牌，而是問題本身。與其問「會順利嗎」，不如問「本月這個專案我最先要改變的一點是什麼」。問題越收束，解讀越能落到今天的選擇上。",
        },
        {
          title: "2. 一張牌看方向，三張牌看語境",
          body:
            "一張牌適合快速抓住今日核心訊號，三張牌則適合連接過去、現在與即將到來的流向。時間緊時用一張牌定優先級，反覆出現的問題用三張牌看模式，解讀會更穩定。",
        },
        {
          title: "3. 同一張牌會因語境完全不同",
          body:
            "例如出現聖杯牌，並不一定只代表情感問題。在工作語境中，它可能指向協作關係；在財務語境中，它可能顯出消費情緒模式。命理塔羅的核心不是說出牌名，而是按問題語境進行翻譯。",
        },
        {
          title: "4. 即使出現不安的牌，也要以行動項結束",
          body:
            "塔牌或寶劍牌出現時，人很容易直接悲觀判斷。但牌的目的更像是指出流向裡的陰影，而不是預告恐懼。把它整理成調整日程、改變溝通方式、設定支出上限等今日可做的小選擇，不安就會變成掌控感。",
        },
        {
          title: "5. 戀愛與復合解讀應先檢查自己的模式",
          body:
            "關係塔羅中最危險的解讀，是直接斷定對方。比起「對方就是這種人」，先看見「我不安時會發出怎樣的訊息」會健康得多。命理塔羅的價值在於發現關係中反覆出現的自我選擇習慣。",
        },
        {
          title: "6. 記錄會顯出牌的重複訊號",
          body:
            "解讀後簡短記錄當下情緒、一週後的實際流向，以及自己改變的三個行動。幾週後，你會開始看見哪些牌組在你的情境中反覆出現。把塔羅作為選擇記錄，而不只是一次事件，運勢文字會落到生活方向中。",
        },
      ],
    },
    vi: {
      title: "Mingri Tarot - Bài và Thập Thần soi hướng lựa chọn",
      h1: "🔮 Mingri Tarot",
      description:
        "Dịch vụ bói cảm xúc đọc lá bài tarot và sắc thái Thập Thần qua một lá hoặc dòng chảy ba lá cho tình yêu, tái hợp, kinh doanh, sức khỏe và các nỗi băn khoăn khác.",
      landingPoints: ["Oracle theo từng câu hỏi", "Một lá và dòng chảy ba lá", "Diễn giải hài hòa giữa bài và Thập Thần"],
      seoText:
        "Mingri Tarot đặt lá bài lên bối cảnh câu hỏi và chuyển hướng lựa chọn cần thiết lúc này thành ngôn ngữ gần gũi.",
      valueGuideTitle: "6 cách dùng Mingri Tarot đúng hơn",
      valueSections: [
        {
          title: "1. Chất của câu hỏi mở chất của bài đọc",
          body:
            "Khi tarot có vẻ mơ hồ, nguyên nhân thường nằm ở câu hỏi. Thay vì hỏi quá rộng, hãy thu hẹp thành điều cần thay đổi trước trong tháng này. Câu hỏi càng rõ, bài đọc càng dẫn về lựa chọn hôm nay.",
        },
        {
          title: "2. Một lá cho hướng, ba lá cho bối cảnh",
          body:
            "Một lá giúp bắt tín hiệu chính của ngày, còn ba lá nối dòng đã qua, hiện tại và điều sắp đến. Khi ít thời gian, dùng một lá để chọn ưu tiên; với vấn đề lặp lại, dùng ba lá để nhìn mô thức.",
        },
        {
          title: "3. Cùng một lá thay đổi hoàn toàn theo bối cảnh",
          body:
            "Một lá Cups không nhất thiết chỉ nói về tình cảm. Trong công việc, nó có thể chỉ quan hệ hợp tác; trong tài chính, nó có thể soi mô thức cảm xúc khi chi tiêu. Trọng tâm của Mingri Tarot là dịch lá bài theo câu hỏi.",
        },
        {
          title: "4. Lá gây lo cũng nên kết bằng hành động",
          body:
            "Khi Tower hoặc nhóm Swords xuất hiện, ta dễ vội kết luận bi quan. Nhưng lá bài gần với việc chỉ ra bóng tối của dòng chảy hơn là báo sợ hãi. Một hành động nhỏ như sắp lại lịch, đổi cách nói hoặc đặt giới hạn chi tiêu sẽ biến lo âu thành cảm giác kiểm soát.",
        },
        {
          title: "5. Bài tình yêu và tái hợp nên xem mô thức của bạn trước",
          body:
            "Diễn giải nguy hiểm nhất trong tarot quan hệ là đóng khung người kia. Trước khi kết luận họ là ai, hãy nhìn xem khi bất an bạn gửi đi thông điệp nào. Mingri Tarot có giá trị nhất khi giúp bạn thấy thói quen lựa chọn lặp lại trong quan hệ.",
        },
        {
          title: "6. Ghi chép làm tín hiệu lặp lại hiện ra",
          body:
            "Sau bài đọc, ghi ngắn cảm xúc, dòng chảy thực tế sau một tuần và hành động bạn đã đổi. Chỉ vài tuần sau, bạn sẽ thấy tổ hợp lá nào hay lặp lại trong hoàn cảnh của mình. Tarot mạnh hơn khi trở thành nhật ký lựa chọn.",
        },
      ],
    },
    hi: {
      title: "मिंगरी टैरो - कार्ड और Ten Gods से चुनाव रीडिंग",
      h1: "🔮 मिंगरी टैरो",
      description:
        "प्रेम, पुनर्मिलन, व्यवसाय, स्वास्थ्य आदि प्रश्नों के लिए एक कार्ड या तीन कार्ड प्रवाह से टैरो और Ten Gods की परत पढ़ने वाली संवेदनशील ज्योतिषीय सेवा.",
      landingPoints: ["प्रश्न अनुसार ओरेकल रीडिंग", "एक कार्ड और तीन कार्ड प्रवाह", "कार्ड और Ten Gods का संतुलित पठन"],
      seoText:
        "मिंगरी टैरो आपके प्रश्न के संदर्भ पर कार्ड रखकर अभी आवश्यक चुनाव की दिशा को मानवीय भाषा में अनुवाद करता है.",
      valueGuideTitle: "मिंगरी टैरो को सही उपयोग करने के 6 तरीके",
      valueSections: [
        {
          title: "1. प्रश्न की बनावट रीडिंग की बनावट खोलती है",
          body:
            "टैरो जब अस्पष्ट लगे, तो कारण अक्सर कार्ड नहीं बल्कि प्रश्न होता है. बहुत व्यापक प्रश्न की जगह इस महीने पहले क्या बदलना है जैसे केंद्रित प्रश्न पूछें. जितना प्रश्न साफ होगा, रीडिंग उतनी आज की पसंद तक पहुँचेगी.",
        },
        {
          title: "2. एक कार्ड दिशा दिखाता है, तीन कार्ड संदर्भ दिखाते हैं",
          body:
            "एक कार्ड आज का मुख्य संकेत जल्दी पकड़ता है, जबकि तीन कार्ड बीता प्रवाह, वर्तमान स्थिति और आने वाली दिशा जोड़ते हैं. समय कम हो तो एक कार्ड से प्राथमिकता तय करें; दोहराते मुद्दे के लिए तीन कार्ड से पैटर्न देखें.",
        },
        {
          title: "3. वही कार्ड संदर्भ से बिल्कुल बदल सकता है",
          body:
            "Cups कार्ड आने का अर्थ हमेशा भावनात्मक समस्या नहीं होता. काम में यह सहयोग संबंध हो सकता है, वित्त में खर्च भावना का पैटर्न. मिंगरी टैरो का केंद्र कार्ड नाम नहीं, प्रश्न संदर्भ में अनुवाद है.",
        },
        {
          title: "4. कठिन कार्ड भी अंत में कार्रवाई में बदलें",
          body:
            "Tower या Swords आने पर परिणाम को निराशाजनक मानना आसान है. पर कार्ड भय की घोषणा नहीं, प्रवाह की छाया दिखाते हैं. समय-सारिणी बदलना, बातचीत का तरीका सुधारना या खर्च सीमा तय करना चिंता को नियंत्रण में बदलता है.",
        },
        {
          title: "5. प्रेम और पुनर्मिलन में पहले अपना पैटर्न देखें",
          body:
            "रिश्ते की टैरो रीडिंग में सबसे जोखिम भरा काम सामने वाले को तय कर देना है. वे ऐसे हैं कहने से पहले देखें कि आप असुरक्षा में कौन सा संदेश भेजते हैं. मिंगरी टैरो संबंध में आपकी दोहराती चुनाव आदतों को दिखाने में अधिक मूल्यवान है.",
        },
        {
          title: "6. रिकॉर्ड से कार्ड के दोहराते संकेत दिखते हैं",
          body:
            "रीडिंग के बाद भावना, एक सप्ताह बाद वास्तविक प्रवाह और बदले गए कार्य लिखें. कुछ हफ्तों में दिखने लगेगा कि कौन से कार्ड संयोजन आपकी स्थिति में दोहराते हैं. टैरो एक घटना से अधिक चुनाव रिकॉर्ड बने तो दिशा स्पष्ट होती है.",
        },
      ],
    },
    es: {
      title: "Mingri Tarot - Lectura de elección con cartas y Diez Dioses",
      h1: "🔮 Mingri Tarot",
      description:
        "Servicio sensible de adivinación que lee cartas de tarot y la textura de los Diez Dioses con una carta o flujos de tres cartas para amor, regreso, negocio, salud y otras dudas.",
      landingPoints: ["Oráculo por pregunta", "Una carta y flujos de tres cartas", "Lectura equilibrada de cartas y Diez Dioses"],
      seoText:
        "Mingri Tarot coloca las cartas sobre el contexto de tu pregunta y traduce la dirección de elección que necesitas ahora en lenguaje humano.",
      valueGuideTitle: "6 formas de usar bien Mingri Tarot",
      valueSections: [
        {
          title: "1. La textura de la pregunta abre la textura de la lectura",
          body:
            "Cuando el tarot parece vago, la causa suele estar en la pregunta. En lugar de preguntar si todo irá bien, enfoca qué puedes cambiar primero este mes. Cuanto más precisa sea la pregunta, más útil será la lectura para elegir hoy.",
        },
        {
          title: "2. Una carta muestra dirección; tres cartas muestran contexto",
          body:
            "Una carta capta la señal central del día; tres cartas conectan lo que venía, lo que ocurre y lo que se aproxima. Si tienes poco tiempo, usa una carta para priorizar; si el problema se repite, usa tres para ver patrón.",
        },
        {
          title: "3. La misma carta cambia por completo según el contexto",
          body:
            "Una carta de Copas no siempre habla solo de emociones. En trabajo puede señalar colaboración; en finanzas, un patrón emocional de gasto. El núcleo de Mingri Tarot es traducir la carta según la pregunta.",
        },
        {
          title: "4. Incluso las cartas inquietantes deben terminar en acción",
          body:
            "Torre o Espadas pueden llevar a conclusiones pesimistas. Pero la carta muestra la sombra del flujo, no anuncia miedo. Reordenar agenda, cambiar el modo de hablar o fijar límite de gasto convierte ansiedad en control.",
        },
        {
          title: "5. En amor y regreso, revisa primero tu patrón",
          body:
            "La lectura más riesgosa en tarot relacional es fijar a la otra persona. Antes de decir cómo es, mira qué mensajes envías cuando sientes inseguridad. Mingri Tarot vale más cuando revela tus hábitos repetidos de elección.",
        },
        {
          title: "6. Registrar revela señales repetidas",
          body:
            "Después de la lectura, anota emoción, flujo real una semana después y acciones cambiadas. En pocas semanas verás qué combinaciones se repiten en tu situación. El tarot se vuelve más fuerte como registro de decisiones.",
        },
      ],
    },
    fr: {
      title: "Mingri Tarot - Lecture de choix avec cartes et Dix Dieux",
      h1: "🔮 Mingri Tarot",
      description:
        "Un service divinatoire sensible qui lit les cartes de tarot et la texture des Dix Dieux en une carte ou en flux de trois cartes pour l'amour, le retour, le travail, la santé et d'autres questions.",
      landingPoints: ["Oracle par question", "Une carte et flux de trois cartes", "Lecture accordée des cartes et des Dix Dieux"],
      seoText:
        "Mingri Tarot pose les cartes sur le contexte de votre question et traduit la direction de choix nécessaire en langage humain.",
      valueGuideTitle: "6 façons de bien utiliser Mingri Tarot",
      valueSections: [
        {
          title: "1. La texture de la question ouvre celle de la lecture",
          body:
            "Quand le tarot semble vague, la cause vient souvent de la question. Au lieu de demander si tout ira bien, demandez ce qu'il faut changer en premier ce mois-ci. Plus la question est ciblée, plus la lecture rejoint le choix du jour.",
        },
        {
          title: "2. Une carte montre la direction; trois cartes donnent le contexte",
          body:
            "Une carte saisit le signal essentiel du jour, tandis que trois cartes relient ce qui vient, ce qui est là et ce qui arrive. Pour aller vite, choisissez une carte; pour un problème répétitif, trois cartes révèlent le motif.",
        },
        {
          title: "3. La même carte change entièrement avec le contexte",
          body:
            "Une carte de Coupes ne parle pas toujours seulement d'émotion. Au travail, elle peut indiquer la collaboration; en finance, un motif émotionnel de dépense. Le cœur de Mingri Tarot est de traduire la carte selon la question.",
        },
        {
          title: "4. Même une carte inquiétante doit finir en action",
          body:
            "La Tour ou les Épées peuvent pousser vers une conclusion sombre. Pourtant la carte montre plutôt l'ombre du flux qu'une annonce de peur. Réorganiser l'agenda, ajuster une conversation ou fixer une limite de dépense transforme l'anxiété en prise.",
        },
        {
          title: "5. En amour et retour, regardez d'abord votre propre schéma",
          body:
            "Le risque du tarot relationnel est de fixer l'autre personne. Avant de dire qui elle est, observez quel message vous envoyez quand l'insécurité monte. Mingri Tarot aide surtout à voir vos habitudes de choix répétées dans la relation.",
        },
        {
          title: "6. Les notes révèlent les signaux répétés",
          body:
            "Après la lecture, notez votre émotion, le flux réel une semaine plus tard et les actions changées. En quelques semaines, les combinaisons récurrentes deviennent visibles. Le tarot devient plus fort lorsqu'il sert de registre de choix.",
        },
      ],
    },
    de: {
      title: "Mingri Tarot - Entscheidungslesung mit Karten und Zehn Göttern",
      h1: "🔮 Mingri Tarot",
      description:
        "Ein feinfühliger Divinationsdienst, der Tarotkarten und die Struktur der Zehn Götter in Ein-Karten- oder Drei-Karten-Flüssen für Liebe, Rückkehr, Geschäft, Gesundheit und andere Fragen liest.",
      landingPoints: ["Orakel nach Frage", "Ein-Karten- und Drei-Karten-Flüsse", "Abgestimmte Deutung von Karten und Zehn Göttern"],
      seoText:
        "Mingri Tarot legt Karten auf den Kontext deiner Frage und übersetzt die jetzt nötige Entscheidungsrichtung in menschliche Sprache.",
      valueGuideTitle: "6 Wege, Mingri Tarot gut zu nutzen",
      valueSections: [
        {
          title: "1. Die Beschaffenheit der Frage öffnet die Lesung",
          body:
            "Wenn Tarot vage wirkt, liegt es oft an der Frage. Statt zu fragen, ob es gut läuft, frage, was du diesen Monat zuerst ändern solltest. Je klarer der Rahmen, desto eher führt die Lesung zur heutigen Entscheidung.",
        },
        {
          title: "2. Eine Karte zeigt Richtung, drei Karten zeigen Kontext",
          body:
            "Eine Karte erfasst das Tagessignal schnell, drei Karten verbinden Herkunft, Gegenwart und kommende Bewegung. Bei wenig Zeit hilft eine Karte für Prioritäten; bei wiederkehrenden Themen zeigen drei Karten das Muster.",
        },
        {
          title: "3. Dieselbe Karte verändert sich durch Kontext völlig",
          body:
            "Eine Kelchkarte muss nicht nur ein Gefühlsthema bedeuten. In Arbeit kann sie Zusammenarbeit zeigen, in Finanzen ein emotionales Ausgabemuster. Der Kern von Mingri Tarot ist die Übersetzung durch die Frage.",
        },
        {
          title: "4. Auch schwierige Karten enden in Handlung",
          body:
            "Turm- oder Schwertkarten verleiten zu pessimistischen Schlüssen. Doch die Karte zeigt eher den Schatten des Flusses als eine Angstansage. Zeitplan ändern, Gesprächsstil anpassen oder Ausgaben begrenzen verwandelt Angst in Kontrolle.",
        },
        {
          title: "5. Bei Liebe und Rückkehr zuerst das eigene Muster prüfen",
          body:
            "Die riskanteste Beziehungstarot-Deutung fixiert die andere Person. Bevor du entscheidest, wer sie ist, sieh, welche Nachricht du bei Unsicherheit sendest. Mingri Tarot ist wertvoll, wenn es deine wiederholten Wahlgewohnheiten sichtbar macht.",
        },
        {
          title: "6. Aufzeichnungen zeigen wiederkehrende Kartensignale",
          body:
            "Notiere nach der Lesung Emotion, tatsächlichen Verlauf eine Woche später und geänderte Handlungen. Nach wenigen Wochen zeigen sich wiederkehrende Kombinationen in deiner Lage. Tarot wird stärker, wenn es als Entscheidungsprotokoll dient.",
        },
      ],
    },
    nl: {
      title: "Mingri Tarot - Keuzelezing met kaarten en Tien Goden",
      h1: "🔮 Mingri Tarot",
      description:
        "Een gevoelige divinatiedienst die tarotkaarten en de textuur van de Tien Goden leest via één kaart of een driekaartenstroom voor liefde, hereniging, werk, gezondheid en andere vragen.",
      landingPoints: ["Orakel per vraag", "Eén kaart en driekaartenstroom", "Afgestemde lezing van kaarten en Tien Goden"],
      seoText:
        "Mingri Tarot legt kaarten op de context van je vraag en vertaalt de keuze richting die nu nodig is naar menselijke taal.",
      valueGuideTitle: "6 manieren om Mingri Tarot goed te gebruiken",
      valueSections: [
        {
          title: "1. De textuur van de vraag opent de textuur van de lezing",
          body:
            "Wanneer tarot vaag voelt, ligt de oorzaak vaak bij de vraag. Vraag niet alleen of het goed komt, maar wat je deze maand eerst kunt veranderen. Hoe gerichter de vraag, hoe meer de lezing bij de keuze van vandaag komt.",
        },
        {
          title: "2. Eén kaart toont richting, drie kaarten tonen context",
          body:
            "Eén kaart vangt snel het kernsignaal van vandaag, terwijl drie kaarten verleden, nu en komende beweging verbinden. Gebruik één kaart bij weinig tijd en drie kaarten voor terugkerende patronen.",
        },
        {
          title: "3. Dezelfde kaart verandert volledig door context",
          body:
            "Een Bekers-kaart betekent niet altijd alleen emotie. In werk kan ze samenwerking tonen, in financiën een emotioneel bestedingspatroon. Mingri Tarot draait om vertalen vanuit de vraagcontext.",
        },
        {
          title: "4. Ook onrustige kaarten eindigen in actie",
          body:
            "Toren- of Zwaarden-kaarten kunnen pessimistisch voelen. Toch toont de kaart eerder de schaduw in de stroom dan een angstvoorspelling. Planning aanpassen, anders praten of een uitgavenlimiet zetten verandert onrust in grip.",
        },
        {
          title: "5. Kijk bij liefde en hereniging eerst naar je eigen patroon",
          body:
            "De riskantste relatielezing zet de ander vast. Kijk eerst welk bericht jij stuurt wanneer je onzeker bent. Mingri Tarot is het waardevolst wanneer het terugkerende keuzegewoonten in de relatie zichtbaar maakt.",
        },
        {
          title: "6. Notities tonen herhaalde signalen",
          body:
            "Noteer na de reading je emotie, de echte stroom na een week en de acties die je veranderde. Na enkele weken zie je welke kaartcombinaties terugkomen. Tarot wordt sterker als keuzeverslag dan als eenmalig moment.",
        },
      ],
    },
    ms: {
      title: "Mingri Tarot - Bacaan pilihan dengan kad dan Ten Gods",
      h1: "🔮 Mingri Tarot",
      description:
        "Khidmat ramalan berperasaan yang membaca kad tarot dan lapisan Ten Gods melalui bacaan satu kad atau aliran tiga kad untuk cinta, penyatuan semula, bisnes, kesihatan dan persoalan lain.",
      landingPoints: ["Bacaan oracle mengikut soalan", "Satu kad dan aliran tiga kad", "Tafsiran seimbang kad dan Ten Gods"],
      seoText:
        "Mingri Tarot meletakkan kad tarot pada konteks soalan dan menterjemah arah pilihan yang diperlukan sekarang ke dalam bahasa manusia.",
      valueGuideTitle: "6 cara menggunakan Mingri Tarot dengan baik",
      valueSections: [
        {
          title: "1. Tekstur soalan membuka tekstur bacaan",
          body:
            "Apabila tarot terasa kabur, puncanya sering pada soalan, bukan kad. Daripada bertanya terlalu luas, kecilkan kepada satu perkara yang perlu diubah bulan ini. Semakin jelas soalan, semakin dekat bacaan kepada pilihan hari ini.",
        },
        {
          title: "2. Satu kad menunjukkan arah, tiga kad menunjukkan konteks",
          body:
            "Satu kad baik untuk menangkap isyarat utama hari ini, manakala tiga kad menghubungkan aliran lalu, keadaan kini dan arah mendatang. Jika masa singkat, gunakan satu kad; untuk masalah berulang, gunakan tiga kad.",
        },
        {
          title: "3. Kad yang sama berubah sepenuhnya mengikut konteks",
          body:
            "Kad Cups tidak semestinya hanya soal emosi. Dalam kerja, ia boleh menunjukkan kerjasama; dalam kewangan, pola emosi ketika berbelanja. Inti Mingri Tarot ialah menterjemah kad melalui konteks soalan.",
        },
        {
          title: "4. Kad yang merisaukan pun perlu berakhir dengan tindakan",
          body:
            "Kad Tower atau Swords mudah membawa kesimpulan pesimis. Namun kad lebih dekat kepada menunjukkan bayang dalam aliran daripada menakutkan. Susun semula jadual, ubah cara bercakap atau tetapkan had perbelanjaan untuk menukar cemas menjadi kawalan.",
        },
        {
          title: "5. Untuk cinta dan penyatuan semula, semak pola diri dahulu",
          body:
            "Tafsiran paling berisiko dalam tarot hubungan ialah menetapkan orang lain. Sebelum memutuskan siapa mereka, lihat mesej apa yang anda hantar ketika tidak selamat. Mingri Tarot bernilai apabila ia menunjukkan tabiat pilihan anda yang berulang.",
        },
        {
          title: "6. Rekod menunjukkan isyarat kad yang berulang",
          body:
            "Selepas bacaan, catat emosi, aliran sebenar seminggu kemudian dan tindakan yang diubah. Dalam beberapa minggu, gabungan kad yang berulang dalam situasi anda mula kelihatan. Tarot menjadi lebih kuat sebagai rekod pilihan.",
        },
      ],
    },
  },
  valueGuideTitle: "명리학 타로를 제대로 쓰는 6가지",
  valueSections: [
    {
      title: "1. 질문의 결이 리딩의 결을 엽니다",
      body:
        "타로가 모호하게 느껴질 때 대부분의 원인은 카드가 아니라 질문입니다. \"잘될까요\"처럼 넓은 질문보다 \"이번 달 이 프로젝트에서 내가 먼저 바꿀 한 가지는 무엇인가\"처럼 범위를 좁히면 해석이 오늘의 선택으로 이어집니다. 명리학 타로는 고민의 문을 분리해 질문을 정돈할 때 더 선명하게 열립니다.",
    },
    {
      title: "2. 한 장은 방향, 세 장은 맥락을 보여줍니다",
      body:
        "한 장 리딩은 오늘의 핵심 신호를 빠르게 잡는 데 유리하고, 세 장 흐름은 흘러온 결·지금의 결·다가오는 결을 이어 읽는 데 강합니다. 시간이 없을 때는 한 장으로 우선순위를 정하고, 반복되는 문제는 세 장으로 패턴을 살피면 피로가 줄고 리딩의 결이 안정됩니다.",
    },
    {
      title: "3. 같은 카드도 맥락에 따라 전혀 다르게 읽힙니다",
      body:
        "예를 들어 컵 카드가 나왔다고 무조건 감정 문제라고 결론내리면 오해가 생길 수 있습니다. 일 맥락에서는 협업 관계를, 재정 맥락에서는 소비 감정 패턴을 의미할 수 있습니다. 카드 이름을 맞히는 것보다 질문 문맥과 연결해 번역하는 감각이 명리학 타로의 핵심입니다.",
    },
    {
      title: "4. 불안한 카드가 나와도 결론은 행동 항목으로 마무리하세요",
      body:
        "타워나 검 계열 카드가 나오면 결과를 비관적으로 단정하기 쉽습니다. 하지만 카드의 목적은 공포 예고가 아니라 흐름의 그림자를 알려 주는 데 가깝습니다. 일정 재배치, 대화 방식 수정, 지출 상한 설정처럼 오늘 건넬 작은 선택을 한 줄로 정리하면 불안이 통제감으로 바뀝니다.",
    },
    {
      title: "5. 연애·재회 리딩은 상대 판정보다 내 패턴 점검이 우선입니다",
      body:
        "관계 타로에서 가장 위험한 해석은 상대를 단정하는 문장입니다. \"상대는 원래 이런 사람\"보다 \"내가 불안할 때 어떤 메시지를 보내는가\"를 먼저 보면 결과가 훨씬 건강해집니다. 명리학 타로는 상대 심리 확정이 아니라 관계에서 반복되는 내 선택 습관을 발견하는 데 더 큰 가치를 제공합니다.",
    },
    {
      title: "6. 기록을 남기면 카드의 반복 신호가 보입니다",
      body:
        "리딩 직후 감정, 일주일 뒤 실제 흐름, 내가 바꾼 행동 세 가지를 짧게 기록해 보세요. 몇 주만 지나도 어떤 카드 조합이 내 상황에서 자주 반복되는지 보이기 시작합니다. 타로를 한 번의 이벤트가 아니라 나만의 선택 기록으로 쓰면, 운세의 문장이 생활의 방향으로 내려옵니다.",
    },
  ],
};

export const metadata = withUniqueRouteMetadata("/tarot/mingri", {
  title: "🔮 명리학 타로 - 카드와 십성이 비추는 선택 리딩",
  description:
    "연애, 재회, 사업, 건강 등 고민의 문에 맞춰 한 장 리딩 또는 세 장 흐름으로 카드와 십성의 결을 읽습니다.",
});

export default function MingriTarotLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
