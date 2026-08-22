import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";

const DREAM_PSYCHO_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "정신분석 해몽 무료 보는 곳 | 프로이트 관점 꿈 해석",
    "meta.description": "꾼 꿈을 프로이트 정신분석 관점으로 읽어 주는 무료 해몽입니다. 전통 해몽이 상징을 읽는 방식과 달리 표면내용과 잠재내용을 나눠 보고, 꿈에 남은 감정과 관계 패턴을 함께 짚습니다.",
    "service.h1": "정신분석 해몽 — 프로이트 관점의 꿈 해석",
    "service.seoText": "정신분석 해몽은 꿈을 무의식의 언어로 보고 상징과 감정 흐름을 함께 분석하는 서비스입니다.",
    "valueGuide.title": "정신분석 해몽을 안전하게 활용하는 6원칙",
    "value.1.title": "1. 프로이트 해석은 정답 찾기보다 질문 프레임입니다",
    "value.2.title": "2. 잠재내용과 표면내용을 구분하면 과장이 줄어듭니다",
    "value.3.title": "3. 반복 상징은 억압보다 미해결 긴장 신호일 수 있습니다",
    "value.4.title": "4. 해석 후에는 자기돌봄 행동을 반드시 붙이세요",
    "value.5.title": "5. 관계 해석은 타인 진단이 아니라 경계 설정에 활용하세요",
    "value.6.title": "6. 불편감이 크면 전문가 상담과 병행하세요",
  },
  en: {
    "meta.title": "Psychoanalytic Dream Reading - Freud Study | Code Destiny",
    "meta.description": "An in-depth dream interpretation guide that reads unconscious signals and relationship patterns through symbolic analysis from a Freudian perspective.",
    "service.h1": "Psychoanalytic Dream Reading",
    "service.seoText": "Psychoanalytic dream reading treats dreams as the language of the unconscious and reads symbols together with emotional flow.",
    "valueGuide.title": "Six Principles for Using Psychoanalytic Dream Reading Safely",
    "value.1.title": "1. Freudian reading is a question frame, not a search for one answer",
    "value.2.title": "2. Separating manifest and latent content reduces exaggeration",
    "value.3.title": "3. Repeated symbols may signal unresolved tension more than repression",
    "value.4.title": "4. Add self-care action after interpretation",
    "value.5.title": "5. Use relationship readings for boundaries, not diagnosing others",
    "value.6.title": "6. Pair strong discomfort with professional support",
  },
};

function dreamPsychoText(key: keyof typeof DREAM_PSYCHO_TEXT_TRANSLATIONS.ko) {
  return DREAM_PSYCHO_TEXT_TRANSLATIONS.ko[key] || DREAM_PSYCHO_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/dream/psycho",
  title: dreamPsychoText("meta.title"),
  description: dreamPsychoText("meta.description"),
  keywords: ["정신분석 해몽", "프로이트", "무의식", "꿈 분석", "dream psycho"],
  image: "https://code-destiny.com/fuctionassets/phydream.webp",
  featureList: ["무의식 상징 구조화", "관계 패턴 해석", "자기이해 질문 제공"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  // 2026-08-17 에 부모 `/dream` 이 색인에서 빠지면서 유일한 인바운드 링크가 끊겨 함께 뺐던
  // 라우트다. 2026-08-20 에 `/dream` 이 본문 보강과 함께 색인으로 돌아와 전제가 사라졌으므로
  // noindex 를 걷었다. 사이트맵 등재는 scripts/generate-sitemap.mjs 의 coreRoutes 가 맡는다.
  return generatePageMetadata(META);
}

const JSON_LD = buildFortuneJsonLd(META);

const SERVICE = {
  h1: dreamPsychoText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: dreamPsychoText("service.seoText"),
  localized: {
    en: {
      title: "Psychoanalytic Dream Reading - Freud Study | Code Destiny",
      h1: "Psychoanalytic Dream Reading",
      description:
        "An in-depth dream interpretation guide that reads unconscious signals and relationship patterns through symbolic analysis from a Freudian perspective.",
      landingPoints: ["Structure unconscious symbols", "Interpret relationship patterns", "Self-understanding questions"],
      seoText:
        "Psychoanalytic dream reading treats dreams as the language of the unconscious and reads symbols together with emotional flow.",
      valueGuideTitle: "Six Principles for Using Psychoanalytic Dream Reading Safely",
      valueSections: [
        {
          title: "1. Freudian reading is a question frame, not a search for one answer",
          body:
            "Psychoanalytic dream reading works best when symbols are used as questions about desire and anxiety, not as fixed answers. Rather than accepting the interpretation as absolute truth, use it as a starting point for exploring your current emotional state. This reduces self-labeling and supports healthier self-understanding.",
        },
        {
          title: "2. Separating manifest and latent content reduces exaggeration",
          body:
            "The scene you saw in the dream is manifest content, while the emotion and desire it points toward are latent content. Psychoanalysis is strong at reading these separately. When you record not only what happened but how the scene made you feel, the interpretation becomes more concrete and grounded.",
        },
        {
          title: "3. Repeated symbols may signal unresolved tension, not only repression",
          body:
            "Chase dreams, exam dreams, or dreams of being late often connect to delayed tension in daily life. It is safer to treat them as clues for checking your life structure, rather than as pathology. Sleep shortage, work overload, and relationship conflict should be considered together so the reading does not turn into self-blame.",
        },
        {
          title: "4. Add self-care after every interpretation",
          body:
            "Psychoanalytic dream reading can touch deep emotion, so a simple settling routine afterward is useful. A short walk, emotion journaling, or talking with someone you trust helps the analysis stay safe. Insight lasts longer when it moves together with stabilization.",
        },
        {
          title: "5. Use relationship readings for boundaries, not diagnosing others",
          body:
            "Even when a specific person appears often in a dream, using it as evidence about that person can increase conflict. It is better to ask where you feel comfortable, where you need limits, and what you actually want in the relationship. The purpose is not judging others, but clarifying your boundaries and needs.",
        },
        {
          title: "6. If distress is strong, pair it with professional support",
          body:
            "Dream interpretation can help self-understanding, but persistent anxiety or sleep disturbance deserves professional counseling or treatment. If frightening dreams repeat or daily functioning drops, do not rely on self-interpretation alone. Healthy reading belongs inside a structure of care.",
        },
      ],
    },
    ja: {
      title: "精神分析的夢占い - Freud Study | Code Destiny",
      h1: "精神分析的夢占い",
      description:
        "フロイト的な象徴分析の視点から、夢にひそむ無意識のサインと人間関係のパターンを読み解く深層夢占いガイドです。",
      landingPoints: ["無意識の象徴を整理", "関係パターンの読み解き", "自己理解のための問い"],
      seoText:
        "精神分析的夢占いは、夢を無意識の言葉として受け取り、象徴と感情の流れを一緒に読み解きます。",
      valueGuideTitle: "精神分析的夢占いを安全に使う6つの原則",
      valueSections: [
        {
          title: "1. フロイト的な読みは、正解探しではなく問いの枠組みです",
          body:
            "精神分析的夢占いでは、夢の象徴をひとつの正解に固定するより、自分の欲求や不安を見つめるための問いとして扱うことが大切です。解釈を絶対の真実として受け取るのではなく、今の感情状態を探る入口にすると、自分を決めつけすぎず健やかな理解へ進めます。",
        },
        {
          title: "2. 顕在内容と潜在内容を分けると、読みすぎを防げます",
          body:
            "夢で見た場面そのものは顕在内容で、その場面が指している感情や欲求は潜在内容です。精神分析は、このふたつを分けて読むところに強みがあります。出来事だけでなく「この場面が私にどんな感情を起こしたか」も記録すると、読みが具体的で現実に近づきます。",
        },
        {
          title: "3. くり返す象徴は、抑圧だけでなく未解決の緊張かもしれません",
          body:
            "追われる夢、試験の夢、遅刻する夢のようなくり返す象徴は、日常で先送りにしている緊張課題と結びつくことがあります。病理として決めつけず、生活の構造を見直す手がかりとして扱うと安全です。睡眠不足、仕事の詰まり、人間関係の摩擦も一緒に見ると、自分を責めすぎずに済みます。",
        },
        {
          title: "4. 解釈のあとは、必ず自分を落ち着かせる行動を添えましょう",
          body:
            "精神分析的夢占いは深い感情に触れることがあるため、読み終えたあとに短い安定のルーティンを持つとよいでしょう。散歩、感情の記録、信頼できる人との会話など、身体と関係を通した回復を添えると分析の時間が安全になります。洞察と安心が一緒にあるほど、読みは長く役立ちます。",
        },
        {
          title: "5. 関係の読みは相手の診断ではなく、境界線の確認に使います",
          body:
            "夢に特定の人が何度も出てきても、その人を決めつける根拠にすると衝突が大きくなることがあります。代わりに、自分がどこまで受け入れられて、どこから境界線を置くと楽なのかを見てください。目的は相手を裁くことではなく、自分の境界と望みを明らかにすることです。",
        },
        {
          title: "6. つらさが強いときは、専門家の相談と並べてください",
          body:
            "夢占いは自己理解の助けになりますが、不安や睡眠の不調が続くときは専門家の相談や治療と一緒に進めるのが安全です。強い恐怖の夢がくり返す、日常の働きが落ちるといった場合は、ひとりの解釈だけで抱え込まないでください。健やかな読みは、セルフケアの中で働きます。",
        },
      ],
    },
    "zh-CN": {
      title: "精神分析解梦 - Freud Study | Code Destiny",
      h1: "精神分析解梦",
      description:
        "从弗洛伊德式象征分析视角，阅读梦中的无意识信号与关系模式的深层解梦指南。",
      landingPoints: ["结构化无意识象征", "解读关系模式", "提供自我理解问题"],
      seoText:
        "精神分析解梦把梦看作无意识的语言，同时分析象征与情绪流动。",
      valueGuideTitle: "安全使用精神分析解梦的6项原则",
      valueSections: [
        {
          title: "1. 弗洛伊德式解读是提问框架，不是寻找唯一答案",
          body:
            "精神分析解梦的重点，不是把梦的象征固定成一个答案，而是用它检查自己的欲望与不安。与其把解读当作绝对真相，不如把它作为探索当前情绪状态的起点。这样能减少过度自我标签，走向更健康的自我理解。",
        },
        {
          title: "2. 区分显性内容与潜在内容，可以减少夸大",
          body:
            "梦中看到的场景本身是显性内容，而它指向的情绪与欲望是潜在内容。精神分析擅长把两者分开阅读。不要只停留在事件描述，也记录「这个场景让我产生了什么感受」，解读就会更具体、更贴近现实。",
        },
        {
          title: "3. 重复象征可能是未解决的紧张，而不只是压抑",
          body:
            "被追赶、考试、迟到等重复梦，常常与日常中被推迟的紧张课题有关。把它视为检查生活结构的线索，比病理化判断更安全。睡眠不足、工作过载、关系冲突等现实因素也要一起确认，避免解读流向过度自责。",
        },
        {
          title: "4. 解读之后一定要加上自我照顾行动",
          body:
            "精神分析解梦可能触碰较深的情绪，因此解读后最好有一个简单的稳定流程。短暂散步、情绪记录、与信任的人谈话等身体与关系层面的恢复行动，会让分析更安全。洞察与稳定同行时，解读的质量会保持得更久。",
        },
        {
          title: "5. 关系解读应用于边界设定，而不是诊断他人",
          body:
            "即使某个特定人物经常出现在梦中，也不要把它当作判定对方的证据，否则容易扩大冲突。更适合用来检查自己在关系中哪里能接受、哪里需要设下界线。精神分析解梦的目的不是评价他人，而是清楚自己的边界与需求。",
        },
        {
          title: "6. 如果不适感强，请与专业咨询并行",
          body:
            "解梦可以帮助自我理解，但如果伴随持续焦虑或睡眠障碍，与专业咨询或治疗并行更安全。特别是强烈恐惧梦反复出现，或日常功能下降时，不要只靠自我解读硬撑。健康的解读应在自我照顾体系内运作。",
        },
      ],
    },
    "zh-TW": {
      title: "精神分析解夢 - Freud Study | Code Destiny",
      h1: "精神分析解夢",
      description:
        "從佛洛伊德式象徵分析視角，閱讀夢中的無意識訊號與關係模式的深層解夢指南。",
      landingPoints: ["結構化無意識象徵", "解讀關係模式", "提供自我理解問題"],
      seoText:
        "精神分析解夢把夢看作無意識的語言，同時分析象徵與情緒流動。",
      valueGuideTitle: "安全使用精神分析解夢的6項原則",
      valueSections: [
        {
          title: "1. 佛洛伊德式解讀是提問框架，不是尋找唯一答案",
          body:
            "精神分析解夢的重點，不是把夢的象徵固定成一個答案，而是用它檢查自己的欲望與不安。與其把解讀當作絕對真相，不如把它作為探索當前情緒狀態的起點。這樣能減少過度自我標籤，走向更健康的自我理解。",
        },
        {
          title: "2. 區分顯性內容與潛在內容，可以減少誇大",
          body:
            "夢中看到的場景本身是顯性內容，而它指向的情緒與欲望是潛在內容。精神分析擅長把兩者分開閱讀。不要只停留在事件描述，也記錄「這個場景讓我產生了什麼感受」，解讀就會更具體、更貼近現實。",
        },
        {
          title: "3. 重複象徵可能是未解決的緊張，而不只是壓抑",
          body:
            "被追趕、考試、遲到等重複夢，常常與日常中被推遲的緊張課題有關。把它視為檢查生活結構的線索，比病理化判斷更安全。睡眠不足、工作過載、關係衝突等現實因素也要一起確認，避免解讀流向過度自責。",
        },
        {
          title: "4. 解讀之後一定要加上自我照顧行動",
          body:
            "精神分析解夢可能觸碰較深的情緒，因此解讀後最好有一個簡單的穩定流程。短暫散步、情緒記錄、與信任的人談話等身體與關係層面的恢復行動，會讓分析更安全。洞察與穩定同行時，解讀的品質會保持得更久。",
        },
        {
          title: "5. 關係解讀應用於邊界設定，而不是診斷他人",
          body:
            "即使某個特定人物經常出現在夢中，也不要把它當作判定對方的證據，否則容易擴大衝突。更適合用來檢查自己在關係中哪裡能接受、哪裡需要設下界線。精神分析解夢的目的不是評價他人，而是清楚自己的邊界與需求。",
        },
        {
          title: "6. 如果不適感強，請與專業諮詢並行",
          body:
            "解夢可以幫助自我理解，但如果伴隨持續焦慮或睡眠障礙，與專業諮詢或治療並行更安全。特別是強烈恐懼夢反覆出現，或日常功能下降時，不要只靠自我解讀硬撐。健康的解讀應在自我照顧體系內運作。",
        },
      ],
    },
    vi: {
      title: "Giải mộng phân tâm học - Freud Study | Code Destiny",
      h1: "Giải mộng phân tâm học",
      description:
        "Hướng dẫn giải mộng chuyên sâu đọc tín hiệu vô thức và mô thức quan hệ qua phân tích biểu tượng theo góc nhìn Freud.",
      landingPoints: ["Cấu trúc biểu tượng vô thức", "Diễn giải mô thức quan hệ", "Câu hỏi tự thấu hiểu"],
      seoText:
        "Giải mộng phân tâm học xem giấc mơ như ngôn ngữ của vô thức và đọc biểu tượng cùng dòng cảm xúc.",
      valueGuideTitle: "6 nguyên tắc sử dụng giải mộng phân tâm học an toàn",
      valueSections: [
        {
          title: "1. Cách đọc Freud là khung câu hỏi, không phải tìm một đáp án",
          body:
            "Giải mộng phân tâm học hữu ích nhất khi biểu tượng được dùng để hỏi về ham muốn và lo âu, không phải để đóng thành một đáp án. Hãy xem diễn giải như điểm bắt đầu khám phá trạng thái cảm xúc hiện tại. Cách này giảm tự dán nhãn và hỗ trợ hiểu mình lành mạnh hơn.",
        },
        {
          title: "2. Tách nội dung hiển hiện và nội dung tiềm ẩn để tránh phóng đại",
          body:
            "Cảnh bạn thấy trong mơ là nội dung hiển hiện, còn cảm xúc và ham muốn mà nó chỉ đến là nội dung tiềm ẩn. Phân tâm học mạnh ở việc đọc hai lớp này riêng. Khi ghi lại cả sự kiện lẫn cảm giác mà cảnh ấy tạo ra, diễn giải trở nên cụ thể và gần thực tế hơn.",
        },
        {
          title: "3. Biểu tượng lặp lại có thể là căng thẳng chưa được giải quyết",
          body:
            "Những giấc mơ bị đuổi, thi cử hoặc trễ giờ thường nối với nhiệm vụ căng thẳng bị trì hoãn trong đời sống. Xem chúng như manh mối kiểm tra cấu trúc sống sẽ an toàn hơn gắn nhãn bệnh lý. Thiếu ngủ, quá tải công việc và xung đột quan hệ cũng cần được nhìn cùng lúc.",
        },
        {
          title: "4. Sau khi diễn giải, hãy gắn thêm hành động tự chăm sóc",
          body:
            "Giải mộng phân tâm học có thể chạm vào cảm xúc sâu, nên một thói quen ổn định ngắn sau đó sẽ hữu ích. Đi bộ, ghi cảm xúc hoặc trò chuyện với người tin cậy giúp quá trình phân tích an toàn hơn. Khi thấu hiểu đi cùng ổn định, chất lượng diễn giải giữ được lâu hơn.",
        },
        {
          title: "5. Đọc về quan hệ để đặt ranh giới, không chẩn đoán người khác",
          body:
            "Dù một người cụ thể xuất hiện thường xuyên trong mơ, dùng điều đó làm bằng chứng về họ có thể làm xung đột lớn hơn. Tốt hơn hãy hỏi mình thoải mái đến đâu và cần đặt ranh giới ở đâu. Mục đích là làm rõ ranh giới và nhu cầu của bạn, không phán xét người khác.",
        },
        {
          title: "6. Nếu khó chịu mạnh, hãy đi cùng hỗ trợ chuyên môn",
          body:
            "Giải mộng giúp tự hiểu, nhưng khi lo âu kéo dài hoặc rối loạn giấc ngủ đi kèm, tư vấn hay trị liệu chuyên môn sẽ an toàn hơn. Nếu ác mộng dữ dội lặp lại hoặc sinh hoạt hằng ngày suy giảm, đừng chỉ dựa vào tự diễn giải. Một cách đọc lành mạnh nằm trong hệ thống tự chăm sóc.",
        },
      ],
    },
    hi: {
      title: "मनोविश्लेषणात्मक स्वप्न व्याख्या - Freud Study | Code Destiny",
      h1: "मनोविश्लेषणात्मक स्वप्न व्याख्या",
      description:
        "फ्रायडीय प्रतीक विश्लेषण से स्वप्न में छिपे अचेतन संकेत और संबंध पैटर्न पढ़ने वाली गहन स्वप्न गाइड.",
      landingPoints: ["अचेतन प्रतीकों को संरचित करें", "संबंध पैटर्न पढ़ें", "आत्म-समझ के प्रश्न"],
      seoText:
        "मनोविश्लेषणात्मक स्वप्न व्याख्या स्वप्न को अचेतन की भाषा मानकर प्रतीकों और भावनात्मक प्रवाह को साथ पढ़ती है.",
      valueGuideTitle: "मनोविश्लेषणात्मक स्वप्न व्याख्या को सुरक्षित उपयोग करने के 6 सिद्धांत",
      valueSections: [
        {
          title: "1. फ्रायडीय पठन एक प्रश्न ढाँचा है, एक उत्तर की खोज नहीं",
          body:
            "इस पद्धति में स्वप्न प्रतीकों को स्थिर उत्तर नहीं, बल्कि इच्छा और चिंता को देखने वाले प्रश्नों की तरह उपयोग करना महत्त्वपूर्ण है. परिणाम को पूर्ण सत्य की तरह न लेकर वर्तमान भावनात्मक स्थिति की खोज का आरंभ मानें. इससे आत्म-लेबलिंग घटती है और स्वस्थ आत्म-समझ बनती है.",
        },
        {
          title: "2. प्रकट और गुप्त सामग्री अलग करने से अतिशयोक्ति घटती है",
          body:
            "स्वप्न में दिखा दृश्य प्रकट सामग्री है, और वह जिस भावना या इच्छा की ओर इशारा करता है वह गुप्त सामग्री है. मनोविश्लेषण इन्हें अलग पढ़ने में मजबूत है. केवल घटना नहीं, बल्कि उस दृश्य ने आपको कैसी भावना दी, यह लिखने से व्याख्या अधिक ठोस और वास्तविक बनती है.",
        },
        {
          title: "3. दोहराते प्रतीक दमन से अधिक अनसुलझे तनाव का संकेत हो सकते हैं",
          body:
            "पीछा किए जाने, परीक्षा या देर होने के स्वप्न अक्सर दैनिक जीवन के टाले हुए तनाव से जुड़ते हैं. उन्हें रोग की तरह तय करने के बजाय जीवन संरचना जाँचने का संकेत मानना सुरक्षित है. नींद की कमी, काम का बोझ और संबंध संघर्ष साथ देखने से आत्म-दोष कम होता है.",
        },
        {
          title: "4. व्याख्या के बाद आत्म-देखभाल अवश्य जोड़ें",
          body:
            "मनोविश्लेषणात्मक स्वप्न व्याख्या गहरी भावनाओं को छू सकती है, इसलिए बाद में छोटा स्थिरता अभ्यास अच्छा है. छोटी सैर, भावना लेखन या विश्वसनीय व्यक्ति से बात करना विश्लेषण को सुरक्षित रखता है. अंतर्दृष्टि और स्थिरता साथ चलें तो व्याख्या अधिक टिकती है.",
        },
        {
          title: "5. संबंध पठन दूसरों का निदान नहीं, सीमा तय करने के लिए उपयोग करें",
          body:
            "यदि कोई विशेष व्यक्ति बार-बार स्वप्न में आता है, तब भी इसे उसके बारे में प्रमाण बनाना संघर्ष बढ़ा सकता है. बेहतर है यह देखना कि आप संबंध में कहाँ सहज हैं और कहाँ सीमा चाहिए. उद्देश्य दूसरों का निर्णय नहीं, अपनी सीमा और ज़रूरत स्पष्ट करना है.",
        },
        {
          title: "6. असुविधा अधिक हो तो पेशेवर सहयोग साथ रखें",
          body:
            "स्वप्न व्याख्या आत्म-समझ में मदद करती है, पर लगातार चिंता या नींद की समस्या होने पर परामर्श या उपचार सुरक्षित है. यदि तीखे डर वाले स्वप्न दोहरें या दैनिक कामकाज घटे, तो केवल स्वयं की व्याख्या पर न टिकें. स्वस्थ पठन आत्म-देखभाल व्यवस्था के भीतर काम करता है.",
        },
      ],
    },
    es: {
      title: "Lectura psicoanalítica de sueños - Freud Study | Code Destiny",
      h1: "Lectura psicoanalítica de sueños",
      description:
        "Una guía profunda de sueños que lee señales inconscientes y patrones relacionales mediante análisis simbólico desde una mirada freudiana.",
      landingPoints: ["Estructurar símbolos inconscientes", "Interpretar patrones de relación", "Preguntas de autoconocimiento"],
      seoText:
        "La lectura psicoanalítica de sueños ve el sueño como lenguaje del inconsciente y analiza símbolos junto con el flujo emocional.",
      valueGuideTitle: "6 principios para usar la lectura psicoanalítica con seguridad",
      valueSections: [
        {
          title: "1. La lectura freudiana es un marco de preguntas, no una respuesta",
          body:
            "La lectura psicoanalítica funciona mejor cuando los símbolos se usan como preguntas sobre deseo y ansiedad, no como verdades fijas. Usa la interpretación como punto de partida para explorar tu estado emocional actual. Así se reduce la autoetiqueta y crece una comprensión más sana.",
        },
        {
          title: "2. Separar contenido manifiesto y latente evita exageraciones",
          body:
            "La escena vista en el sueño es contenido manifiesto; la emoción y el deseo que señala son contenido latente. El psicoanálisis es fuerte al leer esas capas por separado. Registrar lo que ocurrió y lo que sentiste vuelve la interpretación más concreta y realista.",
        },
        {
          title: "3. Los símbolos repetidos pueden señalar tensión no resuelta",
          body:
            "Sueños de persecución, examen o retraso suelen conectarse con tensiones postergadas de la vida diaria. Es más seguro verlos como pistas para revisar tu estructura de vida, no como patología. Sueño insuficiente, sobrecarga laboral y conflictos relacionales también deben mirarse.",
        },
        {
          title: "4. Añade autocuidado después de interpretar",
          body:
            "La lectura psicoanalítica puede tocar emociones profundas, por eso conviene una rutina sencilla de estabilización. Caminar, escribir emociones o hablar con alguien confiable ayuda a que el análisis sea seguro. La intuición dura más cuando camina con calma.",
        },
        {
          title: "5. Usa las lecturas relacionales para límites, no diagnósticos",
          body:
            "Aunque una persona aparezca mucho en un sueño, usarlo como evidencia sobre ella puede aumentar el conflicto. Es mejor preguntar dónde te sientes cómodo y dónde necesitas límites. El propósito no es juzgar a otros, sino aclarar tus límites y necesidades.",
        },
        {
          title: "6. Si el malestar es fuerte, acompáñalo con apoyo profesional",
          body:
            "La interpretación ayuda al autoconocimiento, pero ansiedad persistente o problemas de sueño requieren acompañamiento profesional. Si los sueños de miedo se repiten o cae el funcionamiento diario, no dependas solo de la autolectura. Una lectura sana vive dentro de un sistema de cuidado.",
        },
      ],
    },
    fr: {
      title: "Lecture psychanalytique des rêves - Freud Study | Code Destiny",
      h1: "Lecture psychanalytique des rêves",
      description:
        "Un guide d'interprétation approfondi qui lit les signaux inconscients et les schémas relationnels par analyse symbolique d'inspiration freudienne.",
      landingPoints: ["Structurer les symboles inconscients", "Lire les schémas relationnels", "Questions de connaissance de soi"],
      seoText:
        "La lecture psychanalytique considère le rêve comme langage de l'inconscient et analyse les symboles avec le flux émotionnel.",
      valueGuideTitle: "6 principes pour utiliser la lecture psychanalytique en sécurité",
      valueSections: [
        {
          title: "1. La lecture freudienne est un cadre de questions, pas une réponse",
          body:
            "La lecture psychanalytique fonctionne mieux lorsque les symboles servent à questionner désir et anxiété, non à fixer une vérité. Utilisez l'interprétation comme point de départ pour explorer votre état émotionnel actuel. Cela réduit l'auto-étiquetage et favorise une compréhension plus saine.",
        },
        {
          title: "2. Séparer contenu manifeste et latent limite l'exagération",
          body:
            "La scène vue dans le rêve est le contenu manifeste; l'émotion et le désir qu'elle indique sont le contenu latent. La psychanalyse sait lire ces couches séparément. Noter ce qui s'est passé et ce que cela a provoqué en vous rend la lecture plus concrète.",
        },
        {
          title: "3. Les symboles répétés peuvent signaler une tension non résolue",
          body:
            "Les rêves de poursuite, d'examen ou de retard se relient souvent à des tensions différées du quotidien. Il est plus sûr de les traiter comme des indices pour regarder votre structure de vie. Manque de sommeil, surcharge et conflits relationnels doivent aussi être considérés.",
        },
        {
          title: "4. Ajoutez un geste de soin après l'interprétation",
          body:
            "La lecture psychanalytique peut toucher des émotions profondes; une courte routine d'apaisement est donc utile. Marcher, écrire ses émotions ou parler à une personne fiable aide à garder l'analyse sûre. L'intuition dure mieux lorsqu'elle avance avec la stabilité.",
        },
        {
          title: "5. Utilisez les lectures relationnelles pour les limites, pas le diagnostic",
          body:
            "Même si une personne apparaît souvent en rêve, l'utiliser comme preuve sur elle peut augmenter le conflit. Mieux vaut demander où vous êtes à l'aise et où une limite est nécessaire. Le but n'est pas de juger l'autre, mais de clarifier vos besoins.",
        },
        {
          title: "6. Si le malaise est fort, avancez avec un soutien professionnel",
          body:
            "L'interprétation des rêves peut aider la connaissance de soi, mais une anxiété durable ou des troubles du sommeil demandent un accompagnement. Si les rêves effrayants se répètent ou que le quotidien se dégrade, ne restez pas seul avec l'autoanalyse. Une lecture saine s'inscrit dans un système de soin.",
        },
      ],
    },
    de: {
      title: "Psychoanalytische Traumdeutung - Freud Study | Code Destiny",
      h1: "Psychoanalytische Traumdeutung",
      description:
        "Ein tiefgehender Traumdeutungsleitfaden, der unbewusste Signale und Beziehungsmuster durch symbolische Analyse aus freudianischer Perspektive liest.",
      landingPoints: ["Unbewusste Symbole strukturieren", "Beziehungsmuster deuten", "Fragen zur Selbsterkenntnis"],
      seoText:
        "Psychoanalytische Traumdeutung versteht Träume als Sprache des Unbewussten und liest Symbole gemeinsam mit emotionalem Verlauf.",
      valueGuideTitle: "6 Prinzipien für sichere psychoanalytische Traumdeutung",
      valueSections: [
        {
          title: "1. Freudianisches Lesen ist ein Fragerahmen, keine Antwortsuche",
          body:
            "Psychoanalytische Traumdeutung funktioniert am besten, wenn Symbole Fragen zu Wunsch und Angst öffnen, statt feste Antworten zu liefern. Nutze die Deutung als Ausgangspunkt für deinen aktuellen Gefühlszustand. So vermeidest du Selbstetiketten und stärkst gesunde Selbsterkenntnis.",
        },
        {
          title: "2. Manifesten und latenten Inhalt zu trennen verhindert Übertreibung",
          body:
            "Die Traumszene selbst ist manifester Inhalt, die dahinterliegende Emotion und Sehnsucht ist latenter Inhalt. Psychoanalyse ist stark darin, beide Ebenen getrennt zu lesen. Wenn du notierst, was geschah und was es in dir auslöste, wird die Deutung konkreter.",
        },
        {
          title: "3. Wiederholte Symbole können ungelöste Spannung anzeigen",
          body:
            "Verfolgungs-, Prüfungs- oder Zuspätkommen-Träume hängen oft mit aufgeschobener Spannung im Alltag zusammen. Sicherer ist es, sie als Hinweise auf Lebensstruktur zu lesen, nicht als Pathologie. Schlafmangel, Überlastung und Beziehungskonflikte gehören mit in den Blick.",
        },
        {
          title: "4. Ergänze nach der Deutung Selbstfürsorge",
          body:
            "Psychoanalytische Traumdeutung kann tiefe Gefühle berühren, daher hilft danach eine kurze Stabilisierung. Ein Spaziergang, Gefühlsnotizen oder ein Gespräch mit einer vertrauten Person machen den Prozess sicherer. Einsicht bleibt länger, wenn sie mit Beruhigung verbunden ist.",
        },
        {
          title: "5. Beziehungsdeutungen dienen Grenzen, nicht Diagnosen",
          body:
            "Auch wenn eine bestimmte Person häufig im Traum erscheint, kann es Konflikte verstärken, daraus Beweise über sie zu machen. Frage lieber, wo du dich wohlfühlst und wo du Grenzen brauchst. Ziel ist nicht das Urteil über andere, sondern Klarheit über deine Bedürfnisse.",
        },
        {
          title: "6. Bei starkem Unwohlsein ziehe professionelle Hilfe hinzu",
          body:
            "Traumdeutung kann Selbsterkenntnis fördern, aber anhaltende Angst oder Schlafstörungen brauchen professionelle Begleitung. Wenn starke Angstträume wiederkehren oder der Alltag leidet, verlasse dich nicht nur auf Selbstdeutung. Gesunde Deutung gehört in ein Fürsorgesystem.",
        },
      ],
    },
    nl: {
      title: "Psychoanalytische droomduiding - Freud Study | Code Destiny",
      h1: "Psychoanalytische droomduiding",
      description:
        "Een diepgaande droomgids die onbewuste signalen en relatiepatronen leest via symbolische analyse vanuit freudiaans perspectief.",
      landingPoints: ["Onbewuste symbolen structureren", "Relatiepatronen duiden", "Vragen voor zelfinzicht"],
      seoText:
        "Psychoanalytische droomduiding ziet dromen als taal van het onbewuste en leest symbolen samen met emotionele stroom.",
      valueGuideTitle: "6 principes om psychoanalytische droomduiding veilig te gebruiken",
      valueSections: [
        {
          title: "1. Freudiaans lezen is een vragenkader, geen zoektocht naar één antwoord",
          body:
            "Psychoanalytische droomduiding werkt het best wanneer symbolen vragen openen over verlangen en angst, niet als vaste antwoorden. Gebruik de interpretatie als startpunt om je huidige emotionele toestand te verkennen. Zo voorkom je zelflabels en groeit gezonder zelfinzicht.",
        },
        {
          title: "2. Manifest en latent inhoud scheiden voorkomt overdrijving",
          body:
            "De scène in de droom is manifeste inhoud; de emotie en wens erachter is latente inhoud. Psychoanalyse is sterk in het apart lezen van die lagen. Noteer niet alleen wat gebeurde, maar ook wat het in je opriep, dan wordt de duiding concreter.",
        },
        {
          title: "3. Herhaalde symbolen kunnen onopgeloste spanning tonen",
          body:
            "Dromen over achtervolging, examens of te laat komen hangen vaak samen met uitgestelde spanning in het dagelijks leven. Lees ze veiliger als aanwijzing om je leefstructuur te bekijken, niet als pathologie. Slaaptekort, werkdruk en relatieconflict horen meegewogen te worden.",
        },
        {
          title: "4. Voeg na interpretatie zelfzorg toe",
          body:
            "Psychoanalytische droomduiding kan diepe emoties raken, dus een korte stabiliserende routine is zinvol. Wandelen, emoties opschrijven of praten met iemand die je vertrouwt maakt het proces veiliger. Inzicht blijft langer wanneer het samen gaat met rust.",
        },
        {
          title: "5. Relatieduiding is voor grenzen, niet voor diagnoses",
          body:
            "Ook als een specifieke persoon vaak in je droom verschijnt, kan het conflict vergroten om dat als bewijs over die persoon te gebruiken. Vraag liever waar jij je prettig voelt en waar je grenzen nodig hebt. Het doel is jouw grenzen en behoeften helder maken.",
        },
        {
          title: "6. Bij sterke spanning hoort professionele steun",
          body:
            "Droomduiding kan zelfinzicht helpen, maar aanhoudende angst of slaapklachten verdienen professionele begeleiding. Als angstige dromen blijven terugkomen of dagelijks functioneren daalt, vertrouw dan niet alleen op zelfinterpretatie. Gezonde duiding werkt binnen een zorgstructuur.",
        },
      ],
    },
    ms: {
      title: "Tafsiran mimpi psikoanalitik - Freud Study | Code Destiny",
      h1: "Tafsiran mimpi psikoanalitik",
      description:
        "Panduan tafsir mimpi mendalam yang membaca isyarat bawah sedar dan pola hubungan melalui analisis simbolik dari perspektif Freud.",
      landingPoints: ["Susun simbol bawah sedar", "Tafsir pola hubungan", "Soalan pemahaman diri"],
      seoText:
        "Tafsiran mimpi psikoanalitik melihat mimpi sebagai bahasa bawah sedar dan membaca simbol bersama aliran emosi.",
      valueGuideTitle: "6 prinsip menggunakan tafsiran mimpi psikoanalitik dengan selamat",
      valueSections: [
        {
          title: "1. Bacaan Freud ialah rangka soalan, bukan mencari satu jawapan",
          body:
            "Tafsiran mimpi psikoanalitik paling berguna apabila simbol digunakan sebagai soalan tentang keinginan dan kegelisahan, bukan jawapan tetap. Jadikan tafsiran sebagai titik mula meneroka emosi semasa. Ini mengurangkan label diri dan menyokong pemahaman diri yang lebih sihat.",
        },
        {
          title: "2. Memisahkan kandungan nyata dan tersembunyi mengurangkan keterlaluan",
          body:
            "Adegan yang dilihat dalam mimpi ialah kandungan nyata, manakala emosi dan keinginan yang ditunjuk ialah kandungan tersembunyi. Psikoanalisis kuat dalam membaca dua lapisan ini secara berasingan. Catat apa yang berlaku dan apa yang anda rasa supaya tafsiran lebih konkrit.",
        },
        {
          title: "3. Simbol berulang mungkin menandakan ketegangan belum selesai",
          body:
            "Mimpi dikejar, peperiksaan atau lewat sering berkaitan ketegangan harian yang tertangguh. Lebih selamat melihatnya sebagai petunjuk menyemak struktur hidup, bukan penyakit. Kurang tidur, beban kerja dan konflik hubungan juga perlu dipertimbangkan bersama.",
        },
        {
          title: "4. Tambahkan penjagaan diri selepas tafsiran",
          body:
            "Tafsiran mimpi psikoanalitik boleh menyentuh emosi mendalam, jadi rutin menenangkan yang ringkas selepasnya amat membantu. Berjalan, menulis emosi atau bercakap dengan orang dipercayai menjadikan analisis lebih selamat. Wawasan bertahan lebih lama apabila disertai kestabilan.",
        },
        {
          title: "5. Bacaan hubungan digunakan untuk sempadan, bukan diagnosis orang lain",
          body:
            "Walaupun seseorang sering muncul dalam mimpi, menggunakannya sebagai bukti tentang orang itu boleh membesarkan konflik. Lebih baik tanya di mana anda selesa dan di mana sempadan diperlukan. Tujuannya bukan menilai orang lain, tetapi menjelaskan sempadan dan keperluan anda.",
        },
        {
          title: "6. Jika rasa tidak selesa kuat, gabungkan dengan sokongan profesional",
          body:
            "Tafsir mimpi membantu pemahaman diri, tetapi kebimbangan berpanjangan atau gangguan tidur memerlukan sokongan profesional. Jika mimpi menakutkan berulang atau fungsi harian menurun, jangan bergantung pada tafsiran sendiri sahaja. Bacaan sihat bergerak dalam sistem penjagaan diri.",
        },
      ],
    },
  },
  valueGuideTitle: dreamPsychoText("valueGuide.title"),
  valueSections: [
    {
      title: dreamPsychoText("value.1.title"),
      body:
        "정신분석 해몽은 꿈의 상징을 하나의 정답으로 고정하기보다, 내 욕구와 불안을 점검하는 질문 틀로 사용하는 것이 핵심입니다. 해석 결과를 절대 진실로 받아들이기보다 현재의 정서 상태를 탐색하는 출발점으로 쓰면 과도한 자기낙인을 줄이고 건강한 자기이해로 이어질 수 있습니다.",
    },
    {
      title: dreamPsychoText("value.2.title"),
      body:
        "꿈에서 본 장면 자체는 표면내용이고, 그 장면이 가리키는 감정과 욕구는 잠재내용입니다. 정신분석은 이 둘을 분리해 읽는 데 강점이 있습니다. 사건 묘사에만 머물지 말고 \"이 장면이 내게 어떤 감정 반응을 만들었는가\"를 함께 기록하면 해석이 더 구체적이고 현실 친화적으로 변합니다.",
    },
    {
      title: dreamPsychoText("value.3.title"),
      body:
        "좇기는 꿈, 시험 꿈, 늦는 꿈처럼 반복되는 상징은 종종 일상에서 미뤄둔 긴장 과제와 연결됩니다. 이를 병리적으로 단정하기보다 생활 구조를 점검하는 단서로 보는 것이 안전합니다. 수면 부족, 업무 과밀, 관계 갈등 같은 현실 요인을 함께 확인하면 해석이 과도한 자기비난으로 흐르지 않습니다.",
    },
    {
      title: dreamPsychoText("value.4.title"),
      body:
        "정신분석 해몽은 감정을 깊게 건드릴 수 있으므로, 해석 직후 간단한 안정 루틴을 갖는 것이 좋습니다. 짧은 산책, 감정 기록, 신뢰하는 사람과의 대화처럼 신체·관계 차원의 회복 행동을 붙이면 분석 과정이 안전해집니다. 통찰과 안정이 같이 갈 때 해석의 질이 오래 유지됩니다.",
    },
    {
      title: dreamPsychoText("value.5.title"),
      body:
        "꿈에 특정 인물이 자주 등장해도 상대를 단정하는 근거로 사용하면 갈등이 커질 수 있습니다. 대신 내가 관계에서 어디까지 허용하고 어디서 경계를 세워야 편안한지 점검하는 데 쓰는 것이 바람직합니다. 정신분석 해몽의 목적은 타인 판단이 아니라 자기 경계와 욕구를 명확히 하는 데 있습니다.",
    },
    {
      title: dreamPsychoText("value.6.title"),
      body:
        "꿈해몽은 자기이해 도구이지만, 지속적인 불안이나 수면장애가 동반될 때는 전문 상담·치료와 병행하는 것이 안전합니다. 특히 강한 공포 꿈이 반복되거나 일상 기능이 떨어지는 경우에는 자가 해석만으로 버티지 말고 도움을 요청하는 것이 중요합니다. 건강한 해석은 자기돌봄 체계 안에서 작동합니다.",
    },
  ],
};

export default function DreamPsychoLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
