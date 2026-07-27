import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const ANIMAL_PHYSIO_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "전문가 동물 관상 - 셀카 얼굴 분석 가이드",
    "meta.description": "얼굴형, 표정, 분위기 신호를 동물 비유로 해석해 자기표현과 관계 소통 힌트를 제공하는 동물관상 페이지입니다.",
    "service.h1": "전문가 동물 관상",
    "service.seoText": "동물 관상은 얼굴 신호를 재미있는 동물 비유로 번역해 자기이해와 관계 소통에 활용하는 서비스입니다.",
    "valueGuide.title": "동물 관상을 건강하게 읽는 6가지 방법",
    "value.1.title": "1. 동물 관상은 낙인이 아니라 표현 언어입니다",
    "value.2.title": "2. 얼굴형보다 표정과 시선 습관이 더 큰 영향을 줍니다",
    "value.3.title": "3. 강점 신호와 과잉 신호를 분리해 보세요",
    "value.4.title": "4. 관계 개선은 궁합 점수보다 대화 톤 조정이 먼저입니다",
    "value.5.title": "5. 사진 조건을 통일하면 분석 일관성이 올라갑니다",
    "value.6.title": "6. 결과는 자기비난이 아니라 자기설계로 연결하세요",
  },
  en: {
    "meta.title": "AI Animal Physiognomy - Selfie Face Reading Guide",
    "meta.description": "An animal physiognomy page that interprets face shape, expression, and aura signals through animal metaphors, offering clues for self-expression and relationship communication.",
    "service.h1": "AI Animal Physiognomy",
    "service.seoText": "Animal physiognomy translates facial signals into friendly animal metaphors, helping you use them for self-understanding and clearer communication.",
    "valueGuide.title": "Six Healthy Ways to Read Animal Physiognomy",
    "value.1.title": "1. Animal physiognomy is a language of expression, not a label",
    "value.2.title": "2. Expression and eye-contact habits matter more than face shape",
    "value.3.title": "3. Separate strength signals from overextended signals",
    "value.4.title": "4. Relationship improvement begins with tone, not compatibility scores",
    "value.5.title": "5. Consistent photo conditions make the reading more stable",
    "value.6.title": "6. Turn the result into self-design, not self-criticism",
  },
};

function animalPhysioText(key: keyof typeof ANIMAL_PHYSIO_TEXT_TRANSLATIONS.ko) {
  return ANIMAL_PHYSIO_TEXT_TRANSLATIONS.ko[key] || ANIMAL_PHYSIO_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/animal/physio",
  title: animalPhysioText("meta.title"),
  description: animalPhysioText("meta.description"),
  keywords: ["동물 관상", "전문가 관상", "얼굴형 분석", "animal physiognomy", "셀카 관상"],
  image: "https://code-destiny.com/fuctionassets/ai%20animal.webp",
  featureList: ["셀카 기반 분석", "동물 비유 해석", "소통 힌트 제공"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: animalPhysioText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: animalPhysioText("service.seoText"),
  localized: {
    en: {
      title: "AI Animal Physiognomy - Selfie Face Reading Guide",
      h1: "AI Animal Physiognomy",
      description:
        "An animal physiognomy page that interprets face shape, expression, and aura signals through animal metaphors, offering clues for self-expression and relationship communication.",
      landingPoints: ["Selfie-based reading", "Animal metaphor interpretation", "Communication guidance"],
      seoText:
        "Animal physiognomy translates facial signals into friendly animal metaphors, helping you use them for self-understanding and clearer communication.",
      valueGuideTitle: "Six Healthy Ways to Read Animal Physiognomy",
      valueSections: [
        {
          title: "1. Animal physiognomy is a language of expression, not a label",
          body:
            "Animal metaphors are not meant to confine a person to a fixed diagnosis. They work better as an intuitive language for describing complex impressions. When you read the result as observation material, rather than as a final statement of who you are, it can help you shape how you present yourself.",
        },
        {
          title: "2. Expression and eye-contact habits matter more than face shape",
          body:
            "Even with the same face shape, tension in the expression, eye-contact rhythm, and mouth movement while speaking can change the impression greatly. Read the result together with nonverbal habits you can adjust, not as a fixed anatomical verdict. Small changes in expression often shift how relationships feel.",
        },
        {
          title: "3. Separate strength signals from overextended signals",
          body:
            "A strong leadership impression can feel burdensome in some settings, while a gentle impression may be mistaken for indecision. It helps to divide the reading into strengths and possible misunderstanding points when that strength becomes too strong. This makes image strategy more practical for interviews, first meetings, and collaboration.",
        },
        {
          title: "4. Relationship improvement begins with tone, not compatibility scores",
          body:
            "Animal physiognomy compatibility is playful, but real relationship improvement starts with tone of voice, response timing, and the way questions are asked. When you notice the moment someone becomes defensive, lowering the intensity and adding checking questions can change the outcome. The reading is most useful as a clue for designing better conversations.",
        },
        {
          title: "5. Consistent photo conditions make the reading more stable",
          body:
            "Lighting, angle, and expression can create wide variation in the result. A front-facing photo in natural light with a neutral expression makes it easier to compare changes. Animal physiognomy becomes more useful as a self-image tool when you check it periodically under similar conditions.",
        },
        {
          title: "6. Turn the result into self-design, not self-criticism",
          body:
            "No animal type is superior or inferior. What matters is knowing where that impression helps you and where it may cause misunderstanding. By adjusting your introduction, profile photo, or first conversation line from the reading, the content can move beyond curiosity into practical communication.",
        },
      ],
    },
    ja: {
      title: "AI動物人相 - セルフィー顔分析ガイド",
      h1: "AI動物人相",
      description:
        "顔立ち、表情、雰囲気のサインを動物の比喩で読み解き、自己表現と人間関係のコミュニケーションに役立つヒントを届ける動物人相ページです。",
      landingPoints: ["セルフィーをもとにした分析", "動物の比喩による読み解き", "コミュニケーションのヒント"],
      seoText:
        "動物人相は、顔にあらわれるサインを親しみやすい動物の言葉へ映し、自分らしい表現と人間関係の対話に生かす占いです。",
      valueGuideTitle: "動物人相を健やかに読む6つの方法",
      valueSections: [
        {
          title: "1. 動物人相は決めつけではなく、表現の言葉です",
          body:
            "動物の比喩は、人を固定された型に閉じ込める診断ではありません。複雑な印象を直感的に言い表すための言葉として扱うと、ずっと自然に働きます。結果を「私はこういう人」と決めつけるのではなく、「相手にはこう映ることがあるのだ」と受け取ると、自己表現を整える助けになります。",
        },
        {
          title: "2. 顔立ちよりも表情と視線の癖が大きく響きます",
          body:
            "同じ顔立ちでも、表情のこわばり、目線の合わせ方、話すときの口元の動きによって印象は大きく変わります。人相の結果を変えられない形だけで見ず、調整できる非言語の癖と重ねて読んでください。小さな表情の整え方だけで、関係の受け止められ方がやわらぐことがあります。",
        },
        {
          title: "3. 強みのサインと出過ぎたサインを分けて見ましょう",
          body:
            "リーダーシップの印象が強い人も、場面によっては圧に見えることがあります。やわらかな印象も、ときに優柔不断と受け取られるかもしれません。だからこそ結果は「強み」と「強く出たときの誤解ポイント」に分けて読むと、面接、初対面、仕事の場面で現実的に生かせます。",
        },
        {
          title: "4. 関係改善は相性点より会話の温度調整から始まります",
          body:
            "動物人相の相性は楽しい要素ですが、実際の関係を整える鍵は、話し方、返事の速さ、質問の仕方にあらわれます。相手が身構える瞬間に気づき、言葉の強さを少し下げ、確認の質問を増やすだけでも流れは変わります。人相の結果は、会話を設計するヒントとして使うとよく生きます。",
        },
        {
          title: "5. 写真条件をそろえると読みの安定感が高まります",
          body:
            "光、角度、表情が大きく違うと、結果にも揺れが出やすくなります。正面、自然光、落ち着いた表情を基準にして比べると、変化のポイントが見えやすくなります。動物人相は一度きりの遊びで終わらせるより、同じ条件で時々見直すほど自己イメージの整え方に役立ちます。",
        },
        {
          title: "6. 結果は自分を責めるためではなく、自分を整えるために使います",
          body:
            "どの動物タイプが出ても、そこに優劣はありません。大切なのは、その印象がどんな場面で味方になり、どんな場面で誤解を呼びやすいかを知ることです。結果をもとに自己紹介、プロフィール写真、最初の一言を少し整えると、占いはただの興味から実際のコミュニケーションの力へ変わっていきます。",
        },
      ],
    },
    "zh-CN": {
      title: "AI动物面相 - 自拍脸部分析指南",
      h1: "AI动物面相",
      description:
        "通过动物隐喻解读脸型、表情与气质信号，为自我表达和关系沟通提供线索的动物面相页面。",
      landingPoints: ["基于自拍的分析", "动物隐喻解读", "沟通提示"],
      seoText:
        "动物面相把脸部信号转化为亲切的动物隐喻，帮助你用于自我理解与关系沟通。",
      valueGuideTitle: "健康阅读动物面相的6种方法",
      valueSections: [
        {
          title: "1. 动物面相是表达语言，而不是标签",
          body:
            "动物隐喻不是为了把人固定在某种诊断里，而是用直观语言说明复杂印象。与其把结果当成「我本来就是这样的人」，不如把它当作「别人可能这样感受到我」的观察材料。这样更能帮助你调整自我表达。",
        },
        {
          title: "2. 表情与视线习惯往往比脸型更有影响",
          body:
            "即使脸型相同，表情紧张度、眼神接触频率、说话时嘴角的动作也会明显改变印象。不要只把面相结果看成固定的外形判断，而要和可以调整的非语言习惯一起阅读。细微的表情调整，常常能让关系感受发生变化。",
        },
        {
          title: "3. 区分优势信号与过度信号",
          body:
            "领导感强的人在某些场合也可能显得有压力，柔和印象也可能被误读为犹豫。因此，把结果分成「优势」与「过强时的误解点」会更实用。这个区分能帮助你在面试、初次见面和协作会议中制定更现实的印象策略。",
        },
        {
          title: "4. 改善关系先调整语气，而不是盯着相性分数",
          body:
            "动物面相的相性有趣，但真实的关系改善从说话方式、回应速度和提问方式开始。当你观察到对方开始防御时，降低表达强度并增加确认式提问，同样的组合也会出现不同结果。面相结果作为对话设计的提示时最有效。",
        },
        {
          title: "5. 统一拍照条件会提高分析一致性",
          body:
            "光线、角度和表情差异过大时，结果也容易波动。用正面、自然光、平静表情作为基准拍摄再比较，更容易看见变化点。动物面相不只是一场趣味测试，定期在相同条件下检查时，更能成为自我形象管理工具。",
        },
        {
          title: "6. 把结果连接到自我设计，而不是自我批评",
          body:
            "无论出现哪种动物类型，都没有高低之分。重要的是知道这种印象在哪些场合有利，在哪些场合容易引起误会。根据结果调整自我介绍、头像照片或第一句话，面相内容就能从单纯兴趣走向实际沟通成果。",
        },
      ],
    },
    "zh-TW": {
      title: "AI動物面相 - 自拍臉部分析指南",
      h1: "AI動物面相",
      description:
        "透過動物隱喻解讀臉型、表情與氣質訊號，為自我表達和關係溝通提供線索的動物面相頁面。",
      landingPoints: ["基於自拍的分析", "動物隱喻解讀", "溝通提示"],
      seoText:
        "動物面相把臉部訊號轉化為親切的動物隱喻，幫助你用於自我理解與關係溝通。",
      valueGuideTitle: "健康閱讀動物面相的6種方法",
      valueSections: [
        {
          title: "1. 動物面相是表達語言，而不是標籤",
          body:
            "動物隱喻不是為了把人固定在某種診斷裡，而是用直覺語言說明複雜印象。與其把結果當成「我本來就是這樣的人」，不如把它當作「別人可能這樣感受到我」的觀察材料。這樣更能幫助你調整自我表達。",
        },
        {
          title: "2. 表情與視線習慣往往比臉型更有影響",
          body:
            "即使臉型相同，表情緊張度、眼神接觸頻率、說話時嘴角的動作也會明顯改變印象。不要只把面相結果看成固定的外形判斷，而要和可以調整的非語言習慣一起閱讀。細微的表情調整，常常能讓關係感受發生變化。",
        },
        {
          title: "3. 區分優勢訊號與過度訊號",
          body:
            "領導感強的人在某些場合也可能顯得有壓力，柔和印象也可能被誤讀為猶豫。因此，把結果分成「優勢」與「過強時的誤解點」會更實用。這個區分能幫助你在面試、初次見面和協作會議中制定更現實的印象策略。",
        },
        {
          title: "4. 改善關係先調整語氣，而不是盯著相性分數",
          body:
            "動物面相的相性有趣，但真實的關係改善從說話方式、回應速度和提問方式開始。當你觀察到對方開始防禦時，降低表達強度並增加確認式提問，同樣的組合也會出現不同結果。面相結果作為對話設計的提示時最有效。",
        },
        {
          title: "5. 統一拍照條件會提高分析一致性",
          body:
            "光線、角度和表情差異過大時，結果也容易波動。用正面、自然光、平靜表情作為基準拍攝再比較，更容易看見變化點。動物面相不只是一場趣味測試，定期在相同條件下檢查時，更能成為自我形象管理工具。",
        },
        {
          title: "6. 把結果連接到自我設計，而不是自我批評",
          body:
            "無論出現哪種動物類型，都沒有高低之分。重要的是知道這種印象在哪些場合有利，在哪些場合容易引起誤會。根據結果調整自我介紹、頭像照片或第一句話，面相內容就能從單純興趣走向實際溝通成果。",
        },
      ],
    },
    vi: {
      title: "Nhân tướng động vật AI - Hướng dẫn đọc khuôn mặt qua selfie",
      h1: "Nhân tướng động vật AI",
      description:
        "Trang nhân tướng động vật diễn giải dáng mặt, biểu cảm và khí chất bằng ẩn dụ động vật, gợi mở cách thể hiện bản thân và giao tiếp trong các mối quan hệ.",
      landingPoints: ["Phân tích dựa trên selfie", "Diễn giải bằng ẩn dụ động vật", "Gợi ý giao tiếp"],
      seoText:
        "Nhân tướng động vật chuyển tín hiệu gương mặt thành những ẩn dụ động vật gần gũi, giúp bạn hiểu mình và giao tiếp rõ hơn.",
      valueGuideTitle: "6 cách đọc nhân tướng động vật một cách lành mạnh",
      valueSections: [
        {
          title: "1. Nhân tướng động vật là ngôn ngữ biểu đạt, không phải nhãn dán",
          body:
            "Ẩn dụ động vật không nhằm nhốt một người vào chẩn đoán cố định. Nó giống một ngôn ngữ trực giác để mô tả ấn tượng phức tạp. Khi đọc kết quả như dữ liệu quan sát thay vì kết luận cuối cùng về bản thân, bạn sẽ dễ xây dựng chiến lược thể hiện mình hơn.",
        },
        {
          title: "2. Biểu cảm và thói quen ánh mắt ảnh hưởng hơn dáng mặt",
          body:
            "Cùng một dáng mặt, độ căng của biểu cảm, tần suất nhìn vào mắt và chuyển động khóe miệng khi nói vẫn có thể làm ấn tượng thay đổi nhiều. Hãy đọc kết quả cùng những thói quen phi ngôn ngữ có thể điều chỉnh. Chỉ một chỉnh sửa nhỏ ở biểu cảm cũng có thể làm cảm giác trong quan hệ mềm lại.",
        },
        {
          title: "3. Tách tín hiệu thế mạnh khỏi tín hiệu bị đẩy quá mức",
          body:
            "Ấn tượng lãnh đạo mạnh có thể trở thành áp lực trong vài hoàn cảnh, còn nét mềm mại đôi khi bị hiểu là thiếu quyết đoán. Vì vậy hãy chia kết quả thành thế mạnh và điểm dễ gây hiểu lầm khi thế mạnh ấy đi quá đà. Cách đọc này giúp bạn thực tế hơn trong phỏng vấn, buổi gặp đầu và làm việc nhóm.",
        },
        {
          title: "4. Cải thiện quan hệ bắt đầu từ giọng điệu, không phải điểm hợp",
          body:
            "Độ hợp trong nhân tướng động vật có yếu tố vui, nhưng quan hệ thật sự thay đổi từ cách nói, tốc độ phản hồi và kiểu đặt câu hỏi. Khi thấy đối phương bắt đầu phòng thủ, hãy giảm cường độ lời nói và thêm câu hỏi xác nhận. Kết quả hữu ích nhất khi được dùng như gợi ý thiết kế cuộc trò chuyện.",
        },
        {
          title: "5. Điều kiện ảnh nhất quán giúp phân tích ổn định hơn",
          body:
            "Ánh sáng, góc chụp và biểu cảm thay đổi mạnh có thể làm kết quả dao động. Ảnh chính diện, ánh sáng tự nhiên và biểu cảm bình tĩnh giúp bạn so sánh điểm thay đổi rõ hơn. Nhân tướng động vật hữu ích hơn khi được kiểm tra định kỳ trong cùng điều kiện.",
        },
        {
          title: "6. Dùng kết quả để tự thiết kế, không phải tự trách mình",
          body:
            "Không có kiểu động vật nào cao hơn hay thấp hơn. Điều quan trọng là hiểu ấn tượng ấy thuận lợi trong tình huống nào và dễ gây hiểu lầm ở đâu. Từ đó bạn có thể điều chỉnh lời giới thiệu, ảnh hồ sơ hoặc câu mở đầu để biến nội dung này thành kỹ năng giao tiếp thực tế.",
        },
      ],
    },
    hi: {
      title: "AI एनिमल फेस रीडिंग - सेल्फी चेहरा विश्लेषण गाइड",
      h1: "AI एनिमल फेस रीडिंग",
      description:
        "चेहरे के आकार, भाव और आभा संकेतों को पशु रूपकों के माध्यम से पढ़कर आत्म-अभिव्यक्ति और संबंध संवाद के संकेत देने वाला पेज.",
      landingPoints: ["सेल्फी-आधारित विश्लेषण", "पशु रूपक व्याख्या", "संवाद संकेत"],
      seoText:
        "एनिमल फेस रीडिंग चेहरे के संकेतों को सहज पशु रूपकों में बदलती है, जिससे आत्म-समझ और स्पष्ट संवाद में सहायता मिलती है.",
      valueGuideTitle: "एनिमल फेस रीडिंग को स्वस्थ ढंग से पढ़ने के 6 तरीके",
      valueSections: [
        {
          title: "1. एनिमल फेस रीडिंग लेबल नहीं, अभिव्यक्ति की भाषा है",
          body:
            "पशु रूपक किसी व्यक्ति को स्थिर निदान में बंद करने के लिए नहीं हैं. वे जटिल प्रभावों को सहज भाषा में समझाने का साधन हैं. परिणाम को अंतिम सत्य की तरह नहीं, बल्कि इस संकेत की तरह पढ़ें कि दूसरे आपको कैसे महसूस कर सकते हैं. इससे आत्म-अभिव्यक्ति को सँवारने में सहायता मिलती है.",
        },
        {
          title: "2. चेहरे के आकार से अधिक भाव और नज़र की आदत असर डालती है",
          body:
            "एक जैसे चेहरे के आकार के बावजूद भावों का तनाव, आँख मिलाने की लय और बोलते समय होंठों की गति प्रभाव को बदल सकती है. परिणाम को केवल स्थिर शारीरिक निर्णय न मानें; उसे उन गैर-मौखिक आदतों के साथ पढ़ें जिन्हें बदला जा सकता है. छोटे भाव-संशोधन भी संबंधों का अनुभव नरम कर सकते हैं.",
        },
        {
          title: "3. शक्ति संकेत और अति संकेत अलग-अलग देखें",
          body:
            "मजबूत नेतृत्व प्रभाव कुछ स्थितियों में दबाव जैसा लग सकता है, और कोमल प्रभाव कभी-कभी अनिर्णय समझा जा सकता है. इसलिए परिणाम को ताकत और अति होने पर संभावित भ्रम में बाँटना उपयोगी है. इससे इंटरव्यू, पहली मुलाकात और सहयोगी बैठकों में छवि रणनीति अधिक व्यावहारिक बनती है.",
        },
        {
          title: "4. संबंध सुधार संगतता अंक से पहले बातचीत के स्वर से शुरू होता है",
          body:
            "एनिमल फेस रीडिंग की संगतता रोचक है, पर वास्तविक सुधार बोलने के ढंग, उत्तर देने की गति और प्रश्न पूछने के तरीके से शुरू होता है. जब सामने वाला रक्षात्मक हो, शब्दों की तीव्रता घटाएँ और पुष्टिकरण प्रश्न बढ़ाएँ. यह रीडिंग बातचीत को बेहतर बनाने के संकेत के रूप में सबसे उपयोगी होती है.",
        },
        {
          title: "5. समान फोटो स्थितियाँ विश्लेषण को स्थिर बनाती हैं",
          body:
            "रोशनी, कोण और भाव बहुत बदलें तो परिणाम भी बदल सकता है. सामने से, प्राकृतिक प्रकाश में और शांत भाव के साथ ली गई तस्वीर तुलना को अधिक स्पष्ट बनाती है. समान स्थितियों में समय-समय पर देखना इसे आत्म-छवि प्रबंधन का उपयोगी साधन बनाता है.",
        },
        {
          title: "6. परिणाम को आत्म-आलोचना नहीं, आत्म-रचना से जोड़ें",
          body:
            "किसी भी पशु प्रकार में श्रेष्ठ या हीन अर्थ नहीं है. महत्वपूर्ण यह जानना है कि वह प्रभाव कहाँ सहायक है और कहाँ गलतफहमी बना सकता है. परिणाम के आधार पर परिचय, प्रोफ़ाइल फोटो या पहली पंक्ति सँवारें, तो यह सामग्री व्यवहारिक संवाद कौशल में बदल सकती है.",
        },
      ],
    },
    es: {
      title: "Fisonomía animal con IA - Guía de lectura facial por selfie",
      h1: "Fisonomía animal con IA",
      description:
        "Una página de fisonomía animal que interpreta forma del rostro, expresión y señales de presencia mediante metáforas animales para orientar la autoexpresión y la comunicación.",
      landingPoints: ["Análisis desde selfie", "Interpretación con metáforas animales", "Pistas de comunicación"],
      seoText:
        "La fisonomía animal traduce señales del rostro en metáforas animales cercanas para favorecer el autoconocimiento y una comunicación más clara.",
      valueGuideTitle: "6 formas sanas de leer la fisonomía animal",
      valueSections: [
        {
          title: "1. La fisonomía animal es lenguaje de expresión, no etiqueta",
          body:
            "Las metáforas animales no buscan encerrar a una persona en un diagnóstico fijo. Funcionan mejor como un lenguaje intuitivo para describir impresiones complejas. Si lees el resultado como material de observación y no como sentencia final sobre quién eres, puede ayudarte a ordenar tu forma de presentarte.",
        },
        {
          title: "2. La expresión y la mirada pesan más que la forma del rostro",
          body:
            "Con la misma forma facial, la tensión del gesto, el ritmo de contacto visual y el movimiento de la boca al hablar pueden cambiar mucho la impresión. Lee el resultado junto a hábitos no verbales que sí puedes ajustar. Pequeños cambios de expresión suelen modificar la sensación en las relaciones.",
        },
        {
          title: "3. Separa señales de fortaleza y señales excesivas",
          body:
            "Una impresión de liderazgo puede sentirse pesada en algunos contextos, y una imagen amable puede confundirse con indecisión. Por eso conviene separar el resultado en fortalezas y posibles malentendidos cuando esa fortaleza se intensifica. Esta lectura ayuda en entrevistas, primeras citas y colaboración.",
        },
        {
          title: "4. Mejorar vínculos empieza por el tono, no por la puntuación",
          body:
            "La compatibilidad de fisonomía animal es entretenida, pero la mejora real empieza con el tono, el tiempo de respuesta y la forma de preguntar. Cuando notas que la otra persona se defiende, bajar la intensidad y sumar preguntas de confirmación cambia el clima. La lectura es más útil como guía para diseñar conversaciones.",
        },
        {
          title: "5. Mantener condiciones de foto mejora la estabilidad",
          body:
            "La luz, el ángulo y la expresión pueden alterar bastante el resultado. Una foto frontal, con luz natural y expresión tranquila, permite comparar mejor los cambios. La fisonomía animal gana valor como herramienta de imagen personal cuando se revisa de forma periódica bajo condiciones similares.",
        },
        {
          title: "6. Usa el resultado para diseñarte, no para criticarte",
          body:
            "Ningún tipo animal es superior o inferior. Lo importante es saber en qué situaciones esa impresión te favorece y dónde puede generar confusión. Al ajustar tu presentación, foto de perfil o primera frase desde la lectura, el contenido pasa de la curiosidad a una comunicación más efectiva.",
        },
      ],
    },
    fr: {
      title: "Physiognomonie animale IA - Guide d'analyse du visage par selfie",
      h1: "Physiognomonie animale IA",
      description:
        "Une page de physiognomonie animale qui lit la forme du visage, l'expression et les signaux d'aura par métaphores animales, avec des pistes pour l'expression de soi et la communication.",
      landingPoints: ["Analyse à partir d'un selfie", "Lecture par métaphores animales", "Conseils de communication"],
      seoText:
        "La physiognomonie animale traduit les signaux du visage en métaphores animales accessibles pour mieux se comprendre et communiquer.",
      valueGuideTitle: "6 manières saines de lire la physiognomonie animale",
      valueSections: [
        {
          title: "1. La physiognomonie animale est un langage, pas une étiquette",
          body:
            "Les métaphores animales ne servent pas à enfermer une personne dans un diagnostic fixe. Elles décrivent plutôt des impressions complexes avec une langue intuitive. En lisant le résultat comme une matière d'observation, et non comme une vérité définitive sur vous, vous pouvez ajuster votre manière de vous présenter.",
        },
        {
          title: "2. L'expression et le regard comptent plus que la forme du visage",
          body:
            "Avec une même forme de visage, la tension de l'expression, le rythme du regard et le mouvement de la bouche en parlant changent beaucoup l'impression. Lisez le résultat avec les habitudes non verbales que vous pouvez ajuster. De petits changements d'expression peuvent adoucir la sensation relationnelle.",
        },
        {
          title: "3. Distinguez les signaux de force des signaux excessifs",
          body:
            "Une forte impression de leadership peut parfois peser, et une douceur visible peut être prise pour de l'indécision. Il est donc utile de séparer les forces des points de malentendu quand elles sont trop marquées. Cette distinction aide en entretien, en rencontre et en collaboration.",
        },
        {
          title: "4. Améliorer une relation commence par le ton, pas par le score",
          body:
            "La compatibilité en physiognomonie animale est ludique, mais le vrai changement passe par le ton, le délai de réponse et la façon de poser les questions. Quand l'autre se ferme, diminuer l'intensité et ajouter des questions de vérification peut changer le climat. La lecture devient précieuse lorsqu'elle guide la conversation.",
        },
        {
          title: "5. Des conditions photo régulières stabilisent l'analyse",
          body:
            "La lumière, l'angle et l'expression peuvent faire varier le résultat. Une photo de face, en lumière naturelle et avec une expression calme, rend la comparaison plus juste. La physiognomonie animale devient plus utile pour l'image de soi quand elle est revue dans des conditions similaires.",
        },
        {
          title: "6. Reliez le résultat à la construction de soi, pas au reproche",
          body:
            "Aucun type animal n'est supérieur ou inférieur. L'essentiel est de savoir dans quelles situations cette impression vous aide et où elle peut créer un malentendu. En ajustant votre présentation, votre photo de profil ou votre première phrase, la lecture devient un vrai soutien de communication.",
        },
      ],
    },
    de: {
      title: "KI-Tierphysiognomie - Selfie-Gesichtslesung",
      h1: "KI-Tierphysiognomie",
      description:
        "Eine Tierphysiognomie-Seite, die Gesichtsform, Ausdruck und Ausstrahlungssignale in Tiermetaphern deutet und Hinweise für Selbstausdruck und Beziehungskommunikation gibt.",
      landingPoints: ["Selfie-basierte Analyse", "Deutung mit Tiermetaphern", "Kommunikationshinweise"],
      seoText:
        "Tierphysiognomie übersetzt Gesichtssignale in zugängliche Tiermetaphern und hilft, Selbstverständnis und Kommunikation klarer zu gestalten.",
      valueGuideTitle: "6 gesunde Wege, Tierphysiognomie zu lesen",
      valueSections: [
        {
          title: "1. Tierphysiognomie ist Ausdruckssprache, kein Etikett",
          body:
            "Tiermetaphern sollen Menschen nicht in feste Diagnosen einsperren. Sie sind eher eine intuitive Sprache für komplexe Eindrücke. Wenn du das Ergebnis als Beobachtung liest, nicht als endgültiges Urteil über dich, kann es dir helfen, deine Selbstpräsentation bewusster zu gestalten.",
        },
        {
          title: "2. Ausdruck und Blickgewohnheiten wirken stärker als die Gesichtsform",
          body:
            "Auch bei gleicher Gesichtsform verändern Mimikspannung, Blickkontakt und Mundbewegung beim Sprechen den Eindruck deutlich. Lies das Ergebnis zusammen mit nonverbalen Gewohnheiten, die du anpassen kannst. Kleine Veränderungen im Ausdruck können das Beziehungserleben spürbar verändern.",
        },
        {
          title: "3. Trenne Stärkesignale von übersteigerten Signalen",
          body:
            "Ein starker Führungseindruck kann in manchen Situationen belastend wirken, während Sanftheit als Unentschlossenheit missverstanden werden kann. Deshalb ist es hilfreich, Stärken und mögliche Missverständnisse bei Übermaß getrennt zu betrachten. Das macht die Lesung für Interviews, erste Treffen und Zusammenarbeit praktischer.",
        },
        {
          title: "4. Beziehungsverbesserung beginnt beim Ton, nicht bei der Punktzahl",
          body:
            "Tierphysiognomie-Kompatibilität ist spielerisch, doch echte Veränderung beginnt mit Tonfall, Reaktionstempo und Fragen. Wenn jemand defensiv wird, helfen weniger Druck und mehr klärende Fragen. Am wirksamsten ist die Lesung als Hinweis für bessere Gesprächsgestaltung.",
        },
        {
          title: "5. Einheitliche Fotobedingungen stabilisieren die Analyse",
          body:
            "Licht, Winkel und Ausdruck können das Ergebnis stark schwanken lassen. Ein frontales Foto bei natürlichem Licht und ruhigem Gesichtsausdruck macht Veränderungen besser vergleichbar. Als Selbstbild-Werkzeug wird Tierphysiognomie wertvoller, wenn du sie regelmäßig unter ähnlichen Bedingungen prüfst.",
        },
        {
          title: "6. Nutze das Ergebnis zur Selbstgestaltung, nicht zur Selbstkritik",
          body:
            "Kein Tier-Typ ist besser oder schlechter. Entscheidend ist, wo dieser Eindruck dir hilft und wo er Missverständnisse erzeugen kann. Wenn du Vorstellung, Profilfoto oder ersten Satz daraus anpasst, wird die Lesung zu praktischer Kommunikation.",
        },
      ],
    },
    nl: {
      title: "AI dierenfysiognomie - Selfie gezichtsanalyse",
      h1: "AI dierenfysiognomie",
      description:
        "Een dierenfysiognomiepagina die gezichtsvorm, expressie en sfeer leest via dierenmetaforen en aanwijzingen geeft voor zelfexpressie en communicatie.",
      landingPoints: ["Analyse op basis van selfie", "Dierenmetafoor-interpretatie", "Communicatietips"],
      seoText:
        "Dierenfysiognomie vertaalt gezichtssignalen naar toegankelijke dierenmetaforen voor zelfinzicht en helderdere communicatie.",
      valueGuideTitle: "6 gezonde manieren om dierenfysiognomie te lezen",
      valueSections: [
        {
          title: "1. Dierenfysiognomie is expressietaal, geen label",
          body:
            "Dierenmetaforen zijn niet bedoeld om iemand vast te zetten in een diagnose. Ze werken beter als intuïtieve taal voor complexe indrukken. Lees het resultaat als observatiemateriaal, niet als definitieve uitspraak over wie je bent, en het kan je helpen je zelfpresentatie te verfijnen.",
        },
        {
          title: "2. Expressie en oogcontact wegen zwaarder dan gezichtsvorm",
          body:
            "Bij dezelfde gezichtsvorm kunnen spanning in de mimiek, oogcontactritme en mondbeweging tijdens het praten de indruk sterk veranderen. Lees het resultaat samen met non-verbale gewoonten die je kunt aanpassen. Kleine expressieveranderingen kunnen relaties merkbaar zachter maken.",
        },
        {
          title: "3. Scheid krachtsignalen van doorgeschoten signalen",
          body:
            "Een sterke leiderschapsindruk kan soms als druk voelen, terwijl zachtheid voor besluiteloosheid kan worden aangezien. Daarom helpt het om sterke punten en mogelijke misverstanden bij overmaat apart te lezen. Dat maakt de uitkomst praktischer voor interviews, eerste ontmoetingen en samenwerking.",
        },
        {
          title: "4. Relaties verbeteren begint bij toon, niet bij score",
          body:
            "Compatibiliteit in dierenfysiognomie is speels, maar echte verbetering begint bij toon, responstempo en de manier van vragen. Als iemand defensief reageert, kan lagere intensiteit en meer checkvragen de sfeer veranderen. De lezing is het nuttigst als gesprekshulp.",
        },
        {
          title: "5. Gelijke foto-omstandigheden maken analyse stabieler",
          body:
            "Licht, hoek en expressie kunnen het resultaat sterk laten schommelen. Een frontale foto met natuurlijk licht en rustige expressie maakt vergelijken duidelijker. Dierenfysiognomie wordt waardevoller als zelfbeeldinstrument wanneer je onder vergelijkbare omstandigheden terugkijkt.",
        },
        {
          title: "6. Verbind het resultaat met zelfontwerp, niet zelfkritiek",
          body:
            "Geen enkel dierentype is hoger of lager. Belangrijk is te weten waar deze indruk helpt en waar misverstanden kunnen ontstaan. Door introductie, profielfoto of openingszin aan te passen, wordt de inhoud praktische communicatie.",
        },
      ],
    },
    ms: {
      title: "Fisiognomi haiwan AI - Panduan bacaan wajah selfie",
      h1: "Fisiognomi haiwan AI",
      description:
        "Halaman fisiognomi haiwan yang mentafsir bentuk wajah, ekspresi dan isyarat aura melalui metafora haiwan untuk membantu ekspresi diri dan komunikasi hubungan.",
      landingPoints: ["Analisis berasaskan selfie", "Tafsiran metafora haiwan", "Petunjuk komunikasi"],
      seoText:
        "Fisiognomi haiwan menterjemah isyarat wajah kepada metafora haiwan yang mudah didekati untuk pemahaman diri dan komunikasi yang lebih jelas.",
      valueGuideTitle: "6 cara sihat membaca fisiognomi haiwan",
      valueSections: [
        {
          title: "1. Fisiognomi haiwan ialah bahasa ekspresi, bukan label",
          body:
            "Metafora haiwan bukan untuk mengurung seseorang dalam diagnosis tetap. Ia lebih sesuai sebagai bahasa intuitif untuk menerangkan impresi yang rumit. Apabila keputusan dibaca sebagai bahan pemerhatian, bukan kesimpulan mutlak tentang diri, ia membantu anda membentuk cara menampilkan diri.",
        },
        {
          title: "2. Ekspresi dan tabiat pandangan lebih mempengaruhi daripada bentuk wajah",
          body:
            "Dengan bentuk wajah yang sama, ketegangan ekspresi, rentak kontak mata dan gerakan mulut ketika bercakap boleh mengubah impresi. Baca keputusan bersama tabiat bukan lisan yang boleh dilaraskan. Perubahan kecil pada ekspresi sering melembutkan rasa dalam hubungan.",
        },
        {
          title: "3. Bezakan isyarat kekuatan daripada isyarat berlebihan",
          body:
            "Impresi kepimpinan yang kuat boleh terasa menekan dalam sesetengah situasi, manakala kelembutan boleh disalah tafsir sebagai ragu-ragu. Jadi bahagikan keputusan kepada kekuatan dan titik salah faham apabila kekuatan itu berlebihan. Cara ini lebih praktikal untuk temu duga, pertemuan pertama dan kerja bersama.",
        },
        {
          title: "4. Penambahbaikan hubungan bermula dengan nada, bukan skor keserasian",
          body:
            "Keserasian fisiognomi haiwan memang menyeronokkan, tetapi hubungan sebenar berubah melalui nada suara, kelajuan respons dan cara bertanya. Apabila seseorang mula bertahan, kurangkan intensiti dan tambah soalan pengesahan. Bacaan ini paling berguna sebagai petunjuk membentuk perbualan.",
        },
        {
          title: "5. Keadaan foto yang konsisten menjadikan analisis lebih stabil",
          body:
            "Cahaya, sudut dan ekspresi yang banyak berubah boleh menggoyahkan keputusan. Foto menghadap depan, cahaya semula jadi dan ekspresi tenang memudahkan perbandingan. Fisiognomi haiwan menjadi alat imej diri yang lebih bernilai apabila diperiksa berkala dalam keadaan yang sama.",
        },
        {
          title: "6. Sambungkan keputusan kepada reka bentuk diri, bukan kritikan diri",
          body:
            "Tiada jenis haiwan yang lebih tinggi atau rendah. Yang penting ialah mengetahui dalam keadaan apa impresi itu membantu dan di mana ia boleh menimbulkan salah faham. Dengan melaras pengenalan diri, foto profil atau ayat pertama, kandungan ini menjadi komunikasi yang praktikal.",
        },
      ],
    },
  },
  valueGuideTitle: animalPhysioText("valueGuide.title"),
  valueSections: [
    {
      title: animalPhysioText("value.1.title"),
      body:
        "동물 비유는 사람을 고정된 틀에 가두기 위한 진단이 아니라, 복잡한 인상을 직관적으로 설명하는 언어 도구에 가깝습니다. 결과를 \"나는 원래 이런 사람\"으로 단정하기보다 \"타인이 나를 이렇게 인식할 수 있구나\"라는 관찰 자료로 쓰면 자기표현 전략을 세우는 데 실질적인 도움이 됩니다.",
    },
    {
      title: animalPhysioText("value.2.title"),
      body:
        "같은 얼굴형이라도 표정 긴장도, 눈맞춤 빈도, 말할 때 입꼬리 움직임에 따라 인상은 크게 달라집니다. 관상 결과를 해부학 고정값으로만 보지 말고, 바꿀 수 있는 비언어 습관과 함께 읽어야 실전성이 생깁니다. 작은 표정 습관 조정만으로도 관계 체감이 빠르게 개선되는 경우가 많습니다.",
    },
    {
      title: animalPhysioText("value.3.title"),
      body:
        "리더십 인상이 강한 사람도 상황에 따라 부담 신호로 보일 수 있고, 부드러운 인상도 우유부단으로 해석될 수 있습니다. 그래서 결과를 \"강점\"과 \"과잉 시 오해 포인트\"로 나눠 읽는 방식이 유용합니다. 이 구분이 있으면 면접, 소개팅, 협업 미팅에서 인상 관리 전략을 더 현실적으로 세울 수 있습니다.",
    },
    {
      title: animalPhysioText("value.4.title"),
      body:
        "동물관상 궁합은 재미 요소가 크지만 실제 관계 개선은 말투, 응답 속도, 질문 방식에서 시작됩니다. 상대가 방어적으로 반응하는 순간을 관찰해 대화 강도를 낮추고 확인 질문을 늘리면 같은 궁합 조합에서도 결과가 달라집니다. 관상 결과는 대화 설계 힌트로 사용할 때 가장 효과적입니다.",
    },
    {
      title: animalPhysioText("value.5.title"),
      body:
        "조명, 각도, 표정이 크게 달라지면 결과 편차가 커질 수 있습니다. 정면, 자연광, 무표정 기준으로 촬영해 비교하면 변화 포인트를 더 정확히 읽을 수 있습니다. 동물 관상은 한 번의 재미 테스트로 끝내기보다 같은 조건에서 주기적으로 점검할 때 자기 이미지 관리 도구로 활용 가치가 커집니다.",
    },
    {
      title: animalPhysioText("value.6.title"),
      body:
        "어떤 동물 유형이 나와도 우열이 있는 것은 아닙니다. 중요한 것은 그 인상이 어떤 상황에서 유리하고 어떤 상황에서 오해를 부를 수 있는지 아는 것입니다. 결과를 바탕으로 소개 문장, 프로필 사진, 첫 대화 문장을 조정하면 관상 콘텐츠가 단순 흥미를 넘어 실제 커뮤니케이션 성과로 이어질 수 있습니다.",
    },
  ],
};

export default function AnimalPhysioLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
