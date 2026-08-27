import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const VEDIC_JYOTISH_TEXT_TRANSLATIONS = {
  ko: {
    "meta.title": "조티쉬 차트 보는 곳 | 무료 라그나·라시·다샤 계산",
    "meta.description": "생년월일과 출생 시간으로 라그나와 라시 차트, 빈쇼타리 다샤를 계산해 주는 조티쉬 차트입니다. 항성 황도와 Lahiri 아야남샤 기준으로 그라하·바바 배치를 표로 봅니다.",
    "service.h1": "조티쉬 차트 (Jyotish) — 라그나·라시·다샤",
    "service.seoText": "베다 점성술은 항성 황도, Lahiri 아야남샤, Whole Sign Bhava, 27개 나크샤트라와 빈쇼타리 다샤를 함께 살펴 삶의 주제를 읽는 전통 점성 체계입니다.",
    "valueGuide.title": "베다점 핵심 개념 6가지",
    "value.1.title": "1. 라그나, Lagna는 삶이 시작되는 문입니다",
    "value.2.title": "2. 라시, Rashi는 그라하가 놓인 별자리의 무대입니다",
    "value.3.title": "3. 그라하, Graha는 삶의 힘을 움직이는 행성 신호입니다",
    "value.4.title": "4. 바바, Bhava는 삶을 12개 영역으로 나누어 봅니다",
    "value.5.title": "5. 나크샤트라, Nakshatra는 달의 길을 세밀하게 비춥니다",
    "value.6.title": "6. 다샤, Dasha는 행성의 시기를 읽는 흐름입니다",
  },
  en: {
    "meta.title": "Vedic Astrology (Jyotish) - Rashi and Dasha Reading",
    "meta.description": "A practical guide to reading Rashi charts, Nakshatra, and Dasha cycles through Vedic astrology based on the sidereal zodiac.",
    "service.h1": "Vedic Astrology (Jyotish)",
    "service.seoText": "Vedic astrology is a traditional astrological system that reads long-term flow through the sidereal zodiac and the Dasha timing framework.",
    "valueGuide.title": "Six Practical Points for Reading Vedic Astrology",
    "value.1.title": "1. Vedic astrology begins with the sidereal zodiac",
    "value.2.title": "2. Rashi (D1) and Navamsha (D9) should be read together",
    "value.3.title": "3. Read house, planet, and dignity as one set",
    "value.4.title": "4. Dasha is a timing tool, not a fixed prophecy",
    "value.5.title": "5. Use compatibility readings with lifestyle questions",
    "value.6.title": "6. Turn chart readings into your own data through weekly notes",
  },
};

function vedicJyotishText(key: keyof typeof VEDIC_JYOTISH_TEXT_TRANSLATIONS.ko) {
  return VEDIC_JYOTISH_TEXT_TRANSLATIONS.ko[key] || VEDIC_JYOTISH_TEXT_TRANSLATIONS.en[key] || "Translation pending";
}

const META = {
  path: "/vedic/jyotish",
  title: vedicJyotishText("meta.title"),
  description: vedicJyotishText("meta.description"),
  keywords: ["베다 점성술", "Jyotish", "라그나", "라시", "그라하", "바바", "나크샤트라", "빈쇼타리 다샤"],
  image: "https://code-destiny.com/fuctionassets/veda.webp",
  featureList: ["Sidereal · Lahiri 기준", "Lagna · Rashi · Bhava", "Nakshatra · Vimshottari Dasha"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: vedicJyotishText("service.h1"),
  description: META.description,
  ogImage: META.image,
  landingPoints: [...META.featureList],
  seoText: vedicJyotishText("service.seoText"),
  localized: {
    en: {
      title: "Vedic Astrology (Jyotish) - Rashi and Dasha Reading",
      h1: "Vedic Astrology (Jyotish)",
      description:
        "A practical guide to reading Rashi charts, Nakshatra, and Dasha cycles through Vedic astrology based on the sidereal zodiac.",
      landingPoints: ["Rashi and Navamsha perspective", "Dasha timing", "Life application guide"],
      seoText:
        "Vedic astrology is a traditional astrological system that reads long-term flow through the sidereal zodiac and the Dasha timing framework.",
      valueGuideTitle: "Six Practical Points for Reading Vedic Astrology",
      valueSections: [
        {
          title: "1. Vedic astrology begins with the sidereal zodiac",
          body:
            "The largest difference from Western astrology is the zodiac reference. Vedic astrology calculates from the actual star-based zodiac, so the same person may receive a different sign interpretation. Understanding this first reduces confusion and helps you compare the strengths of each system.",
        },
        {
          title: "2. Rashi (D1) and Navamsha (D9) should be read together",
          body:
            "The Rashi chart shows the basic structure of life, while Navamsha reveals potential and direction of maturity. If you decide from D1 alone, the reading can lean toward a temporary impression. Checking the shared signals between both charts is a steadier way to read.",
        },
        {
          title: "3. Houses, planets, and dignity must be read as one set",
          body:
            "Judging from one planet name creates mistakes. Venus, for example, changes meaning according to house position, dignity, and aspects. Vedic reading links context rather than scoring isolated parts, so single-keyword interpretations should be avoided.",
        },
        {
          title: "4. Dasha is a timing management tool, not a fixed prophecy",
          body:
            "Dasha shows when certain planetary themes rise to the foreground. It becomes useful when treated as a preparation checklist rather than a guaranteed outcome. In a period with strong responsibility signals, structure comes first; in an expansion period, opportunity verification matters.",
        },
        {
          title: "5. Compatibility should be paired with daily-life questions",
          body:
            "Vedic compatibility indicators are useful, but numbers alone can miss the living reality of a relationship. Emotional expression, money habits, and recovery speed after conflict should be checked together. Compatibility is closer to finding shared operating rules than receiving a fate verdict.",
        },
        {
          title: "6. Turn chart interpretation into your own data through weekly records",
          body:
            "After reading the result, record focus, relationship energy, and spending patterns for one week. The chart language then becomes a lived reference point. As this accumulates, astrology can support quarterly planning and important decisions with practical evidence.",
        },
      ],
    },
    ja: {
      title: "ベーダ占星術（Jyotish）- ラーシ・ダシャ解釈",
      h1: "ベーダ占星術（Jyotish）",
      description:
        "恒星黄道にもとづくベーダ占星術で、ラーシチャート、ナクシャトラ、ダシャの流れを読み解く実践的なガイドです。",
      landingPoints: ["ラーシ・ナヴァムシャの視点", "ダシャのタイミング", "生活への活用ガイド"],
      seoText:
        "ベーダ占星術は、恒星黄道とダシャの時期体系をもとに、人生の長い流れを読む伝統的な占星術です。",
      valueGuideTitle: "ベーダ占星術を実用的に読む6つのポイント",
      valueSections: [
        {
          title: "1. ベーダ占星術は恒星黄道を基準にするところから始まります",
          body:
            "西洋占星術との大きな違いは、黄道の基準です。ベーダ占星術は実際の星座位置にもとづいて計算するため、同じ人でも星座の読みが変わることがあります。この違いを先に知っておくと、結果が異なる理由に迷いにくくなり、それぞれの体系の長所を比べて使えます。",
        },
        {
          title: "2. ラーシ（D1）とナヴァムシャ（D9）は一緒に見ると立体的です",
          body:
            "ラーシチャートは人生の基本構造を、ナヴァムシャは潜在力と成熟の方向を映します。D1だけで結論を出すと、一時的な印象に寄りやすくなります。ふたつのチャートに共通して強調されるサインを先に見ると、読みは安定します。",
        },
        {
          title: "3. ハウス、惑星、ディグニティはひとまとまりで読みます",
          body:
            "惑星名ひとつだけで結果を決めると、読み違いが大きくなります。同じ金星でも、ハウスの位置、ディグニティ、アスペクトによって意味は変わります。ベーダの読みは要素を切り離して点数化するより、文脈をつないで読むことが大切です。",
        },
        {
          title: "4. ダシャは予言ではなく、時期を整える道具です",
          body:
            "ダシャは、特定の惑星テーマが前面に出やすい時期を示します。それを結果の確定として受け取るより、準備のチェックリストとして使うと実用的です。責任のサインが強い時期は構造化を、拡大のサインが強い時期は機会の検証を優先する、といった運用ができます。",
        },
        {
          title: "5. 相性は生活の相性質問と一緒に使います",
          body:
            "ベーダ占星術の相性指標は役立ちますが、数字だけで関係を判断すると現実とずれることがあります。感情表現、金銭感覚、衝突後の戻り方など、日常の質問も一緒に見ると読みの質が上がります。相性は運命の判定ではなく、一緒に暮らすための約束を探す過程です。",
        },
        {
          title: "6. 週ごとの記録で、チャートの言葉を自分のデータに変えます",
          body:
            "結果を読んだあと、1週間だけ集中力、人間関係のエネルギー、支出の流れを記録してみてください。チャートの言葉が現実の感覚へ翻訳されます。積み重なるほど、次の四半期計画や大切な決断に占星術を実践的に使えるようになります。",
        },
      ],
    },
    "zh-CN": {
      title: "吠陀占星术（Jyotish）- Rashi与Dasha解读",
      h1: "吠陀占星术（Jyotish）",
      description:
        "基于恒星黄道的吠陀占星术实践指南，用于阅读Rashi星盘、Nakshatra与Dasha流向。",
      landingPoints: ["Rashi与Navamsha视角", "Dasha时机", "生活应用指南"],
      seoText:
        "吠陀占星术是基于恒星黄道与Dasha时期体系，阅读长期流向的传统占星系统。",
      valueGuideTitle: "实用阅读吠陀占星术的6个要点",
      valueSections: [
        {
          title: "1. 吠陀占星术从恒星黄道基准开始",
          body:
            "它与西方占星术最大的差异在于黄道基准。吠陀占星术依据真实恒星位置计算，所以同一个人也可能得到不同星座解释。先理解这点，可以减少对结果差异的困惑，也能比较不同体系的长处。",
        },
        {
          title: "2. Rashi（D1）与Navamsha（D9）一起看才立体",
          body:
            "Rashi星盘显示人生基本结构，Navamsha显示潜力与成熟方向。只凭D1下结论，容易偏向一时印象。先确认两张图中共同强调的信号，阅读会更稳定。",
        },
        {
          title: "3. 宫位、行星与尊贵状态要成组阅读",
          body:
            "只凭一个行星名称判断，错误会变大。同样是金星，宫位、尊贵状态和相位都会改变含义。吠陀解读不是把要素拆开打分，而是连接上下文，因此要避免单一关键词解读。",
        },
        {
          title: "4. Dasha不是预言，而是时期管理工具",
          body:
            "Dasha显示某个行星主题容易浮上台面的时期。把它作为准备清单，而不是结果确定，会更有用。责任信号强的时期优先结构化，扩张信号强的时期优先验证机会。",
        },
        {
          title: "5. 相性解读要配合生活兼容问题",
          body:
            "吠陀相性指标有帮助，但只用数字判断关系，容易脱离现实。情绪表达方式、金钱习惯、冲突后的恢复速度也要一起检查。相性不是命运判决，更像是寻找共同生活的运作规则。",
        },
        {
          title: "6. 用每周记录把星盘解读变成自己的数据",
          body:
            "读完结果后，记录一周的专注度、关系能量和支出模式，星盘语言就会转化为现实感受。这个过程累积后，占星术能成为季度计划和重要决策中的实践参考。",
        },
      ],
    },
    "zh-TW": {
      title: "吠陀占星術（Jyotish）- Rashi與Dasha解讀",
      h1: "吠陀占星術（Jyotish）",
      description:
        "基於恆星黃道的吠陀占星術實踐指南，用於閱讀Rashi星盤、Nakshatra與Dasha流向。",
      landingPoints: ["Rashi與Navamsha視角", "Dasha時機", "生活應用指南"],
      seoText:
        "吠陀占星術是基於恆星黃道與Dasha時期體系，閱讀長期流向的傳統占星系統。",
      valueGuideTitle: "實用閱讀吠陀占星術的6個要點",
      valueSections: [
        {
          title: "1. 吠陀占星術從恆星黃道基準開始",
          body:
            "它與西方占星術最大的差異在於黃道基準。吠陀占星術依據真實恆星位置計算，所以同一個人也可能得到不同星座解釋。先理解這點，可以減少對結果差異的困惑，也能比較不同體系的長處。",
        },
        {
          title: "2. Rashi（D1）與Navamsha（D9）一起看才立體",
          body:
            "Rashi星盤顯示人生基本結構，Navamsha顯示潛力與成熟方向。只憑D1下結論，容易偏向一時印象。先確認兩張圖中共同強調的訊號，閱讀會更穩定。",
        },
        {
          title: "3. 宮位、行星與尊貴狀態要成組閱讀",
          body:
            "只憑一個行星名稱判斷，錯誤會變大。同樣是金星，宮位、尊貴狀態和相位都會改變含義。吠陀解讀不是把要素拆開打分，而是連接上下文，因此要避免單一關鍵詞解讀。",
        },
        {
          title: "4. Dasha不是預言，而是時期管理工具",
          body:
            "Dasha顯示某個行星主題容易浮上檯面的時期。把它作為準備清單，而不是結果確定，會更有用。責任訊號強的時期優先結構化，擴張訊號強的時期優先驗證機會。",
        },
        {
          title: "5. 相性解讀要配合生活相容問題",
          body:
            "吠陀相性指標有幫助，但只用數字判斷關係，容易脫離現實。情緒表達方式、金錢習慣、衝突後的恢復速度也要一起檢查。相性不是命運判決，更像是尋找共同生活的運作規則。",
        },
        {
          title: "6. 用每週記錄把星盤解讀變成自己的資料",
          body:
            "讀完結果後，記錄一週的專注度、關係能量和支出模式，星盤語言就會轉化為現實感受。這個過程累積後，占星術能成為季度計畫和重要決策中的實踐參考。",
        },
      ],
    },
    vi: {
      title: "Chiêm tinh Vệ Đà (Jyotish) - Luận Rashi và Dasha",
      h1: "Chiêm tinh Vệ Đà (Jyotish)",
      description:
        "Hướng dẫn thực hành đọc biểu đồ Rashi, Nakshatra và chu kỳ Dasha bằng chiêm tinh Vệ Đà dựa trên hoàng đạo thiên văn.",
      landingPoints: ["Góc nhìn Rashi và Navamsha", "Thời điểm Dasha", "Hướng dẫn áp dụng đời sống"],
      seoText:
        "Chiêm tinh Vệ Đà là hệ thống truyền thống đọc dòng chảy dài hạn dựa trên hoàng đạo thiên văn và khung thời kỳ Dasha.",
      valueGuideTitle: "6 điểm thực tế khi đọc chiêm tinh Vệ Đà",
      valueSections: [
        {
          title: "1. Chiêm tinh Vệ Đà bắt đầu từ hoàng đạo thiên văn",
          body:
            "Khác biệt lớn nhất với chiêm tinh phương Tây là hệ quy chiếu hoàng đạo. Vệ Đà tính theo vị trí sao thực, nên cùng một người có thể nhận diễn giải cung khác. Hiểu điều này trước giúp giảm bối rối và so sánh được ưu điểm của từng hệ thống.",
        },
        {
          title: "2. Rashi (D1) và Navamsha (D9) nên được đọc cùng nhau",
          body:
            "Rashi cho thấy cấu trúc đời sống cơ bản, còn Navamsha hé lộ tiềm năng và hướng trưởng thành. Nếu kết luận chỉ từ D1, phần đọc có thể nghiêng về ấn tượng tạm thời. Xem tín hiệu chung giữa hai biểu đồ sẽ ổn định hơn.",
        },
        {
          title: "3. Nhà, hành tinh và phẩm vị cần đọc thành một bộ",
          body:
            "Kết luận chỉ từ tên một hành tinh dễ tạo sai lệch. Cùng là Venus, ý nghĩa sẽ đổi theo vị trí nhà, phẩm vị và góc chiếu. Cách đọc Vệ Đà kết nối bối cảnh thay vì chấm điểm từng yếu tố, nên cần tránh diễn giải một từ khóa đơn lẻ.",
        },
        {
          title: "4. Dasha là công cụ vận hành thời kỳ, không phải lời tiên tri",
          body:
            "Dasha cho biết giai đoạn nào một chủ đề hành tinh dễ nổi bật. Nó hữu ích hơn khi được xem như danh sách chuẩn bị thay vì kết quả cố định. Khi tín hiệu trách nhiệm mạnh, hãy ưu tiên cấu trúc; khi tín hiệu mở rộng mạnh, hãy ưu tiên kiểm chứng cơ hội.",
        },
        {
          title: "5. Độ hợp cần đi cùng câu hỏi tương thích đời sống",
          body:
            "Chỉ số độ hợp Vệ Đà hữu ích, nhưng chỉ dùng con số để phán đoán quan hệ có thể lệch thực tế. Cách biểu đạt cảm xúc, thói quen tài chính và tốc độ phục hồi sau xung đột cũng cần được xem cùng. Độ hợp gần với việc tìm quy tắc sống chung hơn là phán quyết số mệnh.",
        },
        {
          title: "6. Biến diễn giải biểu đồ thành dữ liệu riêng bằng ghi chép hằng tuần",
          body:
            "Sau khi đọc, hãy ghi lại mức tập trung, năng lượng quan hệ và mô thức chi tiêu trong một tuần. Ngôn ngữ biểu đồ sẽ trở thành cảm nhận thực tế. Khi tích lũy, chiêm tinh có thể hỗ trợ kế hoạch quý và quyết định quan trọng bằng bằng chứng đời sống.",
        },
      ],
    },
    hi: {
      title: "वैदिक ज्योतिष (Jyotish) - राशि और दशा व्याख्या",
      h1: "वैदिक ज्योतिष (Jyotish)",
      description:
        "नाक्षत्रिक राशि-चक्र पर आधारित वैदिक ज्योतिष से राशि चार्ट, नक्षत्र और दशा प्रवाह पढ़ने की व्यावहारिक गाइड.",
      landingPoints: ["राशि और नवांश दृष्टि", "दशा समय", "जीवन अनुप्रयोग गाइड"],
      seoText:
        "वैदिक ज्योतिष नाक्षत्रिक राशि और दशा समय प्रणाली के आधार पर दीर्घकालिक प्रवाह पढ़ने की पारंपरिक प्रणाली है.",
      valueGuideTitle: "वैदिक ज्योतिष को व्यावहारिक ढंग से पढ़ने के 6 बिंदु",
      valueSections: [
        {
          title: "1. वैदिक ज्योतिष नाक्षत्रिक राशि से शुरू होता है",
          body:
            "पाश्चात्य ज्योतिष से सबसे बड़ा अंतर राशि-चक्र का आधार है. वैदिक ज्योतिष वास्तविक तारकीय स्थिति के आधार पर गणना करता है, इसलिए उसी व्यक्ति की राशि व्याख्या बदल सकती है. इसे पहले समझने से भ्रम घटता है और दोनों प्रणालियों की ताकतों की तुलना की जा सकती है.",
        },
        {
          title: "2. राशि (D1) और नवांश (D9) को साथ पढ़ना चाहिए",
          body:
            "राशि चार्ट जीवन की मूल संरचना दिखाता है, जबकि नवांश क्षमता और परिपक्वता की दिशा खोलता है. केवल D1 से निष्कर्ष निकालने पर पढ़ाई अस्थायी प्रभाव में झुक सकती है. दोनों चार्टों के साझा संकेत पहले देखना अधिक स्थिर तरीका है.",
        },
        {
          title: "3. भाव, ग्रह और गरिमा को एक सेट की तरह पढ़ें",
          body:
            "सिर्फ ग्रह नाम से परिणाम तय करना त्रुटि बढ़ाता है. वही शुक्र भाव स्थिति, गरिमा और दृष्टि के अनुसार अर्थ बदलता है. वैदिक व्याख्या अलग तत्वों को अंक देने से अधिक संदर्भ जोड़ती है, इसलिए एकल कीवर्ड से बचना चाहिए.",
        },
        {
          title: "4. दशा भविष्यवाणी नहीं, समय संचालन का साधन है",
          body:
            "दशा बताती है कि कौन सा ग्रह-विषय किस अवधि में सामने आ सकता है. इसे निश्चित परिणाम नहीं, तैयारी सूची की तरह उपयोग करें. जिम्मेदारी संकेत वाले समय में संरचना, और विस्तार संकेत वाले समय में अवसर की जाँच प्राथमिक हो सकती है.",
        },
        {
          title: "5. संगतता को दैनिक जीवन के प्रश्नों के साथ पढ़ें",
          body:
            "वैदिक संगतता संकेत उपयोगी हैं, पर केवल संख्या से संबंध का निर्णय वास्तविकता से हट सकता है. भाव व्यक्त करने का तरीका, धन आदतें और संघर्ष के बाद लौटने की गति भी देखें. संगतता भाग्य निर्णय नहीं, साथ जीने के संचालन नियम खोजने जैसी है.",
        },
        {
          title: "6. साप्ताहिक रिकॉर्ड से चार्ट भाषा को अपने डेटा में बदलें",
          body:
            "परिणाम पढ़ने के बाद एक सप्ताह तक ध्यान, संबंध ऊर्जा और खर्च पैटर्न लिखें. चार्ट की भाषा वास्तविक अनुभव में बदलती है. यह जमा हो तो आने वाली तिमाही योजना और महत्त्वपूर्ण निर्णयों में ज्योतिष व्यावहारिक आधार दे सकता है.",
        },
      ],
    },
    es: {
      title: "Astrología védica (Jyotish) - Lectura de Rashi y Dasha",
      h1: "Astrología védica (Jyotish)",
      description:
        "Guía práctica para leer cartas Rashi, Nakshatra y ciclos Dasha con astrología védica basada en el zodíaco sideral.",
      landingPoints: ["Perspectiva Rashi y Navamsha", "Tiempo Dasha", "Guía de aplicación vital"],
      seoText:
        "La astrología védica es un sistema tradicional que lee flujos de largo plazo mediante el zodíaco sideral y el marco temporal Dasha.",
      valueGuideTitle: "6 puntos prácticos para leer astrología védica",
      valueSections: [
        {
          title: "1. La astrología védica empieza con el zodíaco sideral",
          body:
            "La gran diferencia con la astrología occidental es la referencia zodiacal. La védica calcula desde posiciones estelares reales, por lo que una misma persona puede recibir otra interpretación de signo. Entenderlo reduce confusión y permite comparar sistemas.",
        },
        {
          title: "2. Rashi (D1) y Navamsha (D9) deben leerse juntos",
          body:
            "La carta Rashi muestra la estructura básica de vida; Navamsha revela potencial y dirección de madurez. Si concluyes solo con D1, la lectura puede apoyarse en una impresión temporal. Revisar señales compartidas entre ambas cartas da más estabilidad.",
        },
        {
          title: "3. Casas, planetas y dignidad se leen como conjunto",
          body:
            "Decidir por el nombre de un planeta aumenta errores. Venus cambia de sentido según casa, dignidad y aspectos. La lectura védica enlaza contexto en vez de puntuar piezas aisladas, por eso conviene evitar interpretaciones de una sola palabra clave.",
        },
        {
          title: "4. Dasha es herramienta de gestión temporal, no profecía",
          body:
            "Dasha indica cuándo ciertos temas planetarios suben al primer plano. Es más útil como lista de preparación que como resultado cerrado. En una etapa de responsabilidad conviene estructurar; en una de expansión, verificar oportunidades.",
        },
        {
          title: "5. La compatibilidad debe acompañarse con preguntas de vida diaria",
          body:
            "Los indicadores védicos de compatibilidad ayudan, pero los números solos pueden alejarse de la realidad. Forma de expresar emociones, hábitos financieros y velocidad de recuperación tras conflicto también importan. La compatibilidad busca reglas de convivencia, no un veredicto del destino.",
        },
        {
          title: "6. Convierte la carta en datos propios con registros semanales",
          body:
            "Después de leer el resultado, registra durante una semana enfoque, energía relacional y patrones de gasto. El lenguaje de la carta se vuelve referencia vivida. Al acumularse, la astrología puede apoyar planes trimestrales y decisiones importantes con evidencia práctica.",
        },
      ],
    },
    fr: {
      title: "Astrologie védique (Jyotish) - Lecture Rashi et Dasha",
      h1: "Astrologie védique (Jyotish)",
      description:
        "Guide pratique pour lire les cartes Rashi, Nakshatra et les cycles Dasha avec l'astrologie védique fondée sur le zodiaque sidéral.",
      landingPoints: ["Perspective Rashi et Navamsha", "Temporalité Dasha", "Guide d'application à la vie"],
      seoText:
        "L'astrologie védique est un système traditionnel qui lit les flux de long terme à partir du zodiaque sidéral et du cadre Dasha.",
      valueGuideTitle: "6 points pratiques pour lire l'astrologie védique",
      valueSections: [
        {
          title: "1. L'astrologie védique commence par le zodiaque sidéral",
          body:
            "La plus grande différence avec l'astrologie occidentale est la référence du zodiaque. Le Jyotish calcule depuis les positions stellaires réelles, donc une même personne peut recevoir une autre lecture de signe. Comprendre cela réduit la confusion et aide à comparer les systèmes.",
        },
        {
          title: "2. Rashi (D1) et Navamsha (D9) se lisent ensemble",
          body:
            "La carte Rashi montre la structure de base de la vie; Navamsha révèle le potentiel et la maturité. Conclure seulement avec D1 peut donner une impression temporaire. Chercher les signaux communs entre les deux cartes rend la lecture plus stable.",
        },
        {
          title: "3. Maisons, planètes et dignité se lisent comme un ensemble",
          body:
            "Décider à partir du nom d'une planète crée des erreurs. Vénus change de sens selon la maison, la dignité et les aspects. La lecture védique relie le contexte au lieu de noter des éléments isolés; évitez donc les mots-clés uniques.",
        },
        {
          title: "4. Dasha est un outil de gestion du temps, pas une prophétie",
          body:
            "Dasha montre quand certains thèmes planétaires passent au premier plan. Il devient utile comme liste de préparation plutôt que comme résultat garanti. Si la responsabilité est forte, structurez; si l'expansion est forte, vérifiez les occasions.",
        },
        {
          title: "5. La compatibilité doit aller avec des questions de vie quotidienne",
          body:
            "Les indicateurs védiques sont utiles, mais les chiffres seuls manquent parfois la réalité de la relation. Expression émotionnelle, habitudes financières et récupération après conflit doivent être regardées ensemble. La compatibilité cherche des règles de vie commune, pas un verdict.",
        },
        {
          title: "6. Transformez la carte en données personnelles par des notes hebdomadaires",
          body:
            "Après la lecture, notez pendant une semaine concentration, énergie relationnelle et dépenses. Le langage de la carte devient une référence vécue. En s'accumulant, l'astrologie soutient les plans trimestriels et décisions importantes avec des repères pratiques.",
        },
      ],
    },
    de: {
      title: "Vedische Astrologie (Jyotish) - Rashi- und Dasha-Deutung",
      h1: "Vedische Astrologie (Jyotish)",
      description:
        "Ein praktischer Leitfaden zum Lesen von Rashi-Charts, Nakshatra und Dasha-Zyklen mit vedischer Astrologie auf Grundlage des siderischen Tierkreises.",
      landingPoints: ["Rashi- und Navamsha-Perspektive", "Dasha-Timing", "Leitfaden für den Alltag"],
      seoText:
        "Vedische Astrologie ist ein traditionelles System, das langfristige Entwicklungen über den siderischen Tierkreis und Dasha-Zeitphasen liest.",
      valueGuideTitle: "6 praktische Punkte zum Lesen vedischer Astrologie",
      valueSections: [
        {
          title: "1. Vedische Astrologie beginnt mit dem siderischen Tierkreis",
          body:
            "Der größte Unterschied zur westlichen Astrologie ist die Tierkreisreferenz. Jyotish rechnet mit tatsächlichen Sternpositionen, daher kann dieselbe Person anders gedeutet werden. Dieses Verständnis reduziert Verwirrung und hilft, Systeme zu vergleichen.",
        },
        {
          title: "2. Rashi (D1) und Navamsha (D9) sollten zusammen gelesen werden",
          body:
            "Das Rashi-Chart zeigt die Grundstruktur des Lebens, Navamsha Potenzial und Reifungsrichtung. Aus D1 allein zu schließen kann eine Momentaufnahme überbetonen. Gemeinsame Signale beider Charts zuerst zu prüfen macht die Deutung stabiler.",
        },
        {
          title: "3. Häuser, Planeten und Würde werden als Set gelesen",
          body:
            "Ein Urteil aus einem Planetennamen führt leicht zu Fehlern. Venus ändert ihre Bedeutung je nach Haus, Würde und Aspekten. Vedische Deutung verbindet Kontext statt isolierte Elemente zu bewerten, daher sind Einzel-Keyword-Deutungen zu vermeiden.",
        },
        {
          title: "4. Dasha ist Zeitmanagement, keine feste Prophezeiung",
          body:
            "Dasha zeigt, wann planetare Themen in den Vordergrund treten. Als Vorbereitungsliste ist es nützlicher als als garantiertes Ergebnis. Bei Verantwortungssignalen steht Struktur im Vordergrund; bei Erweiterungssignalen die Prüfung von Chancen.",
        },
        {
          title: "5. Kompatibilität gehört mit Alltagsfragen zusammen",
          body:
            "Vedische Kompatibilitätswerte sind hilfreich, doch Zahlen allein verfehlen oft die Beziehungsrealität. Emotionsausdruck, Geldgewohnheiten und Erholung nach Konflikt sollten mit betrachtet werden. Kompatibilität sucht gemeinsame Betriebsregeln, kein Schicksalsurteil.",
        },
        {
          title: "6. Verwandle Chartdeutung mit Wochenaufzeichnungen in eigene Daten",
          body:
            "Notiere nach der Lesung eine Woche lang Fokus, Beziehungsenergie und Ausgabenmuster. So wird die Chartsprache zur gelebten Referenz. Mit der Zeit kann Astrologie Quartalsplanung und wichtige Entscheidungen praktisch unterstützen.",
        },
      ],
    },
    nl: {
      title: "Vedische astrologie (Jyotish) - Rashi- en Dasha-lezing",
      h1: "Vedische astrologie (Jyotish)",
      description:
        "Een praktische gids voor Rashi-kaarten, Nakshatra en Dasha-cycli binnen vedische astrologie op basis van de siderische dierenriem.",
      landingPoints: ["Rashi- en Navamsha-perspectief", "Dasha-timing", "Gids voor toepassing in het leven"],
      seoText:
        "Vedische astrologie is een traditioneel systeem dat langetermijnstromen leest via de siderische dierenriem en Dasha-perioden.",
      valueGuideTitle: "6 praktische punten om vedische astrologie te lezen",
      valueSections: [
        {
          title: "1. Vedische astrologie begint bij de siderische dierenriem",
          body:
            "Het grootste verschil met westerse astrologie is de zodiakreferentie. Jyotish rekent met echte sterposities, waardoor dezelfde persoon anders gelezen kan worden. Dit eerst begrijpen voorkomt verwarring en helpt systemen te vergelijken.",
        },
        {
          title: "2. Rashi (D1) en Navamsha (D9) horen samen gelezen te worden",
          body:
            "Rashi toont de basisstructuur van het leven, terwijl Navamsha potentieel en rijping richting geeft. Alleen uit D1 besluiten kan te veel op een tijdelijk beeld leunen. Gedeelde signalen tussen beide kaarten maken de lezing stabieler.",
        },
        {
          title: "3. Huizen, planeten en waardigheid lees je als geheel",
          body:
            "Een oordeel op basis van één planeetnaam geeft snel fouten. Venus verandert betekenis door huispositie, waardigheid en aspecten. Vedische lezing verbindt context in plaats van losse elementen te scoren, dus vermijd enkelvoudige trefwoorden.",
        },
        {
          title: "4. Dasha is tijdsbeheer, geen vaste profetie",
          body:
            "Dasha toont wanneer planetaire thema's naar voren komen. Het is nuttiger als voorbereidingslijst dan als gegarandeerde uitkomst. Bij verantwoordelijkheidssignalen komt structuur eerst; bij expansiesignalen het toetsen van kansen.",
        },
        {
          title: "5. Compatibiliteit hoort samen te gaan met dagelijkse vragen",
          body:
            "Vedische compatibiliteitsindicatoren zijn nuttig, maar cijfers alleen missen soms de realiteit van een relatie. Emotionele expressie, geldgewoonten en herstel na conflict moeten mee worden bekeken. Compatibiliteit zoekt leefregels, geen lotsvonnis.",
        },
        {
          title: "6. Maak charttaal eigen data met weeknotities",
          body:
            "Noteer na de lezing een week lang focus, relationele energie en uitgavenpatronen. De taal van de kaart wordt dan een geleefde referentie. Als dit groeit, kan astrologie kwartaalplanning en belangrijke beslissingen praktisch ondersteunen.",
        },
      ],
    },
    ms: {
      title: "Astrologi Veda (Jyotish) - Bacaan Rashi dan Dasha",
      h1: "Astrologi Veda (Jyotish)",
      description:
        "Panduan praktikal membaca carta Rashi, Nakshatra dan kitaran Dasha melalui astrologi Veda berasaskan zodiak sidereal.",
      landingPoints: ["Perspektif Rashi dan Navamsha", "Masa Dasha", "Panduan aplikasi hidup"],
      seoText:
        "Astrologi Veda ialah sistem tradisional yang membaca aliran jangka panjang melalui zodiak sidereal dan rangka masa Dasha.",
      valueGuideTitle: "6 titik praktikal membaca astrologi Veda",
      valueSections: [
        {
          title: "1. Astrologi Veda bermula dengan zodiak sidereal",
          body:
            "Perbezaan terbesar daripada astrologi Barat ialah rujukan zodiak. Jyotish mengira berdasarkan kedudukan bintang sebenar, jadi orang yang sama boleh menerima tafsiran tanda yang berbeza. Memahami ini dahulu mengurangkan kekeliruan dan membantu membandingkan sistem.",
        },
        {
          title: "2. Rashi (D1) dan Navamsha (D9) perlu dibaca bersama",
          body:
            "Carta Rashi menunjukkan struktur asas hidup, manakala Navamsha membuka potensi dan arah kematangan. Jika membuat kesimpulan daripada D1 sahaja, bacaan boleh berat kepada impresi sementara. Semak isyarat bersama antara dua carta untuk bacaan yang lebih stabil.",
        },
        {
          title: "3. Rumah, planet dan dignity mesti dibaca sebagai satu set",
          body:
            "Menentukan hasil daripada nama planet sahaja mudah menimbulkan ralat. Venus yang sama berubah makna mengikut rumah, dignity dan aspek. Bacaan Veda menghubungkan konteks, bukan memberi skor kepada unsur berasingan; maka tafsiran kata kunci tunggal perlu dielakkan.",
        },
        {
          title: "4. Dasha ialah alat pengurusan masa, bukan ramalan tetap",
          body:
            "Dasha menunjukkan bila tema planet tertentu naik ke hadapan. Ia lebih berguna sebagai senarai persediaan daripada hasil yang pasti. Ketika isyarat tanggungjawab kuat, struktur diutamakan; ketika isyarat pengembangan kuat, peluang perlu disahkan.",
        },
        {
          title: "5. Keserasian perlu disertai soalan kehidupan harian",
          body:
            "Penunjuk keserasian Veda berguna, tetapi angka sahaja boleh meleset daripada realiti hubungan. Cara meluahkan emosi, tabiat kewangan dan kelajuan pulih selepas konflik perlu diperiksa bersama. Keserasian lebih dekat kepada mencari peraturan hidup bersama daripada keputusan takdir.",
        },
        {
          title: "6. Tukar tafsiran carta kepada data sendiri melalui rekod mingguan",
          body:
            "Selepas membaca hasil, rekod fokus, tenaga hubungan dan corak perbelanjaan selama seminggu. Bahasa carta akan menjadi rujukan yang dirasai. Apabila terkumpul, astrologi boleh menyokong perancangan suku tahun dan keputusan penting dengan bukti praktikal.",
        },
      ],
    },
  },
  valueGuideTitle: vedicJyotishText("valueGuide.title"),
  valueSections: [
    {
      title: vedicJyotishText("value.1.title"),
      body:
        "라그나, Lagna는 태어난 순간 동쪽 지평선에 오른 상승 별자리입니다. 같은 달의 별자리를 가진 사람이라도 라그나가 다르면 삶을 밀고 가는 방식과 현실에서 반복되는 패턴이 달라집니다. 정확한 라그나와 바바를 보려면 출생시간과 출생지 좌표가 필요합니다.",
    },
    {
      title: vedicJyotishText("value.2.title"),
      body:
        "라시, Rashi는 양자리부터 물고기자리까지 이어지는 12개의 별자리입니다. 베다점에서는 항성 황도와 Lahiri 아야남샤를 기준으로 그라하가 어느 라시에 놓였는지 살피며, 그 위치가 어떤 삶의 영역을 움직이는지 함께 읽습니다.",
    },
    {
      title: vedicJyotishText("value.3.title"),
      body:
        "그라하, Graha는 태양, 달, 화성, 수성, 목성, 금성, 토성에 라후와 케투를 더해 봅니다. 라후와 케투는 물리 행성이 아니라 달의 노드로, 욕망과 분리, 낯선 확장과 오래된 습관의 축을 비춥니다. 행성 이름 하나보다 라시, 바바, 나크샤트라를 함께 보아야 자연스럽습니다.",
    },
    {
      title: vedicJyotishText("value.4.title"),
      body:
        "바바, Bhava는 삶을 12개의 영역으로 나누어 보는 방식입니다. Whole Sign Bhava를 쓸 때는 라그나가 있는 라시를 1하우스로 두고, 이후 라시 순서대로 2하우스부터 12하우스가 열립니다. 그래서 출생시간이 없으면 바바 해석은 단정하지 않는 편이 바릅니다.",
    },
    {
      title: vedicJyotishText("value.5.title"),
      body:
        "나크샤트라, Nakshatra는 달이 지나가는 하늘길을 27개 구역으로 세밀하게 나눈 별자리입니다. 한 나크샤트라는 13도 20분이고, 다시 4개의 파다로 나뉩니다. 특히 태어난 순간 달의 나크샤트라는 감정 반응, 관계 패턴, 무의식적 욕구를 읽을 때 깊게 떠오릅니다.",
    },
    {
      title: vedicJyotishText("value.6.title"),
      body:
        "다샤, Dasha는 특정 행성의 주제가 삶의 전면으로 올라오는 시기를 봅니다. 가장 널리 쓰이는 빈쇼타리 다샤, Vimshottari Dasha는 출생 시 달의 나크샤트라를 시작점으로 삼고 120년 순환 안에서 현재의 마하다샤를 읽습니다. 이는 좋고 나쁨의 판정이 아니라 어떤 주제를 더 의식적으로 다룰지 알려 주는 흐름입니다.",
    },
  ],
};

export default function VedicJyotishLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
