import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const ORACLE_SUKUYO_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "숙요 인연 레이더 | Code Destiny",
    "meta.description": "상대의 생년월일로 나와의 숙요 관계를 분석하고, 끌림·안정감·소모도·장기 인연 가능성을 확인해보세요.",
    "service.h1": "숙요 인연 레이더",
    "service.seoText": "숙요 인연 레이더는 두 사람의 본명숙과 27숙 관계를 바탕으로 끌림, 안정감, 소모도, 장기 인연 가능성을 비춥니다.",
    "valueGuide.title": "숙요점을 실전에 적용하는 6단계",
    "value.1.title": "1. 숙요점의 핵심은 달의 리듬 읽기입니다",
    "value.2.title": "2. 27수는 등급표가 아니라 작동 방식 분류입니다",
    "value.3.title": "3. 숙요 궁합은 점수보다 템포 조율이 핵심입니다",
    "value.4.title": "4. 월간·주간 루틴에 붙이면 활용도가 높아집니다",
    "value.5.title": "5. 표현은 단정보다 행동 제안 중심이 안전합니다",
    "value.6.title": "6. 반복 관찰로 나만의 리듬 아카이브를 만드세요",
  },
  en: {
    "meta.title": "Sukuyo Relationship Radar | Code Destiny",
    "meta.description": "Analyze your Sukuyo relationship with another person by birth date, and check attraction, steadiness, exhaustion, and long-term connection potential.",
    "service.h1": "Sukuyo Relationship Radar",
    "service.seoText": "Sukuyo Relationship Radar reflects attraction, steadiness, exhaustion, and long-term potential through both people's natal mansion and 27-mansion relationship.",
    "valueGuide.title": "Six Steps to Apply Sukuyo in Real Relationships",
    "value.1.title": "1. The heart of Sukuyo is reading the rhythm of the Moon",
    "value.2.title": "2. The 27 mansions classify operation, not rank",
    "value.3.title": "3. Sukuyo compatibility is about tempo more than scores",
    "value.4.title": "4. Attach it to monthly and weekly routines",
    "value.5.title": "5. Keep wording focused on action suggestions, not certainty",
    "value.6.title": "6. Build your own rhythm archive through repeated observation",
  },
};

function oracleSukuyoText(key: keyof typeof ORACLE_SUKUYO_TEXT_TRANSLATIONS.ko) {
  return ORACLE_SUKUYO_TEXT_TRANSLATIONS.ko[key] || ORACLE_SUKUYO_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/oracle/sukuyo",
  title: oracleSukuyoText("meta.title"),
  description: oracleSukuyoText("meta.description"),
  keywords: ["숙요점", "숙요 궁합", "27숙", "안괴", "영친", "업태", "우쇠", "성위", "인연 분석", "연애 궁합"],
  image: "https://code-destiny.com/fuctionassets/sukyo.webp",
  featureList: ["27숙 관계 타입 산출", "인연 레이더 지수", "관계 목적별 조언"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: oracleSukuyoText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: oracleSukuyoText("service.seoText"),
  localized: {
    en: {
      title: "Sukuyo Relationship Radar | Code Destiny",
      h1: "Sukuyo Relationship Radar",
      description:
        "Analyze your Sukuyo relationship with another person by birth date, and check attraction, steadiness, exhaustion, and long-term connection potential.",
      landingPoints: ["27 lunar mansion relationship type", "Relationship radar index", "Advice by relationship purpose"],
      seoText:
        "Sukuyo Relationship Radar reflects attraction, steadiness, exhaustion, and long-term potential through both people's natal mansion and 27-mansion relationship.",
      valueGuideTitle: "Six Steps to Apply Sukuyo in Real Relationships",
      valueSections: [
        {
          title: "1. The heart of Sukuyo is reading the rhythm of the Moon",
          body:
            "Sukuyo focuses on lunar change and emotional rhythm more than Sun-centered interpretation. This makes it strong for reading everyday tempo and relationship response speed as well as personality. Use the result as a guide for adjusting life rhythm, not as a personality label.",
        },
        {
          title: "2. The 27 mansions classify operation, not rank",
          body:
            "The same mansion can reveal different strengths depending on the environment. Some mansions are suited to quick execution, while others are strong in checking and accumulation. Reading by context shows where your mansion works efficiently and where it becomes overloaded.",
        },
        {
          title: "3. Sukuyo compatibility is about tempo alignment, not scores",
          body:
            "In relationships, conflict often begins from speed differences rather than content. Sukuyo compatibility can show this tempo gap in advance, making conversation rules easier to set. Response time, how plans are decided, and recovery routines after conflict can stabilize even combinations that look difficult.",
        },
        {
          title: "4. It becomes more useful when attached to weekly and monthly routines",
          body:
            "Do not stop at reading the result; connect it to schedule management. Dividing focus days, meeting days, and relationship recovery days makes the rhythm easier to feel. The simplest way to turn divination into productivity is to translate interpretation into weekly action items.",
        },
        {
          title: "5. Behavioral suggestions are safer than fixed statements",
          body:
            "Statements such as absolutely matches or never matches reduce trust. Satisfaction rises when the reading offers ways to ask questions, agree in order, and repair conflict. Sukuyo quality becomes higher when it guides rather than judges.",
        },
        {
          title: "6. Build your own rhythm archive through repeated observation",
          body:
            "Repeated records offer more insight than a single result. Track emotional changes before and after important plans, relationship responses, and focus times for two or three weeks. The accumulated record can support real decisions in next month's planning and relationship adjustment.",
        },
      ],
    },
    ja: {
      title: "宿曜ご縁レーダー | Code Destiny",
      h1: "宿曜ご縁レーダー",
      description:
        "相手の生年月日から宿曜占星術の関係を読み、惹かれ方、安心感、消耗度、長く続くご縁の可能性を見ていきます。",
      landingPoints: ["27宿の関係タイプ算出", "ご縁レーダー指数", "関係の目的別アドバイス"],
      seoText:
        "宿曜ご縁レーダーは、二人の本命宿と27宿の関係をもとに、惹かれ方、安心感、消耗度、長く続くご縁の可能性を映します。",
      valueGuideTitle: "宿曜占星術を実際の関係に生かす6つのステップ",
      valueSections: [
        {
          title: "1. 宿曜占星術の核心は、月のリズムを読むことです",
          body:
            "宿曜占星術は、太陽中心の解釈よりも月の変化と感情のリズムに深く向き合います。そのため性格だけでなく、日常のテンポや関係での反応速度を読むことに強みがあります。結果を性格のラベルにするより、生活リズムを整える基準として使うと実感が高まります。",
        },
        {
          title: "2. 27宿は順位表ではなく、働き方の分類です",
          body:
            "同じ宿でも、環境によって強みの出方は変わります。すばやい実行に向く宿もあれば、確認や積み重ねに力を発揮する宿もあります。良い悪いで決めつけず、自分の宿がどんな場面でよく働き、どんな場面で負荷がかかりやすいかを文脈で読むことが大切です。",
        },
        {
          title: "3. 宿曜の相性は、点数よりテンポの調整が要です",
          body:
            "関係では、言葉の内容より速度の違いから摩擦が起きることがよくあります。宿曜の相性はそのテンポ差を先に見せてくれるため、会話の約束を整えるのに役立ちます。返事の時間、予定の決め方、衝突後の戻り方を合わせると、難しく見える組み合わせも安定して運用できます。",
        },
        {
          title: "4. 月間・週間ルーティンに結びつけると使いやすくなります",
          body:
            "宿曜の結果は、読んで終わりにせず予定の組み方へつなげてください。集中する日、会議の日、関係を回復する日を分けて使うと、リズムの違いを感じやすくなります。占いの言葉を週間予定の行動項目へ変えることが、実用化の近道です。",
        },
        {
          title: "5. 表現は断定より、行動の提案が安全です",
          body:
            "宿曜の読みで「絶対合う」「絶対合わない」と言い切る表現は、信頼を弱めます。誤解を減らす質問の仕方、合意の順番、衝突後の修復方法を示すほど、読みは現実に役立ちます。宿曜は判決より案内として働くとき、質が高まります。",
        },
        {
          title: "6. くり返し観察して、自分だけのリズム記録を作りましょう",
          body:
            "一度の結果より、くり返した記録のほうが深い気づきをくれます。大切な予定の前後の感情変化、人間関係の反応、集中しやすい時間帯を2、3週間追うだけで、宿曜の読みが自分のデータと結びつきます。その記録は来月の計画や関係調整の判断材料になります。",
        },
      ],
    },
    "zh-CN": {
      title: "宿曜缘分雷达 | Code Destiny",
      h1: "宿曜缘分雷达",
      description:
        "通过对方出生日期分析与你的宿曜关系，查看吸引力、安定感、消耗度与长期缘分可能性。",
      landingPoints: ["27宿关系类型计算", "缘分雷达指数", "按关系目的给出建议"],
      seoText:
        "宿曜缘分雷达基于两人的本命宿与27宿关系，照见吸引力、安定感、消耗度与长期缘分可能性。",
      valueGuideTitle: "把宿曜用于现实关系的6个步骤",
      valueSections: [
        {
          title: "1. 宿曜的核心是读取月亮节奏",
          body:
            "宿曜比起太阳中心解释，更关注月亮变化与情绪节奏。因此它不仅适合看性格，也适合看日常步调和关系反应速度。把结果作为调整生活节奏的基准，而不是性格标签，体感价值会更高。",
        },
        {
          title: "2. 27宿不是等级表，而是运作方式分类",
          body:
            "同一个宿在不同环境中会显出不同强项。有的宿适合快速执行，有的宿擅长确认与积累。若用好坏判定，解读会变浅；按情境阅读自己的宿在哪些场合高效、哪些场合容易过载，才更重要。",
        },
        {
          title: "3. 宿曜相性的核心不是分数，而是调节节奏",
          body:
            "关系中很多冲突来自速度差，而不是话语内容。宿曜相性提前显示这种节奏差，因此有助于制定对话规则。回应时间、决定约定的方式、冲突后的恢复流程调好后，看似低分的组合也能稳定运作。",
        },
        {
          title: "4. 连接到月度与周度例行安排会更有用",
          body:
            "不要只读完结果就结束，可以把它连接到日程管理。把专注工作日、会议日、关系修复日分开安排，会更快感受到节奏。把占卜内容转为周计划中的行动项，是最简单的应用方式。",
        },
        {
          title: "5. 表达上以行动建议代替断定更安全",
          body:
            "在宿曜解读中，说绝对合适或绝对不合适，会降低信任感。提供减少误解的提问方式、协商顺序、冲突修复方式，才会提高实用性。宿曜更像引导，而不是判决。",
        },
        {
          title: "6. 通过重复观察建立自己的节奏档案",
          body:
            "比起一次结果，重复记录会带来更大洞察。只要追踪两三周重要日程前后的情绪变化、人际反应与集中时段，宿曜解读就会与个人数据结合。这些记录可以用于下月计划和关系调节。",
        },
      ],
    },
    "zh-TW": {
      title: "宿曜緣分雷達 | Code Destiny",
      h1: "宿曜緣分雷達",
      description:
        "透過對方出生日期分析與你的宿曜關係，查看吸引力、安定感、消耗度與長期緣分可能性。",
      landingPoints: ["27宿關係類型計算", "緣分雷達指數", "按關係目的給出建議"],
      seoText:
        "宿曜緣分雷達基於兩人的本命宿與27宿關係，照見吸引力、安定感、消耗度與長期緣分可能性。",
      valueGuideTitle: "把宿曜用於現實關係的6個步驟",
      valueSections: [
        {
          title: "1. 宿曜的核心是讀取月亮節奏",
          body:
            "宿曜比起太陽中心解釋，更關注月亮變化與情緒節奏。因此它不僅適合看性格，也適合看日常步調和關係反應速度。把結果作為調整生活節奏的基準，而不是性格標籤，體感價值會更高。",
        },
        {
          title: "2. 27宿不是等級表，而是運作方式分類",
          body:
            "同一個宿在不同環境中會顯出不同強項。有的宿適合快速執行，有的宿擅長確認與累積。若用好壞判定，解讀會變淺；按情境閱讀自己的宿在哪些場合高效、哪些場合容易過載，才更重要。",
        },
        {
          title: "3. 宿曜相性的核心不是分數，而是調節節奏",
          body:
            "關係中很多衝突來自速度差，而不是話語內容。宿曜相性提前顯示這種節奏差，因此有助於制定對話規則。回應時間、決定約定的方式、衝突後的恢復流程調好後，看似低分的組合也能穩定運作。",
        },
        {
          title: "4. 連接到月度與週度例行安排會更有用",
          body:
            "不要只讀完結果就結束，可以把它連接到日程管理。把專注工作日、會議日、關係修復日分開安排，會更快感受到節奏。把占卜內容轉為週計畫中的行動項，是最簡單的應用方式。",
        },
        {
          title: "5. 表達上以行動建議代替斷定更安全",
          body:
            "在宿曜解讀中，說絕對合適或絕對不合適，會降低信任感。提供減少誤解的提問方式、協商順序、衝突修復方式，才會提高實用性。宿曜更像引導，而不是判決。",
        },
        {
          title: "6. 透過重複觀察建立自己的節奏檔案",
          body:
            "比起一次結果，重複記錄會帶來更大洞察。只要追蹤兩三週重要日程前後的情緒變化、人際反應與集中時段，宿曜解讀就會與個人資料結合。這些記錄可以用於下月計畫和關係調節。",
        },
      ],
    },
    vi: {
      title: "Radar duyên phận Sukuyo | Code Destiny",
      h1: "Radar duyên phận Sukuyo",
      description:
        "Phân tích quan hệ Sukuyo giữa bạn và người ấy bằng ngày sinh, rồi xem sức hút, độ ổn định, mức tiêu hao và khả năng gắn bó dài lâu.",
      landingPoints: ["Tính loại quan hệ 27 tú", "Chỉ số radar duyên phận", "Lời khuyên theo mục đích quan hệ"],
      seoText:
        "Radar duyên phận Sukuyo soi sức hút, độ ổn định, mức tiêu hao và tiềm năng dài lâu dựa trên bổn mệnh tú và quan hệ 27 tú của hai người.",
      valueGuideTitle: "6 bước áp dụng Sukuyo vào quan hệ thực tế",
      valueSections: [
        {
          title: "1. Cốt lõi của Sukuyo là đọc nhịp của Mặt Trăng",
          body:
            "Sukuyo tập trung vào biến đổi Mặt Trăng và nhịp cảm xúc hơn cách đọc lấy Mặt Trời làm trung tâm. Vì vậy nó mạnh ở việc đọc nhịp sống và tốc độ phản ứng trong quan hệ. Hãy dùng kết quả để điều chỉnh nhịp sống, không phải dán nhãn tính cách.",
        },
        {
          title: "2. 27 tú là phân loại cách vận hành, không phải bảng xếp hạng",
          body:
            "Cùng một tú có thể bộc lộ thế mạnh khác nhau theo môi trường. Có tú thuận cho hành động nhanh, có tú mạnh về kiểm tra và tích lũy. Đọc theo bối cảnh giúp bạn biết khi nào nhịp của mình hiệu quả và khi nào dễ quá tải.",
        },
        {
          title: "3. Độ hợp Sukuyo nằm ở chỉnh nhịp, không phải điểm số",
          body:
            "Trong quan hệ, xung đột thường đến từ khác biệt tốc độ hơn là nội dung lời nói. Sukuyo cho thấy khoảng cách nhịp này sớm, nên hữu ích khi đặt quy tắc trò chuyện. Thời gian phản hồi, cách quyết định lịch hẹn và thói quen phục hồi sau mâu thuẫn có thể làm quan hệ ổn hơn.",
        },
        {
          title: "4. Gắn với lịch tuần và tháng sẽ hữu ích hơn",
          body:
            "Đừng chỉ đọc kết quả rồi dừng lại; hãy nối nó với cách vận hành lịch. Chia ngày tập trung, ngày họp và ngày phục hồi quan hệ giúp bạn cảm nhịp nhanh hơn. Cách dễ nhất để biến bói toán thành công cụ năng suất là chuyển diễn giải thành hành động trong lịch tuần.",
        },
        {
          title: "5. Gợi ý hành động an toàn hơn lời khẳng định",
          body:
            "Những câu như tuyệt đối hợp hoặc tuyệt đối không hợp làm giảm độ tin cậy. Cách hỏi giảm hiểu lầm, thứ tự thỏa thuận và cách phục hồi sau xung đột sẽ làm bài đọc hữu ích hơn. Sukuyo có chất lượng cao nhất khi hướng dẫn thay vì phán quyết.",
        },
        {
          title: "6. Quan sát lặp lại để tạo kho nhịp riêng",
          body:
            "Ghi chép lặp lại đem lại nhiều insight hơn một kết quả đơn lẻ. Theo dõi thay đổi cảm xúc trước sau lịch quan trọng, phản ứng quan hệ và khung giờ tập trung trong hai hoặc ba tuần. Dữ liệu tích lũy có thể hỗ trợ kế hoạch tháng tới và điều chỉnh quan hệ.",
        },
      ],
    },
    hi: {
      title: "सुकुयो संबंध रडार | Code Destiny",
      h1: "सुकुयो संबंध रडार",
      description:
        "जन्मतिथि से दूसरे व्यक्ति के साथ आपका सुकुयो संबंध पढ़ें और आकर्षण, स्थिरता, थकान और दीर्घकालिक जुड़ाव की संभावना देखें.",
      landingPoints: ["27 lunar mansion संबंध प्रकार", "संबंध रडार सूचकांक", "संबंध उद्देश्य अनुसार सलाह"],
      seoText:
        "सुकुयो संबंध रडार दोनों लोगों के natal mansion और 27 mansion संबंध के आधार पर आकर्षण, स्थिरता, थकान और दीर्घकालिक संभावना दिखाता है.",
      valueGuideTitle: "सुकुयो को वास्तविक संबंधों में लागू करने के 6 चरण",
      valueSections: [
        {
          title: "1. सुकुयो का केंद्र चंद्र लय पढ़ना है",
          body:
            "सुकुयो सूर्य-केंद्रित व्याख्या से अधिक चंद्र परिवर्तन और भावनात्मक लय पर ध्यान देता है. इसलिए यह व्यक्तित्व के साथ दैनिक गति और संबंध प्रतिक्रिया की गति पढ़ने में सहायक है. परिणाम को लेबल नहीं, जीवन लय समायोजन का आधार मानें.",
        },
        {
          title: "2. 27 नक्षत्र रैंकिंग नहीं, संचालन शैली की श्रेणी हैं",
          body:
            "एक ही नक्षत्र अलग वातावरण में अलग शक्ति दिखा सकता है. कुछ तेजी से काम करने में अच्छे होते हैं, कुछ जाँच और संचय में. संदर्भ से पढ़ने पर समझ आता है कि आपकी लय कहाँ प्रभावी है और कहाँ अधिक भार लेती है.",
        },
        {
          title: "3. सुकुयो संगतता अंक से अधिक तालमेल है",
          body:
            "संबंधों में संघर्ष अक्सर बात की सामग्री से नहीं, गति के अंतर से आता है. सुकुयो यह अंतर पहले दिखा सकता है, इसलिए बातचीत नियम तय करना आसान होता है. उत्तर समय, योजना तय करने का तरीका और संघर्ष के बाद वापसी की आदत संबंध स्थिर कर सकती है.",
        },
        {
          title: "4. मासिक और साप्ताहिक रूटीन से जोड़ें",
          body:
            "परिणाम पढ़कर रुकें नहीं, उसे समय-सारिणी से जोड़ें. ध्यान कार्य दिवस, बैठक दिवस और संबंध सुधार दिवस अलग करने से लय जल्दी महसूस होती है. व्याख्या को साप्ताहिक कार्य बिंदु बनाना इसे उत्पादकता साधन बनाता है.",
        },
        {
          title: "5. निश्चित कथन से अधिक व्यवहार सुझाव सुरक्षित हैं",
          body:
            "पूर्ण मेल या बिल्कुल मेल नहीं जैसे कथन भरोसा घटाते हैं. गलतफहमी घटाने के प्रश्न, सहमति क्रम और संघर्ष सुधार विधि अधिक उपयोगी हैं. सुकुयो निर्णय से अधिक मार्गदर्शन बने तो गुणवत्ता बढ़ती है.",
        },
        {
          title: "6. दोहराए अवलोकन से अपनी लय का संग्रह बनाएं",
          body:
            "एक परिणाम से अधिक बार-बार रिकॉर्ड गहरी समझ देते हैं. महत्वपूर्ण योजनाओं के पहले और बाद भावनाएँ, संबंध प्रतिक्रियाएँ और ध्यान समय दो-तीन सप्ताह देखें. यह संग्रह अगले महीने की योजना और संबंध समायोजन में निर्णय आधार बन सकता है.",
        },
      ],
    },
    es: {
      title: "Radar de vínculo Sukuyo | Code Destiny",
      h1: "Radar de vínculo Sukuyo",
      description:
        "Analiza tu relación Sukuyo con otra persona por fecha de nacimiento y revisa atracción, estabilidad, desgaste y potencial a largo plazo.",
      landingPoints: ["Tipo de relación de 27 mansiones", "Índice radar del vínculo", "Consejos por propósito relacional"],
      seoText:
        "El radar Sukuyo refleja atracción, estabilidad, desgaste y potencial duradero a partir de la mansión natal de ambos y la relación de 27 mansiones.",
      valueGuideTitle: "6 pasos para aplicar Sukuyo en relaciones reales",
      valueSections: [
        {
          title: "1. El centro de Sukuyo es leer el ritmo lunar",
          body:
            "Sukuyo se enfoca en cambios lunares y ritmo emocional más que en una lectura solar. Por eso sirve para leer tempo diario y velocidad de respuesta en vínculos. Usa el resultado como guía para ajustar ritmo, no como etiqueta.",
        },
        {
          title: "2. Las 27 mansiones clasifican funcionamiento, no rango",
          body:
            "La misma mansión puede mostrar fuerzas distintas según el entorno. Algunas favorecen ejecución rápida y otras revisión y acumulación. Leer por contexto muestra dónde tu mansión funciona bien y dónde se sobrecarga.",
        },
        {
          title: "3. La compatibilidad Sukuyo trata de ajustar tempo, no puntos",
          body:
            "En las relaciones, muchos conflictos nacen de diferencias de velocidad. Sukuyo muestra esa brecha de tempo y ayuda a crear reglas de conversación. Tiempo de respuesta, forma de decidir planes y recuperación tras conflicto estabilizan incluso combinaciones difíciles.",
        },
        {
          title: "4. Únelo a rutinas semanales y mensuales",
          body:
            "No termines al leer el resultado; conéctalo con la agenda. Separar días de enfoque, reuniones y reparación relacional hace el ritmo más visible. Convertir la interpretación en acciones semanales vuelve práctica la lectura.",
        },
        {
          title: "5. Las sugerencias de acción son más seguras que los absolutos",
          body:
            "Decir que algo encaja o no encaja de forma absoluta reduce confianza. Preguntas que reducen malentendidos, orden para acordar y reparación de conflicto elevan la utilidad. Sukuyo funciona mejor como guía que como sentencia.",
        },
        {
          title: "6. Crea tu archivo de ritmo con observación repetida",
          body:
            "Los registros repetidos dan más insight que un resultado aislado. Sigue emociones antes y después de planes importantes, respuestas relacionales y horas de enfoque durante dos o tres semanas. Ese archivo ayuda en planes del mes siguiente y ajustes de vínculo.",
        },
      ],
    },
    fr: {
      title: "Radar de lien Sukuyo | Code Destiny",
      h1: "Radar de lien Sukuyo",
      description:
        "Analysez votre relation Sukuyo avec une autre personne par date de naissance, et observez attraction, stabilité, épuisement et potentiel durable.",
      landingPoints: ["Type relationnel des 27 mansions", "Indice radar du lien", "Conseils selon le but relationnel"],
      seoText:
        "Le radar Sukuyo éclaire attraction, stabilité, épuisement et potentiel à long terme à partir de la mansion natale des deux personnes et de la relation des 27 mansions.",
      valueGuideTitle: "6 étapes pour appliquer Sukuyo aux relations réelles",
      valueSections: [
        {
          title: "1. Le cœur de Sukuyo est la lecture du rythme lunaire",
          body:
            "Sukuyo se concentre sur les variations de la Lune et le rythme émotionnel plus que sur une lecture solaire. Il aide donc à lire le tempo quotidien et la vitesse de réponse relationnelle. Utilisez le résultat pour ajuster votre rythme, non pour coller une étiquette.",
        },
        {
          title: "2. Les 27 mansions classent le fonctionnement, pas le rang",
          body:
            "Une même mansion révèle des forces différentes selon le contexte. Certaines favorisent l'exécution rapide, d'autres la vérification et l'accumulation. Lire par contexte montre où votre rythme est efficace et où il surcharge.",
        },
        {
          title: "3. La compatibilité Sukuyo concerne le tempo, pas le score",
          body:
            "Dans les relations, les conflits viennent souvent de différences de vitesse. Sukuyo montre cet écart de tempo et aide à poser des règles de dialogue. Temps de réponse, manière de décider et routine de réparation stabilisent même des combinaisons difficiles.",
        },
        {
          title: "4. Reliez-le aux routines hebdomadaires et mensuelles",
          body:
            "Ne vous arrêtez pas à la lecture du résultat; connectez-la à l'agenda. Séparer jours de concentration, réunions et réparation relationnelle rend le rythme plus sensible. Transformer l'interprétation en actions hebdomadaires la rend pratique.",
        },
        {
          title: "5. Les propositions d'action sont plus sûres que les verdicts",
          body:
            "Dire qu'une relation correspond absolument ou non fragilise la confiance. Des questions pour éviter les malentendus, un ordre d'accord et des méthodes de réparation rendent la lecture utile. Sukuyo gagne en qualité lorsqu'il guide plutôt qu'il juge.",
        },
        {
          title: "6. Créez votre archive de rythme par observation répétée",
          body:
            "Les notes répétées offrent plus d'insight qu'un seul résultat. Suivez pendant deux ou trois semaines les émotions autour des rendez-vous importants, les réactions relationnelles et les heures de concentration. Cette archive soutiendra vos plans et ajustements relationnels.",
        },
      ],
    },
    de: {
      title: "Sukuyo-Beziehungsradar | Code Destiny",
      h1: "Sukuyo-Beziehungsradar",
      description:
        "Analysiere deine Sukuyo-Beziehung zu einer anderen Person über das Geburtsdatum und prüfe Anziehung, Stabilität, Erschöpfung und langfristiges Potenzial.",
      landingPoints: ["27-Mondstationen-Beziehungstyp", "Beziehungsradar-Index", "Rat nach Beziehungsziel"],
      seoText:
        "Der Sukuyo-Beziehungsradar zeigt Anziehung, Stabilität, Erschöpfung und langfristiges Potenzial anhand der natalen Mondstationen beider Personen und ihrer 27-Stationen-Beziehung.",
      valueGuideTitle: "6 Schritte, um Sukuyo praktisch in Beziehungen zu nutzen",
      valueSections: [
        {
          title: "1. Das Herz von Sukuyo ist das Lesen des Mondrhythmus",
          body:
            "Sukuyo konzentriert sich stärker auf Mondwandel und emotionale Rhythmen als auf sonnenzentrierte Deutung. Dadurch eignet es sich für Alltagstempo und Reaktionsgeschwindigkeit in Beziehungen. Nutze das Ergebnis als Rhythmuskompass, nicht als Persönlichkeitslabel.",
        },
        {
          title: "2. Die 27 Mondstationen ordnen Funktionsweisen, keine Ränge",
          body:
            "Dieselbe Station kann je nach Umfeld andere Stärken zeigen. Manche sind stark in schneller Umsetzung, andere in Prüfung und Aufbau. Kontextbezogenes Lesen zeigt, wo dein Rhythmus effizient ist und wo Überlastung entsteht.",
        },
        {
          title: "3. Sukuyo-Kompatibilität meint Tempoabgleich, nicht Punkte",
          body:
            "In Beziehungen entstehen Konflikte oft aus Geschwindigkeitsunterschieden. Sukuyo zeigt diese Lücke früh und hilft, Gesprächsregeln zu setzen. Antwortzeit, Planungsweise und Erholung nach Konflikt können auch schwierige Kombinationen stabilisieren.",
        },
        {
          title: "4. Mit Wochen- und Monatsroutinen wird es nützlicher",
          body:
            "Lass es nicht beim Lesen; verbinde das Ergebnis mit deiner Planung. Fokus-, Meeting- und Beziehungserholungstage getrennt zu setzen macht Rhythmus spürbarer. Deutung als Wochenaktion zu formulieren macht Sukuyo praktisch.",
        },
        {
          title: "5. Handlungsvorschläge sind sicherer als absolute Aussagen",
          body:
            "Absolute Aussagen über Passung schwächen Vertrauen. Fragen gegen Missverständnisse, Reihenfolge für Einigung und Konfliktreparatur machen die Lesung hilfreicher. Sukuyo gewinnt an Qualität, wenn es führt statt urteilt.",
        },
        {
          title: "6. Baue durch Wiederholung dein Rhythmusarchiv",
          body:
            "Wiederholte Notizen bringen mehr Einsicht als ein einzelnes Ergebnis. Verfolge zwei bis drei Wochen Gefühle vor und nach wichtigen Terminen, Beziehungsreaktionen und Fokuszeiten. Dieses Archiv hilft bei Monatsplanung und Beziehungsabstimmung.",
        },
      ],
    },
    nl: {
      title: "Sukuyo relatie-radar | Code Destiny",
      h1: "Sukuyo relatie-radar",
      description:
        "Analyseer je Sukuyo-relatie met iemand via geboortedatum en bekijk aantrekking, stabiliteit, uitputting en langetermijnpotentieel.",
      landingPoints: ["Relatietype van 27 maanhuizen", "Relatieradar-index", "Advies per relatiedoel"],
      seoText:
        "De Sukuyo relatie-radar toont aantrekking, stabiliteit, uitputting en langdurig potentieel op basis van de natal mansion van beide personen en hun 27-mansion relatie.",
      valueGuideTitle: "6 stappen om Sukuyo praktisch in relaties te gebruiken",
      valueSections: [
        {
          title: "1. De kern van Sukuyo is het lezen van maanritme",
          body:
            "Sukuyo richt zich op maanverandering en emotioneel ritme, meer dan zongecentreerde duiding. Daardoor is het sterk in dagelijks tempo en reactiesnelheid in relaties. Gebruik het resultaat als ritmegids, niet als persoonlijkheidslabel.",
        },
        {
          title: "2. De 27 maanhuizen zijn werkingswijzen, geen ranglijst",
          body:
            "Hetzelfde huis kan per omgeving andere kracht tonen. Sommige zijn goed in snelle uitvoering, andere in controleren en opbouwen. Contextueel lezen laat zien waar je ritme efficiënt is en waar overbelasting ontstaat.",
        },
        {
          title: "3. Sukuyo-compatibiliteit draait om tempo, niet scores",
          body:
            "In relaties ontstaan conflicten vaak uit snelheidsverschillen. Sukuyo toont die tempokloof en helpt gespreksregels maken. Responstijd, afspraken beslissen en herstel na conflict kunnen zelfs moeilijke combinaties stabieler maken.",
        },
        {
          title: "4. Koppel het aan week- en maandroutines",
          body:
            "Stop niet na het lezen van het resultaat; verbind het met planning. Focusdagen, vergaderdagen en relatiehersteldagen scheiden maakt ritme voelbaar. Interpretatie omzetten in weekacties maakt Sukuyo praktisch.",
        },
        {
          title: "5. Handelingsvoorstellen zijn veiliger dan vaste uitspraken",
          body:
            "Absolute uitspraken over wel of niet passen verminderen vertrouwen. Vragen die misverstanden beperken, volgorde van afstemming en herstel na conflict maken de lezing nuttiger. Sukuyo werkt beter als gids dan als oordeel.",
        },
        {
          title: "6. Bouw je eigen ritmearchief door herhaald observeren",
          body:
            "Herhaalde notities geven meer inzicht dan één resultaat. Volg twee of drie weken emoties rond belangrijke plannen, relatiereacties en focustijden. Dat archief helpt bij volgende maand plannen en relaties afstemmen.",
        },
      ],
    },
    ms: {
      title: "Radar hubungan Sukuyo | Code Destiny",
      h1: "Radar hubungan Sukuyo",
      description:
        "Analisis hubungan Sukuyo anda dengan seseorang melalui tarikh lahir, lalu semak tarikan, kestabilan, keletihan dan potensi hubungan jangka panjang.",
      landingPoints: ["Jenis hubungan 27 mansion bulan", "Indeks radar hubungan", "Nasihat mengikut tujuan hubungan"],
      seoText:
        "Radar hubungan Sukuyo mencerminkan tarikan, kestabilan, keletihan dan potensi jangka panjang berdasarkan natal mansion dan hubungan 27 mansion kedua-dua orang.",
      valueGuideTitle: "6 langkah menerapkan Sukuyo dalam hubungan sebenar",
      valueSections: [
        {
          title: "1. Inti Sukuyo ialah membaca ritma Bulan",
          body:
            "Sukuyo memberi tumpuan kepada perubahan Bulan dan ritma emosi lebih daripada tafsiran berpusatkan Matahari. Ia kuat untuk membaca tempo harian dan kelajuan reaksi dalam hubungan. Gunakan hasil sebagai panduan melaras ritma, bukan label personaliti.",
        },
        {
          title: "2. 27 mansion mengelaskan cara berfungsi, bukan kedudukan",
          body:
            "Mansion yang sama boleh menunjukkan kekuatan berbeza mengikut persekitaran. Ada yang sesuai untuk tindakan cepat, ada yang kuat dalam semakan dan pengumpulan. Bacaan mengikut konteks menunjukkan di mana ritma anda berkesan dan di mana ia terlebih beban.",
        },
        {
          title: "3. Keserasian Sukuyo ialah penyelarasan tempo, bukan skor",
          body:
            "Dalam hubungan, konflik sering bermula daripada perbezaan kelajuan. Sukuyo menunjukkan jurang tempo ini lebih awal, lalu membantu menetapkan peraturan perbualan. Masa respons, cara membuat janji dan rutin pulih selepas konflik boleh menstabilkan hubungan.",
        },
        {
          title: "4. Ia lebih berguna apabila disambung kepada rutin minggu dan bulan",
          body:
            "Jangan berhenti selepas membaca hasil; sambungkan kepada pengurusan jadual. Asingkan hari fokus, hari mesyuarat dan hari pemulihan hubungan supaya ritma lebih terasa. Menukar tafsiran kepada tindakan mingguan menjadikannya praktikal.",
        },
        {
          title: "5. Cadangan tindakan lebih selamat daripada kenyataan mutlak",
          body:
            "Kenyataan mutlak tentang serasi atau tidak serasi mengurangkan kepercayaan. Cara bertanya yang mengurangkan salah faham, urutan persetujuan dan cara membaiki konflik menjadikan bacaan lebih berguna. Sukuyo paling berkualiti apabila membimbing, bukan menghukum.",
        },
        {
          title: "6. Bina arkib ritma sendiri melalui pemerhatian berulang",
          body:
            "Rekod berulang memberi lebih banyak wawasan daripada satu keputusan. Jejaki perubahan emosi sebelum dan selepas jadual penting, reaksi hubungan dan waktu fokus selama dua atau tiga minggu. Rekod terkumpul boleh membantu rancangan bulan depan dan pelarasan hubungan.",
        },
      ],
    },
  },
  valueGuideTitle: oracleSukuyoText("valueGuide.title"),
  valueSections: [
    {
      title: oracleSukuyoText("value.1.title"),
      body:
        "숙요점은 태양 중심 해석보다 달의 변화와 감정 리듬에 집중합니다. 그래서 성향 분석뿐 아니라 일상 템포, 관계 반응 속도를 읽는 데 강점이 있습니다. 결과를 성격 꼬리표로 쓰기보다 생활 리듬을 조정하는 기준으로 쓰면 체감 효용이 크게 올라갑니다.",
    },
    {
      title: oracleSukuyoText("value.2.title"),
      body:
        "같은 수라도 환경에 따라 강점이 다르게 드러납니다. 어떤 수는 빠른 실행에 유리하고, 어떤 수는 확인과 축적에 강합니다. 좋고 나쁨으로 단정하면 해석이 얕아지므로, 내 수가 어떤 상황에서 효율적이고 어떤 상황에서 과부하가 나는지 맥락 중심으로 읽는 것이 중요합니다.",
    },
    {
      title: oracleSukuyoText("value.3.title"),
      body:
        "관계에서는 말의 내용보다 속도 차이에서 갈등이 발생하는 경우가 많습니다. 숙요 궁합은 이 템포 차이를 미리 보여주기 때문에 대화 규칙을 세우는 데 유용합니다. 응답 시간, 약속 결정 방식, 갈등 후 회복 루틴을 맞추면 낮은 궁합 점수로 보이던 조합도 안정적으로 운영할 수 있습니다.",
    },
    {
      title: oracleSukuyoText("value.4.title"),
      body:
        "숙요 결과를 읽고 끝내지 말고 일정 운영에 연결해 보세요. 집중 작업일, 회의일, 관계 회복일을 나누는 방식으로 적용하면 리듬 체감이 빨라집니다. 점술 콘텐츠를 생산성 도구로 전환하는 가장 쉬운 방법은 해석을 주간 계획표의 행동 항목으로 바꾸는 것입니다.",
    },
    {
      title: oracleSukuyoText("value.5.title"),
      body:
        "숙요 해석에서 절대 맞는다, 절대 안 맞는다 같은 문장은 신뢰를 떨어뜨립니다. 대신 오해를 줄이는 질문법, 합의 순서, 갈등 복구 방식 같은 행동 제안을 제공하면 사용자 만족도와 재방문율이 함께 올라갑니다. 숙요점은 판결보다 안내에 가까울 때 품질이 높습니다.",
    },
    {
      title: oracleSukuyoText("value.6.title"),
      body:
        "한 번의 결과보다 반복 기록이 더 큰 통찰을 줍니다. 중요한 일정 전후의 감정 변화, 대인관계 반응, 집중 시간대를 2~3주만 추적해도 숙요 해석이 개인 데이터와 결합됩니다. 이렇게 축적된 기록은 다음 달 계획이나 관계 조율에서 실제 의사결정 근거로 활용할 수 있습니다.",
    },
  ],
};

export default function SukuyoLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
