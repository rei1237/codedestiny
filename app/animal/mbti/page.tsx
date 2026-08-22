import FeatureLandingPage from "../../components/FeatureLandingPage";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";

const ANIMAL_MBTI_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "MBTI 궁합 무료 보는 곳 | 16유형 관계 케미 동물 궁합",
    "meta.description": "두 사람의 MBTI 유형만 고르면 관계 케미를 무료로 볼 수 있는 곳입니다. 성향 조합을 동물 토템 비유로 옮겨 연애·우정·협업에서 실제로 부딪히는 소통 지점을 짚어 드립니다.",
    "service.h1": "MBTI 궁합 — 16유형 동물 케미",
    "service.seoText": "MBTI 동물 궁합은 유형 조합을 쉽고 직관적인 동물 언어로 번역해 관계 대화를 돕는 서비스입니다.",
    "valueGuide.title": "MBTI 궁합을 관계 기술로 바꾸는 6단계",
    "value.1.title": "1. MBTI 궁합은 성격 판정이 아니라 소통 지도입니다",
    "value.2.title": "2. 동물 비유는 복잡한 유형 차이를 쉽게 설명합니다",
    "value.3.title": "3. 궁합 점수보다 갈등 트리거를 먼저 확인하세요",
    "value.4.title": "4. 연애·우정·협업은 같은 조합도 작동이 다릅니다",
    "value.5.title": "5. 좋은 궁합도 운영 규칙 없이는 쉽게 흔들립니다",
    "value.6.title": "6. 결과를 대화 스크립트로 바꿔보세요",
  },
  en: {
    "meta.title": "MBTI Animal Compatibility - 16-Type Relationship Chemistry",
    "meta.description": "A relationship guide that translates MBTI type pairings into animal totem metaphors and offers practical communication points for love, friendship, and teamwork.",
    "service.h1": "MBTI Animal Compatibility",
    "service.seoText": "MBTI animal compatibility turns type combinations into intuitive animal language so relationships can be discussed with more ease.",
    "valueGuide.title": "Six Steps to Turn MBTI Compatibility into Relationship Skills",
    "value.1.title": "1. MBTI compatibility is a communication map, not a personality verdict",
    "value.2.title": "2. Animal metaphors make complex type differences easier to remember",
    "value.3.title": "3. Check conflict triggers before comparing compatibility scores",
    "value.4.title": "4. Love, friendship, and teamwork all use the same pairing differently",
    "value.5.title": "5. Even good chemistry needs operating rules",
    "value.6.title": "6. Turn the result into conversation scripts",
  },
};

function animalMbtiText(key: keyof typeof ANIMAL_MBTI_TEXT_TRANSLATIONS.ko) {
  return ANIMAL_MBTI_TEXT_TRANSLATIONS.ko[key] || ANIMAL_MBTI_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/animal/mbti",
  title: animalMbtiText("meta.title"),
  description: animalMbtiText("meta.description"),
  keywords: ["MBTI 동물 궁합", "16유형 궁합", "연애 궁합", "MBTI compatibility", "동물 토템"],
  image: "https://code-destiny.com/fuctionassets/ai%20face.webp",
  featureList: ["16유형 케미 분석", "관계 대화 힌트", "갈등 조정 포인트"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const JSON_LD = buildFortuneJsonLd(META);

const SERVICE = {
  h1: animalMbtiText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: animalMbtiText("service.seoText"),
  localized: {
    en: {
      title: "MBTI Animal Compatibility - 16-Type Relationship Chemistry",
      h1: "MBTI Animal Compatibility",
      description:
        "A relationship guide that translates MBTI type pairings into animal totem metaphors and offers practical communication points for love, friendship, and teamwork.",
      landingPoints: ["16-type chemistry reading", "Relationship conversation hints", "Conflict adjustment points"],
      seoText:
        "MBTI animal compatibility turns type combinations into intuitive animal language so relationships can be discussed with more ease.",
      valueGuideTitle: "Six Steps to Turn MBTI Compatibility into Relationship Skills",
      valueSections: [
        {
          title: "1. MBTI compatibility is a communication map, not a personality verdict",
          body:
            "When type pairings are used like fate judgments, relationships can become rigid. The true value of MBTI compatibility is understanding how each person processes information and expresses emotion. If you read the result as where translation is needed, rather than whether you match, it can reduce relationship stress.",
        },
        {
          title: "2. Animal metaphors make complex type differences easier to remember",
          body:
            "Turning abstract type codes into animal images makes another person's patterns easier to grasp. You can quickly distinguish who prefers fast decisions and who needs safety checks. Animal metaphors are not scientific proof; they are a helpful language for making communication smoother.",
        },
        {
          title: "3. Check conflict triggers before comparing compatibility scores",
          body:
            "Real relationships become steadier when trigger points are recognized early, not when scores look high. Reply speed, how plans are confirmed, and emotional tone can become repeated friction. A compatibility reading is most useful when it becomes a checklist for preventing conflict.",
        },
        {
          title: "4. Love, friendship, and teamwork all use the same pairing differently",
          body:
            "The same type combination can show different strengths depending on the relationship context. Emotional safety may matter most in romance, tempo compatibility in friendship, and role clarity in teamwork. Reading the result by context gives more realistic answers to why a friendship feels easy while romance feels harder.",
        },
        {
          title: "5. Even good chemistry needs operating rules",
          body:
            "Strong chemistry can still shake when schedules are overloaded, fatigue builds, or expectations remain vague. Weekly conversation time, forbidden phrases during conflict, and decision standards can preserve the best parts of the match. Compatibility is only a starting condition; relationship quality is maintained through habits.",
        },
        {
          title: "6. Turn the result into conversation scripts",
          body:
            "After reading the result, prepare two or three sentences you can use right away. Lines like, \"I need a checking question before deciding,\" or \"I want empathy before solutions right now,\" can reduce misunderstanding. MBTI animal compatibility becomes most valuable when it trains real conversations.",
        },
      ],
    },
    ja: {
      title: "MBTI動物相性 - 16タイプの関係ケミストリー",
      h1: "MBTI動物相性",
      description:
        "MBTIのタイプ組み合わせを動物トーテムの比喩に置き換え、恋愛、友情、協働における実際のコミュニケーションポイントをやさしく案内します。",
      landingPoints: ["16タイプのケミストリー分析", "関係を深める会話のヒント", "衝突を整えるポイント"],
      seoText:
        "MBTI動物相性は、タイプの組み合わせを直感的な動物の言葉へ映し、関係について話し合いやすくする相性占いです。",
      valueGuideTitle: "MBTI相性を関係スキルへ変える6つのステップ",
      valueSections: [
        {
          title: "1. MBTI相性は性格の判定ではなく、対話の地図です",
          body:
            "タイプの組み合わせを運命の判定のように扱うと、関係は固くなりやすいものです。MBTI相性の本当の価値は、お互いの情報の受け取り方と感情表現の速度を知ることにあります。結果を「合うか合わないか」ではなく、「どこに翻訳が必要か」と読むほど、関係の負担は軽くなります。",
        },
        {
          title: "2. 動物の比喩は、複雑なタイプ差を覚えやすくします",
          body:
            "抽象的なタイプコードを動物のイメージに置き換えると、相手の行動パターンをつかみやすくなります。すぐ決めたいタイプ、安全確認が必要なタイプを視覚的に分けて見られるので、会話の準備も早くなります。動物の比喩は断定ではなく、コミュニケーションをなめらかにする補助の言葉です。",
        },
        {
          title: "3. 相性点より先に、衝突のきっかけを見てください",
          body:
            "実際の関係は、高い相性点だけで安定するわけではありません。返信の速さ、予定の決め方、感情表現の温度など、衝突が起きやすい場所を早く知るほど落ち着きます。相性占いは点数比べではなく、衝突を減らすためのチェックリストとして使うと実用的です。",
        },
        {
          title: "4. 恋愛、友情、協働では、同じ組み合わせでも働き方が変わります",
          body:
            "同じタイプの組み合わせでも、関係の場面によって強みは変わります。恋愛では安心感、友情ではテンポ、協働では役割分担の明確さが大切になることがあります。相性結果を場面ごとに分けて読むと、「友達では楽なのに恋愛では難しい」理由にも現実的な光が入ります。",
        },
        {
          title: "5. 良い相性にも、続けるための約束が必要です",
          body:
            "ケミストリーが良くても、予定が詰まりすぎたり、疲れが重なったり、期待が曖昧なままだと関係は揺れます。週に一度の会話時間、衝突時に避ける言葉、決めるときの基準を置いておくと、相性の良さが保たれます。相性は入口であり、続く関係は日々の習慣が育てます。",
        },
        {
          title: "6. 結果を会話のスクリプトに変えてみましょう",
          body:
            "読み終えたら、すぐ使える言葉を2、3個だけ用意してみてください。「決める前に確認の質問があると安心します」「今は解決策より共感を先に聞きたいです」などの一言が、誤解をやわらげます。MBTI動物相性は、読むだけでなく会話を練習する道具として使うと力を発揮します。",
        },
      ],
    },
    "zh-CN": {
      title: "MBTI动物相性 - 16型关系化学反应",
      h1: "MBTI动物相性",
      description:
        "把MBTI类型组合转化为动物图腾隐喻，为恋爱、友情与协作关系提供实际沟通提示。",
      landingPoints: ["16型化学反应分析", "关系对话提示", "冲突调整重点"],
      seoText:
        "MBTI动物相性把类型组合翻译成直观的动物语言，让关系对话更容易展开。",
      valueGuideTitle: "把MBTI相性转化为关系技巧的6个步骤",
      valueSections: [
        {
          title: "1. MBTI相性是沟通地图，不是性格判决",
          body:
            "如果把类型组合当成命运判定，关系很容易变得僵硬。MBTI相性的核心价值，是理解彼此处理信息和表达情绪的方式。把结果读成「哪里需要翻译」，而不是「我们合不合」，关系压力会明显降低。",
        },
        {
          title: "2. 动物隐喻让复杂的类型差异更容易记住",
          body:
            "把抽象类型代码换成动物形象，会更容易记住对方的行为模式。偏好快速决定的人、需要安全确认的人，也能被更直观地区分。动物隐喻不是科学定论，而是提升沟通效率的辅助语言。",
        },
        {
          title: "3. 先确认冲突触发点，再看相性分数",
          body:
            "真实关系的稳定不只取决于高分，而是取决于能否及早发现冲突位置。回复速度、确认约定的方式、表达情绪的语气，都可能成为反复摩擦。相性解读最实用的地方，是把它变成预防冲突的检查表。",
        },
        {
          title: "4. 恋爱、友情与协作会让同一组合呈现不同运作",
          body:
            "即使是同一种类型组合，关系情境不同，优势也会不同。恋爱可能更看重情绪安全感，友情更看重节奏是否相合，协作更看重角色是否清楚。按情境拆开阅读，能更现实地解释为何做朋友轻松，进入恋爱却困难。",
        },
        {
          title: "5. 好相性也需要运作规则",
          body:
            "即使很有默契，日程过满、疲劳累积或期待不清，也会让关系快速摇晃。固定对话时间、冲突时避免的句子、共同决策标准，能维持相性的优点。相性只是开始条件，关系品质由日常习惯维护。",
        },
        {
          title: "6. 把结果变成对话脚本",
          body:
            "读完之后，准备两三句马上能用的话会很有帮助。例如「我在决定前需要确认问题」「现在我想先听到共感，再讨论办法」。MBTI动物相性最有价值的用法，是把内容变成真实关系中的对话训练。",
        },
      ],
    },
    "zh-TW": {
      title: "MBTI動物相性 - 16型關係化學反應",
      h1: "MBTI動物相性",
      description:
        "把MBTI類型組合轉化為動物圖騰隱喻，為戀愛、友情與協作關係提供實際溝通提示。",
      landingPoints: ["16型化學反應分析", "關係對話提示", "衝突調整重點"],
      seoText:
        "MBTI動物相性把類型組合翻譯成直覺的動物語言，讓關係對話更容易展開。",
      valueGuideTitle: "把MBTI相性轉化為關係技巧的6個步驟",
      valueSections: [
        {
          title: "1. MBTI相性是溝通地圖，不是性格判決",
          body:
            "如果把類型組合當成命運判定，關係很容易變得僵硬。MBTI相性的核心價值，是理解彼此處理資訊和表達情緒的方式。把結果讀成「哪裡需要翻譯」，而不是「我們合不合」，關係壓力會明顯降低。",
        },
        {
          title: "2. 動物隱喻讓複雜的類型差異更容易記住",
          body:
            "把抽象類型代碼換成動物形象，會更容易記住對方的行為模式。偏好快速決定的人、需要安全確認的人，也能被更直覺地區分。動物隱喻不是科學定論，而是提升溝通效率的輔助語言。",
        },
        {
          title: "3. 先確認衝突觸發點，再看相性分數",
          body:
            "真實關係的穩定不只取決於高分，而是取決於能否及早發現衝突位置。回覆速度、確認約定的方式、表達情緒的語氣，都可能成為反覆摩擦。相性解讀最實用的地方，是把它變成預防衝突的檢查表。",
        },
        {
          title: "4. 戀愛、友情與協作會讓同一組合呈現不同運作",
          body:
            "即使是同一種類型組合，關係情境不同，優勢也會不同。戀愛可能更看重情緒安全感，友情更看重節奏是否相合，協作更看重角色是否清楚。按情境拆開閱讀，能更現實地解釋為何做朋友輕鬆，進入戀愛卻困難。",
        },
        {
          title: "5. 好相性也需要運作規則",
          body:
            "即使很有默契，日程過滿、疲勞累積或期待不清，也會讓關係快速搖晃。固定對話時間、衝突時避免的句子、共同決策標準，能維持相性的優點。相性只是開始條件，關係品質由日常習慣維護。",
        },
        {
          title: "6. 把結果變成對話腳本",
          body:
            "讀完之後，準備兩三句馬上能用的話會很有幫助。例如「我在決定前需要確認問題」「現在我想先聽到共感，再討論辦法」。MBTI動物相性最有價值的用法，是把內容變成真實關係中的對話訓練。",
        },
      ],
    },
    vi: {
      title: "Độ hợp MBTI động vật - Hóa học quan hệ của 16 kiểu",
      h1: "Độ hợp MBTI động vật",
      description:
        "Hướng dẫn chuyển các cặp kiểu MBTI thành ẩn dụ linh vật động vật, đưa ra điểm giao tiếp thực tế cho tình yêu, tình bạn và cộng tác.",
      landingPoints: ["Phân tích hóa học 16 kiểu", "Gợi ý đối thoại quan hệ", "Điểm điều chỉnh xung đột"],
      seoText:
        "Độ hợp MBTI động vật chuyển tổ hợp kiểu tính cách thành ngôn ngữ động vật trực quan để cuộc trò chuyện trong quan hệ dễ mở hơn.",
      valueGuideTitle: "6 bước biến độ hợp MBTI thành kỹ năng quan hệ",
      valueSections: [
        {
          title: "1. Độ hợp MBTI là bản đồ giao tiếp, không phải phán xét tính cách",
          body:
            "Khi dùng tổ hợp kiểu như phán quyết định mệnh, quan hệ dễ trở nên cứng. Giá trị thật của độ hợp MBTI là hiểu cách mỗi người xử lý thông tin và biểu đạt cảm xúc. Nếu đọc kết quả như nơi cần phiên dịch, thay vì câu trả lời hợp hay không, căng thẳng trong quan hệ sẽ giảm.",
        },
        {
          title: "2. Ẩn dụ động vật giúp nhớ khác biệt kiểu dễ hơn",
          body:
            "Biến mã kiểu trừu tượng thành hình ảnh động vật giúp bạn nắm mô thức hành vi của đối phương nhanh hơn. Người thích quyết nhanh và người cần kiểm tra an toàn cũng dễ được phân biệt. Ẩn dụ động vật không phải kết luận khoa học, mà là ngôn ngữ hỗ trợ giao tiếp hiệu quả hơn.",
        },
        {
          title: "3. Xem điểm kích hoạt xung đột trước khi so điểm hợp",
          body:
            "Quan hệ thật ổn định hơn khi điểm xung đột được nhận ra sớm, không chỉ vì điểm hợp cao. Tốc độ trả lời, cách chốt lịch và tông cảm xúc đều có thể trở thành ma sát lặp lại. Đọc độ hợp sẽ thiết thực hơn khi biến nó thành danh sách phòng ngừa xung đột.",
        },
        {
          title: "4. Tình yêu, tình bạn và cộng tác vận hành khác nhau",
          body:
            "Cùng một tổ hợp kiểu vẫn có thế mạnh khác nhau theo bối cảnh quan hệ. Tình yêu cần an toàn cảm xúc, tình bạn cần hợp nhịp, cộng tác cần phân vai rõ. Đọc kết quả theo từng bối cảnh giúp bạn hiểu thực tế hơn vì sao làm bạn thì dễ mà yêu lại khó.",
        },
        {
          title: "5. Hóa học tốt cũng cần quy tắc vận hành",
          body:
            "Dù có nhiều cảm giác hợp, lịch quá dày, mệt mỏi tích tụ hoặc kỳ vọng mơ hồ vẫn có thể làm quan hệ rung lắc. Thời gian trò chuyện hằng tuần, câu không dùng khi tranh cãi và tiêu chuẩn quyết định chung sẽ giữ điểm mạnh của độ hợp. Độ hợp là điểm bắt đầu; chất lượng quan hệ nằm ở thói quen.",
        },
        {
          title: "6. Biến kết quả thành kịch bản đối thoại",
          body:
            "Sau khi đọc, hãy chuẩn bị hai hoặc ba câu có thể dùng ngay. Chẳng hạn: \"Trước khi quyết, mình cần một câu hỏi xác nhận\" hoặc \"Lúc này mình muốn được đồng cảm trước khi nghe giải pháp\". Độ hợp MBTI động vật có giá trị nhất khi trở thành luyện tập đối thoại thật.",
        },
      ],
    },
    hi: {
      title: "MBTI एनिमल कम्पैटिबिलिटी - 16 प्रकारों की संबंध केमिस्ट्री",
      h1: "MBTI एनिमल कम्पैटिबिलिटी",
      description:
        "MBTI प्रकारों के संयोजन को पशु टोटेम रूपकों में बदलकर प्रेम, मित्रता और सहयोग के लिए व्यावहारिक संवाद संकेत देने वाली गाइड.",
      landingPoints: ["16 प्रकार केमिस्ट्री विश्लेषण", "संबंध संवाद संकेत", "संघर्ष समायोजन बिंदु"],
      seoText:
        "MBTI एनिमल कम्पैटिबिलिटी प्रकार संयोजनों को सहज पशु भाषा में बदलती है, ताकि संबंधों पर बात करना आसान हो.",
      valueGuideTitle: "MBTI कम्पैटिबिलिटी को संबंध कौशल में बदलने के 6 चरण",
      valueSections: [
        {
          title: "1. MBTI संगतता संवाद मानचित्र है, व्यक्तित्व फैसला नहीं",
          body:
            "यदि प्रकार संयोजन को भाग्य के निर्णय की तरह इस्तेमाल किया जाए, तो संबंध कठोर हो सकते हैं. MBTI संगतता का मूल्य यह समझने में है कि लोग जानकारी कैसे लेते हैं और भाव कैसे व्यक्त करते हैं. परिणाम को यह पढ़ें कि कहाँ अनुवाद चाहिए, न कि सिर्फ हम मेल खाते हैं या नहीं.",
        },
        {
          title: "2. पशु रूपक जटिल प्रकार भेदों को याद रखना आसान बनाते हैं",
          body:
            "अमूर्त प्रकार कोड को पशु चित्रों में बदलने से दूसरे व्यक्ति के व्यवहार पैटर्न जल्दी समझ आते हैं. कौन तेज निर्णय चाहता है और किसे सुरक्षा जाँच चाहिए, यह साफ दिखता है. पशु रूपक वैज्ञानिक प्रमाण नहीं, बल्कि संवाद को सहज बनाने की सहायक भाषा हैं.",
        },
        {
          title: "3. संगतता अंक से पहले संघर्ष ट्रिगर देखें",
          body:
            "वास्तविक संबंध ऊँचे अंक से नहीं, बल्कि संघर्ष के स्थान जल्दी पहचानने से स्थिर होते हैं. उत्तर देने की गति, योजना पक्की करने का तरीका और भावनात्मक स्वर बार-बार टकराव बना सकते हैं. संगतता पढ़ना तब उपयोगी है जब वह संघर्ष रोकने की सूची बने.",
        },
        {
          title: "4. प्रेम, मित्रता और सहयोग में वही संयोजन अलग तरह से चलता है",
          body:
            "एक ही प्रकार संयोजन भी संबंध संदर्भ के अनुसार अलग शक्ति दिखाता है. प्रेम में भावनात्मक सुरक्षा, मित्रता में गति का मेल और सहयोग में भूमिका स्पष्टता अधिक महत्त्वपूर्ण हो सकती है. संदर्भ के अनुसार पढ़ने से रिश्ते की जटिलता अधिक यथार्थ दिखती है.",
        },
        {
          title: "5. अच्छी केमिस्ट्री को भी संचालन नियम चाहिए",
          body:
            "केमिस्ट्री अच्छी हो, फिर भी व्यस्त समय, थकान और अस्पष्ट अपेक्षाएँ संबंध को हिला सकती हैं. साप्ताहिक बातचीत समय, संघर्ष में न कहे जाने वाले वाक्य और निर्णय मानक संबंध की अच्छाई बचाते हैं. संगतता शुरुआत है; गुणवत्ता आदतों से बनी रहती है.",
        },
        {
          title: "6. परिणाम को संवाद स्क्रिप्ट में बदलें",
          body:
            "पढ़ने के बाद दो या तीन वाक्य तैयार करें जिन्हें तुरंत इस्तेमाल किया जा सके. जैसे, \"निर्णय से पहले मुझे पुष्टि प्रश्न चाहिए\" या \"अभी समाधान से पहले सहानुभूति सुनना चाहता हूँ.\" MBTI एनिमल कम्पैटिबिलिटी तब सबसे मूल्यवान होती है जब वह वास्तविक संवाद का अभ्यास बनती है.",
        },
      ],
    },
    es: {
      title: "Compatibilidad animal MBTI - Química relacional de 16 tipos",
      h1: "Compatibilidad animal MBTI",
      description:
        "Una guía que traduce combinaciones MBTI en metáforas de tótems animales y ofrece puntos prácticos de comunicación para amor, amistad y trabajo en equipo.",
      landingPoints: ["Análisis de química de 16 tipos", "Pistas de conversación relacional", "Puntos de ajuste de conflicto"],
      seoText:
        "La compatibilidad animal MBTI convierte combinaciones de tipos en un lenguaje animal intuitivo para hablar de las relaciones con más facilidad.",
      valueGuideTitle: "6 pasos para convertir la compatibilidad MBTI en habilidad relacional",
      valueSections: [
        {
          title: "1. La compatibilidad MBTI es mapa de comunicación, no sentencia",
          body:
            "Cuando se usa la combinación de tipos como juicio de destino, la relación se rigidiza. El valor real está en comprender cómo cada persona procesa información y expresa emoción. Leer el resultado como un lugar que necesita traducción, y no como un sí o no, reduce tensión.",
        },
        {
          title: "2. Las metáforas animales vuelven memorables las diferencias",
          body:
            "Convertir códigos abstractos en imágenes animales ayuda a recordar patrones de conducta. Se distingue mejor quién decide rápido y quién necesita confirmar seguridad. La metáfora animal no es una prueba científica; es un lenguaje auxiliar para comunicarse mejor.",
        },
        {
          title: "3. Revisa disparadores de conflicto antes que puntuaciones",
          body:
            "Las relaciones reales se estabilizan al reconocer pronto los puntos de fricción, no solo con una puntuación alta. Velocidad de respuesta, forma de cerrar planes y tono emocional pueden repetirse como choques. La lectura es más útil como lista para prevenir conflictos.",
        },
        {
          title: "4. Amor, amistad y colaboración activan el mismo par de formas distintas",
          body:
            "La misma combinación puede mostrar fortalezas diferentes según el contexto. En amor pesa la seguridad emocional; en amistad, el ritmo; en trabajo, la claridad de roles. Leer por contexto explica mejor por qué una amistad fluye y una relación romántica cuesta.",
        },
        {
          title: "5. La buena química también necesita reglas de operación",
          body:
            "Aunque haya química, agendas saturadas, cansancio o expectativas vagas pueden desestabilizar la relación. Un tiempo semanal de conversación, frases prohibidas en conflicto y criterios de decisión mantienen las fortalezas. La compatibilidad inicia; los hábitos sostienen.",
        },
        {
          title: "6. Convierte el resultado en guiones de conversación",
          body:
            "Después de leer, prepara dos o tres frases útiles. Por ejemplo: \"Necesito una pregunta de confirmación antes de decidir\" o \"Ahora necesito empatía antes que soluciones\". La compatibilidad animal MBTI vale más cuando se vuelve práctica de conversación real.",
        },
      ],
    },
    fr: {
      title: "Compatibilité animale MBTI - Chimie relationnelle des 16 types",
      h1: "Compatibilité animale MBTI",
      description:
        "Un guide qui traduit les combinaisons MBTI en métaphores de totems animaux et propose des repères pratiques pour l'amour, l'amitié et la collaboration.",
      landingPoints: ["Analyse de chimie des 16 types", "Pistes de dialogue relationnel", "Points d'ajustement des conflits"],
      seoText:
        "La compatibilité animale MBTI transforme les combinaisons de types en langage animal intuitif pour faciliter les conversations relationnelles.",
      valueGuideTitle: "6 étapes pour transformer la compatibilité MBTI en compétence relationnelle",
      valueSections: [
        {
          title: "1. La compatibilité MBTI est une carte de dialogue, pas un verdict",
          body:
            "Utiliser les types comme jugement de destin rend la relation plus rigide. Leur vraie valeur est de comprendre comment chacun traite l'information et exprime l'émotion. Lire le résultat comme un endroit qui demande traduction, plutôt qu'un simple accord ou désaccord, diminue la tension.",
        },
        {
          title: "2. Les métaphores animales rendent les différences plus mémorables",
          body:
            "Transformer des codes abstraits en images animales aide à retenir les schémas de l'autre. On distingue plus vite qui décide rapidement et qui a besoin de vérifier la sécurité. La métaphore animale n'est pas une preuve scientifique, mais une langue de soutien pour mieux communiquer.",
        },
        {
          title: "3. Regardez les déclencheurs de conflit avant les scores",
          body:
            "Les relations se stabilisent quand les points de friction sont reconnus tôt, pas seulement quand le score est élevé. Vitesse de réponse, façon de confirmer les plans et ton émotionnel peuvent devenir des heurts répétitifs. La lecture devient utile lorsqu'elle sert de liste de prévention.",
        },
        {
          title: "4. Amour, amitié et collaboration activent le même duo autrement",
          body:
            "Une même combinaison montre des forces différentes selon le contexte. En amour, la sécurité émotionnelle compte; en amitié, le rythme; en collaboration, la clarté des rôles. Lire par contexte donne une réponse plus réaliste aux relations faciles en amitié mais difficiles en romance.",
        },
        {
          title: "5. Une bonne chimie a aussi besoin de règles",
          body:
            "Même avec une bonne alchimie, trop d'agenda, de fatigue ou d'attentes floues peuvent faire vaciller le lien. Un temps de dialogue hebdomadaire, des phrases à éviter en conflit et des critères de décision protègent les forces du duo. La compatibilité commence; les habitudes maintiennent.",
        },
        {
          title: "6. Transformez le résultat en scripts de conversation",
          body:
            "Après la lecture, préparez deux ou trois phrases directement utilisables. Par exemple: \"J'ai besoin d'une question de vérification avant de décider\" ou \"J'aimerais d'abord être entendu avant les solutions\". La compatibilité animale MBTI prend toute sa valeur lorsqu'elle entraîne les vraies conversations.",
        },
      ],
    },
    de: {
      title: "MBTI-Tierkompatibilität - Beziehungsschemie der 16 Typen",
      h1: "MBTI-Tierkompatibilität",
      description:
        "Ein Leitfaden, der MBTI-Typkombinationen in Tier-Totem-Metaphern übersetzt und praktische Kommunikationspunkte für Liebe, Freundschaft und Teamarbeit bietet.",
      landingPoints: ["Chemieanalyse der 16 Typen", "Gesprächshinweise für Beziehungen", "Konfliktanpassungspunkte"],
      seoText:
        "MBTI-Tierkompatibilität übersetzt Typkombinationen in intuitive Tiersprache und erleichtert Gespräche über Beziehungen.",
      valueGuideTitle: "6 Schritte, um MBTI-Kompatibilität in Beziehungskompetenz zu verwandeln",
      valueSections: [
        {
          title: "1. MBTI-Kompatibilität ist eine Kommunikationskarte, kein Urteil",
          body:
            "Wenn Typkombinationen wie Schicksalsurteile genutzt werden, werden Beziehungen starr. Ihr Wert liegt darin, zu verstehen, wie Menschen Informationen verarbeiten und Gefühle ausdrücken. Lies das Ergebnis als Hinweis darauf, wo Übersetzung nötig ist, nicht nur als passend oder unpassend.",
        },
        {
          title: "2. Tiermetaphern machen komplexe Typunterschiede merkbar",
          body:
            "Abstrakte Typcodes als Tierbilder zu sehen, macht Verhaltensmuster leichter verständlich. Wer schnell entscheiden will und wer Sicherheitsprüfung braucht, wird klarer erkennbar. Tiermetaphern sind kein wissenschaftlicher Beweis, sondern eine hilfreiche Sprache für bessere Kommunikation.",
        },
        {
          title: "3. Prüfe Konfliktauslöser vor Kompatibilitätspunkten",
          body:
            "Reale Beziehungen werden stabiler, wenn Reibungspunkte früh erkannt werden. Antworttempo, Planbestätigung und emotionaler Ton können wiederkehrende Konflikte auslösen. Eine Kompatibilitätslesung ist am nützlichsten, wenn sie zur Liste für Konfliktvorbeugung wird.",
        },
        {
          title: "4. Liebe, Freundschaft und Teamarbeit nutzen dasselbe Paar anders",
          body:
            "Dieselbe Kombination kann je nach Beziehungskontext andere Stärken zeigen. In Liebe zählt emotionale Sicherheit, in Freundschaft gemeinsames Tempo, in Teamarbeit klare Rollen. Kontextbezogenes Lesen erklärt realistischer, warum Freundschaft leicht und Romantik schwer sein kann.",
        },
        {
          title: "5. Gute Chemie braucht ebenfalls Betriebsregeln",
          body:
            "Auch starke Chemie wankt, wenn Termine voll sind, Müdigkeit steigt oder Erwartungen vage bleiben. Wöchentliche Gesprächszeit, verbotene Konfliktsätze und Entscheidungsstandards bewahren die Stärken. Kompatibilität ist der Start; Gewohnheiten halten die Qualität.",
        },
        {
          title: "6. Verwandle das Ergebnis in Gesprächsskripte",
          body:
            "Bereite nach der Lesung zwei oder drei Sätze vor, die du sofort verwenden kannst. Etwa: \"Vor einer Entscheidung brauche ich eine klärende Frage\" oder \"Gerade möchte ich erst Empathie hören\". MBTI-Tierkompatibilität wirkt am besten als Training echter Gespräche.",
        },
      ],
    },
    nl: {
      title: "MBTI dierencompatibiliteit - Relatiechemie van 16 types",
      h1: "MBTI dierencompatibiliteit",
      description:
        "Een gids die MBTI-typecombinaties vertaalt naar dierentotem-metaforen en praktische communicatiepunten geeft voor liefde, vriendschap en samenwerking.",
      landingPoints: ["Chemieanalyse van 16 types", "Gesprekstips voor relaties", "Conflict-afstemmingspunten"],
      seoText:
        "MBTI dierencompatibiliteit vertaalt typecombinaties naar intuïtieve dierentaal, zodat relaties makkelijker bespreekbaar worden.",
      valueGuideTitle: "6 stappen om MBTI-compatibiliteit in relatievaardigheid te veranderen",
      valueSections: [
        {
          title: "1. MBTI-compatibiliteit is een communicatiekaart, geen oordeel",
          body:
            "Wanneer typecombinaties als lotsoordeel worden gebruikt, kunnen relaties verstarren. De echte waarde ligt in begrijpen hoe mensen informatie verwerken en emoties uiten. Lees het resultaat als waar vertaling nodig is, niet alleen als wel of niet passend.",
        },
        {
          title: "2. Dierenmetaforen maken typeverschillen makkelijker te onthouden",
          body:
            "Abstracte typecodes als dierbeelden maken gedragspatronen begrijpelijker. Je ziet sneller wie snel wil beslissen en wie veiligheid wil checken. Dierenmetaforen zijn geen wetenschappelijk bewijs, maar een hulptaal voor soepelere communicatie.",
        },
        {
          title: "3. Bekijk conflicttrekkers voor je scores vergelijkt",
          body:
            "Relaties worden stabieler wanneer wrijvingspunten vroeg zichtbaar zijn, niet alleen wanneer de score hoog is. Antwoordsnelheid, afspraken bevestigen en emotionele toon kunnen steeds terugkomen. De lezing is praktisch wanneer ze een checklist voor conflictpreventie wordt.",
        },
        {
          title: "4. Liefde, vriendschap en samenwerking laten hetzelfde paar anders werken",
          body:
            "Dezelfde combinatie kan per context andere sterke kanten tonen. In liefde telt emotionele veiligheid, in vriendschap tempo, in samenwerking rolhelderheid. Contextueel lezen verklaart realistischer waarom vriendschap makkelijk voelt en romantiek lastiger.",
        },
        {
          title: "5. Goede chemie heeft ook werkregels nodig",
          body:
            "Zelfs sterke chemie kan wankelen door volle agenda's, vermoeidheid of vage verwachtingen. Wekelijkse gesprekstijd, verboden conflictzinnen en besliscriteria beschermen de sterke kanten. Compatibiliteit is de start; gewoonten houden de kwaliteit vast.",
        },
        {
          title: "6. Zet het resultaat om in gespreksscripts",
          body:
            "Maak na het lezen twee of drie zinnen die je meteen kunt gebruiken. Bijvoorbeeld: \"Voor ik beslis heb ik een checkvraag nodig\" of \"Nu wil ik eerst empathie horen\". MBTI dierencompatibiliteit is het waardevolst wanneer het echte gesprekken oefent.",
        },
      ],
    },
    ms: {
      title: "Keserasian haiwan MBTI - Kimia hubungan 16 jenis",
      h1: "Keserasian haiwan MBTI",
      description:
        "Panduan yang menterjemah gabungan jenis MBTI kepada metafora totem haiwan dan memberi titik komunikasi praktikal untuk cinta, persahabatan dan kerja bersama.",
      landingPoints: ["Analisis kimia 16 jenis", "Petunjuk perbualan hubungan", "Titik pelarasan konflik"],
      seoText:
        "Keserasian haiwan MBTI menukar gabungan jenis kepada bahasa haiwan yang intuitif supaya hubungan lebih mudah dibincangkan.",
      valueGuideTitle: "6 langkah menukar keserasian MBTI kepada kemahiran hubungan",
      valueSections: [
        {
          title: "1. Keserasian MBTI ialah peta komunikasi, bukan keputusan personaliti",
          body:
            "Apabila gabungan jenis digunakan seperti keputusan takdir, hubungan boleh menjadi kaku. Nilai sebenar keserasian MBTI ialah memahami cara setiap orang memproses maklumat dan meluahkan emosi. Baca keputusan sebagai tempat yang memerlukan terjemahan, bukan sekadar sesuai atau tidak.",
        },
        {
          title: "2. Metafora haiwan memudahkan perbezaan jenis diingati",
          body:
            "Menukar kod jenis yang abstrak kepada imej haiwan menjadikan pola tindakan pasangan lebih mudah difahami. Siapa suka keputusan cepat dan siapa perlu semakan keselamatan dapat dilihat dengan jelas. Metafora haiwan bukan bukti saintifik, tetapi bahasa sokongan untuk komunikasi lancar.",
        },
        {
          title: "3. Semak pencetus konflik sebelum membandingkan skor",
          body:
            "Hubungan sebenar lebih stabil apabila titik geseran dikenal pasti awal, bukan hanya kerana skor tinggi. Kelajuan balasan, cara mengesahkan janji dan nada emosi boleh menjadi konflik berulang. Bacaan keserasian paling berguna apabila menjadi senarai pencegahan konflik.",
        },
        {
          title: "4. Cinta, persahabatan dan kerja bersama menggerakkan gabungan sama secara berbeza",
          body:
            "Gabungan jenis yang sama boleh menunjukkan kekuatan berbeza mengikut konteks hubungan. Cinta memerlukan keselamatan emosi, persahabatan memerlukan rentak sepadan, kerja bersama memerlukan peranan jelas. Membaca mengikut konteks memberi jawapan yang lebih realistik.",
        },
        {
          title: "5. Kimia baik juga perlukan peraturan operasi",
          body:
            "Walaupun kimia kuat, jadual padat, keletihan dan jangkaan kabur boleh menggoncang hubungan. Masa perbualan mingguan, ayat yang dielakkan ketika konflik dan piawai membuat keputusan menjaga kekuatan keserasian. Keserasian ialah permulaan; tabiat mengekalkan kualiti.",
        },
        {
          title: "6. Tukar keputusan kepada skrip perbualan",
          body:
            "Selepas membaca, sediakan dua atau tiga ayat yang boleh terus digunakan. Contohnya, \"Saya perlukan soalan semakan sebelum membuat keputusan\" atau \"Sekarang saya mahu empati dahulu sebelum penyelesaian\". Keserasian haiwan MBTI paling bernilai apabila menjadi latihan perbualan sebenar.",
        },
      ],
    },
  },
  valueGuideTitle: animalMbtiText("valueGuide.title"),
  valueSections: [
    {
      title: animalMbtiText("value.1.title"),
      body:
        "유형 조합을 운명 판정처럼 쓰면 관계가 경직되기 쉽습니다. MBTI 궁합의 핵심 가치는 서로의 정보 처리 방식과 감정 표현 속도를 이해하는 데 있습니다. 결과를 \"우리는 안 맞아\"가 아니라 \"어디에서 번역이 필요한가\"로 읽으면 관계 스트레스를 크게 줄일 수 있습니다.",
    },
    {
      title: animalMbtiText("value.2.title"),
      body:
        "추상적인 유형 코드를 동물 이미지로 바꾸면 상대의 행동 패턴을 기억하기 쉬워집니다. 빠른 결정을 선호하는 유형, 안전 확인이 필요한 유형을 시각적으로 구분하면 대화 준비가 빨라집니다. 동물 비유는 과학적 확정이 아니라 커뮤니케이션 효율을 높이는 보조 언어로 사용하는 것이 적절합니다.",
    },
    {
      title: animalMbtiText("value.3.title"),
      body:
        "실제 관계는 높은 궁합 점수보다 갈등 발생 지점을 빨리 파악할 때 안정됩니다. 답장 속도, 약속 확정 방식, 감정 표현 톤 같은 트리거를 미리 확인하면 반복 충돌을 줄일 수 있습니다. 궁합 해석은 점수 비교가 아니라 충돌 예방 체크리스트를 만드는 데 활용할 때 실용성이 큽니다.",
    },
    {
      title: animalMbtiText("value.4.title"),
      body:
        "같은 유형 조합이라도 관계 맥락에 따라 강점이 달라집니다. 연애에서는 정서 안전감, 우정에서는 템포 호환성, 협업에서는 역할 분담 명확성이 더 중요할 수 있습니다. 그래서 궁합 결과를 맥락별로 분리해 읽으면 \"왜 친구로는 편한데 연애로는 어렵지\" 같은 질문에 현실적인 답이 생깁니다.",
    },
    {
      title: animalMbtiText("value.5.title"),
      body:
        "케미가 좋아도 일정 과밀, 피로 누적, 불명확한 기대치가 쌓이면 관계 만족도는 빠르게 하락합니다. 주간 대화 시간, 갈등 시 금지 문장, 결정 기준 같은 운영 규칙을 정하면 궁합의 장점이 유지됩니다. 궁합은 시작 조건일 뿐 유지 품질은 운영 습관에서 결정됩니다.",
    },
    {
      title: animalMbtiText("value.6.title"),
      body:
        "해석을 읽은 뒤 바로 쓸 수 있는 문장 2~3개를 준비하면 효과가 큽니다. 예를 들어 \"나는 결정 전에 확인 질문이 필요해\", \"지금은 공감 먼저 듣고 싶어\" 같은 문장을 정해두면 오해가 크게 줄어듭니다. MBTI 동물 궁합은 읽는 콘텐츠를 넘어 관계 대화 훈련 도구로 쓸 때 가장 가치가 큽니다.",
    },
  ],
};

export default function AnimalMbtiLandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
